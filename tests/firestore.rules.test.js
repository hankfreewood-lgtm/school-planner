import test, { before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, deleteDoc, collection, getDocs } from 'firebase/firestore';

let env;
before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-school-planner',
    firestore: { rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8'), host: '127.0.0.1', port: 8080 },
  });
});
after(async () => { await env?.cleanup(); });
beforeEach(async () => { await env.clearFirestore(); });

const hw = (o = {}) => ({ subject: 'Mathematik', content: 'S. 45, Aufgaben 2–5', dueDate: '2026-11-06', completed: false, ...o });
const t = (o = {}) => ({ subject: 'Physik', topic: 'Optik', testDate: '2026-11-20', ...o });

const alice = () => env.authenticatedContext('alice').firestore();
const bob = () => env.authenticatedContext('bob').firestore();
const anon = () => env.unauthenticatedContext().firestore();

test('Eigene Hausaufgaben: erstellen, lesen, ändern, löschen', async () => {
  const d = doc(alice(), 'users/alice/homework/h1');
  await assertSucceeds(setDoc(d, hw()));
  await assertSucceeds(getDoc(d));
  await assertSucceeds(setDoc(d, { completed: true }, { merge: true }));
  await assertSucceeds(deleteDoc(d));
});

test('Eigene Tests und Einstellungen funktionieren', async () => {
  await assertSucceeds(setDoc(doc(alice(), 'users/alice/tests/t1'), t()));
  await assertSucceeds(setDoc(doc(alice(), 'users/alice/settings/preferences'), { theme: 'dark', subjectTint: true }));
  await assertSucceeds(setDoc(doc(alice(), 'users/alice'), { displayName: 'A', email: 'a@x.de', photoURL: '', createdAt: new Date(), lastLoginAt: new Date() }));
});

test('Fremde Daten: Lesen, Schreiben, Löschen und Listen verboten', async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'users/alice/homework/h1'), hw());
    await setDoc(doc(ctx.firestore(), 'users/alice/tests/t1'), t());
  });
  await assertFails(getDoc(doc(bob(), 'users/alice/homework/h1')));
  await assertFails(getDocs(collection(bob(), 'users/alice/homework')));
  await assertFails(getDocs(collection(bob(), 'users/alice/tests')));
  await assertFails(setDoc(doc(bob(), 'users/alice/homework/h2'), hw()));
  await assertFails(setDoc(doc(bob(), 'users/alice/homework/h1'), { completed: true }, { merge: true }));
  await assertFails(deleteDoc(doc(bob(), 'users/alice/homework/h1')));
  await assertFails(getDoc(doc(bob(), 'users/alice')));
});

test('Nicht angemeldet: alles verboten', async () => {
  await assertFails(getDoc(doc(anon(), 'users/alice/homework/h1')));
  await assertFails(setDoc(doc(anon(), 'users/alice/homework/h1'), hw()));
  await assertFails(getDocs(collection(anon(), 'users/alice/tests')));
});

test('Validierung: ungültige Daten werden abgelehnt', async () => {
  const col = (p) => doc(alice(), `users/alice/${p}`);
  await assertFails(setDoc(col('homework/x1'), hw({ subject: 'Hacking' })));
  await assertFails(setDoc(col('homework/x2'), hw({ dueDate: '06.11.2026' })));
  await assertFails(setDoc(col('homework/x3'), hw({ content: '' })));
  await assertFails(setDoc(col('homework/x4'), hw({ content: 'a'.repeat(1001) })));
  await assertFails(setDoc(col('homework/x5'), hw({ completed: 'ja' })));
  await assertFails(setDoc(col('homework/x6'), hw({ evil: 1 })));
  await assertFails(setDoc(col('tests/x7'), t({ testDate: 12345 })));
  await assertFails(setDoc(col('settings/other'), { theme: 'dark', subjectTint: true }));
  await assertFails(setDoc(col('settings/preferences'), { theme: 'neon', subjectTint: true }));
});

test('Unbekannte Pfade sind gesperrt', async () => {
  await assertFails(setDoc(doc(alice(), 'public/x'), { a: 1 }));
  await assertFails(setDoc(doc(alice(), 'users/alice/other/x'), { a: 1 }));
});
