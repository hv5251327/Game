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
const io = new Server(server, { cors: { origin: '*', methods: ['GET', 'POST'] } });
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(ROOT_DIR, 'client')));
app.use('/node_modules', express.static(path.join(ROOT_DIR, 'node_modules')));

// --- Constants ---
const DEFAULT_OVERS = 5;
const TEAM_SIZE = 11;
const BOT_NAMES_A = ['Antony', 'Pipsqueak', 'Thorax', 'Mandible', 'Bullet', 'Firebug', 'Carpenter', 'Stinger', 'Weaver', 'Sugar', 'Army'];
const BOT_NAMES_B = ['Hoppy', 'Locust', 'Leaper', 'Cricket', 'Chirpy', 'Springy', 'Meadow', 'Katydid', 'Greenie', 'Jumper', 'Glider'];
const BOT_COLORS_A = ['#3d1a00', '#5c2d0a', '#7a3d12', '#4a2000', '#6b2f0d', '#2b1202', '#482006'];
const BOT_COLORS_B = ['#1a4a1a', '#2d6b2d', '#1f5c1f', '#2a7a2a', '#155a15', '#338033', '#1e661e'];

const rooms = new Map();

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

class CricketRoom {
  constructor(code, mode = 'team_match', overs = DEFAULT_OVERS) {
    this.code = code;
    this.mode = mode; // 'team_match' | 'single_batting'
    this.overs = parseInt(overs, 10) || DEFAULT_OVERS;
    this.state = 'LOBBY'; // 'LOBBY' | 'TOSS' | 'CAPTAIN_SETUP' | 'PLAYING' | 'INNINGS_BREAK' | 'GAME_OVER'

    this.players = new Map();
    this.teamA = []; // Ants
    this.teamB = []; // Grasshoppers
    this.captainA = null;
    this.captainB = null;
    this.hostId = null;

    // Current innings
    this.currentInnings = 1;
    this.battingTeam = null; // 'a' | 'b'
    this.bowlingTeam = null; // 'a' | 'b'
    this.battingOrder = [];
    this.currentBatsmanIdx = 0;
    this.currentNonStrikerIdx = 1;
    this.currentBowler = null;
    this.currentOver = 0;
    this.currentBall = 0;
    this.ballInFlight = false;
    this.runupInProgress = false;
    this._runupTimeout = null;
    this.pendingBall = null;
    this.target = null;
    this.pendingBowlerRequest = false;
    this.pendingNextBatsman = false;
    this.pendingGroundRuns = null;
    this._groundRunsTimeout = null;

    // Single batting mode
    this.sbQueue = [];
    this.sbCurrentBatsmanIdx = 0;
    this.sbCurrentBowlerIdx = 1;

    // Scorecard
    this.scorecard = {
      innings1: this._newInningsCard(),
      innings2: this._newInningsCard(),
      singleBatting: {}
    };

    // Toss
    this.tossWinner = null;
    this.tossCoinResult = null;

    this.tickInterval = setInterval(() => this._tick(), 200);
  }

  _newInningsCard() {
    return {
      team: null, runs: 0, wickets: 0, overs: 0, balls: 0, extras: 0,
      batsmen: {}, bowlers: {}, fallOfWickets: [], currentOverBalls: []
    };
  }

  _currentCard() {
    return this.currentInnings === 1 ? this.scorecard.innings1 : this.scorecard.innings2;
  }

  stop() {
    clearInterval(this.tickInterval);
    rooms.delete(this.code);
  }

  _tick() {
    if (this.state !== 'PLAYING') return;

    // If ball is not in flight and bowler is bot, auto-bowl
    if (!this.ballInFlight && !this.pendingBowlerRequest && !this.pendingNextBatsman) {
      const bowler = this.players.get(this.currentBowler);
      if (bowler && bowler.isBot && !this._botBowlingTimer) {
        this._botBowlingTimer = setTimeout(() => {
          this._botBowlingTimer = null;
          this._botBowl(this.currentBowler);
        }, 1000 + Math.random() * 800);
      }
    }
  }

  addPlayer(socketId, name, color, isBot = false, team = null) {
    if (this.players.size >= TEAM_SIZE * 2) return null;
    if (!isBot && !this.hostId) this.hostId = socketId;

    const player = {
      id: socketId,
      name: name || `Player-${this.players.size + 1}`,
      color: color || (team === 'a' ? '#5c2d0a' : '#2d6b2d'),
      isBot,
      team,
      stats: {
        runs: 0, balls: 0, fours: 0, sixes: 0, dismissed: false, dismissal: '',
        wickets: 0, runsConceded: 0, overs: 0, ballsBowled: 0
      }
    };
    this.players.set(socketId, player);

    if (team === 'a') {
      this.teamA.push(socketId);
      if (!this.captainA) this.captainA = socketId;
    } else if (team === 'b') {
      this.teamB.push(socketId);
      if (!this.captainB) this.captainB = socketId;
    }

    return player;
  }

  removePlayer(socketId) {
    const p = this.players.get(socketId);
    if (!p) return;
    this.players.delete(socketId);
    this.teamA = this.teamA.filter(id => id !== socketId);
    this.teamB = this.teamB.filter(id => id !== socketId);

    if (this.hostId === socketId) {
      const next = Array.from(this.players.values()).find(x => !x.isBot);
      this.hostId = next ? next.id : null;
    }
    if (this.captainA === socketId) {
      const nextA = this.teamA.find(id => !this.players.get(id)?.isBot) || this.teamA[0] || null;
      this.captainA = nextA;
    }
    if (this.captainB === socketId) {
      const nextB = this.teamB.find(id => !this.players.get(id)?.isBot) || this.teamB[0] || null;
      this.captainB = nextB;
    }

    if (Array.from(this.players.values()).filter(x => !x.isBot).length === 0) {
      this.stop();
    }
  }

  assignTeam(socketId, team) {
    const p = this.players.get(socketId);
    if (!p || this.state !== 'LOBBY') return false;

    this.teamA = this.teamA.filter(id => id !== socketId);
    this.teamB = this.teamB.filter(id => id !== socketId);
    p.team = team;

    if (team === 'a') {
      if (this.teamA.length >= TEAM_SIZE) return false;
      this.teamA.push(socketId);
      if (!this.captainA || this.players.get(this.captainA)?.isBot) this.captainA = socketId;
    } else if (team === 'b') {
      if (this.teamB.length >= TEAM_SIZE) return false;
      this.teamB.push(socketId);
      if (!this.captainB || this.players.get(this.captainB)?.isBot) this.captainB = socketId;
    }
    return true;
  }

  fillBotsForTeam(team) {
    const arr = team === 'a' ? this.teamA : this.teamB;
    const names = team === 'a' ? BOT_NAMES_A : BOT_NAMES_B;
    const colors = team === 'a' ? BOT_COLORS_A : BOT_COLORS_B;
    const needed = TEAM_SIZE - arr.length;

    for (let i = 0; i < needed; i++) {
      const botId = `bot_${team}_${Date.now()}_${i}`;
      const botName = names[i % names.length] + ' (Bot)';
      const bot = this.addPlayer(botId, botName, colors[i % colors.length], true, team);
      if (bot) {
        if (team === 'a' && !this.captainA) this.captainA = botId;
        if (team === 'b' && !this.captainB) this.captainB = botId;
      }
    }
  }

