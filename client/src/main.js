import * as THREE from 'three';
import { Ground } from './engine/Ground.js';
import { CricketCharacter, DIRECTION_VECTORS } from './engine/CricketCharacter.js';
import { Ball } from './engine/Ball.js';
import { BattingUI } from './engine/BattingUI.js';
import { BowlingUI } from './engine/BowlingUI.js';
import { NetworkClient } from './engine/NetworkClient.js';

function formatOvers(overs, balls) {
  const o = Math.floor(overs || 0);
  const b = Math.floor(balls || 0);
  const total = o * 6 + b;
  const completedOvers = Math.floor(total / 6);
  const remBalls = total % 6;
  return `${completedOvers}.${remBalls}`;
}

class CricketGame {
  constructor() {
    this.network = new NetworkClient();
    this.fielders = [];
    this.strikerAvatar = null;
    this.nonStrikerAvatar = null;
    this.bowlerAvatar = null;
    this.keeperAvatar = null;
    this.umpireAvatar = null;
    this.currentScorecard = null;
    this.myId = null;
    this.myTeam = null;
    this.isHost = false;
    this.roomInfo = null;
    this.lastTime = performance.now();

    // Dual-perspective camera positions
    this.isUserBowling = false;
    // Bowler view: behind bowler running up along positive Z towards pitch (start behind z=27)
    this.bowlerCamPos = new THREE.Vector3(0, 6.5, 33.5);
    this.bowlerCamLookAt = new THREE.Vector3(0, 2.0, -9.5);
    // Batsman view: behind batsman wickets at z = -12.6 looking toward bowler at +Z
    this.batsmanCamPos = new THREE.Vector3(0, 5.5, -17.5);
    this.batsmanCamLookAt = new THREE.Vector3(0, 2.0, 10.5);

    // Interactive Manual Running State
    this.manualRunningActive = false;
    this.manualRunsTaken = 0;
    this.maxAvailableRuns = 0;
    this.isRunningBetweenWickets = false;
    this.runCancelled = false;
    this.domRunningBar = null;

    // VR Batsman POV Mode
    this.isVRMode = false;
    this.vrMouseOffsetX = 0;
    this.vrMouseOffsetY = 0;

    // Pitch Targeting Marker
    this.pitchTargetGroup = null;

    this._setupDOM();
    this._initThree();
    this._initAudio();
    this._initGameModules();
    this._bindEvents();
    this._bindNetwork();

    this.animate(performance.now());
  }

  _setupDOM() {
    this.domLobby = document.getElementById('lobby-screen');
    this.domHud = document.getElementById('hud');
    this.domTossModal = document.getElementById('toss-modal');
    this.domCaptainModal = document.getElementById('captain-modal');
    this.domScorecardModal = document.getElementById('scorecard-modal');
    this.domGameOver = document.getElementById('game-over-overlay');
    this.domBigEvent = document.getElementById('big-event-banner');

    this.domRunsWickets = document.getElementById('hud-runs-wickets');
    this.domOvers = document.getElementById('hud-overs');
    this.domTeamName = document.getElementById('hud-team-name');
    this.domTeamIcon = document.getElementById('hud-team-icon');
    this.domTargetInfo = document.getElementById('hud-target-info');
    this.domCrrInfo = document.getElementById('hud-crr-info');
    this.domRoomCode = document.getElementById('hud-room-code');

    this.domStrikerName = document.getElementById('striker-name');
    this.domStrikerFigures = document.getElementById('striker-figures');
    this.domNonStrikerName = document.getElementById('non-striker-name');
    this.domNonStrikerFigures = document.getElementById('non-striker-figures');
    this.domBowlerName = document.getElementById('bowler-name');
    this.domBowlerFigures = document.getElementById('bowler-figures');
    this.domThisOverBalls = document.getElementById('this-over-balls');
    this.domActionBanner = document.getElementById('action-banner');

    this.domTossStatus = document.getElementById('toss-status');
    this.domTossCoin = document.getElementById('toss-coin');
    this.domTossCallButtons = document.getElementById('toss-call-buttons');
    this.domTossDecisionButtons = document.getElementById('toss-decision-buttons');
    this.domCaptainCallingName = document.getElementById('captain-calling-name');

    this.domBtnConnect = document.getElementById('btn-connect');
    this.domBtnStartMatch = document.getElementById('btn-start-match');
    this.domBtnRandRoom = document.getElementById('btn-rand-room');
    this.domInputRoomCode = document.getElementById('input-room-code');
    this.domInputNickname = document.getElementById('input-nickname');
    this.domSelectGameMode = document.getElementById('select-game-mode');
    this.domSelectOvers = document.getElementById('select-overs');

    this.domTeamAMembers = document.getElementById('team-a-members');
    this.domTeamBMembers = document.getElementById('team-b-members');
    this.domBtnJoinTeamA = document.getElementById('btn-join-team-a');
    this.domBtnJoinTeamB = document.getElementById('btn-join-team-b');

    this.domControlsContainer = document.getElementById('game-controls-container');
    this.domRunBanner = null;
    this.domBtnVR = document.getElementById('btn-toggle-vr');
    this.domVRHelmetOverlay = document.getElementById('vr-helmet-overlay');
  }

