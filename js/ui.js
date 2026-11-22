'use strict';
/* ========================= 5. UI PRIMITIVES ========================== */
const icon = (n, c = 'w-4 h-4') => `<i data-lucide="${n}" class="${c}"></i>`;
const pill = (text, cls) => `<span class="inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${cls}">${text}</span>`;
const CARD = 'bg-white rounded-2xl border border-slate-200/70 shadow-sm';
const BTN = 'inline-flex items-center justify-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition active:scale-[.98]';
const BTN_PRIMARY = `${BTN} bg-teal-600 hover:bg-teal-700 text-white shadow-sm`;
const BTN_SOFT = `${BTN} bg-teal-50 hover:bg-teal-100 text-teal-700`;
const BTN_GHOST = `${BTN} bg-white hover:bg-slate-50 text-slate-700 ring-1 ring-slate-200`;
const BTN_DANGER = `${BTN} bg-rose-50 hover:bg-rose-100 text-rose-700`;
const ICON_BTN = 'w-9 h-9 shrink-0 inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition';
const INPUT = 'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-base sm:text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500';

function progress(pct, colour = 'bg-teal-500', h = 'h-2') {
  pct = Math.max(0, Math.min(100, isFinite(pct) ? pct : 0));
  return `<div class="${h} rounded-full bg-slate-100 overflow-hidden"><div class="h-full ${colour} rounded-full transition-all duration-500" style="width:${pct}%"></div></div>`;
}
function emptyBox(iconName, title, sub, actionHtml = '') {
  return `<div class="text-center py-10 px-4">
    <div class="mx-auto w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">${icon(iconName, 'w-6 h-6')}</div>
    <p class="font-medium text-slate-700">${title}</p>
    ${sub ? `<p class="text-sm text-slate-500 mt-1">${sub}</p>` : ''}
    ${actionHtml ? `<div class="mt-4">${actionHtml}</div>` : ''}
  </div>`;
}
function filterPills(items, current, action) {
  return `<div class="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1">${items.map(([val, label, count]) => `
    <button type="button" data-action="${action}" data-val="${val}"
      class="shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition ${current === val ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'}">
      ${label}${count !== undefined ? ` <span class="${current === val ? 'text-slate-300' : 'text-slate-400'}">${count}</span>` : ''}
    </button>`).join('')}</div>`;
}
function renewalBadge(s) {
  const d = daysUntil(s);
  if (d === null) return pill('No date', 'bg-slate-50 text-slate-500 ring-slate-200');
  if (d < 0) return pill(`${icon('triangle-alert', 'w-3 h-3')} Ended ${-d}d ago`, 'bg-rose-50 text-rose-700 ring-rose-200');
  const label = d === 0 ? 'Today' : d > 90 ? `${Math.round(d / 30.4)} months` : `${d} day${d === 1 ? '' : 's'}`;
  if (d < 14) return pill(`${icon('clock', 'w-3 h-3')} ${label}`, 'bg-rose-50 text-rose-700 ring-rose-200');
  if (d < 60) return pill(`${icon('clock', 'w-3 h-3')} ${label}`, 'bg-amber-50 text-amber-700 ring-amber-200');
  return pill(label, 'bg-emerald-50 text-emerald-700 ring-emerald-200');
}

