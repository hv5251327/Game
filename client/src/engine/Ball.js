import * as THREE from 'three';

export class Ball {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();

    // Ball mesh
    const geo = new THREE.SphereGeometry(0.1, 12, 12);
    const mat = new THREE.MeshStandardMaterial({ color: 0xcc2200, roughness: 0.3, metalness: 0.2 });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.castShadow = true;
    this.group.add(this.mesh);

    // Seam
    const seamGeo = new THREE.TorusGeometry(0.1, 0.008, 6, 32);
    const seamMat = new THREE.MeshStandardMaterial({ color: 0xffd700 });
    const seam = new THREE.Mesh(seamGeo, seamMat);
    this.group.add(seam);

    this.scene.add(this.group);
    this.group.visible = false;

    // Trail
    this.trailPoints = [];
    this.trailMeshes = [];
    this._buildTrail();

    this.active = false;
    this.t = 0;
    this.startPos = new THREE.Vector3();
    this.endPos = new THREE.Vector3();
    this.peakHeight = 3;
    this.duration = 1.0;
    this.onComplete = null;
    this.bounced = false;
    this.bouncePoint = new THREE.Vector3();
  }

  _buildTrail() {
    for (let i = 0; i < 12; i++) {
      const tGeo = new THREE.SphereGeometry(0.04 - i * 0.003, 5, 5);
      const tMat = new THREE.MeshStandardMaterial({
        color: 0xff6622, transparent: true, opacity: 0.4 - i * 0.03
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
    this.peakHeight = options.peakHeight || 2.5;
    this.duration = options.duration || 1.2;
    this.active = true;
    this.t = 0;
    this.bounced = false;
    this.group.visible = true;
    this.onComplete = options.onComplete || null;
    this.bouncePoint.set((startPos.x + endPos.x) / 2, 0, (startPos.z + endPos.z) / 2);

    // Trajectory type
    this.trajectory = options.trajectory || 'parabola'; // 'parabola' | 'bouncer' | 'yorker' | 'spin'
    this.lateral = options.lateral || 0; // side movement for spin
  }

  _getPos(t) {
    const pos = new THREE.Vector3();
    // Lerp XZ
    pos.x = this.startPos.x + (this.endPos.x - this.startPos.x) * t + Math.sin(t * Math.PI) * this.lateral;
    pos.z = this.startPos.z + (this.endPos.z - this.startPos.z) * t;

    // Y arc
    if (this.trajectory === 'yorker') {
      pos.y = Math.max(0, this.startPos.y * (1 - t) + Math.sin(t * Math.PI * 0.5) * 0.8);
    } else if (this.trajectory === 'bouncer') {
      // Two-hop arc
      if (t < 0.5) {
        pos.y = Math.sin(t * Math.PI * 2) * this.peakHeight * 0.6;
      } else {
        pos.y = Math.sin((t - 0.5) * Math.PI * 2) * this.peakHeight * 1.2;
      }
    } else {
      pos.y = Math.sin(t * Math.PI) * this.peakHeight;
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
    this.mesh.rotation.x += delta * 15;
    this.mesh.rotation.z += delta * 10;

    // Update trail
    this.trailPoints.unshift(pos.clone());
    if (this.trailPoints.length > 12) this.trailPoints.pop();
    this.trailMeshes.forEach((m, i) => {
      if (this.trailPoints[i]) {
        m.position.copy(this.trailPoints[i]);
        m.visible = true;
        m.material.opacity = Math.max(0, (0.35 - i * 0.028));
      }
    });

    // Bounce effect
    const midZ = (this.startPos.z + this.endPos.z) / 2;
    if (!this.bounced && this.t > 0.4 && Math.abs(pos.z - midZ) < 2 && pos.y < 0.3) {
      this.bounced = true;
      this._doBounceEffect(pos);
    }
  }

  _doBounceEffect(pos) {
    const ringGeo = new THREE.TorusGeometry(0.2, 0.04, 4, 16);
    const ringMat = new THREE.MeshStandardMaterial({ color: 0xffcc00, transparent: true, opacity: 0.8 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(pos.x, 0.05, pos.z);
    this.scene.add(ring);
    let scale = 1;
    const expand = () => {
      scale += 0.15;
      ring.scale.setScalar(scale);
      ring.material.opacity -= 0.06;
      if (ring.material.opacity > 0) requestAnimationFrame(expand);
      else this.scene.remove(ring);
    };
    expand();
  }

  reset() {
    this.active = false;
    this.group.visible = false;
    this.trailMeshes.forEach(m => m.visible = false);
  }

  destroy() {
    this.scene.remove(this.group);
    this.trailMeshes.forEach(m => this.scene.remove(m));
  }
}
