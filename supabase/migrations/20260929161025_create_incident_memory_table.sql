/*
# Create incident_memory table for Hindsight Memory

1. New Tables
- `incident_memory`
  - `id` (uuid, primary key)
  - `problem_description` (text, original incident description)
  - `ai_analysis` (jsonb, complete Groq analysis stored at analysis time)
  - `created_at` (timestamptz, default now())

2. Security
- Enable RLS. Single-tenant no-auth app: allow anon + authenticated full CRUD.
- `USING (true)` is intentional for this shared single-tenant demo.

3. Important Notes
- This table stores every analyzed problem + its AI analysis so future problems
  can retrieve relevant past incidents as Hindsight Memory.
- Relevance is computed via keyword overlap in the edge function (no pgvector dependency).
*/

CREATE TABLE IF NOT EXISTS incident_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_description text NOT NULL,
  ai_analysis jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE incident_memory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_incident_memory" ON incident_memory;
CREATE POLICY "anon_select_incident_memory" ON incident_memory FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_incident_memory" ON incident_memory;
CREATE POLICY "anon_insert_incident_memory" ON incident_memory FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_incident_memory" ON incident_memory;
CREATE POLICY "anon_update_incident_memory" ON incident_memory FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_incident_memory" ON incident_memory;
CREATE POLICY "anon_delete_incident_memory" ON incident_memory FOR DELETE
  TO anon, authenticated USING (true);
