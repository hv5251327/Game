import * as THREE from 'three';

// Babylon.js Summit Park Style Human Cricket Player Specifications
export const CHARACTER_PRESETS = {
  ant_batter_01: {
    id: 'ant_batter_01',
    species: 'human',
    role: 'batter',
    team: 'emerald',
    team_color: '#0d472a',    // Emerald XI deep green Color3(0.05, 0.28, 0.16)
    accent_color: '#80b82e',  // Lime accent Color3(0.5, 0.72, 0.18)
    physics: {
      mass_kg: 80.0,
      swing_speed_degrees_per_second: 540,
      impact_force_newtons: 35,
      restitution: 0.65,
      friction: 0.70,
      air_drag: 0.15,
      grounded_stability: 0.90
    },
    scale: 1.0,
    bat: { color: 0xc79140, grip_color: 0x222222 },
    starting_transform: { position: { x: 0, y: 0.0, z: 9.5 }, rotation_y_degrees: 180, scale: 1.0 },
    swing_phases: [
      { name: 'wind_up', time: 0.0, bat_angle: -55, body_twist: -18 },
      { name: 'accelerate', time: 0.22, bat_angle: 15, body_twist: 12 },
      { name: 'contact', time: 0.34, bat_angle: 68, body_twist: 24 },
      { name: 'follow_through', time: 0.55, bat_angle: 115, body_twist: 32 }
    ]
  },
  snail_bowler_01: {
    id: 'snail_bowler_01',
    species: 'human',
    role: 'bowler',
    team: 'sapphire',
    team_color: '#0d3799',    // Sapphire XI royal blue Color3(0.05, 0.22, 0.62)
    accent_color: '#73c2f2',  // Ice accent Color3(0.45, 0.76, 0.95)
    physics: {
      mass_kg: 82.0,
      swing_speed_degrees_per_second: 200,
      impact_force_newtons: 12,
      restitution: 0.25,
      friction: 0.90,
      air_drag: 0.30,
      grounded_stability: 0.95
    },
    scale: 1.0,
    starting_transform: { position: { x: 0, y: 0.0, z: -27.0 }, rotation_y_degrees: 0, scale: 1.0 }
  },
  snail_fielder_left: {
    id: 'snail_fielder_left',
    species: 'human',
    role: 'fielder',
    team: 'sapphire',
    team_color: '#0d3799',
    accent_color: '#73c2f2',
    physics: {
      mass_kg: 78.0,
      swing_speed_degrees_per_second: 150,
      impact_force_newtons: 8,
      restitution: 0.2,
      friction: 0.92,
      air_drag: 0.32,
      grounded_stability: 0.95
    },
    scale: 1.0,
    starting_transform: { position: { x: -24.0, y: 0.0, z: -22.0 }, rotation_y_degrees: 90, scale: 1.0 }
  },
  ant_fielder_right: {
    id: 'ant_fielder_right',
    species: 'human',
    role: 'fielder',
    team: 'sapphire',
    team_color: '#0d3799',
    accent_color: '#73c2f2',
    physics: {
      mass_kg: 76.0,
      swing_speed_degrees_per_second: 460,
      impact_force_newtons: 14,
      restitution: 0.5,
      friction: 0.68,
      air_drag: 0.2,
      grounded_stability: 0.85
    },
    scale: 1.0,
    starting_transform: { position: { x: 29.0, y: 0.0, z: 19.0 }, rotation_y_degrees: -90, scale: 1.0 }
  },
  beetle_power_batter_01: {
    id: 'beetle_power_batter_01',
    species: 'human',
    role: 'batter',
    team: 'emerald',
    team_color: '#0d472a',
    accent_color: '#80b82e',
    physics: {
      mass_kg: 90.0,
      swing_speed_degrees_per_second: 500,
      impact_force_newtons: 45,
      restitution: 0.68,
      friction: 0.80,
      air_drag: 0.12,
      grounded_stability: 0.98
    },
    scale: 1.0,
    bat: { color: 0xb57c32, grip_color: 0x111111 },
    starting_transform: { position: { x: 0, y: 0.0, z: 9.5 }, rotation_y_degrees: 180, scale: 1.0 },
    swing_phases: [
      { name: 'deep_wind_up', time: 0.0, bat_angle: -78, body_twist: -28 },
      { name: 'power_drive', time: 0.34, bat_angle: 5, body_twist: 8 },
      { name: 'contact', time: 0.48, bat_angle: 72, body_twist: 30 },
      { name: 'long_follow_through', time: 0.78, bat_angle: 145, body_twist: 42 }
    ]
  },
  grasshopper_agile_batter_01: {
    id: 'grasshopper_agile_batter_01',
    species: 'human',
    role: 'batter',
    team: 'emerald',
    team_color: '#0d472a',
    accent_color: '#80b82e',
    physics: {
      mass_kg: 74.0,
      swing_speed_degrees_per_second: 680,
      impact_force_newtons: 26,
      restitution: 0.72,
      friction: 0.55,
      air_drag: 0.1,
      grounded_stability: 0.85
    },
    scale: 1.0,
    bat: { color: 0xdbad65, grip_color: 0x333333 },
    starting_transform: { position: { x: 0, y: 0.0, z: 9.5 }, rotation_y_degrees: 180, scale: 1.0 },
    swing_phases: [
      { name: 'coil', time: 0.0, bat_angle: -35, body_twist: -12 },
      { name: 'hop_and_accelerate', time: 0.14, bat_angle: 20, body_twist: 14 },
      { name: 'contact', time: 0.24, bat_angle: 75, body_twist: 28 },
      { name: 'airborne_follow_through', time: 0.42, bat_angle: 155, body_twist: 48 }
    ]
  }
};

