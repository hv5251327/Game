// BattingUI: Compact Top-Left Meter with Keyboard/Laptop Controls & Direction System
export class BattingUI {
  constructor(container) {
    this.container = container;
    this.active = false;
    this.characterId = 'ant_batter_01';
    this.direction = 'forward'; // 'forward' | 'backward' | 'left' | 'right' | 'forward_left' | 'forward_right' | 'backward_left' | 'backward_right'
    this.shotType = 'drive';
    this.power = 0.75;
    this.barDirection = 1;
    this.barSpeed = 2.4;
    this.onSwing = null;
    this.animFrame = null;
    this.lastTime = 0;
    this._build();
    this._bindKeyboard();
  }

  _build() {
    this.el = document.createElement('div');
    this.el.id = 'batting-ui';
    this.el.className = 'top-left-batting-ui';
    this.el.innerHTML = `
      <div class="mini-bat-header">
        <span class="bat-title">🏏 BAT: <span id="ui-current-dir">FWD</span></span>
        <span class="bat-hint-key">[SPACE: SWING]</span>
      </div>

      <!-- Small Precision Timing Bar -->
      <div class="mini-timing-bar-bg">
        <div class="mini-sweet-zone"></div>
        <div id="mini-timing-marker" class="mini-timing-marker"></div>
      </div>

      <!-- Compact 8-Direction & Shot Selector -->
      <div class="mini-direction-grid">
        <button class="dir-btn-mini" data-dir="forward_left" title="On Drive (Q / Num7)">↖</button>
        <button class="dir-btn-mini active" data-dir="forward" title="Straight Drive (↑ / W / Num8)">⬆</button>
        <button class="dir-btn-mini" data-dir="forward_right" title="Cover Drive (E / Num9)">↗</button>
        <button class="dir-btn-mini" data-dir="left" title="Square Leg / Sweep (← / A / Num4)">⬅</button>
        <button id="btn-mini-swing" class="dir-btn-center" title="Click or Press SPACE to Swing!">🏏</button>
        <button class="dir-btn-mini" data-dir="right" title="Point / Cut (→ / D / Num6)">➡</button>
        <button class="dir-btn-mini" data-dir="backward_left" title="Fine Leg Glance (Z / Num1)">↙</button>
        <button class="dir-btn-mini" data-dir="backward" title="Defend / Block (↓ / S / Num2)">⬇</button>
        <button class="dir-btn-mini" data-dir="backward_right" title="Third Man (C / Num3)">↘</button>
      </div>

      <!-- Quick Shot Mode Pills -->
      <div class="mini-shot-pills">
        <button class="shot-pill-mini active" data-shot="drive">Drive</button>
        <button class="shot-pill-mini" data-shot="loft">Loft</button>
        <button class="shot-pill-mini" data-shot="sweep">Sweep</button>
        <button class="shot-pill-mini" data-shot="cut">Cut</button>
        <button class="shot-pill-mini" data-shot="defend">Def</button>
      </div>
    `;
    this.el.style.display = 'none';
    this.container.appendChild(this.el);

    // Direction Buttons
    this.dirLabel = this.el.querySelector('#ui-current-dir');
    this.el.querySelectorAll('.dir-btn-mini').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this._setDirection(btn.dataset.dir);
      });
    });

    // Shot Mode Pills
    this.el.querySelectorAll('.shot-pill-mini').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.el.querySelectorAll('.shot-pill-mini').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.shotType = btn.dataset.shot;
        if (this.shotType === 'sweep') this._setDirection('left');
        else if (this.shotType === 'cut') this._setDirection('right');
      });
    });

    // Center Swing Button
    const swingBtn = this.el.querySelector('#btn-mini-swing');
    swingBtn.addEventListener('click', (e) => { e.stopPropagation(); this._swing(); });
    swingBtn.addEventListener('touchstart', (e) => { e.preventDefault(); e.stopPropagation(); this._swing(); });

    this.marker = this.el.querySelector('#mini-timing-marker');
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
        // Quick toggle Loft
        this.shotType = 'loft';
        this.el.querySelectorAll('.shot-pill-mini').forEach(b => b.classList.toggle('active', b.dataset.shot === 'loft'));
      }
    });
  }

  _setDirection(dir) {
    this.direction = dir;
    this.el.querySelectorAll('.dir-btn-mini').forEach(b => b.classList.remove('active'));
    const target = this.el.querySelector(`.dir-btn-mini[data-dir="${dir}"]`);
    if (target) target.classList.add('active');

    const shortNames = {
      forward: 'FWD (Drive)',
      forward_left: 'FWD-L (On)',
      forward_right: 'FWD-R (Cover)',
      left: 'LEFT (Sweep)',
      right: 'RIGHT (Cut)',
      backward_left: 'BWD-L (Leg)',
      backward_right: 'BWD-R (3rd)',
      backward: 'BWD (Block)'
    };
    if (this.dirLabel) this.dirLabel.textContent = shortNames[dir] || dir;
  }

  show(options = {}) {
    this.active = true;
    this.power = 0;
    this.barDirection = 1;
    this.el.style.display = 'flex';
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
