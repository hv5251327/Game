import * as THREE from 'three';

// Exact Character definitions & physics presets from specification
export const CHARACTER_PRESETS = {
  ant_batter_01: {
    id: 'ant_batter_01',
    species: 'ant',
    role: 'batter',
    team_color: '#4C9B3C',
    physics: {
      mass_kg: 0.12,
      swing_speed_degrees_per_second: 520,
      impact_force_newtons: 18,
      restitution: 0.58,
      friction: 0.72,
      air_drag: 0.18,
      grounded_stability: 0.62
    },
    scale: 1.25,
    bat: { shape: 'short rounded cricket bat', color: 0xF5F2DE, grip_color: 0x6C4B2A, attachment: 'right_hand' },
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
    species: 'snail',
    role: 'bowler',
    team_color: '#A5C94D',
    shell_color: 0xD79543,
    spiral_color: 0x8B542A,
    physics: {
      mass_kg: 0.32,
      swing_speed_degrees_per_second: 180,
      impact_force_newtons: 8,
      restitution: 0.22,
      friction: 0.91,
      air_drag: 0.34,
      grounded_stability: 0.94
    },
    scale: 1.0,
    starting_transform: { position: { x: 0, y: 0.0, z: -3.7 }, rotation_y_degrees: 0, scale: 1.0 }
  },
  snail_fielder_left: {
    id: 'snail_fielder_left',
    species: 'snail',
    role: 'fielder',
    team_color: '#E6A847',
    shell_color: 0x73A947,
    spiral_color: 0x396B31,
    physics: {
      mass_kg: 0.27,
      swing_speed_degrees_per_second: 150,
      impact_force_newtons: 6,
      restitution: 0.2,
      friction: 0.93,
      air_drag: 0.36,
      grounded_stability: 0.97
    },
    scale: 0.82,
    starting_transform: { position: { x: -5.0, y: 0.0, z: -1.2 }, rotation_y_degrees: 90, scale: 1.0 }
  },
  ant_fielder_right: {
    id: 'ant_fielder_right',
    species: 'ant',
    role: 'fielder',
    team_color: '#D88732',
    physics: {
      mass_kg: 0.1,
      swing_speed_degrees_per_second: 460,
      impact_force_newtons: 14,
      restitution: 0.5,
      friction: 0.68,
      air_drag: 0.2,
      grounded_stability: 0.58
    },
    scale: 0.86,
    starting_transform: { position: { x: 4.6, y: 0.0, z: -1.8 }, rotation_y_degrees: -90, scale: 1.0 }
  },
  beetle_power_batter_01: {
    id: 'beetle_power_batter_01',
    species: 'beetle',
    role: 'batter',
    batting_style: 'power_hitter',
    team_color: '#315B4A',
    shell_color: 0x244538,
    physics: {
      mass_kg: 0.48,
      swing_speed_degrees_per_second: 390,
      impact_force_newtons: 42,
      restitution: 0.64,
      friction: 0.86,
      air_drag: 0.12,
      grounded_stability: 0.98
    },
    scale: 1.35,
    bat: { shape: 'wide heavy cricket bat', color: 0xD8A35D, grip_color: 0x4D3020, attachment: 'both_hands' },
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
    species: 'grasshopper',
    role: 'batter',
    batting_style: 'agile_switch_hitter',
    team_color: '#8BC34A',
    physics: {
      mass_kg: 0.16,
      swing_speed_degrees_per_second: 760,
      impact_force_newtons: 24,
      restitution: 0.7,
      friction: 0.48,
      air_drag: 0.1,
      grounded_stability: 0.38
    },
    scale: 1.12,
    bat: { shape: 'light narrow cricket bat', color: 0xF4D59A, grip_color: 0x6B452A, attachment: 'dominant_hand' },
    starting_transform: { position: { x: 0, y: 0.0, z: 3.8 }, rotation_y_degrees: 180, scale: 1.0 },
    swing_phases: [
      { name: 'coil', time: 0.0, bat_angle: -35, body_twist: -12 },
      { name: 'hop_and_accelerate', time: 0.14, bat_angle: 20, body_twist: 14 },
      { name: 'contact', time: 0.24, bat_angle: 75, body_twist: 28 },
      { name: 'airborne_follow_through', time: 0.42, bat_angle: 155, body_twist: 48 }
    ]
  }
};

