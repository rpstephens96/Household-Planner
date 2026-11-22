'use strict';
/* ---------- 6.5 HOUSEHOLD VAULT ---------- */
function vaultMatches(v) {
  const q = ui.vaultSearch.trim().toLowerCase();
  if (ui.vaultCat !== 'all' && v.category !== ui.vaultCat) return false;
  if (!q) return true;
  return [v.provider, v.name, v.accountNo, v.location, v.notes, vcat(v.category).label].some(x => String(x || '').toLowerCase().includes(q));
}
function vaultListHTML() {
  const items = state.vault.filter(vaultMatches).sort((a, b) => (a.renewalDate || '9999') < (b.renewalDate || '9999') ? -1 : 1);
  if (!items.length) return `<div class="${CARD}">${emptyBox('search', state.vault.length ? 'No matches' : 'Your vault is empty', state.vault.length ? 'Try a different search or category.' : 'Add mortgages, insurance, utilities and savings so you both know where everything lives.', state.vault.length ? '' : `<button type="button" data-action="vault-new" class="${BTN_SOFT}">${icon('plus')}Add first entry</button>`)}</div>`;
  const cats = ui.vaultCat === 'all' ? vcats().map(c => vcat(c.id)) : [vcat(ui.vaultCat)];
  return cats.map(c => {
    const group = items.filter(v => vcat(v.category).id === c.id);
    if (!group.length) return '';
    return `<section class="mb-6">
      <h3 class="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3"><span class="w-7 h-7 rounded-lg ${c.bg} ${c.fg} flex items-center justify-center">${icon(c.icon, 'w-4 h-4')}</span>${c.label}<span class="text-slate-400 font-normal">${group.length}</span></h3>
      <div class="grid md:grid-cols-2 xl:grid-cols-3 gap-4 items-start">${group.map(vaultCard).join('')}</div>
    </section>`;
  }).join('');
}
function vaultCard(v) {
  const c = vcat(v.category);
  const cost = num(v.cost), monthly = v.costPeriod === 'monthly';
  const url = safeUrl(v.url);
  return `<article class="${CARD} p-4 flex flex-col gap-3">
    <div class="flex items-start gap-3">
      <div class="w-10 h-10 rounded-xl ${c.bg} ${c.fg} flex items-center justify-center shrink-0">${icon(c.icon, 'w-5 h-5')}</div>
      <div class="flex-1 min-w-0"><h4 class="font-semibold text-slate-900 break-words">${esc(v.provider)}</h4><p class="text-xs text-slate-500 break-words">${esc(v.name || c.label)}</p></div>
      ${renewalBadge(v.renewalDate)}
    </div>
    <dl class="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
      <div class="col-span-2"><dt class="text-xs text-slate-500">Policy / account number</dt>
        <dd class="flex items-center gap-1 font-mono text-[13px] text-slate-800 break-all">${v.accountNo ? `${esc(v.accountNo)}<button type="button" data-action="copy" data-val="${esc(v.accountNo)}" class="${ICON_BTN} !w-7 !h-7" aria-label="Copy number">${icon('copy', 'w-3.5 h-3.5')}</button>` : '—'}</dd></div>
      <div><dt class="text-xs text-slate-500">Renewal / end date</dt><dd class="text-slate-800">${fmtDate(v.renewalDate)}</dd></div>
      <div><dt class="text-xs text-slate-500">Auto-renew</dt><dd>${v.autoRenew ? pill('Yes', 'bg-emerald-50 text-emerald-700 ring-emerald-200') : pill('No', 'bg-rose-50 text-rose-700 ring-rose-200')}</dd></div>
      <div class="col-span-2"><dt class="text-xs text-slate-500">Cost</dt><dd class="text-slate-800">${cost ? `<span class="font-semibold">${money(cost)}</span> / ${monthly ? 'month' : 'year'} <span class="text-xs text-slate-400">(≈ ${monthly ? money(cost * 12) + ' a year' : money(cost / 12) + ' a month'})</span>` : '—'}</dd></div>
    </dl>
    ${v.location ? `<div class="rounded-xl bg-teal-50 ring-1 ring-teal-100 p-3 flex gap-2.5">
        <span class="text-teal-600 mt-0.5">${icon('map-pin', 'w-4 h-4')}</span>
        <div><p class="text-[11px] font-semibold text-teal-800 uppercase tracking-wider">Where to find it</p><p class="text-sm text-teal-900 break-words">${esc(v.location)}</p></div></div>`
      : `<button type="button" data-action="vault-edit" data-id="${v.id}" class="rounded-xl bg-amber-50 ring-1 ring-amber-100 p-3 text-left text-sm text-amber-800 flex gap-2">${icon('map-pin', 'w-4 h-4 mt-0.5')}Add where the documents are kept</button>`}
    ${v.notes ? `<p class="text-sm text-slate-600 whitespace-pre-line bg-slate-50 rounded-xl p-3 break-words">${esc(v.notes)}</p>` : ''}
    <div class="flex items-center gap-2 pt-1 mt-auto">
      ${v.inBudget ? pill(`${icon('wallet', 'w-3 h-3')} In budget`, 'bg-emerald-50 text-emerald-700 ring-emerald-200') : ''}
      ${url ? `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer" class="${BTN_SOFT} !py-1.5 !text-xs">${icon('external-link', 'w-3.5 h-3.5')}Login / portal</a>` : ''}
      <button type="button" data-action="vault-edit" data-id="${v.id}" class="${ICON_BTN} ml-auto" aria-label="Edit">${icon('pencil')}</button>
      <button type="button" data-action="vault-delete" data-id="${v.id}" class="${ICON_BTN} -mr-2 hover:!text-rose-600" aria-label="Delete">${icon('trash-2')}</button>
    </div>
  </article>`;
}
function renderVault() {
  const V = state.vault;
  const monthlyTotal = sum(V, v => v.costPeriod === 'monthly' ? num(v.cost) : num(v.cost) / 12);
  const soon = V.filter(v => { const d = daysUntil(v.renewalDate); return d !== null && d < 60; }).length;
  const noLoc = V.filter(v => !v.location).length;
  return `
  <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
    <div class="${CARD} p-4"><p class="text-xs text-slate-500">Entries</p><p class="text-2xl font-bold text-slate-900 mt-1">${V.length}</p></div>
    <div class="${CARD} p-4"><p class="text-xs text-slate-500">Monthly outgoings</p><p class="text-2xl font-bold text-slate-900 mt-1">${money(monthlyTotal)}</p><p class="text-xs text-slate-500">${money(monthlyTotal * 12)} a year</p></div>
    <div class="${CARD} p-4"><p class="text-xs text-slate-500">Renewing within 60 days</p><p class="text-2xl font-bold ${soon ? 'text-amber-600' : 'text-slate-900'} mt-1">${soon}</p></div>
    <div class="${CARD} p-4"><p class="text-xs text-slate-500">Missing "where to find it"</p><p class="text-2xl font-bold ${noLoc ? 'text-rose-600' : 'text-emerald-600'} mt-1">${noLoc}</p></div>
  </div>
  <div class="flex flex-col sm:flex-row gap-2 mb-3">
    <div class="relative flex-1"><span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">${icon('search')}</span>
      <input data-input="vault-search" value="${esc(ui.vaultSearch)}" placeholder="Search provider, policy number, location…" class="${INPUT} pl-9"></div>
    <div class="flex gap-2"><button type="button" data-action="vault-cats" class="${BTN_GHOST} flex-1 sm:flex-none">${icon('tags')}Categories</button>
    <button type="button" data-action="vault-new" class="${BTN_PRIMARY} flex-1 sm:flex-none">${icon('plus')}Add entry</button></div>
  </div>
  <div class="mb-5">${filterPills([['all', 'All', V.length], ...vcats().map(c => [c.id, c.label, V.filter(v => vcat(v.category).id === c.id).length])], ui.vaultCat, 'vault-cat')}</div>
  <div id="vault-list">${vaultListHTML()}</div>`;
}

