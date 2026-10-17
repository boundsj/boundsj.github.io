/* ============================================================================
   bounds.dev — site.js
   Progressive enhancements; every feature works (or degrades to a plain link)
   without this file.
     (a) Photo lightbox: a native <dialog> over any [data-photo] link inside a
         [data-photo-group]. Prev/next stay within the group.
     (b) Animated heroes: pause/play by flipping the <picture> still source.
     (c) Reduced motion: pause autoplaying videos and start heroes paused.
     (d) Theme switch: circular View Transition from the pressed pill, and the
         pill glow's stretch.
     (e) Reading progress: the header bar plus read_progress milestones.
     (f) Code panels: language label and a copy button.
     (g) 404: echo the missing path (as text) into the shell error.
   ============================================================================ */
(function () {
  "use strict";

  var track = function (name, params) { if (window.boundsTrack) window.boundsTrack(name, params); };
  var reduceQuery = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  function reduced() { return !!(reduceQuery && reduceQuery.matches); }

  /* ---------- (a) LIGHTBOX ---------- */
  var lb = null;      // { dialog, img, title, meta, caption, count, prev, next, open, close, live }
  var items = [];     // [data-photo] links in the active group
  var index = 0;
  var opener = null;  // the element focus returns to
  var source = "";    // ui_location of the group that opened the lightbox

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text) node.textContent = text;
    return node;
  }

  function buildLightbox() {
    var dialog = el("dialog", "kc-lightbox");
    dialog.setAttribute("aria-labelledby", "kc-lightbox-title");
    dialog.setAttribute("aria-describedby", "kc-lightbox-caption");
    dialog.setAttribute("data-ui", "lightbox");
    dialog.setAttribute("data-kind", "photo");

    var bar = el("div", "kc-lightbox__bar");
    var count = el("span", "kc-lightbox__count");
    var close = el("button", "kc-btn kc-lightbox__close", "close");
    close.type = "button";
    bar.appendChild(count);
    bar.appendChild(close);

    var stage = el("div", "kc-lightbox__stage");
    var img = el("img", "kc-lightbox__img");
    img.decoding = "async";
    stage.appendChild(img);

    var info = el("div", "kc-lightbox__info");
    var title = el("h2", "kc-lightbox__title");
    title.id = "kc-lightbox-title";
    var meta = el("p", "kc-lightbox__meta");
    var caption = el("p", "kc-lightbox__caption");
    caption.id = "kc-lightbox-caption";
    info.appendChild(title);
    info.appendChild(meta);
    info.appendChild(caption);

    var controls = el("div", "kc-lightbox__controls");
    var prev = el("button", "kc-btn kc-lightbox__prev", "← prev");
    var next = el("button", "kc-btn kc-lightbox__next", "next →");
    prev.type = next.type = "button";
    var open = el("a", "kc-btn kc-lightbox__open", "open post →");
    controls.appendChild(prev);
    controls.appendChild(next);
    controls.appendChild(open);

    var live = el("p", "sr-only");
    live.setAttribute("aria-live", "polite");

    dialog.appendChild(bar);
    dialog.appendChild(stage);
    dialog.appendChild(info);
    dialog.appendChild(controls);
    dialog.appendChild(live);
    document.body.appendChild(dialog);

    close.addEventListener("click", function () { dialog.close(); });
    prev.addEventListener("click", function () { step(-1, "prev"); });
    next.addEventListener("click", function () { step(1, "next"); });
    // A click on the backdrop lands on the <dialog> itself.
    dialog.addEventListener("click", function (event) { if (event.target === dialog) dialog.close(); });
    dialog.addEventListener("keydown", function (event) {
      if (event.key === "ArrowLeft" && items.length > 1) { event.preventDefault(); step(-1, "key"); }
      if (event.key === "ArrowRight" && items.length > 1) { event.preventDefault(); step(1, "key"); }
      if (event.key === "Tab") wrapFocus(event);
    });
    dialog.addEventListener("close", function () {
      document.documentElement.classList.remove("has-lightbox");
      img.removeAttribute("src");
      img.removeAttribute("srcset");
      if (opener && document.contains(opener)) opener.focus();
    });
    img.addEventListener("load", function () { stage.classList.remove("is-loading"); });

    lb = { dialog: dialog, stage: stage, img: img, title: title, meta: meta, caption: caption,
      count: count, prev: prev, next: next, open: open, close: close, live: live };
  }

  // Keep Tab inside the dialog (browsers otherwise let it escape to their own UI).
  function wrapFocus(event) {
    var focusable = Array.prototype.filter.call(lb.dialog.querySelectorAll("button, a[href]"), function (node) {
      return !node.hidden && node.offsetParent !== null;
    });
    if (!focusable.length) return;
    var first = focusable[0], last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }

  function pad(n) { return (n < 10 ? "0" : "") + n; }

  function show(i) {
    var link = items[i];
    var d = link.dataset;
    index = i;
    lb.stage.classList.add("is-loading");
    lb.img.alt = d.photoAlt || d.photoTitle || "";
    lb.img.width = +d.photoW || 0;
    lb.img.height = +d.photoH || 0;
    lb.img.sizes = "(max-width: 760px) 100vw, 1000px";
    lb.img.srcset = d.photoSrcset || "";
    lb.img.src = d.photoSrc || link.href;
    if (lb.img.complete) lb.stage.classList.remove("is-loading");
    lb.title.textContent = d.photoTitle || "";
    lb.meta.textContent = [d.photoDate, d.photoMeta].filter(Boolean).join(" · ");
    lb.caption.textContent = d.photoCaption || "";
    lb.count.textContent = pad(i + 1) + " / " + pad(items.length);
    var multi = items.length > 1;
    lb.prev.hidden = lb.next.hidden = !multi;
    lb.count.hidden = !multi;
    var href = d.photoHref || "";
    var here = href && href === window.location.pathname;
    lb.open.hidden = !href || here;
    if (href) {
      lb.open.href = href;
      lb.open.dataset.contentId = d.contentId || "";
      lb.open.dataset.kind = "photo";
    }
  }

  function step(delta, method) {
    var i = (index + delta + items.length) % items.length;
    show(i);
    lb.live.textContent = "Photo " + (i + 1) + " of " + items.length + ": " + (items[i].dataset.photoTitle || "");
    track("photo_open", { content_id: items[i].dataset.contentId || "", ui_location: "lightbox", method: method });
  }

  function openLightbox(link) {
    if (!lb) buildLightbox();
    var group = link.closest("[data-photo-group]");
    items = group ? Array.prototype.slice.call(group.querySelectorAll("[data-photo]")) : [link];
    source = group ? group.getAttribute("data-photo-group") : "photo";
    opener = link;
    show(Math.max(0, items.indexOf(link)));
    document.documentElement.classList.add("has-lightbox");
    lb.dialog.showModal();
    lb.close.focus();
    track("photo_open", { content_id: link.dataset.contentId || "", ui_location: source, method: "click" });
  }

  function initLightbox() {
    if (typeof HTMLDialogElement !== "function") return; // old browsers keep plain links
    document.addEventListener("click", function (event) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      var link = event.target.closest && event.target.closest("a[data-photo]");
      if (!link) return;
      event.preventDefault();
      openLightbox(link);
    });
  }

  /* ---------- (b) ANIMATED HEROES ---------- */
  function initMotionToggles() {
    document.querySelectorAll("[data-motion]").forEach(function (figure) {
      var button = figure.querySelector("[data-motion-toggle]");
      var still = figure.querySelector("source[data-motion-still]");
      if (!button || !still) return;
      var playing = !reduced();
      function render() {
        // "all" forces the still; "not all" lets the GIF through.
        still.media = playing ? "not all" : "all";
        button.textContent = playing ? "pause" : "play";
        button.setAttribute("aria-label", (playing ? "Pause" : "Play") + " animation");
        figure.classList.toggle("is-paused", !playing);
      }
      button.addEventListener("click", function () {
        playing = !playing;
        render();
        track("motion_toggle", { content_id: figure.dataset.contentId || "", state: playing ? "playing" : "paused" });
      });
      button.hidden = false;
      render();
      // Turning on reduced motion mid-visit pauses the GIF too (turning it off leaves it as is).
      if (reduceQuery && reduceQuery.addEventListener) {
        reduceQuery.addEventListener("change", function () { if (reduced() && playing) { playing = false; render(); } });
      }
    });
  }

  /* ---------- (c) REDUCED MOTION FOR VIDEO ---------- */
  function pauseAutoplay() {
    if (!reduced()) return;
    document.querySelectorAll("video[autoplay]").forEach(function (video) {
      video.removeAttribute("autoplay");
      video.pause();
    });
  }

  /* ---------- (d) THEME SWITCH ---------- */
  window.boundsThemeTransition = function (button, swap) {
    var control = button.closest(".kc-theme-control");
    if (control && !reduced()) {
      control.classList.remove("is-moving");
      void control.offsetWidth; // restart the stretch animation
      control.classList.add("is-moving");
    }
    if (!document.startViewTransition || reduced()) { swap(); return; }
    var r = button.getBoundingClientRect();
    var x = r.left + r.width / 2, y = r.top + r.height / 2;
    var radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    var transition = document.startViewTransition(swap);
    transition.ready.then(function () {
      document.documentElement.animate(
        { clipPath: ["circle(0px at " + x + "px " + y + "px)", "circle(" + radius + "px at " + x + "px " + y + "px)"] },
        { duration: 420, easing: "cubic-bezier(.22, 1, .36, 1)", pseudoElement: "::view-transition-new(root)" }
      );
    }).catch(function () { /* skipped transition: theme already applied */ });
  };

  /* ---------- (e) READING PROGRESS ---------- */
  function initProgress() {
    var article = document.querySelector(".kc-post[data-content-id]");
    var body = article && article.querySelector(".post-content");
    var header = document.querySelector(".kc-header");
    if (!body || !header) return;
    var kind = article.getAttribute("data-kind");
    var id = article.getAttribute("data-content-id");
    var marks = [25, 50, 75, 100], sent = {};
    var engagedMs = 0, visibleSince = document.hidden ? 0 : Date.now();
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) { if (visibleSince) engagedMs += Date.now() - visibleSince; visibleSince = 0; }
      else visibleSince = Date.now();
    });
    function engagedSeconds() { return Math.round((engagedMs + (visibleSince ? Date.now() - visibleSince : 0)) / 1000); }
    var queued = false;
    function measure() {
      queued = false;
      var rect = body.getBoundingClientRect();
      // How much of the article body has passed the bottom of the viewport.
      var p = rect.height > 0 ? (window.innerHeight - rect.top) / rect.height : 1;
      p = Math.max(0, Math.min(1, p));
      header.style.setProperty("--read", p.toFixed(4));
      marks.forEach(function (m) {
        if (!sent[m] && p * 100 >= m) {
          sent[m] = true;
          track("read_progress", { percent: m, content_type: kind, content_id: id, engaged_seconds: engagedSeconds() });
        }
      });
    }
    function queue() { if (!queued) { queued = true; window.requestAnimationFrame(measure); } }
    window.addEventListener("scroll", queue, { passive: true });
    window.addEventListener("resize", queue);
    document.documentElement.classList.add("has-progress");
    measure();
  }

  /* ---------- (f) CODE PANELS ---------- */
  function initCode() {
    document.querySelectorAll(".post-content pre > code").forEach(function (code) {
      var pre = code.parentElement;
      var block = pre.closest(".highlight") || pre;
      if (block.parentElement && block.parentElement.classList.contains("kc-code")) return;
      var lang = code.getAttribute("data-lang") || ((code.className.match(/language-([\w-]+)/) || [])[1]) || "text";
      var panel = el("div", "kc-code");
      var bar = el("div", "kc-code__bar");
      var label = el("span", "kc-code__lang", lang);
      var copy = el("button", "kc-btn kc-code__copy", "copy");
      copy.type = "button";
      copy.setAttribute("aria-label", "Copy " + lang + " code");
      bar.appendChild(label);
      bar.appendChild(copy);
      block.parentElement.insertBefore(panel, block);
      panel.appendChild(bar);
      panel.appendChild(block);
      var timer = 0;
      copy.addEventListener("click", function () {
        var text = code.innerText.replace(/\n$/, "");
        var article = document.querySelector(".kc-post[data-content-id]");
        track("code_copy", { content_id: article ? article.getAttribute("data-content-id") : "", code_language: lang });
        var done = function () {
          copy.textContent = "copied";
          copy.classList.add("is-done");
          clearTimeout(timer);
          timer = setTimeout(function () { copy.textContent = "copy"; copy.classList.remove("is-done"); }, 1500);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, function () { legacyCopy(text) && done(); });
        else if (legacyCopy(text)) done();
      });
    });
  }

  // Plain-HTTP pages (like a LAN preview) have no async clipboard; fall back to execCommand.
  function legacyCopy(text) {
    var focused = document.activeElement;
    var area = el("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    var ok = false;
    try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
    document.body.removeChild(area);
    if (focused && focused.focus) focused.focus();
    return ok;
  }

  /* ---------- (g) 404 ---------- */
  function initNotFound() {
    var path = decodeURIComponentSafe(window.location.pathname);
    if (path.length > 60) path = path.slice(0, 57) + "...";
    document.querySelectorAll("[data-404-path]").forEach(function (node) { node.textContent = path; });
  }
  function decodeURIComponentSafe(s) { try { return decodeURIComponent(s); } catch (e) { return s; } }

  function boot() {
    initLightbox();
    initMotionToggles();
    pauseAutoplay();
    initProgress();
    initCode();
    if (document.querySelector("[data-404-path]")) initNotFound();
    if (reduceQuery && reduceQuery.addEventListener) reduceQuery.addEventListener("change", pauseAutoplay);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
