'use strict';
/* ---------- 6.3 BIRTHDAYS ---------- */
function renderBirthdays() {
  const list = state.people.map(p => ({ p, nb: nextBirthday(p) })).sort((a, b) => a.nb.days - b.nb.days);
  let lastMonth = '';
  const rows = list.map(({ p, nb }) => {
    const m = nb.date ? parseYMD(nb.date).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : 'No date';
    const header = m !== lastMonth ? `<h3 class="text-xs font-semibold uppercase tracking-wider text-slate-400 pt-4 pb-1 px-1">${m}</h3>` : '';
    lastMonth = m;
    return header + personCard(p, nb);
  }).join('');

  return `
  <p class="mb-3 text-xs text-slate-500">${icon('users', 'w-3.5 h-3.5 inline')} Gift ideas and history are shared with household members.</p>
  <div class="flex items-center justify-between gap-3 mb-2">
    <p class="text-sm text-slate-500">${state.people.length} ${state.people.length === 1 ? 'person' : 'people'} · sorted by next birthday</p>
    <button type="button" data-action="person-new" class="${BTN_PRIMARY}">${icon('user-plus')}Add person</button>
  </div>
  ${list.length ? `<div class="space-y-3">${rows}</div>` : `<div class="${CARD}">${emptyBox('cake', 'No birthdays yet', 'Add family and friends to start tracking.', `<button type="button" data-action="person-new" class="${BTN_SOFT}">${icon('user-plus')}Add person</button>`)}</div>`}`;
}

