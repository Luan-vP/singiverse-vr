// Microphone capture → pitch detection → volume analysis.
// Pitch (Hz) is mapped to a background hue; volume drives the star field.
const Audio = (() => {
  let _minPitch   = 80;    // Hz – calibratable low end
  let _maxPitch   = 1000;  // Hz – calibratable high end
  const SMOOTHING  = 0.12;
  const SILENCE_RMS = 0.01;

  let _analyser = null;
  let _sampleRate = 44100;
  let _byteArr = null;
  let _floatArr = null;
  let _active = false;
  let _rafId = null;
  let _smoothHue = 200;
  let _lastPitch = -1;

  // Naive autocorrelation pitch detector (McLeod-style clip + parabolic interp).
  // fftSize should be ≤ 1024 for acceptable mobile performance.
  function _detectPitch(buf, sampleRate) {
    const n = buf.length;

    let rms = 0;
    for (let i = 0; i < n; i++) rms += buf[i] * buf[i];
    rms = Math.sqrt(rms / n);
    if (rms < SILENCE_RMS) return -1;

    // Trim leading/trailing silence
    const thres = 0.2;
    let r1 = 0, r2 = n - 1;
    for (let i = 0; i < n / 2; i++) { if (Math.abs(buf[i]) >= thres) { r1 = i; break; } }
    for (let i = 1; i < n / 2; i++) { if (Math.abs(buf[n - i]) >= thres) { r2 = n - i; break; } }
    buf = buf.slice(r1, r2);

    const m = buf.length;
    if (m < 2) return -1;

    // Unnormalised autocorrelation
    const c = new Float32Array(m);
    for (let lag = 0; lag < m; lag++) {
      let s = 0;
      for (let j = 0; j < m - lag; j++) s += buf[j] * buf[j + lag];
      c[lag] = s;
    }

    // Skip the first peak (lag 0)
    let d = 0;
    while (d < m - 1 && c[d] > c[d + 1]) d++;

    let maxVal = -1, maxPos = d;
    for (let i = d; i < m; i++) {
      if (c[i] > maxVal) { maxVal = c[i]; maxPos = i; }
    }
    if (maxPos < 1 || maxPos >= m - 1) return -1;

    // Parabolic interpolation for sub-sample accuracy
    const x1 = c[maxPos - 1], x2 = c[maxPos], x3 = c[maxPos + 1];
    const a  = (x1 + x3 - 2 * x2) / 2;
    const b  = (x3 - x1) / 2;
    const T0 = a ? maxPos - b / (2 * a) : maxPos;
    return sampleRate / T0;
  }

  function _getRms() {
    _analyser.getByteFrequencyData(_byteArr);
    let sum = 0;
    for (let i = 0; i < _byteArr.length; i++) sum += _byteArr[i];
    return sum / _byteArr.length / 255; // 0-1
  }

  function _tick() {
    if (!_active) return;

    const volume = _getRms();

    _analyser.getFloatTimeDomainData(_floatArr);
    const pitch = _detectPitch(_floatArr, _sampleRate);

    if (pitch > 0) {
      _lastPitch = pitch;
      const clamped   = Math.max(_minPitch, Math.min(_maxPitch, pitch));
      const targetHue = ((clamped - _minPitch) / (_maxPitch - _minPitch)) * 360;
      _smoothHue      = _smoothHue + (targetHue - _smoothHue) * SMOOTHING;
    }

    const lightness = 8 + volume * 28;
    const sky = document.getElementById('sky');
    if (sky) sky.setAttribute('color', `hsl(${_smoothHue.toFixed(1)}, 70%, ${lightness.toFixed(1)}%)`);

    Stars.update(volume);

    _rafId = requestAnimationFrame(_tick);
  }

  async function start() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    const ctx    = new AudioContext();
    _sampleRate  = ctx.sampleRate;

    const source = ctx.createMediaStreamSource(stream);
    _analyser = ctx.createAnalyser();
    _analyser.fftSize = 1024; // smaller = faster autocorrelation on mobile
    _analyser.smoothingTimeConstant = 0.5;

    source.connect(_analyser);
    _byteArr  = new Uint8Array(_analyser.frequencyBinCount);
    _floatArr = new Float32Array(_analyser.fftSize);

    _active = true;
    _tick();
  }

  function stop() {
    _active = false;
    if (_rafId) { cancelAnimationFrame(_rafId); _rafId = null; }
    _analyser = null;
  }

  function setLowPitch(hz)  { _minPitch = Math.min(hz, _maxPitch - 10); }
  function setHighPitch(hz) { _maxPitch = Math.max(hz, _minPitch + 10); }

  return {
    start, stop,
    isActive:     () => _active,
    getLastPitch: () => _lastPitch,
    getLowPitch:  () => _minPitch,
    getHighPitch: () => _maxPitch,
    setLowPitch,
    setHighPitch,
  };
})();
