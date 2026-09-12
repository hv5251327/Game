import * as THREE from 'three';

export class Ground {
  constructor(scene) {
    this.scene = scene;
    this.build();
  }

  build() {
    // 1. Oval Ground - bright green grass (#78B84A)
    const groundGeo = new THREE.CircleGeometry(26, 128);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x78B84A,
      roughness: 0.8,
      metalness: 0.05
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Inner circle (infield lawn pattern)
    const infieldGeo = new THREE.CircleGeometry(16, 96);
    const infieldMat = new THREE.MeshStandardMaterial({
      color: 0x6DAE40,
      roughness: 0.75
    });
    const infield = new THREE.Mesh(infieldGeo, infieldMat);
    infield.rotation.x = -Math.PI / 2;
    infield.position.y = 0.01;
    infield.receiveShadow = true;
    this.scene.add(infield);

    // Boundary Rope - rounded white ring
    const ringGeo = new THREE.TorusGeometry(25.2, 0.22, 12, 128);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xFFFFFF,
      roughness: 0.3
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.08;
    this.scene.add(ring);

    // 2. Pitch - Width: 3.4, Length: 12.0, Color: #D8B27A
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

    // 3. Crease Lines (Popping creases & Return creases)
    const creaseMat = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0.4 });
    const poppingCreaseGeo = new THREE.BoxGeometry(3.2, 0.02, 0.08);

    // Batter end crease (z = 3.8) & Bowler end crease (z = -3.8)
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

    // Bowling creases (behind stumps)
    const bowlingCreaseGeo = new THREE.BoxGeometry(2.64, 0.02, 0.06);
    [-4.5, 4.5].forEach(z => {
      const bc = new THREE.Mesh(bowlingCreaseGeo, creaseMat);
      bc.position.set(0, 0.045, z);
      this.scene.add(bc);
    });

    // 4. Stumps & Bails at both ends
    this._buildStumps(0, -4.5);
    this._buildStumps(0, 4.5);

    // 5. Sight Screens
    this._buildSightScreen(0, -18);
    this._buildSightScreen(0, 18);

    // 6. Colorful Audience around the boundary
    this._buildAudience();
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

    // Two bails resting across the stumps
    [-0.06, 0.06].forEach(dx => {
      const bail = new THREE.Mesh(bailGeo, bailMat);
      bail.rotation.z = Math.PI / 2;
      bail.position.set(x + dx, 0.77, z);
      this.scene.add(bail);
    });
  }

  _buildSightScreen(x, z) {
    const geo = new THREE.BoxGeometry(7, 2.8, 0.2);
    const mat = new THREE.MeshStandardMaterial({ color: 0xFAFAFA, roughness: 0.3 });
    const screen = new THREE.Mesh(geo, mat);
    screen.position.set(x, 1.4, z);
    screen.castShadow = true;
    this.scene.add(screen);

    const legGeo = new THREE.BoxGeometry(0.2, 1.4, 0.2);
    const legMat = new THREE.MeshStandardMaterial({ color: 0x666666 });
    [-2.8, 2.8].forEach(dx => {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(x + dx, 0.7, z);
      this.scene.add(leg);
    });
  }

  _buildAudience() {
    // Cute stylized audience (rounded colorful low-poly insect spectators)
    const audienceColors = [
      0xFF5E57, 0x4BCFFA, 0xFFDD59, 0x0BE881, 0x575FCC,
      0xF53B57, 0x3C40C6, 0x05C46B, 0xFFA801, 0xD2DAE2
    ];

    for (let i = 0; i < 240; i++) {
      const angle = (i / 240) * Math.PI * 2;
      const r = 26.2 + Math.random() * 2.8;
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      const color = audienceColors[Math.floor(Math.random() * audienceColors.length)];

      const spectatorGroup = new THREE.Group();

      // Rounded body
      const body = new THREE.Mesh(
        new THREE.SphereGeometry(0.26 + Math.random() * 0.08, 10, 10),
        new THREE.MeshStandardMaterial({ color, roughness: 0.5 })
      );
      body.position.y = 0.3 + Math.random() * 0.2;
      spectatorGroup.add(body);

      // Cute head
      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.6 })
      );
      head.position.set(0, body.position.y + 0.28, 0.06);
      spectatorGroup.add(head);

      // Tiny antennae
      [-0.06, 0.06].forEach((dx, idx) => {
        const ant = new THREE.Mesh(
          new THREE.CylinderGeometry(0.01, 0.006, 0.16, 4),
          new THREE.MeshStandardMaterial({ color: 0x222222 })
        );
        ant.position.set(dx, head.position.y + 0.14, 0.06);
        ant.rotation.z = idx === 0 ? -0.3 : 0.3;
        spectatorGroup.add(ant);
      });

      spectatorGroup.position.set(x, 0, z);
      spectatorGroup.rotation.y = Math.atan2(-x, -z);
      this.scene.add(spectatorGroup);
    }
  }
}
