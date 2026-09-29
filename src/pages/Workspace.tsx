import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Sparkles, ArrowRight, Lightbulb, AlertCircle, Info,
  Save, FileText, Tag, MessageSquare, Send,
  CheckCircle2, Loader2, HelpCircle, Target, Search,
  Database, ClipboardCheck, X,
} from 'lucide-react';
import type { Experience, AIAnalysis, ChatMessage, HindsightIncident } from '@/lib/types';
import { PROBLEM_CATEGORIES } from '@/lib/types';
import { fetchExperience, createExperience, updateExperience, callAI, saveResolution } from '@/lib/api';
import type { Route } from '@/lib/router';
import { LoadingState, ErrorState } from '@/components/States';
import { IncidentTimeline } from '@/components/IncidentTimeline';

interface WorkspaceProps {
  navigate: (route: Route) => void;
  experienceId?: string;
}

type WorkflowPhase = 'input' | 'analyzing' | 'conversation' | 'resolved';

const confidenceColors: Record<string, string> = {
  low: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
  medium: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  high: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
};

function nowISO(): string {
  return new Date().toISOString();
}

export function Workspace({ navigate, experienceId }: WorkspaceProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>('General');
  const [context, setContext] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [phase, setPhase] = useState<WorkflowPhase>('input');
  const [chatInput, setChatInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedExperience, setSavedExperience] = useState<Experience | null>(null);
  const [saving, setSaving] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [hindsight, setHindsight] = useState<HindsightIncident[]>([]);
  const [incidentId, setIncidentId] = useState<string | null>(null);
  const [showResolution, setShowResolution] = useState(false);
  const [resolutionText, setResolutionText] = useState('');
  const [outcomeText, setOutcomeText] = useState('');
  const [savingResolution, setSavingResolution] = useState(false);
  const [resolutionSaved, setResolutionSaved] = useState(false);
  const [analysisAt, setAnalysisAt] = useState<string | null>(null);
  const [resolvedAt, setResolvedAt] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!experienceId) return;
    setLoading(true);
    setError(null);
    try {
      const exp = await fetchExperience(experienceId);
      if (exp) {
        setSavedExperience(exp);
        setTitle(exp.title);
        setDescription(exp.description);
        setCategory(exp.category);
        setContext(exp.context ?? '');
        if (exp.conversation && exp.conversation.length > 0) {
          setMessages(exp.conversation);
          setPhase(exp.status === 'resolved' ? 'resolved' : 'conversation');
        }
        if (exp.ai_suggestions) {
          setAnalysis(exp.ai_suggestions);
          setAnalysisAt(exp.updated_at);
        }
        if (exp.outcome) {
          setOutcomeText(exp.outcome);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load experience');
    } finally {
      setLoading(false);
    }
  }, [experienceId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, phase]);

  // Save initial problem to DB, then call AI
  const handleAnalyze = async () => {
    if (!description.trim()) return;
    setError(null);
    setPhase('analyzing');

    // Auto-title from first line of description if no title
    const effectiveTitle = title.trim() || description.trim().split('\n')[0].slice(0, 80);

    let expId: string | undefined;

    // Save or update the experience record — non-fatal if it fails
    try {
      if (savedExperience) {
        const updated = await updateExperience(savedExperience.id, {
          title: effectiveTitle,
          description: description.trim(),
          category,
          context: context.trim() || null,
          status: 'analyzed',
        });
        setSavedExperience(updated);
        expId = updated.id;
      } else {
        const created = await createExperience({
          title: effectiveTitle,
          description: description.trim(),
          category,
          context: context.trim() || null,
        });
        setSavedExperience(created);
        expId = created.id;
        navigate({ name: 'workspace', experienceId: created.id });
      }
    } catch {
      // Experience save failed — proceed with AI analysis anyway
    }

    try {
      // Call AI
      const response = await callAI({
        mode: 'analyze',
        problem: description.trim(),
        category,
        context: context.trim() || undefined,
      });

      if (response.analysis) {
        setAnalysis(response.analysis);
        setHindsight(response.hindsightIncidents ?? []);
        setIncidentId(response.incidentId ?? null);
        setAnalysisAt(nowISO());
        setResolutionSaved(false);
        setResolvedAt(null);
        const assistantMsg: ChatMessage = {
          role: 'assistant',
          content: response.analysis.understanding,
          timestamp: nowISO(),
        };
        setMessages([assistantMsg]);

        // Save analysis + conversation — non-fatal if it fails
        if (expId) {
          try {
            await updateExperience(expId, {
              ai_suggestions: response.analysis,
              conversation: [assistantMsg],
            });
          } catch {
            // Persistence failed — analysis still displayed
          }
        }

        setPhase('conversation');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze problem');
      setPhase('input');
    }
  };

  const handleSendChat = async () => {
    if (!chatInput.trim() || phase !== 'conversation') return;
    setError(null);

    const userMsg: ChatMessage = {
      role: 'user',
      content: chatInput.trim(),
      timestamp: nowISO(),
    };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setChatInput('');
    setPhase('analyzing'); // reuse the loading indicator

    try {
      // Send conversation WITHOUT the last user message (the API adds it)
      const priorConversation = updatedMessages.slice(0, -1).map(m => ({
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
      }));

      const response = await callAI({
        mode: 'chat',
        problem: description.trim(),
        category,
        context: context.trim() || undefined,
        conversation: priorConversation,
      });

      if (response.reply) {
        const assistantMsg: ChatMessage = {
          role: 'assistant',
          content: response.reply,
          timestamp: nowISO(),
        };
        const finalMessages = [...updatedMessages, assistantMsg];
        setMessages(finalMessages);
        setPhase('conversation');

        // Persist conversation
        if (savedExperience) {
          await updateExperience(savedExperience.id, {
            conversation: finalMessages,
          });
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get AI response');
      setMessages(updatedMessages); // keep user's message
      setPhase('conversation');
    }
  };

  const handleResolve = async () => {
    if (!savedExperience) return;
    setError(null);
    setSummarizing(true);

    try {
      const response = await callAI({
        mode: 'summarize',
        problem: description.trim(),
        category,
        context: context.trim() || undefined,
        conversation: messages,
      });

      const summary = response.summary;
      if (!summary) {
        throw new Error('Could not generate a summary. Please try again.');
      }

      const outcome = (['Success', 'Partial', 'Failed'].includes(summary.outcome)
        ? summary.outcome
        : 'Partial') as Experience['outcome'];

      const updated = await updateExperience(savedExperience.id, {
        status: 'resolved',
        outcome,
        approach: summary.userApproach || null,
        lesson: summary.lessonLearned || null,
        failed_attempts: summary.failedAttempts || null,
        successful_approach: summary.successfulApproach || null,
        decisions: (summary.decisions || []).map(d => ({ decision: d })),
        conversation: messages,
      });

      setSavedExperience(updated);
      setPhase('resolved');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create experience summary');
    } finally {
      setSummarizing(false);
    }
  };

  const handleSaveResolution = async () => {
    if (!incidentId || !resolutionText.trim()) return;
    setError(null);
    setSavingResolution(true);

    try {
      await saveResolution(incidentId, resolutionText.trim(), outcomeText.trim());
      setResolutionSaved(true);
      setResolvedAt(nowISO());
      setShowResolution(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save resolution');
    } finally {
      setSavingResolution(false);
    }
  };

  if (loading) return <LoadingState message="Loading workspace…" />;

  return (
    <div className="max-w-5xl mx-auto px-8 py-10 animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-3">
          <button onClick={() => navigate({ name: 'dashboard' })} className="hover:text-slate-300 transition-colors">
            Dashboard
          </button>
          <ArrowRight className="w-3 h-3" />
          <span className="text-slate-300">Problem Workspace</span>
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">
          {savedExperience ? 'Problem Workspace' : 'New Problem'}
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Describe a technical problem and WorkMind will help you work through it.
        </p>
      </div>

      {error && (
        <div className="mb-6 flex items-start gap-3 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 animate-fade-in">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <p className="text-sm text-rose-300">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: problem input + conversation */}
        <div className="lg:col-span-2 space-y-5">
          {/* Problem input — always visible, editable during input phase */}
          <div className="glass-card p-6">
            <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4 text-brand-400" />
              Problem Title
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Brief title for this problem…"
              disabled={phase !== 'input'}
              className="w-full bg-slate-900/60 border border-slate-700/60 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-600 text-sm focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/30 transition-all disabled:opacity-60"
            />
          </div>

          <div className="glass-card p-6">
            <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-brand-400" />
              Problem Description
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe the technical problem you are facing. What are you trying to solve? What have you tried so far?"
              rows={6}
              disabled={phase !== 'input'}
              className="w-full bg-slate-900/60 border border-slate-700/60 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-600 text-sm focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/30 transition-all resize-none leading-relaxed disabled:opacity-60"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="glass-card p-6">
              <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                <Tag className="w-4 h-4 text-brand-400" />
                Category
              </label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                disabled={phase !== 'input'}
                className="w-full bg-slate-900/60 border border-slate-700/60 rounded-xl px-4 py-3 text-slate-100 text-sm focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/30 transition-all cursor-pointer disabled:opacity-60"
              >
                {PROBLEM_CATEGORIES.map(cat => (
                  <option key={cat} value={cat} className="bg-slate-900">{cat}</option>
                ))}
              </select>
            </div>

            <div className="glass-card p-6">
              <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                <Info className="w-4 h-4 text-brand-400" />
                Context (Optional)
              </label>
              <input
                type="text"
                value={context}
                onChange={e => setContext(e.target.value)}
                placeholder="Tech stack, constraints, links…"
                disabled={phase !== 'input'}
                className="w-full bg-slate-900/60 border border-slate-700/60 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-600 text-sm focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/30 transition-all disabled:opacity-60"
              />
            </div>
          </div>

          {phase === 'input' && (
            <button
              onClick={handleAnalyze}
              disabled={!description.trim()}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-brand-500 to-sky-500 hover:from-brand-400 hover:to-sky-400 text-white text-sm font-semibold transition-all shadow-lg shadow-brand-500/20 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
            >
              <Sparkles className="w-4 h-4" />
              Analyze Problem
            </button>
          )}

          {/* Conversation area */}
          {messages.length > 0 && (
            <div className="glass-card p-5">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-brand-400" />
                Conversation
              </h3>

              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1 mb-4">
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`animate-fade-in ${msg.role === 'user' ? 'ml-6' : 'mr-6'}`}
                  >
                    <div className={`text-[10px] uppercase tracking-wider font-medium mb-1.5 ${
                      msg.role === 'user' ? 'text-slate-500' : 'text-brand-400'
                    }`}>
                      {msg.role === 'user' ? 'You' : 'WorkMind'}
                    </div>
                    <div className={`text-sm rounded-xl p-3.5 leading-relaxed whitespace-pre-line ${
                      msg.role === 'user'
                        ? 'bg-slate-800/40 text-slate-300'
                        : 'bg-brand-500/10 border border-brand-500/20 text-slate-200'
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                ))}

                {(phase === 'analyzing') && (
                  <div className="mr-6 animate-fade-in">
                    <div className="text-[10px] uppercase tracking-wider font-medium mb-1.5 text-brand-400">WorkMind</div>
                    <div className="bg-brand-500/10 border border-brand-500/20 rounded-xl p-3.5">
                      <div className="flex gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-brand-400 animate-pulse-soft" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 rounded-full bg-brand-400 animate-pulse-soft" style={{ animationDelay: '300ms' }} />
                        <div className="w-2 h-2 rounded-full bg-brand-400 animate-pulse-soft" style={{ animationDelay: '600ms' }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat input */}
              {phase === 'conversation' && (
                <div className="flex items-end gap-2 pt-3 border-t border-slate-800">
                  <textarea
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendChat();
                      }
                    }}
                    placeholder="Tell WorkMind what you tried, what happened, or ask a question…"
                    rows={2}
                    className="flex-1 bg-slate-900/60 border border-slate-700/60 rounded-xl px-4 py-2.5 text-slate-100 placeholder-slate-600 text-sm focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/30 transition-all resize-none leading-relaxed"
                  />
                  <button
                    onClick={handleSendChat}
                    disabled={!chatInput.trim()}
                    className="p-2.5 rounded-xl bg-gradient-to-r from-brand-500 to-sky-500 hover:from-brand-400 hover:to-sky-400 text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Resolve button */}
              {phase === 'conversation' && (
                <div className="mt-3 flex items-center gap-3">
                  <button
                    onClick={handleResolve}
                    disabled={summarizing}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 text-sm font-semibold transition-all border border-emerald-500/20 disabled:opacity-40"
                  >
                    {summarizing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    {summarizing ? 'Creating Experience…' : 'Mark as Resolved'}
                  </button>
                  <span className="text-xs text-slate-500">
                    WorkMind will summarize the conversation into a structured experience.
                  </span>
                </div>
              )}

              {/* Resolved state */}
              {phase === 'resolved' && (
                <div className="mt-3 flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 animate-fade-in">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-emerald-300 font-medium">Experience created successfully</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      This problem-solving session has been saved to your experience history.
                    </p>
                  </div>
                  <button
                    onClick={() => navigate({ name: 'experiences' })}
                    className="text-sm text-brand-400 hover:text-brand-300 font-medium flex items-center gap-1 transition-colors shrink-0"
                  >
                    View
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right column: AI analysis panel */}
        <div className="space-y-5">
          <div className="glass-card p-5 lg:sticky lg:top-6">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand-400" />
              AI Analysis
            </h3>

            {!analysis ? (
              <div className="py-8 text-center">
                <div className="w-12 h-12 rounded-xl bg-slate-800/60 flex items-center justify-center mx-auto mb-3">
                  <Sparkles className="w-5 h-5 text-slate-600" />
                </div>
                <p className="text-xs text-slate-500 max-w-[200px] mx-auto">
                  {phase === 'analyzing'
                    ? 'Analyzing your problem…'
                    : 'Describe your problem and click Analyze to see the AI response here.'}
                </p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
                {/* Understanding */}
                <div>
                  <div className="text-[10px] uppercase tracking-wider font-medium text-brand-400 mb-1.5 flex items-center gap-1.5">
                    <Target className="w-3 h-3" />
                    Understanding
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed">{analysis.understanding}</p>
                </div>

                {/* Confidence */}
                <div>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${confidenceColors[analysis.confidence] ?? confidenceColors.medium}`}>
                    {analysis.confidence} confidence
                  </span>
                </div>

                {/* Possible causes */}
                {analysis.possibleCauses?.length > 0 && (
                  <div>
                    <div className="text-[10px] uppercase tracking-wider font-medium text-sky-400 mb-2 flex items-center gap-1.5">
                      <Search className="w-3 h-3" />
                      Possible Causes
                    </div>
                    <ul className="space-y-1.5">
                      {analysis.possibleCauses.map((cause, i) => (
                        <li key={i} className="text-sm text-slate-400 flex items-start gap-2">
                          <span className="w-1 h-1 rounded-full bg-sky-400 mt-2 shrink-0" />
                          {cause}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Investigation steps */}
                {analysis.investigationSteps?.length > 0 && (
                  <div>
                    <div className="text-[10px] uppercase tracking-wider font-medium text-brand-400 mb-2 flex items-center gap-1.5">
                      <Lightbulb className="w-3 h-3" />
                      Investigation Steps
                    </div>
                    <div className="space-y-2">
                      {analysis.investigationSteps.map((step, i) => (
                        <div key={i} className="flex items-start gap-2.5 text-sm text-slate-400">
                          <span className="w-5 h-5 rounded-md bg-slate-800/60 text-slate-500 text-[11px] font-medium flex items-center justify-center shrink-0 mt-0.5">
                            {i + 1}
                          </span>
                          <span>{step}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Suggested action */}
                {analysis.suggestedAction && (
                  <div className="p-3 rounded-xl bg-brand-500/10 border border-brand-500/20">
                    <div className="text-[10px] uppercase tracking-wider font-medium text-brand-400 mb-1.5">
                      Suggested Next Action
                    </div>
                    <p className="text-sm text-slate-200 leading-relaxed">{analysis.suggestedAction}</p>
                  </div>
                )}

                {/* Clarifying questions */}
                {analysis.clarifyingQuestions?.length > 0 && (
                  <div>
                    <div className="text-[10px] uppercase tracking-wider font-medium text-amber-400 mb-2 flex items-center gap-1.5">
                      <HelpCircle className="w-3 h-3" />
                      Clarifying Questions
                    </div>
                    <ul className="space-y-1.5">
                      {analysis.clarifyingQuestions.map((q, i) => (
                        <li key={i} className="text-sm text-slate-400 flex items-start gap-2">
                          <span className="text-amber-400/60 shrink-0">?</span>
                          {q}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Incident Timeline */}
          {analysis && (
            <IncidentTimeline
              createdAt={savedExperience?.created_at ?? null}
              analysisAt={analysisAt}
              hindsightFound={hindsight.length > 0}
              hindsightAt={analysisAt}
              resolutionAt={resolvedAt}
              outcomeAt={resolvedAt}
              hasOutcome={resolutionSaved && outcomeText.trim().length > 0}
            />
          )}

          {/* Record Resolution section */}
          {analysis && incidentId && (
            <div className="glass-card p-5 animate-fade-in">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4 text-emerald-400" />
                Resolution & Outcome
              </h3>

              {resolutionSaved ? (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 animate-fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <p className="text-xs text-emerald-300 font-medium">
                    Resolution saved. This will appear in future Hindsight Memory for similar incidents.
                  </p>
                </div>
              ) : showResolution ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-medium text-slate-500 mb-1.5">
                      What was done to resolve the incident?
                    </label>
                    <textarea
                      value={resolutionText}
                      onChange={e => setResolutionText(e.target.value)}
                      placeholder="Describe the steps taken to resolve this incident…"
                      rows={3}
                      className="w-full bg-slate-900/60 border border-slate-700/60 rounded-xl px-3 py-2.5 text-slate-100 placeholder-slate-600 text-xs focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all resize-none leading-relaxed"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-medium text-slate-500 mb-1.5">
                      What was the outcome?
                    </label>
                    <input
                      type="text"
                      value={outcomeText}
                      onChange={e => setOutcomeText(e.target.value)}
                      placeholder="e.g. Success, Partial, Failed…"
                      className="w-full bg-slate-900/60 border border-slate-700/60 rounded-xl px-3 py-2.5 text-slate-100 placeholder-slate-600 text-xs focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSaveResolution}
                      disabled={!resolutionText.trim() || savingResolution}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 text-xs font-semibold transition-all border border-emerald-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {savingResolution ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                      {savingResolution ? 'Saving…' : 'Save Resolution'}
                    </button>
                    <button
                      onClick={() => setShowResolution(false)}
                      className="flex items-center gap-1 px-3 py-2 rounded-lg bg-slate-800/40 hover:bg-slate-800/60 text-slate-400 text-xs font-medium transition-all border border-slate-700/40"
                    >
                      <X className="w-3.5 h-3.5" />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowResolution(true)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-semibold transition-all border border-emerald-500/20 w-full justify-center"
                >
                  <ClipboardCheck className="w-3.5 h-3.5" />
                  Record Resolution
                </button>
              )}
            </div>
          )}

          {/* Hindsight Memory section */}
          {analysis && (
            <div className="glass-card p-5 animate-fade-in">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <Database className="w-4 h-4 text-sky-400" />
                Hindsight Memory
              </h3>

              {hindsight.length === 0 ? (
                <div className="py-4 text-center">
                  <div className="w-10 h-10 rounded-xl bg-slate-800/60 flex items-center justify-center mx-auto mb-2.5">
                    <Database className="w-4 h-4 text-slate-600" />
                  </div>
                  <p className="text-xs text-slate-500">
                    No relevant past incidents found.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-sky-500/10 border border-sky-500/20">
                    <CheckCircle2 className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                    <span className="text-[11px] text-sky-300 font-medium">
                      {hindsight.length} {hindsight.length === 1 ? 'past incident' : 'past incidents'} used to improve this analysis
                    </span>
                  </div>

                  {hindsight.map((inc, i) => (
                    <div
                      key={inc.id}
                      className="p-3.5 rounded-xl bg-slate-800/30 border border-slate-700/40 animate-slide-in"
                      style={{ animationDelay: `${i * 60}ms` }}
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-[10px] uppercase tracking-wider font-medium text-sky-400">
                          Incident #{i + 1}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider border ${
                            inc.relevance === 'High'
                              ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                              : inc.relevance === 'Medium'
                                ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                                : 'text-slate-400 bg-slate-700/30 border-slate-600/30'
                          }`}>
                            {inc.relevance}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {new Date(inc.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>
                      </div>

                      <div className="mb-2">
                        <span className="text-[10px] uppercase tracking-wider font-medium text-slate-500">Previous Problem</span>
                        <p className="text-xs text-slate-300 leading-relaxed mt-0.5">
                          {inc.problemDescription}
                        </p>
                      </div>

                      <div className="mb-2">
                        <span className="text-[10px] uppercase tracking-wider font-medium text-slate-500">What Happened Before</span>
                        <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5 italic">
                          {inc.summary}
                        </p>
                      </div>

                      {inc.aiAnalysis && (
                        <div className="mb-2">
                          <span className="text-[10px] uppercase tracking-wider font-medium text-slate-500">Previous AI Analysis</span>
                          <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5 line-clamp-3 whitespace-pre-line">
                            {inc.aiAnalysis}
                          </p>
                        </div>
                      )}

                      {inc.previousAction && (
                        <div className="p-2 rounded-lg bg-brand-500/10 border border-brand-500/15 mb-2">
                          <span className="text-[10px] uppercase tracking-wider font-medium text-brand-400">Previous Recommended Action</span>
                          <p className="text-[11px] text-slate-300 leading-relaxed mt-0.5">
                            {inc.previousAction}
                          </p>
                        </div>
                      )}

                      {inc.previousResolution && (
                        <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/15 mb-2">
                          <span className="text-[10px] uppercase tracking-wider font-medium text-emerald-400">Previous Resolution</span>
                          <p className="text-[11px] text-slate-300 leading-relaxed mt-0.5">
                            {inc.previousResolution}
                          </p>
                        </div>
                      )}

                      {inc.previousOutcome && (
                        <div className="p-2 rounded-lg bg-sky-500/10 border border-sky-500/15">
                          <span className="text-[10px] uppercase tracking-wider font-medium text-sky-400">Previous Outcome</span>
                          <p className="text-[11px] text-slate-300 leading-relaxed mt-0.5">
                            {inc.previousOutcome}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}

                  <p className="text-[10px] text-slate-600 text-center pt-1">
                    Historical context provided to Groq alongside the current problem.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
