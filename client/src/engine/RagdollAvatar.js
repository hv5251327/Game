import * as THREE from 'three';

export const CHARACTER_SPEC = {
  meta: {
    id: "blobby-fallflat-01-smooth",
    name: "Blobby (Smooth Clay)",
    style: "human-fall-flat",
    version: "1.1.0",
    units: "meters",
    rotationOrder: "XYZ",
    howToUse: "To achieve the seamless look from the reference image, DO NOT render the primitives as separate hard objects. Instead, use these primitives to generate an SDF (Signed Distance Field) with a smooth minimum (smin) blend, OR use this skeleton to deform a single, continuous, unified Skinned Mesh. The 'blendRadius' defines the thickness of the smooth clay layer connecting the joints."
  },
  appearance: {
    skinColor: "#F7F8FA",
    capColor: "#F7F8FA",
    roughness: 0.55,
    metalness: 0,
    clearcoat: 0.1,
    clearcoatRoughness: 0.6,
    sheen: 0.4,
    sheenColor: "#FFFFFF",
    renderStyle: "seamless_smooth_union",
    blendRadius: 0.08
  },
  proportions: {
    totalHeight: 1.691,
    hipHeight: 0.781,
    headRadius: 0.33,
    capRadius: 0.347,
    torsoRadius: 0.255,
    torsoLength: 0.3,
    neckRadius: 0.16,
    shoulderX: 0.28,
    shoulderY: 0.24,
    upperArmLength: 0.34,
    lowerArmLength: 0.3,
    armRadius: 0.098,
    handRadius: 0.108,
    upperLegLength: 0.37,
    lowerLegLength: 0.33,
    legRadius: 0.118,
    footRadius: 0.112,
    hipSpread: 0.13,
    jointRadius: 0.103,
    pelvisRadius: 0.2
  },
  skeleton: {
    root: {
      parent: null,
      position: [0, 0, 0],
      restRotation: [0, 0, 0],
      note: "World feet origin. Character faces local -Z."
    },
    hips: {
      parent: "root",
      position: [0, 0.781, 0],
      restRotation: [0, 0, 0],
      note: "Root of the body. bodyY animation is added to this Y."
    },
    spine: {
      parent: "hips",
      position: [0, 0.08, 0],
      restRotation: [0, 0, 0],
      note: "Torso twist / lean."
    },
    chest: {
      parent: "spine",
      position: [0, 0.22, 0],
      restRotation: [0, 0, 0],
      note: "Shoulder girdle."
    },
    neck: {
      parent: "chest",
      position: [0, 0.28, 0],
      restRotation: [0, 0, 0],
      note: "Short stub, visually swallowed by head + torso overlap."
    },
    head: {
      parent: "neck",
      position: [0, 0.08, 0],
      restRotation: [0, 0, 0],
      note: "No face. Slight egg scale (1, 1.08, 0.98)."
    },
    cap: {
      parent: "head",
      position: [0, 0.0594, 0],
      restRotation: [0, 0, 0],
      note: "Beanie crown + brim torus."
    },
    leftShoulder: {
      parent: "chest",
      position: [-0.28, 0.02, 0],
      restRotation: [0.08, 0.05, 0.38],
      note: "Z positive swings the left arm out (+X). X positive swings forward (−Z)."
    },
    leftElbow: {
      parent: "leftShoulder",
      position: [0, -0.34, 0],
      restRotation: [0.22, 0, 0],
      note: "X positive bends the elbow (forearm toward +Z / chest)."
    },
    leftHand: {
      parent: "leftElbow",
      position: [0, -0.3, 0],
      restRotation: [0, 0, 0],
      note: "Mitten ball. No fingers."
    },
    rightShoulder: {
      parent: "chest",
      position: [0.28, 0.02, 0],
      restRotation: [0.08, -0.05, -0.38],
      note: "Z negative swings the right arm out (−X)."
    },
    rightElbow: {
      parent: "rightShoulder",
      position: [0, -0.34, 0],
      restRotation: [0.22, 0, 0],
      note: "X positive bends the elbow."
    },
    rightHand: {
      parent: "rightElbow",
      position: [0, -0.3, 0],
      restRotation: [0, 0, 0],
      note: "Mitten ball. No fingers."
    },
    leftHip: {
      parent: "hips",
      position: [-0.13, -0.02, 0],
      restRotation: [0.04, 0, 0.06],
      note: "X positive swings the leg forward (−Z). Z positive swings out."
    },
    leftKnee: {
      parent: "leftHip",
      position: [0, -0.37, 0],
      restRotation: [-0.12, 0, 0],
      note: "X positive bends the knee backward (+Z relative when hanging)."
    },
    leftFoot: {
      parent: "leftKnee",
      position: [0, -0.33, 0],
      restRotation: [0, 0, 0],
      note: "Flattened sphere."
    },
    rightHip: {
      parent: "hips",
      position: [0.13, -0.02, 0],
      restRotation: [0.04, 0, -0.06],
      note: "Mirror of leftHip."
    },
    rightKnee: {
      parent: "rightHip",
      position: [0, -0.37, 0],
      restRotation: [-0.12, 0, 0],
      note: "Mirror of leftKnee."
    },
    rightFoot: {
      parent: "rightKnee",
      position: [0, -0.33, 0],
      restRotation: [0, 0, 0],
      note: "Flattened sphere."
    }
  },
  meshes: [
    {
      name: "pelvis",
      bone: "hips",
      geometry: "sphere",
      radius: 0.2,
      offset: [0, 0, 0],
      scale: [1.15, 0.85, 1.05],
      colorSlot: "skin"
    },
    {
      name: "torso",
      bone: "spine",
      geometry: "capsule",
      radius: 0.255,
      length: 0.3,
      offset: [0, 0.16, 0],
      colorSlot: "skin"
    },
    {
      name: "chestBall",
      bone: "chest",
      geometry: "sphere",
      radius: 0.2346,
      offset: [0, 0.02, 0],
      scale: [1.15, 0.75, 1],
      colorSlot: "skin"
    },
    {
      name: "neck",
      bone: "neck",
      geometry: "sphere",
      radius: 0.16,
      offset: [0, 0, 0],
      colorSlot: "skin"
    },
    {
      name: "head",
      bone: "head",
      geometry: "sphere",
      radius: 0.33,
      offset: [0, 0.0495, 0],
      scale: [1, 1.08, 0.98],
      colorSlot: "skin"
    },
    {
      name: "capCrown",
      bone: "cap",
      geometry: "hemisphere",
      radius: 0.347,
      offset: [0, 0.02, 0],
      scale: [1.06, 0.62, 1.06],
      colorSlot: "cap",
      blendExempt: true
    },
    {
      name: "capBrim",
      bone: "cap",
      geometry: "torus",
      radius: 0.297,
      tube: 0.02145,
      offset: [0, -0.01, 0],
      rotation: [1.5708, 0, 0],
      colorSlot: "cap",
      blendExempt: true
    },
    {
      name: "leftShoulderJoint",
      bone: "leftShoulder",
      geometry: "sphere",
      radius: 0.1127,
      offset: [0, 0, 0],
      colorSlot: "skin"
    },
    {
      name: "leftUpperArm",
      bone: "leftShoulder",
      geometry: "capsule",
      radius: 0.098,
      length: 0.34,
      offset: [0, -0.17, 0],
      colorSlot: "skin"
    },
    {
      name: "leftElbowJoint",
      bone: "leftElbow",
      geometry: "sphere",
      radius: 0.1029,
      offset: [0, 0, 0],
      colorSlot: "skin"
    },
    {
      name: "leftForearm",
      bone: "leftElbow",
      geometry: "capsule",
      radius: 0.09016,
      length: 0.3,
      offset: [0, -0.15, 0],
      colorSlot: "skin"
    },
    {
      name: "leftHand",
      bone: "leftHand",
      geometry: "sphere",
      radius: 0.108,
      offset: [0, -0.02, 0],
      scale: [1.05, 0.85, 1.15],
      colorSlot: "skin"
    },
    {
      name: "rightShoulderJoint",
      bone: "rightShoulder",
      geometry: "sphere",
      radius: 0.1127,
      offset: [0, 0, 0],
      colorSlot: "skin"
    },
    {
      name: "rightUpperArm",
      bone: "rightShoulder",
      geometry: "capsule",
      radius: 0.098,
      length: 0.34,
      offset: [0, -0.17, 0],
      colorSlot: "skin"
    },
    {
      name: "rightElbowJoint",
      bone: "rightElbow",
      geometry: "sphere",
      radius: 0.1029,
      offset: [0, 0, 0],
      colorSlot: "skin"
    },
    {
      name: "rightForearm",
      bone: "rightElbow",
      geometry: "capsule",
      radius: 0.09016,
      length: 0.3,
      offset: [0, -0.15, 0],
      colorSlot: "skin"
    },
    {
      name: "rightHand",
      bone: "rightHand",
      geometry: "sphere",
      radius: 0.108,
      offset: [0, -0.02, 0],
      scale: [1.05, 0.85, 1.15],
      colorSlot: "skin"
    },
    {
      name: "leftHipJoint",
      bone: "leftHip",
      geometry: "sphere",
      radius: 0.1298,
      offset: [0, 0, 0],
      colorSlot: "skin"
    },
    {
      name: "leftThigh",
      bone: "leftHip",
      geometry: "capsule",
      radius: 0.118,
      length: 0.37,
      offset: [0, -0.185, 0],
      colorSlot: "skin"
    },
    {
      name: "leftKneeJoint",
      bone: "leftKnee",
      geometry: "sphere",
      radius: 0.1156,
      offset: [0, 0, 0],
      colorSlot: "skin"
    },
    {
      name: "leftShin",
      bone: "leftKnee",
      geometry: "capsule",
      radius: 0.1038,
      length: 0.33,
      offset: [0, -0.165, 0],
      colorSlot: "skin"
    },
    {
      name: "leftFoot",
      bone: "leftFoot",
      geometry: "sphere",
      radius: 0.112,
      offset: [0, -0.02, 0.04],
      scale: [0.9, 0.55, 1.45],
      colorSlot: "skin"
    },
    {
      name: "rightHipJoint",
      bone: "rightHip",
      geometry: "sphere",
      radius: 0.1298,
      offset: [0, 0, 0],
      colorSlot: "skin"
    },
    {
      name: "rightThigh",
      bone: "rightHip",
      geometry: "capsule",
      radius: 0.118,
      length: 0.37,
      offset: [0, -0.185, 0],
      colorSlot: "skin"
    },
    {
      name: "rightKneeJoint",
      bone: "rightKnee",
      geometry: "sphere",
      radius: 0.1156,
      offset: [0, 0, 0],
      colorSlot: "skin"
    },
    {
      name: "rightShin",
      bone: "rightKnee",
      geometry: "capsule",
      radius: 0.1038,
      length: 0.33,
      offset: [0, -0.165, 0],
      colorSlot: "skin"
    },
    {
      name: "rightFoot",
      bone: "rightFoot",
      geometry: "sphere",
      radius: 0.112,
      offset: [0, -0.02, 0.04],
      scale: [0.9, 0.55, 1.45],
      colorSlot: "skin"
    }
  ],
  bindPose: {
    leftShoulder: [0.08, 0.05, 0.38],
    leftElbow: [0.22, 0, 0],
    rightShoulder: [0.08, -0.05, -0.38],
    rightElbow: [0.22, 0, 0],
    leftHip: [0.04, 0, 0.06],
    leftKnee: [-0.12, 0, 0],
    rightHip: [0.04, 0, -0.06],
    rightKnee: [-0.12, 0, 0],
    spine: [0.02, 0, 0],
    head: [0, 0, 0]
  },
  animations: {
    jump: {
      name: "jump",
      loop: true,
      duration: 1.2,
      type: "procedural",
      description: "Arms up, knees tuck (like in image)",
      parameters: {
        omega: 1.7
      },
      formulas: [
        { joint: "leftShoulder", euler: "x", expr: "-1.85 + sin(t * 5.2) * 0.15" },
        { joint: "rightShoulder", euler: "x", expr: "-1.85 - sin(t * 5.2) * 0.15" },
        { joint: "leftShoulder", euler: "z", expr: "0.95" },
        { joint: "rightShoulder", euler: "z", expr: "-0.95" },
        { joint: "leftKnee", euler: "x", expr: "1.05 + sin(t * 3.1) * 0.12" },
        { joint: "rightKnee", euler: "x", expr: "1.05 + sin(t * 3.1) * 0.12" }
      ],
      keyframes: [
        {
          time: 0,
          joints: {
            leftShoulder: [-1.85, 0.25, 0.95],
            leftElbow: [0.35, 0.1, 0.15],
            rightShoulder: [-1.85, -0.25, -0.95],
            rightElbow: [0.35, -0.1, -0.15],
            leftHip: [0.46, 0.1, 0.22],
            leftKnee: [-1.16, 0, 0],
            rightHip: [0.46, -0.1, -0.22],
            rightKnee: [-1.16, 0, 0],
            spine: [-0.18, 0, 0],
            head: [0.22, 0, 0],
            bodyY: 0
          }
        },
        {
          time: 0.6,
          joints: {
            leftShoulder: [-1.847, 0.25, 0.95],
            leftElbow: [0.35, 0.1, 0.15],
            rightShoulder: [-1.853, -0.25, -0.95],
            rightElbow: [0.35, -0.1, -0.15],
            leftHip: [0.483, 0.1, 0.22],
            leftKnee: [-1.183, 0, 0],
            rightHip: [0.483, -0.1, -0.22],
            rightKnee: [-1.183, 0, 0],
            spine: [-0.18, 0.001, 0],
            head: [0.22, 0, 0],
            bodyY: 0
          }
        }
      ]
    }
  }
};

