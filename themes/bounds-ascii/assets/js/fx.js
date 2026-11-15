/* ============================================================================
   bounds.dev — fx.js (arcade bundle, first after the config; loaded only for the arcade theme)
   Progressive enhancement only: every arcade page is complete and still without it.
     (a) window.boundsArcade: the sprite sheet URL, sizes and a sprite builder (the same markup
         as the Hugo partial sprite.html) for arcade-skin.js and the games. arcade-skin.js adds
         enable()/disable() and motion().
     (b) Scroll reveals (decorative blocks only), score counters, ambient-loop pausing
         (off screen and hidden tab), the formation parking after two passes.
     (c) Depth: slabs tilt toward a fine pointer with their edge following; sprites marked
         data-depth get seven silhouette layers on first hover or tap and turn; the hero title's
         side follows the pointer. One delegated pointermove, rAF-throttled, writing custom
         properties only; one pointerdown for tap-to-turn on touch.
   All of it runs only while <html data-theme="arcade" data-motion="on">. window.boundsFx.start()
   (after arcade-skin.js has added its pieces) and stop() (before it removes them) attach and
   detach every listener and observer, and stop() clears every class and property it set.
   Nothing runs per frame unless the pointer is moving over a slab or a counter is ticking.
   ============================================================================ */
(function () {
  "use strict";

  var root = document.documentElement;
  var cfg = window.boundsArcadeConfig || {};
  function moving() { return root.dataset.theme === "arcade" && root.dataset.motion === "on"; }
  function $$(sel, el) { return Array.prototype.slice.call((el || document).querySelectorAll(sel)); }

  /* ---------- (a) PUBLIC HOOKS ---------- */
  var SVGNS = "http://www.w3.org/2000/svg";
  var DEPTH = 7;
  var sizes = cfg.sprites || {};
  function frameSvg(prefix, name, frame, w, h, cls) {
    var svg = document.createElementNS(SVGNS, "svg");
    svg.setAttribute("class", "spr__f spr__f" + cls);
    svg.setAttribute("viewBox", "0 0 " + w + " " + h);
    svg.setAttribute("shape-rendering", "crispEdges");
    svg.setAttribute("focusable", "false");
    svg.setAttribute("aria-hidden", "true");
    var use = document.createElementNS(SVGNS, "use");
    use.setAttribute("href", (cfg.sheet || "") + "#" + prefix + name + "-" + frame);
    svg.appendChild(use);
    return svg;
  }
  /* extrude(host): stack silhouette copies behind the face so the sprite has real sides when it
     turns. Built on first hover or tap, never for the whole page. */
  function extrude(host) {
    if (!host || host.dataset.extruded) return;
    var vox = host.querySelector(".vox"), face = host.querySelector(".spr");
    if (!vox || !face) return;
    host.dataset.extruded = "1";
    var name = host.dataset.sprite;
    var w = face.style.getPropertyValue("--w"), h = face.style.getPropertyValue("--h");
    var frames = $$(".spr__f use", face).map(function (u) { return u.getAttribute("href").split("-").pop(); });
    var anim = host.hasAttribute("data-anim");
    var back = document.createDocumentFragment();
    for (var i = DEPTH; i >= 1; i--) {
      var layer = document.createElement("span");
      layer.className = "spr vox__d";
      layer.style.cssText = "--w:" + w + ";--h:" + h + ";--i:" + i;
      frames.forEach(function (f, n) { layer.appendChild(frameSvg("sil-", name, f, w, h, anim ? n : 0)); });
      back.appendChild(layer);
    }
    vox.insertBefore(back, vox.firstChild);
    /* Restart the frame cycle so the new layers swap in step with the face. */
    if (anim) {
      host.removeAttribute("data-anim");
      void host.offsetWidth;
      host.setAttribute("data-anim", "");
    }
  }
  /* sprite(name, opts): a sprite element like the Hugo partial makes.
     opts: frame (0|1), anim, kind, s (scale), cls, depth (true|"always"), rock. */
  function sprite(name, opts) {
    opts = opts || {};
    var data = sizes[name];
    var host = document.createElement("span");
    host.className = "spr-host" + (opts.cls ? " " + opts.cls : "");
    host.dataset.sprite = name;
    host.setAttribute("aria-hidden", "true");
    if (opts.kind) host.dataset.kind = opts.kind;
    if (opts.s) host.style.setProperty("--s", opts.s);
    if (opts.depth) host.setAttribute("data-depth", opts.depth === "always" ? "always" : "");
    if (opts.rock) host.setAttribute("data-rock", "");
    var w = data ? data.w : 28, h = data ? data.h : 28, count = data ? data.frames : 1;
    var vox = document.createElement("span");
    vox.className = "vox";
    var face = document.createElement("span");
    face.className = "spr";
    face.style.cssText = "--w:" + w + ";--h:" + h;
    if (opts.anim && count > 1 && opts.frame == null) {
      host.setAttribute("data-anim", "");
      face.appendChild(frameSvg("spr-", name, 0, w, h, 0));
      face.appendChild(frameSvg("spr-", name, 1, w, h, 1));
    } else {
      face.appendChild(frameSvg("spr-", name, opts.frame || 0, w, h, 0));
    }
    vox.appendChild(face);
    host.appendChild(vox);
    return host;
  }
  window.boundsArcade = {
    sheet: cfg.sheet || "",
    sizes: sizes,
    sprite: sprite,
    extrude: extrude,
    moving: moving
  };

  /* ---------- Listener and observer bookkeeping for start()/stop() ---------- */
  var offs = [];
  function on(target, type, fn, opts) {
    target.addEventListener(type, fn, opts);
    offs.push(function () { target.removeEventListener(type, fn, opts); });
  }
  function observer(o) { offs.push(function () { o.disconnect(); }); return o; }

  /* ---------- (b) REVEALS, COUNTERS, AMBIENT ---------- */
  function countUp(el) {
    var target = parseInt(el.dataset.count, 10);
    if (!moving() || !(target > 0)) { el.textContent = el.dataset.count; return; }
    var start = null, dur = 700;
    function frame(t) {
      if (start === null) start = t;
      var p = Math.min(1, (t - start) / dur);
      el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1 && moving()) window.requestAnimationFrame(frame); else el.textContent = el.dataset.count;
    }
    window.requestAnimationFrame(frame);
  }
  function revealAll() { $$(".kc-reveal").forEach(function (el) { el.classList.add("is-in"); }); }
  function finishCounters() { $$("[data-count]").forEach(function (el) { el.textContent = el.dataset.count; }); }

  function startObservers() {
    if (!("IntersectionObserver" in window)) { revealAll(); return; }
    var vh = window.innerHeight || 800;
    /* Reveal: only blocks that start below the fold are armed (hidden), so nothing in view on load
       ever blinks out. Still motion never arms one. */
    var reveal = observer(new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add("is-in"); reveal.unobserve(entry.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px" }));
    $$(".kc-reveal").forEach(function (el) {
      if (moving() && el.getBoundingClientRect().top > vh * 0.92) { el.classList.add("is-armed"); reveal.observe(el); }
      else el.classList.add("is-in");
    });
    /* Score counters tick up once when they come into view. */
    var counted = observer(new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { counted.unobserve(entry.target); countUp(entry.target); }
      });
    }, { threshold: 1 }));
    $$("[data-count]").forEach(function (el) {
      if (moving() && el.getBoundingClientRect().top > vh) { el.textContent = "0"; counted.observe(el); }
      else if (moving()) countUp(el);
    });
    /* Ambient loops pause while off screen. */
    var ambient = observer(new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) { entry.target.classList.toggle("is-offscreen", !entry.isIntersecting); });
    }));
    $$("[data-ambient]").forEach(function (el) { ambient.observe(el); });
  }

  function startFormation() {
    /* The formation parks after two passes, until the hero is hovered or focused. */
    var formation = document.querySelector(".kc-formation");
    var hero = document.querySelector(".kc-arcade");
    if (!formation || !hero) return;
    var passes = 0;
    var engaged = function () { return hero.matches(":hover") || hero.matches(":focus-within"); };
    on(formation, "animationiteration", function (event) {
      if (event.target !== formation) return;
      passes++;
      if (passes >= 2 && !engaged()) formation.classList.add("is-parked");
    });
    var wake = function () { formation.classList.remove("is-parked"); passes = 0; };
    on(hero, "pointerenter", wake);
    on(hero, "focusin", wake);
  }

  /* ---------- (c) DEPTH: tilt, sprite turn, title side ---------- */
  var hot = null, pending = null, queued = false;
  var TILT_VARS = ["--tx", "--ty", "--ex", "--ey", "--mx", "--my", "--hx", "--hy"];
  function depthSprites(el) {
    var list = $$(".spr-host[data-depth]", el);
    if (el.matches(".spr-host[data-depth]")) list.push(el);
    return list;
  }
  function settle(el) {
    el.classList.remove("is-tracking");
    TILT_VARS.forEach(function (k) { el.style.removeProperty(k); });
    if (!el.getAttribute("style")) el.removeAttribute("style");
    depthSprites(el).forEach(function (sp) {
      var v = sp.querySelector(".vox");
      if (v) { v.classList.remove("is-tracking"); v.style.removeProperty("--rx"); v.style.removeProperty("--ry"); }
    });
  }
  function settleAll() { if (hot) settle(hot); hot = null; }
  function track(el, x, y) {
    var r = el.getBoundingClientRect();
    if (!r.width || !r.height) return;
    var nx = Math.max(-1, Math.min(1, (x - r.left) / r.width * 2 - 1));
    var ny = Math.max(-1, Math.min(1, (y - r.top) / r.height * 2 - 1));
    el.classList.add("is-tracking");
    if (el.classList.contains("kc-arcade")) {
      el.style.setProperty("--hx", (-nx * 0.085).toFixed(3) + "em");
      el.style.setProperty("--hy", (0.04 - ny * 0.07).toFixed(3) + "em");
    } else if (el.hasAttribute("data-tilt")) {
      /* The angle scales with size, so the edge travels a similar distance on anything. */
      var soft = el.dataset.tilt === "soft", max = soft ? 2.5 : Math.max(3.5, Math.min(9, 1400 / r.width));
      var lip = parseFloat(getComputedStyle(el).getPropertyValue("--lip")) || 6;
      el.style.setProperty("--tx", (-ny * max).toFixed(2) + "deg");
      el.style.setProperty("--ty", (nx * max).toFixed(2) + "deg");
      el.style.setProperty("--ex", (-nx * (soft ? 4 : 8)).toFixed(1) + "px");
      el.style.setProperty("--ey", (lip - ny * (soft ? 2 : 4)).toFixed(1) + "px");
      el.style.setProperty("--mx", ((nx + 1) * 50).toFixed(1) + "%");
      el.style.setProperty("--my", ((ny + 1) * 50).toFixed(1) + "%");
    }
    depthSprites(el).forEach(function (sp) {
      extrude(sp);
      var v = sp.querySelector(".vox");
      if (!v) return;
      v.classList.add("is-tracking");
      v.style.setProperty("--rx", (-ny * 24).toFixed(1) + "deg");
      v.style.setProperty("--ry", (nx * 32).toFixed(1) + "deg");
    });
  }
  /* The reading column never tilts or turns. */
  function tiltHost(target) {
    if (!target || !target.closest || target.closest(".post-content")) return null;
    return target.closest(".kc-arcade, [data-tilt], .spr-host[data-depth]");
  }
  var finePointer = window.matchMedia && window.matchMedia("(pointer: fine)");

  function startDepth() {
    on(document, "pointermove", function (event) {
      if (event.pointerType === "touch" || !moving() || (finePointer && !finePointer.matches && event.pointerType !== "mouse")) return;
      pending = event;
      if (queued) return;
      queued = true;
      window.requestAnimationFrame(function () {
        queued = false;
        if (!pending || !moving()) return;
        var el = tiltHost(pending.target);
        if (hot && hot !== el) settle(hot);
        hot = el;
        if (el) track(el, pending.clientX, pending.clientY);
      });
    }, { passive: true });
    on(root, "pointerleave", settleAll);
    on(window, "blur", settleAll);
    on(window, "scroll", settleAll, { passive: true });

    /* Touch: a tap on a sprite with depth (or on the slab around one) plays one turn. */
    on(document, "pointerdown", function (event) {
      if (event.pointerType !== "touch" || !moving()) return;
      var host = event.target.closest && event.target.closest(".spr-host[data-depth], [data-tilt]");
      if (!host || host.closest(".post-content")) return;
      depthSprites(host).forEach(function (sp) {
        if (sp.hasAttribute("data-rock")) return;
        extrude(sp);
        var v = sp.querySelector(".vox");
        if (!v) return;
        v.classList.remove("is-peek");
        void v.offsetWidth;
        v.classList.add("is-peek");
        v.addEventListener("animationend", function () { v.classList.remove("is-peek"); }, { once: true });
      });
    }, { passive: true });

    /* Sprites marked data-depth="always" (the hero mascot) get their layers now. */
    if (moving()) $$('.spr-host[data-depth="always"]').forEach(extrude);
  }

  /* Still: finish reveals and counters at once, and let every slab settle. */
  function onMotion() {
    if (moving()) { $$('.spr-host[data-depth="always"]').forEach(extrude); return; }
    revealAll();
    finishCounters();
    settleAll();
  }

  var running = false;
  window.boundsFx = {
    start: function () {
      if (running) return;
      running = true;
      root.classList.add("has-fx");
      startObservers();
      startFormation();
      startDepth();
      on(document, "visibilitychange", function () { root.classList.toggle("is-hidden-tab", document.hidden); });
      on(document, "bounds:motion", onMotion);
    },
    stop: function () {
      if (!running) return;
      running = false;
      settleAll();
      while (offs.length) offs.pop()();
      root.classList.remove("has-fx", "is-hidden-tab");
      $$(".is-armed, .is-in, .is-offscreen, .is-parked, .is-peek, .is-tracking").forEach(function (el) {
        el.classList.remove("is-armed", "is-in", "is-offscreen", "is-parked", "is-peek", "is-tracking");
      });
      finishCounters();
    }
  };
})();
