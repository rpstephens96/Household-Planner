'use strict';
/* ---------- 6.8 FINANCE PLANNER ---------- */
/** Like field(), but a <div> wrapper – for groups of radios (nested <label>s are invalid HTML). */
const fieldDiv = (label, input, hint = '') => `<div><span class="block text-sm font-medium text-slate-700 mb-1.5">${label}</span>${input}${hint ? `<span class="block text-xs text-slate-500 mt-1">${hint}</span>` : ''}</div>`;
const seg = (name, opts, val) => `<div class="flex rounded-xl bg-slate-100 p-1">${opts.map(([k, l]) => `<label class="flex-1 cursor-pointer"><input type="radio" name="${name}" value="${k}" class="peer sr-only" ${val === k ? 'checked' : ''}><span class="block text-center rounded-lg px-3 py-2 text-sm font-medium text-slate-500 peer-checked:bg-white peer-checked:shadow-sm peer-checked:text-slate-900">${l}</span></label>`).join('')}</div>`;
const perLabel = o => o.frequency === 'yearly' ? 'yr' : 'mo';

function renderFinance() {
  const st = finStats();
  const tabs = [['overview', 'Overview', 'layout-dashboard'], ['income', 'Income', 'arrow-down-left'], ['outgoings', 'Outgoings', 'arrow-up-right'], ['savings', 'Savings', 'piggy-bank'], ['import', 'Find from bank CSV', 'file-search']];
  const body = { overview: finOverview, income: finIncomeTab, outgoings: finOutTab, savings: finSavingsTab, import: finImportTab }[ui.finTab] || finOverview;
  return `
  <a href="#/tools" class="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 mb-3">${icon('arrow-left')}Other tools</a>
  <div class="flex gap-1 overflow-x-auto no-scrollbar rounded-xl bg-slate-100 p-1 mb-5">
    ${tabs.map(([v, l, i]) => `<button type="button" data-action="fin-tab" data-val="${v}" class="shrink-0 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${ui.finTab === v ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}">${icon(i)}${l}</button>`).join('')}
  </div>
  ${body(st)}`;
}

function finRow(o, kind) {
  const yearly = o.frequency === 'yearly';
  return `<li class="flex items-center gap-3 py-3">
    <div class="flex-1 min-w-0">
      <p class="text-sm font-medium text-slate-800 break-words">${esc(o.name)}</p>
      <div class="flex flex-wrap items-center gap-1.5 mt-1">
        ${pill(FIN_FREQ[o.frequency] || 'Monthly', yearly ? 'bg-amber-50 text-amber-700 ring-amber-200' : 'bg-slate-50 text-slate-600 ring-slate-200')}
        ${kind === 'out' ? pill(FIN_TYPES[o.type] || 'Essential', o.type === 'discretionary' ? 'bg-violet-50 text-violet-700 ring-violet-200' : 'bg-teal-50 text-teal-700 ring-teal-200') : ''}
        ${o.src === 'vault' ? pill(`${icon('shield-check', 'w-3 h-3')} From vault`, 'bg-indigo-50 text-indigo-700 ring-indigo-200') : ''}
        ${yearly && o.dueDate ? `<span class="text-xs text-slate-500">next due ${fmtDate(nextAnnual(o.dueDate))}</span>` : ''}
        ${yearly && kind === 'out' && !o.dueDate ? `<span class="text-xs text-amber-700">no due date</span>` : ''}
      </div>
      ${o.notes ? `<p class="text-xs text-slate-500 mt-1 break-words">${esc(o.notes)}</p>` : ''}
    </div>
    <div class="text-right shrink-0">
      <p class="text-sm font-semibold text-slate-900 tabular-nums">${money(o.amount)}<span class="text-xs font-normal text-slate-500">/${perLabel(o)}</span></p>
      ${yearly ? `<p class="text-xs text-slate-500 tabular-nums">${money(num(o.amount) / 12)}/mo</p>` : ''}
    </div>
    <div class="flex shrink-0 -mr-2">
      <button type="button" data-action="fin-edit-${kind}" data-id="${o.id}" class="${ICON_BTN}" aria-label="Edit">${icon('pencil')}</button>
      <button type="button" data-action="fin-del-${kind}" data-id="${o.id}" class="${ICON_BTN} hover:!text-rose-600" aria-label="${o.src === 'vault' ? 'Remove from budget' : 'Delete'}">${icon(o.src === 'vault' ? 'unlink' : 'trash-2')}</button>
    </div>
  </li>`;
}