  startToss() {
    if (this.mode === 'single_batting') {
      this.startSingleBatting();
      return true;
    }

    // Fill bots so each team has full 11 players
    this.fillBotsForTeam('a');
    this.fillBotsForTeam('b');

    // Fully renew scorecards, targets and stats for every new match
    this.scorecard = {
      innings1: this._newInningsCard(),
      innings2: this._newInningsCard(),
      singleBatting: {}
    };
    this.target = null;
    this.currentInnings = 1;
    this.currentOver = 0;
    this.currentBall = 0;
    this.ballInFlight = false;
    this.runupInProgress = false;
    for (const p of this.players.values()) {
      p.stats = {
        runs: 0, balls: 0, fours: 0, sixes: 0, dismissed: false, dismissal: '',
        wickets: 0, runsConceded: 0, overs: 0, ballsBowled: 0
      };
    }

    this.state = 'TOSS';
    this.tossCoinResult = Math.random() < 0.5 ? 'heads' : 'tails';

    io.to(this.code).emit('toss_started', {
      captainA: this._playerInfo(this.captainA),
      captainB: this._playerInfo(this.captainB),
      players: this._allPlayersInfo(),
      roomInfo: this.getRoomInfo()
    });

    // If Captain A is a bot, bot calls heads or tails automatically after 1s
    const capA = this.players.get(this.captainA);
    if (capA && capA.isBot) {
      setTimeout(() => {
        if (this.state === 'TOSS') {
          this.handleTossCall(this.captainA, Math.random() < 0.5 ? 'heads' : 'tails');
        }
      }, 1000);
    }
    return true;
  }

  handleTossCall(socketId, call) {
    if (this.state !== 'TOSS') return;
    if (socketId !== this.captainA && socketId !== this.captainB) return;

    const won = (call === this.tossCoinResult);
    const winner = won ? socketId : (socketId === this.captainA ? this.captainB : this.captainA);
    this.tossWinner = winner;

    io.to(this.code).emit('toss_result', {
      call,
      result: this.tossCoinResult,
      winner: this._playerInfo(winner),
      coinResult: this.tossCoinResult
    });

    const winnerPlayer = this.players.get(winner);
    if (winnerPlayer && winnerPlayer.isBot) {
      const botChoice = Math.random() < 0.6 ? 'bat' : 'bowl';
      setTimeout(() => this.handleTossDecision(winner, botChoice), 1400);
    } else {
      io.to(winner).emit('toss_decision_needed', {});
    }
  }

  handleTossDecision(socketId, choice) {
    if (this.state !== 'TOSS' || socketId !== this.tossWinner) return;

    const winnerTeam = this.players.get(socketId)?.team || 'a';
    const otherTeam = winnerTeam === 'a' ? 'b' : 'a';

    if (choice === 'bat') {
      this.battingTeam = winnerTeam;
      this.bowlingTeam = otherTeam;
    } else {
      this.battingTeam = otherTeam;
      this.bowlingTeam = winnerTeam;
    }

    io.to(this.code).emit('toss_decision', {
      winner: this._playerInfo(socketId),
      choice,
      battingTeam: this.battingTeam,
      bowlingTeam: this.bowlingTeam
    });

    setTimeout(() => this._setupInnings(1), 1500);
  }

  _setupInnings(inningsNum) {
    this.currentInnings = inningsNum;
    const card = this._currentCard();
    card.team = this.battingTeam;
    this.state = 'CAPTAIN_SETUP';

    const battingIds = this.battingTeam === 'a' ? [...this.teamA] : [...this.teamB];
    this.battingOrder = battingIds;
    this.currentBatsmanIdx = 0;
    this.currentNonStrikerIdx = 1;
    this.currentOver = 0;
    this.currentBall = 0;
    this.ballInFlight = false;
    this.pendingBowlerRequest = false;
    this.pendingNextBatsman = false;

    // Initialize batsmen scorecard
    for (const id of this.battingOrder) {
      const p = this.players.get(id);
      if (p) {
        card.batsmen[id] = {
          id: p.id,
          name: p.name,
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          dismissed: false,
          dismissal: '',
          isOnPitch: false
        };
      }
    }
    if (this.battingOrder[0] && card.batsmen[this.battingOrder[0]]) card.batsmen[this.battingOrder[0]].isOnPitch = true;
    if (this.battingOrder[1] && card.batsmen[this.battingOrder[1]]) card.batsmen[this.battingOrder[1]].isOnPitch = true;

    // Initialize bowlers scorecard
    const bowlingIds = this.bowlingTeam === 'a' ? [...this.teamA] : [...this.teamB];
    for (const id of bowlingIds) {
      const p = this.players.get(id);
      if (p) {
        card.bowlers[id] = {
          id: p.id,
          name: p.name,
          wickets: 0,
          runs: 0,
          overs: 0,
          balls: 0,
          maidens: 0
        };
      }
    }

    const battingCaptain = this.battingTeam === 'a' ? this.captainA : this.captainB;
    const bowlingCaptain = this.bowlingTeam === 'a' ? this.captainA : this.captainB;

    io.to(this.code).emit('innings_setup', {
      innings: inningsNum,
      battingTeam: this.battingTeam,
      bowlingTeam: this.bowlingTeam,
      battingCaptain: this._playerInfo(battingCaptain),
      bowlingCaptain: this._playerInfo(bowlingCaptain),
      battingOrder: this.battingOrder.map(id => this._playerInfo(id)),
      target: this.target,
      scorecard: this._scorecardSnapshot()
    });

    const humanBowlers = bowlingIds.filter(id => !this.players.get(id)?.isBot);
    const bowlingCaptainPlayer = this.players.get(bowlingCaptain);

    if (bowlingCaptainPlayer && !bowlingCaptainPlayer.isBot) {
      io.to(bowlingCaptain).emit('bowling_order_needed', {
        over: 1,
        bowlingTeam: this.bowlingTeam,
        bowlers: bowlingIds.map(id => this._playerInfo(id))
      });
    } else if (humanBowlers.length > 0) {
      // Prioritize human player to bowl Over 1 of innings!
      io.to(humanBowlers[0]).emit('bowling_order_needed', {
        over: 1,
        bowlingTeam: this.bowlingTeam,
        bowlers: bowlingIds.map(id => this._playerInfo(id))
      });
      setTimeout(() => {
        if (this.state === 'CAPTAIN_SETUP' && !this.currentBowler) {
          this.startOver(null, humanBowlers[0]);
        }
      }, 5000);
    } else {
      setTimeout(() => this._autoPickBowler(), 1200);
    }
  }

  _autoPickBowler() {
    const bowlingIds = this.bowlingTeam === 'a' ? this.teamA : this.teamB;
    const maxOvers = Math.ceil(this.overs / 2);
    const card = this._currentCard();

    // Eligible bowlers who are not the current bowler and haven't reached max overs
    const eligible = bowlingIds.filter(id => id !== this.currentBowler && (card.bowlers[id]?.overs || 0) < maxOvers);
    const humanEligible = eligible.filter(id => !this.players.get(id)?.isBot);

    let bowlerId;
    if (humanEligible.length > 0) {
      // Always give human player on the bowling team their overs!
      bowlerId = humanEligible[0];
    } else if (eligible.length > 0) {
      bowlerId = eligible[this.currentOver % eligible.length];
    } else {
      const anyHuman = bowlingIds.filter(id => !this.players.get(id)?.isBot);
      bowlerId = anyHuman[0] || bowlingIds.find(id => id !== this.currentBowler) || bowlingIds[0];
    }

    this.startOver(null, bowlerId);
  }

  setBattingOrder(socketId, order) {
    const captain = this.battingTeam === 'a' ? this.captainA : this.captainB;
    if (socketId !== captain) return;

    const battingIds = this.battingTeam === 'a' ? this.teamA : this.teamB;
    const valid = Array.isArray(order) && order.length === battingIds.length && order.every(id => battingIds.includes(id));
    if (!valid) return;

    this.battingOrder = order;
    io.to(this.code).emit('batting_order_set', {
      order: order.map(id => this._playerInfo(id))
    });
  }

