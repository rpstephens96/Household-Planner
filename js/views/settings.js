'use strict';
/* ---------- 6.6 SETTINGS ---------- */
function syncStatusHTML(compact) {
  const s = Sync.status;
  const map = {
    off:     ['cloud-off', 'text-slate-400', 'Local only'],
    connecting: ['refresh-cw', 'text-sky-500 animate-spin', 'Connecting…'],
    live:    ['cloud', 'text-emerald-500', 'Synced'],
    pending: ['refresh-cw', 'text-amber-500', 'Saving…'],
    offline: ['wifi-off', 'text-amber-500', 'Offline – will sync'],
    error:   ['cloud-off', 'text-rose-500', 'Sync error']
  };
  const [i, c, l] = map[s] || map.off;
  return `<span class="inline-flex items-center gap-1.5 text-xs ${compact ? 'text-slate-500 px-2' : 'text-slate-500'}" title="${esc(Sync.message || l)}">${icon(i, 'w-4 h-4 ' + c)}${l}</span>`;
}
function renderSettings() {
  const sc = state.settings.sync;
  const sampleCount = state.tasks.filter(x => x.sample).length + state.checklists.filter(x => x.sample).length + state.people.filter(x => x.sample).length + state.vault.filter(x => x.sample).length + state.christmas.recipients.filter(x => x.sample).length;
  return `
  <div class="grid lg:grid-cols-2 gap-4 items-start">
    <section class="${CARD} p-5">
      <h3 class="font-semibold text-slate-900 flex items-center gap-2 mb-2">${icon('calendar', 'w-5 h-5 text-violet-600')} Upcoming reminders</h3>
      <form data-form="look-ahead" class="space-y-3">
        ${field('Look ahead (days)', inp('days', state.lookAheadDays ?? '', 'type="number" min="1" max="365" step="1" required placeholder="e.g. 60"'), 'Applies to birthdays and renewals for the household. Until set, the original 30 and 60 day windows apply.')}
        <button type="submit" class="${BTN_PRIMARY}">${icon('check')}Save reminder window</button>
      </form>
    </section>
    <section class="${CARD} p-5">
      <h3 class="font-semibold text-slate-900 flex items-center gap-2 mb-3">${icon('user-round-check', 'w-5 h-5 text-teal-600')} Account</h3>
      <div class="flex items-center gap-3">
        ${Auth.user && Auth.user.photoURL ? `<img src="${esc(Auth.user.photoURL)}" alt="" referrerpolicy="no-referrer" class="w-10 h-10 rounded-full">` : `<div class="w-10 h-10 rounded-full ${avatarCls(Auth.email())} flex items-center justify-center text-sm font-semibold">${initials(Auth.user?.displayName || Auth.email())}</div>`}
        <div class="flex-1 min-w-0"><p class="text-sm font-medium text-slate-800 truncate">${esc(Auth.user?.displayName || 'Signed in')}</p><p class="text-xs text-slate-500 truncate">${esc(Auth.email())}</p></div>
        <button type="button" data-action="sign-out" class="${BTN_GHOST}">${icon('log-out')}Sign out</button>
      </div>
      <p class="text-xs text-slate-500 mt-3">${icon('lock', 'w-3.5 h-3.5 inline -mt-0.5')} Access is restricted to ${ALLOWED_EMAILS.length} approved Google accounts by the database Security Rules.</p>
    </section>

    <section class="${CARD} p-5">
      <h3 class="font-semibold text-slate-900 flex items-center gap-2 mb-1">${icon('layout-grid', 'w-5 h-5 text-violet-600')} Other tools</h3>
      <p class="text-sm text-slate-500 mb-4">Occasional tools kept out of the main menu – currently the ${TOOLS.map(t => t.title.toLowerCase()).join(', ')}.</p>
      <a href="#/tools" class="${BTN_SOFT}">${icon('arrow-right')}Open other tools</a>
    </section>

    <section class="${CARD} p-5 lg:row-span-2">
      <div class="flex items-center justify-between mb-1"><h3 class="font-semibold text-slate-900 flex items-center gap-2">${icon('cloud', 'w-5 h-5 text-teal-600')} Live cloud sync</h3>${syncStatusHTML()}</div>
      <p class="text-sm text-slate-500 mb-4">Both phones share one Household ID in your Firebase Realtime Database. Only the approved Google accounts can read or write it.</p>
      <form data-form="sync-settings" class="space-y-4">
        ${field('Household ID', `<div class="flex gap-2">${inp('householdId', sc.householdId, 'placeholder="e.g. home-k3j9x2m1q8vz" pattern="[A-Za-z0-9_-]{6,64}" autocapitalize="off" spellcheck="false"')}<button type="button" data-action="sync-genid" class="${BTN_GHOST} shrink-0">${icon('sparkles')}Generate</button></div>`, 'Use the SAME ID on both phones. 6–64 letters, numbers, - or _.')}
        ${chk('enabled', 'Enable automatic sync on this device', sc.enabled)}
        <div class="flex flex-wrap gap-2">
          <button type="submit" class="${BTN_PRIMARY}">${icon('check')}Save &amp; connect</button>
          ${sc.enabled ? `<button type="button" data-action="sync-now" class="${BTN_GHOST}">${icon('refresh-cw')}Sync now</button>
          <button type="button" data-action="sync-copy-link" class="${BTN_GHOST}">${icon('smartphone')}Copy setup link for partner</button>` : ''}
        </div>
        ${sc.lastSync ? `<p class="text-xs text-slate-500">Last synced ${new Date(sc.lastSync).toLocaleString('en-GB')}</p>` : ''}
        ${Sync.message && Sync.status === 'error' ? `<p class="text-xs text-rose-600">${esc(Sync.message)}</p>` : ''}
      </form>
      <details class="mt-5 rounded-xl bg-slate-50 p-4">
        <summary class="text-sm font-medium text-slate-700 flex items-center justify-between">Required Realtime Database Security Rules<span class="chev transition">${icon('chevron-down')}</span></summary>
        <p class="text-xs text-slate-500 mt-3">Firebase Console → Realtime Database → Rules → paste → Publish.</p>
        <pre class="mt-2 bg-slate-900 text-slate-100 rounded-lg p-3 overflow-x-auto"><code>${esc(RULES_TEXT)}</code></pre>
      </details>
    </section>

    <section class="${CARD} p-5">
      <h3 class="font-semibold text-slate-900 flex items-center gap-2 mb-1">${icon('database', 'w-5 h-5 text-sky-600')} Backup &amp; share</h3>
      <p class="text-sm text-slate-500 mb-4">Data is cached on this device and synced to Firebase. Export a JSON file for an offline backup – store it somewhere private, as it contains your financial details.</p>
      <div class="flex flex-wrap gap-2">
        <button type="button" data-action="export-json" class="${BTN_SOFT}">${icon('download')}Export data (JSON)</button>
        <button type="button" data-action="import-json" class="${BTN_GHOST}">${icon('upload')}Import data (JSON)</button>
      </div>
    </section>

    <section class="${CARD} p-5">
      <h3 class="font-semibold text-slate-900 flex items-center gap-2 mb-1">${icon('sparkles', 'w-5 h-5 text-amber-500')} Sample data &amp; reset</h3>
      <p class="text-sm text-slate-500 mb-4">${sampleCount ? `${sampleCount} sample entries are loaded so you can try every feature.` : 'No sample entries are loaded.'}</p>
      <div class="flex flex-wrap gap-2">
        <button type="button" data-action="clear-sample" class="${BTN_GHOST}" ${sampleCount ? '' : 'disabled style="opacity:.5"'}>${icon('eraser')}Clear sample data</button>
        <button type="button" data-action="load-sample" class="${BTN_GHOST}">${icon('rotate-ccw')}Reload sample data</button>
        <button type="button" data-action="reset-all" class="${BTN_DANGER}">${icon('trash-2')}Erase everything</button>
      </div>
    </section>
  </div>`;
}
