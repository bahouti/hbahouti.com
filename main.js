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

// Background particles (canvas 2D, simple + light, no libs)
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const canvas = document.getElementById("bg");
if (!canvas || reduced) {
  if (canvas) canvas.style.display = "none";
} else {
  const ctx = canvas.getContext("2d");
  let w = 0, h = 0, dpr = 1;
  const particles = [];
  const COUNT = 900;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = Math.floor(window.innerWidth * dpr);
    h = Math.floor(window.innerHeight * dpr);
    canvas.width = w;
    canvas.height = h;
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
  }

  function rnd(min, max){ return Math.random() * (max - min) + min; }

  function init() {
    particles.length = 0;
    for (let i = 0; i < COUNT; i++) {
      particles.push({
        x: rnd(0, w),
        y: rnd(0, h),
        r: rnd(0.6, 1.6) * dpr,
        vx: rnd(-0.15, 0.15) * dpr,
        vy: rnd(-0.10, 0.10) * dpr,
        a: rnd(0.08, 0.22) // alpha
      });
    }
  }

  function step() {
    ctx.clearRect(0, 0, w, h);

    // More visible at bottom (like msuiche)
    // We'll draw everything but alpha boosted by vertical position.
    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < -10) p.x = w + 10;
      if (p.x > w + 10) p.x = -10;
      if (p.y < -10) p.y = h + 10;
      if (p.y > h + 10) p.y = -10;

      const t = Math.max(0, (p.y / h) - 0.55) / 0.45; // 0..1 mainly bottom
      const alpha = p.a * (0.25 + 0.75 * t);

      ctx.beginPath();
      ctx.fillStyle = `rgba(255, 120, 40, ${alpha})`; // warm dots like msuiche
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }

    requestAnimationFrame(step);
  }

  window.addEventListener("resize", () => { resize(); init(); }, { passive: true });
  resize();
  init();
  step();
}
