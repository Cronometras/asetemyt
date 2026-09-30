import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const exports = {};
runInNewContext(ts.transpileModule(readFileSync('src/lib/comparison.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports });

function page({ fail = false } = {}) {
  const elements = new Map();
  const element = id => {
    if (!elements.has(id)) {
      const classes = new Set(id === 'comparison-result' ? ['hidden'] : []);
      elements.set(id, { value: '', innerHTML: '', dataset: {}, listeners: {},
        classList: { add: c => classes.add(c), remove: c => classes.delete(c), contains: c => classes.has(c) },
        addEventListener(event, callback) { (this.listeners[event] ||= []).push(callback); },
        scrollIntoView() {},
      });
    }
    return elements.get(id);
  };
  const chips = ['all', 'mtm'].map(id => { const chip = element('filter-' + id); chip.dataset.filter = id; return chip; });
  const windowEvents = {};
  let requests = 0;
  const alerts = [];
  const data = { software: [
    { name: '<img src=x onerror=alert(1)>', slug: 'a', methods: ['MTM'], features: ['<script>bad()</script>'], freeTrial: 'No' },
    { name: 'Beta', slug: 'b', methods: ['Lean'], features: [], freeTrial: true },
  ] };
  const source = readFileSync('src/pages/comparador.astro', 'utf8').match(/<script>([\s\S]*?)<\/script>/)[1]
    .replace(/^\s*import .*;$/gm, '');
  runInNewContext(ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, {
    escapeHtml: exports.escapeComparisonText, trialAvailable: exports.trialAvailable,
    uniqueComparisonSlugs: exports.uniqueComparisonSlugs, t: (key, lang) => lang + ':' + key, getLang: () => 'es',
    document: { getElementById: element, querySelectorAll: selector => selector === '.filter-chip' ? chips : [] },
    window: { addEventListener: (name, callback) => { windowEvents[name] = callback; } },
    fetch: async () => { requests++; return { ok: !fail, json: async () => data }; },
    alert: value => alerts.push(value), console: { error() {} },
  });
  return { element, windowEvents, alerts, requests: () => requests,
    click: id => element(id).listeners.click.forEach(fn => fn()),
    ready: () => new Promise(resolve => setImmediate(resolve)) };
}

test('language changes preserve filters and selections without fetching or adding handlers', async () => {
  const ui = page(); await ui.ready();
  ui.element('select-1').value = 'a'; ui.element('select-2').value = 'b';
  ui.click('filter-mtm'); ui.click('compare-btn');
  for (const detail of ['en', 'es', 'en']) ui.windowEvents.langChange({ detail });
  assert.equal(ui.requests(), 1);
  assert.equal(ui.element('select-1').value, 'a');
  assert.equal(ui.element('select-2').value, 'b');
  assert.equal(ui.element('compare-btn').listeners.click.length, 1);
  assert.equal(ui.element('filter-mtm').listeners.click.length, 1);
  assert.doesNotMatch(ui.element('software-grid').innerHTML, /Beta/);
  assert.match(ui.element('comp-thead').innerHTML, /en:characteristic/);
  assert.match(ui.element('software-grid').innerHTML, /&lt;img/);
  assert.doesNotMatch(ui.element('software-grid').innerHTML, /<img|<script|trialAvail/);
  assert.doesNotMatch(ui.element('comp-tbody').innerHTML, /<script>/);
});

test('comparing the same tool twice requires another distinct tool', async () => {
  const ui = page(); await ui.ready();
  ui.element('select-1').value = 'a'; ui.element('select-2').value = 'a';
  ui.click('compare-btn');
  assert.equal(ui.alerts.length, 1);
  assert.equal(ui.element('comparison-result').classList.contains('hidden'), true);
});

test('failed data loading replaces the spinner with a visible error', async () => {
  const ui = page({ fail: true }); await ui.ready();
  ui.windowEvents.langChange({ detail: 'en' });
  assert.match(ui.element('software-grid').innerHTML, /role="alert"/);
});

test('trial flags distinguish negative text from available demos', () => {
  for (const value of [false, undefined, '', ' No ', 'false', 'No disponible']) assert.equal(exports.trialAvailable(value), false);
  for (const value of [true, 'Sí', 'Demo bajo solicitud']) assert.equal(exports.trialAvailable(value), true);
});
