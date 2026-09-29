/*
# Create experiences table (single-tenant, no auth)

1. New Tables
- `experiences`
  - `id` (uuid, primary key)
  - `title` (text, short label for the problem)
  - `description` (text, full problem description)
  - `category` (text, problem category — e.g. "Backend", "Frontend", "DevOps")
  - `context` (text, optional additional context/details)
  - `approach` (text, what approach was taken)
  - `outcome` (text, result of the approach — e.g. "Success", "Partial", "Failed")
  - `lesson` (text, lesson learned)
  - `status` (text, workflow status: "draft", "analyzed", "resolved")
  - `analysis` (jsonb, placeholder for AI analysis output — null until real LLM integration)
  - `created_at` (timestamptz, default now())
  - `updated_at` (timestamptz, default now())

2. Security
- Enable RLS on `experiences`.
- Single-tenant no-auth app: allow anon + authenticated full CRUD (data is intentionally shared).
- `USING (true)` is documented as intentional for this single-tenant demo app.

3. Important Notes
- `analysis` is a jsonb column so future LLM integration can store structured analysis output without schema changes.
- `status` uses text (not enum) to allow easy future expansion of workflow states.
- `updated_at` trigger omitted for simplicity; future migrations can add one.
*/

CREATE TABLE IF NOT EXISTS experiences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  category text NOT NULL DEFAULT 'General',
  context text,
  approach text,
  outcome text,
  lesson text,
  status text NOT NULL DEFAULT 'draft',
  analysis jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE experiences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_experiences" ON experiences;
CREATE POLICY "anon_select_experiences" ON experiences FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_experiences" ON experiences;
CREATE POLICY "anon_insert_experiences" ON experiences FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_experiences" ON experiences;
CREATE POLICY "anon_update_experiences" ON experiences FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_experiences" ON experiences;
CREATE POLICY "anon_delete_experiences" ON experiences FOR DELETE
  TO anon, authenticated USING (true);
