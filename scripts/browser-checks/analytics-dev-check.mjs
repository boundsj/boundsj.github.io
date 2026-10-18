// Dev-mode analytics checks: each interaction records the documented event and params; no PII.
import { chromium } from "playwright";
const base = (process.argv[2] || "http://127.0.0.1:1391").replace(/\/$/, "");
const exe = process.env.CHROME || undefined; // default: Playwright's bundled Chromium
const browser = await chromium.launch({ executablePath: exe });
let fails = 0; const seen = new Set(); const all = [];
const ok = (c, m) => { console.log(`${c ? "PASS" : "FAIL"} ${m}`); if (!c) fails++; };

async function open(path, opts = {}) {
  const c = await browser.newContext({ viewport: opts.vp || { width: 1280, height: 800 }, reducedMotion: "reduce" });
  await c.grantPermissions(["clipboard-read", "clipboard-write"], { origin: base });
  await c.addInitScript((t) => {
    localStorage.setItem("bounds-crt", t);
    // Keep the page in place after a click so the event log can be read (bubble phase, after analytics' capture).
    window.addEventListener("click", (e) => { if (window.__stopNav && e.target.closest("a[href]")) e.preventDefault(); });
  }, opts.theme || "light");
  const p = await c.newPage();
  p.on("pageerror", (e) => { console.log("pageerror", e.message); fails++; });
  await p.goto(base + path, { waitUntil: "load" });
  await p.evaluate(() => { window.__stopNav = true; });
  return [c, p];
}
const events = (p) => p.evaluate(() => window.__boundsAnalytics.slice());
async function expectEvent(p, name, match, label) {
  const log = await events(p);
  const hit = log.slice().reverse().find((e) => e.name === name && Object.entries(match).every(([k, v]) => e.params[k] === v));
  ok(!!hit, `${label}: ${name} ${JSON.stringify(match)}${hit ? "" : "  got " + JSON.stringify(log.slice(-3))}`);
  if (hit) { seen.add(name); all.push(hit); }
  return hit;
}

