// Theme-Verwaltung. Die Erstanwendung passiert zusätzlich inline in index.html (kein Aufblitzen).
const KEY = 'sp-theme';
const TINT_KEY = 'sp-tint';
const media = matchMedia('(prefers-color-scheme: dark)');
const listeners = new Set();

const read = (k) => {
  try { return localStorage.getItem(k); } catch { return null; }
};
const write = (k, v) => {
  try { localStorage.setItem(k, v); } catch { /* Ignorieren (privater Modus) */ }
};

export const getTheme = () => {
  const t = read(KEY);
  return t === 'light' || t === 'dark' || t === 'system' ? t : 'dark';
};
export const getTint = () => read(TINT_KEY) === '1';

function resolved(theme) {
  return theme === 'system' ? (media.matches ? 'dark' : 'light') : theme;
}

export function applyTheme(theme = getTheme()) {
  const r = resolved(theme);
  const root = document.documentElement;
  root.dataset.theme = r;
  root.style.colorScheme = r;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = r === 'dark' ? '#000000' : '#f2f2f7';
  root.dataset.tint = getTint() ? 'on' : 'off';
}

export function setTheme(theme) {
  write(KEY, theme);
  applyTheme(theme);
  listeners.forEach((fn) => fn());
}

export function setTint(on) {
  write(TINT_KEY, on ? '1' : '0');
  applyTheme();
  listeners.forEach((fn) => fn());
}

export const onThemeChange = (fn) => listeners.add(fn);

media.addEventListener('change', () => { if (getTheme() === 'system') applyTheme(); });
