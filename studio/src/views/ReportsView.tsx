import { useState } from 'react';
import {
  FileText,
  Download,
  Copy,
  Check,
  Trash2,
  ShieldAlert,
  Fingerprint,
  Clock,
  Cpu,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import { RunResult } from '../types/qa';

interface ReportsViewProps {
  activeRun: RunResult | null;
  allRuns: RunResult[];
  onSelectRun: (runId: string) => void;
  onClearStorage: () => void;
}

export function ReportsView({
  activeRun,
  allRuns,
  onSelectRun,
  onClearStorage,
}: ReportsViewProps) {
  const [copiedMd, setCopiedMd] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const generateMarkdownReport = (run: RunResult): string => {
    return `# LLM QualityLab - Audit Report
**Run ID:** \`${run.runId}\`
**Run Name:** ${run.runName}
**Execution Timestamp:** ${run.timestamp}
**Model Identifier:** \`${run.actualModelVersion || run.requestedModel}\`
**Run Origin:** ${run.runOrigin === 'live_gemini_api' ? `Live Gemini API (${run.requestedModel || 'gemini-3.5-flash-lite'})` : 'Synthetic Sample Replay'}
**Dataset Fingerprint:** \`${run.datasetFingerprint}\`

---

## Executive Summary
- **Deterministic Rules Pass Rate:** **${run.deterministicPassRate}%** (*Strict rule compliance; not labeled accuracy or ground truth*)
- **Release Gate Decision:** **${run.releaseGateStatus}** (${run.releaseGateReason})
- **Total Test Cases:** ${run.totalCases}
- **Passed Cases:** ${run.passedCases}
- **Failed Cases:** ${run.failedCases}
- **Critical Failures:** ${run.criticalFailures}
- **Average Wall-Clock Latency:** ${run.averageLatencyMs}ms (Min: ${run.minLatencyMs}ms, Max: ${run.maxLatencyMs}ms)

---

## Detailed Test Case Results
${run.results
  .map(
    (r, i) => `### ${i + 1}. [${r.severity.toUpperCase()}] ${r.testCaseName}
- **Status:** ${r.passed ? 'PASSED' : r.isCriticalFailure ? 'CRITICAL FAILURE' : 'FAILED'}
- **Category:** ${r.category}
- **Observed Latency:** ${r.latencyMs}ms
- **Question:** "${r.question}"
- **Failure Reasons:** ${r.failureReasons.length > 0 ? r.failureReasons.join(', ') : 'None (All rules met)'}
- **Actual Output:**
\`\`\`
${r.actualOutput}
\`\`\`
`
  )
  .join('\n')}

---
*Notice: LLM QualityLab provides heuristic validation and deterministic constraint checking. Passing all QA checks does not guarantee absolute safety, legal compliance, or mathematical correctness.*
`;
  };

  const handleDownloadJson = (run: RunResult) => {
    const reportData = {
      qualityLabVersion: '0.3.0',
      reportType: 'LLM_QA_AUDIT_REPORT',
      provenance: {
        runId: run.runId,
        runName: run.runName,
        executionTimestamp: run.timestamp,
        requestedModel: run.requestedModel,
        actualModelVersion: run.actualModelVersion,
        runOrigin: run.runOrigin,
        datasetFingerprint: run.datasetFingerprint,
        environment: 'browser runtime (deployment not independently verified)',
      },
      summary: {
        deterministicPassRate: run.deterministicPassRate,
        releaseGateStatus: run.releaseGateStatus,
        totalCases: run.totalCases,
        passedCases: run.passedCases,
        failedCases: run.failedCases,
        criticalFailures: run.criticalFailures,
        averageLatencyMs: run.averageLatencyMs,
        minLatencyMs: run.minLatencyMs,
        maxLatencyMs: run.maxLatencyMs,
      },
      notes: run.notes,
      datasetSnapshot: run.datasetSnapshot,
      results: run.results,
      complianceDisclaimer:
        'Notice: Deterministic rule pass rate does not represent ground truth accuracy or absolute legal compliance.',
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(reportData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `qualitylab-audit-${run.runId}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleCopyMarkdown = (run: RunResult) => {
    const md = generateMarkdownReport(run);
    navigator.clipboard.writeText(md);
    setCopiedMd(true);
    setTimeout(() => setCopiedMd(false), 2000);
  };

  const handleCopyJson = (run: RunResult) => {
    navigator.clipboard.writeText(JSON.stringify(run, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 bg-zinc-900/90 border border-zinc-800 rounded-xl shadow-lg">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <FileText className="w-5 h-5 text-cyan-400" />
            Audit Reports &amp; Provenance Export
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Export machine-readable JSON reports with complete provenance (timestamps, content fingerprint, and model parameters) and markdown summaries.
          </p>
        </div>

        {activeRun && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => handleDownloadJson(activeRun)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-semibold text-xs rounded-lg transition-colors cursor-pointer shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Full JSON Audit</span>
            </button>

            <button
              onClick={() => handleCopyMarkdown(activeRun)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs rounded-lg border border-zinc-700 transition-colors cursor-pointer"
            >
              {copiedMd ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300">Markdown Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Markdown</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Security Notice & Data Retention */}
      <div className="p-4 bg-zinc-900/80 border border-zinc-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs">
            <span className="font-semibold text-zinc-200 block mb-0.5">
              Local Browser Storage Policy
            </span>
            <p className="text-zinc-400 font-sans leading-relaxed">
              All datasets, evaluated runs, and test configurations are retained exclusively in your local browser&apos;s localStorage. No external database or cloud synchronization is active. Do not store sensitive or confidential customer PII.
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowClearConfirm(true)}
          className="px-3 py-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-950/40 border border-red-900/50 rounded-lg transition-colors cursor-pointer shrink-0"
        >
          Clear All Local Lab Data
        </button>
      </div>

      {!activeRun ? (
        <div className="p-12 bg-zinc-900/50 border border-zinc-800 rounded-xl text-center text-zinc-500 text-xs space-y-3">
          <FileText className="w-8 h-8 mx-auto text-zinc-600" />
          <p className="font-semibold text-zinc-300">No Active Evaluation Run to Report</p>
          <p className="max-w-md mx-auto text-zinc-400">
            Execute a run on the Overview or Evaluation Lab tab to generate an audit report with full provenance.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Provenance Card */}
          <div className="p-5 bg-zinc-900/80 border border-zinc-800 rounded-xl shadow-md space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Fingerprint className="w-4 h-4 text-cyan-400" />
              Verifiable Run Provenance
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
              <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800">
                <span className="text-zinc-500 text-[10px] block mb-1">Execution ID</span>
                <span className="text-zinc-200 font-bold truncate block">{activeRun.runId}</span>
              </div>

              <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800">
                <span className="text-zinc-500 text-[10px] block mb-1">Timestamp</span>
                <span className="text-zinc-200 font-bold block">{activeRun.timestamp}</span>
              </div>

              <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800">
                <span className="text-zinc-500 text-[10px] block mb-1">Model Identifier</span>
                <span className="text-cyan-300 font-bold block">{activeRun.actualModelVersion || activeRun.requestedModel}</span>
              </div>

              <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800">
                <span className="text-zinc-500 text-[10px] block mb-1">Dataset Fingerprint</span>
                <span className="text-cyan-300 font-bold block truncate">{activeRun.datasetFingerprint}</span>
              </div>
            </div>
          </div>

          {/* Markdown Preview Area */}
          <div className="p-5 bg-zinc-900/80 border border-zinc-800 rounded-xl shadow-md space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <span className="text-xs font-mono uppercase text-zinc-400 font-semibold">
                Audit Report Markdown Preview
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopyMarkdown(activeRun)}
                  className="px-2.5 py-1 text-xs text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded transition-colors cursor-pointer"
                >
                  {copiedMd ? 'Copied' : 'Copy Text'}
                </button>
              </div>
            </div>

            <pre className="p-4 bg-zinc-950 rounded-lg border border-zinc-800 text-xs font-mono text-zinc-300 overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-96">
              {generateMarkdownReport(activeRun)}
            </pre>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Clearing Data */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl p-6 text-zinc-200 space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-base font-bold text-white">Clear All QualityLab Data?</h3>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed font-sans">
              This will erase all custom test cases, recorded execution runs, and browser persistence. The application will be re-initialized with the 8 fictional seed cases.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 text-xs text-zinc-300 hover:text-white bg-zinc-800 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onClearStorage();
                  setShowClearConfirm(false);
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-500 rounded-lg cursor-pointer"
              >
                Yes, Clear All Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
