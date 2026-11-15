/* Bounds Arcade lookbook — progressive enhancement only. Nothing here runs per frame except the
   scroll handler (one rAF per scroll burst) and the counters while they tick. The game is a
   separate file, loaded on the first press of Insert coin. */
(function () {
  "use strict";
  var root = document.documentElement;
  var Sprites = window.BoundsSprites;
  function $(sel, el) { return (el || document).querySelector(sel); }
  function $$(sel, el) { return Array.prototype.slice.call((el || document).querySelectorAll(sel)); }
  function calm() { return root.dataset.fx !== "on"; }
  function store(key, value) { try { localStorage.setItem(key, value); } catch (e) { /* private mode */ } }

  /* ---------- Motion: one pause button. There is no FX switch; reduced motion pauses on its own. ---------- */
  var motionBtn = $("#motion");
  function syncMotion() {
    if (!motionBtn) return;
    motionBtn.setAttribute("aria-pressed", String(calm()));
    motionBtn.setAttribute("aria-label", calm() ? "Play animations" : "Pause animations");
    motionBtn.textContent = calm() ? "Play" : "Pause";
  }
  if (motionBtn) motionBtn.addEventListener("click", function () {
    root.dataset.fx = calm() ? "on" : "calm";
    store("arcade-lookbook-motion", calm() ? "paused" : "playing");
    syncMotion();
    document.dispatchEvent(new CustomEvent("arcade:fx", { detail: root.dataset.fx }));
    if (calm()) { $$(".reveal").forEach(function (el) { el.classList.add("is-in"); }); settleAll(); }
  });
  syncMotion();

  /* ---------- Palette swatches with live contrast ratios ---------- */
  var PALETTES = [
    { id: "arcade", name: "Arcade", bg: "#13141F", ink: "#ECE7DA", soft: "#343853", roles: [
      ["bg", "#13141F", "page"], ["surface", "#1C1E2E", "cards, panels"], ["well", "#272A3F", "code, stripes"],
      ["text", "#ECE7DA", "body"], ["text-2", "#BDBBCD", "secondary"], ["text-3", "#A09EB8", "meta"],
      ["line", "#7F88C4", "borders, focus"], ["pellet", "#E9C46A", "accent"], ["cyan", "#7CC8D4", "writing"],
      ["orange", "#E8A470", "photos"], ["pink", "#E391B8", "bot limericks"], ["lime", "#8FD3A2", "pages, success"], ["red", "#EA8A86", "danger"]] }
  ];
  function lum(hex) {
    var c = [1, 3, 5].map(function (i) { var v = parseInt(hex.substr(i, 2), 16) / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }
  function contrast(a, b) { var la = lum(a), lb = lum(b); return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05); }
  window.arcadeContrast = contrast;
  window.arcadePalettes = PALETTES;
  function renderPalettes() {
    var host = $("#palettes");
    if (!host) return;
    host.innerHTML = PALETTES.map(function (p) {
      var surfaces = p.roles.slice(0, 3).map(function (r) { return r[1]; });
      var cells = p.roles.map(function (r, i) {
        var isSurface = i < 3, line;
        if (isSurface) {
          line = '<span class="ratio" data-pass="' + (contrast(p.ink, r[1]) >= 4.5) + '">text ' + contrast(p.ink, r[1]).toFixed(1) + ":1</span>";
        } else {
          // The lowest ratio across the three surfaces is the one that has to pass.
          var worst = Math.min.apply(null, surfaces.map(function (s) { return contrast(r[1], s); }));
          line = '<span class="ratio" data-pass="' + (worst >= (r[0] === "line" ? 3 : 4.5)) + '">' + contrast(r[1], p.bg).toFixed(1) + ":1 · low " + worst.toFixed(1) + "</span>";
        }
        return '<div class="sw"><div class="sw__chip" style="background:' + r[1] + ";color:" + (contrast(p.ink, r[1]) >= contrast(p.bg, r[1]) ? p.ink : p.bg) +
          ";box-shadow:inset 0 0 0 2px " + p.soft + ", 0 3px 0 " + p.soft + '">' + r[0] + "</div><b>" + r[2] + "</b><code>" + r[1] + "</code><br>" + line + "</div>";
      }).join("");
      var current = p.id === root.dataset.theme ? " (showing)" : "";
      return '<div class="pal px" data-tilt="soft" style="--edge-ink:' + "#05060C" + ";--bg:" + p.bg + ";--text:" + p.ink + ";--text-2:" + p.ink + ";--line:" + p.roles[6][1] + ";--line-soft:" + p.soft +
        ";--lime:" + p.roles[11][1] + ";--red:" + p.roles[12][1] + ";--surface:" + p.bg + '"><h3 class="pal__name">' + p.name + current + '</h3><div class="swatches">' + cells + "</div></div>";
    }).join("");
  }
  renderPalettes();

  /* ---------- Sprite sheet ---------- */
  var CAST = [
    ["typist", "Typist", "writing invader", "writing"], ["drone", "Drone", "photo invader", "photo"], ["crawler", "Crawler", "limerick invader", "bots"],
    ["ship", "Caret", "the player", "page"], ["deadline", "The Deadline", "mystery saucer", "danger"], ["chomp", "Chomp", "the hungry cursor", "accent"],
    ["bug", "Heisenbug", "chaser", "danger"], ["bug", "Off-By-One", "chaser", "bots"], ["bug", "Null", "chaser", "writing"], ["bug", "Race", "chaser", "photo"],
    ["bug", "Fixed", "after a power pellet", "maze"], ["power", "Power pellet", "25/50/75% read", "accent"], ["pellet", "Pellet", "progress", "accent"],
    ["coffee", "Coffee", "bonus", "photo"], ["floppy", "Floppy", "bonus", "writing"], ["duck", "Rubber duck", "bonus", "accent"], ["camera", "Camera", "photos glyph", "photo"],
    ["cherry", "Cherries", "bonus", "danger"], ["heart", "Life", "lives", "danger"], ["coin", "Coin", "footer slot", "accent"], ["star", "Star", "star field", "page"], ["puff", "Puff", "a zapped bot", "bots"]
  ];
  var sheet = $("#sheet");
  if (sheet) {
    sheet.innerHTML = CAST.map(function (c) {
      return '<div class="sheet__cell px reveal" data-tilt data-kind="' + c[3] + '"><span data-sprite="' + c[0] + '" data-anim data-depth></span><b>' + c[1] + '</b><span class="d">' + c[2] + "</span></div>";
    }).join("");
  }

  /* ---------- Hero: formation and star field ---------- */
  var formation = $(".formation");
  if (formation) {
    var rows = [["crawler", "bots"], ["drone", "photo"], ["typist", "writing"]];
    formation.innerHTML = rows.map(function (r) {
      var cell = '<span data-sprite="' + r[0] + '" data-anim data-kind="' + r[1] + '"></span>';
      return new Array(8).join(cell);
    }).join("");
    formation.classList.add("is-marching");
  }
  // Stars are box-shadows on three 1-2 px elements: no canvas, no per-frame script. The field
  // repeats every 600 px, so drifting one period loops without a seam.
  (function () {
    var seed = 7;
    function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
    $$(".stars i").forEach(function (layer, n) {
      var count = [70, 40, 16][n], out = [];
      for (var i = 0; i < count; i++) {
        var x = Math.round(rnd() * 1400), y = Math.round(rnd() * 600);
        out.push(x + "px " + y + "px 0 0 currentColor", x + "px " + (y + 600) + "px 0 0 currentColor");
      }
      layer.style.top = "-600px";
      layer.style.boxShadow = out.join(",");
    });
  })();

  Sprites.mount(document);
  var sheetNote = $("[data-sheet-size]");
  if (sheetNote) sheetNote.textContent = "The whole set is one SVG symbol sheet of " + (Sprites.sheetSize / 1000).toFixed(1) + " KB before compression, silhouettes for the depth layers included.";

  /* ---------- Reading progress: Chomp, pellets, score ---------- */
  var bar = $(".chompbar"), scoreEl = $("[data-score]"), powers = $$(".chompbar__power");
  var barTrack = $(".chompbar__track"), cover = $(".chompbar__eaten"), chompEl = $(".chompbar__chomp");
  var lastY = 0, ticking = false, idle = null, PITCH = 24, trackW = 0, chompW = 0, pellets = 1, lastPop = -1e9;
  /* Measured on load and resize only. Power pellets take the pellet nearest 25, 50 and 75%. */
  function measureBar() {
    if (!barTrack || !chompEl) return;
    trackW = barTrack.getBoundingClientRect().width;
    chompW = chompEl.getBoundingClientRect().width;
    pellets = Math.max(1, Math.round(trackW / PITCH));
    powers.forEach(function (p, i) {
      p.pellet = Math.min(pellets - 1, Math.max(0, Math.round((i + 1) / 4 * pellets - 0.5)));
      p.style.left = ((p.pellet + 0.5) * PITCH) + "px";
    });
  }
  function pad(n, len) { var s = String(n); while (s.length < len) s = "0" + s; return s; }
  function updateProgress() {
    ticking = false;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    var y = window.scrollY, read = max > 0 ? Math.min(1, Math.max(0, y / max)) : 0;
    root.style.setProperty("--read", read.toFixed(4));
    /* One number, two transforms: the mouth (Chomp's centre) runs from flush left to flush right,
       and the cover hides every pellet whose centre the mouth has reached. */
    var mouth = chompW / 2 + read * Math.max(0, trackW - chompW);
    var gone = read <= 0 ? 0 : read >= 1 ? pellets : Math.min(pellets, Math.max(0, Math.floor(mouth / PITCH + 0.5)));
    if (chompEl) chompEl.style.transform = "translate3d(" + (mouth - chompW / 2).toFixed(2) + "px,0,0)";
    if (cover) cover.style.transform = "scaleX(" + (gone / pellets) + ")";
    var bonus = 0, now = performance.now();
    powers.forEach(function (p) {
      var eaten = p.pellet < gone, was = p.classList.contains("is-eaten");
      if (eaten) bonus += 500;
      if (eaten === was) return;
      /* A pop only when eaten going forward, with motion on, and never two within 350 ms. */
      var pop = eaten && !calm() && y > lastY && now - lastPop >= 350;
      p.classList.toggle("is-eaten", eaten);
      p.classList.toggle("is-pop", pop);
      if (pop) lastPop = now;
    });
    if (scoreEl) scoreEl.textContent = pad(Math.round(read * 100) * 10 + bonus, 6);
    if (y < 240) $$(".hud__nav [aria-current]").forEach(function (a) { a.removeAttribute("aria-current"); });
    if (bar) {
      bar.classList.toggle("is-back", y < lastY);
      // Chomp only chews while the page is moving.
      $$(".spr use", bar).forEach(function (u) { u.style.animationPlayState = "running"; });
      clearTimeout(idle);
      idle = setTimeout(function () { $$(".spr use", bar).forEach(function (u) { u.style.animationPlayState = "paused"; }); }, 220);
    }
    lastY = y;
  }
  window.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(updateProgress); } }, { passive: true });
  window.addEventListener("resize", function () { measureBar(); updateProgress(); });
  measureBar();
  updateProgress();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { measureBar(); updateProgress(); });

  /* ---------- Nav: mark the section in view ---------- */
  if ("IntersectionObserver" in window) {
    var links = $$(".hud__nav a");
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        links.forEach(function (a) {
          if (a.getAttribute("href") === "#" + entry.target.id) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current");
        });
      });
    }, { rootMargin: "-30% 0px -60% 0px" });
    $$("section[id]").forEach(function (s) { spy.observe(s); });

    /* Scroll reveals (decorative blocks only) and ambient-loop pausing. */
    var reveal = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) { if (entry.isIntersecting) { entry.target.classList.add("is-in"); reveal.unobserve(entry.target); } });
    }, { rootMargin: "0px 0px -8% 0px" });
    $$(".reveal").forEach(function (el) { if (calm()) el.classList.add("is-in"); else reveal.observe(el); });
    var ambient = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) { entry.target.classList.toggle("is-offscreen", !entry.isIntersecting); });
    });
    $$("[data-ambient]").forEach(function (el) { ambient.observe(el); });
    var counted = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) { if (entry.isIntersecting) { countUp(entry.target); counted.unobserve(entry.target); } });
    }, { threshold: 1 });
    $$("[data-count]").forEach(function (el) { counted.observe(el); });
  } else {
    $$(".reveal").forEach(function (el) { el.classList.add("is-in"); });
  }

  /* ---------- Depth: slabs and sprites turn toward the pointer ----------
     One delegated pointermove, one rAF per frame, and only custom properties are written.
     A slab's rotation and the offset of its edge come from the same two numbers, so the edge you
     see is the one the turn would show. Sprites get their real layers the first time they are
     touched. Off in Calm, and off for touch (a tap plays one turn instead). */
  var hot = null, heroEl = $(".hero"), pending = null, queued = false;
  var TILT_VARS = ["--tx", "--ty", "--ex", "--ey", "--mx", "--my", "--hx", "--hy"];
  function sprites3d(el) { return $$("[data-sprite][data-depth]", el).concat(el.matches("[data-sprite][data-depth]") ? [el] : []); }
  function settle(el) {
    el.classList.toggle("is-tracking", false);
    TILT_VARS.forEach(function (k) { el.style.setProperty(k, ""); });
    sprites3d(el).forEach(function (sp) {
      var v = $(".vox", sp);
      if (v) { v.classList.toggle("is-tracking", false); v.style.setProperty("--rx", ""); v.style.setProperty("--ry", ""); }
    });
  }
  function settleAll() { if (hot) settle(hot); hot = null; }
  function track(el, x, y) {
    var r = el.getBoundingClientRect();
    if (!r.width || !r.height) return;
    var nx = Math.max(-1, Math.min(1, (x - r.left) / r.width * 2 - 1)), ny = Math.max(-1, Math.min(1, (y - r.top) / r.height * 2 - 1));
    var soft = el.dataset.tilt === "soft", max = soft ? 2.5 : Math.max(3.5, Math.min(9, 1400 / r.width));
    el.classList.add("is-tracking");
    if (el === heroEl) {
      el.style.setProperty("--hx", (-nx * 0.085).toFixed(3) + "em");
      el.style.setProperty("--hy", (0.04 - ny * 0.07).toFixed(3) + "em");
    } else if (el.hasAttribute("data-tilt")) {
      el.style.setProperty("--tx", (-ny * max).toFixed(2) + "deg");
      el.style.setProperty("--ty", (nx * max).toFixed(2) + "deg");
      el.style.setProperty("--ex", (-nx * (soft ? 4 : 8)).toFixed(1) + "px");
      el.style.setProperty("--ey", (6 - ny * (soft ? 2 : 4)).toFixed(1) + "px");
      el.style.setProperty("--mx", ((nx + 1) * 50).toFixed(1) + "%");
      el.style.setProperty("--my", ((ny + 1) * 50).toFixed(1) + "%");
    }
    sprites3d(el).forEach(function (sp) {
      Sprites.extrude(sp);
      var v = $(".vox", sp);
      v.classList.add("is-tracking");
      v.style.setProperty("--rx", (-ny * 24).toFixed(1) + "deg");
      v.style.setProperty("--ry", (nx * 32).toFixed(1) + "deg");
    });
  }
  function tiltHost(target) { return target && target.closest ? target.closest(".hero") || target.closest("[data-tilt], [data-sprite][data-depth]") : null; }
  document.addEventListener("pointermove", function (event) {
    if (event.pointerType === "touch" || calm()) return;
    pending = event;
    if (queued) return;
    queued = true;
    requestAnimationFrame(function () {
      queued = false;
      var el = tiltHost(pending.target);
      if (hot && hot !== el) settle(hot);
      hot = el;
      if (el) track(el, pending.clientX, pending.clientY);
    });
  }, { passive: true });
  document.documentElement.addEventListener("pointerleave", settleAll);
  window.addEventListener("blur", settleAll);
  /* Touch: a tap on a cast tile, or on any sprite that has depth, plays one turn. */
  document.addEventListener("pointerdown", function (event) {
    if (event.pointerType !== "touch" || calm()) return;
    var cell = event.target.closest(".sheet__cell, [data-sprite][data-depth]");
    if (!cell) return;
    sprites3d(cell).forEach(function (sp) {
      if (sp.hasAttribute("data-rock")) return;
      Sprites.extrude(sp);
      var v = $(".vox", sp);
      v.classList.toggle("is-peek", false); void v.offsetWidth; v.classList.add("is-peek");
      v.addEventListener("animationend", function () { v.classList.toggle("is-peek", false); }, { once: true });
    });
  }, { passive: true });

  /* ---------- Score counters ---------- */
  function countUp(el) {
    var target = parseInt(el.dataset.count, 10);
    if (calm()) { el.textContent = target; return; }
    var start = null, dur = 700;
    function frame(t) {
      if (start === null) start = t;
      var p = Math.min(1, (t - start) / dur);
      el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  /* ---------- Replays ---------- */
  var credits = 0;
  function replay(stage) { stage.classList.remove("is-playing"); void stage.offsetWidth; stage.classList.add("is-playing"); }
  function addCredit() { credits++; $$("[data-credit]").forEach(function (el) { el.textContent = pad(credits, 2); }); }
  var countdownTimer = null;
  function countdown() {
    var el = $("[data-countdown]");
    clearInterval(countdownTimer);
    if (!el) return;
    if (calm()) { el.textContent = "9"; return; }
    var n = 9;
    el.textContent = n;
    countdownTimer = setInterval(function () { n--; el.textContent = Math.max(0, n); if (n <= 0) clearInterval(countdownTimer); }, 1000);
  }
  document.addEventListener("click", function (event) {
    var btn = event.target.closest("[data-replay]");
    if (!btn) return;
    var kind = btn.dataset.replay;
    if (kind === "countdown") { countdown(); return; }
    var stage = $('[data-demo="' + kind + '"]');
    if (kind === "count") { countUp($("[data-count]", stage)); return; }
    if (kind === "coin") { replay(stage); setTimeout(addCredit, calm() ? 0 : 520); return; }
    replay(stage);
  });

  /* ---------- Copy button ---------- */
  $$("[data-copy]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var text = $("pre", btn.closest(".code")).textContent;
      var done = function () { btn.textContent = "Copied +10"; setTimeout(function () { btn.textContent = "Copy"; }, 1400); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, done); else done();
    });
  });

  /* ---------- The old cheat code ---------- */
  var CODE = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"], pos = 0;
  var toast = $("#toast");
  function showToast(text) { toast.textContent = text; toast.hidden = false; setTimeout(function () { toast.hidden = true; }, 4000); }
  document.addEventListener("keydown", function (event) {
    var key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    pos = key === CODE[pos] ? pos + 1 : (key === CODE[0] ? 1 : 0);
    if (pos < CODE.length) return;
    pos = 0;
    window.arcadeCheat = true;
    showToast("CHEAT ON: 30 LIVES IN BOUNDS INVADERS");
    if (calm()) return;
    var storm = document.createElement("div");
    storm.className = "storm";
    storm.setAttribute("aria-hidden", "true");
    var kinds = ["writing", "photo", "bots", "danger", "accent"], names = ["typist", "drone", "crawler", "bug", "duck", "coffee", "cherry"];
    for (var i = 0; i < 22; i++) {
      storm.insertAdjacentHTML("beforeend", '<span data-kind="' + kinds[i % kinds.length] + '" style="--s:2;left:' + ((i * 37) % 96) + "%;animation-delay:" + ((i * 90) % 1100) + 'ms;color:var(--sig)">' + Sprites.svg(names[i % names.length], { anim: true }) + "</span>");
    }
    document.body.appendChild(storm);
    setTimeout(function () { storm.remove(); }, 4000);
  });

  /* ---------- Game: lazy-loaded on the first coin ---------- */
  var startBtn = $("#start"), loading = false;
  try { var hi = parseInt(localStorage.getItem("bounds-arcade-hi"), 10) || 0; $$("[data-hi]").forEach(function (el) { el.textContent = pad(hi, 4); }); } catch (e) { /* no storage */ }
  function boot() { addCredit(); window.BoundsInvaders.start(); }
  if (startBtn) {
    startBtn.addEventListener("click", function () {
      if (window.BoundsInvaders) { boot(); return; }
      if (loading) return;
      loading = true;
      startBtn.textContent = "Loading…";
      var s = document.createElement("script");
      s.src = "invaders.js";
      s.onload = function () { startBtn.textContent = "Insert coin"; boot(); };
      s.onerror = function () { loading = false; startBtn.textContent = "Insert coin"; $("#status").textContent = "The game could not load. Try again."; };
      document.head.appendChild(s);
    });
  }
})();
