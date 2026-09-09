/* ============ FloodRescueNet Monitor — motion system ============ */
(function () {
  "use strict";
  const RM = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const SMALL = window.matchMedia("(max-width: 700px)").matches;
  const gsap = window.gsap;
  if (!gsap) return;
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });

  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- smooth anchor scroll ---------- */
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      if (id.length > 1 && document.querySelector(id)) {
        e.preventDefault();
        const el = document.querySelector(id);
        const y = el.getBoundingClientRect().top + window.scrollY - 72;
        window.scrollTo({ top: y, behavior: RM ? "auto" : "smooth" });
        history.replaceState(null, "", id);
      }
    });
  });

  /* ---------- nav + scroll progress ---------- */
  const nav = document.getElementById("nav");
  const progressBar = document.getElementById("progressBar");
  ScrollTrigger.create({
    start: 0, end: "max",
    onUpdate: (self) => {
      if (progressBar) progressBar.style.width = (self.progress * 100).toFixed(2) + "%";
      if (nav) nav.classList.toggle("scrolled", self.scroll() > 40);
    },
  });

  /* ---------- hero intro (waits for the water splash to lift) ---------- */
  function heroIntro() {
    if (RM || !document.querySelector(".hero-title")) return;
    const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
    tl.from(".hero .eyebrow", { y: 22, opacity: 0, duration: 0.7 })
      .from(".hero-title .w", { yPercent: 120, opacity: 0, duration: 1.05, stagger: 0.05 }, "-=0.35")
      .from(".hero-sub", { y: 22, opacity: 0, duration: 0.8 }, "-=0.7")
      .from(".hero-cta", { y: 22, opacity: 0, duration: 0.8 }, "-=0.6")
      .from(".hero-stats > div", { y: 18, opacity: 0, duration: 0.7, stagger: 0.09 }, "-=0.6")
      .from(".scroll-hint", { opacity: 0, duration: 0.6 }, "-=0.3");
  }

  if (!RM && document.querySelector(".hero-title")) {
    if (document.body.classList.contains("preloaded")) heroIntro();
    else window.addEventListener("site:ready", heroIntro, { once: true });

    gsap.to(".hero-inner", {
      yPercent: -8, opacity: 0, ease: "none",
      scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true },
    });
  }

  /* ---------- counters ---------- */
  const fmt = (n) => (n >= 1000 ? Math.round(n).toLocaleString() : Math.round(n));
  document.querySelectorAll("[data-count]").forEach((el) => {
    const end = parseFloat(el.dataset.count);
    const suffix = el.dataset.suffix || "";
    ScrollTrigger.create({
      trigger: el, start: "top 90%", once: true,
      onEnter: () => {
        const o = { v: 0 };
        gsap.to(o, { v: end, duration: 1.6, ease: "power2.out",
          onUpdate: () => (el.textContent = fmt(o.v) + suffix) });
      },
    });
  });

  /* ---------- generic reveals ---------- */
  if (!RM) {
    const revealBatch = (sel, opts = {}) => {
      const els = gsap.utils.toArray(sel);
      if (!els.length) return;
      gsap.set(els, { opacity: 0, y: 38 });
      ScrollTrigger.batch(els, {
        start: "top 88%",
        onEnter: (b) => gsap.to(b, {
          opacity: 1, y: 0, duration: 0.85, ease: "expo.out",
          stagger: opts.stagger ?? 0.1, overwrite: true,
        }),
      });
    };
    revealBatch(".feat");
    revealBatch(".step", { stagger: 0.08 });
    revealBatch(".member", { stagger: 0.12 });
    revealBatch(".doc-body h2");
    revealBatch(".doc-body p, .doc-body ul, .doc-body ol, .doc-body .callout", { stagger: 0.03 });

    gsap.utils.toArray(".section-eyebrow, .section-title, .section-lead").forEach((el) => {
      gsap.fromTo(el, { opacity: 0, y: 28 },
        { opacity: 1, y: 0, duration: 0.85, ease: "expo.out", overwrite: "auto",
          scrollTrigger: { trigger: el, start: "top 90%" } });
    });

    gsap.utils.toArray(".band-inner > *").forEach((el, i) => {
      gsap.fromTo(el, { opacity: 0, y: 34 },
        { opacity: 1, y: 0, duration: 0.9, ease: "expo.out", delay: i * 0.06,
          scrollTrigger: { trigger: ".band", start: "top 72%" } });
    });
  }

  /* ---------- magnetic buttons (fine pointers) ---------- */
  if (!RM && window.matchMedia("(pointer:fine)").matches) {
    document.querySelectorAll("[data-magnetic]").forEach((el) => {
      const s = 0.28;
      el.addEventListener("mousemove", (e) => {
        const r = el.getBoundingClientRect();
        gsap.to(el, { x: (e.clientX - r.left - r.width / 2) * s,
          y: (e.clientY - r.top - r.height / 2) * s, duration: 0.4, ease: "power3.out" });
      });
      el.addEventListener("mouseleave", () =>
        gsap.to(el, { x: 0, y: 0, duration: 0.6, ease: "elastic.out(1,0.4)" }));
    });
  }

  /* ---------- rain / water canvas ---------- */
  function rainField(canvasId, opts) {
    const c = document.getElementById(canvasId);
    if (!c) return;
    const ctx = c.getContext("2d");
    const DPR = Math.min(window.devicePixelRatio || 1, 1.5);
    const N = SMALL ? opts.count.s : opts.count.l;
    let w, h, drops, ripples = [], raf = 0, onScreen = true, waterY;

    function resize() {
      w = c.clientWidth; h = c.clientHeight;
      c.width = w * DPR; c.height = h * DPR;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      waterY = h - Math.min(h * 0.16, 120);
      drops = Array.from({ length: N }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        len: 8 + Math.random() * 16,
        v: 4 + Math.random() * 7,
        a: 0.12 + Math.random() * 0.35,
      }));
    }
    function frame() {
      raf = 0;
      if (!onScreen || document.hidden) return;
      ctx.clearRect(0, 0, w, h);

      // water band
      const g = ctx.createLinearGradient(0, waterY, 0, h);
      g.addColorStop(0, "rgba(45,212,191,.10)");
      g.addColorStop(1, "rgba(56,189,248,.03)");
      ctx.fillStyle = g;
      ctx.fillRect(0, waterY, w, h - waterY);
      ctx.strokeStyle = "rgba(120,220,240,.18)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      const t = Date.now() / 900;
      for (let x = 0; x <= w; x += 12) {
        const y = waterY + Math.sin(x / 46 + t) * 3;
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();

      // drops
      ctx.lineWidth = 1.1;
      for (const d of drops) {
        ctx.strokeStyle = `rgba(150,215,255,${d.a})`;
        ctx.beginPath();
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x + 0.6, d.y + d.len);
        ctx.stroke();
        d.y += d.v * opts.speed;
        if (d.y > waterY) {
          if (Math.random() < 0.35) ripples.push({ x: d.x, y: waterY + Math.random() * (h - waterY) * 0.5, r: 1, a: 0.4 });
          d.y = -d.len - Math.random() * 40;
          d.x = Math.random() * w;
        }
      }

      // ripples
      for (let i = ripples.length - 1; i >= 0; i--) {
        const rp = ripples[i];
        ctx.strokeStyle = `rgba(140,230,240,${rp.a})`;
        ctx.beginPath();
        ctx.ellipse(rp.x, rp.y, rp.r, rp.r * 0.32, 0, 0, 6.283);
        ctx.stroke();
        rp.r += 0.9; rp.a -= 0.012;
        if (rp.a <= 0) ripples.splice(i, 1);
      }

      raf = requestAnimationFrame(frame);
    }
    const start = () => { if (!raf && !RM) raf = requestAnimationFrame(frame); };
    const stop = () => { if (raf) { cancelAnimationFrame(raf); raf = 0; } };

    resize();
    window.addEventListener("resize", resize, { passive: true });
    document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));
    new IntersectionObserver((es) => { onScreen = es[0].isIntersecting; onScreen ? start() : stop(); },
      { rootMargin: "120px" }).observe(c);

    if (RM) {
      ctx.fillStyle = "rgba(45,212,191,.08)";
      ctx.fillRect(0, waterY, w, h - waterY);
    } else start();
  }
  rainField("rain", { count: { s: 60, l: 150 }, speed: 1 });
  rainField("ctaField", { count: { s: 40, l: 90 }, speed: 0.8 });

  window.addEventListener("load", () => ScrollTrigger.refresh());
})();
