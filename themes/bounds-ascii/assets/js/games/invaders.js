/* Bounds Invaders. Fetched by js/games.js only when the visitor presses Insert coin.
   Keyboard (only while the canvas has focus and a game is running): ← → or A D move, Space fires,
   P pauses, Esc pauses and gives the keyboard back. Touch: the three cabinet buttons, or drag on
   the screen to steer and tap to fire. Pauses on blur, tab switch and scroll-away. Sound is opt-in.
   Sprites come from the shared sheet's rectangle JSON (fetched with the game): each (sprite,
   frame, color) is painted once to an offscreen canvas and then blitted. Every bot is a real
   post from the page's #arcade-posts JSON island. */
(function () {
  "use strict";
  var W = 400, H = 520, COLS = 6, ROWS = 4;
  var KIND = { crawler: "bots", drone: "photo", typist: "writing" };
  var LIST = { crawler: "bots", drone: "photos", typist: "writing" };
  var TINT = { crawler: "pink", drone: "orange", typist: "cyan" };
  var POINTS = { crawler: 30, drone: 20, typist: 10 };
  var BOT_W = 30, BOT_H = 28, SHIP_W = 26, SHIP_Y = H - 66, UFO_W = 40;
  var box, canvas, ctx, attract, statusEl, feed, feedEmpty, pauseBtn, soundBtn;
  var sheet = null, posts = {}, next = { crawler: 0, drone: 0, typist: 0 };
  var color = {}, stamps = {}, g = null, raf = 0, last = 0, keys = {}, soundOn = false, audio = null, bound = false;

  function $(sel) { return box.querySelector(sel); }
  function readColors() {
    var cs = getComputedStyle(canvas.parentNode);
    ["bg", "text", "text-2", "pellet", "cyan", "orange", "pink", "lime", "red", "line", "spr-ink", "spr-light"].forEach(function (k) { color[k] = cs.getPropertyValue("--" + k).trim(); });
    stamps = {};
  }
  /* The backing store is a whole multiple of the 400×520 grid, at least as dense as the display. */
  function fit() {
    var cssW = canvas.clientWidth || W, k = Math.max(1, Math.min(4, Math.ceil(cssW * (window.devicePixelRatio || 1) / W)));
    if (canvas.width !== W * k) { canvas.width = W * k; canvas.height = H * k; }
    ctx.setTransform(k, 0, 0, k, 0, 0);
    ctx.imageSmoothingEnabled = false;
    if (g) draw();
  }
  function stamp(name, frame, fill) {
    var s = sheet[name], f = s.frames[frame % s.frames.length], key = name + frame % s.frames.length + fill;
    if (stamps[key]) return stamps[key];
    var c = document.createElement("canvas"), x = c.getContext("2d");
    c.width = s.w; c.height = s.h;
    var paint = { "#": fill, k: color["spr-ink"], w: color["spr-light"], g: color.lime, r: color.orange };
    function rects(list, style) { x.fillStyle = style; (list || []).forEach(function (r) { x.fillRect(r[0], r[1], r[2], r[3]); }); }
    Object.keys(f.fills).forEach(function (ch) { rects(f.fills[ch], paint[ch] || fill); });
    rects(f.hi, "rgba(255,255,255,.34)");
    rects(f.sh, "rgba(0,0,0,.26)");
    return (stamps[key] = c);
  }
  function sprite(name, frame, x, y, fill) { ctx.drawImage(stamp(name, frame, fill), Math.round(x), Math.round(y)); }
  function beep(freq, dur, type) {
    if (!soundOn) return;
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      var o = audio.createOscillator(), v = audio.createGain();
      o.type = type || "square"; o.frequency.value = freq;
      v.gain.setValueAtTime(0.04, audio.currentTime);
      v.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + dur);
      o.connect(v); v.connect(audio.destination); o.start(); o.stop(audio.currentTime + dur);
    } catch (e) { /* no audio */ }
  }
  function say(text) { statusEl.textContent = text; }
  function pad(n, len) { var s = String(n); while (s.length < len) s = "0" + s; return s; }
  function hiScore() { try { return parseInt(localStorage.getItem("bounds-arcade-hi"), 10) || 0; } catch (e) { return 0; } }
  function cheat() { try { return window.boundsArcadeCheat || sessionStorage.getItem("bounds-arcade-cheat") === "1"; } catch (e) { return !!window.boundsArcadeCheat; } }
  function clampShip(x) { return Math.max(8, Math.min(W - SHIP_W - 8, x)); }
  function post(type) {
    var list = posts[LIST[type]] || [];
    return list.length ? list[next[type]++ % list.length] : null;
  }

  function newWave(wave) {
    var bots = [], types = ["crawler", "drone", "typist", "typist"];
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var t = types[r];
        bots.push({ x: 28 + c * 52, y: 58 + Math.min(wave - 1, 5) * 16 + r * 40, type: t, alive: true, post: post(t) });
      }
    }
    return bots;
  }
  function newGame() {
    return { ship: W / 2 - SHIP_W / 2, shots: [], bombs: [], puffs: [], bots: newWave(1), dir: 1, frame: 0, frameAt: 0, stepAt: 0, bombAt: 1200,
      ufo: null, ufoAt: 14000 + Math.random() * 8000, score: 0, lives: cheat() ? 30 : 3, wave: 1, t: 0, safe: 0, fireAt: 0, over: false, paused: false, hi: hiScore() };
  }
  function alive() { return g.bots.filter(function (b) { return b.alive; }); }

  function fire() {
    if (!g || g.over || g.paused || g.t < g.fireAt || g.shots.length >= 2) return;
    g.shots.push({ x: g.ship + SHIP_W / 2, y: SHIP_Y - 4 });
    g.fireAt = g.t + 320;
    beep(880, 0.07);
  }
  function zap(bot) {
    bot.alive = false;
    g.score += POINTS[bot.type];
    g.puffs.push({ x: bot.x + 3, y: bot.y + 2, until: g.t + 180 });
    beep(220, 0.1, "sawtooth");
    if (!bot.post) return;
    var li = document.createElement("li"), a = document.createElement("a"), b = document.createElement("b");
    li.setAttribute("data-kind", KIND[bot.type]);
    b.textContent = "+" + POINTS[bot.type];
    a.href = bot.post.u; a.textContent = bot.post.t;
    li.appendChild(b); li.appendChild(document.createTextNode(" zapped: ")); li.appendChild(a);
    feed.insertBefore(li, feed.firstChild);
    while (feed.children.length > 5) feed.removeChild(feed.lastChild);
    feedEmpty.hidden = true;
  }
  function hitShip() {
    g.lives--; g.bombs = []; g.safe = g.t + 1400;
    beep(110, 0.3, "sawtooth");
    if (g.lives <= 0) end("GAME OVER"); else say("Hit. " + g.lives + (g.lives === 1 ? " life" : " lives") + " left.");
  }
  function end(title) {
    g.over = true; keys = {};
    if (g.score > g.hi) { g.hi = g.score; try { localStorage.setItem("bounds-arcade-hi", String(g.hi)); } catch (e) { /* no storage */ } }
    window.dispatchEvent(new CustomEvent("bounds:score"));
    draw();
    $("[data-game-title]").textContent = title;
    var msg = $("[data-game-msg]"), hi = document.createElement("span");
    hi.setAttribute("data-hi", ""); hi.textContent = pad(g.hi, 4);
    msg.textContent = "SCORE " + pad(g.score, 4) + " · HI "; msg.appendChild(hi);
    var start = $("[data-game-start]");
    start.textContent = "Continue?";
    attract.hidden = false;
    pauseBtn.disabled = true; pauseBtn.textContent = "Pause";
    canvas.setAttribute("tabindex", "-1");
    say(title + ". Score " + g.score + ", high score " + g.hi + ".");
    start.focus();
  }

  function update(dt) {
    g.t += dt;
    var move = (keys.left ? -1 : 0) + (keys.right ? 1 : 0);
    g.ship = clampShip(g.ship + move * 240 * dt / 1000);
    var bots = alive();
    if (!bots.length) {
      g.wave++; g.bots = newWave(g.wave); g.shots = []; g.bombs = []; g.stepAt = g.t + 500;
      say("Wave " + g.wave + ".");
      beep(660, 0.2);
      return;
    }
    /* The formation moves in steps, and steps faster as it thins out. */
    if (g.t >= g.stepAt) {
      var edge = bots.some(function (b) { return g.dir > 0 ? b.x + BOT_W + 8 > W - 8 : b.x - 8 < 8; });
      g.bots.forEach(function (b) { if (edge) b.y += 16; else b.x += 8 * g.dir; });
      if (edge) g.dir = -g.dir;
      /* Legs swap at most 2.5 times a second, however fast the formation steps. */
      if (g.t - g.frameAt >= 400) { g.frame++; g.frameAt = g.t; }
      g.stepAt = g.t + Math.max(70, (90 + 470 * bots.length / (COLS * ROWS)) * Math.pow(0.88, g.wave - 1));
      if (bots.some(function (b) { return b.y + BOT_H >= SHIP_Y - 6; })) { end("GAME OVER"); return; }
    }
    if (g.t >= g.bombAt) {
      var shooter = bots[Math.floor(Math.random() * bots.length)];
      g.bombs.push({ x: shooter.x + BOT_W / 2 - 2, y: shooter.y + BOT_H - 2 });
      g.bombAt = g.t + Math.max(380, 1100 - g.wave * 90) * (0.6 + Math.random() * 0.8);
    }
    /* The Deadline crosses the top now and then; it is worth a bonus. */
    if (!g.ufo && g.t >= g.ufoAt) { var r = Math.random() < 0.5; g.ufo = { x: r ? W : -UFO_W, v: r ? -90 : 90 }; }
    if (g.ufo) { g.ufo.x += g.ufo.v * dt / 1000; if (g.ufo.x < -UFO_W - 4 || g.ufo.x > W + 4) { g.ufo = null; g.ufoAt = g.t + 18000 + Math.random() * 10000; } }
    g.shots.forEach(function (s) { s.y -= 500 * dt / 1000; });
    g.bombs.forEach(function (b) { b.y += (160 + g.wave * 16) * dt / 1000; });
    g.shots = g.shots.filter(function (s) {
      if (s.y < 34) return false;
      if (g.ufo && s.x >= g.ufo.x && s.x <= g.ufo.x + UFO_W && s.y >= 38 && s.y <= 56) {
        g.score += 100; g.puffs.push({ x: g.ufo.x + 8, y: 36, until: g.t + 700, text: "+100" });
        g.ufo = null; g.ufoAt = g.t + 18000 + Math.random() * 10000; beep(330, 0.25, "triangle");
        return false;
      }
      for (var i = 0; i < bots.length; i++) {
        var b = bots[i];
        if (b.alive && s.x >= b.x && s.x <= b.x + BOT_W && s.y >= b.y && s.y <= b.y + BOT_H) { zap(b); return false; }
      }
      return true;
    });
    g.bombs = g.bombs.filter(function (b) {
      if (b.y > H - 36) return false;
      if (g.t > g.safe && b.x + 4 >= g.ship && b.x <= g.ship + SHIP_W && b.y + 8 >= SHIP_Y + 4 && b.y <= SHIP_Y + 22) { hitShip(); return false; }
      return true;
    });
    g.puffs = g.puffs.filter(function (p) { return p.until > g.t; });
  }

  function text(str, x, y, size, fill, align) {
    ctx.font = size + 'px "Jersey 25", monospace'; ctx.fillStyle = fill; ctx.textAlign = align || "left"; ctx.fillText(str, x, y);
  }
  function draw() {
    ctx.fillStyle = color.bg; ctx.fillRect(0, 0, W, H);
    ctx.textBaseline = "top";
    text("1UP " + pad(g.score, 4), 10, 6, 22, color.text);
    text("HI " + pad(Math.max(g.hi, g.score), 4), W - 10, 6, 22, color.pellet, "right");
    ctx.fillStyle = color.line; ctx.fillRect(0, 32, W, 2); ctx.fillRect(0, H - 30, W, 2);
    g.bots.forEach(function (b) { if (b.alive) sprite(b.type, g.frame, b.x, b.y + (BOT_H - sheet[b.type].h), color[TINT[b.type]]); });
    if (g.ufo) sprite("deadline", 0, g.ufo.x, 38, color.red);
    g.puffs.forEach(function (p) { if (p.text) text(p.text, p.x, p.y, 22, color.pellet); else sprite("puff", 0, p.x, p.y, color.text); });
    /* After a hit the ship blinks at 2.5 Hz for 1.4 s: below the 3 Hz flash limit, and a small area. */
    if (g.t > g.safe || Math.floor(g.t / 200) % 2 === 0) sprite("ship", 0, g.ship, SHIP_Y, color.lime);
    ctx.fillStyle = color.text; g.shots.forEach(function (s) { ctx.fillRect(Math.round(s.x) - 1, Math.round(s.y), 2, 10); });
    ctx.fillStyle = color.red; g.bombs.forEach(function (b) { ctx.fillRect(Math.round(b.x), Math.round(b.y), 4, 8); });
    for (var i = 0; i < Math.min(g.lives, 6); i++) sprite("heart", 0, 10 + i * 26, H - 24, color.red);
    if (g.lives > 6) text("x" + g.lives, 170, H - 26, 22, color.text);
    text("WAVE " + g.wave, W - 10, H - 26, 22, color["text-2"], "right");
    if (g.paused && !g.over) {
      ctx.fillStyle = "rgba(11,12,20,.82)"; ctx.fillRect(0, 204, W, 92);
      text("PAUSED", W / 2, 216, 40, color.pellet, "center");
      text("P OR TAP TO RESUME", W / 2, 262, 22, color.text, "center");
    }
  }
  function loop(now) {
    raf = 0;
    if (!g || g.over || g.paused) return;
    var dt = Math.min(50, now - last); last = now;
    update(dt); draw();
    if (!g.over && !g.paused) raf = requestAnimationFrame(loop);
  }
  function run() { if (!raf) { last = performance.now(); raf = requestAnimationFrame(loop); } }
  function setPaused(p, why) {
    if (!g || g.over || g.paused === p) return;
    g.paused = p; keys = {};
    pauseBtn.textContent = p ? "Resume" : "Pause";
    if (p) { cancelAnimationFrame(raf); raf = 0; draw(); say("Paused" + (why ? " (" + why + ")" : "") + ". Press P or Resume."); }
    else { say("Playing."); run(); }
  }
  function play() {
    readColors(); fit();
    g = newGame(); keys = {};
    feed.textContent = ""; feedEmpty.hidden = false;
    attract.hidden = true;
    pauseBtn.disabled = false; pauseBtn.textContent = "Pause";
    canvas.setAttribute("tabindex", "0");
    canvas.setAttribute("aria-label", "Bounds Invaders game screen. Arrow keys move, Space fires, P pauses, Escape leaves the game.");
    canvas.focus({ preventScroll: true });
    /* Bring the whole cabinet, touch controls included, under the sticky header. */
    box.scrollIntoView({ block: "start" });
    say("Wave 1. " + g.lives + " lives. Arrow keys move, Space fires.");
    run();
    /* The script and sprites load after the button press: the visitor may already be elsewhere. */
    if (document.hidden) setPaused(true, "tab hidden");
    else if (!document.hasFocus()) setPaused(true, "window lost focus");
  }

  function isLeft(k) { return k === "ArrowLeft" || k === "a" || k === "A"; }
  function isRight(k) { return k === "ArrowRight" || k === "d" || k === "D"; }
  function steer(e) {
    if (!g || g.over || g.paused) return;
    var r = canvas.getBoundingClientRect();
    g.ship = clampShip((e.clientX - r.left) / r.width * W - SHIP_W / 2);
  }
  function bind() {
    bound = true;
    canvas.addEventListener("keydown", function (e) {
      if (!g || g.over) return;
      var k = e.key;
      if (k === "Escape") { setPaused(true, "you left the game"); canvas.blur(); return; }
      if (k === "p" || k === "P") { setPaused(!g.paused); e.preventDefault(); return; }
      if (g.paused) return;
      if (isLeft(k)) { keys.left = true; e.preventDefault(); }
      else if (isRight(k)) { keys.right = true; e.preventDefault(); }
      else if (k === " " || k === "ArrowUp") { fire(); e.preventDefault(); }
    });
    canvas.addEventListener("keyup", function (e) { if (isLeft(e.key)) keys.left = false; if (isRight(e.key)) keys.right = false; });
    canvas.addEventListener("blur", function () { keys = {}; });
    /* Drag on the screen to steer; a tap fires (and resumes when paused). */
    canvas.addEventListener("pointerdown", function (e) {
      if (!g || g.over) return;
      if (g.paused) { setPaused(false); return; }
      canvas.setPointerCapture(e.pointerId); steer(e); fire();
    });
    canvas.addEventListener("pointermove", function (e) { if (e.buttons || e.pointerType === "touch") steer(e); });
    Array.prototype.forEach.call(box.querySelectorAll("[data-ctl]"), function (btn) {
      var ctl = btn.dataset.ctl;
      function down(e) { e.preventDefault(); if (!g || g.over) return; if (g.paused) setPaused(false); if (ctl === "fire") fire(); else keys[ctl] = true; }
      function up() { if (ctl !== "fire") keys[ctl] = false; }
      btn.addEventListener("pointerdown", down);
      ["pointerup", "pointerleave", "pointercancel"].forEach(function (t) { btn.addEventListener(t, up); });
      /* Keyboard and switch users: each activation is one nudge or one shot. */
      btn.addEventListener("click", function (e) { if (e.detail === 0 && g && !g.over && !g.paused) { if (ctl === "fire") fire(); else g.ship = clampShip(g.ship + (ctl === "left" ? -28 : 28)); } });
      btn.addEventListener("contextmenu", function (e) { e.preventDefault(); });
    });
    pauseBtn.addEventListener("click", function () { if (g) setPaused(!g.paused); });
    soundBtn.addEventListener("click", function () {
      soundOn = !soundOn;
      soundBtn.setAttribute("aria-pressed", String(soundOn));
      soundBtn.textContent = "Sound: " + (soundOn ? "on" : "off");
      beep(660, 0.08);
    });
    window.addEventListener("blur", function () { setPaused(true, "window lost focus"); });
    document.addEventListener("visibilitychange", function () { if (document.hidden) setPaused(true, "tab hidden"); });
    if ("IntersectionObserver" in window) {
      /* Pause once the screen has been in view and then leaves it (not while it is still scrolling in). */
      var seen = false;
      new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) seen = true; else if (seen) setPaused(true, "scrolled away");
      }, { threshold: 0.2 }).observe(canvas);
    }
    window.addEventListener("resize", fit);
    /* A cleared high score shows at once on the next screen. */
    window.addEventListener("bounds:score", function () { if (g && g.over) g.hi = hiScore(); });
  }

  function start(el) {
    if (g && !g.over) return;
    box = el; canvas = $("[data-game-canvas]"); ctx = canvas.getContext("2d");
    attract = $("[data-game-attract]"); statusEl = $("[data-game-status]");
    feed = $("[data-game-feed]"); feedEmpty = $("[data-game-feed-empty]");
    pauseBtn = $("[data-game-pause]"); soundBtn = $("[data-game-sound]");
    if (sheet) { play(); return; }
    try { posts = JSON.parse(document.getElementById("arcade-posts").textContent) || {}; } catch (e) { posts = {}; }
    say("Loading sprites…");
    fetch(box.dataset.spriteData || document.body.dataset.spriteData, { credentials: "same-origin" }).then(function (r) { return r.json(); }).then(function (d) {
      sheet = d.sprites;
      if (!bound) bind();
      play();
    }).catch(function () { say("The game could not load. Try again."); });
  }

  (window.boundsGames = window.boundsGames || {}).invaders = { start: start, state: function () { return g; } };
})();
