import * as THREE from 'three';

export class SceneManager {
  constructor(wm) {
    this.wm = wm;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.sphere = null;
    this.particles = null;
    this.lines = new Map();
    this.meshes = new Map();
    this.velocities = [];
    this.clock = new THREE.Clock();
    this.frame = null;
    
    this.setup();
    this.createLights();
    this.createSphere();
    this.createParticles();
    this.wm.onUpdate = (w) => {
      this.updateMeshes(w);
      this.updateLines(w);
      this.updateSphere(w);
    };
    this.loop();
  }

  setup() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a1a);
    this.scene.fog = new THREE.FogExp2(0x0a0a1a, 0.0002);
    
    this.camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 100);
    this.camera.position.set(0, 5, 15);
    this.camera.lookAt(0, 0, 0);
    
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    document.body.appendChild(this.renderer.domElement);
    
    addEventListener('resize', () => {
      this.camera.aspect = innerWidth / innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(innerWidth, innerHeight);
    });
  }

  createLights() {
    this.scene.add(new THREE.AmbientLight(0x404060, 0.4));
    
    const dir = new THREE.DirectionalLight(0xffffff, 1.2);
    dir.position.set(10, 20, 10);
    dir.castShadow = true;
    dir.shadow.mapSize.set(1024, 1024);
    this.scene.add(dir);
    
    [0x4488ff, 0xff4488, 0x44ff88].forEach((c, i) => {
      const l = new THREE.PointLight(c, 0.6, 20);
      const a = (i / 3) * Math.PI * 2;
      l.position.set(Math.cos(a) * 5, 2, Math.sin(a) * 5);
      this.scene.add(l);
    });
  }

  createSphere() {
    const geo = new THREE.IcosahedronGeometry(1.5, 4);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x4488ff, roughness: 0.2, metalness: 0.8,
      emissive: 0x112244, emissiveIntensity: 0.3
    });
    
    this.sphere = new THREE.Mesh(geo, mat);
    this.sphere.castShadow = true;
    this.sphere.userData = { targetPos: new THREE.Vector3(), targetScale: 1 };
    this.scene.add(this.sphere);
    
    const wire = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.55, 4),
      new THREE.MeshBasicMaterial({ color: 0x88bbff, wireframe: true, opacity: 0.1, transparent: true })
    );
    this.sphere.add(wire);
  }

  createParticles() {
    const n = 500;
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    
    for (let i = 0; i < n; i++) {
      const r = 3 + Math.random() * 5;
      const t = Math.random() * Math.PI * 2;
      const p = Math.acos(2 * Math.random() - 1);
      const idx = i * 3;
      
      pos[idx] = r * Math.sin(p) * Math.cos(t);
      pos[idx + 1] = r * Math.sin(p) * Math.sin(t);
      pos[idx + 2] = r * Math.cos(p);
      
      const c = new THREE.Color().setHSL((pos[idx + 1] + 5) / 10, 0.7, 0.6);
      col[idx] = c.r;
      col[idx + 1] = c.g;
      col[idx + 2] = c.b;
      
      this.velocities.push({
        x: (Math.random() - 0.5) * 0.015,
        y: (Math.random() - 0.5) * 0.015,
        z: (Math.random() - 0.5) * 0.015
      });
    }
    
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    
    this.particles = new THREE.Points(geo, new THREE.PointsMaterial({
      size: 0.06, vertexColors: true, blending: THREE.AdditiveBlending, depthWrite: false
    }));
    this.scene.add(this.particles);
  }

  toWorld(w) {
    if (!w) return new THREE.Vector3();
    const sw = screen.availWidth || 1920;
    const sh = screen.availHeight || 1080;
    return new THREE.Vector3(
      ((w.x + w.width / 2 - sw / 2) / sw) * 20,
      ((sh / 2 - (w.y + w.height / 2)) / sh) * 12,
      0
    );
  }

  updateMeshes(windows) {
    const ids = new Set(windows.map(w => w.id));
    
    for (const [id, m] of this.meshes) {
      if (!ids.has(id)) {
        this.scene.remove(m);
        m.geometry.dispose();
        m.material.dispose();
        this.meshes.delete(id);
      }
    }
    
    windows.forEach(w => {
      if (w.id === this.wm.id) return;
      const pos = this.toWorld(w);
      
      if (this.meshes.has(w.id)) {
        this.meshes.get(w.id).userData.target = pos;
      } else {
        const m = new THREE.Mesh(
          new THREE.SphereGeometry(0.3, 16, 16),
          new THREE.MeshStandardMaterial({ color: 0xff4488, roughness: 0.3, metalness: 0.5, emissive: 0x220011, emissiveIntensity: 0.5 })
        );
        m.position.copy(pos);
        m.userData = { target: pos.clone() };
        this.scene.add(m);
        this.meshes.set(w.id, m);
      }
    });
  }

  updateLines(windows) {
    const active = new Set();
    
    windows.forEach(w => {
      if (w.id === this.wm.id) return;
      const id = this.wm.id + '_' + w.id;
      active.add(id);
      
      const end = this.toWorld(w);
      const start = new THREE.Vector3();
      
      if (this.lines.has(id)) {
        const l = this.lines.get(id);
        const p = l.geometry.attributes.position.array;
        p[0] = start.x; p[1] = start.y; p[2] = start.z;
        p[3] = end.x; p[4] = end.y; p[5] = end.z;
        l.geometry.attributes.position.needsUpdate = true;
      } else {
        const l = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints([start, end]),
          new THREE.LineBasicMaterial({ color: 0xff4488, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending })
        );
        this.scene.add(l);
        this.lines.set(id, l);
      }
    });
    
    for (const [id, l] of this.lines) {
      if (!active.has(id)) {
        this.scene.remove(l);
        l.geometry.dispose();
        l.material.dispose();
        this.lines.delete(id);
      }
    }
  }

  updateSphere(windows) {
    if (!this.sphere) return;
    
    if (windows.length <= 1) {
      this.sphere.userData.targetPos.set(0, 0, 0);
      this.sphere.userData.targetScale = 1;
      return;
    }
    
    let ax = 0, ay = 0, n = 0;
    windows.forEach(w => {
      if (w.id === this.wm.id) return;
      const p = this.toWorld(w);
      ax += p.x; ay += p.y; n++;
    });
    
    if (n) {
      this.sphere.userData.targetPos.set(ax / n * 0.3, ay / n * 0.3, 0);
      this.sphere.userData.targetScale = 1 + n * 0.15;
    }
  }

  loop() {
    this.frame = requestAnimationFrame(() => this.loop());
    
    const t = this.clock.getElapsedTime();
    
    if (this.sphere) {
      this.sphere.position.lerp(this.sphere.userData.targetPos, 0.05);
      const s = this.sphere.userData.targetScale;
      this.sphere.scale.lerp(new THREE.Vector3(s, s, s), 0.05);
      this.sphere.rotation.y += 0.003;
      this.sphere.rotation.x = Math.sin(t * 0.5) * 0.1;
    }
    
    if (this.particles) {
      this.particles.rotation.y += 0.0008;
      const pos = this.particles.geometry.attributes.position.array;
      for (let i = 0; i < this.velocities.length; i++) {
        const idx = i * 3;
        const v = this.velocities[i];
        pos[idx] += v.x;
        pos[idx + 1] += v.y;
        pos[idx + 2] += v.z;
        if (Math.hypot(pos[idx], pos[idx + 1], pos[idx + 2]) > 8) {
          v.x *= -1; v.y *= -1; v.z *= -1;
        }
      }
      this.particles.geometry.attributes.position.needsUpdate = true;
    }
    
    this.meshes.forEach(m => {
      if (m.userData.target) {
        m.position.lerp(m.userData.target, 0.1);
        m.rotation.y += 0.02;
      }
    });
    
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    cancelAnimationFrame(this.frame);
    this.scene.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose());
      }
    });
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
