-- Add equipment to day_exercises for custom exercises (library exercises get it from join)
ALTER TABLE day_exercises ADD COLUMN IF NOT EXISTS equipment TEXT;
