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
    this.bowlerCamPos = new THREE.Vector3(0, 2.9, -6.6);
    this.bowlerCamLookAt = new THREE.Vector3(0, 1.0, 3.8);
    this.batsmanCamPos = new THREE.Vector3(0, 6.5, 11.5);
    this.batsmanCamLookAt = new THREE.Vector3(0, 1.2, 0);

    // Interactive Manual Running State
    this.manualRunningActive = false;
    this.manualRunsTaken = 0;
    this.maxAvailableRuns = 0;
    this.isRunningBetweenWickets = false;
    this.runCancelled = false;
    this.domRunningBar = null;

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
  }

  _initThree() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x82C7FE);

    // Exact Broadcast Camera
    this.camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.1, 160);
    this.defaultCamPos = new THREE.Vector3(0, 6.5, 11.5);
    this.defaultCamLookAt = new THREE.Vector3(0, 1.2, 0);
    this.currentCamLookAt = new THREE.Vector3(0, 1.2, 0);
    this.targetCamPos = this.defaultCamPos.clone();
    this.targetCamLookAt = this.defaultCamLookAt.clone();
    this.cameraTracking = false;

    this.camera.position.copy(this.defaultCamPos);
    this.camera.lookAt(this.defaultCamLookAt);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    document.getElementById('canvas-container').appendChild(this.renderer.domElement);

    // Exact Lighting:
    const keyLight = new THREE.DirectionalLight(0xFFF4C2, 1.2);
    keyLight.position.set(-4, 8, 5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 40;
    keyLight.shadow.camera.left = -16;
    keyLight.shadow.camera.right = 16;
    keyLight.shadow.camera.top = 16;
    keyLight.shadow.camera.bottom = -16;
    keyLight.shadow.bias = -0.0005;
    this.scene.add(keyLight);

    const fillLight = new THREE.AmbientLight(0xBDE3FF, 0.45);
    this.scene.add(fillLight);

    const updateFOVAndSize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const aspect = width / height;
      this.camera.aspect = aspect;
      // Responsive Mobile FOV scaling:
      // In portrait mode (aspect < 1.0), widen the vertical FOV so the pitch, wickets, and characters fit nicely
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

    this._setupDefaultCharacters();

    // Bat Controller Swing Hook
    this.battingUI.onSwing = (command) => {
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
      this.network.bowl(data);
    };
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

    document.getElementById('btn-copy-room')?.addEventListener('click', () => {
      if (this.network.roomCode) {
        navigator.clipboard.writeText(window.location.origin + '?room=' + this.network.roomCode);
        this.showNotice('📋 Room link copied to clipboard!');
      }
    });

    document.getElementById('btn-play-again')?.addEventListener('click', () => {
      window.location.reload();
    });

    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyR') {
        this._handleUserPushRun();
      } else if (e.code === 'KeyC') {
        this._handleUserCancelRun();
      }
    });
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
      this.bowlerAvatar.setPosition(0, 0.35, -11.0);
      this.bowlerAvatar.setRotation(0);
    });

    this.network.on('bowl_now', (data) => {
      this.showNotice(`⚾ Your turn to bowl ball ${data.ball} of over ${data.over}!`);
      this._updateCameraMode();
      this.bowlingUI.show({ timeout: 20000 });
    });

    // Bowler Run-Up Event: bowler begins full 2.5-second runup from back and batting meter appears immediately
    this.network.on('bowler_runup', (data) => {
      const swingStr = data.swingDirection ? ` &bull; ${data.swingDirection.toUpperCase()}` : '';
      this.domActionBanner.innerHTML = `⚡ ${data.bowler?.name} charging in (${data.deliveryType.toUpperCase()}${swingStr})...`;

      // Animate bowler run-up stride towards the bowling crease over 2500ms
      if (this.bowlerAvatar) {
        this.bowlerAvatar.setPosition(0, 0.35, -11.0);
        const startZ = -11.0;
        const targetZ = -3.7;
        const startTime = performance.now();
        const duration = 2500;
        const runupStep = (now) => {
          const elapsed = now - startTime;
          const p = Math.min(1.0, elapsed / duration);
          if (this.bowlerAvatar) {
            this.bowlerAvatar.group.position.z = startZ + (targetZ - startZ) * p;
            this.bowlerAvatar.group.position.y = 0.35 + Math.abs(Math.sin(p * Math.PI * 12)) * 0.12;
            this.bowlerAvatar.group.position.x = Math.sin(p * Math.PI * 6) * 0.08;

            // When user is bowling, dolly camera smoothly towards the bowling wickets
            if (this.isUserBowling && !this.cameraTracking) {
              const camZ = -6.6 + (1 - p) * -3.0;
              this.defaultCamPos.set(0, 2.9 + (1 - p) * 0.8, camZ);
              this.defaultCamLookAt.set(0, 1.0, 3.8);
            }
          }
          if (p < 1.0) {
            requestAnimationFrame(runupStep);
          } else if (this.bowlerAvatar) {
            this.bowlerAvatar.setPosition(0, 0.35, targetZ);
            if (this.isUserBowling && !this.cameraTracking) {
              this.defaultCamPos.copy(this.bowlerCamPos);
              this.defaultCamLookAt.copy(this.bowlerCamLookAt);
            }
          }
        };
        requestAnimationFrame(runupStep);
      }

      // Show prominent Batting UI & timing meter immediately during run-up!
      const isBattingTeam = (this.currentScorecard?.battingTeam === this.myTeam) ||
                            (data.batsman?.id === this.myId) ||
                            (!this.roomInfo?.players?.teamA?.some(p => !p.isBot && p.id !== this.myId));
      if (isBattingTeam) {
        this.battingUI.show({ timeout: 7000 });
      }
    });

    this.network.on('delivery', (data) => {
      const paceStr = data.paceKmh ? ` [${data.paceKmh} km/h]` : '';
      const swingStr = data.swingDirection ? ` &bull; ${data.swingDirection.toUpperCase()}` : '';
      this.domActionBanner.textContent = `⚾ ${data.bowler?.name} delivers ${data.deliveryType.toUpperCase()}${swingStr}${paceStr}!`;
      if (this.bowlerAvatar) {
        this.bowlerAvatar.setPosition(0, 0.35, -3.7);
        this.bowlerAvatar.triggerBowlAction();
      }

      // Authentic cricket ball delivery: release from bowler hand (y = 1.35m)
      const startPos = new THREE.Vector3(0, 1.35, -3.7);
      const lzNormZ = typeof data.landingZone?.z === 'number' ? data.landingZone.z : 0.45;
      const lzZ = 3.0 - lzNormZ * 3.2;
      const lzX = (data.landingZone?.x || 0) * 0.65;
      const landingPos = new THREE.Vector3(lzX, 0.16, lzZ);
      const targetPos = new THREE.Vector3(lzX, 0.68, 3.8);

      this.ball.bowlDelivery(startPos, landingPos, targetPos, data.deliveryType, data.swingDirection);

      // Camera after bowl: firmly positioned behind the bowling wickets!
      this._updateCameraMode();
      if (this.isUserBowling) {
        this.cameraTracking = false;
        this.defaultCamPos.copy(this.bowlerCamPos);
        this.defaultCamLookAt.copy(this.bowlerCamLookAt);
      }

      // Ensure batting UI is displayed if user's team is batting
      const isBattingTeam = (this.currentScorecard?.battingTeam === this.myTeam) ||
                            (data.batsman?.id === this.myId) ||
                            (!this.roomInfo?.players?.teamA?.some(p => !p.isBot && p.id !== this.myId));
      if (isBattingTeam && !this.battingUI.active) {
        this.battingUI.show({ timeout: 7000 });
      }
    });

    this.network.on('ball_result', (data) => {
      this.battingUI.hide();
      this.bowlingUI.hide();
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

      if (data.wicket) {
        this.cameraTracking = false;
        this._playOutSound();
        if (this.umpireAvatar) this.umpireAvatar.signalOut();
        this.showBigEvent('OUT! WICKET!', `${data.dismissal || 'Caught'} - Umpire finger raised!`);
        if (this.bowlerAvatar) this.bowlerAvatar.triggerCelebrate();
        this._animateFielderCatch(dirInfo);
      } else if (data.runs === 6) {
        this.cameraTracking = true;
        this._playCheerSound();
        if (this.umpireAvatar) this.umpireAvatar.signalSix();
        this.showBigEvent('SIXER! 🚀', 'Soaring over the stadium grandstands!');
        this.ball.hitLaunch(new THREE.Vector3(0, 0.65, 3.8), dirInfo, data.timing || 0.88, data.shotType || 'loft', true, 6);
        if (this.strikerAvatar) this.strikerAvatar.triggerCelebrate();
        setTimeout(() => { this.cameraTracking = false; }, 3600);
      } else if (data.runs === 4) {
        this.cameraTracking = true;
        this._playCheerSound();
        if (this.umpireAvatar) this.umpireAvatar.signalFour();
        this.showBigEvent('FOUR! 🏏', 'Crisp drive racing across the turf!');
        this.ball.hitLaunch(new THREE.Vector3(0, 0.65, 3.8), dirInfo, data.timing || 0.76, data.shotType || 'drive', false, 4);
        this._animateFieldersPursuit(dirInfo, 4);
        setTimeout(() => { this.cameraTracking = false; }, 3200);
      } else if (data.runs > 0) {
        this.cameraTracking = true;
        this.showNotice(`🏏 Ball placed in the gap! Use RUN button to run!`);
        this.ball.hitLaunch(new THREE.Vector3(0, 0.65, 3.8), dirInfo, data.timing || 0.55, data.shotType || 'drive', false, data.runs);
        this._animateFieldersPursuit(dirInfo, data.runs);
        this._setupManualRunning(data.runs);
        setTimeout(() => { this.cameraTracking = false; }, 3200);
      } else if (data.wide) {
        this.cameraTracking = false;
        if (this.umpireAvatar) this.umpireAvatar.signalWide();
        this.showNotice(`⚠️ WIDE BALL! 1 Extra run + re-bowl.`);
      } else if (data.noBall) {
        this.cameraTracking = false;
        this.showNotice(`🚨 NO BALL! Bowler overstepped crease line!`);
      } else {
        this.cameraTracking = false;
        this.showNotice(`• Dot ball! Tidy fielding.`);
      }
    });

    this.network.on('next_batsman_needed', (data) => {
      this._showCaptainPickBatsman(data.availableBatsmen);
    });

    this.network.on('new_batsman', (data) => {
      this.showNotice(`🏏 New Batter on pitch: ${data.batsman?.name}!`);
    });

    this.network.on('over_complete', (data) => {
      this.showNotice(`🔔 Over ${data.over} complete! Score: ${data.scorecard?.runs}/${data.scorecard?.wickets}`);
    });

    this.network.on('innings_end', (data) => {
      const inn = data.innings;
      const card = data.scorecard;
      this.showBigEvent(`INNINGS ${inn} OVER!`, `${card.runs} Runs / ${card.wickets} Wickets. Target: ${card.runs + 1}`);
    });

    this.network.on('game_over', (data) => {
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
    this.bowlerAvatar = new CricketCharacter(this.scene, 'snail_bowler_01');

    // Small Umpire placed slightly to side at bowler end (x = -1.3, z = -5.8) so it doesn't block pitch
    this.umpireAvatar = new CricketCharacter(this.scene, { species: 'umpire', role: 'umpire' });
    this.umpireAvatar.setPosition(-1.3, 0.16, -5.8);
    this.umpireAvatar.setRotation(0);

    const snailLeft = new CricketCharacter(this.scene, 'snail_fielder_left');
    const antRight = new CricketCharacter(this.scene, 'ant_fielder_right');
    this.fielders.push(snailLeft, antRight);
  }

  _setupMatchCharacters(battingTeam, bowlingTeam) {
    if (this.strikerAvatar) this.strikerAvatar.destroy();
    if (this.nonStrikerAvatar) this.nonStrikerAvatar.destroy();
    if (this.bowlerAvatar) this.bowlerAvatar.destroy();
    if (this.keeperAvatar) this.keeperAvatar.destroy();
    if (this.umpireAvatar) this.umpireAvatar.destroy();
    this.fielders.forEach(f => f.destroy());
    this.fielders = [];

    // Striker
    const batterPresetId = this.battingUI.characterId || 'ant_batter_01';
    this.strikerAvatar = new CricketCharacter(this.scene, batterPresetId);
    if (this.strikerAvatar && this.battingUI) {
      this.strikerAvatar.setStance(this.battingUI.stance);
    }

    // Non-striker
    this.nonStrikerAvatar = new CricketCharacter(this.scene, 'ant_fielder_right');
    this.nonStrikerAvatar.setPosition(-1.3, 0.55, -3.8);
    this.nonStrikerAvatar.setRotation(0);

    // Bowler
    this.bowlerAvatar = new CricketCharacter(this.scene, 'snail_bowler_01');
    this.bowlerAvatar.setPosition(0, 0.35, -11.0);

    // Wicketkeeper
    this.keeperAvatar = new CricketCharacter(this.scene, 'snail_fielder_left');
    this.keeperAvatar.setPosition(0, 0.3, 5.4);
    this.keeperAvatar.setRotation(Math.PI);

    // Small Umpire at bowler end, slightly offset to leg side
    this.umpireAvatar = new CricketCharacter(this.scene, { species: 'umpire', role: 'umpire' });
    this.umpireAvatar.setPosition(-1.3, 0.16, -5.8);
    this.umpireAvatar.setRotation(0);

    // Fielders in strategic positions
    const f1 = new CricketCharacter(this.scene, 'snail_fielder_left');
    const f2 = new CricketCharacter(this.scene, 'ant_fielder_right');

    const extraPositions = [
      { id: 'snail_fielder_left', x: -8, y: 0.3, z: 2 },
      { id: 'ant_fielder_right', x: 9, y: 0.55, z: 4 },
      { id: 'snail_fielder_left', x: 0, y: 0.3, z: -10 },
      { id: 'ant_fielder_right', x: -10, y: 0.55, z: -6 },
      { id: 'snail_fielder_left', x: 7, y: 0.3, z: -8 }
    ];

    extraPositions.forEach(ep => {
      const f = new CricketCharacter(this.scene, ep.id);
      f.setPosition(ep.x, ep.y, ep.z);
      f.setRotation(Math.atan2(-ep.x, 3.8 - ep.z));
      this.fielders.push(f);
    });

    this.fielders.push(f1, f2);
  }

  // Enhanced Athletic Diving Catch Animation
  _animateFielderCatch(dirInfo) {
    const targetX = dirInfo.x * 13;
    const targetZ = 3.8 + dirInfo.z * 13;

    let nearest = null;
    let minDist = Infinity;
    this.fielders.forEach(f => {
      const d = Math.hypot(f.group.position.x - targetX, f.group.position.z - targetZ);
      if (d < minDist) {
        minDist = d;
        nearest = f;
      }
    });

    if (nearest) {
      this.ball.hitLaunch(new THREE.Vector3(0, 0.65, 3.8), dirInfo, 0.6, 'loft', false);
      const startX = nearest.group.position.x;
      const startZ = nearest.group.position.z;
      const startTime = performance.now();
      const duration = 1100;

      const run = (now) => {
        const p = Math.min(1.0, (now - startTime) / duration);
        nearest.group.position.x = startX + (targetX - startX) * (p * 0.9);
        nearest.group.position.z = startZ + (targetZ - startZ) * (p * 0.9);
        nearest.group.rotation.y = Math.atan2(targetX - startX, targetZ - startZ);

        if (p < 1.0) {
          requestAnimationFrame(run);
        } else {
          // Athletic diving slide catch!
          nearest.triggerCatch();
        }
      };
      requestAnimationFrame(run);
    }
  }

  // Dynamic Fielder Pursuit: 2 closest fielders sprint towards ball, gather and throw
  _animateFieldersPursuit(dirInfo, runs = 1) {
    const dist = Math.min(25, 12 + (runs || 1) * 3.5);
    const targetX = dirInfo.x * dist;
    const targetZ = 3.8 + dirInfo.z * dist;

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
      const duration = 1600;

      const chaseStep = (now) => {
        const p = Math.min(1.0, (now - startTime) / duration);
        primary.group.position.x = startX + (targetX - startX) * (p * 0.85);
        primary.group.position.z = startZ + (targetZ - startZ) * (p * 0.85);
        primary.group.rotation.y = Math.atan2(targetX - startX, targetZ - startZ);
        primary.group.position.y = 0.3 + Math.abs(Math.sin(p * Math.PI * 8)) * 0.08;

        if (p < 1.0) {
          requestAnimationFrame(chaseStep);
        } else {
          primary.triggerFieldGather();
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
      const bDuration = 1800;

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
  _setupManualRunning(maxRuns) {
    this.manualRunningActive = true;
    this.manualRunsTaken = 0;
    this.maxAvailableRuns = Math.max(1, maxRuns || 1);
    this.isRunningBetweenWickets = false;
    this.runCancelled = false;

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

    // If human is not on the batting team (e.g. user is bowling), bots automatically take runs
    const isBattingTeam = (this.currentScorecard?.battingTeam === this.myTeam) ||
                          (!this.roomInfo?.players?.teamA?.some(p => !p.isBot && p.id !== this.myId));
    if (!isBattingTeam) {
      let r = 0;
      const botRunInterval = setInterval(() => {
        if (!this.manualRunningActive || r >= this.maxAvailableRuns) {
          clearInterval(botRunInterval);
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
      this.showNotice('⚠️ Fielder has gathered ball! Cannot risk another run.');
      return;
    }

    this.isRunningBetweenWickets = true;
    const runNum = this.manualRunsTaken + 1;
    this.showNotice(`🏃 Taking run ${runNum}! Press [C] to Cancel & Dive.`);

    const fromStrikerEnd = (this.manualRunsTaken % 2 === 0);
    const runZStartStriker = fromStrikerEnd ? 3.8 : -3.8;
    const runZEndStriker = fromStrikerEnd ? -3.8 : 3.8;
    const runZStartNonStriker = fromStrikerEnd ? -3.8 : 3.8;
    const runZEndNonStriker = fromStrikerEnd ? 3.8 : -3.8;

    const startTime = performance.now();
    const runDuration = 950;

    const runStep = (now) => {
      if (!this.manualRunningActive) return;

      if (this.runCancelled) {
        this._animateCancelDive(fromStrikerEnd);
        return;
      }

      const elapsed = now - startTime;
      const p = Math.min(1.0, elapsed / runDuration);

      if (this.strikerAvatar) {
        this.strikerAvatar.group.position.z = runZStartStriker + (runZEndStriker - runZStartStriker) * p;
        this.strikerAvatar.group.position.x = 0.5 * Math.sin(p * Math.PI);
        this.strikerAvatar.group.position.y = 0.65 + Math.abs(Math.sin(p * Math.PI * 6)) * 0.1;
      }
      if (this.nonStrikerAvatar) {
        this.nonStrikerAvatar.group.position.z = runZStartNonStriker + (runZEndNonStriker - runZStartNonStriker) * p;
        this.nonStrikerAvatar.group.position.x = -1.0 - 0.4 * Math.sin(p * Math.PI);
        this.nonStrikerAvatar.group.position.y = 0.55 + Math.abs(Math.sin(p * Math.PI * 6)) * 0.1;
      }

      if (p < 1.0) {
        requestAnimationFrame(runStep);
      } else {
        this.manualRunsTaken++;
        this.isRunningBetweenWickets = false;
        const countEl = document.getElementById('manual-runs-count');
        if (countEl) countEl.textContent = String(this.manualRunsTaken);

        this._showRunBanner(this.manualRunsTaken);

        if (this.manualRunsTaken >= this.maxAvailableRuns) {
          setTimeout(() => this._finishManualRunning(), 550);
        }
      }
    };
    requestAnimationFrame(runStep);
  }

  _animateCancelDive(fromStrikerEnd) {
    this.isRunningBetweenWickets = false;
    this.showNotice('🛑 RUN CANCELLED! Batsmen diving back into crease!');
    const sZ = this.strikerAvatar ? this.strikerAvatar.group.position.z : 3.8;
    const nsZ = this.nonStrikerAvatar ? this.nonStrikerAvatar.group.position.z : -3.8;

    const targetSZ = fromStrikerEnd ? 3.8 : -3.8;
    const targetNsZ = fromStrikerEnd ? -3.8 : 3.8;

    const startTime = performance.now();
    const duration = 380;

    const diveStep = (now) => {
      const p = Math.min(1.0, (now - startTime) / duration);
      if (this.strikerAvatar) {
        this.strikerAvatar.group.position.z = sZ + (targetSZ - sZ) * p;
        this.strikerAvatar.group.position.y = 0.45 + (1 - p) * 0.2;
      }
      if (this.nonStrikerAvatar) {
        this.nonStrikerAvatar.group.position.z = nsZ + (targetNsZ - nsZ) * p;
        this.nonStrikerAvatar.group.position.y = 0.40 + (1 - p) * 0.2;
      }
      if (p < 1.0) {
        requestAnimationFrame(diveStep);
      } else {
        this._finishManualRunning();
      }
    };
    requestAnimationFrame(diveStep);
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
    this.manualRunningActive = false;
    this.isRunningBetweenWickets = false;
    if (this.domRunningBar) {
      this.domRunningBar.classList.add('hidden');
    }

    // Set final positions and swap striker on odd runs
    const odd = (this.manualRunsTaken % 2 === 1);
    if (odd) {
      const prevStriker = this.strikerAvatar;
      this.strikerAvatar = this.nonStrikerAvatar;
      this.nonStrikerAvatar = prevStriker;
    }
    if (this.strikerAvatar) {
      this.strikerAvatar.setPosition(0, 0.65, 3.8);
      this.strikerAvatar.setRotation(Math.PI);
    }
    if (this.nonStrikerAvatar) {
      this.nonStrikerAvatar.setPosition(-1.3, 0.55, -3.8);
      this.nonStrikerAvatar.setRotation(0);
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

    // Dynamic Broadcast Camera Tracking (follows ball in flight, including backside shots)
    if (this.cameraTracking && this.ball && this.ball.active) {
      const bPos = this.ball.pos;
      if (this.isUserBowling) {
        // Bowling wickets perspective: elevated tracking following the ball into the outfield
        this.targetCamPos.set(
          bPos.x * 0.4,
          3.8 + Math.max(0, bPos.y * 0.35),
          Math.min(bPos.z - 4.5, -6.6)
        );
        this.targetCamLookAt.set(bPos.x, Math.max(0.5, bPos.y), bPos.z);
      } else if (bPos.z > 3.0) {
        // Backside shot (Third Man, Fine Leg, behind wicketkeeper)
        // Camera moves higher and looks backward tracking the ball
        this.targetCamPos.set(
          bPos.x * 0.35,
          7.2 + Math.max(0, bPos.y * 0.35),
          Math.min(18.5, 11.5 + (bPos.z - 3.0) * 0.65)
        );
        this.targetCamLookAt.set(bPos.x, Math.max(0.5, bPos.y), bPos.z);
      } else {
        // Forward outfield shot (Covers, Mid-Wicket, Straight, Point)
        this.targetCamPos.set(
          bPos.x * 0.45,
          6.5 + Math.max(0, bPos.y * 0.25),
          11.5 + bPos.z * 0.25
        );
        this.targetCamLookAt.set(bPos.x, Math.max(0.6, bPos.y), bPos.z);
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

    this.renderer.render(this.scene, this.camera);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new CricketGame();
});
