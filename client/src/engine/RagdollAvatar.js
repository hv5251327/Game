import * as THREE from 'three';

export class RagdollAvatar {
  constructor(scene, colorHex = '#2ed573', isLocal = false) {
    this.scene = scene;
    this.colorHex = colorHex;
    this.isLocal = isLocal;
    this.role = 'RUNNER'; // 'RUNNER' or 'HITTER'

    // Hierarchy nodes for procedural ragdoll physics & spine bending
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

    // Weapon / Stick prop
    this.stickMesh = null;
    this.materials = [];

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
    this.spinePitch = 0; // -1 (lean back) to +1 (duck forward)
    this.walkCycle = 0;
    this.isMoving = false;
    this.isDancing = false;
    this.verticalVelocity = 0;
    this.isOnGround = true;

    this.buildSmoothHumanFallFlatMesh();
    this.scene.add(this.root);
  }

  buildSmoothHumanFallFlatMesh() {
    // Human: Fall Flat style smooth rubbery/marshmallow material
    const skinMat = new THREE.MeshStandardMaterial({
      color: this.colorHex,
      roughness: 0.35,
      metalness: 0.05
    });
    this.skinMat = skinMat;
    this.materials.push(skinMat);

    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x8d5b36, roughness: 0.5 });
    const tapeMat = new THREE.MeshStandardMaterial({ color: 0xe0e0e0, roughness: 0.8 });

    // Helper for smooth capsules
    const createCapsule = (radius, length, mat) => {
      const geo = new THREE.CapsuleGeometry(radius, length, 12, 16);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      return mesh;
    };

    // Helper for smooth spheres
    const createSphere = (radius, mat) => {
      const geo = new THREE.SphereGeometry(radius, 20, 20);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      return mesh;
    };

    // --- 1. Pelvis / Hips (Root body base) ---
    const pelvisMesh = createSphere(0.26, skinMat);
    pelvisMesh.scale.set(1.1, 0.9, 1.0);
    this.pelvis.add(pelvisMesh);
    this.pelvis.position.y = 0.88;
    this.root.add(this.pelvis);

    // --- 2. Lower Spine (Flexible jelly joint) ---
    const spineLowerMesh = createCapsule(0.22, 0.16, skinMat);
    this.spineLower.add(spineLowerMesh);
    this.spineLower.position.y = 0.22;
    this.pelvis.add(this.spineLower);

    // --- 3. Chest / Torso ---
    const chestMesh = createCapsule(0.26, 0.26, skinMat);
    chestMesh.scale.set(1.15, 1.0, 0.95);
    this.chest.add(chestMesh);
    this.chest.position.y = 0.26;
    this.spineLower.add(this.chest);

    // --- 4. Neck & Smooth Marshmallow Head ---
    const neckMesh = createCapsule(0.1, 0.08, skinMat);
    this.neck.add(neckMesh);
    this.neck.position.y = 0.22;
    this.chest.add(this.neck);

    // Iconic round Human: Fall Flat head
    const headMesh = createSphere(0.28, skinMat);
    headMesh.scale.set(1.0, 1.08, 1.0);
    this.head.add(headMesh);
    this.head.position.y = 0.24;
    this.neck.add(this.head);

    // Cute Googly Eyes
    const eyeGeo = new THREE.SphereGeometry(0.045, 12, 12);
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.1, 0.04, 0.24);
    this.head.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.1, 0.04, 0.24);
    this.head.add(rightEye);

    // --- 5. Rubbery Arms & Hands ---
    const armRadius = 0.08;
    const armLength = 0.22;

    // Left Arm
    const leftUpper = createCapsule(armRadius, armLength, skinMat);
    leftUpper.position.y = -armLength / 2;
    this.leftUpperArm.add(leftUpper);
    this.leftUpperArm.position.set(-0.35, 0.12, 0);
    this.chest.add(this.leftUpperArm);

    const leftFore = createCapsule(armRadius * 0.9, armLength, skinMat);
    leftFore.position.y = -armLength / 2;
    this.leftForearm.add(leftFore);
    this.leftForearm.position.y = -armLength;
    this.leftUpperArm.add(this.leftForearm);

    const leftHandMesh = createSphere(0.09, skinMat);
    this.leftHand.add(leftHandMesh);
    this.leftHand.position.y = -armLength;
    this.leftForearm.add(this.leftHand);

    // Right Arm
    const rightUpper = createCapsule(armRadius, armLength, skinMat);
    rightUpper.position.y = -armLength / 2;
    this.rightUpperArm.add(rightUpper);
    this.rightUpperArm.position.set(0.35, 0.12, 0);
    this.chest.add(this.rightUpperArm);

    const rightFore = createCapsule(armRadius * 0.9, armLength, skinMat);
    rightFore.position.y = -armLength / 2;
    this.rightForearm.add(rightFore);
    this.rightForearm.position.y = -armLength;
    this.rightUpperArm.add(this.rightForearm);

    const rightHandMesh = createSphere(0.09, skinMat);
    this.rightHand.add(rightHandMesh);
    this.rightHand.position.y = -armLength;
    this.rightForearm.add(this.rightHand);

    // --- 6. Wooden Baseball Bat / Stick Weapon ---
    const stickGroup = new THREE.Group();

    // Handle with grip tape
    const handleMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.036, 0.32, 16), tapeMat);
    handleMesh.position.y = 0.16;
    stickGroup.add(handleMesh);

    // Barrel / Thick Wooden Bat Body
    const barrelMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.038, 0.85, 16), woodMat);
    barrelMesh.position.y = 0.72;
    barrelMesh.castShadow = true;
    stickGroup.add(barrelMesh);

    // Bat knob end
    const knobMesh = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 12), woodMat);
    knobMesh.position.y = 0.0;
    stickGroup.add(knobMesh);

    // Attach stick securely to right hand
    stickGroup.position.set(0.04, -0.05, 0.08);
    stickGroup.rotation.x = Math.PI / 2.2;
    stickGroup.rotation.z = -0.3;
    this.rightHand.add(stickGroup);
    this.stickMesh = stickGroup;
    this.stickMesh.visible = false; // Visible only when role is HITTER

    // --- 7. Rubbery Legs & Feet ---
    const legRadius = 0.095;
    const legLength = 0.28;

    // Left Leg
    const leftThighMesh = createCapsule(legRadius, legLength, skinMat);
    leftThighMesh.position.y = -legLength / 2;
    this.leftThigh.add(leftThighMesh);
    this.leftThigh.position.set(-0.16, -0.1, 0);
    this.pelvis.add(this.leftThigh);

    const leftCalfMesh = createCapsule(legRadius * 0.88, legLength, skinMat);
    leftCalfMesh.position.y = -legLength / 2;
    this.leftCalf.add(leftCalfMesh);
    this.leftCalf.position.y = -legLength;
    this.leftThigh.add(this.leftCalf);

    const leftFootMesh = createSphere(0.1, skinMat);
    leftFootMesh.scale.set(1.0, 0.7, 1.4);
    leftFootMesh.position.set(0, -0.06, 0.06);
    this.leftFoot.add(leftFootMesh);
    this.leftFoot.position.y = -legLength;
    this.leftCalf.add(this.leftFoot);

    // Right Leg
    const rightThighMesh = createCapsule(legRadius, legLength, skinMat);
    rightThighMesh.position.y = -legLength / 2;
    this.rightThigh.add(rightThighMesh);
    this.rightThigh.position.set(0.16, -0.1, 0);
    this.pelvis.add(this.rightThigh);

    const rightCalfMesh = createCapsule(legRadius * 0.88, legLength, skinMat);
    rightCalfMesh.position.y = -legLength / 2;
    this.rightCalf.add(rightCalfMesh);
    this.rightCalf.position.y = -legLength;
    this.rightThigh.add(this.rightCalf);

    const rightFootMesh = createSphere(0.1, skinMat);
    rightFootMesh.scale.set(1.0, 0.7, 1.4);
    rightFootMesh.position.set(0, -0.06, 0.06);
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
      this.swingProgress += delta * 6.5; // High speed responsive slapstick swing
      if (this.swingProgress >= Math.PI) {
        this.isSwingingBat = false;
        this.swingProgress = 0;
      }
    }

    // --- Action Poses & States ---

    // 1. Wipeout / Knocked Out (0 HP)
    if (!this.isAlive) {
      this.pelvis.position.y = 0.14;
      this.pelvis.rotation.x = -Math.PI / 2;
      this.spineLower.rotation.x = 0.2;
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
      this.spineLower.rotation.x = 0;
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
      this.spineLower.rotation.x = 0.12;
      this.leftThigh.rotation.x = -Math.PI / 2;
      this.rightThigh.rotation.x = -Math.PI / 2;
      this.leftCalf.rotation.x = Math.PI / 2;
      this.rightCalf.rotation.x = Math.PI / 2;
      this.leftUpperArm.rotation.set(0.3, 0, 0.2);
      this.rightUpperArm.rotation.set(0.3, 0, -0.2);
      return;
    }

    // 4. Crawl / Crouch (Lowers spine & pelvis to slide under dining/coffee tables)
    if (this.isCrawling) {
      this.pelvis.position.y = 0.42;
      this.pelvis.rotation.x = 0.45;
      this.spineLower.rotation.x = 0.6 + this.spinePitch * 0.4;
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
      this.pelvis.position.y = 0.88 + Math.abs(Math.sin(this.walkCycle)) * 0.16;
      this.spineLower.rotation.z = Math.sin(this.walkCycle) * 0.35;
      this.leftUpperArm.rotation.set(Math.PI - 0.4, 0, 0.6 + Math.sin(this.walkCycle) * 0.4);
      this.rightUpperArm.rotation.set(Math.PI - 0.4, 0, -0.6 - Math.sin(this.walkCycle) * 0.4);
      return;
    }

    // 6. Normal Standing & Spine Physics
    this.pelvis.position.y = 0.88;
    this.pelvis.rotation.x = 0;

    // Apply Spine Pitch / Tilt (Duck forward or bend backwards awkwardly)
    this.spineLower.rotation.x = this.spinePitch * 0.7;
    this.chest.rotation.x = this.spinePitch * 0.5;

    // 7. Panic Sprint Flail Animation (When hit by bat)
    if (this.isFlailing) {
      this.walkCycle += delta * 15.0; // Rapid wild arm flapping
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
    // 10. Default Walk Cycle or Idle
    else if (isMoving) {
      this.walkCycle += delta * 9.0;
      const legPhase = Math.sin(this.walkCycle);
      const armPhase = -legPhase;

      // Squishy rubbery walk bounce
      this.pelvis.position.y = 0.88 + Math.abs(Math.sin(this.walkCycle)) * 0.07;
      this.pelvis.rotation.y = legPhase * 0.12;

      // Legs swing
      this.leftThigh.rotation.x = legPhase * 0.75;
      this.rightThigh.rotation.x = -legPhase * 0.75;
      this.leftCalf.rotation.x = Math.max(0, -legPhase * 0.85);
      this.rightCalf.rotation.x = Math.max(0, legPhase * 0.85);

      // Floppy arms swing
      this.leftUpperArm.rotation.set(armPhase * 0.65, 0, 0.15);
      if (this.role === 'HITTER') {
        // Carry bat in right hand with ready stance
        this.rightUpperArm.rotation.set(0.5, -0.3, -0.2);
        this.rightForearm.rotation.set(-0.4, 0, 0);
      } else {
        this.rightUpperArm.rotation.set(-armPhase * 0.65, 0, -0.15);
        this.rightForearm.rotation.x = Math.max(0, -armPhase * 0.4);
      }
      this.leftForearm.rotation.x = Math.max(0, armPhase * 0.4);
    } else {
      // Idle marshmallow breathing wobble
      this.walkCycle += delta * 2.5;
      const breathe = Math.sin(this.walkCycle) * 0.03;
      this.pelvis.position.y = 0.88 + breathe;
      this.leftThigh.rotation.set(0, 0, 0.06);
      this.rightThigh.rotation.set(0, 0, -0.06);
      this.leftCalf.rotation.set(0, 0, 0);
      this.rightCalf.rotation.set(0, 0, 0);

      this.leftUpperArm.rotation.set(0.12, 0, 0.18);
      if (this.role === 'HITTER') {
        // Ready stance holding bat
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
