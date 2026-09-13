import * as THREE from 'three';

export class Ground {
  constructor(scene) {
    this.scene = scene;
    this.clouds = [];
    this.build();
  }

  build() {
    // 1. Sky Dome & Clouds
    this._buildSkyAndClouds();

    // 2. Main Outfield — alternating mowing stripes (Babylon: grassAlt lawn alternating greens)
    const groundGeo = new THREE.CircleGeometry(26, 128);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x4A8B2A,  // deeper outfield green (Babylon primary lawn)
      roughness: 0.85,
      metalness: 0.03
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Mowing stripe rings (Babylon: alternating green shades across outfield)
    [4, 8, 12, 16, 20, 24].forEach((radius, idx) => {
      const ringGeo = new THREE.RingGeometry(radius, radius + 2.6, 96);
      const ringMat = new THREE.MeshStandardMaterial({
        color: idx % 2 === 0 ? 0x3E7D22 : 0x5AA032,
        roughness: 0.88
      });
      const turfRing = new THREE.Mesh(ringGeo, ringMat);
      turfRing.rotation.x = -Math.PI / 2;
      turfRing.position.y = 0.006;
      turfRing.receiveShadow = true;
      this.scene.add(turfRing);
    });

    // 3. Gold boundary torus + 32 perimeter markers (Babylon: gold torus at radius 96 → scaled)
    const ropeGeo = new THREE.TorusGeometry(25.4, 0.20, 12, 128);
    const ropeMat = new THREE.MeshStandardMaterial({ color: 0xFFD700, roughness: 0.3 });
    const rope = new THREE.Mesh(ropeGeo, ropeMat);
    rope.rotation.x = -Math.PI / 2;
    rope.position.y = 0.09;
    this.scene.add(rope);

    // 32 boundary cushion markers
    const markerMat = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0.4 });
    for (let i = 0; i < 32; i++) {
      const angle = (i / 32) * Math.PI * 2;
      const marker = new THREE.Mesh(
        new THREE.CylinderGeometry(0.13, 0.16, 0.30, 8),
        markerMat
      );
      marker.position.set(Math.cos(angle) * 25.4, 0.15, Math.sin(angle) * 25.4);
      this.scene.add(marker);
    }

    // 4. Center Pitch — rolled tan clay (Babylon: 0.58,0.39,0.2 = #946432 approx)
    const pitchGeo = new THREE.BoxGeometry(3.4, 0.04, 12.0);
    const pitchMat = new THREE.MeshStandardMaterial({
      color: 0x9B6B35,   // rolled tan clay (Babylon pitch color)
      roughness: 0.62,
      metalness: 0.04
    });
    const pitch = new THREE.Mesh(pitchGeo, pitchMat);
    pitch.position.set(0, 0.02, 0);
    pitch.receiveShadow = true;
    this.scene.add(pitch);

    // 5. Crease lines
    const creaseMat = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0.4 });
    const poppingCreaseGeo = new THREE.BoxGeometry(3.2, 0.02, 0.08);
    [-3.8, 3.8].forEach(z => {
      const crease = new THREE.Mesh(poppingCreaseGeo, creaseMat);
      crease.position.set(0, 0.045, z);
      this.scene.add(crease);
    });

    // Return creases
    const returnCreaseGeo = new THREE.BoxGeometry(0.08, 0.02, 1.4);
    [-1.5, 1.5].forEach(x => {
      [-4.5, 4.5].forEach(z => {
        const rc = new THREE.Mesh(returnCreaseGeo, creaseMat);
        rc.position.set(x, 0.045, z);
        this.scene.add(rc);
      });
    });

    // 6. Stumps & Bails
    this._buildStumps(0, -4.5);
    this._buildStumps(0, 4.5);

    // 7. Stadium grandstands, LED scoreboard, audience
    this._buildStadiumArchitecture();

    // 8. Sight Screens
    this._buildSightScreen(0, -18);
    this._buildSightScreen(0, 18);

    // 9. Floodlight Towers (Babylon: 4 corner towers, 36m pole, warm amber lights)
    this._buildFloodlights();
  }

  _buildSkyAndClouds() {
    const skyGeo = new THREE.SphereGeometry(75, 32, 32);
    const skyMat = new THREE.MeshBasicMaterial({
      color: 0x6AB4F0,   // deeper broadcast-quality sky blue
      side: THREE.BackSide
    });
    const sky = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(sky);

    const cloudMat = new THREE.MeshStandardMaterial({
      color: 0xFFFFFF,
      roughness: 0.9,
      flatShading: true
    });

    const cloudPositions = [
      { x: -22, y: 24, z: -28 },
      { x: 24, y: 26, z: -22 },
      { x: -16, y: 22, z: 28 },
      { x: 20, y: 25, z: 24 },
      { x:  0, y: 28, z: -38 }
    ];

    cloudPositions.forEach(cp => {
      const cloudGroup = new THREE.Group();
      for (let i = 0; i < 5; i++) {
        const puff = new THREE.Mesh(
          new THREE.DodecahedronGeometry(1.8 + Math.random() * 1.0, 1),
          cloudMat
        );
        puff.position.set((i - 2) * 1.8, Math.random() * 0.6, (Math.random() - 0.5) * 1.6);
        cloudGroup.add(puff);
      }
      cloudGroup.position.set(cp.x, cp.y, cp.z);
      this.scene.add(cloudGroup);
      this.clouds.push(cloudGroup);
    });
  }

  _buildStadiumArchitecture() {
    // --- 4 continuous seating tiers (Babylon: teal/stand colors, amber bands) ---
    const tierColors = [0x1A5F6E, 0x204051, 0x84A9AC, 0xB8860B];
    for (let t = 0; t < 4; t++) {
      const rInner = 26.5 + t * 2.4;
      const rOuter = rInner + 2.3;
      const height  = 0.95 + t * 1.4;

      const standGeo = new THREE.CylinderGeometry(rOuter, rInner, height, 64, 1, true);
      const standMat = new THREE.MeshStandardMaterial({
        color: tierColors[t],
        roughness: 0.72,
        side: THREE.DoubleSide
      });
      const stand = new THREE.Mesh(standGeo, standMat);
      stand.position.y = height / 2;
      this.scene.add(stand);
    }

    // --- North grandstand glass canopy roof ---
    const roofGeo = new THREE.CylinderGeometry(35.5, 35.5, 0.38, 32, 1, false, -Math.PI / 3, (2 * Math.PI) / 3);
    const roofMat = new THREE.MeshStandardMaterial({
      color: 0xDDE8EF,
      roughness: 0.12,
      metalness: 0.5,
      transparent: true,
      opacity: 0.80,
      side: THREE.DoubleSide
    });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.set(0, 9.8, 0);
    roof.rotation.x = Math.PI;
    this.scene.add(roof);

    // Roof support pillars
    [-22, 0, 22].forEach(x => {
      const z = Math.sqrt(Math.max(0, 33 * 33 - x * x));
      const pillar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28, 0.35, 9.8, 8),
        new THREE.MeshStandardMaterial({ color: 0x88929A, metalness: 0.45 })
      );
      pillar.position.set(x, 4.9, z);
      this.scene.add(pillar);
    });

    // --- LED Scoreboard panel (Babylon: at y=14.3, z=116 → scaled to ~y=5.5, z=-28) ---
    const boardGeo = new THREE.BoxGeometry(8.0, 4.0, 0.32);
    const boardMat = new THREE.MeshStandardMaterial({
      color: 0x080808,
      roughness: 0.12,
      metalness: 0.35,
      emissive: 0x001800,
      emissiveIntensity: 0.5
    });
    const scoreboard = new THREE.Mesh(boardGeo, boardMat);
    scoreboard.position.set(0, 5.6, -29);
    this.scene.add(scoreboard);

    // LED glow screen face
    const ledFace = new THREE.Mesh(
      new THREE.PlaneGeometry(7.5, 3.6),
      new THREE.MeshBasicMaterial({ color: 0x00DD44 })
    );
    ledFace.position.set(0, 5.6, -28.83);
    this.scene.add(ledFace);

    // Support legs for scoreboard
    [-3.0, 3.0].forEach(x => {
      const leg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.30, 5.6, 8),
        new THREE.MeshStandardMaterial({ color: 0x4A5568, metalness: 0.55 })
      );
      leg.position.set(x, 2.8, -29);
      this.scene.add(leg);
    });

    // --- 400 audience (Babylon: 10,000 instanced in 20 rows around radius 109) ---
    const audienceColors = [0xFF5E57, 0x4BCFFA, 0xFFDD59, 0x0BE881, 0x575FCC, 0xF53B57, 0x3C40C6, 0xFFA801, 0xFF6B81, 0xECCC68];
    const audGeo = new THREE.SphereGeometry(0.22, 6, 6);
    for (let i = 0; i < 400; i++) {
      const angle = (i / 400) * Math.PI * 2;
      const tier  = i % 4;
      const r     = 27.5 + tier * 2.3;
      const y     = 0.95 + tier * 1.4;
      const spectator = new THREE.Mesh(
        audGeo,
        new THREE.MeshStandardMaterial({
          color: audienceColors[Math.floor(Math.random() * audienceColors.length)],
          roughness: 0.6
        })
      );
      spectator.position.set(Math.cos(angle) * r, y, Math.sin(angle) * r);
      this.scene.add(spectator);
    }
  }

  _buildFloodlights() {
    // Babylon: 4 floodlight towers at corners (±116,0,±82) scaled to ±32,0,±22 in Three.js
    const corners = [
      { x: -32, z: -22 }, { x:  32, z: -22 },
      { x: -32, z:  22 }, { x:  32, z:  22 }
    ];

    corners.forEach(({ x, z }) => {
      // Concrete base footing
      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(0.72, 0.92, 0.55, 10),
        new THREE.MeshStandardMaterial({ color: 0x454E58, metalness: 0.35 })
      );
      base.position.set(x, 0.28, z);
      this.scene.add(base);

      // Steel pole (Babylon: 36m → ~20 units)
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.26, 0.44, 20, 10),
        new THREE.MeshStandardMaterial({ color: 0x57606F, metalness: 0.68, roughness: 0.38 })
      );
      pole.position.set(x, 10, z);
      pole.castShadow = true;
      this.scene.add(pole);

      // Horizontal cross arm
      const arm = new THREE.Mesh(
        new THREE.BoxGeometry(3.4, 0.22, 0.22),
        new THREE.MeshStandardMaterial({ color: 0x505862, metalness: 0.52 })
      );
      arm.position.set(x, 20.15, z);
      this.scene.add(arm);

      // 3-bank light head array
      [-1.1, 0, 1.1].forEach(dx => {
        const head = new THREE.Mesh(
          new THREE.BoxGeometry(0.92, 0.58, 0.24),
          new THREE.MeshStandardMaterial({ color: 0x2B3140 })
        );
        head.position.set(x + dx, 20.65, z);
        head.rotation.y = Math.atan2(-z, -x);
        head.rotation.x = -0.32;
        this.scene.add(head);

        // Warm amber glow face (Babylon: warm amber lights)
        const glow = new THREE.Mesh(
          new THREE.PlaneGeometry(0.85, 0.50),
          new THREE.MeshBasicMaterial({ color: 0xFFF2AA })
        );
        glow.position.set(0, 0, 0.13);
        head.add(glow);
      });

      // THREE.PointLight — warm amber, Babylon equivalent
      const floodLight = new THREE.PointLight(0xFFE090, 2.0, 60, 1.5);
      floodLight.position.set(x, 20, z);
      this.scene.add(floodLight);
    });
  }

  _buildStumps(x, z) {
    const stumpMat = new THREE.MeshStandardMaterial({
      color: 0xF7E7B4,
      roughness: 0.32,
      metalness: 0.1
    });
    const stumpGeo = new THREE.CylinderGeometry(0.052, 0.048, 0.92, 16);
    const bailGeo  = new THREE.CylinderGeometry(0.024, 0.024, 0.20, 10);
    const bailMat  = new THREE.MeshStandardMaterial({
      color: 0xFFD32A,
      roughness: 0.25,
      metalness: 0.2
    });

    [-0.18, 0, 0.18].forEach(dx => {
      const stump = new THREE.Mesh(stumpGeo, stumpMat);
      stump.position.set(x + dx, 0.46, z);
      stump.castShadow = true;
      stump.receiveShadow = true;
      this.scene.add(stump);

      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(0.062, 0.062, 0.05, 12),
        new THREE.MeshStandardMaterial({ color: 0x4A2F1B })
      );
      base.position.set(x + dx, 0.03, z);
      this.scene.add(base);
    });

    [-0.09, 0.09].forEach(dx => {
      const bail = new THREE.Mesh(bailGeo, bailMat);
      bail.rotation.z = Math.PI / 2;
      bail.position.set(x + dx, 0.93, z);
      bail.castShadow = true;
      this.scene.add(bail);
    });
  }

  _buildSightScreen(x, z) {
    const geo = new THREE.BoxGeometry(6.5, 2.8, 0.2);
    const mat = new THREE.MeshStandardMaterial({ color: 0xFAFAFA, roughness: 0.3 });
    const screen = new THREE.Mesh(geo, mat);
    screen.position.set(x, 1.4, z);
    this.scene.add(screen);
  }

  update(delta) {
    this.clouds.forEach(c => {
      c.position.x += delta * 0.8;
      if (c.position.x > 38) c.position.x = -38;
    });
  }
}
