import { watchAuth, saveUserProfile } from './auth.js';
import { applyTheme, getTheme, getTint, setTheme, setTint } from './theme.js';
import { todayISO, addDaysISO, msUntilNextMidnight, HOMEWORK_GRACE_DAYS } from './dates.js';
import * as store from './store.js';
import { $, $$, initDialogs, toast, emptyState, errorMessage } from './ui.js';
import { icon } from './icons.js';
import { createHomeworkView } from './homework.js';
import { createTestsView } from './tests.js';
import { createProfileView } from './profile.js';
import { SUBJECTS, subjectKey, getSubjectVars } from './subjects.js';

const state = {
  user: null,
  today: todayISO(),
  homework: [], tests: [],
  hwLoaded: false, testsLoaded: false,
  online: navigator.onLine,
  pendingHw: false, pendingTests: false,
  tab: 'homework',
  subjects: [],
};

let deferredInstall = null;
let unsubs = [];

const TABS = {
  homework: { title: 'Hausaufgaben', fab: 'Hausaufgabe' },
  tests: { title: 'Tests', fab: 'Test' },
  profile: { title: 'Profil', fab: null },
};

/* ---------------- Kontext für Views ---------------- */
const ctx = {
  state,
  lateError: (err) => toast(errorMessage(err), { type: 'error', duration: 5000 }),
  signedOutState: () => emptyState('person', 'Bitte anmelden', 'Melde dich mit Google an, um deine Daten zu sehen und zu speichern.',
    `<button class="btn filled" data-go="profile">${icon('person', 20)}Zum Profil</button>`),
  canInstall: () => !!deferredInstall,
  install: async () => {
    if (!deferredInstall) return;
    deferredInstall.prompt();
    await deferredInstall.userChoice;
    deferredInstall = null;
    views.profile.render();
  },
  prefsChanged: () => {
    views.profile.render();
    if (state.user) {
      store.savePrefs(state.user.uid, { theme: getTheme(), subjectTint: getTint() }).catch(ctx.lateError);
    }
  },
};

const views = {
  homework: createHomeworkView($('#view-homework'), ctx),
  tests: createTestsView($('#view-tests'), ctx),
  profile: createProfileView($('#view-profile'), ctx),
};

// Statische Icons (Navigation, FAB)
$$('[data-icon]').forEach((el) => { el.innerHTML = icon(el.dataset.icon, 24); });

const renderAll = () => Object.values(views).forEach((v) => v.render());

