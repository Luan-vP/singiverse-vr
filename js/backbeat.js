// Loop-based drum sequencer using Tone.js.
// 16-step patterns for kick, snare, and hi-hat.
const Backbeat = (() => {
  // 16-step patterns  (1 = hit, 0 = rest)
  const PATTERNS = {
    kick:  [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0],
    snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
    hat:   [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,1],
  };

  const active = { kick: true, snare: true, hat: true };

  let kick, snare, hat, seq;

  function _build() {
    kick = new Tone.MembraneSynth({
      pitchDecay: 0.06,
      octaves: 8,
      envelope: { attack: 0.001, decay: 0.35, sustain: 0, release: 0.1 },
    }).toDestination();

    snare = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 0.001, decay: 0.18, sustain: 0, release: 0.05 },
    }).toDestination();
    snare.volume.value = -5;

    hat = new Tone.MetalSynth({
      frequency: 440,
      envelope: { attack: 0.001, decay: 0.07, release: 0.01 },
      harmonicity: 5.1,
      modulationIndex: 32,
      resonance: 4000,
      octaves: 1.5,
    }).toDestination();
    hat.volume.value = -12;

    seq = new Tone.Sequence(
      (time, step) => {
        if (active.kick  && PATTERNS.kick[step])  kick.triggerAttackRelease('C1', '8n', time);
        if (active.snare && PATTERNS.snare[step]) snare.triggerAttackRelease('8n', time);
        if (active.hat   && PATTERNS.hat[step])   hat.triggerAttackRelease('32n', time);
      },
      Array.from({ length: 16 }, (_, i) => i),
      '16n'
    );
  }

  async function start() {
    await Tone.start();
    if (!kick) _build();
    Tone.Transport.bpm.value = 90;
    seq.start(0);
    Tone.Transport.start();
  }

  function setBpm(val) {
    Tone.Transport.bpm.value = Number(val);
  }

  function setVolume(pct) {
    const gain = Number(pct) / 100;
    // Convert linear gain to dB; floor at -60 dB for near-silence
    Tone.Destination.volume.value = gain > 0 ? 20 * Math.log10(gain) : -60;
  }

  function setKick(on)  { active.kick  = on; }
  function setSnare(on) { active.snare = on; }
  function setHat(on)   { active.hat   = on; }

  return { start, setBpm, setVolume, setKick, setSnare, setHat };
})();
