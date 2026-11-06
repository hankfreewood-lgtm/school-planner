// Theme-Verwaltung. Die Erstanwendung passiert zusätzlich inline in index.html (kein Aufblitzen).
const KEY = 'sp-theme';
const TINT_KEY = 'sp-tint';
const media = matchMedia('(prefers-color-scheme: dark)');
const listeners = new Set();

export const getTheme = () => {
  const t = localStorage.getItem(KEY);
  return t === 'light' || t === 'dark' ? t : 'system';
};
export const getTint = () => localStorage.getItem(TINT_KEY) !== '0';

function resolved(theme) {
  return theme === 'system' ? (media.matches ? 'dark' : 'light') : theme;
}

export function applyTheme(theme = getTheme()) {
  const r = resolved(theme);
  const root = document.documentElement;
  root.dataset.theme = r;
  root.style.colorScheme = r;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = r === 'dark' ? '#121316' : '#f6f7fb';
  root.dataset.tint = getTint() ? 'on' : 'off';
}

export function setTheme(theme) {
  localStorage.setItem(KEY, theme);
  applyTheme(theme);
  listeners.forEach((fn) => fn());
}

export function setTint(on) {
  localStorage.setItem(TINT_KEY, on ? '1' : '0');
  applyTheme();
  listeners.forEach((fn) => fn());
}

export const onThemeChange = (fn) => listeners.add(fn);

media.addEventListener('change', () => { if (getTheme() === 'system') applyTheme(); });
