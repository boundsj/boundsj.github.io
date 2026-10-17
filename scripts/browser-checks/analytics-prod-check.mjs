// Production payload check: the real gtag.js runs against the production build served as
// https://www.bounds.dev from disk. Every collect request is recorded and ABORTED (never sent),
// and navigator.sendBeacon is stubbed as a second guard. Asserts sanitized locations/referrers.
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
const root = process.argv[2] || "./public";
const exe = process.env.CHROME || undefined; // default: Playwright's bundled Chromium
const browser = await chromium.launch({ executablePath: exe });
let fails = 0; const ok = (c, m) => { console.log(`${c ? "PASS" : "FAIL"} ${m}`); if (!c) fails++; };
const types = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".webp": "image/webp", ".png": "image/png", ".jpeg": "image/jpeg", ".jpg": "image/jpeg", ".gif": "image/gif", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".xml": "application/xml", ".mp4": "video/mp4" };
const hits = [], blocked = [], beacons = [];

async function newContext(host) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  // Beacons never leave the page: the stub decodes the body and hands it to Node through a
  // context binding, so evidence survives navigation and context closure.
  await ctx.exposeBinding("__recordBeacon", (_source, url, body) => { beacons.push({ url, body }); });
  await ctx.addInitScript(() => {
    navigator.sendBeacon = function (url, data) {
      const send = (text) => window.__recordBeacon(String(url), text);
      if (data == null) send("");
      else if (typeof data === "string") send(data);
      else if (data instanceof URLSearchParams) send(data.toString());
      else if (data instanceof Blob) data.text().then(send);
      else if (data instanceof ArrayBuffer || ArrayBuffer.isView(data)) send(new TextDecoder().decode(data));
      else if (data instanceof FormData) send(new URLSearchParams(data).toString());
      else send(String(data));
      return true;
    };
  });
  await ctx.route("**/*", async (route) => {
    const req = route.request(); const url = new URL(req.url());
    if (url.origin === host) {
      let file = path.join(root, decodeURIComponent(url.pathname));
      if (file.endsWith("/")) file = path.join(file, "index.html");
      if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
      if (!fs.existsSync(file)) return route.fulfill({ status: 404, contentType: "text/html", body: fs.readFileSync(path.join(root, "404.html")) });
      return route.fulfill({ status: 200, contentType: types[path.extname(file)] || "application/octet-stream", body: fs.readFileSync(file) });
    }
    if (url.hostname === "www.googletagmanager.com" && url.pathname === "/gtag/js") return route.continue(); // GET the public library only
    if (/google-analytics\.com|analytics\.google\.com|google\.com\/g\/collect|googletagmanager/.test(req.url())) {
      hits.push({ url: req.url(), body: req.postData() || "" });
    } else blocked.push(req.url());
    return route.abort(); // nothing leaves the browser
  });
  return ctx;
}

// ---- On the real host
const ctx = await newContext("https://www.bounds.dev");
const p = await ctx.newPage();
await p.goto("https://www.bounds.dev/?utm_source=newsletter&utm_medium=email&q=jane%40example.com&email=jane@example.com#top", { waitUntil: "load" });
await p.waitForTimeout(2500);
ok(await p.evaluate(() => location.search === "?utm_source=newsletter&utm_medium=email" && location.hash === "#top"), "address bar keeps only utm_* (and the fragment)");
ok(await p.evaluate(() => window.boundsAnalyticsLive === true), "analytics live on www.bounds.dev");
await p.locator('[data-theme-mode="amber"]').click();
await p.waitForTimeout(400);
await p.locator('.kc-nav a[data-nav="photos"]').click();
await p.waitForLoadState("load"); await p.waitForTimeout(2000);
await p.goto("https://www.bounds.dev/no/such/jane@example.com/?q=jane%40example.com&s=jane@example.com", { waitUntil: "load" });
await p.waitForTimeout(2000);
await p.locator('.kc-404__actions a[data-nav="writing"]').click();
await p.waitForLoadState("load"); await p.waitForTimeout(2000);
await p.goto("https://www.bounds.dev/posts/t3-fleet-gateway/?search=jane%40example.com&utm_source=jane%40example.com#frag", { waitUntil: "load" });
for (let i = 0; i < 12; i++) { await p.mouse.wheel(0, 900); await p.waitForTimeout(100); }
await p.waitForTimeout(500);
await p.goto("https://www.bounds.dev/about/", { waitUntil: "load" }); // unload flushes queued events
await p.waitForTimeout(2500);
await ctx.close();

