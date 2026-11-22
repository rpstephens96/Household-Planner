  import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
  import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult,
           onAuthStateChanged, signOut, setPersistence, browserLocalPersistence } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
  import { getDatabase, ref, onValue, set, get } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js';

  const cfg = (window.HOMEHUB_CONFIG || {}).firebase || {};
  if (cfg.apiKey && !/PASTE_/.test(cfg.apiKey)) {
    try {
      const app  = initializeApp(cfg);
      const auth = getAuth(app);
      const db   = getDatabase(app);
      await setPersistence(auth, browserLocalPersistence).catch(() => {});   // stay signed in on this device

      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });           // always let you pick the account

      window.FB = {
        db, ref, onValue, set, get,
        async signIn() {
          try { await signInWithPopup(auth, provider); }
          catch (e) {
            // Some in-app/standalone browsers block pop-ups – fall back to a full-page redirect
            if (e && (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment')) return signInWithRedirect(auth, provider);
            throw e;
          }
        },
        signOut: () => signOut(auth)
      };

      getRedirectResult(auth).catch(e => renderGate('error', e.message));
      onAuthStateChanged(auth, user => Auth.onUser(user));
    } catch (e) {
      renderGate('error', 'Firebase failed to start: ' + e.message);
    }
  }
