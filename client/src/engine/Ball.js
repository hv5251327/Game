import * as THREE from 'three';

// Real Newtonian 3D Projectile Physics for Cricket Ball
export class Ball {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();

    // Ball mesh: color #D9362B, radius 0.16
    this.radius = 0.16;
    const geo = new THREE.SphereGeometry(this.radius, 18, 18);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xD9362B,
      roughness: 0.3,
      metalness: 0.1
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.castShadow = true;
    this.group.add(this.mesh);

    // Seam
    const seamGeo = new THREE.TorusGeometry(this.radius, 0.012, 8, 36);
    const seamMat = new THREE.MeshStandardMaterial({ color: 0xFFF2D0, roughness: 0.5 });
    const seam = new THREE.Mesh(seamGeo, seamMat);
    this.group.add(seam);

    // Initial position: { x: 0, y: 0.35, z: -2.8 }
    this.group.position.set(0, 0.35, -2.8);
    this.scene.add(this.group);
    this.group.visible = false;

    // Physics State
    this.pos = new THREE.Vector3(0, 0.35, -2.8);
    this.vel = new THREE.Vector3(0, 0, 0);
    this.gravity = -21.0; // Realistic snappy cricket gravity
    this.restitution = 0.62; // Pitch bounce coefficient
    this.groundFriction = 0.88;
    this.airDrag = 0.992;
    this.active = false;
    this.isHitShot = false;
    this.bounceCount = 0;
    this.maxBounces = 6;
    this.onComplete = null;
    this.onBounce = null;
    this.flightTime = 0;