// Decode every hit (URL params + one event per body line).
const events = [];
for (const h of hits.concat(beacons)) {
  let u; try { u = new URL(h.url); } catch (e) { continue; }
  const shared = Object.fromEntries(u.searchParams);
  const lines = h.body ? h.body.split("\n").filter(Boolean) : [""];
  for (const line of lines) events.push({ ...shared, ...Object.fromEntries(new URLSearchParams(line)) });
}
const collect = events.filter((e) => e.en);
console.log(`intercepted ${hits.length} GA requests, ${beacons.length} beacons, ${collect.length} events: ${[...new Set(collect.map((e) => e.en))].join(", ")}`);
ok(collect.length > 0, "gtag ran and its hits were intercepted");
ok(collect.every((e) => e.tid === "G-LT0HKHY2J5"), "measurement id");
const leaks = (list) => /jane|example\.com|%40|@/i.test(JSON.stringify(list));
ok(!leaks(collect), "no email/PII anywhere in payloads");
ok(!collect.some((e) => e.en === "view_search_results" || e["ep.search_term"]), "no site-search event or search_term from the query");
ok(collect.every((e) => !/#/.test(e.dl || "") && !/[?&](?!utm_)[^=&]+=/.test(e.dl || "")), "page_location has no fragment and no non-utm query");
ok(collect.some((e) => e.dl === "https://www.bounds.dev/?utm_source=newsletter&utm_medium=email"), "utm_* campaign parameters survive for attribution");
ok(collect.every((e) => !e.dr || !/[?#@]/.test(e.dr)), "no query string or PII in page_referrer");
const pv = collect.filter((e) => e.en === "page_view");
ok(pv.some((e) => /^https:\/\/www\.bounds\.dev\/(\?utm_|$)/.test(e.dl) && e["ep.content_group"] === "home"), "home page_view with content_group=home");
ok(pv.some((e) => e.dl === "https://www.bounds.dev/404.html" && e.dt === "404"), "404 page_view uses the fixed /404.html location");
ok(pv.some((e) => e.dl === "https://www.bounds.dev/writing/" && e.dr === "https://www.bounds.dev/"), "page after 404 has an origin-only referrer");
ok(pv.some((e) => e.dl === "https://www.bounds.dev/photos/" && e.dr === "https://www.bounds.dev/" && e["ep.content_group"] === "photos"), "same-site referrer is origin+path");
ok(collect.some((e) => e.en === "theme_change" && e["ep.theme_to"] === "amber"), "theme_change sent with theme_to");
ok(collect.some((e) => e["up.site_theme"] === "amber"), "site_theme user property updated");
ok(collect.some((e) => e.en === "nav_click" && e["ep.nav_item"] === "photos" && e["ep.ui_location"] === "header"), "nav_click sent");
ok(collect.some((e) => e.en === "read_progress" && e["epn.percent"] === "100"), "read_progress sent with numeric percent");
ok(collect.some((e) => e.en === "page_not_found"), "page_not_found sent");

// ---- System appearance change (no saved theme): the next hit carries the new site_theme.
{
  const start = hits.length + beacons.length;
  const c = await newContext("https://www.bounds.dev");
  const sp = await c.newPage();
  await sp.emulateMedia({ colorScheme: "light" });
  await sp.goto("https://www.bounds.dev/writing/", { waitUntil: "load" });
  await sp.waitForTimeout(2000);
  await sp.emulateMedia({ colorScheme: "dark" });
  await sp.waitForTimeout(300);
  await sp.locator(".kc-status__top").click();
  await sp.waitForTimeout(2500);
  await sp.goto("https://www.bounds.dev/about/", { waitUntil: "load" });
  await sp.waitForTimeout(1500);
  await c.close();
  const evs = [];
  for (const h of hits.concat(beacons).slice(start)) {
    let u; try { u = new URL(h.url); } catch (e) { continue; }
    const shared = Object.fromEntries(u.searchParams);
    for (const line of (h.body ? h.body.split("\n").filter(Boolean) : [""])) evs.push({ ...shared, ...Object.fromEntries(new URLSearchParams(line)) });
  }
  const top = evs.find((e) => e.en === "nav_click" && e["ep.nav_item"] === "top");
  ok(top && evs.some((e) => e["up.site_theme"] === "dark"), `system switch to dark updates site_theme (${top ? "nav_click seen" : "no nav_click"})`);
}

// ---- Self-test: the PII scan must catch an unsafe beacon recorded through the same path.
{
  const before = beacons.length;
  const c = await newContext("https://www.bounds.dev");
  const sp = await c.newPage();
  await sp.goto("https://www.bounds.dev/about/", { waitUntil: "load" });
  await sp.evaluate(() => navigator.sendBeacon("https://region1.google-analytics.com/g/collect?v=2", new Blob(["en=probe&ep.x=jane%40example.com"])));
  await sp.waitForTimeout(300);
  await c.close();
  const probe = beacons.slice(before);
  ok(probe.length === 1 && leaks(probe), "self-test: an unsafe beacon is recorded across contexts and flagged");
  beacons.length = before;
}

// ---- Same production build on another host: nothing may load
hits.length = 0;
const ctx2 = await newContext("http://127.0.0.1:8999");
const p2 = await ctx2.newPage();
const gtm = []; p2.on("request", (r) => { if (/googletagmanager|google-analytics|analytics\.google/.test(r.url())) gtm.push(r.url()); });
await p2.goto("http://127.0.0.1:8999/", { waitUntil: "load" });
await p2.locator('[data-theme-mode="dark"]').click();
await p2.waitForTimeout(1500);
ok(gtm.length === 0 && hits.length === 0, `off-host production build requests nothing from Google (${gtm.length})`);
ok(await p2.evaluate(() => window.boundsAnalyticsLive !== true && window.__boundsAnalytics.some((e) => e.name === "theme_change")), "off-host runs in dev mode (events logged locally)");
await ctx2.close();
await browser.close();
console.log(fails ? `${fails} FAILED` : "ALL PASS");
process.exit(fails ? 1 : 0);
