import { esc, toast, errorMessage } from './ui.js';
import { icon, googleLogo } from './icons.js';
import { getTheme, getTint, setTheme, setTint } from './theme.js';
import { signInWithGoogle, logout } from './auth.js';
import { SUBJECTS, subjectKey } from './subjects.js';
import {
  watchSubjects, saveSubject, deleteSubject, newSubjectId,
} from './store.js';

export const APP_VERSION = __APP_VERSION__;
export const REPO_URL = 'https://github.com/hankfreewood-lgtm/school-planner';

const THEMES = [
  ['light', 'Hell', 'light'],
  ['dark', 'Dunkel', 'dark'],
  ['system', 'System', 'system'],
];

export function createProfileView(root, ctx) {
  let subjectsUnsub = null;

  function render() {
    const { user } = ctx.state;
    root.querySelector('.profile-content').innerHTML = user ? signedIn(user) : signedOut();
    if (user) {
      wireSettings();
      // Render user subjects from current state (element was just re-created)
      renderSubjects(ctx.state.subjects || []);
      // Watch user subjects only once, manage unsubscribe to avoid duplicates
      if (!subjectsUnsub) {
        subjectsUnsub = watchSubjects(user.uid, (subs) => {
          renderSubjects(user.uid, subs);
        });
      }
    } else if (subjectsUnsub) {
      subjectsUnsub();
      subjectsUnsub = null;
    }
  }

  function signedOut() {
    return `<section class="login-hero">
      <div class="logo-badge">${icon('tests', 40)}</div>
      <h2>Dein Schulplaner</h2>
      <p>Hausaufgaben und Klassenarbeiten an einem Ort – übersichtlich, auf allen Geräten synchron und auch offline nutzbar.</p>
      <ul class="feature-list">
        <li>${icon('homework', 20)}<span>Hausaufgaben mit Fälligkeit und Erledigt-Status</span></li>
        <li>${icon('tests', 20)}<span>Tests mit automatischem Countdown</span></li>
        <li>${icon('sync', 20)}<span>Sichere Speicherung mit deinem Google-Konto</span></li>
      </ul>
      <button class="btn google" data-act="login" type="button"><span class="spinner dark" hidden></span>${googleLogo}<span class="lbl">Mit Google anmelden</span></button>
      <p class="hint">Es werden nur Name, E-Mail und Profilbild deines Google-Kontos gelesen.</p>
    </section>
    ${settingsCard()}${infoCard()}`;
  }

  function signedIn(user) {
    const photo = user.photoURL
      ? `<img class="avatar" src="${esc(user.photoURL)}" alt="" referrerpolicy="no-referrer" width="72" height="72">`
      : `<div class="avatar fallback">${esc((user.displayName || user.email || '?')[0].toUpperCase())}</div>`;
    return `<section class="card profile-card">
        ${photo}
        <div class="who"><h2>${esc(user.displayName || 'Angemeldet')}</h2><p>${esc(user.email || '')}</p></div>
        <button class="btn tonal" data-act="logout" type="button">${icon('logout', 20)}Abmelden</button>
      </section>
      ${settingsCard()}${infoCard()}${subjectsSection()}`;
  }

  function settingsCard() {
    const cur = getTheme();
    return `<section class="card settings">
      <h3>${icon('palette', 22)}Darstellung</h3>
      <div class="segmented" role="radiogroup" aria-label="Farbschema">
        ${THEMES.map(([v, l, i]) => `<button type="button" role="radio" aria-checked="${cur === v}" class="${cur === v ? 'active' : ''}" data-theme="${v}">${icon(i, 20)}<span>${l}</span></button>`).join('')}
      </div>
      <label class="switch-row">
        <span><strong>Fachfarben im Hintergrund</strong><small>Karten dezent in der Farbe des Fachs einfärben</small></span>
        <input type="checkbox" role="switch" data-tint ${getTint() ? 'checked' : ''}>
        <span class="switch" aria-hidden="true"></span>
      </label>
      <div class="legend" aria-label="Fachfarben">
        ${SUBJECTS.map((s) => `<span class="badge subj-${subjectKey(s)}">${esc(s)}</span>`).join('')}
      </div>
    </section>`;
  }

  function subjectsSection() {
    return `<section class="card subjects-mgr">
      <h3>${icon('bookmark', 22)}Fächer</h3>
      <p style="color: var(--text-muted); font-size: .84rem; margin-bottom: 8px;">Eigene Fächer hinzufügen oder bearbeiten. Die Farbe bestimmt die Akzentfarbe der Karten.</p>
      <div class="subject-list" id="subject-list"></div>
      <button class="btn tonal" data-act="add-subject" type="button">${icon('add', 20)}Fach hinzufügen</button>
    </section>`;
  }

  function renderSubjects(uid, subjects = []) {
    const host = root.querySelector('#subject-list');
    if (!host) return;
    host.innerHTML = subjects.map((s) => `
      <div class="subject-item" data-subject-id="${esc(s.id)}">
        <div class="name"><span class="dot" style="background:${esc(s.color || '#8e919b')}"></span>${esc(s.name)}</div>
        <div class="actions">
          <button class="icon-btn" data-act="delete-subject" data-subject-id="${esc(s.id)}" aria-label="Fach ${esc(s.name)} löschen">${icon('delete', 16)}</button>
        </div>
      </div>
    `).join('');
  }

  function addSubjectDialog(uid) {
    return new Promise((resolve) => {
      const dlg = $('#confirm');
      dlg.innerHTML = `
        <h2 class="dialog-title">Fach hinzufügen</h2>
        <div class="field" style="margin-bottom: 12px;">
          <label style="font-size: .77rem; font-weight: 600; color: var(--text-muted); display: block; margin-bottom: 4px;">Fachname</label>
          <input type="text" id="new-subject-name" style="width: 100%; min-height: 45px; padding: 10px 14px; border-radius: var(--radius-s); border: 1px solid var(--outline-strong); background: var(--surface-3); color: var(--text); font: inherit;" required>
        </div>
        <div class="field" style="margin-bottom: 12px;">
          <label style="font-size: .77rem; font-weight: 600; color: var(--text-muted); display: block; margin-bottom: 4px;">Farbe</label>
          <input type="color" id="new-subject-color" value="#2fae5c" style="width: 100%; height: 48px; border: none; border-radius: var(--radius-s); cursor: pointer;">
        </div>
        <div class="dialog-actions">
          <button class="btn text" data-act="cancel" type="button">Abbrechen</button>
          <button class="btn filled" data-act="ok" type="button">Hinzufügen</button>
        </div>`;
      let result = null;
      const onClick = (e) => {
        const act = e.target.closest('[data-act]')?.dataset.act;
        if (!act) return;
        const nameEl = dlg.querySelector('#new-subject-name');
        const colorEl = dlg.querySelector('#new-subject-color');
        if (act === 'ok') {
          result = { name: nameEl.value.trim(), color: colorEl.value };
        }
        closeDialog(dlg);
      };
      const onClose = () => {
        dlg.removeEventListener('click', onClick);
        dlg.removeEventListener('close', onClose);
        resolve(result);
      };
      dlg.addEventListener('click', onClick);
      dlg.addEventListener('close', onClose);
      openDialog(dlg);
      const nameInput = dlg.querySelector('#new-subject-name');
      nameInput.focus();
    });
  }

  function openDialog(dlg) {
    dlg.classList.remove('closing');
    if (!dlg.open) dlg.showModal();
  }

  function closeDialog(dlg) {
    if (!dlg.open || dlg.classList.contains('closing')) return;
    dlg.classList.add('closing');
    dlg.close();
  }

  function wireSettings() { /* Events laufen per Delegation */ }

  root.addEventListener('click', async (e) => {
    const t = e.target.closest('[data-act],[data-theme]');
    if (!t) return;
    if (t.dataset.theme) { setTheme(t.dataset.theme); ctx.prefsChanged(); return; }
    if (t.dataset.act === 'install') return ctx.install();
    if (t.dataset.act === 'logout') {
      try { await logout(); toast('Abgemeldet'); } catch (err) { toast(errorMessage(err), { type: 'error' }); }
    }
    if (t.dataset.act === 'login') {
      t.disabled = true;
      t.querySelector('.spinner').hidden = false;
      try { await signInWithGoogle(); } catch (err) {
        if (!/popup-closed|cancelled-popup/.test(err?.code || '')) toast(errorMessage(err), { type: 'error', duration: 6000 });
      } finally {
        t.disabled = false;
        const sp = t.querySelector('.spinner'); if (sp) sp.hidden = true;
      }
    }
    if (t.dataset.act === 'add-subject') {
      const uid = ctx.state.user?.uid;
      if (!uid) return;
      const res = await addSubjectDialog(uid);
      if (!res) return;
      const id = newSubjectId(uid);
      try {
        await saveSubject(uid, id, { name: res.name, color: res.color });
        toast(`Fach "${esc(res.name)}" hinzugefügt`);
      } catch (err) { toast(errorMessage(err), { type: 'error' }); }
    }
    if (t.dataset.act === 'delete-subject') {
      const uid = ctx.state.user?.uid;
      const sid = t.dataset.subjectId;
      if (!uid || !sid) return;
      const yes = await confirmDialog({ title: 'Fach löschen?', message: 'Dieses Fach wird für alle Einträge entfernt.' });
      if (!yes) return;
      try {
        await deleteSubject(uid, sid);
        toast('Fach entfernt');
      } catch (err) { toast(errorMessage(err), { type: 'error' }); }
    }
  });
  root.addEventListener('change', (e) => {
    if (e.target.matches('[data-tint]')) { setTint(e.target.checked); ctx.prefsChanged(); }
  });

  return { render };
}