  startOver(socketId, bowlerId) {
    const bowlingCaptain = this.bowlingTeam === 'a' ? this.captainA : this.captainB;
    if (socketId && socketId !== bowlingCaptain) return;

    this.currentBowler = bowlerId;
    this.state = 'PLAYING';
    this.pendingBowlerRequest = false;
    this.currentBall = 0;
    this.ballInFlight = false;
    this.runupInProgress = false;
    clearTimeout(this._runupTimeout);
    clearTimeout(this._batTimeout);
    clearTimeout(this._botRequestTimer);
    this._botRequestTimer = null;

    const card = this._currentCard();
    card.currentOverBalls = [];

    const batsman = this.battingOrder[this.currentBatsmanIdx];
    const nonStriker = this.battingOrder[this.currentNonStrikerIdx];

    io.to(this.code).emit('over_started', {
      over: this.currentOver + 1,
      totalOvers: this.overs,
      bowler: this._playerInfo(bowlerId),
      batsman: this._playerInfo(batsman),
      nonStriker: this._playerInfo(nonStriker),
      scorecard: this._scorecardSnapshot()
    });

    // Notify each human player of their exact role for this over
    this._emitRoleEvents();

    setTimeout(() => this._requestNextBall(), 800);
  }

  handleBowl(socketId, data) {
    // Critical guard: reject stale or duplicate bowl events
    if (this.state !== 'PLAYING' || this.ballInFlight || this.runupInProgress || socketId !== this.currentBowler) return;

    clearTimeout(this._bowlerTimeout);
    this.runupInProgress = true;
    this.ballInFlight = false;
    this.pendingBall = { ...data, bowlerId: socketId };

    const batsmanId = this.mode === 'single_batting'
      ? this.sbQueue[this.sbCurrentBatsmanIdx]
      : this.battingOrder[this.currentBatsmanIdx];

    // 1. Emit bowler_runup: bowler starts running in from back over 2.5 seconds (gives batsman preparation time)
    io.to(this.code).emit('bowler_runup', {
      bowler: this._playerInfo(socketId),
      batsman: this._playerInfo(batsmanId),
      landingZone: data.landingZone,
      deliveryType: data.deliveryType,
      swingDirection: data.swingDirection || 'left',
      power: data.power,
      isNoBall: data.isNoBall || false,
      runupDuration: 2500,
      over: this.currentOver + 1,
      ball: this.currentBall + 1
    });

    // 2. Deliver the ball after bowler completes 2.5-second run-up stride
    this._runupTimeout = setTimeout(() => {
      this.runupInProgress = false;
      this.ballInFlight = true;

      io.to(this.code).emit('delivery', {
        bowler: this._playerInfo(socketId),
        batsman: this._playerInfo(batsmanId),
        landingZone: data.landingZone,
        deliveryType: data.deliveryType,
        swingDirection: data.swingDirection || 'left',
        power: data.power,
        isNoBall: data.isNoBall || false,
        paceKmh: data.paceKmh,
        over: this.currentOver + 1,
        ball: this.currentBall + 1
      });

      const battingIds = this.battingTeam === 'a' ? this.teamA : this.teamB;
      const humanOnBattingTeam = battingIds.some(id => !this.players.get(id)?.isBot);
      const batsmanPlayer = this.players.get(batsmanId);

      clearTimeout(this._batTimeout);
      if (batsmanPlayer && batsmanPlayer.isBot && !humanOnBattingTeam) {
        setTimeout(() => this._botBat(batsmanId, data), 650 + Math.random() * 400);
      } else {
        // Realistic 1.4-second arrival window: batsman can only hit while ball is approaching
        this._batTimeout = setTimeout(() => {
          if (this.ballInFlight) {
            this.ballInFlight = false;
            // Ball passed batsman into keeper's gloves (leave / missed / dot ball or bowled if right on stumps)
            this._resolveBall({
              character_id: batsmanId,
              action: 'swing_bat',
              shotType: 'leave',
              timing: 0.1,
              power: 0,
              direction: 'forward'
            }, data);
          }
        }, 1400);
      }
    }, 2500);
  }

  handleBat(socketId, data) {
    const batsmanId = this.mode === 'single_batting'
      ? this.sbQueue[this.sbCurrentBatsmanIdx]
      : this.battingOrder[this.currentBatsmanIdx];

    const battingIds = this.battingTeam === 'a' ? this.teamA : this.teamB;
    const isBatsman = (socketId === batsmanId);
    const isHumanOnBattingTeam = battingIds.includes(socketId) && !this.players.get(socketId)?.isBot;

    if (!isBatsman && !isHumanOnBattingTeam) return;

    // Strictly reject swings while bowler is running up or after the ball has passed / is no longer in flight
    if (this.runupInProgress || !this.ballInFlight) return;

    this.ballInFlight = false;
    clearTimeout(this._batTimeout);
    this._resolveBall(data, this.pendingBall);
  }

  _botBowl(bowlerId) {
    if (this.ballInFlight || this.runupInProgress || this.state !== 'PLAYING' || this.currentBowler !== bowlerId) return;

    // Realistic delivery repertoire:
    const deliveryOptions = [
      { type: 'pace', weight: 26 },
      { type: 'outswing', weight: 16 },
      { type: 'inswing', weight: 16 },
      { type: 'yorker', weight: 14 },
      { type: 'bouncer', weight: 14 },
      { type: 'spin', weight: 7 },
      { type: 'leg_spin', weight: 7 }
    ];

    const totalWeight = deliveryOptions.reduce((s, o) => s + o.weight, 0);
    let rand = Math.random() * totalWeight;
    let dt = 'pace';
    for (const opt of deliveryOptions) {
      if (rand < opt.weight) { dt = opt.type; break; }
      rand -= opt.weight;
    }

    // Authentic length and line:
    // z: 0.0=Yorker (3.0m), 0.45=Good Length (1.56m), 0.9=Bouncer (0.12m)
    let lzX = 0;
    let lzZ = 0.45;

    if (dt === 'yorker') {
      lzZ = 0.06 + Math.random() * 0.12; // Blockhole
      lzX = (Math.random() - 0.5) * 0.3; // Stumps line
    } else if (dt === 'bouncer') {
      lzZ = 0.82 + Math.random() * 0.14; // Short pitch
      lzX = (Math.random() - 0.4) * 0.45; // Rib/helmet line
    } else if (dt === 'outswing') {
      lzZ = 0.42 + Math.random() * 0.12; // Good length
      lzX = -0.32 + (Math.random() - 0.5) * 0.2; // 4th stump channel moving away
    } else if (dt === 'inswing') {
      lzZ = 0.38 + Math.random() * 0.12; // Full good length
      lzX = -0.12 + (Math.random() - 0.5) * 0.2; // Angling in to pads
    } else if (dt === 'spin' || dt === 'leg_spin') {
      lzZ = 0.46 + Math.random() * 0.14; // Loop & dip
      lzX = dt === 'spin' ? 0.32 : -0.32; // Flighted outside off/leg
    } else {
      // Standard Pace
      lzZ = 0.44 + Math.random() * 0.12;
      lzX = -0.22 + (Math.random() - 0.5) * 0.25;
    }

    this.handleBowl(bowlerId, {
      landingZone: { x: parseFloat(lzX.toFixed(2)), z: parseFloat(lzZ.toFixed(2)) },
      deliveryType: dt,
      accuracy: 0.65 + Math.random() * 0.3
    });
  }

  _botBat(batsmanId, bowlData) {
    if (!this.ballInFlight) return;
    const shotTypes = ['drive', 'loft', 'sweep', 'cut', 'defend'];
    const shot = shotTypes[Math.floor(Math.random() * shotTypes.length)];
    const timing = 0.45 + Math.random() * 0.45;
    const allowedDirections = ['forward', 'forward_left', 'forward_right', 'left', 'right', 'backward_left', 'backward_right'];
    const direction = allowedDirections[Math.floor(Math.random() * allowedDirections.length)];
    const characters = ['ant_batter_01', 'beetle_power_batter_01', 'grasshopper_agile_batter_01'];
    const charId = characters[Math.floor(Math.random() * characters.length)];

    this._resolveBall({
      character_id: charId,
      action: 'swing_bat',
      shotType: shot,
      timing,
      direction,
      power: 0.55 + Math.random() * 0.4
    }, bowlData);
  }

