/* ============ FloodRescueNet Monitor — splash preloader ============ */
(function () {
  "use strict";
  var pl = document.getElementById("preloader");
  if (!pl) return;
  document.documentElement.classList.add("splashing");
  var vid = pl.querySelector(".pl-video");
  if (vid) vid.addEventListener("error", function () { pl.classList.add("no-video"); });
  var RM = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var start = Date.now(), MIN = RM ? 0 : 2600, fired = false;
  function done() {
    if (fired) return; fired = true;
    document.documentElement.classList.remove("splashing");
    pl.classList.add("done");
    document.body.classList.add("preloaded");
    window.dispatchEvent(new Event("site:ready"));
    setTimeout(function () { if (pl && pl.parentNode) pl.parentNode.removeChild(pl); }, 750);
  }
  function trigger() { setTimeout(done, Math.max(0, MIN - (Date.now() - start))); }
  if (RM) { done(); return; }
  if (location.search.indexOf("keepsplash") > -1) { pl.style.animation = "none"; return; } // debug: hold the splash
  if (document.readyState !== "loading") trigger();
  else document.addEventListener("DOMContentLoaded", trigger);
  window.addEventListener("load", trigger);
  setTimeout(done, 6000); // hard failsafe
})();
