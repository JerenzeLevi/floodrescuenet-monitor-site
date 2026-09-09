/* ============ FloodRescueNet Monitor — splash preloader ============ */
(function () {
  "use strict";

  /* Start every visit at the top. Browser scroll-restoration on refresh can
     otherwise leave the scroll-linked hero fade pinned to a mid-scroll value,
     so the hero text renders invisible after a reload. */
  try {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  } catch (e) {}
  function toTop() { if (!location.hash) { try { window.scrollTo(0, 0); } catch (e) {} } }
  toTop();
  window.addEventListener("load", toTop);

  var pl = document.getElementById("preloader");
  if (!pl) { document.documentElement.classList.remove("splashing"); return; }

  function reveal() {
    document.documentElement.classList.remove("splashing");
    document.body.classList.add("preloaded");
  }

  try {
    document.documentElement.classList.add("splashing");
    var vid = pl.querySelector(".pl-video");
    if (vid) vid.addEventListener("error", function () { pl.classList.add("no-video"); });

    var RM = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var start = Date.now(), MIN = RM ? 0 : 2600, fired = false;

    var done = function () {
      if (fired) return; fired = true;
      reveal();
      pl.classList.add("done");
      toTop();
      window.dispatchEvent(new Event("site:ready"));
      setTimeout(function () { if (pl && pl.parentNode) pl.parentNode.removeChild(pl); }, 750);
    };
    var trigger = function () { setTimeout(done, Math.max(0, MIN - (Date.now() - start))); };

    if (RM) { done(); return; }
    if (location.search.indexOf("keepsplash") > -1) { pl.style.animation = "none"; return; } // debug: hold the splash

    if (document.readyState !== "loading") trigger();
    else document.addEventListener("DOMContentLoaded", trigger);
    window.addEventListener("load", trigger);
    setTimeout(done, 6000); // hard failsafe
  } catch (err) {
    /* never let the splash trap the page */
    reveal();
    if (pl && pl.parentNode) pl.parentNode.removeChild(pl);
    try { window.dispatchEvent(new Event("site:ready")); } catch (e) {}
  }
})();
