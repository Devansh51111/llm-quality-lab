import { TestCase, RuleCheckResult, TestCaseResult, RunResult, RunOrigin, JudgeEvaluation } from '../types/qa';

/**
 * Non-cryptographic deterministic content hash (cyrb53 / FNV-inspired).
 * Note: Non-cryptographic identifier used solely to detect dataset changes across runs.
 * Does not provide cryptographic preimage resistance or security guarantees.
 */
export function contentHash(str: string): string {
  let h1 = 0xdeadbeef ^ 0;
  let h2 = 0x41c6ce57 ^ 0;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const hashNum = 4294967296 * (2097151 & h2) + (h1 >>> 0);
  return hashNum.toString(16).padStart(12, '0');
}

/**
 * Validates dataset integrity:
 * Rejects duplicate IDs and empty IDs.
 */
export function validateDataset(cases: TestCase[]): { isValid: boolean; error?: string } {
  if (!Array.isArray(cases) || cases.length === 0) {
    return { isValid: false, error: 'Dataset is empty.' };
  }

  const seenIds = new Set<string>();
  if (cases.length > 500) return {isValid:false,error:'Maximum 500 cases per dataset.'};
  for (const c of cases) {
    if (!c || typeof c !== 'object') return {isValid:false,error:'Each case must be an object.'};
    for (const field of ['id','name','question','referenceContext','syntheticSampleOutput','lastUpdated'] as const) {
      if (typeof c[field] !== 'string' || c[field].length > 100000) return {isValid:false,error:`Invalid text field: ${field}`};
    }
    if (!c.name.trim() || !c.question.trim()) return {isValid:false,error:'Name and question cannot be blank.'};
    if (!['critical','high','medium','low'].includes(c.severity)) return {isValid:false,error:'Unknown severity.'};
    if (!['Factual Adherence','Constraint Enforcement','Unanswerable / Refusal','Citations & Sourcing','Structured Output','Safety & PII','SLA & Policy'].includes(c.category)) return {isValid:false,error:'Unknown category.'};
    for (const field of ['expectedRequiredPhrases','prohibitedPhrases','expectedCitations'] as const) {
      if (!Array.isArray(c[field]) || c[field].length > 100 || c[field].some(v => typeof v !== 'string' || !v.trim() || v.length > 10000)) return {isValid:false,error:`Invalid rule list: ${field}`};
    }
    if (typeof c.requireJson !== 'boolean' || typeof c.privacyPatternsCheck !== 'boolean') return {isValid:false,error:'Rule flags must be booleans.'};
    if (c.expectedDurationDays !== undefined && (!Number.isInteger(c.expectedDurationDays) || c.expectedDurationDays < 1 || c.expectedDurationDays > 36500)) return {isValid:false,error:'Day duration must be an integer from 1 to 36500.'};
    if (!c.id || !c.id.trim()) {
      return { isValid: false, error: 'Dataset contains a test case with an empty or whitespace ID.' };
    }
    if (seenIds.has(c.id.trim())) {
      return { isValid: false, error: `Dataset contains duplicate test case ID: "${c.id.trim()}".` };
    }
    seenIds.add(c.id.trim());
  }

  return { isValid: true };
}

/**
 * Computes a non-cryptographic dataset content fingerprint:
 * Identifies dataset additions, deletions, and criteria edits between test runs.
 * Note: Non-cryptographic fingerprint; does not provide cryptographic security.
 */
export function computeDatasetFingerprint(
  cases: TestCase[],
  executionSettings?: { systemInstruction?: string; contractVersion?: string }
): string {
  const validation = validateDataset(cases);
  if (!validation.isValid) {
    return `content-fp-invalid:${validation.error}`;
  }

  const sorted = [...cases].sort((a, b) => a.id.localeCompare(b.id));

  const canonicalPayload = {
    contractVersion: executionSettings?.contractVersion || 'content-fp-v1',
    systemInstruction: executionSettings?.systemInstruction || '',
    caseCount: sorted.length,
    cases: sorted.map((c) => ({
      id: c.id.trim(),
      name: c.name.trim(),
      severity: c.severity,
      category: c.category,
      question: c.question.trim(),
      referenceContext: c.referenceContext.trim(),
      expectedRequiredPhrases: [...c.expectedRequiredPhrases].map((p) => p.trim()).sort(),
      prohibitedPhrases: [...c.prohibitedPhrases].map((p) => p.trim()).sort(),
      expectedCitations: [...c.expectedCitations].map((p) => p.trim()).sort(),
      expectedDurationDays: c.expectedDurationDays ?? null,
      requireJson: Boolean(c.requireJson),
      privacyPatternsCheck: Boolean(c.privacyPatternsCheck),
    })),
  };

  const jsonStr = JSON.stringify(canonicalPayload);
  const hashHex = contentHash(jsonStr);
  return `content-fp-${hashHex}`;
}

