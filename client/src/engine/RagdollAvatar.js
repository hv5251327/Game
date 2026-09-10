import * as THREE from 'three';

export class RagdollAvatar {
  constructor(scene, colorHex = '#2ed573', isLocal = false) {
    this.scene = scene;
    this.colorHex = colorHex;
    this.isLocal = isLocal;
    this.role = 'RUNNER'; // 'RUNNER' or 'HITTER'

    // Hierarchy nodes
    this.root = new THREE.Group();
    this.pelvis = new THREE.Group();
    this.spineLower = new THREE.Group();
    this.spineUpper = new THREE.Group();
    this.chest = new THREE.Group();
    this.neck = new THREE.Group();
    this.head = new THREE.Group();

    // Limbs
    this.leftUpperArm = new THREE.Group();
    this.leftForearm = new THREE.Group();
    this.rightUpperArm = new THREE.Group();
    this.rightForearm = new THREE.Group();

    this.leftThigh = new THREE.Group();
    this.leftCalf = new THREE.Group();
    this.rightThigh = new THREE.Group();
    this.rightCalf = new THREE.Group();

    // Bat prop
    this.batMesh = null;

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
    this.spinePitch = 0; // -1 (lean back) to +1 (lean forward / duck)
    this.walkCycle = 0;
    this.isMoving = false;
    this.isDancing = false;

    this.buildRagdollMesh();
    this.scene.add(this.root);
  }