export class RagdollAvatar {
  constructor(scene, colorHex = '#F7F8FA', isLocal = false) {
    this.scene = scene;
    this.colorHex = colorHex || CHARACTER_SPEC.appearance.skinColor;
    this.isLocal = isLocal;
    this.role = 'RUNNER'; // 'RUNNER' or 'HITTER'

    // Skeleton Nodes Map & References
    this.nodes = {};
    this.root = new THREE.Group();
    this.root.name = 'root';
    this.nodes['root'] = this.root;

    // Direct Named Joint Handles
    this.hips = null;
    this.spine = null;
    this.chest = null;
    this.neck = null;
    this.head = null;
    this.cap = null;

    this.leftShoulder = null;
    this.leftElbow = null;
    this.leftHand = null;

    this.rightShoulder = null;
    this.rightElbow = null;
    this.rightHand = null;

    this.leftHip = null;
    this.leftKnee = null;
    this.leftFoot = null;

    this.rightHip = null;
    this.rightKnee = null;
    this.rightFoot = null;

    // Backward Compatibility Aliases for Physics/Camera/Main loop
    this.pelvis = null;
    this.torso = null;
    this.leftUpperArm = null;
    this.leftForearm = null;
    this.rightUpperArm = null;
    this.rightForearm = null;
    this.leftThigh = null;
    this.leftCalf = null;
    this.rightThigh = null;
    this.rightCalf = null;

    // Materials
    this.skinMat = null;
    this.capMat = null;

    // Weapon
    this.stickMesh = null;

    // Animation & Gameplay State
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
    this.jumpTimer = 0;
    this.isMoving = false;
    this.isDancing = false;
    this.verticalVelocity = 0;
    this.isOnGround = true;
    this.thermalTimer = 0;
    this.isThermalRevealed = false;

    this.buildBlobbyClayCharacter();
    this.scene.add(this.root);
  }

