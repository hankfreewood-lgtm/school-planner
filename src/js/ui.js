import { icon } from './icons.js';

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/* ---------------- Toast / Snackbar ---------------- */
let toastTimer;
export function toast(message, { type = 'info', duration = 3200 } = {}) {
  const host = $('#toast');
  const ic = type === 'error' ? 'warning' : type === 'success' ? 'checkCircle' : 'info';
  host.className = `toast ${type}`;
  host.innerHTML = `${icon(ic, 20)}<span>${esc(message)}</span>`;
  // Reflow, damit die Animation bei schnell aufeinanderfolgenden Toasts neu startet
  void host.offsetWidth;
  // Popover = Top Layer, damit der Toast auch über geöffneten Dialogen sichtbar ist
  try {
    if (host.hidePopover) { host.hidePopover(); host.showPopover(); }
  } catch { /* Popover nicht unterstützt */ }
  host.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => host.classList.remove('show'), duration);
}

/* ---------------- Bottom Sheet / Dialog ---------------- */
function openDialog(dlg) {
  clearTimeout(dlg._closeTimer); // noch laufendes Schließen eines vorherigen Aufrufs abbrechen
  dlg.classList.remove('closing');
  if (!dlg.open) dlg.showModal();
}

export function closeDialog(dlg) {
  if (!dlg.open || dlg.classList.contains('closing')) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return dlg.close();
  dlg.classList.add('closing');
  const done = () => {
    clearTimeout(dlg._closeTimer);
    dlg.removeEventListener('animationend', onEnd);
    if (dlg.classList.contains('closing')) { dlg.classList.remove('closing'); dlg.close(); }
  };
  const onEnd = (e) => { if (e.target === dlg) done(); };
  dlg.addEventListener('animationend', onEnd);
  dlg._closeTimer = setTimeout(done, 400); // Fallback
}

/** Öffnet das Sheet mit beliebigem HTML-Inhalt und gibt das Dialog-Element zurück. */
export function openSheet(html) {
  const dlg = $('#sheet');
  dlg.style.setProperty('--sheet-drag', '0px');
  dlg.classList.remove('dragging', 'closing');
  dlg.innerHTML = `<div class="sheet-grab" aria-hidden="true"></div>${html}`;
  openDialog(dlg);
  return dlg;
}
export const closeSheet = () => closeDialog($('#sheet'));

/* ---------------- Fluides Sheet: 1:1-Drag, Rubber-Band, Momentum, Velocity-Handoff ---------------- */
const prefersReduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Apples Momentum-Projektion: wohin der Finger „geworfen" hätte. */
function project(velocity, deceleration = 0.998) {
  return (velocity / 1000) * deceleration / (1 - deceleration);
}

/** Progressive Resistenz an der oberen Kante – kein harter Stopp. */
function rubberband(overshoot, dimension, constant = 0.55) {
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}

/** Kritisch gedämpfter Spring mit übernommener Release-Geschwindigkeit. */
function animateSpring(dlg, from, to, velocity, done) {
  dlg._cancelSpring?.();
  let cancelled = false;
  dlg._cancelSpring = () => { cancelled = true; };
  if (prefersReduced()) {
    dlg.style.setProperty('--sheet-drag', `${Math.max(0, to)}px`);
    done();
    return;
  }
  const stiffness = (2 * Math.PI / 0.34) ** 2;
  const damping = 2 * Math.sqrt(stiffness);
  let pos = from;
  let vel = velocity;
  let last = performance.now();
  const step = (now) => {
    if (cancelled) return;
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    vel += (-stiffness * (pos - to) - damping * vel) * dt;
    pos += vel * dt;
    dlg.style.setProperty('--sheet-drag', `${Math.max(0, pos)}px`);
    if (Math.abs(vel) < 6 && Math.abs(pos - to) < 0.5) {
      dlg.style.setProperty('--sheet-drag', `${Math.max(0, to)}px`);
      dlg._cancelSpring = null;
      done();
      return;
    }
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function initSheetDrag(dlg) {
  let drag = null;

  dlg.addEventListener('pointerdown', (e) => {
    if (e.button) return;
    if (!matchMedia('(max-width: 639px)').matches) return;
    if (dlg.classList.contains('closing')) return;
    if (!e.target.closest('.sheet-grab, .sheet-head')) return;
    if (e.target.closest('button, a, input, select, textarea')) return;
    dlg._cancelSpring?.();
    drag = {
      startY: e.clientY, lastY: e.clientY, lastT: performance.now(),
      offset: 0, velocity: 0, height: dlg.getBoundingClientRect().height,
    };
    dlg.classList.add('dragging');
    try { dlg.setPointerCapture(e.pointerId); } catch { /* optional */ }
    e.preventDefault();
  });

  dlg.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const now = performance.now();
    let dy = e.clientY - drag.startY;
    if (dy < 0) dy = rubberband(dy, drag.height);
    dy = Math.min(dy, drag.height);
    drag.offset = dy;
    drag.velocity = (e.clientY - drag.lastY) / Math.max((now - drag.lastT) / 1000, 0.001);
    drag.lastY = e.clientY;
    drag.lastT = now;
    dlg.style.setProperty('--sheet-drag', `${dy}px`);
  });

  const end = (e) => {
    if (!drag) return;
    const { offset, height, velocity } = drag;
    drag = null;
    dlg.classList.remove('dragging');
    try { dlg.releasePointerCapture(e.pointerId); } catch { /* optional */ }
    const projected = offset + project(velocity);
    if (projected > height * 0.4 || velocity > 900) {
      animateSpring(dlg, offset, height, velocity, () => closeDialog(dlg));
    } else {
      animateSpring(dlg, offset, 0, velocity, () => dlg.style.setProperty('--sheet-drag', '0px'));
    }
  };
  dlg.addEventListener('pointerup', end);
  dlg.addEventListener('pointercancel', end);
}

