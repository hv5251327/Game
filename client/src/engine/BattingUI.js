// BattingUI: WCC2-style Circular Timing Arc + Shot Direction
// Circular arc fills as ball arrives; tap SWING in the green zone for a clean hit
export class BattingUI {
  constructor(container) {
    this.container = container;
    this.active = false;
    this.characterId = 'ant_batter_01';
    this.direction = 'forward';
    this.shotType = 'drive';
    this.power = 0;
    this.barDirection = 1;
    // Slower arc (fills in ~1.6s) = easier timing window, more forgiving
    this.barSpeed = 1.6;
    this.onSwing = null;
    // Force all batsmen as RHB — no LHB option
    this.stance = { hand: 'RHB', depth: 'normal', guard: 'middle' };
    this.onStanceChange = null;
    this.animFrame = null;
    this.lastTime = 0;
    this._build();
    this._bindKeyboard();
  }

  _build() {
    this.el = document.createElement('div');
    this.el.id = 'batting-ui';
    this.el.style.cssText = `
      position:fixed; bottom:18px; left:18px;
      display:none; flex-direction:column; align-items:center; gap:10px;
      background:rgba(10,16,30,0.92); border:2px solid rgba(255,255,255,0.15);
      border-radius:18px; padding:16px 18px 14px;
      box-shadow:0 4px 32px rgba(0,0,0,0.7); z-index:900;
      font-family:'Segoe UI',sans-serif; min-width:240px;
    `;

    this.el.innerHTML = `
      <!-- Header -->
      <div style="display:flex;align-items:center;gap:8px;width:100%;">
        <span style="font-size:1.1rem;">🏏</span>
        <span style="color:#fff;font-weight:800;font-size:0.95rem;letter-spacing:1px;">BATTING</span>
        <span id="bat-timer-badge" style="margin-left:auto;background:rgba(255,255,255,0.1);border-radius:20px;padding:2px 10px;font-size:0.8rem;color:#ffd32a;">⏱ <span id="bat-timer-count">7</span>s</span>
      </div>

      <!-- Shot Type Pills — including Pull & Hook for bouncers -->
      <div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:center;">
        <button class="bat-pill active" data-shot="drive"   style="padding:4px 10px;border-radius:20px;border:1px solid rgba(255,255,255,0.3);background:rgba(76,217,100,0.2);color:#4CD964;font-size:0.72rem;cursor:pointer;font-weight:700;">💥 Drive</button>
        <button class="bat-pill"        data-shot="loft"    style="padding:4px 10px;border-radius:20px;border:1px solid rgba(255,255,255,0.12);background:transparent;color:rgba(255,255,255,0.55);font-size:0.72rem;cursor:pointer;">🚀 Loft [L]</button>
        <button class="bat-pill"        data-shot="pull"    style="padding:4px 10px;border-radius:20px;border:1px solid rgba(255,255,255,0.12);background:transparent;color:rgba(255,255,255,0.55);font-size:0.72rem;cursor:pointer;">⬆ Pull [P]</button>
        <button class="bat-pill"        data-shot="hook"    style="padding:4px 10px;border-radius:20px;border:1px solid rgba(255,255,255,0.12);background:transparent;color:rgba(255,255,255,0.55);font-size:0.72rem;cursor:pointer;">↩ Hook [H]</button>
        <button class="bat-pill"        data-shot="sweep"   style="padding:4px 10px;border-radius:20px;border:1px solid rgba(255,255,255,0.12);background:transparent;color:rgba(255,255,255,0.55);font-size:0.72rem;cursor:pointer;">🧹 Sweep</button>
        <button class="bat-pill"        data-shot="cut"     style="padding:4px 10px;border-radius:20px;border:1px solid rgba(255,255,255,0.12);background:transparent;color:rgba(255,255,255,0.55);font-size:0.72rem;cursor:pointer;">⚔️ Cut</button>
        <button class="bat-pill"        data-shot="defend"  style="padding:4px 10px;border-radius:20px;border:1px solid rgba(255,255,255,0.12);background:transparent;color:rgba(255,255,255,0.55);font-size:0.72rem;cursor:pointer;">🛡️ Defend</button>
      </div>

      <!-- Circular Timing Arc + Direction Ring -->
      <div style="position:relative;width:160px;height:160px;">
        <svg id="bat-arc-svg" width="160" height="160" style="position:absolute;top:0;left:0;">
          <!-- Outer track -->
          <circle cx="80" cy="80" r="68" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="13"/>
          <!-- Green zone 50%–75% -->
          <circle id="bat-sweet-arc" cx="80" cy="80" r="68" fill="none"
            stroke="rgba(76,217,100,0.3)" stroke-width="13"
            stroke-dasharray="107.4 319.9" stroke-dashoffset="214.2"
            style="transform:rotate(-90deg);transform-origin:80px 80px;"/>
          <!-- Timing fill arc -->
          <circle id="bat-timing-arc" cx="80" cy="80" r="68" fill="none"
            stroke="#4CD964" stroke-width="13" stroke-linecap="round"
            stroke-dasharray="0 427.3" stroke-dashoffset="0"
            style="transform:rotate(-90deg);transform-origin:80px 80px;"/>
          <!-- Dot marker -->
          <circle id="bat-dot" cx="80" cy="12" r="7" fill="#fff" style="transform-origin:80px 80px;"/>
        </svg>

        <!-- Direction buttons positioned around the circle -->
        <button class="bat-dir-btn active" data-dir="forward"
          style="position:absolute;top:4px;left:50%;transform:translateX(-50%);
            padding:3px 7px;border-radius:8px;border:1px solid rgba(76,217,100,0.6);
            background:rgba(76,217,100,0.15);color:#4CD964;font-size:0.65rem;cursor:pointer;font-weight:700;white-space:nowrap;">⬆ STR<br>[W]</button>
        <button class="bat-dir-btn" data-dir="forward_right"
          style="position:absolute;top:26px;right:4px;transform:none;
            padding:3px 7px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);
            background:transparent;color:rgba(255,255,255,0.5);font-size:0.65rem;cursor:pointer;white-space:nowrap;">↗ COV<br>[E]</button>
        <button class="bat-dir-btn" data-dir="right"
          style="position:absolute;top:50%;right:2px;transform:translateY(-50%);
            padding:3px 7px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);
            background:transparent;color:rgba(255,255,255,0.5);font-size:0.65rem;cursor:pointer;white-space:nowrap;">➡ PT<br>[D]</button>
        <button class="bat-dir-btn" data-dir="left"
          style="position:absolute;top:50%;left:2px;transform:translateY(-50%);
            padding:3px 7px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);
            background:transparent;color:rgba(255,255,255,0.5);font-size:0.65rem;cursor:pointer;white-space:nowrap;">⬅ SL<br>[A]</button>
        <button class="bat-dir-btn" data-dir="forward_left"
          style="position:absolute;top:26px;left:4px;transform:none;
            padding:3px 7px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);
            background:transparent;color:rgba(255,255,255,0.5);font-size:0.65rem;cursor:pointer;white-space:nowrap;">↖ MW<br>[Q]</button>
        <button class="bat-dir-btn" data-dir="backward"
          style="position:absolute;bottom:4px;left:50%;transform:translateX(-50%);
            padding:3px 7px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);
            background:transparent;color:rgba(255,255,255,0.5);font-size:0.65rem;cursor:pointer;white-space:nowrap;">⬇ DEF<br>[S]</button>

        <!-- BIG SWING BUTTON in center -->
        <button id="btn-bat-swing"
          style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
            width:64px;height:64px;border-radius:50%;border:3px solid #4CD964;
            background:rgba(76,217,100,0.15);color:#fff;font-weight:900;
            font-size:0.75rem;cursor:pointer;line-height:1.2;
            box-shadow:0 0 18px rgba(76,217,100,0.35);">
          🏏<br>SWING<br><span style="font-size:0.6rem;color:#4CD964;">[SPACE]</span>
        </button>
      </div>

      <!-- Shot label -->
      <div id="bat-shot-label" style="color:rgba(255,255,255,0.7);font-size:0.78rem;text-align:center;">
        AIM: <strong style="color:#fff;">⬆ STRAIGHT DRIVE</strong>
      </div>

      <div style="color:rgba(255,255,255,0.35);font-size:0.65rem;text-align:center;">
        WASD / Arrow Keys to Aim &bull; SPACE to Swing &bull; L = Loft
      </div>
    `;

    this.el.style.display = 'none';
    this.container.appendChild(this.el);

    // Shot pills
    this.el.querySelectorAll('.bat-pill').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.el.querySelectorAll('.bat-pill').forEach(b => {
          b.style.background = 'transparent';
          b.style.color = 'rgba(255,255,255,0.55)';
          b.style.borderColor = 'rgba(255,255,255,0.12)';
        });
        btn.style.background = 'rgba(76,217,100,0.2)';
        btn.style.color = '#4CD964';
        btn.style.borderColor = 'rgba(255,255,255,0.3)';
        this.shotType = btn.dataset.shot;
        if (this.shotType === 'sweep') this._setDirection('left');
        else if (this.shotType === 'cut') this._setDirection('right');
        else this._updateShotLabel();
      });
    });

    // Direction buttons
    this.el.querySelectorAll('.bat-dir-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this._setDirection(btn.dataset.dir);
      });
    });

    // Swing button
    const swingBtn = this.el.querySelector('#btn-bat-swing');
    swingBtn.addEventListener('click', (e) => { e.stopPropagation(); this._swing(); });
    swingBtn.addEventListener('touchstart', (e) => { e.preventDefault(); e.stopPropagation(); this._swing(); });

    // Cache arc
    this._timingArc = this.el.querySelector('#bat-timing-arc');
    this._batDot = this.el.querySelector('#bat-dot');
  }

  _bindKeyboard() {
    window.addEventListener('keydown', (e) => {
      if (!this.active) return;
      const k = e.key.toLowerCase();

      if (k === ' ' || k === 'enter') { e.preventDefault(); this._swing(); return; }
      if (k === 'g') { e.preventDefault(); this._toggleDepth(); return; }
      if (k === 'l') { this.shotType = (this.shotType === 'loft') ? 'drive' : 'loft'; this._refreshPills(); this._updateShotLabel(); return; }
      if (k === 'p') { this.shotType = 'pull'; this._refreshPills(); this._setDirection('left'); return; }
      if (k === 'h') { this.shotType = 'hook'; this._refreshPills(); this._setDirection('forward_left'); return; }

      if (k === 'arrowup' || k === 'w') this._setDirection('forward');
      else if (k === 'arrowdown' || k === 's') this._setDirection('backward');
      else if (k === 'arrowleft' || k === 'a') this._setDirection('left');
      else if (k === 'arrowright' || k === 'd') this._setDirection('right');
      else if (k === 'q' || k === '7') this._setDirection('forward_left');
      else if (k === 'e' || k === '9') this._setDirection('forward_right');
      else if (k === 'z' || k === '1') this._setDirection('backward_left');
      else if (k === 'c' || k === '3') this._setDirection('backward_right');
    });
  }

  _refreshPills() {
    this.el.querySelectorAll('.bat-pill').forEach(b => {
      const active = (b.dataset.shot === this.shotType);
      b.style.background = active ? 'rgba(76,217,100,0.2)' : 'transparent';
      b.style.color = active ? '#4CD964' : 'rgba(255,255,255,0.55)';
      b.style.borderColor = active ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.12)';
    });
  }

  _setDirection(dir) {
    this.direction = dir;
    this.el.querySelectorAll('.bat-dir-btn').forEach(b => {
      const active = (b.dataset.dir === dir);
      b.style.background = active ? 'rgba(76,217,100,0.15)' : 'transparent';
      b.style.color = active ? '#4CD964' : 'rgba(255,255,255,0.5)';
      b.style.borderColor = active ? 'rgba(76,217,100,0.6)' : 'rgba(255,255,255,0.15)';
    });
    this._updateShotLabel();
  }

  _updateShotLabel() {
    const dirMap = {
      forward: '⬆ STRAIGHT DRIVE',
      forward_left: '↖ MID-WICKET',
      forward_right: '↗ COVER DRIVE',
      left: '⬅ SQUARE LEG / PULL',
      right: '➡ POINT / CUT',
      backward_left: '↙ FINE LEG',
      backward_right: '↘ THIRD MAN',
      backward: '⬇ DEFEND / BLOCK'
    };
    const lbl = this.el.querySelector('#bat-shot-label');
    if (lbl) lbl.innerHTML = `AIM: <strong style="color:#fff;">${dirMap[this.direction] || this.direction}</strong> &bull; <span style="color:#ffd32a;">${this.shotType.toUpperCase()}</span>`;
  }

  _toggleHand() {
    this.stance.hand = this.stance.hand === 'RHB' ? 'LHB' : 'RHB';
    if (this.onStanceChange) this.onStanceChange({ ...this.stance });
  }

  _toggleDepth() {
    const order = ['normal', 'deep', 'forward'];
    this.stance.depth = order[(order.indexOf(this.stance.depth) + 1) % order.length];
    if (this.onStanceChange) this.onStanceChange({ ...this.stance });
  }

  show(options = {}) {
    this.active = true;
    this.power = 0;
    this.barDirection = 1;
    this.el.style.display = 'flex';
    this._updateShotLabel();
    this._animate(performance.now());

    const totalMs = options.timeout || 7000;
    this.remainingSec = Math.round(totalMs / 1000);
    const timerEl = this.el.querySelector('#bat-timer-count');
    if (timerEl) timerEl.textContent = String(this.remainingSec);

    clearInterval(this._countdownInterval);
    this._countdownInterval = setInterval(() => {
      this.remainingSec--;
      if (timerEl) timerEl.textContent = String(Math.max(0, this.remainingSec));
      if (this.remainingSec <= 0) clearInterval(this._countdownInterval);
    }, 1000);

    clearTimeout(this._autoTimeout);
    this._autoTimeout = setTimeout(() => { if (this.active) this._swing(); }, totalMs);
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
    const delta = Math.min((now - (this.lastTime || now)) / 1000, 0.08);
    this.lastTime = now;

    this.power += this.barDirection * this.barSpeed * delta;
    if (this.power >= 1) { this.power = 1; this.barDirection = -1; }
    if (this.power <= 0) { this.power = 0; this.barDirection = 1; }

    const circumference = 427.3; // 2 * PI * 68
    const filled = this.power * circumference;

    if (this._timingArc) {
      this._timingArc.setAttribute('stroke-dasharray', `${filled.toFixed(1)} ${(circumference - filled).toFixed(1)}`);
      // Wide sweet zone: 40%–85% = green, else orange
      const inSweet = this.power >= 0.4 && this.power <= 0.85;
      this._timingArc.setAttribute('stroke', inSweet ? '#4CD964' : '#ffa502');
    }

    if (this._batDot) {
      this._batDot.style.transform = `rotate(${(this.power * 360).toFixed(1)}deg)`;
    }

    // Pulse swing button when in sweet spot
    const swingBtn = this.el.querySelector('#btn-bat-swing');
    if (swingBtn) {
      const inSweet = this.power >= 0.4 && this.power <= 0.85;
      swingBtn.style.boxShadow = inSweet
        ? '0 0 28px rgba(76,217,100,0.8)'
        : '0 0 10px rgba(76,217,100,0.2)';
    }

    this.animFrame = requestAnimationFrame((t) => this._animate(t));
  }

  _swing() {
    if (!this.active) return;
    this.hide();

    if (this.onSwing) {
      this.onSwing({
        character_id: this.characterId,
        action: 'swing_bat',
        direction: this.direction,
        power: parseFloat(this.power.toFixed(3)),
        timing: parseFloat(this.power.toFixed(3)),
        shotType: this.shotType
      });
    }
  }

  destroy() {
    this.hide();
    if (this.el && this.el.parentNode) this.container.removeChild(this.el);
  }
}
