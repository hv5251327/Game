// BowlingUI: Advanced Cricket Bowling Controller with 8 Delivery Options, Release Speed Meter & Pitch Targeting
export class BowlingUI {
  constructor(container) {
    this.container = container;
    this.landingZone = { x: -0.2, z: 0.45 }; // default top of off-stump good length
    this.deliveryType = 'pace';
    this.power = 0.5;
    this.barDirection = 1;
    this.barSpeed = 2.4;
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
    this.el.className = 'bowling-controller-optimized';
    this.el.innerHTML = `
      <div class="bowl-ui-header">
        <div class="bowl-title-row">
          <span class="bowl-icon">⚾</span>
          <span class="bowl-title-text">BOWLING CONTROLLER</span>
        </div>
        <div id="bowl-status-banner" class="bowl-status-banner">
          TARGET: <strong>GOOD LENGTH (Top of Off)</strong> &bull; <span id="bowl-speed-display" style="color:#ffd32a;">142 km/h</span>
        </div>
      </div>

      <!-- Bowling Delivery Options (8 Varieties) -->
      <div class="delivery-options-grid">
        <button type="button" class="deliv-opt-btn active" data-type="pace" title="Express Fast Pace [1]">💨 Fast Pace [1]</button>
        <button type="button" class="deliv-opt-btn" data-type="outswing" title="Late Away Swing [2]">↩ Outswing [2]</button>
        <button type="button" class="deliv-opt-btn" data-type="inswing" title="Inward Curve into Pads [3]">↪ Inswing [3]</button>
        <button type="button" class="deliv-opt-btn" data-type="yorker" title="Toe-Crushing Full Delivery [4]">🎯 Yorker [4]</button>
        <button type="button" class="deliv-opt-btn" data-type="bouncer" title="Fierce Rising Short Ball [5]">🚀 Bouncer [5]</button>
        <button type="button" class="deliv-opt-btn" data-type="spin" title="Off-Spinning Break [6]">🌀 Off-Spin [6]</button>
        <button type="button" class="deliv-opt-btn" data-type="leg_spin" title="Leg-Spin & Googly [7]">💫 Leg-Spin [7]</button>
        <button type="button" class="deliv-opt-btn" data-type="slower" title="Deceptive Knuckle Slower Ball [8]">🐢 Slower [8]</button>
      </div>

      <!-- Interactive 2D Pitch View with Color-Coded Length Zones -->
      <div class="pitch-picker-container">
        <div class="pitch-picker-label">🎯 Click on pitch or use Arrow Keys to set landing target:</div>
        <div class="pitch-wrapper">
          <div id="pitch-canvas" class="pitch-canvas-pro" title="Click or tap to aim delivery">
            <div class="pitch-zone-pro zone-yorker" title="Yorker / Blockhole Zone">
              <span class="zone-tag">YORKER</span>
            </div>
            <div class="pitch-zone-pro zone-good" title="Good Length Zone">
              <span class="zone-tag">GOOD LENGTH</span>
            </div>
            <div class="pitch-zone-pro zone-bouncer" title="Short / Bouncer Zone">
              <span class="zone-tag">BOUNCER</span>
            </div>
            <div class="pitch-stump-line top">||| BATSMAN STUMPS |||</div>
            <div class="pitch-crease-line popping-crease"></div>
            <div class="pitch-crease-line bowling-crease"></div>
            <div class="pitch-stump-line bottom">||| BOWLER END |||</div>
            <div id="landing-marker" class="landing-crosshair">🎯</div>
          </div>
        </div>
      </div>

      <!-- Real-time Line and Length Readout -->
      <div class="bowl-hud-stats">
        <span id="bowl-length-label">Length: <strong>Good Length</strong></span>
        <span id="bowl-line-label">Line: <strong>Outside Off</strong></span>
      </div>

      <!-- Bowling Release Speed & Accuracy Meter -->
      <div class="bowling-meter-wrap">
        <div class="bowl-meter-labels">
          <span>MIN SPEED</span>
          <span class="meter-label-sweet">⚡ PEAK SPEED & ACCURACY ⚡</span>
          <span>OVERSTEP</span>
        </div>
        <div class="bowl-meter-track">
          <div class="bowl-meter-sweet-zone"></div>
          <div id="bowling-speed-marker" class="bowl-meter-marker"></div>
        </div>
      </div>

      <!-- Action Button & Keyboard Hint -->
      <button type="button" id="btn-bowl" class="btn-bowl-pro">⚡ BOWL DELIVERY [SPACE] ⚡</button>
      <div class="bowl-keyboard-hint">
        💻 <strong>Laptop:</strong> Keys <strong>1–8</strong> for Delivery &bull; <strong>Arrow Keys</strong> to Aim &bull; <strong>SPACE</strong> to Bowl
      </div>
    `;
    this.el.style.display = 'none';
    this.container.appendChild(this.el);

    // Delivery type buttons
    this.el.querySelectorAll('.deliv-opt-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this._setDeliveryType(btn.dataset.type);
      });
    });

    // Pitch click targeting
    const pitchCanvas = this.el.querySelector('#pitch-canvas');
    const marker = this.el.querySelector('#landing-marker');

    const handleClick = (e) => {
      const rect = pitchCanvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const nx = Math.max(0.05, Math.min(0.95, (clientX - rect.left) / rect.width));
      const ny = Math.max(0.05, Math.min(0.95, (clientY - rect.top) / rect.height));

      // ny: 0.0 (Yorker at batsman) to 1.0 (Bouncer near bowler)
      this.landingZone.x = (nx - 0.5) * 2.0; // -1 to +1
      this.landingZone.z = ny; // 0.0 to 1.0

      marker.style.left = `${nx * 100}%`;
      marker.style.top = `${ny * 100}%`;
      this._updateLabels();
    };

    pitchCanvas.addEventListener('click', handleClick);
    pitchCanvas.addEventListener('touchstart', (e) => { e.preventDefault(); handleClick(e); });

    // Bowl button
    this.el.querySelector('#btn-bowl').addEventListener('click', (e) => {
      e.stopPropagation();
      this._bowl();
    });

    this.marker = this.el.querySelector('#bowling-speed-marker');
    this._updateMarkerVisual();
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

      // Keys 1-8 for quick delivery type selection
      const types = ['pace', 'outswing', 'inswing', 'yorker', 'bouncer', 'spin', 'leg_spin', 'slower'];
      const num = parseInt(k, 10);
      if (num >= 1 && num <= 8) {
        this._setDeliveryType(types[num - 1]);
        return;
      }

      // Arrow keys to fine-tune landing zone
      let moved = false;
      if (k === 'arrowleft' || k === 'a') {
        this.landingZone.x = Math.max(-1.0, this.landingZone.x - 0.1);
        moved = true;
      } else if (k === 'arrowright' || k === 'd') {
        this.landingZone.x = Math.min(1.0, this.landingZone.x + 0.1);
        moved = true;
      } else if (k === 'arrowup' || k === 'w') {
        this.landingZone.z = Math.max(0.05, this.landingZone.z - 0.08); // Fuller (Yorker)
        moved = true;
      } else if (k === 'arrowdown' || k === 's') {
        this.landingZone.z = Math.min(0.95, this.landingZone.z + 0.08); // Shorter (Bouncer)
        moved = true;
      }

      if (moved) {
        e.preventDefault();
        this._updateMarkerVisual();
        this._updateLabels();
      }
    });
  }

  _setDeliveryType(type) {
    this.deliveryType = type;
    this.el.querySelectorAll('.deliv-opt-btn').forEach(b => b.classList.toggle('active', b.dataset.type === type));

    // Preset ideal length for the chosen delivery
    if (type === 'yorker') this.landingZone.z = 0.10;
    else if (type === 'bouncer') this.landingZone.z = 0.85;
    else if (type === 'outswing') { this.landingZone.z = 0.44; this.landingZone.x = -0.35; }
    else if (type === 'inswing') { this.landingZone.z = 0.40; this.landingZone.x = -0.15; }
    else if (type === 'spin') { this.landingZone.z = 0.48; this.landingZone.x = 0.35; }
    else if (type === 'leg_spin') { this.landingZone.z = 0.48; this.landingZone.x = -0.35; }
    else if (type === 'slower') { this.landingZone.z = 0.35; }
    else { this.landingZone.z = 0.45; this.landingZone.x = -0.20; }

    this._updateMarkerVisual();
    this._updateLabels();
  }

  _updateMarkerVisual() {
    const marker = this.el.querySelector('#landing-marker');
    if (!marker) return;
    const nx = (this.landingZone.x / 2.0) + 0.5;
    const ny = this.landingZone.z;
    marker.style.left = `${nx * 100}%`;
    marker.style.top = `${ny * 100}%`;
  }

  _updateLabels() {
    const lengthLabel = this.el.querySelector('#bowl-length-label');
    const lineLabel = this.el.querySelector('#bowl-line-label');
    const statusBanner = this.el.querySelector('#bowl-status-banner');
    const speedDisplay = this.el.querySelector('#bowl-speed-display');

    const z = this.landingZone.z;
    let lenStr = 'Good Length';
    if (z < 0.25) lenStr = 'Yorker / Full Length';
    else if (z < 0.38) lenStr = 'Full Pitch';
    else if (z < 0.65) lenStr = 'Good Length';
    else if (z < 0.80) lenStr = 'Short of a Length';
    else lenStr = 'Bouncer / Short Pitch';

    const x = this.landingZone.x;
    let lineStr = 'Middle Stump';
    if (x < -0.5) lineStr = 'Way Outside Off';
    else if (x < -0.2) lineStr = 'Outside Off (4th Stump)';
    else if (x > 0.5) lineStr = 'Down Leg Side';
    else if (x > 0.2) lineStr = 'On the Pads (Leg Stump)';
    else lineStr = 'Middle & Off Channel';

    if (lengthLabel) lengthLabel.innerHTML = `Length: <strong>${lenStr}</strong>`;
    if (lineLabel) lineLabel.innerHTML = `Line: <strong>${lineStr}</strong>`;

    // Projected speed estimate
    const isSpin = this.deliveryType.includes('spin');
    const isSlower = this.deliveryType === 'slower';
    const isPace = !isSpin && !isSlower;
    const speedKmh = isSpin ? 88 : isSlower ? 112 : 142;

    if (statusBanner) {
      statusBanner.innerHTML = `TARGET: <strong>${lenStr}</strong> &bull; <span style="color:#ffd32a;">${this.deliveryType.toUpperCase()} (~${speedKmh} km/h)</span>`;
    }
  }

  show(options = {}) {
    this.active = true;
    this.power = 0;
    this.barDirection = 1;
    this.el.style.display = 'flex';
    this._updateLabels();
    this._animate(performance.now());

    if (options.timeout) {
      clearTimeout(this._autoTimeout);
      this._autoTimeout = setTimeout(() => {
        if (this.active) this._bowl();
      }, options.timeout);
    }
  }

  hide() {
    this.active = false;
    this.el.style.display = 'none';
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
    this.animFrame = requestAnimationFrame((t) => this._animate(t));
  }

  _bowl() {
    if (!this.active) return;
    this.hide();

    // Timing score: sweet spot between 0.50 and 0.75
    const sweetCenter = 0.62;
    const timingDiff = Math.abs(this.power - sweetCenter);
    const accuracy = Math.max(0.5, 1.0 - timingDiff * 1.5);

    if (this.onBowl) {
      this.onBowl({
        landingZone: {
          x: parseFloat(this.landingZone.x.toFixed(2)),
          z: parseFloat(this.landingZone.z.toFixed(2))
        },
        deliveryType: this.deliveryType,
        accuracy: parseFloat(accuracy.toFixed(2)),
        power: parseFloat(this.power.toFixed(2))
      });
    }
  }

  destroy() {
    this.hide();
    if (this.el.parentNode) this.container.removeChild(this.el);
  }
}