function renderToday() {
  const el = $('#appbar-date');
  if (!el) return;
  const label = new Intl.DateTimeFormat('de-DE', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
  el.textContent = label.charAt(0).toUpperCase() + label.slice(1);
}
renderToday();

/* ---------------- Scroll-Edge: weicher Übergang statt harter Linie ---------------- */
const appbar = $('.appbar');
function syncScrollEdge() {
  appbar?.classList.toggle('scrolled', window.scrollY > 6);
}
window.addEventListener('scroll', syncScrollEdge, { passive: true });
syncScrollEdge();

/* ---------------- Overflow-Menü (⋯) ---------------- */
const menu = $('#menu');
const moreBtn = $('#more');
function closeMenu() {
  if (!menu || menu.hidden) return;
  menu.hidden = true;
  moreBtn?.setAttribute('aria-expanded', 'false');
}
function openMenu() {
  if (!menu) return;
  menu.hidden = false;
  moreBtn?.setAttribute('aria-expanded', 'true');
}
moreBtn?.addEventListener('click', (e) => {
  e.stopPropagation();
  menu?.hidden ? openMenu() : closeMenu();
});
document.addEventListener('click', (e) => {
  if (menu && !menu.hidden && !e.target.closest('#menu, #more')) closeMenu();
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });
menu?.addEventListener('click', (e) => {
  const themeBtn = e.target.closest('[data-menu-theme]');
  if (themeBtn) { setTheme(themeBtn.dataset.menuTheme); ctx.prefsChanged(); closeMenu(); return; }
  if (e.target.closest('[data-go]')) closeMenu();
});

/* ---------------- Navigation ---------------- */
function showTab(tab, { push = true } = {}) {
  if (!TABS[tab]) tab = 'homework';
  closeMenu();
  state.tab = tab;
  for (const name of Object.keys(TABS)) {
    $(`#view-${name}`).hidden = name !== tab;
  }
  $$('[data-tab]').forEach((b) => {
    const active = b.dataset.tab === tab;
    b.classList.toggle('active', active);
    if (active) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
  });
  $('#title').textContent = TABS[tab].title;
  const fab = $('#fab');
  fab.hidden = !TABS[tab].fab || !state.user;
  if (TABS[tab].fab) $('.fab-label', fab).textContent = TABS[tab].fab;
  fab.setAttribute('aria-label', `${TABS[tab].fab || ''} hinzufügen`);
  document.title = `${TABS[tab].title} · Schulplaner`;
  if (push && location.hash !== `#${tab}`) history.pushState(null, '', `#${tab}`);
  $('#content').scrollTo?.({ top: 0 });
  window.scrollTo(0, 0);
  const view = $(`#view-${tab}`);
  view.classList.remove('enter'); void view.offsetWidth; view.classList.add('enter');
}

document.addEventListener('click', (e) => {
  const tabBtn = e.target.closest('[data-tab]');
  if (tabBtn) return showTab(tabBtn.dataset.tab);
  const go = e.target.closest('[data-go]');
  if (go) showTab(go.dataset.go);
});
window.addEventListener('popstate', () => showTab(location.hash.slice(1), { push: false }));
$('#fab').addEventListener('click', () => (state.tab === 'homework' ? views.homework : views.tests).add());

/* ---------------- Online/Sync-Status ---------------- */
function renderStatus() {
  const chip = $('#status');
  const pending = state.pendingHw || state.pendingTests;
  if (!state.online) {
    chip.className = 'status offline';
    chip.innerHTML = `${icon('cloudOff', 18)}<span>Offline${pending ? ' – Änderungen warten' : ''}</span>`;
    chip.hidden = false;
  } else if (pending) {
    chip.className = 'status syncing';
    chip.innerHTML = `${icon('sync', 18)}<span>Synchronisiere …</span>`;
    chip.hidden = false;
  } else {
    chip.hidden = true;
  }
}
window.addEventListener('online', () => { state.online = true; renderStatus(); toast('Wieder online', { type: 'success', duration: 1800 }); });
window.addEventListener('offline', () => { state.online = false; renderStatus(); });

/* ---------------- Daten ---------------- */
function stopData() { unsubs.forEach((u) => u()); unsubs = []; }

function startData() {
  stopData();
  const uid = state.user?.uid;
  if (!uid) return;
  const fail = (err) => { toast(errorMessage(err), { type: 'error', duration: 6000 }); };
  unsubs.push(
    store.watch(uid, 'homework', 'dueDate', addDaysISO(state.today, -HOMEWORK_GRACE_DAYS), (items, meta) => {
      state.homework = items; state.hwLoaded = true; state.pendingHw = meta.pending;
      views.homework.render(); renderStatus();
    }, fail),
    store.watch(uid, 'tests', 'testDate', state.today, (items, meta) => {
      state.tests = items; state.testsLoaded = true; state.pendingTests = meta.pending;
      views.tests.render(); renderStatus();
    }, fail),
    store.watchPrefs(uid, (remote) => {
      if (!remote) { store.savePrefs(uid, { theme: getTheme(), subjectTint: getTint() }).catch(() => {}); return; }
      let changed = false;
      if (remote.theme && remote.theme !== getTheme()) { setTheme(remote.theme); changed = true; }
      if (typeof remote.subjectTint === 'boolean' && remote.subjectTint !== getTint()) { setTint(remote.subjectTint); changed = true; }
      if (changed) views.profile.render();
    }),
    store.watchSubjects(uid, (items) => {
      state.subjects = items;
      views.homework.render();
      views.tests.render();
      views.profile.render();
    }, fail),
  );
}

/* ---------------- Auth ---------------- */
let firstAuth = true;
watchAuth((user) => {
  const prev = state.user;
  state.user = user;
  state.homework = []; state.tests = [];
  state.hwLoaded = false; state.testsLoaded = false;
  state.pendingHw = state.pendingTests = false;

  if (user) {
    startData();
    if (!prev || prev.uid !== user.uid) saveUserProfile(user).catch(() => {});
    if (!firstAuth) toast(`Willkommen, ${user.displayName?.split(' ')[0] || 'da'}!`, { type: 'success' });
    if (!firstAuth && !prev) state.tab = 'homework';
  } else {
    stopData();
    showTab('profile', { push: false });
  }
  if (firstAuth) {
    firstAuth = false;
    const hash = location.hash.slice(1);
    showTab(user ? (TABS[hash] ? hash : 'homework') : 'profile', { push: false });
    document.documentElement.classList.add('ready');
    $('#splash')?.remove();
  } else {
    showTab(state.tab, { push: false });
  }
  renderAll(); renderStatus();
});

/* ---------------- Tageswechsel ---------------- */
function checkDay() {
  const t = todayISO();
  if (t === state.today) return;
  state.today = t;
  startData();     // Abfragegrenzen neu setzen
  renderAll();
  renderToday();
}
function scheduleMidnight() {
  setTimeout(() => { checkDay(); scheduleMidnight(); }, msUntilNextMidnight());
}
scheduleMidnight();
document.addEventListener('visibilitychange', () => { if (!document.hidden) checkDay(); });
window.addEventListener('focus', checkDay);

/* ---------------- PWA ---------------- */
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstall = e;
  views.profile.render();
});
window.addEventListener('appinstalled', () => {
  deferredInstall = null; views.profile.render();
  toast('App installiert', { type: 'success' });
});
if ('serviceWorker' in navigator && import.meta.env.PROD && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch((e) => console.warn('SW:', e)));
}

initDialogs();
applyTheme();
