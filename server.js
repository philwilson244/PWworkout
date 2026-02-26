require('dotenv').config();
const express = require('express');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const defaultPlan = require('./data/default-plan');

const app = express();
const PORT = process.env.PORT || 3000;

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

const supabaseAdmin = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })
  : null;

function resolveExerciseNames(exercises) {
  if (!exercises?.length) return Promise.resolve(exercises.map(e => ({ ...e, display_name: e.custom_name || '' })));
  const libIds = [...new Set(exercises.map(e => e.library_exercise_id).filter(Boolean))];
  if (libIds.length === 0) {
    return Promise.resolve(exercises.map(e => ({ ...e, display_name: e.custom_name || '' })));
  }
  const db = supabaseAdmin || supabase;
  if (!db) return Promise.resolve(exercises.map(e => ({ ...e, display_name: e.custom_name || '' })));
  return db.from('exercise_library').select('id, name').in('id', libIds)
    .then(({ data: libs }) => {
      const map = (libs || []).reduce((acc, l) => { acc[l.id] = l.name; return acc; }, {});
      return exercises.map(e => ({
        ...e,
        display_name: e.custom_name || (e.library_exercise_id ? map[e.library_exercise_id] || '' : ''),
      }));
    });
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Auth middleware: extract and verify JWT
async function requireAuth(req, res, next) {
  if (!supabase) {
    return res.status(503).json({ error: 'Supabase not configured' });
  }
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Missing or invalid authorization' });
  }
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
  req.user = user;
  next();
}