/** Bestätigungsdialog; resolved mit true/false */
export function confirmDialog({ title, message, confirmLabel = 'Löschen', danger = true }) {
  return new Promise((resolve) => {
    const dlg = $('#confirm');
    dlg.innerHTML = `
      <h2 class="dialog-title">${esc(title)}</h2>
      <p class="dialog-text">${esc(message)}</p>
      <div class="dialog-actions">
        <button class="btn text" data-act="cancel" type="button">Abbrechen</button>
        <button class="btn ${danger ? 'danger' : 'filled'}" data-act="ok" type="button">${esc(confirmLabel)}</button>
      </div>`;
    let result = false;
    const onClick = (e) => {
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (!act) return;
      result = act === 'ok';
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
    dlg.querySelector('[data-act="cancel"]').focus();
  });
}

/** Schließt Dialoge beim Klick auf den Hintergrund (Backdrop) und animiert das Schließen bei ESC. */
export function initDialogs() {
  for (const dlg of $$('dialog')) {
    dlg.addEventListener('click', (e) => { if (e.target === dlg) closeDialog(dlg); });
    dlg.addEventListener('cancel', (e) => { e.preventDefault(); closeDialog(dlg); });
    dlg.addEventListener('close', () => {
      dlg.style.setProperty('--sheet-drag', '0px');
      dlg.classList.remove('dragging');
    });
  }
  const sheet = $('#sheet');
  if (sheet) initSheetDrag(sheet);
}

/* ---------------- Keyed Listen-Rendering ---------------- */
/** Aktualisiert nur geänderte Elemente: items = [{ key, html }] */
export function reconcile(container, items) {
  const existing = new Map();
  for (const el of [...container.children]) existing.set(el.dataset.key, el);
  const frag = [];
  for (const { key, html } of items) {
    let el = existing.get(key);
    if (el && el._html === html) {
      existing.delete(key);
    } else {
      const t = document.createElement('template');
      t.innerHTML = html.trim();
      const fresh = t.content.firstElementChild;
      fresh.dataset.key = key;
      fresh._html = html;
      if (el) { el.replaceWith(fresh); existing.delete(key); }
      el = fresh;
    }
    frag.push(el);
  }
  for (const el of existing.values()) el.remove();
  frag.forEach((el, i) => {
    if (container.children[i] !== el) container.insertBefore(el, container.children[i] || null);
  });
}

export function emptyState(iconName, title, text, actionHtml = '') {
  return `<div class="empty">
    <div class="empty-art">${icon(iconName, 44)}</div>
    <h2>${esc(title)}</h2><p>${esc(text)}</p>${actionHtml}
  </div>`;
}

export function skeleton(n = 3) {
  return Array.from({ length: n }, () => `<div class="card skeleton" aria-hidden="true"><div class="sk l1"></div><div class="sk l2"></div></div>`).join('');
}

export function errorMessage(err) {
  const code = err?.code || '';
  const map = {
    'permission-denied': 'Keine Berechtigung. Bitte melde dich erneut an.',
    'unavailable': 'Server nicht erreichbar. Änderungen werden später synchronisiert.',
    'auth/popup-closed-by-user': 'Anmeldung abgebrochen.',
    'auth/cancelled-popup-request': 'Anmeldung abgebrochen.',
    'auth/popup-blocked': 'Das Anmelde-Fenster wurde blockiert. Bitte Pop-ups erlauben.',
    'auth/network-request-failed': 'Keine Internetverbindung. Bitte später erneut versuchen.',
    'auth/unauthorized-domain': 'Diese Domain ist für die Anmeldung nicht freigegeben (Firebase Console → Authentication → Einstellungen → Autorisierte Domains).',
    'auth/operation-not-allowed': 'Google-Anmeldung ist in Firebase noch nicht aktiviert.',
  };
  return map[code] || 'Etwas ist schiefgelaufen. Bitte versuche es erneut.';
}

/** Reichert Fehler mit einer verständlichen deutschen userMessage an. */
export async function wrap(promise) {
  try { return await promise; } catch (err) { err.userMessage = errorMessage(err); throw err; }
}
