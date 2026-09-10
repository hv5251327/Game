import * as THREE from 'three';

export class Physics {
  constructor(apartment, onThermalHit) {
    this.apartment = apartment;
    this.onThermalHit = onThermalHit;
    this.gravity = -18.0;
    this.lastBumpTime = 0;
  }

  // Check and resolve collisions for a player avatar
  resolvePlayerMovement(avatar, moveDir, delta, speed = 4.5) {
    if (!avatar.isAlive) return { x: avatar.root.position.x, y: avatar.root.position.y, z: avatar.root.position.z };

    const currentPos = avatar.root.position.clone();
    const isCrawling = avatar.isCrawling;
    const isFlatFlop = avatar.isFlatFlop;

    let charHeight = 1.6;
    let charRadius = 0.35;

    if (isFlatFlop) {
      charHeight = 0.25;
      charRadius = 0.45;
    } else if (isCrawling) {
      charHeight = 0.65;
      charRadius = 0.35;
    }

    const targetX = currentPos.x + moveDir.x * speed * delta;
    const targetZ = currentPos.z + moveDir.z * speed * delta;

    let finalX = targetX;
    let finalZ = targetZ;

    const now = Date.now();
    const bounds = 10.5;
    if (Math.abs(finalX) > bounds || Math.abs(finalZ) > bounds) {
      const wall = this.apartment.colliders.find(c => c.type === 'wall' && (
        (finalX > bounds && c.box.min.x > 0) || (finalX < -bounds && c.box.max.x < 0) ||
        (finalZ > bounds && c.box.min.z > 0) || (finalZ < -bounds && c.box.max.z < 0)
      ));
      if (wall && this.onThermalHit && now - this.lastBumpTime > 500) {
        this.lastBumpTime = now;
        this.onThermalHit(wall.mesh);
      }
    }
    finalX = Math.max(-bounds, Math.min(bounds, finalX));
    finalZ = Math.max(-bounds, Math.min(bounds, finalZ));

    for (const collider of this.apartment.colliders) {
      const box = collider.box;
      const expandedBox = box.clone().expandByScalar(charRadius);

      const avatarMinY = currentPos.y;
      const avatarMaxY = currentPos.y + charHeight;
      const yOverlap = (avatarMinY < box.max.y && avatarMaxY > box.min.y);

      if (yOverlap) {
        if (finalX >= expandedBox.min.x && finalX <= expandedBox.max.x &&
            finalZ >= expandedBox.min.z && finalZ <= expandedBox.max.z) {

          let canCrawlUnder = false;
          for (const crawlable of this.apartment.crawlables) {
            if (crawlable.box.containsPoint(new THREE.Vector3(finalX, 0.1, finalZ))) {
              if (charHeight <= crawlable.clearance) {
                canCrawlUnder = true;
                break;
              }
            }
          }

          if (canCrawlUnder) continue;

          // Trigger thermal hit on bump with 1.0s debounce (no continuous loop!)
          if (now - this.lastBumpTime > 1000) {
            this.lastBumpTime = now;
            if (this.onThermalHit && collider.mesh) {
              this.onThermalHit(collider.mesh);
            }
          }

          // Resolve collision
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

    // Dynamic Yoga Ball interaction
    for (const prop of this.apartment.interactiveProps) {
      if (prop.isYogaBall) {
        const dx = finalX - prop.pos.x;
        const dz = finalZ - prop.pos.z;
        const dist = Math.hypot(dx, dz);
        const minDist = charRadius + prop.radius;

        if (dist < minDist && dist > 0.001) {
          const pushForce = speed * 1.5;
          prop.vel.x -= (dx / dist) * pushForce;
          prop.vel.z -= (dz / dist) * pushForce;

          const pushBack = (minDist - dist) * 0.5;
          finalX += (dx / dist) * pushBack;
          finalZ += (dz / dist) * pushBack;

          if (now - this.lastBumpTime > 1000) {
            this.lastBumpTime = now;
            if (this.onThermalHit && prop.mesh) {
              this.onThermalHit(prop.mesh);
            }
          }
        }
      }
    }

    return { x: finalX, y: currentPos.y, z: finalZ };
  }

  resolveVerticalPhysics(avatar, delta, isJumping = false, jumpVelocity = 0) {
    let currentY = avatar.root.position.y;
    let targetGroundY = 0;

    const posX = avatar.root.position.x;
    const posZ = avatar.root.position.z;

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
      newVy = jumpVelocity || 6.5;
    }

    let newY = currentY + newVy * delta;

    if (newY <= targetGroundY) {
      newY = targetGroundY;
      newVy = 0;
    }

    avatar.verticalVelocity = newVy;
    avatar.isOnGround = (newY <= targetGroundY + 0.05);

    return newY;
  }
}
