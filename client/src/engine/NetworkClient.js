// NetworkClient: Socket.IO wrapper for Cricket Game
export class NetworkClient {
  constructor() {
    this.socket = null;
    this.myId = null;
    this.roomCode = null;
    this.handlers = {};
  }

  connect() {
    this.socket = io();
    this.socket.on('connect', () => {
      this.myId = this.socket.id;
      console.log('[Net] Connected:', this.myId);
      this._emit('connected', { id: this.myId });
    });
    this.socket.on('disconnect', () => {
      console.log('[Net] Disconnected');
      this._emit('disconnected', {});
    });
    // Forward all server events
    const events = [
      'room_joined','player_joined','player_left','team_updated',
      'toss_started','toss_result','toss_decision_needed','toss_decision',
      'innings_setup','batting_order_set','bowling_order_needed','over_started',
      'delivery','ball_result','wicket','over_complete','innings_end',
      'game_over','sb_turn_started','new_batsman','next_batsman_needed',
      'bowler_needed','bowl_now','run_out_confirmed','error_msg'
    ];
    events.forEach(ev => {
      this.socket.on(ev, (data) => this._emit(ev, data));
    });
  }

  on(event, handler) {
    if (!this.handlers[event]) this.handlers[event] = [];
    this.handlers[event].push(handler);
  }

  _emit(event, data) {
    if (this.handlers[event]) {
      this.handlers[event].forEach(h => h(data));
    }
  }

  joinRoom(roomCode, name, color, mode, overs) {
    this.roomCode = roomCode;
    this.socket.emit('join_room', { roomCode, name, color, mode, overs });
  }

  selectTeam(team) { this.socket.emit('select_team', { team }); }
  startToss() { this.socket.emit('start_toss'); }
  startSingleBatting(overs) { this.socket.emit('start_single_batting', { overs }); }
  tossCAll(call) { this.socket.emit('toss_call', { call }); }
  tossDecision(choice) { this.socket.emit('toss_decision', { choice }); }
  setBowler(bowlerId) { this.socket.emit('set_bowler', { bowlerId }); }
  setBattingOrder(order) { this.socket.emit('set_batting_order', { order }); }
  bowl(data) { this.socket.emit('bowl', data); }
  bat(data) { this.socket.emit('bat', data); }
  setNextBatsman(batsmanId) { this.socket.emit('set_next_batsman', { batsmanId }); }
  runOut(data) { this.socket.emit('run_out', data); }
}

