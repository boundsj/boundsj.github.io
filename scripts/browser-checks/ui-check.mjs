// Behavioral checks for M2: lightbox, animated heroes without controls, reduced-motion video, lazy Mapbox.
import { chromium } from "playwright";
const base = (process.argv[2] || "http://127.0.0.1:1391").replace(/\/$/, "");
const exe = process.env.CHROME || undefined; // default: Playwright's bundled Chromium
const browser = await chromium.launch({ executablePath: exe });
let fails = 0;
const ok = (cond, msg) => { console.log(`${cond ? "PASS" : "FAIL"} ${msg}`); if (!cond) fails++; };

async function ctx(opts = {}) {
  const c = await browser.newContext({ viewport: opts.vp || { width: 390, height: 844 }, deviceScaleFactor: 2, reducedMotion: opts.reduced ? "reduce" : "no-preference", hasTouch: true });
  if (opts.theme) await c.addInitScript((t) => localStorage.setItem("bounds-crt", t), opts.theme);
  return c;
}
const errors = [];
function watch(page) { page.on("pageerror", (e) => errors.push(e.message)); page.on("console", (m) => { if (m.type() === "error" && !/mapbox|WebGL/i.test(m.text())) errors.push(m.text()); }); }

// ---- Lightbox on /photos/
{
  const c = await ctx(); const p = await c.newPage(); watch(p);
  await p.goto(base + "/photos/", { waitUntil: "load" });
  const tiles = p.locator(".kc-sheet a[data-photo]");
  ok(await tiles.count() === 10, "photos grid has 10 tiles");
  await tiles.nth(1).click();
  const d = p.locator("dialog.kc-lightbox");
  ok(await d.evaluate((n) => n.open && n.matches(":modal")), "lightbox opens modally");
  ok(await p.evaluate(() => document.activeElement.classList.contains("kc-lightbox__close")), "initial focus on close");
  ok((await p.locator("#kc-lightbox-title").textContent()) === "Bird on a wire", "title is the clicked photo");
  ok((await p.locator(".kc-lightbox__count").textContent()) === "02 / 10", "counter shows 02 / 10");
  // Tab cycling stays within the dialog
  let inside = true;
  for (let i = 0; i < 8; i++) { await p.keyboard.press("Tab"); inside = inside && await p.evaluate(() => !!document.activeElement.closest("dialog.kc-lightbox")); }
  ok(inside, "Tab focus stays inside the dialog");
  await p.keyboard.press("ArrowRight");
  ok((await p.locator("#kc-lightbox-title").textContent()) === "Hermit Crab", "ArrowRight goes to next photo");
  ok((await p.locator(".kc-lightbox__open").getAttribute("href")) === "/posts/hermit-crab/", "open post link updates");
  await p.locator(".kc-lightbox__prev").click();
  await p.locator(".kc-lightbox__prev").click();
  ok((await p.locator("#kc-lightbox-title").textContent()) === "Somewhere in Nevada", "prev button pages back");
  await p.waitForFunction(() => document.querySelector(".kc-lightbox__img").complete && document.querySelector(".kc-lightbox__img").naturalWidth > 0);
  const geo = await p.evaluate(() => { const r = (s) => document.querySelector(s).getBoundingClientRect(); return { img: r(".kc-lightbox__img"), ctrl: r(".kc-lightbox__controls"), dlg: r("dialog.kc-lightbox"), vh: innerHeight, vw: innerWidth }; });
  ok(geo.dlg.bottom <= geo.vh && geo.ctrl.bottom <= geo.vh && geo.dlg.right <= geo.vw, `portrait photo + controls fit at 390x844 (dialog bottom ${Math.round(geo.dlg.bottom)})`);
  await p.keyboard.press("Escape");
  ok(!(await d.evaluate((n) => n.open)), "Escape closes");
  ok(await p.evaluate(() => document.activeElement === document.querySelectorAll(".kc-sheet a[data-photo]")[1]), "focus returns to the tile that opened it");
  // modifier click falls through to the link
  await c.close();
}

// ---- Home profile: the social row is centered under the title at every width
for (const width of [390, 768, 1024, 1280]) {
  const c = await ctx({ vp: { width, height: 900 } }); const p = await c.newPage(); watch(p);
  await p.goto(base + "/", { waitUntil: "load" });
  const off = await p.evaluate(() => {
    const box = (el) => el.getBoundingClientRect();
    const links = [...document.querySelectorAll(".kc-profile .kc-social__a")].map(box);
    const t = box(document.querySelector(".kc-profile__name"));
    return (links[0].left + links.at(-1).right) / 2 - (t.left + t.right) / 2;
  });
  ok(Math.abs(off) <= 2, `${width}px: social row centered under the title (off by ${off.toFixed(1)} px)`);
  if (width < 600) {
    const x = await p.evaluate(() => {
      const a = document.querySelector('.kc-profile a[data-social="x"]'), r = a.getBoundingClientRect(), y = r.top + r.height / 2, c = (r.left + r.right) / 2;
      return { hits: [-21, 21].every((dx) => document.elementFromPoint(c + dx, y)?.closest("a") === a), height: r.height };
    });
    ok(x.hits && x.height >= 44, "phone: the short X link still has a 44x44 hit area");
  }
  await c.close();
}

