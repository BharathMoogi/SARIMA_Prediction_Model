import React from 'react';
import {
  LayoutDashboard,
  Database,
  TrendingUp,
  Cpu,
  Layers,
  Activity,
} from 'lucide-react';

export type NavTab = 'overview' | 'historical' | 'forecast' | 'model';

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  datasetCount?: number;
  lastDate?: string | null;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  datasetCount = 249,
  lastDate = '2025-09-01',
}) => {
  const navItems = [
    {
      id: 'overview' as NavTab,
      label: 'Overview Dashboard',
      description: 'KPIs, trend charts & summary',
      icon: LayoutDashboard,
    },
    {
      id: 'historical' as NavTab,
      label: 'Historical Data',
      description: 'Records table & CSV upload',
      icon: Database,
      badge: datasetCount ? `${datasetCount} rows` : undefined,
    },
    {
      id: 'forecast' as NavTab,
      label: '12-Month Forecast',
      description: 'Oct 2025 – Sep 2026 table & CI',
      icon: TrendingUp,
      badge: '12 Mos',
    },
    {
      id: 'model' as NavTab,
      label: 'Model Performance',
      description: 'SARIMA specs, AIC/BIC & metrics',
      icon: Cpu,
    },
  ];

  return (
    <aside className="w-full md:w-64 bg-slate-900 text-slate-100 flex flex-col shrink-0 border-r border-slate-800">
      {/* Brand & App Title */}
      <div className="p-5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600 rounded-lg shadow-md">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight">PriceForecast AI</h1>
            <p className="text-xs text-indigo-400 font-medium">SARIMA Analytics System</p>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-3 space-y-1">
        <div className="px-3 py-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
          Analytics Navigation
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full text-left flex items-start gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="truncate">{item.label}</span>
                  {item.badge && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                        isActive
                          ? 'bg-indigo-700 text-indigo-100'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
                <p className={`text-xs truncate ${isActive ? 'text-indigo-200' : 'text-slate-500'}`}>
                  {item.description}
                </p>
              </div>
            </button>
          );
        })}
      </nav>

      {/* Active Model Snapshot Card */}
      <div className="p-4 m-3 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs">
        <div className="flex items-center gap-2 text-indigo-400 font-semibold mb-1.5">
          <Layers className="w-4 h-4" />
          <span>Active Architecture</span>
        </div>
        <div className="font-mono text-slate-200 text-xs font-semibold mb-1">
          SARIMA(0, 1, 2)(0, 0, 1)₁₂
        </div>
        <div className="text-slate-400 text-[11px] space-y-0.5">
          <div>Trained Horizon: 249 Mos</div>
          <div>Latest Historical: {lastDate || '2025-09-01'}</div>
        </div>
        <div className="mt-2.5 pt-2 border-t border-slate-700/60 flex items-center gap-1.5 text-[11px] text-emerald-400">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Verified Production Model</span>
        </div>
      </div>
    </aside>
  );
};
