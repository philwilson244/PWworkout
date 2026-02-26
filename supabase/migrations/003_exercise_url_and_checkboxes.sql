-- Add URL to exercises (YouTube or other demo links)
ALTER TABLE day_exercises ADD COLUMN IF NOT EXISTS url TEXT;
ALTER TABLE exercise_library ADD COLUMN IF NOT EXISTS url TEXT;

-- Allow completion to be "in progress" (completed_at null) for exercise checkboxes
ALTER TABLE completions ALTER COLUMN completed_at DROP NOT NULL;
ALTER TABLE completions ALTER COLUMN completed_at DROP DEFAULT;

-- Track which exercises were completed within a day completion
CREATE TABLE IF NOT EXISTS completion_exercises (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  completion_id UUID NOT NULL REFERENCES completions(id) ON DELETE CASCADE,
  day_exercise_id UUID NOT NULL REFERENCES day_exercises(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(completion_id, day_exercise_id)
);

CREATE INDEX IF NOT EXISTS idx_completion_exercises_completion ON completion_exercises(completion_id);
CREATE INDEX IF NOT EXISTS idx_completion_exercises_exercise ON completion_exercises(day_exercise_id);

ALTER TABLE completion_exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own completion_exercises" ON completion_exercises FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM completions c
    JOIN user_plans up ON up.id = c.user_plan_id
    WHERE c.id = completion_exercises.completion_id AND up.user_id = auth.uid()
  ));
CREATE POLICY "Users can insert own completion_exercises" ON completion_exercises FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM completions c
    JOIN user_plans up ON up.id = c.user_plan_id
    WHERE c.id = completion_exercises.completion_id AND up.user_id = auth.uid()
  ));
CREATE POLICY "Users can delete own completion_exercises" ON completion_exercises FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM completions c
    JOIN user_plans up ON up.id = c.user_plan_id
    WHERE c.id = completion_exercises.completion_id AND up.user_id = auth.uid()
  ));
