import { esc, toast, errorMessage } from './ui.js';
import { icon, googleLogo } from './icons.js';
import { getTheme, getTint, setTheme, setTint } from './theme.js';
import { signInWithGoogle, logout } from './auth.js';
import { SUBJECTS, subjectKey } from './subjects.js';

export const APP_VERSION = __APP_VERSION__;
export const REPO_URL = 'https://github.com/hankfreewood-lgtm/school-planner';

const THEMES = [
  ['light', 'Hell', 'light'],
  ['dark', 'Dunkel', 'dark'],
  ['system', 'System', 'system'],
];

export function createProfileView(root, ctx) {
  function render() {
    const { user } = ctx.state;
    root.querySelector('.profile-content').innerHTML = user ? signedIn(user) : signedOut();
    if (user) wireSettings();
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
      ${settingsCard()}${infoCard()}`;
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

  function infoCard() {
    const install = ctx.canInstall()
      ? `<button class="btn tonal" data-act="install" type="button">${icon('download', 20)}App installieren</button>` : '';
    return `<section class="card info">
      <h3>${icon('info', 22)}App-Informationen</h3>
      <dl>
        <div><dt>App</dt><dd>Schulplaner</dd></div>
        <div><dt>Version</dt><dd>${esc(APP_VERSION)}</dd></div>
        <div><dt>Quellcode</dt><dd><a href="${REPO_URL}" target="_blank" rel="noopener">GitHub</a></dd></div>
      </dl>
      ${install}
    </section>`;
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
  });
  root.addEventListener('change', (e) => {
    if (e.target.matches('[data-tint]')) { setTint(e.target.checked); ctx.prefsChanged(); }
  });

  return { render };
}