// ---- Form field helpers ----
const field = (label, input, hint = '') => `<label class="block"><span class="block text-sm font-medium text-slate-700 mb-1.5">${label}</span>${input}${hint ? `<span class="block text-xs text-slate-500 mt-1">${hint}</span>` : ''}</label>`;
const inp = (name, val = '', attrs = '') => `<input name="${name}" value="${esc(val)}" class="${INPUT}" ${attrs}>`;
const ta = (name, val = '', attrs = '') => `<textarea name="${name}" rows="3" class="${INPUT}" ${attrs}>${esc(val)}</textarea>`;
const sel = (name, opts, val) => `<select name="${name}" class="${INPUT}">${opts.map(([k, v]) => `<option value="${esc(k)}" ${String(k) === String(val) ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select>`;
const chk = (name, label, checked, hint = '') => `<label class="flex items-start gap-3 rounded-xl bg-slate-50 px-3 py-3 cursor-pointer">
  <input type="checkbox" name="${name}" ${checked ? 'checked' : ''} class="mt-0.5 w-5 h-5 rounded accent-teal-600"><span><span class="block text-sm font-medium text-slate-700">${label}</span>${hint ? `<span class="block text-xs text-slate-500">${hint}</span>` : ''}</span></label>`;
const moneyInp = (name, val) => `<div class="relative"><span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">£</span><input name="${name}" value="${val || val === 0 ? esc(val) : ''}" inputmode="decimal" placeholder="0.00" class="${INPUT} pl-7"></div>`;

function refreshIcons() { if (window.lucide) { try { lucide.createIcons(); } catch (e) { /* offline */ } } }

// ---- Toast ----
function toast(msg, type = 'ok') {
  const el = document.createElement('div');
  el.className = `anim-up pointer-events-auto rounded-xl px-4 py-2.5 text-sm font-medium shadow-lg ${type === 'error' ? 'bg-rose-600 text-white' : 'bg-slate-900 text-white'}`;
  el.textContent = msg;
  $('#toast-root').appendChild(el);
  setTimeout(() => { el.style.transition = 'opacity .3s'; el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, 2600);
}

// ---- Modal (one at a time; bottom-sheet on mobile, centred dialog on desktop) ----
let modalHandler = null, modalSeq = 0;
function openModal({ title, body, submitLabel = 'Save', onSubmit = null, footer = '', danger = false, wide = false }) {
  modalSeq++;
  modalHandler = onSubmit;
  $('#modal-root').innerHTML = `
  <div class="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
    <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] anim-fade" data-action="close-modal"></div>
    <form id="modal-form" class="relative anim-up bg-white w-full ${wide ? 'sm:max-w-2xl' : 'sm:max-w-lg'} rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[92vh] flex flex-col" autocomplete="off">
      <div class="flex items-center gap-3 px-5 pt-5 pb-3 border-b border-slate-100">
        <h2 class="flex-1 text-lg font-semibold text-slate-900">${title}</h2>
        <button type="button" data-action="close-modal" class="${ICON_BTN}" aria-label="Close">${icon('x', 'w-5 h-5')}</button>
      </div>
      <div class="overflow-y-auto px-5 py-4 space-y-4">${body}</div>
      ${onSubmit ? `<div class="flex gap-2 justify-end px-5 py-4 border-t border-slate-100 safe-bottom">
        <button type="button" data-action="close-modal" class="${BTN_GHOST}">Cancel</button>
        <button type="submit" class="${danger ? `${BTN} bg-rose-600 hover:bg-rose-700 text-white` : BTN_PRIMARY}">${submitLabel}</button>
      </div>` : (footer ? `<div class="px-5 py-4 border-t border-slate-100 safe-bottom">${footer}</div>` : '<div class="h-3 safe-bottom"></div>')}
    </form>
  </div>`;
  document.body.style.overflow = 'hidden';
  refreshIcons();
  if (window.matchMedia('(min-width: 640px)').matches) {
    const first = $('#modal-form input:not([type=hidden]):not([type=checkbox]):not([type=radio]), #modal-form textarea');
    if (first) first.focus();
  }
}
function closeModal() { $('#modal-root').innerHTML = ''; modalHandler = null; document.body.style.overflow = ''; }
function confirmModal(message, onYes, { title = 'Are you sure?', yesLabel = 'Delete', danger = true } = {}) {
  openModal({ title, body: `<p class="text-slate-600">${message}</p>`, submitLabel: yesLabel, danger, onSubmit: () => { onYes(); } });
}

