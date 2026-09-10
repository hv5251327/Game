import * as THREE from 'three';

export class Apartment {
  constructor(scene) {
    this.scene = scene;
    this.colliders = []; // bounding boxes / physics colliders
    this.crawlables = []; // low clearance areas (tables, bed bottoms)
    this.jumpables = []; // beds, couches
    this.interactiveProps = []; // yoga balls, loose cushions, stools
    this.thermalObjects = new Map(); // mesh -> { timer: 0, initialEmissive, material, outlineMesh }
    this.fans = [];

    this.buildApartment();
  }

  buildApartment() {
    const roomSize = 22;
    const wallHeight = 4.5;

    // Materials
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x5c4033, // warm apartment wood floor
      roughness: 0.6,
      metalness: 0.1
    });

    const wallMat = new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      roughness: 0.8
    });

    const ceilingMat = new THREE.MeshStandardMaterial({
      color: 0x333338,
      roughness: 0.9
    });

    const carpetMat = new THREE.MeshStandardMaterial({
      color: 0x2c3e50, // central blue rug
      roughness: 0.85
    });

    // Floor
    const floorGeo = new THREE.PlaneGeometry(roomSize, roomSize);
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Central Carpet
    const carpetGeo = new THREE.CylinderGeometry(4.5, 4.5, 0.04, 32);
    const carpet = new THREE.Mesh(carpetGeo, carpetMat);
    carpet.position.set(0, 0.02, 0);
    carpet.receiveShadow = true;
    this.scene.add(carpet);

    // Ceiling
    const ceiling = new THREE.Mesh(floorGeo, ceilingMat);
    ceiling.position.set(0, wallHeight, 0);
    ceiling.rotation.x = Math.PI / 2;
    this.scene.add(ceiling);

    // Walls & Colliders
    const half = roomSize / 2;
    const wallGeoZ = new THREE.BoxGeometry(0.3, wallHeight, roomSize);
    const wallGeoX = new THREE.BoxGeometry(roomSize, wallHeight, 0.3);

    const wallsData = [
      { geo: wallGeoZ, pos: [-half, wallHeight / 2, 0], id: 'wall_west' },
      { geo: wallGeoZ, pos: [half, wallHeight / 2, 0], id: 'wall_east' },
      { geo: wallGeoX, pos: [0, wallHeight / 2, -half], id: 'wall_north' },
      { geo: wallGeoX, pos: [0, wallHeight / 2, half], id: 'wall_south' }
    ];

    wallsData.forEach(w => {
      const wallMesh = new THREE.Mesh(w.geo, wallMat.clone());
      wallMesh.position.set(...w.pos);
      wallMesh.castShadow = true;
      wallMesh.receiveShadow = true;
      this.scene.add(wallMesh);
      this.registerThermalObject(wallMesh, w.id);

      const box = new THREE.Box3().setFromObject(wallMesh);
      this.colliders.push({ box, mesh: wallMesh, type: 'wall' });
    });

    // --- Build Cluttered Apartment Furniture ---
    this.buildBunkBed(-7.0, -7.0, 0, 'bunk_1');
    this.buildBunkBed(-7.0, 7.0, 0, 'bunk_2');
    this.buildDaybed(0, -7.0, 0, 'daybed_1');

    this.buildDiningTable(0, 0, 0, 'dining_table');
    this.buildCoffeeTable(5.5, 5.5, Math.PI / 4, 'coffee_table_1');
    this.buildCoffeeTable(-5.5, 5.5, -Math.PI / 4, 'coffee_table_2');

    this.buildCouch(6.5, 0, -Math.PI / 2, 'couch_1');
    this.buildCouch(-6.5, 0, Math.PI / 2, 'couch_2');

    this.buildCardboardBoxes(7.5, 6.5, 'boxes_1');
    this.buildCardboardBoxes(-7.5, 0, 'boxes_2');

    this.buildYogaBall(2.5, 4.0, 0xff1493, 'yogaball_1');
    this.buildYogaBall(-2.5, -4.0, 0x00d2d3, 'yogaball_2');
    this.buildYogaBall(5.0, -4.0, 0xffa502, 'yogaball_3');

    this.buildStool(-3.0, 1.5, 'stool_1');
    this.buildStool(-3.0, -1.5, 'stool_2');
    this.buildStool(-6.0, 1.5, 'stool_3');

    this.buildCeilingFan(0, wallHeight - 0.2, 0);
    this.buildCeilingFan(-5.5, wallHeight - 0.2, -5.5);
    this.buildCeilingFan(5.5, wallHeight - 0.2, 5.5);
  }

  registerThermalObject(mesh, id, groupId = null) {
    if (!mesh.material) return;
    const gId = groupId || id;
    mesh.userData.thermalId = id;
    mesh.userData.thermalGroup = gId;

    // Create glowing wireframe outline for thermal silhouette
    let outlineMesh = null;
    try {
      const edges = new THREE.EdgesGeometry(mesh.geometry);
      const lineMat = new THREE.LineBasicMaterial({
        color: 0x00ffff,
        linewidth: 3,
        transparent: true,
        opacity: 0.0,
        depthTest: false
      });
      outlineMesh = new THREE.LineSegments(edges, lineMat);
      outlineMesh.renderOrder = 999;
      mesh.add(outlineMesh);
    } catch (e) {}

    this.thermalObjects.set(mesh, {
      id,
      groupId: gId,
      timer: 0,
      originalEmissive: mesh.material.emissive ? mesh.material.emissive.clone() : new THREE.Color(0, 0, 0),
      material: mesh.material,
      outlineMesh
    });
  }

  // --- 1. Bunk Bed ---
  buildBunkBed(x, z, rotY, id) {
    const group = new THREE.Group();
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.7 });
    const mattressMat = new THREE.MeshStandardMaterial({ color: 0x90caf9, roughness: 0.5 });
    const pillowMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });

    const width = 2.2;
    const length = 3.6;
    const height = 2.4;
    const postRadius = 0.08;

    // Posts
    const postGeo = new THREE.CylinderGeometry(postRadius, postRadius, height, 12);
    const postOffsets = [
      [-width / 2, height / 2, -length / 2],
      [width / 2, height / 2, -length / 2],
      [-width / 2, height / 2, length / 2],
      [width / 2, height / 2, length / 2]
    ];
    postOffsets.forEach((pos, idx) => {
      const post = new THREE.Mesh(postGeo, frameMat.clone());
      post.position.set(...pos);
      post.castShadow = true;
      group.add(post);
      this.registerThermalObject(post, `${id}_post_${idx}`, id);
    });

    // Lower Mattress
    const matGeo = new THREE.BoxGeometry(width - 0.1, 0.25, length - 0.1);
    const lowerMat = new THREE.Mesh(matGeo, mattressMat.clone());
    lowerMat.position.set(0, 0.4, 0);
    lowerMat.castShadow = true;
    lowerMat.receiveShadow = true;
    group.add(lowerMat);

    // Upper Mattress
    const upperMat = new THREE.Mesh(matGeo, mattressMat.clone());
    upperMat.position.set(0, 1.7, 0);
    upperMat.castShadow = true;
    upperMat.receiveShadow = true;
    group.add(upperMat);

    // Pillows
    const pillowGeo = new THREE.BoxGeometry(width * 0.7, 0.12, 0.6);
    const pillow1 = new THREE.Mesh(pillowGeo, pillowMat.clone());
    pillow1.position.set(0, 0.58, -length / 2 + 0.45);
    group.add(pillow1);

    const pillow2 = new THREE.Mesh(pillowGeo, pillowMat.clone());
    pillow2.position.set(0, 1.88, -length / 2 + 0.45);
    group.add(pillow2);

    group.position.set(x, 0, z);
    group.rotation.y = rotY;
    this.scene.add(group);
    group.updateMatrixWorld(true);

    this.registerThermalObject(lowerMat, `${id}_lower`, id);
    this.registerThermalObject(upperMat, `${id}_upper`, id);
    this.registerThermalObject(pillow1, `${id}_pillow_1`, id);
    this.registerThermalObject(pillow2, `${id}_pillow_2`, id);

    const lowerBox = new THREE.Box3().setFromObject(lowerMat);
    const upperBox = new THREE.Box3().setFromObject(upperMat);
    this.jumpables.push({ box: upperBox, topY: 1.82, mesh: upperMat });
    this.jumpables.push({ box: lowerBox, topY: 0.52, mesh: lowerMat });

    this.colliders.push({ box: upperBox, mesh: upperMat, type: 'bed_upper' });
    this.colliders.push({ box: lowerBox, mesh: lowerMat, type: 'bed_lower' });

    const bedBounds = new THREE.Box3().setFromObject(group);
    this.crawlables.push({
      box: new THREE.Box3(
        new THREE.Vector3(bedBounds.min.x, 0, bedBounds.min.z),
        new THREE.Vector3(bedBounds.max.x, 0.4, bedBounds.max.z)
      ),
      clearance: 0.4
    });
  }

  // --- 2. Daybed ---
  buildDaybed(x, z, rotY, id) {
    const group = new THREE.Group();
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x4e342e, roughness: 0.7 });
    const cushionMat = new THREE.MeshStandardMaterial({ color: 0xffcc80, roughness: 0.6 });

    const width = 2.0;
    const length = 3.2;

    const baseGeo = new THREE.BoxGeometry(width, 0.2, length);
    const base = new THREE.Mesh(baseGeo, frameMat.clone());
    base.position.set(0, 0.35, 0);
    group.add(base);
    this.registerThermalObject(base, `${id}_base`, id);

    const cushionGeo = new THREE.BoxGeometry(width - 0.1, 0.25, length - 0.1);
    const cushion = new THREE.Mesh(cushionGeo, cushionMat.clone());
    cushion.position.set(0, 0.55, 0);
    cushion.castShadow = true;
    cushion.receiveShadow = true;
    group.add(cushion);

    group.position.set(x, 0, z);
    group.rotation.y = rotY;
    this.scene.add(group);
    group.updateMatrixWorld(true);

    this.registerThermalObject(cushion, `${id}_cushion`, id);
    const cBox = new THREE.Box3().setFromObject(cushion);
    this.jumpables.push({ box: cBox, topY: 0.68, mesh: cushion });
    this.colliders.push({ box: cBox, mesh: cushion, type: 'daybed' });

    const daybedBounds = new THREE.Box3().setFromObject(group);
    this.crawlables.push({
      box: new THREE.Box3(
        new THREE.Vector3(daybedBounds.min.x, 0, daybedBounds.min.z),
        new THREE.Vector3(daybedBounds.max.x, 0.35, daybedBounds.max.z)
      ),
      clearance: 0.35
    });
  }

  // --- 3. Dining Table (1.5-person crawl space under table) ---
  buildDiningTable(x, z, rotY, id) {
    const group = new THREE.Group();
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.4 });

    const width = 1.45; // Sized for 1.5 persons width
    const length = 2.4;
    const height = 1.18;
    const thickness = 0.08;

    // Tabletop
    const topGeo = new THREE.BoxGeometry(width, thickness, length);
    const top = new THREE.Mesh(topGeo, woodMat.clone());
    top.position.set(0, height, 0);
    top.castShadow = true;
    top.receiveShadow = true;
    group.add(top);

    // 4 Corner Legs
    const legRadius = 0.05;
    const legGeo = new THREE.CylinderGeometry(legRadius, legRadius, height - thickness / 2, 12);
    const legOffsets = [
      [-width / 2 + 0.12, (height - thickness / 2) / 2, -length / 2 + 0.12],
      [width / 2 - 0.12, (height - thickness / 2) / 2, -length / 2 + 0.12],
      [-width / 2 + 0.12, (height - thickness / 2) / 2, length / 2 - 0.12],
      [width / 2 - 0.12, (height - thickness / 2) / 2, length / 2 - 0.12]
    ];

    const legMeshes = [];
    legOffsets.forEach((pos, idx) => {
      const leg = new THREE.Mesh(legGeo, woodMat.clone());
      leg.position.set(...pos);
      leg.castShadow = true;
      group.add(leg);
      legMeshes.push(leg);
      this.registerThermalObject(leg, `${id}_leg_${idx}`, id);
    });

    group.position.set(x, 0, z);
    group.rotation.y = rotY;
    this.scene.add(group);
    group.updateMatrixWorld(true);

    this.registerThermalObject(top, `${id}_top`, id);

    const topBox = new THREE.Box3().setFromObject(top);
    this.jumpables.push({ box: topBox, topY: height + thickness / 2, mesh: top });

    // Tabletop collider: blocks standing players (height > 1.14m), lets crawling/sleeping players go under!
    this.colliders.push({ box: topBox, mesh: top, type: 'dining_table_top' });

    // Individual corner leg colliders
    legMeshes.forEach(legMesh => {
      const legBox = new THREE.Box3().setFromObject(legMesh);
      this.colliders.push({ box: legBox, mesh: legMesh, type: 'dining_table_leg' });
    });

    // Crawl volume under the table
    this.crawlables.push({
      box: new THREE.Box3(
        new THREE.Vector3(x - width / 2, 0, z - length / 2),
        new THREE.Vector3(x + width / 2, height - thickness / 2, z + length / 2)
      ),
      clearance: height - thickness / 2
    });
  }

  // --- 4. Coffee Table ---
  buildCoffeeTable(x, z, rotY, id) {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0x263238, roughness: 0.3 });

    const width = 1.6;
    const length = 2.2;
    const height = 0.55;
    const thickness = 0.08;

    const topGeo = new THREE.BoxGeometry(width, thickness, length);
    const top = new THREE.Mesh(topGeo, mat.clone());
    top.position.set(0, height, 0);
    top.castShadow = true;
    top.receiveShadow = true;
    group.add(top);

    const legGeo = new THREE.BoxGeometry(0.08, height, 0.08);
    const legOffsets = [
      [-width / 2 + 0.1, height / 2, -length / 2 + 0.1],
      [width / 2 - 0.1, height / 2, -length / 2 + 0.1],
      [-width / 2 + 0.1, height / 2, length / 2 - 0.1],
      [width / 2 - 0.1, height / 2, length / 2 - 0.1]
    ];
    const legMeshes = [];
    legOffsets.forEach((pos, idx) => {
      const leg = new THREE.Mesh(legGeo, mat.clone());
      leg.position.set(...pos);
      group.add(leg);
      legMeshes.push(leg);
      this.registerThermalObject(leg, `${id}_leg_${idx}`, id);
    });

    group.position.set(x, 0, z);
    group.rotation.y = rotY;
    this.scene.add(group);
    group.updateMatrixWorld(true);

    this.registerThermalObject(top, `${id}_top`, id);

    const topBox = new THREE.Box3().setFromObject(top);
    this.jumpables.push({ box: topBox, topY: height + thickness / 2, mesh: top });
    this.colliders.push({ box: topBox, mesh: top, type: 'coffee_table_top' });

    legMeshes.forEach(legMesh => {
      const legBox = new THREE.Box3().setFromObject(legMesh);
      this.colliders.push({ box: legBox, mesh: legMesh, type: 'coffee_table_leg' });
    });

    this.crawlables.push({
      box: new THREE.Box3(
        new THREE.Vector3(x - width / 2, 0, z - length / 2),
        new THREE.Vector3(x + width / 2, height - thickness / 2, z + length / 2)
      ),
      clearance: height - thickness / 2
    });
  }

  // --- 5. Couch ---
  buildCouch(x, z, rotY, id) {
    const group = new THREE.Group();
    const couchMat = new THREE.MeshStandardMaterial({ color: 0xb71c1c, roughness: 0.8 });

    const seatGeo = new THREE.BoxGeometry(2.0, 0.5, 4.0);
    const seat = new THREE.Mesh(seatGeo, couchMat.clone());
    seat.position.set(0, 0.35, 0);
    seat.castShadow = true;
    seat.receiveShadow = true;
    group.add(seat);

    const backGeo = new THREE.BoxGeometry(0.4, 0.8, 4.0);
    const back = new THREE.Mesh(backGeo, couchMat.clone());
    back.position.set(-0.8, 0.8, 0);
    back.castShadow = true;
    group.add(back);

    const armGeo = new THREE.BoxGeometry(2.0, 0.4, 0.3);
    const arm1 = new THREE.Mesh(armGeo, couchMat.clone());
    arm1.position.set(0, 0.7, 1.85);
    group.add(arm1);

    const arm2 = new THREE.Mesh(armGeo, couchMat.clone());
    arm2.position.set(0, 0.7, -1.85);
    group.add(arm2);

    group.position.set(x, 0, z);
    group.rotation.y = rotY;
    this.scene.add(group);
    group.updateMatrixWorld(true);

    this.registerThermalObject(seat, `${id}_seat`, id);
    this.registerThermalObject(back, `${id}_back`, id);
    this.registerThermalObject(arm1, `${id}_arm1`, id);
    this.registerThermalObject(arm2, `${id}_arm2`, id);

    const seatBox = new THREE.Box3().setFromObject(seat);
    const backBox = new THREE.Box3().setFromObject(back);
    const arm1Box = new THREE.Box3().setFromObject(arm1);
    const arm2Box = new THREE.Box3().setFromObject(arm2);

    this.jumpables.push({ box: seatBox, topY: 0.60, mesh: seat });
    this.colliders.push({ box: seatBox, mesh: seat, type: 'couch_seat' });
    this.colliders.push({ box: backBox, mesh: back, type: 'couch_back' });
    this.colliders.push({ box: arm1Box, mesh: arm1, type: 'couch_arm' });
    this.colliders.push({ box: arm2Box, mesh: arm2, type: 'couch_arm' });
  }

  // --- 6. Cardboard Boxes ---
  buildCardboardBoxes(x, z, id) {
    const boxMat = new THREE.MeshStandardMaterial({ color: 0xd7ccc8, roughness: 0.9 });
    const group = new THREE.Group();

    const boxPositions = [
      { size: [1.0, 0.9, 1.0], pos: [0, 0.45, 0] },
      { size: [0.9, 0.8, 0.9], pos: [0.8, 0.4, 0.3] },
      { size: [0.8, 0.7, 0.8], pos: [0.1, 1.25, 0.1] }
    ];

    boxPositions.forEach((b, idx) => {
      const geo = new THREE.BoxGeometry(...b.size);
      const mesh = new THREE.Mesh(geo, boxMat.clone());
      mesh.position.set(...b.pos);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);

      this.registerThermalObject(mesh, `${id}_${idx}`, id);
    });

    group.position.set(x, 0, z);
    this.scene.add(group);
    group.updateMatrixWorld(true);

    group.children.forEach((mesh, idx) => {
      const bbox = new THREE.Box3().setFromObject(mesh);
      this.colliders.push({ box: bbox, mesh, type: 'box' });
    });
  }

  // --- 7. Bouncy Yoga Balls ---
  buildYogaBall(x, z, colorHex, id) {
    const radius = 0.55;
    const geo = new THREE.SphereGeometry(radius, 24, 24);
    const mat = new THREE.MeshStandardMaterial({
      color: colorHex,
      roughness: 0.2,
      metalness: 0.1
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, radius, z);
    mesh.castShadow = true;
    this.scene.add(mesh);

    this.registerThermalObject(mesh, id, id);

    const prop = {
      id,
      mesh,
      radius,
      pos: mesh.position,
      vel: new THREE.Vector3(0, 0, 0),
      isYogaBall: true
    };
    this.interactiveProps.push(prop);
  }

  // --- 8. Small Wooden Stools ---
  buildStool(x, z, id) {
    const group = new THREE.Group();
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x795548, roughness: 0.6 });

    const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.08, 16), woodMat.clone());
    seat.position.set(0, 0.45, 0);
    seat.castShadow = true;
    group.add(seat);

    const legGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.45, 8);
    for (let i = 0; i < 3; i++) {
      const angle = (i / 3) * Math.PI * 2;
      const leg = new THREE.Mesh(legGeo, woodMat.clone());
      leg.position.set(Math.cos(angle) * 0.2, 0.225, Math.sin(angle) * 0.2);
      leg.rotation.z = Math.cos(angle) * 0.1;
      group.add(leg);
      this.registerThermalObject(leg, `${id}_leg_${i}`, id);
    }

    group.position.set(x, 0, z);
    this.scene.add(group);
    group.updateMatrixWorld(true);

    this.registerThermalObject(seat, `${id}_seat`, id);
    const box = new THREE.Box3().setFromObject(group);
    this.colliders.push({ box, mesh: seat, type: 'stool' });
  }

  // --- 9. Ceiling Fan ---
  buildCeilingFan(x, y, z) {
    const group = new THREE.Group();
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8, roughness: 0.3 });
    const bladeMat = new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.5 });

    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.6, 12), metalMat);
    rod.position.set(0, 0.3, 0);
    group.add(rod);

    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.15, 16), metalMat);
    group.add(hub);

    const light = new THREE.PointLight(0xfff3e0, 0.8, 12);
    light.position.set(0, -0.1, 0);
    group.add(light);

    const bladesGroup = new THREE.Group();
    for (let i = 0; i < 4; i++) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.02, 1.2), bladeMat);
      blade.rotation.y = (i * Math.PI) / 2;
      blade.position.set(0, 0, 0.6);
      const arm = new THREE.Group();
      arm.rotation.y = (i * Math.PI) / 2;
      blade.position.set(0, 0, 0.6);
      arm.add(blade);
      bladesGroup.add(arm);
    }
    group.add(bladesGroup);

    group.position.set(x, y, z);
    this.scene.add(group);
    this.fans.push(bladesGroup);
  }

  // Trigger Radiant Thermal Impact Echo: the TOTAL object (all sub-meshes) illuminates brightly for 2.5 seconds
  triggerThermalEcho(meshOrId) {
    let targetGroup = null;

    if (typeof meshOrId === 'string') {
      for (const [mesh, data] of this.thermalObjects.entries()) {
        if (mesh.userData.thermalId === meshOrId || mesh.userData.thermalGroup === meshOrId || data.id === meshOrId || data.groupId === meshOrId) {
          targetGroup = mesh.userData.thermalGroup || data.groupId || meshOrId;
          break;
        }
      }
      if (!targetGroup) targetGroup = meshOrId;
    } else if (meshOrId) {
      if (meshOrId.userData && (meshOrId.userData.thermalGroup || meshOrId.userData.thermalId)) {
        targetGroup = meshOrId.userData.thermalGroup || meshOrId.userData.thermalId;
      } else if (this.thermalObjects.has(meshOrId)) {
        const data = this.thermalObjects.get(meshOrId);
        targetGroup = data.groupId || data.id;
      }
    }

    if (targetGroup) {
      for (const [mesh, data] of this.thermalObjects.entries()) {
        if (mesh.userData.thermalGroup === targetGroup || mesh.userData.thermalId === targetGroup || data.groupId === targetGroup || data.id === targetGroup) {
          data.timer = 2.5; // 2.5s duration
        }
      }
    }
  }

  update(delta) {
    // Spin ceiling fans
    for (const fan of this.fans) {
      fan.rotation.y += delta * 4.0;
    }

    // Update dynamic props (yoga ball rolling & friction)
    const bounds = 10.0;
    for (const prop of this.interactiveProps) {
      if (prop.isYogaBall) {
        prop.pos.x += prop.vel.x * delta;
        prop.pos.z += prop.vel.z * delta;

        prop.vel.x *= 0.94;
        prop.vel.z *= 0.94;

        if (Math.abs(prop.pos.x) > bounds - prop.radius) {
          prop.vel.x *= -0.7;
          prop.pos.x = Math.sign(prop.pos.x) * (bounds - prop.radius);
        }
        if (Math.abs(prop.pos.z) > bounds - prop.radius) {
          prop.vel.z *= -0.7;
          prop.pos.z = Math.sign(prop.pos.z) * (bounds - prop.radius);
        }

        const speed = Math.hypot(prop.vel.x, prop.vel.z);
        if (speed > 0.05) {
          prop.mesh.rotation.x += prop.vel.z * delta * 2.0;
          prop.mesh.rotation.z -= prop.vel.x * delta * 2.0;
        }
      }
    }

    // Update Radiant Thermal Echoes: Neon Cyan/White -> Heat Orange -> Thermal Yellow -> Fade
    for (const [mesh, data] of this.thermalObjects.entries()) {
      if (data.timer > 0) {
        data.timer -= delta;
        const progress = Math.max(0, data.timer / 2.5); // 1.0 (hit) down to 0.0 (fade)

        if (!data.material.emissive) continue;

        const cyan = new THREE.Color(0x00ffff);
        const orange = new THREE.Color(0xff4500);
        const yellow = new THREE.Color(0xffff00);
        const white = new THREE.Color(0xffffff);

        let glowColor = new THREE.Color();
        if (progress > 0.7) {
          const t = (progress - 0.7) / 0.3;
          glowColor.lerpColors(cyan, white, t);
        } else if (progress > 0.35) {
          const t = (progress - 0.35) / 0.35;
          glowColor.lerpColors(orange, cyan, t);
        } else {
          const t = progress / 0.35;
          glowColor.lerpColors(new THREE.Color(0x000000), yellow, t);
        }

        data.material.emissive.copy(glowColor);
        data.material.emissiveIntensity = progress * 4.0;

        // Update wireframe outline opacity & color
        if (data.outlineMesh && data.outlineMesh.material) {
          data.outlineMesh.material.color.copy(glowColor);
          data.outlineMesh.material.opacity = Math.min(1.0, progress * 1.5);
        }

        if (data.timer <= 0) {
          data.material.emissive.copy(data.originalEmissive);
          data.material.emissiveIntensity = 0;
          if (data.outlineMesh && data.outlineMesh.material) {
            data.outlineMesh.material.opacity = 0;
          }
        }
      }
    }
  }
}
