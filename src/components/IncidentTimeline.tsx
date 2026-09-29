import {
  FileText, Sparkles, Database, ClipboardCheck, TrendingUp,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface TimelineEvent {
  label: string;
  icon: LucideIcon;
  color: string;
  timestamp: string | null;
}

function formatTime(ts: string): string {
  return new Date(ts).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

interface IncidentTimelineProps {
  createdAt: string | null;
  analysisAt: string | null;
  hindsightFound: boolean;
  hindsightAt: string | null;
  resolutionAt: string | null;
  outcomeAt: string | null;
  hasOutcome: boolean;
}

export function IncidentTimeline({
  createdAt,
  analysisAt,
  hindsightFound,
  hindsightAt,
  resolutionAt,
  outcomeAt,
  hasOutcome,
}: IncidentTimelineProps) {
  const events: TimelineEvent[] = [
    {
      label: 'Incident Created',
      icon: FileText,
      color: 'text-slate-400',
      timestamp: createdAt,
    },
    {
      label: 'AI Analysis Generated',
      icon: Sparkles,
      color: 'text-brand-400',
      timestamp: analysisAt,
    },
    {
      label: 'Hindsight Memory Found',
      icon: Database,
      color: 'text-sky-400',
      timestamp: hindsightFound ? hindsightAt ?? analysisAt : null,
    },
    {
      label: 'Resolution Recorded',
      icon: ClipboardCheck,
      color: 'text-emerald-400',
      timestamp: resolutionAt,
    },
    {
      label: 'Outcome Recorded',
      icon: TrendingUp,
      color: 'text-sky-400',
      timestamp: hasOutcome ? outcomeAt ?? resolutionAt : null,
    },
  ];

  const activeEvents = events.filter((e) => e.timestamp !== null);

  if (activeEvents.length === 0) return null;

  return (
    <div className="glass-card p-4 animate-fade-in">
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
        Incident Timeline
      </h3>
      <div className="relative">
        {events.map((event, i) => {
          const isActive = event.timestamp !== null;
          const isLast = i === events.length - 1;
          const Icon = event.icon;

          return (
            <div key={i} className="flex items-start gap-2.5 relative">
              {/* Vertical line */}
              {!isLast && (
                <div
                  className={`absolute left-[7px] top-4 bottom-0 w-px ${
                    isActive ? 'bg-slate-700' : 'bg-slate-800/50'
                  }`}
                  style={{ height: 'calc(100% - 12px)' }}
                />
              )}

              {/* Dot */}
              <div
                className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 mt-0.5 border bg-slate-900/60 ${
                  isActive
                    ? `${event.color} border-slate-600/50`
                    : 'text-slate-700 border-slate-700/40'
                }`}
              >
                <Icon className={`w-2 h-2 ${isActive ? event.color : 'text-slate-700'}`} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pb-3">
                <div className="flex items-baseline justify-between gap-2">
                  <span
                    className={`text-[11px] font-medium leading-tight ${
                      isActive ? 'text-slate-300' : 'text-slate-600'
                    }`}
                  >
                    {event.label}
                  </span>
                  {isActive && event.timestamp && (
                    <span className="text-[9px] text-slate-500 shrink-0 tabular-nums">
                      {formatTime(event.timestamp)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
