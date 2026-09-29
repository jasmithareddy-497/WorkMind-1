const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

interface AnalyzeRequest {
  mode: "analyze" | "chat" | "summarize" | "resolve";
  problem: string;
  category: string;
  context?: string;
  conversation?: ChatMessage[];
  incidentId?: string;
  resolution?: string;
  outcome?: string;
}

interface AIAnalysis {
  understanding: string;
  possibleCauses: string[];
  investigationSteps: string[];
  suggestedAction: string;
  confidence: "low" | "medium" | "high";
  clarifyingQuestions: string[];
}

interface IncidentMemoryRow {
  id: string;
  problem_description: string;
  ai_analysis: Record<string, unknown>;
  created_at: string;
  resolution: string | null;
  outcome: string | null;
  resolved_at: string | null;
}

interface HindsightIncident {
  id: string;
  problemDescription: string;
  summary: string;
  aiAnalysis: string;
  previousAction: string;
  previousResolution: string | null;
  previousOutcome: string | null;
  relevance: "High" | "Medium" | "Low";
  createdAt: string;
}

const SYSTEM_PROMPT_ANALYZE = `You are WorkMind, an AI assistant that helps professionals solve technical problems.
Analyze the user's problem and respond with a JSON object containing these exact fields:
{
  "understanding": "A clear restatement of the problem as you understand it",
  "possibleCauses": ["List of 2-4 likely causes"],
  "investigationSteps": ["3-5 concrete steps to investigate"],
  "suggestedAction": "The single most important next action to take",
  "confidence": "low" | "medium" | "high",
  "clarifyingQuestions": ["1-3 questions that would help clarify the problem"]
}
Respond ONLY with valid JSON. No markdown, no code fences, no preamble.`;

const SYSTEM_PROMPT_CHAT = `You are WorkMind, an AI assistant helping a professional work through a technical problem.
You are in a follow-up conversation after the initial analysis.
Ask about what they tried, what happened, what worked, what failed, and guide them toward a resolution.
Keep responses concise and practical — 2-4 sentences. Use plain text, no markdown headers.
When the user describes a resolution, acknowledge it and ask if they consider the problem resolved.`;

const SYSTEM_PROMPT_SUMMARIZE = `You are WorkMind. Summarize this problem-solving session into a structured experience.
Based on the conversation, produce a JSON object with these exact fields:
{
  "userApproach": "What the user did to solve the problem",
  "aiSuggestions": "Key suggestions the AI provided",
  "decisions": ["Key decisions the user made"],
  "failedAttempts": "Approaches that did not work, or empty string if none",
  "successfulApproach": "What ultimately worked, or empty string if unresolved",
  "outcome": "Success" | "Partial" | "Failed",
  "lessonLearned": "The key takeaway from this experience"
}
Respond ONLY with valid JSON. No markdown, no code fences, no preamble.`;

// ─── Hindsight Memory helpers ───────────────────────────

