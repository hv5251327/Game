import * as THREE from 'three';

export class Apartment {
  constructor(scene) {
    this.scene = scene;
    this.colliders = []; // bounding boxes / physics colliders
    this.crawlables = []; // low clearance areas (tables, bed bottoms)
    this.jumpables = []; // beds, couches
    this.interactiveProps = []; // yoga balls, loose cushions, stools
    this.thermalObjects = new Map(); // mesh -> { timer: 0, initialEmissive, material }
    this.fans = [];

    this.buildApartment();
  }

  buildApartment() {
    const roomSize = 22;
    const wallHeight = 4.5;

    // --- Materials ---
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x8d6e63, // warm wood floor
      roughness: 0.6,
      metalness: 0.1
    });

    const wallMat = new THREE.MeshStandardMaterial({
      color: 0xdedede, // modern apartment apartment wall
      roughness: 0.8
    });

    const ceilingMat = new THREE.MeshStandardMaterial({
      color: 0xf5f5f5,
      roughness: 0.9
    });

    const carpetMat = new THREE.MeshStandardMaterial({
      color: 0x3f51b5, // central blue rug
      roughness: 0.9
    });

    // Floor
    const floorGeo = new THREE.PlaneGeometry(roomSize, roomSize);
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Central Carpet for lobby spawn
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

    // Walls & Wall Colliders
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

    // --- Build Furniture & Clutter ---
    this.buildBunkBed(-7.0, -7.0, 0, 'bunk_1');
    this.buildBunkBed(-7.0, 7.0, 0, 'bunk_2');
    this.buildDaybed(7.0, -7.0, Math.PI / 2, 'daybed_1');

    this.buildDiningTable(-4.5, 0, 0, 'dining_table');
    this.buildCoffeeTable(4.5, 2.0, Math.PI / 4, 'coffee_table_1');
    this.buildCoffeeTable(0, 7.0, 0, 'coffee_table_2');

    this.buildCouch(6.5, 0, -Math.PI / 2, 'couch_1');
    this.buildCouch(0, -7.5, 0, 'couch_2');

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

  registerThermalObject(mesh, id) {
    if (!mesh.material) return;
    mesh.userData.thermalId = id;
    this.thermalObjects.set(mesh, {
      timer: 0,
      originalEmissive: mesh.material.emissive ? mesh.material.emissive.clone() : new THREE.Color(0, 0, 0),
      originalColor: mesh.material.color ? mesh.material.color.clone() : new THREE.Color(1, 1, 1),
      material: mesh.material
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
    postOffsets.forEach(pos => {
      const post = new THREE.Mesh(postGeo, frameMat);
      post.position.set(...pos);
      post.castShadow = true;
      group.add(post);
    });

    // Lower Mattress (Height 0.4m from floor - leaves 0.35m crawl space underneath!)
    const matGeo = new THREE.BoxGeometry(width - 0.1, 0.25, length - 0.1);
    const lowerMat = new THREE.Mesh(matGeo, mattressMat.clone());
    lowerMat.position.set(0, 0.4, 0);
    lowerMat.castShadow = true;
    lowerMat.receiveShadow = true;
    group.add(lowerMat);

    // Upper Mattress (Height 1.7m)
    const upperMat = new THREE.Mesh(matGeo, mattressMat.clone());
    upperMat.position.set(0, 1.7, 0);
    upperMat.castShadow = true;
    upperMat.receiveShadow = true;
    group.add(upperMat);

    // Pillows
    const pillowGeo = new THREE.BoxGeometry(width * 0.7, 0.12, 0.6);
    const pillow1 = new THREE.Mesh(pillowGeo, pillowMat);
    pillow1.position.set(0, 0.58, -length / 2 + 0.45);
    group.add(pillow1);

    const pillow2 = new THREE.Mesh(pillowGeo, pillowMat);
    pillow2.position.set(0, 1.88, -length / 2 + 0.45);
    group.add(pillow2);

    group.position.set(x, 0, z);
    group.rotation.y = rotY;
    this.scene.add(group);

    // Register thermal
    this.registerThermalObject(lowerMat, `${id}_lower`);
    this.registerThermalObject(upperMat, `${id}_upper`);

    // Add Jumpable top & lower bed colliders
    const lowerBox = new THREE.Box3().setFromObject(lowerMat);
    const upperBox = new THREE.Box3().setFromObject(upperMat);
    this.jumpables.push({ box: upperBox, topY: 1.82, mesh: upperMat });
    this.jumpables.push({ box: lowerBox, topY: 0.52, mesh: lowerMat });

    // Colliders
    this.colliders.push({ box: upperBox, mesh: upperMat, type: 'bed_upper' });
    this.colliders.push({ box: lowerBox, mesh: lowerMat, type: 'bed_lower' });

    // Under-bed crawl space clearance (0.4m clearance)
    this.crawlables.push({
      box: new THREE.Box3(
        new THREE.Vector3(x - width / 2, 0, z - length / 2),
        new THREE.Vector3(x + width / 2, 0.4, z + length / 2)
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
    const base = new THREE.Mesh(baseGeo, frameMat);
    base.position.set(0, 0.35, 0);
    group.add(base);

    const cushionGeo = new THREE.BoxGeometry(width - 0.1, 0.25, length - 0.1);
    const cushion = new THREE.Mesh(cushionGeo, cushionMat.clone());
    cushion.position.set(0, 0.55, 0);
    cushion.castShadow = true;
    cushion.receiveShadow = true;
    group.add(cushion);

    group.position.set(x, 0, z);
    group.rotation.y = rotY;
    this.scene.add(group);

    this.registerThermalObject(cushion, id);
    const cBox = new THREE.Box3().setFromObject(cushion);
    this.jumpables.push({ box: cBox, topY: 0.68, mesh: cushion });
    this.colliders.push({ box: cBox, mesh: cushion, type: 'daybed' });

    // Crawlable under daybed (0.35m clearance)
    this.crawlables.push({
      box: new THREE.Box3(
        new THREE.Vector3(x - width / 2, 0, z - length / 2),
        new THREE.Vector3(x + width / 2, 0.35, z + length / 2)
      ),
      clearance: 0.35
    });
  }

  // --- 3. Dining Table ---
  buildDiningTable(x, z, rotY, id) {
    const group = new THREE.Group();
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.4 });

    const width = 2.6;
    const length = 4.2;
    const height = 1.05; // Tabletop at 1.05m, 0.95m open crawl space under table!
    const thickness = 0.1;

    // Tabletop
    const topGeo = new THREE.BoxGeometry(width, thickness, length);
    const top = new THREE.Mesh(topGeo, woodMat.clone());
    top.position.set(0, height, 0);
    top.castShadow = true;
    top.receiveShadow = true;
    group.add(top);

    // 4 Corner Legs
    const legGeo = new THREE.CylinderGeometry(0.06, 0.06, height, 12);
    const legOffsets = [
      [-width / 2 + 0.15, height / 2, -length / 2 + 0.15],
      [width / 2 - 0.15, height / 2, -length / 2 + 0.15],
      [-width / 2 + 0.15, height / 2, length / 2 - 0.15],
      [width / 2 - 0.15, height / 2, length / 2 - 0.15]
    ];
    legOffsets.forEach(pos => {
      const leg = new THREE.Mesh(legGeo, woodMat);
      leg.position.set(...pos);
      leg.castShadow = true;
      group.add(leg);
    });

    group.position.set(x, 0, z);
    group.rotation.y = rotY;
    this.scene.add(group);

    this.registerThermalObject(top, id);

    const topBox = new THREE.Box3().setFromObject(top);
    this.jumpables.push({ box: topBox, topY: height + thickness / 2, mesh: top });
    this.colliders.push({ box: topBox, mesh: top, type: 'table_top' });

    // Open crawl area beneath dining table (players can walk/crouch/crawl under)
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

    const width = 1.8;
    const length = 2.4;
    const height = 0.55; // Low coffee table

    const topGeo = new THREE.BoxGeometry(width, 0.08, length);
    const top = new THREE.Mesh(topGeo, mat.clone());
    top.position.set(0, height, 0);
    top.castShadow = true;
    top.receiveShadow = true;
    group.add(top);

    // Legs
    const legGeo = new THREE.BoxGeometry(0.08, height, 0.08);
    const legOffsets = [
      [-width / 2 + 0.1, height / 2, -length / 2 + 0.1],
      [width / 2 - 0.1, height / 2, -length / 2 + 0.1],
      [-width / 2 + 0.1, height / 2, length / 2 - 0.1],
      [width / 2 - 0.1, height / 2, length / 2 - 0.1]
    ];
    legOffsets.forEach(pos => {
      const leg = new THREE.Mesh(legGeo, mat);
      leg.position.set(...pos);
      group.add(leg);
    });

    group.position.set(x, 0, z);
    group.rotation.y = rotY;
    this.scene.add(group);

    this.registerThermalObject(top, id);

    const topBox = new THREE.Box3().setFromObject(top);
    this.jumpables.push({ box: topBox, topY: height + 0.04, mesh: top });
    this.colliders.push({ box: topBox, mesh: top, type: 'coffee_table' });

    // Crawlable under coffee table (0.5m clearance - requires Crawl or Flat Flop!)
    this.crawlables.push({
      box: new THREE.Box3(
        new THREE.Vector3(x - width / 2, 0, z - length / 2),
        new THREE.Vector3(x + width / 2, height - 0.04, z + length / 2)
      ),
      clearance: height - 0.04
    });
  }

  // --- 5. Couch ---
  buildCouch(x, z, rotY, id) {
    const group = new THREE.Group();
    const couchMat = new THREE.MeshStandardMaterial({ color: 0xb71c1c, roughness: 0.8 }); // Red plush couch

    // Base & Seat
    const seatGeo = new THREE.BoxGeometry(2.0, 0.5, 4.0);
    const seat = new THREE.Mesh(seatGeo, couchMat.clone());
    seat.position.set(0, 0.35, 0);
    seat.castShadow = true;
    seat.receiveShadow = true;
    group.add(seat);

    // Backrest
    const backGeo = new THREE.BoxGeometry(0.4, 0.8, 4.0);
    const back = new THREE.Mesh(backGeo, couchMat);
    back.position.set(-0.8, 0.8, 0);
    back.castShadow = true;
    group.add(back);

    // Armrests
    const armGeo = new THREE.BoxGeometry(2.0, 0.4, 0.3);
    const arm1 = new THREE.Mesh(armGeo, couchMat);
    arm1.position.set(0, 0.7, 1.85);
    group.add(arm1);

    const arm2 = new THREE.Mesh(armGeo, couchMat);
    arm2.position.set(0, 0.7, -1.85);
    group.add(arm2);

    group.position.set(x, 0, z);
    group.rotation.y = rotY;
    this.scene.add(group);

    this.registerThermalObject(seat, id);

    const sBox = new THREE.Box3().setFromObject(seat);
    this.jumpables.push({ box: sBox, topY: 0.6, mesh: seat });
    this.colliders.push({ box: sBox, mesh: seat, type: 'couch' });
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

      this.registerThermalObject(mesh, `${id}_${idx}`);
      const bbox = new THREE.Box3().setFromObject(mesh);
      this.colliders.push({ box: bbox, mesh, type: 'box' });
    });

    group.position.set(x, 0, z);
    this.scene.add(group);
  }

  // --- 7. Bouncy Yoga Balls (Dynamic Tripping Props) ---
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

    this.registerThermalObject(mesh, id);

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
      const leg = new THREE.Mesh(legGeo, woodMat);
      leg.position.set(Math.cos(angle) * 0.2, 0.225, Math.sin(angle) * 0.2);
      leg.rotation.z = Math.cos(angle) * 0.1;
      group.add(leg);
    }

    group.position.set(x, 0, z);
    this.scene.add(group);

    this.registerThermalObject(seat, id);
    const box = new THREE.Box3().setFromObject(seat);
    this.colliders.push({ box, mesh: seat, type: 'stool' });
  }

  // --- 9. Ceiling Fan ---
  buildCeilingFan(x, y, z) {
    const group = new THREE.Group();
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8, roughness: 0.3 });
    const bladeMat = new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.5 });

    // Rod
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.6, 12), metalMat);
    rod.position.set(0, 0.3, 0);
    group.add(rod);

    // Motor Hub
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.15, 16), metalMat);
    group.add(hub);

    // Light
    const light = new THREE.PointLight(0xfff3e0, 0.8, 12);
    light.position.set(0, -0.1, 0);
    group.add(light);

    // Blades
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

  // Trigger Thermal Impact Echo: neon cyan fading to thermal orange/yellow for 2.5 seconds
  triggerThermalEcho(meshOrId) {
    let target = null;
    if (typeof meshOrId === 'string') {
      for (const [mesh, data] of this.thermalObjects.entries()) {
        if (mesh.userData.thermalId === meshOrId) {
          target = { mesh, data };
          break;
        }
      }
    } else if (meshOrId && this.thermalObjects.has(meshOrId)) {
      target = { mesh: meshOrId, data: this.thermalObjects.get(meshOrId) };
    }

    if (target) {
      target.data.timer = 2.5; // 2.5 seconds radiant glow
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

        // Friction
        prop.vel.x *= 0.94;
        prop.vel.z *= 0.94;

        // Room wall bounds bounce
        if (Math.abs(prop.pos.x) > bounds - prop.radius) {
          prop.vel.x *= -0.7;
          prop.pos.x = Math.sign(prop.pos.x) * (bounds - prop.radius);
        }
        if (Math.abs(prop.pos.z) > bounds - prop.radius) {
          prop.vel.z *= -0.7;
          prop.pos.z = Math.sign(prop.pos.z) * (bounds - prop.radius);
        }

        // Rolling rotation
        const speed = Math.hypot(prop.vel.x, prop.vel.z);
        if (speed > 0.05) {
          prop.mesh.rotation.x += prop.vel.z * delta * 2.0;
          prop.mesh.rotation.z -= prop.vel.x * delta * 2.0;
        }
      }
    }

    // Update Thermal Echo radiant glows
    for (const [mesh, data] of this.thermalObjects.entries()) {
      if (data.timer > 0) {
        data.timer -= delta;
        const progress = Math.max(0, data.timer / 2.5); // 1.0 (new hit) down to 0.0 (faded)

        if (!data.material.emissive) continue;

        // Color transition: Neon Cyan (0x00ffff) -> Heat Orange (0xff6600) -> Yellow (0xffcc00) -> Dark
        const cyan = new THREE.Color(0x00ffff);
        const orange = new THREE.Color(0xff5500);
        const yellow = new THREE.Color(0xffcc00);

        let glowColor = new THREE.Color();
        if (progress > 0.6) {
          // Cyan to orange
          const t = (progress - 0.6) / 0.4;
          glowColor.lerpColors(orange, cyan, t);
        } else {
          // Orange to yellow to fade
          const t = progress / 0.6;
          glowColor.lerpColors(new THREE.Color(0x000000), yellow, t);
        }

        data.material.emissive.copy(glowColor);
        data.material.emissiveIntensity = progress * 2.0;

        if (data.timer <= 0) {
          data.material.emissive.copy(data.originalEmissive);
          data.material.emissiveIntensity = 0;
        }
      }
    }
  }
}