function personCard(p, nb) {
  const open = !!ui.personOpen[p.id];
  const fg = p.finalGift;
  const givenBefore = title => {
    const tl = String(title || '').toLowerCase().trim();
    if (!tl) return null;
    const h = p.history.find(x => { const g = String(x.gift || '').toLowerCase(); return g && (g.includes(tl) || tl.includes(g)); });
    return h ? h.year : null;
  };

  return `<article class="${CARD} overflow-hidden" id="person-${p.id}">
    <button type="button" data-action="person-toggle" data-id="${p.id}" class="w-full text-left p-4 flex items-start gap-3">
      <div class="w-12 h-12 rounded-full ${avatarCls(p.name)} flex items-center justify-center font-semibold shrink-0">${initials(p.name)}</div>
      <div class="flex-1 min-w-0">
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0"><p class="font-semibold text-slate-900 truncate">${esc(p.name)}</p>
          <p class="text-xs text-slate-500">${p.relationship ? esc(p.relationship) + ' · ' : ''}${nb.date ? fmtDate(nb.date, { weekday: 'short', day: 'numeric', month: 'long' }) : 'No date set'}${nb.turning !== null && nb.date ? ` · <span class="font-medium text-slate-700">turning ${nb.turning}</span>` : ''}</p></div>
          ${nb.date ? daysPill(nb.days) : ''}
        </div>
        <div class="flex flex-wrap gap-1.5 mt-2">${giftStatusPill(p)}${cardStatusPill(p)}${p.ideas.length ? pill(`${icon('lightbulb', 'w-3 h-3')} ${p.ideas.length} idea${p.ideas.length > 1 ? 's' : ''}`, 'bg-slate-50 text-slate-600 ring-slate-200') : ''}</div>
      </div>
      <span class="text-slate-400 mt-1 transition ${open ? 'rotate-180' : ''}">${icon('chevron-down', 'w-5 h-5')}</span>
    </button>

    ${!open ? '' : `
    <div class="border-t border-slate-100 bg-slate-50/50 p-4 space-y-5">
      ${p.notes ? `<p class="text-sm text-slate-600 bg-white rounded-xl px-3 py-2 ring-1 ring-slate-200">${icon('info', 'w-4 h-4 inline -mt-0.5 text-slate-400')} ${esc(p.notes)}</p>` : ''}

      <!-- Final gift -->
      <div>
        <h4 class="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Final gift</h4>
        ${fg ? `<div class="bg-white rounded-xl ring-1 ring-slate-200 p-3">
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0"><p class="font-medium text-slate-800 break-words">${icon('gift', 'w-4 h-4 inline -mt-0.5 text-teal-600')} ${esc(fg.title)}</p>
              <p class="text-xs text-slate-500">${fg.price ? money(fg.price) : 'No price set'}</p></div>
              <div class="flex shrink-0"><button type="button" data-action="final-custom" data-id="${p.id}" class="${ICON_BTN}" aria-label="Edit final gift">${icon('pencil')}</button>
              <button type="button" data-action="final-clear" data-id="${p.id}" class="${ICON_BTN}" aria-label="Clear final gift">${icon('x')}</button></div>
            </div>
            <div class="grid grid-cols-3 gap-1 mt-3 rounded-xl bg-slate-100 p-1">
              ${GIFT_STATUS.map((s, i) => { const cur = GIFT_STATUS.findIndex(x => x.id === fg.status); const on = s.id === fg.status; return `
                <button type="button" data-action="final-status" data-id="${p.id}" data-val="${s.id}" class="flex flex-col sm:flex-row items-center justify-center gap-1 rounded-lg px-2 py-2 text-xs font-medium transition ${on ? 'bg-white shadow-sm text-teal-700' : i < cur ? 'text-teal-600' : 'text-slate-500 hover:text-slate-700'}">${icon(i < cur ? 'circle-check' : s.icon, 'w-4 h-4')}<span>${s.label}</span></button>`; }).join('')}
            </div>
          </div>`
        : `<div class="bg-white rounded-xl ring-1 ring-dashed ring-slate-300 p-3 text-sm text-slate-500 flex flex-wrap items-center justify-between gap-2">
            <span>No final gift chosen – select one of the ideas below, or</span>
            <button type="button" data-action="final-custom" data-id="${p.id}" class="${BTN_SOFT} !py-1.5">${icon('plus', 'w-3.5 h-3.5')}Enter custom gift</button></div>`}
      </div>

      <!-- Card tracker -->
      <div>
        <h4 class="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Card tracker</h4>
        <div class="grid grid-cols-2 gap-2">
          ${[['card-bought', p.cardBought, 'Card bought', 'shopping-bag'], ['card-sent', p.cardSent, 'Card written / sent', 'send']].map(([a, on, l, i]) => `
            <button type="button" data-action="${a}" data-id="${p.id}" aria-pressed="${on}" class="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-left ring-1 transition ${on ? 'bg-emerald-50 ring-emerald-200 text-emerald-800' : 'bg-white ring-slate-200 text-slate-600 hover:ring-teal-300'}">
              <span class="w-6 h-6 shrink-0 rounded-md border-2 flex items-center justify-center ${on ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 text-transparent'}">${icon('check', 'w-3.5 h-3.5')}</span>${l}</button>`).join('')}
        </div>
      </div>

      <!-- Gift ideas -->
      <div>
        <h4 class="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Gift ideas</h4>
        ${p.ideas.length ? `<ul class="space-y-2 mb-2">${p.ideas.map(idea => { const isSel = fg && fg.ideaId === idea.id; const yr = givenBefore(idea.title); const url = safeUrl(idea.link); return `
          <li class="bg-white rounded-xl ring-1 ${isSel ? 'ring-teal-300' : 'ring-slate-200'} p-3 flex flex-wrap items-center gap-2">
            <div class="flex-1 min-w-[10rem]"><p class="text-sm font-medium text-slate-800 break-words">${esc(idea.title)}</p>
              <p class="text-xs text-slate-500 flex flex-wrap gap-x-3">${idea.price ? `<span>${money(idea.price)}</span>` : ''}${url ? `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer" class="text-teal-700 hover:underline inline-flex items-center gap-1">${icon('external-link', 'w-3 h-3')}Link</a>` : ''}
              ${yr ? `<span class="text-amber-700 font-medium">${icon('triangle-alert', 'w-3 h-3 inline -mt-0.5')} Similar gift given in ${yr}</span>` : ''}</p></div>
            ${isSel ? pill(`${icon('star', 'w-3 h-3')} Selected`, 'bg-teal-50 text-teal-700 ring-teal-200')
              : `<button type="button" data-action="idea-select" data-id="${p.id}" data-item="${idea.id}" class="${BTN_SOFT} !py-1.5 !text-xs">${icon('star', 'w-3.5 h-3.5')}Select as final gift</button>`}
            <button type="button" data-action="idea-delete" data-id="${p.id}" data-item="${idea.id}" class="${ICON_BTN} !w-8 !h-8" aria-label="Delete idea">${icon('trash-2', 'w-3.5 h-3.5')}</button>
          </li>`; }).join('')}</ul>` : ''}
        <form data-form="idea-add" data-id="${p.id}" class="grid grid-cols-[1fr_6rem] sm:grid-cols-[1fr_6rem_1fr_auto] gap-2">
          <input name="title" required placeholder="Gift idea" class="${INPUT} !py-2" data-focus-key="idea-${p.id}">
          <input name="price" inputmode="decimal" placeholder="£ est." class="${INPUT} !py-2">
          <input name="link" placeholder="Link (optional)" class="${INPUT} !py-2 col-span-2 sm:col-span-1">
          <button type="submit" class="${BTN_SOFT} col-span-2 sm:col-span-1">${icon('plus')}Add idea</button>
        </form>
      </div>

      <!-- History -->
      <div>
        <div class="flex items-center justify-between mb-2">
          <h4 class="text-xs font-semibold uppercase tracking-wider text-slate-500">Gift history</h4>
          <button type="button" data-action="history-add" data-id="${p.id}" class="text-xs font-medium text-teal-700 hover:underline">+ Add past gift</button>
        </div>
        ${p.history.length ? `<ul class="bg-white rounded-xl ring-1 ring-slate-200 divide-y divide-slate-100">${[...p.history].sort((a, b) => b.year - a.year).map(h => `
          <li class="flex items-center gap-3 px-3 py-2">
            <span class="text-xs font-semibold text-slate-500 w-10 shrink-0">${esc(h.year)}</span>
            <div class="flex-1 min-w-0"><p class="text-sm text-slate-800 break-words">${esc(h.gift)}</p>
              <p class="text-xs text-slate-500">${esc(h.occasion || 'Birthday')}${h.price ? ' · ' + money(h.price) : ''}${h.notes ? ' · ' + esc(h.notes) : ''}</p></div>
            <button type="button" data-action="history-delete" data-id="${p.id}" data-item="${h.id}" class="${ICON_BTN} !w-8 !h-8" aria-label="Delete history entry">${icon('x', 'w-3.5 h-3.5')}</button>
          </li>`).join('')}</ul>` : '<p class="text-sm text-slate-500">No past gifts logged. Final gifts are archived here automatically after each birthday.</p>'}
      </div>

      <div class="flex flex-wrap gap-2 pt-3 border-t border-slate-200">
        <button type="button" data-action="person-edit" data-id="${p.id}" class="${BTN_GHOST} !py-1.5 !text-xs">${icon('pencil', 'w-3.5 h-3.5')}Edit details</button>
        ${fg ? `<button type="button" data-action="person-archive" data-id="${p.id}" class="${BTN_GHOST} !py-1.5 !text-xs">${icon('archive', 'w-3.5 h-3.5')}Archive gift to history now</button>` : ''}
        <button type="button" data-action="person-delete" data-id="${p.id}" class="${BTN_DANGER} !py-1.5 !text-xs ml-auto">${icon('trash-2', 'w-3.5 h-3.5')}Delete</button>
      </div>
    </div>`}
  </article>`;
}
