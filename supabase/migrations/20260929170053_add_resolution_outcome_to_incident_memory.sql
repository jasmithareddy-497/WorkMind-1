-- Add resolution, outcome, and resolved_at columns to incident_memory
ALTER TABLE incident_memory
  ADD COLUMN IF NOT EXISTS resolution text,
  ADD COLUMN IF NOT EXISTS outcome text,
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz;
