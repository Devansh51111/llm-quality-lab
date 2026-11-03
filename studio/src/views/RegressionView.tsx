import { useState } from 'react';
import { runsComparable } from '../utils/evaluator';
import {
  GitCompare,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Fingerprint,
  ShieldAlert,
  Clock,
  Layers
} from 'lucide-react';
import { RunResult, TestCaseResult } from '../types/qa';

interface RegressionViewProps {
  allRuns: RunResult[];
  activeRun: RunResult | null;
}

export function RegressionView({ allRuns, activeRun }: RegressionViewProps) {
  // Select two runs: baseline and comparison target
  const [baselineRunId, setBaselineRunId] = useState<string>(
    allRuns.length > 1 ? allRuns[1].runId : allRuns[0]?.runId || ''
  );
  const [targetRunId, setTargetRunId] = useState<string>(
    activeRun?.runId || allRuns[0]?.runId || ''
  );

  const baseline = allRuns.find((r) => r.runId === baselineRunId);
  const target = allRuns.find((r) => r.runId === targetRunId);

  // Check fingerprint match
  const fingerprintsMatch = runsComparable(baseline, target);

  // Compute regressions and improvements if matching
  let newlyPassed: TestCaseResult[] = [];
  let regressed: TestCaseResult[] = [];
  let persistentFails: TestCaseResult[] = [];
  let persistentPass: TestCaseResult[] = [];

  let passRateDelta = 0;
  let latencyDeltaMs: number | null = null;
  let criticalDelta = 0;

  if (fingerprintsMatch && baseline && target) {
    passRateDelta = Math.round((target.deterministicPassRate - baseline.deterministicPassRate) * 10) / 10;
    if (target.averageLatencyMs !== null && baseline.averageLatencyMs !== null) {
      latencyDeltaMs = target.averageLatencyMs - baseline.averageLatencyMs;
    }
    criticalDelta = target.criticalFailures - baseline.criticalFailures;

    const baselineCaseMap = new Map<string, TestCaseResult>(
      baseline.results.map((r) => [r.testCaseId, r])
    );

    for (const tResult of target.results) {
      const bResult = baselineCaseMap.get(tResult.testCaseId);
      if (!bResult) continue;

      if (!bResult.passed && tResult.passed) {
        newlyPassed.push(tResult);
      } else if (bResult.passed && !tResult.passed) {
        regressed.push(tResult);
      } else if (!bResult.passed && !tResult.passed) {
        persistentFails.push(tResult);
      } else if (bResult.passed && tResult.passed) {
        persistentPass.push(tResult);
      }
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="p-5 bg-zinc-900/90 border border-zinc-800 rounded-xl shadow-lg">
        <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <GitCompare className="w-5 h-5 text-cyan-400" />
          Regression &amp; Differential Analysis
        </h1>
        <p className="text-xs text-zinc-400 mt-1">
          Strictly compare test runs against the identical dataset fingerprint to identify regressions or improvements.
        </p>
      </div>

      {allRuns.length < 2 ? (
        <div className="p-12 bg-zinc-900/50 border border-zinc-800 rounded-xl text-center space-y-3">
          <Layers className="w-8 h-8 text-zinc-500 mx-auto" />
          <h3 className="text-base font-semibold text-zinc-200">Insufficient Runs for Regression</h3>
          <p className="text-xs text-zinc-400 max-w-md mx-auto">
            Regression analysis requires at least two recorded runs. Currently {allRuns.length} run is saved. Run another suite from Overview or Evaluation Lab to compare.
          </p>
        </div>
      ) : (
        <>
          {/* Run Selection Bar */}
          <div className="p-4 bg-zinc-900/80 border border-zinc-800 rounded-xl grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Baseline */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300 font-mono">
                Baseline Run (Reference)
              </label>
              <select
                aria-label="Baseline Run"
                value={baselineRunId}
                onChange={(e) => setBaselineRunId(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-200 px-3 py-2 rounded-lg focus:outline-hidden focus:border-cyan-500"
              >
                {allRuns.map((r) => (
                  <option key={r.runId} value={r.runId}>
                    {r.runName} ({r.deterministicPassRate}% pass | {r.datasetFingerprint})
                  </option>
                ))}
              </select>
            </div>

            {/* Target */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300 font-mono">
                Target Run (Comparison)
              </label>
              <select
                aria-label="Target Run"
                value={targetRunId}
                onChange={(e) => setTargetRunId(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-200 px-3 py-2 rounded-lg focus:outline-hidden focus:border-cyan-500"
              >
                {allRuns.map((r) => (
                  <option key={r.runId} value={r.runId}>
                    {r.runName} ({r.deterministicPassRate}% pass | {r.datasetFingerprint})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Fingerprint Mismatch Gate */}
          {!fingerprintsMatch ? (
            <div className="p-6 bg-amber-950/40 border border-amber-800/80 rounded-xl text-amber-200 text-xs space-y-3">
              <div className="flex items-center gap-2 font-bold text-amber-300 text-sm">
                <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
                <span>Run Contract Mismatch: Comparison Blocked</span>
              </div>
              <p className="font-sans leading-relaxed text-zinc-300">
                Select two distinct runs with identical stored case snapshots, fingerprints, and complete result IDs. Different contracts or incomplete snapshots cannot be compared. This is a consistency check, not tamper-proof provenance.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 font-mono text-[11px]">
                <div className="p-2.5 bg-zinc-950 rounded border border-amber-900/60">
                  <span className="text-zinc-500 block mb-1">Baseline Fingerprint:</span>
                  <span className="text-zinc-200 font-bold">{baseline?.datasetFingerprint || 'N/A'}</span>
                </div>
                <div className="p-2.5 bg-zinc-950 rounded border border-amber-900/60">
                  <span className="text-zinc-500 block mb-1">Target Fingerprint:</span>
                  <span className="text-zinc-200 font-bold">{target?.datasetFingerprint || 'N/A'}</span>
                </div>
              </div>
              <p className="text-[11px] text-zinc-400 font-sans">
                Please select two runs evaluated against the same dataset fingerprint above.
              </p>
            </div>
          ) : (
            <>
              {/* Differential Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                {/* Pass Rate Delta */}
                <div className="p-4 bg-zinc-900/80 border border-zinc-800 rounded-xl">
                  <div className="text-xs font-mono text-zinc-400 mb-1">Pass Rate Delta</div>
                  <div className="flex items-center gap-2">
                    {passRateDelta > 0 ? (
                      <ArrowUpRight className="w-5 h-5 text-emerald-400" />
                    ) : passRateDelta < 0 ? (
                      <ArrowDownRight className="w-5 h-5 text-red-400" />
                    ) : (
                      <Minus className="w-5 h-5 text-zinc-500" />
                    )}
                    <span
                      className={`text-2xl font-bold font-mono ${
                        passRateDelta > 0
                          ? 'text-emerald-400'
                          : passRateDelta < 0
                          ? 'text-red-400'
                          : 'text-zinc-200'
                      }`}
                    >
                      {passRateDelta > 0 ? `+${passRateDelta}%` : `${passRateDelta}%`}
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-500 font-mono mt-2">
                    {baseline?.deterministicPassRate}% → {target?.deterministicPassRate}%
                  </p>
                </div>

                {/* Newly Regressed Cases */}
                <div className="p-4 bg-zinc-900/80 border border-zinc-800 rounded-xl">
                  <div className="text-xs font-mono text-zinc-400 mb-1">Newly Regressed</div>
                  <div className="text-2xl font-bold font-mono text-red-400">
                    {regressed.length}
                  </div>
                  <p className="text-[10px] text-zinc-500 font-mono mt-2">
                    Cases that passed in baseline but now fail
                  </p>
                </div>

                {/* Newly Fixed Cases */}
                <div className="p-4 bg-zinc-900/80 border border-zinc-800 rounded-xl">
                  <div className="text-xs font-mono text-zinc-400 mb-1">Newly Fixed / Passing</div>
                  <div className="text-2xl font-bold font-mono text-emerald-400">
                    {newlyPassed.length}
                  </div>
                  <p className="text-[10px] text-zinc-500 font-mono mt-2">
                    Cases that failed in baseline but now pass
                  </p>
                </div>

                {/* Wall Latency Delta */}
                <div className="p-4 bg-zinc-900/80 border border-zinc-800 rounded-xl">
                  <div className="text-xs font-mono text-zinc-400 mb-1">Latency Delta</div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-cyan-400" />
                    <span className="text-2xl font-bold font-mono text-white">
                      {latencyDeltaMs !== null
                        ? latencyDeltaMs > 0
                          ? `+${latencyDeltaMs}ms`
                          : `${latencyDeltaMs}ms`
                        : 'Unmeasured'}
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-500 font-mono mt-2">
                    {baseline?.averageLatencyMs !== null ? `${baseline?.averageLatencyMs}ms` : 'Unmeasured'} →{' '}
                    {target?.averageLatencyMs !== null ? `${target?.averageLatencyMs}ms` : 'Unmeasured'}
                  </p>
                </div>
              </div>

              {/* Regressed Test Cases (Critical Review) */}
              {regressed.length > 0 && (
                <div className="p-5 bg-red-950/20 border border-red-800/80 rounded-xl space-y-3">
                  <h3 className="text-sm font-bold text-red-300 flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-400" />
                    Regressed Cases (Newly Failing in Target Run)
                  </h3>
                  <p className="text-xs text-zinc-400">
                    These test cases previously passed in baseline, but failed in the target run.
                  </p>

                  <div className="space-y-2 pt-1">
                    {regressed.map((c) => (
                      <div
                        key={c.testCaseId}
                        className="p-3 bg-zinc-950 rounded-lg border border-red-900/60 text-xs font-mono space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-zinc-200">{c.testCaseName}</span>
                          <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-red-900/60 text-red-200">
                            {c.severity}
                          </span>
                        </div>
                        <div className="text-zinc-400 font-sans text-[11px]">{c.question}</div>
                        <div className="text-red-300 text-[11px]">
                          Violations: {c.failureReasons.join('; ')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Newly Passing / Improved Cases */}
              {newlyPassed.length > 0 && (
                <div className="p-5 bg-emerald-950/20 border border-emerald-800/80 rounded-xl space-y-3">
                  <h3 className="text-sm font-bold text-emerald-300 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Improvements (Newly Passing in Target Run)
                  </h3>
                  <div className="space-y-2 pt-1">
                    {newlyPassed.map((c) => (
                      <div
                        key={c.testCaseId}
                        className="p-3 bg-zinc-950 rounded-lg border border-emerald-900/60 text-xs font-mono space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-zinc-200">{c.testCaseName}</span>
                          <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-emerald-900/60 text-emerald-200">
                            {c.severity}
                          </span>
                        </div>
                        <div className="text-emerald-300 text-[11px]">All checks now passing.</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Stable / Persistent Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-zinc-900/70 border border-zinc-800 rounded-xl">
                  <div className="text-xs font-mono text-zinc-400 mb-1">
                    Consistently Passing: {persistentPass.length}
                  </div>
                  <p className="text-xs text-zinc-500 font-sans">
                    Cases that passed in both baseline and target runs.
                  </p>
                </div>

                <div className="p-4 bg-zinc-900/70 border border-zinc-800 rounded-xl">
                  <div className="text-xs font-mono text-zinc-400 mb-1">
                    Persistent Failures: {persistentFails.length}
                  </div>
                  <p className="text-xs text-zinc-500 font-sans">
                    Cases that failed in both runs and require prompt or constraint tuning.
                  </p>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