export const DIRECTION_VECTORS = {
  forward: { x: 0, z: -1, angle: 0 },
  backward: { x: 0, z: 1, angle: Math.PI },
  left: { x: -1, z: 0, angle: -Math.PI / 2 },
  right: { x: 1, z: 0, angle: Math.PI / 2 },
  forward_left: { x: -0.7071, z: -0.7071, angle: -Math.PI / 4 },
  forward_right: { x: 0.7071, z: -0.7071, angle: Math.PI / 4 },
  backward_left: { x: -0.7071, z: 0.7071, angle: -3 * Math.PI / 4 },
  backward_right: { x: 0.7071, z: 0.7071, angle: 3 * Math.PI / 4 }
};

export class CricketCharacter {
  constructor(scene, configOrId = 'ant_batter_01') {
    this.scene = scene;
    this.config = typeof configOrId === 'string'
      ? (CHARACTER_PRESETS[configOrId] || CHARACTER_PRESETS.ant_batter_01)
      : configOrId;

    this.id = this.config.id || 'char_' + Date.now();
    this.species = this.config.species || 'human';
    this.role = this.config.role || 'batter';
    this.physics = this.config.physics || CHARACTER_PRESETS.ant_batter_01.physics;

    this.group = new THREE.Group();
    this.bodyPivot = new THREE.Group();
    this.group.add(this.bodyPivot);

    this.batPivot = new THREE.Group();
    this.group.add(this.batPivot);

    this.rightArmPivot = null;
    this.leftArmPivot = null;

    this.animTime = Math.random() * Math.PI * 2;
    this.targetPos = new THREE.Vector3();
    this.isMoving = false;
    this.isSwinging = false;
    this.swingProgress = 0;
    this.swingDuration = 0.55;
    this.currentDirection = 'forward';
    this.currentPower = 0.85;

    this.build();

    this.stance = { hand: 'RHB', depth: 'normal', guard: 'middle' };

    // Initial transform matching Babylon.js specs
    if (this.config.starting_transform) {
      const st = this.config.starting_transform;
      this.setPosition(st.position.x, st.position.y, st.position.z);
      this.setRotation((st.rotation_y_degrees || 0) * Math.PI / 180);
      const sc = (st.scale || 1.0) * (this.config.scale || 1.0);
      this.group.scale.setScalar(sc);
    } else {
      const sc = this.config.scale || 1.0;
      this.group.scale.setScalar(sc);
    }

    this.scene.add(this.group);
  }

  build() {
    while (this.bodyPivot.children.length > 0) this.bodyPivot.remove(this.bodyPivot.children[0]);
    while (this.batPivot.children.length > 0) this.batPivot.remove(this.batPivot.children[0]);

    this._buildExactBabylonPlayer();
  }

