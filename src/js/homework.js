import { esc, emptyState, reconcile, skeleton, toast, wrap } from './ui.js';
import { icon } from './icons.js';
import { subjectKey } from './subjects.js';
import { formatDE, weekdayShort, isHomeworkVisible, sortHomework, homeworkGroup, homeworkBadge, HOMEWORK_GRACE_DAYS } from './dates.js';
import { openEntryForm } from './forms.js';
import * as store from './store.js';

const GROUP_TITLES = ['Überfällig', 'Heute fällig', 'Demnächst', 'Erledigt'];

function card(hw, today) {
  const badge = homeworkBadge(hw, today);
  const done = hw.completed;
  return `<article class="card subj-${subjectKey(hw.subject)} ${done ? 'done' : ''}" data-id="${esc(hw.id)}">
    <span class="accent" aria-hidden="true"></span>
    <button type="button" class="check ${done ? 'checked' : ''}" data-act="toggle" role="checkbox" aria-checked="${done}"
      aria-label="${esc(hw.subject)}: als ${done ? 'offen' : 'erledigt'} markieren">${icon('check', 20)}</button>
    <div class="card-body" data-act="edit" role="button" tabindex="0" aria-label="Bearbeiten: ${esc(hw.subject)}">
      <div class="meta">
        <span class="badge">${esc(hw.subject)}</span>
        ${badge ? `<span class="pill ${badge.level}">${badge.label}</span>` : ''}
        ${done ? `<span class="pill done">Erledigt</span>` : ''}
      </div>
      <p class="text">${esc(hw.content)}</p>
      <p class="date">${icon('event', 16)}<span>${weekdayShort(hw.dueDate)}, ${formatDE(hw.dueDate)}</span></p>
    </div>
  </article>`;
}

export function createHomeworkView(root, ctx) {
  const list = root.querySelector('.list');
  const empty = root.querySelector('.empty-host');
  const banner = root.querySelector('.banner-host');

  function render() {
    const { state } = ctx;
    if (!state.user) { list.innerHTML = ''; banner.innerHTML = ''; empty.innerHTML = ctx.signedOutState(); return; }
    if (!state.hwLoaded) { empty.innerHTML = ''; banner.innerHTML = ''; list.innerHTML = skeleton(3); return; }
    if (list.querySelector('.skeleton')) list.innerHTML = '';

    const visible = state.homework.filter((h) => isHomeworkVisible(h.dueDate, state.today, HOMEWORK_GRACE_DAYS));
    const sorted = sortHomework(visible, state.today);

    const items = [];
    let lastGroup = -1;
    for (const hw of sorted) {
      const g = homeworkGroup(hw, state.today);
      if (g !== lastGroup) {
        const n = sorted.filter((x) => homeworkGroup(x, state.today) === g).length;
        items.push({ key: `h${g}`, html: `<h2 class="group-title">${GROUP_TITLES[g]}<span>${n}</span></h2>` });
        lastGroup = g;
      }
      items.push({ key: hw.id, html: card(hw, state.today) });
    }
    reconcile(list, items);

    const allDone = sorted.length > 0 && sorted.every((h) => h.completed);
    banner.innerHTML = allDone
      ? `<div class="banner success">${icon('checkCircle', 22)}<div><strong>Alles erledigt!</strong><span>Alle Hausaufgaben sind abgehakt.</span></div></div>`
      : '';
    empty.innerHTML = sorted.length === 0
      ? emptyState('homework', 'Keine Hausaufgaben offen.', 'Genieße die freie Zeit – oder trage die nächste Aufgabe ein.',
        `<button class="btn tonal" data-act="add">${icon('add', 20)}Hausaufgabe hinzufügen</button>`)
      : '';
  }

  const find = (id) => ctx.state.homework.find((h) => h.id === id);
  const uid = () => ctx.state.user?.uid;

  function openForm(entry = null) {
    if (!uid()) return;
    const u = uid();
    const id = entry?.id || store.newId(u, 'homework');
    openEntryForm({
      kind: 'homework', entry, today: ctx.state.today,
      onSave: async (data) => {
        const res = await wrap(store.settle(store.saveHomework(u, id, { ...data, completed: entry?.completed || false }, !entry), ctx.lateError));
        toast(res === 'saved' ? (entry ? 'Änderungen gespeichert' : 'Hausaufgabe gespeichert') : 'Offline gespeichert – wird synchronisiert', { type: 'success' });
      },
      onDelete: async () => {
        await wrap(store.settle(store.deleteHomework(u, id), ctx.lateError));
        toast('Hausaufgabe gelöscht');
      },
    });
  }

  root.addEventListener('click', async (e) => {
    const target = e.target.closest('[data-act]');
    if (!target) return;
    const act = target.dataset.act;
    if (act === 'add') return openForm();
    const id = target.closest('[data-id]')?.dataset.id;
    const hw = id && find(id);
    if (!hw) return;
    if (act === 'edit') return openForm(hw);
    if (act === 'toggle') {
      const next = !hw.completed;
      try {
        const p = store.setHomeworkCompleted(uid(), id, next);
        p.catch(ctx.lateError);
        toast(next ? 'Als erledigt markiert' : 'Wieder als offen markiert', { type: 'success', duration: 1800 });
      } catch (err) { ctx.lateError(err); }
    }
  });
  root.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.card-body')) { e.preventDefault(); e.target.click(); }
  });

  return { render, add: () => openForm() };
}
