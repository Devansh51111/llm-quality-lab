import { useState } from 'react';
import {
  FlaskConical,
  Play,
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Cpu,
  Check,
  Copy,
  AlertOctagon,
  RefreshCw,
  Sliders,
  ExternalLink,
  ShieldAlert
} from 'lucide-react';
import { TestCase, TestCaseResult, JudgeEvaluation, SeverityLevel } from '../types/qa';
import { evaluateTestCase } from '../utils/evaluator';
import {refundExample,parseDurationInput} from '../utils/labPresets';

interface EvaluationLabViewProps {
  cases: TestCase[];
  selectedCaseId?: string | null;
  onSaveCaseResult?: (result: TestCaseResult, editedConfig: TestCase) => void;
}

export function EvaluationLabView({ cases, selectedCaseId, onSaveCaseResult }: EvaluationLabViewProps) {
  // Currently active case or custom
  const initialCase = cases.find((c) => c.id === selectedCaseId) || cases[0];
  const [activeCase, setActiveCase] = useState<TestCase>(initialCase);

  // Form states
  const [question, setQuestion] = useState(initialCase?.question || '');
  const [referenceContext, setReferenceContext] = useState(initialCase?.referenceContext || '');
  const [requiredPhrasesText, setRequiredPhrasesText] = useState((initialCase?.expectedRequiredPhrases || []).join(', '));
  const [prohibitedPhrasesText, setProhibitedPhrasesText] = useState((initialCase?.prohibitedPhrases || []).join(', '));
  const [citationsText, setCitationsText] = useState((initialCase?.expectedCitations || []).join(', '));
  const [requireJson, setRequireJson] = useState(Boolean(initialCase?.requireJson));
  const [privacyCheck, setPrivacyCheck] = useState(Boolean(initialCase?.privacyPatternsCheck));
  const [severity, setSeverity] = useState<SeverityLevel>(initialCase?.severity || 'medium');

  const [durationText,setDurationText]=useState(String(initialCase?.expectedDurationDays??''));

  // Execution states
  const [isGenerating, setIsGenerating] = useState(false);
  const [isJudging, setIsJudging] = useState(false);
  const [enableJudge, setEnableJudge] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [latestResult, setLatestResult] = useState<TestCaseResult | null>(null);
  const [copied, setCopied] = useState(false);

  // Quick switch case
  const loadCase = (found:TestCase) => {
    setActiveCase(found);
    setDurationText(String(found.expectedDurationDays??''));
    setLatestResult(null);
    setEnableJudge(false);
    setQuestion(found.question);
    setReferenceContext(found.referenceContext);
    setRequiredPhrasesText(found.expectedRequiredPhrases.join(', '));
    setProhibitedPhrasesText(found.prohibitedPhrases.join(', '));
    setCitationsText(found.expectedCitations.join(', '));
    setRequireJson(Boolean(found.requireJson));
    setPrivacyCheck(Boolean(found.privacyPatternsCheck));
    setSeverity(found.severity);
    setRunError(null);
  };

  const handleSelectCase=(caseId:string)=>{const found=cases.find(c=>c.id===caseId);if(found)loadCase(found);};

  // 1. Real Generate Answer via Server API (calls gemini-3.5-flash-lite)
  const handleGenerateAnswer = async () => {
    if (isGenerating) return; // Prevent duplicate clicks
    let duration:number|undefined;try{duration=parseDurationInput(durationText);}catch(e){setRunError(String(e));return;}
    setIsGenerating(true);
    setRunError(null);

    const payload = {
      question: question.trim(),
      referenceContext: referenceContext.trim(),
      requireJson,
    };

    try {
      const response = await fetch('api/generate', {
        method: 'POST',
          signal: AbortSignal.timeout(90000),
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}: Failed to generate answer`);
      }

      const currentCaseConfig: TestCase = {
        ...activeCase,
        expectedDurationDays:duration,
        question: question.trim(),
        referenceContext: referenceContext.trim(),
        expectedRequiredPhrases: requiredPhrasesText.split(',').map((s) => s.trim()).filter(Boolean),
        prohibitedPhrases: prohibitedPhrasesText.split(',').map((s) => s.trim()).filter(Boolean),
        expectedCitations: citationsText.split(',').map((s) => s.trim()).filter(Boolean),
        requireJson,
        privacyPatternsCheck: privacyCheck,
        severity,
      };

      let judgeResult: JudgeEvaluation | undefined = undefined;

      // Optional model-judge call if toggled
      if (enableJudge) {
        setIsJudging(true);
        try {
          const judgeRes = await fetch('api/judge', {
            method: 'POST',
          signal: AbortSignal.timeout(90000),
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              question: question.trim(),
              referenceContext: referenceContext.trim(),
              actualOutput: data.text,
              criteria: 'Evaluate factual adherence and grounding strictly against reference context.',
            }),
          });
          if (judgeRes.ok) {
            const judgeData = await judgeRes.json();
            judgeResult = judgeData.evaluation;
          }
        } catch (jErr) {
          console.warn('[Model Judge Warning]', jErr);
        } finally {
          setIsJudging(false);
        }
      }

      const evalResult = evaluateTestCase(
        currentCaseConfig,
        data.text,
        data.latencyMs || null,
        'live_gemini_api',
        data.model || 'gemini-3.5-flash-lite',
        data.actualModelVersion || 'not reported',
        undefined,
        judgeResult
      );

      setLatestResult(evalResult);
      if (onSaveCaseResult) {
        onSaveCaseResult(evalResult, currentCaseConfig);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[Generate Answer Error]', msg);
      // Strictly show actual error, do not silently mock fixtures!
      setRunError(msg);
      setLatestResult(null);
    } finally {
      setIsGenerating(false);
    }
  };

  // 2. Replay Synthetic Sample Fixture (Latency is strictly null/unmeasured)
  const handleReplaySample = () => {
    let duration:number|undefined;try{duration=parseDurationInput(durationText);}catch(e){setRunError(String(e));return;}
    setRunError(null);
    const currentCaseConfig: TestCase = {
      ...activeCase,
      expectedDurationDays:duration,
      question: question.trim(),
      referenceContext: referenceContext.trim(),
      expectedRequiredPhrases: requiredPhrasesText.split(',').map((s) => s.trim()).filter(Boolean),
      prohibitedPhrases: prohibitedPhrasesText.split(',').map((s) => s.trim()).filter(Boolean),
      expectedCitations: citationsText.split(',').map((s) => s.trim()).filter(Boolean),
      requireJson,
      privacyPatternsCheck: privacyCheck,
      severity,
    };

    const evalResult = evaluateTestCase(
      currentCaseConfig,
      activeCase.syntheticSampleOutput,
      null, // null/unmeasured latency
      'synthetic_sample_replay',
      'synthetic-sample-fixture-v1',
      'synthetic-sample-fixture-v1'
    );

    setLatestResult(evalResult);
    if (onSaveCaseResult) {
      onSaveCaseResult(evalResult, currentCaseConfig);
    }
  };

  const handleCopyOutput = () => {
    if (!latestResult) return;
    navigator.clipboard.writeText(latestResult.actualOutput);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 bg-zinc-900/90 border border-zinc-800 rounded-xl shadow-lg">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-cyan-400" />
            Test an answer
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Choose a test, ask the AI, then inspect its answer and the checks.
          </p>
        </div>

        {/* Quick case picker */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-400">Choose a test</span>
          <select
            value={activeCase.id}
            onChange={(e) => handleSelectCase(e.target.value)}
            className="bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-200 px-3 py-1.5 rounded-lg focus:outline-hidden focus:border-cyan-500 max-w-[220px] truncate"
          >
            {!cases.some(c=>c.id===activeCase.id)&&<option value={activeCase.id}>{activeCase.name}</option>}
            {cases.map((c) => (
              <option key={c.id} value={c.id}>
                [{c.severity.toUpperCase()}] {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

<div className="ql-panel space-y-3"><div className="flex flex-wrap gap-3"><span className="ql-step">1 Choose a test</span><span className="ql-step">2 Run once</span><span className="ql-step">3 Read the evidence</span></div><button disabled={isGenerating||isJudging} className="ql-button" onClick={()=>{loadCase(refundExample());}}>Load complete refund example</button><p className="text-xs text-zinc-400 mt-2">Ready-made examples set the question, reference and checks together. Loading one replaces this form only, never saved history. Refund example expects no refund:120calls exceeds the limit.</p></div>
      {/* Main split workbench: Input Configuration vs Output Inspection */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Case Parameters & Generation Controls */}
        <div className="lg:col-span-6 space-y-4">
          <div className="p-5 bg-zinc-900/80 border border-zinc-800 rounded-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <span className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-semibold flex items-center gap-2">
                <Sliders className="w-4 h-4 text-cyan-400" />
                Your test
              </span>
              <span
                className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${
                  severity === 'critical'
                    ? 'bg-red-950/60 border-red-800 text-red-300'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-300'
                }`}
              >
                Severity: {severity}
              </span>
            </div>

            {/* Target Question */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">Question for the AI</label>
              <textarea
                rows={2}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs font-sans text-zinc-100 focus:outline-hidden focus:border-cyan-500"
                placeholder="Enter question..."
              />
            </div>

            {/* Fictional Reference Context */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-zinc-300">
                  Reference facts the answer must follow
                </label>
                <span className="text-[10px] text-zinc-500 font-mono">No web search</span>
              </div>
              <textarea
                rows={4}
                value={referenceContext}
                onChange={(e) => setReferenceContext(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs font-sans text-zinc-100 focus:outline-hidden focus:border-cyan-500 leading-relaxed"
                placeholder="Enter fictional ground truth reference..."
              />
            </div>

<div className="text-sm rounded-lg bg-cyan-950/20 p-3 text-cyan-100">This test checks {requiredPhrasesText.split(',').filter(x=>x.trim()).length} required phrases, {prohibitedPhrasesText.split(',').filter(x=>x.trim()).length} forbidden phrases{durationText?` and a ${durationText}-day duration`: ''}. Passing rules is not proof the whole answer is correct.</div>
            <details className="ql-advanced"><summary>Advanced: edit checks and model review</summary>
            {/* Deterministic Rules Config */}
            <div className="p-3.5 bg-zinc-950/80 rounded-lg border border-zinc-800/80 space-y-3">
              <div className="text-[11px] font-mono text-zinc-400 font-semibold uppercase">
                Deterministic Constraint Rules
              </div>

              <label className="block text-xs text-zinc-300 mb-3">Day-duration contract (optional days)<input aria-label="Day-duration contract" type="number" min="1" max="36500" step="1" value={durationText} onChange={e=>setDurationText(e.target.value)} className="ql-input mt-2" placeholder="Empty = no duration rule"/><span className="block mt-1 text-zinc-400">Leave empty when not testing a duration. This narrow day-form rule is not a refund-window or semantic check.</span></label>
              <div className="space-y-1">
                <label className="text-[11px] text-zinc-400">Required Phrases (comma-separated)</label>
                <input
                  type="text"
                  value={requiredPhrasesText}
                  onChange={(e) => setRequiredPhrasesText(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded text-xs font-mono text-zinc-100 focus:outline-hidden focus:border-cyan-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-zinc-400">Forbidden Phrases (comma-separated)</label>
                <input
                  type="text"
                  value={prohibitedPhrasesText}
                  onChange={(e) => setProhibitedPhrasesText(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded text-xs font-mono text-zinc-100 focus:outline-hidden focus:border-cyan-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-zinc-400">Expected Citation Markers</label>
                <input
                  type="text"
                  value={citationsText}
                  onChange={(e) => setCitationsText(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded text-xs font-mono text-zinc-100 focus:outline-hidden focus:border-cyan-500"
                  placeholder="[DOC-14], [SEC-9]"
                />
              </div>

              <div className="flex items-center gap-5 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requireJson}
                    onChange={(e) => setRequireJson(e.target.checked)}
                    className="rounded border-zinc-700 bg-zinc-900 text-cyan-500 focus:ring-0"
                  />
                  <span className="text-zinc-300 font-mono text-[11px]">Require Valid JSON</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={privacyCheck}
                    onChange={(e) => setPrivacyCheck(e.target.checked)}
                    className="rounded border-zinc-700 bg-zinc-900 text-cyan-500 focus:ring-0"
                  />
                  <span className="text-zinc-300 font-mono text-[11px]">PII / Secret Guard</span>
                </label>
              </div>
            </div>

            {/* Optional Model Judge Toggle */}
            <div className="p-3 bg-purple-950/20 border border-purple-800/40 rounded-lg flex items-center justify-between">
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enableJudge}
                    onChange={(e) => setEnableJudge(e.target.checked)}
                    className="rounded border-purple-700 bg-purple-950 text-purple-400 focus:ring-0"
                  />
                  <span className="text-xs font-semibold text-purple-200">
                    Run Heuristic Model Judge (Gemini)
                  </span>
                </label>
                <p className="text-[10px] text-purple-400/80 mt-0.5 font-sans">
                  *Clearly labeled as Uncalibrated Model Estimate, not ground truth.
                </p>
              </div>
              <Cpu className="w-4 h-4 text-purple-400 shrink-0" />
            </div>

            </details>
            {/* Actions Bar */}
            <div className="pt-2 flex items-center gap-3">
              <button
                onClick={handleGenerateAnswer}
                disabled={isGenerating || !question.trim()}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-zinc-950 font-bold text-xs rounded-lg transition-all shadow-md shadow-cyan-950/40 cursor-pointer disabled:cursor-not-allowed"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Waiting for the AI answer...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    <span>Generate answer</span>
                  </>
                )}
              </button>

              <button
                onClick={handleReplaySample}
                disabled={isGenerating}
                className="flex items-center gap-1.5 px-3.5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium text-xs rounded-lg border border-zinc-700 transition-colors cursor-pointer disabled:opacity-50"
                title="Test against pre-computed synthetic sample"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>Try sample (not live AI)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Execution Output & Inspection */}
        <div className="lg:col-span-6 space-y-4">
          {/* Error Banner (Actual model/runtime errors, never silent mocks!) */}
          {runError && (
            <div className="p-4 bg-red-950/60 border border-red-800 rounded-xl text-red-200 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-red-300">
                <AlertOctagon className="w-4 h-4 shrink-0 text-red-400" />
                <span>Model Invocation Error</span>
              </div>
              <p className="font-mono text-[11px] bg-red-950 p-2.5 rounded border border-red-900/60 overflow-x-auto leading-relaxed">
                {runError}
              </p>
              <p className="text-[11px] text-zinc-400 font-sans">
                The request did not complete. Your rules were not scored. Sign in first; if a quota or provider error appears, stop rather than retry repeatedly.
              </p>
            </div>
          )}

          {/* Results Card */}
          {latestResult ? (
            <div className="p-5 bg-zinc-900/80 border border-zinc-800 rounded-xl space-y-5 animate-fade-in shadow-md">
              {/* Top metadata status */}
              <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  {latestResult.passed ? (
                    <span className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-950/60 border border-emerald-800 text-emerald-300 font-mono text-xs font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      ALL CHECKS PASSED
                    </span>
                  ) : latestResult.isCriticalFailure ? (
                    <span className="flex items-center gap-1 px-2.5 py-1 rounded bg-red-950/80 border border-red-800 text-red-300 font-mono text-xs font-bold">
                      <XCircle className="w-3.5 h-3.5" />
                      CRITICAL FAILURE (BLOCKS RELEASE)
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 px-2.5 py-1 rounded bg-amber-950/60 border border-amber-800 text-amber-300 font-mono text-xs font-bold">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      CHECK FAILED
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 text-xs font-mono text-zinc-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-cyan-400" />
                    {latestResult.latencyMs !== null ? `${latestResult.latencyMs}ms` : 'Unmeasured (Sample)'}
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded border text-[10px] ${
                      latestResult.runOrigin === 'live_gemini_api'
                        ? 'bg-cyan-950/60 border-cyan-800 text-cyan-300'
                        : 'bg-purple-950/60 border-purple-800 text-purple-300'
                    }`}
                  >
                    {latestResult.runOrigin === 'live_gemini_api' ? 'Live Gemini API' : 'Sample Replay'}
                  </span>
                </div>
              </div>

<p className="text-sm text-zinc-300">{latestResult.passed?'The answer meets every rule in this test. Read it for meaning too.':'One or more test rules did not match. Check the rule and the answer before deciding which needs fixing.'}</p>
              {/* Exact Actual Output */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-zinc-300 font-mono text-[11px] uppercase">
                    Observed Model Output
                  </span>
                  <button
                    onClick={handleCopyOutput}
                    className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-white px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 transition-colors cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-300">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>

                <pre className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs font-mono text-zinc-200 overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-56">
                  {latestResult.actualOutput}
                </pre>
              </div>

              {/* Evaluated Rule Breakdown */}
              <div className="space-y-2">
                <div className="text-[11px] font-mono uppercase text-zinc-400 font-semibold">
                  Deterministic Rule Evaluations ({latestResult.checks.length} rules)
                </div>

                <div className="space-y-1.5">
                  {latestResult.checks.map((chk, idx) => (
                    <div
                      key={idx}
                      className={`p-2.5 rounded border text-xs font-mono flex items-start justify-between gap-2 ${
                        chk.passed
                          ? 'bg-zinc-950/50 border-zinc-800 text-zinc-300'
                          : 'bg-red-950/30 border-red-800 text-red-200'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {chk.passed ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                        )}
                        <div>
                          <div className="font-semibold text-zinc-200">{chk.ruleName}</div>
                          <div className="text-[10px] text-zinc-400 font-sans mt-0.5">{chk.details}</div>
                        </div>
                      </div>

                      <span
                        className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded shrink-0 ${
                          chk.passed
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : 'bg-red-900 text-red-200 border border-red-700'
                        }`}
                      >
                        {chk.passed ? 'PASSED' : 'VIOLATION'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Judge Assessment Section */}
              {latestResult.judgeEvaluation && (
                <div className="p-4 bg-purple-950/20 border border-purple-800/60 rounded-xl space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-purple-900/40">
                    <div className="flex items-center gap-1.5 text-purple-300 font-mono text-xs font-bold">
                      <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                      <span>Model-Judge Assessment</span>
                    </div>
                    <span className="text-[9px] uppercase font-mono px-2 py-0.5 rounded bg-purple-950 border border-purple-800 text-purple-300">
                      Uncalibrated Model Estimate (Same-Model Self-Review; Not Ground Truth)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                    <div className="p-2.5 bg-zinc-950/80 rounded border border-purple-900/30">
                      <div className="text-zinc-400 text-[10px]">Faithfulness Score</div>
                      <div className="text-lg font-bold text-purple-200 mt-0.5">
                        {latestResult.judgeEvaluation.faithfulnessScore} / 5
                      </div>
                      <p className="text-[11px] text-zinc-400 font-sans mt-1">
                        {latestResult.judgeEvaluation.faithfulnessNotes}
                      </p>
                    </div>

                    <div className="p-2.5 bg-zinc-950/80 rounded border border-purple-900/30">
                      <div className="text-zinc-400 text-[10px]">Context Groundedness</div>
                      <div className="text-lg font-bold text-purple-200 mt-0.5">
                        {latestResult.judgeEvaluation.groundednessScore} / 5
                      </div>
                      <p className="text-[11px] text-zinc-400 font-sans mt-1">
                        {latestResult.judgeEvaluation.groundednessNotes}
                      </p>
                    </div>
                  </div>

                  <div className="p-2.5 bg-zinc-950/80 rounded border border-purple-900/30 text-xs font-sans text-zinc-300">
                    <strong className="text-purple-300 font-mono text-[10px] uppercase block mb-0.5">
                      Overall Heuristic Verdict:
                    </strong>
                    {latestResult.judgeEvaluation.overallVerdict}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-10 bg-zinc-900/50 border border-zinc-800 border-dashed rounded-xl text-center text-zinc-500 text-xs space-y-3">
              <FlaskConical className="w-8 h-8 mx-auto text-zinc-600" />
              <div>
                <span className="font-semibold text-zinc-300 block">Ready when you are</span>
                Choose an example, then press Generate answer. Results show what passed, what failed and why.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
