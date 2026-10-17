// Reduced-motion check: with prefers-reduced-motion: reduce, nothing animates on load or on interaction.
// Usage: node reduced-motion-check.mjs BASE_URL
import { chromium } from "playwright";
const base = (process.argv[2] || "http://127.0.0.1:1313").replace(/\/$/, "");
const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined });
let fails = 0;
const ok = (c, m) => { console.log(`${c ? "PASS" : "FAIL"} ${m}`); if (!c) fails++; };

// Animations that are allowed to exist under reduced motion: none of ours. (The typed subtitle is
// JavaScript text insertion, not an animation, and its reduced-motion branch shows the full text.)
const running = (p) => p.evaluate(() => document.getAnimations()
  .filter((a) => a.playState === "running" && a.effect && a.effect.getComputedTiming().duration > 0)
  .map((a) => (a.animationName || a.constructor.name) + " on " + (a.effect.target && (a.effect.target.className || a.effect.target.tagName))));

for (const vp of [{ width: 390, height: 844 }, { width: 1280, height: 800 }]) {
  const ctx = await browser.newContext({ viewport: vp, reducedMotion: "reduce" });
  await ctx.addInitScript(() => {
    window.__vt = 0;
    if (document.startViewTransition) {
      const orig = document.startViewTransition.bind(document);
      document.startViewTransition = (cb) => { window.__vt++; return orig(cb); };
    }
  });
  const p = await ctx.newPage();
  // Animated media: any GIF, or an animated hero's WebP (source[data-motion-anim]), checked after load.
  const requested = []; p.on("request", (r) => requested.push(r.url()));
  const animated = new Set();
  for (const path of ["/", "/photos/", "/writing/", "/posts/", "/posts/t3-fleet-gateway/", "/posts/teaching-claude-code-to-drive-cmux/",
    "/posts/environment-update-a-t3-code-tokenmaxing-constellation/", "/posts/rescue82-making-a-choplifter-style-game-for-apple-vision-pro/"]) {
    await p.goto(base + path, { waitUntil: "load" });
    await p.waitForTimeout(150);
    (await p.evaluate(() => [...document.querySelectorAll("source[data-motion-anim]")].map((n) => new URL(n.getAttribute("srcset"), location.href).href))).forEach((u) => animated.add(u));
    const a1 = await running(p);
    ok(a1.length === 0, `${vp.width}px ${path}: no running animations right after load (${a1.slice(0, 3).join("; ")})`);
    if (path === "/") {
      ok(!(await p.evaluate(() => document.documentElement.classList.contains("kc-intro"))), `${vp.width}px home: no hero scan-in`);
      const sub = await p.evaluate(() => document.querySelector(".kc-typeline").textContent);
      ok(sub.startsWith("One person and some bots are typing"), `${vp.width}px home: subtitle shown in full`);
      await p.locator('[data-theme-mode="amber"]').click();
      await p.waitForTimeout(100);
      ok(await p.evaluate(() => window.__vt === 0 && document.documentElement.dataset.theme === "amber"), `${vp.width}px theme switch is instant (no view transition)`);
      const a2 = await running(p);
      ok(a2.length === 0, `${vp.width}px no animations after the theme switch (${a2.join("; ")})`);
    }
    if (path === "/photos/") {
      await p.locator(".kc-sheet a[data-photo]").first().click();
      const a3 = await running(p);
      ok(a3.length === 0, `${vp.width}px lightbox opens without animation (${a3.join("; ")})`);
      await p.keyboard.press("Escape");
    }
    if (path.includes("cmux")) {
      await p.waitForTimeout(600);
      ok(await p.evaluate(() => [...document.querySelectorAll("video")].every((v) => v.paused)), `${vp.width}px autoplay video is paused`);
    }
  }
  const fetched = requested.filter((u) => /\.gif($|\?)/.test(u) || animated.has(u));
  ok(animated.size === 3 && fetched.length === 0, `${vp.width}px no animated GIF or WebP hero requested (${fetched.length} of ${animated.size} checked)`);
  await ctx.close();
}
await browser.close();
console.log(fails ? `${fails} FAILED` : "ALL PASS");
process.exit(fails ? 1 : 0);
