import { useEffect, useState, useCallback } from 'react';
import {
  Database, BookOpen, CheckCircle2, XCircle, Settings2,
  Layers, AlertCircle, ArrowRight, Sparkles,
} from 'lucide-react';
import type { Experience } from '@/lib/types';
import { fetchExperiences } from '@/lib/api';
import type { Route } from '@/lib/router';
import { LoadingState, ErrorState, EmptyState } from '@/components/States';
import { OutcomeBadge, CategoryBadge } from '@/components/Badges';

interface MemoryPanelProps {
  navigate: (route: Route) => void;
}

function relativeDate(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function MemoryPanel({ navigate }: MemoryPanelProps) {
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchExperiences();
      setExperiences(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load memory data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingState message="Loading memory layer…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  const relevantExperiences = experiences.slice(0, 4);
  const previousApproaches = experiences.filter(e => e.approach).slice(0, 4);
  const successfulStrategies = experiences.filter(e => e.outcome === 'Success').slice(0, 4);
  const failedApproaches = experiences.filter(e => e.outcome === 'Failed').slice(0, 4);
  const learnedPreferences = experiences.filter(e => e.lesson).slice(0, 4);

  const sections = [
    {
      title: 'Relevant Experiences',
      icon: <Layers className="w-5 h-5" />,
      color: 'text-brand-400',
      bg: 'from-brand-500/15 to-transparent',
      items: relevantExperiences,
      emptyMsg: 'No experiences stored yet. Solve problems to build this memory layer.',
      render: (exp: Experience) => (
        <div key={exp.id} className="p-3.5 rounded-xl bg-slate-800/30 border border-slate-700/40">
          <div className="flex items-start justify-between gap-3 mb-2">
            <h4 className="text-sm font-medium text-slate-200 truncate">{exp.title}</h4>
            <CategoryBadge category={exp.category} />
          </div>
          <p className="text-xs text-slate-500 line-clamp-2">{exp.description}</p>
        </div>
      ),
    },
    {
      title: 'Previous Approaches',
      icon: <BookOpen className="w-5 h-5" />,
      color: 'text-sky-400',
      bg: 'from-sky-500/15 to-transparent',
      items: previousApproaches,
      emptyMsg: 'No recorded approaches yet. They will appear here as you work through problems.',
      render: (exp: Experience) => (
        <div key={exp.id} className="p-3.5 rounded-xl bg-slate-800/30 border border-slate-700/40">
          <h4 className="text-sm font-medium text-slate-200 mb-1.5 truncate">{exp.title}</h4>
          <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">{exp.approach}</p>
        </div>
      ),
    },
    {
      title: 'Successful Strategies',
      icon: <CheckCircle2 className="w-5 h-5" />,
      color: 'text-emerald-400',
      bg: 'from-emerald-500/15 to-transparent',
      items: successfulStrategies,
      emptyMsg: 'No successful strategies recorded yet. Mark an experience as "Success" to see it here.',
      render: (exp: Experience) => (
        <div key={exp.id} className="p-3.5 rounded-xl bg-slate-800/30 border border-emerald-500/10">
          <div className="flex items-start justify-between gap-3 mb-2">
            <h4 className="text-sm font-medium text-slate-200 truncate">{exp.title}</h4>
            <OutcomeBadge outcome={exp.outcome} />
          </div>
          {exp.lesson && <p className="text-xs text-emerald-300/80 line-clamp-2">"{exp.lesson}"</p>}
        </div>
      ),
    },
    {
      title: 'Failed Approaches',
      icon: <XCircle className="w-5 h-5" />,
      color: 'text-rose-400',
      bg: 'from-rose-500/15 to-transparent',
      items: failedApproaches,
      emptyMsg: 'No failed approaches recorded. Learning from failures is part of the process.',
      render: (exp: Experience) => (
        <div key={exp.id} className="p-3.5 rounded-xl bg-slate-800/30 border border-rose-500/10">
          <div className="flex items-start justify-between gap-3 mb-2">
            <h4 className="text-sm font-medium text-slate-200 truncate">{exp.title}</h4>
            <OutcomeBadge outcome={exp.outcome} />
          </div>
          {exp.lesson && <p className="text-xs text-rose-300/80 line-clamp-2">"{exp.lesson}"</p>}
        </div>
      ),
    },
    {
      title: 'Learned Preferences',
      icon: <Settings2 className="w-5 h-5" />,
      color: 'text-amber-400',
      bg: 'from-amber-500/15 to-transparent',
      items: learnedPreferences,
      emptyMsg: 'No learned preferences yet. WorkMind will infer these from your patterns over time.',
      render: (exp: Experience) => (
        <div key={exp.id} className="p-3.5 rounded-xl bg-slate-800/30 border border-slate-700/40">
          <h4 className="text-sm font-medium text-slate-200 mb-1.5 truncate">{exp.title}</h4>
          <p className="text-xs text-amber-300/70 line-clamp-3 leading-relaxed">{exp.lesson}</p>
        </div>
      ),
    },
  ];

  const hasData = experiences.length > 0;

  return (
    <div className="max-w-6xl mx-auto px-8 py-10 animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-3">
          <button onClick={() => navigate({ name: 'dashboard' })} className="hover:text-slate-300 transition-colors">Dashboard</button>
          <ArrowRight className="w-3 h-3" />
          <span className="text-slate-300">Memory</span>
        </div>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight mb-1 flex items-center gap-3">
              <Database className="w-6 h-6 text-brand-400" />
              Memory Layer
            </h1>
            <p className="text-slate-400 text-sm max-w-xl">
              A preview of how WorkMind will store and organize your problem-solving memory.
              This will be powered by Hindsight integration in a later stage.
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs text-amber-300 font-medium">Memory Preview</span>
          </div>
        </div>
      </div>

      {!hasData ? (
        <div className="glass-card">
          <EmptyState
            icon={<Database className="w-7 h-7" />}
            title="Memory is empty"
            description="Your memory layer will populate as you work through problems. Start a new problem to begin building your problem-solving memory."
            action={{ label: 'Start New Problem', onClick: () => navigate({ name: 'workspace' }) }}
          />
        </div>
      ) : (
        <div className="space-y-5">
          {sections.map((section, i) => (
            <div
              key={section.title}
              className="glass-card p-6 animate-slide-in"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${section.bg} flex items-center justify-center ${section.color}`}>
                    {section.icon}
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-white">{section.title}</h2>
                    <span className="text-xs text-slate-500">{section.items.length} {section.items.length === 1 ? 'item' : 'items'}</span>
                  </div>
                </div>
              </div>

              {section.items.length === 0 ? (
                <div className="py-6 text-center">
                  <p className="text-sm text-slate-500 max-w-md mx-auto">{section.emptyMsg}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {section.items.map(exp => section.render(exp))}
                </div>
              )}
            </div>
          ))}

          {/* Footer note */}
          <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-900/40 border border-slate-800/60 mt-6">
            <Sparkles className="w-4 h-4 text-brand-400 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-400 leading-relaxed">
              This memory preview is built from your saved experiences. When Hindsight integration is added,
              WorkMind will automatically retrieve and rank relevant memories, generate insights, and use them
              to personalize problem-solving assistance.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
