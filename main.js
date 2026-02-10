// particle-background.js
(() => {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced) {
    // Still show content, no animation
    const els = document.querySelectorAll(".reveal");
    els.forEach(el => el.classList.add("in"));
    return;
  }

  // Scroll reveal
  const revealEls = document.querySelectorAll(".reveal");
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add("in");
          io.unobserve(e.target);
        }
      }
    },
    { threshold: 0.12, rootMargin: "0px 0px -10% 0px" }
  );
  revealEls.forEach((el) => io.observe(el));

  // Particles
  const host = document.getElementById("particle-bg");
  if (!host) return;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { alpha: true });
  host.appendChild(canvas);

  let w = 0, h = 0, dpr = 1;
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // Blue dots like msuiche
  const DOT = { r: 70, g: 150, b: 255 };

  const around = [];
  const field = [];
  const AROUND_N = 520;
  const FIELD_N = 900;

  let mouseX = null, mouseY = null;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = Math.floor(window.innerWidth * dpr);
    h = Math.floor(window.innerHeight * dpr);
    canvas.width = w;
    canvas.height = h;
  }

  function getAvatarCenter() {
    const el = document.querySelector(".avatar");
    if (!el) return { x: w * 0.5, y: h * 0.22 };
    const r = el.getBoundingClientRect();
    return { x: (r.left + r.width / 2) * dpr, y: (r.top + r.height / 2) * dpr };
  }

  function seed() {
    around.length = 0;
    field.length = 0;

    const c = getAvatarCenter();

    // Cloud around avatar
    for (let i = 0; i < AROUND_N; i++) {
      const angle = rand(0, Math.PI * 2);
      const radius = rand(10, 170) * dpr;
      const jitter = rand(-10, 10) * dpr;

      around.push({
        x: c.x + Math.cos(angle) * radius + jitter,
        y: c.y + Math.sin(angle) * radius + jitter,
        vx: rand(-0.18, 0.18) * dpr,
        vy: rand(-0.18, 0.18) * dpr,
        r: rand(0.6, 1.4) * dpr,
        a: rand(0.06, 0.22),
        homeAngle: angle,
        homeRadius: radius,
        spin: rand(-0.0022, 0.0022),
      });
    }

    // Dense field at bottom
    for (let i = 0; i < FIELD_N; i++) {
      const yBias = Math.pow(Math.random(), 0.35);
      field.push({
        x: rand(0, w),
        y: (0.55 + 0.45 * yBias) * h,
        vx: rand(-0.12, 0.12) * dpr,
        vy: rand(-0.06, 0.06) * dpr,
        r: rand(0.6, 1.6) * dpr,
        a: rand(0.04, 0.18),
      });
    }
  }

  function drawDot(x, y, r, a) {
    ctx.beginPath();
    ctx.fillStyle = `rgba(${DOT.r}, ${DOT.g}, ${DOT.b}, ${a})`;
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  function repel(p) {
    if (mouseX === null || mouseY === null) return;

    const dx = p.x - mouseX;
    const dy = p.y - mouseY;
    const dist2 = dx * dx + dy * dy;

    const R = 110 * dpr;
    if (dist2 > R * R) return;

    const dist = Math.sqrt(dist2) || 1;
    const force = (1 - dist / R) * 0.55;
    p.vx += (dx / dist) * force * dpr;
    p.vy += (dy / dist) * force * dpr;
  }

  function step() {
    ctx.clearRect(0, 0, w, h);

    const c = getAvatarCenter();

    // Around avatar
    for (const p of around) {
      p.homeAngle += p.spin;
      const hx = c.x + Math.cos(p.homeAngle) * p.homeRadius;
      const hy = c.y + Math.sin(p.homeAngle) * p.homeRadius;

      p.vx += (hx - p.x) * 0.0006;
      p.vy += (hy - p.y) * 0.0006;

      repel(p);

      p.vx *= 0.96;
      p.vy *= 0.96;

      p.x += p.vx;
      p.y += p.vy;

      const dx = p.x - c.x;
      const dy = p.y - c.y;
      const dist = Math.sqrt(dx * dx + dy * dy) / (200 * dpr);
      const a = p.a * clamp(1.15 - dist, 0.15, 1.15);

      drawDot(p.x, p.y, p.r, a);
    }

    // Bottom field
    for (const p of field) {
      repel(p);

      p.vx *= 0.985;
      p.vy *= 0.985;

      p.x += p.vx;
      p.y += p.vy;

      if (p.x < -10) p.x = w + 10;
      if (p.x > w + 10) p.x = -10;

      const topLimit = 0.50 * h;
      const bottomLimit = 1.02 * h;
      if (p.y < topLimit) p.y = bottomLimit;
      if (p.y > bottomLimit) p.y = topLimit;

      const tY = clamp((p.y / h - 0.55) / 0.45, 0, 1);
      const a = p.a * (0.18 + 0.82 * tY);

      drawDot(p.x, p.y, p.r, a);
    }

    requestAnimationFrame(step);
  }

  window.addEventListener("mousemove", (e) => {
    mouseX = e.clientX * dpr;
    mouseY = e.clientY * dpr;
  }, { passive: true });

  window.addEventListener("mouseleave", () => {
    mouseX = null; mouseY = null;
  }, { passive: true });

  window.addEventListener("resize", () => {
    resize();
    seed();
  }, { passive: true });

  resize();
  seed();
  requestAnimationFrame(step);
})();
