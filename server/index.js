import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(ROOT_DIR, 'client')));
app.use('/node_modules', express.static(path.join(ROOT_DIR, 'node_modules')));

// Game Balance Constants
const MAX_PLAYERS = 10;
const ROUND_DURATION = 120;
const COUNTDOWN_DURATION = 3;
const ROUND_END_DURATION = 6;
const BAT_DAMAGE = 25;
const BAT_RANGE = 2.6;
const BASE_SPEED = 4.5;
const FLAIL_DURATION = 3.0;

const rooms = new Map();

class GameRoom {
  constructor(roomCode) {
    this.code = roomCode;
    this.players = new Map();
    this.hitterHistory = new Set();
    this.currentHitterId = null;
    this.currentHitterIds = new Set();
    this.hunterCount = 1; // Host selectable 1 - 3 hunters (max 3)
    this.hostId = null; // First player who creates/joins becomes Host
    this.state = 'LOBBY';
    this.timer = 0;
    this.roundWinner = null;
    this.tickInterval = null;
    this.lastTick = Date.now();
    this.bots = new Map();
    this.botNames = ['Fluffy', 'Wobbles', 'Noodle', 'Jelly', 'Butter', 'Dizzy', 'Bonkers', 'Pancake', 'Spud'];
    this.botColors = ['#f4f2ee', '#ff4757', '#2ed573', '#ffa502', '#1e90ff', '#9b59b6', '#00d2d3', '#ff6b81', '#70a1ff'];

    this.lastSoundLocation = null;
    this.soundInvestigateTimer = 0;

    this.startTickLoop();
  }

  addPlayer(socketId, name, color, isBot = false, preferredRole = 'RANDOM') {
    if (this.players.size >= MAX_PLAYERS) return null;

    if (!isBot && !this.hostId) {
      this.hostId = socketId;
    }

    const spawnRadius = 2.4;
    const angle = (this.players.size / MAX_PLAYERS) * Math.PI * 2;
    const spawnX = Math.cos(angle) * spawnRadius;
    const spawnZ = Math.sin(angle) * spawnRadius;

    const player = {
      id: socketId,
      name: name || (isBot ? `Bot-${Math.floor(Math.random() * 1000)}` : `Player ${this.players.size + 1}`),
      color: color || '#f4f2ee',
      role: 'RUNNER',
      preferredRole: preferredRole || 'RANDOM',
      hp: 100,
      maxHp: 100,
      isAlive: true,
      isFlailing: false,
      flailTimer: 0,
      isFlatFlop: false,
      isCrawling: false,
      isSitting: false,
      isGrabbing: false,
      spinePitch: 0,
      position: { x: spawnX, y: 0, z: spawnZ },
      rotation: { y: Math.random() * Math.PI * 2 },
      velocity: { x: 0, y: 0, z: 0 },
      isBot: isBot,
      lastSwingTime: 0,
      score: 0,
      botWanderAngle: Math.random() * Math.PI * 2,
      botTurnTimer: Math.random() * 2.0,
      botSwingCooldown: Math.random() * 2.0,
      stationaryTimer: 0,
      lastStationaryPos: { x: spawnX, y: 0, z: spawnZ }
    };

    this.players.set(socketId, player);
    if (isBot) this.bots.set(socketId, player);

    return player;
  }

  removePlayer(socketId) {
    this.players.delete(socketId);
    this.bots.delete(socketId);
    this.hitterHistory.delete(socketId);
    this.currentHitterIds.delete(socketId);

    if (this.hostId === socketId) {
      const nextRealPlayer = Array.from(this.players.values()).find(p => !p.isBot && p.id !== socketId);
      this.hostId = nextRealPlayer ? nextRealPlayer.id : null;
    }

    const remainingHunters = Array.from(this.currentHitterIds).filter(id => this.players.has(id));
    if (remainingHunters.length === 0 && (this.state === 'HUNTING' || this.state === 'COUNTDOWN')) {
      this.endRound('RUNNERS', 'All Hitters disconnected! Runners win!');
    } else if (this.players.size === 0) {
      this.stop();
      rooms.delete(this.code);
    }
  }

