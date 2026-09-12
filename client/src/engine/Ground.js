import * as THREE from 'three';

export class Ground {
  constructor(scene) {
    this.scene = scene;
    this.build();
  }

  build() {
    // Oval ground - large green circle
    const groundGeo = new THREE.CircleGeometry(28, 128);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x2d7a2d, roughness: 0.9 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Infield darker green
    const infieldGeo = new THREE.CircleGeometry(20, 128);
    const infieldMat = new THREE.MeshStandardMaterial({ color: 0x256825, roughness: 0.85 });
    const infield = new THREE.Mesh(infieldGeo, infieldMat);
    infield.rotation.x = -Math.PI / 2;
    infield.position.y = 0.01;
    this.scene.add(infield);

    // Boundary rope (white ring)
    const ringGeo = new THREE.TorusGeometry(27.5, 0.18, 8, 128);
    const ringMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.05;
    this.scene.add(ring);

    // Pitch - brown rectangle in center
    const pitchGeo = new THREE.BoxGeometry(2.64, 0.04, 20.12);
    const pitchMat = new THREE.MeshStandardMaterial({ color: 0xc8a96e, roughness: 0.6 });
    const pitch = new THREE.Mesh(pitchGeo, pitchMat);
    pitch.position.set(0, 0.02, 0);
    pitch.receiveShadow = true;
    this.scene.add(pitch);

    // Crease lines (popping creases)
    const creaseMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const creaseGeo = new THREE.BoxGeometry(3.0, 0.02, 0.06);
    [-8.53, 8.53].forEach(z => {
      const crease = new THREE.Mesh(creaseGeo, creaseMat);
      crease.position.set(0, 0.04, z);
      this.scene.add(crease);
    });

    // Return crease lines
    const returnCreaseGeo = new THREE.BoxGeometry(0.06, 0.02, 2.5);
    [-1.32, 1.32].forEach(x => {
      [-8.53, 8.53].forEach(z => {
        const rc = new THREE.Mesh(returnCreaseGeo, creaseMat);
        rc.position.set(x, 0.04, z + 1.0);
        this.scene.add(rc);
      });
    });

    // Stumps at each end
    this._buildStumps(0, -8.83);
    this._buildStumps(0, 8.83);

    // Sight screens
    this._buildSightScreen(0, -30);
    this._buildSightScreen(0, 30);

    // Crowd dots (decorative)
    this._buildCrowd();

    // Score board panel
    this._buildScoreBoard();
  }

  _buildStumps(x, z) {
    const stumpMat = new THREE.MeshStandardMaterial({ color: 0xf5f5dc });
    const stumpGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.72, 8);
    const bailGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.12, 6);
    const bailMat = new THREE.MeshStandardMaterial({ color: 0xffcc00 });
    const offsets = [-0.115, 0, 0.115];
    offsets.forEach(dx => {
      const stump = new THREE.Mesh(stumpGeo, stumpMat);
      stump.position.set(x + dx, 0.36, z);
      stump.castShadow = true;
      this.scene.add(stump);
    });
    // Bails
    [-0.0575, 0.0575].forEach(dx => {
      const bail = new THREE.Mesh(bailGeo, bailMat);
      bail.rotation.z = Math.PI / 2;
      bail.position.set(x + dx, 0.73, z);
      this.scene.add(bail);
    });
  }

  _buildSightScreen(x, z) {
    const geo = new THREE.BoxGeometry(8, 3, 0.2);
    const mat = new THREE.MeshStandardMaterial({ color: 0xf0f0f0 });
    const screen = new THREE.Mesh(geo, mat);
    screen.position.set(x, 1.5, z);
    this.scene.add(screen);
    // Legs
    const legGeo = new THREE.BoxGeometry(0.2, 1.5, 0.2);
    const legMat = new THREE.MeshStandardMaterial({ color: 0x888888 });
    [-3.5, 3.5].forEach(dx => {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(x + dx, 0.75, z);
      this.scene.add(leg);
    });
  }

  _buildCrowd() {
    const crowdColors = [0xff4444, 0x4444ff, 0xffff44, 0x44ffff, 0xff44ff, 0x44ff44, 0xff8800, 0x8800ff];
    for (let i = 0; i < 220; i++) {
      const angle = (i / 220) * Math.PI * 2;
      const r = 28.5 + Math.random() * 2.5;
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      const color = crowdColors[Math.floor(Math.random() * crowdColors.length)];
      const headGeo = new THREE.SphereGeometry(0.25 + Math.random() * 0.1, 6, 6);
      const headMat = new THREE.MeshStandardMaterial({ color });
      const head = new THREE.Mesh(headGeo, headMat);
      head.position.set(x, 0.5 + Math.random() * 0.4, z);
      this.scene.add(head);
      const bodyGeo = new THREE.CylinderGeometry(0.15, 0.2, 0.5, 6);
      const body = new THREE.Mesh(bodyGeo, headMat);
      body.position.set(x, 0.2, z);
      this.scene.add(body);
    }
  }

  _buildScoreBoard() {
    const boardGeo = new THREE.BoxGeometry(8, 4, 0.3);
    const boardMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2e });
    const board = new THREE.Mesh(boardGeo, boardMat);
    board.position.set(20, 2, -20);
    board.rotation.y = Math.PI / 4;
    this.scene.add(board);
    // Support
    const suppGeo = new THREE.BoxGeometry(0.3, 3, 0.3);
    const suppMat = new THREE.MeshStandardMaterial({ color: 0x444444 });
    [-2, 2].forEach(dx => {
      const supp = new THREE.Mesh(suppGeo, suppMat);
      supp.position.set(20 + dx * 0.7, 0.5, -20 + dx * 0.7);
      supp.rotation.y = Math.PI / 4;
      this.scene.add(supp);
    });
  }
}