function finBillsPotCard() {
  const F = fin(), bp = billsPotStatus(), st = finStats();
  const has = bp.items.length > 0;
  const ok = bp.diff >= -0.5;
  const upcoming = bp.items.filter(i => i.due).slice(0, 5);
  return `<section class="${CARD} p-5">
    <div class="flex items-start justify-between gap-2 mb-3">
      <h3 class="font-semibold text-slate-900 flex items-center gap-2">${icon('piggy-bank', 'w-5 h-5 text-amber-600')}${esc(F.billsPot.name)}</h3>
      <button type="button" data-action="billspot-edit" class="${BTN_GHOST} !py-1.5 !text-xs shrink-0">${icon('pencil', 'w-3.5 h-3.5')}Update balance</button>
    </div>
    <div class="grid grid-cols-3 gap-2 text-center">
      <div class="rounded-xl bg-slate-50 p-2.5"><p class="text-[11px] text-slate-500">Pay in monthly</p><p class="font-semibold text-slate-900 tabular-nums">${money(st.billsPot)}</p></div>
      <div class="rounded-xl bg-slate-50 p-2.5"><p class="text-[11px] text-slate-500">Balance</p><p class="font-semibold text-slate-900 tabular-nums">${money(bp.balance)}</p></div>
      <div class="rounded-xl bg-slate-50 p-2.5"><p class="text-[11px] text-slate-500">Should hold now</p><p class="font-semibold text-slate-900 tabular-nums">${money(bp.expected)}</p></div>
    </div>
    ${!has ? '<p class="text-sm text-slate-500 mt-3">No yearly bills yet – add outgoings set to “Yearly” and they’ll be saved for here at ÷ 12 a month.</p>'
      : ok ? `<p class="mt-3 text-sm rounded-xl bg-emerald-50 text-emerald-800 px-3 py-2 flex gap-2 items-center">${icon('circle-check', 'w-4 h-4 shrink-0')}On track${bp.diff > 1 ? ` – ${money(bp.diff)} ahead` : ''}.</p>`
      : `<p class="mt-3 text-sm rounded-xl bg-amber-50 text-amber-800 px-3 py-2 flex gap-2 items-start">${icon('triangle-alert', 'w-4 h-4 shrink-0 mt-0.5')}<span>Short by <b>${money(-bp.diff)}</b>. Top up the pot now, or spread it before the next bill${upcoming[0] ? ` on ${fmtDate(upcoming[0].due)}` : ''}.</span></p>`}
    ${bp.undated ? `<p class="text-xs text-slate-500 mt-2">${bp.undated} yearly bill${bp.undated > 1 ? 's have' : ' has'} no due date, so ${bp.undated > 1 ? 'they are' : 'it is'} not included in “should hold now”.</p>` : ''}
    ${upcoming.length ? `<ul class="mt-3 divide-y divide-slate-100">${upcoming.map(i => `
      <li class="flex items-center gap-3 py-2 text-sm">
        <span class="flex-1 min-w-0"><span class="block text-slate-800 truncate">${esc(i.o.name)}</span><span class="block text-xs text-slate-500">${fmtDate(i.due)} · ${relDays(i.days)}</span></span>
        <span class="text-right"><span class="block font-medium tabular-nums">${money(i.o.amount)}</span><span class="block text-xs text-slate-500 tabular-nums">${money(i.expected)} saved by now</span></span>
      </li>`).join('')}</ul>` : ''}
  </section>`;
}

