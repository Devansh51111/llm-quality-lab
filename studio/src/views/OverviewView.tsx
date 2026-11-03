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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white">Quality overview</h1>
          <p className="text-sm text-zinc-400 mt-1">{activeRun?`Latest run: ${activeRun.runName} · ${new Date(activeRun.timestamp).toLocaleString()}`:'No run yet. Run a suite or test one answer to fill this page with real results.'}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={onRunLiveSuite} disabled={isRunningSuite} className="ql-primary" style={{minHeight:40,padding:'8px 16px',fontSize:13}}>{isRunningSuite?`Running ${cases.length} cases...`:'Run live suite'}</button>
          <button onClick={onRunSampleReplaySuite} disabled={isRunningSuite} className="ql-button" title="Replays pre-written synthetic outputs without calling the AI">Replay sample (not live AI)</button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="ql-card"><p className="ql-label">Release gate</p><p className={`ql-big ${!activeRun?'text-zinc-500':activeRun.releaseGateStatus==='BLOCKED'?'text-red-400':'text-emerald-400'}`}>{activeRun?activeRun.releaseGateStatus.toLowerCase():'pending'}</p><p className="ql-sub">{activeRun?activeRun.releaseGateReason:'Needs a run with 90% rule pass rate, no critical failure and no execution error.'}</p></div>
        <div className="ql-card"><p className="ql-label">Critical failures</p><p className={`ql-big ${activeRun?.criticalFailures?'text-red-400':'text-white'}`}>{activeRun?activeRun.criticalFailures:'-'}</p><p className="ql-sub">{activeRun?`${activeRun.failedCases} failing of ${activeRun.totalCases} tests`:'Any critical failure blocks release.'}</p></div>
        <div className="ql-card"><p className="ql-label">Response time</p><p className="ql-big text-white">{activeRun&&activeRun.runOrigin!=='synthetic_sample_replay'&&activeRun.averageLatencyMs!==null?`${activeRun.averageLatencyMs}ms`:'-'}</p><p className="ql-sub">{activeRun?(activeRun.runOrigin==='live_gemini_api'?`Live average · ${activeRun.requestedModel}`:'Sample replay: time not measured'):'Measured only on live runs.'}</p></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
        <div className="ql-card lg:col-span-2 flex flex-col items-center text-center">
          <p className="ql-label self-start">Rule pass rate</p>
          {(()=>{const pct=activeRun?activeRun.deterministicPassRate:0;const r=70,c=2*Math.PI*r;return <svg viewBox="0 0 180 180" className="w-44 h-44 my-3" role="img" aria-label={activeRun?`${pct}% of tests passed their rules`:'No run recorded'}><circle cx="90" cy="90" r={r} fill="none" stroke={activeRun?'#f43f5e':'#27272a'} strokeWidth="14"/><circle cx="90" cy="90" r={r} fill="none" stroke="#10b981" strokeWidth="14" strokeLinecap="round" strokeDasharray={`${c*pct/100} ${c}`} transform="rotate(-90 90 90)"/><text x="90" y="92" textAnchor="middle" fill="#fff" fontSize="30" fontWeight="600">{activeRun?`${pct}%`:'-'}</text><text x="90" y="116" textAnchor="middle" fill="#a1a1aa" fontSize="12">{activeRun?`${activeRun.passedCases}/${activeRun.totalCases} passed`:'no run'}</text></svg>})()}
          <p className="ql-sub">Share of tests that met their written rules. Not accuracy or truthfulness.</p>
        </div>
        <div className="ql-card lg:col-span-3">
          <p className="ql-label">Top failing outputs</p>
          {!activeRun?<p className="ql-sub mt-4">Nothing to show yet.</p>:activeRun.results.filter(r=>!r.passed).length===0?<p className="ql-sub mt-4">No failing tests in this run.</p>:<div className="mt-3 divide-y divide-zinc-800">{activeRun.results.filter(r=>!r.passed).sort((x,y)=>Number(y.isCriticalFailure)-Number(x.isCriticalFailure)).slice(0,4).map(r=><button key={r.testCaseId} className="w-full text-left py-3 flex flex-col gap-1 hover:bg-zinc-800/30 rounded" onClick={()=>onNavigateToCaseInLab(r.testCaseId)}><span className="flex flex-wrap items-center gap-2"><span className={`ql-pill ${r.isCriticalFailure?'text-red-300':'text-amber-300'}`}>{r.isCriticalFailure?'critical':r.severity}</span><span className="text-sm text-zinc-100">{r.testCaseName}</span></span><span className="text-xs text-zinc-400">{r.failureReasons[0]||r.executionErrorMessage||'A rule did not match.'}</span><span className="text-xs text-zinc-500 line-clamp-2">{r.actualOutput||'No output recorded.'}</span></button>)}</div>}
        </div>
      </div>

      <div className="ql-card">
        <p className="ql-label">Pass rate by run</p>
        {allRuns.length<2?<p className="ql-sub mt-3">Needs at least two saved runs to draw a trend. Saved: {allRuns.length}.</p>:(()=>{const rs=[...allRuns].reverse().slice(-20);const W=600,H=140,pad=24;const pts=rs.map((r,i)=>[pad+i*(W-2*pad)/(rs.length-1),H-pad-(H-2*pad)*r.deterministicPassRate/100]);return <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-40 mt-2" role="img" aria-label="Rule pass rate for each saved run, oldest to newest"><line x1={pad} x2={W-pad} y1={H-pad} y2={H-pad} stroke="#27272a"/><line x1={pad} x2={W-pad} y1={pad} y2={pad} stroke="#27272a" strokeDasharray="3 4"/><text x="2" y={pad+4} fill="#71717a" fontSize="10">100%</text><text x="8" y={H-pad+4} fill="#71717a" fontSize="10">0</text><polyline fill="none" stroke="#8b5cf6" strokeWidth="2.5" points={pts.map(q=>q.join(',')).join(' ')}/>{pts.map((q,i)=><circle key={i} cx={q[0]} cy={q[1]} r="3.5" fill={rs[i].runOrigin==='live_gemini_api'?'#10b981':'#a78bfa'}><title>{`${rs[i].runName}: ${rs[i].deterministicPassRate}% (${rs[i].runOrigin==='live_gemini_api'?'live':'sample'})`}</title></circle>)}</svg>})()}
        <p className="ql-sub">Oldest to newest, up to 20 runs. Green dots are live runs, purple are sample replays.</p>
      </div>

      {/* Main Investigation Panel */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl shadow-md overflow-hidden">
        {/* Table Header and Controls */}
        <div className="p-4 sm:p-5 border-b border-zinc-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span>All tests in this run</span>
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