  buildRagdollMesh() {
    const skinMat = new THREE.MeshStandardMaterial({
      color: this.colorHex,
      roughness: 0.5,
      metalness: 0.05
    });

    const eyeWhiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const pupilMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    const shoeMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.8 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x8d6e63, roughness: 0.4 });

    // --- 1. Pelvis / Hips ---
    const pelvisMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.2, 0.22, 16), skinMat);
    this.pelvis.add(pelvisMesh);
    this.pelvis.position.y = 0.85;
    this.root.add(this.pelvis);

    // --- 2. Spine Lower ---
    const spineLowerMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.2, 16), skinMat);
    this.spineLower.add(spineLowerMesh);
    this.spineLower.position.y = 0.18;
    this.pelvis.add(this.spineLower);

    // --- 3. Spine Upper & Chest ---
    const chestMesh = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.28), skinMat);
    this.chest.add(chestMesh);
    this.chest.position.y = 0.24;
    this.spineLower.add(this.chest);

    // --- 4. Neck & Comical Head ---
    const neckMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.12, 12), skinMat);
    this.neck.add(neckMesh);
    this.neck.position.y = 0.22;
    this.chest.add(this.neck);

    const headGeo = new THREE.SphereGeometry(0.26, 16, 16);
    const headMesh = new THREE.Mesh(headGeo, skinMat);
    this.head.add(headMesh);
    this.head.position.y = 0.2;
    this.neck.add(this.head);

    // Googly Eyes (Slapstick cartoon eyes)
    const eyeGeo = new THREE.SphereGeometry(0.07, 12, 12);
    const pupilGeo = new THREE.SphereGeometry(0.035, 12, 12);

    const leftEye = new THREE.Mesh(eyeGeo, eyeWhiteMat);
    leftEye.position.set(-0.09, 0.05, 0.22);
    const leftPupil = new THREE.Mesh(pupilGeo, pupilMat);
    leftPupil.position.set(0, 0, 0.05);
    leftEye.add(leftPupil);
    this.head.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeo, eyeWhiteMat);
    rightEye.position.set(0.09, 0.05, 0.22);
    const rightPupil = new THREE.Mesh(pupilGeo, pupilMat);
    rightPupil.position.set(0, 0, 0.05);
    rightEye.add(rightPupil);
    this.head.add(rightEye);

    // --- 5. Rubbery Floppy Arms ---
    const armGeo = new THREE.CylinderGeometry(0.07, 0.065, 0.32, 12);
    const handGeo = new THREE.SphereGeometry(0.08, 12, 12);

    // Left Arm
    const leftUpperMesh = new THREE.Mesh(armGeo, skinMat);
    leftUpperMesh.position.y = -0.16;
    this.leftUpperArm.add(leftUpperMesh);
    this.leftUpperArm.position.set(-0.32, 0.1, 0);
    this.chest.add(this.leftUpperArm);

    const leftForeMesh = new THREE.Mesh(armGeo, skinMat);
    leftForeMesh.position.y = -0.16;
    this.leftForearm.add(leftForeMesh);
    const leftHand = new THREE.Mesh(handGeo, skinMat);
    leftHand.position.y = -0.32;
    this.leftForearm.add(leftHand);
    this.leftForearm.position.y = -0.32;
    this.leftUpperArm.add(this.leftForearm);

    // Right Arm
    const rightUpperMesh = new THREE.Mesh(armGeo, skinMat);
    rightUpperMesh.position.y = -0.16;
    this.rightUpperArm.add(rightUpperMesh);
    this.rightUpperArm.position.set(0.32, 0.1, 0);
    this.chest.add(this.rightUpperArm);

    const rightForeMesh = new THREE.Mesh(armGeo, skinMat);
    rightForeMesh.position.y = -0.16;
    this.rightForearm.add(rightForeMesh);
    const rightHand = new THREE.Mesh(handGeo, skinMat);
    rightHand.position.y = -0.32;
    this.rightForearm.add(rightHand);
    this.rightForearm.position.y = -0.32;
    this.rightUpperArm.add(this.rightForearm);

    // --- 6. Wooden Baseball Bat (attached to Right Hand for Hitter) ---
    const batGroup = new THREE.Group();
    const handleGeo = new THREE.CylinderGeometry(0.03, 0.035, 0.3, 12);
    const handle = new THREE.Mesh(handleGeo, woodMat);
    handle.position.y = 0.15;
    batGroup.add(handle);

    const barrelGeo = new THREE.CylinderGeometry(0.065, 0.035, 0.8, 12);
    const barrel = new THREE.Mesh(barrelGeo, woodMat);
    barrel.position.y = 0.7;
    barrel.castShadow = true;
    batGroup.add(barrel);

    batGroup.position.set(0, -0.32, 0.05);
    batGroup.rotation.x = Math.PI / 2;
    batGroup.rotation.z = -0.2;
    this.rightForearm.add(batGroup);
    this.batMesh = batGroup;
    this.batMesh.visible = false; // Hidden until Hitter role assigned

    // --- 7. Legs & Shoes ---
    const legGeo = new THREE.CylinderGeometry(0.085, 0.075, 0.4, 12);
    const shoeGeo = new THREE.BoxGeometry(0.14, 0.1, 0.24);

    // Left Leg
    const leftThighMesh = new THREE.Mesh(legGeo, skinMat);
    leftThighMesh.position.y = -0.2;
    this.leftThigh.add(leftThighMesh);
    this.leftThigh.position.set(-0.16, -0.1, 0);
    this.pelvis.add(this.leftThigh);

    const leftCalfMesh = new THREE.Mesh(legGeo, skinMat);
    leftCalfMesh.position.y = -0.2;
    this.leftCalf.add(leftCalfMesh);
    const leftShoe = new THREE.Mesh(shoeGeo, shoeMat);
    leftShoe.position.set(0, -0.42, 0.05);
    this.leftCalf.add(leftShoe);
    this.leftCalf.position.y = -0.4;
    this.leftThigh.add(this.leftCalf);

    // Right Leg
    const rightThighMesh = new THREE.Mesh(legGeo, skinMat);
    rightThighMesh.position.y = -0.2;
    this.rightThigh.add(rightThighMesh);
    this.rightThigh.position.set(0.16, -0.1, 0);
    this.pelvis.add(this.rightThigh);

    const rightCalfMesh = new THREE.Mesh(legGeo, skinMat);
    rightCalfMesh.position.y = -0.2;
    this.rightCalf.add(rightCalfMesh);
    const rightShoe = new THREE.Mesh(shoeGeo, shoeMat);
    rightShoe.position.set(0, -0.42, 0.05);
    this.rightCalf.add(rightShoe);
    this.rightCalf.position.y = -0.4;
    this.rightThigh.add(this.rightCalf);
  }

  setRole(role) {
    this.role = role;
    if (this.batMesh) {
      this.batMesh.visible = (role === 'HITTER');
    }
  }

  setColor(colorHex) {
    this.colorHex = colorHex;
    this.root.traverse(child => {
      if (child.isMesh && child.material && child.material.color && child !== this.batMesh) {
        // Keep eyes & shoes separate
        if (child.geometry && child.geometry.type === 'BoxGeometry' && child.position.y === -0.42) return;
        if (child.material.color.getHex() === 0xffffff || child.material.color.getHex() === 0x111111) return;
        child.material.color.set(colorHex);
      }
    });
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
      this.swingProgress += delta * 4.5; // Fast slapstick swing
      if (this.swingProgress >= Math.PI) {
        this.isSwingingBat = false;
        this.swingProgress = 0;
      }
    }

    // --- State Poses ---

    // 1. Wipeout / Knocked Out (0 HP)
    if (!this.isAlive) {
      this.pelvis.position.y = 0.15;
      this.pelvis.rotation.x = -Math.PI / 2;
      this.spineLower.rotation.x = 0.2;
      this.chest.rotation.z = 0.3;
      this.leftUpperArm.rotation.set(0.5, 0, 1.2);
      this.rightUpperArm.rotation.set(0.5, 0, -1.2);
      this.leftThigh.rotation.set(0.2, 0, 0.5);
      this.rightThigh.rotation.set(0.2, 0, -0.5);
      return;
    }

    // 2. Sleep / Flat Flop ('F' key - full belly flop on ground/mattress)
    if (this.isFlatFlop) {
      this.pelvis.position.y = 0.12;
      this.pelvis.rotation.x = -Math.PI / 2;
      this.spineLower.rotation.x = 0;
      this.chest.rotation.x = 0;
      this.head.rotation.x = 0.3;
      this.leftUpperArm.rotation.set(Math.PI - 0.2, 0, 0.3);
      this.rightUpperArm.rotation.set(Math.PI - 0.2, 0, -0.3);
      this.leftThigh.rotation.set(0, 0, 0.2);
      this.rightThigh.rotation.set(0, 0, -0.2);
      return;
    }

    // 3. Sit ('C' key)
    if (this.isSitting) {
      this.pelvis.position.y = 0.45;
      this.pelvis.rotation.x = 0;
      this.spineLower.rotation.x = 0.1;
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
      this.pelvis.rotation.x = 0.4;
      this.spineLower.rotation.x = 0.5 + this.spinePitch * 0.4;
      this.leftThigh.rotation.x = -0.8;
      this.rightThigh.rotation.x = -0.8;
      this.leftCalf.rotation.x = 1.0;
      this.rightCalf.rotation.x = 1.0;

      if (isMoving) {
        this.walkCycle += delta * 7.0;
        const crawlArm = Math.sin(this.walkCycle);
        this.leftUpperArm.rotation.x = crawlArm * 0.6 + 0.5;
        this.rightUpperArm.rotation.x = -crawlArm * 0.6 + 0.5;
      }
      return;
    }

    // 5. Victory Dance
    if (this.isDancing) {
      this.walkCycle += delta * 8.0;
      this.pelvis.position.y = 0.85 + Math.abs(Math.sin(this.walkCycle)) * 0.15;
      this.spineLower.rotation.z = Math.sin(this.walkCycle) * 0.3;
      this.leftUpperArm.rotation.set(Math.PI - 0.4, 0, 0.6 + Math.sin(this.walkCycle) * 0.4);
      this.rightUpperArm.rotation.set(Math.PI - 0.4, 0, -0.6 - Math.sin(this.walkCycle) * 0.4);
      return;
    }

    // 6. Normal Standing & Spine Physics
    this.pelvis.position.y = 0.85;
    this.pelvis.rotation.x = 0;

    // Apply Spine Pitch / Tilt (duck forward or lean backward)
    this.spineLower.rotation.x = this.spinePitch * 0.6;
    this.chest.rotation.x = this.spinePitch * 0.4;

    // 7. Panic Sprint Flail Animation (When hit by bat)
    if (this.isFlailing) {
      this.walkCycle += delta * 14.0; // High speed frantic flapping
      const flailPhase = Math.sin(this.walkCycle);
      const flailSide = Math.cos(this.walkCycle * 0.8);

      // Arms flapped high into the air
      this.leftUpperArm.rotation.x = Math.PI - 0.2 + flailPhase * 0.5;
      this.leftUpperArm.rotation.z = 0.5 + flailSide * 0.6;
      this.leftForearm.rotation.x = flailPhase * 0.8;

      this.rightUpperArm.rotation.x = Math.PI - 0.2 - flailPhase * 0.5;
      this.rightUpperArm.rotation.z = -0.5 - flailSide * 0.6;
      this.rightForearm.rotation.x = -flailPhase * 0.8;

      this.head.rotation.y = Math.sin(this.walkCycle * 1.5) * 0.4;
      this.head.rotation.x = -0.3;
    }
    // 8. Bat Swing Action (Hitter)
    else if (this.isSwingingBat) {
      const swing = Math.sin(this.swingProgress);
      this.rightUpperArm.rotation.set(0.4, -swing * 1.8 + 0.5, -swing * 1.2);
      this.rightForearm.rotation.set(0, -swing * 1.4, 0);
      this.chest.rotation.y = -swing * 0.8;
      this.leftUpperArm.rotation.set(-0.3, 0, 0.4);
    }
    // 9. Grab / Reach forward ('E' key)
    else if (this.isGrabbing) {
      this.leftUpperArm.rotation.set(Math.PI / 2, 0, 0.1);
      this.rightUpperArm.rotation.set(Math.PI / 2, 0, -0.1);
      this.leftForearm.rotation.set(0, 0, 0);
      this.rightForearm.rotation.set(0, 0, 0);
    }
    // 10. Default Walk Cycle or Idle
    else if (isMoving) {
      this.walkCycle += delta * 9.0;
      const legPhase = Math.sin(this.walkCycle);
      const armPhase = -legPhase;

      // Squishy bouncy walk
      this.pelvis.position.y = 0.85 + Math.abs(Math.sin(this.walkCycle)) * 0.06;
      this.pelvis.rotation.y = legPhase * 0.1;

      // Legs swing
      this.leftThigh.rotation.x = legPhase * 0.7;
      this.rightThigh.rotation.x = -legPhase * 0.7;
      this.leftCalf.rotation.x = Math.max(0, -legPhase * 0.8);
      this.rightCalf.rotation.x = Math.max(0, legPhase * 0.8);

      // Floppy arms swing
      this.leftUpperArm.rotation.set(armPhase * 0.6, 0, 0.15);
      this.rightUpperArm.rotation.set(-armPhase * 0.6, 0, -0.15);
      this.leftForearm.rotation.x = Math.max(0, armPhase * 0.4);
      this.rightForearm.rotation.x = Math.max(0, -armPhase * 0.4);
    } else {
      // Idle breathing wobble
      this.walkCycle += delta * 2.0;
      const breathe = Math.sin(this.walkCycle) * 0.03;
      this.pelvis.position.y = 0.85 + breathe;
      this.leftThigh.rotation.set(0, 0, 0.05);
      this.rightThigh.rotation.set(0, 0, -0.05);
      this.leftCalf.rotation.set(0, 0, 0);
      this.rightCalf.rotation.set(0, 0, 0);

      this.leftUpperArm.rotation.set(0.1, 0, 0.15);
      this.rightUpperArm.rotation.set(0.1, 0, -0.15);
      this.leftForearm.rotation.set(0.1, 0, 0);
      this.rightForearm.rotation.set(0.1, 0, 0);
    }
  }

  destroy() {
    this.scene.remove(this.root);
  }
}
