import {
  collection, doc, onSnapshot, query, where, setDoc, deleteDoc, serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase.js';

/**
 * Datenzugriff. Struktur:
 *   users/{uid}/homework/{id}   subject, content, dueDate, completed, createdAt, updatedAt
 *   users/{uid}/tests/{id}      subject, topic, testDate, createdAt, updatedAt
 *   users/{uid}/settings/preferences   theme, subjectTint, updatedAt
 *
 * Offline: Schreibzugriffe landen im lokalen IndexedDB-Cache (siehe firebase.js) und werden bei
 * Verbindung automatisch synchronisiert. Ihr Promise wird deshalb erst nach Server-Bestätigung erfüllt.
 */

const col = (uid, name) => collection(db, 'users', uid, name);

/** Live-Abfrage ab einem Datums-Grenzwert (nur noch relevante Einträge werden geladen). */
export function watch(uid, name, field, fromISO, onData, onError) {
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
  return onSnapshot(doc(db, 'users', uid, 'settings', 'preferences'), (snap) => onData(snap.exists() ? snap.data() : null), () => {});
}

export const newId = (uid, name) => doc(col(uid, name)).id;

export function saveHomework(uid, id, data, isNew) {
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

export const setHomeworkCompleted = (uid, id, completed) =>
  setDoc(doc(db, 'users', uid, 'homework', id), { completed, updatedAt: serverTimestamp() }, { merge: true });

export const deleteHomework = (uid, id) => deleteDoc(doc(db, 'users', uid, 'homework', id));

export function saveTest(uid, id, data, isNew) {
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

export const deleteTest = (uid, id) => deleteDoc(doc(db, 'users', uid, 'tests', id));

export const savePrefs = (uid, prefs) =>
  setDoc(
    doc(db, 'users', uid, 'settings', 'preferences'),
    { theme: prefs.theme, subjectTint: !!prefs.subjectTint, updatedAt: serverTimestamp() },
    { merge: true },
  );

/* ---------------- User-Fächer (benutzerdefinierte Fächer mit Farbe) ---------------- */
export function watchSubjects(uid, onData, onError) {
  return onSnapshot(
    collection(db, 'users', uid, 'subjects'),
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError,
  );
}

export function saveSubject(uid, id, { name, color }) {
  return setDoc(
    doc(db, 'users', uid, 'subjects', id),
    { name, color, createdAt: serverTimestamp(), updatedAt: serverTimestamp() },
    { merge: true },
  );
}

export function deleteSubject(uid, id) {
  return deleteDoc(doc(db, 'users', uid, 'subjects', id));
}

export const newSubjectId = (uid) => doc(collection(db, 'users', uid, 'subjects')).id;

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