// ---- Every photo fits, whole, with the controls in view (phone, 200% zoom equivalent, desktop)
for (const vp of [{ width: 390, height: 844 }, { width: 640, height: 400 }, { width: 1280, height: 800 }]) {
  const c = await ctx({ vp }); const p = await c.newPage(); watch(p);
  await p.goto(base + "/photos/", { waitUntil: "load" });
  await p.locator(".kc-sheet a[data-photo]").first().click();
  const bad = [];
  for (let i = 0; i < 10; i++) {
    await p.waitForFunction(() => { const im = document.querySelector(".kc-lightbox__img"); return im.complete && im.naturalWidth > 0; });
    const g = await p.evaluate(() => {
      const r = (s) => document.querySelector(s).getBoundingClientRect();
      const img = document.querySelector(".kc-lightbox__img"), box = img.getBoundingClientRect();
      // Rendered picture under object-fit: contain.
      const scale = Math.min(box.width / img.naturalWidth, box.height / img.naturalHeight);
      const w = img.naturalWidth * scale, h = img.naturalHeight * scale;
      const pic = { left: box.left + (box.width - w) / 2, top: box.top + (box.height - h) / 2, right: box.left + (box.width + w) / 2, bottom: box.top + (box.height + h) / 2 };
      const d = document.querySelector("dialog.kc-lightbox");
      return { title: document.querySelector("#kc-lightbox-title").textContent, fit: fitFn(), scroll: d.scrollHeight - d.clientHeight };
      function fitFn() {
        const st = r(".kc-lightbox__stage"), ctl = r(".kc-lightbox__controls"), dl = r("dialog.kc-lightbox");
        const inside = (a, b) => a.left >= b.left - 1 && a.top >= b.top - 1 && a.right <= b.right + 1 && a.bottom <= b.bottom + 1;
        return inside(pic, st) && inside(st, dl) && inside(ctl, dl) && dl.bottom <= innerHeight + 1 && dl.right <= innerWidth + 1 && h > 60;
      }
    });
    if (!g.fit || g.scroll > 1) bad.push(`${g.title} (fit=${g.fit}, scroll=${g.scroll})`);
    await p.keyboard.press("ArrowRight");
  }
  ok(bad.length === 0, `${vp.width}x${vp.height}: all 10 photos fit whole with controls in view${bad.length ? " — " + bad.join("; ") : ""}`);
  await c.close();
}

// ---- Photo post hero: single-item lightbox, open-post hidden; lazy Mapbox
{
  const c = await ctx({ vp: { width: 1280, height: 800 }, theme: "light" }); const p = await c.newPage(); watch(p);
  const mapReq = []; p.on("request", (r) => { if (/mapbox-gl\.js/.test(r.url())) mapReq.push(r.url()); });
  await p.goto(base + "/posts/somewhere-in-nevada/", { waitUntil: "load" });
  await p.waitForTimeout(500);
  const mapTop = await p.evaluate(() => document.querySelector(".mapbox").getBoundingClientRect().top - innerHeight);
  ok(mapTop > 600 ? mapReq.length === 0 : true, `Mapbox not requested while the map is ${Math.round(mapTop)} px below the fold (${mapReq.length})`);
  ok(mapTop > 600, "fixture: the map starts beyond the 600 px preload margin");
  const headBlocking = await p.evaluate(() => [...document.head.querySelectorAll("script[src]")].filter((s) => /mapbox/.test(s.src) && !s.async).length);
  ok(headBlocking === 0, "Mapbox script is not parser-blocking");
  await p.locator(".kc-hero__open").click();
  ok(await p.locator("dialog.kc-lightbox").evaluate((n) => n.open), "post hero opens lightbox");
  ok(await p.locator(".kc-lightbox__prev").isHidden() && await p.locator(".kc-lightbox__open").isHidden(), "single photo: no prev/next, no open-post link");
  await p.keyboard.press("Escape");
  // switch theme before map loads, then scroll to it
  await p.locator('[data-theme-mode="amber"]').click();
  await p.locator(".mapbox").scrollIntoViewIfNeeded();
  await p.waitForFunction(() => document.querySelector(".mapbox").dataset.mapReady, null, { timeout: 15000 }).catch(() => {});
  const ready = await p.evaluate(() => document.querySelector(".mapbox").dataset.mapReady);
  ok(ready === "1", `map initializes when scrolled near (ready=${ready})`);
  await p.waitForTimeout(1500);
  const style = await p.evaluate(() => document.querySelector(".mapbox canvas") ? "canvas" : "none");
  ok(style === "canvas", "map canvas rendered");
  await p.locator('[data-theme-mode="light"]').click();
  await p.waitForTimeout(500);
  ok(mapReq.length === 1, `mapbox-gl.js requested exactly once (${mapReq.length})`);
  await c.close();
}

