import * as THREE from 'three';
import { Ground } from './engine/Ground.js';
import { CricketCharacter } from './engine/CricketCharacter.js';
import { Ball } from './engine/Ball.js';
import { BattingUI } from './engine/BattingUI.js';
import { BowlingUI } from './engine/BowlingUI.js';
import { NetworkClient } from './engine/NetworkClient.js';

class CricketGame {
  constructor() {
    this.network = new NetworkClient();
    this.fielders = [];
    this.strikerAvatar = null;
    this.nonStrikerAvatar = null;
    this.bowlerAvatar = null;
    this.keeperAvatar = null;
    this.currentScorecard = null;
    this.myId = null;
    this.myTeam = null;
    this.isHost = false;
    this.roomInfo = null;
    this.lastTime = performance.now();

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
  }

  _initThree() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x70a1ff); // Daylight summer sky
    this.scene.fog = new THREE.FogExp2(0x70a1ff, 0.008);

    this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 200);
    // Isometric view looking down the pitch towards the batsman
    this.camera.position.set(0, 11, -19);
    this.camera.lookAt(0, 1.2, 4);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    document.getElementById('canvas-container').appendChild(this.renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
    this.scene.add(ambientLight);

    const sun = new THREE.DirectionalLight(0xfff8e7, 1.25);
    sun.position.set(15, 25, -10);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 1024;
    sun.shadow.mapSize.height = 1024;
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 80;
    sun.shadow.camera.left = -25;
    sun.shadow.camera.right = 25;
    sun.shadow.camera.top = 25;
    sun.shadow.camera.bottom = -25;
    this.scene.add(sun);

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  _initGameModules() {
    this.ground = new Ground(this.scene);
    this.ball = new Ball(this.scene);
    this.battingUI = new BattingUI(this.domControlsContainer);
    this.bowlingUI = new BowlingUI(this.domControlsContainer);

    this.battingUI.onSwing = (data) => {
      this._playBatSound();
      if (this.strikerAvatar) this.strikerAvatar.triggerBatSwing();
      this.network.bat(data);
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
  }

  _playBatSound() {
    if (!this.audioCtx) return;
    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(280, this.audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(80, this.audioCtx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.8, this.audioCtx.currentTime);
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
      osc.frequency.setValueAtTime(520, this.audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(780, this.audioCtx.currentTime + 0.4);
      gain.gain.setValueAtTime(0.3, this.audioCtx.currentTime);
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
      osc.frequency.setValueAtTime(150, this.audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(60, this.audioCtx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.6, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.35);
    } catch (e) {}
  }

  _bindEvents() {
    this.domBtnRandRoom.addEventListener('click', () => {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let code = 'CRIC-';
      for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
      this.domInputRoomCode.value = code;
    });

    this.domBtnConnect.addEventListener('click', () => {
      const name = this.domInputNickname.value.trim() || 'Player';
      const roomCode = (this.domInputRoomCode.value.trim() || 'CRIC-1').toUpperCase();
      const mode = this.domSelectGameMode.value;
      const overs = parseInt(this.domSelectOvers.value, 10) || 5;

      this.network.connect();
      this.network.joinRoom(roomCode, name, '#5c2d0a', mode, overs);

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
      this.domTossStatus.textContent = 'Flipping coin between Captains...';

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
      this.domTossStatus.textContent = `Coin landed on: ${data.result.toUpperCase()}! ${data.winner?.name} won the toss!`;
    });

    this.network.on('toss_decision_needed', () => {
      this.domTossDecisionButtons.classList.remove('hidden');
    });

    this.network.on('toss_decision', (data) => {
      this.domTossModal.classList.add('hidden');
      const choice = data.choice === 'bat' ? 'BAT' : 'BOWL';
      const teamName = data.battingTeam === 'a' ? 'Ants' : 'Grasshoppers';
      this.showBigEvent('TOSS DECIDED!', `${data.winner?.name} elected to ${choice}! ${teamName} batting.`);
    });

    this.network.on('innings_setup', (data) => {
      this.domLobby.classList.add('hidden');
      this.domHud.classList.remove('hidden');
      this._setupCharacters(data.battingTeam, data.bowlingTeam);
      this._updateScorecardUI(data.scorecard);
    });

    this.network.on('bowling_order_needed', (data) => {
      this._showCaptainPickBowler(data.bowlers, data.over);
    });

    this.network.on('over_started', (data) => {
      this.domCaptainModal.classList.add('hidden');
      this.showNotice(`⚡ Over ${data.over} begins! ${data.bowler?.name} bowling to ${data.batsman?.name}.`);
      this._updateScorecardUI(data.scorecard);
      if (this.bowlerAvatar) {
        this.bowlerAvatar.moveTo(0, 0, -10.5);
      }
    });

    this.network.on('bowl_now', (data) => {
      this.showNotice(`⚾ Your turn to bowl ball ${data.ball} of over ${data.over}!`);
      this.bowlingUI.show({ timeout: 6000 });
    });

    this.network.on('delivery', (data) => {
      this.domActionBanner.textContent = `⚾ ${data.bowler?.name} delivers a ${data.deliveryType.toUpperCase()}!`;
      if (this.bowlerAvatar) {
        this.bowlerAvatar.triggerBowlAction();
      }

      // Launch ball delivery in 3D scene
      const startPos = new THREE.Vector3(0, 1.4, -9.5);
      const lzX = data.landingZone?.x || 0;
      const lzZ = 8.2 - (data.landingZone?.z || 0.4) * 8.0;
      const endPos = new THREE.Vector3(lzX * 0.8, 0.4, 8.5);

      this.ball.launch(startPos, endPos, {
        peakHeight: data.deliveryType === 'bouncer' ? 3.8 : data.deliveryType === 'yorker' ? 1.4 : 2.5,
        duration: data.deliveryType === 'spin' ? 1.4 : 0.9,
        trajectory: data.deliveryType,
        lateral: data.deliveryType === 'spin' ? (Math.random() - 0.5) * 0.8 : 0
      });

      // If local player is the current striker, show batting timing UI!
      const isStriker = (data.batsman?.id === this.myId);
      if (isStriker) {
        this.battingUI.show({ timeout: 2500 });
      }
    });

    this.network.on('ball_result', (data) => {
      this.battingUI.hide();
      this.bowlingUI.hide();
      this._updateScorecardUI(data.scorecard);

      // Visual / Audio feedback
      if (data.wicket) {
        this._playOutSound();
        this.showBigEvent('WICKET! OUT!', `${data.dismissal} - clean dismissal!`);
        if (this.strikerAvatar) {
          this.strikerAvatar.setPosition(1.5, 0, 8.5);
        }
      } else if (data.runs === 6) {
        this._playCheerSound();
        this.showBigEvent('SIXER! 🚀', 'Magnificent maximum into the stands!');
        this._launchHitBall(data.direction, 35, 8.0);
      } else if (data.runs === 4) {
        this._playCheerSound();
        this.showBigEvent('FOUR! 🏏', 'Crisp stroke racing across the turf!');
        this._launchHitBall(data.direction, 26, 3.5);
      } else if (data.runs > 0) {
        this.showNotice(`🏃 ${data.runs} Run${data.runs > 1 ? 's' : ''} taken! Good running between wickets.`);
        this._launchHitBall(data.direction, 12, 1.5);
      } else if (data.wide) {
        this.showNotice(`⚠️ WIDE BALL! 1 Extra run + ball to be re-bowled.`);
      } else if (data.noBall) {
        this.showNotice(`🚨 NO BALL! Extra run awarded.`);
      } else {
        this.showNotice(`• Dot ball! Excellent fielding.`);
      }
    });

    this.network.on('next_batsman_needed', (data) => {
      this._showCaptainPickBatsman(data.availableBatsmen);
    });

    this.network.on('new_batsman', (data) => {
      this.showNotice(`🏏 New Batsman on pitch: ${data.batsman?.name}!`);
      if (this.strikerAvatar) {
        this.strikerAvatar.setPosition(0, 0, 8.5);
      }
    });

    this.network.on('over_complete', (data) => {
      this.showNotice(`🔔 Over ${data.over} complete! Total: ${data.scorecard?.runs}/${data.scorecard?.wickets}`);
    });

    this.network.on('innings_end', (data) => {
      const inn = data.innings;
      const card = data.scorecard;
      this.showBigEvent(`INNINGS ${inn} OVER!`, `${card.runs} Runs / ${card.wickets} Wickets. Target: ${card.runs + 1}`);
    });

    this.network.on('game_over', (data) => {
      this.domHud.classList.add('hidden');
      this.domGameOver.classList.remove('hidden');
      document.getElementById('winner-title').textContent = (data.winner === 'a' ? '🐜 ANTS WIN!' : data.winner === 'b' ? '🦗 GRASSHOPPERS WIN!' : '🤝 MATCH DRAWN!');
      document.getElementById('winner-reason').textContent = data.reason || 'What an incredible cricket clash!';
      this._renderFinalSummary(data.scorecard);
    });

    // Single Batting turn start
    this.network.on('sb_turn_started', (data) => {
      this.domLobby.classList.add('hidden');
      this.domHud.classList.remove('hidden');
      this._setupCharacters('a', 'b');
      this.showNotice(`⚡ Single Batting Turn: ${data.batsman?.name} batting, ${data.bowler?.name} bowling!`);
      this._updateScorecardUI(data.scorecard);
    });

    this.network.on('error_msg', (data) => {
      this.showNotice(`❌ ${data.msg}`);
    });
  }

  _launchHitBall(direction = 0, distance = 20, height = 3) {
    const startPos = new THREE.Vector3(0, 0.4, 8.5);
    const angle = direction * (Math.PI / 3); // -60 to +60 deg
    const endPos = new THREE.Vector3(
      Math.sin(angle) * distance,
      0.1,
      8.5 - Math.cos(angle) * distance
    );
    this.ball.launch(startPos, endPos, {
      peakHeight: height,
      duration: 1.2
    });
  }

  _setupCharacters(battingTeam, bowlingTeam) {
    // Clean old avatars
    if (this.strikerAvatar) this.strikerAvatar.destroy();
    if (this.nonStrikerAvatar) this.nonStrikerAvatar.destroy();
    if (this.bowlerAvatar) this.bowlerAvatar.destroy();
    if (this.keeperAvatar) this.keeperAvatar.destroy();
    this.fielders.forEach(f => f.destroy());
    this.fielders = [];

    // Batsman (Striker at crease)
    this.strikerAvatar = new CricketCharacter(this.scene, battingTeam, 'batsman');
    this.strikerAvatar.setPosition(0, 0, 8.5);
    this.strikerAvatar.setRotation(Math.PI);

    // Non-striker (at bowler end)
    this.nonStrikerAvatar = new CricketCharacter(this.scene, battingTeam, 'batsman');
    this.nonStrikerAvatar.setPosition(-1.3, 0, -8.5);

    // Bowler
    this.bowlerAvatar = new CricketCharacter(this.scene, bowlingTeam, 'bowler');
    this.bowlerAvatar.setPosition(0, 0, -10.5);

    // Wicketkeeper (behind stumps)
    this.keeperAvatar = new CricketCharacter(this.scene, bowlingTeam, 'wicketkeeper');
    this.keeperAvatar.setPosition(0, 0, 10.2);
    this.keeperAvatar.setRotation(Math.PI);

    // 7 Standard Fielders placed around the oval
    const fielderPositions = [
      { x: 5, z: 8, r: 'Point' },
      { x: 8, z: 3, r: 'Cover' },
      { x: 4, z: -5, r: 'Mid-off' },
      { x: -4, z: -5, r: 'Mid-on' },
      { x: -7, z: 3, r: 'Mid-wicket' },
      { x: -5, z: 9, r: 'Square Leg' },
      { x: 14, z: 12, r: 'Deep Extra Cover' }
    ];

    fielderPositions.forEach(fp => {
      const fielder = new CricketCharacter(this.scene, bowlingTeam, 'fielder');
      fielder.setPosition(fp.x, 0, fp.z);
      fielder.setRotation(Math.atan2(-fp.x, 8.5 - fp.z));
      this.fielders.push(fielder);
    });
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

    // Grasshoppers (Team B)
    this.domTeamBMembers.innerHTML = '';
    const teamB = info.players?.teamB || [];
    if (teamB.length === 0) {
      this.domTeamBMembers.innerHTML = '<span class="empty-hint">Waiting for players...</span>';
    } else {
      teamB.forEach(p => {
        const isCap = (p.id === info.captainB);
        const item = document.createElement('div');
        item.className = 'team-member-tag';
        item.innerHTML = `<span>🦗 ${p.name} ${p.isBot ? '(Bot)' : ''}</span>${isCap ? '<span class="captain-badge">👑 C</span>' : ''}`;
        this.domTeamBMembers.appendChild(item);
      });
    }
  }

  _updateScorecardUI(card) {
    if (!card) return;
    this.currentScorecard = card;

    const teamAIsBatting = (card.battingTeam === 'a');
    this.domTeamName.textContent = teamAIsBatting ? 'ANTS' : 'GRASSHOPPERS';
    this.domTeamIcon.textContent = teamAIsBatting ? '🐜' : '🦗';

    this.domRunsWickets.textContent = `${card.runs} / ${card.wickets}`;
    this.domOvers.textContent = `(${card.overs}.${card.balls} / ${this.roomInfo?.overs || 5} ov)`;

    if (card.target) {
      const needed = Math.max(0, card.target - card.runs);
      this.domTargetInfo.textContent = `Target: ${card.target} (Need ${needed} runs)`;
    } else {
      this.domTargetInfo.textContent = '1st Innings';
    }

    const totalBalls = card.overs * 6 + card.balls;
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
      this.domBowlerFigures.textContent = `${bwlStats?.wickets || 0}-${bwlStats?.runs || 0} (${bwlStats?.overs || 0}.${bwlStats?.balls || 0} ov)`;
    }

    // This Over Balls History
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
    document.getElementById('captain-modal-desc').textContent = `Choose who will bowl Over ${over}:`;

    const list = document.getElementById('captain-roster-list');
    list.innerHTML = '';
    bowlers.forEach(b => {
      const btn = document.createElement('button');
      btn.className = 'roster-btn';
      btn.innerHTML = `<span>⚾ ${b.name}</span><span>${b.isBot ? '(Bot)' : 'Human'}</span>`;
      btn.addEventListener('click', () => {
        this.domCaptainModal.classList.add('hidden');
        this.network.setBowler(b.id);
      });
      list.appendChild(btn);
    });
  }

  _showCaptainPickBatsman(batsmen) {
    this.domCaptainModal.classList.remove('hidden');
    document.getElementById('captain-modal-title').textContent = '👑 CAPTAIN: NEXT BATSMAN';
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

  _renderFullScorecard() {
    const sc = this.currentScorecard;
    const container = document.getElementById('scorecard-content');
    if (!sc || !container) return;

    let html = '';
    const renderInnings = (card, label) => {
      if (!card || !card.team) return '';
      const tName = card.team === 'a' ? 'Ants' : 'Grasshoppers';
      let out = `<h3>${label}: ${tName} (${card.runs}/${card.wickets} in ${card.overs}.${card.balls} ov)</h3>`;
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
          out += `<tr><td>${bw.name}</td><td>${bw.overs}.${bw.balls}</td><td>${bw.runs}</td><td>${bw.wickets}</td></tr>`;
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
        <div>🦗 Grasshoppers: ${inn2?.runs || 0}/${inn2?.wickets || 0}</div>
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

    // Update characters
    if (this.strikerAvatar) this.strikerAvatar.update(delta);
    if (this.nonStrikerAvatar) this.nonStrikerAvatar.update(delta);
    if (this.bowlerAvatar) this.bowlerAvatar.update(delta);
    if (this.keeperAvatar) this.keeperAvatar.update(delta);
    this.fielders.forEach(f => f.update(delta));

    // Update ball physics
    this.ball.update(delta);

    this.renderer.render(this.scene, this.camera);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new CricketGame();
});
