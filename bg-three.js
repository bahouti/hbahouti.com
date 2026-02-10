(() => {
  const container = document.getElementById("bg");
  if (!container || !window.THREE) return;

  // Scene / camera / renderer
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 2000);
  camera.position.z = 260;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 0); // transparent
  container.innerHTML = "";
  container.appendChild(renderer.domElement);

  // Particles (3D point cloud)
  const COUNT = 14000;
  const geom = new THREE.BufferGeometry();
  const pos = new Float32Array(COUNT * 3);

  // "Burst / flower" vibe: points around a distorted sphere
  for (let i = 0; i < COUNT; i++) {
    const t = Math.random() * Math.PI * 2;
    const p = Math.acos(2 * Math.random() - 1);
    const r = 95 + Math.random() * 110;

    // slight noise to create "petals"
    const wobble = 1 + 0.25 * Math.sin(6 * t) * Math.sin(3 * p);

    pos[i * 3 + 0] = r * wobble * Math.sin(p) * Math.cos(t);
    pos[i * 3 + 1] = r * wobble * Math.cos(p);
    pos[i * 3 + 2] = r * wobble * Math.sin(p) * Math.sin(t);
  }

  geom.setAttribute("position", new THREE.BufferAttribute(pos, 3));

  const mat = new THREE.PointsMaterial({
    color: 0x2b79ff,
    size: 1.15,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });

  const points = new THREE.Points(geom, mat);
  scene.add(points);

  // Postprocessing (bloom)
  const composer = new THREE.EffectComposer(renderer);
  composer.addPass(new THREE.RenderPass(scene, camera));

  const bloom = new THREE.UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.95, // strength
    0.65, // radius
    0.15  // threshold
  );
  composer.addPass(bloom);

  // Animation loop
  let t = 0;
  function animate() {
    t += 0.0025;
    points.rotation.y = t * 0.85;
    points.rotation.x = Math.sin(t * 0.7) * 0.18;

    // gentle camera breathing
    camera.position.z = 260 + Math.sin(t * 0.6) * 6;

    composer.render();
    requestAnimationFrame(animate);
  }
  animate();

  function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
  }
  window.addEventListener("resize", onResize, { passive: true });
})();
