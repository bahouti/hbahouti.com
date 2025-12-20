import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
if (reduced) throw new Error("reduced motion");

const container = document.getElementById("bg");
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0xffffff, 0.07);

const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
camera.position.z = 7;

const PARTICLES = window.innerWidth < 768 ? 1400 : 2600;
const AREA = { x: 10, y: 6, z: 6 };

const positions = new Float32Array(PARTICLES * 3);
const velocities = new Float32Array(PARTICLES * 3);

for (let i = 0; i < PARTICLES; i++) {
  const i3 = i * 3;
  positions[i3]     = (Math.random() - 0.5) * AREA.x;
  positions[i3 + 1] = (Math.random() - 0.5) * AREA.y;
  positions[i3 + 2] = (Math.random() - 0.5) * AREA.z;

  velocities[i3]     = (Math.random() - 0.5) * 0.003;
  velocities[i3 + 1] = (Math.random() - 0.5) * 0.003;
  velocities[i3 + 2] = (Math.random() - 0.5) * 0.002;
}

const pGeo = new THREE.BufferGeometry();
pGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));

const pMat = new THREE.PointsMaterial({
  color: 0x5aa2ff,
  size: 0.03,
  transparent: true,
  opacity: 0.65,
  depthWrite: false
});

const points = new THREE.Points(pGeo, pMat);
scene.add(points);

const MAX_CONNECTIONS = window.innerWidth < 768 ? 900 : 1600;
const linePositions = new Float32Array(MAX_CONNECTIONS * 2 * 3);
const lineGeo = new THREE.BufferGeometry();
lineGeo.setAttribute("position", new THREE.BufferAttribute(linePositions, 3));

const lineMat = new THREE.LineBasicMaterial({
  color: 0x5aa2ff,
  transparent: true,
  opacity: 0.22
});

const lines = new THREE.LineSegments(lineGeo, lineMat);
scene.add(lines);

const mouse = new THREE.Vector2(0, 0);
window.addEventListener("mousemove", (e) => {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
});

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", resize);
resize();

const clock = new THREE.Clock();

function animate() {
  const dt = Math.min(clock.getDelta(), 0.033);
  const t = clock.getElapsedTime();

  camera.position.x = mouse.x * 0.35;
  camera.position.y = mouse.y * 0.25;
  camera.lookAt(0, 0, 0);

  const pos = pGeo.attributes.position.array;

  for (let i = 0; i < PARTICLES; i++) {
    const i3 = i * 3;

    pos[i3]     += velocities[i3]     + Math.sin(t * 0.12 + i * 0.02) * 0.0006;
    pos[i3 + 1] += velocities[i3 + 1] + Math.cos(t * 0.10 + i * 0.03) * 0.0005;
    pos[i3 + 2] += velocities[i3 + 2];

    if (pos[i3] >  AREA.x/2) pos[i3] = -AREA.x/2;
    if (pos[i3] < -AREA.x/2) pos[i3] =  AREA.x/2;

    if (pos[i3 + 1] >  AREA.y/2) pos[i3 + 1] = -AREA.y/2;
    if (pos[i3 + 1] < -AREA.y/2) pos[i3 + 1] =  AREA.y/2;

    if (pos[i3 + 2] >  AREA.z/2) pos[i3 + 2] = -AREA.z/2;
    if (pos[i3 + 2] < -AREA.z/2) pos[i3 + 2] =  AREA.z/2;
  }
  pGeo.attributes.position.needsUpdate = true;

  const threshold = window.innerWidth < 768 ? 1.1 : 1.35;
  let ptr = 0;
  let connections = 0;

  for (let i = 0; i < PARTICLES; i++) {
    const ax = pos[i*3], ay = pos[i*3+1], az = pos[i*3+2];

    for (let j = i + 1; j < PARTICLES; j++) {
      const bx = pos[j*3], by = pos[j*3+1], bz = pos[j*3+2];
      const dx = ax - bx, dy = ay - by, dz = az - bz;
      const d2 = dx*dx + dy*dy + dz*dz;

      if (d2 < threshold * threshold) {
        linePositions[ptr++] = ax; linePositions[ptr++] = ay; linePositions[ptr++] = az;
        linePositions[ptr++] = bx; linePositions[ptr++] = by; linePositions[ptr++] = bz;
        connections++;
        if (connections >= MAX_CONNECTIONS) break;
      }
    }
    if (connections >= MAX_CONNECTIONS) break;
  }

  for (let k = ptr; k < linePositions.length; k++) linePositions[k] = 0;
  lineGeo.attributes.position.needsUpdate = true;

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
animate();
