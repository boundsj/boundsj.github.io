/* ============================================================================
   bounds.dev — arcade-skin.js (arcade bundle, after fx.js; loaded only for the arcade theme)
   The arcade theme is production's markup restyled by arcade.css, plus the pieces only arcade
   has, which this file adds on enable() and removes on disable(): every change goes into a
   journal and is undone in reverse, so switching back to light or dark leaves nothing behind.
     (a) Header: the decorative 1UP score, the pause/play animations button, the Chomp strip.
     (b) Home: the arcade hero (production's h1 and subtitle move into it), door heads, the
         NOW PLAYING bezel, the high-score table. Lists: high-score tables, slabs, tilt hooks.
     (c) Footer: the chase lane and the coin slot (credits tick when a game starts).
     (d) 404: GAME OVER with Bug Squash (fetched only when CONTINUE? is pressed).
     (e) Motion: <html data-motion> follows the system unless the pause button was used
         (bounds-motion); a change dispatches `bounds:motion`. Still pauses autoplaying video.
     (f) The old cheat code: a toast, a bug storm (motion on only) and 30 lives in Bounds Invaders.
   Everything added is decorative (aria-hidden) except the pause button, the hero's Insert coin
   link, the coin slot link and the Bug Squash controls. No heading or post link is duplicated.
   ============================================================================ */
