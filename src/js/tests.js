import { esc, emptyState, reconcile, skeleton, toast, wrap } from './ui.js';
import { icon } from './icons.js';
import { subjectKey } from './subjects.js';
import { formatDE, weekdayLong, isTestVisible, sortTests, countdown } from './dates.js';
import { openEntryForm } from './forms.js';
import * as store from './store.js';
import { getSubjectVars } from './subjects.js';

function card(t, today, userSubjects) {
  const cd = countdown(t.testDate, today);
  const subj = getSubjectVars(t.subject, userSubjects);
  const style = subj.color ? `style="--s: ${subj.color}"` : '';
  return `<article class="card test ${subj.class}" data-id="${esc(t.id)}" ${style}>
    <div class="card-body" data-act="edit" role="button" tabindex="0" aria-label="Bearbeiten: ${esc(t.subject)}-Test">
      <div class="card-main">
        <div class="meta">
          <span class="badge subj-${subjectKey(t.subject)}">${esc(t.subject)}</span>
        </div>
        <p class="text">${esc(t.topic)}</p>
        <p class="date">${icon('event', 16)}<span>${weekdayLong(t.testDate)}, ${formatDE(t.testDate)}</span></p>
      </div>
      <span class="countdown ${cd.level}" aria-label="${esc(cd.label)}">${esc(cd.label)}</span>
      <span class="chev" aria-hidden="true">${icon('chevronRight', 22)}</span>
    </div>
  </article>`;
}

export function createTestsView(root, ctx) {
  const list = root.querySelector('.list');
  const empty = root.querySelector('.empty-host');

  function render() {
    const { state } = ctx;
    if (!state.user) { list.innerHTML = ''; empty.innerHTML = ctx.signedOutState(); return; }
    if (!state.testsLoaded) { empty.innerHTML = ''; list.innerHTML = skeleton(3); return; }
    if (list.querySelector('.skeleton')) list.innerHTML = '';

    const sorted = sortTests(state.tests.filter((t) => isTestVisible(t.testDate, state.today)));
    reconcile(list, sorted.map((t) => ({ key: t.id, html: card(t, state.today, state.subjects) })));
    empty.innerHTML = sorted.length === 0
      ? emptyState('tests', 'Keine anstehenden Tests.', 'Sobald eine Klassenarbeit angekündigt wird, trage sie hier ein.',
        `<button class="btn tonal" data-act="add">${icon('add', 20)}Test hinzufügen</button>`)
      : '';
  }

  const uid = () => ctx.state.user?.uid;

  function openForm(entry = null) {
    const u = uid();
    if (!u) return;
    const id = entry?.id || store.newId(u, 'tests');
    openEntryForm({
      kind: 'test', entry, today: ctx.state.today, userSubjects: ctx.state.subjects,
      onSave: async (data) => {
        const res = await wrap(store.settle(store.saveTest(u, id, data, !entry), ctx.lateError));
        toast(res === 'saved' ? (entry ? 'Änderungen gespeichert' : 'Test gespeichert') : 'Offline gespeichert – wird synchronisiert', { type: 'success' });
      },
      onDelete: async () => {
        await wrap(store.settle(store.deleteTest(u, id), ctx.lateError));
        toast('Test gelöscht');
      },
    });
  }

  root.addEventListener('click', (e) => {
    const target = e.target.closest('[data-act]');
    if (!target) return;
    if (target.dataset.act === 'add') return openForm();
    if (target.dataset.act === 'edit') {
      const t = ctx.state.tests.find((x) => x.id === target.closest('[data-id]')?.dataset.id);
      if (t) openForm(t);
    }
  });
  root.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.card-body')) { e.preventDefault(); e.target.click(); }
  });

  return { render, add: () => openForm() };
}
