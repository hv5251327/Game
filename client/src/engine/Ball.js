import * as THREE from 'three';

// Real Newtonian 3D Projectile Physics for Cricket Ball
export class Ball {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();

    // Ball mesh: color #D9362B, radius 0.22 (scaled for 4m player models)
    this.radius = 0.22;
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
    const seamGeo = new THREE.TorusGeometry(this.radius, 0.015, 8, 36);
    const seamMat = new THREE.MeshStandardMaterial({ color: 0xFFF2D0, roughness: 0.5 });
    const seam = new THREE.Mesh(seamGeo, seamMat);
    this.group.add(seam);

    // Initial position
    this.group.position.set(0, 0.5, -9.5);
    this.scene.add(this.group);
    this.group.visible = false;

    // Physics State
    this.pos = new THREE.Vector3(0, 0.5, -9.5);
    this.vel = new THREE.Vector3(0, 0, 0);
    this.gravity = -21.0;
    this.restitution = 0.62;
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
      const tGeo = new THREE.SphereGeometry(0.09 - i * 0.005, 6, 6);
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

  // Bowler delivery towards pitch landing zone with authentic cricket physics
  bowlDelivery(startPos, landingPos, targetPos, deliveryType = 'pace', swingDirection = 'left') {
    this.pos.copy(startPos);
    this.startSpot = startPos.clone();
    this.landingSpot = landingPos.clone();
    this.landingSpot.y = this.radius;
    this.group.position.copy(this.pos);
    this.group.visible = true;
    this.active = true;
    this.isHitShot = false;
    this.deliveryBounced = false;
    this.bounceCount = 0;
    this.flightTime = 0;
    this.deliveryType = deliveryType || 'pace';
    this.swingDirection = swingDirection || 'left';
    this.batsmanTarget = targetPos ? targetPos.clone() : new THREE.Vector3(0, 1.8, 9.5);

    // Phase 1: From bowler release hand (z ~ 10.5) to pitch landing spot (z ~ 2.0 to -6.0)
    // In our coordinate system, ball travels from positive Z to negative Z (towards batsman at -9.5)
    const totalDz = this.landingSpot.z - this.startSpot.z; // negative value
    const isSpin = this.deliveryType.includes('spin');
    const isYorker = this.deliveryType === 'yorker';
    const isBouncer = this.deliveryType === 'bouncer';

    this.duration1 = isSpin ? 0.62 : isYorker ? 0.42 : isBouncer ? 0.52 : 0.46;

    // Exact analytical velocity to hit landingSpot precisely at t = duration1 under gravity
    const vx = (this.landingSpot.x - this.startSpot.x) / this.duration1;
    const vz = totalDz / this.duration1; // negative velocity along Z
    const vy = (this.landingSpot.y - this.startSpot.y - 0.5 * this.gravity * this.duration1 * this.duration1) / this.duration1;

    this.vel.set(vx, vy, vz);
    this.trailPoints = [];
  }

  // Realistic Bat Hit Physics Launch calibrated for 96m boundary
  hitLaunch(startPos, dirVector, power = 0.8, shotType = 'drive', isSix = false, runs = 0) {
    this.pos.copy(startPos);
    this.group.position.copy(this.pos);
    this.group.visible = true;
    this.active = true;
    this.isHitShot = true;
    this.deliveryBounced = false;
    this.bounceCount = 0;
    this.flightTime = 0;

    // Direction vector (normalized on XZ plane)
    const dir = new THREE.Vector2(dirVector.x, dirVector.z).normalize();

    let speedXZ, initialVy;

    if (isSix || runs === 6) {
      // High soaring maximum: clears the 96m boundary rope with majestic parabola
      const baseSpeed = 66;
      speedXZ = baseSpeed * (0.85 + power * 0.35);
      initialVy = 32.0 * (0.85 + power * 0.3);
    } else if (runs === 4) {
      // Crisp boundary four: travels with good pace to touch/cross the 96m rope
      const baseSpeed = 54;
      speedXZ = baseSpeed * (0.8 + power * 0.4);
      if (dirVector.z < -0.5) {
        initialVy = shotType === 'loft' ? 22.0 : 12.5;
      } else {
        initialVy = shotType === 'loft' ? 20.0 : 8.5;
      }
    } else if (shotType === 'sweep') {
      speedXZ = 40 * (0.75 + power * 0.4);
      initialVy = 7.0;
    } else if (shotType === 'cut') {
      speedXZ = 42 * (0.75 + power * 0.4);
      initialVy = 7.5;
    } else if (shotType === 'defend' || runs === 0) {
      speedXZ = 6.5;
      initialVy = 2.4;
    } else {
      const mult = runs === 3 ? 1.35 : runs === 2 ? 1.15 : 0.95;
      speedXZ = 32.0 * mult * (0.8 + power * 0.35);
      initialVy = dirVector.z < -0.5 ? 9.5 : 6.0;
    }

    this.vel.set(dir.x * speedXZ, initialVy, dir.y * speedXZ);
    this.trailPoints = [];
  }