  setBotCount(targetCount) {
    const realPlayers = Array.from(this.players.values()).filter(p => !p.isBot);
    const maxAllowedBots = Math.max(0, MAX_PLAYERS - realPlayers.length);
    const count = Math.min(Math.max(0, targetCount), maxAllowedBots);

    const currentBots = Array.from(this.bots.keys());
    while (currentBots.length > count) {
      const botId = currentBots.pop();
      this.removePlayer(botId);
    }

    let botIndex = currentBots.length;
    while (this.bots.size < count && this.players.size < MAX_PLAYERS) {
      const botId = `bot_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const name = this.botNames[botIndex % this.botNames.length];
      const color = this.botColors[botIndex % this.botColors.length];
      this.addPlayer(botId, name, color, true);
      botIndex++;
    }
  }

  selectNextHitter(forcedPlayerId = null) {
    const playerList = Array.from(this.players.values());
    if (playerList.length === 0) return null;

    // Number of hunters: host selection (1..3), clamped by available players
    const maxRequested = Math.min(3, Math.max(1, this.hunterCount || 1));
    const targetCount = (playerList.length === 1) ? 1 : Math.min(maxRequested, Math.max(1, playerList.length - 1));

    const chosen = [];

    // 1. Force requested hitter first if specified (e.g. Test as Hunter button)
    if (forcedPlayerId && this.players.has(forcedPlayerId)) {
      chosen.push(forcedPlayerId);
    }

    // 2. Add players who preferred HITTER
    const hunterRequesters = playerList.filter(p => !p.isBot && p.preferredRole === 'HITTER' && !chosen.includes(p.id));
    for (const p of hunterRequesters) {
      if (chosen.length >= targetCount) break;
      chosen.push(p.id);
    }

    // 3. Fill remaining hunter slots using fair round-robin history
    while (chosen.length < targetCount) {
      let candidates = playerList.filter(p => !chosen.includes(p.id) && !this.hitterHistory.has(p.id));
      if (candidates.length === 0) {
        this.hitterHistory.clear();
        candidates = playerList.filter(p => !chosen.includes(p.id));
        if (candidates.length === 0) break;
      }
      const pick = candidates[Math.floor(Math.random() * candidates.length)];
      chosen.push(pick.id);
      this.hitterHistory.add(pick.id);
    }

    for (const id of chosen) {
      this.hitterHistory.add(id);
    }

    this.currentHitterIds = new Set(chosen);
    this.currentHitterId = chosen[0] || null;

    for (const player of playerList) {
      player.role = this.currentHitterIds.has(player.id) ? 'HITTER' : 'RUNNER';
      player.hp = 100;
      player.isAlive = true;
      player.isFlailing = false;
      player.flailTimer = 0;
      player.isFlatFlop = false;
      player.isCrawling = false;
      player.isSitting = false;
    }

    return chosen;
  }

  startCountdown(forcedHitterId = null) {
    if (this.players.size < 1) return false;

    this.selectNextHitter(forcedHitterId);
    this.state = 'COUNTDOWN';
    this.timer = COUNTDOWN_DURATION;
    this.roundWinner = null;
    this.lastSoundLocation = null;
    this.soundInvestigateTimer = 0;

    const playerList = Array.from(this.players.values());
    const count = playerList.length;
    playerList.forEach((player, idx) => {
      const angle = (idx / count) * Math.PI * 2;
      const rad = 3.2;
      player.position = { x: Math.cos(angle) * rad, y: 0, z: Math.sin(angle) * rad };
      player.rotation.y = angle + Math.PI;
    });

    const hitterNames = Array.from(this.currentHitterIds).map(id => this.players.get(id)?.name || 'Hitter');

    io.to(this.code).emit('round_countdown_started', {
      hitterId: this.currentHitterId,
      hitterIds: Array.from(this.currentHitterIds),
      hitterNames: hitterNames,
      hitterName: hitterNames.join(' & ') || 'The Hunter(s)',
      hunterCount: this.currentHitterIds.size,
      duration: COUNTDOWN_DURATION
    });

    return true;
  }

  startRound() {
    this.state = 'HUNTING';
    this.timer = ROUND_DURATION;
    io.to(this.code).emit('round_started', {
      hitterId: this.currentHitterId,
      hitterIds: Array.from(this.currentHitterIds),
      hunterCount: this.currentHitterIds.size,
      duration: ROUND_DURATION
    });
  }

  endRound(winnerRole, reason = '') {
    this.state = 'ROUND_END';
    this.timer = ROUND_END_DURATION;
    this.roundWinner = winnerRole;

    const hitterNames = Array.from(this.currentHitterIds).map(id => this.players.get(id)?.name || 'Hitter');

    io.to(this.code).emit('round_ended', {
      winner: winnerRole,
      hitterId: this.currentHitterId,
      hitterIds: Array.from(this.currentHitterIds),
      hitterName: hitterNames.join(' & ') || 'The Hunters',
      reason: reason
    });
  }

  handleBatSwing(hitterId) {
    const hitter = this.players.get(hitterId);
    if (!hitter || hitter.role !== 'HITTER' || !hitter.isAlive) return;

    const now = Date.now();
    if (now - hitter.lastSwingTime < 700) return;
    hitter.lastSwingTime = now;

    io.to(this.code).emit('player_swung_bat', { hitterId });

    const swingDirX = -Math.sin(hitter.rotation.y);
    const swingDirZ = -Math.cos(hitter.rotation.y);

    for (const [id, runner] of this.players.entries()) {
      if (id === hitterId || runner.role === 'HITTER' || !runner.isAlive) continue;

      const dx = runner.position.x - hitter.position.x;
      const dz = runner.position.z - hitter.position.z;
      const dist = Math.hypot(dx, dz);

      if (dist <= BAT_RANGE) {
        const dot = (dx * swingDirX + dz * swingDirZ) / (dist || 1);
        if (dot > 0.05) {
          // Check if runner is protected under the middle table
          const isRunnerUnderTable = (
            Math.abs(runner.position.x) <= 0.85 &&
            Math.abs(runner.position.z) <= 1.35 &&
            (runner.isCrawling || runner.isFlatFlop || (runner.position.y || 0) < 0.7)
          );

          if (isRunnerUnderTable) {
            // Hitter cannot hit from top; hitter has to bend down (crouch/crawl, flat-flop, or duck with spinePitch)
            const isHitterBending = (
              hitter.isCrawling ||
              hitter.isFlatFlop ||
              (typeof hitter.spinePitch === 'number' && hitter.spinePitch <= -0.25)
            );

            if (!isHitterBending) {
              // Tabletop blocks the hit!
              continue;
            }
          }

          runner.hp = Math.max(0, runner.hp - BAT_DAMAGE);
          runner.isFlailing = true;
          runner.flailTimer = FLAIL_DURATION;

          this.lastSoundLocation = { x: runner.position.x, z: runner.position.z };
          this.soundInvestigateTimer = 3.5;

          const knockback = 7.0;
          runner.velocity.x += (dx / (dist || 1)) * knockback;
          runner.velocity.z += (dz / (dist || 1)) * knockback;

          if (runner.hp <= 0) {
            runner.isAlive = false;
            runner.isFlatFlop = true;
          }

          io.to(this.code).emit('player_hit', {
            victimId: runner.id,
            victimName: runner.name,
            hitterId: hitter.id,
            remainingHp: runner.hp,
            damage: BAT_DAMAGE,
            isKnockedOut: !runner.isAlive
          });

          const aliveRunners = Array.from(this.players.values()).filter(p => p.role === 'RUNNER' && p.isAlive);
          if (aliveRunners.length === 0) {
            this.endRound('HITTER', 'All runners knocked out! Clean sweep!');
          }
        }
      }
    }
  }

  updateBots(delta) {
    if (this.state !== 'HUNTING' && this.state !== 'LOBBY') return;

    const bounds = 8.8;

    if (this.soundInvestigateTimer > 0) {
      this.soundInvestigateTimer -= delta;
      if (this.soundInvestigateTimer <= 0) this.lastSoundLocation = null;
    }

    for (const [botId, bot] of this.bots.entries()) {
      if (!bot.isAlive) continue;

      if (bot.isFlailing) {
        bot.flailTimer -= delta;
        if (bot.flailTimer <= 0) bot.isFlailing = false;
      }

      bot.botTurnTimer = (bot.botTurnTimer || 0) - delta;
      bot.botSwingCooldown = (bot.botSwingCooldown || 0) - delta;

      // 1. Blind AI Hitter: Investigates sounds or hunts nearby runners
      if (bot.role === 'HITTER') {
        let targetAngle = bot.rotation.y;

        if (this.lastSoundLocation && this.soundInvestigateTimer > 0) {
          const dx = this.lastSoundLocation.x - bot.position.x;
          const dz = this.lastSoundLocation.z - bot.position.z;
          targetAngle = Math.atan2(-dx, -dz) + Math.sin(Date.now() * 0.003) * 0.3;
        } else {
          let nearestRunner = null;
          let minRunnerDist = Infinity;
          for (const p of this.players.values()) {
            if (p.role === 'RUNNER' && p.isAlive) {
              const d = Math.hypot(p.position.x - bot.position.x, p.position.z - bot.position.z);
              if (d < minRunnerDist) {
                minRunnerDist = d;
                nearestRunner = p;
              }
            }
          }

          if (nearestRunner && minRunnerDist < 4.5) {
            const dx = nearestRunner.position.x - bot.position.x;
            const dz = nearestRunner.position.z - bot.position.z;
            targetAngle = Math.atan2(-dx, -dz);
          } else {
            if (bot.botTurnTimer <= 0) {
              bot.botTurnTimer = 1.8 + Math.random() * 2.5;
              bot.botWanderAngle = bot.rotation.y + (Math.random() - 0.5) * 2.5;
            }
            targetAngle = bot.botWanderAngle || bot.rotation.y;
          }
        }

        bot.rotation.y = targetAngle;
        const speed = BASE_SPEED * 0.85;
        bot.position.x += -Math.sin(bot.rotation.y) * speed * delta;
        bot.position.z += -Math.cos(bot.rotation.y) * speed * delta;

        // Bend down if near the middle table to hit underneath
        if (Math.abs(bot.position.x) < 2.0 && Math.abs(bot.position.z) < 2.6) {
          bot.isCrawling = true;
          bot.spinePitch = -0.6;
        } else {
          bot.isCrawling = false;
          bot.spinePitch = 0;
        }

        if (this.state === 'HUNTING' && bot.botSwingCooldown <= 0) {
          bot.botSwingCooldown = 1.2 + Math.random() * 1.5;
          this.handleBatSwing(botId);
        }
      }
      // 2. AI Runner: Flees from active hunters
      else if (bot.role === 'RUNNER') {
        let nearestHitter = null;
        let minDist = Infinity;
        for (const hid of this.currentHitterIds) {
          const h = this.players.get(hid);
          if (h && h.isAlive) {
            const d = Math.hypot(bot.position.x - h.position.x, bot.position.z - h.position.z);
            if (d < minDist) {
              minDist = d;
              nearestHitter = h;
            }
          }
        }

        let speed = BASE_SPEED * 0.5;

        if (nearestHitter && this.state === 'HUNTING' && minDist < 6.5) {
          // Flee directly away from nearest hunter
          const dx = bot.position.x - nearestHitter.position.x;
          const dz = bot.position.z - nearestHitter.position.z;
          bot.rotation.y = Math.atan2(-dx, -dz);
          speed = BASE_SPEED * 0.95;

          if (Math.abs(bot.position.x) < 1.4 && Math.abs(bot.position.z) < 1.8) {
            bot.isCrawling = true;
          }
        } else {
          if (bot.botTurnTimer <= 0) {
            bot.botTurnTimer = 2.0 + Math.random() * 3.0;
            bot.botWanderAngle = bot.rotation.y + (Math.random() - 0.5) * 2.0;
          }
          bot.rotation.y = bot.botWanderAngle || bot.rotation.y;
          speed = BASE_SPEED * 0.45;
        }

        bot.position.x += -Math.sin(bot.rotation.y) * speed * delta;
        bot.position.z += -Math.cos(bot.rotation.y) * speed * delta;

        if (Math.random() < 0.005) bot.isCrawling = !bot.isCrawling;
      }

      if (Math.abs(bot.position.x) > bounds) {
        bot.position.x = Math.sign(bot.position.x) * bounds;
        bot.botWanderAngle = Math.PI - bot.rotation.y + (Math.random() - 0.5);
        bot.rotation.y = bot.botWanderAngle;
        bot.botTurnTimer = 1.0;
      }
      if (Math.abs(bot.position.z) > bounds) {
        bot.position.z = Math.sign(bot.position.z) * bounds;
        bot.botWanderAngle = -bot.rotation.y + (Math.random() - 0.5);
        bot.rotation.y = bot.botWanderAngle;
        bot.botTurnTimer = 1.0;
      }
    }
  }

  update(delta) {
    if (this.state === 'COUNTDOWN') {
      this.timer -= delta;
      if (this.timer <= 0) this.startRound();
    } else if (this.state === 'HUNTING') {
      this.timer -= delta;
      if (this.timer <= 0) this.endRound('RUNNERS', 'Time expired! Runners survived the Hitter!');
    } else if (this.state === 'ROUND_END') {
      this.timer -= delta;
      if (this.timer <= 0) this.startCountdown();
    }

    this.updateBots(delta);

    // 10-Second Anti-Camp Stationary Detection for Runners -> 1.0s Thermal Reveal
    if (this.state === 'HUNTING') {
      for (const player of this.players.values()) {
        if (player.role === 'RUNNER' && player.isAlive) {
          if (!player.lastStationaryPos) {
            player.lastStationaryPos = { ...player.position };
            player.stationaryTimer = 0;
          }

          const distMoved = Math.hypot(
            player.position.x - player.lastStationaryPos.x,
            player.position.z - player.lastStationaryPos.z
          );

          if (distMoved < 0.35) {
            player.stationaryTimer = (player.stationaryTimer || 0) + delta;
            if (player.stationaryTimer >= 10.0) {
              player.stationaryTimer = 0;
              player.lastStationaryPos = { ...player.position };
              io.to(this.code).emit('player_camp_revealed', {
                playerId: player.id,
                playerName: player.name,
                duration: 1.0,
                position: player.position
              });
            }
          } else {
            player.stationaryTimer = 0;
            player.lastStationaryPos = { ...player.position };
          }
        }
      }
    }

    for (const player of this.players.values()) {
      if (player.isFlailing) {
        player.flailTimer -= delta;
        if (player.flailTimer <= 0) player.isFlailing = false;
      }
      player.velocity.x *= 0.88;
      player.velocity.z *= 0.88;
      player.position.x += player.velocity.x * delta;
      player.position.z += player.velocity.z * delta;
    }
  }

  startTickLoop() {
    this.tickInterval = setInterval(() => {
      const now = Date.now();
      const delta = (now - this.lastTick) / 1000;
      this.lastTick = now;

      this.update(delta);

      const playersArray = Array.from(this.players.values()).map(p => ({
        id: p.id,
        name: p.name,
        color: p.color,
        role: p.role,
        hp: p.hp,
        isAlive: p.isAlive,
        isFlailing: p.isFlailing,
        isFlatFlop: p.isFlatFlop,
        isCrawling: p.isCrawling,
        isSitting: p.isSitting,
        isGrabbing: p.isGrabbing,
        spinePitch: p.spinePitch,
        position: p.position,
        rotation: p.rotation,
        isBot: p.isBot
      }));

      io.to(this.code).emit('game_tick', {
        state: this.state,
        timer: Math.ceil(this.timer),
        hitterId: this.currentHitterId,
        hitterIds: Array.from(this.currentHitterIds),
        hunterCount: this.hunterCount,
        hostId: this.hostId,
        players: playersArray,
        roundWinner: this.roundWinner
      });
    }, 1000 / 30);
  }

  stop() {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
  }
}

io.on('connection', (socket) => {
  let currentRoomCode = null;

  socket.on('join_room', ({ roomCode, nickname, color, botCount, autoStart, preferredRole, forceHitter, hunterCount }) => {
    const code = (roomCode || 'LOBBY-1').toUpperCase();
    socket.join(code);
    currentRoomCode = code;

    let room = rooms.get(code);
    if (!room) {
      room = new GameRoom(code);
      rooms.set(code, room);
    }

    if (typeof hunterCount === 'number') {
      room.hunterCount = Math.min(3, Math.max(1, parseInt(hunterCount) || 1));
    }

    const rolePref = forceHitter ? 'HITTER' : (preferredRole || 'RANDOM');
    const player = room.addPlayer(socket.id, nickname, color, false, rolePref);
    if (typeof botCount === 'number') {
      room.setBotCount(botCount);
    }

    const isHost = (socket.id === room.hostId);

    socket.emit('room_joined', {
      playerId: socket.id,
      roomCode: code,
      player: player,
      state: room.state,
      hitterId: room.currentHitterId,
      hitterIds: Array.from(room.currentHitterIds),
      hunterCount: room.hunterCount,
      hostId: room.hostId,
      isHost: isHost
    });

    // If autoStart is requested AND this player is the host, start countdown
    if (autoStart && isHost && room.state === 'LOBBY') {
      setTimeout(() => {
        room.startCountdown(forceHitter ? socket.id : null);
      }, 400);
    }
  });

  socket.on('start_game', ({ forceHitter, preferredRole } = {}) => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (room) {
      // ONLY the room host can start the match!
      if (room.hostId && socket.id !== room.hostId) {
        socket.emit('room_error', { message: 'Only the room host can start the match.' });
        return;
      }
      const shouldForce = forceHitter || (preferredRole === 'HITTER');
      room.startCountdown(shouldForce ? socket.id : null);
    }
  });

  socket.on('set_hunter_count', ({ count }) => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (room) {
      // ONLY the room host can configure hunter count
      if (room.hostId && socket.id !== room.hostId) {
        socket.emit('room_error', { message: 'Only the room host can change hunter count.' });
        return;
      }
      room.hunterCount = Math.min(3, Math.max(1, parseInt(count) || 1));
      io.to(currentRoomCode).emit('room_hunter_count_updated', {
        hunterCount: room.hunterCount
      });
    }
  });

  socket.on('set_bots', ({ count }) => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (room) {
      room.setBotCount(count);
    }
  });

  socket.on('player_input', (inputData) => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room) return;

    const player = room.players.get(socket.id);
    if (!player || !player.isAlive) return;

    if (inputData.position) {
      player.position.x = inputData.position.x;
      player.position.y = inputData.position.y;
      player.position.z = inputData.position.z;
    }
    if (inputData.rotation) {
      player.rotation.y = inputData.rotation.y;
    }
    if (typeof inputData.spinePitch === 'number') player.spinePitch = inputData.spinePitch;
    if (typeof inputData.isFlatFlop === 'boolean') player.isFlatFlop = inputData.isFlatFlop;
    if (typeof inputData.isCrawling === 'boolean') player.isCrawling = inputData.isCrawling;
    if (typeof inputData.isSitting === 'boolean') player.isSitting = inputData.isSitting;
    if (typeof inputData.isGrabbing === 'boolean') player.isGrabbing = inputData.isGrabbing;
  });

  socket.on('bat_swing', () => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (room) {
      room.handleBatSwing(socket.id);
    }
  });

  socket.on('thermal_echo_trigger', ({ objectId, hitPos }) => {
    if (!currentRoomCode) return;
    io.to(currentRoomCode).emit('thermal_echo_pulsed', {
      objectId,
      hitPos,
      senderId: socket.id
    });
  });

  socket.on('disconnect', () => {
    if (currentRoomCode) {
      const room = rooms.get(currentRoomCode);
      if (room) {
        room.removePlayer(socket.id);
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🎮 HITTLERS Game Server running on port ${PORT}`);
  console.log(`🌐 Local URL: http://localhost:${PORT}`);
  console.log(`====================================================`);
});
