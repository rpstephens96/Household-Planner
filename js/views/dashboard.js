'use strict';
/* ============================== 6. VIEWS ============================== */

/* ---------- 6.1 DASHBOARD ---------- */
function taskRow(t) {
  let due = '';
  if (t.due) {
    const d = daysUntil(t.due);
    const cls = t.done ? 'text-slate-400' : d < 0 ? 'text-rose-600 font-medium' : d === 0 ? 'text-teal-700 font-medium' : 'text-slate-500';
    const lbl = d < 0 ? `Overdue · ${fmtDate(t.due, { day: 'numeric', month: 'short' })}` : d === 0 ? 'Today' : d === 1 ? 'Tomorrow' : fmtDate(t.due, { weekday: 'short', day: 'numeric', month: 'short' });
    due = `<span class="inline-flex items-center gap-1 text-xs ${cls}">${icon('calendar', 'w-3.5 h-3.5')}${lbl}</span>`;
  }
  const p = PRIORITIES[t.priority] || PRIORITIES.medium;
  return `<li class="flex items-start gap-3 py-3">
    <button type="button" data-action="task-toggle" data-id="${t.id}" aria-label="${t.done ? 'Mark as not done' : 'Mark as done'}"
      class="mt-0.5 shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition ${t.done ? 'bg-teal-500 border-teal-500 text-white' : 'border-slate-300 hover:border-teal-500 text-transparent hover:text-teal-400'}">${icon('check', 'w-3.5 h-3.5')}</button>
    <div class="flex-1 min-w-0">
      <p class="text-sm ${t.done ? 'line-through text-slate-400' : 'text-slate-800 font-medium'} break-words">${esc(t.title)}</p>
      <div class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">${pill(p.label, p.cls)}<span class="text-xs text-slate-500">${TASK_CATS[t.category] || 'General'}</span>${due}</div>
      ${t.notes ? `<p class="text-xs text-slate-500 mt-1 break-words">${esc(t.notes)}</p>` : ''}
    </div>
    <div class="flex shrink-0 -mr-2">
      <button type="button" data-action="task-edit" data-id="${t.id}" class="${ICON_BTN}" aria-label="Edit">${icon('pencil')}</button>
      <button type="button" data-action="task-delete" data-id="${t.id}" class="${ICON_BTN} hover:!text-rose-600" aria-label="Delete">${icon('trash-2')}</button>
    </div>
  </li>`;
}

function giftStatusPill(p) {
  if (!p.finalGift) return pill(`${icon('gift', 'w-3 h-3')} No gift yet`, 'bg-rose-50 text-rose-700 ring-rose-200');
  if (p.finalGift.status === 'ready') return pill(`${icon('gift', 'w-3 h-3')} Gift ready`, 'bg-emerald-50 text-emerald-700 ring-emerald-200');
  if (p.finalGift.status === 'ordered') return pill(`${icon('package', 'w-3 h-3')} Gift ordered`, 'bg-sky-50 text-sky-700 ring-sky-200');
  return pill(`${icon('lightbulb', 'w-3 h-3')} Gift: idea only`, 'bg-amber-50 text-amber-700 ring-amber-200');
}
function cardStatusPill(p) {
  if (!p.cardBought) return pill(`${icon('mail', 'w-3 h-3')} Card needed`, 'bg-rose-50 text-rose-700 ring-rose-200');
  if (!p.cardSent) return pill(`${icon('mail', 'w-3 h-3')} Card to write/send`, 'bg-amber-50 text-amber-700 ring-amber-200');
  return pill(`${icon('mail', 'w-3 h-3')} Card sent`, 'bg-emerald-50 text-emerald-700 ring-emerald-200');
}
function daysPill(d) {
  if (d === 0) return pill('🎉 Today', 'bg-teal-600 text-white ring-teal-600');
  if (d <= 7) return pill(relDays(d), 'bg-rose-50 text-rose-700 ring-rose-200');
  if (d <= 30) return pill(relDays(d), 'bg-amber-50 text-amber-700 ring-amber-200');
  return pill(relDays(d), 'bg-slate-50 text-slate-600 ring-slate-200');
}

function statTile(route, iconName, value, label, tone) {
  return `<a href="#/${route}" class="${CARD} p-4 flex items-center gap-3 hover:border-teal-300 transition">
    <div class="w-10 h-10 rounded-xl ${tone} flex items-center justify-center shrink-0">${icon(iconName, 'w-5 h-5')}</div>
    <div class="min-w-0"><p class="text-2xl font-bold text-slate-900 leading-none">${value}</p><p class="text-xs text-slate-500 mt-1 truncate">${label}</p></div>
  </a>`;
}

