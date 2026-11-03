import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);

app.use(express.json({ limit: '1mb' }));
// Private owner runtime only. No auth is implemented here: never expose this server publicly.
app.use('/api', (req,res,next) => {
  if (req.method !== 'POST') return next();
  for (const field of ['question','referenceContext','systemInstruction','actualOutput','criteria']) {
    if (req.body?.[field] !== undefined && (typeof req.body[field] !== 'string' || req.body[field].length > 100000)) return res.status(400).json({error:`Invalid ${field}: expected text up to 100000 characters.`});
  }
  if (req.body?.requireJson !== undefined && typeof req.body.requireJson !== 'boolean') return res.status(400).json({error:'requireJson must be boolean.'});
  next();
});

// Helper to get GoogleGenAI client
function getGenAIClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in environment. In AI Studio, ensure runtime API key is present.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// 1. Health & Config endpoint
app.get('/api/status', (_req, res) => {
  const hasApiKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY');
  res.json({
    status: 'ok',
    hasApiKey,
    defaultModel: 'gemini-3.5-flash-lite',
    tier: 'Runtime billing status not verified by this app',
    environment: process.env.NODE_ENV || 'development',
  });
});

// 2. Real Generation Endpoint
app.post('/api/generate', async (req, res) => {
  const { question, referenceContext, systemInstruction, requireJson } = req.body;

  if (!question || typeof question !== 'string') {
    return res.status(400).json({ error: 'Question is required and must be a string.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return res.status(503).json({
      error: 'GEMINI_API_KEY is not set or invalid in AI Studio runtime environment.',
      code: 'API_KEY_UNAVAILABLE',
    });
  }

  const startTime = performance.now();
  const modelName = 'gemini-3.5-flash-lite';

  try {
    const ai = getGenAIClient();

    let fullPrompt = '';
    if (referenceContext && referenceContext.trim()) {
      fullPrompt += `REFERENCE CONTEXT (GROUNDING SOURCE):\n\"\"\"\n${referenceContext.trim()}\n\"\"\"\n\n`;
    }
    fullPrompt += `QUESTION / USER PROMPT:\n${question.trim()}\n\n`;
    fullPrompt += `INSTRUCTIONS:
1. Ground your response strictly in the reference context provided above.
2. If the context does not contain sufficient information to answer, state clearly that the reference material does not contain the answer.
3. If citation markers (e.g. [DOC-1], [SEC-X]) appear in the context, cite them accurately where relevant.
${requireJson ? '4. Respond ONLY with valid, parseable JSON.' : ''}`;

    const config: Record<string, unknown> = {};
    if (systemInstruction && systemInstruction.trim()) {
      config.systemInstruction = systemInstruction.trim();
    }
    if (requireJson) {
      config.responseMimeType = 'application/json';
    }

    // Attempt generation with a single backoff retry on transient 503 / high demand
    let response;
    try {
      response = await ai.models.generateContent({
        model: modelName,
        contents: fullPrompt,
        config,
      });
    } catch (initialErr: unknown) {
      const errStr = String(initialErr);
      if (errStr.includes('503') || errStr.includes('UNAVAILABLE') || errStr.includes('high demand')) {
        await new Promise((r) => setTimeout(r, 800));
        response = await ai.models.generateContent({
          model: modelName,
          contents: fullPrompt,
          config,
        });
      } else {
        throw initialErr;
      }
    }

    const elapsedMs = Math.round(performance.now() - startTime);
    const outputText = response.text || '';

    return res.json({
      text: outputText,
      model: modelName,
      actualModelVersion: response.modelVersion || undefined,
      latencyMs: elapsedMs,
      timestamp: new Date().toISOString(),
      runOrigin: 'live_gemini_api',
    });
  } catch (err: unknown) {
    const elapsedMs = Math.round(performance.now() - startTime);
    let errorMessage = err instanceof Error ? err.message : String(err);

    // Parse JSON-wrapped error if present
    try {
      const parsed = JSON.parse(errorMessage);
      if (parsed?.error?.message) {
        errorMessage = `[${parsed.error.code || 500} ${parsed.error.status || 'ERROR'}] ${parsed.error.message}`;
      }
    } catch {
      // Keep original errorMessage
    }

    console.error('[API /api/generate error]', errorMessage);

    return res.status(500).json({
      error: errorMessage,
      latencyMs: elapsedMs,
      model: modelName,
      code: 'MODEL_GENERATION_FAILED',
      timestamp: new Date().toISOString(),
    });
  }
});

