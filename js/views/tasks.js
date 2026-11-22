'use strict';
/* ---------- 6.2 TASKS & CHECKLISTS ---------- */
function renderTasks() {
  const tabs = `<div class="inline-flex rounded-xl bg-slate-100 p-1 mb-5">
    ${[['tasks', 'Tasks', 'list-todo'], ['checklists', 'Checklists', 'list-checks']].map(([v, l, i]) => `
      <button type="button" data-action="tasks-tab" data-val="${v}" class="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${ui.tasksTab === v ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}">${icon(i)}${l}</button>`).join('')}
  </div>`;
  return tabs + (ui.tasksTab === 'checklists' ? renderChecklists() : renderTaskList());
}

function renderTaskList() {
  const t = todayStr();
  const T = state.tasks;
  const filters = {
    open: x => !x.done,
    today: x => !x.done && x.due === t,
    overdue: x => !x.done && x.due && x.due < t,
    upcoming: x => !x.done && x.due && x.due > t,
    done: x => x.done,
    all: () => true
  };
  const catOk = x => ui.taskCat === 'all' || x.category === ui.taskCat;
  const list = T.filter(filters[ui.taskFilter] || filters.open).filter(catOk).sort(sortTasks);
  const count = k => T.filter(filters[k]).filter(catOk).length;
  const doneCount = T.filter(x => x.done).length;

  return `
  <form data-form="task-quick" class="${CARD} p-3 md:p-4 mb-5">
    <div class="flex gap-2">
      <input name="title" required placeholder="Add a task… e.g. Book dentist" class="${INPUT} flex-1">
      <button type="submit" class="${BTN_PRIMARY} shrink-0">${icon('plus')}<span class="hidden sm:inline">Add</span></button>
    </div>
    <div class="grid grid-cols-3 gap-2 mt-2">
      <input type="date" name="due" class="${INPUT} !py-2" aria-label="Due date">
      ${sel('priority', Object.entries(PRIORITIES).map(([k, v]) => [k, v.label + ' priority']), 'medium').replace(INPUT, INPUT + ' !py-2')}
      ${sel('category', taskCategories(), 'general').replace(INPUT, INPUT + ' !py-2')}
    </div>
  </form>

  <div class="space-y-2 mb-4">
    ${filterPills([['open', 'Open', count('open')], ['today', 'Today', count('today')], ['overdue', 'Overdue', count('overdue')], ['upcoming', 'Upcoming', count('upcoming')], ['done', 'Completed', count('done')], ['all', 'All', count('all')]], ui.taskFilter, 'task-filter')}
    ${filterPills([['all', 'All categories'], ...taskCategories().map(([id, label]) => [esc(id), esc(label)])], ui.taskCat, 'task-cat')}
    <button type="button" data-action="task-cat-new" class="${BTN_GHOST} !py-1.5 !text-xs">${icon('plus')}Add category</button>
  </div>

  <section class="${CARD} px-4 md:px-5">
    ${list.length ? `<ul class="divide-y divide-slate-100">${list.map(taskRow).join('')}</ul>` : emptyBox('circle-check', 'No tasks here', ui.taskFilter === 'done' ? 'Completed tasks will appear here.' : 'Use the box above to add one.')}
  </section>
  ${doneCount ? `<div class="mt-3 text-right"><button type="button" data-action="tasks-clear-done" class="text-sm text-slate-500 hover:text-rose-600">Clear ${doneCount} completed</button></div>` : ''}`;
}

function renderChecklists() {
  const C = state.checklists;
  return `
  <div class="flex items-center justify-between mb-4">
    <p class="text-sm text-slate-500">Reusable templates can be reset or copied each time you need them.</p>
    <button type="button" data-action="cl-new" class="${BTN_PRIMARY} shrink-0">${icon('plus')}New</button>
  </div>
  ${C.length ? `<div class="grid md:grid-cols-2 gap-4 items-start">${C.map(checklistCard).join('')}</div>`
    : `<div class="${CARD}">${emptyBox('list-checks', 'No checklists yet', 'Create one for packing, food shops, projects…', `<button type="button" data-action="cl-new" class="${BTN_SOFT}">${icon('plus')}Create checklist</button>`)}</div>`}`;
}

