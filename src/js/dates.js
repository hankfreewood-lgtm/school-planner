// Datums- und Sortierlogik. Reine Funktionen, keine DOM-/Firebase-Abhängigkeiten (testbar).
// Alle Fälligkeiten sind kalendarische ISO-Strings "JJJJ-MM-TT" (ohne Uhrzeit/Zeitzone),
// dadurch entstehen keine Zeitzonen-Verschiebungen.

/** Wie viele Tage nach dem Fälligkeitsdatum eine Hausaufgabe noch sichtbar bleibt (0 = nur bis einschließlich Fälligkeitstag). */
export const HOMEWORK_GRACE_DAYS = 0;
/** Ein Test verschwindet ab dem Testdatum (Testtag selbst nicht mehr sichtbar). */
export const TEST_VISIBLE_UNTIL_DAYS_BEFORE = 1;

const pad = (n) => String(n).padStart(2, '0');

/** Lokales heutiges Datum als ISO-String. */
export function todayISO(now = new Date()) {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function toDayNumber(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86400000);
}

/** Differenz in ganzen Kalendertagen (b - a). */
export function diffDays(aISO, bISO) {
  return toDayNumber(bISO) - toDayNumber(aISO);
}

export function addDaysISO(iso, days) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

export function isValidISO(iso) {
  if (typeof iso !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  return addDaysISO(iso, 0) === iso;
}

/** TT.MM.JJJJ */
export function formatDE(iso) {
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

const WEEKDAYS = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
const WEEKDAYS_SHORT = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

export function weekdayShort(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return WEEKDAYS_SHORT[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}
export function weekdayLong(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

/** Sichtbar, solange das Fälligkeitsdatum nicht mehr als GRACE Tage zurückliegt. */
export function isHomeworkVisible(dueISO, todayStr, grace = HOMEWORK_GRACE_DAYS) {
  return diffDays(dueISO, todayStr) <= grace;
}

/** Ein Test ist nur sichtbar, solange sein Datum noch in der Zukunft liegt (ab Testdatum ausgeblendet). */
export function isTestVisible(testISO, todayStr) {
  return diffDays(todayStr, testISO) >= TEST_VISIBLE_UNTIL_DAYS_BEFORE;
}

/** Statusgruppe einer Hausaufgabe: 0 überfällig & offen, 1 heute, 2 später, 3 erledigt. */
export function homeworkGroup(hw, todayStr) {
  if (hw.completed) return 3;
  const delta = diffDays(todayStr, hw.dueDate);
  if (delta < 0) return 0;
  if (delta === 0) return 1;
  return 2;
}

export function sortHomework(list, todayStr) {
  return [...list].sort((a, b) => {
    const ga = homeworkGroup(a, todayStr);
    const gb = homeworkGroup(b, todayStr);
    if (ga !== gb) return ga - gb;
    if (a.dueDate !== b.dueDate) return a.dueDate < b.dueDate ? -1 : 1;
    return (a.subject || '').localeCompare(b.subject || '', 'de');
  });
}

export function sortTests(list) {
  return [...list].sort((a, b) =>
    a.testDate === b.testDate
      ? (a.subject || '').localeCompare(b.subject || '', 'de')
      : a.testDate < b.testDate ? -1 : 1,
  );
}

/**
 * Dynamischer Countdown (wird nie gespeichert).
 * Rückgabe: { label, level } – level: 'today' | 'urgent' | 'soon' | 'week' | 'far' | 'past'
 */
export function countdown(testISO, todayStr) {
  const n = diffDays(todayStr, testISO);
  if (n < 0) return { label: 'Vorbei', level: 'past', days: n };
  if (n === 0) return { label: 'Heute', level: 'today', days: n };
  if (n === 1) return { label: 'Morgen', level: 'urgent', days: n };
  if (n <= 3) return { label: `In ${n} Tagen`, level: 'urgent', days: n };
  if (n <= 7) return { label: `In ${n} Tagen`, level: 'soon', days: n };
  if (n < 14) return { label: `In ${n} Tagen`, level: 'week', days: n };
  const weeks = Math.round(n / 7);
  return { label: `In ${weeks} Wochen`, level: 'far', days: n };
}

/** Hinweis-Badge für Hausaufgaben. */
export function homeworkBadge(hw, todayStr) {
  if (hw.completed) return null;
  const delta = diffDays(todayStr, hw.dueDate);
  if (delta < 0) return { label: 'Überfällig', level: 'overdue' };
  if (delta === 0) return { label: 'Heute fällig', level: 'today' };
  if (delta === 1) return { label: 'Morgen fällig', level: 'soon' };
  return null;
}

/** Millisekunden bis zum nächsten lokalen Mitternacht (+ kleine Reserve). */
export function msUntilNextMidnight(now = new Date()) {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1);
  return next - now;
}