  // --- EXACT BABYLON.JS PLAYER MODEL IN THREE.JS ---
  // Dimensions taken directly from Babylon.js createPlayer() function
  _buildExactBabylonPlayer() {
    const isUmpire = this.species === 'umpire' || this.role === 'umpire';
    const isBatsman = this.role.includes('batter') || this.role.includes('batsman');
    const isKeeper = this.role === 'wicketkeeper';

    // Materials
    let kitHex = 0x0d472a;    // Emerald XI deep green Color3(0.05, 0.28, 0.16)
    let accentHex = 0x80b82e; // Lime accent Color3(0.5, 0.72, 0.18)
    const skinHex = 0x855024; // Color3(0.52, 0.28, 0.16)
    const batWoodHex = 0xc79140; // Color3(0.78, 0.57, 0.25)
    let shoeHex = 0x141a1c;

    if (isUmpire) {
      kitHex = 0xd9d4c2;     // Umpire kit Color3(0.85, 0.83, 0.76)
      accentHex = 0x101416;  // Dark metal
    } else if (this.role === 'bowler' || this.role === 'fielder' || isKeeper) {
      kitHex = 0x0d3799;     // Sapphire XI royal blue Color3(0.05, 0.22, 0.62)
      accentHex = 0x73c2f2;  // Ice accent Color3(0.45, 0.76, 0.95)
    }

    const kitMat = new THREE.MeshStandardMaterial({ color: kitHex, roughness: 0.65 });
    const accentMat = new THREE.MeshStandardMaterial({ color: accentHex, roughness: 0.50 });
    const skinMat = new THREE.MeshStandardMaterial({ color: skinHex, roughness: 0.60 });
    const shoeMat = new THREE.MeshStandardMaterial({ color: shoeHex, roughness: 0.80 });
    const batMat = new THREE.MeshStandardMaterial({ color: batWoodHex, roughness: 0.55 });

    // 1. Torso: Box (width: 1.0, height: 1.75, depth: 0.6) at (0, 2.15, 0)
    const torsoGeo = new THREE.BoxGeometry(1.0, 1.75, 0.6);
    const torso = new THREE.Mesh(torsoGeo, kitMat);
    torso.position.set(0, 2.15, 0);
    torso.rotation.z = isUmpire ? 0 : 0.02;
    torso.castShadow = true;
    this.bodyPivot.add(torso);

    // 2. Head: Sphere (diameter: 0.68 -> radius: 0.34) at (0, 3.65, 0)
    const headGeo = new THREE.SphereGeometry(0.34, 16, 16);
    const head = new THREE.Mesh(headGeo, skinMat);
    head.position.set(0, 3.65, 0);
    head.castShadow = true;
    this.bodyPivot.add(head);

    // 3. Helmet & Visor (players) OR Umpire Cap & Clipboard
    if (!isUmpire) {
      // Helmet: Sphere (diameter: 0.76 -> radius: 0.38) at (0, 3.87, 0)
      const helmetGeo = new THREE.SphereGeometry(0.38, 16, 16);
      const helmet = new THREE.Mesh(helmetGeo, accentMat);
      helmet.position.set(0, 3.87, 0);
      this.bodyPivot.add(helmet);

      // Visor: Box (width: 0.48, height: 0.08, depth: 0.16) at (0, 3.74, 0.3)
      const visorGeo = new THREE.BoxGeometry(0.48, 0.08, 0.16);
      const visor = new THREE.Mesh(visorGeo, new THREE.MeshStandardMaterial({ color: 0x1a2124, roughness: 0.3 }));
      visor.position.set(0, 3.74, 0.3);
      this.bodyPivot.add(visor);
    } else {
      // Cap: Box (width: 0.74, height: 0.16, depth: 0.74) at (0, 4.08, 0)
      const capGeo = new THREE.BoxGeometry(0.74, 0.16, 0.74);
      const cap = new THREE.Mesh(capGeo, accentMat);
      cap.position.set(0, 4.08, 0);
      this.bodyPivot.add(cap);

      // Clipboard: Box (width: 0.38, height: 0.5, depth: 0.05) at (-0.65, 2.5, 0)
      const cbGeo = new THREE.BoxGeometry(0.38, 0.5, 0.05);
      const cb = new THREE.Mesh(cbGeo, batMat);
      cb.position.set(-0.65, 2.5, 0);
      this.bodyPivot.add(cb);
    }

    // 4. Legs & Shoes at x = -0.27, 0.27
    // Leg: Box (width: 0.31, height: 1.38, depth: 0.38) at (x, 0.83, 0)
    // Shoe: Box (width: 0.42, height: 0.18, depth: 0.7) at (x, 0.05, 0.08) - bottom contacts turf at y = 0
    const legGeo = new THREE.BoxGeometry(0.31, 1.38, 0.38);
    const shoeGeo = new THREE.BoxGeometry(0.42, 0.18, 0.7);
    const padGeo = new THREE.BoxGeometry(0.38, 0.88, 0.18);
    const keeperPadGeo = new THREE.BoxGeometry(0.38, 0.9, 0.22);

    [-0.27, 0.27].forEach(x => {
      const leg = new THREE.Mesh(legGeo, kitMat);
      leg.position.set(x, 0.83, 0);
      leg.castShadow = true;
      this.bodyPivot.add(leg);

      const shoe = new THREE.Mesh(shoeGeo, shoeMat);
      shoe.position.set(x, 0.09, 0.08);
      shoe.castShadow = true;
      this.bodyPivot.add(shoe);

      // Batsman Pads: Box (width: 0.38, height: 0.88, depth: 0.18) at (x, 0.7, 0.2)
      if (isBatsman) {
        const pad = new THREE.Mesh(padGeo, accentMat);
        pad.position.set(x, 0.7, 0.2);
        pad.castShadow = true;
        this.bodyPivot.add(pad);
      }

      // Keeper Pads: Box (width: 0.38, height: 0.9, depth: 0.22) at (x, 0.7, 0.15)
      if (isKeeper) {
        const kPad = new THREE.Mesh(keeperPadGeo, kitMat);
        kPad.position.set(x, 0.7, 0.15);
        this.bodyPivot.add(kPad);
      }
    });

    // 5. Arms at x = -0.67 and 0.67
    // Arm: Box (width: 0.24, height: 1.15, depth: 0.26) at (x, 2.4, 0)
    const armGeo = new THREE.BoxGeometry(0.24, 1.15, 0.26);

    this.rightArmPivot = new THREE.Group();
    this.rightArmPivot.position.set(0.67, 2.8, 0);
    const rArm = new THREE.Mesh(armGeo, kitMat);
    rArm.position.set(0, -0.4, 0);
    rArm.castShadow = true;
    this.rightArmPivot.add(rArm);
    this.bodyPivot.add(this.rightArmPivot);

    this.leftArmPivot = new THREE.Group();
    this.leftArmPivot.position.set(-0.67, 2.8, 0);
    const lArm = new THREE.Mesh(armGeo, kitMat);
    lArm.position.set(0, -0.4, 0);
    lArm.castShadow = true;
    this.leftArmPivot.add(lArm);
    this.bodyPivot.add(this.leftArmPivot);

    // Wicketkeeper gloves: Sphere (diameter: 0.6 -> radius: 0.3) at (±0.78, 2.3, -0.5)
    if (isKeeper) {
      const gloveGeo = new THREE.SphereGeometry(0.3, 12, 12);
      const gloveMat = new THREE.MeshStandardMaterial({ color: 0xdeaa32, roughness: 0.45 });
      const g1 = new THREE.Mesh(gloveGeo, gloveMat);
      g1.position.set(-0.78, 2.3, -0.5);
      this.bodyPivot.add(g1);

      const g2 = new THREE.Mesh(gloveGeo, gloveMat);
      g2.position.set(0.78, 2.3, -0.5);
      this.bodyPivot.add(g2);

      // Keeper crouching posture
      this.bodyPivot.position.y = -0.3;
      this.bodyPivot.rotation.x = 0.15;
    }

    // 6. Batsman Bat: blade (0.22 x 1.85 x 0.24) + handle (diameter 0.11, height 0.62)
    if (isBatsman) {
      const bladeGeo = new THREE.BoxGeometry(0.22, 1.85, 0.24);
      const blade = new THREE.Mesh(bladeGeo, batMat);
      blade.position.set(0.85, 1.6, 0);
      blade.rotation.z = -0.18;
      blade.castShadow = true;

      const handleGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.62, 8);
      const handle = new THREE.Mesh(handleGeo, new THREE.MeshStandardMaterial({ color: 0x1f1f1f, roughness: 0.7 }));
      handle.position.set(0.85, 2.8, 0);
      handle.rotation.z = -0.18;

      this.batPivot.add(blade);
      this.batPivot.add(handle);
    }
  }

  executeCommand(command) {
    if (command.action !== 'swing_bat') return;

    this.currentDirection = command.direction || 'forward';
    this.currentPower = Math.max(0.1, Math.min(1.0, command.power || 0.75));

    const speedMult = (this.physics.swing_speed_degrees_per_second || 520) / 520;
    this.swingDuration = (this.config.swing_phases ? 0.55 : 0.5) / (speedMult * (0.8 + this.currentPower * 0.4));
    this.isSwinging = true;
    this.swingProgress = 0;

    const dirInfo = DIRECTION_VECTORS[this.currentDirection] || DIRECTION_VECTORS.forward;
    this.batPivot.rotation.y = dirInfo.angle;
  }

  setPosition(x, y, z) {
    this.group.position.set(x, y, z);
    this.targetPos.set(x, y, z);
  }

  setRotation(yRad) {
    this.group.rotation.y = yRad;
  }

  update(delta) {
    this.animTime += delta;

    if (this.isSwinging) {
      this.swingProgress += delta / this.swingDuration;

      if (this.swingProgress >= 1.0) {
        this.swingProgress = 1.0;
        this.isSwinging = false;
        this.batPivot.rotation.set(0, 0, 0);
        this.bodyPivot.rotation.y = 0;
      } else {
        this._updateSwingPhases(this.swingProgress);
      }
    } else {
      const isBatsman = this.role.includes('batter') || this.role.includes('batsman');
      if (isBatsman && this.batPivot) {
        this.batPivot.rotation.x = Math.sin(this.animTime * 3.0) * 0.05;
      }
    }
  }

  _updateSwingPhases(p) {
    const phases = this.config.swing_phases || CHARACTER_PRESETS.ant_batter_01.swing_phases;
    let cur = phases[0];
    let next = phases[phases.length - 1];

    for (let i = 0; i < phases.length - 1; i++) {
      const p1 = phases[i].time / phases[phases.length - 1].time;
      const p2 = phases[i + 1].time / phases[phases.length - 1].time;
      if (p >= p1 && p <= p2) {
        cur = phases[i];
        next = phases[i + 1];
        const t = (p - p1) / (p2 - p1);
        const batAngleDeg = cur.bat_angle + (next.bat_angle - cur.bat_angle) * t;
        const bodyTwistDeg = cur.body_twist + (next.body_twist - cur.body_twist) * t;

        const dirInfo = DIRECTION_VECTORS[this.currentDirection] || DIRECTION_VECTORS.forward;
        this.batPivot.rotation.z = (batAngleDeg * Math.PI / 180) * (0.8 + this.currentPower * 0.4);
        this.bodyPivot.rotation.y = (bodyTwistDeg * Math.PI / 180) + dirInfo.angle * 0.5;
        break;
      }
    }
  }

  triggerBowlAction() {
    let t = 0;
    const bowl = () => {
      t += 0.08;
      if (t < Math.PI) {
        this.bodyPivot.position.z = Math.sin(t) * 0.8;
        this.bodyPivot.position.y = Math.sin(t) * 0.4;
        if (this.rightArmPivot) {
          this.rightArmPivot.rotation.x = -Math.sin(t) * Math.PI * 2;
        }
        requestAnimationFrame(bowl);
      } else {
        this.bodyPivot.position.z = 0;
        this.bodyPivot.position.y = 0;
        if (this.rightArmPivot) {
          this.rightArmPivot.rotation.x = 0;
        }
      }
    };
    bowl();
  }

  triggerCelebrate() {
    let t = 0;
    const cel = () => {
      t += 0.09;
      if (t < Math.PI * 4) {
        this.group.position.y = Math.abs(Math.sin(t)) * 0.8;
        if (this.rightArmPivot) this.rightArmPivot.rotation.z = Math.sin(t * 2) * 1.5;
        if (this.leftArmPivot) this.leftArmPivot.rotation.z = -Math.sin(t * 2) * 1.5;
        requestAnimationFrame(cel);
      } else {
        this.group.position.y = 0;
        if (this.rightArmPivot) this.rightArmPivot.rotation.z = 0;
        if (this.leftArmPivot) this.leftArmPivot.rotation.z = 0;
      }
    };
    cel();
  }

  signalOut() {
    if (!this.rightArmPivot) return;
    let t = 0;
    const anim = () => {
      t += 0.08;
      if (t < Math.PI * 2) {
        this.rightArmPivot.rotation.z = Math.min(Math.PI, t * 2);
        requestAnimationFrame(anim);
      } else {
        setTimeout(() => {
          if (this.rightArmPivot) this.rightArmPivot.rotation.z = 0;
        }, 1800);
      }
    };
    anim();
  }

  signalFour() {
    if (!this.rightArmPivot) return;
    let t = 0;
    const anim = () => {
      t += 0.12;
      if (t < Math.PI * 4) {
        this.rightArmPivot.rotation.z = 1.2;
        this.rightArmPivot.rotation.y = Math.sin(t) * 0.8;
        requestAnimationFrame(anim);
      } else {
        this.rightArmPivot.rotation.set(0, 0, 0);
      }
    };
    anim();
  }

  signalSix() {
    if (!this.rightArmPivot || !this.leftArmPivot) return;
    let t = 0;
    const anim = () => {
      t += 0.08;
      if (t < Math.PI * 2) {
        this.rightArmPivot.rotation.z = Math.min(Math.PI, t * 2);
        this.leftArmPivot.rotation.z = -Math.min(Math.PI, t * 2);
        requestAnimationFrame(anim);
      } else {
        setTimeout(() => {
          if (this.rightArmPivot) this.rightArmPivot.rotation.z = 0;
          if (this.leftArmPivot) this.leftArmPivot.rotation.z = 0;
        }, 2000);
      }
    };
    anim();
  }

  signalWide() {
    if (!this.rightArmPivot || !this.leftArmPivot) return;
    let t = 0;
    const anim = () => {
      t += 0.1;
      if (t < Math.PI) {
        this.rightArmPivot.rotation.z = Math.PI / 2;
        this.leftArmPivot.rotation.z = -Math.PI / 2;
        requestAnimationFrame(anim);
      } else {
        setTimeout(() => {
          if (this.rightArmPivot) this.rightArmPivot.rotation.z = 0;
          if (this.leftArmPivot) this.leftArmPivot.rotation.z = 0;
        }, 1500);
      }
    };
    anim();
  }

  setStance(stance = {}) {
    this.stance = { ...this.stance, ...stance };

    const baseScale = (this.config.starting_transform?.scale || 1.0) * (this.config.scale || 1.0);
    if (this.stance.hand === 'LHB') {
      this.group.scale.x = -Math.abs(baseScale);
    } else {
      this.group.scale.x = Math.abs(baseScale);
    }

    let zPos = 9.5;
    if (this.stance.depth === 'deep') zPos = 10.4;
    else if (this.stance.depth === 'forward') zPos = 8.6;

    let xPos = 0;
    if (this.stance.guard === 'leg') xPos = this.stance.hand === 'LHB' ? 0.6 : -0.6;
    else if (this.stance.guard === 'off') xPos = this.stance.hand === 'LHB' ? -0.6 : 0.6;

    this.group.position.x = xPos;
    this.group.position.y = 0.0;
    this.group.position.z = zPos;
  }

  triggerCatch() {
    let t = 0;
    const origY = this.group.position.y;
    const anim = () => {
      t += 0.08;
      if (t < Math.PI) {
        this.group.position.y = origY + Math.sin(t) * 1.0;
        this.bodyPivot.rotation.x = -Math.sin(t) * 0.75;
        requestAnimationFrame(anim);
      } else if (t < Math.PI * 2.2) {
        this.group.position.y = 0;
        this.bodyPivot.rotation.x = -0.3;
        requestAnimationFrame(anim);
      } else if (t < Math.PI * 3.5) {
        this.group.position.y = origY + Math.abs(Math.sin(t * 2)) * 0.6;
        this.bodyPivot.rotation.x = 0;
        requestAnimationFrame(anim);
      } else {
        this.group.position.y = origY;
        this.bodyPivot.rotation.x = 0;
      }
    };
    anim();
  }

  triggerFieldGather() {
    let t = 0;
    const origY = this.group.position.y;
    const anim = () => {
      t += 0.12;
      if (t < Math.PI) {
        this.group.position.y = origY * 0.5;
        this.bodyPivot.rotation.x = 0.55;
        requestAnimationFrame(anim);
      } else if (t < Math.PI * 2) {
        this.group.position.y = origY;
        this.bodyPivot.rotation.x = -0.3;
        requestAnimationFrame(anim);
      } else {
        this.group.position.y = origY;
        this.bodyPivot.rotation.x = 0;
      }
    };
    anim();
  }

  destroy() {
    this.scene.remove(this.group);
  }
}