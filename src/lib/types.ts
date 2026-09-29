export type ExperienceStatus = 'draft' | 'analyzed' | 'resolved';
export type ExperienceOutcome = 'Success' | 'Partial' | 'Failed' | 'In Progress' | null;

export interface AIAnalysis {
  understanding: string;
  possibleCauses: string[];
  investigationSteps: string[];
  suggestedAction: string;
  confidence: 'low' | 'medium' | 'high';
  clarifyingQuestions: string[];
}

export interface HindsightIncident {
  id: string;
  problemDescription: string;
  summary: string;
  aiAnalysis: string;
  previousAction: string;
  previousResolution: string | null;
  previousOutcome: string | null;
  relevance: 'High' | 'Medium' | 'Low';
  createdAt: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface Experience {
  id: string;
  title: string;
  description: string;
  category: string;
  context: string | null;
  approach: string | null;
  outcome: ExperienceOutcome;
  lesson: string | null;
  status: ExperienceStatus;
  analysis: Record<string, unknown> | null;
  ai_suggestions: AIAnalysis | null;
  decisions: Record<string, unknown>[] | null;
  failed_attempts: string | null;
  successful_approach: string | null;
  conversation: ChatMessage[] | null;
  created_at: string;
  updated_at: string;
}

export interface ExperienceInput {
  title: string;
  description: string;
  category: string;
  context?: string | null;
}

export interface ExperienceUpdate {
  title?: string;
  description?: string;
  category?: string;
  context?: string | null;
  approach?: string | null;
  outcome?: ExperienceOutcome;
  lesson?: string | null;
  status?: ExperienceStatus;
  ai_suggestions?: AIAnalysis | null;
  decisions?: Record<string, unknown>[];
  failed_attempts?: string | null;
  successful_approach?: string | null;
  conversation?: ChatMessage[];
}

export const PROBLEM_CATEGORIES = [
  'Backend',
  'Frontend',
  'DevOps',
  'Database',
  'Security',
  'API Design',
  'Architecture',
  'Performance',
  'Bug Fix',
  'General',
] as const;

export const OUTCOME_LABELS: Record<string, { label: string; color: string }> = {
  Success: { label: 'Success', color: 'emerald' },
  Partial: { label: 'Partial', color: 'amber' },
  Failed: { label: 'Failed', color: 'rose' },
  'In Progress': { label: 'In Progress', color: 'sky' },
};
