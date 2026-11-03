/**
 * LLM QualityLab - Core QA & Evaluation Types
 */

export type SeverityLevel = 'critical' | 'high' | 'medium' | 'low';

export type RunOrigin = 'live_gemini_api' | 'synthetic_sample_replay';

export type Category =
  | 'Factual Adherence'
  | 'Constraint Enforcement'
  | 'Unanswerable / Refusal'
  | 'Citations & Sourcing'
  | 'Structured Output'
  | 'Safety & PII'
  | 'SLA & Policy';

export interface TestCase {
  id: string;
  name: string;
  category: Category;
  severity: SeverityLevel;
  question: string;
  referenceContext: string;
  expectedRequiredPhrases: string[];
  expectedDurationDays?: number; // Optional narrow duration contract, not semantic truth scoring
  prohibitedPhrases: string[];
  expectedCitations: string[];
  requireJson: boolean;
  privacyPatternsCheck: boolean;
  syntheticSampleOutput: string;
  lastUpdated: string;
  notes?: string;
}

export interface RuleCheckResult {
  ruleId: string;
  ruleName: string;
  category: 'required_phrase' | 'prohibited_phrase' | 'citation' | 'json_syntax' | 'privacy_pii' | 'context_containment';
  passed: boolean;
  expected: string;
  actual?: string;
  details: string;
}

export interface JudgeEvaluation {
  faithfulnessScore: number; // 1 to 5
  faithfulnessNotes: string;
  groundednessScore: number; // 1 to 5
  groundednessNotes: string;
  concisenessScore: number; // 1 to 5
  overallVerdict: string;
  disclaimer: string;
  model: string;
  latencyMs: number | null;
  timestamp: string;
}

export interface TestCaseResult {
  testCaseId: string;
  testCaseName: string;
  category: Category;
  severity: SeverityLevel;
  question: string;
  referenceContext: string;
  actualOutput: string;
  passed: boolean;
  isCriticalFailure: boolean;
  isExecutionError: boolean;
  executionErrorMessage?: string;
  checks: RuleCheckResult[];
  failureReasons: string[];
  latencyMs: number | null; // null for unmeasured synthetic fixtures or errors
  runOrigin: RunOrigin;
  requestedModel: string;
  actualModelVersion?: string;
  timestamp: string;
  judgeEvaluation?: JudgeEvaluation;
}

export interface RunResult {
  runId: string;
  runName: string;
  timestamp: string;
  runOrigin: RunOrigin;
  requestedModel: string;
  actualModelVersion: string;
  datasetFingerprint: string;
  totalCases: number;
  passedCases: number;
  failedCases: number;
  criticalFailures: number;
  executionErrorsCount: number;
  // Strictly labeled as Deterministic Rules Pass Rate - never accuracy/faithfulness/hallucination rate
  deterministicPassRate: number; // 0 to 100
  averageLatencyMs: number | null; // null if unmeasured / synthetic replay
  minLatencyMs: number | null;
  maxLatencyMs: number | null;
  // Release gate: Requires totalCases > 0 AND deterministicPassRate >= 90 AND criticalFailures === 0 AND executionErrorsCount === 0
  releaseGateStatus: 'PASSED' | 'BLOCKED';
  releaseGateReason: string;
  datasetSnapshot: TestCase[]; // Stored snapshot of all cases and rules at run time
  results: TestCaseResult[];
  notes?: string;
}

export interface RegressionComparison {
  baselineRun: RunResult;
  targetRun: RunResult;
  fingerprintMatch: boolean;
  passRateDelta: number;
  latencyDeltaMs: number | null;
  newlyPassingCases: TestCaseResult[];
  regressedCases: TestCaseResult[];
  persistentFailures: TestCaseResult[];
  persistentPassing: TestCaseResult[];
}
