import { Loader2 } from 'lucide-react';

export function LoadingState({ message = 'Loading…' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 animate-fade-in">
      <Loader2 className="w-8 h-8 text-brand-400 animate-spin mb-4" />
      <p className="text-slate-400 text-sm">{message}</p>
    </div>
  );
}

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 animate-fade-in">
      <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-4">
        <span className="text-rose-400 text-xl">!</span>
      </div>
      <p className="text-slate-300 text-sm text-center max-w-md mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium transition-colors"
        >
          Try again
        </button>
      )}
    </div>
  );
}

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
      <div className="w-16 h-16 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-center mb-5 text-slate-500">
        {icon}
      </div>
      <h3 className="text-slate-200 font-semibold text-base mb-2">{title}</h3>
      <p className="text-slate-500 text-sm max-w-sm mb-5">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-500 to-sky-500 hover:from-brand-400 hover:to-sky-400 text-white text-sm font-semibold transition-all shadow-lg shadow-brand-500/20"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="glass-card p-5 animate-pulse">
      <div className="flex items-start justify-between mb-4">
        <div className="space-y-2 flex-1">
          <div className="h-4 bg-slate-700/50 rounded w-3/4" />
          <div className="h-3 bg-slate-700/30 rounded w-1/2" />
        </div>
        <div className="h-6 w-16 bg-slate-700/30 rounded-full" />
      </div>
      <div className="h-3 bg-slate-700/30 rounded w-full mb-2" />
      <div className="h-3 bg-slate-700/20 rounded w-2/3" />
    </div>
  );
}