  _initThree() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x82C7FE);

    // Exact Camera presets matching Babylon.js sceneConfig
    this.cameraPresets = {
      aerial:    { pos: new THREE.Vector3(43.2, 129.3, -84.9), target: new THREE.Vector3(0, 0, 20) },
      broadcast: { pos: new THREE.Vector3(-6.7, 76.8, -108.6), target: new THREE.Vector3(0, 4.2, 27) },
      ground:    { pos: new THREE.Vector3(8.8, 35.6, -86.2),   target: new THREE.Vector3(0, 1.5, 1) }
    };
    this.activeCameraPreset = 'behind_wickets';

    this.camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.1, 800);
    this.defaultCamPos = this.batsmanCamPos.clone();
    this.defaultCamLookAt = this.batsmanCamLookAt.clone();
    this.currentCamLookAt = this.batsmanCamLookAt.clone();
    this.targetCamPos = this.batsmanCamPos.clone();
    this.targetCamLookAt = this.batsmanCamLookAt.clone();
    this.cameraTracking = false;

    this.camera.position.copy(this.defaultCamPos);
    this.camera.lookAt(this.defaultCamLookAt);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    document.getElementById('canvas-container').appendChild(this.renderer.domElement);

    // Exact Lighting matching Babylon scene sunset keylight:
    const keyLight = new THREE.DirectionalLight(0xFFF4C2, 1.3);
    keyLight.position.set(-60, 90, -70);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 1.0;
    keyLight.shadow.camera.far = 400;
    keyLight.shadow.camera.left = -140;
    keyLight.shadow.camera.right = 140;
    keyLight.shadow.camera.top = 140;
    keyLight.shadow.camera.bottom = -140;
    keyLight.shadow.bias = -0.0005;
    this.scene.add(keyLight);

    const fillLight = new THREE.AmbientLight(0xBDE3FF, 0.45);
    this.scene.add(fillLight);

    const updateFOVAndSize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const aspect = width / height;
      this.camera.aspect = aspect;
      if (aspect < 1.0) {
        this.camera.fov = Math.min(68, Math.max(48, (48 / aspect) * 0.78));
      } else {
        this.camera.fov = 48;
      }
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
    };

    window.addEventListener('resize', updateFOVAndSize);
    window.addEventListener('orientationchange', () => {
      setTimeout(updateFOVAndSize, 100);
      setTimeout(updateFOVAndSize, 300);
    });
    updateFOVAndSize();
  }

  _initGameModules() {
    this.ground = new Ground(this.scene);
    this.ball = new Ball(this.scene);
    this.battingUI = new BattingUI(this.domControlsContainer);
    this.bowlingUI = new BowlingUI(this.domControlsContainer);

    this.ballIncoming = false;
    this._runStepAnimId = null;
    this._diveStepAnimId = null;
    this._botRunInterval = null;

    this._setupDefaultCharacters();
    this._initPitchTargetMarker();
    this._setupPitchScreenPicker();

    // Bat Controller Swing Hook: batsman hits ball when ball is actively incoming
    this.battingUI.onSwing = (command) => {
      if (!this.ball || !this.ball.active || this.ball.isHitShot) return;

      this.ballIncoming = false;
      this._playBatSound();

      if (this.strikerAvatar) {
        this.strikerAvatar.executeCommand(command);
      }
      this.network.bat(command);
    };

    // Batsman Stance Change Hook (RHB / LHB, Crease Depth)
    this.battingUI.onStanceChange = (stance) => {
      if (this.strikerAvatar) {
        this.strikerAvatar.setStance(stance);
      }
    };

    this.bowlingUI.onBowl = (data) => {
      if (this.pitchTargetGroup) this.pitchTargetGroup.visible = false;
      this.network.bowl(data);
    };
  }

  _initPitchTargetMarker() {
    this.pitchTargetGroup = new THREE.Group();

    // 1. Outer reticle ring
    const ringGeo = new THREE.RingGeometry(0.32, 0.46, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xff1744,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.95,
      depthTest: false
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = -Math.PI / 2;
    ringMesh.renderOrder = 999;
    this.pitchTargetGroup.add(ringMesh);

    // 2. Inner target dot
    const dotGeo = new THREE.CircleGeometry(0.10, 16);
    const dotMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
      depthTest: false
    });
    const dotMesh = new THREE.Mesh(dotGeo, dotMat);
    dotMesh.rotation.x = -Math.PI / 2;
    dotMesh.renderOrder = 999;
    this.pitchTargetGroup.add(dotMesh);

    // 3. Crosshair markers
    const crossMat = new THREE.MeshBasicMaterial({ color: 0xffea00, side: THREE.DoubleSide, depthTest: false });
    const c1 = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.05), crossMat);
    c1.rotation.x = -Math.PI / 2;
    c1.position.x = -0.58;
    c1.renderOrder = 999;
    const c2 = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.05), crossMat);
    c2.rotation.x = -Math.PI / 2;
    c2.position.x = 0.58;
    c2.renderOrder = 999;
    const c3 = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.18), crossMat);
    c3.rotation.x = -Math.PI / 2;
    c3.position.z = -0.58;
    c3.renderOrder = 999;
    const c4 = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.18), crossMat);
    c4.rotation.x = -Math.PI / 2;
    c4.position.z = 0.58;
    c4.renderOrder = 999;
    this.pitchTargetGroup.add(c1, c2, c3, c4);

    this.pitchTargetGroup.position.set(0, 0.27, 1.2);
    this.pitchTargetGroup.visible = false;
    this.scene.add(this.pitchTargetGroup);
  }

  _setupPitchScreenPicker() {
    this.pitchRaycaster = new THREE.Raycaster();
    this.pitchPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.24);
    this.mouseCoords = new THREE.Vector2();

    const handlePointerOnPitch = (e) => {
      // Only active when bowler is aiming to bowl
      if (!this.bowlingUI || !this.bowlingUI.active) return;
      if (e.target && e.target.closest('#bowling-ui, #batting-ui, #hud, .modal-card, button, input, select')) {
        return;
      }

      const clientX = e.clientX ?? (e.touches && e.touches[0]?.clientX);
      const clientY = e.clientY ?? (e.touches && e.touches[0]?.clientY);
      if (typeof clientX !== 'number' || typeof clientY !== 'number') return;

      this.mouseCoords.x = (clientX / window.innerWidth) * 2 - 1;
      this.mouseCoords.y = -(clientY / window.innerHeight) * 2 + 1;

      this.pitchRaycaster.setFromCamera(this.mouseCoords, this.camera);
      const intersection = new THREE.Vector3();
      if (this.pitchRaycaster.ray.intersectPlane(this.pitchPlane, intersection)) {
        // Clamp within realistic pitch bounds
        const px = Math.max(-1.1, Math.min(1.1, intersection.x));
        const pz = Math.max(-1.8, Math.min(3.4, intersection.z));

        if (this.pitchTargetGroup) {
          this.pitchTargetGroup.position.set(px, 0.27, pz);
          this.pitchTargetGroup.visible = true;
        }
        this.bowlingUI.setLandingZone(px, pz);
      }
    };

    window.addEventListener('pointermove', handlePointerOnPitch);
    window.addEventListener('pointerdown', handlePointerOnPitch);
  }

  _initAudio() {
    this.audioCtx = null;
    const ensureAudio = () => {
      if (!this.audioCtx) {
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
    };
    window.addEventListener('click', ensureAudio, { once: true });
    window.addEventListener('touchstart', ensureAudio, { once: true });
    window.addEventListener('keydown', ensureAudio, { once: true });
  }

  _playBatSound() {
    if (!this.audioCtx) return;
    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(340, this.audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(90, this.audioCtx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.85, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.15);
    } catch (e) {}
  }

  _playCheerSound() {
    if (!this.audioCtx) return;
    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(540, this.audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(840, this.audioCtx.currentTime + 0.4);
      gain.gain.setValueAtTime(0.35, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.5);
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.5);
    } catch (e) {}
  }

  _playOutSound() {
    if (!this.audioCtx) return;
    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(160, this.audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(50, this.audioCtx.currentTime + 0.35);
      gain.gain.setValueAtTime(0.65, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.4);
    } catch (e) {}
  }

  _bindEvents() {
    this.domBtnRandRoom.addEventListener('click', () => {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let code = 'MATCH-';
      for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
      this.domInputRoomCode.value = code;
    });

    this.domBtnConnect.addEventListener('click', () => {
      const name = this.domInputNickname.value.trim() || 'Player';
      const roomCode = (this.domInputRoomCode.value.trim() || 'MATCH-1').toUpperCase();
      const mode = this.domSelectGameMode.value;
      const overs = parseInt(this.domSelectOvers.value, 10) || 5;

      this.network.connect();
      this.network.joinRoom(roomCode, name, '#4C9B3C', mode, overs);

      this.domBtnConnect.classList.add('hidden');
      this.domBtnStartMatch.classList.remove('hidden');
      document.getElementById('lobby-hint').textContent = '✅ Connected! Choose your team below:';
    });

    this.domBtnJoinTeamA.addEventListener('click', () => {
      this.myTeam = 'a';
      this.network.selectTeam('a');
    });

    this.domBtnJoinTeamB.addEventListener('click', () => {
      this.myTeam = 'b';
      this.network.selectTeam('b');
    });

    this.domBtnStartMatch.addEventListener('click', () => {
      const mode = this.domSelectGameMode.value;
      if (mode === 'single_batting') {
        const overs = parseInt(this.domSelectOvers.value, 10) || 5;
        this.network.startSingleBatting(overs);
      } else {
        this.network.startToss();
      }
    });

    document.getElementById('btn-call-heads')?.addEventListener('click', () => {
      this.network.tossCAll('heads');
      this.domTossCallButtons.classList.add('hidden');
    });

    document.getElementById('btn-call-tails')?.addEventListener('click', () => {
      this.network.tossCAll('tails');
      this.domTossCallButtons.classList.add('hidden');
    });

    document.getElementById('btn-choose-bat')?.addEventListener('click', () => {
      this.network.tossDecision('bat');
      this.domTossModal.classList.add('hidden');
    });

    document.getElementById('btn-choose-bowl')?.addEventListener('click', () => {
      this.network.tossDecision('bowl');
      this.domTossModal.classList.add('hidden');
    });

    document.getElementById('btn-toggle-scorecard')?.addEventListener('click', () => {
      this._renderFullScorecard();
      this.domScorecardModal.classList.remove('hidden');
    });

    document.getElementById('btn-close-scorecard')?.addEventListener('click', () => {
      this.domScorecardModal.classList.add('hidden');
    });

    ['broadcast', 'ground', 'aerial'].forEach(view => {
      document.getElementById(`btn-cam-${view}`)?.addEventListener('click', () => {
        this.setCameraView(view);
      });
    });

    document.getElementById('btn-copy-room')?.addEventListener('click', () => {
      if (this.network.roomCode) {
        navigator.clipboard.writeText(window.location.origin + '?room=' + this.network.roomCode);
        this.showNotice('📋 Room link copied to clipboard!');
      }
    });

    document.getElementById('btn-play-again')?.addEventListener('click', () => {
      window.location.reload();
    });

    this.domBtnVR?.addEventListener('click', () => this._toggleVRMode());

    window.addEventListener('mousemove', (e) => {
      if (this.isVRMode) {
        this.vrMouseOffsetX = (e.clientX / window.innerWidth - 0.5) * 1.6;
        this.vrMouseOffsetY = (e.clientY / window.innerHeight - 0.5) * 0.9;
      }
    });

    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyV' && !e.target.matches('input, select')) {
        this._toggleVRMode();
      } else if (e.code === 'KeyR') {
        if (!this.isUserBowling && this.manualRunningActive) {
          this._handleUserPushRun();
        }
      } else if (e.code === 'KeyC') {
        if (!this.isUserBowling && this.manualRunningActive) {
          this._handleUserCancelRun();
        }
      }
    });
  }

  _toggleVRMode() {
    this.isVRMode = !this.isVRMode;
    if (this.domBtnVR) {
      this.domBtnVR.classList.toggle('active', this.isVRMode);
      this.domBtnVR.innerHTML = this.isVRMode ? '🥽 VR VIEW: ON' : '🥽 VR VIEW';
    }
    if (this.domVRHelmetOverlay) {
      this.domVRHelmetOverlay.classList.toggle('hidden', !this.isVRMode);
    }
    this.showNotice(this.isVRMode ? '🥽 Batsman VR View Active [V] — Facing the bowler!' : '📺 Broadcast Camera Restored.');
  }

  _bindNetwork() {
    this.network.on('connected', (data) => {
      this.myId = data.id;
    });

    this.network.on('room_joined', (info) => {
      this.roomInfo = info;
      this.isHost = (info.hostId === this.myId);
      this.domRoomCode.textContent = info.code;
      this._updateLobbyRoster(info);
    });

    this.network.on('team_updated', (info) => {
      this.roomInfo = info;
      this.isHost = (info.hostId === this.myId);
      this._updateLobbyRoster(info);
    });

    this.network.on('toss_started', (data) => {
      this.domLobby.classList.add('hidden');
      this.domTossModal.classList.remove('hidden');
      this.domTossStatus.textContent = 'Flipping coin between Team Captains...';

      const isCaptainA = (data.captainA?.id === this.myId);
      if (isCaptainA) {
        this.domTossCallButtons.classList.remove('hidden');
        this.domCaptainCallingName.textContent = 'You (Ants Captain)';
      } else {
        this.domTossCallButtons.classList.add('hidden');
        this.domTossStatus.textContent = `Waiting for ${data.captainA?.name || 'Ants Captain'} to call...`;
      }
    });

    this.network.on('toss_result', (data) => {
      this.domTossCallButtons.classList.add('hidden');
      const rotY = data.result === 'heads' ? 1800 : 1980;
      this.domTossCoin.style.transform = `rotateY(${rotY}deg)`;
      this.domTossStatus.textContent = `Coin: ${data.result.toUpperCase()}! ${data.winner?.name} won the toss!`;
    });

    this.network.on('toss_decision_needed', () => {
      this.domTossDecisionButtons.classList.remove('hidden');

      // Auto-default after 5 seconds
      clearTimeout(this._tossChoiceTimer);
      this._tossChoiceTimer = setTimeout(() => {
        if (!this.domTossDecisionButtons.classList.contains('hidden')) {
          this.network.tossDecision('bat');
          this.domTossModal.classList.add('hidden');
        }
      }, 5000);
    });

    this.network.on('toss_decision', (data) => {
      this.domTossModal.classList.add('hidden');
      this.domTossCallButtons.classList.add('hidden');
      this.domTossDecisionButtons.classList.add('hidden');
      const choice = data.choice === 'bat' ? 'BAT' : 'BOWL';
      const teamName = data.battingTeam === 'a' ? 'Ants' : 'Snails/Grasshoppers';
      this.showBigEvent('TOSS DECIDED!', `${data.winner?.name} elected to ${choice}! ${teamName} batting.`);
    });

    this.network.on('innings_setup', (data) => {
      this.domLobby.classList.add('hidden');
      this.domHud.classList.remove('hidden');
      this._setupMatchCharacters(data.battingTeam, data.bowlingTeam);
      this._updateScorecardUI(data.scorecard);
      this._updateCameraMode();
    });

    this.network.on('bowling_order_needed', (data) => {
      this._showCaptainPickBowler(data.bowlers, data.over);
    });

    this.network.on('bowler_needed', (data) => {
      this._showCaptainPickBowler(data.bowlers, data.over);
    });

    this.network.on('over_started', (data) => {
      this._resetBatsmenToCrease();
      this.ballIncoming = false;
      this.battingUI.hide();
      this.domCaptainModal.classList.add('hidden');
      this.showNotice(`⚡ Over ${data.over} begins! ${data.bowler?.name} bowling to ${data.batsman?.name}.`);
      this._updateScorecardUI(data.scorecard);
      this._updateCameraMode();

      // Rotate/update bowler avatar
      if (this.bowlerAvatar) {
        this.bowlerAvatar.destroy();
      }
      const isSnail = data.bowler?.isBot || (data.scorecard?.bowlingTeam === 'b');
      this.bowlerAvatar = new CricketCharacter(this.scene, isSnail ? 'snail_bowler_01' : 'ant_fielder_right');
      this.bowlerAvatar.setPosition(0, 0.0, 27.0);
      this.bowlerAvatar.setRotation(Math.PI);
    });

    this.network.on('bowl_now', (data) => {
      this._resetBatsmenToCrease();
      this.ballIncoming = false;
      this.battingUI.hide();
      this.showNotice(`⚾ Your turn to bowl ball ${data.ball} of over ${data.over}! Click on pitch to set landing spot.`);
      this._updateCameraMode();
      if (this.pitchTargetGroup) {
        this.pitchTargetGroup.position.set(this.bowlingUI.landingZone.x, 0.27, this.bowlingUI.landingZone.z);
        this.pitchTargetGroup.visible = true;
      }
      this.bowlingUI.show({ timeout: 20000 });
    });

    // Bowler Run-Up Event: bowler begins full 2.5-second runup from back (z = 27.0 -> z = 10.5)
    this.network.on('bowler_runup', (data) => {
      const swingStr = data.swingDirection ? ` &bull; ${data.swingDirection.toUpperCase()}` : '';
      this.domActionBanner.innerHTML = `⚡ ${data.bowler?.name} charging in (${data.deliveryType.toUpperCase()}${swingStr})... Get ready!`;

      // Position pitch target reticle clearly so batsman can see where ball will land
      if (this.pitchTargetGroup) {
        const lzX = typeof data.landingZone?.x === 'number' ? data.landingZone.x : 0;
        const lzZ = typeof data.landingZone?.z === 'number' ? data.landingZone.z : 0.45;
        this.pitchTargetGroup.position.set(lzX * 1.8, 0.27, -2.0 - lzZ * 5.0);
        this.pitchTargetGroup.visible = true;
      }

      // Reset bowler camera to behind the bowler at run-up start (z = 33.5)
      if (this.isUserBowling && !this.cameraTracking) {
        this.defaultCamPos.set(0, 6.5, 33.5);
        this.defaultCamLookAt.set(0, 2.0, -9.5);
      }

      // Crucial: ensure batsmen are firmly at crease and any prior running is cleanly halted
      this._resetBatsmenToCrease();
      this.ballIncoming = false;
      this.battingUI.hide();

      // Animate bowler run-up stride towards the bowling crease over 2500ms
      if (this.bowlerAvatar) {
        this.bowlerAvatar.setPosition(0, 0.0, 27.0);
        this.bowlerAvatar.setRotation(Math.PI);
        const startZ = 27.0;
        const targetZ = 10.5;
        const startTime = performance.now();
        const duration = 2500;
        const runupStep = (now) => {
          const elapsed = now - startTime;
          const p = Math.min(1.0, elapsed / duration);
          if (this.bowlerAvatar) {
            this.bowlerAvatar.group.position.z = startZ + (targetZ - startZ) * p;
            this.bowlerAvatar.group.position.y = Math.abs(Math.sin(p * Math.PI * 12)) * 0.15;
            this.bowlerAvatar.group.position.x = Math.sin(p * Math.PI * 6) * 0.08;

            // When user is bowling, dynamic back view camera follows behind the bowler gliding forward!
            if (this.isUserBowling && !this.cameraTracking) {
              this.defaultCamPos.set(0, 6.5, this.bowlerAvatar.group.position.z + 6.5);
              this.defaultCamLookAt.set(0, 2.0, -9.5);
            }
          }
          if (p < 1.0) {
            requestAnimationFrame(runupStep);
          } else if (this.bowlerAvatar) {
            this.bowlerAvatar.setPosition(0, 0.0, targetZ);
            if (this.isUserBowling && !this.cameraTracking) {
              this.defaultCamPos.set(0, 6.5, 17.0);
              this.defaultCamLookAt.set(0, 2.0, -9.5);
            }
          }
        };
        requestAnimationFrame(runupStep);
      }
    });

    this.network.on('delivery', (data) => {
      const paceStr = data.paceKmh ? ` [${data.paceKmh} km/h]` : '';
      const swingStr = data.swingDirection ? ` &bull; ${data.swingDirection.toUpperCase()}` : '';
      this.domActionBanner.textContent = `⚾ ${data.bowler?.name} delivers ${data.deliveryType.toUpperCase()}${swingStr}${paceStr}!`;
      if (this.bowlerAvatar) {
        this.bowlerAvatar.setPosition(0, 0.0, 10.5);
        this.bowlerAvatar.triggerBowlAction();
      }

      // Lock batsmen firmly to crease for delivery arrival
      this._resetBatsmenToCrease();

      // Authentic cricket ball delivery: release from bowler hand (z = 10.5, y = 3.2m) to pitch landing spot
      const startPos = new THREE.Vector3(0, 3.2, 10.5);
      const lzX = typeof data.landingZone?.x === 'number' ? data.landingZone.x : 0;
      const lzZ = typeof data.landingZone?.z === 'number' ? data.landingZone.z : 0.45;
      // Map landing zone to pitch coordinates: pitch center z=0, spans z=-13 to +13
      // Good length is around z = -2.0 to -5.0
      const landingPos = new THREE.Vector3(lzX * 1.8, 0.24, -2.0 - lzZ * 5.0);
      const targetPos = new THREE.Vector3(lzX, 1.8, -9.5);

      this.ball.bowlDelivery(startPos, landingPos, targetPos, data.deliveryType, data.swingDirection);

      // Camera after bowl: positioned behind the bowler stumps
      this._updateCameraMode();
      if (this.isUserBowling) {
        this.cameraTracking = false;
        this.defaultCamPos.set(0, 6.5, 17.0);
        this.defaultCamLookAt.set(0, 2.0, -9.5);
      }

      // Ball is now actively incoming — show Batting UI with 1.4s arrival window matching ball flight
      this.ballIncoming = true;
      const isBattingUser = !this.isUserBowling;
      if (isBattingUser) {
        this.battingUI.show({ timeout: 1400 });
      }
    });

    this.network.on('ball_result', (data) => {
      this.ballIncoming = false;
      this.battingUI.hide();
      this.bowlingUI.hide();
      if (this.pitchTargetGroup) this.pitchTargetGroup.visible = false;
      this._updateScorecardUI(data.scorecard);

      const dirStr = data.direction || 'forward';
      const dirInfo = DIRECTION_VECTORS[dirStr] || DIRECTION_VECTORS.forward;

      // Animate striker swing
      if (this.strikerAvatar) {
        this.strikerAvatar.executeCommand({
          action: 'swing_bat',
          direction: dirStr,
          power: data.timing || 0.8
        });
      }

      // Determine whether user on THIS client is on the batting team
      const isBattingUser = !this.isUserBowling && (
        (this.currentScorecard?.battingTeam === this.myTeam) ||
        (data.batsmanId === this.myId) ||
        (!this.roomInfo?.players?.teamA?.some(p => !p.isBot && p.id !== this.myId) && this.currentScorecard?.battingTeam === 'a')
      );

      // Striker bat contact position at batsman crease
      const contactPos = new THREE.Vector3(0, 1.8, -9.2);

      if (data.wicket) {
        this._resetBatsmenToCrease();
        this._playOutSound();
        if (this.umpireAvatar) this.umpireAvatar.signalOut();
        if (this.bowlerAvatar) this.bowlerAvatar.triggerCelebrate();

        const dismissal = data.dismissal || 'Caught';

        if (dismissal === 'Caught') {
          // For caught dismissals: launch ball into the air toward fielder region, then dive-catch
          const catchDist = 18 + Math.random() * 8;
          this.cameraTracking = true;
          this.ball.hitLaunch(contactPos, dirInfo, data.timing || 0.55, 'loft', false, 0);
          setTimeout(() => {
            this.cameraTracking = false;
            this._animateFielderCatch(dirInfo, catchDist);
            this.showBigEvent('OUT! CAUGHT! 🧤', `${data.dismissal || 'Caught'} — Direct catch taken cleanly!`);
          }, 800);
        } else {
          // Bowled / LBW / Stumped
          this.cameraTracking = false;
          this.showBigEvent('OUT! WICKET! ☝️', `${dismissal} — Umpire finger raised!`);
        }
      } else if (data.runs === 6) {
        this._resetBatsmenToCrease();
        this.cameraTracking = true;
        this._playCheerSound();
        if (this.umpireAvatar) this.umpireAvatar.signalSix();
        this.showBigEvent('SIXER! 🚀', 'Soaring over the stadium grandstands!');
        this.ball.hitLaunch(contactPos, dirInfo, data.timing || 0.88, data.shotType || 'loft', true, 6);
        if (this.strikerAvatar) this.strikerAvatar.triggerCelebrate();
        setTimeout(() => { this.cameraTracking = false; }, 3600);
      } else if (data.runs === 4) {
        this._resetBatsmenToCrease();
        this.cameraTracking = true;
        this._playCheerSound();
        if (this.umpireAvatar) this.umpireAvatar.signalFour();
        this.showBigEvent('FOUR! 🏏', 'Crisp drive racing across the turf!');
        this.ball.hitLaunch(contactPos, dirInfo, data.timing || 0.76, data.shotType || 'drive', false, 4);
        this._animateFieldersPursuit(dirInfo, 4);
        setTimeout(() => { this.cameraTracking = false; }, 3200);
      } else if (data.runs > 0) {
        this.cameraTracking = true;
        if (isBattingUser) {
          this.showNotice(`🏏 Ball placed in the gap! Use RUN [R] button to run!`);
        } else {
          this.showNotice(`🏏 Ball hit into the gap! Fielders sprinting to collect and throw!`);
        }
        this.ball.hitLaunch(contactPos, dirInfo, data.timing || 0.55, data.shotType || 'drive', false, data.runs);
        this._animateFieldersPursuit(dirInfo, data.runs);
        this._setupManualRunning(data.runs, isBattingUser);
        setTimeout(() => { this.cameraTracking = false; }, 3200);
      } else if (data.wide) {
        this._resetBatsmenToCrease();
        this.cameraTracking = false;
        if (this.umpireAvatar) this.umpireAvatar.signalWide();
        this.showNotice(`⚠️ WIDE BALL! 1 Extra run + re-bowl.`);
      } else if (data.noBall) {
        this._resetBatsmenToCrease();
        this.cameraTracking = false;
        this.showNotice(`🚨 NO BALL! Bowler overstepped crease line!`);
      } else {
        this._resetBatsmenToCrease();
        this.cameraTracking = false;
        this.showNotice(`• Dot ball! Tidy fielding.`);
      }
    });

    this.network.on('run_out_confirmed', (data) => {
      this._playOutSound();
      if (this.umpireAvatar) this.umpireAvatar.signalOut();
      this.showBigEvent('OUT! RUN OUT! 🎯', `${data.batsmanName || 'Batter'} is RUN OUT! Direct hit!`);
      this._updateScorecardUI(data.scorecard);
      this._resetBatsmenToCrease();
    });

    this.network.on('next_batsman_needed', (data) => {
      this._showCaptainPickBatsman(data.availableBatsmen);
    });

    this.network.on('new_batsman', (data) => {
      this._resetBatsmenToCrease();
      this.showNotice(`🏏 New Batter on pitch: ${data.batsman?.name}!`);
    });

    this.network.on('over_complete', (data) => {
      this._resetBatsmenToCrease();
      this.showNotice(`🔔 Over ${data.over} complete! Score: ${data.scorecard?.runs}/${data.scorecard?.wickets}`);
    });

    this.network.on('innings_end', (data) => {
      this._resetBatsmenToCrease();
      this.ballIncoming = false;
      this.battingUI.hide();
      const inn = data.innings;
      const card = data.scorecard;
      this.showBigEvent(`INNINGS ${inn} OVER!`, `${card.runs} Runs / ${card.wickets} Wickets. Target: ${card.runs + 1}`);
    });

    this.network.on('game_over', (data) => {
      this._resetBatsmenToCrease();
      this.ballIncoming = false;
      this.battingUI.hide();
      this.domHud.classList.add('hidden');
      this.domGameOver.classList.remove('hidden');
      document.getElementById('winner-title').textContent = (data.winner === 'a' ? '🐜 ANTS WIN!' : data.winner === 'b' ? '🐌 SNAILS / GRASSHOPPERS WIN!' : '🤝 MATCH DRAWN!');
      document.getElementById('winner-reason').textContent = data.reason || 'What a match!';
      this._renderFinalSummary(data.scorecard);
    });

    this.network.on('sb_turn_started', (data) => {
      this.domLobby.classList.add('hidden');
      this.domHud.classList.remove('hidden');
      this._setupMatchCharacters('a', 'b');
      this.showNotice(`⚡ Single Batting: ${data.batsman?.name} batting vs ${data.bowler?.name} bowling!`);
      this._updateScorecardUI(data.scorecard);
    });

    this.network.on('error_msg', (data) => {
      this.showNotice(`❌ ${data.msg}`);
    });
  }

  _setupDefaultCharacters() {
    this.strikerAvatar = new CricketCharacter(this.scene, 'ant_batter_01');
    this.strikerAvatar.setPosition(0, 0.0, -9.5);

    this.bowlerAvatar = new CricketCharacter(this.scene, 'snail_bowler_01');
    this.bowlerAvatar.setPosition(0, 0.0, 27.0);

    // Authentic Umpire: Bowler's end umpire behind non-striker wickets watching delivery
    this.umpireAvatar = new CricketCharacter(this.scene, { species: 'umpire', role: 'umpire' });
    this.umpireAvatar.setPosition(0, 0.0, 14.5);
    this.umpireAvatar.setRotation(Math.PI);

    const fCover = new CricketCharacter(this.scene, 'snail_fielder_left');
    fCover.setPosition(-24, 0, 22);
    const fMidwicket = new CricketCharacter(this.scene, 'ant_fielder_right');
    fMidwicket.setPosition(29, 0, -19);
    this.fielders.push(fCover, fMidwicket);
  }

  _setupMatchCharacters(battingTeam, bowlingTeam) {
    if (this.strikerAvatar) this.strikerAvatar.destroy();
    if (this.nonStrikerAvatar) this.nonStrikerAvatar.destroy();
    if (this.bowlerAvatar) this.bowlerAvatar.destroy();
    if (this.keeperAvatar) this.keeperAvatar.destroy();
    if (this.umpireAvatar) this.umpireAvatar.destroy();
    this.fielders.forEach(f => f.destroy());
    this.fielders = [];

    // Striker (Babylon.js JSON: [0, 0, -9.5])
    const batterPresetId = this.battingUI.characterId || 'ant_batter_01';
    this.strikerAvatar = new CricketCharacter(this.scene, batterPresetId);
    this.strikerAvatar.setPosition(0, 0.0, -9.5);
    if (this.strikerAvatar && this.battingUI) {
      this.strikerAvatar.setStance(this.battingUI.stance);
    }

    // Non-striker (Babylon.js JSON: [0, 0, 9.5])
    this.nonStrikerAvatar = new CricketCharacter(this.scene, 'ant_fielder_right');
    this.nonStrikerAvatar.setPosition(0, 0.0, 9.5);
    this.nonStrikerAvatar.setRotation(Math.PI);

    // Bowler (Babylon.js JSON: [0, 0, 27])
    this.bowlerAvatar = new CricketCharacter(this.scene, 'snail_bowler_01');
    this.bowlerAvatar.setPosition(0, 0.0, 27.0);

    // Wicketkeeper (Babylon.js JSON: [0, 0, -17] behind striker stumps)
    this.keeperAvatar = new CricketCharacter(this.scene, 'snail_fielder_left');
    this.keeperAvatar.setPosition(0, 0.0, -17.0);
    this.keeperAvatar.setRotation(0);

    // Authentic Umpire: Bowler's end umpire behind non-striker wickets watching delivery
    this.umpireAvatar = new CricketCharacter(this.scene, { species: 'umpire', role: 'umpire' });
    this.umpireAvatar.setPosition(0, 0.0, 14.5);
    this.umpireAvatar.setRotation(Math.PI);

    // Exact strategic fielders matching Babylon.js sceneConfig JSON
    const fieldersConfig = [
      { id: 'snail_fielder_left',  x: -24, z:  22 }, // fielder-cover
      { id: 'ant_fielder_right',   x:  29, z: -19 }, // fielder-midwicket
      { id: 'snail_fielder_left',  x:  18, z:  53 }, // fielder-longon
      { id: 'ant_fielder_right',   x: -34, z:  -5 }, // fielder-point
      { id: 'snail_fielder_left',  x:  -8, z: -18 }, // fielder-slip
      { id: 'ant_fielder_right',   x: -42, z:  48 }, // fielder-third-man
      { id: 'snail_fielder_left',  x:  30, z:   7 }, // fielder-square-leg
      { id: 'ant_fielder_right',   x:  38, z: -42 }  // fielder-fine-leg
    ];

    fieldersConfig.forEach(fc => {
      const f = new CricketCharacter(this.scene, fc.id);
      f.setPosition(fc.x, 0, fc.z);
      f.setRotation(Math.atan2(-fc.x, -9.5 - fc.z));
      this.fielders.push(f);
    });
  }

  // Athletic Diving Catch Animation — moves the NEAREST fielder to the ball's trajectory
  _animateFielderCatch(dirInfo, catchDist = 18) {
    const targetX = dirInfo.x * catchDist;
    const targetZ = -9.5 + dirInfo.z * catchDist;

    let nearest = null;
    let minDist = Infinity;

    // Also check keeper for catches behind wicket
    const allFielders = [...this.fielders];
    if (this.keeperAvatar) allFielders.push(this.keeperAvatar);

    allFielders.forEach(f => {
      const d = Math.hypot(f.group.position.x - targetX, f.group.position.z - targetZ);
      if (d < minDist) {
        minDist = d;
        nearest = f;
      }
    });

    if (nearest) {
      const startX = nearest.group.position.x;
      const startZ = nearest.group.position.z;
      const startTime = performance.now();
      const dist = Math.hypot(targetX - startX, targetZ - startZ);
      const duration = Math.min(1800, Math.max(600, dist * 80));

      const run = (now) => {
        const p = Math.min(1.0, (now - startTime) / duration);
        const ease = p < 0.5 ? 2 * p * p : -1 + (4 - 2 * p) * p; // ease-in-out
        nearest.group.position.x = startX + (targetX - startX) * ease;
        nearest.group.position.z = startZ + (targetZ - startZ) * ease;
        nearest.group.rotation.y = Math.atan2(targetX - startX, targetZ - startZ);
        // Running bounce
        nearest.group.position.y = Math.abs(Math.sin(p * Math.PI * 6)) * 0.08;

        if (p < 1.0) {
          requestAnimationFrame(run);
        } else {
          nearest.group.position.y = 0;
          nearest.triggerCatch();
        }
      };
      requestAnimationFrame(run);
    }
  }

  // Dynamic Fielder Pursuit: closest fielders sprint towards ball, gather, and throw
  _animateFieldersPursuit(dirInfo, runs = 1) {
    const dist = Math.min(65, 18 + (runs || 1) * 8.5);
    const targetX = dirInfo.x * dist;
    const targetZ = -9.5 + dirInfo.z * dist;

    // Find closest 2 fielders to the ball's outfield trajectory
    const sorted = [...this.fielders].sort((a, b) => {
      const da = Math.hypot(a.group.position.x - targetX, a.group.position.z - targetZ);
      const db = Math.hypot(b.group.position.x - targetX, b.group.position.z - targetZ);
      return da - db;
    });

    const primary = sorted[0];
    const backup = sorted[1];

    if (primary) {
      const startX = primary.group.position.x;
      const startZ = primary.group.position.z;
      const startTime = performance.now();
      const duration = 1400;

      const chaseStep = (now) => {
        const p = Math.min(1.0, (now - startTime) / duration);
        primary.group.position.x = startX + (targetX - startX) * (p * 0.9);
        primary.group.position.z = startZ + (targetZ - startZ) * (p * 0.9);
        primary.group.rotation.y = Math.atan2(targetX - startX, targetZ - startZ);
        primary.group.position.y = 0.0 + Math.abs(Math.sin(p * Math.PI * 8)) * 0.08;

        if (p < 1.0) {
          requestAnimationFrame(chaseStep);
        } else {
          // Fielder reaches the ball, gathers it, and then THROWS it back towards the stumps!
          primary.triggerFieldGather();
          this.ball.pos.set(primary.group.position.x, 0.45, primary.group.position.z);
          this.ball.vel.set(0, 0, 0);
          this.ball.group.position.copy(this.ball.pos);

          setTimeout(() => {
            this._animateFielderThrow(primary, runs);
          }, 350);
        }
      };
      requestAnimationFrame(chaseStep);
    }

    if (backup) {
      const bStartX = backup.group.position.x;
      const bStartZ = backup.group.position.z;
      const bTargetX = targetX * 0.75;
      const bTargetZ = targetZ * 0.75;
      const bStartTime = performance.now();
      const bDuration = 1600;

      const backupStep = (now) => {
        const p = Math.min(1.0, (now - bStartTime) / bDuration);
        backup.group.position.x = bStartX + (bTargetX - bStartX) * (p * 0.5);
        backup.group.position.z = bStartZ + (bTargetZ - bStartZ) * (p * 0.5);
        backup.group.rotation.y = Math.atan2(bTargetX - bStartX, bTargetZ - bStartZ);
        if (p < 1.0) requestAnimationFrame(backupStep);
      };
      requestAnimationFrame(backupStep);
    }
  }

  // Fielder Collect & Rapid Throw to the Wickets (+ Run Out Trigger!)
  _animateFielderThrow(fielder, runs) {
    if (!fielder || !this.ball) return;

    // Determine target stumps: throw towards the closest stumps (striker end z = -12.6, bowler end z = 12.6)
    const fielderZ = fielder.group.position.z;
    const targetEndZ = Math.abs(fielderZ - (-12.6)) < Math.abs(fielderZ - 12.6) ? -12.6 : 12.6;
    const targetCreaseZ = targetEndZ < 0 ? -9.5 : 9.5;
    const stumpTarget = new THREE.Vector3(0, 0.85, targetEndZ);

    const fPos = fielder.group.position.clone();
    this.showNotice(`🎯 Fielder gathers and fires throw toward the ${targetEndZ < 0 ? 'striker' : 'bowler'} stumps!`);

    const startTime = performance.now();
    const throwDuration = 700;

    const throwStep = (now) => {
      const elapsed = now - startTime;
      const p = Math.min(1.0, elapsed / throwDuration);

      // Arc throw through the air towards stumps
      this.ball.pos.x = fPos.x + (stumpTarget.x - fPos.x) * p;
      this.ball.pos.z = fPos.z + (stumpTarget.z - fPos.z) * p;
      this.ball.pos.y = fPos.y + 1.2 + (stumpTarget.y - (fPos.y + 1.2)) * p + Math.sin(p * Math.PI) * 2.2;
      this.ball.group.position.copy(this.ball.pos);

      if (p < 1.0) {
        requestAnimationFrame(throwStep);
      } else {
        // Ball strikes / reaches the stumps!
        this.ball.pos.copy(stumpTarget);
        this.ball.group.position.copy(this.ball.pos);

        // Check whether batsmen are running between wickets!
        const isCurrentlyRunning = this.manualRunningActive && this.isRunningBetweenWickets;
        const strikerZ = this.strikerAvatar ? this.strikerAvatar.group.position.z : -9.5;
        const nonStrikerZ = this.nonStrikerAvatar ? this.nonStrikerAvatar.group.position.z : 9.5;

        const strikerShortOfCrease = Math.abs(strikerZ - targetCreaseZ) > 1.2 && Math.abs(strikerZ) < 8.5;
        const nonStrikerShortOfCrease = Math.abs(nonStrikerZ - targetCreaseZ) > 1.2 && Math.abs(nonStrikerZ) < 8.5;

        if (isCurrentlyRunning || (this.manualRunningActive && (strikerShortOfCrease || nonStrikerShortOfCrease))) {
          // Trigger RUN OUT!
          this._triggerRunOut(targetEndZ > 0);
        } else {
          this.showNotice('🧤 Clean collection at the stumps by the keeper/bowler.');
        }
      }
    };
  }

  // Trigger Run Out Sequence
  _triggerRunOut(isNonStriker = false) {
    this._playOutSound();
    if (this.umpireAvatar) this.umpireAvatar.signalOut();

    const victimName = isNonStriker
      ? (this.currentScorecard?.nonStriker?.name || 'Non-Striker')
      : (this.currentScorecard?.currentBatsman?.name || 'Striker');

    this.showBigEvent('OUT! RUN OUT! 🎯', `Direct hit! ${victimName} is caught short of the crease!`);

    this._resetBatsmenToCrease();

    this.network.runOut({
      batsmanId: isNonStriker ? this.currentScorecard?.nonStriker?.id : this.currentScorecard?.currentBatsman?.id,
      isNonStriker
    });
  }

  setCameraView(viewName) {
    const preset = this.cameraPresets[viewName] || this.cameraPresets.aerial;
    this.activeCameraPreset = viewName;
    this.targetCamPos.copy(preset.pos);
    this.targetCamLookAt.copy(preset.target);
    this.defaultCamPos.copy(preset.pos);
    this.defaultCamLookAt.copy(preset.target);

    document.querySelectorAll('.btn-cam-preset').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === viewName);
    });
  }

  _updateCameraMode() {
    const card = this.currentScorecard;
    const isBowling = (card && card.bowlingTeam === this.myTeam) ||
                      (card?.currentBowler?.id === this.myId);
    this.isUserBowling = !!isBowling;
    if (this.isUserBowling) {
      this.defaultCamPos.copy(this.bowlerCamPos);
      this.defaultCamLookAt.copy(this.bowlerCamLookAt);
    } else {
      this.defaultCamPos.copy(this.batsmanCamPos);
      this.defaultCamLookAt.copy(this.batsmanCamLookAt);
    }
  }

  _updateLobbyRoster(info) {
    if (!info) return;

    // Ants (Team A)
    this.domTeamAMembers.innerHTML = '';
    const teamA = info.players?.teamA || [];
    if (teamA.length === 0) {
      this.domTeamAMembers.innerHTML = '<span class="empty-hint">Waiting for players...</span>';
    } else {
      teamA.forEach(p => {
        const isCap = (p.id === info.captainA);
        const item = document.createElement('div');
        item.className = 'team-member-tag';
        item.innerHTML = `<span>🐜 ${p.name} ${p.isBot ? '(Bot)' : ''}</span>${isCap ? '<span class="captain-badge">👑 C</span>' : ''}`;
        this.domTeamAMembers.appendChild(item);
      });
    }

    // Snails (Team B)
    this.domTeamBMembers.innerHTML = '';
    const teamB = info.players?.teamB || [];
    if (teamB.length === 0) {
      this.domTeamBMembers.innerHTML = '<span class="empty-hint">Waiting for players...</span>';
    } else {
      teamB.forEach(p => {
        const isCap = (p.id === info.captainB);
        const item = document.createElement('div');
        item.className = 'team-member-tag';
        item.innerHTML = `<span>🐌 ${p.name} ${p.isBot ? '(Bot)' : ''}</span>${isCap ? '<span class="captain-badge">👑 C</span>' : ''}`;
        this.domTeamBMembers.appendChild(item);
      });
    }
  }

  _updateScorecardUI(card) {
    if (!card) return;
    this.currentScorecard = card;

    const teamAIsBatting = (card.battingTeam === 'a');
    this.domTeamName.textContent = teamAIsBatting ? 'ANTS' : 'SNAILS';
    this.domTeamIcon.textContent = teamAIsBatting ? '🐜' : '🐌';

    this.domRunsWickets.textContent = `${card.runs} / ${card.wickets}`;
    this.domOvers.textContent = `(${formatOvers(card.overs, card.balls)} / ${this.roomInfo?.overs || 5} ov)`;

    if (card.target) {
      const needed = Math.max(0, card.target - card.runs);
      this.domTargetInfo.textContent = `Target: ${card.target} (Need ${needed} runs)`;
    } else {
      this.domTargetInfo.textContent = '1st Innings';
    }

    const totalBalls = (card.overs || 0) * 6 + (card.balls || 0);
    const crr = totalBalls > 0 ? ((card.runs / totalBalls) * 6).toFixed(2) : '0.00';
    this.domCrrInfo.textContent = `CRR: ${crr}`;

    // Striker
    if (card.currentBatsman) {
      const bStats = card.batsmen?.[card.currentBatsman.id];
      this.domStrikerName.textContent = `${card.currentBatsman.name}*`;
      this.domStrikerFigures.textContent = `${bStats?.runs || 0} (${bStats?.balls || 0}) [${bStats?.fours || 0}x4, ${bStats?.sixes || 0}x6]`;
    }

    // Non-striker
    if (card.nonStriker) {
      const nsStats = card.batsmen?.[card.nonStriker.id];
      this.domNonStrikerName.textContent = card.nonStriker.name;
      this.domNonStrikerFigures.textContent = `${nsStats?.runs || 0} (${nsStats?.balls || 0})`;
    }

    // Bowler
    if (card.currentBowler) {
      const bwlStats = card.bowlers?.[card.currentBowler.id];
      this.domBowlerName.textContent = card.currentBowler.name;
      this.domBowlerFigures.textContent = `${bwlStats?.wickets || 0}-${bwlStats?.runs || 0} (${formatOvers(bwlStats?.overs, bwlStats?.balls)} ov)`;
    }

    // This Over Balls
    this.domThisOverBalls.innerHTML = '';
    const balls = card.currentOverBalls || [];
    if (balls.length === 0) {
      this.domThisOverBalls.innerHTML = '<span class="ball-badge empty">-</span>';
    } else {
      balls.forEach(b => {
        const span = document.createElement('span');
        span.className = 'ball-badge';
        if (b === '4') span.classList.add('four');
        else if (b === '6') span.classList.add('six');
        else if (b === 'W') span.classList.add('wicket');
        else if (b.includes('Wd') || b.includes('Nb')) span.classList.add('extra');
        span.textContent = b;
        this.domThisOverBalls.appendChild(span);
      });
    }
  }

  _showCaptainPickBowler(bowlers, over) {
    this.domCaptainModal.classList.remove('hidden');
    document.getElementById('captain-modal-title').textContent = '👑 CAPTAIN: SELECT BOWLER';
    document.getElementById('captain-modal-desc').textContent = `Choose who bowls Over ${over}:`;

    const list = document.getElementById('captain-roster-list');
    list.innerHTML = '';
    bowlers.forEach(b => {
      const btn = document.createElement('button');
      btn.className = 'roster-btn';
      const isYou = (b.id === this.myId);
      btn.innerHTML = `<span>🐌 ${b.name} ${isYou ? '⭐ YOU' : ''}</span><span>${b.isBot ? '(Bot)' : 'Human'}</span>`;
      btn.addEventListener('click', () => {
        clearTimeout(this._captainPickTimer);
        this.domCaptainModal.classList.add('hidden');
        this.network.setBowler(b.id);
      });
      list.appendChild(btn);
    });

    // Auto-select safety timeout (6 seconds) so match progresses smoothly
    clearTimeout(this._captainPickTimer);
    this._captainPickTimer = setTimeout(() => {
      if (!this.domCaptainModal.classList.contains('hidden')) {
        this.domCaptainModal.classList.add('hidden');
        const myBowler = bowlers.find(b => b.id === this.myId);
        const choice = myBowler ? myBowler.id : bowlers[0]?.id;
        if (choice) this.network.setBowler(choice);
      }
    }, 6000);
  }

  _showCaptainPickBatsman(batsmen) {
    this.domCaptainModal.classList.remove('hidden');
    document.getElementById('captain-modal-title').textContent = '👑 CAPTAIN: NEXT BATTER';
    document.getElementById('captain-modal-desc').textContent = 'Wicket fallen! Select who bats next:';

    const list = document.getElementById('captain-roster-list');
    list.innerHTML = '';
    batsmen.forEach(b => {
      const btn = document.createElement('button');
      btn.className = 'roster-btn';
      btn.innerHTML = `<span>🏏 ${b.name}</span><span>Ready</span>`;
      btn.addEventListener('click', () => {
        this.domCaptainModal.classList.add('hidden');
        this.network.setNextBatsman(b.id);
      });
      list.appendChild(btn);
    });
  }

  // On-screen Run Symbol Badge
  _showRunBanner(runs) {
    if (!this.domRunBanner) {
      this.domRunBanner = document.createElement('div');
      this.domRunBanner.id = 'running-banner';
      this.domRunBanner.className = 'run-counter-banner';
      document.body.appendChild(this.domRunBanner);
    }

    const runIcons = runs === 3 ? '🏃🏃🏃' : runs === 2 ? '🏃🏃' : '🏃';
    const subText = runs === 3 ? 'THREE RUNS! Rapid running between wickets!' : runs === 2 ? 'TWO RUNS! Pushing hard for the double!' : 'QUICK SINGLE! Strike rotated!';

    this.domRunBanner.innerHTML = `
      <div class="run-banner-icon">${runIcons}</div>
      <div class="run-banner-text">
        <div class="run-banner-title">${runs} RUN${runs > 1 ? 'S' : ''}!</div>
        <div class="run-banner-sub">${subText}</div>
      </div>
    `;

    this.domRunBanner.classList.remove('hidden');
    clearTimeout(this._runBannerTimer);
    this._runBannerTimer = setTimeout(() => {
      if (this.domRunBanner) this.domRunBanner.classList.add('hidden');
    }, Math.max(2200, runs * 1100));
  }

  // Interactive Manual Running System (User chooses to Run [R] or Cancel [C])
  _setupManualRunning(maxRuns, isBattingUser = false) {
    this._resetBatsmenToCrease();
    this.manualRunningActive = true;
    this.manualRunsTaken = 0;
    this.maxAvailableRuns = Math.max(1, maxRuns || 1);
    this.isRunningBetweenWickets = false;
    this.runCancelled = false;

    if (isBattingUser) {
      if (!this.domRunningBar) {
        this.domRunningBar = document.createElement('div');
        this.domRunningBar.id = 'manual-running-bar';
        this.domRunningBar.className = 'running-control-bar';
        this.domRunningBar.innerHTML = `
          <div class="run-score-tally">Runs: <strong id="manual-runs-count">0</strong> / <span id="manual-max-runs">${this.maxAvailableRuns}</span></div>
          <button id="btn-manual-run" class="btn-run-action">🏃 RUN [R]</button>
          <button id="btn-manual-cancel" class="btn-cancel-action">🛑 CANCEL RUN [C]</button>
        `;
        document.body.appendChild(this.domRunningBar);

        this.domRunningBar.querySelector('#btn-manual-run').addEventListener('click', () => {
          this._handleUserPushRun();
        });
        this.domRunningBar.querySelector('#btn-manual-cancel').addEventListener('click', () => {
          this._handleUserCancelRun();
        });
      } else {
        const countEl = document.getElementById('manual-runs-count');
        const maxEl = document.getElementById('manual-max-runs');
        if (countEl) countEl.textContent = '0';
        if (maxEl) maxEl.textContent = String(this.maxAvailableRuns);
        this.domRunningBar.classList.remove('hidden');
      }

      const cancelBtn = this.domRunningBar.querySelector('#btn-manual-cancel');
      if (cancelBtn) cancelBtn.classList.remove('disabled');
    } else {
      // Ensure running bar is completely hidden for bowler and fielding team
      if (this.domRunningBar) {
        this.domRunningBar.classList.add('hidden');
      }

      // Automated bot running animation for visual realism on bowling side
      let r = 0;
      if (this._botRunInterval) clearInterval(this._botRunInterval);
      this._botRunInterval = setInterval(() => {
        if (!this.manualRunningActive || r >= this.maxAvailableRuns) {
          clearInterval(this._botRunInterval);
          this._botRunInterval = null;
          return;
        }
        this._handleUserPushRun();
        r++;
      }, 1050);
    }

    // Auto-timeout when fielders gather and return ball to keeper
    clearTimeout(this._manualRunningSafetyTimer);
    this._manualRunningSafetyTimer = setTimeout(() => {
      if (this.manualRunningActive && !this.isRunningBetweenWickets) {
        this._finishManualRunning();
      }
    }, Math.max(4500, this.maxAvailableRuns * 1350 + 1200));
  }

  _handleUserPushRun() {
    if (!this.manualRunningActive || this.isRunningBetweenWickets || this.runCancelled) return;
    if (this.manualRunsTaken >= this.maxAvailableRuns) {
      if (!this.isUserBowling) this.showNotice('⚠️ Fielder has gathered ball! Cannot risk another run.');
      return;
    }

    this.isRunningBetweenWickets = true;
    const runNum = this.manualRunsTaken + 1;
    if (!this.isUserBowling) {
      this.showNotice(`🏃 Taking run ${runNum}! Press [C] to Cancel & Dive.`);
    }

    const fromStrikerEnd = (this.manualRunsTaken % 2 === 0);
    const runZStartStriker = fromStrikerEnd ? -9.5 : 9.5;
    const runZEndStriker = fromStrikerEnd ? 9.5 : -9.5;
    const runZStartNonStriker = fromStrikerEnd ? 9.5 : -9.5;
    const runZEndNonStriker = fromStrikerEnd ? -9.5 : 9.5;

    const startTime = performance.now();
    const runDuration = 950;

    const runStep = (now) => {
      if (!this.manualRunningActive) {
        this._resetBatsmenToCrease();
        return;
      }

      if (this.runCancelled) {
        this._animateCancelDive(fromStrikerEnd);
        return;
      }

      const elapsed = now - startTime;
      const p = Math.min(1.0, elapsed / runDuration);

      if (this.strikerAvatar) {
        this.strikerAvatar.group.position.z = runZStartStriker + (runZEndStriker - runZStartStriker) * p;
        this.strikerAvatar.group.position.x = 0.5 * Math.sin(p * Math.PI);
        this.strikerAvatar.group.position.y = Math.abs(Math.sin(p * Math.PI * 6)) * 0.1;
      }
      if (this.nonStrikerAvatar) {
        this.nonStrikerAvatar.group.position.z = runZStartNonStriker + (runZEndNonStriker - runZStartNonStriker) * p;
        this.nonStrikerAvatar.group.position.x = -1.2 - 0.4 * Math.sin(p * Math.PI);
        this.nonStrikerAvatar.group.position.y = Math.abs(Math.sin(p * Math.PI * 6)) * 0.1;
      }

      if (p < 1.0) {
        this._runStepAnimId = requestAnimationFrame(runStep);
      } else {
        this._runStepAnimId = null;
        this.manualRunsTaken++;
        this.isRunningBetweenWickets = false;
        const countEl = document.getElementById('manual-runs-count');
        if (countEl) countEl.textContent = String(this.manualRunsTaken);

        this._showRunBanner(this.manualRunsTaken);

        if (this.manualRunsTaken >= this.maxAvailableRuns) {
          setTimeout(() => this._finishManualRunning(), 400);
        }
      }
    };
    this._runStepAnimId = requestAnimationFrame(runStep);
  }

  _animateCancelDive(fromStrikerEnd) {
    this.isRunningBetweenWickets = false;
    this.showNotice('🛑 RUN CANCELLED! Batsmen diving back into crease!');
    const sZ = this.strikerAvatar ? this.strikerAvatar.group.position.z : -9.5;
    const nsZ = this.nonStrikerAvatar ? this.nonStrikerAvatar.group.position.z : 9.5;

    const targetSZ = fromStrikerEnd ? -9.5 : 9.5;
    const targetNsZ = fromStrikerEnd ? 9.5 : -9.5;

    const startTime = performance.now();
    const duration = 380;

    const diveStep = (now) => {
      if (!this.manualRunningActive) {
        this._resetBatsmenToCrease();
        return;
      }
      const p = Math.min(1.0, (now - startTime) / duration);
      if (this.strikerAvatar) {
        this.strikerAvatar.group.position.z = sZ + (targetSZ - sZ) * p;
        this.strikerAvatar.group.position.y = (1 - p) * 0.15;
      }
      if (this.nonStrikerAvatar) {
        this.nonStrikerAvatar.group.position.z = nsZ + (targetNsZ - nsZ) * p;
        this.nonStrikerAvatar.group.position.y = (1 - p) * 0.15;
      }
      if (p < 1.0) {
        this._diveStepAnimId = requestAnimationFrame(diveStep);
      } else {
        this._diveStepAnimId = null;
        this._finishManualRunning();
      }
    };
    this._diveStepAnimId = requestAnimationFrame(diveStep);
  }

  _handleUserCancelRun() {
    if (!this.manualRunningActive) return;
    if (this.isRunningBetweenWickets) {
      this.runCancelled = true;
      const cancelBtn = this.domRunningBar?.querySelector('#btn-manual-cancel');
      if (cancelBtn) cancelBtn.classList.add('disabled');
    } else {
      this._finishManualRunning();
    }
  }

  _finishManualRunning() {
    this._resetBatsmenToCrease();
  }

  // Firmly restore both batsmen to their exact crease marks and orientations
  _resetBatsmenToCrease() {
    if (this._runStepAnimId) {
      cancelAnimationFrame(this._runStepAnimId);
      this._runStepAnimId = null;
    }
    if (this._diveStepAnimId) {
      cancelAnimationFrame(this._diveStepAnimId);
      this._diveStepAnimId = null;
    }
    if (this._botRunInterval) {
      clearInterval(this._botRunInterval);
      this._botRunInterval = null;
    }
    clearTimeout(this._manualRunningSafetyTimer);
    this.manualRunningActive = false;
    this.isRunningBetweenWickets = false;
    this.runCancelled = false;
    if (this.domRunningBar) {
      this.domRunningBar.classList.add('hidden');
    }

    if (this.strikerAvatar) {
      if (this.battingUI && this.battingUI.stance) {
        this.strikerAvatar.setStance(this.battingUI.stance);
      } else {
        this.strikerAvatar.setPosition(0, 0.0, -9.5);
      }
      this.strikerAvatar.setRotation(0);
      if (this.strikerAvatar.bodyPivot) {
        this.strikerAvatar.bodyPivot.rotation.set(0, 0, 0);
      }
    }

    if (this.nonStrikerAvatar) {
      this.nonStrikerAvatar.setPosition(-1.2, 0.0, 9.5);
      this.nonStrikerAvatar.setRotation(Math.PI);
      if (this.nonStrikerAvatar.bodyPivot) {
        this.nonStrikerAvatar.bodyPivot.rotation.set(0, 0, 0);
      }
    }
  }

  _renderFullScorecard() {
    const sc = this.currentScorecard;
    const container = document.getElementById('scorecard-content');
    if (!sc || !container) return;

    let html = '';
    const renderInnings = (card, label) => {
      if (!card || !card.team) return '';
      const tName = card.team === 'a' ? 'Ants' : 'Snails';
      let out = `<h3>${label}: ${tName} (${card.runs}/${card.wickets} in ${formatOvers(card.overs, card.balls)} ov)</h3>`;
      out += `<table class="score-table">
        <thead><tr><th>Batter</th><th>R</th><th>B</th><th>4s</th><th>6s</th><th>Dismissal</th></tr></thead><tbody>`;
      for (const b of Object.values(card.batsmen || {})) {
        out += `<tr><td><strong>${b.name}</strong></td><td>${b.runs}</td><td>${b.balls}</td><td>${b.fours}</td><td>${b.sixes}</td><td>${b.dismissal || (b.isOnPitch ? 'Not Out' : 'Did Not Bat')}</td></tr>`;
      }
      out += `</tbody></table>`;
      out += `<h4 style="margin-top:10px; color:#7bed9f;">Bowling</h4><table class="score-table">
        <thead><tr><th>Bowler</th><th>O</th><th>R</th><th>W</th></tr></thead><tbody>`;
      for (const bw of Object.values(card.bowlers || {})) {
        if (bw.overs > 0 || bw.balls > 0 || bw.runs > 0) {
          out += `<tr><td>${bw.name}</td><td>${formatOvers(bw.overs, bw.balls)}</td><td>${bw.runs}</td><td>${bw.wickets}</td></tr>`;
        }
      }
      out += `</tbody></table>`;
      return out;
    };

    html += renderInnings(sc.inn1, 'Innings 1');
    html += '<hr style="border-color:rgba(255,255,255,0.1); margin:14px 0;">';
    html += renderInnings(sc.inn2, 'Innings 2');
    container.innerHTML = html;
  }

  _renderFinalSummary(card) {
    const summary = document.getElementById('final-summary');
    if (!summary || !card) return;
    const inn1 = card.inn1;
    const inn2 = card.inn2;
    summary.innerHTML = `
      <div style="display:flex; justify-content:space-around; margin:16px 0; font-size:1.1rem; font-weight:bold;">
        <div>🐜 Ants: ${inn1?.runs || 0}/${inn1?.wickets || 0}</div>
        <div>🐌 Snails: ${inn2?.runs || 0}/${inn2?.wickets || 0}</div>
      </div>
    `;
  }

  showBigEvent(title, subtitle) {
    document.getElementById('big-event-title').textContent = title;
    document.getElementById('big-event-subtitle').textContent = subtitle;
    this.domBigEvent.classList.remove('hidden');
    clearTimeout(this._eventBannerTimer);
    this._eventBannerTimer = setTimeout(() => {
      this.domBigEvent.classList.add('hidden');
    }, 2200);
  }

  showNotice(msg) {
    this.domActionBanner.textContent = msg;
  }

  animate(now) {
    requestAnimationFrame((t) => this.animate(t));
    const delta = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;

    // Camera Logic: VR Batsman POV vs Broadcast Camera Tracking
    if (this.isVRMode) {
      // 1. FIRST-PERSON BATSMAN VR VIEW
      // Camera placed right at the batsman's head / helmet looking down the pitch towards the bowler
      const sPos = this.strikerAvatar ? this.strikerAvatar.group.position : new THREE.Vector3(0, 0.0, 3.8);
      this.targetCamPos.set(sPos.x, 0.62, sPos.z - 0.22);

      if (this.ball && this.ball.active) {
        const bPos = this.ball.pos;
        if (!this.ball.isHitShot) {
          // Ball arriving towards batsman: batsman eyes track incoming delivery and pitch bounce!
          this.targetCamLookAt.set(
            bPos.x * 0.7 + this.vrMouseOffsetX,
            Math.max(0.18, bPos.y) - this.vrMouseOffsetY,
            bPos.z
          );
        } else {
          // Ball hit: batsman turns and tracks the ball soaring into the outfield!
          this.targetCamLookAt.set(
            bPos.x + this.vrMouseOffsetX,
            Math.max(0.4, bPos.y) - this.vrMouseOffsetY,
            bPos.z
          );
        }
      } else {
        // Focused down the pitch towards the bowler
        const bwlPos = this.bowlerAvatar ? this.bowlerAvatar.group.position : new THREE.Vector3(0, 0.0, -3.7);
        this.targetCamLookAt.set(
          bwlPos.x * 0.5 + this.vrMouseOffsetX,
          0.75 - this.vrMouseOffsetY,
          bwlPos.z
        );
      }
      this.camera.position.lerp(this.targetCamPos, 7.5 * delta);
      this.currentCamLookAt.lerp(this.targetCamLookAt, 8.5 * delta);
      this.camera.lookAt(this.currentCamLookAt);
    } else if (this.cameraTracking && this.ball && this.ball.active) {
      const bPos = this.ball.pos;
      if (this.isUserBowling) {
        // Elevated behind-bowler tracking following the ball towards the outfield
        this.targetCamPos.set(
          bPos.x * 0.4,
          6.5 + Math.max(0, bPos.y * 0.35),
          Math.max(bPos.z + 12.0, 16.0)
        );
        this.targetCamLookAt.set(bPos.x, Math.max(1.0, bPos.y), bPos.z);
      } else if (bPos.z < -10.0) {
        // Behind wicketkeeper shot (Third Man, Fine Leg, Slips)
        this.targetCamPos.set(
          bPos.x * 0.35,
          6.5 + Math.max(0, bPos.y * 0.35),
          Math.max(-28.0, bPos.z - 8.0)
        );
        this.targetCamLookAt.set(bPos.x, Math.max(1.0, bPos.y), bPos.z);
      } else {
        // Forward outfield shot (Straight, Covers, Mid-Wicket, Point)
        this.targetCamPos.set(
          bPos.x * 0.45,
          6.0 + Math.max(0, bPos.y * 0.25),
          Math.min(22.0, -17.5 + bPos.z * 0.25)
        );
        this.targetCamLookAt.set(bPos.x, Math.max(1.0, bPos.y), bPos.z);
      }
      this.camera.position.lerp(this.targetCamPos, 3.8 * delta);
      this.currentCamLookAt.lerp(this.targetCamLookAt, 4.5 * delta);
      this.camera.lookAt(this.currentCamLookAt);
    } else {
      // Smoothly glide back to default pitch broadcast camera
      this.camera.position.lerp(this.defaultCamPos, 2.5 * delta);
      this.currentCamLookAt.lerp(this.defaultCamLookAt, 3.0 * delta);
      this.camera.lookAt(this.currentCamLookAt);
    }

    // Update characters
    if (this.strikerAvatar) this.strikerAvatar.update(delta);
    if (this.nonStrikerAvatar) this.nonStrikerAvatar.update(delta);
    if (this.bowlerAvatar) this.bowlerAvatar.update(delta);
    if (this.keeperAvatar) this.keeperAvatar.update(delta);
    if (this.umpireAvatar) this.umpireAvatar.update(delta);
    this.fielders.forEach(f => f.update(delta));

    // Update ground / sky clouds
    if (this.ground) this.ground.update(delta);

    // Update real physics ball
    this.ball.update(delta);

    // Pulse pitch target reticle when aiming
    if (this.pitchTargetGroup && this.pitchTargetGroup.visible) {
      const s = 1.0 + Math.sin(now * 0.007) * 0.08;
      this.pitchTargetGroup.scale.set(s, 1, s);
    }

    this.renderer.render(this.scene, this.camera);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new CricketGame();
});
