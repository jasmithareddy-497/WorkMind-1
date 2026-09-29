import { LayoutDashboard, PenSquare, History, Database, TrendingUp, BrainCircuit } from 'lucide-react';
import { Logo } from './Logo';
import type { Route } from '@/lib/router';

interface SidebarProps {
  route: Route;
  navigate: (route: Route) => void;
}

const navItems: { label: string; icon: React.ReactNode; route: Route; description: string }[] = [
  { label: 'Dashboard', icon: <LayoutDashboard className="w-[18px] h-[18px]" />, route: { name: 'dashboard' }, description: 'Overview' },
  { label: 'New Problem', icon: <PenSquare className="w-[18px] h-[18px]" />, route: { name: 'workspace' }, description: 'Start working' },
  { label: 'Experiences', icon: <History className="w-[18px] h-[18px]" />, route: { name: 'experiences' }, description: 'History' },
  { label: 'Memory', icon: <Database className="w-[18px] h-[18px]" />, route: { name: 'memory' }, description: 'Memory layer' },
  { label: 'Learning Insights', icon: <TrendingUp className="w-[18px] h-[18px]" />, route: { name: 'learning' }, description: 'Patterns' },
];

export function Sidebar({ route, navigate }: SidebarProps) {
  const isActive = (item: Route): boolean => {
    if (item.name === route.name) {
      if (item.name === 'workspace' && route.name === 'workspace') {
        return !('experienceId' in route) === !('experienceId' in item);
      }
      return true;
    }
    return false;
  };

  return (
    <aside className="w-64 shrink-0 h-screen sticky top-0 flex flex-col border-r border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
      <div className="px-5 pt-6 pb-8">
        <Logo size="md" />
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item) => {
          const active = isActive(item.route);
          return (
            <button
              key={item.label}
              onClick={() => navigate(item.route)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group relative ${
                active
                  ? 'bg-gradient-to-r from-brand-500/15 to-transparent text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              {active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-7 rounded-r-full bg-gradient-to-b from-brand-400 to-sky-400" />
              )}
              <span className={`shrink-0 transition-colors ${active ? 'text-brand-400' : 'text-slate-500 group-hover:text-slate-300'}`}>
                {item.icon}
              </span>
              <span className="flex-1 text-left">
                <span className="block text-sm font-medium leading-tight">{item.label}</span>
                <span className={`block text-[11px] ${active ? 'text-brand-300/60' : 'text-slate-600'}`}>
                  {item.description}
                </span>
              </span>
            </button>
          );
        })}
      </nav>

      <div className="px-5 py-5 border-t border-slate-800/80">
        <div className="glass-card p-3.5 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center shrink-0">
            <BrainCircuit className="w-4 h-4 text-brand-400" />
          </div>
          <div>
            <div className="text-[11px] text-slate-300 font-medium leading-tight">Stage 1 · Demo</div>
            <div className="text-[10px] text-slate-500 leading-tight mt-0.5">Memory preview mode</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
