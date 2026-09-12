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

    // 2. Main Outfield with alternating concentric mowed lawn rings
    const groundGeo = new THREE.CircleGeometry(26, 128);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x78B84A,
      roughness: 0.8,
      metalness: 0.04
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Mowed turf rings
    [7, 13, 19].forEach((radius, idx) => {
      const ringGeo = new THREE.RingGeometry(radius, radius + 3, 96);
      const ringMat = new THREE.MeshStandardMaterial({
        color: idx % 2 === 0 ? 0x6EAF3E : 0x7EBF4E,
        roughness: 0.85
      });
      const turfRing = new THREE.Mesh(ringGeo, ringMat);
      turfRing.rotation.x = -Math.PI / 2;
      turfRing.position.y = 0.008;
      turfRing.receiveShadow = true;
      this.scene.add(turfRing);
    });

    // 3. Boundary Rope & Boundary Cushion
    const ropeGeo = new THREE.TorusGeometry(25.4, 0.22, 12, 128);
    const ropeMat = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0.3 });
    const rope = new THREE.Mesh(ropeGeo, ropeMat);
    rope.rotation.x = -Math.PI / 2;
    rope.position.y = 0.08;
    this.scene.add(rope);

    // 4. Center Pitch (3.4 x 12.0)
    const pitchGeo = new THREE.BoxGeometry(3.4, 0.04, 12.0);
    const pitchMat = new THREE.MeshStandardMaterial({
      color: 0xD8B27A,
      roughness: 0.65,
      metalness: 0.05
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

    // 7. Defined 3D Stadium Grandstands & Pavilion
    this._buildStadiumArchitecture();

    // 8. Sight Screens
    this._buildSightScreen(0, -18);
    this._buildSightScreen(0, 18);

    // 9. Floodlight Towers
    this._buildFloodlights();
  }

  _buildSkyAndClouds() {
    // Sky gradient dome
    const skyGeo = new THREE.SphereGeometry(70, 32, 32);
    const skyMat = new THREE.MeshBasicMaterial({
      color: 0x82C7FE,
      side: THREE.BackSide
    });
    const sky = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(sky);

    // Stylized fluffy 3D clouds
    const cloudMat = new THREE.MeshStandardMaterial({
      color: 0xFFFFFF,
      roughness: 0.9,
      flatShading: true
    });

    const cloudPositions = [
      { x: -20, y: 22, z: -25 },
      { x: 22, y: 24, z: -20 },
      { x: -15, y: 20, z: 25 },
      { x: 18, y: 23, z: 22 },
      { x: 0, y: 26, z: -35 }
    ];

    cloudPositions.forEach(cp => {
      const cloudGroup = new THREE.Group();
      for (let i = 0; i < 5; i++) {
        const puff = new THREE.Mesh(
          new THREE.DodecahedronGeometry(1.6 + Math.random() * 0.9, 1),
          cloudMat
        );
        puff.position.set((i - 2) * 1.6, Math.random() * 0.5, (Math.random() - 0.5) * 1.5);
        cloudGroup.add(puff);
      }
      cloudGroup.position.set(cp.x, cp.y, cp.z);
      this.scene.add(cloudGroup);
      this.clouds.push(cloudGroup);
    });
  }

  _buildStadiumArchitecture() {
    // Tiered grandstands around the boundary
    const tierColors = [0x3B6978, 0x204051, 0x84A9AC];
    for (let t = 0; t < 3; t++) {
      const rInner = 26.5 + t * 2.4;
      const rOuter = rInner + 2.3;
      const height = 1.0 + t * 1.4;

      const standGeo = new THREE.CylinderGeometry(rOuter, rInner, height, 64, 1, true);
      const standMat = new THREE.MeshStandardMaterial({
        color: tierColors[t],
        roughness: 0.7,
        side: THREE.DoubleSide
      });
      const stand = new THREE.Mesh(standGeo, standMat);
      stand.position.y = height / 2;
      this.scene.add(stand);
    }

    // Grandstand Canopy Roof on main side
    const roofGeo = new THREE.CylinderGeometry(34, 34, 0.4, 32, 1, false, -Math.PI / 3, (2 * Math.PI) / 3);
    const roofMat = new THREE.MeshStandardMaterial({
      color: 0xE8ECEF,
      roughness: 0.3,
      metalness: 0.2,
      side: THREE.DoubleSide
    });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.set(0, 8.5, 0);
    roof.rotation.x = Math.PI;
    this.scene.add(roof);

    // Canopy pillar supports
    [-22, 0, 22].forEach(x => {
      const z = Math.sqrt(Math.max(0, 32 * 32 - x * x));
      const pillar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.35, 8.5, 8),
        new THREE.MeshStandardMaterial({ color: 0x88929A, metalness: 0.4 })
      );
      pillar.position.set(x, 4.25, z);
      this.scene.add(pillar);
    });

    // 240 Stylized Spectators in the grandstands
    const audienceColors = [0xFF5E57, 0x4BCFFA, 0xFFDD59, 0x0BE881, 0x575FCC, 0xF53B57, 0x3C40C6, 0xFFA801];
    for (let i = 0; i < 240; i++) {
      const angle = (i / 240) * Math.PI * 2;
      const tier = i % 3;
      const r = 27.2 + tier * 2.3;
      const y = 1.2 + tier * 1.4;
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;

      const spectator = new THREE.Mesh(
        new THREE.SphereGeometry(0.3, 8, 8),
        new THREE.MeshStandardMaterial({
          color: audienceColors[Math.floor(Math.random() * audienceColors.length)],
          roughness: 0.6
        })
      );
      spectator.position.set(x, y, z);
      this.scene.add(spectator);
    }
  }

  _buildFloodlights() {
    const lightAngles = [Math.PI / 4, 3 * Math.PI / 4, 5 * Math.PI / 4, 7 * Math.PI / 4];
    lightAngles.forEach(angle => {
      const r = 31;
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;

      // Mast pole
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.35, 0.5, 16, 8),
        new THREE.MeshStandardMaterial({ color: 0x57606F, metalness: 0.6 })
      );
      pole.position.set(x, 8, z);
      this.scene.add(pole);

      // Light head array
      const head = new THREE.Mesh(
        new THREE.BoxGeometry(2.4, 1.4, 0.4),
        new THREE.MeshStandardMaterial({ color: 0x2F3542 })
      );
      head.position.set(x, 16, z);
      head.rotation.y = angle + Math.PI;
      head.rotation.x = -0.35;
      this.scene.add(head);

      // Glowing light panel
      const glow = new THREE.Mesh(
        new THREE.PlaneGeometry(2.2, 1.2),
        new THREE.MeshBasicMaterial({ color: 0xFFFFEE })
      );
      glow.position.set(0, 0, 0.22);
      head.add(glow);
    });
  }

  _buildStumps(x, z) {
    const stumpMat = new THREE.MeshStandardMaterial({ color: 0xF5F2DE, roughness: 0.4 });
    const stumpGeo = new THREE.CylinderGeometry(0.032, 0.032, 0.75, 12);
    const bailGeo = new THREE.CylinderGeometry(0.016, 0.016, 0.13, 8);
    const bailMat = new THREE.MeshStandardMaterial({ color: 0xE5C058 });

    const offsets = [-0.12, 0, 0.12];
    offsets.forEach(dx => {
      const stump = new THREE.Mesh(stumpGeo, stumpMat);
      stump.position.set(x + dx, 0.38, z);
      stump.castShadow = true;
      this.scene.add(stump);
    });

    [-0.06, 0.06].forEach(dx => {
      const bail = new THREE.Mesh(bailGeo, bailMat);
      bail.rotation.z = Math.PI / 2;
      bail.position.set(x + dx, 0.77, z);
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
    // Drifting clouds
    this.clouds.forEach(c => {
      c.position.x += delta * 0.8;
      if (c.position.x > 35) c.position.x = -35;
    });
  }
}
