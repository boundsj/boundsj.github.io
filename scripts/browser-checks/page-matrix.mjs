// Screenshot + metrics matrix. Usage: node page-matrix.mjs BASE_URL OUT_DIR [--reduced] [--full] [--themes=light,dark,green,amber] [--pages=/,/posts/] [--vp=390,1280]
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const [base, out] = process.argv.slice(2);
const flag = (n, d) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || `=${d}`).split("=")[1];
const reduced = process.argv.includes("--reduced");
const fullPage = process.argv.includes("--full");
const themes = flag("themes", "light,dark,green,amber").split(",");
const defaultPages = "/,/posts/,/posts/t3-fleet-gateway/,/posts/somewhere-in-nevada/,/about/,/tags/,/404.html";
const pages = flag("pages", defaultPages).split(",");
const viewports = flag("vp", "390,1280").split(",").map(Number);
fs.mkdirSync(out, { recursive: true });

const exe = process.env.CHROME || undefined; // default: Playwright's bundled Chromium
const browser = await chromium.launch({ executablePath: exe });
const report = [];

for (const vp of viewports) {
  for (const theme of themes) {
    const ctx = await browser.newContext({
      viewport: { width: vp, height: vp < 600 ? 844 : 800 },
      deviceScaleFactor: vp < 600 ? 2 : 1,
      reducedMotion: reduced ? "reduce" : "no-preference",
      hasTouch: vp < 600,
    });
    await ctx.addInitScript((t) => { try { localStorage.setItem("bounds-crt", t); } catch (e) {} }, theme);
    for (const p of pages) {
      const page = await ctx.newPage();
      const logs = [];
      page.on("console", (m) => { if (["error", "warning"].includes(m.type())) logs.push(`${m.type()}: ${m.text()}`); });
      page.on("pageerror", (e) => logs.push(`pageerror: ${e.message}`));
      const failed = [];
      page.on("requestfailed", (r) => { if (!/mapbox|google/.test(r.url())) failed.push(r.url()); });
      let status = 0;
      try {
        const resp = await page.goto(base.replace(/\/$/, "") + p, { waitUntil: "load", timeout: 30000 });
        status = resp ? resp.status() : 0;
      } catch (e) { logs.push(`goto: ${e.message}`); }
      await page.waitForTimeout(2200); // typed subtitle + entrance motion settle
      const m = await page.evaluate(() => {
        const de = document.documentElement;
        const toRgb = (c) => { const m = c.match(/[\d.]+/g); return m ? m.map(Number) : [0, 0, 0, 1]; };
        const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
        const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
        const bgOf = (el) => { while (el) { const c = toRgb(getComputedStyle(el).backgroundColor); if (c.length < 4 || c[3] > 0.9) { if (!(c.length === 4 && c[3] === 0)) return c; } el = el.parentElement; } return [255, 255, 255]; };
        const low = [];
        const seen = new Set();
        for (const el of document.querySelectorAll("body *")) {
          if (!el.childNodes.length) continue;
          const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
          if (!own) continue;
          const cs = getComputedStyle(el);
          if (cs.visibility === "hidden" || cs.display === "none" || el.closest("[aria-hidden=true]") || el.closest(".sr-only")) continue;
          const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
          const fg = toRgb(cs.color); const bg = bgOf(el);
          const cr = ratio(fg, bg);
          const large = parseFloat(cs.fontSize) >= 24 || (parseFloat(cs.fontSize) >= 18.66 && +cs.fontWeight >= 700);
          if (cr < (large ? 3 : 4.5)) { const k = `${el.className}|${cs.color}`; if (!seen.has(k)) { seen.add(k); low.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 40)} "${el.textContent.trim().slice(0, 24)}" ${cr.toFixed(2)}`); } }
        }
        const small = [];
        for (const el of document.querySelectorAll("a[href], button, [role=button], summary, input, select")) {
          const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
          if (!r.width || cs.visibility === "hidden" || el.closest(".post-content") || el.classList.contains("kc-skip")) continue;
          if (r.height < 24 || r.width < 24) small.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 30)} "${(el.textContent || el.getAttribute("aria-label") || "").trim().slice(0, 18)}" ${Math.round(r.width)}x${Math.round(r.height)}`);
        }
        const res = performance.getEntriesByType("resource");
        const nav = performance.getEntriesByType("navigation")[0];
        const bytes = res.reduce((s, e) => s + (e.transferSize || e.encodedBodySize || 0), 0) + (nav ? nav.transferSize || nav.encodedBodySize : 0);
        const header = document.querySelector("header");
        const hs = [...document.querySelectorAll("h1,h2,h3,h4")].map((h) => h.tagName + ":" + h.textContent.trim().slice(0, 30));
        return {
          overflow: de.scrollWidth - de.clientWidth,
          docHeight: de.scrollHeight,
          headerH: header ? Math.round(header.getBoundingClientRect().height) : 0,
          requests: res.length + 1,
          kb: Math.round(bytes / 1024),
          bigRes: res.filter((e) => (e.transferSize || e.encodedBodySize) > 150000).map((e) => `${e.name.split("/").slice(-1)[0].slice(0, 40)} ${Math.round((e.transferSize || e.encodedBodySize) / 1024)}KB`),
          lowContrast: low.slice(0, 12),
          smallTargets: small.slice(0, 15),
          smallTargetCount: small.length,
          headings: hs.slice(0, 14),
          gtag: typeof window.gtag,
          dataLayer: (window.dataLayer || []).length,
          theme: de.dataset.theme,
        };
      });
      const slug = (p.replace(/\//g, "_").replace(/^_|_$/g, "") || "home").replace(/\.html$/, "");
      const file = path.join(out, `${slug}-${vp}-${theme}${reduced ? "-reduced" : ""}.png`);
      await page.screenshot({ path: file, fullPage });
      report.push({ page: p, vp, theme, status, ...m, logs, failed, file });
      await page.close();
    }
    await ctx.close();
  }
}
await browser.close();
fs.writeFileSync(path.join(out, "report.json"), JSON.stringify(report, null, 2));
for (const r of report) {
  console.log(`${r.status} ${r.page} @${r.vp} ${r.theme}: overflow=${r.overflow} header=${r.headerH} req=${r.requests} kb=${r.kb} small=${r.smallTargetCount} lowC=${r.lowContrast.length} logs=${r.logs.length} failed=${r.failed.length}`);
}