// 3. Optional Model-Judge Assessment Endpoint
app.post('/api/judge', async (req, res) => {
  const { question, referenceContext, actualOutput, criteria } = req.body;

  if (!actualOutput || typeof actualOutput !== 'string') {
    return res.status(400).json({ error: 'actualOutput is required for evaluation.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return res.status(503).json({
      error: 'GEMINI_API_KEY is not set or invalid in AI Studio runtime environment.',
      code: 'API_KEY_UNAVAILABLE',
    });
  }

  const startTime = performance.now();
  const modelName = 'gemini-3.5-flash-lite';

  try {
    const ai = getGenAIClient();

    const judgePrompt = `You are an automated evaluation judge reviewing an LLM response against reference material.
Evaluate the candidate output critically.

REFERENCE CONTEXT:
\"\"\"\n${referenceContext || 'No context provided'}\n\"\"\"

QUESTION:
\"\"\"\n${question || 'N/A'}\n\"\"\"

ACTUAL MODEL OUTPUT:
\"\"\"\n${actualOutput}\n\"\"\"

CUSTOM EVALUATION CRITERIA:
\"\"\"\n${criteria || 'Standard Faithfulness and Groundedness'}\n\"\"\"

Provide your evaluation in JSON according to the schema.`;

    const response = await ai.models.generateContent({
      model: modelName,
      contents: judgePrompt,
      config: {
        systemInstruction: 'You are an objective AI QA judge. Assess whether the output is strictly faithful to the reference context without hallucination. Output strictly JSON matching the required schema.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            faithfulnessScore: {
              type: Type.INTEGER,
              description: 'Score from 1 to 5: 5 means fully faithful to context with zero fabricated claims; 1 means heavily hallucinated.',
            },
            faithfulnessNotes: {
              type: Type.STRING,
              description: 'Specific analysis of factual adherence or hallucinations detected.',
            },
            groundednessScore: {
              type: Type.INTEGER,
              description: 'Score from 1 to 5: 5 means claims are directly supported by context text.',
            },
            groundednessNotes: {
              type: Type.STRING,
              description: 'Specific reasoning on evidence support.',
            },
            concisenessScore: {
              type: Type.INTEGER,
              description: 'Score from 1 to 5: 5 means concise and focused; 1 means overly verbose/filler.',
            },
            overallVerdict: {
              type: Type.STRING,
              description: 'One sentence overall QA assessment summary.',
            },
          },
          required: [
            'faithfulnessScore',
            'faithfulnessNotes',
            'groundednessScore',
            'groundednessNotes',
            'concisenessScore',
            'overallVerdict',
          ],
        },
      },
    });

    const elapsedMs = Math.round(performance.now() - startTime);
    const jsonStr = (response.text || '{}').trim();
    const evaluation = JSON.parse(jsonStr);

    return res.json({
      evaluation: {
        ...evaluation,
        disclaimer: 'Uncalibrated Model Estimate (Not Ground Truth)',
        model: modelName,
        latencyMs: elapsedMs,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err: unknown) {
    const elapsedMs = Math.round(performance.now() - startTime);
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error('[API /api/judge error]', errorMessage);

    return res.status(500).json({
      error: errorMessage,
      latencyMs: elapsedMs,
      code: 'JUDGE_EVALUATION_FAILED',
    });
  }
});

// Vite Middleware setup for dev, or static files for production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, process.env.HOST || '127.0.0.1', () => {
    console.log(`[LLM QualityLab Server] Running on http://0.0.0.0:${port}`);
  });
}

startServer();
