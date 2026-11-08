import {
  collection, doc, onSnapshot, query, where, setDoc, deleteDoc, serverTimestamp,
} from 'firebase/firestore';
import { db, LOCAL } from './firebase.js';
import { todayISO, addDaysISO } from './dates.js';

/**
 * Datenzugriff. Struktur:
 *   users/{uid}/homework/{id}   subject, content, dueDate, completed, createdAt, updatedAt
 *   users/{uid}/tests/{id}      subject, topic, testDate, createdAt, updatedAt
 *   users/{uid}/settings/preferences   theme, subjectTint, updatedAt
 *
 * Im lokalen Modus (file:// oder ?local) liegen die Daten in localStorage und
 * verhalten sich wie die Firestore-Version – dieselbe API, kein Backend nötig.
 */

/* ---------------- Lokaler Modus ---------------- */
const LKEY = (name) => `sp-local-${name}`;
// Fallback, falls localStorage unter file:// blockiert ist – die App bleibt nutzbar.
const mem = new Map();

function lread(name, fallback) {
  try {
    const raw = localStorage.getItem(LKEY(name));
    if (raw != null) return JSON.parse(raw);
  } catch { /* nicht verfügbar */ }
  return mem.has(name) ? mem.get(name) : fallback;
}

function lwrite(name, value) {
  mem.set(name, value);
  try {
    localStorage.setItem(LKEY(name), JSON.stringify(value));
  } catch { /* Speicher voll / privat – im Speicher weiterarbeiten */ }
  notifyLocal();
}

function notifyLocal() {
  window.dispatchEvent(new Event('sp-local-change'));
}

function newLocalId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Beispielinhalte beim allerersten lokalen Start, damit die App „fertig" wirkt. */
function seedLocal() {
  if (lread('seeded', false)) return;
  const today = todayISO();
  lwrite('homework', [
    { id: 'demo-hw-1', subject: 'Mathematik', content: 'Buch S. 45, Aufgaben 2–5', dueDate: today, completed: false },
    { id: 'demo-hw-2', subject: 'Englisch', content: 'Vokabeln Unit 4 wiederholen', dueDate: addDaysISO(today, 1), completed: false },
    { id: 'demo-hw-3', subject: 'Biologie', content: 'Referat vorbereiten: Photosynthese', dueDate: addDaysISO(today, 3), completed: false },
    { id: 'demo-hw-4', subject: 'Deutsch', content: 'Aufsatz überarbeiten', dueDate: addDaysISO(today, -1), completed: true },
  ]);
  lwrite('tests', [
    { id: 'demo-test-1', subject: 'Physik', topic: 'Elektrische Felder', testDate: addDaysISO(today, 2) },
    { id: 'demo-test-2', subject: 'Geschichte', topic: 'Französische Revolution', testDate: addDaysISO(today, 9) },
  ]);
  lwrite('subjects', []);
  lwrite('seeded', true);
}

function watchLocal(run) {
  const emit = () => run();
  window.addEventListener('sp-local-change', emit);
  window.addEventListener('storage', emit);
  emit();
  return () => {
    window.removeEventListener('sp-local-change', emit);
    window.removeEventListener('storage', emit);
  };
}

if (LOCAL) seedLocal();

/* ---------------- Firestore-Helfer ---------------- */
const col = (uid, name) => collection(db, 'users', uid, name);

/** Live-Abfrage ab einem Datums-Grenzwert (nur noch relevante Einträge werden geladen). */
export function watch(uid, name, field, fromISO, onData, onError) {
  if (LOCAL) {
    return watchLocal(() => {
      const items = lread(name, []).filter((it) => it[field] >= fromISO);
      onData(items, { pending: false, fromCache: true });
    });
  }
  const q = query(col(uid, name), where(field, '>=', fromISO));
  return onSnapshot(
    q,
    { includeMetadataChanges: true },
    (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data(), _pending: d.metadata.hasPendingWrites }));
      onData(items, { pending: snap.metadata.hasPendingWrites, fromCache: snap.metadata.fromCache });
    },
    onError,
  );
}

export function watchPrefs(uid, onData) {
  if (LOCAL) return watchLocal(() => onData(lread('prefs', null)));
  return onSnapshot(doc(db, 'users', uid, 'settings', 'preferences'), (snap) => onData(snap.exists() ? snap.data() : null), () => {});
}

export const newId = (uid, name) => (LOCAL ? newLocalId() : doc(col(uid, name)).id);

