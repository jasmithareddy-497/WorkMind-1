/*
# Extend experiences table for structured AI problem-solving

1. Modified Tables
- `experiences`
  - Added `ai_suggestions` (jsonb) — stores structured AI analysis output (understanding, causes, steps, suggested action, confidence, questions)
  - Added `decisions` (jsonb) — stores user decisions made during the conversation
  - Added `failed_attempts` (text) — records approaches that didn't work
  - Added `successful_approach` (text) — records the approach that ultimately worked
  - Added `conversation` (jsonb) — stores the full AI conversation history

2. Security
- No policy changes. Existing anon/authenticated CRUD policies remain in effect.

3. Important Notes
- All new columns are nullable so existing rows are not affected.
- `conversation` and `ai_suggestions` are jsonb to allow flexible structured data from the LLM.
- These fields prepare the schema for Hindsight integration in Stage 3.
*/

ALTER TABLE experiences
  ADD COLUMN IF NOT EXISTS ai_suggestions jsonb,
  ADD COLUMN IF NOT EXISTS decisions jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS failed_attempts text,
  ADD COLUMN IF NOT EXISTS successful_approach text,
  ADD COLUMN IF NOT EXISTS conversation jsonb DEFAULT '[]'::jsonb;
