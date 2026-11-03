import { ShieldCheck, HelpCircle, CalendarClock, Menu, Sparkles, Terminal } from 'lucide-react';
import { RunOrigin } from '../types/qa';

interface HeaderProps {
  onOpenHowThisWorks: () => void;
  onOpenRoadmap: () => void;
  onToggleMobileNav: () => void;
  activeRunOrigin?: RunOrigin | null;
  serverStatus?: { hasApiKey: boolean; tier: string } | null;
}

export function Header({
  onOpenHowThisWorks,
  onOpenRoadmap,
  onToggleMobileNav,
  activeRunOrigin,
  serverStatus,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 min-h-16 bg-zinc-950/90 border-b border-zinc-800/80 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between">
      <div className="flex items-center gap-1 sm:gap-3 min-w-0">
        {/* Mobile Hamburger */}
        <button
          onClick={onToggleMobileNav}
          className="lg:hidden p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Title branding (no third party) */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-600 to-emerald-500 flex items-center justify-center font-mono font-bold text-black text-sm shadow-md shadow-cyan-950/50">
            QL
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-white text-sm sm:text-base tracking-tight">LLM QualityLab</span>
              <span className="hidden sm:inline text-[10px] uppercase font-mono font-bold px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-300">
                Owner Preview
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 hidden sm:block">Deterministic QA &amp; Evaluation Bench</p>
          </div>
        </div>
      </div>

      {/* Middle status badges */}
      <div className="hidden xl:flex items-center gap-2.5 min-w-0">
        {/* Runtime tier badge */}
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-900 border border-zinc-800 rounded-md text-xs font-mono text-zinc-300"
        >
          <Terminal className="w-3.5 h-3.5 text-cyan-400" />
          <span>Model:</span>
          <span className="text-cyan-300 font-semibold">gemini-3.5-flash-lite</span>
        </div>

        {/* Runtime quota status */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-900 border border-zinc-800 rounded-md text-[11px] font-mono text-zinc-400">
          <span className={`w-2 h-2 rounded-full shrink-0 ${serverStatus?.hasApiKey ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
          <span>{serverStatus?.hasApiKey ? 'Credential configured; not a live-success guarantee' : 'No live backend credential verified'}</span>
        </div>

        {/* Active Run Origin Badge */}
        {activeRunOrigin && (
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono border ${
              activeRunOrigin === 'live_gemini_api'
                ? 'bg-cyan-950/60 border-cyan-700 text-cyan-300'
                : 'bg-purple-950/60 border-purple-800 text-purple-300'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Origin:</span>
            <span className="font-semibold">
              {activeRunOrigin === 'live_gemini_api' ? 'Live Gemini API' : 'Sample Replay (Timing N/A)'}
            </span>
          </div>
        )}
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenHowThisWorks}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg transition-colors cursor-pointer"
        >
          <HelpCircle className="w-4 h-4 text-cyan-400" />
          <span className="hidden sm:inline">How This Works</span>
        </button>

        <button
          onClick={onOpenRoadmap}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg transition-colors cursor-pointer"
        >
          <CalendarClock className="w-4 h-4 text-zinc-400" />
          <span className="hidden sm:inline">Roadmap</span>
        </button>
      </div>
    </header>
  );
}
