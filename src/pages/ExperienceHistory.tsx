import { useEffect, useState, useCallback } from 'react';
import {
  History, ArrowRight, Search, Plus, Trash2,
  X, FileText, Tag, TrendingUp, Lightbulb, Calendar,
  CheckCircle2, XCircle, Target,
} from 'lucide-react';
import type { Experience } from '@/lib/types';
import { PROBLEM_CATEGORIES } from '@/lib/types';
import { fetchExperiences, deleteExperience } from '@/lib/api';
import type { Route } from '@/lib/router';
import { LoadingState, ErrorState, EmptyState, SkeletonCard } from '@/components/States';
import { OutcomeBadge, CategoryBadge, StatusBadge } from '@/components/Badges';

interface ExperienceHistoryProps {
  navigate: (route: Route) => void;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

export function ExperienceHistory({ navigate }: ExperienceHistoryProps) {
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [selected, setSelected] = useState<Experience | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchExperiences();
      setExperiences(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load experiences');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = experiences.filter(exp => {
    const matchesSearch = !search ||
      exp.title.toLowerCase().includes(search.toLowerCase()) ||
      exp.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = filterCategory === 'All' || exp.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const handleDelete = async (id: string) => {
    setDeleting(true);
    try {
      await deleteExperience(id);
      setSelected(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete experience');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-8 py-10 animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-3">
          <button onClick={() => navigate({ name: 'dashboard' })} className="hover:text-slate-300 transition-colors">Dashboard</button>
          <ArrowRight className="w-3 h-3" />
          <span className="text-slate-300">Experiences</span>
        </div>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight mb-1 flex items-center gap-3">
              <History className="w-6 h-6 text-brand-400" />
              Experience History
            </h1>
            <p className="text-slate-400 text-sm max-w-xl">
              Your complete problem-solving history. Each experience captures the problem, approach, outcome, and lessons learned.
            </p>
          </div>
          <button
            onClick={() => navigate({ name: 'workspace' })}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-500 to-sky-500 hover:from-brand-400 hover:to-sky-400 text-white text-sm font-semibold transition-all shadow-lg shadow-brand-500/20"
          >
            <Plus className="w-4 h-4" />
            New Problem
          </button>
        </div>
      </div>

      {/* Filters */}
      {experiences.length > 0 && (
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search experiences…"
              className="w-full bg-slate-900/60 border border-slate-700/60 rounded-xl pl-10 pr-4 py-2.5 text-slate-100 placeholder-slate-600 text-sm focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/30 transition-all"
            />
          </div>
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="bg-slate-900/60 border border-slate-700/60 rounded-xl px-4 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-brand-500/50 transition-all cursor-pointer"
          >
            <option value="All" className="bg-slate-900">All Categories</option>
            {PROBLEM_CATEGORIES.map(cat => (
              <option key={cat} value={cat} className="bg-slate-900">{cat}</option>
            ))}
          </select>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-sm text-rose-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : experiences.length === 0 ? (
        <div className="glass-card">
          <EmptyState
            icon={<History className="w-7 h-7" />}
            title="No experiences yet"
            description="Your problem-solving history will appear here. Start your first problem to begin building your experience log."
            action={{ label: 'Start New Problem', onClick: () => navigate({ name: 'workspace' }) }}
          />
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card py-12 text-center">
          <p className="text-sm text-slate-500">No experiences match your search or filter.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((exp, i) => (
            <button
              key={exp.id}
              onClick={() => setSelected(exp)}
              className="w-full text-left glass-card p-5 hover:border-slate-700 transition-all group animate-slide-in"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="text-slate-100 font-medium mb-1 group-hover:text-white transition-colors truncate">
                    {exp.title}
                  </h3>
                  <p className="text-sm text-slate-500 line-clamp-2 mb-3">{exp.description}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <CategoryBadge category={exp.category} />
                    <StatusBadge status={exp.status} />
                    <OutcomeBadge outcome={exp.outcome} />
                    <span className="text-[11px] text-slate-500 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(exp.created_at)}
                    </span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-brand-400 group-hover:translate-x-1 transition-all shrink-0 mt-1" />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in"
          onClick={() => setSelected(null)}
        >
          <div
            className="glass-card max-w-2xl w-full max-h-[85vh] overflow-y-auto p-7"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 mb-6">
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold text-white mb-2">{selected.title}</h2>
                <div className="flex items-center gap-2 flex-wrap">
                  <CategoryBadge category={selected.category} />
                  <StatusBadge status={selected.status} />
                  <OutcomeBadge outcome={selected.outcome} />
                  <span className="text-[11px] text-slate-500 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatDate(selected.created_at)}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <div className="flex items-center gap-2 mb-2 text-sm font-medium text-slate-300">
                  <FileText className="w-4 h-4 text-brand-400" />
                  Problem
                </div>
                <p className="text-sm text-slate-400 leading-relaxed bg-slate-800/30 rounded-xl p-4 border border-slate-700/40">
                  {selected.description}
                </p>
              </div>

              {selected.context && (
                <div>
                  <div className="flex items-center gap-2 mb-2 text-sm font-medium text-slate-300">
                    <Tag className="w-4 h-4 text-sky-400" />
                    Context
                  </div>
                  <p className="text-sm text-slate-400 leading-relaxed bg-slate-800/30 rounded-xl p-4 border border-slate-700/40">
                    {selected.context}
                  </p>
                </div>
              )}

              {selected.approach && (
                <div>
                  <div className="flex items-center gap-2 mb-2 text-sm font-medium text-slate-300">
                    <TrendingUp className="w-4 h-4 text-brand-400" />
                    Approach Taken
                  </div>
                  <p className="text-sm text-slate-400 leading-relaxed bg-slate-800/30 rounded-xl p-4 border border-slate-700/40 whitespace-pre-line">
                    {selected.approach}
                  </p>
                </div>
              )}

              {selected.successful_approach && (
                <div>
                  <div className="flex items-center gap-2 mb-2 text-sm font-medium text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Successful Approach
                  </div>
                  <p className="text-sm text-emerald-200/80 leading-relaxed bg-emerald-500/5 rounded-xl p-4 border border-emerald-500/10 whitespace-pre-line">
                    {selected.successful_approach}
                  </p>
                </div>
              )}

              {selected.failed_attempts && (
                <div>
                  <div className="flex items-center gap-2 mb-2 text-sm font-medium text-slate-300">
                    <XCircle className="w-4 h-4 text-rose-400" />
                    Failed Attempts
                  </div>
                  <p className="text-sm text-rose-200/80 leading-relaxed bg-rose-500/5 rounded-xl p-4 border border-rose-500/10 whitespace-pre-line">
                    {selected.failed_attempts}
                  </p>
                </div>
              )}

              {selected.decisions && selected.decisions.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2 text-sm font-medium text-slate-300">
                    <Target className="w-4 h-4 text-sky-400" />
                    Key Decisions
                  </div>
                  <ul className="space-y-1.5 bg-slate-800/30 rounded-xl p-4 border border-slate-700/40">
                    {selected.decisions.map((d, i) => (
                      <li key={i} className="text-sm text-slate-400 flex items-start gap-2">
                        <span className="w-1 h-1 rounded-full bg-sky-400 mt-2 shrink-0" />
                        {typeof d === 'object' && d !== null && 'decision' in d ? String(d.decision) : String(d)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {selected.lesson && (
                <div>
                  <div className="flex items-center gap-2 mb-2 text-sm font-medium text-slate-300">
                    <Lightbulb className="w-4 h-4 text-amber-400" />
                    Lesson Learned
                  </div>
                  <p className="text-sm text-amber-200/80 leading-relaxed bg-amber-500/5 rounded-xl p-4 border border-amber-500/10">
                    {selected.lesson}
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 mt-7 pt-5 border-t border-slate-800">
              <button
                onClick={() => navigate({ name: 'workspace', experienceId: selected.id })}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium transition-colors"
              >
                <ArrowRight className="w-4 h-4" />
                Open in Workspace
              </button>
              <button
                onClick={() => handleDelete(selected.id)}
                disabled={deleting}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-sm font-medium transition-colors ml-auto disabled:opacity-40"
              >
                <Trash2 className="w-4 h-4" />
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
