import { useState } from 'react';
import {
  Play,
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  Clock,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  TrendingUp,
  Activity,
  AlertOctagon,
  FileCode2,
  HelpCircle,
  Eye
} from 'lucide-react';
import { RunResult, TestCase, TestCaseResult } from '../types/qa';

interface OverviewViewProps {
  activeRun: RunResult | null;
  cases: TestCase[];
  allRuns: RunResult[];
  isRunningSuite: boolean;
  onRunLiveSuite: () => void;
  onRunSampleReplaySuite: () => void;
  onSelectRun: (runId: string) => void;
  onNavigateToCaseInLab: (testCaseId: string) => void;
}

export function OverviewView({
  activeRun,
  cases,
  allRuns,
  isRunningSuite,
  onRunLiveSuite,
  onRunSampleReplaySuite,
  onSelectRun,
  onNavigateToCaseInLab,
}: OverviewViewProps) {
  const [expandedCaseId, setExpandedCaseId] = useState<string | null>(null);
  const [copiedCaseId, setCopiedCaseId] = useState<string | null>(null);
  const [filterSeverity, setFilterSeverity] = useState<string>('all');

  const toggleExpand = (id: string) => {
    setExpandedCaseId((prev) => (prev === id ? null : id));
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCaseId(id);
    setTimeout(() => setCopiedCaseId(null), 2000);
  };

  const filteredResults = activeRun?.results.filter((r) => {
    if (filterSeverity === 'all') return true;
    if (filterSeverity === 'failed_only') return !r.passed;
    if (filterSeverity === 'critical_only') return r.isCriticalFailure;
    return r.severity === filterSeverity;
  }) || [];

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner / Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 bg-zinc-900/90 border border-zinc-800 rounded-xl shadow-lg">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            Quality Assurance Overview
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Deterministic rule validation, critical release gating, and latency tracking.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={onRunLiveSuite}
            disabled={isRunningSuite}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-zinc-950 font-semibold text-xs rounded-lg transition-all shadow-md shadow-cyan-950/40 cursor-pointer disabled:cursor-not-allowed"
          >
            {isRunningSuite ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                <span>Running Gemini API ({cases.length} cases)...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Run Live Suite (gemini-3.5-flash-lite)</span>
              </>
            )}
          </button>

          <button
            onClick={onRunSampleReplaySuite}
            disabled={isRunningSuite}
            className="flex items-center gap-2 px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-200 font-medium text-xs rounded-lg border border-zinc-700 transition-colors cursor-pointer disabled:cursor-not-allowed"
            title="Replays pre-computed synthetic outputs without calling live Gemini API"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>Replay Synthetic Fixtures</span>
          </button>
        </div>
      </div>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* 1. Deterministic Pass Rate */}
        <div className="p-4 bg-zinc-900/70 border border-zinc-800 rounded-xl">
          <div className="flex items-center justify-between text-xs font-mono text-zinc-400 mb-2">
            <span>Deterministic Pass Rate</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-white">
              {activeRun ? `${activeRun.deterministicPassRate}%` : '0.0%'}
            </span>
            <span className="text-xs text-zinc-500 font-mono">
              {activeRun ? `${activeRun.passedCases}/${activeRun.totalCases} passed` : 'No run recorded'}
            </span>
          </div>
          <p className="text-[10px] text-zinc-500 mt-2 font-mono">
            *Strict rule compliance. Not labeled accuracy or truthfulness.
          </p>
        </div>

        {/* 2. Release Gate Decision */}
        <div
          className={`p-4 border rounded-xl ${
            !activeRun
              ? 'bg-zinc-900/70 border-zinc-800'
              : activeRun.releaseGateStatus === 'BLOCKED'
              ? 'bg-red-950/40 border-red-800/80'
              : 'bg-emerald-950/40 border-emerald-800/80'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-mono text-zinc-400 mb-2">
            <span>Release Gate</span>
            {activeRun?.releaseGateStatus === 'BLOCKED' ? (
              <ShieldAlert className="w-4 h-4 text-red-400" />
            ) : activeRun?.releaseGateStatus === 'PASSED' ? (
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertOctagon className="w-4 h-4 text-zinc-500" />
            )}
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-2xl font-extrabold font-mono ${
                !activeRun
                  ? 'text-zinc-500'
                  : activeRun.releaseGateStatus === 'BLOCKED'
                  ? 'text-red-400'
                  : 'text-emerald-400'
              }`}
            >
              {activeRun ? activeRun.releaseGateStatus : 'PENDING'}
            </span>
          </div>
          <p className="text-[10px] text-zinc-400 mt-2 font-mono">
            {activeRun
              ? activeRun.releaseGateReason
              : 'Requires totalCases > 0, pass rate >= 90%, 0 critical failures, and 0 execution errors.'}
          </p>
        </div>

        {/* 3. Critical Failures */}
        <div className="p-4 bg-zinc-900/70 border border-zinc-800 rounded-xl">
          <div className="flex items-center justify-between text-xs font-mono text-zinc-400 mb-2">
            <span>Critical Failures</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-2xl font-bold font-mono ${
                activeRun?.criticalFailures ? 'text-red-400 font-extrabold' : 'text-zinc-100'
              }`}
            >
              {activeRun ? activeRun.criticalFailures : 0}
            </span>
            <span className="text-xs text-zinc-500 font-mono">
              of {activeRun ? activeRun.failedCases : 0} total failures
            </span>
          </div>
          <p className="text-[10px] text-zinc-500 mt-2 font-mono">
            {activeRun?.executionErrorsCount
              ? `${activeRun.executionErrorsCount} model/transport errors recorded`
              : 'Any critical failure blocks release.'}
          </p>
        </div>

        {/* 4. Response Time */}
        <div className="p-4 bg-zinc-900/70 border border-zinc-800 rounded-xl">
          <div className="flex items-center justify-between text-xs font-mono text-zinc-400 mb-2">
            <span>Average Wall Latency</span>
            <Clock className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-white">
              {activeRun
                ? activeRun.runOrigin === 'synthetic_sample_replay'
                  ? 'Unmeasured'
                  : activeRun.averageLatencyMs !== null
                  ? `${activeRun.averageLatencyMs}ms`
                  : 'N/A'
                : '—'}
            </span>
            {activeRun && activeRun.runOrigin !== 'synthetic_sample_replay' && activeRun.averageLatencyMs !== null && (
              <span className="text-[10px] text-zinc-500 font-mono">
                ({activeRun.minLatencyMs}–{activeRun.maxLatencyMs}ms)
              </span>
            )}
          </div>
          <p className="text-[10px] text-zinc-500 mt-2 font-mono">
            {activeRun?.runOrigin === 'synthetic_sample_replay'
              ? 'Sample fixture: latency unmeasured (no chart from fixtures)'
              : 'Live round-trip wall-clock measurement.'}
          </p>
        </div>

        {/* 5. Run Origin */}
        <div className="p-4 bg-zinc-900/70 border border-zinc-800 rounded-xl">
          <div className="flex items-center justify-between text-xs font-mono text-zinc-400 mb-2">
            <span>Active Run Origin</span>
            <Activity className="w-4 h-4 text-purple-400" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold font-mono text-zinc-200 truncate">
              {activeRun
                ? activeRun.runOrigin === 'live_gemini_api'
                  ? 'Live Gemini API'
                  : 'Sample Replay (Timing N/A)'
                : 'No Run Data'}
            </span>
            <span className="text-[10px] text-zinc-400 font-mono mt-0.5 truncate">
              {activeRun ? `${activeRun.requestedModel} (${activeRun.actualModelVersion})` : 'Awaiting trigger'}
            </span>
          </div>
          <p className="text-[10px] text-zinc-500 mt-2 font-mono truncate" title={activeRun?.datasetFingerprint}>
            {activeRun ? activeRun.datasetFingerprint : 'No dataset fingerprint'}
          </p>
        </div>
      </div>

      {/* Main Investigation Panel */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl shadow-md overflow-hidden">
        {/* Table Header and Controls */}
        <div className="p-4 sm:p-5 border-b border-zinc-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span>Test Suite Execution &amp; Failure Drilldown</span>
              {activeRun && (
                <span className="text-xs font-mono font-normal text-zinc-400">
                  ({filteredResults.length} of {activeRun.totalCases} shown)
                </span>
              )}
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Inspect exact actual output, matching tokens, and each evaluated check reason.
            </p>
          </div>

          {/* Filter options */}
          {activeRun && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400 font-mono">Filter:</span>
              <select
                value={filterSeverity}
                onChange={(e) => setFilterSeverity(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-200 px-3 py-1.5 rounded-lg focus:outline-hidden focus:border-cyan-500"
              >
                <option value="all">All Cases ({activeRun.totalCases})</option>
                <option value="failed_only">Failures Only ({activeRun.failedCases})</option>
                <option value="critical_only">Critical Failures ({activeRun.criticalFailures})</option>
                <option value="critical">Severity: Critical</option>
                <option value="high">Severity: High</option>
                <option value="medium">Severity: Medium</option>
                <option value="low">Severity: Low</option>
              </select>
            </div>
          )}
        </div>

        {/* Empty state if no run */}
        {!activeRun ? (
          <div className="p-12 text-center text-zinc-400 space-y-4">
            <div className="w-12 h-12 mx-auto rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-zinc-200">No Evaluation Run Recorded</h3>
              <p className="text-xs text-zinc-500 max-w-md mx-auto mt-1">
                Zero data until an explicit run is performed. Click &quot;Run Live Suite&quot; to execute real Gemini API calls, or &quot;Replay Synthetic Fixtures&quot; to inspect synthetic sample data.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={onRunLiveSuite}
                className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
              >
                Run Live Suite Now
              </button>
              <button
                onClick={onRunSampleReplaySuite}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs rounded-lg border border-zinc-700 transition-colors cursor-pointer"
              >
                Replay Synthetic Sample
              </button>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/80">
            {filteredResults.map((result: TestCaseResult) => {
              const isExpanded = expandedCaseId === result.testCaseId;
              const hasCriticalViolation = result.isCriticalFailure;

              return (
                <div
                  key={result.testCaseId}
                  className={`transition-colors ${
                    hasCriticalViolation
                      ? 'bg-red-950/15 hover:bg-red-950/25'
                      : !result.passed
                      ? 'bg-amber-950/10 hover:bg-amber-950/20'
                      : 'hover:bg-zinc-800/30'
                  }`}
                >
                  {/* Case summary row */}
                  <div
                    onClick={() => toggleExpand(result.testCaseId)}
                    className="p-4 sm:px-5 flex items-start sm:items-center justify-between gap-4 cursor-pointer select-none"
                  >
                    <div className="flex items-start sm:items-center gap-3 min-w-0">
                      <button className="text-zinc-500 hover:text-zinc-300 mt-0.5 sm:mt-0">
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>

                      <div className="flex items-center gap-2">
                        {result.passed ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : result.isCriticalFailure ? (
                          <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-mono font-bold text-zinc-200 truncate">
                            {result.testCaseName}
                          </span>
                          <span
                            className={`text-[10px] font-mono uppercase px-1.5 py-0.2 rounded border ${
                              result.severity === 'critical'
                                ? 'bg-red-950/60 border-red-800 text-red-300'
                                : result.severity === 'high'
                                ? 'bg-amber-950/60 border-amber-800 text-amber-300'
                                : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                            }`}
                          >
                            {result.severity}
                          </span>
                          <span className="text-[10px] font-mono text-zinc-500">
                            {result.category}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 truncate max-w-xl mt-0.5 font-sans">
                          {result.question}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 text-right">
                      <div className="hidden sm:block">
                        <span className="text-xs font-mono text-zinc-400">
                          {result.latencyMs !== null ? `${result.latencyMs}ms` : 'Unmeasured'}
                        </span>
                        <div className="text-[10px] text-zinc-500 font-mono">
                          {result.checks.filter((c) => c.passed).length}/{result.checks.length} rules
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigateToCaseInLab(result.testCaseId);
                        }}
                        className="px-2.5 py-1 text-[11px] font-medium text-cyan-300 hover:text-cyan-200 bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-800/80 rounded transition-colors flex items-center gap-1 cursor-pointer"
                        title="Open this case in Evaluation Lab workbench"
                      >
                        <Eye className="w-3 h-3" />
                        <span className="hidden md:inline">Inspect Lab</span>
                      </button>
                    </div>
                  </div>

                  {/* Expanded Detail Drilldown */}
                  {isExpanded && (
                    <div className="p-4 sm:p-6 bg-zinc-950/80 border-t border-zinc-800 space-y-5 animate-fade-in">
                      {/* Grid: Context & Question */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-lg">
                          <span className="text-[11px] font-mono uppercase text-zinc-400 font-semibold block mb-1">
                            Reference Grounding Paragraph
                          </span>
                          <p className="text-xs text-zinc-300 leading-relaxed font-sans bg-zinc-950 p-2.5 rounded border border-zinc-800/80">
                            {result.referenceContext}
                          </p>
                        </div>

                        <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-lg">
                          <span className="text-[11px] font-mono uppercase text-zinc-400 font-semibold block mb-1">
                            Evaluated Question Prompt
                          </span>
                          <p className="text-xs text-zinc-300 leading-relaxed font-sans bg-zinc-950 p-2.5 rounded border border-zinc-800/80">
                            {result.question}
                          </p>
                        </div>
                      </div>

                      {/* Exact Model Output */}
                      <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <FileCode2 className="w-4 h-4 text-cyan-400" />
                            <span className="text-[11px] font-mono uppercase text-zinc-300 font-bold">
                              Exact Actual Model Output
                            </span>
                            <span className="text-[10px] font-mono text-zinc-400">
                              (Requested: {result.requestedModel} | Version: {result.actualModelVersion || 'N/A'} | Latency: {result.latencyMs !== null ? `${result.latencyMs}ms` : 'Unmeasured (Sample)'} | Origin: {result.runOrigin})
                            </span>
                          </div>

                          <button
                            onClick={() => handleCopy(result.testCaseId, result.actualOutput)}
                            className="flex items-center gap-1 text-[11px] font-mono text-zinc-400 hover:text-white px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 transition-colors cursor-pointer"
                          >
                            {copiedCaseId === result.testCaseId ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span className="text-emerald-300">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy Output</span>
                              </>
                            )}
                          </button>
                        </div>

                        <pre className="p-3 bg-zinc-950 rounded border border-zinc-800 text-xs font-mono text-zinc-200 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                          {result.actualOutput}
                        </pre>
                      </div>

                      {/* Rule Checks Breakdown */}
                      <div className="space-y-2">
                        <div className="text-[11px] font-mono uppercase text-zinc-400 font-semibold">
                          Deterministic Check Verification ({result.checks.length} rules)
                        </div>

                        <div className="space-y-1.5">
                          {result.checks.map((chk, idx) => (
                            <div
                              key={idx}
                              className={`p-3 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono ${
                                chk.passed
                                  ? 'bg-zinc-900/60 border-zinc-800 text-zinc-300'
                                  : 'bg-red-950/30 border-red-800/80 text-red-200'
                              }`}
                            >
                              <div className="flex items-start sm:items-center gap-2.5">
                                {chk.passed ? (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5 sm:mt-0" />
                                ) : (
                                  <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5 sm:mt-0" />
                                )}
                                <div>
                                  <span className="font-semibold text-zinc-100">{chk.ruleName}</span>
                                  <p className="text-[11px] text-zinc-400 font-sans mt-0.5">{chk.details}</p>
                                </div>
                              </div>

                              <div className="text-right shrink-0">
                                <span
                                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                                    chk.passed
                                      ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                                      : 'bg-red-900/80 text-red-200 border border-red-700'
                                  }`}
                                >
                                  {chk.passed ? 'PASSED' : 'VIOLATED'}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Optional Model Judge Section if present */}
                      {result.judgeEvaluation && (
                        <div className="p-4 bg-purple-950/20 border border-purple-800/60 rounded-lg space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-mono font-bold text-purple-300 flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                              Model-Judge Evaluation: {result.judgeEvaluation.disclaimer}
                            </span>
                            <span className="text-[10px] font-mono text-purple-400">
                              Judge Latency: {result.judgeEvaluation.latencyMs}ms
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono">
                            <div className="p-2 bg-zinc-950 rounded border border-purple-900/40">
                              <div className="text-zinc-400 text-[10px]">Faithfulness Score</div>
                              <div className="text-base font-bold text-purple-200">
                                {result.judgeEvaluation.faithfulnessScore} / 5
                              </div>
                              <p className="text-[10px] text-zinc-400 font-sans mt-1">
                                {result.judgeEvaluation.faithfulnessNotes}
                              </p>
                            </div>
                            <div className="p-2 bg-zinc-950 rounded border border-purple-900/40">
                              <div className="text-zinc-400 text-[10px]">Context Groundedness</div>
                              <div className="text-base font-bold text-purple-200">
                                {result.judgeEvaluation.groundednessScore} / 5
                              </div>
                              <p className="text-[10px] text-zinc-400 font-sans mt-1">
                                {result.judgeEvaluation.groundednessNotes}
                              </p>
                            </div>
                            <div className="p-2 bg-zinc-950 rounded border border-purple-900/40">
                              <div className="text-zinc-400 text-[10px]">Overall Verdict</div>
                              <p className="text-xs text-zinc-300 font-sans mt-1">
                                {result.judgeEvaluation.overallVerdict}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Actual Stored Runs History (No invented fake chart trend) */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-5 shadow-md space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-cyan-400" />
              Actual Stored Run History
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Displays authentic historical runs stored in local persistence. No simulated trends.
            </p>
          </div>
          <span className="text-xs font-mono text-zinc-400">
            {allRuns.length} recorded {allRuns.length === 1 ? 'run' : 'runs'}
          </span>
        </div>

        {allRuns.length === 0 ? (
          <div className="p-6 text-center text-xs text-zinc-500 font-mono bg-zinc-950/60 rounded-lg border border-zinc-800/80">
            No historical runs stored yet. Execute an evaluation suite to build verifiable QA provenance.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400 text-[11px]">
                  <th className="py-2.5 px-3">Run Name &amp; ID</th>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Origin</th>
                  <th className="py-2.5 px-3">Rules Pass Rate</th>
                  <th className="py-2.5 px-3">Critical Fails</th>
                  <th className="py-2.5 px-3">Avg Latency</th>
                  <th className="py-2.5 px-3">Gate Status</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                {allRuns.map((run) => {
                  const isActive = activeRun?.runId === run.runId;
                  return (
                    <tr
                      key={run.runId}
                      className={`hover:bg-zinc-800/40 transition-colors ${
                        isActive ? 'bg-zinc-800/50 text-white font-medium' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5">
                          {isActive && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />}
                          <span className="truncate max-w-[180px] font-sans">{run.runName}</span>
                        </div>
                        <div className="text-[10px] text-zinc-500">{run.runId}</div>
                      </td>
                      <td className="py-2.5 px-3 text-zinc-400">
                        {new Date(run.timestamp).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded border ${
                            run.runOrigin === 'live_gemini_api'
                              ? 'bg-cyan-950/60 border-cyan-800 text-cyan-300'
                              : 'bg-purple-950/60 border-purple-800 text-purple-300'
                          }`}
                        >
                          {run.runOrigin === 'live_gemini_api' ? 'Live API' : 'Sample Replay'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-bold text-zinc-100">
                        {run.deterministicPassRate}%
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={run.criticalFailures > 0 ? 'text-red-400 font-bold' : 'text-zinc-400'}
                        >
                          {run.criticalFailures}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-zinc-400">
                        {run.averageLatencyMs !== null ? `${run.averageLatencyMs}ms` : 'Unmeasured'}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                            run.releaseGateStatus === 'PASSED'
                              ? 'bg-emerald-950/80 border-emerald-800 text-emerald-300'
                              : 'bg-red-950/80 border-red-800 text-red-300'
                          }`}
                        >
                          {run.releaseGateStatus}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => onSelectRun(run.runId)}
                          disabled={isActive}
                          className="px-2.5 py-1 text-[10px] font-medium text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 rounded transition-colors cursor-pointer disabled:cursor-default"
                        >
                          {isActive ? 'Active' : 'Load Run'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
