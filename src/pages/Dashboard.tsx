import { useEffect, useState, useCallback } from 'react';
import {
  Database, CheckCircle2, ArrowRight, Plus, Clock,
  AlertTriangle, Sparkles, Search, Zap,
} from 'lucide-react';
import { fetchExperiences, fetchIncidents } from '@/lib/api';
import type { Experience } from '@/lib/types';
import type { IncidentMemoryRow } from '@/lib/api';
import type { Route } from '@/lib/router';
import { LoadingState, ErrorState, EmptyState } from '@/components/States';
import { CategoryBadge } from '@/components/Badges';

interface DashboardProps {
  navigate: (route: Route) => void;
}

function relativeDate(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) {
    const hrs = Math.floor(diff / 3600000);
    if (hrs === 0) {
      const mins = Math.floor(diff / 60000);
      return mins <= 1 ? 'Just now' : `${mins}m ago`;
    }
    return `${hrs}h ago`;
  }
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function Dashboard({ navigate }: DashboardProps) {
  const [incidents, setIncidents] = useState<IncidentMemoryRow[]>([]);
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [incData, expData] = await Promise.all([
        fetchIncidents(),
        fetchExperiences(),
      ]);
      setIncidents(incData);
      setExperiences(expData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingState message="Loading dashboard…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  const totalIncidents = incidents.length;
  const resolvedIncidents = incidents.filter(i => i.resolution !== null);
  const resolvedCount = resolvedIncidents.length;

  // Hindsight matches: incidents analyzed after at least one prior incident existed
  const hindsightMatchCount = totalIncidents > 1 ? totalIncidents - 1 : 0;

  // Recent incidents (last 5)
  const recentIncidents = incidents.slice(0, 5);

  // Recent resolutions (last 3 with resolution)
  const recentResolutions = resolvedIncidents.slice(0, 3);

  // Most recent successful resolution
  const lastSuccess = resolvedIncidents.find(i => i.outcome === 'Success') ?? null;

  // Experience lookup for category
  const expByDescription = new Map(experiences.map(e => [e.description, e]));

  const overviewCards = [
    {
      label: 'Total Incidents',
      value: totalIncidents,
      icon: Database,
      iconBg: 'bg-brand-500/10 border border-brand-500/20',
      iconColor: 'text-brand-400',
    },
    {
      label: 'Resolved Incidents',
      value: resolvedCount,
      icon: CheckCircle2,
      iconBg: 'bg-emerald-500/10 border border-emerald-500/20',
      iconColor: 'text-emerald-400',
    },
    {
      label: 'Hindsight Matches',
      value: hindsightMatchCount,
      icon: Search,
      iconBg: 'bg-sky-500/10 border border-sky-500/20',
      iconColor: 'text-sky-400',
    },
    {
      label: 'Recent Incidents',
      value: recentIncidents.length,
      icon: Clock,
      iconBg: 'bg-amber-500/10 border border-amber-500/20',
      iconColor: 'text-amber-400',
    },
  ];

  // ─── Empty state ───
  if (totalIncidents === 0) {
    return (
      <div className="max-w-6xl mx-auto px-8 py-10 animate-fade-in">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-white tracking-tight mb-2">
            RecallOps Dashboard
          </h1>
          <p className="text-slate-400 text-base max-w-xl">
            An AI-powered incident memory system. WorkMind remembers how you solved past
            incidents and surfaces relevant experience when new problems arise.
          </p>
        </div>

        <div className="glass-card p-10">
          <EmptyState
            icon={<AlertTriangle className="w-7 h-7" />}
            title="No incidents yet"
            description="Create your first incident and WorkMind will begin building your problem-solving memory — each analyzed incident strengthens future Hindsight recall."
            action={{ label: 'Create First Incident', onClick: () => navigate({ name: 'workspace' }) }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-6 flex-wrap mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight mb-1">
            RecallOps Dashboard
          </h1>
          <p className="text-slate-400 text-sm">
            Incident memory overview — {totalIncidents} {totalIncidents === 1 ? 'incident' : 'incidents'} tracked
          </p>
        </div>
        <button
          onClick={() => navigate({ name: 'workspace' })}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-500 to-sky-500 hover:from-brand-400 hover:to-sky-400 text-white text-sm font-semibold transition-all shadow-lg shadow-brand-500/20 hover:shadow-brand-500/30"
        >
          <Plus className="w-4 h-4" />
          New Problem
        </button>
      </div>

      {/* Overview cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {overviewCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="glass-card p-5 animate-slide-in"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-9 h-9 rounded-lg ${card.iconBg} flex items-center justify-center`}>
                  <Icon className={`w-4 h-4 ${card.iconColor}`} />
                </div>
              </div>
              <div className="text-2xl font-bold text-white tabular-nums">{card.value}</div>
              <div className="text-xs text-slate-500 mt-0.5">{card.label}</div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Recent Incidents */}
        <div className="lg:col-span-2 space-y-5">
          {/* Recent Incidents */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" />
                Recent Incidents
              </h2>
              <button
                onClick={() => navigate({ name: 'experiences' })}
                className="text-xs text-brand-400 hover:text-brand-300 font-medium flex items-center gap-1 transition-colors"
              >
                View all
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-2">
              {recentIncidents.map((inc) => {
                const isResolved = inc.resolution !== null;
                const hasAnalysis = inc.ai_analysis !== null;
                // Check if this incident could have had hindsight (not the oldest)
                const hasHindsight = hasAnalysis && incidents.findIndex(x => x.id === inc.id) < incidents.length - 1;
                const exp = expByDescription.get(inc.problem_description);

                return (
                  <button
                    key={inc.id}
                    onClick={() => {
                      if (exp) navigate({ name: 'workspace', experienceId: exp.id });
                      else navigate({ name: 'workspace' });
                    }}
                    className="w-full text-left p-3.5 rounded-xl bg-slate-800/30 border border-slate-700/40 hover:border-slate-600/60 hover:bg-slate-800/50 transition-all group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-200 font-medium line-clamp-1 group-hover:text-white transition-colors">
                          {inc.problem_description}
                        </p>
                        <div className="flex items-center gap-2 flex-wrap mt-2">
                          {exp && <CategoryBadge category={exp.category} />}
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                            isResolved
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : hasAnalysis
                                ? 'bg-sky-500/10 text-sky-400 border-sky-500/20'
                                : 'bg-slate-700/30 text-slate-400 border-slate-600/40'
                          }`}>
                            {isResolved ? 'Resolved' : hasAnalysis ? 'Analyzed' : 'Draft'}
                          </span>
                          {hasHindsight && (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-sky-500/5 text-sky-400/70 border border-sky-500/10">
                              <Search className="w-2.5 h-2.5" />
                              Hindsight
                            </span>
                          )}
                          <span className="text-[10px] text-slate-500 flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            {relativeDate(inc.created_at)}
                          </span>
                        </div>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-brand-400 group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Recent Resolutions */}
          <div className="glass-card p-5">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Recent Resolutions
            </h2>

            {recentResolutions.length === 0 ? (
              <div className="py-8 text-center">
                <div className="w-10 h-10 rounded-xl bg-slate-800/60 flex items-center justify-center mx-auto mb-2">
                  <CheckCircle2 className="w-4 h-4 text-slate-600" />
                </div>
                <p className="text-xs text-slate-500">
                  No resolutions recorded yet. Record a resolution after analyzing an incident to build your hindsight memory.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentResolutions.map((inc) => (
                  <div
                    key={inc.id}
                    className="p-3.5 rounded-xl bg-slate-800/30 border border-slate-700/40"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <p className="text-sm text-slate-200 font-medium line-clamp-1 flex-1">
                        {inc.problem_description}
                      </p>
                      {inc.outcome && (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border shrink-0 ${
                          inc.outcome === 'Success'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : inc.outcome === 'Failed'
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}>
                          {inc.outcome}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-2">
                      {inc.resolution}
                    </p>
                    <span className="text-[10px] text-slate-500 flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      {inc.resolved_at ? formatDate(inc.resolved_at) : relativeDate(inc.created_at)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: AI Memory Insight */}
        <div className="space-y-5">
          <div className="glass-card p-5">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-brand-400" />
              AI Memory Insight
            </h2>

            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-slate-800/30 border border-slate-700/40">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Incidents Stored</span>
                  <span className="text-lg font-bold text-white tabular-nums">{totalIncidents}</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-800/30 border border-slate-700/40">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Hindsight Matches</span>
                  <span className="text-lg font-bold text-sky-400 tabular-nums">{hindsightMatchCount}</span>
                </div>
                <p className="text-[10px] text-slate-600 mt-1">
                  Incidents analyzed with prior memory available
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-800/30 border border-slate-700/40">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-400">Resolution Rate</span>
                  <span className="text-lg font-bold text-emerald-400 tabular-nums">
                    {totalIncidents > 0 ? Math.round((resolvedCount / totalIncidents) * 100) : 0}%
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all"
                    style={{ width: `${totalIncidents > 0 ? (resolvedCount / totalIncidents) * 100 : 0}%` }}
                  />
                </div>
              </div>

              {lastSuccess ? (
                <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/15">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Zap className="w-3 h-3 text-emerald-400" />
                    <span className="text-[10px] uppercase tracking-wider font-medium text-emerald-400">
                      Most Recent Success
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 font-medium line-clamp-2 mb-1">
                    {lastSuccess.problem_description}
                  </p>
                  <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                    {lastSuccess.resolution}
                  </p>
                  <span className="text-[10px] text-slate-600 mt-1.5 block">
                    {lastSuccess.resolved_at ? formatDate(lastSuccess.resolved_at) : formatDate(lastSuccess.created_at)}
                  </span>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-slate-800/20 border border-slate-700/30">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Zap className="w-3 h-3 text-slate-600" />
                    <span className="text-[10px] uppercase tracking-wider font-medium text-slate-500">
                      No Successful Resolution Yet
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Record a resolution with outcome "Success" to see it highlighted here.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Quick links */}
          <button
            onClick={() => navigate({ name: 'memory' })}
            className="w-full glass-card p-4 text-left hover:border-slate-700 transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-brand-500/10 border border-brand-500/20 flex items-center justify-center shrink-0">
                <Database className="w-4 h-4 text-brand-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm text-white font-medium">Memory Panel</h3>
                <p className="text-xs text-slate-500">Browse stored incident memory</p>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-brand-400 transition-colors shrink-0" />
            </div>
          </button>

          <button
            onClick={() => navigate({ name: 'learning' })}
            className="w-full glass-card p-4 text-left hover:border-slate-700 transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 text-sky-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm text-white font-medium">Learning Insights</h3>
                <p className="text-xs text-slate-500">Patterns and strategies learned</p>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-brand-400 transition-colors shrink-0" />
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
