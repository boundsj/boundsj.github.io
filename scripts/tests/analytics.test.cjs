// Execute the shipped snippet and event layer with a recording gtag boundary.
// No browser, network, or third-party tag code is involved.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../..');
const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
const snippet = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)]
  .map(m => m[1]).find(s => s.includes('boundsAnalyticsLive'));
assert.ok(snippet, 'production HTML must include the guarded analytics snippet');

function analytics(url, referrer = '') {
  const handlers = {};
  const location = new URL(url);
  const document = {
    referrer, body: { getAttribute: () => 'home' },
    documentElement: { dataset: { theme: 'light' } },
    createElement: () => ({}), head: { appendChild() {} },
    addEventListener(name, fn) { handlers[name] = fn; },
  };
  const history = { state: null, replaceState(_state, _title, relative) {
    location.href = new URL(relative, location).href;
  } };
  const context = vm.createContext({ URL, URLSearchParams, document, location, history, navigator: {} });
  context.window = context;
  vm.runInContext(snippet, context);
  return { context, handlers };
}

function payloads(context) {
  return Array.from(context.dataLayer, args => Array.from(args));
}

test('page payloads strip search/query, fragments and email-bearing campaigns', () => {
  const { context } = analytics(
    'https://www.bounds.dev/?q=jane%40example.com&email=jane@example.com&utm_campaign=jane%40example.com#private',
    'https://www.bounds.dev/posts/example/?email=jane@example.com#private');
  const calls = payloads(context);
  const config = calls.find(c => c[0] === 'config');
  assert.ok(config, 'record a real config call');
  assert.equal(config[2].page_location, 'https://www.bounds.dev/');
  assert.equal(config[2].page_referrer, 'https://www.bounds.dev/posts/example/');
  assert.doesNotMatch(JSON.stringify(calls), /jane|example\.com|%40|[?@#]/i);
});

test('safe campaign attribution survives and cross-site referrer loses path/query', () => {
  const { context } = analytics(
    'https://www.bounds.dev/?utm_source=newsletter&q=private#private',
    'https://referrer.invalid/private?email=jane@example.com#private');
  const config = payloads(context).find(c => c[0] === 'config')[2];
  assert.equal(config.page_location, 'https://www.bounds.dev/?utm_source=newsletter');
  assert.equal(config.page_referrer, 'https://referrer.invalid/');
});

test('event payloads omit mail addresses and outbound query/fragment', () => {
  const { context, handlers } = analytics('https://www.bounds.dev/');
  vm.runInContext(fs.readFileSync(path.join(root, 'themes/bounds-ascii/assets/js/analytics.js'), 'utf8'), context);
  function click(href) {
    const link = {
      href, dataset: {}, getAttribute: () => href, hasAttribute: () => false,
      closest: () => null,
    };
    handlers.click({ target: { closest: () => link }, button: 0 });
  }
  click('mailto:jane@example.com');
  click('https://destination.invalid/article/?email=jane@example.com#private');
  const events = payloads(context).filter(c => c[0] === 'event');
  assert.deepEqual(events.map(c => c[1]), ['email_click', 'outbound_click']);
  assert.equal(events[1][2].link_path, '/article/');
  assert.doesNotMatch(JSON.stringify(events), /jane|example\.com|%40|[?@#]/i);
});
