'use strict';
/* ---------- 6.4 CHRISTMAS ---------- */
function renderChristmas() {
  const c = state.christmas, xs = xmasStats();
  const R = c.recipients;
  const filtered = R.filter(r => ui.xmasFilter === 'all' ? true : ui.xmasFilter === 'done' ? recipientDone(r) : !recipientDone(r))
    .sort((a, b) => (recipientDone(a) - recipientDone(b)) || a.name.localeCompare(b.name));
  const over = xs.budget && xs.spent > xs.budget;

  const tile = (label, val, sub = '', cls = 'text-slate-900') => `<div class="${CARD} p-4"><p class="text-xs text-slate-500">${label}</p><p class="text-xl md:text-2xl font-bold ${cls} mt-1">${val}</p>${sub ? `<p class="text-xs text-slate-500 mt-0.5">${sub}</p>` : ''}</div>`;

  return `
  <div class="rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-5 md:p-6 mb-4 shadow-sm relative overflow-hidden">
    <div class="absolute right-4 top-4 opacity-20">${icon('snowflake', 'w-20 h-20')}</div>
    <div class="relative flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="text-emerald-100 text-sm">Christmas ${c.year}</p>
        <p class="text-3xl font-bold mt-1">${xs.days > 0 ? `${xs.days} days to go` : xs.days === 0 ? 'Merry Christmas! 🎄' : 'All done for this year'}</p>
        <p class="text-emerald-100 text-sm mt-1">${xs.done} of ${xs.total} people sorted · ${xs.giftsBought} of ${xs.giftsTotal} gifts bought</p>
      </div>
      <button type="button" data-action="xmas-budget" class="${BTN} bg-white/15 hover:bg-white/25 text-white ring-1 ring-white/30">${icon('wallet')}Overall budget: ${money(xs.budget)}</button>
    </div>
    <div class="relative mt-4 space-y-2">
      <div class="flex justify-between text-xs text-emerald-50"><span>Spent ${money(xs.spent)}</span><span>${over ? 'Over budget!' : money(xs.remaining) + ' left'}</span></div>
      <div class="h-2.5 rounded-full bg-white/20 overflow-hidden"><div class="h-full rounded-full ${over ? 'bg-rose-300' : 'bg-white'}" style="width:${Math.min(100, xs.budget ? xs.spent / xs.budget * 100 : 0)}%"></div></div>
    </div>
  </div>

  <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
    ${tile('Overall budget', money(xs.budget))}
    ${tile('Total budgeted (per person)', money(xs.budgeted), xs.budget && xs.budgeted > xs.budget ? '<span class="text-rose-600">Exceeds overall budget</span>' : `${money(xs.budget - xs.budgeted)} unallocated`)}
    ${tile('Total spent', money(xs.spent), `${money(xs.planned)} incl. ideas`)}
    ${tile('Remaining budget', money(xs.remaining), '', xs.remaining < 0 ? 'text-rose-600' : 'text-emerald-700')}
  </div>

  <div class="flex flex-wrap items-center gap-2 mb-4">
    <button type="button" data-action="xmas-recipient-new" class="${BTN_PRIMARY}">${icon('user-plus')}Add recipient</button>
    <button type="button" data-action="xmas-import" class="${BTN_GHOST}">${icon('users')}Import from birthdays</button>
    <button type="button" data-action="xmas-new-year" class="${BTN_GHOST} sm:ml-auto">${icon('archive')}Start ${c.year + 1}</button>
  </div>
  <p class="mb-3 text-xs text-slate-500">${icon('users', 'w-3.5 h-3.5 inline')} Gifts are shared with household members.</p>
  <div class="mb-4">${filterPills([['all', 'Everyone', R.length], ['todo', 'In progress', R.filter(r => !recipientDone(r)).length], ['done', 'Completed', xs.done]], ui.xmasFilter, 'xmas-filter')}</div>

  ${filtered.length ? `<div class="grid md:grid-cols-2 gap-4 items-start">${filtered.map(recipientCard).join('')}</div>`
    : `<div class="${CARD}">${emptyBox('gift', R.length ? 'Nobody in this view' : 'No recipients yet', R.length ? '' : 'Import people from your birthday list or add Christmas-only recipients.')}</div>`}`;
}