/**
 * Evaluates Strict Raw JSON Contract:
 * Entire trimmed output MUST parse with JSON.parse.
 * Surrounding prose, introductory words, and markdown fences (```) explicitly FAIL.
 */
export function evaluateStrictJson(actualOutput: string): {
  passed: boolean;
  actualDescription: string;
  details: string;
} {
  const trimmed = actualOutput.trim();

  // Check for markdown code fences or surrounding prose
  if (trimmed.startsWith('```') || trimmed.endsWith('```') || /```json/i.test(trimmed)) {
    return {
      passed: false,
      actualDescription: 'Failed: Contains markdown code fences',
      details:
        'Strict JSON contract violation: Output contains markdown code fences (```). The contract strictly requires raw parseable JSON only.',
    };
  }

  // Attempt direct JSON.parse on the entire trimmed response
  try {
    JSON.parse(trimmed);
    return {
      passed: true,
      actualDescription: 'Valid strict JSON',
      details: 'Entire trimmed response parsed successfully as raw JSON without markdown fences or prose.',
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      passed: false,
      actualDescription: `JSON.parse error: ${errorMsg}`,
      details: `Strict JSON contract violation: Output is not parseable JSON (${errorMsg}). Surrounding prose or syntax errors detected.`,
    };
  }
}

/**
 * Heuristic Privacy / Pattern Scan
 * Scans for configured patterns (SSN, credit card, email, phone-like)
 * Caveat: Subject to false positives and pattern omissions.
 */
export function evaluatePrivacyPatterns(actualOutput: string): {
  passed: boolean;
  actualDescription: string;
  details: string;
} {
  const ssnRegex = /\b\d{3}-\d{2}-\d{4}\b/g;
  const ccRegex = /\b(?:\d{4}[ -]?){3}\d{4}\b/g;
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
  const phoneRegex = /\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g;

  const detected: string[] = [];
  if (ssnRegex.test(actualOutput)) detected.push('SSN pattern (XXX-XX-XXXX)');
  if (ccRegex.test(actualOutput)) detected.push('Payment card pattern (16 digits)');
  if (emailRegex.test(actualOutput)) detected.push('Email pattern');
  if (phoneRegex.test(actualOutput)) detected.push('Phone-like pattern');

  if (detected.length === 0) {
    return {
      passed: true,
      actualDescription: 'No configured patterns detected',
      details:
        'Heuristic regex scanner only (subject to false positives and pattern omissions). No configured SSN, card, email, or phone-like patterns detected in output.',
    };
  }

  return {
    passed: false,
    actualDescription: `Configured patterns detected: ${detected.join(', ')}`,
    details: `Potential pattern match detected: [${detected.join('; ')}]. Heuristic scanner only (does not prove regulatory compliance).`,
  };
}

/** Narrow duration contract. Accepts digit-based day durations only.
 * Rejects conflicting day durations and explicit negation. Not a semantic verifier.
 */
export function evaluateDurationDays(output: string, expected: number): boolean {
  if (!Number.isInteger(expected) || expected < 1) return false;
  const text = output.toLowerCase().replace(/[\u2010-\u2015]/g, '-');
  const mentions = [...text.matchAll(/\b(\d+)\s*(?:-\s*)?(days?|months?|years?|weeks?)\b/g)];
  if (!mentions.length) return false;
  return mentions.every(m => Number(m[1]) === expected && /^days?$/.test(m[2])) &&
    !/\b(?:not|never|isn't|isnt|doesn't|doesnt|no longer)\b[^.!?\n]{0,45}\b\d+\s*-?\s*days?\b/.test(text);
}

/**
 * Executes deterministic rule checks against an output.
 * Correctness Semantics:
 * 1. Blank or whitespace actual output FAILS.
 * 2. Test cases with zero checks configured FAIL (unassessed/failed, not pass).
 * 3. Execution / transport errors FAIL and are recorded with isExecutionError: true.
 * 4. Strict JSON checks require direct JSON.parse on the entire trimmed string (no markdown fences).
 * 5. Citation check verifies marker presence only ('Marker present, support not assessed').
 * 6. Privacy check reports 'No configured patterns detected', never 'Zero PII'.
 */