// ---- Home
{
  const [c, p] = await open("/");
  await expectEvent(p, "page_view", { content_group: "home", page_location: base + "/" }, "home page context");
  await p.locator('.kc-nav a[data-nav="photos"]').click(); await expectEvent(p, "nav_click", { nav_item: "photos", ui_location: "header" }, "header nav");
  await p.locator('.kc-profile a[data-social="github"]').click(); await expectEvent(p, "social_click", { social_network: "github", ui_location: "home_profile" }, "social link");
  await p.locator('.kc-profile a[href^="mailto:"]').click(); await expectEvent(p, "email_click", { ui_location: "home_profile" }, "email link");
  await p.locator('.kc-profile a[href$="index.xml"]').click(); await expectEvent(p, "rss_click", { ui_location: "home_profile" }, "rss link");
  await p.locator('.kc-door__cta[data-nav="writing"]').click(); await expectEvent(p, "nav_click", { nav_item: "writing", ui_location: "door" }, "door button");
  await p.locator(".kc-featured__title a").click(); await expectEvent(p, "select_content", { content_type: "writing", content_id: "t3-fleet-gateway-notion-agents", ui_location: "home_latest" }, "featured title");
  await p.locator(".kc-rows .kc-row").last().click(); await expectEvent(p, "select_content", { content_type: "photo", content_id: "somewhere-in-nevada", ui_location: "home_list" }, "recent row");
  await p.locator('[data-theme-mode="amber"]').click(); await expectEvent(p, "theme_change", { theme_from: "light", theme_to: "amber" }, "theme pill");
  await p.locator(".kc-door .kc-strip__a").first().click(); await expectEvent(p, "photo_open", { ui_location: "home_door", method: "click" }, "door thumbnail");
  await p.locator(".kc-lightbox__next").click(); await expectEvent(p, "photo_open", { ui_location: "lightbox", method: "next" }, "lightbox next");
  await p.keyboard.press("ArrowLeft"); await expectEvent(p, "photo_open", { ui_location: "lightbox", method: "key" }, "lightbox arrow key");
  await p.keyboard.press("Escape");
  await p.locator(".kc-status__top").click(); await expectEvent(p, "nav_click", { nav_item: "top", ui_location: "footer" }, "status bar top");
  await p.locator('.kc-status a[data-nav="about"]').click(); await expectEvent(p, "nav_click", { nav_item: "about", ui_location: "footer" }, "status bar nav");
  await p.locator('.kc-status a[data-social="github"]').click(); await expectEvent(p, "social_click", { social_network: "github", ui_location: "footer" }, "footer github");
  await c.close();
}
// ---- Archive + photos
{
  const [c, p] = await open("/posts/");
  await expectEvent(p, "page_view", { content_group: "archive" }, "archive context");
  await p.locator('.kc-chips a[data-nav="bots"]').click(); await expectEvent(p, "nav_click", { nav_item: "bots", ui_location: "chips" }, "channel chip");
  await p.locator('.kc-pager a[rel="next"]').click(); await expectEvent(p, "nav_click", { nav_item: "page", ui_location: "pager" }, "pager");
  await p.locator('[data-ui="archive_latest"] .kc-hero__link').click({ force: true }); await expectEvent(p, "select_content", { ui_location: "archive_latest" }, "archive hero image");
  await c.close();
  const [c2, p2] = await open("/photos/");
  await expectEvent(p2, "page_view", { content_group: "photos" }, "photos context");
  await p2.locator(".kc-sheet a[data-photo]").nth(2).click(); await expectEvent(p2, "photo_open", { content_id: "hermit-crab", ui_location: "photo_grid", method: "click" }, "contact sheet tile");
  await p2.locator(".kc-lightbox__open").click(); await expectEvent(p2, "select_content", { content_type: "photo", content_id: "hermit-crab", ui_location: "lightbox" }, "lightbox open post");
  await p2.keyboard.press("Escape");
  const mod = process.platform === "darwin" ? "Meta" : "Control";
  await p2.locator(".kc-sheet a[data-photo]").nth(3).click({ modifiers: [mod] });
  await expectEvent(p2, "select_content", { content_type: "photo", content_id: "whats-under-the-hood", ui_location: "photo_grid" }, "modified click on a tile opens its post");
  await p2.locator(".kc-sheet a[data-photo]").nth(4).click({ button: "middle" });
  await expectEvent(p2, "select_content", { content_type: "photo", content_id: "pallet", ui_location: "photo_grid" }, "middle click on a tile");
  ok(!(await p2.evaluate(() => document.querySelector("dialog.kc-lightbox").open)), "modified clicks don't open the lightbox");
  await c2.close();
}
// ---- Writing post: read depth, outbound, code copy, back link, post nav, tags
{
  const [c, p] = await open("/posts/t3-fleet-gateway/?utm_source=test#frag");
  await expectEvent(p, "page_view", { content_group: "writing", page_location: base + "/posts/t3-fleet-gateway/" }, "post context without query/fragment");
  for (let y = 0; y < 12; y++) { await p.mouse.wheel(0, 900); await p.waitForTimeout(120); }
  for (const pct of [25, 50, 75, 100]) await expectEvent(p, "read_progress", { percent: pct, content_type: "writing", content_id: "t3-fleet-gateway" }, `read ${pct}%`);
  const rp = (await events(p)).filter((e) => e.name === "read_progress");
  ok(rp.length === 4 && rp.every((e) => typeof e.params.engaged_seconds === "number"), `read_progress fires once per milestone with engaged_seconds (${rp.length})`);
  await p.locator('.post-content a[href^="https://github.com/boundsj/t3-fleet-gateway"]').first().click();
  await expectEvent(p, "outbound_click", { link_domain: "github.com", link_path: "/boundsj/t3-fleet-gateway", ui_location: "post_body" }, "outbound link");
  await p.locator(".kc-code__copy").first().click(); await expectEvent(p, "code_copy", { content_id: "t3-fleet-gateway", code_language: "text" }, "code copy");
  await p.locator(".kc-back").click(); await expectEvent(p, "nav_click", { nav_item: "writing", ui_location: "back_link" }, "back link");
  await p.locator('.kc-postnav a[rel="next"]').click(); await expectEvent(p, "select_content", { content_type: "writing", ui_location: "post_nav" }, "newer post link");
  await p.locator(".kc-post__tags .kc-tag").first().click(); await expectEvent(p, "nav_click", { nav_item: "tags" }, "tag chip");
  await p.locator(".kc-crosslink .kc-strip__a").first().click(); await expectEvent(p, "photo_open", { ui_location: "post_crosslink" }, "cross-link thumbnail");
  await p.keyboard.press("Escape");
  const before = (await events(p)).length;
  await p.locator(".kc-status__top").click();
  const afterTop = (await events(p)).slice(before);
  ok(afterTop.length === 1 && afterTop[0].name === "nav_click" && afterTop[0].params.nav_item === "top", `post page "top" is nav_click, not a post selection (${JSON.stringify(afterTop)})`);
  await c.close();
}
// ---- Photo post hero, native video, 404
{
  const [c, p] = await open("/posts/bird-on-a-wire/");
  await p.locator(".kc-hero__open").click(); await expectEvent(p, "photo_open", { content_id: "bird-on-a-wire", ui_location: "post_hero" }, "photo post hero");
  await p.keyboard.press("Escape");
  await p.locator(".kc-hero__open").click({ modifiers: [process.platform === "darwin" ? "Meta" : "Control"] });
  await expectEvent(p, "photo_open", { content_id: "bird-on-a-wire", ui_location: "post_hero", method: "new_tab" }, "modified click on the hero opens the image file");
  ok(!(await events(p)).some((e) => e.name === "select_content"), "hero image never counts as a post selection");
  await c.close();
  // Chromium builds lack H.264; play the MP4 in branded Chrome (or CHROME_CODECS=<path to a Chrome with codecs>).
  const cft = await chromium.launch(process.env.CHROME_CODECS ? { executablePath: process.env.CHROME_CODECS } : { channel: "chrome" });
  const c2 = await cft.newContext({ viewport: { width: 1280, height: 800 } });
  const p2 = await c2.newPage();
  await p2.goto(base + "/posts/rescue82-making-a-choplifter-style-game-for-apple-vision-pro/", { waitUntil: "load" });
  const video = p2.locator(".post-content video").first();
  await video.scrollIntoViewIfNeeded();
  await video.evaluate((v) => { v.muted = true; });
  await video.focus(); await p2.keyboard.press("Space"); // a real user activation on the native controls
  await p2.waitForTimeout(1200);
  const vs = (await events(p2)).filter((e) => e.name === "native_video_start");
  ok(vs.length === 1 && vs[0].params.video_name === "rescue82-promo.mp4", `native video start (${JSON.stringify(vs)})`);
  if (vs[0]) { seen.add("native_video_start"); all.push(vs[0]); }
  ok(vs[0] && vs[0].params.video_trigger === "user" && vs[0].params.content_id === "rescue82-making-a-choplifter-style-game-for-apple-vision-pro", "video start is user-triggered with the post id");
  const p4 = await c2.newPage();
  await p4.goto(base + "/posts/teaching-claude-code-to-drive-cmux/", { waitUntil: "load" });
  await p4.waitForTimeout(1500);
  const av = (await p4.evaluate(() => window.__boundsAnalytics.slice())).filter((e) => e.name === "native_video_start");
  ok(av.length <= 1 && (!av[0] || av[0].params.video_trigger === "autoplay"), `autoplay video, if reported, is marked autoplay (${JSON.stringify(av)})`);
  await c2.close(); await cft.close();
  const [c3, p3] = await open("/no/such/page/jane@example.com/?email=jane@example.com");
  await expectEvent(p3, "page_not_found", {}, "404");
  await expectEvent(p3, "page_view", { content_group: "error", page_location: base + "/404.html" }, "404 location is fixed");
  await c3.close();
}

const pii = all.filter((e) => /@|\?|#/.test(JSON.stringify(e.params)));
ok(pii.length === 0, `no event param contains @, ? or # (${JSON.stringify(pii)})`);
const names = ["select_content", "nav_click", "theme_change", "outbound_click", "social_click", "email_click", "rss_click", "read_progress", "photo_open", "native_video_start", "code_copy", "page_not_found"];
ok(names.every((n) => seen.has(n)), `every documented event observed (${names.filter((n) => !seen.has(n)).join(", ") || "all"})`);
await browser.close();
console.log(fails ? `${fails} FAILED` : "ALL PASS");
process.exit(fails ? 1 : 0);