function finOverview(st) {
  const F = fin();
  if (!F.incomes.length && !st.outs.length && !F.pots.length) {
    return `<div class="${CARD}">${emptyBox('wallet', 'Set up your budget', 'Add your take-home pay and regular outgoings, or let the bank CSV finder suggest them.',
      `<div class="flex flex-wrap justify-center gap-2"><button type="button" data-action="fin-add-income" class="${BTN_PRIMARY}">${icon('plus')}Add income</button>
       <button type="button" data-action="fin-add-out" class="${BTN_GHOST}">${icon('plus')}Add outgoing</button>
       <button type="button" data-action="fin-tab" data-val="import" class="${BTN_GHOST}">${icon('file-search')}Find from bank CSV</button></div>`)}</div>`;
  }
  const row = (label, val, sub = '', cls = 'text-slate-900', strong = false) => `<div class="flex items-baseline justify-between gap-3 py-2">
    <div class="min-w-0"><p class="text-sm ${strong ? 'font-semibold text-slate-900' : 'text-slate-700'}">${label}</p>${sub ? `<p class="text-xs text-slate-500">${sub}</p>` : ''}</div>
    <p class="${strong ? 'text-lg font-bold' : 'font-semibold'} tabular-nums whitespace-nowrap ${cls}">${val}</p></div>`;
  const pct = v => st.income > 0 ? Math.max(0, v / st.income * 100) : 0;
  const segs = [[st.monthlyOut, 'bg-rose-400', 'Monthly outgoings'], [st.billsPot, 'bg-amber-400', 'Bills pot'], [st.savings, 'bg-sky-500', 'Savings'], [Math.max(0, st.left), 'bg-emerald-500', 'Left to spend']];
  const cats = Object.entries(st.byCat).sort((a, b) => b[1] - a[1]);
  const maxCat = cats.length ? cats[0][1] : 0;
  const ed = st.essential + st.discretionary;
  return `
  <div class="grid lg:grid-cols-2 gap-4 items-start">
    <section class="${CARD} p-5 lg:row-span-2">
      <h3 class="font-semibold text-slate-900 flex items-center gap-2 mb-2">${icon('scale', 'w-5 h-5 text-teal-600')} Monthly budget</h3>
      <div class="divide-y divide-slate-100">
        ${row('Take-home income', money(st.income), `${F.incomes.length} source${F.incomes.length === 1 ? '' : 's'}`, 'text-emerald-700')}
        ${row('Monthly outgoings', '− ' + money(st.monthlyOut), `${st.monthlyItems.length} item${st.monthlyItems.length === 1 ? '' : 's'}`)}
        ${row('Annual bills pot (yearly ÷ 12)', '− ' + money(st.billsPot), `${money(st.yearlyTotal)} a year → ${esc(F.billsPot.name)}`)}
        ${row('Available after bills', money(st.available), '', st.available < 0 ? 'text-rose-600' : 'text-slate-900', true)}
        ${row('Savings pots', '− ' + money(st.savings), `${F.pots.length} pot${F.pots.length === 1 ? '' : 's'}`)}
        ${row('Left to spend each month', money(st.left), st.left < 0 ? 'Over-committed – reduce savings or outgoings' : '', st.left < 0 ? 'text-rose-600' : 'text-emerald-700', true)}
      </div>
      ${st.income > 0 ? `<div class="mt-4">
        <div class="h-3 rounded-full bg-slate-100 overflow-hidden flex">${segs.map(([v, c]) => `<div class="${c} h-full" style="width:${Math.min(100, pct(v))}%"></div>`).join('')}</div>
        <div class="flex flex-wrap gap-x-4 gap-y-1 mt-2">${segs.map(([v, c, l]) => `<span class="inline-flex items-center gap-1.5 text-xs text-slate-600"><span class="w-2.5 h-2.5 rounded-full ${c}"></span>${l} ${Math.round(pct(v))}%</span>`).join('')}</div>
      </div>` : ''}
    </section>

    <section class="${CARD} p-5">
      <h3 class="font-semibold text-slate-900 mb-3">Essential vs discretionary <span class="text-xs font-normal text-slate-500">(monthly, incl. yearly ÷ 12)</span></h3>
      <div class="grid grid-cols-2 gap-3 mb-3">
        <div><p class="text-xs text-slate-500">Essential</p><p class="text-xl font-bold text-teal-700 tabular-nums">${money(st.essential)}</p></div>
        <div><p class="text-xs text-slate-500">Discretionary</p><p class="text-xl font-bold text-violet-700 tabular-nums">${money(st.discretionary)}</p></div>
      </div>
      <div class="h-2.5 rounded-full bg-slate-100 overflow-hidden flex"><div class="bg-teal-500 h-full" style="width:${ed ? st.essential / ed * 100 : 0}%"></div><div class="bg-violet-400 h-full" style="width:${ed ? st.discretionary / ed * 100 : 0}%"></div></div>
    </section>

    ${finBillsPotCard()}

    <section class="${CARD} p-5 lg:col-span-2">
      <h3 class="font-semibold text-slate-900 mb-3">Outgoings by category <span class="text-xs font-normal text-slate-500">(monthly equivalent)</span></h3>
      ${cats.length ? `<ul class="space-y-3">${cats.map(([id, v]) => `<li>
        <div class="flex justify-between gap-3 text-sm mb-1"><span class="text-slate-700">${esc(finCat('out', id).label)}</span><span class="tabular-nums text-slate-900 font-medium">${money(v)} <span class="text-xs font-normal text-slate-500">${st.income ? Math.round(v / st.income * 100) + '% of income' : ''}</span></span></div>
        ${progress(maxCat ? v / maxCat * 100 : 0, 'bg-teal-500')}</li>`).join('')}</ul>` : '<p class="text-sm text-slate-500">No outgoings yet.</p>'}
    </section>
  </div>`;
}

