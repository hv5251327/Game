import * as THREE from 'three';

// CricketCharacter: renders ants (Team A) or grasshoppers (Team B)
export class CricketCharacter {
  constructor(scene, team, role = 'fielder') {
    this.scene = scene;
    this.team = team; // 'a' = ants, 'b' = grasshoppers
    this.role = role; // 'batsman' | 'bowler' | 'fielder' | 'wicketkeeper'
    this.group = new THREE.Group();
    this.animTime = Math.random() * Math.PI * 2;
    this.targetPos = new THREE.Vector3();
    this.isMoving = false;
    this.build();
    this.scene.add(this.group);
  }

  build() {
    while (this.group.children.length > 0) this.group.remove(this.group.children[0]);
    if (this.team === 'a') this._buildAnt();
    else this._buildGrasshopper();
    this._addRoleEquipment();
  }

  _buildAnt() {
    const bodyColor = 0x2d1a0a;
    const legColor = 0x1a0f05;
    const eyeColor = 0xff2200;
    const mat = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6 });

    // Head (sphere)
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), mat(bodyColor));
    head.position.set(0, 0.55, 0.18);
    this.group.add(head);
    this._head = head;

    // Antennae
    [-0.08, 0.08].forEach((dx, i) => {
      const antGeo = new THREE.CylinderGeometry(0.015, 0.008, 0.28, 5);
      const ant = new THREE.Mesh(antGeo, mat(legColor));
      ant.position.set(dx, 0.82, 0.22);
      ant.rotation.z = (i === 0 ? -0.4 : 0.4);
      ant.rotation.x = -0.3;
      this.group.add(ant);
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.025, 5, 5), mat(0xff4400));
      tip.position.set(dx + (i === 0 ? -0.06 : 0.06), 0.94, 0.26);
      this.group.add(tip);
    });

    // Eyes
    [-0.07, 0.07].forEach(dx => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), mat(eyeColor));
      eye.position.set(dx, 0.58, 0.33);
      this.group.add(eye);
    });

    // Thorax
    const thorax = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), mat(bodyColor));
    thorax.position.set(0, 0.35, 0);
    this.group.add(thorax);

    // Abdomen (larger, slightly elliptical)
    const abdomen = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 8), mat(bodyColor));
    abdomen.scale.set(0.9, 0.85, 1.2);
    abdomen.position.set(0, 0.28, -0.28);
    this.group.add(abdomen);

    // 6 Legs
    const legPositions = [
      { x: -0.22, y: 0.32, z: 0.05, rx: 0, rz: 0.5 },
      { x: 0.22, y: 0.32, z: 0.05, rx: 0, rz: -0.5 },
      { x: -0.24, y: 0.30, z: -0.08, rx: 0, rz: 0.6 },
      { x: 0.24, y: 0.30, z: -0.08, rx: 0, rz: -0.6 },
      { x: -0.22, y: 0.28, z: -0.20, rx: 0, rz: 0.5 },
      { x: 0.22, y: 0.28, z: -0.20, rx: 0, rz: -0.5 },
    ];
    legPositions.forEach(lp => {
      const legGeo = new THREE.CylinderGeometry(0.02, 0.015, 0.3, 5);
      const leg = new THREE.Mesh(legGeo, mat(legColor));
      leg.position.set(lp.x, lp.y, lp.z);
      leg.rotation.z = lp.rz;
      leg.rotation.x = 0.3;
      this.group.add(leg);
    });
  }

  _buildGrasshopper() {
    const bodyColor = 0x3a7d1e;
    const legColor = 0x2d6016;
    const eyeColor = 0xffcc00;
    const mat = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.5 });

    // Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), mat(bodyColor));
    head.scale.set(1.1, 0.9, 1.2);
    head.position.set(0, 0.52, 0.22);
    this.group.add(head);
    this._head = head;

    // Compound eyes
    [-0.1, 0.1].forEach(dx => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.055, 6, 6), mat(eyeColor));
      eye.position.set(dx, 0.54, 0.35);
      this.group.add(eye);
    });

    // Thorax (elongated)
    const thorax = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), mat(bodyColor));
    thorax.scale.set(0.85, 1.0, 1.4);
    thorax.position.set(0, 0.34, 0);
    this.group.add(thorax);

    // Abdomen (long, tapered)
    const abdGeo = new THREE.CylinderGeometry(0.14, 0.06, 0.55, 8);
    const abdomen = new THREE.Mesh(abdGeo, mat(bodyColor));
    abdomen.rotation.x = Math.PI / 2;
    abdomen.position.set(0, 0.30, -0.36);
    this.group.add(abdomen);

    // Stripes on abdomen
    for (let i = 0; i < 3; i++) {
      const stripe = new THREE.Mesh(new THREE.TorusGeometry(0.12 - i * 0.02, 0.015, 4, 16), mat(0x2a5c10));
      stripe.rotation.x = Math.PI / 2;
      stripe.position.set(0, 0.30, -0.25 - i * 0.1);
      this.group.add(stripe);
    }

    // Front legs (short)
    [{ x: -0.18, rz: 0.4 }, { x: 0.18, rz: -0.4 }].forEach(lp => {
      const legGeo = new THREE.CylinderGeometry(0.018, 0.012, 0.28, 5);
      const leg = new THREE.Mesh(legGeo, mat(legColor));
      leg.position.set(lp.x, 0.32, 0.1);
      leg.rotation.z = lp.rz;
      leg.rotation.x = 0.2;
      this.group.add(leg);
    });

    // Hind legs (large jump legs)
    [{ x: -0.22, rz: 0.3, rx: -0.6 }, { x: 0.22, rz: -0.3, rx: -0.6 }].forEach((lp, i) => {
      // Upper hind leg (femur)
      const femGeo = new THREE.CylinderGeometry(0.03, 0.02, 0.45, 6);
      const femur = new THREE.Mesh(femGeo, mat(0x2a7518));
      femur.position.set(lp.x, 0.38, -0.15);
      femur.rotation.z = lp.rz + (i === 0 ? -0.2 : 0.2);
      femur.rotation.x = lp.rx;
      this.group.add(femur);
      // Lower hind leg (tibia - long)
      const tibGeo = new THREE.CylinderGeometry(0.018, 0.01, 0.55, 6);
      const tibia = new THREE.Mesh(tibGeo, mat(legColor));
      tibia.position.set(lp.x * 1.3, 0.1, -0.35);
      tibia.rotation.z = lp.rz * 2;
      tibia.rotation.x = -0.8;
      this.group.add(tibia);
    });

    // Wings (semi-transparent)
    const wingMat = new THREE.MeshStandardMaterial({ color: 0x88cc44, transparent: true, opacity: 0.6, side: THREE.DoubleSide });
    [-1, 1].forEach(side => {
      const wingGeo = new THREE.PlaneGeometry(0.55, 0.32);
      const wing = new THREE.Mesh(wingGeo, wingMat);
      wing.position.set(side * 0.28, 0.5, -0.1);
      wing.rotation.y = side * 0.4;
      wing.rotation.x = 0.1;
      this.group.add(wing);
    });
  }

  _addRoleEquipment() {
    const batMat = new THREE.MeshStandardMaterial({ color: 0xc8a46a, roughness: 0.7 });
    if (this.role === 'batsman') {
      // Cricket bat
      const handleGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.28, 6);
      const bladeGeo = new THREE.BoxGeometry(0.12, 0.04, 0.42);
      const handle = new THREE.Mesh(handleGeo, new THREE.MeshStandardMaterial({ color: 0x8B4513 }));
      const blade = new THREE.Mesh(bladeGeo, batMat);
      handle.position.set(0.3, 0.55, 0.1);
      handle.rotation.z = -0.4;
      blade.position.set(0.35, 0.38, 0.06);
      blade.rotation.z = -0.3;
      this.group.add(handle, blade);
      // Helmet
      const helmetGeo = new THREE.SphereGeometry(0.21, 8, 8, 0, Math.PI * 2, 0, Math.PI / 1.4);
      const helmetMat = new THREE.MeshStandardMaterial({ color: this.team === 'a' ? 0x1a3a6a : 0x1a6a3a });
      const helmet = new THREE.Mesh(helmetGeo, helmetMat);
      helmet.position.copy(this._head?.position || new THREE.Vector3(0, 0.55, 0.18));
      helmet.position.y += 0.04;
      this.group.add(helmet);
    } else if (this.role === 'bowler') {
      // Bowling arm pose (ball in hand)
      const ballGeo = new THREE.SphereGeometry(0.07, 8, 8);
      const ballMat = new THREE.MeshStandardMaterial({ color: 0xcc2200, roughness: 0.4, metalness: 0.2 });
      const ball = new THREE.Mesh(ballGeo, ballMat);
      ball.position.set(0.3, 0.6, 0.2);
      this.group.add(ball);
    } else if (this.role === 'wicketkeeper') {
      // Gloves
      const gloveMat = new THREE.MeshStandardMaterial({ color: 0xffeecc });
      [-0.2, 0.2].forEach(dx => {
        const glove = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 6), gloveMat);
        glove.position.set(dx, 0.35, 0.25);
        this.group.add(glove);
      });
    }
  }

  setPosition(x, y, z) {
    this.group.position.set(x, y, z);
    this.targetPos.set(x, y, z);
  }

  moveTo(x, y, z) {
    this.targetPos.set(x, y, z);
    this.isMoving = true;
  }

  setRotation(y) {
    this.group.rotation.y = y;
  }

  update(delta) {
    this.animTime += delta;

    // Smooth movement
    if (this.isMoving) {
      const dx = this.targetPos.x - this.group.position.x;
      const dz = this.targetPos.z - this.group.position.z;
      const dist = Math.sqrt(dx*dx + dz*dz);
      if (dist > 0.05) {
        const speed = 5;
        this.group.position.x += (dx / dist) * speed * delta;
        this.group.position.z += (dz / dist) * speed * delta;
        this.group.rotation.y = Math.atan2(dx, dz);
        // Walk bob
        this.group.position.y = Math.abs(Math.sin(this.animTime * 8)) * 0.05;
      } else {
        this.group.position.copy(this.targetPos);
        this.isMoving = false;
        this.group.position.y = 0;
      }
    } else {
      // Idle bob
      this.group.position.y = Math.sin(this.animTime * 2) * 0.02;
    }
  }

  triggerBatSwing() {
    // Quick rotation animation
    const startRot = this.group.rotation.z;
    const startTime = Date.now();
    const swing = () => {
      const t = (Date.now() - startTime) / 350;
      if (t < 1) {
        this.group.rotation.z = startRot - Math.sin(t * Math.PI) * 0.6;
        requestAnimationFrame(swing);
      } else {
        this.group.rotation.z = startRot;
      }
    };
    swing();
  }

  triggerBowlAction() {
    const startTime = Date.now();
    const bowl = () => {
      const t = (Date.now() - startTime) / 500;
      if (t < 1) {
        this.group.rotation.x = -Math.sin(t * Math.PI) * 0.4;
        requestAnimationFrame(bowl);
      } else {
        this.group.rotation.x = 0;
      }
    };
    bowl();
  }

  triggerCelebrate() {
    let t = 0;
    const cel = () => {
      t += 0.08;
      if (t < Math.PI * 4) {
        this.group.position.y = Math.abs(Math.sin(t)) * 0.5;
        this.group.rotation.y += 0.15;
        requestAnimationFrame(cel);
      } else {
        this.group.position.y = 0;
      }
    };
    cel();
  }

  destroy() {
    this.scene.remove(this.group);
  }
}
