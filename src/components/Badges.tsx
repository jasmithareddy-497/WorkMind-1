import { OUTCOME_LABELS } from '@/lib/types';

const colorMap: Record<string, string> = {
  emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  rose: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  sky: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  slate: 'bg-slate-700/30 text-slate-400 border-slate-600/40',
};

export function OutcomeBadge({ outcome }: { outcome: string | null }) {
  if (!outcome) {
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${colorMap.slate}`}>
        Pending
      </span>
    );
  }
  const info = OUTCOME_LABELS[outcome] ?? { label: outcome, color: 'slate' };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${colorMap[info.color] ?? colorMap.slate}`}>
      {info.label}
    </span>
  );
}

export function CategoryBadge({ category }: { category: string }) {
  return (
    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-700/30 text-slate-300 border border-slate-600/40">
      {category}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: 'bg-slate-700/30 text-slate-400 border-slate-600/40',
    analyzed: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
    resolved: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${styles[status] ?? styles.draft}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