export function evaluateTestCase(
  testCase: TestCase,
  actualOutput: string,
  latencyMs: number | null,
  runOrigin: RunOrigin,
  requestedModel: string,
  actualModelVersion?: string,
  executionError?: string,
  judgeEvaluation?: JudgeEvaluation
): TestCaseResult {
  const checks: RuleCheckResult[] = [];
  const failureReasons: string[] = [];
  const isExecutionError = Boolean(executionError);

  // 1. If execution/transport error occurred
  if (isExecutionError) {
    checks.push({
      ruleId: 'model-execution-status',
      ruleName: 'Model Generation Status',
      category: 'context_containment',
      passed: false,
      expected: 'Successful model generation (200 OK)',
      actual: `Execution Error: ${executionError}`,
      details: `Live API call or transport failed: ${executionError}`,
    });
    failureReasons.push(`Execution error: ${executionError}`);

    return {
      testCaseId: testCase.id,
      testCaseName: testCase.name,
      category: testCase.category,
      severity: testCase.severity,
      question: testCase.question,
      referenceContext: testCase.referenceContext,
      actualOutput: actualOutput || `[Execution Error: ${executionError}]`,
      passed: false,
      isCriticalFailure: testCase.severity === 'critical',
      isExecutionError: true,
      executionErrorMessage: executionError,
      checks,
      failureReasons,
      latencyMs,
      runOrigin,
      requestedModel,
      actualModelVersion: actualModelVersion || 'not reported',
      timestamp: new Date().toISOString(),
      judgeEvaluation,
    };
  }

  // 2. Blank or whitespace-only output check
  const isBlankOutput = !actualOutput || !actualOutput.trim();
  if (isBlankOutput) {
    checks.push({
      ruleId: 'non-blank-output',
      ruleName: 'Non-Empty Output Verification',
      category: 'context_containment',
      passed: false,
      expected: 'Non-empty output string',
      actual: 'Blank / whitespace-only string',
      details: 'Model returned a blank or whitespace-only response. Evaluated checks fail.',
    });
    failureReasons.push('Model returned blank or whitespace-only response.');
  }

  // 3. Count configured rules
  const hasRequired = testCase.expectedRequiredPhrases && testCase.expectedRequiredPhrases.length > 0;
  const hasProhibited = testCase.prohibitedPhrases && testCase.prohibitedPhrases.length > 0;
  const hasCitations = testCase.expectedCitations && testCase.expectedCitations.length > 0;
  const hasJson = Boolean(testCase.requireJson);
  const hasPrivacy = Boolean(testCase.privacyPatternsCheck);

  const totalConfiguredRules =
    (hasRequired ? testCase.expectedRequiredPhrases.length : 0) +
    (hasProhibited ? testCase.prohibitedPhrases.length : 0) +
    (hasCitations ? testCase.expectedCitations.length : 0) +
    (hasJson ? 1 : 0) +
    (hasPrivacy ? 1 : 0) + (testCase.expectedDurationDays !== undefined ? 1 : 0);

  // Requirement: Zero checks = unassessed/failed not pass.
  if (totalConfiguredRules === 0 && !isBlankOutput) {
    checks.push({
      ruleId: 'unassessed-no-rules',
      ruleName: 'Configured Rules Audit',
      category: 'context_containment',
      passed: false,
      expected: 'At least one deterministic rule must be configured',
      actual: '0 rules configured',
      details: 'Case is unassessed: no deterministic verification rules are defined for this test case.',
    });
    failureReasons.push('Unassessed case: zero deterministic rules configured.');
  }

  const normalizedOutput = (actualOutput || '').toLowerCase();

  if (testCase.expectedDurationDays !== undefined) {
    const passed = evaluateDurationDays(actualOutput, testCase.expectedDurationDays);
    checks.push({ruleId:'duration-days',ruleName:'Declared day-duration contract',category:'required_phrase',passed,
      expected:`Only ${testCase.expectedDurationDays}-day duration forms`,actual:passed?'Allowed day-duration form':'Missing, negated, or conflicting duration',
      details:'Bounded digit/day-form contract. Accepts 14 days or 14-day, rejects conflicting units/durations and explicit negation. It does not prove semantic correctness.'});
    if (!passed) failureReasons.push('Day-duration contract failed');
  }

  // 4. Required Phrases
  if (hasRequired && !isBlankOutput) {
    for (const phrase of testCase.expectedRequiredPhrases) {
      const trimmedPhrase = phrase.trim();
      const passed = normalizedOutput.includes(trimmedPhrase.toLowerCase());
      checks.push({
        ruleId: `req-${trimmedPhrase}`,
        ruleName: `Required Phrase: "${trimmedPhrase}"`,
        category: 'required_phrase',
        passed,
        expected: `Must contain "${trimmedPhrase}"`,
        actual: passed ? 'Found' : 'Missing from output',
        details: passed
          ? `Matched required phrase "${trimmedPhrase}" in output.`
          : `Failed: Required phrase "${trimmedPhrase}" was not found in model output.`,
      });
      if (!passed) {
        failureReasons.push(`Missing required phrase: "${trimmedPhrase}"`);
      }
    }
  }

  // 5. Prohibited Phrases
  if (hasProhibited && !isBlankOutput) {
    for (const phrase of testCase.prohibitedPhrases) {
      const trimmedPhrase = phrase.trim();
      const found = normalizedOutput.includes(trimmedPhrase.toLowerCase());
      const passed = !found;
      checks.push({
        ruleId: `pro-${trimmedPhrase}`,
        ruleName: `Prohibited Term: "${trimmedPhrase}"`,
        category: 'prohibited_phrase',
        passed,
        expected: `Must NOT contain "${trimmedPhrase}"`,
        actual: found ? `Detected "${trimmedPhrase}"` : 'Clean (Not present)',
        details: passed
          ? `Clean: Prohibited term "${trimmedPhrase}" was not found.`
          : `Violation: Model generated prohibited phrase "${trimmedPhrase}".`,
      });
      if (!passed) {
        failureReasons.push(`Prohibited phrase detected: "${trimmedPhrase}"`);
      }
    }
  }

  // 6. Expected Citations (Marker presence only)
  if (hasCitations && !isBlankOutput) {
    for (const cit of testCase.expectedCitations) {
      const trimmedCit = cit.trim();
      const passed = (actualOutput || '').includes(trimmedCit);
      checks.push({
        ruleId: `cit-${trimmedCit}`,
        ruleName: `Citation Marker Presence: ${trimmedCit}`,
        category: 'citation',
        passed,
        expected: `Must contain citation marker ${trimmedCit}`,
        actual: passed ? 'Marker present, support not assessed' : 'Missing citation marker',
        details: passed
          ? `Found citation marker "${trimmedCit}" in output (Marker present, support not assessed).`
          : `Failed: Output omitted required citation marker "${trimmedCit}".`,
      });
      if (!passed) {
        failureReasons.push(`Missing citation marker: "${trimmedCit}"`);
      }
    }
  }

  // 7. Strict Raw JSON Syntax (No Markdown Fences)
  if (hasJson && !isBlankOutput) {
    const jsonEval = evaluateStrictJson(actualOutput);
    checks.push({
      ruleId: 'strict-json-syntax',
      ruleName: 'Strict Raw JSON Syntax (No Markdown Fences / No Prose)',
      category: 'json_syntax',
      passed: jsonEval.passed,
      expected: 'Entire trimmed output must parse as valid raw JSON without fences (```) or prose',
      actual: jsonEval.actualDescription,
      details: jsonEval.details,
    });
    if (!jsonEval.passed) {
      failureReasons.push('Strict raw JSON contract violation.');
    }
  }

  // 8. Heuristic Privacy Pattern Check
  if (hasPrivacy && !isBlankOutput) {
    const privEval = evaluatePrivacyPatterns(actualOutput);
    checks.push({
      ruleId: 'heuristic-privacy-scan',
      ruleName: 'Configured Sensitive Pattern Scan (Heuristic)',
      category: 'privacy_pii',
      passed: privEval.passed,
      expected: 'No configured SSN, card, email, or phone-like patterns detected',
      actual: privEval.actualDescription,
      details: privEval.details,
    });
    if (!privEval.passed) {
      failureReasons.push('Configured sensitive pattern match detected.');
    }
  }

  const allChecksPassed = checks.length > 0 && checks.every((c) => c.passed);
  const isCriticalFailure = !allChecksPassed && testCase.severity === 'critical';

  return {
    testCaseId: testCase.id,
    testCaseName: testCase.name,
    category: testCase.category,
    severity: testCase.severity,
    question: testCase.question,
    referenceContext: testCase.referenceContext,
    actualOutput,
    passed: allChecksPassed,
    isCriticalFailure,
    isExecutionError: false,
    checks,
    failureReasons,
    latencyMs,
    runOrigin,
    requestedModel,
    actualModelVersion: actualModelVersion || 'not reported',
    timestamp: new Date().toISOString(),
    judgeEvaluation,
  };
}

