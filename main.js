// main.js


class DynamicParticleBackground {
  constructor() {
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.composer = null;
    this.particleSystem = null;
    this.clock = null;

    this.targetPositions = null;
    this.velocities = null;
    this.animationProgress = 1;
    this.currentShape = "sphere";
    this.mousePos = null;
    this.isAnimating = false;

    this.availableShapes = ["sphere", "torus", "galaxy", "wave"];
    this.currentShapeIndex = 0;
    this.shapeChangeTimer = 0;

    this.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    this.params = {
      particleCount: window.innerWidth < 768 ? 2000 : 5000,
      particleSize: 0.04,
      particleColor1: null, // set in init when THREE is available
      particleColor2: null,
      rotationSpeed: 0.01,
      bloomStrength: 0.8,
      bloomRadius: 0.4,
      bloomThreshold: 0.3,
      noiseInfluence: 0.4,
      chaosLevel: 1.5,
    };

    if (!this.reducedMotion) this.init();
  }

  init() {
    try {
      if (typeof THREE === "undefined") return;

      this.clock = new THREE.Clock();
      this.mousePos = new THREE.Vector2();

      this.params.particleColor1 = new THREE.Color(0x2080ff);
      this.params.particleColor2 = new THREE.Color(0x40a0ff);

      this.createScene();
      this.createCamera();
      this.createRenderer();
      this.createParticleSystem();
      this.initComposer();
      this.addEventListeners();
      this.morphToShape("sphere");
      this.start();
    } catch (e) {
      this.createFallbackParticles();
    }
  }

