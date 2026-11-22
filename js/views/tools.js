'use strict';
/* ---------- 6.7 OTHER TOOLS ---------- */
function renderTools() {
  return `
  <a href="#/settings" class="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 mb-3">${icon('arrow-left')}Settings</a>
  <p class="text-sm text-slate-500 mb-4">Occasional tools, kept out of the main menu.</p>
  <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
    ${TOOLS.map(t => `<a href="#/${t.route}" class="${CARD} p-5 hover:border-teal-300 transition flex flex-col gap-3">
      <div class="flex items-center gap-3"><span class="w-11 h-11 rounded-xl ${t.tone} flex items-center justify-center shrink-0">${icon(t.icon, 'w-5 h-5')}</span><h3 class="font-semibold text-slate-900">${t.title}</h3></div>
      <p class="text-sm text-slate-500">${t.desc}</p>
      <p class="text-xs font-medium text-teal-700 mt-auto">${esc(t.status())}</p></a>`).join('')}
    <div class="rounded-2xl border-2 border-dashed border-slate-200 p-5 flex items-center justify-center text-sm text-slate-400 min-h-[8rem]">More tools coming</div>
  </div>`;
}