function recipientCard(r) {
  const spent = recipientSpent(r), budget = num(r.budget), planned = sum(r.gifts, g => num(g.price));
  const done = recipientDone(r);
  const person = r.personId ? byId(state.people, r.personId) : null;
  const past = person ? [...person.history].sort((a, b) => b.year - a.year).slice(0, 3) : [];
  return `<article class="${CARD} p-4 md:p-5">
    <div class="flex items-start gap-3">
      <div class="w-10 h-10 rounded-full ${avatarCls(r.name)} flex items-center justify-center text-sm font-semibold shrink-0">${initials(r.name)}</div>
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 flex-wrap"><h3 class="font-semibold text-slate-900 break-words">${esc(r.name)}</h3>
          ${person ? `<span title="Linked to birthday list" class="text-violet-500">${icon('link', 'w-3.5 h-3.5')}</span>` : ''}
          ${done ? pill(`${icon('check', 'w-3 h-3')} Done`, 'bg-emerald-50 text-emerald-700 ring-emerald-200') : ''}</div>
        <p class="text-xs text-slate-500">${money(spent)} spent of ${money(budget)} target${planned > spent ? ` · ${money(planned)} planned` : ''}</p>
      </div>
      <button type="button" data-action="xmas-recipient-edit" data-id="${r.id}" class="${ICON_BTN}" aria-label="Edit recipient">${icon('pencil')}</button>
      <button type="button" data-action="xmas-recipient-delete" data-id="${r.id}" class="${ICON_BTN} -mr-2" aria-label="Remove recipient">${icon('trash-2')}</button>
    </div>
    <div class="mt-3">${progress(budget ? spent / budget * 100 : 0, budget && spent > budget ? 'bg-rose-500' : 'bg-emerald-500')}</div>
    ${budget && spent > budget ? `<p class="text-xs text-rose-600 mt-1">${money(spent - budget)} over target</p>` : ''}
    ${r.notes ? `<p class="text-xs text-slate-500 mt-2">${esc(r.notes)}</p>` : ''}
    <div class="mt-3 flex flex-wrap gap-2">
      <button type="button" data-action="xmas-toggle" data-id="${r.id}" aria-expanded="${!!ui.xmasOpen[r.id]}" class="${BTN_GHOST} !py-1.5 !text-xs">${icon(ui.xmasOpen[r.id] ? 'chevron-up' : 'chevron-down')} ${ui.xmasOpen[r.id] ? 'Hide' : 'Show'} gifts (${r.gifts.length})</button>
      <button type="button" data-action="xmas-complete" data-id="${r.id}" class="${BTN_GHOST} !py-1.5 !text-xs">${icon(done ? 'rotate-ccw' : 'check')} ${done ? 'Mark incomplete' : 'Mark complete'}</button>
    </div>
    ${ui.xmasOpen[r.id] ? `
    <ul class="mt-3 space-y-2">${r.gifts.map(g => { const url = safeUrl(g.link); return `
      <li class="rounded-xl bg-slate-50 p-2.5 flex flex-wrap items-center gap-2">
        <div class="flex-1 min-w-[8rem]">
          <p class="text-sm font-medium text-slate-800 break-words">${esc(g.title)}</p>
          <p class="text-xs text-slate-500">${g.price ? money(g.price) : 'No price'}${url ? ` · <a href="${esc(url)}" target="_blank" rel="noopener noreferrer" class="text-teal-700 hover:underline">link</a>` : ''}</p>
        </div>
        <select data-change="xmas-gift-status" data-id="${r.id}" data-item="${g.id}" aria-label="Gift status"
          class="rounded-lg border-0 ring-1 ring-inset text-xs font-medium py-1.5 pl-2 pr-7 ${(XMAS_STATUS[XMAS_IDX[g.status]] || XMAS_STATUS[0]).cls}">
          ${XMAS_STATUS.map(s => `<option value="${s.id}" ${s.id === g.status ? 'selected' : ''}>${s.label}</option>`).join('')}
        </select>
        <button type="button" data-action="xmas-gift-edit" data-id="${r.id}" data-item="${g.id}" class="${ICON_BTN} !w-8 !h-8" aria-label="Edit gift">${icon('pencil', 'w-3.5 h-3.5')}</button>
        <button type="button" data-action="xmas-gift-delete" data-id="${r.id}" data-item="${g.id}" class="${ICON_BTN} !w-8 !h-8" aria-label="Delete gift">${icon('x', 'w-3.5 h-3.5')}</button>
      </li>`; }).join('')}</ul>
    <button type="button" data-action="xmas-gift-new" data-id="${r.id}" class="mt-2 w-full rounded-xl border-2 border-dashed border-slate-200 hover:border-teal-300 hover:bg-teal-50/50 text-sm text-slate-500 hover:text-teal-700 py-2 flex items-center justify-center gap-2 transition">${icon('plus')}Add gift</button>
    ${past.length ? `<details class="mt-3"><summary class="text-xs text-slate-500 flex items-center gap-1">${icon('history', 'w-3.5 h-3.5')} Previously given (avoid repeats)<span class="chev transition">${icon('chevron-down', 'w-3.5 h-3.5')}</span></summary>
      <ul class="mt-2 text-xs text-slate-600 space-y-1 pl-5 list-disc">${past.map(h => `<li>${esc(h.year)} ${esc(h.occasion || '')}: ${esc(h.gift)}</li>`).join('')}</ul></details>` : ''}
    ` : ''}
  </article>`;
}