  createScene() {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x000011, 0.002);
  }

  createCamera() {
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.z = 5;
  }

  createRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });

    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setClearColor(0x000000, 0);

    // IMPORTANT : on utilise TON #bg comme host (comme ton ancien canvas)
    const host = document.getElementById("bg");
    if (!host) throw new Error("#bg not found");

    // on vide #bg et on y met un container identique à l'exemple
    host.innerHTML = "";

    const container = document.createElement("div");
    container.id = "particle-bg";
    container.style.cssText = `
      position: fixed;
      inset: 0;
      width: 100%;
      height: 100%;
      z-index: -1;
      pointer-events: none;
    `;

    container.appendChild(this.renderer.domElement);
    host.appendChild(container);
  }

  initComposer() {
    try {
      if (
        typeof THREE.EffectComposer !== "undefined" &&
        typeof THREE.RenderPass !== "undefined" &&
        typeof THREE.UnrealBloomPass !== "undefined"
      ) {
        this.composer = new THREE.EffectComposer(this.renderer);

        const renderPass = new THREE.RenderPass(this.scene, this.camera);
        this.composer.addPass(renderPass);

        const bloomPass = new THREE.UnrealBloomPass(
          new THREE.Vector2(window.innerWidth, window.innerHeight),
          this.params.bloomStrength,
          this.params.bloomRadius,
          this.params.bloomThreshold
        );
        this.composer.addPass(bloomPass);
      } else {
        this.composer = null;
      }
    } catch {
      this.composer = null;
    }
  }

  createParticleSystem() {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.params.particleCount * 3);
    const colors = new Float32Array(this.params.particleCount * 3);
    const sizes = new Float32Array(this.params.particleCount);

    this.targetPositions = new Float32Array(this.params.particleCount * 3);
    this.velocities = new Float32Array(this.params.particleCount * 3);

    for (let i = 0; i < this.params.particleCount; i++) {
      const x = (Math.random() - 0.5) * 20;
      const y = (Math.random() - 0.5) * 15;
      const z = (Math.random() - 0.5) * 12;

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      this.targetPositions[i * 3] = x;
      this.targetPositions[i * 3 + 1] = y;
      this.targetPositions[i * 3 + 2] = z;

      this.velocities[i * 3] = 0;
      this.velocities[i * 3 + 1] = 0;
      this.velocities[i * 3 + 2] = 0;

      const mixFactor = Math.random();
      const color = new THREE.Color().lerpColors(this.params.particleColor1, this.params.particleColor2, mixFactor);

      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      sizes[i] = this.params.particleSize * (1.0 + Math.random() * 0.5);
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        pixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
      },
      vertexShader: `
        attribute float size;
        varying vec3 vColor;
        uniform float time;
        uniform float pixelRatio;

        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * pixelRatio * (400.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        uniform float time;

        void main() {
          vec2 uv = gl_PointCoord.xy - 0.5;
          float dist = length(uv);
          if (dist > 0.5) discard;

          float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
          float glow = exp(-dist * 2.5) * 0.8 + 0.4;
          float pulse = 0.7 + 0.3 * sin(time * 0.6);

          vec3 finalColor = vColor * glow * pulse;
          gl_FragColor = vec4(finalColor, alpha * 0.9);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
    });

    this.particleSystem = new THREE.Points(geometry, material);
    this.scene.add(this.particleSystem);
  }

  addEventListeners() {
    document.addEventListener(
      "mousemove",
      (e) => {
        this.mousePos.x = (e.clientX / window.innerWidth) * 2 - 1;
        this.mousePos.y = -(e.clientY / window.innerHeight) * 2 + 1;
      },
      { passive: true }
    );

    window.addEventListener(
      "resize",
      () => {
        if (!this.camera || !this.renderer) return;

        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);

        if (this.composer) this.composer.setSize(window.innerWidth, window.innerHeight);
      },
      { passive: true }
    );

    window.addEventListener("scroll", () => {
      if (this.reducedMotion) return;
      clearTimeout(this.shapeChangeTimer);
      this.shapeChangeTimer = setTimeout(() => this.changeShape(), 1500);
    });

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) this.pause();
      else this.start();
    });
  }

  changeShape() {
    this.currentShapeIndex = (this.currentShapeIndex + 1) % this.availableShapes.length;
    this.morphToShape(this.availableShapes[this.currentShapeIndex]);
  }

  morphToShape(shapeType) {
    this.currentShape = shapeType;
    let targetVertices = [];

    switch (shapeType) {
      case "sphere":
        targetVertices = this.generateSphereVertices(2.0);
        break;
      case "torus":
        targetVertices = this.generateTorusVertices(1.8, 0.6);
        break;
      case "galaxy":
        targetVertices = this.generateGalaxyVertices(2.5);
        break;
      case "wave":
        targetVertices = this.generateWaveVertices(2.2);
        break;
      default:
        targetVertices = this.generateSphereVertices(2.0);
    }

    for (let i = 0; i < this.params.particleCount; i++) {
      const v = targetVertices[i % targetVertices.length];

      this.targetPositions[i * 3] = v.x;
      this.targetPositions[i * 3 + 1] = v.y;
      this.targetPositions[i * 3 + 2] = v.z;

      this.velocities[i * 3] = 0;
      this.velocities[i * 3 + 1] = 0;
      this.velocities[i * 3 + 2] = 0;
    }

    this.animationProgress = 0;
  }

  generateSphereVertices(radius) {
    const vertices = [];
    const segments = 48;

    for (let i = 0; i <= segments; i++) {
      const theta = (i * Math.PI) / segments;
      const sinTheta = Math.sin(theta);
      const cosTheta = Math.cos(theta);

      for (let j = 0; j <= segments; j++) {
        const phi = (j * 2 * Math.PI) / segments;
        const sinPhi = Math.sin(phi);
        const cosPhi = Math.cos(phi);

        vertices.push(new THREE.Vector3(cosPhi * sinTheta * radius, cosTheta * radius, sinPhi * sinTheta * radius));
      }
    }
    return vertices;
  }

  generateTorusVertices(radius, tube) {
    const vertices = [];
    const radialSegments = 24;
    const tubularSegments = 64;

    for (let i = 0; i <= radialSegments; i++) {
      const theta = (i * Math.PI * 2) / radialSegments;

      for (let j = 0; j <= tubularSegments; j++) {
        const phi = (j * Math.PI * 2) / tubularSegments;

        const x = (radius + tube * Math.cos(phi)) * Math.cos(theta);
        const y = (radius + tube * Math.cos(phi)) * Math.sin(theta);
        const z = tube * Math.sin(phi);

        vertices.push(new THREE.Vector3(x, y, z));
      }
    }
    return vertices;
  }

  generateGalaxyVertices(radius) {
    const vertices = [];
    const arms = 3;
    const perArm = Math.floor(this.params.particleCount / arms);

    for (let a = 0; a < arms; a++) {
      const armOffset = (a * Math.PI * 2) / arms;

      for (let i = 0; i < perArm; i++) {
        const distance = Math.random() * radius;
        const spinAngle = distance * 1.5;
        const angle = armOffset + spinAngle + (Math.random() - 0.5) * 0.4;

        const x = Math.cos(angle) * distance;
        const y = (Math.random() - 0.5) * distance * 0.3;
        const z = Math.sin(angle) * distance;

        vertices.push(new THREE.Vector3(x, y, z));
      }
    }
    return vertices;
  }

  generateWaveVertices(radius) {
    const vertices = [];
    const gridSize = Math.ceil(Math.sqrt(this.params.particleCount));
    const spacing = (radius * 2) / gridSize;

    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        if (vertices.length >= this.params.particleCount) break;

        const x = (i - gridSize / 2) * spacing;
        const z = (j - gridSize / 2) * spacing;
        const dist = Math.sqrt(x * x + z * z);
        const y = Math.sin(dist * 1.5) * Math.exp(-dist / (radius * 0.8)) * radius * 0.6;

        vertices.push(new THREE.Vector3(x, y, z));
      }
    }
    return vertices;
  }

  animate() {
    if (!this.isAnimating) return;

    requestAnimationFrame(() => this.animate());

    const delta = Math.min(this.clock.getDelta(), 0.1);
    const elapsedTime = this.clock.getElapsedTime();

    if (this.particleSystem && this.particleSystem.material.uniforms) {
      this.particleSystem.material.uniforms.time.value = elapsedTime;
    }

    if (this.particleSystem) {
      this.particleSystem.rotation.y += delta * this.params.rotationSpeed;
      this.particleSystem.rotation.x += delta * this.params.rotationSpeed * 0.4;

      const positions = this.particleSystem.geometry.attributes.position.array;

      if (this.animationProgress < 1) {
        this.animationProgress += delta * 0.6;

        const spring = 6.0;
        const damping = 0.85;

        for (let i = 0; i < this.params.particleCount; i++) {
          for (let j = 0; j < 3; j++) {
            const idx = i * 3 + j;
            const force = (this.targetPositions[idx] - positions[idx]) * spring;
            this.velocities[idx] = this.velocities[idx] * damping + force * delta;
            positions[idx] += this.velocities[idx] * delta * 3;
          }
        }
      } else {
        for (let i = 0; i < this.params.particleCount; i += 3) {
          const idx = i * 3;

          const noise1 = Math.sin(elapsedTime * 0.1 + i * 0.05) * 0.05 * this.params.chaosLevel;
          const noise2 = Math.cos(elapsedTime * 0.15 + i * 0.08) * 0.04 * this.params.chaosLevel;
          const noise3 = Math.sin(elapsedTime * 0.08 + i * 0.03) * 0.03 * this.params.chaosLevel;

          const turb1 = Math.sin(elapsedTime * 0.2 + positions[idx] * 0.1) * 0.02;
          const turb2 = Math.cos(elapsedTime * 0.25 + positions[idx + 1] * 0.1) * 0.02;
          const turb3 = Math.sin(elapsedTime * 0.12 + positions[idx + 2] * 0.1) * 0.02;

          positions[idx] += (noise1 + turb1) * this.params.noiseInfluence;
          positions[idx + 1] += (noise2 + turb2) * this.params.noiseInfluence;
          positions[idx + 2] += (noise3 + turb3) * this.params.noiseInfluence;

          positions[idx] += (this.targetPositions[idx] - positions[idx]) * 0.02;
          positions[idx + 1] += (this.targetPositions[idx + 1] - positions[idx + 1]) * 0.02;
          positions[idx + 2] += (this.targetPositions[idx + 2] - positions[idx + 2]) * 0.02;

          if (Math.abs(positions[idx]) > 12) positions[idx] *= 0.8;
          if (Math.abs(positions[idx + 1]) > 10) positions[idx + 1] *= 0.8;
          if (Math.abs(positions[idx + 2]) > 8) positions[idx + 2] *= 0.8;
        }
      }

      if (Math.abs(this.mousePos.x) > 0.1 || Math.abs(this.mousePos.y) > 0.1) {
        for (let i = 0; i < this.params.particleCount; i += 20) {
          const idx = i * 3;
          positions[idx] += this.mousePos.x * 0.005;
          positions[idx + 1] += this.mousePos.y * 0.005;
        }
      }

      this.particleSystem.geometry.attributes.position.needsUpdate = true;
    }

    if (this.composer) this.composer.render();
    else this.renderer.render(this.scene, this.camera);
  }

  start() {
    if (this.isAnimating) return;
    this.isAnimating = true;
    this.animate();
  }

  pause() {
    this.isAnimating = false;
  }

  destroy() {
    this.pause();

    if (this.particleSystem) {
      this.scene.remove(this.particleSystem);
      this.particleSystem.geometry.dispose();
      this.particleSystem.material.dispose();
    }

    if (this.renderer) this.renderer.dispose();

    const container = document.getElementById("particle-bg");
    if (container) container.remove();
  }

  createFallbackParticles() {
    const host = document.getElementById("bg");
    if (!host) return;

    host.innerHTML = "";

    const canvas = document.createElement("canvas");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvas.style.cssText = `
      position: fixed;
      inset: 0;
      width: 100%;
      height: 100%;
      z-index: -1;
      pointer-events: none;
      opacity: 0.6;
    `;

    const ctx = canvas.getContext("2d");
    const particles = [];

    for (let i = 0; i < 110; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: Math.random() * 2 + 1,
        alpha: Math.random() * 0.5 + 0.5,
        hue: Math.random() * 60 + 180,
      });
    }

    const container = document.createElement("div");
    container.id = "particle-bg";
    container.style.cssText = `
      position: fixed;
      inset: 0;
      width: 100%;
      height: 100%;
      z-index: -1;
      pointer-events: none;
    `;

    container.appendChild(canvas);
    host.appendChild(container);

    const animateFallback = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 70%, 70%, ${p.alpha})`;
        ctx.fill();
      }

      requestAnimationFrame(animateFallback);
    };

    animateFallback();
  }
}

// Init particles on DOM ready (comme l'exemple)
document.addEventListener("DOMContentLoaded", () => {
  if (typeof THREE === "undefined") return;

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReducedMotion) return;

  window.dynamicParticleBackground = new DynamicParticleBackground();
});


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
