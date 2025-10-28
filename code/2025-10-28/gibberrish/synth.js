// synth.js — ultra-minimal Gibberish setup
(() => {
  // Point the worklet to the SAME CDN as your script include
  Gibberish.workletPath = 'https://unpkg.com/gibberish-dsp/dist/gibberish_worklet.js';

  let ready = false;

  async function bootAudio() {
    if (ready) return;
    try {
      // in case p5 is present, politely start the audio context
      if (typeof userStartAudio === 'function') {
        try { await userStartAudio(); } catch (_) {}
      }

      await Gibberish.init();
      Gibberish.export(window); // exposes Kick, Snare, Hat, etc.

      // three dead-simple percussion voices
      window.kik   = Kick({ amp: 0.9 }).connect();
      window.snare = Snare({ amp: 0.4 }).connect();
      window.hat   = Hat({  amp: 0.2 }).connect();

      // OPTIONAL master reverb (uncomment if you want it)
      // const verb = Freeverb({ roomSize: .75, damping: .5 }).connect();
      // kik.connect(verb); snare.connect(verb); hat.connect(verb);

      ready = true;
      console.log('🎧 Gibberish ready');
    } catch (e) {
      console.warn('Gibberish init failed:', e);
    }
  }

  // browsers require a user gesture to start audio
  window.addEventListener('pointerdown', bootAudio, { once: true });

  // expose helpers
  window.enableSound = bootAudio;
  window.hit = function(name) {
    if (!ready) return;
    const v = window[name?.toLowerCase?.()];
    if (v && typeof v.trigger === 'function') v.trigger();
  };
})();