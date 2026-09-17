// BowlingUI: WCC2-style Circular Bowling Meter
// Outer ring = fill arc for power/pace (clockwise), WASD to position landing zone
export class BowlingUI {
  constructor(container) {
    this.container = container;
    this.landingZone = { x: -0.2, z: -5.5 }; // default good length outside off
    this.swingDirection = 'left';
    this.power = 0;
    this.barDirection = 1;
    this.barSpeed = 0.85; // WCC2-feel — 0→1 in ~1.18s
    this.active = false;
    this.onBowl = null;
    this.onTargetMoved = null;
    this.animFrame = null;
    this.lastTime = 0;
    this._build();
    this._bindKeyboard();
  }

  _build() {
    this.el = document.createElement('div');
    this.el.id = 'bowling-ui';
    this.el.style.cssText = `
      position:fixed; bottom:18px; right:18px;
      display:none; flex-direction:column; align-items:center; gap:10px;
      background:rgba(10,16,30,0.92); border:2px solid rgba(255,255,255,0.15);
      border-radius:18px; padding:16px 18px 14px;
      box-shadow:0 4px 32px rgba(0,0,0,0.7); z-index:900;
      font-family:'Segoe UI',sans-serif; min-width:230px;
    `;

    this.el.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;width:100%;">
        <span style="font-size:1.1rem;">⚾</span>
        <span style="color:#fff;font-weight:800;font-size:0.95rem;letter-spacing:1px;">BOWLING</span>
        <span id="bowl-timer-badge" style="margin-left:auto;background:rgba(255,255,255,0.1);border-radius:20px;padding:2px 10px;font-size:0.8rem;color:#ffd32a;">⏱ <span id="bowl-timer-count">20</span>s</span>
      </div>

      <!-- Circular Power Meter -->
      <div style="position:relative;width:150px;height:150px;">
        <svg id="bowl-arc-svg" width="150" height="150" style="position:absolute;top:0;left:0;">
          <!-- Background ring -->
          <circle cx="75" cy="75" r="62" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="12"/>
          <!-- Green zone arc (50%–80%) always shown -->
          <circle id="bowl-zone-arc" cx="75" cy="75" r="62" fill="none"
            stroke="rgba(80,220,100,0.25)" stroke-width="12"
            stroke-dasharray="97.4 294.1" stroke-dashoffset="195.5"
            style="transform:rotate(-90deg);transform-origin:75px 75px;"/>
          <!-- Red no-ball zone (85%–100%) -->
          <circle id="bowl-noball-arc" cx="75" cy="75" r="62" fill="none"
            stroke="rgba(255,50,50,0.35)" stroke-width="12"
            stroke-dasharray="46.7 344.8" stroke-dashoffset="140.5"
            style="transform:rotate(-90deg);transform-origin:75px 75px;"/>
          <!-- Power fill arc -->
          <circle id="bowl-power-arc" cx="75" cy="75" r="62" fill="none"
            stroke="#4CD964" stroke-width="12" stroke-linecap="round"
            stroke-dasharray="0 391.1" stroke-dashoffset="0"
            style="transform:rotate(-90deg);transform-origin:75px 75px;transition:stroke 0.1s;"/>
          <!-- Dot marker at current position -->
          <circle id="bowl-dot" cx="75" cy="13" r="6" fill="#fff" style="transform-origin:75px 75px;"/>
        </svg>
        <!-- Center info -->
        <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;pointer-events:none;">
          <div id="bowl-speed-text" style="color:#ffd32a;font-size:1.4rem;font-weight:900;line-height:1;">140</div>
          <div style="color:rgba(255,255,255,0.6);font-size:0.65rem;margin-top:1px;">km/h</div>
          <div id="bowl-zone-text" style="color:#4CD964;font-size:0.68rem;font-weight:700;margin-top:3px;">GOOD</div>
        </div>
      </div>

      <!-- Delivery Info Row -->
      <div style="display:flex;gap:8px;width:100%;justify-content:space-between;font-size:0.75rem;">
        <div style="color:rgba(255,255,255,0.7);">
          <div id="bowl-length-text" style="color:#fff;font-weight:600;">Good Length</div>
          <div id="bowl-line-text" style="color:rgba(255,255,255,0.55);">Outside Off</div>
        </div>
        <div style="display:flex;gap:5px;">
          <button id="btn-swing-l" style="padding:3px 9px;border-radius:20px;border:1px solid rgba(255,255,255,0.3);background:rgba(100,255,150,0.2);color:#7bed9f;font-size:0.72rem;cursor:pointer;">↩ IN</button>
          <button id="btn-swing-r" style="padding:3px 9px;border-radius:20px;border:1px solid rgba(255,255,255,0.15);background:transparent;color:rgba(255,255,255,0.5);font-size:0.72rem;cursor:pointer;">↪ OUT</button>
        </div>
      </div>

      <!-- BOWL Button -->
      <button id="btn-bowl" style="
        width:100%;padding:10px;border-radius:12px;border:none;cursor:pointer;
        background:linear-gradient(135deg,#4CD964,#00b33a);
        color:#fff;font-weight:900;font-size:0.95rem;letter-spacing:1px;
        box-shadow:0 4px 16px rgba(76,217,100,0.4);
      ">⚡ BOWL [SPACE]</button>

      <div style="color:rgba(255,255,255,0.4);font-size:0.68rem;text-align:center;">
        W/S = Fuller/Shorter &bull; A/D = Off/Leg &bull; 1/2 = Swing
      </div>
    `;

    this.el.style.display = 'none';
    this.container.appendChild(this.el);

    // Swing buttons
    this.el.querySelector('#btn-swing-l').addEventListener('click', (e) => { e.stopPropagation(); this._setSwing('left'); });
    this.el.querySelector('#btn-swing-r').addEventListener('click', (e) => { e.stopPropagation(); this._setSwing('right'); });

    // Bowl button
    this.el.querySelector('#btn-bowl').addEventListener('click', (e) => { e.stopPropagation(); this._bowl(); });

    // Cache arc elements
    this._powerArc = this.el.querySelector('#bowl-power-arc');
    this._dotEl = this.el.querySelector('#bowl-dot');
    this._speedText = this.el.querySelector('#bowl-speed-text');
    this._zoneText = this.el.querySelector('#bowl-zone-text');
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
      if (k === '1' || k === 'l') { this._setSwing('left'); return; }
      if (k === '2' || k === 'r') { this._setSwing('right'); return; }

      let moved = false;
      if (k === 'arrowleft' || k === 'a') { this.landingZone.x = Math.max(-1.3, this.landingZone.x - 0.12); moved = true; }
      else if (k === 'arrowright' || k === 'd') { this.landingZone.x = Math.min(1.3, this.landingZone.x + 0.12); moved = true; }
      else if (k === 'arrowup' || k === 'w') { this.landingZone.z = Math.max(-9.2, this.landingZone.z - 0.35); moved = true; }
      else if (k === 'arrowdown' || k === 's') { this.landingZone.z = Math.min(-1.0, this.landingZone.z + 0.35); moved = true; }

      if (moved) {
        e.preventDefault();
        this._updateLabels();
        if (this.onTargetMoved) this.onTargetMoved(this.landingZone.x, this.landingZone.z);
      }
    });
  }

  _setSwing(dir) {
    this.swingDirection = dir;
    const lBtn = this.el.querySelector('#btn-swing-l');
    const rBtn = this.el.querySelector('#btn-swing-r');
    if (dir === 'left') {
      lBtn.style.background = 'rgba(100,255,150,0.2)'; lBtn.style.color = '#7bed9f'; lBtn.style.borderColor = 'rgba(255,255,255,0.3)';
      rBtn.style.background = 'transparent'; rBtn.style.color = 'rgba(255,255,255,0.4)'; rBtn.style.borderColor = 'rgba(255,255,255,0.15)';
    } else {
      rBtn.style.background = 'rgba(100,200,255,0.2)'; rBtn.style.color = '#70d7ff'; rBtn.style.borderColor = 'rgba(255,255,255,0.3)';
      lBtn.style.background = 'transparent'; lBtn.style.color = 'rgba(255,255,255,0.4)'; lBtn.style.borderColor = 'rgba(255,255,255,0.15)';
    }
  }

  _updateLabels() {
    const z = this.landingZone.z;
    let lenStr = 'Good Length';
    if (z <= -8.2) lenStr = 'Yorker';
    else if (z <= -6.5) lenStr = 'Full Pitch';
    else if (z <= -4.2) lenStr = 'Good Length';
    else if (z <= -2.5) lenStr = 'Short';
    else lenStr = 'Bouncer';

    const x = this.landingZone.x;
    let lineStr = 'Middle Stump';
    if (x < -0.70) lineStr = 'Wide Off';
    else if (x < -0.20) lineStr = 'Outside Off';
    else if (x < 0.20) lineStr = 'Middle';
    else if (x < 0.65) lineStr = 'Leg';
    else lineStr = 'Wide Leg';

    const lEl = this.el.querySelector('#bowl-length-text');
    const liEl = this.el.querySelector('#bowl-line-text');
    if (lEl) lEl.textContent = lenStr;
    if (liEl) liEl.textContent = lineStr;
  }

  setLandingZone(x, z) {
    this.landingZone = { x, z };
    this._updateLabels();
  }

  show(options = {}) {
    this.active = true;
    this.power = 0;
    this.barDirection = 1;
    this.el.style.display = 'flex';
    this._updateLabels();
    this._setSwing(this.swingDirection);
    this._animate(performance.now());

    const totalMs = options.timeout || 20000;
    this.remainingSec = Math.round(totalMs / 1000);
    const timerEl = this.el.querySelector('#bowl-timer-count');
    if (timerEl) timerEl.textContent = String(this.remainingSec);

    clearInterval(this._countdownInterval);
    this._countdownInterval = setInterval(() => {
      this.remainingSec--;
      if (timerEl) timerEl.textContent = String(Math.max(0, this.remainingSec));
      if (this.remainingSec <= 0) clearInterval(this._countdownInterval);
    }, 1000);

    clearTimeout(this._autoTimeout);
    this._autoTimeout = setTimeout(() => { if (this.active) this._bowl(); }, totalMs);
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

    const circumference = 391.1; // 2 * PI * 62
    const filled = this.power * circumference;

    // Update arc fill
    if (this._powerArc) {
      this._powerArc.setAttribute('stroke-dasharray', `${filled.toFixed(1)} ${(circumference - filled).toFixed(1)}`);
      // Color: green = good, orange = fast, red = no-ball
      const col = this.power >= 0.88 ? '#ff4757' : this.power >= 0.5 && this.power <= 0.82 ? '#4CD964' : '#ffa502';
      this._powerArc.setAttribute('stroke', col);
    }

    // Rotate dot marker
    if (this._dotEl) {
      const angle = this.power * 360;
      this._dotEl.style.transform = `rotate(${angle}deg)`;
    }

    // Speed readout
    const speedKmh = Math.round(105 + this.power * 48);
    if (this._speedText) this._speedText.textContent = String(speedKmh);
    if (this._zoneText) {
      if (this.power >= 0.88) { this._zoneText.textContent = '🚨 NO-BALL'; this._zoneText.style.color = '#ff4757'; }
      else if (this.power >= 0.5 && this.power <= 0.82) { this._zoneText.textContent = '⚡ PERFECT'; this._zoneText.style.color = '#4CD964'; }
      else { this._zoneText.textContent = 'PACE'; this._zoneText.style.color = '#ffa502'; }
    }

    this.animFrame = requestAnimationFrame((t) => this._animate(t));
  }

  _bowl() {
    if (!this.active) return;
    this.hide();

    const isNoBall = this.power >= 0.88;
    const sweetCenter = 0.66;
    const timingDiff = Math.abs(this.power - sweetCenter);
    const accuracy = isNoBall ? 0.2 : Math.max(0.5, 1.0 - timingDiff * 1.5);
    const paceKmh = Math.round(105 + this.power * 48);

    let delivType = 'pace';
    if (this.landingZone.z <= -8.0) delivType = 'yorker';
    else if (this.landingZone.z >= -2.5) delivType = 'bouncer';
    else if (this.swingDirection === 'left') delivType = 'inswing';
    else if (this.swingDirection === 'right') delivType = 'outswing';

    if (this.onBowl) {
      this.onBowl({
        landingZone: {
          x: parseFloat(this.landingZone.x.toFixed(2)),
          z: parseFloat(this.landingZone.z.toFixed(2))
        },
        deliveryType: delivType,
        swingDirection: this.swingDirection,
        power: parseFloat(this.power.toFixed(2)),
        accuracy: parseFloat(accuracy.toFixed(2)),
        isNoBall,
        paceKmh
      });
    }
  }

  destroy() {
    this.hide();
    if (this.el && this.el.parentNode) this.container.removeChild(this.el);
  }
}