    // Visual Trail
    this.trailPoints = [];
    this.trailMeshes = [];
    this._buildTrail();
  }

  _buildTrail() {
    for (let i = 0; i < 16; i++) {
      const tGeo = new THREE.SphereGeometry(0.065 - i * 0.0035, 6, 6);
      const tMat = new THREE.MeshStandardMaterial({
        color: 0xFF6B4A,
        transparent: true,
        opacity: 0.5 - i * 0.028
      });
      const tm = new THREE.Mesh(tGeo, tMat);
      tm.visible = false;
      this.scene.add(tm);
      this.trailMeshes.push(tm);
      this.trailPoints.push(new THREE.Vector3());
    }
  }

  // Bowler delivery towards pitch landing zone
  bowlDelivery(startPos, landingPos, targetPos, deliveryType = 'pace') {
    this.pos.copy(startPos);
    this.group.position.copy(this.pos);
    this.group.visible = true;
    this.active = true;
    this.isHitShot = false;
    this.bounceCount = 0;
    this.flightTime = 0;

    // Calculate initial velocity to hit landing spot
    const dx = landingPos.x - startPos.x;
    const dz = landingPos.z - startPos.z;
    const distXZ = Math.hypot(dx, dz);

    let duration = deliveryType === 'spin' ? 0.75 : deliveryType === 'yorker' ? 0.45 : 0.55;
    const vx = dx / duration;
    const vz = dz / duration;
    // y(t) = y0 + vy*t + 0.5*g*t^2  =>  vy = (y_land - y0 - 0.5*g*t^2) / t
    const vy = (landingPos.y - startPos.y - 0.5 * this.gravity * duration * duration) / duration;

    this.vel.set(vx, vy, vz);
    this.trailPoints = [];
  }

  // Realistic Bat Hit Physics Launch
  hitLaunch(startPos, dirVector, power = 0.8, shotType = 'drive', isSix = false) {
    this.pos.copy(startPos);
    this.group.position.copy(this.pos);
    this.group.visible = true;
    this.active = true;
    this.isHitShot = true;
    this.bounceCount = 0;
    this.flightTime = 0;

    // Direction vector (normalized on XZ plane)
    const dir = new THREE.Vector2(dirVector.x, dirVector.z).normalize();

    let speedXZ, initialVy;

    if (isSix || shotType === 'loft') {
      // Big aerial sixer: High parabolic launch, clears stadium boundary
      const baseSpeed = isSix ? 28 : 22;
      speedXZ = baseSpeed * (0.8 + power * 0.4);
      initialVy = isSix ? 15.5 * (0.85 + power * 0.3) : 11.5 * (0.8 + power * 0.3);
    } else if (shotType === 'sweep') {
      // Low sweep skimming towards boundary
      speedXZ = 21 * (0.75 + power * 0.45);
      initialVy = 3.5;
    } else if (shotType === 'cut') {
      // Sharp cut off short pitch
      speedXZ = 22 * (0.75 + power * 0.4);
      initialVy = 4.2;
    } else if (shotType === 'defend') {
      // Defensive block: dead bounce
      speedXZ = 4.0;
      initialVy = 1.2;
    } else {
      // Crisp ground drive / boundary four
      speedXZ = 24 * (0.75 + power * 0.45);
      initialVy = 4.5;
    }

    this.vel.set(dir.x * speedXZ, initialVy, dir.y * speedXZ);
    this.trailPoints = [];
  }

  update(delta) {
    if (!this.active) return;
    this.flightTime += delta;

    // Apply gravity
    this.vel.y += this.gravity * delta;
    this.vel.x *= this.airDrag;
    this.vel.z *= this.airDrag;

    // Update position
    this.pos.x += this.vel.x * delta;
    this.pos.y += this.vel.y * delta;
    this.pos.z += this.vel.z * delta;

    // Ground bounce check (turf plane y = 0)
    if (this.pos.y <= this.radius) {
      this.pos.y = this.radius;

      if (Math.abs(this.vel.y) > 1.2) {
        this.vel.y = -this.vel.y * this.restitution;
        this.vel.x *= this.groundFriction;
        this.vel.z *= this.groundFriction;
        this.bounceCount++;
        this._spawnBounceRipple(this.pos);

        if (this.onBounce) this.onBounce(this.pos);
      } else {
        // Rolling on ground with rolling friction
        this.vel.y = 0;
        this.vel.x *= 0.91;
        this.vel.z *= 0.91;

        if (this.vel.lengthSq() < 0.2) {
          this.active = false;
          if (this.onComplete) this.onComplete();
        }
      }
    }

    // Boundary check (radius 26m)
    const distFromCenter = Math.hypot(this.pos.x, this.pos.z);
    if (distFromCenter > 32) {
      // Ball cleared or reached outer stadium
      this.vel.multiplyScalar(0.9);
      if (this.flightTime > 4.5) {
        this.active = false;
      }
    }

    this.group.position.copy(this.pos);
    this.mesh.rotation.x += this.vel.z * delta * 4;
    this.mesh.rotation.z -= this.vel.x * delta * 4;

    // Trail update
    this.trailPoints.unshift(this.pos.clone());
    if (this.trailPoints.length > 16) this.trailPoints.pop();
    this.trailMeshes.forEach((m, i) => {
      if (this.trailPoints[i]) {
        m.position.copy(this.trailPoints[i]);
        m.visible = true;
        m.material.opacity = Math.max(0, 0.45 - i * 0.026);
      } else {
        m.visible = false;
      }
    });
  }

  _spawnBounceRipple(pos) {
    const ringGeo = new THREE.TorusGeometry(0.25, 0.03, 6, 20);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xD8B27A,
      transparent: true,
      opacity: 0.85
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(pos.x, 0.05, pos.z);
    this.scene.add(ring);

    let s = 1;
    const expand = () => {
      s += 0.18;
      ring.scale.setScalar(s);
      ring.material.opacity -= 0.08;
      if (ring.material.opacity > 0) requestAnimationFrame(expand);
      else this.scene.remove(ring);
    };
    expand();
  }

  reset() {
    this.active = false;
    this.group.visible = false;
    this.pos.set(0, 0.35, -2.8);
    this.vel.set(0, 0, 0);
    this.group.position.copy(this.pos);
    this.trailMeshes.forEach(m => m.visible = false);
  }

  destroy() {
    this.scene.remove(this.group);
    this.trailMeshes.forEach(m => this.scene.remove(m));
  }
}