  _resolveBall(batData, bowlData) {
    this.ballInFlight = false;
    this.runupInProgress = false;
    clearTimeout(this._runupTimeout);
    clearTimeout(this._batTimeout);
    const card = this._currentCard();

    const batsmanId = this.mode === 'single_batting'
      ? this.sbQueue[this.sbCurrentBatsmanIdx]
      : this.battingOrder[this.currentBatsmanIdx];
    const bowlerId = this.currentBowler;

    const result = this._computeOutcome(batData, bowlData);

    let legalBall = true;
    let runs = 0;
    let extras = 0;
    let wicket = false;
    let dismissal = '';

    if (result.wide) {
      extras = 1;
      legalBall = false;
      card.extras++;
      card.runs++;
      if (card.bowlers[bowlerId]) card.bowlers[bowlerId].runs++;
      card.currentOverBalls.push('Wd');
    } else if (result.noBall) {
      extras = 1;
      legalBall = false;
      runs = result.runs || 0;
      card.extras++;
      card.runs += runs + 1;
      if (card.batsmen[batsmanId]) {
        card.batsmen[batsmanId].runs += runs;
        card.batsmen[batsmanId].balls++;
      }
      if (card.bowlers[bowlerId]) card.bowlers[bowlerId].runs += runs + 1;
      card.currentOverBalls.push(`Nb+${runs}`);
    } else if (result.wicket) {
      wicket = true;
      dismissal = result.dismissal;
      legalBall = true;
      this.currentBall++;
      card.balls++;
      card.wickets++;
      card.currentOverBalls.push('W');

      if (card.batsmen[batsmanId]) {
        card.batsmen[batsmanId].dismissed = true;
        card.batsmen[batsmanId].dismissal = dismissal;
        card.batsmen[batsmanId].balls++;
        card.batsmen[batsmanId].isOnPitch = false;
      }
      if (card.bowlers[bowlerId] && (dismissal === 'Bowled' || dismissal === 'LBW' || dismissal === 'Caught' || dismissal === 'Stumped')) {
        card.bowlers[bowlerId].wickets++;
        card.bowlers[bowlerId].balls++;
      }
      const fowOver = this.currentBall >= 6 ? `${this.currentOver + 1}.0` : `${this.currentOver}.${this.currentBall}`;
      card.fallOfWickets.push({
        wicket: card.wickets,
        runs: card.runs,
        batsmanId,
        batsmanName: this.players.get(batsmanId)?.name,
        over: fowOver
      });
    } else {
      legalBall = true;
      this.currentBall++;
      card.balls++;
      runs = result.runs;

      const batsmanPlayer = this.players.get(batsmanId);
      const isHumanBatsman = batsmanPlayer && !batsmanPlayer.isBot;
      const isGroundRun = (runs > 0 && runs < 4);

      if (card.batsmen[batsmanId]) {
        card.batsmen[batsmanId].balls++;
        if (runs === 4) card.batsmen[batsmanId].fours++;
        if (runs === 6) card.batsmen[batsmanId].sixes++;
      }
      if (card.bowlers[bowlerId]) {
        card.bowlers[bowlerId].balls++;
      }

      if (isGroundRun && isHumanBatsman) {
        // Human batsman must physically run [R] between wickets to score ground runs!
        // Do not add runs immediately to the scorecard.
        this.pendingGroundRuns = { runs, batsmanId, bowlerId, legalBall };
        card.currentOverBalls.push(`(${runs})`);
      } else {
        // Boundaries, dot balls, or automated bot batsman runs
        card.runs += runs;
        card.currentOverBalls.push(runs === 0 ? '•' : runs.toString());
        if (card.batsmen[batsmanId]) {
          card.batsmen[batsmanId].runs += runs;
        }
        if (card.bowlers[bowlerId]) {
          card.bowlers[bowlerId].runs += runs;
        }
        // Strike rotation on odd runs in team mode
        if (runs % 2 === 1 && this.mode !== 'single_batting') {
          this._rotateStrike();
        }
      }
    }

    // Single Batting stats record
    if (this.mode === 'single_batting') {
      if (!this.scorecard.singleBatting[batsmanId]) {
        this.scorecard.singleBatting[batsmanId] = { name: this.players.get(batsmanId)?.name, runs: 0, balls: 0, fours: 0, sixes: 0, wickets: 0 };
      }
      const bStats = this.scorecard.singleBatting[batsmanId];
      if (legalBall) bStats.balls++;
      if (runs === 4) bStats.fours++;
      if (runs === 6) bStats.sixes++;
      const batsmanPlayer = this.players.get(batsmanId);
      const isHuman = batsmanPlayer && !batsmanPlayer.isBot;
      if (!(runs > 0 && runs < 4 && isHuman)) {
        bStats.runs += runs;
      }

      if (wicket) {
        if (!this.scorecard.singleBatting[bowlerId]) {
          this.scorecard.singleBatting[bowlerId] = { name: this.players.get(bowlerId)?.name, runs: 0, balls: 0, fours: 0, sixes: 0, wickets: 0 };
        }
        this.scorecard.singleBatting[bowlerId].wickets++;
      }
    }

    const snap = this._scorecardSnapshot();

    io.to(this.code).emit('ball_result', {
      runs,
      extras,
      wicket,
      dismissal,
      legalBall,
      resultType: result.type,
      wide: result.wide || false,
      noBall: result.noBall || false,
      batsmanId,
      bowlerId,
      shotType: batData.shotType,
      direction: batData.direction,
      timing: batData.timing,
      ballPath: result.ballPath,
      scorecard: snap
    });

    if (this.pendingGroundRuns) {
      clearTimeout(this._groundRunsTimeout);
      this._groundRunsTimeout = setTimeout(() => {
        if (this.pendingGroundRuns) {
          this.handleRunsCompleted(batsmanId, 0);
        }
      }, 7000);
      return;
    }

    if (this.mode === 'single_batting') {
      this._handleSingleBattingProgress(wicket);
      return;
    }

    // Wicket handling in Team Match
    if (wicket) {
      this._handleWicket(batsmanId, dismissal);
      return;
    }

    // Target check in 2nd innings
    if (this.currentInnings === 2 && this.target && card.runs >= this.target) {
      const winner = this.battingTeam === 'a' ? 'Ants (Team A)' : 'Grasshoppers (Team B)';
      this._endGame(this.battingTeam, `${winner} won by ${TEAM_SIZE - card.wickets} wickets!`);
      return;
    }

    // End of over check
    if (legalBall && this.currentBall >= 6) {
      this._endOver();
      return;
    }

    setTimeout(() => this._requestNextBall(), 3000);
  }

