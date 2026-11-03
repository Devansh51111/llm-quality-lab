import { X, CalendarClock, Lock, Shield, Layers, Smartphone, Cloud, Activity } from 'lucide-react';

interface RoadmapModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RoadmapModal({ isOpen, onClose }: RoadmapModalProps) {
  if (!isOpen) return null;

  const roadmapItems = [
    {
      title: 'Multi-Turn Conversation QA & State Tracking',
      status: 'Planned, not implemented in v1.0',
      description: 'Evaluating multi-step context drift, session memory retention, and dialogue policy compliance across extended agent conversations.',
      icon: Layers,
      badgeColor: 'border-amber-700/60 bg-amber-950/40 text-amber-300',
    },
    {
      title: 'Appium & Mobile Device Test Runner',
      status: 'Planned, not implemented in v1.0',
      description: 'End-to-end automated UI validation for iOS and Android webviews, capturing rendered LLM chat interfaces on physical or emulated devices.',
      icon: Smartphone,
      badgeColor: 'border-zinc-700/60 bg-zinc-800/60 text-zinc-300',
    },
    {
      title: 'AWS Bedrock & Multi-Cloud Provider Adapters',
      status: 'Planned, not implemented in v1.0',
      description: 'External cloud runner integration for cross-vendor regression benchmarks (AWS Bedrock Claude, Amazon Titan, Azure OpenAI).',
      icon: Cloud,
      badgeColor: 'border-zinc-700/60 bg-zinc-800/60 text-zinc-300',
    },
    {
      title: 'Distributed Concurrent Load & Stress Testing',
      status: 'Planned, not implemented in v1.0',
      description: 'High-throughput stress benchmarks to measure token generation latency degradation, rate-limit queuing, and TTFT (Time To First Token) under 500+ QPS load.',
      icon: Activity,
      badgeColor: 'border-zinc-700/60 bg-zinc-800/60 text-zinc-300',
    },
    {
      title: 'Automated Adversarial Red-Teaming & Fuzzing',
      status: 'Planned, not implemented in v1.0',
      description: 'Automated perturbation mutation engine testing jailbreak prompts, token smuggling, base64 obfuscation, and prompt extraction attacks.',
      icon: Shield,
      badgeColor: 'border-zinc-700/60 bg-zinc-800/60 text-zinc-300',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl p-6 sm:p-7 text-zinc-200">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5 pb-4 border-b border-zinc-800">
          <div className="p-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300">
            <CalendarClock className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Product Scope &amp; Roadmap</h2>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">Preview v1.0 Supported Capabilities &amp; Planned Modules</p>
          </div>
        </div>

        <div className="mb-4 p-3 bg-zinc-950/80 border border-zinc-800 rounded-lg text-xs text-zinc-400 leading-relaxed flex items-start gap-2.5">
          <Lock className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <div>
            <strong className="text-zinc-200">Current Scope:</strong> LLM QualityLab v1.0 focuses strictly on single-turn deterministic reference paragraph QA, rule compliance verification, dataset editing, latency measurement, regression fingerprinting, and optional Gemini-based model judgment through AI Studio&apos;s free runtime.
          </div>
        </div>

        <div className="space-y-3 mt-4">
          {roadmapItems.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div key={idx} className="p-4 bg-zinc-950/50 border border-zinc-800/80 rounded-lg flex items-start gap-3.5">
                <div className="p-2 bg-zinc-900 border border-zinc-800 rounded text-zinc-400 shrink-0 mt-0.5">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                    <h4 className="text-sm font-semibold text-zinc-200">{item.title}</h4>
                    <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${item.badgeColor}`}>
                      {item.status}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">{item.description}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 pt-4 border-t border-zinc-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors cursor-pointer"
          >
            Close Scope Overview
          </button>
        </div>
      </div>
    </div>
  );
}
