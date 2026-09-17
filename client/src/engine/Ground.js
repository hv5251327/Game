import * as THREE from 'three';

// Exact Summit Park Cricket Stadium in Three.js matching Babylon.js Scene Specification
export class Ground {
  constructor(scene) {
    this.scene = scene;
    this.clouds = [];
    this.build();
  }

  build() {
    // Brighter grass materials — significantly more illuminated for floodlit night match feel
    const grassMat = new THREE.MeshStandardMaterial({
      color: 0x2e7a38, // brighter green (was 0x1f4f2b)
      roughness: 0.80,
      metalness: 0.02,
      emissive: 0x0a1e0c,
      emissiveIntensity: 0.18
    });
    const grassAltMat = new THREE.MeshStandardMaterial({
      color: 0x3a8c40, // brighter alternate stripe (was 0x296130)
      roughness: 0.82,
      metalness: 0.02,
      emissive: 0x0c1e0e,
      emissiveIntensity: 0.16
    });
    const clayMat = new THREE.MeshStandardMaterial({
      color: 0xb8814a, // brighter tan clay (was 0x946433)
      roughness: 0.60,
      metalness: 0.04,
      emissive: 0x1a0e06,
      emissiveIntensity: 0.20
    });
    const whiteMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.20,
      emissive: 0x888888,
      emissiveIntensity: 0.55  // bright white so crease lines glow clearly
    });
    const boundaryMat = new THREE.MeshStandardMaterial({
      color: 0xf2c247,
      roughness: 0.35,
      emissive: 0x6b4800,
      emissiveIntensity: 0.5
    });
    const standMat = new THREE.MeshStandardMaterial({
      color: 0x1a2124,
      roughness: 0.78,
      metalness: 0.20
    });
    const tealMat = new THREE.MeshStandardMaterial({
      color: 0x0d4747,
      roughness: 0.72,
      metalness: 0.15
    });
    const amberMat = new THREE.MeshStandardMaterial({
      color: 0xb86114,
      roughness: 0.45,
      emissive: 0x4a2408,
      emissiveIntensity: 0.4
    });
    const woodMat = new THREE.MeshStandardMaterial({
      color: 0xad170d,
      roughness: 0.35,
      emissive: 0x500600,
      emissiveIntensity: 0.3
    });
    const poleMat = new THREE.MeshStandardMaterial({
      color: 0x0e1214,
      roughness: 0.40,
      metalness: 0.65
    });

    // 1. Sky Dome & Clouds (radius 280)
    this._buildSkyAndClouds();

    // 2. Stadium Foundation
    const fGeo = new THREE.BoxGeometry(280, 1.5, 280);
    const foundation = new THREE.Mesh(fGeo, standMat);
    foundation.position.set(0, -0.76, 0);
    foundation.receiveShadow = true;
    this.scene.add(foundation);

    // 3. Outfield: Disc (radius: 102)
    const outfieldGeo = new THREE.CircleGeometry(102, 128);
    const outfield = new THREE.Mesh(outfieldGeo, grassMat);
    outfield.rotation.x = -Math.PI / 2;
    outfield.position.set(0, 0, 0);
    outfield.receiveShadow = true;
    this.scene.add(outfield);

    // 4. Lawn: Ground plane
    const lawnGeo = new THREE.PlaneGeometry(265, 265);
    const lawn = new THREE.Mesh(lawnGeo, grassAltMat);
    lawn.rotation.x = -Math.PI / 2;
    lawn.position.set(0, -0.08, 0);
    lawn.receiveShadow = true;
    this.scene.add(lawn);

    // 5. 15 Mowing Stripes
    for (let i = -7; i <= 7; i++) {
      const stripeGeo = new THREE.BoxGeometry(5.2, 0.025, 190);
      const sMat = (i % 2 === 0) ? grassMat : grassAltMat;
      const stripe = new THREE.Mesh(stripeGeo, sMat);
      stripe.position.set(i * 13.8, 0.01, 0);
      stripe.rotation.y = (i % 2 === 0 ? 1 : -1) * 0.02;
      stripe.receiveShadow = true;
      this.scene.add(stripe);
    }

    // 6. Main Pitch
    const pitchGeo = new THREE.BoxGeometry(6.2, 0.24, 26);
    const pitch = new THREE.Mesh(pitchGeo, clayMat);
    pitch.position.set(0, 0.12, 0);
    pitch.receiveShadow = true;
    this.scene.add(pitch);

    // 7. Raised Gold Boundary Rope
    const ropeGeo = new THREE.TorusGeometry(96, 0.375, 16, 128);
    const rope = new THREE.Mesh(ropeGeo, boundaryMat);
    rope.rotation.x = -Math.PI / 2;
    rope.position.set(0, 0.16, 0);
    this.scene.add(rope);

    // 8. 32 Boundary Markers
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

    // 9. Crease Lines — clearly visible glowing white
    // Popping creases at z = ±11.4, bowling creases at z = ±13, return creases at x = ±3.1
    const popCreaseGeo = new THREE.BoxGeometry(9.0, 0.04, 0.12);  // wider than pitch to be clearly visible
    const bowlCreaseGeo = new THREE.BoxGeometry(7.6, 0.04, 0.12);
    const retCreaseGeo = new THREE.BoxGeometry(0.12, 0.04, 3.8);

    [-11.4, 11.4].forEach(z => {
      // Popping crease (batsman's crease)
      const pc = new THREE.Mesh(popCreaseGeo, whiteMat);
      pc.position.set(0, 0.25, z);
      this.scene.add(pc);
    });

    [-13, 13].forEach(z => {
      // Bowling crease
      const bc = new THREE.Mesh(bowlCreaseGeo, whiteMat);
      bc.position.set(0, 0.25, z);
      this.scene.add(bc);

      // Return creases (side lines)
      [-3.1, 3.1].forEach(x => {
        const rc = new THREE.Mesh(retCreaseGeo, whiteMat);
        rc.position.set(x, 0.25, z);
        this.scene.add(rc);
      });
    });

    // 10. Wide Lines on Pitch — white lines 1.0m outside return creases
    // In cricket, wide channels are ~0.9m outside off/leg stump
    const wideLineGeo = new THREE.BoxGeometry(0.08, 0.04, 26);
    [-4.5, 4.5].forEach(x => {
      const wl = new THREE.Mesh(wideLineGeo, whiteMat);
      wl.position.set(x, 0.26, 0);
      this.scene.add(wl);
    });

    // 11. Wickets at z = -12.6 and z = 12.6
    this._buildWicket(-12.6, woodMat, whiteMat);
    this._buildWicket(12.6, woodMat, whiteMat);

    // 12. 4 Continuous Seating Decks
    for (let t = 0; t < 4; t++) {
      const radius = (238 + t * 22) / 2;
      const deckGeo = new THREE.TorusGeometry(radius, 5.25, 16, 128);
      const deck = new THREE.Mesh(deckGeo, t % 2 ? tealMat : standMat);
      deck.rotation.x = -Math.PI / 2;
      deck.position.set(0, 8.8 + t * 2.5, 0);
      deck.receiveShadow = true;
      this.scene.add(deck);

      const bandGeo = new THREE.TorusGeometry(radius, 0.9, 16, 128);
      const band = new THREE.Mesh(bandGeo, amberMat);
      band.rotation.x = -Math.PI / 2;
      band.position.set(0, 10.7 + t * 2.5, 0);
      this.scene.add(band);
    }

    // 13. North Grandstand
    const gsGeo = new THREE.BoxGeometry(164, 23, 34);
    const grandstand = new THREE.Mesh(gsGeo, standMat);
    grandstand.position.set(0, 11.5, -132);
    grandstand.receiveShadow = true;
    this.scene.add(grandstand);

    // Grandstand Glass
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x123847,
      roughness: 0.10,
      metalness: 0.35,
      transparent: true,
      opacity: 0.48
    });
    const glassGeo = new THREE.BoxGeometry(146, 14, 2);
    const grandstandGlass = new THREE.Mesh(glassGeo, glassMat);
    grandstandGlass.position.set(0, 26.5, -116.5);
    this.scene.add(grandstandGlass);

    // 14. LED Scoreboard — dark screen with amber glow (NOT green)
    const sbMat = new THREE.MeshStandardMaterial({
      color: 0x1e2e24,
      roughness: 0.20,
      emissive: 0x0a140a,
      emissiveIntensity: 0.8
    });
    const sbGeo = new THREE.BoxGeometry(118, 28, 1.5);
    const scoreboard = new THREE.Mesh(sbGeo, sbMat);
    scoreboard.position.set(0, 14.3, 116.1);
    this.scene.add(scoreboard);

    // Scoreboard screen: dark amber (NOT bright green — was causing "green screen" bug)
    const sbScreenGeo = new THREE.PlaneGeometry(114, 26);
    const sbScreenMat = new THREE.MeshStandardMaterial({
      color: 0x0a0c08,
      roughness: 0.6,
      emissive: 0x1a2810,
      emissiveIntensity: 0.4
    });
    const sbScreen = new THREE.Mesh(sbScreenGeo, sbScreenMat);
    sbScreen.position.set(0, 14.3, 115.3);
    sbScreen.rotation.y = Math.PI;
    this.scene.add(sbScreen);

    // 15. Stadium Title Signs
    this._buildSign("SUMMIT PARK", 64, 9, new THREE.Vector3(0, 31, -115), 0);
    this._buildSign("CROWN LEAGUE", 38, 6.5, new THREE.Vector3(-126.5, 43, 62), Math.PI / 2);
    this._buildSign("PLAY BOLD", 38, 6.5, new THREE.Vector3(126.5, 43, -62), -Math.PI / 2);

    // 16. 4 Floodlight Towers at corners
    const amberLightColor = 0xffc752;
    this._buildFloodlight(0, new THREE.Vector3(-116, 0, -82), poleMat, amberLightColor);
    this._buildFloodlight(1, new THREE.Vector3( 116, 0, -82), poleMat, amberLightColor);
    this._buildFloodlight(2, new THREE.Vector3(-116, 0,  88), poleMat, amberLightColor);
    this._buildFloodlight(3, new THREE.Vector3( 116, 0,  88), poleMat, amberLightColor);

    // 17. Dense Audience: 10,000+ spectators filling the stands completely
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
    const poleGeo = new THREE.CylinderGeometry(0.475, 0.55, 36, 12);
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.set(pos.x, 18, pos.z);
    pole.castShadow = true;
    this.scene.add(pole);

    const armGeo = new THREE.BoxGeometry(10.8, 0.75, 1.8);
    const arm = new THREE.Mesh(armGeo, poleMat);
    arm.position.set(pos.x, 36.4, pos.z);
    this.scene.add(arm);

    const lampMat = new THREE.MeshStandardMaterial({ color: 0x06090c, roughness: 0.3 });
    const lampGeo = new THREE.BoxGeometry(9.2, 2.8, 1.4);
    const lamp = new THREE.Mesh(lampGeo, lampMat);
    lamp.position.set(pos.x, 37.8, pos.z);
    lamp.rotation.y = (index % 2 === 1 ? 0.1 : -0.1);
    this.scene.add(lamp);

    const glowFaceGeo = new THREE.PlaneGeometry(8.8, 2.5);
    const glowFaceMat = new THREE.MeshBasicMaterial({ color: 0xfffae0 });
    const glowFace = new THREE.Mesh(glowFaceGeo, glowFaceMat);
    glowFace.position.set(pos.x, 37.8, pos.z + (pos.z > 0 ? -0.72 : 0.72));
    glowFace.rotation.y = pos.z > 0 ? Math.PI : 0;
    this.scene.add(glowFace);

    // Brighter floodlight: intensity 6.0 (was 3.5) so the field is well-lit
    const light = new THREE.PointLight(lightHex, 6.0, 280, 1.0);
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
    // Dense crowd — 6 color groups × 300 instances = 1800 audience figures
    // Arranged in tight rows from radius 109 to 142 (covers all 4 deck tiers)
    const colors = [0xd1a12e, 0x248594, 0x70a838, 0x526175, 0x9e3824, 0xc7bda3,
                    0xe84040, 0x3040cc, 0xf0c040, 0x40c0a0, 0xb060b0, 0xe8a060];
    const bodyGeo = new THREE.CylinderGeometry(0.36, 0.36, 1.22, 6);
    const headGeo = new THREE.SphereGeometry(0.29, 6, 6);

    colors.forEach(col => {
      const mat = new THREE.MeshStandardMaterial({
        color: col,
        roughness: 0.75,
        emissive: new THREE.Color(col).multiplyScalar(0.18)
      });
      const count = 280;
      const instancedBodies = new THREE.InstancedMesh(bodyGeo, mat, count);
      const instancedHeads = new THREE.InstancedMesh(headGeo, mat, count);

      const dummy = new THREE.Object3D();
      for (let i = 0; i < count; i++) {
        // Distribute evenly around 360° to avoid gaps
        const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.04;
        const row = Math.floor(Math.random() * 28);
        const radius = 109 + row * 1.4;
        const y = 10.2 + row * 0.68;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;

        dummy.position.set(x, y, z);
        dummy.rotation.y = -angle;
        dummy.updateMatrix();
        instancedBodies.setMatrixAt(i, dummy.matrix);

        dummy.position.set(x, y + 0.78, z);
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
    // Slightly lighter deep-blue evening sky so the ground feels illuminated
    const skyGeo = new THREE.SphereGeometry(280, 32, 32);
    const skyMat = new THREE.MeshBasicMaterial({
      color: 0x091826,
      side: THREE.BackSide
    });
    const sky = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(sky);
  }

  update(delta) {
    // Ground update loop
  }
}