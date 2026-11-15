import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Cpu,
  Database,
  FlaskConical,
  BarChart3,
  Sparkles,
  ShieldCheck,
  FileText,
  ListCheck,
  Settings,
  Scale
} from 'lucide-react';

interface SidebarProps {
  device?: string;
  isOnline: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ device = 'CPU', isOnline }) => {
  const navItems = [
    { to: '/', label: 'Overview', icon: LayoutDashboard },
    { to: '/models', label: 'Model Registry', icon: Cpu },
    { to: '/datasets', label: 'Dataset Explorer', icon: Database },
    { to: '/evaluations', label: 'Evaluation Lab', icon: FlaskConical },
    { to: '/analysis', label: 'Bias Analysis', icon: BarChart3 },
    { to: '/playground', label: 'Prompt Playground', icon: Sparkles },
    { to: '/mitigation', label: 'Mitigation Studio', icon: ShieldCheck },
    { to: '/reports', label: 'Research Reports', icon: FileText },
    { to: '/testsuites', label: 'Custom Test Suite', icon: ListCheck },
    { to: '/settings', label: 'Settings & Status', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-screen sticky top-0 select-none z-20">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800/80 flex items-center space-x-3">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/20">
          <Scale className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-base font-bold text-white tracking-tight flex items-center gap-1.5">
            FairLens <span className="text-blue-400 font-extrabold text-xs px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/20">AI</span>
          </h1>
          <p className="text-[11px] text-slate-400 font-medium">Responsible LLM Evaluation</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="px-3 py-1.5 text-[10px] font-semibold tracking-wider text-slate-500 uppercase">
          Navigation
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30 shadow-sm shadow-blue-500/10'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* System Status Footer */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/40">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
          <span className="flex items-center space-x-1.5">
            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
            <span className="font-medium text-slate-300">{isOnline ? 'API Connected' : 'Offline'}</span>
          </span>
          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-cyan-300 uppercase border border-slate-700">
            {device}
          </span>
        </div>
        <div className="text-[11px] text-slate-500">
          Responsible AI &bull; FairLens Core v1.0
        </div>
      </div>
    </aside>
  );
};
