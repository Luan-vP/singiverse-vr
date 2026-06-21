// A-Frame component: procedural star field that flies toward the camera.
// Volume (0-1) drives speed and brightness in real time.
AFRAME.registerComponent('star-field', {
  schema: {
    count:  { type: 'number', default: 1800 },
    spread: { type: 'number', default: 300 },
    speed:  { type: 'number', default: 0.4 },
  },

  init() {
    const { count, spread } = this.data;
    this._speed       = this.data.speed;
    this._targetSpeed = this.data.speed;
    this._volume      = 0;

    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * spread;
      positions[i * 3 + 1] = (Math.random() - 0.5) * spread;
      positions[i * 3 + 2] = (Math.random() - 0.5) * spread;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this._positions = positions;
    this._geo = geo;

    const mat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.4,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.75,
    });
    this._mat = mat;

    const points = new THREE.Points(geo, mat);
    this.el.setObject3D('points', points);
  },

  // Called each frame by audio.js with current volume (0-1).
  setVolume(vol) {
    this._volume      = vol;
    this._targetSpeed = this.data.speed + vol * 4;
    this._mat.opacity = 0.4 + vol * 0.55;
    this._mat.size    = 0.25 + vol * 0.7;
  },

  tick(_, delta) {
    if (!delta) return;
    const dt        = delta / 1000;
    const pos       = this._positions;
    const count     = this.data.count;
    const halfSpread = this.data.spread / 2;

    // Smooth speed toward target
    this._speed += (this._targetSpeed - this._speed) * 0.06;

    const step = this._speed * dt * 12;
    for (let i = 0; i < count; i++) {
      pos[i * 3 + 2] += step;
      // Wrap stars that have passed the camera back to far distance
      if (pos[i * 3 + 2] > halfSpread) {
        pos[i * 3 + 2] -= this.data.spread;
        pos[i * 3]     = (Math.random() - 0.5) * this.data.spread;
        pos[i * 3 + 1] = (Math.random() - 0.5) * this.data.spread;
      }
    }
    this._geo.attributes.position.needsUpdate = true;
  },

  remove() {
    this.el.removeObject3D('points');
  },
});

// Thin facade used by audio.js and ui.js.
const Stars = {
  _el: null,
  _component: null,

  init() {
    // The entity already has the component via HTML attribute; just grab the ref.
    const scene = document.querySelector('a-scene');
    const attach = () => {
      this._el = document.getElementById('star-container');
      this._component = this._el && this._el.components['star-field'];
    };
    if (scene.hasLoaded) { attach(); }
    else { scene.addEventListener('loaded', attach); }
  },

  update(volume) {
    if (!this._component) {
      this._el = document.getElementById('star-container');
      this._component = this._el && this._el.components['star-field'];
    }
    if (this._component) this._component.setVolume(volume);
  },
};