  handleRunsCompleted(socketId, runsTaken) {
    if (!this.pendingGroundRuns) return;
    clearTimeout(this._groundRunsTimeout);
    const { runs, batsmanId, bowlerId, legalBall } = this.pendingGroundRuns;
    this.pendingGroundRuns = null;

    const actualRuns = Math.max(0, Math.min(runs, parseInt(runsTaken, 10) || 0));
    const card = this._currentCard();

    card.runs += actualRuns;
    if (card.currentOverBalls.length > 0 && card.currentOverBalls[card.currentOverBalls.length - 1].startsWith('(')) {
      card.currentOverBalls[card.currentOverBalls.length - 1] = actualRuns === 0 ? '•' : actualRuns.toString();
    } else {
      card.currentOverBalls.push(actualRuns === 0 ? '•' : actualRuns.toString());
    }

    if (card.batsmen[batsmanId]) {
      card.batsmen[batsmanId].runs += actualRuns;
    }
    if (card.bowlers[bowlerId]) {
      card.bowlers[bowlerId].runs += actualRuns;
    }

    if (actualRuns % 2 === 1 && this.mode !== 'single_batting') {
      this._rotateStrike();
    }

    if (this.mode === 'single_batting') {
      const bStats = this.scorecard.singleBatting[batsmanId];
      if (bStats) bStats.runs += actualRuns;
    }

    const snap = this._scorecardSnapshot();
    io.to(this.code).emit('scorecard_update', { scorecard: snap, actualRuns });

    if (this.mode === 'single_batting') {
      this._handleSingleBattingProgress(false);
      return;
    }

    // Target check in 2nd innings
    if (this.currentInnings === 2 && this.target && card.runs >= this.target) {
      const winner = this.battingTeam === 'a' ? 'Ants (Team A)' : 'Grasshoppers (Team B)';
      this._endGame(this.battingTeam, `${winner} won by ${TEAM_SIZE - card.wickets} wickets!`);
      return;
    }

    // End of over check
    if (legalBall && this.currentBall >= 6) {
      this._endOver();
      return;
    }

    setTimeout(() => this._requestNextBall(), 2000);
  }

  _computeOutcome(bat, bowl) {
    const timing = clamp(typeof bat.timing === 'number' ? bat.timing : (typeof bat.power === 'number' ? bat.power : 0.5), 0, 1);
    const power = clamp(bat.power || 0.75, 0, 1);
    const direction = typeof bat.direction === 'string' ? bat.direction : 'forward';
    const shotType = bat.shotType || 'drive';
    const charId = bat.character_id || 'ant_batter_01';
    const deliveryType = bowl.deliveryType || 'pace';
    const accuracy = clamp(bowl.accuracy || 0.7, 0, 1);

    // Character physics modifiers
    const isBeetle = charId.includes('beetle');
    const isGrasshopper = charId.includes('grasshopper');
    const impactMult = isBeetle ? 1.4 : isGrasshopper ? 1.05 : 1.0;
    const stability = isBeetle ? 0.98 : isGrasshopper ? 0.38 : 0.62;

    // Overstepping Crease Line NO-BALL
    if (bowl.isNoBall || (typeof bowl.power === 'number' && bowl.power >= 0.88)) {
      return { type: 'noball', noBall: true, runs: 1, ballPath: 'crease_noball' };
    }

    // Wide check: ball clearly outside off/leg stump line — unplayable wide
    const lzX = bowl.landingZone?.x || 0;
    if (Math.abs(lzX) > 1.2) {
      return { type: 'wide', wide: true, runs: 0, ballPath: 'wide' };
    }
    // Wide check: bowler missed accuracy AND ball angled too far outside
    if (accuracy < 0.22 && Math.abs(lzX) > 0.85) {
      return { type: 'wide', wide: true, runs: 0, ballPath: 'wide' };
    }
    // Down-leg wide: ball going well past leg stump and batsman didn't attempt a shot
    if (shotType === 'leave' && lzX < -0.75) {
      return { type: 'wide', wide: true, runs: 0, ballPath: 'wide_down_leg' };
    }

    // Timing score: sweet spot around 0.50 - 0.75
    const sweetCenter = 0.62;
    const timingDiff = Math.abs(timing - sweetCenter);
    const isPerfect = timingDiff < 0.08;
    const isGood = timingDiff < 0.22;
    const isEarly = timing < 0.32;
    const isLate = timing > 0.85;
    const missHit = isEarly || isLate;

    // Batsman Leaves / Did not swing before ball arrived
    if (shotType === 'leave') {
      const lzX = Math.abs(bowl.landingZone?.x || 0);
      const lzZ = typeof bowl.landingZone?.z === 'number' ? bowl.landingZone.z : -5.5;
      // Only bowled if delivery was on middle stump line AND pitching right at the batsman's stumps
      if (lzX < 0.08 && lzZ <= -8.8 && Math.random() < 0.12) {
        return { type: 'wicket', wicket: true, dismissal: 'Bowled', ballPath: 'bowled' };
      }
      return { type: 'runs', runs: 0, ballPath: 'leave_dot' };
    }

    // Yorker delivery logic
    if (deliveryType === 'yorker') {
      if (shotType === 'defend' || direction === 'backward' || isPerfect) {
        return { type: 'runs', runs: isPerfect ? 1 : 0, ballPath: 'yorker_defended' };
      }
      const lzX = Math.abs(bowl.landingZone?.x || 0);
      if (missHit && lzX < 0.09 && Math.random() < 0.20) {
        return { type: 'wicket', wicket: true, dismissal: 'Bowled', ballPath: 'bowled' };
      }
      return { type: 'runs', runs: 0, ballPath: 'yorker_missed_dot' };
    }

    // Bouncer delivery logic
    if (deliveryType === 'bouncer') {
      if ((shotType === 'sweep' || direction === 'left') && !isGood && Math.random() < 0.18) {
        return { type: 'wicket', wicket: true, dismissal: 'Caught', ballPath: 'top_edge_caught' };
      }
      if ((shotType === 'cut' || direction === 'right' || direction === 'backward_right') && isGood) {
        return { type: 'runs', runs: 4, ballPath: 'upper_cut_four' };
      }
      return { type: 'runs', runs: 0, ballPath: 'bouncer_duck_dot' };
    }

    // Outswing delivery logic (moving away outside off)
    if (deliveryType === 'outswing') {
      if (missHit && (direction === 'forward' || direction === 'forward_left') && Math.random() < 0.12) {
        return { type: 'wicket', wicket: true, dismissal: 'Caught', ballPath: 'edged_to_slips' };
      }
      if (isGood && (direction === 'forward_right' || direction === 'right')) {
        return { type: 'runs', runs: isPerfect ? 4 : 2, ballPath: 'cover_drive' };
      }
      return { type: 'runs', runs: 0, ballPath: 'play_and_miss' };
    }

    // Inswing delivery logic (curving into stumps and pads)
    if (deliveryType === 'inswing') {
      const lzX = Math.abs(bowl.landingZone?.x || 0);
      if (missHit && lzX < 0.09 && Math.random() < 0.15) {
        return { type: 'wicket', wicket: true, dismissal: Math.random() < 0.6 ? 'LBW' : 'Bowled', ballPath: 'inswing_bowled' };
      }
      if (isGood && (direction === 'forward_left' || direction === 'left')) {
        return { type: 'runs', runs: isPerfect ? 4 : 2, ballPath: 'flick_four' };
      }
      return { type: 'runs', runs: 0, ballPath: 'inswing_pads_dot' };
    }

    // Slower delivery logic (deceptive dip in flight)
    if (deliveryType === 'slower') {
      if (isEarly && shotType === 'loft' && Math.random() < 0.20) {
        return { type: 'wicket', wicket: true, dismissal: 'Caught', ballPath: 'caught_in_deep' };
      }
      if (isPerfect) {
        return { type: 'runs', runs: 6, ballPath: 'maximum_six' };
      }
      return { type: 'runs', runs: isGood ? 1 : 0, ballPath: 'slower_dot' };
    }

    // Defensive Shot or Backward Direction (Block)
    if (shotType === 'defend' || direction === 'backward') {
      return { type: 'runs', runs: 0, ballPath: 'defended' };
    }

    // Lofted shot
    if (shotType === 'loft') {
      const powerThreshold = isBeetle ? 0.45 : 0.6;
      if (isPerfect && power > powerThreshold) {
        return { type: 'runs', runs: 6, ballPath: 'maximum_six' };
      } else if (isGood) {
        const sixChance = isBeetle ? 0.55 : 0.35;
        return { type: 'runs', runs: Math.random() < sixChance ? 6 : 4, ballPath: 'lofted_boundary' };
      } else if (missHit && Math.random() < 0.18) {
        return { type: 'wicket', wicket: true, dismissal: 'Caught', ballPath: 'caught_in_deep' };
      } else {
        return { type: 'runs', runs: 1, ballPath: 'lofted_short' };
      }
    }

    // Sweep shot (left or backward_left)
    if (shotType === 'sweep' || direction === 'left' || direction === 'backward_left') {
      if (isGood) {
        return { type: 'runs', runs: isPerfect ? 4 : 2, ballPath: 'sweep_fine_leg' };
      } else if (missHit && Math.random() < 0.12) {
        return { type: 'wicket', wicket: true, dismissal: 'LBW', ballPath: 'missed_sweep' };
      } else {
        return { type: 'runs', runs: 0, ballPath: 'sweep_missed_dot' };
      }
    }

    // Cut shot (right or backward_right)
    if (shotType === 'cut' || direction === 'right' || direction === 'backward_right') {
      if (isGood) {
        return { type: 'runs', runs: isPerfect ? 4 : 2, ballPath: 'cut_past_point' };
      } else if (missHit && Math.random() < 0.12) {
        return { type: 'wicket', wicket: true, dismissal: 'Caught', ballPath: 'edged_to_keeper' };
      } else {
        return { type: 'runs', runs: 0, ballPath: 'cut_beaten_dot' };
      }
    }

    // Direct Fielder Catch: only on mis-hit aerial drives
    if (shotType === 'loft' && !isGood && Math.random() < 0.15) {
      return { type: 'wicket', wicket: true, dismissal: 'Caught', ballPath: 'caught_by_fielder' };
    }

    // Drive shots (forward, forward_left, forward_right)
    if (isPerfect) {
      const sixProb = isBeetle ? 0.45 : 0.2;
      return { type: 'runs', runs: Math.random() < sixProb ? 6 : 4, ballPath: 'cover_drive_four' };
    } else if (isGood) {
      const r = Math.random() < 0.25 ? 4 : (Math.random() < 0.6 ? 2 : 1);
      return { type: 'runs', runs: r, ballPath: 'drive_gap' };
    } else if (missHit) {
      if (Math.random() < 0.10) {
        return { type: 'wicket', wicket: true, dismissal: 'Caught', ballPath: 'edged_to_slips' };
      } else {
        return { type: 'runs', runs: 0, ballPath: 'play_and_miss' };
      }
    }

    return { type: 'runs', runs: 0, ballPath: 'drive_dot' };
  }

