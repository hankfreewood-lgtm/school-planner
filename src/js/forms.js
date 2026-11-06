import { SUBJECTS } from './subjects.js';
import { addDaysISO, isValidISO } from './dates.js';
import { icon } from './icons.js';
import { esc, openSheet, closeSheet, confirmDialog } from './ui.js';

const CONFIG = {
  homework: {
    titleNew: 'Neue Hausaufgabe', titleEdit: 'Hausaufgabe bearbeiten',
    dateLabel: 'Fällig am', textLabel: 'Inhalt', textField: 'content', dateField: 'dueDate',
    placeholder: 'z. B. Buch S. 45, Aufgaben 2–5', deleteTitle: 'Hausaufgabe löschen?',
    deleteText: 'Diese Hausaufgabe wird endgültig gelöscht.',
  },
  test: {
    titleNew: 'Neuer Test', titleEdit: 'Test bearbeiten',
    dateLabel: 'Testdatum', textLabel: 'Thema', textField: 'topic', dateField: 'testDate',
    placeholder: 'z. B. Quadratische Funktionen und Parabeln', deleteTitle: 'Test löschen?',
    deleteText: 'Dieser Test wird endgültig gelöscht.',
  },
};

/**
 * Öffnet das Bottom Sheet zum Anlegen/Bearbeiten.
 * onSave(data) und onDelete() liefern Promises; bei Fehler bleibt das Sheet offen.
 */
export function openEntryForm({ kind, entry = null, today, onSave, onDelete, userSubjects = [] }) {
  const c = CONFIG[kind];
  const isEdit = !!entry;
  const val = entry || {};

  // Subject-Dropdown: built-in + user subjects
  const builtInOptions = SUBJECTS.map((s) => `<option value="${esc(s)}" ${val.subject === s ? 'selected' : ''}>${esc(s)}</option>`).join('');
  const userOptions = userSubjects.map((s) => `<option value="${esc(s.name)}" ${val.subject === s.name ? 'selected' : ''}>${esc(s.name)}</option>`).join('');
  const subjectOptions = builtInOptions + userOptions;

  // Neue Einträge in der Vergangenheit wären sofort ausgeblendet → Mindestdatum.
  const minDate = kind === 'test' ? addDaysISO(today, 1) : today;
  const chips = kind === 'test'
    ? [['Morgen', 1], ['In 1 Woche', 7], ['In 2 Wochen', 14]]
    : [['Heute', 0], ['Morgen', 1], ['In 1 Woche', 7]];

  const dlg = openSheet(`
    <form class="sheet-form" novalidate>
      <div class="sheet-head">
        <h2>${isEdit ? c.titleEdit : c.titleNew}</h2>
        <button type="button" class="icon-btn" data-close aria-label="Schließen">${icon('close')}</button>
      </div>

      <!-- Feld 1: Thema/Inhalt -->
      <div class="field">
        <label for="f-text">${c_labels[kind].textLabel}</label>
        <textarea id="f-text" name="text" rows="3" maxlength="1000" placeholder="${esc(c.placeholder)}" required>${esc(val[c.textField] || '')}</textarea>
        <p class="field-error" data-err="text" hidden></p>
      </div>

      <!-- Feld 2: Fach -->
      <div class="field">
        <label for="f-subject">Fach</label>
        <div class="select-wrap">
          <select id="f-subject" name="subject" required>
            <option value="" disabled ${val.subject ? '' : 'selected'}>Fach wählen …</option>${subjectOptions}
          </select>
        </div>
        <p class="field-error" data-err="subject" hidden></p>
      </div>

      <!-- Feld 3: Datum -->
      <div class="field">
        <label for="f-date">${c.dateLabel}</label>
        <input id="f-date" name="date" type="date" required ${isEdit ? '' : `min="${minDate}"`} value="${esc(val[c.dateField] || '')}">
        <div class="chips" role="group" aria-label="Schnellauswahl Datum">
          ${chips.map(([l, n]) => `<button type="button" class="chip-btn" data-days="${n}">${l}</button>`).join('')}
        </div>
        <p class="field-error" data-err="date" hidden></p>
      </div>

      <div class="sheet-actions">
        ${isEdit ? `<button type="button" class="btn danger-text" data-delete>${icon('delete', 20)}Löschen</button>` : '<span></span>'}
        <button type="submit" class="btn filled" data-save><span class="spinner" hidden></span><span class="lbl">Speichern</span></button>
      </div>
    </form>`);

  const form = dlg.querySelector('form');
  const dateInput = form.elements.date;
  const setBusy = (b) => {
    form.querySelector('[data-save]').disabled = b;
    form.querySelector('.spinner').hidden = !b;
    form.querySelectorAll('input,select,textarea,button').forEach((el) => { if (!el.matches('[data-save]')) el.disabled = b; });
  };
  const showErr = (k, msg) => {
    const p = form.querySelector(`[data-err="${k}"]`);
    p.textContent = msg || '';
    p.hidden = !msg;
  };

  dlg.querySelector('[data-close]').addEventListener('click', closeSheet);
  form.addEventListener('click', (e) => {
    const chip = e.target.closest('[data-days]');
    if (chip) { dateInput.value = addDaysISO(today, Number(chip.dataset.days)); showErr('date'); }
  });
  form.addEventListener('input', () => ['subject', 'date', 'text'].forEach((k) => showErr(k)));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const subject = form.elements.subject.value;
    const date = dateInput.value;
    const text = form.elements.text.value.trim();
    let ok = true;
    if (!SUBJECTS.includes(subject) && !userSubjects.some((s) => s.name === subject)) { showErr('subject', 'Bitte ein Fach auswählen.'); ok = false; }
    if (!isValidISO(date)) { showErr('date', 'Bitte ein Datum auswählen.'); ok = false; }
    if (!text) { showErr('text', kind === 'test' ? 'Bitte ein Thema eintragen.' : 'Bitte beschreibe die Aufgabe.'); ok = false; }
    if (!ok) { form.querySelector('.field-error:not([hidden])')?.closest('.field').querySelector('select,input,textarea').focus(); return; }

    setBusy(true);
    try {
      await onSave({ subject, [c.dateField]: date, [c.textField]: text });
      closeSheet();
    } catch (err) {
      setBusy(false);
      showErr('text', err.userMessage || 'Speichern fehlgeschlagen. Bitte erneut versuchen.');
    }
  });

  form.querySelector('[data-delete]')?.addEventListener('click', async () => {
    const yes = await confirmDialog({ title: c.deleteTitle, message: c.deleteText });
    if (!yes) return;
    setBusy(true);
    try { await onDelete(); closeSheet(); } catch (err) { setBusy(false); showErr('text', err.userMessage || 'Löschen fehlgeschlagen.'); }
  });

  if (!isEdit) setTimeout(() => form.elements.text.focus(), 120);
}

// Feld-Labels per Kind (für Reihenfolge: Thema → Fach → Datum)
const c_labels = {
  homework: { textLabel: 'Inhalt' },
  test: { textLabel: 'Thema' },
};