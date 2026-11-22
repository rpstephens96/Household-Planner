'use strict';
/* ============================ 11. ROUTER & BOOT ============================ */
let focusAfterRender = null, renderDeferred = false, appBooted = false;
const route = () => { const r = (location.hash.match(/^#\/(\w+)/) || [])[1]; return TITLES[r] ? r : 'dashboard'; };

function renderNav(r) {
  if (r === 'tools' || r === 'finance') r = 'settings';   // hidden tools live under Settings
  $('#side-nav').innerHTML = NAV.map(n => `
    <a href="#/${n.id}" class="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${r === n.id ? 'bg-teal-50 text-teal-800' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}">
      ${icon(n.icon, 'w-5 h-5 ' + (r === n.id ? 'text-teal-600' : 'text-slate-400'))}${n.label}</a>`).join('');
  $('#bottom-nav-inner').innerHTML = NAV.filter(n => !n.desktopOnly).map(n => `
    <a href="#/${n.id}" class="flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium ${r === n.id ? 'text-teal-700' : 'text-slate-500'}">
      <span class="w-12 h-7 rounded-full flex items-center justify-center ${r === n.id ? 'bg-teal-50' : ''}">${icon(n.icon, 'w-5 h-5')}</span>${n.label}</a>`).join('');
}

const VIEWS = { dashboard: renderDashboard, tasks: renderTasks, birthdays: renderBirthdays, christmas: renderChristmas, vault: renderVault, settings: renderSettings, tools: renderTools, finance: renderFinance };

function render() {
  renderDeferred = false;
  const r = route();
  $('#page-title').textContent = TITLES[r];
  document.title = `${TITLES[r]} · Home Hub`;
  renderNav(r);
  try { $('#view').innerHTML = `<div class="anim-fade">${VIEWS[r]()}</div>`; }
  catch (err) { console.error(err); $('#view').innerHTML = `<div class="${CARD} p-6 text-rose-700">Something went wrong displaying this page: ${esc(err.message)}. Try Settings → Export, then reload.</div>`; }
  updateSyncIndicators();
  refreshIcons();
  if (focusAfterRender) { const f = $(focusAfterRender); if (f) f.focus({ preventScroll: true }); focusAfterRender = null; }
}

/** For remote sync updates: don't wipe something the user is typing – wait until they leave the field. */
function scheduleRender() {
  const a = document.activeElement;
  if (a && $('#view').contains(a) && /INPUT|TEXTAREA|SELECT/.test(a.tagName)) { renderDeferred = true; return; }
  render();
}
document.addEventListener('focusout', () => { if (appBooted && renderDeferred) setTimeout(() => { if (renderDeferred) scheduleRender(); }, 50); });

window.addEventListener('hashchange', () => { if (!appBooted) return; if (checkSyncLink()) return; if (route() !== 'finance') csvSession = null; render(); window.scrollTo({ top: 0 }); });
document.addEventListener('visibilitychange', () => {
  if (!appBooted || document.visibilityState !== 'visible') return;
  if (Sync.enabled()) Sync.pull(); else ensureCycles();
  render();
});
window.addEventListener('storage', e => { if (appBooted && e.key === STORE_KEY && e.newValue) { state = normalise(JSON.parse(e.newValue)); scheduleRender(); } }); // other tabs

/* ---------- Authentication gate ----------
   The Firebase module calls Auth.onUser() from onAuthStateChanged.
   The app shell stays hidden, and no data is loaded, rendered or synced, until the
   signed-in Google account is verified AND on the allow-list. The real enforcement
   is server-side in the Security Rules; this is the matching client-side gate. */
const Auth = {
  user: null, deniedEmail: null, busy: false,
  email() { return this.user ? String(this.user.email || '').toLowerCase() : ''; },
  isAllowed(u) { return !!(u && u.emailVerified && ALLOWED_EMAILS.includes(String(u.email || '').toLowerCase())); },

  async onUser(u) {
    if (!u) {
      this.user = null; lockApp();
      if (this.deniedEmail) { renderGate('denied', this.deniedEmail); this.deniedEmail = null; }
      else renderGate('signin');
      return;
    }
    if (!this.isAllowed(u)) {
      this.user = null; this.deniedEmail = u.email || 'this account';
      lockApp(); renderGate('denied', this.deniedEmail);
      try { await FB.signOut(); } catch (e) { /* ignore */ }
      return;
    }
    this.user = u; this.deniedEmail = null;
    bootApp();
  },

  async signIn() {
    if (this.busy) return;
    if (!window.FB) { renderGate('error', 'Sign-in is still loading – check your connection and try again.'); return; }
    this.busy = true; renderGate('signin', null, true);
    try { await FB.signIn(); }
    catch (e) {
      const code = e && e.code || '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') renderGate('signin');
      else if (code === 'auth/unauthorized-domain') renderGate('error', `This web address (${location.hostname}) is not in Firebase → Authentication → Settings → Authorized domains.`);
      else renderGate('error', (e && e.message) || 'Sign-in failed');
    } finally { this.busy = false; }
  },

  confirmSignOut() {
    const synced = !!(state && Sync.enabled() && state.settings.sync.lastSync);
    openModal({
      title: 'Sign out?', submitLabel: 'Sign out',
      body: `<p class="text-sm text-slate-600">You are signed in as <b>${esc(this.email())}</b>.</p>
        ${chk('wipe', 'Also remove the cached copy from this device', synced, synced ? 'Recommended on shared devices. Your data stays safe in Firebase and reloads when you sign in again.' : '<span class="text-rose-600">Not synced to the cloud – removing it would delete your only copy. Export a backup first.</span>')}`,
      onSubmit: fd => { this.signOut(fd.get('wipe') === 'on'); }
    });
  },

  async signOut(wipe) {
    Sync.stop();
    if (wipe && state) {
      // keep only the device's sync settings; meta.updatedAt 0 so the cloud copy wins on next sign-in
      localStorage.setItem(STORE_KEY, JSON.stringify({ tasks: [], checklists: [], people: [], vault: [], settings: state.settings, meta: { updatedAt: 0 } }));
    }
    try { await FB.signOut(); } catch (e) { toast('Sign-out failed: ' + e.message, 'error'); }
  }
};

function showShell(on) {
  const shell = $('#app-shell'), gate = $('#auth-gate');
  shell.classList.toggle('hidden', !on); shell.setAttribute('aria-hidden', on ? 'false' : 'true');
  gate.classList.toggle('hidden', on);
}
function lockApp() {
  Sync.stop();
  closeModal();
  appBooted = false; renderDeferred = false;
  state = undefined;                               // drop data from memory
  csvSession = null;
  $('#view').innerHTML = '';
  showShell(false);
}
function bootApp() {
  if (appBooted) { render(); return; }            // already running for this user
  state = load();                                  // local cache first (instant), cloud copy follows
  appBooted = true;
  showShell(true);
  checkSyncLink();
  render();
  Sync.start();                                    // runs ensureCycles once it has the latest data
}

function renderGate(mode, detail, busy) {
  const gate = $('#auth-gate');
  gate.classList.remove('hidden');
  const googleBtn = `<button type="button" data-action="sign-in" ${busy ? 'disabled' : ''} class="w-full inline-flex items-center justify-center gap-3 rounded-xl bg-white hover:bg-slate-50 ring-1 ring-slate-300 px-4 py-3 text-sm font-semibold text-slate-800 shadow-sm transition active:scale-[.98] disabled:opacity-60">
      <svg class="w-5 h-5" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
      ${busy ? 'Waiting for Google…' : 'Sign in with Google'}</button>`;
  const panels = {
    loading: `<div class="flex items-center justify-center gap-2 text-sm text-slate-500 py-3">${icon('loader-circle', 'w-4 h-4 animate-spin')}Checking sign-in…</div>`,
    signin: `${googleBtn}<p class="text-xs text-slate-500 text-center mt-4">${icon('lock', 'w-3.5 h-3.5 inline -mt-0.5')} Private household app – only approved Google accounts can access it.</p>`,
    denied: `<div class="rounded-xl bg-rose-50 ring-1 ring-rose-200 p-4 mb-4 text-left">
        <p class="font-semibold text-rose-800 flex items-center gap-2">${icon('shield-x', 'w-5 h-5')}Access denied</p>
        <p class="text-sm text-rose-700 mt-1"><b>${esc(detail || '')}</b> is not authorised to use this app and has been signed out.</p></div>
      ${googleBtn}<p class="text-xs text-slate-500 text-center mt-3">Choose a different Google account.</p>`,
    config: `<div class="rounded-xl bg-amber-50 ring-1 ring-amber-200 p-4 text-left text-sm text-amber-900">
        <p class="font-semibold flex items-center gap-2">${icon('settings', 'w-4 h-4')}Firebase not configured</p>
        <p class="mt-1">Edit <code>window.HOMEHUB_CONFIG</code> in <code>js/config.js</code> and paste your Firebase web app config.</p></div>`,
    error: `<div class="rounded-xl bg-rose-50 ring-1 ring-rose-200 p-4 mb-4 text-left text-sm text-rose-800">
        <p class="font-semibold flex items-center gap-2">${icon('triangle-alert', 'w-4 h-4')}Sign-in problem</p><p class="mt-1">${esc(detail || '')}</p></div>${window.FB ? googleBtn : ''}`
  };
  gate.innerHTML = `<div class="w-full max-w-sm anim-up">
    <div class="bg-white rounded-3xl shadow-xl shadow-slate-200/60 ring-1 ring-slate-200/70 p-7 text-center">
      <div class="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white flex items-center justify-center shadow-sm mb-4">${icon('house', 'w-7 h-7')}</div>
      <h1 class="text-xl font-bold text-slate-900">Home Hub</h1>
      <p class="text-sm text-slate-500 mt-1 mb-6">Household organiser</p>
      ${panels[mode] || panels.loading}
    </div></div>`;
  refreshIcons();
}

// Boot: show the gate; the Firebase module takes over from here.
renderGate('loading');
if (!CFG.firebase || !CFG.firebase.apiKey || /PASTE_/.test(CFG.firebase.apiKey) || !CFG.firebase.databaseURL || /your-project/.test(CFG.firebase.databaseURL)) {
  renderGate('config');
} else {
  setTimeout(() => { if (!window.FB) renderGate('error', 'Could not load Firebase sign-in. Check your internet connection (or any content blocker) and reload the page.'); }, 12000);
}
