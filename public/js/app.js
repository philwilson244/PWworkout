import { initAuth, signInWithMagicLink, signOut, getToken } from './auth.js';
import { loadActivePlan, createAndStartPlan, getShareUrl, renderPlan, swapExercise, getExerciseLibrary, getEquipmentOptions } from './plan.js';
import { isSharePage, getSharePreview, acceptShare } from './share.js';

const container = document.getElementById('app');
const staticPlan = document.getElementById('static-plan');
const authSection = document.getElementById('auth-section');
const signInForm = document.getElementById('sign-in-form');
const signInEmail = document.getElementById('sign-in-email');
const signInMessage = document.getElementById('sign-in-message');
const signOutBtn = document.getElementById('sign-out-btn');
const userEmail = document.getElementById('user-email');
const shareBtn = document.getElementById('share-btn');

let currentPlanData = null;

async function showSharePage() {
  const match = window.location.pathname.match(/^\/s\/([a-f0-9]+)$/);
  if (!match) return false;
  const token = match[1];
  container.innerHTML = '<div class="share-page"><p>Loading...</p></div>';
  try {
    const { plan } = await getSharePreview(token);
    const authState = await initAuth();
    const isLoggedIn = authState.user != null;

    let html = `
      <div class="share-preview">
        <h1>${escapeHtml(plan.name)}</h1>
        <p class="share-meta">${(plan.equipment_tags || []).join(' · ')}</p>
        <div class="share-days">
          ${(plan.days || []).map(d => `
            <div class="share-day">
              <strong>Day ${d.day_number}:</strong> ${escapeHtml(d.name)} (${d.type})
            </div>
          `).join('')}
        </div>
        ${isLoggedIn
          ? `<button class="btn-primary" id="btn-accept-share">Copy to my plan</button>`
          : `<p>Sign in with your email to copy this plan to your account.</p>
             <div id="share-sign-in"></div>`
        }
      </div>
    `;
    container.innerHTML = html;

    if (isLoggedIn) {
      document.getElementById('btn-accept-share').addEventListener('click', async () => {
        try {
          await acceptShare(token);
          window.location.href = '/';
        } catch (err) {
          alert(err.message);
        }
      });
    } else {
      const shareSignIn = document.getElementById('share-sign-in');
      shareSignIn.innerHTML = `
        <form id="share-magic-form">
          <input type="email" placeholder="Your email" required />
          <button type="submit">Send magic link</button>
        </form>
      `;
      shareSignIn.querySelector('form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = shareSignIn.querySelector('input').value;
        try {
          await signInWithMagicLink(email);
          shareSignIn.innerHTML = '<p>Check your email for the magic link!</p>';
        } catch (err) {
          alert(err.message);
        }
      });
    }
    return true;
  } catch (err) {
    container.innerHTML = `<div class="share-page"><p>This share link has expired or is invalid.</p><a href="/">Go home</a></div>`;
    return true;
  }
}

function escapeHtml(s) {
  if (!s) return '';
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

function showSwapModal(exerciseId, currentName, category, setsReps = '', notes = '', url = '', equipment = '', muscleGroup = null) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  const recLabel = muscleGroup ? `Recommended for ${muscleGroup.replace(/\b\w/g, c => c.toUpperCase())}` : null;
  modal.innerHTML = `
    <div class="modal">
      <h3>Swap exercise</h3>
      <p>Current: ${escapeHtml(currentName)}</p>
      ${recLabel ? `<p class="swap-recommend-label">${escapeHtml(recLabel)}</p>` : ''}
      <div class="swap-options">
        <label>From library:</label>
        <select id="swap-library-select">
          <option value="">-- Choose --</option>
        </select>
        <label>Or type custom:</label>
        <input type="text" id="swap-custom-name" placeholder="Exercise name" />
        <label>Equipment (for custom):</label>
        <select id="swap-equipment">
          <option value="">None</option>
        </select>
        <label>YouTube or demo URL:</label>
        <input type="url" id="swap-url" placeholder="https://youtube.com/..." value="${escapeHtml(url)}" />
        <label>Sets/Reps:</label>
        <input type="text" id="swap-sets-reps" placeholder="e.g. 3 × 10" value="${escapeHtml(setsReps)}" />
        <label>Notes:</label>
        <input type="text" id="swap-notes" placeholder="Optional" value="${escapeHtml(notes)}" />
      </div>
      <div class="modal-actions">
        <button class="btn-secondary" data-action="cancel">Cancel</button>
        <button class="btn-primary" data-action="save">Save</button>
      </div>
    </div>
  `;

  const select = modal.querySelector('#swap-library-select');
  const customInput = modal.querySelector('#swap-custom-name');
  const equipmentSelect = modal.querySelector('#swap-equipment');
  const urlInput = modal.querySelector('#swap-url');
  const setsRepsInput = modal.querySelector('#swap-sets-reps');
  const notesInput = modal.querySelector('#swap-notes');

  const equipmentTags = currentPlanData?.plan?.equipment_tags || [];
  getEquipmentOptions().then(opts => {
    equipmentSelect.innerHTML = '<option value="">None</option>' + opts.map(o => `<option value="${escapeHtml(o)}" ${o === equipment ? 'selected' : ''}>${escapeHtml(o)}</option>`).join('');
  });
  getExerciseLibrary(category, equipmentTags).then(library => {
    const recommended = muscleGroup ? library.filter(ex => ex.muscle_group === muscleGroup) : [];
    const other = muscleGroup ? library.filter(ex => ex.muscle_group !== muscleGroup) : library;
    if (recommended.length) {
      const recGroup = document.createElement('optgroup');
      recGroup.label = `Recommended — ${muscleGroup.replace(/\b\w/g, c => c.toUpperCase())}`;
      recommended.forEach(ex => {
        const opt = document.createElement('option');
        opt.value = ex.id;
        opt.textContent = ex.name + (ex.equipment ? ` (${ex.equipment})` : '');
        recGroup.appendChild(opt);
      });
      select.appendChild(recGroup);
    }
    if (other.length) {
      const otherGroup = document.createElement('optgroup');
      otherGroup.label = recommended.length ? 'Other exercises' : 'All exercises';
      other.forEach(ex => {
        const opt = document.createElement('option');
        opt.value = ex.id;
        opt.textContent = ex.name + (ex.equipment ? ` (${ex.equipment})` : '');
        otherGroup.appendChild(opt);
      });
      select.appendChild(otherGroup);
    }
  });

  modal.querySelector('[data-action="cancel"]').addEventListener('click', () => modal.remove());
  modal.querySelector('[data-action="save"]').addEventListener('click', async () => {
    const libraryId = select.value || null;
    const customName = customInput.value.trim() || null;
    const setsReps = setsRepsInput.value.trim();
    const notes = notesInput.value.trim();
    const url = urlInput.value.trim() || undefined;
    const equip = equipmentSelect.value.trim() || undefined;
    if (!libraryId && !customName) {
      alert('Choose from library or enter a custom exercise name');
      return;
    }
    if (!setsReps) {
      alert('Enter sets/reps');
      return;
    }
    try {
      await swapExercise(exerciseId, {
        library_exercise_id: libraryId || undefined,
        custom_name: customName || undefined,
        sets_reps: setsReps,
        notes: notes || undefined,
        url,
        equipment: equip,
      });
      modal.remove();
      loadAndRenderPlan();
    } catch (err) {
      alert(err.message);
    }
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });

  document.body.appendChild(modal);
}

