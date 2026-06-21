// Wires the HUD controls to the Audio, Backbeat, and Stars systems.
(function () {
  const $ = id => document.getElementById(id);

  async function onStart() {
    const btn = $('start-btn');
    btn.disabled = true;
    btn.textContent = 'Starting…';

    try {
      Stars.init();
      await Backbeat.start();
      await Audio.start();

      $('start-screen').hidden = true;
      $('controls').hidden = false;
    } catch (err) {
      console.error('Startup failed:', err);
      btn.disabled = false;
      btn.textContent = 'Try again (mic needed)';
    }
  }

  function bindControls() {
    $('start-btn').addEventListener('click', onStart);

    // BPM slider
    $('bpm').addEventListener('input', function () {
      $('bpm-val').textContent = this.value;
      Backbeat.setBpm(this.value);
    });

    // Master volume slider
    $('master-vol').addEventListener('input', function () {
      $('vol-val').textContent = this.value;
      Backbeat.setVolume(this.value);
    });

    // Beat on/off toggles
    $('kick-toggle').addEventListener('change',  e => Backbeat.setKick(e.target.checked));
    $('snare-toggle').addEventListener('change', e => Backbeat.setSnare(e.target.checked));
    $('hat-toggle').addEventListener('change',   e => Backbeat.setHat(e.target.checked));

    // Mic toggle
    let micOn = true;
    $('mic-toggle').addEventListener('click', async function () {
      if (micOn) {
        Audio.stop();
        this.textContent = 'Mic Off';
        this.classList.remove('active');
        this.classList.add('inactive');
      } else {
        try {
          await Audio.start();
          this.textContent = 'Mic On';
          this.classList.remove('inactive');
          this.classList.add('active');
        } catch (e) {
          console.error('Could not restart mic:', e);
        }
      }
      micOn = !micOn;
    });
  }

  document.addEventListener('DOMContentLoaded', bindControls);
})();
