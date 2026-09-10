import * as THREE from 'three';

export class RagdollAvatar {
  constructor(scene, colorHex = '#f0f0f0', isLocal = false) {
    this.scene = scene;
    this.colorHex = colorHex || '#f0f0f0';
    this.isLocal = isLocal;
    this.role = 'RUNNER'; // 'RUNNER' or 'HITTER'

    // Hierarchy nodes for procedural ragdoll animation & spine pitch
    this.root = new THREE.Group();
    this.pelvis = new THREE.Group();
    this.torso = new THREE.Group();
    this.chest = new THREE.Group();
    this.neck = new THREE.Group();
    this.head = new THREE.Group();

    // Limbs
    this.leftUpperArm = new THREE.Group();
    this.leftForearm = new THREE.Group();
    this.leftHand = new THREE.Group();

    this.rightUpperArm = new THREE.Group();
    this.rightForearm = new THREE.Group();
    this.rightHand = new THREE.Group();

    this.leftThigh = new THREE.Group();
    this.leftCalf = new THREE.Group();
    this.leftFoot = new THREE.Group();

    this.rightThigh = new THREE.Group();
    this.rightCalf = new THREE.Group();
    this.rightFoot = new THREE.Group();

    // Stick / Bat weapon
    this.stickMesh = null;
    this.skinMat = null;
    this.hatMat = null;

    // State
    this.hp = 100;
    this.isAlive = true;
    this.isFlailing = false;
    this.flailTimer = 0;
    this.isFlatFlop = false;
    this.isCrawling = false;
    this.isSitting = false;
    this.isGrabbing = false;
    this.isSwingingBat = false;
    this.swingProgress = 0;
    this.spinePitch = 0;
    this.walkCycle = 0;
    this.isMoving = false;
    this.isDancing = false;
    this.verticalVelocity = 0;
    this.isOnGround = true;

    this.buildExactHumanFallFlatBob();
    this.scene.add(this.root);
  }

