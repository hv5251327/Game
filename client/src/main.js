import * as THREE from 'three';
import { AudioEngine } from './engine/AudioEngine.js';
import { Apartment } from './engine/Apartment.js';
import { RagdollAvatar } from './engine/RagdollAvatar.js';
import { Physics } from './engine/Physics.js';
import { CameraManager } from './engine/CameraManager.js';
import { NetworkClient } from './engine/NetworkClient.js';
import { supabaseService } from './engine/SupabaseService.js';

class HittlersGame {
  constructor() {
    this.scene = null;
    this.camera = null;
    this.renderer = null;

    this.audio = new AudioEngine();
    this.apartment = null;
    this.physics = null;
    this.cameraManager = null;
    this.network = null;
    this.supabase = supabaseService;

    this.localPlayer = null;
    this.remotePlayers = new Map(); // id -> RagdollAvatar
    this.remoteData = new Map(); // id -> latest server data

    this.keys = {};
    this.touchMove = { x: 0, y: 0 };
    this.lastSwingTime = 0;
    this.lastTime = performance.now();

    // DOM Elements
    this.domLobby = document.getElementById('lobby-screen');
    this.domHud = document.getElementById('hud');
    this.domPeepDarkness = document.getElementById('peep-darkness-mask');
    this.domTimer = document.getElementById('match-timer');
    this.domRoleBadge = document.getElementById('role-badge');
    this.domRoleDesc = document.getElementById('role-desc');
    this.domHpBar = document.getElementById('hp-bar');
    this.domHpFill = document.getElementById('hp-fill');
    this.domHpText = document.getElementById('hp-text');
    this.domEndOverlay = document.getElementById('end-overlay');
    this.domEndTitle = document.getElementById('end-title');
    this.domEndSubtitle = document.getElementById('end-subtitle');
    this.domFlailAlert = document.getElementById('flail-alert');
    this.domHitFeed = document.getElementById('hit-feed');
    this.domLeaderboardModal = document.getElementById('leaderboard-modal');
    this.domLeaderboardList = document.getElementById('leaderboard-list');

    this.init();
  }

  init() {
    // 1. Setup Three.js Scene & Renderer
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x181926);
    this.scene.fog = new THREE.FogExp2(0x181926, 0.025);

