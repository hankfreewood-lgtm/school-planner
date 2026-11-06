import test from 'node:test';
import assert from 'node:assert/strict';
import {
  todayISO, diffDays, addDaysISO, formatDE, isValidISO, isHomeworkVisible, isTestVisible,
  homeworkGroup, sortHomework, sortTests, countdown, homeworkBadge,
} from '../src/js/dates.js';

test('todayISO nutzt lokale Zeit', () => {
  assert.equal(todayISO(new Date(2026, 10, 6, 23, 59)), '2026-11-06');
  assert.equal(todayISO(new Date(2026, 0, 1, 0, 0)), '2026-01-01');
});

test('Datumsrechnung über Monats-/Jahres-/Schaltjahresgrenzen', () => {
  assert.equal(diffDays('2026-11-06', '2026-11-07'), 1);
  assert.equal(diffDays('2026-12-31', '2027-01-01'), 1);
  assert.equal(diffDays('2028-02-28', '2028-03-01'), 2);
  assert.equal(addDaysISO('2026-10-31', 1), '2026-11-01');
  assert.equal(addDaysISO('2026-01-01', -1), '2025-12-31');
});

test('Sommerzeitwechsel verfälscht Tagesdifferenz nicht', () => {
  assert.equal(diffDays('2026-03-28', '2026-03-30'), 2);
  assert.equal(diffDays('2026-10-24', '2026-10-26'), 2);
});

test('formatDE und Validierung', () => {
  assert.equal(formatDE('2026-11-06'), '06.11.2026');
  assert.ok(isValidISO('2026-02-28'));
  assert.ok(!isValidISO('2026-02-30'));
  assert.ok(!isValidISO('06.11.2026'));
});

test('Hausaufgabe: am Fälligkeitstag sichtbar, ab Folgetag ausgeblendet', () => {
  assert.ok(isHomeworkVisible('2026-11-06', '2026-11-05'));
  assert.ok(isHomeworkVisible('2026-11-06', '2026-11-06'));
  assert.ok(!isHomeworkVisible('2026-11-06', '2026-11-07'));
});

test('Test: am Vortag sichtbar, ab Testdatum ausgeblendet', () => {
  assert.ok(isTestVisible('2026-11-06', '2026-11-05'));
  assert.ok(!isTestVisible('2026-11-06', '2026-11-06'));
  assert.ok(!isTestVisible('2026-11-06', '2026-11-07'));
});

test('Sortierung: überfällig, heute, später, erledigt', () => {
  const today = '2026-11-06';
  const list = [
    { id: 'done', dueDate: '2026-11-06', completed: true, subject: 'A' },
    { id: 'later2', dueDate: '2026-11-10', completed: false, subject: 'A' },
    { id: 'today', dueDate: '2026-11-06', completed: false, subject: 'A' },
    { id: 'over', dueDate: '2026-11-04', completed: false, subject: 'A' },
    { id: 'later1', dueDate: '2026-11-08', completed: false, subject: 'A' },
  ];
  assert.deepEqual(sortHomework(list, today).map((x) => x.id), ['over', 'today', 'later1', 'later2', 'done']);
  assert.equal(homeworkGroup(list[3], today), 0);
});

test('Tests chronologisch', () => {
  const out = sortTests([{ testDate: '2026-12-01', subject: 'B' }, { testDate: '2026-11-10', subject: 'A' }]);
  assert.equal(out[0].testDate, '2026-11-10');
});

test('Countdown-Texte und Stufen', () => {
  const t = '2026-11-06';
  assert.deepEqual(countdown('2026-11-06', t).label, 'Heute');
  assert.equal(countdown('2026-11-07', t).label, 'Morgen');
  assert.equal(countdown('2026-11-08', t).label, 'In 2 Tagen');
  assert.equal(countdown('2026-11-13', t).label, 'In 7 Tagen');
  assert.equal(countdown('2026-11-20', t).label, 'In 2 Wochen');
  assert.equal(countdown('2026-11-08', t).level, 'urgent');
  assert.equal(countdown('2026-11-13', t).level, 'soon');
});

test('Hausaufgaben-Badges', () => {
  const t = '2026-11-06';
  assert.equal(homeworkBadge({ dueDate: '2026-11-05', completed: false }, t).label, 'Überfällig');
  assert.equal(homeworkBadge({ dueDate: '2026-11-06', completed: false }, t).label, 'Heute fällig');
  assert.equal(homeworkBadge({ dueDate: '2026-11-06', completed: true }, t), null);
});