const STOP_WORDS = new Set([
  "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did", "will", "would", "could",
  "should", "may", "might", "must", "can", "to", "of", "in", "for", "on",
  "with", "at", "by", "from", "as", "into", "about", "like", "through",
  "after", "over", "between", "out", "against", "during", "without",
  "before", "under", "around", "among", "and", "or", "but", "not", "no",
  "so", "than", "too", "very", "just", "also", "only", "own", "same",
  "this", "that", "these", "those", "i", "you", "he", "she", "it", "we",
  "they", "what", "which", "who", "when", "where", "why", "how", "all",
  "each", "every", "both", "few", "more", "most", "other", "some", "such",
  "my", "your", "his", "her", "its", "our", "their", "me", "him", "them",
  "if", "then", "because", "while", "here", "there", "now", "get", "got",
  "started", "started", "today", "immediately", "also", "has", "have",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

function computeRelevance(queryTokens: string[], docText: string): number {
  const docTokens = new Set(tokenize(docText));
  let matches = 0;
  for (const t of queryTokens) {
    if (docTokens.has(t)) matches++;
  }
  return queryTokens.length > 0 ? matches / queryTokens.length : 0;
}

async function retrieveRelevantIncidents(
  problem: string,
  supabaseUrl: string,
  anonKey: string
): Promise<{ row: IncidentMemoryRow; score: number }[]> {
  const response = await fetch(`${supabaseUrl}/rest/v1/incident_memory?select=id,problem_description,ai_analysis,created_at,resolution,outcome,resolved_at&order=created_at.desc&limit=50`, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch incident_memory: ${response.status}`);
  }

  const rows: IncidentMemoryRow[] = await response.json();
  if (rows.length === 0) return [];

  const queryTokens = tokenize(problem);
  const scored = rows.map((row) => {
    const docText = row.problem_description + " " + JSON.stringify(row.ai_analysis);
    return { row, score: computeRelevance(queryTokens, docText) };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((s) => ({ row: s.row, score: s.score }));
}

function formatIncidentsForPrompt(incidents: { row: IncidentMemoryRow; score: number }[]): string {
  if (incidents.length === 0) return "";

  const blocks = incidents.map(({ row: inc, score }, i) => {
    const analysis = inc.ai_analysis as Record<string, unknown>;
    const understanding = typeof analysis?.understanding === "string" ? analysis.understanding : "";
    const causes = Array.isArray(analysis?.possibleCauses) ? (analysis.possibleCauses as string[]).join("; ") : "";
    const action = typeof analysis?.suggestedAction === "string" ? analysis.suggestedAction : "";
    const steps = Array.isArray(analysis?.investigationSteps) ? (analysis.investigationSteps as string[]).join("; ") : "";
    const date = new Date(inc.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const relevance = score >= 0.5 ? "High" : score >= 0.25 ? "Medium" : "Low";
    const resolutionLine = inc.resolution ? `\nResolution: ${inc.resolution}` : "";
    const outcomeLine = inc.outcome ? `\nOutcome: ${inc.outcome}` : "";

    return `--- Historical Incident ${i + 1} (Date: ${date}, Relevance: ${relevance}) ---
Problem: ${inc.problem_description}
AI Understanding: ${understanding}
Possible Causes: ${causes}
Investigation Steps: ${steps}
Recommended Action: ${action}${resolutionLine}${outcomeLine}`;
  });

  return blocks.join("\n\n");
}

async function saveIncidentMemory(
  problem: string,
  analysis: Record<string, unknown>,
  supabaseUrl: string,
  anonKey: string
): Promise<string | null> {
  const response = await fetch(`${supabaseUrl}/rest/v1/incident_memory`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      problem_description: problem,
      ai_analysis: analysis,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to save incident_memory: ${response.status}`);
  }

  const data = await response.json();
  return Array.isArray(data) && data.length > 0 ? data[0].id : null;
}

// ─── Core LLM call ──────────────────────────────────────

function buildMessages(
  systemPrompt: string,
  problem: string,
  category: string,
  context: string | undefined,
  conversation: ChatMessage[] | undefined
) {
  const messages: Array<{ role: string; content: string }> = [
    { role: "system", content: systemPrompt },
  ];

  const contextStr = context ? `\nAdditional context: ${context}` : "";
  messages.push({
    role: "user",
    content: `Category: ${category}\nProblem: ${problem}${contextStr}`,
  });

  if (conversation) {
    for (const msg of conversation) {
      messages.push({
        role: msg.role === "user" ? "user" : "assistant",
        content: msg.content,
      });
    }
  }

  return messages;
}

async function callGroq(
  messages: Array<{ role: string; content: string }>,
  apiKey: string
): Promise<string> {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "openai/gpt-oss-120b",
      messages,
      temperature: 0.7,
      max_tokens: 1200,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let message = `Groq API error (${response.status})`;
    try {
      const parsed = JSON.parse(errorText);
      if (parsed.error?.message) message = parsed.error.message;
    } catch {
      // keep default message
    }
    throw new Error(message);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? "";
}

function tryParseJSON(text: string): Record<string, unknown> | null {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

function toHindsightIncidents(scored: { row: IncidentMemoryRow; score: number }[]): HindsightIncident[] {
  return scored.map(({ row, score }) => {
    const analysis = row.ai_analysis as Record<string, unknown>;
    const understanding = typeof analysis?.understanding === "string" ? analysis.understanding : row.problem_description.slice(0, 120);
    const action = typeof analysis?.suggestedAction === "string" ? analysis.suggestedAction : "";
    const causes = Array.isArray(analysis?.possibleCauses) ? (analysis.possibleCauses as string[]).join("; ") : "";
    const steps = Array.isArray(analysis?.investigationSteps) ? (analysis.investigationSteps as string[]).join("; ") : "";
    const aiAnalysisText = [understanding, causes && `Causes: ${causes}`, steps && `Steps: ${steps}`, action && `Action: ${action}`].filter(Boolean).join("\n");
    const relevance: "High" | "Medium" | "Low" = score >= 0.5 ? "High" : score >= 0.25 ? "Medium" : "Low";
    return {
      id: row.id,
      problemDescription: row.problem_description,
      summary: understanding,
      aiAnalysis: aiAnalysisText,
      previousAction: action,
      previousResolution: row.resolution ?? null,
      previousOutcome: row.outcome ?? null,
      relevance,
      createdAt: row.created_at,
    };
  });
}

// ─── Main handler ───────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

  try {
    const apiKey = Deno.env.get("GROQ_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "AI service is not configured. A GROQ_API_KEY secret must be added in the Supabase Secrets settings." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: AnalyzeRequest = await req.json();

    if (body.mode !== "resolve" && (!body.problem || !body.problem.trim())) {
      return new Response(
        JSON.stringify({ error: "Problem description is required." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let systemPrompt: string;
    let needsJSON = false;

    if (body.mode === "analyze") {
      systemPrompt = SYSTEM_PROMPT_ANALYZE;
      needsJSON = true;
    } else if (body.mode === "chat") {
      systemPrompt = SYSTEM_PROMPT_CHAT;
    } else if (body.mode === "summarize") {
      systemPrompt = SYSTEM_PROMPT_SUMMARIZE;
      needsJSON = true;
    } else if (body.mode === "resolve") {
      // ─── Resolve mode: update incident_memory with resolution + outcome ───
      if (!body.incidentId) {
        return new Response(
          JSON.stringify({ error: "incidentId is required for resolve mode." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (!body.resolution || !body.resolution.trim()) {
        return new Response(
          JSON.stringify({ error: "Resolution description is required." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      try {
        const updateResponse = await fetch(
          `${supabaseUrl}/rest/v1/incident_memory?id=eq.${encodeURIComponent(body.incidentId)}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              apikey: anonKey,
              Authorization: `Bearer ${anonKey}`,
              Prefer: "return=minimal",
            },
            body: JSON.stringify({
              resolution: body.resolution.trim(),
              outcome: body.outcome?.trim() || null,
              resolved_at: new Date().toISOString(),
            }),
          }
        );

        if (!updateResponse.ok) {
          throw new Error(`Failed to update incident: ${updateResponse.status}`);
        }

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to save resolution";
        return new Response(
          JSON.stringify({ error: message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      return new Response(
        JSON.stringify({ error: "Invalid mode. Use 'analyze', 'chat', or 'summarize'." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── Hindsight Memory retrieval (analyze mode only) ───
    let hindsightIncidents: HindsightIncident[] = [];
    if (body.mode === "analyze") {
      try {
        const relevant = await retrieveRelevantIncidents(body.problem, supabaseUrl, anonKey);
        hindsightIncidents = toHindsightIncidents(relevant);

        if (relevant.length > 0) {
          const memoryBlock = formatIncidentsForPrompt(relevant);
          systemPrompt = `${systemPrompt}

You have access to Hindsight Memory — relevant past incidents that this professional has encountered before. Use these historical incidents to improve your analysis by comparing the current incident with the previous ones. Clearly distinguish historical information from the current incident. If the current problem appears similar to a past incident, note the comparison explicitly in your understanding. Do not assume the current problem is identical to past ones.

=== HINDSIGHT MEMORY (Historical Incidents) ===
${memoryBlock}
=== END HINDSIGHT MEMORY ===`;
        }
      } catch {
        // Memory retrieval failed — continue with normal analysis
        hindsightIncidents = [];
      }
    }

    // Build messages
    let messages: Array<{ role: string; content: string }>;
    if (body.mode === "chat") {
      messages = [{ role: "system", content: systemPrompt }];
      messages.push({
        role: "user",
        content: `Original problem (${body.category}): ${body.problem}${body.context ? `\nContext: ${body.context}` : ""}`,
      });
      messages.push({
        role: "assistant",
        content: "I've analyzed your problem. Let's work through it together.",
      });
      if (body.conversation) {
        for (const msg of body.conversation) {
          messages.push({
            role: msg.role === "user" ? "user" : "assistant",
            content: msg.content,
          });
        }
      }
    } else if (body.mode === "summarize") {
      messages = [{ role: "system", content: systemPrompt }];
      const conversationText = body.conversation
        ?.map((m) => `${m.role === "user" ? "User" : "WorkMind"}: ${m.content}`)
        .join("\n\n") ?? "";
      messages.push({
        role: "user",
        content: `Problem: ${body.problem}\nCategory: ${body.category}\n\nConversation:\n${conversationText}`,
      });
    } else {
      messages = buildMessages(systemPrompt, body.problem, body.category, body.context, body.conversation);
    }

    const raw = await callGroq(messages, apiKey);

    if (needsJSON) {
      const parsed = tryParseJSON(raw);
      if (!parsed) {
        return new Response(
          JSON.stringify({ error: "The AI returned an unexpected response format. Please try again." }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (body.mode === "analyze") {
        // ─── Save to incident_memory (best-effort, don't break analysis) ───
        let incidentId: string | null = null;
        try {
          incidentId = await saveIncidentMemory(body.problem, parsed, supabaseUrl, anonKey);
        } catch {
          // Saving failed — analysis still valid, just no memory saved
        }

        return new Response(
          JSON.stringify({ analysis: parsed, hindsightIncidents, incidentId }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } else {
        return new Response(
          JSON.stringify({ summary: parsed }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // chat mode — plain text reply
    return new Response(
      JSON.stringify({ reply: raw.trim() }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