function renderDashboard() {
  const t = todayStr();
  const open = state.tasks.filter(x => !x.done);
  const overdue = open.filter(x => x.due && x.due < t);
  const dueToday = open.filter(x => x.due === t);
  const focus = [...overdue, ...dueToday].sort(sortTasks);

  const bdays = state.people.filter(p => p.dob).map(p => ({ p, nb: nextBirthday(p) })).filter(o => o.nb.days <= 30).sort((a, b) => a.nb.days - b.nb.days);
  const bdayMissing = bdays.filter(o => !o.p.finalGift || o.p.finalGift.status === 'idea' || !o.p.cardBought || !o.p.cardSent).length;
  const renewals = state.vault.filter(v => v.renewalDate).map(v => ({ v, d: daysUntil(v.renewalDate) })).filter(o => o.d <= 60 && o.d >= -30).sort((a, b) => a.d - b.d);
  const xs = xmasStats();
  const h = new Date().getHours();
  const greet = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  const activeLists = state.checklists.filter(c => c.items.length && c.items.some(i => i.done) && c.items.some(i => !i.done));

  const quick = [['quick-task', 'list-todo', 'Task'], ['person-new', 'cake', 'Birthday'], ['xmas-gift-new', 'gift', 'Christmas gift'], ['vault-new', 'shield-check', 'Policy / account'], ['cl-new', 'list-checks', 'Checklist']];

  return `
  <div class="mb-6">
    <p class="text-sm text-slate-500">${new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
    <h2 class="text-2xl md:text-3xl font-bold text-slate-900 mt-1">${greet} 👋</h2>
  </div>

  <div class="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 md:mx-0 md:px-0 mb-6">
    ${quick.map(([a, i, l]) => `<button type="button" data-action="${a}" class="shrink-0 ${BTN_GHOST} !rounded-full">${icon('plus', 'w-3.5 h-3.5 text-teal-600')}${icon(i, 'w-4 h-4 text-slate-500')}${l}</button>`).join('')}
  </div>

  <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
    ${statTile('tasks', 'calendar-check', dueToday.length, 'Tasks due today', 'bg-teal-50 text-teal-600')}
    ${statTile('tasks', 'triangle-alert', overdue.length, 'Overdue tasks', overdue.length ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-500')}
    ${statTile('birthdays', 'cake', bdays.length, 'Birthdays · next 30 days', 'bg-violet-50 text-violet-600')}
    ${statTile('vault', 'shield-check', renewals.length, 'Renewals · next 60 days', renewals.some(r => r.d < 14) ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600')}
  </div>

  <div class="grid lg:grid-cols-2 gap-4">
    <!-- Tasks -->
    <section class="${CARD} p-5">
      <div class="flex items-center justify-between mb-1">
        <h3 class="font-semibold text-slate-900 flex items-center gap-2">${icon('list-todo', 'w-5 h-5 text-teal-600')} Today &amp; overdue</h3>
        <a href="#/tasks" class="text-sm text-teal-700 hover:underline">All tasks</a>
      </div>
      ${focus.length ? `<ul class="divide-y divide-slate-100">${focus.slice(0, 6).map(taskRow).join('')}</ul>${focus.length > 6 ? `<p class="text-xs text-slate-500 mt-2">+ ${focus.length - 6} more</p>` : ''}`
        : emptyBox('circle-check', 'All clear!', 'Nothing due today or overdue.')}
    </section>

    <!-- Birthdays -->
    <section class="${CARD} p-5">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-semibold text-slate-900 flex items-center gap-2">${icon('cake', 'w-5 h-5 text-violet-600')} Upcoming birthdays</h3>
        <a href="#/birthdays" class="text-sm text-teal-700 hover:underline">View all</a>
      </div>
      ${bdayMissing ? `<div class="mb-3 rounded-xl bg-amber-50 text-amber-800 text-sm px-3 py-2 flex gap-2 items-center">${icon('triangle-alert', 'w-4 h-4 shrink-0')} ${bdayMissing} upcoming birthday${bdayMissing > 1 ? 's' : ''} still need a card or gift sorting</div>` : ''}
      ${bdays.length ? `<ul class="space-y-3">${bdays.map(({ p, nb }) => `
        <li><a href="#/birthdays" data-action="person-open" data-id="${p.id}" class="flex items-start gap-3 rounded-xl hover:bg-slate-50 -mx-2 px-2 py-1.5">
          <div class="w-10 h-10 rounded-full ${avatarCls(p.name)} flex items-center justify-center text-sm font-semibold shrink-0">${initials(p.name)}</div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between gap-2"><p class="font-medium text-slate-800 truncate">${esc(p.name)}</p>${daysPill(nb.days)}</div>
            <p class="text-xs text-slate-500">${fmtDate(nb.date, { weekday: 'short', day: 'numeric', month: 'short' })}${nb.turning !== null ? ` · turning ${nb.turning}` : ''}</p>
            <div class="flex flex-wrap gap-1.5 mt-1.5">${giftStatusPill(p)}${cardStatusPill(p)}</div>
          </div></a></li>`).join('')}</ul>`
        : emptyBox('cake', 'No birthdays in the next 30 days', '')}
    </section>

    <!-- Renewals -->
    <section class="${CARD} p-5">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-semibold text-slate-900 flex items-center gap-2">${icon('shield-check', 'w-5 h-5 text-amber-600')} Renewals due (60 days)</h3>
        <a href="#/vault" class="text-sm text-teal-700 hover:underline">Open vault</a>
      </div>
      ${renewals.length ? `<ul class="space-y-2">${renewals.map(({ v }) => { const c = vcat(v.category); return `
        <li class="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
          <div class="w-9 h-9 rounded-lg ${c.bg} ${c.fg} flex items-center justify-center shrink-0">${icon(c.icon)}</div>
          <div class="flex-1 min-w-0"><p class="text-sm font-medium text-slate-800 truncate">${esc(v.provider)} <span class="font-normal text-slate-500">· ${esc(v.name || c.label)}</span></p>
          <p class="text-xs text-slate-500">${fmtDate(v.renewalDate)} · ${v.autoRenew ? 'Auto-renews' : '<span class="text-rose-600 font-medium">Does NOT auto-renew</span>'}</p></div>
          ${renewalBadge(v.renewalDate)}
        </li>`; }).join('')}</ul>`
        : emptyBox('shield-check', 'No renewals in the next 60 days', '')}
    </section>

    <!-- Christmas -->
    <section class="${CARD} p-5 relative overflow-hidden">
      <div class="absolute -right-6 -top-6 w-28 h-28 rounded-full bg-emerald-50"></div>
      <div class="relative">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-semibold text-slate-900 flex items-center gap-2">${icon('tree-pine', 'w-5 h-5 text-emerald-600')} Christmas ${state.christmas.year}</h3>
          <a href="#/christmas" class="text-sm text-teal-700 hover:underline">Planner</a>
        </div>
        <p class="text-sm text-slate-500 mb-4">${xs.days > 0 ? `<span class="font-semibold text-slate-800">${xs.days}</span> days to go` : xs.days === 0 ? '🎄 Merry Christmas!' : 'Christmas has passed – start next year in the planner'}</p>
        <div class="space-y-4">
          <div>
            <div class="flex justify-between text-sm mb-1.5"><span class="text-slate-600">Spent vs budget</span><span class="font-medium ${xs.spent > xs.budget && xs.budget ? 'text-rose-600' : 'text-slate-800'}">${money(xs.spent)} / ${money(xs.budget)}</span></div>
            ${progress(xs.budget ? xs.spent / xs.budget * 100 : 0, xs.spent > xs.budget && xs.budget ? 'bg-rose-500' : 'bg-emerald-500', 'h-2.5')}
          </div>
          <div>
            <div class="flex justify-between text-sm mb-1.5"><span class="text-slate-600">People sorted</span><span class="font-medium text-slate-800">${xs.done} / ${xs.total}</span></div>
            ${progress(xs.total ? xs.done / xs.total * 100 : 0, 'bg-teal-500', 'h-2.5')}
          </div>
          <p class="text-xs text-slate-500">${xs.giftsBought} of ${xs.giftsTotal} gifts bought · ${money(xs.remaining)} remaining</p>
        </div>
      </div>
    </section>

    ${activeLists.length ? `<section class="${CARD} p-5 lg:col-span-2">
      <h3 class="font-semibold text-slate-900 flex items-center gap-2 mb-3">${icon('list-checks', 'w-5 h-5 text-sky-600')} Checklists in progress</h3>
      <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">${activeLists.map(c => { const d = c.items.filter(i => i.done).length; return `
        <a href="#/tasks" data-action="tasks-tab" data-val="checklists" class="rounded-xl bg-slate-50 hover:bg-slate-100 p-3 block">
          <div class="flex justify-between text-sm mb-2"><span class="font-medium text-slate-800 truncate">${esc(c.title)}</span><span class="text-slate-500">${d}/${c.items.length}</span></div>
          ${progress(d / c.items.length * 100, 'bg-sky-500')}</a>`; }).join('')}</div>
    </section>` : ''}
  </div>`;
}