  update(delta) {
    if (!this.active) return;
    this.flightTime += delta;

    // --- 1. CRICKET PITCH DELIVERY (Bowler delivery to exact pitch landing spot) ---
    if (!this.isHitShot && !this.deliveryBounced) {
      const dur = this.duration1 || 0.46;
      const progress = Math.min(1.0, this.flightTime / dur);

      // In-flight aerodynamic swing curve (smooth lateral deviation that returns to exact landing spot at impact)
      const swingSign = (this.swingDirection === 'left' || this.deliveryType === 'inswing') ? -1 : 1;
      const swingOffset = Math.sin(progress * Math.PI) * swingSign * 0.28;

      // Exact linear movement towards landing spot on XZ
      this.pos.x = this.startSpot.x + (this.landingSpot.x - this.startSpot.x) * progress;
      this.pos.z = this.startSpot.z + (this.landingSpot.z - this.startSpot.z) * progress;
      // Exact parabolic arc under gravity
      this.pos.y = this.startSpot.y + this.vel.y * this.flightTime + 0.5 * this.gravity * this.flightTime * this.flightTime;

      // Check for pitch impact: since ball travels from +Z to -Z, we check pos.z <= landingSpot.z
      if (progress >= 1.0 || (this.pos.z <= this.landingSpot.z && this.pos.y <= this.radius + 0.08)) {
        this.pos.x = this.landingSpot.x;
        this.pos.y = this.radius;
        this.pos.z = this.landingSpot.z;
        this.group.position.copy(this.pos);
        this.deliveryBounced = true;
        this.bounceCount++;
        this._spawnBounceRipple(this.pos);

        if (this.onBounce) this.onBounce(this.pos);

        // Phase 2: Compute realistic cricket bounce trajectory to batsman crease (z = -9.5)
        const targetZ = -9.5;
        const distRemaining = targetZ - this.pos.z; // negative distance to batsman
        const isSpin = this.deliveryType.includes('spin');
        const isBouncer = this.deliveryType === 'bouncer';
        const isYorker = this.deliveryType === 'yorker';
        const isOutswing = this.deliveryType === 'outswing' || this.swingDirection === 'right';
        const isInswing = this.deliveryType === 'inswing' || this.swingDirection === 'left';

        let duration2 = isSpin ? 0.32 : isYorker ? 0.16 : isBouncer ? 0.28 : 0.24;

        // Target height at batsman (scaled for 4m player model: waist / bat sweet spot is ~1.8m)
        let targetY = 1.8; // default waist / bat sweet spot
        if (isYorker) targetY = 0.4; // low dipping blockhole
        else if (isBouncer) targetY = 3.2; // steep rising delivery at chest/helmet
        else if (isSpin) targetY = 1.6;

        // Lateral deviation / spin turn / swing after pitch
        let targetX = this.landingSpot.x;
        if (isOutswing || this.deliveryType === 'leg_spin') {
          targetX = this.landingSpot.x + 0.45; // breaks away / swings right
        } else if (isInswing || this.deliveryType === 'spin') {
          targetX = this.landingSpot.x - 0.45; // jags in / swings left
        }

        const vx2 = (targetX - this.pos.x) / duration2;
        const vz2 = distRemaining / duration2; // negative velocity toward z = -9.5
        const vy2 = (targetY - this.radius - 0.5 * this.gravity * duration2 * duration2) / duration2;

        this.vel.set(vx2, vy2, vz2);
        return;
      }

      this.group.position.set(this.pos.x + swingOffset, this.pos.y, this.pos.z);
      return;
    }

    // Apply gravity and drag for Phase 2 and Batted Shots
    this.vel.y += this.gravity * delta;
    this.vel.x *= this.airDrag;
    this.vel.z *= this.airDrag;

    this.pos.x += this.vel.x * delta;
    this.pos.y += this.vel.y * delta;
    this.pos.z += this.vel.z * delta;

    // --- 2. REALISTIC CRICKET TURF GROUND PHYSICS (Batted Shots & Rolls) ---
    if (this.pos.y <= this.radius) {
      this.pos.y = this.radius;

      if (Math.abs(this.vel.y) > 0.8) {
        // Crisp turf bounce with damping
        this.vel.y = -this.vel.y * this.restitution;
        this.vel.x *= this.groundFriction;
        this.vel.z *= this.groundFriction;
        this.bounceCount++;
        this._spawnBounceRipple(this.pos);

        if (this.onBounce) this.onBounce(this.pos);
      } else {
        // Continuous realistic rolling on turf (physical rolling resistance ~1.85 m/s^2)
        this.vel.y = 0;
        const currentSpeed = Math.hypot(this.vel.x, this.vel.z);
        if (currentSpeed > 0.05) {
          const newSpeed = Math.max(0, currentSpeed - 2.2 * delta);
          const ratio = newSpeed / currentSpeed;
          this.vel.x *= ratio;
          this.vel.z *= ratio;
        } else {
          this.vel.set(0, 0, 0);
          this.active = false;
          if (this.onComplete) this.onComplete();
        }
      }
    }

    // Boundary rope collision & cushion physics (boundary radius = 96m matching stadium rope)
    const distFromCenter = Math.hypot(this.pos.x, this.pos.z);
    if (distFromCenter >= 96.0) {
      // Ball meets boundary rope / barrier
      this.vel.x *= Math.max(0, 1 - 5.0 * delta);
      this.vel.z *= Math.max(0, 1 - 5.0 * delta);
      if (this.flightTime > 3.8 || Math.hypot(this.vel.x, this.vel.z) < 0.3) {
        this.active = false;
        if (this.onComplete) this.onComplete();
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
