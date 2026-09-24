// Browser port of the laptop feeder's tools/demo-engine.mjs (Mobile repo). Keep both in sync —
// this is the same deterministic classroom state machine, so the website and the laptop feeder
// produce identical Firebase records and can be swapped as the demo session's data producer.
(function (global) {
  'use strict';
  function uuid() {
    if (global.crypto && global.crypto.randomUUID) return global.crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }

  class DemoEngine {
    constructor(previous = {}, now = Date.now()) {
      this.water = Number.isFinite(previous.waterCm) && previous.waterCm >= 0 && previous.waterCm <= 20 ? previous.waterCm : 4;
      this.mode = previous.mode === 'manual' ? 'manual' : 'automatic';
      this.net = previous.net === 'deployed' ? 'deployed' : 'ready';
      this.warning = 10; this.danger = 16;
      this.lastActivityAt = previous.lastActivityAt || now;
      this.deployment = null;
      this.seen = new Set();
      this.outbox = [];
      this.event('SYSTEM', 'Website demo producer connected', 'Simulated 3D data source; hardware is not connected.', 'System', now);
    }
    get tier() { return this.water >= this.danger ? 'DANGER' : this.water >= this.warning ? 'WARNING' : 'NORMAL'; }
    event(severity, title, description, category, now, type = 'STATUS') {
      this.outbox.push({ path: 'events/' + uuid(), value: { severity, title, description, category, type, timestamp: now } });
    }
    waterLevel(value, now = Date.now()) {
      if (!Number.isFinite(value) || value < 0 || value > 20) throw Error('Use a water level from 0 to 20 cm.');
      const old = this.tier; this.water = value;
      if (old !== this.tier) this.event(this.tier, 'Water level: ' + this.tier, `Demo water is ${value.toFixed(1)} cm.`, this.tier === 'DANGER' ? 'Danger' : 'System', now);
      this.automatic(now);
    }
    automatic(now) { if (this.mode === 'automatic' && this.tier === 'DANGER' && this.net === 'ready') this.deploy(null, now); }
    deploy(command, now) {
      this.net = 'deploying'; this.lastActivityAt = now;
      this.deployment = { id: command?.id || uuid(), start: now, command };
      this.event('SYSTEM', 'Demo deployment started', 'Waiting for the five-second demonstration to complete.', 'Net Deployments', now);
    }
    accept(command, uid, now = Date.now()) {
      if (!command || command.status !== 'pending' || this.seen.has(command.id)) return false;
      if (typeof command.id !== 'string' || command.requestedBy !== uid || command.target !== 'simulation'
          || !Number.isFinite(command.createdAt) || command.createdAt > now + 5000
          || !Number.isFinite(command.expiresAt) || command.expiresAt <= now
          || command.expiresAt - command.createdAt > 35000) return false;
      this.seen.add(command.id);
      let error = '';
      if (!['DEPLOY', 'SET_MODE', 'DIAGNOSTIC'].includes(command.type)) error = 'Unsupported request';
      if (typeof command.location !== 'string' || !command.location.trim() || command.location.length > 80) error = 'Invalid demo location';
      if (!['automatic', 'manual'].includes(command.mode)) error = 'Invalid mode';
      if (command.type === 'DEPLOY' && this.net !== 'ready') error = 'Demo net is not ready; a manual repack is required';
      if (error) {
        this.ack(command, 'failed', error, now);
        if (command.type === 'DEPLOY') this.failedDeployment(command, error, now);
        return true;
      }
      if (command.type === 'DEPLOY') { this.ack(command, 'accepted', 'Five-second demo started', now); this.deploy(command, now); }
      else if (command.type === 'SET_MODE') {
        this.mode = command.mode; this.lastActivityAt = now;
        this.ack(command, 'completed', 'Demo mode is now ' + this.mode, now);
        this.event('SYSTEM', 'Mode changed', this.mode, 'System', now); this.automatic(now);
      } else {
        this.ack(command, 'completed', 'Demo heartbeat and state passed; hardware not tested', now);
        this.event('SYSTEM', 'Demo diagnostic completed', 'Website producer and state machine responded. No sensor or motor self-test was performed.', 'System', now, 'DIAGNOSTIC');
      }
      return true;
    }
    ack(command, status, message, now) {
      this.outbox.push({ path: 'command', value: { ...command, status, message, acknowledgedAt: now } });
    }
    discardPrevious(command, now = Date.now()) {
      if (!command || !['pending', 'accepted'].includes(command.status)) return;
      this.seen.add(command.id);
      if (command.expiresAt > now) this.ack(command, 'failed', 'Website producer restarted; send a fresh request after it connects', now);
    }
    failedDeployment(command, error, now) {
      this.outbox.push({ path: 'deployments/' + command.id, value: { timestamp: now, location: command.location || 'Tabletop demo', initiator: 'Manual', status: 'Failed', error } });
      this.event('WARNING', 'Demo request did not complete', error, 'Net Deployments', now);
    }
    tick(now = Date.now()) {
      this.automatic(now);
      if (this.deployment && now - this.deployment.start >= 5000) {
        const d = this.deployment;
        this.net = 'deployed'; this.lastActivityAt = now; this.deployment = null;
        if (d.command && d.command.expiresAt > now) this.ack(d.command, 'completed', 'Simulated net deployed', now);
        this.outbox.push({ path: 'deployments/' + d.id, value: { timestamp: now, location: d.command?.location || 'Tabletop demo', initiator: d.command ? 'Manual' : 'System', status: 'Success', cycleMs: 5000 } });
        this.event('DEPLOYED', 'Simulated net deployed', 'The demo completed; reset represents manual repacking.', 'Net Deployments', now);
      }
    }
    reset(now = Date.now()) {
      if (this.deployment?.command) {
        const error = 'Demo manually reset before completion';
        if (this.deployment.command.expiresAt > now) this.ack(this.deployment.command, 'failed', error, now);
        this.failedDeployment(this.deployment.command, error, now);
      }
      this.deployment = null; this.net = 'ready'; this.water = 4; this.lastActivityAt = now;
      this.event('SYSTEM', 'Demo manually repacked', 'Water returned to 4 cm and the simulated net is ready.', 'System', now);
    }
    telemetry(now = Date.now()) {
      return { schemaVersion: 1, source: 'simulation', waterCm: this.water, warningCm: this.warning, dangerCm: this.danger, net: this.net, mode: this.mode, updatedAt: now, lastActivityAt: this.lastActivityAt };
    }
    drain() { const records = this.outbox; this.outbox = []; return records; }
  }
  global.DemoEngine = DemoEngine;
})(typeof window !== 'undefined' ? window : globalThis);
