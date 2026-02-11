// main.js

// Particles background (light)
(() => {
  const canvas = document.createElement("canvas");
  const bg = document.getElementById("bg");
  bg.appendChild(canvas);
  const ctx = canvas.getContext("2d");

  let w, h, dpr;
  const dots = [];
  const COUNT = 140;
  const SPEED = 0.18;

  function resize(){
    dpr = Math.max(1, window.devicePixelRatio || 1);
    w = canvas.width = Math.floor(window.innerWidth * dpr);
    h = canvas.height = Math.floor(window.innerHeight * dpr);
    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerHeight + "px";
    dots.length = 0;
    for(let i=0;i<COUNT;i++){
      dots.push({
        x: Math.random()*w,
        y: Math.random()*h,
        r: (Math.random()*1.4 + 0.4)*dpr,
        vx: (Math.random()*2-1)*SPEED*dpr,
        vy: (Math.random()*2-1)*SPEED*dpr,
        a: Math.random()*0.35 + 0.08
      });
    }
  }

  function step(){
    ctx.clearRect(0,0,w,h);
    for(const p of dots){
      p.x += p.vx;
      p.y += p.vy;
      if(p.x < -20) p.x = w+20;
      if(p.x > w+20) p.x = -20;
      if(p.y < -20) p.y = h+20;
      if(p.y > h+20) p.y = -20;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
      ctx.fillStyle = `rgba(43,121,255,${p.a})`;
      ctx.fill();
    }
    requestAnimationFrame(step);
  }

  window.addEventListener("resize", resize, {passive:true});
  resize();
  step();
})();


// Smooth scroll for internal anchors
(() => {
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      if(!id || id === "#") return;
      const target = document.querySelector(id);
      if(!target) return;
      e.preventDefault();
      target.scrollIntoView({behavior:"smooth", block:"start"});
      history.pushState(null, "", id);
    });
  });
})();


// Reveal on scroll
(() => {
  const els = document.querySelectorAll(".reveal");
  const obs = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if(entry.isIntersecting){
        entry.target.classList.add("visible");
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  els.forEach(el => obs.observe(el));
})();