  buildBlobbyClayCharacter() {
    // 1. Smooth Clay Physical Materials matching CHARACTER_SPEC.appearance
    const app = CHARACTER_SPEC.appearance;
    this.skinMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(this.colorHex),
      roughness: app.roughness,
      metalness: app.metalness,
      clearcoat: app.clearcoat,
      clearcoatRoughness: app.clearcoatRoughness,
      sheen: app.sheen,
      sheenColor: new THREE.Color(app.sheenColor)
    });

    this.capMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(app.capColor),
      roughness: app.roughness,
      metalness: app.metalness,
      clearcoat: app.clearcoat,
      clearcoatRoughness: app.clearcoatRoughness,
      sheen: app.sheen,
      sheenColor: new THREE.Color(app.sheenColor)
    });

    // 2. Build Skeleton Hierarchy from CHARACTER_SPEC.skeleton
    const skel = CHARACTER_SPEC.skeleton;
    for (const [boneName, boneDef] of Object.entries(skel)) {
      if (boneName === 'root') continue;
      const group = new THREE.Group();
      group.name = boneName;
      group.position.set(boneDef.position[0], boneDef.position[1], boneDef.position[2]);
      group.rotation.set(boneDef.restRotation[0], boneDef.restRotation[1], boneDef.restRotation[2]);
      this.nodes[boneName] = group;
    }

    // Attach hierarchy to parents
    for (const [boneName, boneDef] of Object.entries(skel)) {
      if (boneName === 'root') continue;
      const parentNode = this.nodes[boneDef.parent] || this.root;
      parentNode.add(this.nodes[boneName]);
    }

    // Bind Joint Handles
    this.hips = this.nodes['hips'];
    this.spine = this.nodes['spine'];
    this.chest = this.nodes['chest'];
    this.neck = this.nodes['neck'];
    this.head = this.nodes['head'];
    this.cap = this.nodes['cap'];

    this.leftShoulder = this.nodes['leftShoulder'];
    this.leftElbow = this.nodes['leftElbow'];
    this.leftHand = this.nodes['leftHand'];

    this.rightShoulder = this.nodes['rightShoulder'];
    this.rightElbow = this.nodes['rightElbow'];
    this.rightHand = this.nodes['rightHand'];

    this.leftHip = this.nodes['leftHip'];
    this.leftKnee = this.nodes['leftKnee'];
    this.leftFoot = this.nodes['leftFoot'];

    this.rightHip = this.nodes['rightHip'];
    this.rightKnee = this.nodes['rightKnee'];
    this.rightFoot = this.nodes['rightFoot'];

    // Bind Aliases
    this.pelvis = this.hips;
    this.torso = this.spine;
    this.leftUpperArm = this.leftShoulder;
    this.leftForearm = this.leftElbow;
    this.rightUpperArm = this.rightShoulder;
    this.rightForearm = this.rightElbow;
    this.leftThigh = this.leftHip;
    this.leftCalf = this.leftKnee;
    this.rightThigh = this.rightHip;
    this.rightCalf = this.rightKnee;

    // 3. Construct all 27 Meshes from CHARACTER_SPEC.meshes
    for (const meshDef of CHARACTER_SPEC.meshes) {
      const parentGroup = this.nodes[meshDef.bone];
      if (!parentGroup) continue;

      let geo;
      const mat = (meshDef.colorSlot === 'cap') ? this.capMat : this.skinMat;

      switch (meshDef.geometry) {
        case 'sphere':
          geo = new THREE.SphereGeometry(meshDef.radius, 24, 20);
          break;
        case 'capsule':
          if (typeof THREE.CapsuleGeometry === 'function') {
            geo = new THREE.CapsuleGeometry(meshDef.radius, meshDef.length, 12, 20);
          } else {
            // Fallback capsule composite
            geo = new THREE.CylinderGeometry(meshDef.radius, meshDef.radius, meshDef.length, 20);
          }
          break;
        case 'hemisphere':
          geo = new THREE.SphereGeometry(meshDef.radius, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2);
          break;
        case 'torus':
          geo = new THREE.TorusGeometry(meshDef.radius, meshDef.tube, 16, 32);
          break;
        default:
          geo = new THREE.SphereGeometry(0.1, 16, 16);
      }

      const mesh = new THREE.Mesh(geo, mat);
      mesh.name = meshDef.name;
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      if (meshDef.offset) {
        mesh.position.set(meshDef.offset[0], meshDef.offset[1], meshDef.offset[2]);
      }
      if (meshDef.scale) {
        mesh.scale.set(meshDef.scale[0], meshDef.scale[1], meshDef.scale[2]);
      }
      if (meshDef.rotation) {
        mesh.rotation.set(meshDef.rotation[0], meshDef.rotation[1], meshDef.rotation[2]);
      }

      parentGroup.add(mesh);
    }

    // 4. Wooden Baseball Bat Weapon (Hitter) attached to rightHand
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x8d5b36, roughness: 0.6 });
    const tapeMat = new THREE.MeshStandardMaterial({ color: 0xdedede, roughness: 0.9 });
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

  triggerThermalReveal(duration = 1.0) {
    this.thermalTimer = duration;
    this.isThermalRevealed = true;
    if (this.skinMat) {
      this.skinMat.emissive = new THREE.Color(0x00ffff);
      this.skinMat.emissiveIntensity = 2.5;
    }
    if (this.capMat) {
      this.capMat.emissive = new THREE.Color(0x00ffff);
      this.capMat.emissiveIntensity = 2.5;
    }
  }

  resetToBindPose() {
    const bind = CHARACTER_SPEC.bindPose;
    this.leftShoulder.rotation.set(bind.leftShoulder[0], bind.leftShoulder[1], bind.leftShoulder[2]);
    this.leftElbow.rotation.set(bind.leftElbow[0], bind.leftElbow[1], bind.leftElbow[2]);
    this.rightShoulder.rotation.set(bind.rightShoulder[0], bind.rightShoulder[1], bind.rightShoulder[2]);
    this.rightElbow.rotation.set(bind.rightElbow[0], bind.rightElbow[1], bind.rightElbow[2]);
    this.leftHip.rotation.set(bind.leftHip[0], bind.leftHip[1], bind.leftHip[2]);
    this.leftKnee.rotation.set(bind.leftKnee[0], bind.leftKnee[1], bind.leftKnee[2]);
    this.rightHip.rotation.set(bind.rightHip[0], bind.rightHip[1], bind.rightHip[2]);
    this.rightKnee.rotation.set(bind.rightKnee[0], bind.rightKnee[1], bind.rightKnee[2]);
    this.spine.rotation.set(bind.spine[0], bind.spine[1], bind.spine[2]);
    this.head.rotation.set(bind.head[0], bind.head[1], bind.head[2]);
    this.hips.position.y = CHARACTER_SPEC.proportions.hipHeight;
    this.hips.rotation.set(0, 0, 0);
  }

  updateAnimation(delta, isMoving = false) {
    this.isMoving = isMoving;
    const bind = CHARACTER_SPEC.bindPose;

    // Thermal Ping Timer Update
    if (this.thermalTimer > 0) {
      this.thermalTimer -= delta;
      const intensity = Math.max(0, this.thermalTimer / 1.0);
      if (this.skinMat) this.skinMat.emissiveIntensity = intensity * 2.5;
      if (this.capMat) this.capMat.emissiveIntensity = intensity * 2.5;

      if (this.thermalTimer <= 0) {
        this.isThermalRevealed = false;
        if (this.skinMat) {
          this.skinMat.emissive.setHex(0x000000);
          this.skinMat.emissiveIntensity = 0;
        }
        if (this.capMat) {
          this.capMat.emissive.setHex(0x000000);
          this.capMat.emissiveIntensity = 0;
        }
      }
    }

    // Bat swing progression
    if (this.isSwingingBat) {
      this.swingProgress += delta * 7.0;
      if (this.swingProgress >= Math.PI) {
        this.isSwingingBat = false;
        this.swingProgress = 0;
      }
    }

    // 1. Knocked Out Wipeout (0 HP)
    if (!this.isAlive) {
      this.hips.position.y = 0.14;
      this.hips.rotation.set(-Math.PI / 2, 0, 0);
      this.spine.rotation.set(0.2, 0, 0);
      this.chest.rotation.set(0, 0, 0.35);
      this.leftShoulder.rotation.set(0.6, 0, 1.3);
      this.rightShoulder.rotation.set(0.6, 0, -1.3);
      this.leftHip.rotation.set(0.2, 0, 0.6);
      this.rightHip.rotation.set(0.2, 0, -0.6);
      this.leftKnee.rotation.set(0.4, 0, 0);
      this.rightKnee.rotation.set(0.4, 0, 0);
      return;
    }

    // 2. Flat Flop Belly Slide ('F' key)
    if (this.isFlatFlop) {
      this.hips.position.y = 0.12;
      this.hips.rotation.set(-Math.PI / 2, 0, 0);
      this.spine.rotation.set(0, 0, 0);
      this.chest.rotation.set(0, 0, 0);
      this.head.rotation.set(0.35, 0, 0);
      this.leftShoulder.rotation.set(Math.PI - 0.2, 0, 0.4);
      this.rightShoulder.rotation.set(Math.PI - 0.2, 0, -0.4);
      this.leftHip.rotation.set(0, 0, 0.25);
      this.rightHip.rotation.set(0, 0, -0.25);
      this.leftKnee.rotation.set(0, 0, 0);
      this.rightKnee.rotation.set(0, 0, 0);
      return;
    }

    // 3. Sit ('C' key)
    if (this.isSitting) {
      this.hips.position.y = 0.46;
      this.hips.rotation.set(0, 0, 0);
      this.spine.rotation.set(0.12, 0, 0);
      this.chest.rotation.set(0, 0, 0);
      this.leftHip.rotation.set(-Math.PI / 2, 0, 0.06);
      this.rightHip.rotation.set(-Math.PI / 2, 0, -0.06);
      this.leftKnee.rotation.set(Math.PI / 2, 0, 0);
      this.rightKnee.rotation.set(Math.PI / 2, 0, 0);
      this.leftShoulder.rotation.set(0.3, 0.05, 0.2);
      this.rightShoulder.rotation.set(0.3, -0.05, -0.2);
      return;
    }

    // 4. Crawl / Crouch
    if (this.isCrawling) {
      this.hips.position.y = 0.42;
      this.hips.rotation.set(0.45, 0, 0);
      this.spine.rotation.set(0.6 + this.spinePitch * 0.4, 0, 0);
      this.chest.rotation.set(0, 0, 0);
      this.leftHip.rotation.set(-0.85, 0, 0.06);
      this.rightHip.rotation.set(-0.85, 0, -0.06);
      this.leftKnee.rotation.set(1.05, 0, 0);
      this.rightKnee.rotation.set(1.05, 0, 0);

      if (isMoving) {
        this.walkCycle += delta * 7.5;
        const crawlArm = Math.sin(this.walkCycle);
        this.leftShoulder.rotation.set(crawlArm * 0.7 + 0.5, 0.05, 0.38);
        this.rightShoulder.rotation.set(-crawlArm * 0.7 + 0.5, -0.05, -0.38);
      }
      return;
    }

    // 5. Jump (Airborne state or jump animation)
    if (!this.isOnGround) {
      this.jumpTimer += delta;
      const t = this.jumpTimer;
      this.hips.position.y = CHARACTER_SPEC.proportions.hipHeight + 0.05;
      this.hips.rotation.set(0, 0, 0);
      this.spine.rotation.set(-0.18, 0, 0);
      this.head.rotation.set(0.22, 0, 0);

      // Formulas from CHARACTER_SPEC.animations.jump
      this.leftShoulder.rotation.set(-1.85 + Math.sin(t * 5.2) * 0.15, 0.25, 0.95);
      this.rightShoulder.rotation.set(-1.85 - Math.sin(t * 5.2) * 0.15, -0.25, -0.95);
      this.leftElbow.rotation.set(0.35, 0.1, 0.15);
      this.rightElbow.rotation.set(0.35, -0.1, -0.15);

      this.leftHip.rotation.set(0.46, 0.1, 0.22);
      this.rightHip.rotation.set(0.46, -0.1, -0.22);
      this.leftKnee.rotation.set(1.05 + Math.sin(t * 3.1) * 0.12, 0, 0);
      this.rightKnee.rotation.set(1.05 + Math.sin(t * 3.1) * 0.12, 0, 0);
      return;
    } else {
      this.jumpTimer = 0;
    }

    // 6. Victory Dance
    if (this.isDancing) {
      this.walkCycle += delta * 9.0;
      this.hips.position.y = CHARACTER_SPEC.proportions.hipHeight + Math.abs(Math.sin(this.walkCycle)) * 0.16;
      this.spine.rotation.set(0, 0, Math.sin(this.walkCycle) * 0.35);
      this.chest.rotation.set(0, 0, 0);
      this.leftShoulder.rotation.set(Math.PI - 0.4, 0, 0.6 + Math.sin(this.walkCycle) * 0.4);
      this.rightShoulder.rotation.set(Math.PI - 0.4, 0, -0.6 - Math.sin(this.walkCycle) * 0.4);
      this.leftHip.rotation.set(bind.leftHip[0], 0, bind.leftHip[2]);
      this.rightHip.rotation.set(bind.rightHip[0], 0, bind.rightHip[2]);
      return;
    }

    // Apply Spine Pitch Tilt
    this.spine.rotation.set(bind.spine[0] + this.spinePitch * 0.7, 0, 0);
    this.chest.rotation.set(this.spinePitch * 0.5, 0, 0);

    // 7. Panic Sprint Flail (Hit reaction)
    if (this.isFlailing) {
      this.walkCycle += delta * 15.0;
      const flailPhase = Math.sin(this.walkCycle);
      const flailSide = Math.cos(this.walkCycle * 0.8);

      this.hips.position.y = CHARACTER_SPEC.proportions.hipHeight + Math.abs(Math.sin(this.walkCycle * 0.5)) * 0.1;
      this.leftShoulder.rotation.set(-1.85 + flailPhase * 0.6, 0.25, 0.95 + flailSide * 0.5);
      this.rightShoulder.rotation.set(-1.85 - flailPhase * 0.6, -0.25, -0.95 - flailSide * 0.5);
      this.leftElbow.rotation.set(0.4 + flailPhase * 0.7, 0.1, 0.15);
      this.rightElbow.rotation.set(0.4 - flailPhase * 0.7, -0.1, -0.15);

      this.leftHip.rotation.set(bind.leftHip[0] + flailPhase * 0.8, 0, bind.leftHip[2]);
      this.rightHip.rotation.set(bind.rightHip[0] - flailPhase * 0.8, 0, bind.rightHip[2]);
      this.leftKnee.rotation.set(bind.leftKnee[0] + Math.max(-0.2, -flailPhase * 0.9), 0, 0);
      this.rightKnee.rotation.set(bind.rightKnee[0] + Math.max(-0.2, flailPhase * 0.9), 0, 0);

      this.head.rotation.set(-0.2, Math.sin(this.walkCycle * 1.5) * 0.5, flailSide * 0.3);
    }
    // 8. Bat Swing Action (Hitter)
    else if (this.isSwingingBat) {
      const swing = Math.sin(this.swingProgress);
      this.rightShoulder.rotation.set(0.3, -swing * 2.2 + 0.6, -swing * 1.4 - 0.38);
      this.rightElbow.rotation.set(bind.rightElbow[0], -swing * 1.6, 0);
      this.chest.rotation.set(0, -swing * 0.9, 0);
      this.leftShoulder.rotation.set(-0.3, 0, 0.38);
      this.leftElbow.rotation.set(bind.leftElbow[0], 0, 0);
    }
    // 9. Grab / Reach Forward ('E' key)
    else if (this.isGrabbing) {
      this.leftShoulder.rotation.set(Math.PI / 2, 0.05, 0.1);
      this.rightShoulder.rotation.set(Math.PI / 2, -0.05, -0.1);
      this.leftElbow.rotation.set(0.1, 0, 0);
      this.rightElbow.rotation.set(0.1, 0, 0);
    }
    // 10. Floppy Blobby Walk Cycle
    else if (isMoving) {
      this.walkCycle += delta * 9.0;
      const legPhase = Math.sin(this.walkCycle);
      const armPhase = -legPhase;

      this.hips.position.y = CHARACTER_SPEC.proportions.hipHeight + Math.abs(Math.sin(this.walkCycle)) * 0.07;
      this.hips.rotation.y = legPhase * 0.12;

      this.leftHip.rotation.set(bind.leftHip[0] + legPhase * 0.75, 0, bind.leftHip[2]);
      this.rightHip.rotation.set(bind.rightHip[0] - legPhase * 0.75, 0, bind.rightHip[2]);
      this.leftKnee.rotation.set(bind.leftKnee[0] + Math.max(0, -legPhase * 0.85), 0, 0);
      this.rightKnee.rotation.set(bind.rightKnee[0] + Math.max(0, legPhase * 0.85), 0, 0);

      this.leftShoulder.rotation.set(bind.leftShoulder[0] + armPhase * 0.65, bind.leftShoulder[1], bind.leftShoulder[2]);
      this.leftElbow.rotation.set(bind.leftElbow[0] + Math.max(0, armPhase * 0.4), 0, 0);

      if (this.role === 'HITTER') {
        this.rightShoulder.rotation.set(0.5, -0.3, bind.rightShoulder[2]);
        this.rightElbow.rotation.set(bind.rightElbow[0] - 0.4, 0, 0);
      } else {
        this.rightShoulder.rotation.set(bind.rightShoulder[0] - armPhase * 0.65, bind.rightShoulder[1], bind.rightShoulder[2]);
        this.rightElbow.rotation.set(bind.rightElbow[0] + Math.max(0, -armPhase * 0.4), 0, 0);
      }
      this.head.rotation.set(bind.head[0], 0, 0);
    }
    // 11. Marshmallow Clay Idle Breathing
    else {
      this.walkCycle += delta * 2.5;
      const breathe = Math.sin(this.walkCycle) * 0.025;
      this.hips.position.y = CHARACTER_SPEC.proportions.hipHeight + breathe;
      this.hips.rotation.set(0, 0, 0);

      this.leftHip.rotation.set(bind.leftHip[0], bind.leftHip[1], bind.leftHip[2]);
      this.rightHip.rotation.set(bind.rightHip[0], bind.rightHip[1], bind.rightHip[2]);
      this.leftKnee.rotation.set(bind.leftKnee[0], bind.leftKnee[1], bind.leftKnee[2]);
      this.rightKnee.rotation.set(bind.rightKnee[0], bind.rightKnee[1], bind.rightKnee[2]);

      this.leftShoulder.rotation.set(bind.leftShoulder[0], bind.leftShoulder[1], bind.leftShoulder[2]);
      this.leftElbow.rotation.set(bind.leftElbow[0], bind.leftElbow[1], bind.leftElbow[2]);

      if (this.role === 'HITTER') {
        this.rightShoulder.rotation.set(0.5, -0.3, bind.rightShoulder[2]);
        this.rightElbow.rotation.set(bind.rightElbow[0] - 0.4, 0, 0);
      } else {
        this.rightShoulder.rotation.set(bind.rightShoulder[0], bind.rightShoulder[1], bind.rightShoulder[2]);
        this.rightElbow.rotation.set(bind.rightElbow[0], bind.rightElbow[1], bind.rightElbow[2]);
      }
      this.head.rotation.set(bind.head[0], 0, 0);
    }

    // Update 1.0s Thermal Reveal Timer (Radiant cyan glow for anti-camp reveal)
    if (this.thermalTimer > 0) {
      this.thermalTimer -= delta;
      const progress = Math.max(0, this.thermalTimer / 1.0);
      if (this.skinMat && this.skinMat.emissive) {
        this.skinMat.emissive.setRGB(0.0, progress * 1.0, progress * 1.0);
        this.skinMat.emissiveIntensity = progress * 3.5;
      }
      if (this.thermalTimer <= 0) {
        this.isThermalRevealed = false;
        if (this.skinMat && this.skinMat.emissive) {
          this.skinMat.emissive.setRGB(0, 0, 0);
          this.skinMat.emissiveIntensity = 0;
        }
      }
    }
  }

  triggerThermalReveal(duration = 1.0) {
    this.thermalTimer = duration;
    this.isThermalRevealed = true;
    if (this.skinMat && this.skinMat.emissive) {
      this.skinMat.emissive.setRGB(0.0, 1.0, 1.0);
      this.skinMat.emissiveIntensity = 3.5;
    }
  }

  destroy() {
    this.scene.remove(this.root);
  }
}
