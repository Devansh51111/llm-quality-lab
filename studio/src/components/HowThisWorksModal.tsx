import { X, ShieldAlert, CheckCircle2, AlertTriangle, BookOpen, Fingerprint, Cpu } from 'lucide-react';

interface HowThisWorksModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HowThisWorksModal({ isOpen, onClose }: HowThisWorksModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl p-6 sm:p-8 text-zinc-200">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition-colors"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-zinc-800">
          <div className="p-2.5 bg-cyan-950/70 border border-cyan-800/60 rounded-lg text-cyan-400">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">How LLM QualityLab Works</h2>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">Architecture, Evaluation Methodology &amp; Engineering Boundaries</p>
          </div>
        </div>

        {/* Prominent Non-Guarantee Disclaimer */}
        <div className="mb-6 p-4 bg-amber-950/40 border border-amber-800/60 rounded-lg text-xs leading-relaxed text-amber-200/90 flex gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-amber-300 block mb-1">PROMINENT NON-GUARANTEE NOTICE</span>
            LLM QualityLab executes programmatic constraint checks and heuristic LLM evaluations against specified reference context. Passing deterministic QA checks does not guarantee absolute safety, legal compliance, factual truthfulness, or mathematical correctness of generated outputs in production environments. This application is an internal owner QA tool for developer verification.
          </div>
        </div>

        <div className="space-y-6 text-sm text-zinc-300">
          {/* Section 1 */}
          <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-lg p-4">
            <h3 className="text-white font-semibold flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              1. Deterministic Rule Verification (Zero-Hallucination Testing)
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Real QA in production starts with deterministic constraints that can be objectively proven without reliance on another fallible model:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-xs text-zinc-400">
              <li><strong className="text-zinc-200">Required Phrases:</strong> Verifies that essential policy boundaries, durations (e.g. &quot;14-day&quot;), or error codes are present.</li>
              <li><strong className="text-zinc-200">Prohibited Phrases:</strong> Prevents unauthorized commitments (e.g. &quot;unlimited trial&quot;), competitor mentions, or hallucinations.</li>
              <li><strong className="text-zinc-200">Citation Integrity:</strong> Checks whether document tags like <code className="text-cyan-300 font-mono">[DOC-14]</code> are retained.</li>
              <li><strong className="text-zinc-200">Structured JSON Syntax:</strong> Ensures responses parse into clean JSON objects without truncation or corruption.</li>
              <li><strong className="text-zinc-200">PII &amp; Secret Guards:</strong> Scans outputs with regex for Social Security Numbers, 16-digit credit cards, and internal employee emails.</li>
            </ul>
          </div>

          {/* Section 2 */}
          <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-lg p-4">
            <h3 className="text-white font-semibold flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              2. Strict Terminology: Deterministic Pass Rate != Accuracy
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              We strictly forbid mislabeling rule compliance percentages as &quot;Accuracy&quot; or &quot;Faithfulness&quot;. A model could repeat the phrase &quot;14-day&quot; while answering an unrelated question. In this lab, metrics are clearly labeled as <strong className="text-zinc-200">Deterministic Rules Pass Rate</strong>.
            </p>
          </div>

          {/* Section 3 */}
          <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-lg p-4">
            <h3 className="text-white font-semibold flex items-center gap-2 mb-2">
              <Cpu className="w-4 h-4 text-purple-400" />
              3. Model Judge is an &quot;Uncalibrated Model Estimate&quot;
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              When the optional LLM-as-a-judge evaluation is executed, it is transparently tagged as an <strong className="text-purple-300">Uncalibrated Model Estimate (Not Ground Truth)</strong>. An LLM judge provides useful heuristic feedback on tone and grounding, but is not infallible ground truth.
            </p>
          </div>

          {/* Section 4 */}
          <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-lg p-4">
            <h3 className="text-white font-semibold flex items-center gap-2 mb-2">
              <Fingerprint className="w-4 h-4 text-cyan-400" />
              4. Dataset Fingerprint &amp; Regression Integrity
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              To prevent false comparisons across mismatched test suites, every run calculates a non-cryptographic content fingerprint (prefixed with `content-fp-`) from the test case IDs and criteria. It detects dataset edits without claiming cryptographic security. Two runs can only be compared in the Regression view if their dataset fingerprints match exactly.
            </p>
          </div>

          {/* Section 5 */}
          <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-lg p-4">
            <h3 className="text-white font-semibold flex items-center gap-2 mb-2">
              <ShieldAlert className="w-4 h-4 text-red-400" />
              5. The Critical Failure Release Gate
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Even if a test run achieves a 95% pass rate, any failure marked with <strong className="text-red-400">Critical severity</strong> (such as leaking confidential PII, ignoring missing evidence, or misrepresenting binding trial terms) immediately blocks the release gate.
            </p>
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-zinc-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold text-zinc-900 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors cursor-pointer"
          >
            Acknowledge &amp; Return to Lab
          </button>
        </div>
      </div>
    </div>
  );
}