  _rotateStrike() {
    const temp = this.currentBatsmanIdx;
    this.currentBatsmanIdx = this.currentNonStrikerIdx;
    this.currentNonStrikerIdx = temp;
  }

  _handleWicket(batsmanId, dismissal) {
    const card = this._currentCard();

    io.to(this.code).emit('wicket', {
      batsmanId,
      batsmanName: this.players.get(batsmanId)?.name,
      dismissal,
      scorecard: this._scorecardSnapshot()
    });

    // Check All Out
    if (card.wickets >= TEAM_SIZE - 1) {
      this._endInnings();
      return;
    }

    // Find next available batsman
    const nextIdx = this.battingOrder.findIndex((id, idx) =>
      idx > 1 && !card.batsmen[id]?.dismissed && id !== this.battingOrder[this.currentNonStrikerIdx]
    );

    if (nextIdx === -1) {
      this._endInnings();
      return;
    }

    const battingCaptain = this.battingTeam === 'a' ? this.captainA : this.captainB;
    const battingCaptainPlayer = this.players.get(battingCaptain);

    if (battingCaptainPlayer && battingCaptainPlayer.isBot) {
      this.currentBatsmanIdx = nextIdx;
      const nextId = this.battingOrder[nextIdx];
      if (card.batsmen[nextId]) card.batsmen[nextId].isOnPitch = true;
      io.to(this.code).emit('new_batsman', { batsman: this._playerInfo(nextId) });
      setTimeout(() => this._requestNextBall(), 1200);
    } else {
      this.pendingNextBatsman = true;
      io.to(battingCaptain).emit('next_batsman_needed', {
        availableBatsmen: this.battingOrder
          .filter(id => !card.batsmen[id]?.dismissed && id !== this.battingOrder[this.currentNonStrikerIdx])
          .map(id => this._playerInfo(id))
      });
    }
  }

  setNextBatsman(socketId, nextBatsmanId) {
    const captain = this.battingTeam === 'a' ? this.captainA : this.captainB;
    if (socketId !== captain || !this.pendingNextBatsman) return;

    const idx = this.battingOrder.indexOf(nextBatsmanId);
    if (idx === -1) return;

    this.currentBatsmanIdx = idx;
    this.pendingNextBatsman = false;
    const card = this._currentCard();
    if (card.batsmen[nextBatsmanId]) card.batsmen[nextBatsmanId].isOnPitch = true;

    io.to(this.code).emit('new_batsman', { batsman: this._playerInfo(nextBatsmanId) });
    setTimeout(() => this._requestNextBall(), 1000);
  }

  // Send each human player their match role so the client can show/hide the correct UI
  _emitRoleEvents() {
    if (this.mode === 'single_batting') return; // Not applicable for single batting
    const strikerId = this.battingOrder[this.currentBatsmanIdx];
    const nonStrikerId = this.battingOrder[this.currentNonStrikerIdx];
    const bowlingIds = this.bowlingTeam === 'a' ? this.teamA : this.teamB;

    for (const [id, player] of this.players) {
      if (player.isBot) continue;
      if (id === strikerId) {
        io.to(id).emit('player_role', { role: 'striker', batsman: this._playerInfo(strikerId), nonStriker: this._playerInfo(nonStrikerId) });
      } else if (id === nonStrikerId) {
        io.to(id).emit('player_role', { role: 'nonstriker', batsman: this._playerInfo(strikerId), nonStriker: this._playerInfo(nonStrikerId) });
      } else if (id === this.currentBowler) {
        io.to(id).emit('player_role', { role: 'bowler' });
      } else if (bowlingIds.includes(id)) {
        io.to(id).emit('player_role', { role: 'fielder' });
      }
    }
  }

  _requestNextBall() {
    // CRITICAL: never request next ball if the over is already finished or game is not in play
    if (this.state !== 'PLAYING') return;
    if (this.currentBall >= 6) return;

    this.ballInFlight = false;
    this.runupInProgress = false;
    clearTimeout(this._runupTimeout);
    clearTimeout(this._batTimeout);

    const bowlerPlayer = this.players.get(this.currentBowler);
    if (bowlerPlayer && bowlerPlayer.isBot) {
      // Add ~1.2s delay between bot deliveries so the match doesn't feel instant
      clearTimeout(this._botRequestTimer);
      this._botRequestTimer = setTimeout(() => {
        this._botRequestTimer = null;
        if (this.state === 'PLAYING' && !this.ballInFlight && !this.runupInProgress && this.currentBall < 6) {
          this._botBowl(this.currentBowler);
        }
      }, 1200);
    } else if (this.currentBowler) {
      const batsmanId = this.mode === 'single_batting'
        ? this.sbQueue[this.sbCurrentBatsmanIdx]
        : this.battingOrder[this.currentBatsmanIdx];

      io.to(this.currentBowler).emit('bowl_now', {
        batsman: this._playerInfo(batsmanId),
        over: this.currentOver + 1,
        ball: this.currentBall + 1,
        scorecard: this._scorecardSnapshot()
      });

      // 20-second safety window for human bowler to aim, set swing & bowl
      clearTimeout(this._bowlerTimeout);
      this._bowlerTimeout = setTimeout(() => {
        if (this.state === 'PLAYING' && !this.ballInFlight && this.currentBowler && this.currentBall < 6) {
          this._botBowl(this.currentBowler);
        }
      }, 20000);
    }
  }