function finIncomeTab(st) {
  const F = fin();
  const groups = F.incomeCats.map(c => ({ c, items: F.incomes.filter(o => finCat('income', o.categoryId).id === c.id) })).filter(g => g.items.length);
  return `
  <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
    <div><p class="text-xs text-slate-500">Joint monthly take-home</p><p class="text-2xl font-bold text-emerald-700 tabular-nums">${money(st.income)}</p></div>
    <div class="flex gap-2"><button type="button" data-action="fin-cats" data-val="income" class="${BTN_GHOST}">${icon('tags')}Categories</button>
    <button type="button" data-action="fin-add-income" class="${BTN_PRIMARY}">${icon('plus')}Add income</button></div>
  </div>
  <p class="text-sm text-slate-500 mb-4">Enter take-home pay only (after tax, NI and pension). Yearly amounts are spread ÷ 12.</p>
  ${groups.length ? `<div class="space-y-4">${groups.map(g => `<section class="${CARD} px-4 md:px-5 pt-3">
      <div class="flex justify-between text-sm"><h3 class="font-semibold text-slate-800">${esc(g.c.label)}</h3><span class="text-slate-500 tabular-nums">${money(sum(g.items, monthlyOf))}/mo</span></div>
      <ul class="divide-y divide-slate-100">${g.items.map(o => finRow(o, 'income')).join('')}</ul></section>`).join('')}</div>`
    : `<div class="${CARD}">${emptyBox('banknote', 'No income added', 'Add each take-home salary separately so either can be updated.')}</div>`}`;
}

function finOutTab(st) {
  const F = fin();
  const filters = { all: () => true, monthly: o => o.frequency !== 'yearly', yearly: o => o.frequency === 'yearly', essential: o => o.type !== 'discretionary', discretionary: o => o.type === 'discretionary' };
  const f = filters[ui.finOutFilter] || filters.all;
  const list = st.outs.filter(f);
  const groups = F.outCats.map(c => ({ c, items: list.filter(o => finCat('out', o.categoryId).id === c.id).sort((a, b) => monthlyOf(b) - monthlyOf(a)) })).filter(g => g.items.length);
  const count = k => st.outs.filter(filters[k]).length;
  return `
  <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
    <div class="${CARD} p-4"><p class="text-xs text-slate-500">Monthly bills</p><p class="text-xl font-bold text-slate-900 tabular-nums">${money(st.monthlyOut)}</p></div>
    <div class="${CARD} p-4"><p class="text-xs text-slate-500">Yearly bills</p><p class="text-xl font-bold text-slate-900 tabular-nums">${money(st.yearlyTotal)}</p><p class="text-xs text-slate-500">${money(st.billsPot)}/mo to the pot</p></div>
    <div class="${CARD} p-4"><p class="text-xs text-slate-500">Essential</p><p class="text-xl font-bold text-teal-700 tabular-nums">${money(st.essential)}</p><p class="text-xs text-slate-500">per month</p></div>
    <div class="${CARD} p-4"><p class="text-xs text-slate-500">Discretionary</p><p class="text-xl font-bold text-violet-700 tabular-nums">${money(st.discretionary)}</p><p class="text-xs text-slate-500">per month</p></div>
  </div>
  <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
    ${filterPills([['all', 'All', count('all')], ['monthly', 'Monthly', count('monthly')], ['yearly', 'Yearly', count('yearly')], ['essential', 'Essential', count('essential')], ['discretionary', 'Discretionary', count('discretionary')]], ui.finOutFilter, 'fin-out-filter')}
    <div class="flex gap-2"><button type="button" data-action="fin-cats" data-val="out" class="${BTN_GHOST}">${icon('tags')}Categories</button>
    <button type="button" data-action="fin-add-out" class="${BTN_PRIMARY}">${icon('plus')}Add outgoing</button></div>
  </div>
  <p class="text-xs text-slate-500 mb-4">${icon('info', 'w-3.5 h-3.5 inline -mt-0.5')} Vault entries with “Include in budget” ticked appear here automatically – edit their cost in the vault.</p>
  ${groups.length ? `<div class="space-y-4">${groups.map(g => `<section class="${CARD} px-4 md:px-5 pt-3">
      <div class="flex justify-between text-sm"><h3 class="font-semibold text-slate-800">${esc(g.c.label)}</h3><span class="text-slate-500 tabular-nums">${money(sum(g.items, monthlyOf))}/mo</span></div>
      <ul class="divide-y divide-slate-100">${g.items.map(o => finRow(o, 'out')).join('')}</ul></section>`).join('')}</div>`
    : `<div class="${CARD}">${emptyBox('receipt', st.outs.length ? 'Nothing in this view' : 'No outgoings yet', st.outs.length ? '' : 'Add regular bills, or use “Find from bank CSV”.')}</div>`}`;
}

