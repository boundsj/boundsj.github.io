/* 404 Bug Squash (arcade theme only). Fetched by js/games.js only when CONTINUE? is pressed. Ten
   seconds; bugs are real <button>s (click, tap, or Tab and Enter). Squash five to win. With
   animations paused or reduced the bugs stay put; otherwise they crawl (a CSS transition in
   arcade.css). The clock stops while the
   tab is hidden, the window is not focused, or the game is scrolled out of view, so it can never
   end, or move focus, behind the visitor's back. */
(function () {
  "use strict";
  var GOAL = 5, TIME = 10, MAX = 4;
  var box, field, status, timer, end, A, left, got, tick, crawl, live, paused, away, inView = true, watcher;
  function $(sel) { return box.querySelector(sel); }
  function fx() { var r = document.documentElement; return r.dataset.theme === "arcade" && r.dataset.motion === "on"; }
  function say(t) { status.textContent = t; }
  function spot(bug) {
    bug.style.setProperty("--x", Math.round(Math.random() * (field.clientWidth - 56)) + "px");
    bug.style.setProperty("--y", Math.round(Math.random() * (field.clientHeight - 56)) + "px");
  }
  function spawn() {
    if (field.children.length >= MAX) return;
    var bug = document.createElement("button");
    bug.type = "button";
    bug.className = "kc-squash__bug";
    bug.setAttribute("aria-label", "Squash bug");
    bug.appendChild(A.sprite("bug", { anim: fx(), kind: ["danger", "bots", "writing", "photo"][Math.floor(Math.random() * 4)], s: 1.5 }));
    /* They crawl out of the middle of the broken path, then scatter. */
    bug.style.setProperty("--x", Math.round(field.clientWidth / 2 - 28) + "px");
    bug.style.setProperty("--y", "0px");
    field.appendChild(bug);
    if (fx()) { void bug.offsetWidth; spot(bug); } else spot(bug);
    bug.addEventListener("click", function () { squash(bug); });
  }
  function hud() { timer.textContent = (paused ? "PAUSED · " : "") + "TIME " + left + " · SQUASHED " + got + "/" + GOAL; }
  function run() {
    tick = setInterval(function () {
      left--;
      hud();
      if (left % 2 === 0) spawn();
      if (left <= 0) finish(false);
    }, 1000);
    /* Motion on only: every 1.6 s each bug crawls to a new spot (still: they stay put). */
    crawl = setInterval(function () {
      if (!fx()) return;
      Array.prototype.forEach.call(field.children, function (b) { if (b !== document.activeElement && !b.matches(":hover")) spot(b); });
    }, 1600);
  }
  function halt() { clearInterval(tick); clearInterval(crawl); }
  /* Called on every visibility, focus and scroll change: pause or resume to match. */
  function sync() {
    if (!live) return;
    var stop = document.hidden || away || !inView;
    if (stop === paused) return;
    paused = stop;
    halt();
    if (paused) say("Bug Squash paused. It resumes when you come back.");
    else { run(); say("Bug Squash resumed: " + left + " seconds left."); }
    hud();
  }
  function squash(bug) {
    if (!live) return;
    var was = document.activeElement === bug, sib = bug.nextElementSibling || bug.previousElementSibling;
    bug.remove();
    got++;
    hud();
    if (got >= GOAL) { finish(true); return; }
    say("Squashed " + got + " of " + GOAL + ".");
    spawn();
    if (was) (sib || field.firstElementChild || field).focus();
  }
  function finish(won) {
    live = false; paused = false;
    halt();
    field.textContent = "";
    field.hidden = true;
    end.hidden = false;
    end.classList.toggle("is-won", won);
    $("[data-squash-result]").textContent = won ? "BUG FIXED!" : "TIME UP";
    say(won ? "You squashed five bugs. Bug fixed." : "Time up: " + got + " of " + GOAL + " squashed.");
    $("[data-squash-home]").focus();
  }
  /* Leaving the arcade theme removes the 404 panel: stop everything and forget the old DOM, so a
     later start (after switching back) begins clean. */
  function stop() {
    halt();
    if (watcher) { watcher.disconnect(); watcher = null; }
    live = false; paused = false; inView = true; box = null;
  }
  function start(el) {
    if (live && box !== el) stop();
    box = el; A = window.boundsArcade;
    field = $("[data-squash-field]"); status = $("[data-game-status]"); timer = $("[data-squash-timer]"); end = $("[data-squash-end]");
    if (!A || live) return;
    if (A.sizes && A.sizes.bug) A.sizes.bug.frames = 2;
    left = TIME; got = 0; live = true; paused = false;
    /* The script loads after the button press, so the visitor may already have looked away. */
    away = !document.hasFocus();
    if (!watcher && "IntersectionObserver" in window) {
      watcher = new IntersectionObserver(function (entries) { inView = entries[entries.length - 1].isIntersecting; sync(); });
      watcher.observe(box);
    }
    $("[data-game-start]").hidden = true;
    end.hidden = true; field.hidden = false; timer.hidden = false;
    field.classList.toggle("is-still", !fx());
    hud();
    for (var i = 0; i < 3; i++) spawn();
    field.firstElementChild.focus();
    say("Bug Squash: ten seconds, squash five bugs. Tab to a bug and press Enter, or tap it.");
    paused = document.hidden || away || !inView;
    if (paused) say("Bug Squash paused. It resumes when you come back."); else run();
    hud();
  }
  document.addEventListener("visibilitychange", sync);
  window.addEventListener("blur", function () { away = true; sync(); });
  window.addEventListener("focus", function () { away = false; sync(); });
  /* "Try again" restarts in place. */
  document.addEventListener("click", function (e) {
    var again = e.target.closest && e.target.closest("[data-squash-again]");
    if (again && box && !live) start(box);
  });
  (window.boundsGames = window.boundsGames || {}).squash = { start: start, stop: stop };
})();
