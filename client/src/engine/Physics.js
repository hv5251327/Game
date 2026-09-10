import * as THREE from 'three';

export class Physics {
  constructor(apartment, onThermalHit) {
    this.apartment = apartment;
    this.onThermalHit = onThermalHit;
    this.gravity = -18.0;
  }

  // Check and resolve collisions for a player avatar
  resolvePlayerMovement(avatar, moveDir, delta, speed = 4.5) {
    if (!avatar.isAlive) return { x: avatar.root.position.x, y: avatar.root.position.y, z: avatar.root.position.z };

    const currentPos = avatar.root.position.clone();
    const isCrawling = avatar.isCrawling;
    const isFlatFlop = avatar.isFlatFlop;

    // Determine current character collision height and radius
    let charHeight = 1.6;
    let charRadius = 0.35;

    if (isFlatFlop) {
      charHeight = 0.25;
      charRadius = 0.45;
    } else if (isCrawling) {
      charHeight = 0.65;
      charRadius = 0.35;
    }

    // Proposed new position
    const targetX = currentPos.x + moveDir.x * speed * delta;
    const targetZ = currentPos.z + moveDir.z * speed * delta;

    let finalX = targetX;
    let finalZ = targetZ;

    // Room boundaries (22m room -> -10.5 to 10.5)
    const bounds = 10.5;
    finalX = Math.max(-bounds, Math.min(bounds, finalX));
    finalZ = Math.max(-bounds, Math.min(bounds, finalZ));

    // Check collision with apartment objects
    for (const collider of this.apartment.colliders) {
      const box = collider.box;

      // Expand box by character radius for sphere/cylinder collision
      const expandedBox = box.clone().expandByScalar(charRadius);

      // Check if avatar's vertical span overlaps the box
      const avatarMinY = currentPos.y;
      const avatarMaxY = currentPos.y + charHeight;

      const yOverlap = (avatarMinY < box.max.y && avatarMaxY > box.min.y);

      if (yOverlap) {
        // Check horizontal intersection
        if (finalX >= expandedBox.min.x && finalX <= expandedBox.max.x &&
            finalZ >= expandedBox.min.z && finalZ <= expandedBox.max.z) {

          // Check if object is crawlable and character fits underneath
          let canCrawlUnder = false;
          for (const crawlable of this.apartment.crawlables) {
            if (crawlable.box.containsPoint(new THREE.Vector3(finalX, 0.1, finalZ))) {
              if (charHeight <= crawlable.clearance) {
                canCrawlUnder = true;
                break;
              }
            }
          }

          if (canCrawlUnder) {
            // Can pass underneath!
            continue;
          }

          // Trigger Thermal Impact Echo if Hitter bumps into it
          if (this.onThermalHit && collider.mesh) {
            this.onThermalHit(collider.mesh);
          }

          // Resolve collision along axes
          const overlapX1 = finalX - expandedBox.min.x;
          const overlapX2 = expandedBox.max.x - finalX;
          const overlapZ1 = finalZ - expandedBox.min.z;
          const overlapZ2 = expandedBox.max.z - finalZ;

          const minOverlapX = Math.min(overlapX1, overlapX2);
          const minOverlapZ = Math.min(overlapZ1, overlapZ2);

          if (minOverlapX < minOverlapZ) {
            finalX = (overlapX1 < overlapX2) ? expandedBox.min.x : expandedBox.max.x;
          } else {
            finalZ = (overlapZ1 < overlapZ2) ? expandedBox.min.z : expandedBox.max.z;
          }
        }
      }
    }

    // Interactive yoga balls collision & push
    for (const prop of this.apartment.interactiveProps) {
      if (prop.isYogaBall) {
        const dx = finalX - prop.pos.x;
        const dz = finalZ - prop.pos.z;
        const dist = Math.hypot(dx, dz);
        const minDist = charRadius + prop.radius;

        if (dist < minDist && dist > 0.001) {
          // Push ball away
          const pushForce = speed * 1.5;
          prop.vel.x -= (dx / dist) * pushForce;
          prop.vel.z -= (dz / dist) * pushForce;

          // Push player back slightly
          const pushBack = (minDist - dist) * 0.5;
          finalX += (dx / dist) * pushBack;
          finalZ += (dz / dist) * pushBack;

          if (this.onThermalHit && prop.mesh) {
            this.onThermalHit(prop.mesh);
          }
        }
      }
    }

    return { x: finalX, y: currentPos.y, z: finalZ };
  }

  // Handle jump, ground detection, and landing on beds/furniture
  resolveVerticalPhysics(avatar, delta, isJumping = false, jumpVelocity = 0) {
    let currentY = avatar.root.position.y;
    let targetGroundY = 0;

    const posX = avatar.root.position.x;
    const posZ = avatar.root.position.z;

    // Check if player is above any jumpable platform (bed, daybed, couch)
    for (const jumpable of this.apartment.jumpables) {
      const box = jumpable.box;
      if (posX >= box.min.x && posX <= box.max.x && posZ >= box.min.z && posZ <= box.max.z) {
        if (currentY >= jumpable.topY - 0.2) {
          targetGroundY = Math.max(targetGroundY, jumpable.topY);
        }
      }
    }

    let newVy = (avatar.verticalVelocity || 0) + this.gravity * delta;

    if (isJumping && currentY <= targetGroundY + 0.1) {
      newVy = jumpVelocity || 6.5; // Jump impulse
    }

    let newY = currentY + newVy * delta;

    // Ground snap
    if (newY <= targetGroundY) {
      newY = targetGroundY;
      newVy = 0;
    }

    avatar.verticalVelocity = newVy;
    avatar.isOnGround = (newY <= targetGroundY + 0.05);

    return newY;
  }
}