// Optional auth: attach user if token present
async function optionalAuth(req, res, next) {
  if (!supabase) return next();
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (token) {
    const { data: { user } } = await supabase.auth.getUser(token);
    req.user = user;
  }
  next();
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Public config for frontend (Supabase URL + anon key only)
app.get('/api/config', (req, res) => {
  res.json({
    supabaseUrl: supabaseUrl || '',
    supabaseAnonKey: supabaseAnonKey || '',
  });
});

// --- Auth ---
app.get('/api/auth/session', requireAuth, (req, res) => {
  res.json({ user: { id: req.user.id, email: req.user.email } });
});

// --- Plans ---
app.get('/api/plans', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('plans')
    .select('id, name, equipment_tags, created_at')
    .eq('owner_id', req.user.id)
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

app.get('/api/plans/:id', requireAuth, async (req, res) => {
  const { data: plan, error: planErr } = await supabase
    .from('plans')
    .select('*')
    .eq('id', req.params.id)
    .eq('owner_id', req.user.id)
    .single();
  if (planErr || !plan) return res.status(404).json({ error: 'Plan not found' });

  const { data: days, error: daysErr } = await supabase
    .from('plan_days')
    .select('*')
    .eq('plan_id', req.params.id)
    .order('day_number');
  if (daysErr) return res.status(500).json({ error: daysErr.message });

  const dayIds = (days || []).map(d => d.id);
  const { data: exercises } = dayIds.length
    ? await supabase
        .from('day_exercises')
        .select('*')
        .in('plan_day_id', dayIds)
        .order('sort_order')
    : { data: [] };

  const exercisesByDay = (exercises || []).reduce((acc, ex) => {
    if (!acc[ex.plan_day_id]) acc[ex.plan_day_id] = [];
    acc[ex.plan_day_id].push(ex);
    return acc;
  }, {});

  const allExs = exercises || [];
  const resolved = await resolveExerciseNames(allExs);
  const resolvedByDay = resolved.reduce((acc, ex) => {
    if (!acc[ex.plan_day_id]) acc[ex.plan_day_id] = [];
    acc[ex.plan_day_id].push(ex);
    return acc;
  }, {});

  const daysWithExercises = (days || []).map(d => ({
    ...d,
    exercises: resolvedByDay[d.id] || [],
  }));

  res.json({ ...plan, days: daysWithExercises });
});

// Create plan from default template
app.post('/api/plans', requireAuth, async (req, res) => {
  if (!supabaseAdmin) return res.status(503).json({ error: 'Server not configured for plan creation' });

  const { name, equipment_tags } = req.body;
  const planName = name || defaultPlan.name;
  const tags = equipment_tags || defaultPlan.equipment_tags;

  const { data: plan, error: planErr } = await supabaseAdmin
    .from('plans')
    .insert({ owner_id: req.user.id, name: planName, equipment_tags: tags })
    .select()
    .single();
  if (planErr) return res.status(500).json({ error: planErr.message });

  for (const day of defaultPlan.days) {
    const { data: planDay, error: dayErr } = await supabaseAdmin
      .from('plan_days')
      .insert({
        plan_id: plan.id,
        day_number: day.day_number,
        name: day.name,
        type: day.type,
        duration: day.duration,
        rest_content: day.rest_content || null,
        hiit_structure: day.hiit_structure || null,
        hiit_note: day.hiit_note || null,
      })
      .select()
      .single();
    if (dayErr) return res.status(500).json({ error: dayErr.message });

    if (day.sections) {
      let sortOrder = 0;
      for (const section of day.sections) {
        for (const ex of section.exercises) {
          await supabaseAdmin.from('day_exercises').insert({
            plan_day_id: planDay.id,
            section_title: section.title,
            custom_name: ex.name,
            sets_reps: ex.sets_reps,
            notes: ex.notes || '',
            sort_order: sortOrder++,
            is_hiit_move: ex.is_hiit || false,
          });
        }
      }
    }
  }

  const fullPlan = await supabaseAdmin
    .from('plans')
    .select('*')
    .eq('id', plan.id)
    .single();
  res.status(201).json(fullPlan.data);
});

// --- User plans (active plan + progress) ---
app.get('/api/user-plans/active', requireAuth, async (req, res) => {
  const { data: userPlan, error: upErr } = await supabase
    .from('user_plans')
    .select('*')
    .eq('user_id', req.user.id)
    .single();

  if (upErr || !userPlan) {
    return res.json({ user_plan: null, plan: null, needs_setup: true });
  }

  const { data: plan, error: planErr } = await supabase
    .from('plans')
    .select('*')
    .eq('id', userPlan.plan_id)
    .single();
  if (planErr || !plan) return res.json({ user_plan: userPlan, plan: null });

  const { data: days } = await supabase
    .from('plan_days')
    .select('*')
    .eq('plan_id', plan.id)
    .order('day_number');
  const dayIds = (days || []).map(d => d.id);

  const { data: exercises } = dayIds.length
    ? await supabase
        .from('day_exercises')
        .select('*')
        .in('plan_day_id', dayIds)
        .order('sort_order')
    : { data: [] };
  const allExs = exercises || [];
  const resolved = await resolveExerciseNames(allExs);
  const exercisesByDay = resolved.reduce((acc, ex) => {
    if (!acc[ex.plan_day_id]) acc[ex.plan_day_id] = [];
    acc[ex.plan_day_id].push(ex);
    return acc;
  }, {});

  const { data: completions } = await supabase
    .from('completions')
    .select('id, day_number, completed_at')
    .eq('user_plan_id', userPlan.id)
    .order('completed_at', { ascending: false });

  const completionIds = (completions || []).map(c => c.id);
  const { data: completionExs } = completionIds.length
    ? await supabase
        .from('completion_exercises')
        .select('completion_id, day_exercise_id')
        .in('completion_id', completionIds)
    : { data: [] };
  const exsByCompletion = (completionExs || []).reduce((acc, ce) => {
    if (!acc[ce.completion_id]) acc[ce.completion_id] = new Set();
    acc[ce.completion_id].add(ce.day_exercise_id);
    return acc;
  }, {});

  const completionsWithExercises = (completions || []).map(c => ({
    ...c,
    completed_exercise_ids: [...(exsByCompletion[c.id] || [])],
  }));

  const daysWithExercises = (days || []).map(d => ({
    ...d,
    exercises: exercisesByDay[d.id] || [],
  }));

  res.json({
    user_plan: userPlan,
    plan: { ...plan, days: daysWithExercises },
    completions: completionsWithExercises || [],
  });
});

// Start plan (create user_plan)
app.post('/api/user-plans/start', requireAuth, async (req, res) => {
  const { plan_id } = req.body;
  if (!plan_id) return res.status(400).json({ error: 'plan_id required' });

  const { data: plan } = await supabase
    .from('plans')
    .select('id')
    .eq('id', plan_id)
    .eq('owner_id', req.user.id)
    .single();
  if (!plan) return res.status(404).json({ error: 'Plan not found' });

  const { data: existing } = await supabase
    .from('user_plans')
    .select('id')
    .eq('user_id', req.user.id)
    .single();
  if (existing) {
    const { data: updated, error } = await supabase
      .from('user_plans')
      .update({ plan_id, current_day_index: 1 })
      .eq('user_id', req.user.id)
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json(updated);
  }

  const { data: userPlan, error } = await supabase
    .from('user_plans')
    .insert({ user_id: req.user.id, plan_id, current_day_index: 1 })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(userPlan);
});

// Toggle exercise complete (creates in-progress completion if needed)
app.post('/api/user-plans/:id/exercise-complete', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { day_number, day_exercise_id } = req.body;
  if (!day_number || !day_exercise_id) return res.status(400).json({ error: 'day_number and day_exercise_id required' });

  const { data: userPlan } = await supabase
    .from('user_plans')
    .select('*')
    .eq('id', id)
    .eq('user_id', req.user.id)
    .single();
  if (!userPlan) return res.status(404).json({ error: 'User plan not found' });

  let { data: completion } = await supabase
    .from('completions')
    .select('id')
    .eq('user_plan_id', id)
    .eq('day_number', day_number)
    .is('completed_at', null)
    .single();

  if (!completion) {
    const { data: newComp, error: insErr } = await supabase
      .from('completions')
      .insert({ user_plan_id: id, day_number, completed_at: null })
      .select('id')
      .single();
    if (insErr) return res.status(500).json({ error: insErr.message });
    completion = newComp;
  }

  const { error } = await supabase
    .from('completion_exercises')
    .insert({ completion_id: completion.id, day_exercise_id });
  if (error && error.code !== '23505') return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

// Toggle exercise uncomplete
app.post('/api/user-plans/:id/exercise-uncomplete', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { day_number, day_exercise_id } = req.body;
  if (!day_number || !day_exercise_id) return res.status(400).json({ error: 'day_number and day_exercise_id required' });

  const { data: completion } = await supabase
    .from('completions')
    .select('id')
    .eq('user_plan_id', id)
    .eq('day_number', day_number)
    .is('completed_at', null)
    .single();
  if (!completion) return res.json({ ok: true });

  await supabase
    .from('completion_exercises')
    .delete()
    .eq('completion_id', completion.id)
    .eq('day_exercise_id', day_exercise_id);
  res.json({ ok: true });
});

// Complete a day (finalize in-progress completion or create new)
app.post('/api/user-plans/:id/complete', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { day_number } = req.body;
  if (!day_number || day_number < 1 || day_number > 7) {
    return res.status(400).json({ error: 'day_number 1-7 required' });
  }

  const { data: userPlan } = await supabase
    .from('user_plans')
    .select('*')
    .eq('id', id)
    .eq('user_id', req.user.id)
    .single();
  if (!userPlan) return res.status(404).json({ error: 'User plan not found' });

  let { data: completion } = await supabase
    .from('completions')
    .select('id')
    .eq('user_plan_id', id)
    .eq('day_number', day_number)
    .is('completed_at', null)
    .single();

  if (completion) {
    await supabase
      .from('completions')
      .update({ completed_at: new Date().toISOString() })
      .eq('id', completion.id);
  } else {
    const { error: compErr } = await supabase
      .from('completions')
      .insert({ user_plan_id: id, day_number, completed_at: new Date().toISOString() });
    if (compErr) return res.status(500).json({ error: compErr.message });
  }

  const nextDay = ((userPlan.current_day_index % 7) + 1);
  await supabase
    .from('user_plans')
    .update({ current_day_index: nextDay })
    .eq('id', id);

  const { data: updated } = await supabase
    .from('user_plans')
    .select('*')
    .eq('id', id)
    .single();
  res.json(updated);
});

// --- Exercise library ---
app.get('/api/exercise-library', optionalAuth, async (req, res) => {
  let query = supabase.from('exercise_library').select('*');
  const { category, equipment } = req.query;
  if (category) query = query.eq('category', category);
  if (equipment) query = query.ilike('equipment', `%${equipment}%`);
  query = query.order('name');
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

// --- Swap exercise ---
app.patch('/api/day-exercises/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { library_exercise_id, custom_name, sets_reps, notes } = req.body;

  const { data: ex } = await supabase
    .from('day_exercises')
    .select('id, plan_day_id')
    .eq('id', id)
    .single();
  if (!ex) return res.status(404).json({ error: 'Exercise not found' });

  const { data: planDay } = await supabase
    .from('plan_days')
    .select('plan_id')
    .eq('id', ex.plan_day_id)
    .single();
  if (!planDay) return res.status(404).json({ error: 'Plan day not found' });

  const { data: plan } = await supabase
    .from('plans')
    .select('owner_id')
    .eq('id', planDay.plan_id)
    .single();
  if (!plan || plan.owner_id !== req.user.id) {
    return res.status(403).json({ error: 'Not authorized' });
  }

  const updates = {};
  if (library_exercise_id !== undefined) updates.library_exercise_id = library_exercise_id;
  if (custom_name !== undefined) updates.custom_name = custom_name;
  if (sets_reps !== undefined) updates.sets_reps = sets_reps;
  if (notes !== undefined) updates.notes = notes;
  if (req.body.url !== undefined) updates.url = req.body.url;
  if (library_exercise_id) updates.custom_name = null;
  if (custom_name) updates.library_exercise_id = null;

  const { data: updated, error } = await supabase
    .from('day_exercises')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(updated);
});

// Get exercise display name (from library or custom)
app.get('/api/day-exercises/:id/display-name', requireAuth, async (req, res) => {
  const { data: ex } = await supabase
    .from('day_exercises')
    .select('custom_name, library_exercise_id')
    .eq('id', req.params.id)
    .single();
  if (!ex) return res.status(404).json({ error: 'Not found' });
  if (ex.custom_name) return res.json({ name: ex.custom_name });
  if (ex.library_exercise_id) {
    const { data: lib } = await supabase
      .from('exercise_library')
      .select('name')
      .eq('id', ex.library_exercise_id)
      .single();
    return res.json({ name: lib?.name || 'Unknown' });
  }
  res.json({ name: '' });
});

// --- Share ---
app.post('/api/plans/:id/share', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { data: plan } = await supabase
    .from('plans')
    .select('owner_id')
    .eq('id', id)
    .single();
  if (!plan || plan.owner_id !== req.user.id) {
    return res.status(404).json({ error: 'Plan not found' });
  }

  const token = require('crypto').randomBytes(16).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const { error } = await supabase
    .from('share_tokens')
    .insert({ plan_id: id, token, expires_at: expiresAt.toISOString() });
  if (error) return res.status(500).json({ error: error.message });

  const baseUrl = process.env.APP_URL || `http://localhost:${PORT}`;
  res.json({ url: `${baseUrl}/s/${token}`, token, expires_at: expiresAt.toISOString() });
});

// Share preview (public) — uses admin to bypass RLS for shared plan
app.get('/api/share/:token', async (req, res) => {
  const { token } = req.params;
  const db = supabaseAdmin || supabase;
  if (!db) return res.status(503).json({ error: 'Server not configured' });
  const { data: shareRow } = await db
    .from('share_tokens')
    .select('plan_id, expires_at, used_at')
    .eq('token', token)
    .single();
  if (!shareRow || shareRow.used_at || new Date(shareRow.expires_at) < new Date()) {
    return res.status(404).json({ error: 'Share link expired or invalid' });
  }

  const { data: plan } = await db
    .from('plans')
    .select('id, name, equipment_tags')
    .eq('id', shareRow.plan_id)
    .single();
  if (!plan) return res.status(404).json({ error: 'Plan not found' });

  const { data: days } = await db
    .from('plan_days')
    .select('*')
    .eq('plan_id', plan.id)
    .order('day_number');
  const dayIds = (days || []).map(d => d.id);
  const { data: exercises } = dayIds.length
    ? await db
        .from('day_exercises')
        .select('*')
        .in('plan_day_id', dayIds)
        .order('sort_order')
    : { data: [] };
  const allExs = exercises || [];
  const resolved = await resolveExerciseNames(allExs);
  const exercisesByDay = resolved.reduce((acc, ex) => {
    if (!acc[ex.plan_day_id]) acc[ex.plan_day_id] = [];
    acc[ex.plan_day_id].push(ex);
    return acc;
  }, {});

  res.json({
    plan: { ...plan, days: (days || []).map(d => ({
      ...d,
      exercises: exercisesByDay[d.id] || [],
    })) },
  });
});

// Accept share (fork plan)
app.post('/api/share/accept', requireAuth, async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'token required' });

  if (!supabaseAdmin) return res.status(503).json({ error: 'Server not configured' });

  const { data: shareRow } = await supabaseAdmin
    .from('share_tokens')
    .select('plan_id, id')
    .eq('token', token)
    .is('used_at', null)
    .single();
  if (!shareRow) return res.status(404).json({ error: 'Share link expired or invalid' });

  const { data: sourcePlan } = await supabaseAdmin
    .from('plans')
    .select('*')
    .eq('id', shareRow.plan_id)
    .single();
  if (!sourcePlan) return res.status(404).json({ error: 'Plan not found' });

  const { data: newPlan, error: planErr } = await supabaseAdmin
    .from('plans')
    .insert({
      owner_id: req.user.id,
      name: sourcePlan.name + ' (copy)',
      equipment_tags: sourcePlan.equipment_tags || [],
    })
    .select()
    .single();
  if (planErr) return res.status(500).json({ error: planErr.message });

  const { data: sourceDays } = await supabaseAdmin
    .from('plan_days')
    .select('*')
    .eq('plan_id', sourcePlan.id)
    .order('day_number');

  for (const sd of sourceDays || []) {
    const { data: newDay, error: dayErr } = await supabaseAdmin
      .from('plan_days')
      .insert({
        plan_id: newPlan.id,
        day_number: sd.day_number,
        name: sd.name,
        type: sd.type,
        duration: sd.duration,
        rest_content: sd.rest_content,
        hiit_structure: sd.hiit_structure,
        hiit_note: sd.hiit_note,
      })
      .select()
      .single();
    if (dayErr) return res.status(500).json({ error: dayErr.message });

    const { data: sourceExs } = await supabaseAdmin
      .from('day_exercises')
      .select('*')
      .eq('plan_day_id', sd.id)
      .order('sort_order');
    for (const ex of sourceExs || []) {
      await supabaseAdmin.from('day_exercises').insert({
        plan_day_id: newDay.id,
        section_title: ex.section_title,
        library_exercise_id: ex.library_exercise_id,
        custom_name: ex.custom_name,
        sets_reps: ex.sets_reps,
        notes: ex.notes,
        sort_order: ex.sort_order,
        is_hiit_move: ex.is_hiit_move,
      });
    }
  }

  await supabaseAdmin
    .from('share_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('id', shareRow.id);

  const { data: existingUp } = await supabaseAdmin
    .from('user_plans')
    .select('id')
    .eq('user_id', req.user.id)
    .single();
  if (existingUp) {
    await supabaseAdmin
      .from('user_plans')
      .update({ plan_id: newPlan.id, current_day_index: 1 })
      .eq('user_id', req.user.id);
  } else {
    await supabaseAdmin
      .from('user_plans')
      .insert({ user_id: req.user.id, plan_id: newPlan.id, current_day_index: 1 });
  }

  res.status(201).json({ plan_id: newPlan.id });
});

// Catch-all for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
