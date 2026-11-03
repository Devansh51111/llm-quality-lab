import {
  LayoutDashboard,
  Database,
  FlaskConical,
  ShieldAlert,
  GitCompare,
  FileText,
  Fingerprint,
  Trash2,
  X,
  AlertCircle
} from 'lucide-react';
import { RunResult } from '../types/qa';

export type TabId = 'overview' | 'datasets' | 'eval_lab' | 'safety' | 'regression' | 'reports' | 'claims' | 'conversations' | 'performance' | 'analytics' | 'semantic';

interface SidebarProps {
  currentTab: TabId;
  onSelectTab: (tab: TabId) => void;
  datasetCount: number;
  datasetFingerprint: string;
  activeRun: RunResult | null;
  onClearStorage: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({
  currentTab,
  onSelectTab,
  datasetCount,
  datasetFingerprint,
  activeRun,
  onClearStorage,
  isMobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const navItems = [
    {
      id: 'overview' as TabId,
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: activeRun?.criticalFailures ? `${activeRun.criticalFailures} Critical` : null,
      badgeVariant: 'danger',
    },
    {
      id: 'datasets' as TabId,
      label: 'Datasets',
      icon: Database,
      badge: `${datasetCount} Cases`,
      badgeVariant: 'neutral',
    },
    {
      id: 'eval_lab' as TabId,
      label: 'Test an answer',
      icon: FlaskConical,
      badge: null,
      badgeVariant: 'accent',
    },
    {
      id: 'safety' as TabId,
      label: 'Safety & Guardrails',
      icon: ShieldAlert,
      badge: null,
      badgeVariant: 'neutral',
    },
    {
      id: 'regression' as TabId,
      label: 'Regression Tracker',
      icon: GitCompare,
      badge: null,
      badgeVariant: 'neutral',
    },
    {id:'semantic' as TabId,label:'AI evidence review',icon:FlaskConical,badge:'Experimental',badgeVariant:'neutral'},
    {id:'claims' as TabId,label:'Claim Review',icon:FlaskConical,badge:null,badgeVariant:'neutral'},
    {id:'conversations' as TabId,label:'Multi-turn',icon:FileText,badge:null,badgeVariant:'neutral'},
    {id:'performance' as TabId,label:'Performance',icon:LayoutDashboard,badge:null,badgeVariant:'neutral'},
    {id:'analytics' as TabId,label:'Analytics',icon:LayoutDashboard,badge:null,badgeVariant:'neutral'},
    {
      id: 'reports' as TabId,
      label: 'Reports & Export',
      icon: FileText,
      badge: null,
      badgeVariant: 'neutral',
    },
  ];

  const handleNavClick = (tab: TabId) => {
    onSelectTab(tab);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 lg:top-16 bottom-0 left-0 z-40 w-64 bg-zinc-950 border-r border-zinc-800/80 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top sidebar header */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-zinc-800/80">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-mono tracking-widest text-zinc-400 font-semibold">
              Your workspace
            </span>
          </div>
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md cursor-pointer"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-colors cursor-pointer group ${
                  isActive
                    ? 'bg-zinc-800/90 text-white shadow-xs border border-zinc-700/80'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/80 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? 'text-cyan-400' : 'text-zinc-500 group-hover:text-zinc-300'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>

                {item.badge && (
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                      item.badgeVariant === 'danger'
                        ? 'bg-red-950/60 border-red-800/80 text-red-300'
                        : item.badgeVariant === 'accent'
                        ? 'bg-cyan-950/60 border-cyan-800/80 text-cyan-300'
                        : 'bg-zinc-900 border-zinc-700 text-zinc-400'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom dataset fingerprint & security notice */}
        <div className="p-3 border-t border-zinc-800/80 bg-zinc-950/60 space-y-3">
          {/* Fingerprint */}
          <div className="p-2.5 bg-zinc-900/90 border border-zinc-800 rounded-lg">
            <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono mb-1">
              <span className="flex items-center gap-1">
                <Fingerprint className="w-3 h-3 text-cyan-400" />
                Dataset Fingerprint
              </span>
              <span className="text-zinc-500">{datasetCount} items</span>
            </div>
            <div className="font-mono text-xs text-cyan-300 font-bold truncate">
              {datasetFingerprint}
            </div>
          </div>

          {/* Privacy Notice */}
          <div className="p-2 bg-zinc-900/40 border border-zinc-800/50 rounded-lg flex items-start gap-2 text-[10px] text-zinc-500 leading-snug">
            <AlertCircle className="w-3.5 h-3.5 text-zinc-400 shrink-0 mt-0.5" />
            <span>
              <strong>Local Storage Only:</strong> Do not store real customer PII or sensitive keys.
            </span>
          </div>

          {/* Clear storage */}
          <button
            onClick={onClearStorage}
            className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium text-zinc-400 hover:text-red-300 hover:bg-red-950/30 hover:border-red-900/50 border border-zinc-800 rounded-md transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Local Lab Data</span>
          </button>
        </div>
      </aside>
    </>
  );
}
