import * as THREE from 'three';

// Babylon.js Summit Park Style Human Cricket Player Presets
export const CHARACTER_PRESETS = {
  ant_batter_01: {
    id: 'ant_batter_01',
    species: 'human',
    role: 'batter',
    team: 'emerald',
    team_color: '#0d472a',    // Emerald XI deep green
    accent_color: '#80b82e',  // Lime accent trim
    physics: {
      mass_kg: 75.0,
      swing_speed_degrees_per_second: 540,
      impact_force_newtons: 28,
      restitution: 0.62,
      friction: 0.70,
      air_drag: 0.15,
      grounded_stability: 0.85
    },
    scale: 1.0,
    bat: { color: 0xc79140, grip_color: 0x222222 },
    starting_transform: { position: { x: 0, y: 0.0, z: 3.8 }, rotation_y_degrees: 180, scale: 1.0 },
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
    team_color: '#0d3799',    // Sapphire XI royal blue
    accent_color: '#73c2f2',  // Ice blue accent
    physics: {
      mass_kg: 78.0,
      swing_speed_degrees_per_second: 180,
      impact_force_newtons: 10,
      restitution: 0.25,
      friction: 0.90,
      air_drag: 0.30,
      grounded_stability: 0.95
    },
    scale: 1.0,
    starting_transform: { position: { x: 0, y: 0.0, z: -11.0 }, rotation_y_degrees: 0, scale: 1.0 }
  },
  snail_fielder_left: {
    id: 'snail_fielder_left',
    species: 'human',
    role: 'fielder',
    team: 'sapphire',
    team_color: '#0d3799',
    accent_color: '#73c2f2',
    physics: {
      mass_kg: 72.0,
      swing_speed_degrees_per_second: 150,
      impact_force_newtons: 8,
      restitution: 0.2,
      friction: 0.92,
      air_drag: 0.32,
      grounded_stability: 0.95
    },
    scale: 1.0,
    starting_transform: { position: { x: -5.0, y: 0.0, z: -1.2 }, rotation_y_degrees: 90, scale: 1.0 }
  },
  ant_fielder_right: {
    id: 'ant_fielder_right',
    species: 'human',
    role: 'fielder',
    team: 'sapphire',
    team_color: '#0d3799',
    accent_color: '#73c2f2',
    physics: {
      mass_kg: 74.0,
      swing_speed_degrees_per_second: 460,
      impact_force_newtons: 14,
      restitution: 0.5,
      friction: 0.68,
      air_drag: 0.2,
      grounded_stability: 0.85
    },
    scale: 1.0,
    starting_transform: { position: { x: 4.6, y: 0.0, z: -1.8 }, rotation_y_degrees: -90, scale: 1.0 }
  },
  beetle_power_batter_01: {
    id: 'beetle_power_batter_01',
    species: 'human',
    role: 'batter',
    team: 'emerald',
    team_color: '#0d472a',
    accent_color: '#80b82e',
    physics: {
      mass_kg: 84.0,
      swing_speed_degrees_per_second: 480,
      impact_force_newtons: 36,
      restitution: 0.64,
      friction: 0.80,
      air_drag: 0.12,
      grounded_stability: 0.95
    },
    scale: 1.05,
    bat: { color: 0xb57c32, grip_color: 0x111111 },
    starting_transform: { position: { x: 0, y: 0.0, z: 3.8 }, rotation_y_degrees: 180, scale: 1.0 },
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
      mass_kg: 68.0,
      swing_speed_degrees_per_second: 620,
      impact_force_newtons: 22,
      restitution: 0.7,
      friction: 0.55,
      air_drag: 0.1,
      grounded_stability: 0.80
    },
    scale: 0.98,
    bat: { color: 0xdbad65, grip_color: 0x333333 },
    starting_transform: { position: { x: 0, y: 0.0, z: 3.8 }, rotation_y_degrees: 180, scale: 1.0 },
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

    // Initial transform
    const isUmpire = this.species === 'umpire' || this.role === 'umpire';
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

    this._buildHumanPlayer();
  }

  // --- BABYLON.JS SUMMIT PARK HUMAN CRICKET PLAYER ---
  _buildHumanPlayer() {
    const isUmpire = this.species === 'umpire' || this.role === 'umpire';
    const isBatsman = this.role.includes('batter') || this.role.includes('batsman');
    const isKeeper = this.role === 'wicketkeeper';

    // Kit colors based on team / role
    let kitHex = 0x0d472a;    // Emerald XI deep green
    let accentHex = 0x80b82e; // Lime accent
    let trouserHex = kitHex;
    const skinHex = 0x855024; // Tan skin tone (Babylon: 0.52, 0.28, 0.16)
    const woodHex = 0xc79140; // Wood bat

    if (isUmpire) {
      kitHex = 0xd9d4c2;     // Cream shirt
      trouserHex = 0x1e272e; // Dark trousers
      accentHex = 0x1e272e;  // Dark cap
    } else if (this.role === 'bowler' || this.role === 'fielder' || isKeeper) {
      kitHex = 0x0d3799;     // Sapphire XI royal blue
      accentHex = 0x73c2f2;  // Ice blue accent
      trouserHex = kitHex;
    }

    const kitMat = new THREE.MeshStandardMaterial({ color: kitHex, roughness: 0.65 });
    const trouserMat = new THREE.MeshStandardMaterial({ color: trouserHex, roughness: 0.70 });
    const accentMat = new THREE.MeshStandardMaterial({ color: accentHex, roughness: 0.50 });
    const skinMat = new THREE.MeshStandardMaterial({ color: skinHex, roughness: 0.60 });
    const shoeMat = new THREE.MeshStandardMaterial({ color: 0x181e24, roughness: 0.80 });

    // 1. Torso: Box (width 0.42, height 0.68, depth 0.24, center y = 1.02)
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.68, 0.24), kitMat);
    torso.position.set(0, 1.02, 0);
    torso.castShadow = true;
    this.bodyPivot.add(torso);

    // 2. Head: Sphere (diameter 0.28, center y = 1.50)
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 16), skinMat);
    head.position.set(0, 1.50, 0);
    head.castShadow = true;
    this.bodyPivot.add(head);

    // 3. Helmet & Visor (Players) OR Umpire Cap & Clipboard
    if (!isUmpire) {
      const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 16), accentMat);
      helmet.position.set(0, 1.56, 0);
      this.bodyPivot.add(helmet);

      const visor = new THREE.Mesh(
        new THREE.BoxGeometry(0.20, 0.035, 0.08),
        new THREE.MeshStandardMaterial({ color: 0x1a252f, roughness: 0.3 })
      );
      visor.position.set(0, 1.52, 0.12);
      this.bodyPivot.add(visor);
    } else {
      // Umpire Cap: wide flat box
      const cap = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.05, 0.28), accentMat);
      cap.position.set(0, 1.63, 0);
      this.bodyPivot.add(cap);

      // Clipboard in left hand
      const clipboard = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.18, 0.02),
        new THREE.MeshStandardMaterial({ color: 0xf5f5dc })
      );
      clipboard.position.set(-0.28, 0.95, 0.08);
      clipboard.rotation.x = 0.3;
      this.bodyPivot.add(clipboard);
    }

    // 4. Legs (2) & Shoes (2) - bottoms contact ground at y = 0
    [-0.11, 0.11].forEach(x => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.58, 0.16), trouserMat);
      leg.position.set(x, 0.38, 0);
      leg.castShadow = true;
      this.bodyPivot.add(leg);

      const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.09, 0.26), shoeMat);
      shoe.position.set(x, 0.045, 0.03);
      shoe.castShadow = true;
      this.bodyPivot.add(shoe);

      // Batting Pads for batsmen
      if (isBatsman) {
        const pad = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.42, 0.08), accentMat);
        pad.position.set(x, 0.38, 0.09);
        this.bodyPivot.add(pad);
      }

      // Keeper Pads for wicketkeeper
      if (isKeeper) {
        const kPad = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.40, 0.09), kitMat);
        kPad.position.set(x, 0.36, 0.08);
        this.bodyPivot.add(kPad);
      }
    });

    // 5. Arms & Arm Pivots
    // Right Arm Pivot (for swings, bowling action, umpire signals)
    this.rightArmPivot = new THREE.Group();
    this.rightArmPivot.position.set(0.26, 1.30, 0);
    const rArm = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.48, 0.10), kitMat);
    rArm.position.set(0, -0.20, 0);
    rArm.castShadow = true;
    this.rightArmPivot.add(rArm);
    this.bodyPivot.add(this.rightArmPivot);

    // Left Arm Pivot
    this.leftArmPivot = new THREE.Group();
    this.leftArmPivot.position.set(-0.26, 1.30, 0);
    const lArm = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.48, 0.10), kitMat);
    lArm.position.set(0, -0.20, 0);
    lArm.castShadow = true;
    this.leftArmPivot.add(lArm);
    this.bodyPivot.add(this.leftArmPivot);

    // Wicketkeeper gloves
    if (isKeeper) {
      const gloveGeo = new THREE.SphereGeometry(0.09, 12, 12);
      const gloveMat = new THREE.MeshStandardMaterial({ color: 0xdfab34, roughness: 0.5 });
      const rGlove = new THREE.Mesh(gloveGeo, gloveMat);
      rGlove.position.set(0, -0.42, 0.05);
      this.rightArmPivot.add(rGlove);

      const lGlove = new THREE.Mesh(gloveGeo, gloveMat);
      lGlove.position.set(0, -0.42, 0.05);
      this.leftArmPivot.add(lGlove);

      // Crouching posture for keeper
      this.bodyPivot.position.y = -0.12;
      this.bodyPivot.rotation.x = 0.16;
    }

    // 6. Cricket Bat (attached to batPivot for batsmen)
    if (isBatsman) {
      this._buildBat();
    }
  }

  _buildBat() {
    const batConf = this.config.bat || { color: 0xc79140, grip_color: 0x222222 };
    const batMat = new THREE.MeshStandardMaterial({ color: batConf.color, roughness: 0.55 });
    const gripMat = new THREE.MeshStandardMaterial({ color: batConf.grip_color, roughness: 0.70 });

    // Handle
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.28, 8), gripMat);
    handle.position.y = 0.55;

    // Blade
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.68, 0.06), batMat);
    blade.position.y = 0.18;
    blade.castShadow = true;

    this.batPivot.add(handle);
    this.batPivot.add(blade);

    // Initial stance posture: bat ready beside back hip
    this.batPivot.position.set(0.24, 0.70, 0.08);
    this.batPivot.rotation.z = -0.35;
    this.batPivot.rotation.x = -0.25;
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
        this.batPivot.rotation.set(-0.25, 0, -0.35);
        this.bodyPivot.rotation.y = 0;
      } else {
        this._updateSwingPhases(this.swingProgress);
      }
    } else {
      // Idle batsman tap
      const isBatsman = this.role.includes('batter') || this.role.includes('batsman');
      if (isBatsman && this.batPivot) {
        this.batPivot.rotation.x = -0.25 + Math.sin(this.animTime * 3.5) * 0.05;
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
        this.bodyPivot.position.z = Math.sin(t) * 0.35;
        this.bodyPivot.position.y = Math.sin(t) * 0.15;
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
        this.group.position.y = Math.abs(Math.sin(t)) * 0.4;
        if (this.rightArmPivot) this.rightArmPivot.rotation.z = Math.sin(t * 2) * 1.2;
        if (this.leftArmPivot) this.leftArmPivot.rotation.z = -Math.sin(t * 2) * 1.2;
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

    let zPos = 3.8;
    if (this.stance.depth === 'deep') zPos = 4.15;
    else if (this.stance.depth === 'forward') zPos = 3.42;

    let xPos = 0;
    if (this.stance.guard === 'leg') xPos = this.stance.hand === 'LHB' ? 0.28 : -0.28;
    else if (this.stance.guard === 'off') xPos = this.stance.hand === 'LHB' ? -0.28 : 0.28;

    this.group.position.x = xPos;
    this.group.position.y = 0.0;
    this.group.position.z = zPos;
  }

  triggerCatch() {
    let t = 0;
    const origY = this.group.position.y;
    const origRotX = this.bodyPivot.rotation.x;
    const origRotZ = this.bodyPivot.rotation.z;

    const anim = () => {
      t += 0.08;
      if (t < Math.PI) {
        this.group.position.y = origY + Math.sin(t) * 0.45;
        this.bodyPivot.rotation.x = -Math.sin(t) * 0.75;
        this.bodyPivot.rotation.z = Math.sin(t * 2) * 0.2;
        requestAnimationFrame(anim);
      } else if (t < Math.PI * 2.2) {
        this.group.position.y = 0;
        this.bodyPivot.rotation.x = -0.3;
        requestAnimationFrame(anim);
      } else if (t < Math.PI * 3.5) {
        this.group.position.y = origY + Math.abs(Math.sin(t * 2)) * 0.3;
        this.bodyPivot.rotation.x = 0;
        this.bodyPivot.rotation.z = 0;
        requestAnimationFrame(anim);
      } else {
        this.group.position.y = origY;
        this.bodyPivot.rotation.x = origRotX;
        this.bodyPivot.rotation.z = origRotZ;
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