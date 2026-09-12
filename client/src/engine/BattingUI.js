// BattingUI: Large prominent direction compass with laptop controls & precision timing bar
export class BattingUI {
  constructor(container) {
    this.container = container;
    this.active = false;
    this.characterId = 'ant_batter_01';
    this.direction = 'forward'; // 'forward' | 'backward' | 'left' | 'right' | 'forward_left' | 'forward_right' | 'backward_left' | 'backward_right'
    this.shotType = 'drive';
    this.power = 0.75;
    this.barDirection = 1;
    this.barSpeed = 2.2;
    this.onSwing = null;
    this.animFrame = null;
    this.lastTime = 0;
    this._build();
    this._bindKeyboard();
  }

  _build() {
    this.el = document.createElement('div');
    this.el.id = 'batting-ui';
    this.el.className = 'batting-controller-large';
    this.el.innerHTML = `
      <!-- Header Banner -->
      <div class="bat-header-large">
        <div class="bat-aim-title">
          <span class="bat-icon">🏏</span>
          <span class="bat-main-text">BATSMAN CONTROL</span>
        </div>
        <div class="bat-current-shot-badge" id="bat-current-shot-label">
          AIM: <strong>⬆ STRAIGHT DRIVE [W/↑]</strong>
        </div>
      </div>

      <!-- Large Precision Timing Bar -->
      <div class="timing-meter-container">
        <div class="timing-meter-labels">
          <span class="timing-label-early">EARLY</span>
          <span class="timing-label-perfect">⚡ SWEET SPOT ⚡</span>
          <span class="timing-label-late">LATE</span>
        </div>
        <div class="timing-bar-track">
          <div class="timing-sweet-zone"></div>
          <div id="batting-timing-marker" class="timing-bar-marker"></div>
        </div>
      </div>

      <!-- BIG 8-Direction Aiming Compass -->
      <div class="shot-direction-box-large">
        <div class="direction-grid-large">
          <button type="button" class="dir-btn-large" data-dir="forward_left" title="Mid-Wicket / On Drive (Q / 7)">
            <span class="dir-arrow">↖</span>
            <span class="dir-name">MID-WICKET</span>
            <span class="dir-key">Q / 7</span>
          </button>

          <button type="button" class="dir-btn-large active" data-dir="forward" title="Straight Drive (↑ / W / 8)">
            <span class="dir-arrow">⬆</span>
            <span class="dir-name">STRAIGHT</span>
            <span class="dir-key">W / ↑</span>
          </button>

          <button type="button" class="dir-btn-large" data-dir="forward_right" title="Cover Drive (E / 9)">
            <span class="dir-arrow">↗</span>
            <span class="dir-name">COVERS</span>
            <span class="dir-key">E / 9</span>
          </button>

          <button type="button" class="dir-btn-large" data-dir="left" title="Square Leg / Pull (← / A / 4)">
            <span class="dir-arrow">⬅</span>
            <span class="dir-name">SQUARE LEG</span>
            <span class="dir-key">A / ←</span>
          </button>

          <!-- BIG CENTER SWING BUTTON -->
          <button type="button" id="btn-big-swing" class="dir-btn-swing" title="CLICK or press SPACE to Swing!">
            <span class="swing-icon">🏏</span>
            <span class="swing-text">SWING!</span>
            <span class="swing-key">[SPACE]</span>
          </button>

          <button type="button" class="dir-btn-large" data-dir="right" title="Point / Cut (→ / D / 6)">
            <span class="dir-arrow">➡</span>
            <span class="dir-name">POINT</span>
            <span class="dir-key">D / →</span>
          </button>

          <button type="button" class="dir-btn-large" data-dir="backward_left" title="Fine Leg Glance (Z / 1)">
            <span class="dir-arrow">↙</span>
            <span class="dir-name">FINE LEG</span>
            <span class="dir-key">Z / 1</span>
          </button>

          <button type="button" class="dir-btn-large" data-dir="backward" title="Defend / Block (↓ / S / 2)">
            <span class="dir-arrow">⬇</span>
            <span class="dir-name">DEFEND</span>
            <span class="dir-key">S / ↓</span>
          </button>

          <button type="button" class="dir-btn-large" data-dir="backward_right" title="Third Man Glance (C / 3)">
            <span class="dir-arrow">↘</span>
            <span class="dir-name">THIRD MAN</span>
            <span class="dir-key">C / 3</span>
          </button>
        </div>
      </div>

      <!-- Shot Style Pills -->
      <div class="shot-pills-row">
        <button type="button" class="shot-pill active" data-shot="drive">💥 Drive</button>
        <button type="button" class="shot-pill" data-shot="loft">🚀 Loft [L]</button>
        <button type="button" class="shot-pill" data-shot="sweep">🧹 Sweep</button>
        <button type="button" class="shot-pill" data-shot="cut">⚔️ Cut</button>
        <button type="button" class="shot-pill" data-shot="defend">🛡️ Defend</button>
      </div>

      <!-- Laptop / Desktop Keyboard Guide -->
      <div class="laptop-keyboard-hint">
        💻 <strong>Laptop:</strong> WASD or Arrow Keys to Aim &bull; <strong>SPACE</strong> to Swing &bull; <strong>L</strong> for Loft
      </div>
    `;
    this.el.style.display = 'none';
    this.container.appendChild(this.el);

    // Direction buttons
    this.dirLabel = this.el.querySelector('#bat-current-shot-label');
    this.el.querySelectorAll('.dir-btn-large').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this._setDirection(btn.dataset.dir);
      });
    });

    // Shot Mode Pills
    this.el.querySelectorAll('.shot-pill').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.el.querySelectorAll('.shot-pill').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.shotType = btn.dataset.shot;
        if (this.shotType === 'sweep') this._setDirection('left');
        else if (this.shotType === 'cut') this._setDirection('right');
        else this._updateShotLabel();
      });
    });

    // Big Center Swing Button
    const swingBtn = this.el.querySelector('#btn-big-swing');
    swingBtn.addEventListener('click', (e) => { e.stopPropagation(); this._swing(); });
    swingBtn.addEventListener('touchstart', (e) => { e.preventDefault(); e.stopPropagation(); this._swing(); });

    this.marker = this.el.querySelector('#batting-timing-marker');
  }

  _bindKeyboard() {
    window.addEventListener('keydown', (e) => {
      if (!this.active) return;

      const k = e.key.toLowerCase();
      if (k === ' ' || k === 'enter') {
        e.preventDefault();
        this._swing();
        return;
      }

      // Laptop keyboard direction mappings
      if (k === 'arrowup' || k === 'w' || k === '8') {
        this._setDirection('forward');
      } else if (k === 'arrowdown' || k === 's' || k === '2') {
        this._setDirection('backward');
      } else if (k === 'arrowleft' || k === 'a' || k === '4') {
        this._setDirection('left');
      } else if (k === 'arrowright' || k === 'd' || k === '6') {
        this._setDirection('right');
      } else if (k === 'q' || k === '7') {
        this._setDirection('forward_left');
      } else if (k === 'e' || k === '9') {
        this._setDirection('forward_right');
      } else if (k === 'z' || k === '1') {
        this._setDirection('backward_left');
      } else if (k === 'c' || k === '3') {
        this._setDirection('backward_right');
      } else if (k === 'l') {
        // Toggle Loft
        this.shotType = (this.shotType === 'loft') ? 'drive' : 'loft';
        this.el.querySelectorAll('.shot-pill').forEach(b => b.classList.toggle('active', b.dataset.shot === this.shotType));
        this._updateShotLabel();
      }
    });
  }

  _setDirection(dir) {
    this.direction = dir;
    this.el.querySelectorAll('.dir-btn-large').forEach(b => b.classList.remove('active'));
    const target = this.el.querySelector(`.dir-btn-large[data-dir="${dir}"]`);
    if (target) target.classList.add('active');
    this._updateShotLabel();
  }

  _updateShotLabel() {
    const dirMap = {
      forward: '⬆ STRAIGHT DRIVE [W/↑]',
      forward_left: '↖ MID-WICKET [Q/7]',
      forward_right: '↗ COVER DRIVE [E/9]',
      left: '⬅ SQUARE LEG / PULL [A/←]',
      right: '➡ POINT / CUT [D/→]',
      backward_left: '↙ FINE LEG [Z/1]',
      backward_right: '↘ THIRD MAN [C/3]',
      backward: '⬇ DEFEND / BLOCK [S/↓]'
    };
    const shotName = this.shotType.toUpperCase();
    if (this.dirLabel) {
      this.dirLabel.innerHTML = `AIM: <strong>${dirMap[this.direction] || this.direction}</strong> &bull; <span style="color:#ffd32a;">${shotName}</span>`;
    }
  }

  show(options = {}) {
    this.active = true;
    this.power = 0;
    this.barDirection = 1;
    this.el.style.display = 'flex';
    this._updateShotLabel();
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

    if (this.marker) {
      this.marker.style.left = `${this.power * 100}%`;
    }
    this.animFrame = requestAnimationFrame((t) => this._animate(t));
  }

  _swing() {
    if (!this.active) return;
    this.hide();

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
