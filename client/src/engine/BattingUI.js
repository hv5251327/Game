// BattingUI: Manages the batting timing bar and shot type selection
export class BattingUI {
  constructor(container) {
    this.container = container;
    this.active = false;
    this.timing = 0;
    this.direction = 0;
    this.shotType = 'drive';
    this.power = 0;
    this.barDirection = 1;
    this.barSpeed = 2.2;
    this.onSwing = null;
    this.animFrame = null;
    this.lastTime = 0;
    this._build();
  }

  _build() {
    this.el = document.createElement('div');
    this.el.id = 'batting-ui';
    this.el.innerHTML = `
      <div class="bat-ui-title">⚡ YOUR TURN TO BAT!</div>
      <div class="shot-type-row">
        <button class="shot-btn active" data-shot="drive">🏏 Drive</button>
        <button class="shot-btn" data-shot="loft">🚀 Loft</button>
        <button class="shot-btn" data-shot="sweep">↗ Sweep</button>
        <button class="shot-btn" data-shot="cut">✂ Cut</button>
        <button class="shot-btn" data-shot="defend">🛡 Defend</button>
      </div>
      <div class="direction-row">
        <label>Shot Direction:</label>
        <input type="range" id="shot-direction" min="-1" max="1" step="0.01" value="0">
        <span id="direction-label">Straight</span>
      </div>
      <div class="timing-bar-wrapper">
        <div class="timing-bar-bg">
          <div class="timing-sweet-zone"></div>
          <div id="timing-marker" class="timing-marker"></div>
        </div>
        <div class="timing-label">Click/Tap at the RIGHT MOMENT to swing!</div>
      </div>
      <button id="btn-swing" class="btn-swing">🏏 SWING BAT!</button>
    `;
    this.el.style.display = 'none';
    this.container.appendChild(this.el);

    // Shot type buttons
    this.el.querySelectorAll('.shot-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.el.querySelectorAll('.shot-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.shotType = btn.dataset.shot;
        this._updateBarSpeed();
      });
    });

    // Direction slider
    const dirSlider = this.el.querySelector('#shot-direction');
    const dirLabel = this.el.querySelector('#direction-label');
    dirSlider.addEventListener('input', () => {
      this.direction = parseFloat(dirSlider.value);
      if (this.direction < -0.3) dirLabel.textContent = '← Leg Side';
      else if (this.direction > 0.3) dirLabel.textContent = 'Off Side →';
      else dirLabel.textContent = 'Straight';
    });

    // Swing button
    const swingBtn = this.el.querySelector('#btn-swing');
    swingBtn.addEventListener('click', () => this._swing());
    swingBtn.addEventListener('touchstart', (e) => { e.preventDefault(); this._swing(); });
    this.marker = this.el.querySelector('#timing-marker');
  }

  _updateBarSpeed() {
    const speeds = { defend: 1.0, drive: 2.2, cut: 2.5, sweep: 2.0, loft: 2.8 };
    this.barSpeed = speeds[this.shotType] || 2.2;
  }

  show(options = {}) {
    this.active = true;
    this.timing = 0;
    this.barDirection = 1;
    this.power = 0;
    this.el.style.display = 'flex';
    this._updateBarSpeed();
    this._animate(performance.now());
    if (options.timeout) {
      this._autoTimeout = setTimeout(() => {
        if (this.active) this._swing(); // auto-swing on timeout
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
    // Update marker position
    if (this.marker) this.marker.style.left = `${this.power * 100}%`;
    this.animFrame = requestAnimationFrame((t) => this._animate(t));
  }

  _swing() {
    if (!this.active) return;
    this.hide();
    this.timing = this.power;
    if (this.onSwing) {
      this.onSwing({
        shotType: this.shotType,
        timing: this.timing,
        direction: this.direction,
        power: this.timing
      });
    }
  }

  destroy() {
    this.hide();
    this.container.removeChild(this.el);
  }
}