export function saveHomework(uid, id, data, isNew) {
  if (LOCAL) {
    const list = lread('homework', []);
    const rec = {
      id, subject: data.subject, content: data.content, dueDate: data.dueDate, completed: !!data.completed,
    };
    const i = list.findIndex((x) => x.id === id);
    if (i >= 0) list[i] = { ...list[i], ...rec }; else list.push(rec);
    lwrite('homework', list);
    return Promise.resolve();
  }
  return setDoc(
    doc(db, 'users', uid, 'homework', id),
    {
      subject: data.subject,
      content: data.content,
      dueDate: data.dueDate,
      completed: !!data.completed,
      ...(isNew ? { createdAt: serverTimestamp() } : {}),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export function setHomeworkCompleted(uid, id, completed) {
  if (LOCAL) {
    const list = lread('homework', []);
    const i = list.findIndex((x) => x.id === id);
    if (i >= 0) { list[i] = { ...list[i], completed }; lwrite('homework', list); }
    return Promise.resolve();
  }
  return setDoc(doc(db, 'users', uid, 'homework', id), { completed, updatedAt: serverTimestamp() }, { merge: true });
}

export function deleteHomework(uid, id) {
  if (LOCAL) {
    lwrite('homework', lread('homework', []).filter((x) => x.id !== id));
    return Promise.resolve();
  }
  return deleteDoc(doc(db, 'users', uid, 'homework', id));
}

export function saveTest(uid, id, data, isNew) {
  if (LOCAL) {
    const list = lread('tests', []);
    const rec = { id, subject: data.subject, topic: data.topic, testDate: data.testDate };
    const i = list.findIndex((x) => x.id === id);
    if (i >= 0) list[i] = { ...list[i], ...rec }; else list.push(rec);
    lwrite('tests', list);
    return Promise.resolve();
  }
  return setDoc(
    doc(db, 'users', uid, 'tests', id),
    {
      subject: data.subject,
      topic: data.topic,
      testDate: data.testDate,
      ...(isNew ? { createdAt: serverTimestamp() } : {}),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export function deleteTest(uid, id) {
  if (LOCAL) {
    lwrite('tests', lread('tests', []).filter((x) => x.id !== id));
    return Promise.resolve();
  }
  return deleteDoc(doc(db, 'users', uid, 'tests', id));
}

export function savePrefs(uid, prefs) {
  if (LOCAL) {
    lwrite('prefs', { theme: prefs.theme, subjectTint: !!prefs.subjectTint });
    return Promise.resolve();
  }
  return setDoc(
    doc(db, 'users', uid, 'settings', 'preferences'),
    { theme: prefs.theme, subjectTint: !!prefs.subjectTint, updatedAt: serverTimestamp() },
    { merge: true },
  );
}

/* ---------------- User-Fächer (benutzerdefinierte Fächer mit Farbe) ---------------- */
export function watchSubjects(uid, onData, onError) {
  if (LOCAL) return watchLocal(() => onData(lread('subjects', [])));
  return onSnapshot(
    collection(db, 'users', uid, 'subjects'),
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError,
  );
}

export function saveSubject(uid, id, { name, color }) {
  if (LOCAL) {
    const list = lread('subjects', []);
    const i = list.findIndex((x) => x.id === id);
    const rec = { id, name, color };
    if (i >= 0) list[i] = { ...list[i], ...rec }; else list.push(rec);
    lwrite('subjects', list);
    return Promise.resolve();
  }
  return setDoc(
    doc(db, 'users', uid, 'subjects', id),
    { name, color, createdAt: serverTimestamp(), updatedAt: serverTimestamp() },
    { merge: true },
  );
}

export function deleteSubject(uid, id) {
  if (LOCAL) {
    lwrite('subjects', lread('subjects', []).filter((x) => x.id !== id));
    return Promise.resolve();
  }
  return deleteDoc(doc(db, 'users', uid, 'subjects', id));
}

export const newSubjectId = (uid) =>
  (LOCAL ? newLocalId() : doc(collection(db, 'users', uid, 'subjects')).id);

/**
 * Wartet auf die Server-Bestätigung, aber höchstens `ms` – offline blockiert die UI nie.
 * Fehler (z. B. permission-denied) werden weitergereicht.
 */
export async function settle(promise, onLateError, ms = 6000) {
  // Spätere Fehler (nach Timeout/offline) nicht verschlucken, sondern melden.
  const late = (e) => onLateError?.(e);
  if (!navigator.onLine) { promise.catch(late); return 'queued'; }
  let timer;
  promise.catch(() => {});
  const timeout = new Promise((r) => { timer = setTimeout(() => r('queued'), ms); });
  try {
    const res = await Promise.race([promise.then(() => 'saved'), timeout]);
    if (res === 'queued') promise.catch(late);
    return res;
  } finally {
    clearTimeout(timer);
  }
}