  buildExactHumanFallFlatBob() {
    // 1. Chalky Matte Clay Material (Exact Human: Fall Flat style)
    this.skinMat = new THREE.MeshStandardMaterial({
      color: this.colorHex,
      roughness: 0.82,
      metalness: 0.02
    });

    this.hatMat = new THREE.MeshStandardMaterial({
      color: 0xf5f5f5, // Soft chalky white cap
      roughness: 0.85,
      metalness: 0.02
    });

    const woodMat = new THREE.MeshStandardMaterial({ color: 0x8d5b36, roughness: 0.6 });
    const tapeMat = new THREE.MeshStandardMaterial({ color: 0xdedede, roughness: 0.9 });

    // --- 2. Pear-Shaped Torso & Pelvis ---
    // Lower belly & hips (plump pear shape)
    const bellyGeo = new THREE.SphereGeometry(0.32, 24, 24);
    const bellyMesh = new THREE.Mesh(bellyGeo, this.skinMat);
    bellyMesh.scale.set(1.15, 0.95, 1.05);
    bellyMesh.castShadow = true;
    bellyMesh.receiveShadow = true;
    this.pelvis.add(bellyMesh);
    this.pelvis.position.y = 0.82;
    this.root.add(this.pelvis);

    // Mid Torso (smooth blend upwards)
    const midGeo = new THREE.CylinderGeometry(0.24, 0.32, 0.28, 24);
    const midMesh = new THREE.Mesh(midGeo, this.skinMat);
    midMesh.position.y = 0.14;
    midMesh.castShadow = true;
    this.torso.add(midMesh);
    this.pelvis.add(this.torso);

    // Upper Chest & Shoulders
    const chestGeo = new THREE.SphereGeometry(0.25, 24, 24);
    const chestMesh = new THREE.Mesh(chestGeo, this.skinMat);
    chestMesh.scale.set(1.1, 0.85, 0.95);
    chestMesh.position.y = 0.24;
    chestMesh.castShadow = true;
    this.chest.add(chestMesh);
    this.torso.add(this.chest);

    // --- 3. Head & Iconic Cap / Hat ---
    const neckMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.1, 16), this.skinMat);
    neckMesh.position.y = 0.18;
    this.neck.add(neckMesh);
    this.chest.add(this.neck);

    // Smooth Featureless Egg Head (Human: Fall Flat style)
    const headGeo = new THREE.SphereGeometry(0.29, 24, 24);
    const headMesh = new THREE.Mesh(headGeo, this.skinMat);
    headMesh.scale.set(0.96, 1.08, 0.98);
    headMesh.position.y = 0.25;
    headMesh.castShadow = true;
    this.head.add(headMesh);
    this.neck.add(this.head);

    // Iconic Cap / Beanie (Dome + Rounded Brim)
    const hatGroup = new THREE.Group();

    // Cap Dome
    const capDome = new THREE.Mesh(new THREE.SphereGeometry(0.305, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), this.hatMat);
    capDome.scale.set(1.0, 0.95, 1.02);
    capDome.position.y = 0.08;
    hatGroup.add(capDome);

    // Cap Rim / Rolled Brim
    const brimGeo = new THREE.TorusGeometry(0.29, 0.045, 16, 32);
    const brimMesh = new THREE.Mesh(brimGeo, this.hatMat);
    brimMesh.rotation.x = Math.PI / 2;
    brimMesh.position.y = 0.08;
    brimMesh.castShadow = true;
    hatGroup.add(brimMesh);

    hatGroup.position.set(0, 0.27, 0);
    hatGroup.rotation.x = -0.05;
    this.head.add(hatGroup);

    // --- 4. Floppy Noodle Arms & Mitten Hands ---
    const armRadius = 0.085;
    const armLength = 0.22;

    const createArmSegment = (r1, r2, len) => {
      const geo = new THREE.CylinderGeometry(r2, r1, len, 16);
      const mesh = new THREE.Mesh(geo, this.skinMat);
      mesh.position.y = -len / 2;
      mesh.castShadow = true;
      return mesh;
    };

    // Left Arm
    const leftUpper = createArmSegment(armRadius * 1.05, armRadius * 0.95, armLength);
    this.leftUpperArm.add(leftUpper);
    this.leftUpperArm.position.set(-0.33, 0.16, 0);
    this.chest.add(this.leftUpperArm);

    const leftFore = createArmSegment(armRadius * 0.95, armRadius * 0.85, armLength);
    this.leftForearm.add(leftFore);
    this.leftForearm.position.y = -armLength;
    this.leftUpperArm.add(this.leftForearm);

    // Mitten hand
    const leftHandMesh = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 16), this.skinMat);
    leftHandMesh.scale.set(1.0, 1.2, 0.8);
    leftHandMesh.position.y = -0.05;
    this.leftHand.add(leftHandMesh);
    this.leftHand.position.y = -armLength;
    this.leftForearm.add(this.leftHand);

    // Right Arm
    const rightUpper = createArmSegment(armRadius * 1.05, armRadius * 0.95, armLength);
    this.rightUpperArm.add(rightUpper);
    this.rightUpperArm.position.set(0.33, 0.16, 0);
    this.chest.add(this.rightUpperArm);

    const rightFore = createArmSegment(armRadius * 0.95, armRadius * 0.85, armLength);
    this.rightForearm.add(rightFore);
    this.rightForearm.position.y = -armLength;
    this.rightUpperArm.add(this.rightForearm);

    // Mitten hand
    const rightHandMesh = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 16), this.skinMat);
    rightHandMesh.scale.set(1.0, 1.2, 0.8);
    rightHandMesh.position.y = -0.05;
    this.rightHand.add(rightHandMesh);
    this.rightHand.position.y = -armLength;
    this.rightForearm.add(this.rightHand);

    // --- 5. Wooden Baseball Bat / Stick Prop (Hitter) ---
    const stickGroup = new THREE.Group();

    const handleMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.32, 16), tapeMat);
    handleMesh.position.y = 0.16;
    stickGroup.add(handleMesh);

    const barrelMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.036, 0.85, 16), woodMat);
    barrelMesh.position.y = 0.72;
    barrelMesh.castShadow = true;
    stickGroup.add(barrelMesh);

    const knobMesh = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 12), woodMat);
    stickGroup.add(knobMesh);

    stickGroup.position.set(0.02, -0.06, 0.08);
    stickGroup.rotation.x = Math.PI / 2.2;
    stickGroup.rotation.z = -0.3;
    this.rightHand.add(stickGroup);
    this.stickMesh = stickGroup;
    this.stickMesh.visible = false;

    // --- 6. Stumpy Legs & Rounded Feet ---
    const legRadius = 0.105;
    const legLength = 0.26;

    // Left Leg
    const leftThighMesh = createArmSegment(legRadius, legRadius * 0.9, legLength);
    this.leftThigh.add(leftThighMesh);
    this.leftThigh.position.set(-0.16, -0.1, 0);
    this.pelvis.add(this.leftThigh);

    const leftCalfMesh = createArmSegment(legRadius * 0.9, legRadius * 0.8, legLength);
    this.leftCalf.add(leftCalfMesh);
    this.leftCalf.position.y = -legLength;
    this.leftThigh.add(this.leftCalf);

    // Soft rounded foot stump
    const leftFootMesh = new THREE.Mesh(new THREE.SphereGeometry(0.105, 16, 16), this.skinMat);
    leftFootMesh.scale.set(0.95, 0.75, 1.35);
    leftFootMesh.position.set(0, -0.05, 0.06);
    this.leftFoot.add(leftFootMesh);
    this.leftFoot.position.y = -legLength;
    this.leftCalf.add(this.leftFoot);

    // Right Leg
    const rightThighMesh = createArmSegment(legRadius, legRadius * 0.9, legLength);
    this.rightThigh.add(rightThighMesh);
    this.rightThigh.position.set(0.16, -0.1, 0);
    this.pelvis.add(this.rightThigh);

    const rightCalfMesh = createArmSegment(legRadius * 0.9, legRadius * 0.8, legLength);
    this.rightCalf.add(rightCalfMesh);
    this.rightCalf.position.y = -legLength;
    this.rightThigh.add(this.rightCalf);

    const rightFootMesh = new THREE.Mesh(new THREE.SphereGeometry(0.105, 16, 16), this.skinMat);
    rightFootMesh.scale.set(0.95, 0.75, 1.35);
    rightFootMesh.position.set(0, -0.05, 0.06);
    this.rightFoot.add(rightFootMesh);
    this.rightFoot.position.y = -legLength;
    this.rightCalf.add(this.rightFoot);
  }

  setRole(role) {
    this.role = role;
    if (this.stickMesh) {
      this.stickMesh.visible = (role === 'HITTER');
    }
  }

  setColor(colorHex) {
    this.colorHex = colorHex;
    if (this.skinMat) {
      this.skinMat.color.set(colorHex);
    }
  }

  triggerBatSwing() {
    if (this.isSwingingBat) return;
    this.isSwingingBat = true;
    this.swingProgress = 0;
  }

  updateAnimation(delta, isMoving = false) {
    this.isMoving = isMoving;

    // Handle bat swing animation
    if (this.isSwingingBat) {
      this.swingProgress += delta * 6.5;
      if (this.swingProgress >= Math.PI) {
        this.isSwingingBat = false;
        this.swingProgress = 0;
      }
    }

    // --- Action Poses & States ---

    // 1. Knocked Out Wipeout (0 HP)
    if (!this.isAlive) {
      this.pelvis.position.y = 0.14;
      this.pelvis.rotation.x = -Math.PI / 2;
      this.torso.rotation.x = 0.2;
      this.chest.rotation.z = 0.35;
      this.leftUpperArm.rotation.set(0.6, 0, 1.3);
      this.rightUpperArm.rotation.set(0.6, 0, -1.3);
      this.leftThigh.rotation.set(0.2, 0, 0.6);
      this.rightThigh.rotation.set(0.2, 0, -0.6);
      return;
    }

    // 2. Sleep / Flat Flop ('F' key - belly flop to slide under beds)
    if (this.isFlatFlop) {
      this.pelvis.position.y = 0.12;
      this.pelvis.rotation.x = -Math.PI / 2;
      this.torso.rotation.x = 0;
      this.chest.rotation.x = 0;
      this.head.rotation.x = 0.35;
      this.leftUpperArm.rotation.set(Math.PI - 0.2, 0, 0.4);
      this.rightUpperArm.rotation.set(Math.PI - 0.2, 0, -0.4);
      this.leftThigh.rotation.set(0, 0, 0.25);
      this.rightThigh.rotation.set(0, 0, -0.25);
      return;
    }

    // 3. Sit ('C' key)
    if (this.isSitting) {
      this.pelvis.position.y = 0.46;
      this.pelvis.rotation.x = 0;
      this.torso.rotation.x = 0.12;
      this.leftThigh.rotation.x = -Math.PI / 2;
      this.rightThigh.rotation.x = -Math.PI / 2;
      this.leftCalf.rotation.x = Math.PI / 2;
      this.rightCalf.rotation.x = Math.PI / 2;
      this.leftUpperArm.rotation.set(0.3, 0, 0.2);
      this.rightUpperArm.rotation.set(0.3, 0, -0.2);
      return;
    }

    // 4. Crawl / Crouch (Lowers spine & pelvis under tables)
    if (this.isCrawling) {
      this.pelvis.position.y = 0.42;
      this.pelvis.rotation.x = 0.45;
      this.torso.rotation.x = 0.6 + this.spinePitch * 0.4;
      this.leftThigh.rotation.x = -0.85;
      this.rightThigh.rotation.x = -0.85;
      this.leftCalf.rotation.x = 1.05;
      this.rightCalf.rotation.x = 1.05;

      if (isMoving) {
        this.walkCycle += delta * 7.5;
        const crawlArm = Math.sin(this.walkCycle);
        this.leftUpperArm.rotation.x = crawlArm * 0.7 + 0.5;
        this.rightUpperArm.rotation.x = -crawlArm * 0.7 + 0.5;
      }
      return;
    }

    // 5. Victory Dance
    if (this.isDancing) {
      this.walkCycle += delta * 9.0;
      this.pelvis.position.y = 0.82 + Math.abs(Math.sin(this.walkCycle)) * 0.16;
      this.torso.rotation.z = Math.sin(this.walkCycle) * 0.35;
      this.leftUpperArm.rotation.set(Math.PI - 0.4, 0, 0.6 + Math.sin(this.walkCycle) * 0.4);
      this.rightUpperArm.rotation.set(Math.PI - 0.4, 0, -0.6 - Math.sin(this.walkCycle) * 0.4);
      return;
    }

    // 6. Normal Standing & Spine Physics
    this.pelvis.position.y = 0.82;
    this.pelvis.rotation.x = 0;

    // Apply Spine Pitch / Tilt (Duck forward or bend backwards awkwardly)
    this.torso.rotation.x = this.spinePitch * 0.7;
    this.chest.rotation.x = this.spinePitch * 0.5;

    // 7. Panic Sprint Flail Animation (When hit by bat)
    if (this.isFlailing) {
      this.walkCycle += delta * 15.0;
      const flailPhase = Math.sin(this.walkCycle);
      const flailSide = Math.cos(this.walkCycle * 0.8);

      // Arms flapped high into the air
      this.leftUpperArm.rotation.x = Math.PI - 0.2 + flailPhase * 0.6;
      this.leftUpperArm.rotation.z = 0.5 + flailSide * 0.6;
      this.leftForearm.rotation.x = flailPhase * 0.9;

      this.rightUpperArm.rotation.x = Math.PI - 0.2 - flailPhase * 0.6;
      this.rightUpperArm.rotation.z = -0.5 - flailSide * 0.6;
      this.rightForearm.rotation.x = -flailPhase * 0.9;

      this.head.rotation.y = Math.sin(this.walkCycle * 1.5) * 0.5;
      this.head.rotation.x = -0.3;
    }
    // 8. Bat Swing Action (Hitter)
    else if (this.isSwingingBat) {
      const swing = Math.sin(this.swingProgress);
      this.rightUpperArm.rotation.set(0.3, -swing * 2.2 + 0.6, -swing * 1.4);
      this.rightForearm.rotation.set(0, -swing * 1.6, 0);
      this.chest.rotation.y = -swing * 0.9;
      this.leftUpperArm.rotation.set(-0.3, 0, 0.4);
    }
    // 9. Grab / Reach forward ('E' key)
    else if (this.isGrabbing) {
      this.leftUpperArm.rotation.set(Math.PI / 2, 0, 0.1);
      this.rightUpperArm.rotation.set(Math.PI / 2, 0, -0.1);
      this.leftForearm.rotation.set(0, 0, 0);
      this.rightForearm.rotation.set(0, 0, 0);
    }
    // 10. Default Floppy Walk Cycle or Idle
    else if (isMoving) {
      this.walkCycle += delta * 9.0;
      const legPhase = Math.sin(this.walkCycle);
      const armPhase = -legPhase;

      // Squishy rubbery walk bounce
      this.pelvis.position.y = 0.82 + Math.abs(Math.sin(this.walkCycle)) * 0.08;
      this.pelvis.rotation.y = legPhase * 0.12;

      // Legs swing
      this.leftThigh.rotation.x = legPhase * 0.75;
      this.rightThigh.rotation.x = -legPhase * 0.75;
      this.leftCalf.rotation.x = Math.max(0, -legPhase * 0.85);
      this.rightCalf.rotation.x = Math.max(0, legPhase * 0.85);

      // Floppy arms swing
      this.leftUpperArm.rotation.set(armPhase * 0.65, 0, 0.18);
      if (this.role === 'HITTER') {
        this.rightUpperArm.rotation.set(0.5, -0.3, -0.2);
        this.rightForearm.rotation.set(-0.4, 0, 0);
      } else {
        this.rightUpperArm.rotation.set(-armPhase * 0.65, 0, -0.18);
        this.rightForearm.rotation.x = Math.max(0, -armPhase * 0.4);
      }
      this.leftForearm.rotation.x = Math.max(0, armPhase * 0.4);
    } else {
      // Idle marshmallow breathing wobble
      this.walkCycle += delta * 2.5;
      const breathe = Math.sin(this.walkCycle) * 0.03;
      this.pelvis.position.y = 0.82 + breathe;
      this.leftThigh.rotation.set(0, 0, 0.06);
      this.rightThigh.rotation.set(0, 0, -0.06);
      this.leftCalf.rotation.set(0, 0, 0);
      this.rightCalf.rotation.set(0, 0, 0);

      this.leftUpperArm.rotation.set(0.12, 0, 0.18);
      if (this.role === 'HITTER') {
        this.rightUpperArm.rotation.set(0.5, -0.3, -0.2);
        this.rightForearm.rotation.set(-0.4, 0, 0);
      } else {
        this.rightUpperArm.rotation.set(0.12, 0, -0.18);
        this.rightForearm.rotation.set(0.1, 0, 0);
      }
      this.leftForearm.rotation.set(0.1, 0, 0);
    }
  }

  destroy() {
    this.scene.remove(this.root);
  }
}
