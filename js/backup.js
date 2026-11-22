'use strict';
/* ========================= 8. BACKUP / SHARE ========================= */
function backupFile() {
  const payload = { app: 'home-hub', format: 1, exportedAt: new Date().toISOString(), data: exportable() };
  const name = `home-hub-backup-${todayStr()}.json`;
  return { name, blob: new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }) };
}
function exportJSON() {
  const { name, blob } = backupFile();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  toast('Backup downloaded');
}
async function shareJSON() {
  const { name, blob } = backupFile();
  const file = new File([blob], name, { type: 'application/json' });
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: 'Home Hub backup' }); }
    else exportJSON();
  } catch (e) { if (e.name !== 'AbortError') exportJSON(); }
}
function openBackupModal() {
  const sc = state.settings.sync;
  const canShare = !!(navigator.canShare && window.File);
  openModal({
    title: 'Backup / Sync',
    body: `
      <div class="rounded-xl ${sc.enabled ? 'bg-emerald-50 ring-emerald-100' : 'bg-slate-50 ring-slate-200'} ring-1 p-3 flex items-center gap-3">
        ${syncStatusHTML()}
        <p class="text-xs text-slate-600 flex-1">${sc.enabled ? `Live sync is on (Firebase, signed in as ${esc(Auth.email())}). Changes are shared automatically.` : 'Data is saved on this device. Use the buttons below to share with your partner, or set up live sync in Settings.'}</p>
      </div>
      <div class="grid sm:grid-cols-2 gap-3">
        <button type="button" data-action="export-json" class="rounded-2xl ring-1 ring-slate-200 hover:ring-teal-300 p-4 text-left transition">
          <span class="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center mb-2">${icon('download', 'w-5 h-5')}</span>
          <span class="block font-semibold text-slate-800">Export data (JSON)</span><span class="block text-xs text-slate-500 mt-0.5">Download a backup file</span></button>
        <button type="button" data-action="import-json" class="rounded-2xl ring-1 ring-slate-200 hover:ring-teal-300 p-4 text-left transition">
          <span class="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center mb-2">${icon('upload', 'w-5 h-5')}</span>
          <span class="block font-semibold text-slate-800">Import data (JSON)</span><span class="block text-xs text-slate-500 mt-0.5">Load a file from your partner</span></button>
      </div>
      ${canShare ? `<button type="button" data-action="share-json" class="${BTN_GHOST} w-full">${icon('share-2')}Share backup file (WhatsApp, email, AirDrop…)</button>` : ''}
      <div class="flex flex-wrap gap-2 justify-between items-center pt-2 border-t border-slate-100">
        <p class="text-xs text-slate-500">Last change: ${new Date(state.meta.updatedAt).toLocaleString('en-GB')}</p>
        ${sc.enabled ? `<button type="button" data-action="sync-now" class="${BTN_SOFT} !py-1.5">${icon('refresh-cw', 'w-3.5 h-3.5')}Sync now</button>`
          : `<a href="#/settings" data-action="close-modal" class="${BTN_SOFT} !py-1.5">${icon('cloud', 'w-3.5 h-3.5')}Set up live sync</a>`}
      </div>`
  });
}

/** Parse an imported file and ask whether to replace or merge. */
function handleImportFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    let obj;
    try { obj = JSON.parse(reader.result); } catch (e) { toast('That file is not valid JSON', 'error'); return; }
    const data = obj && obj.data ? obj.data : obj;
    if (!data || !Array.isArray(data.tasks) || !Array.isArray(data.people) || !Array.isArray(data.vault)) { toast('This does not look like a Home Hub backup', 'error'); return; }
    const when = obj.exportedAt ? new Date(obj.exportedAt).toLocaleString('en-GB') : 'unknown date';
    openModal({
      title: 'Import backup',
      body: `<p class="text-sm text-slate-600">Backup from <b>${esc(when)}</b> containing ${data.tasks.length} tasks, ${data.people.length} people, ${(data.christmas?.recipients || []).length} Christmas recipients and ${data.vault.length} vault entries.</p>
        <div class="grid gap-3">
          <button type="button" data-action="import-replace" class="rounded-2xl ring-1 ring-slate-200 hover:ring-teal-300 p-4 text-left">
            <span class="font-semibold text-slate-800 flex items-center gap-2">${icon('refresh-cw', 'w-4 h-4 text-teal-600')}Replace my data</span>
            <span class="block text-xs text-slate-500 mt-1">Best when your partner has the latest version. Your current data is overwritten.</span></button>
          <button type="button" data-action="import-merge" class="rounded-2xl ring-1 ring-slate-200 hover:ring-teal-300 p-4 text-left">
            <span class="font-semibold text-slate-800 flex items-center gap-2">${icon('git-merge', 'w-4 h-4 text-sky-600')}Merge with my data</span>
            <span class="block text-xs text-slate-500 mt-1">Adds anything new and keeps the most recently edited version of each item. Deletions are not carried across.</span></button>
        </div>`
    });
    pendingImport = data;
  };
  reader.readAsText(file);
}
let pendingImport = null;
function mergeArrays(local, incoming) {
  const map = new Map(local.map(x => [x.id, x]));
  (incoming || []).forEach(x => {
    if (!x || !x.id) return;
    const cur = map.get(x.id);
    if (!cur || (x.updatedAt || 0) > (cur.updatedAt || 0)) map.set(x.id, x);
  });
  return Array.from(map.values());
}
function applyImport(mode) {
  const data = pendingImport; pendingImport = null;
  if (!data) return;
  if (mode === 'replace') {
    const keep = state.settings;
    state = normalise({ ...clone(data), settings: keep });
  } else {
    const inc = normalise(clone(data));
    state.tasks = mergeArrays(state.tasks, inc.tasks);
    state.checklists = mergeArrays(state.checklists, inc.checklists);
    state.people = mergeArrays(state.people, inc.people);
    state.vault = mergeArrays(state.vault, inc.vault);
    state.vaultCats = mergeArrays(state.vaultCats, inc.vaultCats);
    ['incomes', 'outgoings', 'pots', 'incomeCats', 'outCats'].forEach(k => { state.finance[k] = mergeArrays(state.finance[k], inc.finance[k]); });
    if (inc.christmas.year === state.christmas.year) {
      state.christmas.recipients = mergeArrays(state.christmas.recipients, inc.christmas.recipients);
      if (!state.christmas.budget) state.christmas.budget = inc.christmas.budget;
    }
  }
  ensureCycles();
  closeModal(); commit();
  toast(mode === 'replace' ? 'Data replaced from backup' : 'Backup merged');
}

