import React from 'react';
import { ShieldAlert, BookOpen } from 'lucide-react';

interface HeaderProps {
  title: string;
  description: string;
  action?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({ title, description, action }) => {
  return (
    <header className="px-8 py-6 border-b border-slate-800 bg-slate-900/60 backdrop-blur-md flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white">{title}</h2>
        <p className="text-sm text-slate-400 mt-0.5">{description}</p>
      </div>

      <div className="flex items-center space-x-3">
        {action}
        <div className="hidden lg:flex items-center space-x-2 text-xs text-slate-400 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/60">
          <BookOpen className="w-3.5 h-3.5 text-blue-400" />
          <span>Research Protocol: IEEE / ACM Ethics Compliant</span>
        </div>
      </div>
    </header>
  );
};
