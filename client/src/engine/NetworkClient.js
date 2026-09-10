export class NetworkClient {
  constructor(callbacks = {}) {
    this.socket = null;
    this.myId = null;
    this.roomCode = null;
    this.callbacks = callbacks;
    this.connected = false;
  }

  connect() {
    // Socket.io is loaded via script tag / import
    if (typeof io === 'undefined') {
      console.warn('Socket.io library not loaded');
      return;
    }

    this.socket = io({
      transports: ['websocket', 'polling']
    });

    this.socket.on('connect', () => {
      this.connected = true;
      this.myId = this.socket.id;
      console.log('Connected to Wobble House server. ID:', this.myId);
    });

    this.socket.on('room_joined', (data) => {
      this.myId = data.playerId;
      this.roomCode = data.roomCode;
      this.callbacks.onRoomJoined?.(data);
    });

    this.socket.on('room_updated', (data) => {
      this.callbacks.onRoomUpdated?.(data);
    });

    this.socket.on('room_error', (data) => {
      this.callbacks.onRoomError?.(data);
    });

    this.socket.on('round_countdown_started', (data) => {
      this.callbacks.onCountdownStarted?.(data);
    });

    this.socket.on('round_started', (data) => {
      this.callbacks.onRoundStarted?.(data);
    });

    this.socket.on('round_ended', (data) => {
      this.callbacks.onRoundEnded?.(data);
    });

    this.socket.on('player_swung_bat', (data) => {
      this.callbacks.onPlayerSwungBat?.(data);
    });

    this.socket.on('player_hit', (data) => {
      this.callbacks.onPlayerHit?.(data);
    });

    this.socket.on('thermal_echo_pulsed', (data) => {
      this.callbacks.onThermalEchoPulsed?.(data);
    });

    this.socket.on('player_camp_revealed', (data) => {
      this.callbacks.onPlayerCampRevealed?.(data);
    });

    this.socket.on('game_tick', (data) => {
      this.callbacks.onGameTick?.(data);
    });

    this.socket.on('disconnect', () => {
      this.connected = false;
      console.log('Disconnected from server');
    });
  }

  joinRoom(roomCode, nickname, color, botCount = 0, preferredRole = 'RANDOM', autoStart = false, hunterCount = 1) {
    if (!this.socket) this.connect();
    this.socket.emit('join_room', {
      roomCode,
      nickname,
      color,
      botCount,
      preferredRole,
      forceHitter: (preferredRole === 'HITTER'),
      autoStart,
      hunterCount
    });
  }

  startGame(forceHitter = false) {
    this.socket?.emit('start_game', {
      forceHitter,
      preferredRole: forceHitter ? 'HITTER' : 'RANDOM'
    });
  }

  setHunterCount(count) {
    this.socket?.emit('set_hunter_count', { count });
  }

  setBots(count) {
    this.socket?.emit('set_bots', { count });
  }

  sendInput(inputData) {
    this.socket?.emit('player_input', inputData);
  }

  swingBat() {
    this.socket?.emit('bat_swing');
  }

  triggerThermalEcho(objectId, hitPos) {
    this.socket?.emit('thermal_echo_trigger', { objectId, hitPos });
  }
}
