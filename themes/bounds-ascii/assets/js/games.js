/* ============================================================================
   bounds.dev — games.js: the lazy game loader, in every theme. In the main bundle on /arcade/
   only, and in the arcade theme's script (for its 404); whichever runs first wins.
     (a) A [data-game] block names its script in data-game-src (a fingerprinted URL Hugo writes).
         The script is fetched only when [data-game-start] is pressed, never with a <script src>
         in the page. Each game registers window.boundsGames[name].start(box). Blocks added later
         (the arcade 404's Bug Squash) call window.boundsGameLoader.bind(box). A start dispatches
         `bounds:coin` (the arcade theme's coin slot counts it).
     (b) High score display ([data-hi]) and "clear my scores" (localStorage only, never sent).
   ============================================================================ */
(function () {
  "use strict";
  if (window.boundsGameLoader) return;
  var HI = "bounds-arcade-hi", CHEAT = "bounds-arcade-cheat";
  var games = window.boundsGames = window.boundsGames || {};
  var bound = [];
  function $$(sel, el) { return Array.prototype.slice.call((el || document).querySelectorAll(sel)); }
  function pad(n, len) { var s = String(n); while (s.length < len) s = "0" + s; return s; }
  function coin() { try { document.dispatchEvent(new CustomEvent("bounds:coin")); } catch (e) { /* ignore */ } }

  /* ---------- (a) LAZY GAMES ---------- */
  function bind(box) {
    if (bound.indexOf(box) !== -1) return;
    bound.push(box);
    var name = box.dataset.game, loading = false;
    $$("[data-game-start]", box).forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (games[name]) { coin(); games[name].start(box); return; }
        if (loading) return;
        loading = true;
        var label = btn.textContent, status = box.querySelector("[data-game-status]");
        btn.textContent = "Loading…";
        var s = document.createElement("script");
        s.src = box.dataset.gameSrc;
        if (box.dataset.gameSri) s.integrity = box.dataset.gameSri;
        s.onload = function () { btn.textContent = label; if (games[name]) { coin(); games[name].start(box); } };
        s.onerror = function () {
          loading = false; btn.textContent = label;
          if (status) status.textContent = "The game could not load. Try again.";
        };
        document.head.appendChild(s);
      });
    });
  }
  window.boundsGameLoader = { bind: bind };

  /* ---------- (b) SCORES ---------- */
  function hi() { try { return parseInt(localStorage.getItem(HI), 10) || 0; } catch (e) { return 0; } }
  function showHi() { var h = pad(hi(), 4); $$("[data-hi]").forEach(function (el) { el.textContent = h; }); }

  function boot() {
    $$("[data-game][data-game-src]").forEach(bind);
    showHi();
    window.addEventListener("bounds:score", showHi);
    $$("[data-clear-scores]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        try { localStorage.removeItem(HI); sessionStorage.removeItem(CHEAT); } catch (e) { /* no storage */ }
        window.dispatchEvent(new CustomEvent("bounds:score"));
        showHi();
        btn.textContent = "Scores cleared";
        setTimeout(function () { btn.textContent = "Clear my scores"; }, 2400);
      });
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
