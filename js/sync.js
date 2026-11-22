'use strict';
/* =========================== 9. CLOUD SYNC =========================== */
/* Whole-document, last-write-wins sync. Data is stored as a JSON string so
   Firebase never mangles arrays/empty values. Device-specific sync settings
   (URL, key) are never uploaded. */
const RULES_TEXT = `{
  "rules": {
    ".read": false,
    ".write": false,
    "households": {
      "$householdId": {
        ".read":  "auth != null && auth.token.email_verified == true && (auth.token.email == '${ALLOWED_EMAILS[0] || 'you@gmail.com'}' || auth.token.email == '${ALLOWED_EMAILS[1] || 'partner@gmail.com'}')",
        ".write": "auth != null && auth.token.email_verified == true && (auth.token.email == '${ALLOWED_EMAILS[0] || 'you@gmail.com'}' || auth.token.email == '${ALLOWED_EMAILS[1] || 'partner@gmail.com'}')",
        ".validate": "newData.hasChildren(['payload', 'updatedAt', 'updatedBy']) && $householdId.matches(/^[A-Za-z0-9_-]{6,64}$/)",
        "payload":   { ".validate": "newData.isString() && newData.val().length < 5000000" },
        "updatedAt": { ".validate": "newData.isNumber()" },
        "updatedBy": { ".validate": "newData.isString() && newData.val().length < 200" },
        "$other":    { ".validate": false }
      }
    }
  }
}`;

function friendlyFbError(e) {
  const m = String((e && (e.code || e.message)) || e || '');
  if (/permission[_ -]?denied/i.test(m)) return 'Permission denied – check the Security Rules are published and you are signed in with an approved account.';
  if (/network|unavailable|offline/i.test(m)) return 'Network problem – changes are saved on this device and will sync when back online.';
  return m || 'Unknown sync error';
}

/* Whole-document, last-write-wins sync via the Firebase modular SDK.
   Every read/write is made with the signed-in user's ID token, so the
   Security Rules decide access. Nothing runs until Auth has approved the user. */
const Sync = {
  status: 'off', message: '', unsub: null, unsubConn: null, pushTimer: null, ready: false, connected: true,
  cfg() { return state.settings.sync; },
  householdId() { return String(this.cfg().householdId || '').trim(); },
  enabled() { return !!(window.FB && Auth.user && state && this.cfg().enabled && HOUSEHOLD_ID_RE.test(this.householdId())); },
  nodeRef() { return FB.ref(FB.db, 'households/' + this.householdId()); },
  setStatus(s, msg = '') { this.status = s; this.message = msg; updateSyncIndicators(); },

  start() {
    this.stop();
    if (!this.enabled()) { this.setStatus('off'); ensureCycles(); return; }
    this.setStatus('connecting');
    try {
      // Fires once immediately with the current cloud copy, then on every change
      this.unsub = FB.onValue(this.nodeRef(), snap => this.handleRemote(snap.val()), err => this.setStatus('error', friendlyFbError(err)));
      this.unsubConn = FB.onValue(FB.ref(FB.db, '.info/connected'), snap => {
        this.connected = !!snap.val();
        if (!this.connected && this.ready && this.status !== 'error') this.setStatus('offline');
        else if (this.connected && this.status === 'offline') this.setStatus('live');
      });
    } catch (e) { this.setStatus('error', friendlyFbError(e)); }
  },
  stop() {
    if (this.unsub) { try { this.unsub(); } catch (e) { /* ignore */ } this.unsub = null; }
    if (this.unsubConn) { try { this.unsubConn(); } catch (e) { /* ignore */ } this.unsubConn = null; }
    clearTimeout(this.pushTimer); this.pushTimer = null;
    this.ready = false;
  },

  async pull() {
    if (!this.enabled()) return;
    try { const snap = await FB.get(this.nodeRef()); this.handleRemote(snap.val()); }
    catch (e) { this.setStatus('error', friendlyFbError(e)); }
  },

  handleRemote(rec) {
    this.ready = true;
    if (!rec || !rec.payload) { this.push(); ensureCycles(); return; }   // empty cloud → upload ours
    const remoteAt = Number(rec.updatedAt) || 0, localAt = state.meta.updatedAt || 0;
    if (remoteAt > localAt) {
      try {
        const data = JSON.parse(rec.payload);
        const keep = state.settings;
        state = normalise({ ...data, settings: keep });
        state.meta.updatedAt = remoteAt; state.meta.updatedBy = rec.updatedBy;
        state.settings.sync.lastSync = Date.now();
        persist();
        this.setStatus(this.connected ? 'live' : 'offline');
        scheduleRender();
      } catch (e) { this.setStatus('error', 'Cloud data could not be read'); }
    } else if (remoteAt < localAt) {
      this.push();                                                       // ours is newer
    } else if (this.status !== 'pending') {
      this.setStatus(this.connected ? 'live' : 'offline');
    }
    ensureCycles();   // run birthday roll-over only once we hold the latest data
  },

  schedulePush() {
    if (!this.enabled()) return;
    this.setStatus('pending');
    if (!this.ready) return;                 // first snapshot will decide who wins
    clearTimeout(this.pushTimer);
    this.pushTimer = setTimeout(() => this.push(), 700);
  },

  async push() {
    if (!this.enabled() || !this.ready) return;
    if (!state.meta.updatedAt) { state.meta.updatedAt = Date.now(); persist(); }
    const rec = { payload: JSON.stringify(exportable()), updatedAt: state.meta.updatedAt, updatedBy: Auth.email() || CLIENT_ID };
    this.setStatus('pending');
    try {
      await FB.set(this.nodeRef(), rec);    // resolves once the server has accepted the write
      state.settings.sync.lastSync = Date.now(); persist();
      this.setStatus(this.connected ? 'live' : 'offline');
    } catch (e) { this.setStatus('error', friendlyFbError(e)); }
  }
};

function updateSyncIndicators() {
  const h = $('#sync-indicator-head'), s = $('#sync-indicator-side');
  if (h) h.innerHTML = syncStatusHTML(true);
  if (s) s.innerHTML = syncStatusHTML();
  const a = $('#account-side'); if (a) a.textContent = Auth.email();
  refreshIcons();
}

/** Link that pre-fills the Household ID on the second phone (the partner must still sign in with an approved account). */
function syncSetupLink() {
  return location.href.split('#')[0] + '#sync=' + encodeURIComponent(state.settings.sync.householdId);
}
function checkSyncLink() {
  if (!location.hash.startsWith('#sync=')) return false;
  let raw = decodeURIComponent(location.hash.slice(6)), id = raw;
  try { const old = JSON.parse(decodeURIComponent(escape(atob(raw)))); if (old && old.h) id = old.h; } catch (e) { /* new format */ }
  history.replaceState(null, '', location.pathname + location.search + '#/settings');
  if (!HOUSEHOLD_ID_RE.test(String(id))) { toast('Invalid setup link', 'error'); return false; }
  setTimeout(() => openModal({
    title: 'Connect to household sync?',
    body: `<p class="text-sm text-slate-600">This device will connect to household <code class="bg-slate-100 px-1 rounded">${esc(id)}</code> as <b>${esc(Auth.email())}</b>.</p>
      <p class="text-sm text-slate-600">If the cloud already has data, it will replace the data on this device.</p>`,
    submitLabel: 'Connect',
    onSubmit: () => {
      Object.assign(state.settings.sync, { householdId: id, enabled: true });
      state.meta.updatedAt = 0; // let the cloud copy win on first connect
      persist(); Sync.start(); render(); toast('Connecting to household…');
    }
  }), 50);
  return true;
}

