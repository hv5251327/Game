import * as THREE from 'three';

export class Ball {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();

    // Ball mesh: color #D9362B, radius 0.16
    const radius = 0.16;
    const geo = new THREE.SphereGeometry(radius, 16, 16);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xD9362B,
      roughness: 0.35,
      metalness: 0.15
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.castShadow = true;
    this.group.add(this.mesh);

    // Realistic cricket seam
    const seamGeo = new THREE.TorusGeometry(radius, 0.012, 8, 36);
    const seamMat = new THREE.MeshStandardMaterial({ color: 0xFFF2D0, roughness: 0.5 });
    const seam = new THREE.Mesh(seamGeo, seamMat);
    this.group.add(seam);

    // Initial position: { x: 0, y: 0.35, z: -2.8 }
    this.group.position.set(0, 0.35, -2.8);
    this.scene.add(this.group);
    this.group.visible = false;

    // Trail particle meshes
    this.trailPoints = [];
    this.trailMeshes = [];
    this._buildTrail();

    this.active = false;
    this.t = 0;
    this.startPos = new THREE.Vector3(0, 0.35, -2.8);
    this.endPos = new THREE.Vector3(0, 0.65, 3.8);
    this.peakHeight = 2.4;
    this.duration = 1.0;
    this.onComplete = null;
    this.bounced = false;
    this.trajectory = 'parabola';
    this.lateral = 0;
  }

  _buildTrail() {
    for (let i = 0; i < 14; i++) {
      const tGeo = new THREE.SphereGeometry(0.06 - i * 0.0035, 6, 6);
      const tMat = new THREE.MeshStandardMaterial({
        color: 0xFF7A45,
        transparent: true,
        opacity: 0.45 - i * 0.03
      });
      const tm = new THREE.Mesh(tGeo, tMat);
      tm.visible = false;
      this.scene.add(tm);
      this.trailMeshes.push(tm);
      this.trailPoints.push(new THREE.Vector3());
    }
  }

  launch(startPos, endPos, options = {}) {
    this.startPos.copy(startPos);
    this.endPos.copy(endPos);
    this.peakHeight = options.peakHeight || 2.4;
    this.duration = options.duration || 1.0;
    this.active = true;
    this.t = 0;
    this.bounced = false;
    this.group.visible = true;
    this.onComplete = options.onComplete || null;
    this.trajectory = options.trajectory || 'parabola';
    this.lateral = options.lateral || 0;
  }

  _getPos(t) {
    const pos = new THREE.Vector3();
    pos.x = this.startPos.x + (this.endPos.x - this.startPos.x) * t + Math.sin(t * Math.PI) * this.lateral;
    pos.z = this.startPos.z + (this.endPos.z - this.startPos.z) * t;

    if (this.trajectory === 'yorker') {
      // Very low trajectory pitching right at batsman toes
      pos.y = Math.max(0.16, this.startPos.y * (1 - t) + Math.sin(t * Math.PI) * 0.6);
    } else if (this.trajectory === 'bouncer') {
      // Early pitch then rises steeply
      if (t < 0.45) {
        pos.y = Math.max(0.16, Math.sin((t / 0.45) * Math.PI) * (this.peakHeight * 0.65));
      } else {
        pos.y = Math.max(0.16, Math.sin(((t - 0.45) / 0.55) * Math.PI) * (this.peakHeight * 1.35));
      }
    } else {
      // Standard pitch bounce: first arc descends to bounce around t=0.55 then rises
      if (t < 0.55) {
        const p = t / 0.55;
        pos.y = Math.max(0.16, this.startPos.y * (1 - p) + Math.sin(p * Math.PI) * (this.peakHeight * 0.8));
      } else {
        const p = (t - 0.55) / 0.45;
        pos.y = Math.max(0.16, this.endPos.y * p + Math.sin(p * Math.PI) * (this.peakHeight * 0.65));
      }
    }
    return pos;
  }

  update(delta) {
    if (!this.active) return;
    this.t += delta / this.duration;

    if (this.t >= 1) {
      this.t = 1;
      this.active = false;
      this.group.visible = false;
      this.trailMeshes.forEach(m => m.visible = false);
      if (this.onComplete) this.onComplete();
      return;
    }

    const pos = this._getPos(this.t);
    this.group.position.copy(pos);
    this.mesh.rotation.x += delta * 18;
    this.mesh.rotation.z += delta * 12;

    // Trail update
    this.trailPoints.unshift(pos.clone());
    if (this.trailPoints.length > 14) this.trailPoints.pop();
    this.trailMeshes.forEach((m, i) => {
      if (this.trailPoints[i]) {
        m.position.copy(this.trailPoints[i]);
        m.visible = true;
        m.material.opacity = Math.max(0, 0.45 - i * 0.03);
      }
    });

    // Pitch bounce visual dust / ripple ring
    if (!this.bounced && this.t >= 0.52 && this.t <= 0.6) {
      this.bounced = true;
      this._spawnBounceDust(pos);
    }
  }

  _spawnBounceDust(pos) {
    const ringGeo = new THREE.TorusGeometry(0.24, 0.035, 6, 20);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xD8B27A,
      transparent: true,
      opacity: 0.85
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(pos.x, 0.05, pos.z);
    this.scene.add(ring);

    let scale = 1;
    const expand = () => {
      scale += 0.2;
      ring.scale.setScalar(scale);
      ring.material.opacity -= 0.08;
      if (ring.material.opacity > 0) requestAnimationFrame(expand);
      else this.scene.remove(ring);
    };
    expand();
  }

  reset() {
    this.active = false;
    this.group.visible = false;
    this.group.position.set(0, 0.35, -2.8);
    this.trailMeshes.forEach(m => m.visible = false);
  }

  destroy() {
    this.scene.remove(this.group);
    this.trailMeshes.forEach(m => this.scene.remove(m));
  }
}