(function () {
  "use strict";
  var root = document.documentElement;
  var theme = window.boundsTheme || {};
  var cfg = window.boundsArcadeConfig || {};
  var A = window.boundsArcade, fx = window.boundsFx;
  var CHEAT = "bounds-arcade-cheat";
  function $(sel, el) { return (el || document).querySelector(sel); }
  function $$(sel, el) { return Array.prototype.slice.call((el || document).querySelectorAll(sel)); }
  function isArcade() { return root.dataset.theme === "arcade"; }
  function moving() { return isArcade() && root.dataset.motion === "on"; }
  function pad(n, len) { var s = String(n); while (s.length < len) s = "0" + s; return s; }
  function sprite(name, opts) { return A.sprite(name, opts); }
  function h(tag, props, kids) {
    var el = document.createElement(tag);
    Object.keys(props || {}).forEach(function (k) {
      if (k === "class") el.className = props[k];
      else el.setAttribute(k, props[k]);
    });
    (kids || []).forEach(function (c) { el.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
    return el;
  }

  /* ---------- The journal ---------- */
  var journal = [];
  function add(node, parent, before) {
    parent.insertBefore(node, before || null);
    journal.push(function () { node.remove(); });
    return node;
  }
  function move(node, parent, before) {
    var from = node.parentNode, next = node.nextSibling;
    parent.insertBefore(node, before || null);
    journal.push(function () { from.insertBefore(node, next && next.parentNode === from ? next : null); });
  }
  function attr(el, name, value) {
    var had = el.hasAttribute(name), old = el.getAttribute(name);
    el.setAttribute(name, value);
    journal.push(function () { if (had) el.setAttribute(name, old); else el.removeAttribute(name); });
  }
  function cls(el, names) {
    names.split(" ").forEach(function (c) {
      if (!c || el.classList.contains(c)) return;
      el.classList.add(c);
      journal.push(function () { el.classList.remove(c); if (!el.className) el.removeAttribute("class"); });
    });
  }
  function swap(el, nodes) {
    var old = Array.prototype.slice.call(el.childNodes);
    el.textContent = "";
    nodes.forEach(function (n) { el.appendChild(typeof n === "string" ? document.createTextNode(n) : n); });
    journal.push(function () { el.textContent = ""; old.forEach(function (n) { el.appendChild(n); }); });
  }
  function hide(el) { if (el) attr(el, "data-arcade-hidden", ""); }
  function on(target, type, fn, opts) {
    target.addEventListener(type, fn, opts);
    journal.push(function () { target.removeEventListener(type, fn, opts); });
  }
  function undo() { while (journal.length) { try { journal.pop()(); } catch (e) { /* keep going */ } } }

  var KIND_SPRITE = { writing: "typist", photo: "camera", bots: "crawler" };
  var KIND_PLAYER = { writing: "1P", photo: "2P", bots: "CPU" };

  /* ---------- (a) HEADER ---------- */
  var motionButton = null;
  function header() {
    var head = $(".kc-header");
    if (!head) return;
    var brand = $(".kc-brand", head), control = $(".kc-theme-control", head);
    if (brand) add(h("span", { class: "kc-hud__score", "aria-hidden": "true" }, ["1UP ", h("b", { "data-score": "" }, ["000000"])]), brand.parentNode, brand.nextSibling);
    if (control) {
      motionButton = h("button", { class: "kc-motion", type: "button", "aria-label": "Pause animations" },
        [h("span", { class: "kc-motion__icon", "aria-hidden": "true" })]);
      add(motionButton, control.parentNode, control.nextSibling);
      on(motionButton, "click", toggleMotion);
      syncMotionButton();
    }
    var track = h("div", { class: "kc-chompbar__track" }, [h("span", { class: "kc-chompbar__eaten" })].concat([25, 50, 75].map(function () {
      return h("span", { class: "kc-chompbar__power" });
    })).concat([sprite("chomp", { anim: true, cls: "kc-chompbar__chomp" })]));
    var bar = h("div", { class: "kc-chompbar", "aria-hidden": "true" }, [track]);
    add(bar, head);
    progress(head, bar, track);
  }
  /* Progress strip: Chomp eats a row of pellets as the page scrolls. The number is this page's own
     scroll fraction, on every page, read in one passive, rAF-throttled scroll listener. One number p
     (0..1) places Chomp's mouth m (the sprite's centre, which a flip leaves in place), and m decides
     how many whole pellets are gone: a pellet vanishes as the mouth reaches its centre, and the eaten
     edge always falls in the gap between two pellets, never through one. Power pellets sit on real
     pellets at 25/50/75% and pop (at most one per 350 ms) only when eaten going forward with motion on.
     On posts the 1UP score is 10 per percent scrolled plus 500 per power pellet eaten. Faces the way you
     scroll and chews only while you do. Decorative only. */
  var PITCH = 24, POP_GAP = 350;
  function progress(head, bar, track) {
    var post = !!$(".kc-post[data-content-id]");
    var score = post ? $("[data-score]", head) : null;
    var eaten = $(".kc-chompbar__eaten", track), chomp = $(".kc-chompbar__chomp", track);
    var powers = $$(".kc-chompbar__power", track).map(function (node, i) { return { node: node, at: (i + 1) / 4, i: 0, eaten: null }; });
    var n = 1, w = 0, cw = 0, maxY = 0, lastPop = -Infinity, queued = 0, lastY = window.scrollY, idle = 0;
    /* Layout reads happen here only: on start, resize and layout changes, never per scroll frame. */
    function measure() {
      /* The stylesheet snaps the track to whole pellets with CSS round(). Where that is missing, snap
         it here instead (clearing the last snap first so the track can still follow the window), so
         the row never ends on half a pellet. Pellet count, mouth travel and cover all use this width. */
      track.style.width = "";
      w = track.getBoundingClientRect().width;
      var whole = Math.floor(w / PITCH + 0.001) * PITCH;
      if (whole > 0 && Math.abs(w - whole) > 0.01) { track.style.width = whole + "px"; w = whole; }
      n = Math.max(1, Math.round(w / PITCH));
      cw = chomp.getBoundingClientRect().width;
      maxY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      powers.forEach(function (pw) {
        pw.i = Math.min(n - 1, Math.max(0, Math.round(pw.at * n - 0.5)));
        pw.node.style.left = ((pw.i + 0.5) * PITCH) + "px";
      });
    }
    /* The page's own scroll fraction, on every page: 0 at the very top, 1 at the very bottom. Posts
       also have site.js's --read, but that measures the article and is already past 0 at the top
       of the page, so the track does not use it. A page that cannot scroll shows nothing eaten. */
    function read() { return maxY > 0 ? Math.min(1, Math.max(0, window.scrollY / maxY)) : 0; }
    function render() {
      var p = read();
      /* The mouth runs from cw/2 (Chomp flush left, short of the first pellet centre at PITCH/2) to
         w - cw/2 (flush right, past the last centre at w - PITCH/2). k = pellets whose centre is behind it. */
      var m = cw / 2 + p * Math.max(0, w - cw);
      var k = p <= 0 ? 0 : p >= 1 ? n : Math.min(n, Math.max(0, Math.floor(m / PITCH + 0.5)));
      chomp.style.transform = "translate3d(" + (m - cw / 2).toFixed(3) + "px,0,0)";
      /* The cover ends on a pellet boundary measured in pixels, not in fractions of the track: where
         CSS round() is missing the track is not a whole number of pellets, and k/n would cut one. */
      eaten.style.transform = "scaleX(" + (k >= n || w <= 0 ? 1 : Math.min(1, k * PITCH / w)) + ")";
      var now = window.performance ? performance.now() : Date.now(), bonus = 0;
      powers.forEach(function (pw) {
        var gone = pw.i < k;
        if (gone) bonus += 500;
        if (gone === pw.eaten) return;
        var pop = gone && pw.eaten === false && moving() && now - lastPop >= POP_GAP;
        pw.eaten = gone;
        pw.node.classList.toggle("is-eaten", gone);
        pw.node.classList.toggle("is-pop", pop);
        if (pop) lastPop = now;
      });
      if (score) score.textContent = ("000000" + (Math.round(p * 100) * 10 + bonus)).slice(-6);
    }
    function frame() { queued = 0; render(); }
    function queue() { if (!queued) queued = window.requestAnimationFrame(frame); }
    function remeasure() { measure(); render(); }
    if (window.ResizeObserver) {
      var ro = new ResizeObserver(remeasure);
      ro.observe(track);
      ro.observe(document.body);
      journal.push(function () { ro.disconnect(); });
    }
    on(window, "resize", remeasure);
    /* A pop plays once: clear its class when it ends and whenever motion changes, so pausing and
       resuming never replays it on a pellet that is already gone. */
    on(track, "animationend", function (e) { if (e.target && e.target.classList) e.target.classList.remove("is-pop"); });
    on(document, "bounds:motion", function () { powers.forEach(function (pw) { pw.node.classList.remove("is-pop"); }); });
    journal.push(function () { if (queued) window.cancelAnimationFrame(queued); queued = 0; clearTimeout(idle); });
    on(window, "scroll", function () {
      queue();
      var y = window.scrollY;
      if (y === lastY) return;
      bar.classList.toggle("is-back", y < lastY);
      bar.classList.add("is-chewing");
      clearTimeout(idle);
      idle = setTimeout(function () { bar.classList.remove("is-chewing"); }, 220);
      lastY = y;
    }, { passive: true });
    remeasure();
  }

  /* ---------- (b) HOME AND LISTS ---------- */
  function hero() {
    var profile = $(".kc-profile"), name = profile && $(".kc-profile__name", profile), sub = profile && $(".kc-profile__sub", profile);
    if (!name) return;
    var rows = [["crawler", "bots"], ["drone", "photo"], ["typist", "writing"]];
    var layers = [0, 1].map(function (f) {
      var layer = h("div", { class: "kc-formation__layer kc-formation__layer--" + f });
      rows.forEach(function (r) { for (var i = 0; i < 7; i++) layer.appendChild(sprite(r[0], { frame: f, kind: r[1] })); });
      return layer;
    });
    var cta = h("p", { class: "kc-arcade__cta" }, [h("a", { class: "kc-btn kc-btn--coin", href: cfg.arcade || "/arcade/" }, ["Insert coin"])]);
    var copy = h("div", { class: "kc-arcade__copy" }, [
      sprite("chomp", { anim: true, depth: "always", rock: true, cls: "kc-arcade__mascot" }),
      h("p", { class: "kc-arcade__eyebrow", "aria-hidden": "true" }, ["bounds.dev · press start"]),
      cta
    ]);
    var section = h("section", { class: "kc-arcade screen kc-slab", "aria-labelledby": "home-title", "data-ambient": "", "data-ui": "home_hero" }, [
      h("div", { class: "kc-arcade__pic" }, [
        h("div", { class: "kc-stars", "aria-hidden": "true" }, [h("i"), h("i"), h("i")]),
        h("div", { class: "kc-formation", "aria-hidden": "true" }, layers),
        sprite("ship", { kind: "page", cls: "kc-arcade__ship" }),
        copy
      ])
    ]);
    add(section, profile.parentNode, profile);
    if (!name.id) attr(name, "id", "home-title");
    cls(name, "kc-extrude");
    move(name, copy, cta);
    if (sub) move(sub, copy, cta);
  }

  function doors() {
    $$(".kc-door").forEach(function (door) {
      var kind = door.dataset.kind, title = $(".tui-panel__title", door);
      cls(door, "kc-slab kc-reveal");
      attr(door, "data-tilt", "");
      if (title) {
        var headDiv = add(h("div", { class: "kc-door__head" }), door, title);
        add(sprite(kind === "photo" ? "camera" : "typist", { anim: kind !== "photo", depth: true, s: 2, cls: "kc-door__sprite" }), headDiv);
        move(title, headDiv);
        cls(title, "kc-door__title");
        add(document.createTextNode(" "), title, title.firstChild);
        add(h("span", { class: "kc-door__player", "aria-hidden": "true" }, [kind === "photo" ? "2P" : "1P"]), title, title.firstChild);
      }
      var meta = $(".kc-door__meta", door), first = meta && meta.firstChild;
      var m = first && first.nodeType === 3 && /^(\d+)(.*)$/.exec(first.textContent);
      if (m) {
        var rest = Array.prototype.slice.call(meta.childNodes, 1);
        swap(meta, [h("b", { class: "kc-door__count", "data-count": m[1] }, [m[1]]), m[2]].concat(rest));
      }
    });
  }

  function sectionHeads() {
    var latest = $('[data-ui="home_latest"]'), head = latest && latest.previousElementSibling;
    if (!head || !head.classList.contains("kc-sectionhead")) return;
    var text = "";
    Array.prototype.forEach.call(head.childNodes, function (n) { if (n.nodeType === 3) text += n.textContent; });
    text = text.trim();
    swap(head, [sprite("power", { kind: "accent", s: 2 }), text.charAt(0).toUpperCase() + text.slice(1)]);
  }

  function featured() {
    $$(".kc-featured").forEach(function (f) {
      cls(f, "kc-slab kc-reveal");
      attr(f, "data-tilt", "");
      var fig = $(":scope > .kc-hero", f);
      if (!fig) return;
      cls(f, "has-hero");
      var bezel = add(h("div", { class: "kc-bezel" }), f, fig);
      move(fig, bezel);
      add(h("div", { class: "kc-bezel__strip", "aria-hidden": "true" }, [h("span", {}, ["Now playing"]), h("span", {}, [KIND_PLAYER[f.dataset.kind] || "1P"])]), bezel);
    });
  }

  /* The rank the first row on this page follows. Page N > 1 follows (N - 1) full pages: a full
     page is this page's row count, or on the last page (total - this page) / (pages - 1). */
  function rankOffset(rows) {
    if (rows.dataset.ui === "home_list") return 1;
    var pager = /page (\d+) \/ (\d+)/.exec(($(".kc-pager__n") || {}).textContent || "");
    var n = pager ? +pager[1] : 1, pages = pager ? +pager[2] : 1, here = $$(".kc-row", rows).length;
    if (n === 1) return $('[data-ui="archive_latest"]') ? 1 : 0;
    var total = parseInt(($(".kc-archive__count") || {}).textContent, 10);
    var size = n < pages || !(total > 0) ? here : (total - here) / (pages - 1);
    return (n - 1) * Math.round(size);
  }
  function scores() {
    var pager = /page (\d+) \//.exec(($(".kc-pager__n") || {}).textContent || "");
    $$(".kc-rows").forEach(function (rows) {
      var home = rows.dataset.ui === "home_list";
      var offset = rankOffset(rows);
      var wrap = add(h("div", { class: "kc-scores kc-slab", "data-tilt": "soft" }), rows.parentNode, rows);
      add(h("div", { class: "kc-scores__head", "aria-hidden": "true" }, [h("span", {}, ["High scores"]), h("span", {}, [!home && pager ? "Page " + pager[1] : "1UP"])]), wrap);
      move(rows, wrap);
      attr(rows, "style", "counter-reset: rank " + offset);
      $$(".kc-row", rows).forEach(function (row) {
        add(sprite(KIND_SPRITE[row.dataset.kind] || "typist", { cls: "kc-row__sprite" }), row);
      });
    });
  }

  function slabs() {
    $$(".kc-entry").forEach(function (el) { cls(el, "kc-slab"); attr(el, "data-tilt", ""); });
    $$(".kc-frame__link").forEach(function (el) { attr(el, "data-tilt", ""); });
    $$(".kc-postnav__a, .kc-crosslink").forEach(function (el) { cls(el, "kc-slab"); });
  }

  /* ---------- (c) FOOTER ---------- */
  var credits = 0;
  function footer() {
    var foot = $(".kc-footer"), status = foot && $(".kc-status", foot);
    if (!foot) return;
    var run = h("div", { class: "kc-lane__run" }, ["danger", "bots", "writing", "photo"].map(function (k) {
      return sprite("bug", { anim: true, kind: k, cls: "kc-lane__bug" });
    }).concat([sprite("chomp", { anim: true, cls: "kc-lane__chomp" })]));
    add(h("div", { class: "kc-lane screen", "aria-hidden": "true", "data-ambient": "" }, [run]), foot, foot.firstChild);
    if (!status) return;
    var slot = h("a", { class: "kc-status__coin", href: cfg.arcade || "/arcade/", "data-coin": "" }, [
      h("span", { class: "kc-coin", "aria-hidden": "true" }, [sprite("coin", { frame: 0, kind: "accent", cls: "kc-coin__disc" }), h("span", { class: "kc-coin__mouth" })]),
      h("span", {}, [h("span", { class: "sr-only" }, ["Arcade: "]), "CREDIT ", h("span", { "data-credit": "" }, [pad(credits, 2)])])
    ]);
    add(slot, status);
    /* A plain left click with motion on drops the coin first, then follows the link (or just
       counts the credit when already in the arcade). Modified clicks are left alone. */
    on(slot, "click", function (event) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      var here = slot.pathname === location.pathname;
      if (!here && !moving()) return;
      event.preventDefault();
      coin();
      if (!here) setTimeout(function () { location.href = slot.href; }, 640);
    });
  }
  function coin() {
    credits = Math.min(99, credits + 1);
    $$("[data-coin]").forEach(function (slot) {
      var credit = slot.querySelector("[data-credit]");
      if (!moving()) { if (credit) credit.textContent = pad(credits, 2); return; }
      slot.classList.remove("is-dropping");
      void slot.offsetWidth;
      slot.classList.add("is-dropping");
      setTimeout(function () { if (credit) credit.textContent = pad(credits, 2); slot.classList.remove("is-dropping"); }, 640);
    });
  }

  /* ---------- (d) 404: GAME OVER ---------- */
  function notFound() {
    var box = $(".kc-404");
    if (!box) return;
    var title = $("h1", box), shell = $(".kc-404__shell", box), lede = $(".kc-lede", box), actions = $(".kc-404__actions", box);
    var missing = $("[data-404-path]", box);
    var section = add(h("section", { class: "kc-over screen kc-slab", "data-kind": "danger", "aria-labelledby": "over-title" }), box, box.firstChild);
    add(sprite("bug", { frame: 0, kind: "danger", s: 3, cls: "kc-over__bug" }), section);
    if (title) {
      move(title, section);
      if (!title.id) attr(title, "id", "over-title");
      cls(title, "kc-over__title kc-extrude");
      swap(title, ["GAME OVER ", h("span", { class: "sr-only" }, ["(404: page not found)"])]);
    }
    add(h("p", { class: "kc-over__cont", "aria-hidden": "true" }, ["CONTINUE?"]), section);
    add(h("p", { class: "kc-over__path" }, ["No page at ", h("code", { "data-404-path": "" }, [missing ? missing.textContent : "this page"]), ". It moved, or it never existed."]), section);
    hide(shell);
    hide(lede);
    if (actions) {
      move(actions, section);
      var homeLink = $('[data-nav="home"]', actions);
      if (homeLink) {
        move(homeLink, actions, actions.firstChild);
        cls(homeLink, "kc-btn--coin");
        swap(homeLink, ["Continue: home"]);
      }
    }
    if (!cfg.squash || !cfg.squash.src) return;
    var burst = ["star", "pellet", "star", "power", "star"].map(function (n) { return sprite(n, { kind: "accent", s: 2 }); });
    var game = h("div", { class: "kc-squash", "data-game": "squash", "data-game-src": cfg.squash.src, "data-game-sri": cfg.squash.sri || "" }, [
      h("button", { class: "kc-btn kc-squash__start", type: "button", "data-game-start": "" }, ["CONTINUE? ", h("span", { class: "kc-squash__sub" }, ["play Bug Squash"])]),
      h("p", { class: "kc-squash__timer", "data-squash-timer": "", hidden: "" }),
      h("div", { class: "kc-squash__field", role: "group", "aria-label": "Bugs", "data-squash-field": "", hidden: "" }),
      h("div", { class: "kc-squash__end", "data-squash-end": "", hidden: "" }, [
        h("p", { class: "kc-squash__result", "data-squash-result": "" }),
        h("span", { class: "kc-squash__burst", "aria-hidden": "true" }, burst),
        h("p", { class: "kc-squash__actions" }, [
          h("a", { class: "kc-btn kc-btn--coin", href: cfg.home || "/", "data-squash-home": "" }, ["Continue: home"]),
          h("button", { class: "kc-btn", type: "button", "data-squash-again": "" }, ["Try again"])
        ])
      ]),
      h("p", { class: "kc-squash__status", role: "status", "aria-live": "polite", "data-game-status": "" })
    ]);
    add(game, section);
    if (window.boundsGameLoader) window.boundsGameLoader.bind(game);
    else document.addEventListener("DOMContentLoaded", function () { if (window.boundsGameLoader && game.isConnected) window.boundsGameLoader.bind(game); });
  }

  /* ---------- (e) MOTION ---------- */
  function syncMotionButton() {
    if (!motionButton) return;
    var still = root.dataset.motion === "still";
    motionButton.setAttribute("aria-pressed", String(still));
    motionButton.title = still ? "Play animations" : "Pause animations";
    /* When the system already asks for stillness there is nothing to pause or play. */
    motionButton.style.display = theme.systemStill && theme.systemStill() ? "none" : "";
  }
  function setMotion(value) {
    if (!isArcade()) return;
    var changed = root.dataset.motion !== value;
    root.dataset.motion = value;
    syncMotionButton();
    if (!changed) return;
    if (value === "still") {
      $$("video[autoplay]").forEach(function (video) { video.pause(); });
    }
    try { document.dispatchEvent(new CustomEvent("bounds:motion", { detail: { motion: value } })); } catch (e) { /* ignore */ }
  }
  function toggleMotion() {
    if (theme.systemStill && theme.systemStill()) return;
    var next = root.dataset.motion === "still" ? "playing" : "paused";
    try { localStorage.setItem(theme.motionKey || "bounds-motion", next); } catch (e) { /* private mode: this page only */ }
    setMotion(next === "paused" ? "still" : "on");
  }
  /* A system setting changed: it wins over a saved "playing", and the button shows or hides. */
  function follow() { if (theme.motion) setMotion(theme.motion()); syncMotionButton(); }
  ["(prefers-reduced-motion: reduce)", "(prefers-contrast: more)", "(forced-colors: active)"].forEach(function (q) {
    var m = window.matchMedia && window.matchMedia(q);
    if (m && m.addEventListener) m.addEventListener("change", follow);
  });

  /* ---------- (f) CHEAT CODE ---------- */
  var CODE = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"], pos = 0, toast = null;
  function ignore(event) {
    var t = event.target;
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return true;
    if (root.classList.contains("has-lightbox") || document.querySelector("dialog[open]")) return true;
    return !!(t && t.closest && (t.isContentEditable || t.closest("input, textarea, select, dialog, [contenteditable], [data-game-canvas]")));
  }
  function showToast(text) {
    if (!toast) {
      toast = h("div", { class: "kc-toast", role: "status" });
      document.body.appendChild(toast);
    }
    toast.textContent = text;
    toast.hidden = false;
    clearTimeout(toast.t);
    toast.t = setTimeout(function () { toast.hidden = true; }, 4000);
  }
  function storm() {
    var names = ["typist", "drone", "crawler", "bug", "duck", "coffee", "cherry", "chomp"].filter(function (n) { return A.sizes[n]; });
    if (!names.length) return;
    var kinds = ["writing", "photo", "bots", "danger", "accent"], box = h("div", { class: "kc-storm", "aria-hidden": "true" });
    for (var i = 0; i < 22; i++) {
      var s = sprite(names[i % names.length], { anim: true, kind: kinds[i % kinds.length], s: 2 });
      s.style.left = ((i * 37) % 96) + "%";
      s.style.animationDelay = ((i * 90) % 1100) + "ms";
      box.appendChild(s);
    }
    document.body.appendChild(box);
    setTimeout(function () { box.remove(); }, 4000);
  }
  function cheat(event) {
    if (ignore(event)) { pos = 0; return; }
    var key = event.key && event.key.length === 1 ? event.key.toLowerCase() : event.key;
    pos = key === CODE[pos] ? pos + 1 : (key === CODE[0] ? 1 : 0);
    if (pos < CODE.length) return;
    pos = 0;
    window.boundsArcadeCheat = true;
    try { sessionStorage.setItem(CHEAT, "1"); } catch (e) { /* no storage */ }
    showToast("CHEAT ON: 30 LIVES IN BOUNDS INVADERS");
    if (moving()) storm();
  }

  /* ---------- ENABLE / DISABLE ---------- */
  var enabled = false;
  function enable() {
    if (enabled) { theme.reveal && theme.reveal(); return; }
    enabled = true;
    try {
      header();
      hero();
      doors();
      sectionHeads();
      featured();
      scores();
      slabs();
      footer();
      notFound();
      on(document, "bounds:coin", coin);
      on(document, "keydown", cheat);
      if (fx) fx.start();
    } finally {
      if (theme.reveal) theme.reveal();
    }
  }
  function disable() {
    if (!enabled) return;
    enabled = false;
    if (fx) fx.stop();
    var squash = window.boundsGames && window.boundsGames.squash;
    if (squash && squash.stop) squash.stop();
    undo();
    motionButton = null;
    if (toast) { toast.remove(); toast = null; }
    $$(".kc-storm").forEach(function (el) { el.remove(); });
  }
  A.enable = enable;
  A.disable = disable;
  A.motion = function () { return root.dataset.motion; };

  /* Written before paint by theme-init.js for a saved arcade choice: the DOM is parsed (a deferred
     script), so add the pieces now, before the main bundle boots. */
  if (isArcade()) enable();
})();