function finSavingsTab(st) {
  const F = fin();
  return `
  <div class="grid grid-cols-3 gap-3 mb-4">
    <div class="${CARD} p-4"><p class="text-xs text-slate-500">Available after bills</p><p class="text-xl font-bold tabular-nums ${st.available < 0 ? 'text-rose-600' : 'text-slate-900'}">${money(st.available)}</p></div>
    <div class="${CARD} p-4"><p class="text-xs text-slate-500">To savings</p><p class="text-xl font-bold text-sky-700 tabular-nums">${money(st.savings)}</p></div>
    <div class="${CARD} p-4"><p class="text-xs text-slate-500">Left to spend</p><p class="text-xl font-bold tabular-nums ${st.left < 0 ? 'text-rose-600' : 'text-emerald-700'}">${money(st.left)}</p></div>
  </div>
  <div class="flex flex-wrap items-center justify-between gap-2 mb-4">
    <p class="text-sm text-slate-500">Try different monthly amounts – the totals update as you change them.</p>
    <button type="button" data-action="pot-new" class="${BTN_PRIMARY}">${icon('plus')}Add savings pot</button>
  </div>
  <div class="grid md:grid-cols-2 gap-4 items-start mb-4">
    ${st.potAlloc.length ? st.potAlloc.map(({ p, monthly }) => {
      const target = num(p.target), bal = num(p.balance);
      const toGo = Math.max(0, target - bal);
      const months = target && monthly > 0 ? Math.ceil(toGo / monthly) : null;
      const reach = months !== null ? new Date(new Date().getFullYear(), new Date().getMonth() + months, 1).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : '';
      let byDate = '';
      if (target && p.targetDate) {
        const m = Math.max(1, Math.ceil(daysUntil(p.targetDate) / 30.44));
        const need = toGo / m;
        byDate = `<p class="text-xs mt-1 ${need > monthly + 0.5 ? 'text-amber-700' : 'text-emerald-700'}">To reach it by ${fmtDate(p.targetDate)}: ${money(need)}/mo${need > monthly + 0.5 ? ` (${money(need - monthly)} more than now)` : ' ✓'}</p>`;
      }
      return `<article class="${CARD} p-4 md:p-5">
        <div class="flex items-start gap-3">
          <span class="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">${icon('piggy-bank', 'w-5 h-5')}</span>
          <div class="flex-1 min-w-0"><h3 class="font-semibold text-slate-900 break-words">${esc(p.name)}</h3>${p.notes ? `<p class="text-xs text-slate-500 break-words">${esc(p.notes)}</p>` : ''}</div>
          <button type="button" data-action="pot-edit" data-id="${p.id}" class="${ICON_BTN}" aria-label="Edit pot">${icon('pencil')}</button>
          <button type="button" data-action="pot-del" data-id="${p.id}" class="${ICON_BTN} -mr-2 hover:!text-rose-600" aria-label="Delete pot">${icon('trash-2')}</button>
        </div>
        <div class="mt-3 flex flex-wrap items-center gap-2">
          <div class="relative w-28">${p.mode === 'percent' ? '' : '<span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">£</span>'}
            <input data-change="pot-value" data-id="${p.id}" value="${esc(p.value || '')}" inputmode="decimal" aria-label="Monthly allocation" class="${INPUT} !py-2 ${p.mode === 'percent' ? '' : 'pl-7'}"></div>
          <select data-change="pot-mode" data-id="${p.id}" aria-label="Allocation type" class="${INPUT} !py-2 !w-auto">
            <option value="fixed" ${p.mode !== 'percent' ? 'selected' : ''}>£ per month</option><option value="percent" ${p.mode === 'percent' ? 'selected' : ''}>% of available</option></select>
          <span class="text-sm text-slate-600">= <b class="tabular-nums">${money(monthly)}</b>/mo</span>
        </div>
        ${target ? `<div class="mt-3"><div class="flex justify-between text-xs text-slate-500 mb-1"><span>${money(bal)} of ${money(target)}</span><span>${months === null ? '' : months === 0 ? 'Target reached' : `≈ ${months} month${months === 1 ? '' : 's'} (${reach})`}</span></div>${progress(target ? bal / target * 100 : 0, 'bg-sky-500')}${byDate}</div>`
          : bal ? `<p class="text-xs text-slate-500 mt-3">Current balance ${money(bal)}</p>` : ''}
      </article>`;
    }).join('') : `<div class="${CARD} md:col-span-2">${emptyBox('piggy-bank', 'No savings pots yet', 'Create the savings accounts you’re considering, then try different monthly amounts to see what’s left.')}</div>`}
  </div>
  ${finBillsPotCard()}`;
}