function checklistCard(c) {
  const done = c.items.filter(i => i.done).length, total = c.items.length;
  const pct = total ? done / total * 100 : 0;
  const collapsed = !!ui.clCollapsed[c.id];
  return `<section class="${CARD} overflow-hidden">
    <button type="button" data-action="cl-collapse" data-id="${c.id}" class="w-full text-left p-4 md:p-5">
      <div class="flex items-start gap-3">
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap"><h3 class="font-semibold text-slate-900">${esc(c.title)}</h3>
            ${c.reusable ? pill(`${icon('repeat', 'w-3 h-3')} Reusable`, 'bg-sky-50 text-sky-700 ring-sky-200') : ''}
            ${total && done === total ? pill(`${icon('check', 'w-3 h-3')} Complete`, 'bg-emerald-50 text-emerald-700 ring-emerald-200') : ''}</div>
          <p class="text-xs text-slate-500 mt-1">${done} of ${total} done</p>
        </div>
        <span class="text-slate-400 transition ${collapsed ? '' : 'rotate-180'}">${icon('chevron-down', 'w-5 h-5')}</span>
      </div>
      <div class="mt-3">${progress(pct, done === total && total ? 'bg-emerald-500' : 'bg-sky-500')}</div>
    </button>
    ${collapsed ? '' : `
    <div class="px-4 md:px-5 pb-4">
      <ul class="space-y-1">${c.items.map((i, index) => `
        <li class="flex items-center gap-2 group">
          <button type="button" data-action="cl-toggle-item" data-id="${c.id}" data-item="${i.id}" class="flex-1 flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-slate-50 text-left">
            <span class="w-5 h-5 shrink-0 rounded-md border-2 flex items-center justify-center ${i.done ? 'bg-sky-500 border-sky-500 text-white' : 'border-slate-300 text-transparent'}">${icon('check', 'w-3 h-3')}</span>
            <span class="text-sm ${i.done ? 'line-through text-slate-400' : 'text-slate-700'} break-words">${esc(i.text)}</span>
          </button>
          <button type="button" data-action="cl-move-item" data-id="${c.id}" data-item="${i.id}" data-val="-1" class="${ICON_BTN} !w-8 !h-8" aria-label="Move ${esc(i.text)} up" ${index === 0 ? 'disabled' : ''}>${icon('chevron-up', 'w-3.5 h-3.5')}</button>
          <button type="button" data-action="cl-move-item" data-id="${c.id}" data-item="${i.id}" data-val="1" class="${ICON_BTN} !w-8 !h-8" aria-label="Move ${esc(i.text)} down" ${index === c.items.length - 1 ? 'disabled' : ''}>${icon('chevron-down', 'w-3.5 h-3.5')}</button>
          <button type="button" data-action="cl-del-item" data-id="${c.id}" data-item="${i.id}" class="${ICON_BTN} !w-8 !h-8" aria-label="Remove item">${icon('x', 'w-3.5 h-3.5')}</button>
        </li>`).join('')}</ul>
      <form data-form="cl-add-item" data-id="${c.id}" class="flex gap-2 mt-2">
        <input name="text" required placeholder="Add item…" class="${INPUT} !py-2" data-focus-key="cl-${c.id}">
        <button type="submit" class="${BTN_SOFT} shrink-0" aria-label="Add item">${icon('plus')}</button>
      </form>
      <div class="flex flex-wrap gap-2 mt-4 pt-3 border-t border-slate-100">
        ${c.reusable ? `<button type="button" data-action="cl-reset" data-id="${c.id}" class="${BTN_GHOST} !py-1.5 !text-xs">${icon('rotate-ccw', 'w-3.5 h-3.5')}Reset ticks</button>` : ''}
        <button type="button" data-action="cl-dup" data-id="${c.id}" class="${BTN_GHOST} !py-1.5 !text-xs">${icon('copy-plus', 'w-3.5 h-3.5')}${c.reusable ? 'Use as new list' : 'Duplicate'}</button>
        <button type="button" data-action="cl-edit" data-id="${c.id}" class="${BTN_GHOST} !py-1.5 !text-xs">${icon('pencil', 'w-3.5 h-3.5')}Edit</button>
        <button type="button" data-action="cl-delete" data-id="${c.id}" class="${BTN_DANGER} !py-1.5 !text-xs ml-auto">${icon('trash-2', 'w-3.5 h-3.5')}Delete</button>
      </div>
    </div>`}
  </section>`;
}
