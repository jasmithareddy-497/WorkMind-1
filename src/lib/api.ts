import { supabase } from './supabase';
import type { Experience, ExperienceInput, ExperienceUpdate, AIAnalysis, ChatMessage, HindsightIncident } from './types';

function handleError(error: unknown): Error {
  if (error instanceof Error) return error;
  return new Error('An unexpected error occurred');
}

export async function fetchExperiences(): Promise<Experience[]> {
  const { data, error } = await supabase
    .from('experiences')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw handleError(error);
  return data as Experience[];
}

export async function fetchExperience(id: string): Promise<Experience | null> {
  const { data, error } = await supabase
    .from('experiences')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw handleError(error);
  return data as Experience | null;
}

export async function createExperience(input: ExperienceInput): Promise<Experience> {
  const { data, error } = await supabase
    .from('experiences')
    .insert(input)
    .select()
    .single();

  if (error) throw handleError(error);
  return data as Experience;
}

export async function updateExperience(
  id: string,
  updates: ExperienceUpdate
): Promise<Experience> {
  const { data, error } = await supabase
    .from('experiences')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw handleError(error);
  return data as Experience;
}

export async function deleteExperience(id: string): Promise<void> {
  const { error } = await supabase.from('experiences').delete().eq('id', id);
  if (error) throw handleError(error);
}

// ─── Incident Memory ─────────────────────────────────────

export interface IncidentMemoryRow {
  id: string;
  problem_description: string;
  ai_analysis: Record<string, unknown> | null;
  resolution: string | null;
  outcome: string | null;
  resolved_at: string | null;
  created_at: string;
}

export async function fetchIncidents(limit?: number): Promise<IncidentMemoryRow[]> {
  let query = supabase
    .from('incident_memory')
    .select('id, problem_description, ai_analysis, resolution, outcome, resolved_at, created_at')
    .order('created_at', { ascending: false });
  if (limit) query = query.limit(limit);
  const { data, error } = await query;
  if (error) throw handleError(error);
  return data as IncidentMemoryRow[];
}

// ─── AI API ──────────────────────────────────────────────

const edgeFunctionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-analyze`;

export interface AIAnalyzeRequest {
  mode: 'analyze' | 'chat' | 'summarize' | 'resolve';
  problem: string;
  category: string;
  context?: string;
  conversation?: ChatMessage[];
  incidentId?: string;
  resolution?: string;
  outcome?: string;
}

export interface AIAnalyzeResponse {
  analysis?: AIAnalysis;
  reply?: string;
  summary?: {
    userApproach: string;
    aiSuggestions: string;
    decisions: string[];
    failedAttempts: string;
    successfulApproach: string;
    outcome: string;
    lessonLearned: string;
  };
  hindsightIncidents?: HindsightIncident[];
  incidentId?: string | null;
  success?: boolean;
}

export async function callAI(req: AIAnalyzeRequest): Promise<AIAnalyzeResponse> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
  };

  const response = await fetch(edgeFunctionUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(req),
  });

  if (!response.ok) {
    const text = await response.text();
    let message = `Request failed (${response.status})`;
    try {
      const parsed = JSON.parse(text);
      if (parsed.error) message = parsed.error;
    } catch {
      if (text) message = text;
    }
    throw new Error(message);
  }

  const data = await response.json();
  return data as AIAnalyzeResponse;
}

export async function saveResolution(
  incidentId: string,
  resolution: string,
  outcome: string
): Promise<void> {
  const response = await callAI({
    mode: 'resolve',
    problem: '',
    category: 'General',
    incidentId,
    resolution,
    outcome,
  });

  if (!response.success) {
    throw new Error('Failed to save resolution');
  }
}
