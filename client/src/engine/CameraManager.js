import * as THREE from 'three';

export class CameraManager {
  constructor(camera, domElement) {
    this.camera = camera;
    this.domElement = domElement;

    this.mode = 'THIRD_PERSON'; // 'FIRST_PERSON', 'THIRD_PERSON', or 'HITTER_PEEP'
    this.yaw = 0;
    this.pitch = 0.22;
    this.isPointerLocked = false;
    this.isDragging = false;
    this.lastPointer = { x: 0, y: 0 };
    this.headBobTimer = 0;

    this.initControls();
  }

  initControls() {
    // Click on canvas to request pointer lock
    this.domElement.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      this.isDragging = true;
      this.lastPointer = { x: e.clientX, y: e.clientY };
      if (document.pointerLockElement !== this.domElement) {
        this.domElement.requestPointerLock?.();
      }
    });

    window.addEventListener('mouseup', () => { this.isDragging = false; });

    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = (document.pointerLockElement === this.domElement);
    });

    document.addEventListener('mousemove', (e) => {
      if (!this.isPointerLocked && !this.isDragging) return;
      const dx = this.isPointerLocked ? e.movementX : e.clientX - this.lastPointer.x;
      const dy = this.isPointerLocked ? e.movementY : e.clientY - this.lastPointer.y;
      this.lastPointer = { x: e.clientX, y: e.clientY };
      const sensitivity = 0.0026;
      this.yaw -= dx * sensitivity;
      this.pitch = Math.max(-Math.PI / 2.6, Math.min(Math.PI / 2.6, this.pitch - dy * sensitivity));
    });

    // Touch look drag for mobile devices (multi-touch friendly)
    let lookTouchId = null;
    let lookStartX = 0;
    let lookStartY = 0;

    this.domElement.addEventListener('touchstart', (e) => {
      if (lookTouchId === null && e.changedTouches.length > 0) {
        const t = e.changedTouches[0];
        lookTouchId = t.identifier;
        lookStartX = t.clientX;
        lookStartY = t.clientY;
      }
    }, { passive: true });

    this.domElement.addEventListener('touchmove', (e) => {
      if (lookTouchId === null) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (t.identifier === lookTouchId) {
          const dx = t.clientX - lookStartX;
          const dy = t.clientY - lookStartY;
          lookStartX = t.clientX;
          lookStartY = t.clientY;

          const sensitivity = 0.0045;
          this.yaw -= dx * sensitivity;
          this.pitch = Math.max(-Math.PI / 2.6, Math.min(Math.PI / 2.6, this.pitch - dy * sensitivity));
          break;
        }
      }
    }, { passive: true });

    const endLookTouch = (e) => {
      if (lookTouchId === null) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === lookTouchId) {
          lookTouchId = null;
          break;
        }
      }
    };

    this.domElement.addEventListener('touchend', endLookTouch, { passive: true });
    this.domElement.addEventListener('touchcancel', endLookTouch, { passive: true });
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
