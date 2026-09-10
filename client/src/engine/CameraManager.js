import * as THREE from 'three';

export class CameraManager {
  constructor(camera, domElement) {
    this.camera = camera;
    this.domElement = domElement;

    this.mode = 'THIRD_PERSON'; // 'FIRST_PERSON', 'THIRD_PERSON', or 'HITTER_PEEP'
    this.yaw = 0;
    this.pitch = 0.22;
    this.isPointerLocked = false;
    this.headBobTimer = 0;

    this.initControls();
  }

  initControls() {
    // Click on canvas to request pointer lock
    this.domElement.addEventListener('mousedown', (e) => {
      // Only lock on left click or middle click if not clicking UI
      if (document.pointerLockElement !== this.domElement) {
        this.domElement.requestPointerLock?.();
      }
    });

    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = (document.pointerLockElement === this.domElement);
    });

    document.addEventListener('mousemove', (e) => {
      if (this.isPointerLocked) {
        const sensitivity = 0.0022;
        this.yaw -= e.movementX * sensitivity;
        this.pitch -= e.movementY * sensitivity;

        // Clamp pitch so camera doesn't flip
        this.pitch = Math.max(-Math.PI / 2.6, Math.min(Math.PI / 2.6, this.pitch));
      }
    });

    // Touch look drag for mobile devices
    let touchStartX = 0;
    let touchStartY = 0;
    this.domElement.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      }
    }, { passive: true });

    this.domElement.addEventListener('touchmove', (e) => {
      if (e.touches.length === 1) {
        const touchX = e.touches[0].clientX;
        const touchY = e.touches[0].clientY;
        const dx = touchX - touchStartX;
        const dy = touchY - touchStartY;
        touchStartX = touchX;
        touchStartY = touchY;

        const sensitivity = 0.004;
        this.yaw -= dx * sensitivity;
        this.pitch -= dy * sensitivity;
        this.pitch = Math.max(-Math.PI / 2.6, Math.min(Math.PI / 2.6, this.pitch));
      }
    }, { passive: true });
  }

  togglePerspective() {
    if (this.mode === 'THIRD_PERSON') {
      this.mode = 'FIRST_PERSON';
    } else {
      this.mode = 'THIRD_PERSON';
    }
    return this.mode;
  }

  setRole(role) {
    if (role === 'HITTER') {
      this.mode = 'HITTER_PEEP';
    } else if (this.mode === 'HITTER_PEEP') {
      this.mode = 'THIRD_PERSON';
    }
  }

  update(avatar, delta) {
    if (!avatar) return;

    const targetPos = avatar.root.position;
    const isMoving = avatar.isMoving;

    if (isMoving) {
      this.headBobTimer += delta * 10.0;
    } else {
      this.headBobTimer = 0;
    }
    const bob = Math.sin(this.headBobTimer) * 0.04;

    if (this.mode === 'FIRST_PERSON') {
      // First-Person eye level
      const eyeHeight = (avatar.isCrawling ? 0.55 : (avatar.isFlatFlop ? 0.22 : 1.45)) + bob;
      this.camera.position.set(targetPos.x, targetPos.y + eyeHeight, targetPos.z);

      const lookTarget = new THREE.Vector3(
        targetPos.x - Math.sin(this.yaw) * Math.cos(this.pitch) * 10,
        targetPos.y + eyeHeight + Math.sin(this.pitch) * 10,
        targetPos.z - Math.cos(this.yaw) * Math.cos(this.pitch) * 10
      );
      this.camera.lookAt(lookTarget);

    } else if (this.mode === 'HITTER_PEEP') {
      // Low-angle strip tracking camera for the Hitter (matching the bottom 15% strip view)
      const camDist = 3.2;
      const camHeight = 1.55;
      const camX = targetPos.x + Math.sin(this.yaw) * camDist;
      const camZ = targetPos.z + Math.cos(this.yaw) * camDist;

      this.camera.position.set(camX, targetPos.y + camHeight, camZ);
      const lookTarget = new THREE.Vector3(
        targetPos.x - Math.sin(this.yaw) * 4,
        targetPos.y + 0.85,
        targetPos.z - Math.cos(this.yaw) * 4
      );
      this.camera.lookAt(lookTarget);

    } else {
      // Default: Third-Person over the shoulder
      const camDist = 3.6;
      const camHeight = (avatar.isCrawling ? 1.2 : 2.0);
      const camX = targetPos.x + Math.sin(this.yaw) * Math.cos(this.pitch * 0.5) * camDist;
      const camY = targetPos.y + camHeight + Math.sin(this.pitch) * camDist * 0.6;
      const camZ = targetPos.z + Math.cos(this.yaw) * Math.cos(this.pitch * 0.5) * camDist;

      this.camera.position.set(camX, Math.max(0.3, camY), camZ);

      const lookTarget = new THREE.Vector3(
        targetPos.x,
        targetPos.y + (avatar.isCrawling ? 0.45 : 1.05),
        targetPos.z
      );
      this.camera.lookAt(lookTarget);
    }
  }
}