function finImportTab() {
  const S = csvSession;
  const colOpts = f => [[-1, '— none —'], ...f.header.map((h, i) => [i, h || `Column ${i + 1}`])];
  const mapSel = (f, fi, key, label) => `<label class="block"><span class="block text-xs text-slate-500 mb-1">${label}</span>
    <select data-change="csv-map" data-file="${fi}" data-key="${key}" class="${INPUT} !py-1.5 !text-sm">${colOpts(f).map(([k, v]) => `<option value="${k}" ${Number(f.map[key]) === k ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select></label>`;
  const filesHtml = S ? S.files.map((f, fi) => {
    const tx = f.txns || [];
    const dates = tx.map(t => t.date).sort();
    return `<div class="rounded-xl bg-slate-50 ring-1 ring-slate-200 p-3">
      <div class="flex items-start gap-3">
        <span class="w-9 h-9 rounded-lg bg-white ring-1 ring-slate-200 text-slate-500 flex items-center justify-center shrink-0">${icon('file-text')}</span>
        <div class="flex-1 min-w-0"><p class="text-sm font-medium text-slate-800 truncate">${esc(f.name)}</p>
          <p class="text-xs ${f.error ? 'text-rose-600' : 'text-slate-500'}">${f.error ? esc(f.error) : `${esc(f.bank)} · ${tx.length} transactions${dates.length ? ` · ${fmtDate(dates[0])} – ${fmtDate(dates[dates.length - 1])}` : ''}`}</p></div>
        <button type="button" data-action="csv-remove" data-val="${fi}" class="${ICON_BTN} !w-8 !h-8" aria-label="Remove file">${icon('x', 'w-3.5 h-3.5')}</button>
      </div>
      ${!f.error && f.header ? `<details class="mt-2" ${tx.length ? '' : 'open'}><summary class="text-xs font-medium text-teal-700">Column mapping${tx.length ? '' : ' – no transactions found, please check'}</summary>
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
          ${mapSel(f, fi, 'date', 'Date')}${mapSel(f, fi, 'desc', 'Description / payee')}${mapSel(f, fi, 'amount', 'Amount (+/−)')}
          ${mapSel(f, fi, 'in', 'Money in')}${mapSel(f, fi, 'out', 'Money out')}${mapSel(f, fi, 'type', 'Type (optional)')}
        </div>
        <label class="mt-2 flex items-center gap-2 text-xs text-slate-600"><input type="checkbox" data-change="csv-map" data-file="${fi}" data-key="flip" ${f.map.flip ? 'checked' : ''} class="accent-teal-600"> Payments out are shown as positive numbers in this file</label>
        <p class="text-[11px] text-slate-400 mt-1">Use either Amount, or Money in + Money out. The mapping is remembered for this layout.</p>
      </details>` : ''}
    </div>`;
  }).join('') : '';

  const confPill = s => s.conf === 'high' ? pill('Strong match', 'bg-emerald-50 text-emerald-700 ring-emerald-200') : s.conf === 'medium' ? pill('Likely', 'bg-amber-50 text-amber-700 ring-amber-200') : pill('Possible', 'bg-slate-100 text-slate-600 ring-slate-200');
  const sugCard = (s, i) => {
    const cats = s.dir === 'in' ? fin().incomeCats : fin().outCats;
    const evidence = s.kind === 'variable'
      ? `${s.count} payments over the period · averages ${money(s.amount)}/month`
      : s.kind === 'once' ? `Direct debit seen once on ${fmtDate(s.last)} – may be annual`
      : `${s.count} payments · ${s.intervalLabel} (~${s.interval} days) · last ${fmtDate(s.last)}${s.min !== s.max ? ` · ${money(s.min)}–${money(s.max)}` : ''}${s.intervalLabel === 'weekly' || s.intervalLabel === 'fortnightly' ? ' · converted to monthly' : ''}${s.intervalLabel === 'quarterly' || s.intervalLabel === 'six-monthly' ? ' · converted to a yearly total' : ''}`;
    return `<div class="rounded-xl ring-1 ring-slate-200 p-3 ${s.tracked || s.transfer ? 'bg-slate-50' : 'bg-white'}">
      <label class="flex items-start gap-3 cursor-pointer">
        <input type="checkbox" name="pick" value="${i}" ${s.checked ? 'checked' : ''} class="mt-0.5 w-5 h-5 accent-teal-600 shrink-0">
        <span class="flex-1 min-w-0"><span class="flex flex-wrap gap-1.5 mb-1">${confPill(s)}
          ${s.mandate ? pill('Direct debit / SO', 'bg-sky-50 text-sky-700 ring-sky-200') : ''}
          ${s.tracked ? pill('Already in budget', 'bg-teal-50 text-teal-700 ring-teal-200') : ''}
          ${s.transfer ? pill('Looks like a transfer', 'bg-slate-100 text-slate-600 ring-slate-200') : ''}
          ${s.stopped ? pill('May have stopped', 'bg-rose-50 text-rose-700 ring-rose-200') : ''}
          ${pill(esc(s.account), 'bg-white text-slate-500 ring-slate-200')}</span>
          <span class="block text-xs text-slate-500">${evidence}</span></span>
      </label>
      <div class="grid grid-cols-2 sm:grid-cols-6 gap-2 mt-2">
        <input name="name_${i}" value="${esc(s.name)}" aria-label="Name" class="${INPUT} !py-2 col-span-2">
        <div class="relative"><span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">£</span><input name="amount_${i}" value="${(Math.round(s.amount * 100) / 100).toFixed(2)}" inputmode="decimal" aria-label="Amount" class="${INPUT} !py-2 pl-7"></div>
        <select name="freq_${i}" aria-label="Frequency" class="${INPUT} !py-2">${Object.entries(FIN_FREQ).map(([k, l]) => `<option value="${k}" ${s.freq === k ? 'selected' : ''}>${l}</option>`).join('')}</select>
        <select name="cat_${i}" aria-label="Category" class="${INPUT} !py-2 ${s.dir === 'in' ? 'col-span-2' : ''}">${cats.map(c => `<option value="${c.id}" ${s.categoryId === c.id ? 'selected' : ''}>${esc(c.label)}</option>`).join('')}</select>
        ${s.dir === 'out' ? `<select name="type_${i}" aria-label="Essential or discretionary" class="${INPUT} !py-2">${Object.entries(FIN_TYPES).map(([k, l]) => `<option value="${k}" ${s.type === k ? 'selected' : ''}>${l}</option>`).join('')}</select>` : ''}
      </div>
      ${s.vaultId ? `<label class="mt-2 flex items-start gap-2 text-xs text-indigo-800 bg-indigo-50 rounded-lg px-2.5 py-2"><input type="checkbox" name="link_${i}" checked class="mt-0.5 accent-indigo-600">
        Matches vault entry “${esc(s.vaultName)}” – include that entry in the budget instead of adding a duplicate (its vault cost is used).</label>` : ''}
    </div>`;
  };
  const sugs = S ? S.sugs : [];
  const section = (title, sub, filter) => {
    const idx = sugs.map((s, i) => [s, i]).filter(([s]) => filter(s));
    return idx.length ? `<div class="space-y-2"><h4 class="text-sm font-semibold text-slate-800 mt-4">${title} <span class="font-normal text-slate-400">${idx.length}</span></h4>${sub ? `<p class="text-xs text-slate-500">${sub}</p>` : ''}${idx.map(([s, i]) => sugCard(s, i)).join('')}</div>` : '';
  };

  return `
  <section class="${CARD} p-5 mb-4">
    <h3 class="font-semibold text-slate-900 flex items-center gap-2 mb-1">${icon('file-search', 'w-5 h-5 text-teal-600')} Find regular payments from bank statements</h3>
    <p class="text-sm text-slate-500">Upload CSV exports from Monzo, HSBC or Santander (or any bank). 3–12 months of history works best – yearly bills need at least a year to be spotted reliably.</p>
    <p class="mt-3 text-xs rounded-xl bg-teal-50 text-teal-800 px-3 py-2 flex gap-2">${icon('lock', 'w-4 h-4 shrink-0')}<span>Files are read on this device only. Transactions are never saved or uploaded – only the items you choose to add are kept.</span></p>
    <label class="mt-4 flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 hover:border-teal-400 hover:bg-teal-50/40 p-6 cursor-pointer transition text-center">
      <span class="w-11 h-11 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">${icon('upload', 'w-5 h-5')}</span>
      <span class="text-sm font-medium text-slate-800">${S ? 'Add more statement files' : 'Choose statement files'}</span>
      <span class="text-xs text-slate-500">.csv (Monzo, HSBC, Santander, others) or Santander .txt · select several at once</span>
      <input type="file" id="csv-input" multiple accept=".csv,.txt,text/csv,text/plain" class="sr-only">
    </label>
    <details class="mt-3"><summary class="text-xs font-medium text-slate-600 flex items-center gap-1">How to export from each bank<span class="chev transition">${icon('chevron-down', 'w-3.5 h-3.5')}</span></summary>
      <ul class="mt-2 text-xs text-slate-600 space-y-1.5 list-disc pl-5">
        <li><b>Monzo:</b> app → Home → account → <i>Statements</i> / <i>Export transactions</i> → choose CSV and a date range (or web.monzo.com).</li>
        <li><b>HSBC:</b> online banking → account → <i>Download transactions</i> → CSV.</li>
        <li><b>Santander:</b> online banking → account → <i>Download transactions</i> → choose the CSV or text (.txt) option.</li>
      </ul></details>
  </section>

  ${S ? `<section class="${CARD} p-5 mb-4">
    <div class="flex items-center justify-between gap-2 mb-3"><h3 class="font-semibold text-slate-900">Files <span class="font-normal text-slate-400">${S.files.length}</span></h3>
      <button type="button" data-action="csv-clear" class="${BTN_GHOST} !py-1.5 !text-xs">${icon('eraser', 'w-3.5 h-3.5')}Clear all</button></div>
    <div class="space-y-2">${filesHtml}</div>
  </section>

  <form data-form="csv-apply" class="${CARD} p-5">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h3 class="font-semibold text-slate-900">${sugs.length ? `Suggestions <span class="font-normal text-slate-400">${sugs.length}</span>` : 'No regular payments found'}</h3>
      ${sugs.length ? `<div class="flex gap-2"><button type="button" data-action="csv-sel" data-val="all" class="text-xs font-medium text-teal-700">Select all</button><span class="text-slate-300">|</span><button type="button" data-action="csv-sel" data-val="none" class="text-xs font-medium text-teal-700">Select none</button></div>` : ''}
    </div>
    ${sugs.length ? `<p class="text-xs text-slate-500 mt-1">Strong and likely matches are pre-ticked. Check names, amounts and categories, then add.</p>` : `<p class="text-sm text-slate-500 mt-1">${S.txCount ? 'Try a longer date range, or check the column mapping above.' : 'No transactions could be read – check the column mapping above.'}</p>`}
    ${section('Income', 'Regular money coming in (e.g. salaries).', s => s.dir === 'in')}
    ${section('Regular outgoings', 'Payments that repeat on a schedule.', s => s.dir === 'out' && s.kind !== 'variable')}
    ${section('Variable spending', 'Frequent but irregular spending (e.g. groceries, fuel), shown as a monthly average. Not ticked by default.', s => s.kind === 'variable')}
    ${sugs.length ? `<div class="sticky bottom-20 md:bottom-4 mt-5 flex justify-end"><button type="submit" class="${BTN_PRIMARY} shadow-lg">${icon('check')}Add selected to budget</button></div>` : ''}
  </form>` : ''}`;
}

