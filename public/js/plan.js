import { getToken } from './auth.js';

const API = '/api';

async function api(path, options = {}) {
  const token = await getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(API + path, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

function getExerciseName(ex, libraryMap) {
  if (ex.custom_name) return ex.custom_name;
  if (ex.library_exercise_id && libraryMap) {
    const lib = libraryMap[ex.library_exercise_id];
    return lib ? lib.name : 'Unknown';
  }
  return '';
}

export async function loadActivePlan() {
  return api('/user-plans/active');
}

export async function createAndStartPlan() {
  const plan = await api('/plans', { method: 'POST' });
  await api('/user-plans/start', { method: 'POST', body: JSON.stringify({ plan_id: plan.id }) });
  return loadActivePlan();
}

export async function completeDay(userPlanId, dayNumber) {
  return api(`/user-plans/${userPlanId}/complete`, {
    method: 'POST',
    body: JSON.stringify({ day_number: dayNumber }),
  });
}

export async function toggleExerciseComplete(userPlanId, dayNumber, dayExerciseId, completed) {
  const endpoint = completed ? 'exercise-uncomplete' : 'exercise-complete';
  return api(`/user-plans/${userPlanId}/${endpoint}`, {
    method: 'POST',
    body: JSON.stringify({ day_number: dayNumber, day_exercise_id: dayExerciseId }),
  });
}

export async function getExerciseLibrary(category, equipmentTags) {
  const params = new URLSearchParams();
  if (category) params.set('category', category);
  if (equipmentTags && equipmentTags.length) params.set('equipment_tags', equipmentTags.join(','));
  return api('/exercise-library?' + params.toString());
}

export async function getEquipmentOptions() {
  return api('/equipment-options');
}

export async function updatePlanEquipment(planId, equipmentTags) {
  return api(`/plans/${planId}`, {
    method: 'PATCH',
    body: JSON.stringify({ equipment_tags: equipmentTags }),
  });
}

export async function swapExercise(exerciseId, { library_exercise_id, custom_name, sets_reps, notes, url, equipment }) {
  const body = {};
  if (library_exercise_id !== undefined) body.library_exercise_id = library_exercise_id;
  if (custom_name !== undefined) body.custom_name = custom_name;
  if (sets_reps !== undefined) body.sets_reps = sets_reps;
  if (notes !== undefined) body.notes = notes;
  if (url !== undefined) body.url = url;
  if (equipment !== undefined) body.equipment = equipment;
  return api(`/day-exercises/${exerciseId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export async function getShareUrl(planId) {
  const { url } = await api(`/plans/${planId}/share`, { method: 'POST' });
  return url;
}

export function renderPlan(container, { user_plan, plan, completions }) {
  if (!plan) return;
  const completedDays = new Set();
  const completedExerciseIdsByDay = {};
  const byDay = {};
  (completions || []).forEach(c => {
    if (c.completed_at) completedDays.add(c.day_number);
    if (!byDay[c.day_number]) byDay[c.day_number] = [];
    byDay[c.day_number].push(c);
  });
  Object.keys(byDay).forEach(dayNum => {
    const list = byDay[dayNum];
    const inProgress = list.find(c => !c.completed_at);
    const completed = list.filter(c => c.completed_at).sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at));
    const active = inProgress || completed[0];
    if (active) {
      completedExerciseIdsByDay[dayNum] = new Set(active.completed_exercise_ids || []);
    }
  });
  // Use actual day of week: Mon=1 .. Sun=7
  const dayOfWeek = new Date().getDay();
  const currentDay = dayOfWeek === 0 ? 7 : dayOfWeek;
  const dayAbbrs = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
  const typeLabels = { upper: 'Upper', lower: 'Lower', hiit: 'HIIT', full: 'Full', rest: 'Rest' };

  const workDays = plan.days.filter(d => d.type !== 'rest').length;
  const hiitDays = plan.days.filter(d => d.type === 'hiit').length;
  const equipmentTags = new Set(plan.equipment_tags || []);

  let html = `
    <header>
      <div class="header-top">
        <div>
          <div class="program-label">● Home Gym Program</div>
          <h1>WEEKLY<br><span>GRIND</span></h1>
        </div>
        <div class="stats-bar">
          <div class="stat"><div class="stat-num">7</div><div class="stat-label">Days</div></div>
          <div class="stat"><div class="stat-num">${workDays}</div><div class="stat-label">Work Days</div></div>
          <div class="stat"><div class="stat-num">${hiitDays}</div><div class="stat-label">HIIT Sessions</div></div>
        </div>
      </div>
    </header>

    <div class="equipment-strip" data-plan-id="${plan.id}">
      <button type="button" class="eq-toggle" data-action="eq-toggle" aria-expanded="true" aria-label="Collapse equipment">
        <span class="eq-label">Equipment</span>
        <span class="eq-chevron">▾</span>
      </button>
      <div class="eq-content">
        <div class="eq-divider"></div>
        <div class="eq-tags" data-action="eq-tags">
          ${(plan.equipment_tags || []).map(t => `<span class="eq-tag" data-tag="${escapeHtml(t)}"><span class="eq-tag-text">${escapeHtml(t)}</span><button type="button" class="eq-tag-remove" data-action="remove-eq" aria-label="Remove">×</button></span>`).join('')}
        </div>
        <div class="eq-add">
          <select class="eq-add-select" data-action="eq-add-select" aria-label="Add equipment">
            <option value="">+ Add equipment</option>
          </select>
        </div>
      </div>
    </div>

    <div class="legend">
      <div class="legend-item"><div class="legend-dot hiit"></div> HIIT</div>
      <div class="legend-item"><div class="legend-dot strength"></div> Upper Body</div>
      <div class="legend-item"><div class="legend-dot" style="background:#9333ea"></div> Lower Body</div>
      <div class="legend-item"><div class="legend-dot full"></div> Full Body</div>
      <div class="legend-item"><div class="legend-dot rest"></div> Rest</div>
    </div>

    <div class="week-grid">
      ${plan.days.map((d, i) => {
        const isCurrent = d.day_number === currentDay;
        const isDone = completedDays.has(d.day_number);
        const typeStyle = d.type === 'lower' ? 'style="background:rgba(147,51,234,0.15);color:#c084fc;border-color:rgba(147,51,234,0.3)"' : '';
        return `<div class="day-pill" data-type="${d.type}" data-day="${d.day_number}" ${typeStyle} ${isCurrent ? 'data-current' : ''} ${isDone ? 'data-done' : ''}>
          <span class="abbr">${dayAbbrs[i]}</span>${typeLabels[d.type] || d.type}
        </div>`;
      }).join('')}
    </div>

    <div class="days-list">
  `;

  plan.days.forEach((day, idx) => {
    const isDone = completedDays.has(day.day_number);
    const isCurrent = day.day_number === currentDay;
    html += `
      <div class="day-card" data-type="${day.type}" data-day="${day.day_number}" ${isDone ? 'data-completed' : ''}>
        <div class="day-header" data-action="toggle">
          <div class="day-number">${String(day.day_number).padStart(2, '0')}</div>
          <div class="day-info">
            <div class="day-name">${escapeHtml(day.name)}</div>
            <div class="day-meta">
              <span class="day-type-badge badge-${day.type}">${typeLabels[day.type] || day.type}</span>
              <span class="day-duration">⏱ ${escapeHtml(day.duration || '')}</span>
              ${day.type !== 'rest' && user_plan ? `
                <button class="btn-done" data-day="${day.day_number}" data-action="complete" ${isDone ? 'disabled' : ''}>
                  ${isDone ? '✓ Done' : 'Mark Done'}
                </button>
              ` : ''}
            </div>
          </div>
          <div class="chevron">▾</div>
        </div>
        <div class="day-body">
    `;

    if (day.type === 'rest' && day.rest_content) {
      html += `
        <div class="rest-card">
          <div class="rest-icon">${day.day_number === 4 ? '🔋' : '💤'}</div>
          <h3>${day.day_number === 4 ? 'Recharge' : 'Full Reset'}</h3>
          <p>${escapeHtml(day.rest_content)}</p>
        </div>
      `;
    } else if (day.hiit_structure) {
      html += `
        <div class="section">
          <div class="section-title">Structure</div>
          <div class="hiit-structure">${escapeHtml(day.hiit_structure).replace(/\n/g, '<br>')}</div>
        </div>
      `;
    }

    if (day.exercises && day.exercises.length) {
      const bySection = {};
      day.exercises.forEach(ex => {
        const key = ex.section_title || 'Main';
        if (!bySection[key]) bySection[key] = [];
        bySection[key].push(ex);
      });
      const completedExs = completedExerciseIdsByDay[day.day_number] || new Set();
      const renderEx = (ex, isHiit) => {
        const name = ex.display_name || ex.custom_name || '';
        const exUrl = ex.url || '';
        const isChecked = completedExs.has(ex.id);
        const equip = ex.display_equipment || ex.equipment || '';
        const needsEquipment = equip && equip !== 'Bodyweight' && !equipmentTags.has(equip);
        const equipBadge = needsEquipment ? `<span class="ex-needs-badge" title="Requires ${escapeHtml(equip)}">needs ${escapeHtml(equip)}</span>` : '';
        const nameHtml = exUrl
          ? `<a href="${escapeHtml(exUrl)}" target="_blank" rel="noopener" class="ex-link" title="Watch demo">${escapeHtml(name)} ↗</a>`
          : escapeHtml(name);
        const checkbox = day.type !== 'rest' && user_plan
          ? `<input type="checkbox" class="ex-checkbox" data-exercise-id="${ex.id}" data-day="${day.day_number}" ${isChecked ? 'checked' : ''} data-action="ex-complete" />`
          : '';
        if (isHiit) {
          const interval = parseHiitInterval(ex.sets_reps);
          const timerHtml = interval
            ? `<div class="hiit-timer" data-work="${interval.work}" data-rest="${interval.rest}">
                <button type="button" class="btn-timer" data-action="start-timer" aria-label="Start timer">⏱ Start</button>
                <div class="timer-display" style="display:none">
                  <span class="timer-phase"></span>
                  <span class="timer-count">0</span>
                  <button type="button" class="btn-timer-stop" data-action="stop-timer">Stop</button>
                </div>
              </div>`
            : '';
          return `
            <div class="hiit-move" data-exercise-id="${ex.id}">
              <div class="hiit-move-name">${checkbox} ${nameHtml} ${equipBadge} <button class="btn-swap-inline" data-exercise-id="${ex.id}" data-action="swap">Swap</button></div>
              <div class="hiit-move-time">${escapeHtml(ex.sets_reps)}${timerHtml}</div>
            </div>
          `;
        }
        return `
          <tr data-exercise-id="${ex.id}">
            <td>${checkbox} ${nameHtml} ${equipBadge} <button class="btn-swap-inline" data-exercise-id="${ex.id}" data-action="swap">Swap</button></td>
            <td>${escapeHtml(ex.sets_reps)}</td>
            <td>${escapeHtml(ex.notes || '')}</td>
          </tr>
        `;
      };
      Object.entries(bySection).forEach(([title, exercises]) => {
        html += `<div class="section"><div class="section-title">${escapeHtml(title)}</div>`;
        if (exercises.some(e => e.is_hiit_move)) {
          html += '<div class="hiit-circuit">';
          exercises.forEach(ex => { html += renderEx(ex, true); });
          html += '</div>';
        } else {
          html += '<table class="exercise-table"><tbody>';
          exercises.forEach(ex => { html += renderEx(ex, false); });
          html += '</tbody></table>';
        }
        html += '</div>';
      });
    }

    if (day.hiit_note) {
      html += `<div class="note-box"><strong>Coaching note:</strong> ${escapeHtml(day.hiit_note)}</div>`;
    }

    html += '</div></div>';
  });

  html += '</div>';
  container.innerHTML = html;

  const dayPills = container.querySelectorAll('.day-pill');
  const dayCards = container.querySelectorAll('.day-card');
  dayPills.forEach(pill => {
    pill.addEventListener('click', () => {
      const day = parseInt(pill.dataset.day, 10);
      dayCards.forEach(c => c.classList.remove('open'));
      const card = container.querySelector(`.day-card[data-day="${day}"]`);
      if (card) card.classList.add('open');
      dayPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
    });
  });

  container.querySelectorAll('[data-action="toggle"]').forEach(el => {
    el.addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      const card = el.closest('.day-card');
      card.classList.toggle('open');
    });
  });

  container.querySelectorAll('[data-action="complete"]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (btn.disabled) return;
      const dayNum = parseInt(btn.dataset.day, 10);
      try {
        await completeDay(user_plan.id, dayNum);
        btn.disabled = true;
        btn.textContent = '✓ Done';
        const card = container.querySelector(`.day-card[data-day="${dayNum}"]`);
        if (card) card.setAttribute('data-completed', '');
        const pill = container.querySelector(`.day-pill[data-day="${dayNum}"]`);
        if (pill) pill.setAttribute('data-done', '');
      } catch (err) {
        alert(err.message);
      }
    });
  });

  container.querySelectorAll('[data-action="swap"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const exId = btn.dataset.exerciseId;
      window.dispatchEvent(new CustomEvent('plan:swap-exercise', { detail: { exerciseId: exId } }));
    });
  });

  container.querySelectorAll('[data-action="ex-complete"]').forEach(cb => {
    cb.addEventListener('change', async (e) => {
      const exId = cb.dataset.exerciseId;
      const dayNum = parseInt(cb.dataset.day, 10);
      const completed = cb.checked;
      try {
        await toggleExerciseComplete(user_plan.id, dayNum, exId, completed);
      } catch (err) {
        cb.checked = !completed;
        alert(err.message);
      }
    });
  });

  // HIIT timer: start/stop countdown (work → rest)
  container.querySelectorAll('[data-action="start-timer"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const timer = btn.closest('.hiit-timer');
      if (!timer) return;
      const work = parseInt(timer.dataset.work, 10);
      const rest = parseInt(timer.dataset.rest, 10);
      const display = timer.querySelector('.timer-display');
      const phaseEl = timer.querySelector('.timer-phase');
      const countEl = timer.querySelector('.timer-count');
      const stopBtn = timer.querySelector('[data-action="stop-timer"]');
      const stop = () => {
        if (timer._timerInterval) clearInterval(timer._timerInterval);
        timer._timerInterval = null;
        btn.style.display = '';
        display.style.display = 'none';
      };
      stopBtn.onclick = stop;
      const run = (label, seconds, next) => {
        phaseEl.textContent = label;
        let s = seconds;
        countEl.textContent = s;
        btn.style.display = 'none';
        display.style.display = 'inline-flex';
        timer._timerInterval = setInterval(() => {
          s--;
          countEl.textContent = s;
          if (s <= 0) {
            clearInterval(timer._timerInterval);
            timer._timerInterval = null;
            if (next) next();
            else {
              phaseEl.textContent = 'Done';
              countEl.textContent = '';
              setTimeout(() => { stop(); btn.style.display = ''; display.style.display = 'none'; }, 1500);
            }
          }
        }, 1000);
      };
      run('WORK', work, () => run('REST', rest, null));
    });
  });

  container.querySelectorAll('[data-action="stop-timer"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const timer = btn.closest('.hiit-timer');
      if (!timer) return;
      const display = timer.querySelector('.timer-display');
      const startBtn = timer.querySelector('[data-action="start-timer"]');
      if (timer._timerInterval) clearInterval(timer._timerInterval);
      timer._timerInterval = null;
      if (startBtn) startBtn.style.display = '';
      if (display) display.style.display = 'none';
    });
  });

  // Open the day matching current day of week
  const cardToOpen = container.querySelector(`.day-card[data-day="${currentDay}"]`);
  const pillToActivate = container.querySelector(`.day-pill[data-day="${currentDay}"]`);
  if (cardToOpen) cardToOpen.classList.add('open');
  if (pillToActivate) pillToActivate.classList.add('active');
  if (!cardToOpen && dayCards.length) dayCards[0].classList.add('open');
  if (!pillToActivate && dayPills.length) dayPills[0].classList.add('active');

  // Equipment strip: collapse/expand, add/remove
  const eqStrip = container.querySelector('.equipment-strip');
  if (eqStrip) {
    const planId = eqStrip.dataset.planId;
    const eqToggle = eqStrip.querySelector('[data-action="eq-toggle"]');
    const eqContent = eqStrip.querySelector('.eq-content');
    const STORAGE_KEY = 'pw-workout-equipment-collapsed';
    const isCollapsed = () => localStorage.getItem(STORAGE_KEY) === 'true';
    if (isCollapsed()) {
      eqStrip.classList.add('collapsed');
      if (eqToggle) eqToggle.setAttribute('aria-expanded', 'false');
    }
    eqToggle?.addEventListener('click', () => {
      const collapsed = eqStrip.classList.toggle('collapsed');
      eqToggle.setAttribute('aria-expanded', String(!collapsed));
      eqToggle.setAttribute('aria-label', collapsed ? 'Expand equipment' : 'Collapse equipment');
      localStorage.setItem(STORAGE_KEY, String(collapsed));
    });
    const tagsContainer = eqStrip.querySelector('.eq-tags');
    const addSelect = eqStrip.querySelector('.eq-add-select');
    const getCurrentTags = () => [...tagsContainer.querySelectorAll('.eq-tag')].map(t => t.dataset.tag);
    const saveEquipment = async (tags) => {
      try {
        await updatePlanEquipment(planId, tags);
        plan.equipment_tags = tags;
        window.dispatchEvent(new CustomEvent('plan:equipment-changed', { detail: { planId, tags } }));
      } catch (err) {
        alert(err.message);
      }
    };
    getEquipmentOptions().then(opts => {
      addSelect.innerHTML = '<option value="">+ Add equipment</option>' + opts
        .filter(o => !getCurrentTags().includes(o))
        .map(o => `<option value="${escapeHtml(o)}">${escapeHtml(o)}</option>`)
        .join('');
    });
    eqStrip.querySelectorAll('[data-action="remove-eq"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const tag = btn.closest('.eq-tag')?.dataset?.tag;
        if (!tag) return;
        btn.closest('.eq-tag')?.remove();
        const tags = getCurrentTags();
        await saveEquipment(tags);
        const opt = document.createElement('option');
        opt.value = tag;
        opt.textContent = tag;
        addSelect.appendChild(opt);
      });
    });
    addSelect.addEventListener('change', async () => {
      const val = addSelect.value;
      if (!val) return;
      const span = document.createElement('span');
      span.className = 'eq-tag';
      span.dataset.tag = val;
      span.innerHTML = `<span class="eq-tag-text">${escapeHtml(val)}</span><button type="button" class="eq-tag-remove" data-action="remove-eq" aria-label="Remove">×</button>`;
      tagsContainer.appendChild(span);
      span.querySelector('[data-action="remove-eq"]').addEventListener('click', async () => {
        span.remove();
        const tags = getCurrentTags();
        await saveEquipment(tags);
        const opt = document.createElement('option');
        opt.value = val;
        opt.textContent = val;
        addSelect.appendChild(opt);
      });
      const tags = getCurrentTags();
      await saveEquipment(tags);
      const opt = [...addSelect.options].find(o => o.value === val);
      if (opt) opt.remove();
      addSelect.value = '';
    });
  }
}

function escapeHtml(s) {
  if (!s) return '';
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

// Parse HIIT interval from sets_reps: "40 sec on / 20 off" -> { work: 40, rest: 20 }
function parseHiitInterval(setsReps) {
  if (!setsReps || typeof setsReps !== 'string') return null;
  const m = setsReps.match(/(\d+)\s*sec\s*on\s*\/\s*(\d+)\s*(?:sec\s*)?off/i) ||
    setsReps.match(/(\d+)\s*sec\s*on\s*\/\s*(\d+)\s*off/i);
  if (m) return { work: parseInt(m[1], 10), rest: parseInt(m[2], 10) };
  return null;
}
