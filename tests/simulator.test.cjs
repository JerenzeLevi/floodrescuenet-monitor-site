/* Run with Node 18+; no package installation required. */
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const home = read('index.html');
const page = read('simulator/index.html');
const config = JSON.parse(read('vercel.json'));
const Simulation = require('../simulator/controller.js');
const { sample } = require('../simulator/net-geometry.js');
const origin = 'https://example.test';
const hrefs = html => Array.from(html.matchAll(/\bhref="([^"]+)"/g), m => m[1]);
const nav = (html, label) => html.match(new RegExp('<nav[^>]+aria-label="' + label + '"[^>]*>([\\s\\S]*?)</nav>'))?.[1];
function servedFile(url) {
  let name = url.pathname;
  const rewrite = config.rewrites.find(rule => rule.source === name);
  if (rewrite) name = rewrite.destination;
  if (name.endsWith('/')) name += 'index.html';
  return path.join(root, name);
}

test('home and simulator menus share valid destinations, including mobile', () => {
  const expected = ['/#about', '/#features', '/#how', '/simulator/', '/#team', '/#support'];
  for (const html of [home, page]) {
    for (const label of ['Main navigation', 'Mobile navigation']) {
      const content = nav(html, label);
      assert.ok(content, label);
      assert.deepEqual(hrefs(content), expected);
      for (const href of hrefs(content)) {
        const url = new URL(href, origin);
        assert.ok(fs.existsSync(servedFile(url)), href);
        if (url.hash) assert.ok(home.includes('id="' + url.hash.slice(1) + '"'), href);
      }
    }
  }
  for (const label of ['Main navigation', 'Mobile navigation']) {
    assert.match(nav(page, label), /href="\/simulator\/" aria-current="page"/);
  }
  assert.match(home.match(/<div class="hero-cta">([\s\S]*?)<\/div>/)[1], /href="\/simulator\/"/);
  assert.match(home.split('<footer')[1], /href="\/simulator\/"/);
});

test('all simulator entry URLs and asset URLs resolve to the intended files', () => {
  const assets = Array.from(page.matchAll(/<(?:script|link|img)\b[^>]*\b(?:src|href)="([^"]+)"/g), m => m[1]);
  for (const route of ['/simulator', '/simulator/', '/simulator/index.html']) {
    assert.equal(servedFile(new URL(route, origin)), path.join(root, 'simulator/index.html'));
    for (const asset of assets) {
      const url = new URL(asset, origin + route);
      if (url.origin === origin) assert.ok(fs.existsSync(servedFile(url)), route + ': ' + asset);
      else assert.ok(['fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname), asset);
    }
  }
});

test('scripts comply with the existing same-origin content security policy', () => {
  const csp = config.headers[0].headers.find(header => header.key === 'Content-Security-Policy').value;
  assert.match(csp, /script-src 'self';/);
  assert.match(csp, /connect-src 'self';/);
  assert.match(csp, /frame-ancestors 'none';/);
  for (const html of [home, page]) {
    assert.doesNotMatch(html, /\son\w+\s*=\s*["']/i);
    for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
      assert.equal(match[2].trim(), '', 'No inline script');
      const src = match[1].match(/src="([^"]+)"/)?.[1];
      assert.ok(src, 'Script has an external file');
      const url = new URL(src, origin + '/');
      assert.equal(url.origin, origin);
      new vm.Script(fs.readFileSync(servedFile(url), 'utf8'), { filename: src });
    }
  }
  const scriptOrder = Array.from(page.matchAll(/<script[^>]+src="([^"]+)"/g), m => m[1].split('?')[0]);
  assert.ok(scriptOrder.indexOf('/simulator/three.min.js') < scriptOrder.indexOf('/simulator/scene.js'));
  assert.ok(scriptOrder.indexOf('/simulator/controller.js') < scriptOrder.indexOf('/simulator/scene.js'));
  assert.ok(scriptOrder.indexOf('/simulator/net-geometry.js') < scriptOrder.indexOf('/simulator/model.js'));
});

test('mobile menu closes on selection, outside click and Escape, restoring keyboard focus', () => {
  const documentHandlers = {};
  const linkHandlers = {};
  let focused = false;
  const link = { addEventListener: (type, fn) => { linkHandlers[type] = fn; } };
  const menu = {
    open: true,
    querySelectorAll: () => [link],
    querySelector: () => ({ focus: () => { focused = true; } }),
    contains: target => target === link
  };
  const document = {
    querySelectorAll: () => [menu],
    addEventListener: (type, fn) => { documentHandlers[type] = fn; }
  };
  vm.runInNewContext(read('js/navigation.js'), { document });
  linkHandlers.click();
  assert.equal(menu.open, false);
  menu.open = true;
  documentHandlers.click({ target: link });
  assert.equal(menu.open, true);
  documentHandlers.click({ target: {} });
  assert.equal(menu.open, false);
  menu.open = true;
  documentHandlers.keydown({ key: 'Escape' });
  assert.equal(menu.open, false);
  assert.equal(focused, true);
});

test('automatic deployment stays deployed after water falls until a manual reset', () => {
  const sim = new Simulation();
  sim.setWater(10);
  assert.equal(sim.level, 'WARNING');
  assert.equal(sim.net, 'ready');
  sim.setWater(16);
  assert.equal(sim.net, 'deploying');
  assert.equal(sim.deploy(), false, 'Duplicate commands do not restart deployment');
  for (let i = 0; i < 51; i++) sim.tick(0.1);
  assert.equal(sim.net, 'deployed');
  assert.equal(sim.progress, 1);
  sim.setWater(4);
  assert.equal(sim.net, 'deployed');
  sim.reset();
  assert.equal(sim.net, 'ready');
  assert.equal(sim.progress, 0);
  assert.equal(sim.water, 4);
  assert.equal(sim.snapshot().appConnected, false);
});

test('manual mode waits for a command and invalid thresholds preserve prior settings', () => {
  const sim = new Simulation();
  sim.setMode('manual');
  sim.setWater(20);
  assert.equal(sim.net, 'ready');
  assert.equal(sim.deploy(), true);
  const thresholds = [sim.warning, sim.danger];
  for (const pair of [[0, 16], [16, 10], [10, 21], [NaN, 16]]) {
    assert.throws(() => sim.setThresholds(...pair));
    assert.deepEqual([sim.warning, sim.danger], thresholds);
  }
  for (const value of [-1, 21, NaN]) assert.throws(() => sim.setWater(value));
});

test('net geometry is finite throughout deployment and completely leaves storage', () => {
  for (const progress of [0, 0.1, 0.5, 0.79, 0.8, 0.9, 1]) {
    const shape = sample(progress);
    for (const field of ['net', 'hem', 'stored', 'weights', 'ties']) {
      assert.ok(shape[field].every(point => point.length === 3 && point.every(Number.isFinite)), field);
    }
  }
  const packed = sample(0);
  assert.equal(packed.net.length, 0);
  assert.ok(packed.stored.length > 0);
  const deployed = sample(1);
  assert.equal(deployed.stored.length, 0);
  assert.equal(deployed.advance, 28);
  assert.ok(deployed.weights.every(point => Math.abs(point[1] - 7) < 1e-6));
});
