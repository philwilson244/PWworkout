-- Workout Platform Schema
-- Run this in Supabase SQL Editor or via: supabase db push

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Plans (workout plan templates)
CREATE TABLE plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Weekly Grind',
  equipment_tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Exercise library (global + per-user for swap suggestions)
-- Must be created before day_exercises (which references it)
CREATE TABLE exercise_library (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  equipment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Plan days (7 days per plan)
CREATE TABLE plan_days (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  day_number INT NOT NULL CHECK (day_number >= 1 AND day_number <= 7),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('upper', 'lower', 'hiit', 'full', 'rest')),
  duration TEXT,
  rest_content TEXT,
  hiit_structure TEXT,
  hiit_note TEXT,
  UNIQUE(plan_id, day_number)
);

-- Day exercises (exercises within a day, with optional section grouping)
CREATE TABLE day_exercises (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_day_id UUID NOT NULL REFERENCES plan_days(id) ON DELETE CASCADE,
  section_title TEXT,
  library_exercise_id UUID REFERENCES exercise_library(id) ON DELETE SET NULL,
  custom_name TEXT,
  sets_reps TEXT NOT NULL,
  notes TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_hiit_move BOOLEAN DEFAULT FALSE
);

-- User plans (user's active plan + rolling progress)
CREATE TABLE user_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  current_day_index INT NOT NULL DEFAULT 1 CHECK (current_day_index >= 1 AND current_day_index <= 7),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Completions (check-off log)
CREATE TABLE completions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_plan_id UUID NOT NULL REFERENCES user_plans(id) ON DELETE CASCADE,
  day_number INT NOT NULL CHECK (day_number >= 1 AND day_number <= 7),
  completed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Share tokens (for share-as-copy)
CREATE TABLE share_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_plans_owner ON plans(owner_id);
CREATE INDEX idx_plan_days_plan ON plan_days(plan_id);
CREATE INDEX idx_day_exercises_plan_day ON day_exercises(plan_day_id);
CREATE INDEX idx_exercise_library_user ON exercise_library(user_id);
CREATE INDEX idx_exercise_library_category ON exercise_library(category);
CREATE INDEX idx_user_plans_user ON user_plans(user_id);
CREATE INDEX idx_completions_user_plan ON completions(user_plan_id);
CREATE INDEX idx_share_tokens_token ON share_tokens(token);
CREATE INDEX idx_share_tokens_plan ON share_tokens(plan_id);

-- Row Level Security
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE day_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies: plans
CREATE POLICY "Users can read own plans" ON plans FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Users can insert own plans" ON plans FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can update own plans" ON plans FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Users can delete own plans" ON plans FOR DELETE USING (auth.uid() = owner_id);

-- RLS Policies: plan_days (via plan ownership)
CREATE POLICY "Users can read plan_days of own plans" ON plan_days FOR SELECT
  USING (EXISTS (SELECT 1 FROM plans WHERE plans.id = plan_days.plan_id AND plans.owner_id = auth.uid()));
CREATE POLICY "Users can insert plan_days to own plans" ON plan_days FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM plans WHERE plans.id = plan_days.plan_id AND plans.owner_id = auth.uid()));
CREATE POLICY "Users can update plan_days of own plans" ON plan_days FOR UPDATE
  USING (EXISTS (SELECT 1 FROM plans WHERE plans.id = plan_days.plan_id AND plans.owner_id = auth.uid()));
CREATE POLICY "Users can delete plan_days of own plans" ON plan_days FOR DELETE
  USING (EXISTS (SELECT 1 FROM plans WHERE plans.id = plan_days.plan_id AND plans.owner_id = auth.uid()));

-- RLS Policies: day_exercises (via plan ownership)
CREATE POLICY "Users can read day_exercises of own plans" ON day_exercises FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM plan_days pd
    JOIN plans p ON p.id = pd.plan_id
    WHERE pd.id = day_exercises.plan_day_id AND p.owner_id = auth.uid()
  ));
CREATE POLICY "Users can insert day_exercises to own plans" ON day_exercises FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM plan_days pd
    JOIN plans p ON p.id = pd.plan_id
    WHERE pd.id = day_exercises.plan_day_id AND p.owner_id = auth.uid()
  ));
CREATE POLICY "Users can update day_exercises of own plans" ON day_exercises FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM plan_days pd
    JOIN plans p ON p.id = pd.plan_id
    WHERE pd.id = day_exercises.plan_day_id AND p.owner_id = auth.uid()
  ));
CREATE POLICY "Users can delete day_exercises of own plans" ON day_exercises FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM plan_days pd
    JOIN plans p ON p.id = pd.plan_id
    WHERE pd.id = day_exercises.plan_day_id AND p.owner_id = auth.uid()
  ));

-- RLS Policies: exercise_library (global = user_id null, or own)
CREATE POLICY "Anyone can read exercise_library" ON exercise_library FOR SELECT USING (true);
CREATE POLICY "Users can insert own exercise_library" ON exercise_library FOR INSERT
  WITH CHECK (user_id IS NULL OR auth.uid() = user_id);
CREATE POLICY "Users can update own exercise_library" ON exercise_library FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own exercise_library" ON exercise_library FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies: user_plans
CREATE POLICY "Users can read own user_plans" ON user_plans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own user_plans" ON user_plans FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own user_plans" ON user_plans FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own user_plans" ON user_plans FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies: completions
CREATE POLICY "Users can read own completions" ON completions FOR SELECT
  USING (EXISTS (SELECT 1 FROM user_plans up WHERE up.id = completions.user_plan_id AND up.user_id = auth.uid()));
CREATE POLICY "Users can insert own completions" ON completions FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM user_plans up WHERE up.id = completions.user_plan_id AND up.user_id = auth.uid()));
CREATE POLICY "Users can delete own completions" ON completions FOR DELETE
  USING (EXISTS (SELECT 1 FROM user_plans up WHERE up.id = completions.user_plan_id AND up.user_id = auth.uid()));

-- RLS Policies: share_tokens (plan owner can manage, anyone can read by token for preview)
CREATE POLICY "Plan owners can manage share_tokens" ON share_tokens FOR ALL
  USING (EXISTS (SELECT 1 FROM plans WHERE plans.id = share_tokens.plan_id AND plans.owner_id = auth.uid()));
-- Allow anonymous read for share preview (we'll validate token in API)
CREATE POLICY "Anyone can read share_tokens by token" ON share_tokens FOR SELECT USING (true);
