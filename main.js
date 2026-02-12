// main.js

// Background particles (network style)
(() => {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const bg = document.getElementById("bg");
  if (!bg || reduced) return;

  const canvas = document.createElement("canvas");
  bg.appendChild(canvas);

  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) return;

  let w = 0, h = 0, dpr = 1;
  let raf = 0;

  const COLOR = "43,121,255";
  const DENSITY = 0.000085;
  const SPEED = 0.20;
  const DOT_MIN = 0.55;
  const DOT_MAX = 1.45;
  const DOT_ALPHA_MIN = 0.12;
  const DOT_ALPHA_MAX = 0.35;
  const LINK_DIST = 135;
  const LINK_ALPHA = 0.14;
  const MOUSE_RADIUS = 160;
  const MOUSE_FORCE = 0.85;
  const FRICTION = 0.985;

  const dots = [];
  let targetCount = 0;

  const mouse = { x: 0, y: 0, active: false };

  const cssToPx = (v) => v * dpr;
  const rand = (min, max) => min + Math.random() * (max - min);

  function setSize() {
    dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    w = canvas.width = Math.floor(window.innerWidth * dpr);
    h = canvas.height = Math.floor(window.innerHeight * dpr);
    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerHeight + "px";

    targetCount = Math.max(90, Math.min(260, Math.floor((w * h) * DENSITY)));

    while (dots.length < targetCount) addDot();
    while (dots.length > targetCount) dots.pop();
  }

  function addDot() {
    dots.push({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() * 2 - 1) * SPEED * dpr,
      vy: (Math.random() * 2 - 1) * SPEED * dpr,
      r: rand(DOT_MIN, DOT_MAX) * dpr,
      a: rand(DOT_ALPHA_MIN, DOT_ALPHA_MAX),
    });
  }

  function wrap(p) {
    if (p.x < -40) p.x = w + 40;
    if (p.x > w + 40) p.x = -40;
    if (p.y < -40) p.y = h + 40;
    if (p.y > h + 40) p.y = -40;
  }

  function drawDot(p) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${COLOR},${p.a})`;
    ctx.fill();
  }

  function drawLink(p, q, distPx) {
    const maxDist = cssToPx(LINK_DIST);
    const t = 1 - distPx / maxDist;
    if (t <= 0) return;

    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(q.x, q.y);
    ctx.strokeStyle = `rgba(${COLOR},${t * LINK_ALPHA})`;
    ctx.lineWidth = 1 * dpr;
    ctx.stroke();
  }

  function step() {
    ctx.clearRect(0, 0, w, h);

    const maxLink = cssToPx(LINK_DIST);
    const maxLink2 = maxLink * maxLink;

    const mX = mouse.x * dpr;
    const mY = mouse.y * dpr;
    const mR = cssToPx(MOUSE_RADIUS);
    const mR2 = mR * mR;

    for (const p of dots) {
      p.x += p.vx;
      p.y += p.vy;

      if (mouse.active) {
        const dx = p.x - mX;
        const dy = p.y - mY;
        const d2 = dx * dx + dy * dy;

        if (d2 > 0 && d2 < mR2) {
          const d = Math.sqrt(d2);
          const f = (1 - d / mR) * MOUSE_FORCE;
          const nx = dx / d;
          const ny = dy / d;

          p.vx += nx * f * 0.22 * dpr;
          p.vy += ny * f * 0.22 * dpr;
        }
      }

      p.vx *= FRICTION;
      p.vy *= FRICTION;

      const v2 = p.vx * p.vx + p.vy * p.vy;
      const minV = (0.018 * dpr) ** 2;
      if (v2 < minV) {
        p.vx += (Math.random() * 2 - 1) * 0.03 * dpr;
        p.vy += (Math.random() * 2 - 1) * 0.03 * dpr;
      }

      wrap(p);
    }

    for (let i = 0; i < dots.length; i++) {
      const p = dots[i];
      for (let j = i + 1; j < dots.length; j++) {
        const q = dots[j];
        const dx = p.x - q.x;
        const dy = p.y - q.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < maxLink2) drawLink(p, q, Math.sqrt(d2));
      }
      drawDot(p);
    }

    raf = requestAnimationFrame(step);
  }

  function onMove(e) {
    mouse.active = true;
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  }

  function onLeave() {
    mouse.active = false;
  }

  window.addEventListener("resize", setSize, { passive: true });
  window.addEventListener("mousemove", onMove, { passive: true });
  window.addEventListener("mouseleave", onLeave, { passive: true });

  setSize();
  step();

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) cancelAnimationFrame(raf);
    else raf = requestAnimationFrame(step);
  });
})();


// Smooth scroll
(() => {
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      if (!id || id === "#") return;

      const target = document.querySelector(id);
      if (!target) return;

      e.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      history.pushState(null, "", id);
    });
  });
})();


// Reveal on scroll
(() => {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const els = document.querySelectorAll(".reveal");
  if (!els.length) return;

  if (reduced) {
    els.forEach((el) => el.classList.add("in"));
    return;
  }

  const obs = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          obs.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.12, rootMargin: "0px 0px -10% 0px" }
  );

  els.forEach((el) => obs.observe(el));
})();


// Skills accordion
(() => {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced) return;

  const blocks = document.querySelectorAll(".skill-block");
  if (!blocks.length) return;

  const setHeight = (d) => {
    const content = d.querySelector(".skill-content");
    if (!content) return;
    content.style.maxHeight = d.open ? content.scrollHeight + "px" : "0px";
  };

  blocks.forEach((d) => {
    const content = d.querySelector(".skill-content");
    if (!content) return;

    setHeight(d);

    d.addEventListener("toggle", () => {
      if (d.open) {
        blocks.forEach((other) => {
          if (other !== d) {
            other.open = false;
            setHeight(other);
          }
        });
      }
      requestAnimationFrame(() => setHeight(d));
    });
  });

  window.addEventListener("resize", () => blocks.forEach(setHeight), { passive: true });
})();
