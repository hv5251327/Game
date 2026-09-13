import * as THREE from 'three';

// Exact Summit Park Cricket Stadium in Three.js matching Babylon.js Scene Specification
export class Ground {
  constructor(scene) {
    this.scene = scene;
    this.clouds = [];
    this.build();
  }

  build() {
    // Materials matching Babylon.js mat() specifications
    const grassMat = new THREE.MeshStandardMaterial({
      color: 0x1f4f2b, // Color3(0.12, 0.31, 0.17)
      roughness: 0.85,
      metalness: 0.02
    });
    const grassAltMat = new THREE.MeshStandardMaterial({
      color: 0x296130, // Color3(0.16, 0.38, 0.19)
      roughness: 0.88,
      metalness: 0.02
    });
    const clayMat = new THREE.MeshStandardMaterial({
      color: 0x946433, // Color3(0.58, 0.39, 0.2) rolled tan clay
      roughness: 0.65,
      metalness: 0.04
    });
    const whiteMat = new THREE.MeshStandardMaterial({
      color: 0xebe8dc, // Color3(0.92, 0.92, 0.86)
      roughness: 0.40,
      emissive: 0x191914
    });
    const boundaryMat = new THREE.MeshStandardMaterial({
      color: 0xf2c247, // Color3(0.95, 0.76, 0.28) raised gold rope
      roughness: 0.35,
      emissive: 0x332405
    });
    const standMat = new THREE.MeshStandardMaterial({
      color: 0x1a2124, // Color3(0.1, 0.13, 0.14) stand concrete
      roughness: 0.78,
      metalness: 0.20
    });
    const tealMat = new THREE.MeshStandardMaterial({
      color: 0x0d4747, // Color3(0.05, 0.28, 0.28) stand teal
      roughness: 0.72,
      metalness: 0.15
    });
    const amberMat = new THREE.MeshStandardMaterial({
      color: 0xb86114, // Color3(0.72, 0.38, 0.08) stand amber
      roughness: 0.45,
      emissive: 0x291402
    });
    const woodMat = new THREE.MeshStandardMaterial({
      color: 0xad170d, // Color3(0.68, 0.09, 0.05) stump wood
      roughness: 0.35,
      emissive: 0x290502
    });
    const poleMat = new THREE.MeshStandardMaterial({
      color: 0x0e1214, // Color3(0.055, 0.07, 0.08) floodlight metal
      roughness: 0.40,
      metalness: 0.65
    });

    // 1. Sky Dome & Clouds (radius 280)
    this._buildSkyAndClouds();

    // 2. Stadium Foundation: Box (width: 280, height: 1.5, depth: 280, y = -0.76)
    const fGeo = new THREE.BoxGeometry(280, 1.5, 280);
    const foundation = new THREE.Mesh(fGeo, standMat);
    foundation.position.set(0, -0.76, 0);
    foundation.receiveShadow = true;
    this.scene.add(foundation);

    // 3. Outfield: Disc (radius: 102, tessellation: 128, y = 0)
    const outfieldGeo = new THREE.CircleGeometry(102, 128);
    const outfield = new THREE.Mesh(outfieldGeo, grassMat);
    outfield.rotation.x = -Math.PI / 2;
    outfield.position.set(0, 0, 0);
    outfield.receiveShadow = true;
    this.scene.add(outfield);

    // 4. Lawn: Ground plane (width: 265, height: 265, y = -0.08)
    const lawnGeo = new THREE.PlaneGeometry(265, 265);
    const lawn = new THREE.Mesh(lawnGeo, grassAltMat);
    lawn.rotation.x = -Math.PI / 2;
    lawn.position.set(0, -0.08, 0);
    lawn.receiveShadow = true;
    this.scene.add(lawn);

    // 5. 15 Mowing Stripes: width 5.2, height 0.025, depth 190 at (i * 13.8, 0.01, 0)
    for (let i = -7; i <= 7; i++) {
      const stripeGeo = new THREE.BoxGeometry(5.2, 0.025, 190);
      const sMat = (i % 2 === 0) ? grassMat : grassAltMat;
      const stripe = new THREE.Mesh(stripeGeo, sMat);
      stripe.position.set(i * 13.8, 0.01, 0);
      stripe.rotation.y = (i % 2 === 0 ? 1 : -1) * 0.02;
      stripe.receiveShadow = true;
      this.scene.add(stripe);
    }

    // 6. Main Pitch: Box (width: 6.2, height: 0.24, depth: 26, y = 0.12)
    const pitchGeo = new THREE.BoxGeometry(6.2, 0.24, 26);
    const pitch = new THREE.Mesh(pitchGeo, clayMat);
    pitch.position.set(0, 0.12, 0);
    pitch.receiveShadow = true;
    this.scene.add(pitch);

    // 7. Raised Gold Boundary Rope: Torus (diameter: 192 -> radius: 96, thickness: 0.75, y = 0.16)
    const ropeGeo = new THREE.TorusGeometry(96, 0.375, 16, 128);
    const rope = new THREE.Mesh(ropeGeo, boundaryMat);
    rope.rotation.x = -Math.PI / 2;
    rope.position.set(0, 0.16, 0);
    this.scene.add(rope);

    // 8. 32 Boundary Markers: width 3.2, height 0.62, depth 1.25 at radius 96
    const markerGeo = new THREE.BoxGeometry(3.2, 0.62, 1.25);
    for (let i = 0; i < 32; i++) {
      const angle = (i / 32) * Math.PI * 2;
      const x = Math.cos(angle) * 96;
      const z = Math.sin(angle) * 96;
      const marker = new THREE.Mesh(markerGeo, boundaryMat);
      marker.position.set(x, 0.31, z);
      marker.rotation.y = -angle;
      this.scene.add(marker);
    }

    // 9. Crease Lines: at z = -13 and z = 13 (front crease width 6.5, return creases at x = -3.1, 3.1, depth 2.6)
    const frontCreaseGeo = new THREE.BoxGeometry(6.5, 0.03, 0.1);
    const retCreaseGeo = new THREE.BoxGeometry(0.1, 0.03, 2.6);
    [-13, 13].forEach(z => {
      const fc = new THREE.Mesh(frontCreaseGeo, whiteMat);
      fc.position.set(0, 0.25, z);
      this.scene.add(fc);

      [-3.1, 3.1].forEach(x => {
        const rc = new THREE.Mesh(retCreaseGeo, whiteMat);
        rc.position.set(x, 0.25, z);
        this.scene.add(rc);
      });
    });

    // 10. Wickets at z = -12.6 and z = 12.6 (wood stumps + white bails)
    this._buildWicket(-12.6, woodMat, whiteMat);
    this._buildWicket(12.6, woodMat, whiteMat);

    // 11. 4 Continuous Seating Decks: diameter (238 + t*22) -> radius (119 + t*11), thickness 10.5, y = 8.8 + t*2.5
    for (let t = 0; t < 4; t++) {
      const radius = (238 + t * 22) / 2;
      const deckGeo = new THREE.TorusGeometry(radius, 5.25, 16, 128);
      const deck = new THREE.Mesh(deckGeo, t % 2 ? tealMat : standMat);
      deck.rotation.x = -Math.PI / 2;
      deck.position.set(0, 8.8 + t * 2.5, 0);
      deck.receiveShadow = true;
      this.scene.add(deck);

      // Amber seating band: thickness 1.8, y = 10.7 + t*2.5
      const bandGeo = new THREE.TorusGeometry(radius, 0.9, 16, 128);
      const band = new THREE.Mesh(bandGeo, amberMat);
      band.rotation.x = -Math.PI / 2;
      band.position.set(0, 10.7 + t * 2.5, 0);
      this.scene.add(band);
    }

    // 12. North Grandstand: width 164, height 23, depth 34 at (0, 11.5, -132)
    const gsGeo = new THREE.BoxGeometry(164, 23, 34);
    const grandstand = new THREE.Mesh(gsGeo, standMat);
    grandstand.position.set(0, 11.5, -132);
    grandstand.receiveShadow = true;
    this.scene.add(grandstand);

    // Grandstand Glass: width 146, height 14, depth 2 at (0, 26.5, -116.5)
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x123847, // Color3(0.07, 0.22, 0.28)
      roughness: 0.10,
      metalness: 0.35,
      transparent: true,
      opacity: 0.48
    });
    const glassGeo = new THREE.BoxGeometry(146, 14, 2);
    const grandstandGlass = new THREE.Mesh(glassGeo, glassMat);
    grandstandGlass.position.set(0, 26.5, -116.5);
    this.scene.add(grandstandGlass);

    // 13. LED Scoreboard: width 118, height 28 at (0, 14.3, 116.1), facing pitch
    const sbMat = new THREE.MeshStandardMaterial({
      color: 0x1e2e24, // Color3(0.12, 0.18, 0.14)
      roughness: 0.20,
      emissive: 0x0a140a,
      emissiveIntensity: 0.8
    });
    const sbGeo = new THREE.BoxGeometry(118, 28, 1.5);
    const scoreboard = new THREE.Mesh(sbGeo, sbMat);
    scoreboard.position.set(0, 14.3, 116.1);
    this.scene.add(scoreboard);

    // Scoreboard glowing screen face
    const sbScreenGeo = new THREE.PlaneGeometry(114, 26);
    const sbScreenMat = new THREE.MeshBasicMaterial({ color: 0x00ff66 });
    const sbScreen = new THREE.Mesh(sbScreenGeo, sbScreenMat);
    sbScreen.position.set(0, 14.3, 115.3);
    sbScreen.rotation.y = Math.PI;
    this.scene.add(sbScreen);

    // 14. Stadium Title Signs
    this._buildSign("SUMMIT PARK", 64, 9, new THREE.Vector3(0, 31, -115), 0);
    this._buildSign("CROWN LEAGUE", 38, 6.5, new THREE.Vector3(-126.5, 43, 62), Math.PI / 2);
    this._buildSign("PLAY BOLD", 38, 6.5, new THREE.Vector3(126.5, 43, -62), -Math.PI / 2);

    // 15. 4 Floodlight Towers at corners: (-116,0,-82), (116,0,-82), (-116,0,88), (116,0,88)
    const amberLightColor = 0xffc752; // Color3(1, 0.78, 0.32)
    this._buildFloodlight(0, new THREE.Vector3(-116, 0, -82), poleMat, amberLightColor);
    this._buildFloodlight(1, new THREE.Vector3( 116, 0, -82), poleMat, amberLightColor);
    this._buildFloodlight(2, new THREE.Vector3(-116, 0,  88), poleMat, amberLightColor);
    this._buildFloodlight(3, new THREE.Vector3( 116, 0,  88), poleMat, amberLightColor);

    // 16. Audience: 10,000 instanced spectators across 20 rows x 500 sectors at radius 109+
    this._buildAudience();
  }

  _buildWicket(z, woodMat, whiteMat) {
    const stumpGeo = new THREE.CylinderGeometry(0.035, 0.035, 1.0, 10);
    const bailGeo = new THREE.BoxGeometry(0.28, 0.08, 0.08);

    [-0.22, 0, 0.22].forEach(x => {
      const stump = new THREE.Mesh(stumpGeo, woodMat);
      stump.position.set(x, 0.62, z);
      stump.castShadow = true;
      this.scene.add(stump);
    });

    const bailA = new THREE.Mesh(bailGeo, whiteMat);
    bailA.position.set(-0.11, 1.16, z);
    this.scene.add(bailA);

    const bailB = new THREE.Mesh(bailGeo, whiteMat);
    bailB.position.set(0.11, 1.16, z);
    this.scene.add(bailB);
  }

  _buildFloodlight(index, pos, poleMat, lightHex) {
    // 36m Pole (diameter: 0.95, height: 36)
    const poleGeo = new THREE.CylinderGeometry(0.475, 0.55, 36, 12);
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.set(pos.x, 18, pos.z);
    pole.castShadow = true;
    this.scene.add(pole);

    // 10.8m Horizontal Arm: width: 10.8, height: 0.75, depth: 1.8
    const armGeo = new THREE.BoxGeometry(10.8, 0.75, 1.8);
    const arm = new THREE.Mesh(armGeo, poleMat);
    arm.position.set(pos.x, 36.4, pos.z);
    this.scene.add(arm);

    // 9.2m Lamp Head: width: 9.2, height: 2.8, depth: 1.4
    const lampMat = new THREE.MeshStandardMaterial({ color: 0x06090c, roughness: 0.3 });
    const lampGeo = new THREE.BoxGeometry(9.2, 2.8, 1.4);
    const lamp = new THREE.Mesh(lampGeo, lampMat);
    lamp.position.set(pos.x, 37.8, pos.z);
    lamp.rotation.y = (index % 2 === 1 ? 0.1 : -0.1);
    this.scene.add(lamp);

    // Glowing face
    const glowFaceGeo = new THREE.PlaneGeometry(8.8, 2.5);
    const glowFaceMat = new THREE.MeshBasicMaterial({ color: 0xfffae0 });
    const glowFace = new THREE.Mesh(glowFaceGeo, glowFaceMat);
    glowFace.position.set(pos.x, 37.8, pos.z + (pos.z > 0 ? -0.72 : 0.72));
    glowFace.rotation.y = pos.z > 0 ? Math.PI : 0;
    this.scene.add(glowFace);

    // Real PointLight illuminating the ground
    const light = new THREE.PointLight(lightHex, 3.5, 240, 1.2);
    light.position.set(pos.x, 38, pos.z);
    this.scene.add(light);
  }

  _buildSign(text, width, height, position, rotationY) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#0a1014';
      ctx.fillRect(0, 0, 512, 128);
      ctx.fillStyle = '#f1cc72';
      ctx.font = 'bold 54px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 256, 64);
    }
    const texture = new THREE.CanvasTexture(canvas);
    const mat = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.3,
      emissive: 0x3d260a,
      emissiveIntensity: 0.6
    });
    const geo = new THREE.PlaneGeometry(width, height);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(position);
    mesh.rotation.y = rotationY;
    this.scene.add(mesh);
  }

  _buildAudience() {
    const colors = [0xd1a12e, 0x248594, 0x70a838, 0x526175, 0x9e3824, 0xc7bda3];
    const bodyGeo = new THREE.CylinderGeometry(0.36, 0.36, 1.22, 6);
    const headGeo = new THREE.SphereGeometry(0.29, 6, 6);

    colors.forEach(col => {
      const mat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.75 });
      const count = 150; // Instanced sample around the bowl
      const instancedBodies = new THREE.InstancedMesh(bodyGeo, mat, count);
      const instancedHeads = new THREE.InstancedMesh(headGeo, mat, count);

      const dummy = new THREE.Object3D();
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const row = Math.floor(Math.random() * 20);
        const radius = 109 + row * 1.65;
        const y = 10.6 + row * 0.7;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;

        dummy.position.set(x, y, z);
        dummy.rotation.y = -angle;
        dummy.updateMatrix();
        instancedBodies.setMatrixAt(i, dummy.matrix);

        dummy.position.set(x, y + 0.8, z);
        dummy.updateMatrix();
        instancedHeads.setMatrixAt(i, dummy.matrix);
      }
      instancedBodies.instanceMatrix.needsUpdate = true;
      instancedHeads.instanceMatrix.needsUpdate = true;
      this.scene.add(instancedBodies);
      this.scene.add(instancedHeads);
    });
  }

  _buildSkyAndClouds() {
    const skyGeo = new THREE.SphereGeometry(280, 32, 32);
    const skyMat = new THREE.MeshBasicMaterial({
      color: 0x06141a, // Dark atmospheric evening sky
      side: THREE.BackSide
    });
    const sky = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(sky);
  }

  update(delta) {
    // Ground update loop
  }
}