  _endOver() {
    const card = this._currentCard();
    this.currentOver++;
    card.overs = this.currentOver;
    this.currentBall = 0;

    // Over strike rotation
    this._rotateStrike();

    if (card.bowlers[this.currentBowler]) {
      card.bowlers[this.currentBowler].overs++;
      card.bowlers[this.currentBowler].balls = 0;
    }

    const snap = this._scorecardSnapshot();
    io.to(this.code).emit('over_complete', {
      over: this.currentOver,
      totalOvers: this.overs,
      scorecard: snap
    });

    if (this.currentOver >= this.overs) {
      this._endInnings();
      return;
    }

    // Captain picks bowler for next over
    this.state = 'CAPTAIN_SETUP';
    this.pendingBowlerRequest = true;

    const bowlingCaptain = this.bowlingTeam === 'a' ? this.captainA : this.captainB;
    const bowlingCaptainPlayer = this.players.get(bowlingCaptain);
    const bowlingIds = this.bowlingTeam === 'a' ? this.teamA : this.teamB;
    const humanBowlers = bowlingIds.filter(id => !this.players.get(id)?.isBot);

    if (bowlingCaptainPlayer && !bowlingCaptainPlayer.isBot) {
      io.to(bowlingCaptain).emit('bowler_needed', {
        over: this.currentOver + 1,
        bowlers: bowlingIds.map(id => this._playerInfo(id)),
        scorecard: snap
      });
    } else if (humanBowlers.length > 0) {
      io.to(humanBowlers[0]).emit('bowler_needed', {
        over: this.currentOver + 1,
        bowlers: bowlingIds.map(id => this._playerInfo(id)),
        scorecard: snap
      });
      setTimeout(() => {
        if (this.state === 'CAPTAIN_SETUP' && this.pendingBowlerRequest) {
          this._autoPickBowler();
        }
      }, 6000);
    } else {
      setTimeout(() => this._autoPickBowler(), 1200);
    }
  }

  _endInnings() {
    const card = this._currentCard();
    const snap = this._scorecardSnapshot();

    io.to(this.code).emit('innings_end', {
      innings: this.currentInnings,
      battingTeam: this.battingTeam,
      scorecard: snap
    });

    if (this.currentInnings === 1) {
      this.target = card.runs + 1;
      // Swap batting and bowling teams
      const prevBatting = this.battingTeam;
      this.battingTeam = this.bowlingTeam;
      this.bowlingTeam = prevBatting;

      this.state = 'INNINGS_BREAK';
      setTimeout(() => this._setupInnings(2), 3500);
    } else {
      // End of Match
      const inn1 = this.scorecard.innings1;
      const inn2 = this.scorecard.innings2;

      let winner = null;
      let reason = '';

      if (inn2.runs >= this.target) {
        winner = this.battingTeam;
        const winnerName = winner === 'a' ? 'Ants (Team A)' : 'Grasshoppers (Team B)';
        reason = `🏆 ${winnerName} won by ${TEAM_SIZE - inn2.wickets} wickets!`;
      } else if (inn2.runs === inn1.runs) {
        winner = 'TIE';
        reason = `🤝 MATCH TIED! Both teams scored ${inn1.runs} runs!`;
      } else {
        winner = this.bowlingTeam;
        const winnerName = winner === 'a' ? 'Ants (Team A)' : 'Grasshoppers (Team B)';
        const diff = inn1.runs - inn2.runs;
        reason = `🏆 ${winnerName} won by ${diff} run${diff !== 1 ? 's' : ''}!`;
      }

      this._endGame(winner, reason);
    }
  }

  _endGame(winner, reason) {
    this.state = 'GAME_OVER';
    io.to(this.code).emit('game_over', {
      winner,
      reason,
      scorecard: this._scorecardSnapshot()
    });
  }

  // --- Single Batting Mode ---
  startSingleBatting() {
    this.mode = 'single_batting';

    // Fully renew scorecards, targets and stats
    this.scorecard = {
      innings1: this._newInningsCard(),
      innings2: this._newInningsCard(),
      singleBatting: {}
    };
    this.target = null;
    this.currentInnings = 1;
    this.currentOver = 0;
    this.currentBall = 0;
    this.ballInFlight = false;
    this.runupInProgress = false;
    for (const p of this.players.values()) {
      p.stats = {
        runs: 0, balls: 0, fours: 0, sixes: 0, dismissed: false, dismissal: '',
        wickets: 0, runsConceded: 0, overs: 0, ballsBowled: 0
      };
    }

    const realPlayers = Array.from(this.players.values()).filter(p => !p.isBot);

    this.sbQueue = realPlayers.map(p => p.id);

    // If fewer than 4 players, fill up with bot fielders/bowlers
    const totalWanted = 8;
    const needed = totalWanted - this.sbQueue.length;
    for (let i = 0; i < needed; i++) {
      const bId = `sb_bot_${Date.now()}_${i}`;
      const bName = BOT_NAMES_B[i % BOT_NAMES_B.length] + ' (Bot)';
      this.addPlayer(bId, bName, '#2d6b2d', true, 'b');
      this.sbQueue.push(bId);
    }

    this.battingTeam = 'a';
    this.bowlingTeam = 'b';
    this.sbCurrentBatsmanIdx = 0;
    this.sbCurrentBowlerIdx = 1;
    this.currentOver = 0;
    this.currentBall = 0;
    this.state = 'PLAYING';

    for (const id of this.sbQueue) {
      this.scorecard.singleBatting[id] = {
        name: this.players.get(id)?.name,
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
        wickets: 0
      };
    }

    this._sbStartTurn();
  }

  _sbStartTurn() {
    const batsmanId = this.sbQueue[this.sbCurrentBatsmanIdx];
    const bowlerId = this.sbQueue[this.sbCurrentBowlerIdx % this.sbQueue.length];
    this.currentBowler = bowlerId;
    this.currentBall = 0;
    this.currentOver = 0;
    this.ballInFlight = false;

    io.to(this.code).emit('sb_turn_started', {
      batsman: this._playerInfo(batsmanId),
      bowler: this._playerInfo(bowlerId),
      overs: this.overs,
      scorecard: this._scorecardSnapshot()
    });

    setTimeout(() => this._requestNextBall(), 1000);
  }

  _handleSingleBattingProgress(wicket) {
    if (wicket || this.currentBall >= this.overs * 6) {
      // Turn over, next batsman in queue
      this.sbCurrentBatsmanIdx++;
      this.sbCurrentBowlerIdx++;

      if (this.sbCurrentBatsmanIdx >= this.sbQueue.length) {
        // Everyone has batted! Determine winner
        let highest = -1;
        let winnerId = null;
        for (const [id, stats] of Object.entries(this.scorecard.singleBatting)) {
          if (stats.runs > highest) {
            highest = stats.runs;
            winnerId = id;
          }
        }
        const winnerName = this.players.get(winnerId)?.name || 'Player';
        this._endGame(winnerId, `🏆 ${winnerName} won Single Batting with ${highest} runs!`);
        return;
      }

      setTimeout(() => this._sbStartTurn(), 2000);
    } else {
      setTimeout(() => this._requestNextBall(), 1200);
    }
  }

  _playerInfo(id) {
    if (!id) return null;
    const p = this.players.get(id);
    if (!p) return { id, name: 'Unknown', color: '#fff', isBot: true, team: null };
    return { id: p.id, name: p.name, color: p.color, isBot: p.isBot, team: p.team };
  }

  _allPlayersInfo() {
    const res = { teamA: [], teamB: [] };
    for (const id of this.teamA) res.teamA.push(this._playerInfo(id));
    for (const id of this.teamB) res.teamB.push(this._playerInfo(id));
    return res;
  }

