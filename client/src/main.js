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
    this.touchDuck = false;
    this.touchCrawl = false;
    this.lastSwingTime = 0;
    this.lastTime = performance.now();

    // DOM Elements
    this.domLobby = document.getElementById('lobby-screen');
    this.domHud = document.getElementById('hud');
    this.domPeepDarkness = document.getElementById('peep-darkness-mask');
    this.domTimer = document.getElementById('match-timer');
    this.domRoleBadge = document.getElementById('role-badge');
    this.domRoleDesc = document.getElementById('role-desc');
    this.domHostControls = document.getElementById('host-controls');
    this.domBtnStartMatch = document.getElementById('btn-start-match');
    this.domBtnStartHunter = document.getElementById('btn-start-as-hunter');
    this.domWaitingForHost = document.getElementById('waiting-for-host');
    this.domSelectRole = document.getElementById('select-role');
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

    this.domInputRoomCode = document.getElementById('input-room-code');
    this.domBtnRandRoom = document.getElementById('btn-rand-room');
    this.domHudRoomBadge = document.getElementById('hud-room-badge');
    this.domHudRoomCode = document.getElementById('hud-room-code');
    this.domBtnCopyRoom = document.getElementById('btn-copy-room');
    this.domSelectLobbyHunterCount = document.getElementById('select-lobby-hunter-count');
    this.domSelectHostHunterCount = document.getElementById('select-host-hunter-count');

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
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(this.ambientLight);

    this.dirLight = new THREE.DirectionalLight(0xfff5e6, 1.3);
    this.dirLight.position.set(12, 16, 10);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 2048;
    this.dirLight.shadow.mapSize.height = 2048;
    this.dirLight.shadow.camera.near = 0.5;
    this.dirLight.shadow.camera.far = 45;
    const d = 15;
    this.dirLight.shadow.camera.left = -d;
    this.dirLight.shadow.camera.right = d;
    this.dirLight.shadow.camera.top = d;
    this.dirLight.shadow.camera.bottom = -d;
    this.scene.add(this.dirLight);

    // 3. Environment & Physics
    this.apartment = new Apartment(this.scene);
    this.physics = new Physics(this.apartment, (mesh) => {
      // Thermal echo outline pulse on bump (only for Hitter)
      if (this.localPlayer && this.localPlayer.role === 'HITTER') {
        this.apartment.triggerThermalEcho(mesh);
        this.network.triggerThermalEcho(mesh.userData.thermalId, mesh.position);
        this.audio.playObjectHit();
      }
    });

    // 4. Camera Manager
    this.cameraManager = new CameraManager(this.camera, this.renderer.domElement);

    // 5. Local Human: Fall Flat Bob Avatar
    this.localPlayer = new RagdollAvatar(this.scene, '#f0f0f0', true);

    // 6. Network Client & Event Callbacks
    this.network = new NetworkClient({
      onRoomJoined: (data) => this.handleRoomJoined(data),
      onCountdownStarted: (data) => this.handleCountdownStarted(data),
      onRoundStarted: (data) => this.handleRoundStarted(data),
      onRoundEnded: (data) => this.handleRoundEnded(data),
      onPlayerSwungBat: (data) => this.handleRemoteBatSwing(data),
      onPlayerHit: (data) => this.handlePlayerHit(data),
      onThermalEchoPulsed: (data) => this.handleThermalEchoPulsed(data),
      onPlayerCampRevealed: (data) => this.handlePlayerCampRevealed(data),
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

  bindTouchButton(id, callback) {
    const btn = document.getElementById(id);
    if (!btn) return;
    const trigger = (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.audio.ensureContext();
      callback(btn);
    };
    btn.addEventListener('touchstart', trigger, { passive: false });
    btn.addEventListener('click', trigger);
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

      // Perspective Toggle (V key for Runners)
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

      // Crawl / Crouch (Ctrl / Shift key)
      if (e.code === 'ControlLeft' || e.code === 'ShiftLeft') {
        this.localPlayer.isCrawling = true;
      }

      // Grab ('E' key)
      if (e.code === 'KeyE') {
        this.localPlayer.isGrabbing = true;
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
      if (e.code === 'ControlLeft' || e.code === 'ShiftLeft') {
        if (!this.touchCrawl) {
          this.localPlayer.isCrawling = false;
        }
      }
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

    // Touch Joystick for Mobile Movement
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

    this.bindTouchButton('btn-crawl', (btn) => {
      this.touchCrawl = !this.touchCrawl;
      this.localPlayer.isCrawling = this.touchCrawl;
      if (this.touchCrawl) {
        this.localPlayer.isFlatFlop = false;
        document.getElementById('btn-flop')?.classList.remove('active');
      }
      btn?.classList.toggle('active', this.touchCrawl);
    });

    this.bindTouchButton('btn-flop', (btn) => {
      this.localPlayer.isFlatFlop = !this.localPlayer.isFlatFlop;
      if (this.localPlayer.isFlatFlop) {
        this.touchCrawl = false;
        this.localPlayer.isCrawling = false;
        document.getElementById('btn-crawl')?.classList.remove('active');
        this.localPlayer.isSitting = false;
        document.getElementById('btn-sit')?.classList.remove('active');
      }
      btn?.classList.toggle('active', this.localPlayer.isFlatFlop);
    });

    this.bindTouchButton('btn-sit', (btn) => {
      this.localPlayer.isSitting = !this.localPlayer.isSitting;
      if (this.localPlayer.isSitting) {
        this.localPlayer.isFlatFlop = false;
        document.getElementById('btn-flop')?.classList.remove('active');
        this.touchCrawl = false;
        this.localPlayer.isCrawling = false;
        document.getElementById('btn-crawl')?.classList.remove('active');
      }
      btn?.classList.toggle('active', this.localPlayer.isSitting);
    });

    this.bindTouchButton('btn-duck', (btn) => {
      this.touchDuck = !this.touchDuck;
      btn?.classList.toggle('active', this.touchDuck);
      if (this.touchDuck) {
        this.showHitFeedNotice('🦆 Ducking down (Bended Spine)');
      }
    });

    this.bindTouchButton('btn-swing', () => {
      this.triggerLocalBatSwing();
    });

    this.bindTouchButton('btn-view', () => {
      if (this.localPlayer.role === 'RUNNER') {
        const mode = this.cameraManager.togglePerspective();
        this.showHitFeedNotice(`Camera: ${mode.replace('_', ' ')}`);
      }
    });

    // Room Code from URL query (?room=CODE)
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const roomParam = urlParams.get('room');
      if (roomParam && this.domInputRoomCode) {
        this.domInputRoomCode.value = roomParam.trim().toUpperCase();
      }
    } catch (e) {}

    // Random Room Code Generator
    this.domBtnRandRoom?.addEventListener('click', () => {
      if (this.domInputRoomCode) {
        const randCode = `ROOM-${Math.floor(1000 + Math.random() * 9000)}`;
        this.domInputRoomCode.value = randCode;
        this.showHitFeedNotice(`Generated new Room Code: ${randCode}`);
      }
    });

    // Copy Room Code / Invite Link Button
    this.domBtnCopyRoom?.addEventListener('click', () => {
      const code = this.network.roomCode || this.domInputRoomCode?.value || 'LOBBY-1';
      const inviteUrl = `${window.location.origin}${window.location.pathname}?room=${encodeURIComponent(code)}`;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(inviteUrl).then(() => {
          this.showHitFeedNotice(`📋 Room invite link copied! Send to friends: ${code}`);
        }).catch(() => {
          prompt('Copy room code to share:', code);
        });
      } else {
        prompt('Copy room code to share:', code);
      }
    });

    // Host Hunter Count Selector inside Match
    this.domSelectHostHunterCount?.addEventListener('change', (e) => {
      const count = parseInt(e.target.value, 10) || 1;
      this.network.setHunterCount(count);
      this.showHitFeedNotice(`🪓 Host set Hunter count to ${count} (Max 3)`);
    });

    // Lobby Join Button
    document.getElementById('btn-join-room')?.addEventListener('click', () => {
      const roomCode = (document.getElementById('input-room-code')?.value.trim() || 'LOBBY-1').toUpperCase();
      const nickname = document.getElementById('input-nickname')?.value.trim() || 'Bob';
      const color = document.getElementById('input-color')?.value || '#f0f0f0';
      const botCount = parseInt(document.getElementById('input-bots')?.value, 10);
      const preferredRole = document.getElementById('select-role')?.value || 'RANDOM';
      const hunterCount = parseInt(this.domSelectLobbyHunterCount?.value, 10) || 1;

      this.audio.ensureContext();
      this.localPlayer.setColor(color);
      this.network.joinRoom(roomCode, nickname, color, isNaN(botCount) ? 9 : botCount, preferredRole, false, hunterCount);
      this.domLobby.classList.add('hidden');
      this.domHud.classList.remove('hidden');
    });

    document.getElementById('btn-start-match')?.addEventListener('click', () => {
      this.audio.ensureContext();
      this.domHostControls?.classList.add('hidden');
      this.network.startGame(false);
    });

    document.getElementById('btn-start-as-hunter')?.addEventListener('click', () => {
      this.audio.ensureContext();
      this.domHostControls?.classList.add('hidden');
      this.network.startGame(true);
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

  setRole(role, hunterCount = 1) {
    this.localPlayer.setRole(role);
    this.cameraManager.setRole(role);
    this.updateRoleUi(role, hunterCount);

    if (this.ambientLight) this.ambientLight.intensity = 0.75;
    if (this.dirLight) this.dirLight.intensity = 1.35;
    if (this.scene.fog) this.scene.fog.density = 0.025;
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
        <span class="lb-name" style="color: ${s.avatar_color || '#fff'}">${s.username || 'Bob'}</span>
        <span class="lb-stat">🏃 Escapes: ${s.runner_escapes || 0}</span>
        <span class="lb-stat">🔨 Sweeps: ${s.hitter_clean_sweeps || 0}</span>
      </div>
    `).join('');
  }

  triggerLocalBatSwing() {
    const now = Date.now();
    if (now - this.lastSwingTime < 700) return;
    this.lastSwingTime = now;

    this.localPlayer.triggerBatSwing();
    this.audio.playBatWhoosh();
    this.network.swingBat();

    const forward = new THREE.Vector3(
      -Math.sin(this.cameraManager.yaw),
      0,
      -Math.cos(this.cameraManager.yaw)
    );

    let objectHitFound = false;
    for (let dist = 0.8; dist <= 2.2; dist += 0.4) {
      const hitCheckPos = this.localPlayer.root.position.clone().add(forward.clone().multiplyScalar(dist));
      for (const collider of this.apartment.colliders) {
        if (collider.box.containsPoint(hitCheckPos)) {
          this.apartment.triggerThermalEcho(collider.mesh);
          this.network.triggerThermalEcho(collider.mesh.userData.thermalId, collider.mesh.position);
          this.audio.playObjectHit();
          objectHitFound = true;
          break;
        }
      }
      if (objectHitFound) break;
    }

    if (!objectHitFound) {
      for (const prop of this.apartment.interactiveProps) {
        if (prop.isYogaBall) {
          const dx = prop.pos.x - this.localPlayer.root.position.x;
          const dz = prop.pos.z - this.localPlayer.root.position.z;
          const dist = Math.hypot(dx, dz);
          if (dist < 2.2) {
            prop.vel.x += forward.x * 12.0;
            prop.vel.z += forward.z * 12.0;
            this.apartment.triggerThermalEcho(prop.mesh);
            this.audio.playObjectHit();
            break;
          }
        }
      }
    }

    // Hint when swinging while standing upright near the table
    if (this.localPlayer.role === 'HITTER') {
      const isStandingNearTable = (
        Math.abs(this.localPlayer.root.position.x) < 2.2 &&
        Math.abs(this.localPlayer.root.position.z) < 2.8 &&
        !this.localPlayer.isCrawling &&
        !this.localPlayer.isFlatFlop &&
        this.localPlayer.spinePitch > -0.25
      );
      if (isStandingNearTable && now - (this.lastTableHintTime || 0) > 3500) {
        this.lastTableHintTime = now;
        this.showHitFeedNotice('🛡️ Tabletop blocks high swings! Bend down (Ctrl/Shift/Z) to hit underneath!');
      }
    }
  }

  handleRoomJoined(data) {
    console.log('Joined room:', data);
    if (this.domHudRoomCode) {
      this.domHudRoomCode.textContent = data.roomCode;
    }
    if (this.domSelectHostHunterCount && data.hunterCount) {
      this.domSelectHostHunterCount.value = data.hunterCount;
    }
    if (data.isHost) {
      this.showHitFeedNotice(`👑 You are the HOST of ${data.roomCode}! Choose number of hunters and start match.`);
    } else {
      this.showHitFeedNotice(`Joined ${data.roomCode}! Waiting for Host to start match.`);
    }
  }

  handleCountdownStarted(data) {
    this.audio.playBuzzer();
    this.domEndOverlay.classList.add('hidden');
    this.domHostControls?.classList.add('hidden');
    this.domWaitingForHost?.classList.add('hidden');
    const hCount = data.hunterCount || (data.hitterIds ? data.hitterIds.length : 1);
    this.showHitFeedNotice(`🚨 Selection: ${data.hitterName || 'The Hunters'} are HUNTING (${hCount} Hunter${hCount > 1 ? 's' : ''})! Round starting in 3s!`);
  }

  handleRoundStarted(data) {
    this.domHostControls?.classList.add('hidden');
    this.domWaitingForHost?.classList.add('hidden');
    const hCount = data.hunterCount || (data.hitterIds ? data.hitterIds.length : 1);
    this.showHitFeedNotice(`⚡ ROUND STARTED! SURVIVE 120 SECONDS (${hCount} Hunter${hCount > 1 ? 's' : ''})!`);
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
      this.domEndTitle.textContent = '🔨 HUNTERS CLEAN SWEEP!';
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

  handlePlayerCampRevealed(data) {
    if (data.playerId === this.network.myId) {
      this.localPlayer.triggerThermalReveal(data.duration || 1.0);
      this.showHitFeedNotice('⚠️ You stayed still for 10s! Thermal ping revealed to Hunter!');
    } else {
      const remote = this.remotePlayers.get(data.playerId);
      if (remote) remote.triggerThermalReveal(data.duration || 1.0);
    }

    if (this.localPlayer.role === 'HITTER') {
      this.showHitFeedNotice(`👁️ Thermal Ping: ${data.playerName || 'Runner'} detected camping!`);
      this.audio.playThermalEcho();
    }
  }

  handleGameTick(data) {
    this.domTimer.textContent = `${data.timer}s`;

    if (this.domHudRoomCode && this.network.roomCode) {
      this.domHudRoomCode.textContent = this.network.roomCode;
    }

    // Host UI Controls Synchronization (All start options disappear once game starts)
    const isHost = (data.hostId === this.network.myId);
    const isLobbyState = (data.state === 'LOBBY' || data.state === 'ROUND_END');

    if (this.domHostControls) {
      if (isHost && isLobbyState) {
        this.domHostControls.classList.remove('hidden');
      } else {
        this.domHostControls.classList.add('hidden');
      }
    }

    if (this.domWaitingForHost) {
      if (!isHost && isLobbyState) {
        this.domWaitingForHost.classList.remove('hidden');
      } else {
        this.domWaitingForHost.classList.add('hidden');
      }
    }

    if (this.domSelectHostHunterCount && document.activeElement !== this.domSelectHostHunterCount && data.hunterCount) {
      this.domSelectHostHunterCount.value = data.hunterCount;
    }

    const activeIds = new Set();
    const hunterCount = data.hunterCount || (data.hitterIds ? data.hitterIds.length : 1);

    for (const p of data.players) {
      activeIds.add(p.id);

      if (p.id === this.network.myId) {
        if (this.localPlayer.role !== p.role) {
          this.setRole(p.role, hunterCount);
        }
        if (!p.isAlive) {
          this.localPlayer.isAlive = false;
        }
      } else {
        let remote = this.remotePlayers.get(p.id);
        if (!remote) {
          remote = new RagdollAvatar(this.scene, p.color || '#f5f5f5', false);
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

  updateRoleUi(role, hunterCount = 1) {
    if (role === 'HITTER') {
      this.domRoleBadge.textContent = (hunterCount > 1) ? `🔨 THE HUNTER (1 of ${hunterCount})` : '🔨 THE HUNTER';
      this.domRoleBadge.className = 'role-badge hitter';
      this.domRoleDesc.textContent = (hunterCount > 1)
        ? `85% Blind! You are 1 of ${hunterCount} Hunters! Press X or Click to Swing Bat. Knock out all runners!`
        : '85% Blind! Press X or Click to Swing Bat. Hit objects to trigger Thermal Echoes!';
      this.domPeepDarkness.classList.remove('hidden');
      this.domHpBar.classList.add('hidden');
    } else {
      this.domRoleBadge.textContent = '🏃 RUNNER';
      this.domRoleBadge.className = 'role-badge runner';
      this.domRoleDesc.textContent = (hunterCount > 1)
        ? `Survive 120s against ${hunterCount} Hunters! Crawl under tables, jump on beds, toggle view with V!`
        : 'Survive 120s! Crawl under tables, jump on beds, toggle 1st/3rd view with V!';
      this.domPeepDarkness.classList.add('hidden');
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

    // Spine Pitch Controls (Q/Z / Mouse Pitch / Touch Duck)
    if (this.keys['KeyQ']) {
      this.localPlayer.spinePitch = Math.min(1.0, this.localPlayer.spinePitch + delta * 3.0);
    } else if (this.keys['KeyZ'] || this.touchDuck) {
      this.localPlayer.spinePitch = Math.max(-1.0, this.localPlayer.spinePitch - delta * 3.0);
    } else {
      this.localPlayer.spinePitch *= 0.9;
    }

    // Crouch / Crawl (Keyboard hold or touch toggle)
    const keyCrawling = !!(this.keys['ControlLeft'] || this.keys['ShiftLeft']);
    this.localPlayer.isCrawling = keyCrawling || this.touchCrawl;

    // Jump (Space key when Runner)
    const isJumping = (this.keys['Space'] && this.localPlayer.role === 'RUNNER');

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
    }

    // 2. Physics & Collisions (Uniform 4.5 m/s)
    const newPos = this.physics.resolvePlayerMovement(this.localPlayer, moveDir, delta, 4.5);
    const newY = this.physics.resolveVerticalPhysics(this.localPlayer, delta, isJumping);

    this.localPlayer.root.position.set(newPos.x, newY, newPos.z);

    // Resolve Player-to-Player Pushing (Single-Occupant Push Physics under tables/beds)
    this.physics.resolvePlayerPushing(this.localPlayer, this.remotePlayers, moveDir, isMoving, delta);

    this.localPlayer.updateAnimation(delta, isMoving);

    // 3. Sync Network Input
    if (this.network.connected) {
      this.network.sendInput({
        position: { x: this.localPlayer.root.position.x, y: newY, z: this.localPlayer.root.position.z },
        rotation: { y: this.localPlayer.root.rotation.y },
        spinePitch: this.localPlayer.spinePitch,
        isFlatFlop: this.localPlayer.isFlatFlop,
        isCrawling: this.localPlayer.isCrawling,
        isSitting: this.localPlayer.isSitting,
        isGrabbing: this.localPlayer.isGrabbing
      });
    }

    // 4. Update Remote Players & AI Bots
    for (const [id, remote] of this.remotePlayers.entries()) {
      const data = this.remoteData.get(id);
      if (data) {
        remote.root.position.lerp(new THREE.Vector3(data.position.x, data.position.y || 0, data.position.z), 0.35);
        remote.root.rotation.y = data.rotation.y;
        remote.spinePitch = (typeof data.spinePitch === 'number') ? data.spinePitch : 0;
        remote.isCrawling = !!data.isCrawling;
        remote.isFlatFlop = !!data.isFlatFlop;
        remote.isSitting = !!data.isSitting;
        remote.isFlailing = !!data.isFlailing;
        remote.isAlive = (data.isAlive !== false);

        const isRemoteMoving = (Math.hypot(data.position.x - remote.root.position.x, data.position.z - remote.root.position.z) > 0.012);
        remote.updateAnimation(delta, isRemoteMoving);
      }
    }

    // 5. Update Apartment Thermal Echoes
    this.apartment.update(delta);

    // 6. Camera Update
    this.cameraManager.update(this.localPlayer, delta);

    // 7. Render Frame with Peep Darkness Visor for Hitter
    if (this.localPlayer.role === 'HITTER') {
      const W = window.innerWidth;
      const H = window.innerHeight;
      const stripH = Math.max(1, Math.floor(H * 0.15));
      const topH = H - stripH;

      this.renderer.autoClear = false;

      // Pass 1: Bottom 15% Peep Strip (100% Crystal-Clear Room Visibility)
      this.renderer.setViewport(0, 0, W, H);
      this.renderer.setScissor(0, 0, W, stripH);
      this.renderer.setScissorTest(true);
      this.renderer.setClearColor(0x181926, 1.0);
      this.renderer.clear();
      this.renderer.render(this.scene, this.camera);

      // Pass 2: Top 85% Blackout Visor (Pitch Black Dark Screen)
      this.renderer.setScissor(0, stripH, W, topH);
      this.renderer.setClearColor(0x000000, 1.0);
      this.renderer.clear();

      // Pass 3: Render Active Thermal Objects & Camping Revealed Players in the Top 85% Pitch Black Visor
      const activeThermals = new Set();
      for (const [mesh, data] of this.apartment.thermalObjects.entries()) {
        if (data.timer > 0) {
          activeThermals.add(mesh);
        }
      }

      // Include revealed camping players in thermal pass
      if (this.localPlayer.isThermalRevealed || this.localPlayer.thermalTimer > 0) {
        this.localPlayer.root.traverse((obj) => {
          if (obj.isMesh) activeThermals.add(obj);
        });
      }
      for (const remote of this.remotePlayers.values()) {
        if (remote.isThermalRevealed || remote.thermalTimer > 0) {
          remote.root.traverse((obj) => {
            if (obj.isMesh) activeThermals.add(obj);
          });
        }
      }

      if (activeThermals.size > 0) {
        const hiddenObjects = [];
        this.scene.traverse((obj) => {
          if (obj.isMesh && !activeThermals.has(obj) && !activeThermals.has(obj.parent)) {
            if (obj.visible) {
              obj.visible = false;
              hiddenObjects.push(obj);
            }
          }
        });

        this.renderer.render(this.scene, this.camera);

        for (const obj of hiddenObjects) {
          obj.visible = true;
        }
      }

      this.renderer.setScissorTest(false);
      this.renderer.autoClear = true;
    } else {
      this.renderer.autoClear = true;
      this.renderer.setScissorTest(false);
      this.renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);
      this.renderer.render(this.scene, this.camera);
    }
  }
}

// Start game when page loads
window.addEventListener('DOMContentLoaded', () => {
  window.game = new HittlersGame();
});
