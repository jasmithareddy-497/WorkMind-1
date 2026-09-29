import { useEffect, useState, useCallback } from 'react';
import {
  TrendingUp, Sparkles, CheckCircle2, AlertTriangle,
  Target, ArrowRight, Clock, Activity,
} from 'lucide-react';
import type { Experience } from '@/lib/types';
import { fetchExperiences } from '@/lib/api';
import type { Route } from '@/lib/router';
import { LoadingState, ErrorState, EmptyState } from '@/components/States';
import { CategoryBadge } from '@/components/Badges';

interface LearningInsightsProps {
  navigate: (route: Route) => void;
}

export function LearningInsights({ navigate }: LearningInsightsProps) {
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchExperiences();
      setExperiences(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingState message="Loading insights…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  const hasData = experiences.length > 0;

  // Compute patterns from real data
  const categoryCounts = experiences.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + 1;
    return acc;
  }, {});
  const sortedCategories = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]);
  const topCategory = sortedCategories[0]?.[0] ?? '—';
  const maxCount = sortedCategories[0]?.[1] ?? 1;

  const successCount = experiences.filter(e => e.outcome === 'Success').length;
  const failedCount = experiences.filter(e => e.outcome === 'Failed').length;
  const inProgressCount = experiences.filter(e => e.outcome === 'In Progress' || (!e.outcome && e.status === 'draft')).length;

  const recurringApproaches = experiences
    .filter(e => e.approach)
    .slice(0, 3);

  const successfulStrategies = experiences
    .filter(e => e.outcome === 'Success' && e.lesson)
    .slice(0, 3);

  const assistanceAreas = sortedCategories.slice(0, 3).map(([cat, count]) => ({
    category: cat,
    count,
    percent: Math.round((count / experiences.length) * 100),
  }));

  // Learning evolution timeline
  const timeline = experiences.slice(0, 6).reverse().map((exp, i) => ({
    title: exp.title,
    category: exp.category,
    date: new Date(exp.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    milestone: i === 0 ? 'First experience' : `Experience #${i + 1}`,
    outcome: exp.outcome,
  }));

  return (
    <div className="max-w-6xl mx-auto px-8 py-10 animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-3">
          <button onClick={() => navigate({ name: 'dashboard' })} className="hover:text-slate-300 transition-colors">Dashboard</button>
          <ArrowRight className="w-3 h-3" />
          <span className="text-slate-300">Learning Insights</span>
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight mb-1 flex items-center gap-3">
          <TrendingUp className="w-6 h-6 text-sky-400" />
          Learning Insights
        </h1>
        <p className="text-slate-400 text-sm max-w-xl">
          How WorkMind will learn from your repeated interactions — identifying patterns,
          strategies, and areas where you tend to need assistance.
        </p>
      </div>

      {!hasData ? (
        <div className="glass-card">
          <EmptyState
            icon={<TrendingUp className="w-7 h-7" />}
            title="No learning data yet"
            description="Insights will appear here as you accumulate problem-solving experiences. Start working through problems to build your learning profile."
            action={{ label: 'Start New Problem', onClick: () => navigate({ name: 'workspace' }) }}
          />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="glass-card p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                </div>
                <span className="text-sm text-slate-400">Success Rate</span>
              </div>
              <div className="text-2xl font-bold text-white">
                {experiences.length > 0 ? Math.round((successCount / experiences.length) * 100) : 0}%
              </div>
              <div className="text-xs text-slate-500 mt-1">{successCount} of {experiences.length} resolved</div>
            </div>
            <div className="glass-card p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-lg bg-brand-500/15 flex items-center justify-center">
                  <Target className="w-4 h-4 text-brand-400" />
                </div>
                <span className="text-sm text-slate-400">Top Category</span>
              </div>
              <div className="text-2xl font-bold text-white">{topCategory}</div>
              <div className="text-xs text-slate-500 mt-1">{sortedCategories[0]?.[1]} experiences</div>
            </div>
            <div className="glass-card p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-lg bg-sky-500/15 flex items-center justify-center">
                  <Activity className="w-4 h-4 text-sky-400" />
                </div>
                <span className="text-sm text-slate-400">Total Experiences</span>
              </div>
              <div className="text-2xl font-bold text-white">{experiences.length}</div>
              <div className="text-xs text-slate-500 mt-1">{inProgressCount} in progress</div>
            </div>
          </div>

          {/* Problem-solving patterns */}
          <div className="glass-card p-6">
            <h2 className="text-base font-semibold text-white mb-5 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand-400" />
              Problem-Solving Patterns
            </h2>
            <div className="space-y-4">
              {sortedCategories.map(([cat, count]) => (
                <div key={cat}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-300">{cat}</span>
                    <span className="text-xs text-slate-500">{count} {count === 1 ? 'problem' : 'problems'}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-brand-500 to-sky-500 transition-all duration-500"
                      style={{ width: `${(count / maxCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recurring approaches */}
            <div className="glass-card p-6">
              <h2 className="text-base font-semibold text-white mb-5 flex items-center gap-2">
                <Clock className="w-4 h-4 text-sky-400" />
                Recurring Approaches
              </h2>
              {recurringApproaches.length === 0 ? (
                <p className="text-sm text-slate-500 py-4">No approaches recorded yet.</p>
              ) : (
                <div className="space-y-3">
                  {recurringApproaches.map(exp => (
                    <div key={exp.id} className="p-3.5 rounded-xl bg-slate-800/30 border border-slate-700/40">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <h4 className="text-sm font-medium text-slate-200 truncate">{exp.title}</h4>
                        <CategoryBadge category={exp.category} />
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">{exp.approach}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Successful strategies */}
            <div className="glass-card p-6">
              <h2 className="text-base font-semibold text-white mb-5 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Successful Strategies
              </h2>
              {successfulStrategies.length === 0 ? (
                <p className="text-sm text-slate-500 py-4">No successful strategies recorded yet.</p>
              ) : (
                <div className="space-y-3">
                  {successfulStrategies.map(exp => (
                    <div key={exp.id} className="p-3.5 rounded-xl bg-slate-800/30 border border-emerald-500/10">
                      <h4 className="text-sm font-medium text-slate-200 mb-1.5 truncate">{exp.title}</h4>
                      <p className="text-xs text-emerald-300/80 line-clamp-3 leading-relaxed">"{exp.lesson}"</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Areas needing assistance */}
          <div className="glass-card p-6">
            <h2 className="text-base font-semibold text-white mb-5 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Areas Where You Need Assistance
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {assistanceAreas.map(area => (
                <div key={area.category} className="p-4 rounded-xl bg-slate-800/30 border border-slate-700/40">
                  <div className="flex items-center justify-between mb-2">
                    <CategoryBadge category={area.category} />
                    <span className="text-xs text-slate-500">{area.percent}%</span>
                  </div>
                  <div className="text-2xl font-bold text-white mb-1">{area.count}</div>
                  <div className="text-xs text-slate-500">problems in this area</div>
                </div>
              ))}
            </div>
          </div>

          {/* Learning evolution timeline */}
          <div className="glass-card p-6">
            <h2 className="text-base font-semibold text-white mb-6 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-sky-400" />
              Learning Evolution Timeline
            </h2>
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-[7px] top-2 bottom-2 w-px bg-gradient-to-b from-brand-500/60 via-sky-500/40 to-transparent" />

              <div className="space-y-5">
                {timeline.map((item, i) => (
                  <div key={i} className="relative pl-8 animate-slide-in" style={{ animationDelay: `${i * 80}ms` }}>
                    <div className={`absolute left-0 top-1 w-3.5 h-3.5 rounded-full border-2 ${
                      item.outcome === 'Success'
                        ? 'bg-emerald-500 border-emerald-400'
                        : item.outcome === 'Failed'
                        ? 'bg-rose-500 border-rose-400'
                        : 'bg-slate-700 border-slate-500'
                    }`} />
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-slate-500">{item.date}</span>
                      <span className="text-[10px] text-brand-400 font-medium uppercase tracking-wider">{item.milestone}</span>
                    </div>
                    <h4 className="text-sm font-medium text-slate-200 mb-1">{item.title}</h4>
                    <div className="flex items-center gap-2">
                      <CategoryBadge category={item.category} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer note */}
          <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-900/40 border border-slate-800/60">
            <Sparkles className="w-4 h-4 text-brand-400 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-400 leading-relaxed">
              These insights are derived from your saved experiences. When Hindsight integration is connected,
              WorkMind will automatically analyze patterns across all interactions and generate deeper,
              personalized learning insights over time.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
