/* Shared pre-paint initialization and picker state (inlined in <head>, after main.css).
   Three themes in localStorage["bounds-crt"]: light, dark, arcade. Old saved values migrate
   (paper → light; crt, green, amber → dark). With nothing saved the theme follows
   prefers-color-scheme (theme.js keeps following it live), so arcade is only ever a choice.
   Arcade: main.css (#kc-css) is disabled and the arcade stylesheet and script are written into
   the document here, so a saved arcade choice paints in arcade from the first frame (the body
   stays hidden until js/arcade-skin.js has added its pieces, 3 s at most). Arcade motion is
   <html data-motion="on"|"still">: always still for prefers-reduced-motion, prefers-contrast: more
   or forced-colors; otherwise still only if the visitor pressed the header's pause button
   (bounds-motion = "paused"). The button can add stillness, never override the system. */
(function () {
  "use strict";
  var key = "bounds-crt", motionKey = "bounds-motion";
  var root = document.documentElement;
  var assets = window.boundsArcadeAssets || {};
  function normalize(mode) {
    if (mode === "paper") return "light";
    if (mode === "crt" || mode === "green" || mode === "amber") return "dark";
    return mode === "light" || mode === "dark" || mode === "arcade" ? mode : null;
  }
  function read() {
    var saved = null;
    try {
      saved = localStorage.getItem(key);
      var mode = normalize(saved);
      if (mode && mode !== saved) localStorage.setItem(key, mode);
      return mode;
    } catch (e) { return normalize(saved); }
  }
  function mq(q) { try { return !!(window.matchMedia && window.matchMedia(q).matches); } catch (e) { return false; } }
  function system() { return mq("(prefers-color-scheme: dark)") ? "dark" : "light"; }
  function readMotion() {
    try { var v = localStorage.getItem(motionKey); return v === "paused" || v === "playing" ? v : null; } catch (e) { return null; }
  }
  function systemStill() { return mq("(prefers-reduced-motion: reduce)") || mq("(prefers-contrast: more)") || mq("(forced-colors: active)"); }
  function motion() { return systemStill() || readMotion() === "paused" ? "still" : "on"; }
  function apply(mode) {
    var arcade = mode === "arcade";
    var base = document.getElementById("kc-css"), own = document.getElementById("kc-arcade-css");
    root.classList.toggle("crt", mode !== "light");
    root.dataset.theme = mode;
    if (base) base.disabled = arcade;
    if (own) own.disabled = !arcade;
    if (arcade) root.dataset.motion = motion();
    else root.removeAttribute("data-motion");
  }
  function reveal() { root.classList.remove("kc-arcade-boot"); }
  /* The arcade stylesheet failed to load: show dark (the saved choice is kept for next time). */
  function fallback() { reveal(); if (root.dataset.theme === "arcade") apply("dark"); }
  window.boundsTheme = { key: key, motionKey: motionKey, read: read, system: system, motion: motion, systemStill: systemStill,
    readMotion: readMotion, apply: apply, assets: assets, reveal: reveal, fallback: fallback };

  var mode = read() || system();
  if (mode === "arcade") {
    if (assets.css && assets.js) {
      root.classList.add("kc-arcade-boot");
      setTimeout(reveal, 3000);
      document.write('<link id="kc-arcade-css" rel="stylesheet" href="' + assets.css + '" integrity="' + assets.cssSri +
        '" onload="this.dataset.ready=1" onerror="boundsTheme.fallback()"><script src="' + assets.js + '" integrity="' + assets.jsSri +
        '" defer onerror="boundsTheme.reveal()"><\/script>');
    } else mode = "dark";
  }
  apply(mode);

  /* The arcade level-start wipe (a cross-document View Transition) runs only with arcade motion on. */
  function skip(event) {
    if (event.viewTransition && !(root.dataset.theme === "arcade" && root.dataset.motion === "on")) event.viewTransition.skipTransition();
  }
  window.addEventListener("pageswap", skip);
  window.addEventListener("pagereveal", skip);
})();
