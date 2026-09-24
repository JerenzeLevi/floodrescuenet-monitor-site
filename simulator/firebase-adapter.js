// Connects this 3D tabletop simulator to the same Firebase demo session used by the Android
// app, as the DATA_CONTRACT.md "future website adapter". It reuses demo-engine.js — the same
// state machine the laptop feeder (tools/demo-feed.mjs, Mobile repo) runs — so this is a
// drop-in replacement data producer, not a second, divergent implementation.
(function () {
  'use strict';

  // Same Firebase project as app/google-services.json in the Mobile repo. A web apiKey/appId
  // pair is a public client identifier, not a secret — access is enforced by
  // firebase/database.rules.json, not by hiding this config. If sign-in fails with an
  // "API key not valid" / platform-restriction error, add a Web app for this project in
  // Firebase Console -> Project settings -> Your apps -> Add app -> Web, and paste that
  // config here instead of the Android one.
  const CONFIG = {
    apiKey: 'AIzaSyAHsvEMtx3L2FVotbCYE5lm_lsJ7yUUG0A',
    authDomain: 'floodrescue-app.firebaseapp.com',
    databaseURL: 'https://floodrescue-app-default-rtdb.firebaseio.com',
    projectId: 'floodrescue-app'
  };

  let auth, db, uid, root, engine, loopTimer, commandRef;
  let previousWater = 4, lastReadingAt = 0, mirroredMode = null;

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  ready(init);

  function init() {
    const panel = document.getElementById('firebase-panel');
    if (!panel || !window.firebase || !window.DemoEngine) return;
    const emailEl = panel.querySelector('[data-fb-email]');
    const passEl = panel.querySelector('[data-fb-password]');
    const connectBtn = panel.querySelector('[data-fb-connect]');
    const disconnectBtn = panel.querySelector('[data-fb-disconnect]');
    const statusEl = panel.querySelector('[data-fb-status]');
    disconnectBtn.disabled = true;

    if (!firebase.apps.length) firebase.initializeApp(CONFIG);
    auth = firebase.auth();
    db = firebase.database();

    connectBtn.addEventListener('click', () => {
      const email = emailEl.value.trim(), password = passEl.value;
      if (!email || !password) { statusEl.textContent = 'Enter the same email and password used in the Android app.'; return; }
      connectBtn.disabled = true;
      statusEl.textContent = 'Connecting…';
      connect(email, password).then(() => {
        disconnectBtn.disabled = false;
        passEl.value = '';
        setConnectionLabel('Connected to mobile session');
        statusEl.textContent = 'Connected. Publishing telemetry and watching for phone commands.';
      }).catch(err => {
        connectBtn.disabled = false;
        statusEl.textContent = 'Sign-in failed: ' + err.message;
      });
    });

    disconnectBtn.addEventListener('click', () => {
      teardown();
      connectBtn.disabled = false;
      disconnectBtn.disabled = true;
      statusEl.textContent = 'Disconnected. The phone will show stale data after about 15 seconds.';
      setConnectionLabel('Local demo · App not connected');
    });

    hookLocalControls();
  }

  function setConnectionLabel(text) {
    const el = document.querySelector('.connection');
    if (el) el.textContent = text;
  }

  async function connect(email, password) {
    const cred = await auth.signInWithEmailAndPassword(email, password);
    uid = cred.user.uid;
    const verifiedSnap = await db.ref('users/' + uid + '/verified').get();
    if (verifiedSnap.val() !== true) {
      await auth.signOut();
      throw new Error('Account is not approved yet (an administrator must set verified = true).');
    }
    root = 'demoSessions/' + uid;
    const previousTelemetry = (await db.ref(root + '/telemetry').get()).val() || {};
    // Mirrors the laptop feeder: a stopped in-progress demo needs an explicit repack rather
    // than silently resuming mid-deployment.
    const seed = previousTelemetry.net === 'deploying' ? { ...previousTelemetry, net: 'ready' } : previousTelemetry;
    engine = new window.DemoEngine(seed);
    const existingCommand = (await db.ref(root + '/command').get()).val();
    engine.discardPrevious(existingCommand);
    previousWater = engine.water;
    lastReadingAt = 0;
    mirroredMode = engine.mode;
    listenForCommands();
    loopTimer = setInterval(tick, 1000);
    tick();
  }

  function teardown() {
    if (loopTimer) clearInterval(loopTimer);
    loopTimer = null;
    if (commandRef) { commandRef.off(); commandRef = null; }
    engine = null; uid = null; root = null;
    if (auth) auth.signOut().catch(() => {});
  }

  function listenForCommands() {
    commandRef = db.ref(root + '/command');
    commandRef.on('value', snap => {
      if (!engine) return;
      if (engine.accept(snap.val(), uid)) flush();
    });
  }

  function tick() {
    if (!engine) return;
    const now = Date.now();
    engine.tick(now);
    if (now - lastReadingAt >= 2000) {
      engine.outbox.push({
        path: 'readings/' + readingId(),
        value: { timestamp: now, waterCm: engine.water, trend: engine.water > previousWater ? 'RISING' : engine.water < previousWater ? 'FALLING' : 'STEADY' }
      });
      previousWater = engine.water;
      lastReadingAt = now;
    }
    mirrorToScene();
    flush(now);
  }

  function readingId() {
    return (window.crypto && window.crypto.randomUUID) ? window.crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2);
  }

  function flush(now = Date.now()) {
    if (!engine || !root) return;
    const updates = { telemetry: engine.telemetry(now) };
    for (const record of engine.drain()) updates[record.path] = record.value;
    db.ref(root).update(updates).catch(err => console.error('Firebase publish failed:', err.message));
  }

  // Reflect phone-driven state (mode changes, an accepted DEPLOY command) onto the local 3D
  // view by reusing the page's own control handlers in scene.js, instead of duplicating the
  // deployment animation logic here.
  function mirrorToScene() {
    const sim = window.__sim;
    if (!sim || !engine) return;
    if (engine.mode !== mirroredMode) {
      mirroredMode = engine.mode;
      const modeSelect = document.getElementById('mode');
      if (modeSelect && modeSelect.value !== engine.mode) {
        modeSelect.value = engine.mode;
        modeSelect.dispatchEvent(new Event('change'));
      }
    }
    if (engine.net === 'deploying' && sim.net === 'ready') {
      const deployBtn = document.querySelector('[data-action="deploy"]');
      if (deployBtn && !deployBtn.disabled) deployBtn.click();
    }
  }

  // Feed the local tabletop controls into the engine so the same values reach Firebase,
  // the way the laptop feeder's "water"/"reset" commands used to.
  function hookLocalControls() {
    const water = document.getElementById('water');
    if (water) water.addEventListener('input', e => {
      if (!engine) return;
      try { engine.waterLevel(+e.target.value); flush(); } catch (err) { /* ignore transient out-of-range drag values */ }
    });
    const resetBtn = document.querySelector('[data-action="retract"]');
    if (resetBtn) resetBtn.addEventListener('click', () => {
      if (!engine) return;
      engine.reset();
      flush();
    });
  }
})();