async function loadAndRenderPlan() {
  let data = await loadActivePlan();
  if (data.needs_setup && data.user_plan === null) {
    data = await createAndStartPlan();
  }
  currentPlanData = data;
  if (data.plan) {
    renderPlan(container, data);
  }
}

async function main() {
  if (await showSharePage()) return;

  const authState = await initAuth();

  if (!authState.configured) {
    if (staticPlan) staticPlan.style.display = 'block';
    if (authSection) authSection.style.display = 'none';
    if (container) container.style.display = 'none';
    return;
  }

  if (staticPlan) staticPlan.style.display = 'none';
  if (container) container.style.display = 'block';

  if (authState.user) {
    if (authSection) {
      authSection.style.display = 'flex';
      authSection.classList.add('logged-in');
      if (userEmail) userEmail.textContent = authState.user.email;
      if (signInForm) signInForm.style.display = 'none';
      if (signOutBtn) signOutBtn.style.display = 'block';
    }
    container.innerHTML = '<p>Loading your plan...</p>';
    await loadAndRenderPlan();
    if (shareBtn && currentPlanData?.plan) {
      shareBtn.style.display = 'block';
      shareBtn.onclick = async () => {
        try {
          const url = await getShareUrl(currentPlanData.plan.id);
          await navigator.clipboard.writeText(url);
          shareBtn.textContent = 'Link copied!';
          setTimeout(() => { shareBtn.textContent = 'Share'; }, 2000);
        } catch (err) {
          alert(err.message);
        }
      };
    }
  } else {
    if (authSection) {
      authSection.style.display = 'flex';
      authSection.classList.remove('logged-in');
      if (signInForm) signInForm.style.display = 'block';
      if (signOutBtn) signOutBtn.style.display = 'none';
    }
    container.innerHTML = '<p class="auth-prompt">Sign in to access your workout plan.</p>';
  }

  if (signInForm) {
    signInForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = signInEmail?.value?.trim();
      if (!email) return;
      signInMessage.textContent = 'Sending magic link...';
      try {
        await signInWithMagicLink(email);
        signInMessage.textContent = 'Check your email for the sign-in link!';
      } catch (err) {
        signInMessage.textContent = err.message;
      }
    });
  }

  if (signOutBtn) {
    signOutBtn.addEventListener('click', async () => {
      await signOut();
      window.location.reload();
    });
  }

  window.addEventListener('auth:signed-in', () => window.location.reload());
  window.addEventListener('auth:signed-out', () => window.location.reload());
  window.addEventListener('plan:equipment-changed', () => loadAndRenderPlan());

  window.addEventListener('plan:swap-exercise', (e) => {
    const { exerciseId } = e.detail;
    const ex = findExerciseById(currentPlanData?.plan, exerciseId);
    const name = ex?.display_name || ex?.custom_name || '';
    const setsReps = ex?.sets_reps || '';
    const notes = ex?.notes || '';
    const url = ex?.url || '';
    const equipment = ex?.display_equipment || ex?.equipment || '';
    const muscleGroup = ex?.display_muscle_group || null;
    const day = ex ? currentPlanData?.plan?.days?.find(d => d.exercises?.some(x => x.id === exerciseId)) : null;
    const category = day?.type === 'hiit' ? 'hiit' : day?.type === 'upper' ? 'upper' : day?.type === 'lower' ? 'lower' : 'full';
    showSwapModal(exerciseId, name, category, setsReps, notes, url, equipment, muscleGroup);
  });
}

function findExerciseById(plan, id) {
  if (!plan?.days) return null;
  for (const d of plan.days) {
    const ex = (d.exercises || []).find(e => e.id === id);
    if (ex) return ex;
  }
  return null;
}

main().catch(console.error);
