/* Shared pre-paint initialization and picker state. */
(function () {
  "use strict";
  var key = "bounds-crt";
  function normalize(mode) {
    if (mode === "paper") return "light";
    if (mode === "crt") return "dark";
    return ["light", "dark", "green", "amber"].indexOf(mode) !== -1 ? mode : null;
  }
  function read() {
    try {
      var saved = localStorage.getItem(key);
      var mode = normalize(saved);
      if (mode && mode !== saved) localStorage.setItem(key, mode);
      return mode;
    } catch (e) { return normalize(saved); }
  }
  function apply(mode) {
    var root = document.documentElement;
    root.classList.toggle("crt", mode !== "light");
    root.classList.toggle("crt--green", mode === "green");
    root.classList.toggle("crt--amber", mode === "amber");
    root.dataset.theme = mode;
  }
  window.boundsTheme = { key: key, read: read, apply: apply };
  apply(read() || (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));
})();