// Direction vector map
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
    this.species = this.config.species || 'ant';
    this.role = this.config.role || 'batter';
    this.physics = this.config.physics || CHARACTER_PRESETS.ant_batter_01.physics;

    this.group = new THREE.Group();
    this.bodyPivot = new THREE.Group();
    this.group.add(this.bodyPivot);

    this.batMesh = null;
    this.batPivot = new THREE.Group();
    this.group.add(this.batPivot);

    this.antennaeMeshes = [];
    this.eyeStalks = [];
    this.legs = [];

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

    // Set initial transform
    const isUmpire = this.species === 'umpire' || this.role === 'umpire';
    if (this.config.starting_transform) {
      const st = this.config.starting_transform;
      this.setPosition(st.position.x, st.position.y, st.position.z);
      this.setRotation((st.rotation_y_degrees || 0) * Math.PI / 180);
      const sc = isUmpire ? 0.58 : ((st.scale || 1.0) * (this.config.scale || 1.0));
      this.group.scale.setScalar(sc);
    } else {
      const sc = isUmpire ? 0.58 : (this.config.scale || 1.0);
      this.group.scale.setScalar(sc);
    }

    this.scene.add(this.group);
  }

  build() {
    while (this.bodyPivot.children.length > 0) this.bodyPivot.remove(this.bodyPivot.children[0]);
    while (this.batPivot.children.length > 0) this.batPivot.remove(this.batPivot.children[0]);

    if (this.species === 'snail') {
      this._buildSnail();
    } else if (this.species === 'beetle') {
      this._buildBeetle();
    } else if (this.species === 'grasshopper') {
      this._buildGrasshopper();
    } else if (this.species === 'umpire') {
      this._buildUmpire();
    } else {
      this._buildAnt();
    }

    if (this.config.bat) {
      this._buildBat();
    }
  }

  // --- 1. ANT MODEL ---
  _buildAnt() {
    const colorHex = parseInt((this.config.team_color || '#4C9B3C').replace('#', '0x'), 16);
    const legColor = 0x22381A;
    const bodyMat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.55 });
    const legMat = new THREE.MeshStandardMaterial({ color: legColor, roughness: 0.7 });

    // All body parts shifted so that leg bottoms sit at local y = 0 (on the ground).
    // Legs are cylinders: half-height = 0.175, center at y = 0.18 → bottom at y = 0.005 ≈ ground contact.

    // 6 short jointed legs — GROUNDED: centers at y = 0.18 so bottoms sit at y ≈ 0
    const legCoords = [
      { x: -0.22, z:  0.10, rz:  0.4 }, { x:  0.22, z:  0.10, rz: -0.4 },
      { x: -0.25, z: -0.05, rz:  0.5 }, { x:  0.25, z: -0.05, rz: -0.5 },
      { x: -0.23, z: -0.22, rz:  0.4 }, { x:  0.23, z: -0.22, rz: -0.4 }
    ];
    legCoords.forEach(lc => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.015, 0.35, 6), legMat);
      leg.position.set(lc.x, 0.18, lc.z);
      leg.rotation.z = lc.rz;
      leg.rotation.x = 0.18;
      this.bodyPivot.add(leg);

      // Visible grounded foot / shoe placed firmly on the pitch turf
      const foot = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 0.025, 0.08),
        new THREE.MeshStandardMaterial({ color: 0x182612, roughness: 0.85 })
      );
      foot.position.set(lc.x * 1.35, 0.012, lc.z + 0.02);
      this.bodyPivot.add(foot);

      this.legs.push(leg, foot);
    });

    // Segment 3: Abdomen — sits above legs
    const abdomen = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 10), bodyMat);
    abdomen.scale.set(0.95, 0.88, 1.25);
    abdomen.position.set(0, 0.36, -0.32);
    this.bodyPivot.add(abdomen);

    // Segment 2: Thorax
    const thorax = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 10), bodyMat);
    thorax.position.set(0, 0.42, -0.02);
    this.bodyPivot.add(thorax);

    // Segment 1: Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 12), bodyMat);
    head.position.set(0, 0.60, 0.18);
    this.bodyPivot.add(head);

    // Large white eyes with black pupils
    [-0.1, 0.1].forEach(dx => {
      const eyeWhite = new THREE.Mesh(
        new THREE.SphereGeometry(0.065, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0.2 })
      );
      eyeWhite.position.set(dx, 0.64, 0.36);
      this.bodyPivot.add(eyeWhite);

      const pupil = new THREE.Mesh(
        new THREE.SphereGeometry(0.035, 6, 6),
        new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.1 })
      );
      pupil.position.set(dx * 0.95, 0.64, 0.41);
      this.bodyPivot.add(pupil);
    });

    // Two thin curved antennae
    [-0.08, 0.08].forEach((dx, i) => {
      const antPivot = new THREE.Group();
      antPivot.position.set(dx, 0.80, 0.22);
      const ant = new THREE.Mesh(
        new THREE.CylinderGeometry(0.012, 0.006, 0.32, 5),
        new THREE.MeshStandardMaterial({ color: 0x1B2E15, roughness: 0.6 })
      );
      ant.position.y = 0.15;
      ant.rotation.z = (i === 0 ? -0.35 : 0.35);
      ant.rotation.x = -0.2;
      antPivot.add(ant);
      this.bodyPivot.add(antPivot);
      this.antennaeMeshes.push(antPivot);
    });

    // Two thin flexible arms
    [-0.2, 0.2].forEach((dx, idx) => {
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.014, 0.28, 5), bodyMat);
      arm.position.set(dx, 0.47, 0.08);
      arm.rotation.z = idx === 0 ? -0.6 : 0.6;
      arm.rotation.x = 0.4;
      this.bodyPivot.add(arm);
    });
  }

  // --- 2. SNAIL MODEL ---
  _buildSnail() {
    const bodyColor = parseInt((this.config.team_color || '#A5C94D').replace('#', '0x'), 16);
    const shellColor = this.config.shell_color || 0xD79543;
    const spiralColor = this.config.spiral_color || 0x8B542A;

    const bodyMat = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.65 });
    const shellMat = new THREE.MeshStandardMaterial({ color: shellColor, roughness: 0.5 });
    const spiralMat = new THREE.MeshStandardMaterial({ color: spiralColor, roughness: 0.6 });

    // Rounded foot / soft body
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.32, 0.2, 10), bodyMat);
    foot.scale.set(0.9, 1.0, 1.8);
    foot.position.set(0, 0.1, 0);
    this.bodyPivot.add(foot);

    // Front neck & head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 10), bodyMat);
    head.position.set(0, 0.35, 0.35);
    this.bodyPivot.add(head);

    // Large spiral shell
    const shell = new THREE.Mesh(new THREE.SphereGeometry(0.48, 14, 14), shellMat);
    shell.scale.set(0.9, 1.1, 1.1);
    shell.position.set(0, 0.5, -0.15);
    shell.rotation.z = Math.PI / 10;
    this.bodyPivot.add(shell);

    // Spiral swirl accent
    const spiralTorus = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.06, 6, 20), spiralMat);
    spiralTorus.position.set(0.38, 0.5, -0.15);
    spiralTorus.rotation.y = Math.PI / 2;
    this.bodyPivot.add(spiralTorus);

    const spiralTorus2 = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.06, 6, 20), spiralMat);
    spiralTorus2.position.set(-0.38, 0.5, -0.15);
    spiralTorus2.rotation.y = Math.PI / 2;
    this.bodyPivot.add(spiralTorus2);

    // Two eyes on long flexible stalks
    [-0.1, 0.1].forEach((dx, i) => {
      const stalkPivot = new THREE.Group();
      stalkPivot.position.set(dx, 0.48, 0.4);

      const stalk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.016, 0.014, 0.28, 6),
        bodyMat
      );
      stalk.position.y = 0.14;
      stalk.rotation.z = i === 0 ? -0.2 : 0.2;
      stalkPivot.add(stalk);

      const eye = new THREE.Mesh(
        new THREE.SphereGeometry(0.065, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0.2 })
      );
      eye.position.set(i === 0 ? -0.04 : 0.04, 0.28, 0);
      stalkPivot.add(eye);

      const pupil = new THREE.Mesh(
        new THREE.SphereGeometry(0.035, 6, 6),
        new THREE.MeshStandardMaterial({ color: 0x111111 })
      );
      pupil.position.set(i === 0 ? -0.04 : 0.04, 0.28, 0.05);
      stalkPivot.add(pupil);

      this.bodyPivot.add(stalkPivot);
      this.eyeStalks.push(stalkPivot);
    });
  }

  // --- 3. BEETLE POWER BATTER ---
  _buildBeetle() {
    const bodyColor = parseInt((this.config.team_color || '#315B4A').replace('#', '0x'), 16);
    const shellColor = this.config.shell_color || 0x244538;
    const armorMat = new THREE.MeshStandardMaterial({
      color: shellColor,
      roughness: 0.35,
      metalness: 0.25
    });
    const bodyMat = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.5 });

    // Sturdy broad head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 12), armorMat);
    head.scale.set(1.15, 0.9, 1.1);
    head.position.set(0, 0.58, 0.2);
    this.bodyPivot.add(head);

    // Large white eyes with dark pupils
    [-0.14, 0.14].forEach(dx => {
      const eyeWhite = new THREE.Mesh(
        new THREE.SphereGeometry(0.075, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0.2 })
      );
      eyeWhite.position.set(dx, 0.62, 0.42);
      this.bodyPivot.add(eyeWhite);

      const pupil = new THREE.Mesh(
        new THREE.SphereGeometry(0.04, 6, 6),
        new THREE.MeshStandardMaterial({ color: 0x111111 })
      );
      pupil.position.set(dx * 0.95, 0.62, 0.48);
      this.bodyPivot.add(pupil);
    });

    // Two short curved antennae
    [-0.1, 0.1].forEach((dx, i) => {
      const ant = new THREE.Mesh(
        new THREE.CylinderGeometry(0.016, 0.008, 0.2, 5),
        new THREE.MeshStandardMaterial({ color: 0x1A2E26 })
      );
      ant.position.set(dx, 0.78, 0.28);
      ant.rotation.z = i === 0 ? -0.4 : 0.4;
      this.bodyPivot.add(ant);
    });

    // Broad armored carapace
    const shell = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 12), armorMat);
    shell.scale.set(1.15, 0.9, 1.35);
    shell.position.set(0, 0.42, -0.2);
    this.bodyPivot.add(shell);

    // 6 sturdy jointed legs
    const legCoords = [
      { x: -0.3, z: 0.15 }, { x: 0.3, z: 0.15 },
      { x: -0.34, z: -0.1 }, { x: 0.34, z: -0.1 },
      { x: -0.3, z: -0.35 }, { x: 0.3, z: -0.35 }
    ];
    legCoords.forEach(lc => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.022, 0.4, 6), armorMat);
      leg.position.set(lc.x, 0.24, lc.z);
      leg.rotation.z = lc.x < 0 ? 0.45 : -0.45;
      this.bodyPivot.add(leg);
      this.legs.push(leg);
    });

    // Two strong segmented arms holding heavy bat with both hands
    [-0.24, 0.24].forEach((dx, idx) => {
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.024, 0.32, 6), bodyMat);
      arm.position.set(dx, 0.48, 0.15);
      arm.rotation.z = idx === 0 ? -0.45 : 0.45;
      arm.rotation.x = 0.5;
      this.bodyPivot.add(arm);
    });
  }

  // --- 4. GRASSHOPPER AGILE BATTER ---
  _buildGrasshopper() {
    const colorHex = parseInt((this.config.team_color || '#8BC34A').replace('#', '0x'), 16);
    const bodyMat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.45 });
    const legMat = new THREE.MeshStandardMaterial({ color: 0x558B2F, roughness: 0.6 });

    // Small rounded head with cheerful grin
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 10), bodyMat);
    head.scale.set(0.9, 1.1, 1.1);
    head.position.set(0, 0.56, 0.2);
    this.bodyPivot.add(head);

    // Large glossy compound eyes
    [-0.1, 0.1].forEach(dx => {
      const eye = new THREE.Mesh(
        new THREE.SphereGeometry(0.065, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0x223311, roughness: 0.15, metalness: 0.3 })
      );
      eye.position.set(dx, 0.6, 0.32);
      this.bodyPivot.add(eye);
    });

    // Long flexible antennae
    [-0.06, 0.06].forEach((dx, i) => {
      const antPivot = new THREE.Group();
      antPivot.position.set(dx, 0.72, 0.22);
      const ant = new THREE.Mesh(
        new THREE.CylinderGeometry(0.01, 0.005, 0.45, 5),
        new THREE.MeshStandardMaterial({ color: 0x33691E })
      );
      ant.position.y = 0.22;
      ant.rotation.z = i === 0 ? -0.4 : 0.4;
      ant.rotation.x = -0.3;
      antPivot.add(ant);
      this.bodyPivot.add(antPivot);
      this.antennaeMeshes.push(antPivot);
    });

    // Slim thorax & abdomen
    const thorax = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), bodyMat);
    thorax.position.set(0, 0.4, 0);
    this.bodyPivot.add(thorax);

    const abdomen = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.05, 0.6, 8), bodyMat);
    abdomen.rotation.x = Math.PI / 2.2;
    abdomen.position.set(0, 0.35, -0.35);
    this.bodyPivot.add(abdomen);

    // Oversized spring-loaded hind legs
    [-0.2, 0.2].forEach((dx, idx) => {
      const femur = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.02, 0.48, 6), legMat);
      femur.position.set(dx, 0.42, -0.15);
      femur.rotation.z = idx === 0 ? 0.35 : -0.35;
      femur.rotation.x = -0.7;
      this.bodyPivot.add(femur);

      const tibia = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.009, 0.55, 6), legMat);
      tibia.position.set(dx * 1.35, 0.15, -0.35);
      tibia.rotation.z = idx === 0 ? 0.6 : -0.6;
      tibia.rotation.x = 0.8;
      this.bodyPivot.add(tibia);
      this.legs.push(femur, tibia);
    });
  }

  // --- CRICKET BAT ---
  _buildBat() {
    const batConf = this.config.bat || { color: 0xF5F2DE, grip_color: 0x6C4B2A };
    const batMat = new THREE.MeshStandardMaterial({ color: batConf.color, roughness: 0.5 });
    const gripMat = new THREE.MeshStandardMaterial({ color: batConf.grip_color, roughness: 0.7 });

    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.26, 8), gripMat);
    handle.position.y = 0.45;

    const bladeWidth = this.species === 'beetle' ? 0.16 : this.species === 'grasshopper' ? 0.1 : 0.12;
    const blade = new THREE.Mesh(new THREE.BoxGeometry(bladeWidth, 0.44, 0.05), batMat);
    blade.position.y = 0.18;

    this.batPivot.add(handle);
    this.batPivot.add(blade);

    // Initial ready posture: bat raised behind right shoulder
    this.batPivot.position.set(0.32, 0.52, 0.05);
    this.batPivot.rotation.z = -0.4;
    this.batPivot.rotation.x = -0.3;
  }

  // --- BAT CONTROLLER COMMAND EXECUTION ---
  // command = { character_id, action: "swing_bat", direction: "forward_right", power: 0.85 }
  executeCommand(command) {
    if (command.action !== 'swing_bat') return;
    if (!this.config.bat) return;

    this.currentDirection = command.direction || 'forward';
    this.currentPower = Math.max(0.1, Math.min(1.0, command.power || 0.75));

    // Calculate swing speed multiplier from physics
    const speedMult = (this.physics.swing_speed_degrees_per_second || 520) / 520;
    this.swingDuration = (this.config.swing_phases ? 0.55 : 0.5) / (speedMult * (0.8 + this.currentPower * 0.4));
    this.isSwinging = true;
    this.swingProgress = 0;

    // Direction angle offset
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

    // Sway antennae with gentle motion
    this.antennaeMeshes.forEach((ant, i) => {
      ant.rotation.z = Math.sin(this.animTime * 3 + i) * 0.12;
    });

    // Eye stalk scanning for snails
    this.eyeStalks.forEach((stalk, i) => {
      stalk.rotation.z = Math.sin(this.animTime * 2 + i * 1.5) * 0.08;
      stalk.rotation.x = Math.cos(this.animTime * 1.5 + i) * 0.06;
    });

    // Swing bat execution
    if (this.isSwinging) {
      this.swingProgress += delta / this.swingDuration;

      if (this.swingProgress >= 1.0) {
        this.swingProgress = 1.0;
        this.isSwinging = false;
        // Blend back to ready stance
        this.batPivot.rotation.set(-0.3, 0, -0.4);
        this.bodyPivot.rotation.y = 0;
      } else {
        this._updateSwingPhases(this.swingProgress);
      }
    } else {
      // Batsman ready stance: tap bat on crease ground while feet remain firmly planted on turf
      if (this.role === 'batter' && this.batPivot) {
        this.batPivot.rotation.x = -0.3 + Math.sin(this.animTime * 3.5) * 0.06;
      }
      this.bodyPivot.position.y = 0;
    }
  }

  _updateSwingPhases(p) {
    const phases = this.config.swing_phases || CHARACTER_PRESETS.ant_batter_01.swing_phases;
    // Find phase
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
        this.bodyPivot.position.z = Math.sin(t) * 0.3;
        this.bodyPivot.position.y = Math.sin(t) * 0.15;
        requestAnimationFrame(bowl);
      } else {
        this.bodyPivot.position.z = 0;
        this.bodyPivot.position.y = 0;
      }
    };
    bowl();
  }

  triggerCelebrate() {
    let t = 0;
    const cel = () => {
      t += 0.09;
      if (t < Math.PI * 4) {
        this.group.position.y = (this.config.starting_transform?.position.y || 0.65) + Math.abs(Math.sin(t)) * 0.4;
        this.batPivot.rotation.z = Math.sin(t * 2) * 0.6;
        requestAnimationFrame(cel);
      } else {
        this.group.position.y = this.config.starting_transform?.position.y || 0.65;
      }
    };
    cel();
  }

  // --- 5. UMPIRE MODEL ---
  _buildUmpire() {
    const coatMat = new THREE.MeshStandardMaterial({ color: 0xF5F6FA, roughness: 0.4 });
    const hatMat = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0.5 });
    const pantMat = new THREE.MeshStandardMaterial({ color: 0x2F3542, roughness: 0.6 });

    // Legs / Trousers
    [-0.12, 0.12].forEach(dx => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.45, 8), pantMat);
      leg.position.set(dx, 0.22, 0);
      this.bodyPivot.add(leg);
    });

    // Body in white coat
    const coat = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.52, 10), coatMat);
    coat.position.set(0, 0.52, 0);
    this.bodyPivot.add(coat);

    // Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 10), new THREE.MeshStandardMaterial({ color: 0xFFD2A4 }));
    head.position.set(0, 0.88, 0);
    this.bodyPivot.add(head);

    // Wide-brim umpire sun hat
    const hatBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.03, 16), hatMat);
    hatBrim.position.set(0, 0.98, 0);
    const hatCrown = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.14, 12), hatMat);
    hatCrown.position.set(0, 1.05, 0);
    this.bodyPivot.add(hatBrim, hatCrown);

    // Articulated arms for signals
    this.rightArmPivot = new THREE.Group();
    this.rightArmPivot.position.set(0.28, 0.72, 0);
    const rArm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.035, 0.38, 6), coatMat);
    rArm.position.y = -0.18;
    this.rightArmPivot.add(rArm);
    this.bodyPivot.add(this.rightArmPivot);

    this.leftArmPivot = new THREE.Group();
    this.leftArmPivot.position.set(-0.28, 0.72, 0);
    const lArm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.035, 0.38, 6), coatMat);
    lArm.position.y = -0.18;
    this.leftArmPivot.add(lArm);
    this.bodyPivot.add(this.leftArmPivot);
  }

  signalOut() {
    if (!this.rightArmPivot) return;
    let t = 0;
    const anim = () => {
      t += 0.08;
      if (t < Math.PI * 2) {
        // Raise right arm straight up with index finger to sky
        this.rightArmPivot.rotation.z = Math.min(Math.PI, t * 2);
        requestAnimationFrame(anim);
      } else {
        setTimeout(() => {
          this.rightArmPivot.rotation.z = 0;
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
        // Wave right arm horizontally across chest
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
        // Raise both arms straight up overhead
        this.rightArmPivot.rotation.z = Math.min(Math.PI, t * 2);
        this.leftArmPivot.rotation.z = -Math.min(Math.PI, t * 2);
        requestAnimationFrame(anim);
      } else {
        setTimeout(() => {
          this.rightArmPivot.rotation.z = 0;
          this.leftArmPivot.rotation.z = 0;
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
        // Extend both arms horizontally
        this.rightArmPivot.rotation.z = Math.PI / 2;
        this.leftArmPivot.rotation.z = -Math.PI / 2;
        requestAnimationFrame(anim);
      } else {
        setTimeout(() => {
          this.rightArmPivot.rotation.z = 0;
          this.leftArmPivot.rotation.z = 0;
        }, 1500);
      }
    };
    anim();
  }

  setStance(stance = {}) {
    this.stance = { ...this.stance, ...stance };

    // Handedness: RHB vs LHB
    const baseScale = (this.config.starting_transform?.scale || 1.0) * (this.config.scale || 1.0);
    if (this.stance.hand === 'LHB') {
      this.group.scale.x = -Math.abs(baseScale);
    } else {
      this.group.scale.x = Math.abs(baseScale);
    }

    // Crease Depth
    let zPos = 3.8;
    if (this.stance.depth === 'deep') zPos = 4.15;
    else if (this.stance.depth === 'forward') zPos = 3.42;

    // Guard Position across stumps
    let xPos = 0;
    if (this.stance.guard === 'leg') xPos = this.stance.hand === 'LHB' ? 0.28 : -0.28;
    else if (this.stance.guard === 'off') xPos = this.stance.hand === 'LHB' ? -0.28 : 0.28;

    this.group.position.x = xPos;
    this.group.position.y = 0.0;
    this.group.position.z = zPos;
  }

  // Enhanced Diving Cricket Catch
  triggerCatch() {
    let t = 0;
    const origY = this.group.position.y;
    const origRotX = this.bodyPivot.rotation.x;
    const origRotZ = this.bodyPivot.rotation.z;

    const anim = () => {
      t += 0.08;
      if (t < Math.PI) {
        // Phase 1: Airborne athletic dive towards ball
        this.group.position.y = origY + Math.sin(t) * 0.45;
        this.bodyPivot.rotation.x = -Math.sin(t) * 0.75;
        this.bodyPivot.rotation.z = Math.sin(t * 2) * 0.2;
        requestAnimationFrame(anim);
      } else if (t < Math.PI * 2.2) {
        // Phase 2: Slide on grass with ball safely tucked (always at ground level)
        this.group.position.y = 0;
        this.bodyPivot.rotation.x = -0.3;
        requestAnimationFrame(anim);
      } else if (t < Math.PI * 3.5) {
        // Phase 3: Pop back up and celebrate catch
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

  // Ground Fielding & Gather Motion
  triggerFieldGather() {
    let t = 0;
    const origY = this.group.position.y;
    const anim = () => {
      t += 0.12;
      if (t < Math.PI) {
        // Crouch & gather ball off grass
        this.group.position.y = origY * 0.5;
        this.bodyPivot.rotation.x = 0.55;
        requestAnimationFrame(anim);
      } else if (t < Math.PI * 2) {
        // Stand and throw motion
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
