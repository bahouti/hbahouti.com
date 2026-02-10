import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

/* ========= Scroll reveal (Experience / Work items) ========= */
const revealEls = document.querySelectorAll(".reveal");
const revealIO = new IntersectionObserver(
  (entries) => {
    for (const e of entries) {
      if (e.isIntersecting) {
        e.target.classList.add("in");
        revealIO.unobserve(e.target);
      }
    }
  },
  { threshold: 0.15, rootMargin: "0px 0px -10% 0px" }
);
revealEls.forEach((el) => revealIO.observe(el));

/* ========= Background particles (Three.js) ========= */
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const container = document.getElementById("bg");

if (!container || reduced) {
  if (container) container.style.display = "none";
} else {
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0b0d0f, 0.10);

  const camera = new THREE.PerspectiveCamera(65, 1, 0.1, 200);
  camera.position.set(0, 0, 18);

  const geometry = new THREE.BufferGeometry();
  const count = 1200;

  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    positions[i3 + 0] = (Math.random() - 0.5) * 40;
    positions[i3 + 1] = (Math.random() - 0.5) * 22;
    positions[i3 + 2] = (Math.random() - 0.5) * 40;
    sizes[i] = Math.random() * 1.3 + 0.4;
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));

  const material = new THREE.PointsMaterial({
    color: 0x5aa2ff,
    size: 0.06,
    transparent: true,
    opacity: 0.65,
    depthWrite: false,
  });

  const points = new THREE.Points(geometry, material);
  scene.add(points);

  const onResize = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  window.addEventListener("resize", onResize, { passive: true });
  onResize();

  let t = 0;
  const animate = () => {
    t += 0.0025;
    points.rotation.y = t * 0.25;
    points.rotation.x = t * 0.08;

    // subtle drift
    const pos = geometry.attributes.position.array;
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      pos[i3 + 1] += Math.sin(t + i) * 0.0008;
    }
    geometry.attributes.position.needsUpdate = true;

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  };
  animate();
}