    this.camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 100);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.getElementById('canvas-container').appendChild(this.renderer.domElement);

    // 2. Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xfff5e6, 1.3);
    dirLight.position.set(12, 16, 10);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 45;
    const d = 15;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    this.scene.add(dirLight);

    // 3. Environment & Physics
    this.apartment = new Apartment(this.scene);
    this.physics = new Physics(this.apartment, (mesh) => {
      // Thermal echo outline pulse on bump
      if (this.localPlayer && this.localPlayer.role === 'HITTER') {
        this.apartment.triggerThermalEcho(mesh);
        this.network.triggerThermalEcho(mesh.userData.thermalId, mesh.position);
        this.audio.playThud();
      }
    });

    // 4. Camera Manager
    this.cameraManager = new CameraManager(this.camera, this.renderer.domElement);

    // 5. Local Human: Fall Flat Avatar
    this.localPlayer = new RagdollAvatar(this.scene, '#2ed573', true);

    // 6. Network Client & Event Callbacks
    this.network = new NetworkClient({
      onRoomJoined: (data) => this.handleRoomJoined(data),
      onCountdownStarted: (data) => this.handleCountdownStarted(data),
      onRoundStarted: (data) => this.handleRoundStarted(data),
      onRoundEnded: (data) => this.handleRoundEnded(data),
      onPlayerSwungBat: (data) => this.handleRemoteBatSwing(data),
      onPlayerHit: (data) => this.handlePlayerHit(data),
      onThermalEchoPulsed: (data) => this.handleThermalEchoPulsed(data),
      onGameTick: (data) => this.handleGameTick(data)
    });

    // 7. Input Listeners
    this.bindInputs();

    // 8. Window Resize
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // 9. Start Game Loop
    this.animate();
  }

  bindInputs() {
    // Keyboard
    window.addEventListener('keydown', (e) => {
      this.audio.ensureContext();
      this.keys[e.code] = true;

      // Stick / Bat Swing: 'KeyX' or 'Space' (when Hitter)
      if (e.code === 'KeyX' || (e.code === 'Space' && this.localPlayer.role === 'HITTER')) {
        this.triggerLocalBatSwing();
      }

      // Perspective Toggle (V key)
      if (e.code === 'KeyV' && this.localPlayer.role === 'RUNNER') {
        const mode = this.cameraManager.togglePerspective();
        this.showHitFeedNotice(`Camera switched to ${mode.replace('_', ' ')}`);
      }

      // Flat Flop ('F' key - belly flop to slide under beds)
      if (e.code === 'KeyF') {
        this.localPlayer.isFlatFlop = !this.localPlayer.isFlatFlop;
        if (this.localPlayer.isFlatFlop) {
          this.localPlayer.isCrawling = false;
          this.localPlayer.isSitting = false;
          this.audio.playThud();
        }
      }

      // Sit ('C' key)
      if (e.code === 'KeyC') {
        this.localPlayer.isSitting = !this.localPlayer.isSitting;
        if (this.localPlayer.isSitting) {
          this.localPlayer.isFlatFlop = false;
          this.localPlayer.isCrawling = false;
        }
      }

      // Grab ('E' key)
      if (e.code === 'KeyE') {
        this.localPlayer.isGrabbing = true;
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
      if (e.code === 'KeyE') {
        this.localPlayer.isGrabbing = false;
      }
    });

    // Mouse Left-Click Bat Swing (when Hitter)
    this.renderer.domElement.addEventListener('mousedown', (e) => {
      if (e.button === 0 && this.localPlayer.role === 'HITTER') {
        this.triggerLocalBatSwing();
      }
    });

    // Touch Joystick for Mobile
    const joyContainer = document.getElementById('touch-joystick');
    const joyKnob = document.getElementById('touch-knob');
    if (joyContainer && joyKnob) {
      let joyActive = false;
      let startX = 0, startY = 0;

      joyContainer.addEventListener('touchstart', (e) => {
        this.audio.ensureContext();
        joyActive = true;
        const touch = e.touches[0];
        const rect = joyContainer.getBoundingClientRect();
        startX = rect.left + rect.width / 2;
        startY = rect.top + rect.height / 2;
      }, { passive: true });

      joyContainer.addEventListener('touchmove', (e) => {
        if (!joyActive) return;
        const touch = e.touches[0];
        const dx = touch.clientX - startX;
        const dy = touch.clientY - startY;
        const dist = Math.hypot(dx, dy);
        const maxDist = 45;
        const clampedDist = Math.min(dist, maxDist);
        const angle = Math.atan2(dy, dx);

        const kx = Math.cos(angle) * clampedDist;
        const ky = Math.sin(angle) * clampedDist;
        joyKnob.style.transform = `translate(${kx}px, ${ky}px)`;

        this.touchMove.x = kx / maxDist;
        this.touchMove.y = ky / maxDist;
      }, { passive: true });

      const resetJoy = () => {
        joyActive = false;
        joyKnob.style.transform = `translate(0px, 0px)`;
        this.touchMove.x = 0;
        this.touchMove.y = 0;
      };

      joyContainer.addEventListener('touchend', resetJoy);
      joyContainer.addEventListener('touchcancel', resetJoy);
    }

    // Touch Action Buttons
    this.bindTouchButton('btn-jump', () => {
      if (this.localPlayer.isOnGround) {
        this.physics.resolveVerticalPhysics(this.localPlayer, 0.016, true, 6.5);
      }
    });
    this.bindTouchButton('btn-crawl', () => {
      this.localPlayer.isCrawling = !this.localPlayer.isCrawling;
      if (this.localPlayer.isCrawling) this.localPlayer.isFlatFlop = false;
    });
    this.bindTouchButton('btn-flop', () => {
      this.localPlayer.isFlatFlop = !this.localPlayer.isFlatFlop;
      if (this.localPlayer.isFlatFlop) {
        this.localPlayer.isCrawling = false;
        this.audio.playThud();
      }
    });
    this.bindTouchButton('btn-sit', () => {
      this.localPlayer.isSitting = !this.localPlayer.isSitting;
    });
    this.bindTouchButton('btn-swing', () => {
      this.triggerLocalBatSwing();
    });
    this.bindTouchButton('btn-view', () => {
      if (this.localPlayer.role === 'RUNNER') {
        this.cameraManager.togglePerspective();
      }
    });

    // Lobby Buttons
    document.getElementById('btn-solo-hitter')?.addEventListener('click', () => {
      const roomCode = 'SOLO-' + Math.floor(Math.random() * 900 + 100);
      const nickname = 'The Hitter';
      const color = '#ff4757';
      const botCount = 9;

      this.audio.ensureContext();
      this.localPlayer.setColor(color);
      this.setRole('HITTER');

      this.network.joinRoom(roomCode, nickname, color, botCount);
      this.domLobby.classList.add('hidden');
      this.domHud.classList.remove('hidden');

      setTimeout(() => {
        this.network.socket?.emit('start_game', { forceHitter: true });
      }, 500);
    });

    document.getElementById('btn-solo-runner')?.addEventListener('click', () => {
      const roomCode = 'SOLO-' + Math.floor(Math.random() * 900 + 100);
      const nickname = 'RagdollRunner';
      const color = '#2ed573';
      const botCount = 9;

      this.audio.ensureContext();
      this.localPlayer.setColor(color);
      this.setRole('RUNNER');

      this.network.joinRoom(roomCode, nickname, color, botCount);
      this.domLobby.classList.add('hidden');
      this.domHud.classList.remove('hidden');

      setTimeout(() => {
        this.network.startGame();
      }, 500);
    });

    document.getElementById('btn-join-room')?.addEventListener('click', () => {
      const roomCode = document.getElementById('input-room-code').value.trim() || 'LOBBY-1';
      const nickname = document.getElementById('input-nickname').value.trim() || 'SlapstickHero';
      const color = document.getElementById('input-color').value || '#2ed573';
      const botCount = parseInt(document.getElementById('input-bots').value, 10) || 0;

      this.audio.ensureContext();
      this.localPlayer.setColor(color);
      this.network.joinRoom(roomCode, nickname, color, botCount);
      this.domLobby.classList.add('hidden');
      this.domHud.classList.remove('hidden');
    });

    document.getElementById('btn-start-match')?.addEventListener('click', () => {
      this.audio.ensureContext();
      this.network.startGame();
    });

    document.getElementById('btn-toggle-role')?.addEventListener('click', () => {
      const nextRole = (this.localPlayer.role === 'HITTER') ? 'RUNNER' : 'HITTER';
      this.setRole(nextRole);
      this.network.socket?.emit('switch_role', { role: nextRole });
      this.showHitFeedNotice(`Switched role to ${nextRole}!`);
    });

    // Leaderboard Modal
    document.getElementById('btn-show-leaderboard')?.addEventListener('click', async () => {
      this.domLeaderboardModal?.classList.remove('hidden');
      this.loadLeaderboardData();
    });

    document.getElementById('btn-close-leaderboard')?.addEventListener('click', () => {
      this.domLeaderboardModal?.classList.add('hidden');
    });
  }

  setRole(role) {
    this.localPlayer.setRole(role);
    this.cameraManager.setRole(role);
    this.updateRoleUi(role);
  }

  async loadLeaderboardData() {
    if (!this.domLeaderboardList) return;
    this.domLeaderboardList.innerHTML = '<div style="color:#aaa; padding:20px;">Loading Supabase leaderboard...</div>';

    const scores = await this.supabase.getLeaderboard(10);
    if (!scores || scores.length === 0) {
      this.domLeaderboardList.innerHTML = `
        <div style="color:#888; padding:20px;">
          No match records yet. Play a match to climb the Supabase Leaderboard!
        </div>`;
      return;
    }

    this.domLeaderboardList.innerHTML = scores.map((s, idx) => `
      <div class="leaderboard-item">
        <span class="lb-rank">#${idx + 1}</span>
        <span class="lb-name" style="color: ${s.avatar_color || '#fff'}">${s.username || 'Hero'}</span>
        <span class="lb-stat">🏃 Escapes: ${s.runner_escapes || 0}</span>
        <span class="lb-stat">🔨 Sweeps: ${s.hitter_clean_sweeps || 0}</span>
      </div>
    `).join('');
  }

  bindTouchButton(id, callback) {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.audio.ensureContext();
      callback();
    }, { passive: false });
    el.addEventListener('click', () => {
      this.audio.ensureContext();
      callback();
    });
  }

  triggerLocalBatSwing() {
    const now = Date.now();
    if (now - this.lastSwingTime < 750) return; // 0.8s cooldown
    this.lastSwingTime = now;

    this.localPlayer.triggerBatSwing();
    this.audio.playBatWhoosh();
    this.network.swingBat();

    // Check hit against obstacles in front for Thermal Impact Echo
    const forward = new THREE.Vector3(
      -Math.sin(this.cameraManager.yaw),
      0,
      -Math.cos(this.cameraManager.yaw)
    );

    const hitCheckPos = this.localPlayer.root.position.clone().add(forward.clone().multiplyScalar(1.6));
    for (const collider of this.apartment.colliders) {
      if (collider.box.containsPoint(hitCheckPos)) {
        this.apartment.triggerThermalEcho(collider.mesh);
        this.audio.playBatThwack();
        break;
      }
    }
  }

  handleRoomJoined(data) {
    console.log('Joined room:', data);
    this.showHitFeedNotice(`Joined ${data.roomCode}!`);
  }

  handleCountdownStarted(data) {
    this.audio.playBuzzer();
    this.domEndOverlay.classList.add('hidden');
    this.showHitFeedNotice(`🚨 Selection: ${data.hitterName} is THE HITTER! Round starting in 3s!`);
  }

  handleRoundStarted(data) {
    this.showHitFeedNotice(`⚡ ROUND STARTED! SURVIVE 120 SECONDS!`);
  }

  handleRoundEnded(data) {
    this.domEndOverlay.classList.remove('hidden');

    if (data.winner === 'RUNNERS') {
      this.domEndTitle.textContent = '🎉 RUNNERS SURVIVED!';
      this.domEndTitle.style.color = '#2ed573';
      this.domEndSubtitle.textContent = data.reason || 'The 120s clock expired! Runners victory dance!';
      this.audio.playVictoryFanfare();

      if (this.localPlayer.role === 'RUNNER' && this.localPlayer.isAlive) {
        this.localPlayer.isDancing = true;
      }
    } else {
      this.domEndTitle.textContent = '🔨 HITTER CLEAN SWEEP!';
      this.domEndTitle.style.color = '#ff4757';
      this.domEndSubtitle.textContent = data.reason || 'All runners were knocked flat out!';
      this.audio.playVictoryFanfare();
    }

    this.supabase.recordMatch({
      roomCode: this.network.roomCode,
      hitterName: data.hitterName,
      winner: data.winner,
      duration: 120,
      totalRunners: this.remotePlayers.size + 1
    });
  }

  handleRemoteBatSwing(data) {
    const avatar = this.remotePlayers.get(data.hitterId);
    if (avatar) {
      avatar.triggerBatSwing();
      this.audio.playBatWhoosh();
    }
  }

  handlePlayerHit(data) {
    this.audio.playBatThwack();
    this.audio.playScream(Math.floor(Math.random() * 4));

    this.showHitFeedNotice(`💥 ${data.victimName} got WHACKED! (-${data.damage} HP)`);

    if (data.victimId === this.network.myId) {
      // Local player hit!
      this.localPlayer.hp = data.remainingHp;
      this.localPlayer.isFlailing = true;
      this.localPlayer.flailTimer = 3.0;
      this.updateHpUi();

      this.domFlailAlert.classList.remove('hidden');
      setTimeout(() => this.domFlailAlert.classList.add('hidden'), 3000);

      if (data.isKnockedOut) {
        this.localPlayer.isAlive = false;
        this.showHitFeedNotice(`💀 YOU WERE KNOCKED FLAT OUT!`);
      }
    } else {
      // Remote player hit
      const remote = this.remotePlayers.get(data.victimId);
      if (remote) {
        remote.hp = data.remainingHp;
        remote.isFlailing = true;
        remote.flailTimer = 3.0;
        if (data.isKnockedOut) {
          remote.isAlive = false;
        }
      }
    }
  }

  handleThermalEchoPulsed(data) {
    if (data.objectId) {
      this.apartment.triggerThermalEcho(data.objectId);
    }
  }

  handleGameTick(data) {
    this.domTimer.textContent = `${data.timer}s`;

    const activeIds = new Set();

    for (const p of data.players) {
      activeIds.add(p.id);

      if (p.id === this.network.myId) {
        if (this.localPlayer.role !== p.role) {
          this.setRole(p.role);
        }
        if (!p.isAlive) {
          this.localPlayer.isAlive = false;
        }
      } else {
        let remote = this.remotePlayers.get(p.id);
        if (!remote) {
          remote = new RagdollAvatar(this.scene, p.color || '#ff4757', false);
          this.remotePlayers.set(p.id, remote);
        }

        remote.setRole(p.role);
        remote.hp = p.hp;
        remote.isAlive = p.isAlive;
        remote.isFlailing = p.isFlailing;
        remote.isFlatFlop = p.isFlatFlop;
        remote.isCrawling = p.isCrawling;
        remote.isSitting = p.isSitting;
        remote.isGrabbing = p.isGrabbing;
        remote.spinePitch = p.spinePitch;

        this.remoteData.set(p.id, p);
      }
    }

    for (const [id, avatar] of this.remotePlayers.entries()) {
      if (!activeIds.has(id)) {
        avatar.destroy();
        this.remotePlayers.delete(id);
        this.remoteData.delete(id);
      }
    }
  }

  updateRoleUi(role) {
    if (role === 'HITTER') {
      this.domRoleBadge.textContent = '🔨 THE HITTER';
      this.domRoleBadge.className = 'role-badge hitter';
      this.domRoleDesc.textContent = '85% Blind! Press X or Space or Click to Swing Stick. Bump furniture to trigger Thermal Echoes!';
      this.domPeepDarkness.classList.remove('hidden'); // Peep Darkness active!
      this.domHpBar.classList.add('hidden');
    } else {
      this.domRoleBadge.textContent = '🏃 RUNNER';
      this.domRoleBadge.className = 'role-badge runner';
      this.domRoleDesc.textContent = 'Survive 120s! Crawl under tables, jump on beds, toggle 1st/3rd view with V!';
      this.domPeepDarkness.classList.add('hidden'); // Darkness off for Runners!
      this.domHpBar.classList.remove('hidden');
      this.updateHpUi();
    }
  }

  updateHpUi() {
    const hp = Math.max(0, this.localPlayer.hp);
    this.domHpFill.style.width = `${hp}%`;
    this.domHpText.textContent = `${hp} / 100 HP`;
    if (hp <= 25) {
      this.domHpFill.style.background = '#ff4757';
    } else if (hp <= 50) {
      this.domHpFill.style.background = '#ffa502';
    } else {
      this.domHpFill.style.background = '#2ed573';
    }
  }

  showHitFeedNotice(msg) {
    const item = document.createElement('div');
    item.className = 'hit-feed-item';
    item.textContent = msg;
    this.domHitFeed.appendChild(item);
    setTimeout(() => {
      item.remove();
    }, 4000);
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const now = performance.now();
    const delta = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;

    // 1. Locomotion Input (WASD, Arrow Keys, Touch Joystick)
    let moveX = 0;
    let moveZ = 0;

    if (this.keys['KeyW'] || this.keys['ArrowUp']) moveZ -= 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) moveZ += 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) moveX -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) moveX += 1;

    if (this.touchMove.x !== 0 || this.touchMove.y !== 0) {
      moveX = this.touchMove.x;
      moveZ = this.touchMove.y;
    }

    const isMoving = (Math.abs(moveX) > 0.05 || Math.abs(moveZ) > 0.05);

    // Spine Pitch / Ducking Controls (Q/Z / Mouse Pitch)
    if (this.keys['KeyQ']) {
      this.localPlayer.spinePitch = Math.min(1.0, this.localPlayer.spinePitch + delta * 3.0);
    } else if (this.keys['KeyZ']) {
      this.localPlayer.spinePitch = Math.max(-1.0, this.localPlayer.spinePitch - delta * 3.0);
    } else {
      this.localPlayer.spinePitch *= 0.9;
    }

    // Crouch / Crawl
    this.localPlayer.isCrawling = (this.keys['ControlLeft'] || this.keys['ShiftLeft'] || this.localPlayer.isCrawling);

    // Jump (Space key when Runner)
    const isJumping = (this.keys['Space'] && this.localPlayer.role === 'RUNNER');

    // Direction relative to camera yaw
    const yaw = this.cameraManager.yaw;
    const moveDir = new THREE.Vector3(
      moveX * Math.cos(yaw) + moveZ * Math.sin(yaw),
      0,
      -moveX * Math.sin(yaw) + moveZ * Math.cos(yaw)
    );
    if (moveDir.length() > 1.0) moveDir.normalize();

    if (isMoving) {
      const targetAngle = Math.atan2(-moveDir.x, -moveDir.z);
      this.localPlayer.root.rotation.y = targetAngle;
      if (Math.random() < 0.05) this.audio.playFootstep();
    }

    // 2. Physics & Collisions (Uniform 4.5 m/s)
    const newPos = this.physics.resolvePlayerMovement(this.localPlayer, moveDir, delta, 4.5);
    const newY = this.physics.resolveVerticalPhysics(this.localPlayer, delta, isJumping);

    this.localPlayer.root.position.set(newPos.x, newY, newPos.z);
    this.localPlayer.updateAnimation(delta, isMoving);

    // 3. Sync Network Input
    if (this.network.connected) {
      this.network.sendInput({
        position: { x: newPos.x, y: newY, z: newPos.z },
        rotation: { y: this.localPlayer.root.rotation.y },
        spinePitch: this.localPlayer.spinePitch,
        isFlatFlop: this.localPlayer.isFlatFlop,
        isCrawling: this.localPlayer.isCrawling,
        isSitting: this.localPlayer.isSitting,
        isGrabbing: this.localPlayer.isGrabbing
      });
    }

    // 4. Update Remote Players
    for (const [id, remote] of this.remotePlayers.entries()) {
      const data = this.remoteData.get(id);
      if (data) {
        remote.root.position.lerp(new THREE.Vector3(data.position.x, data.position.y, data.position.z), 0.35);
        remote.root.rotation.y = data.rotation.y;
        const isRemoteMoving = (Math.hypot(data.position.x - remote.root.position.x, data.position.z - remote.root.position.z) > 0.02);
        remote.updateAnimation(delta, isRemoteMoving);
      }
    }

    // 5. Update Apartment & Thermal Echoes
    this.apartment.update(delta);

    // 6. Camera Update
    this.cameraManager.update(this.localPlayer, delta);

    // 7. Render Frame
    this.renderer.render(this.scene, this.camera);
  }
}

// Start game when page loads
window.addEventListener('DOMContentLoaded', () => {
  window.game = new HittlersGame();
});