  _scorecardSnapshot() {
    const card = this._currentCard();
    const batsmanId = this.mode === 'single_batting'
      ? this.sbQueue[this.sbCurrentBatsmanIdx]
      : this.battingOrder[this.currentBatsmanIdx];
    const nonStrikerId = this.mode === 'single_batting'
      ? null
      : this.battingOrder[this.currentNonStrikerIdx];

    // Standard cricket overs formatting:
    let displayOvers, displayBalls;
    if (this.mode === 'single_batting') {
      displayOvers = Math.floor(this.currentBall / 6);
      displayBalls = this.currentBall % 6;
    } else {
      if (this.currentBall >= 6) {
        displayOvers = this.currentOver + 1;
        displayBalls = 0;
      } else {
        displayOvers = this.currentOver;
        displayBalls = this.currentBall;
      }
    }

    // Format bowler stats
    const formattedBowlers = {};
    if (card?.bowlers) {
      for (const [id, bw] of Object.entries(card.bowlers)) {
        const bTotalBalls = (bw.overs || 0) * 6 + (bw.balls || 0);
        formattedBowlers[id] = {
          ...bw,
          overs: Math.floor(bTotalBalls / 6),
          balls: bTotalBalls % 6,
          totalBalls: bTotalBalls
        };
      }
    }

    return {
      mode: this.mode,
      innings: this.currentInnings,
      battingTeam: this.battingTeam,
      bowlingTeam: this.bowlingTeam,
      runs: card?.runs || 0,
      wickets: card?.wickets || 0,
      overs: displayOvers,
      balls: displayBalls,
      totalBalls: this.mode === 'single_batting' ? this.currentBall : (card?.balls || 0),
      extras: card?.extras || 0,
      target: this.target,
      currentOverBalls: card?.currentOverBalls || [],
      batsmen: card?.batsmen || {},
      bowlers: formattedBowlers,
      currentBatsman: this._playerInfo(batsmanId),
      nonStriker: this._playerInfo(nonStrikerId),
      currentBowler: this._playerInfo(this.currentBowler),
      singleBatting: this.scorecard.singleBatting,
      inn1: this.scorecard.innings1,
      inn2: this.scorecard.innings2
    };
  }

  getRoomInfo() {
    return {
      code: this.code,
      state: this.state,
      mode: this.mode,
      overs: this.overs,
      hostId: this.hostId,
      captainA: this.captainA,
      captainB: this.captainB,
      players: this._allPlayersInfo(),
      allPlayers: Array.from(this.players.values()).map(p => ({
        id: p.id, name: p.name, color: p.color, isBot: p.isBot, team: p.team
      }))
    };
  }

  handleRunOut(socketId, data) {
    if (this.state !== 'PLAYING') return;
    const card = this._currentCard();
    const batsmanId = data?.isNonStriker
      ? this.battingOrder[this.currentNonStrikerIdx]
      : this.battingOrder[this.currentBatsmanIdx];

    if (!batsmanId) return;

    card.wickets++;
    if (card.batsmen[batsmanId]) {
      card.batsmen[batsmanId].dismissed = true;
      card.batsmen[batsmanId].dismissal = 'Run Out';
      card.batsmen[batsmanId].isOnPitch = false;
    }
    const fowOver = this.currentBall >= 6 ? `${this.currentOver + 1}.0` : `${this.currentOver}.${this.currentBall}`;
    card.fallOfWickets.push({
      wicket: card.wickets,
      runs: card.runs,
      batsmanId,
      batsmanName: this.players.get(batsmanId)?.name,
      over: fowOver
    });

    const snap = this._scorecardSnapshot();
    io.to(this.code).emit('run_out_confirmed', {
      batsmanId,
      batsmanName: this.players.get(batsmanId)?.name,
      scorecard: snap
    });

    this._handleWicket(batsmanId, 'Run Out');
  }
}

function findRoom(socketId) {
  for (const room of rooms.values()) {
    if (room.players.has(socketId)) return room;
  }
  return null;
}

io.on('connection', (socket) => {
  console.log(`[+] Socket connected: ${socket.id}`);

  socket.on('join_room', (data) => {
    const { roomCode, name, color, mode, overs, team } = data;
    const code = (roomCode || 'CRICKET-1').toUpperCase();
    let room = rooms.get(code);
    if (!room) {
      room = new CricketRoom(code, mode || 'team_match', overs || DEFAULT_OVERS);
      rooms.set(code, room);
      console.log(`[Room] Created room: ${code}`);
    }

    if (room.state !== 'LOBBY') {
      socket.emit('error_msg', { msg: 'Game already in progress in this room!' });
      return;
    }

    socket.join(code);
    const p = room.addPlayer(socket.id, name, color, false, team);
    if (!p) {
      socket.emit('error_msg', { msg: 'Room is full (max 22 players)!' });
      return;
    }

    socket.emit('room_joined', room.getRoomInfo());
    io.to(code).emit('team_updated', room.getRoomInfo());
  });

  socket.on('select_team', (data) => {
    const room = findRoom(socket.id);
    if (!room) return;
    const ok = room.assignTeam(socket.id, data.team);
    if (ok) io.to(room.code).emit('team_updated', room.getRoomInfo());
  });

  socket.on('start_toss', () => {
    const room = findRoom(socket.id);
    if (!room || room.hostId !== socket.id) return;
    room.startToss();
  });

  socket.on('start_single_batting', (data) => {
    const room = findRoom(socket.id);
    if (!room || room.hostId !== socket.id) return;
    if (data?.overs) room.overs = parseInt(data.overs, 10) || DEFAULT_OVERS;
    room.startSingleBatting();
  });

  socket.on('toss_call', (data) => {
    const room = findRoom(socket.id);
    if (!room) return;
    room.handleTossCall(socket.id, data.call);
  });

  socket.on('toss_decision', (data) => {
    const room = findRoom(socket.id);
    if (!room) return;
    room.handleTossDecision(socket.id, data.choice);
  });

  socket.on('set_batting_order', (data) => {
    const room = findRoom(socket.id);
    if (!room) return;
    room.setBattingOrder(socket.id, data.order);
  });

  socket.on('set_bowler', (data) => {
    const room = findRoom(socket.id);
    if (!room) return;
    room.startOver(socket.id, data.bowlerId);
  });

  socket.on('bowl', (data) => {
    const room = findRoom(socket.id);
    if (!room) return;
    room.handleBowl(socket.id, data);
  });

  socket.on('bat', (data) => {
    const room = findRoom(socket.id);
    if (!room) return;
    room.handleBat(socket.id, data);
  });

  socket.on('set_next_batsman', (data) => {
    const room = findRoom(socket.id);
    if (!room) return;
    room.setNextBatsman(socket.id, data.batsmanId);
  });

  socket.on('run_out', (data) => {
    const room = findRoom(socket.id);
    if (!room) return;
    room.handleRunOut(socket.id, data);
  });

  socket.on('runs_completed', (data) => {
    const room = findRoom(socket.id);
    if (!room) return;
    room.handleRunsCompleted(socket.id, data?.runs);
  });

  socket.on('fielder_move', (data) => {
    const room = findRoom(socket.id);
    if (!room || room.state !== 'PLAYING') return;
    const player = room.players.get(socket.id);
    if (!player) return;
    // Broadcast position update so all clients can move this fielder avatar
    io.to(room.code).emit('fielder_moved', {
      socketId: socket.id,
      x: parseFloat(data.x) || 0,
      z: parseFloat(data.z) || 0
    });
  });

  socket.on('disconnect', () => {
    console.log(`[-] Disconnected: ${socket.id}`);
    const room = findRoom(socket.id);
    if (room) {
      room.removePlayer(socket.id);
      io.to(room.code).emit('team_updated', room.getRoomInfo());
    }
  });
});

server.listen(PORT, () => console.log(`🏏 Cricket Server live on port ${PORT}`));
