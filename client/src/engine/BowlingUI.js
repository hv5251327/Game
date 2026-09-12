// BowlingUI: Landing zone picker on pitch + delivery type selector
export class BowlingUI {
  constructor(container) {
    this.container = container;
    this.landingZone = { x: 0, z: 0.35 };
    this.deliveryType = 'pace';
    this.onBowl = null;
    this._build();
  }

  _build() {
    this.el = document.createElement('div');
    this.el.id = 'bowling-ui';
    this.el.innerHTML = `
      <div class="bowl-ui-title">🏏 YOUR TURN TO BOWL!</div>
      <div class="delivery-type-row">
        <button class="delivery-btn active" data-type="pace">💨 Pace</button>
        <button class="delivery-btn" data-type="spin">🌀 Spin</button>
        <button class="delivery-btn" data-type="yorker">🎯 Yorker</button>
        <button class="delivery-btn" data-type="bouncer">⬆ Bouncer</button>
      </div>
      <div class="pitch-picker-label">Click on the pitch to set landing zone:</div>
      <div class="pitch-wrapper">
        <div id="pitch-canvas" class="pitch-canvas">
          <div class="pitch-zone good-zone"></div>
          <div class="pitch-zone full-zone"></div>
          <div class="pitch-zone short-zone"></div>
          <div id="landing-marker" class="landing-marker">🎯</div>
          <div class="stumps-icon top">|||</div>
          <div class="stumps-icon bottom">|||</div>
        </div>
      </div>
      <div class="bowl-info">
        <span id="bowl-length-label">Length: Good</span>
        <span id="bowl-line-label">Line: Middle</span>
      </div>
      <button id="btn-bowl" class="btn-bowl">⚡ BOWL!</button>
    `;
    this.el.style.display = 'none';
    this.container.appendChild(this.el);

    // Delivery type buttons
    this.el.querySelectorAll('.delivery-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.el.querySelectorAll('.delivery-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.deliveryType = btn.dataset.type;
      });
    });

    // Pitch click to set landing zone
    const pitchCanvas = this.el.querySelector('#pitch-canvas');
    const marker = this.el.querySelector('#landing-marker');
    const lengthLabel = this.el.querySelector('#bowl-length-label');
    const lineLabel = this.el.querySelector('#bowl-line-label');

    const handleClick = (e) => {
      const rect = pitchCanvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const nx = (clientX - rect.left) / rect.width; // 0-1 left to right
      const ny = (clientY - rect.top) / rect.height;  // 0-1 top to bottom
      this.landingZone.x = (nx - 0.5) * 2.0; // -1 to +1 (off to leg)
      this.landingZone.z = 0.15 + ny * 0.7;  // 0.15 (full) to 0.85 (short)
      marker.style.left = `${nx * 100}%`;
      marker.style.top = `${ny * 100}%`;
      // Labels
      const z = this.landingZone.z;
      if (z < 0.35) lengthLabel.textContent = 'Length: Full / Yorker Zone';
      else if (z < 0.65) lengthLabel.textContent = 'Length: Good';
      else lengthLabel.textContent = 'Length: Short / Bouncer Zone';
      const x = this.landingZone.x;
      if (x < -0.4) lineLabel.textContent = 'Line: Off Stump';
      else if (x > 0.4) lineLabel.textContent = 'Line: Leg Stump';
      else lineLabel.textContent = 'Line: Middle Stump';
    };
    pitchCanvas.addEventListener('click', handleClick);
    pitchCanvas.addEventListener('touchstart', (e) => { e.preventDefault(); handleClick(e); });

    // Bowl button
    this.el.querySelector('#btn-bowl').addEventListener('click', () => this._bowl());
  }

  show(options = {}) {
    this.el.style.display = 'flex';
    if (options.timeout) {
      this._autoTimeout = setTimeout(() => this._bowl(), options.timeout);
    }
  }

  hide() {
    this.el.style.display = 'none';
    clearTimeout(this._autoTimeout);
  }

  _bowl() {
    this.hide();
    const accuracy = 0.5 + Math.random() * 0.4; // slight randomization around chosen spot
    if (this.onBowl) {
      this.onBowl({
        landingZone: { ...this.landingZone },
        deliveryType: this.deliveryType,
        accuracy
      });
    }
  }

  destroy() {
    this.hide();
    this.container.removeChild(this.el);
  }
}
