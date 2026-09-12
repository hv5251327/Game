// BowlingUI: Streamlined Cricket Bowling Controller
// Features: Mouse pitch targeting, Dedicated Pace Meter, and Two Swing Options (Swing Left / Swing Right)
export class BowlingUI {
  constructor(container) {
    this.container = container;
    this.landingZone = { x: -0.2, z: 0.45 }; // Default good length, top of off
    this.swingDirection = 'left'; // 'left' | 'right'
    this.power = 0.5;
    this.barDirection = 1;
    this.barSpeed = 1.3;
    this.active = false;
    this.onBowl = null;
    this.animFrame = null;
    this.lastTime = 0;
    this._build();
    this._bindKeyboard();
  }

  _build() {
    this.el = document.createElement('div');
    this.el.id = 'bowling-ui';
    this.el.className = 'bowling-controller-side-panel';
    this.el.innerHTML = `
      <div class="bowl-ui-header">
        <div class="bowl-title-row">
          <span class="bowl-icon">⚾</span>
          <span class="bowl-title-text">BOWLING CONTROLLER</span>
          <span id="bowl-timer-badge" class="timer-countdown-badge">⏱️ <span id="bowl-timer-count">20</span>s</span>
        </div>
        <div id="bowl-status-banner" class="bowl-status-banner">
          TARGET: <strong>GOOD LENGTH (Outside Off)</strong> &bull; <span id="bowl-speed-display" style="color:#ffd32a;">140 km/h</span>
        </div>
      </div>

      <!-- 1. Two Options to Swing Left or Right -->
      <div class="swing-dual-container">
        <div class="swing-dual-label">SWING DIRECTION:</div>
        <div class="swing-dual-options">
          <button type="button" class="swing-dual-btn active" data-swing="left" id="btn-swing-left" title="Swing Left / Curve Inwards [1 or L]">
            ↩ SWING LEFT [1]
          </button>
          <button type="button" class="swing-dual-btn" data-swing="right" id="btn-swing-right" title="Swing Right / Curve Outwards [2 or R]">
            ↪ SWING RIGHT [2]
          </button>
        </div>
      </div>

      <!-- Real-time Line and Length Readout from On-Screen Click -->
      <div class="bowl-hud-stats">
        <span id="bowl-length-label">Length: <strong>Good Length</strong> &bull; Swing: <strong style="color:#7bed9f;">SWING LEFT</strong></span>
        <span id="bowl-line-label">Line: <strong>Outside Off</strong></span>
      </div>

      <!-- 2. Dedicated Meter for Pace with No-Ball Crease Line -->
      <div class="bowling-meter-wrap">
        <div class="bowl-meter-labels">
          <span>MIN PACE</span>
          <span class="meter-label-sweet">⚡ OPTIMAL PACE ⚡</span>
          <span class="meter-label-noball">🚨 NO-BALL LINE</span>
        </div>
        <div class="bowl-meter-track" id="bowl-pace-track" title="Click or press SPACE to lock in pace and bowl">
          <div class="bowl-meter-sweet-zone"></div>
          <div class="bowl-meter-noball-zone" title="Overstep Crease = NO-BALL"></div>
          <div class="bowl-meter-noball-crease-line" title="Crease Line">
            <span class="crease-line-text">CREASE</span>
          </div>
          <div id="bowling-speed-marker" class="bowl-meter-marker"></div>
        </div>
      </div>

      <!-- Action Button & On-Screen Pitch Instruction Hint -->
      <button type="button" id="btn-bowl" class="btn-bowl-pro">⚡ BOWL DELIVERY [SPACE] ⚡</button>
      <div class="bowl-keyboard-hint">
        🎯 <strong>Click directly on pitch screen to set landing spot!</strong> &bull; <strong>[1]/[2]</strong> Swing &bull; <strong>SPACE</strong> to Bowl
      </div>
    `;
    this.el.style.display = 'none';
    this.container.appendChild(this.el);

    // Two Swing Option Buttons (Left / Right)
    this.el.querySelectorAll('.swing-dual-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this._setSwingDirection(btn.dataset.swing);
      });
    });

    // Bowl button & Pace meter track click to bowl
    this.el.querySelector('#btn-bowl')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this._bowl();
    });
    const paceTrack = this.el.querySelector('#bowl-pace-track');
    paceTrack?.addEventListener('click', (e) => {
      e.stopPropagation();
      this._bowl();
    });

    this.marker = this.el.querySelector('#bowling-speed-marker');
  }

  _bindKeyboard() {
    window.addEventListener('keydown', (e) => {
      if (!this.active) return;
      const k = e.key.toLowerCase();

      if (k === ' ' || k === 'enter' || k === 'b') {
        e.preventDefault();
        this._bowl();
        return;
      }

      // Keys 1/L for Swing Left, 2/R for Swing Right
      if (k === '1' || k === 'l') {
        this._setSwingDirection('left');
        return;
      }
      if (k === '2' || k === 'r') {
        this._setSwingDirection('right');
        return;
      }

      // Optional arrow keys for fine tuning
      let moved = false;
      if (k === 'arrowleft' || k === 'a') {
        this.landingZone.x = Math.max(-1.0, this.landingZone.x - 0.08);
        moved = true;
      } else if (k === 'arrowright' || k === 'd') {
        this.landingZone.x = Math.min(1.0, this.landingZone.x + 0.08);
        moved = true;
      } else if (k === 'arrowup' || k === 'w') {
        this.landingZone.z = Math.max(0.06, this.landingZone.z - 0.08); // Fuller (Yorker)
        moved = true;
      } else if (k === 'arrowdown' || k === 's') {
        this.landingZone.z = Math.min(0.94, this.landingZone.z + 0.08); // Shorter (Bouncer)
        moved = true;
      }

      if (moved) {
        e.preventDefault();
        this._updateLabels();
      }
    });
  }

  setLandingZone(x, z) {
    this.landingZone = { x, z };
    this._updateLabels();
  }

  _setSwingDirection(swing) {
    this.swingDirection = swing === 'right' ? 'right' : 'left';
    this.el.querySelectorAll('.swing-dual-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.swing === this.swingDirection);
    });
    this._updateLabels();
  }

  _updateLabels() {
    const lengthLabel = this.el.querySelector('#bowl-length-label');
    const lineLabel = this.el.querySelector('#bowl-line-label');
    const statusBanner = this.el.querySelector('#bowl-status-banner');

    const z = this.landingZone.z;
    let lenStr = 'Good Length';
    if (z >= 2.3) lenStr = 'Yorker / Full Length';
    else if (z >= 1.0) lenStr = 'Full Pitch';
    else if (z >= -0.2) lenStr = 'Good Length';
    else if (z >= -1.2) lenStr = 'Short of Length';
    else lenStr = 'Bouncer / Short Pitch';

    const x = this.landingZone.x;
    let lineStr = 'Middle Stump';
    if (x < -0.55) lineStr = 'Way Outside Off';
    else if (x < -0.15) lineStr = 'Off Stump Line';
    else if (x > 0.55) lineStr = 'Down Leg Side';
    else if (x > 0.2) lineStr = 'On the Pads (Leg Stump)';
    else lineStr = 'Middle Stump Line';

    const swingText = this.swingDirection === 'left' ? 'SWING LEFT' : 'SWING RIGHT';
    if (lengthLabel) lengthLabel.innerHTML = `Length: <strong>${lenStr}</strong> &bull; Swing: <strong style="color:#7bed9f;">${swingText}</strong>`;
    if (lineLabel) lineLabel.innerHTML = `Line: <strong>${lineStr}</strong>`;

    const baseKmh = 105;
    const speedEst = Math.round(baseKmh + this.power * 45);

    if (statusBanner) {
      statusBanner.innerHTML = `TARGET: <strong>${lenStr}</strong> &bull; <span style="color:#ffd32a;">${speedEst} km/h (${swingText})</span>`;
    }
  }

  show(options = {}) {
    this.active = true;
    this.power = 0;
    this.barDirection = 1;
    this.el.style.display = 'flex';
    this._updateLabels();
    this._animate(performance.now());

    const totalMs = options.timeout || 20000;
    this.remainingSec = Math.round(totalMs / 1000);
    const timerCountEl = this.el.querySelector('#bowl-timer-count');
    if (timerCountEl) timerCountEl.textContent = String(this.remainingSec);

    clearInterval(this._countdownInterval);
    this._countdownInterval = setInterval(() => {
      this.remainingSec--;
      if (timerCountEl) timerCountEl.textContent = String(Math.max(0, this.remainingSec));
      if (this.remainingSec <= 0) {
        clearInterval(this._countdownInterval);
      }
    }, 1000);

    clearTimeout(this._autoTimeout);
    this._autoTimeout = setTimeout(() => {
      if (this.active) this._bowl();
    }, totalMs);
  }

  hide() {
    this.active = false;
    this.el.style.display = 'none';
    clearInterval(this._countdownInterval);
    clearTimeout(this._autoTimeout);
    if (this.animFrame) cancelAnimationFrame(this.animFrame);
  }

  _animate(now) {
    if (!this.active) return;
    const delta = Math.min((now - (this.lastTime || now)) / 1000, 0.1);
    this.lastTime = now;

    this.power += this.barDirection * this.barSpeed * delta;
    if (this.power >= 1) { this.power = 1; this.barDirection = -1; }
    if (this.power <= 0) { this.power = 0; this.barDirection = 1; }

    if (this.marker) {
      this.marker.style.left = `${this.power * 100}%`;
    }

    // Dynamic banner text for No-Ball Crease Warning & Speed Display
    const statusBanner = this.el.querySelector('#bowl-status-banner');
    if (statusBanner) {
      const baseKmh = 105;
      const curSpeed = Math.round(baseKmh + this.power * 45);
      const swingText = this.swingDirection === 'left' ? 'SWING LEFT' : 'SWING RIGHT';

      if (this.power >= 0.88) {
        statusBanner.innerHTML = `🚨 <strong style="color:#ff4757;">OVERSTEPPED CREASE! NO-BALL RISK!</strong> &bull; <span style="color:#ff6b81;">${curSpeed} km/h</span>`;
      } else {
        const isSweet = this.power >= 0.55 && this.power <= 0.82;
        statusBanner.innerHTML = `${isSweet ? '⚡ OPTIMAL PACE!' : 'PACE'} &bull; <span style="color:#ffd32a;">${curSpeed} km/h</span> &bull; <span>${swingText}</span>`;
      }
    }

    this.animFrame = requestAnimationFrame((t) => this._animate(t));
  }

  _bowl() {
    if (!this.active) return;
    this.hide();

    // No ball check if power exceeds 0.88 (crease overstep line)
    const isNoBall = this.power >= 0.88;
    const sweetCenter = 0.68;
    const timingDiff = Math.abs(this.power - sweetCenter);
    const accuracy = isNoBall ? 0.2 : Math.max(0.5, 1.0 - timingDiff * 1.5);

    // Speed calculation from pace meter (105 to 150 km/h)
    const baseKmh = 105;
    const paceKmh = Math.round(baseKmh + this.power * 45);

    let delivType = 'pace';
    if (this.landingZone.z >= 2.3) delivType = 'yorker';
    else if (this.landingZone.z <= -1.2) delivType = 'bouncer';
    else if (this.swingDirection === 'left') delivType = 'inswing';
    else if (this.swingDirection === 'right') delivType = 'outswing';

    if (this.onBowl) {
      this.onBowl({
        landingZone: {
          x: parseFloat(this.landingZone.x.toFixed(2)),
          z: parseFloat(this.landingZone.z.toFixed(2))
        },
        deliveryType: delivType,
        swingDirection: this.swingDirection, // 'left' | 'right'
        power: parseFloat(this.power.toFixed(2)),
        accuracy: parseFloat(accuracy.toFixed(2)),
        isNoBall,
        paceKmh
      });
    }
  }

  destroy() {
    this.hide();
    if (this.el.parentNode) this.container.removeChild(this.el);
  }
}