// ---- Blocked Mapbox -> fallback
{
  const c = await ctx(); const p = await c.newPage();
  await p.route(/api\.mapbox\.com/, (r) => r.abort());
  await p.goto(base + "/posts/hermit-crab/", { waitUntil: "load" });
  await p.locator(".mapbox").scrollIntoViewIfNeeded();
  await p.waitForSelector(".mapbox--failed", { timeout: 8000 }).catch(() => {});
  ok(await p.locator(".mapbox__fallback").count() === 1, "blocked Mapbox shows a fallback");
  await c.close();
}

// ---- Animated heroes: native still selection under reduced motion; WebP with GIF fallback.
const heroSources = (p) => p.evaluate(() => {
  const fig = document.querySelector(".kc-hero--animated");
  const abs = (u) => u && new URL(u, location.href).href;
  return { still: abs(fig.querySelector("source[data-motion-still]")?.getAttribute("srcset")),
    webp: abs(fig.querySelector("source[data-motion-anim]")?.getAttribute("srcset")),
    gif: abs(fig.querySelector("img").getAttribute("src")), current: fig.querySelector("img").currentSrc };
});
{
  const c = await ctx({ reduced: true }); const p = await c.newPage(); watch(p);
  const requested = []; p.on("request", (r) => requested.push(r.url()));
  await p.goto(base + "/", { waitUntil: "load" });
  await p.waitForTimeout(500);
  const h = await heroSources(p);
  ok(h.current === h.still && /\.png$/.test(h.current), `reduced motion: home hero shows the PNG still (${h.current.split("/").pop()})`);
  ok(!requested.includes(h.webp) && !requested.includes(h.gif), "reduced motion: neither the animated WebP nor the GIF is requested");
  ok(await p.locator(".kc-hero button").count() === 0, "hero has no playback controls");
  // home door thumbnails open a lightbox group (excluding featured)
  await p.locator(".kc-door .kc-strip__a").first().click();
  ok(await p.locator("dialog.kc-lightbox").evaluate((n) => n.open), "home door thumbnail opens lightbox");
  ok((await p.locator(".kc-lightbox__count").textContent()).endsWith("/ 04"), "door group has 4 photos");
  await p.keyboard.press("Escape");
  await c.close();
}
// Every GIF hero offers still → animated WebP → GIF fallback, and all three files serve.
for (const post of ["t3-fleet-gateway-notion-agents", "environment-update-a-t3-code-tokenmaxing-constellation", "rescue82-making-a-choplifter-style-game-for-apple-vision-pro"]) {
  const c = await ctx({ vp: { width: 1280, height: 800 } }); const p = await c.newPage(); watch(p);
  const requested = []; p.on("request", (r) => requested.push(r.url()));
  await p.goto(base + "/posts/" + post + "/", { waitUntil: "load" });
  await p.waitForTimeout(600);
  const h = await heroSources(p);
  const status = async (u) => (await c.request.get(u)).status();
  ok(h.still && /\.webp$/.test(h.webp) && /\.gif$/.test(h.gif) && h.current === h.webp, `${post.slice(0, 24)}: shows the animated WebP, with still and GIF fallback`);
  ok(!requested.includes(h.gif), `${post.slice(0, 24)}: GIF not downloaded by a WebP-capable browser`);
  ok((await status(h.webp)) === 200 && (await status(h.gif)) === 200 && (await status(h.still)) === 200, `${post.slice(0, 24)}: still, WebP and GIF all serve`);
  await c.close();
}
{
  const c = await ctx({ reduced: true }); const p = await c.newPage();
  await p.goto(base + "/posts/teaching-claude-code-to-drive-cmux/", { waitUntil: "load" });
  await p.waitForTimeout(800);
  const v = await p.evaluate(() => { const v = document.querySelector("video"); return v ? { paused: v.paused, autoplay: v.hasAttribute("autoplay") } : null; });
  ok(v && v.paused && !v.autoplay, `reduced motion: autoplay video paused (${JSON.stringify(v)})`);
  await c.close();
}
{
  const c = await ctx(); const p = await c.newPage();
  await p.goto(base + "/", { waitUntil: "load" });
  await p.waitForTimeout(300);
  const h = await heroSources(p);
  ok(h.current === h.webp, "normal motion: animated WebP selected without controls");
  ok(await p.locator(".kc-hero button").count() === 0, "normal motion: hero has no playback controls");
  await p.emulateMedia({ reducedMotion: "reduce" });
  await p.waitForFunction(() => {
    const fig = document.querySelector(".kc-hero--animated");
    return fig.querySelector("img").currentSrc === new URL(fig.querySelector("source[media]").srcset, location.href).href;
  });
  ok((await heroSources(p)).current === h.still, "preference change selects still");
  await p.emulateMedia({ reducedMotion: "no-preference" });
  await p.waitForFunction(() => document.querySelector(".kc-hero--animated img").currentSrc.endsWith(".webp"));
  ok((await heroSources(p)).current === h.webp, "preference change back resumes animation");
  await c.close();
}

ok(errors.length === 0, `no page errors (${errors.join(" | ")})`);
await browser.close();
console.log(fails ? `${fails} FAILED` : "ALL PASS");
process.exit(fails ? 1 : 0);
