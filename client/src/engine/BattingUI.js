// BattingUI: 8-Direction System, Batter Choice, & Precision Timing Bar
export class BattingUI {
  constructor(container) {
    this.container = container;
    this.active = false;
    this.characterId = 'ant_batter_01'; // 'ant_batter_01' | 'beetle_power_batter_01' | 'grasshopper_agile_batter_01'
    this.direction = 'forward'; // 8 allowed values
    this.shotType = 'drive';
    this.power = 0.75;
    this.barDirection = 1;
    this.barSpeed = 2.4;
    this.onSwing = null;
    this.animFrame = null;
    this.lastTime = 0;
    this._build();
  }

  _build() {
    this.el = document.createElement('div');
    this.el.id = 'batting-ui';
    this.el.innerHTML = `
      <div class="bat-ui-title">🏏 3D BAT CONTROLLER</div>

      <!-- Batter Species Switcher -->
      <div class="batter-select-row">
        <label>Batter:</label>
        <div class="batter-pills">
          <button class="batter-pill active" data-char="ant_batter_01">🐜 Ant (Balanced)</button>
          <button class="batter-pill" data-char="beetle_power_batter_01">🪲 Beetle (Power)</button>
          <button class="batter-pill" data-char="grasshopper_agile_batter_01">🦗 Hopper (Agile)</button>
        </div>
      </div>

      <!-- Shot Style -->
      <div class="shot-type-row">
        <button class="shot-btn active" data-shot="drive">🏏 Drive</button>
        <button class="shot-btn" data-shot="loft">🚀 Loft</button>
        <button class="shot-btn" data-shot="sweep">↗ Sweep</button>
        <button class="shot-btn" data-shot="cut">✂ Cut</button>
        <button class="shot-btn" data-shot="defend">🛡 Defend</button>
      </div>

      <!-- 8-Direction System -->
      <div class="direction-system-container">
        <div class="dir-title">Swing Direction: <strong id="dir-name-label">Forward (Straight)</strong></div>
        <div class="dir-compass-grid">
          <button class="dir-btn" data-dir="forward_left" title="Forward-Left (Mid-Wicket)">↖ FL</button>
          <button class="dir-btn active" data-dir="forward" title="Forward (Straight Drive)">⬆ FWD</button>
          <button class="dir-btn" data-dir="forward_right" title="Forward-Right (Cover Drive)">↗ FR</button>
          <button class="dir-btn" data-dir="left" title="Left (Square Leg / Sweep)">⬅ L</button>
          <div class="dir-center">🏏</div>
          <button class="dir-btn" data-dir="right" title="Right (Point / Cut)">➡ R</button>
          <button class="dir-btn" data-dir="backward_left" title="Backward-Left (Fine Leg)">↙ BL</button>
          <button class="dir-btn" data-dir="backward" title="Backward (Block)">⬇ BWD</button>
          <button class="dir-btn" data-dir="backward_right" title="Backward-Right (Third Man)">↘ BR</button>
        </div>
      </div>

      <!-- Precision Timing / Power Bar -->
      <div class="timing-bar-wrapper">
        <div class="timing-bar-bg">
          <div class="timing-sweet-zone"></div>
          <div id="timing-marker" class="timing-marker"></div>
        </div>
        <div class="timing-label">⚡ Click SWING when the marker hits the GOLD SWEET ZONE!</div>
      </div>

      <button id="btn-swing" class="btn-swing">💥 SWING BAT!</button>
    `;
    this.el.style.display = 'none';
    this.container.appendChild(this.el);

    // Batter pills
    this.el.querySelectorAll('.batter-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        this.el.querySelectorAll('.batter-pill').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.characterId = btn.dataset.char;
        this._updateSpeedByCharacter();
      });
    });

    // Shot type buttons
    this.el.querySelectorAll('.shot-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.el.querySelectorAll('.shot-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.shotType = btn.dataset.shot;
        if (this.shotType === 'sweep') {
          this._setDirection('left');
        } else if (this.shotType === 'cut') {
          this._setDirection('right');
        } else if (this.shotType === 'loft') {
          this._setDirection('forward');
        }
      });
    });

    // 8-Direction buttons
    const dirLabel = this.el.querySelector('#dir-name-label');
    const dirNames = {
      forward: 'Forward (Straight Drive)',
      forward_left: 'Forward-Left (Mid-Wicket / On Drive)',
      forward_right: 'Forward-Right (Cover Drive)',
      left: 'Left (Square Leg / Sweep)',
      right: 'Right (Point / Square Cut)',
      backward_left: 'Backward-Left (Fine Leg Glance)',
      backward_right: 'Backward-Right (Late Cut / Third Man)',
      backward: 'Backward (Defensive Block)'
    };

    this.el.querySelectorAll('.dir-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this._setDirection(btn.dataset.dir);
      });
    });

    // Swing button
    const swingBtn = this.el.querySelector('#btn-swing');
    swingBtn.addEventListener('click', () => this._swing());
    swingBtn.addEventListener('touchstart', (e) => { e.preventDefault(); this._swing(); });

    this.marker = this.el.querySelector('#timing-marker');
    this.dirLabel = dirLabel;
    this.dirNames = dirNames;
  }

  _setDirection(dir) {
    this.direction = dir;
    this.el.querySelectorAll('.dir-btn').forEach(b => b.classList.remove('active'));
    const target = this.el.querySelector(`.dir-btn[data-dir="${dir}"]`);
    if (target) target.classList.add('active');
    if (this.dirLabel) this.dirLabel.textContent = this.dirNames[dir] || dir;
  }

  _updateSpeedByCharacter() {
    if (this.characterId === 'beetle_power_batter_01') {
      this.barSpeed = 1.8; // Heavy bat, slightly slower windup
    } else if (this.characterId === 'grasshopper_agile_batter_01') {
      this.barSpeed = 3.2; // Rapid agile timing
    } else {
      this.barSpeed = 2.4; // Ant balanced
    }
  }

  show(options = {}) {
    this.active = true;
    this.power = 0;
    this.barDirection = 1;
    this.el.style.display = 'flex';
    this._updateSpeedByCharacter();
    this._animate(performance.now());

    if (options.timeout) {
      clearTimeout(this._autoTimeout);
      this._autoTimeout = setTimeout(() => {
        if (this.active) this._swing();
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

    if (this.marker) this.marker.style.left = `${this.power * 100}%`;
    this.animFrame = requestAnimationFrame((t) => this._animate(t));
  }

  _swing() {
    if (!this.active) return;
    this.hide();

    // The standardized bat controller command output
    const command = {
      character_id: this.characterId,
      action: 'swing_bat',
      direction: this.direction,
      power: parseFloat(this.power.toFixed(3)),
      shotType: this.shotType
    };

    if (this.onSwing) {
      this.onSwing(command);
    }
  }

  destroy() {
    this.hide();
    if (this.el.parentNode) this.container.removeChild(this.el);
  }
}