/**
 * Builds a RunResult enforcing verified correctness semantics:
 * - Release gate: MUST require totalCases > 0 AND deterministicPassRate >= 90 AND criticalFailures === 0 AND executionErrorsCount === 0.
 * - Latency is null for sample replay or unmeasured runs.
 * - Stores full datasetSnapshot.
 */
export function buildRunResult(
  results: TestCaseResult[],
  datasetSnapshot: TestCase[],
  runOrigin: RunOrigin,
  requestedModel: string,
  datasetFingerprint: string,
  actualModelVersion?: string,
  runName?: string
): RunResult {
  const totalCases = results.length;
  const passedCases = results.filter((r) => r.passed).length;
  const failedCases = totalCases - passedCases;
  const criticalFailures = results.filter((r) => r.isCriticalFailure).length;
  const executionErrorsCount = results.filter((r) => r.isExecutionError).length;

  // Rule: Never label rule pass percentage as accuracy/faithfulness/hallucination rate
  const deterministicPassRate =
    totalCases > 0 ? Math.round((passedCases / totalCases) * 1000) / 10 : 0;

  // Real model timing only: filter valid positive numbers
  const validLatencies = results
    .map((r) => r.latencyMs)
    .filter((l): l is number => typeof l === 'number' && l > 0);

  const averageLatencyMs =
    validLatencies.length > 0
      ? Math.round(validLatencies.reduce((a, b) => a + b, 0) / validLatencies.length)
      : null;
  const minLatencyMs = validLatencies.length > 0 ? Math.min(...validLatencies) : null;
  const maxLatencyMs = validLatencies.length > 0 ? Math.max(...validLatencies) : null;

  // Release Gate Decision:
  // Requires totalCases > 0 AND deterministicPassRate >= 90 AND criticalFailures === 0 AND executionErrorsCount === 0
  let releaseGateStatus: 'PASSED' | 'BLOCKED' = 'BLOCKED';
  let releaseGateReason = '';

  if (totalCases === 0) {
    releaseGateStatus = 'BLOCKED';
    releaseGateReason = 'BLOCKED: Empty test suite (0 test cases evaluated).';
  } else if (executionErrorsCount > 0) {
    releaseGateStatus = 'BLOCKED';
    releaseGateReason = `BLOCKED: ${executionErrorsCount} model/transport execution error(s) encountered in suite.`;
  } else if (criticalFailures > 0) {
    releaseGateStatus = 'BLOCKED';
    releaseGateReason = `BLOCKED: ${criticalFailures} critical failure(s) detected. Any critical failure blocks release regardless of overall pass rate.`;
  } else if (passedCases * 10 < totalCases * 9) {
    releaseGateStatus = 'BLOCKED';
    releaseGateReason = `BLOCKED: Deterministic pass rate ${deterministicPassRate}% is below the required 90.0% threshold.`;
  } else {
    releaseGateStatus = 'PASSED';
    releaseGateReason = `PASSED: Pass rate ${deterministicPassRate}% >= 90.0%, 0 critical failures, and 0 execution errors across ${totalCases} assessed cases.`;
  }

  const dateStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const defaultName =
    runOrigin === 'live_gemini_api'
      ? `Live QA Run (${dateStr})`
      : `Synthetic Sample Replay (${dateStr})`;

  return {
    runId: `run-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    runName: runName || defaultName,
    timestamp: new Date().toISOString(),
    runOrigin,
    requestedModel,
    actualModelVersion: actualModelVersion || 'not reported',
    datasetFingerprint,
    totalCases,
    passedCases,
    failedCases,
    criticalFailures,
    executionErrorsCount,
    deterministicPassRate,
    averageLatencyMs,
    minLatencyMs,
    maxLatencyMs,
    releaseGateStatus,
    releaseGateReason,
    datasetSnapshot: JSON.parse(JSON.stringify(datasetSnapshot)),
    results,
  };
}

export function runsComparable(a?: RunResult, b?: RunResult): boolean {
  if (!a || !b || a.runId === b.runId || !validateDataset(a.datasetSnapshot).isValid || !validateDataset(b.datasetSnapshot).isValid) return false;
  const snapshot = (r: RunResult) => JSON.stringify([...r.datasetSnapshot].sort((x,y)=>x.id.localeCompare(y.id)));
  const resultsMatch = (r: RunResult) => r.totalCases === r.datasetSnapshot.length && r.results.length === r.totalCases && new Set(r.results.map(x=>x.testCaseId)).size === r.totalCases && r.results.every(x=>r.datasetSnapshot.some(c=>c.id===x.testCaseId));
  return a.datasetFingerprint === b.datasetFingerprint && snapshot(a) === snapshot(b) && resultsMatch(a) && resultsMatch(b);
}
