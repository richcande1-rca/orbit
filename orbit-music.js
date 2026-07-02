// Lightweight ambient techno bed for Orbit. No audio files.
(() => {
  const soundButton = document.getElementById("sound");
  const storageKey = "orbit-sound-muted";
  const params = new URLSearchParams(window.location.search);
  const previewMuted = params.get("muted") === "1" || params.get("preview") === "1";

  let context = null;
  let master = null;
  let droneGain = null;
  let pulseGain = null;
  let sparkleGain = null;
  let filter = null;
  let delay = null;
  let delayFeedback = null;
  let delayReturn = null;
  let droneVoices = [];
  let pulseTimer = null;
  let sparkleTimer = null;
  let running = false;
  let step = 0;

  function readMuted() {
    if (previewMuted) return true;
    try {
      return window.localStorage.getItem(storageKey) === "true";
    } catch {
      return false;
    }
  }

  function createContext() {
    if (context) return context;

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;

    context = new AudioContextClass();

    master = context.createGain();
    master.gain.value = 0;
    master.connect(context.destination);

    filter = context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 1450;
    filter.Q.value = 0.7;
    filter.connect(master);

    delay = context.createDelay(1.2);
    delay.delayTime.value = 0.36;

    delayFeedback = context.createGain();
    delayFeedback.gain.value = 0.32;

    delayReturn = context.createGain();
    delayReturn.gain.value = 0.18;

    delay.connect(delayFeedback);
    delayFeedback.connect(delay);
    delay.connect(delayReturn);
    delayReturn.connect(filter);

    droneGain = context.createGain();
    droneGain.gain.value = 0.0;
    droneGain.connect(filter);

    pulseGain = context.createGain();
    pulseGain.gain.value = 0.0;
    pulseGain.connect(filter);
    pulseGain.connect(delay);

    sparkleGain = context.createGain();
    sparkleGain.gain.value = 0.0;
    sparkleGain.connect(filter);
    sparkleGain.connect(delay);

    return context;
  }

  function setMasterLevel(level, seconds = 0.8) {
    if (!context || !master) return;
    const now = context.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setTargetAtTime(level, now, Math.max(0.03, seconds / 4));
  }

  function setMusicMuted(isMuted) {
    if (!context || !master) return;
    setMasterLevel(isMuted ? 0 : 0.34, isMuted ? 0.25 : 0.8);
  }

  function buildDrone() {
    if (!context || !droneGain || droneVoices.length) return;

    const notes = [55, 82.41, 110, 164.81];
    droneVoices = notes.map((frequency, index) => {
      const osc = context.createOscillator();
      const gain = context.createGain();
      const pan = context.createStereoPanner ? context.createStereoPanner() : null;

      osc.type = index % 2 ? "triangle" : "sine";
      osc.frequency.value = frequency;
      gain.gain.value = index === 0 ? 0.048 : 0.028;

      if (pan) {
        pan.pan.value = [-0.42, 0.35, -0.12, 0.18][index] || 0;
        osc.connect(gain);
        gain.connect(pan);
        pan.connect(droneGain);
      } else {
        osc.connect(gain);
        gain.connect(droneGain);
      }

      osc.start();
      return { osc, gain, pan };
    });

    const now = context.currentTime;
    droneGain.gain.cancelScheduledValues(now);
    droneGain.gain.setValueAtTime(0.0001, now);
    droneGain.gain.exponentialRampToValueAtTime(0.48, now + 2.8);
  }

  function pulseNote(frequency, duration = 0.18, level = 0.045) {
    if (!context || !pulseGain) return;

    const now = context.currentTime;
    const osc = context.createOscillator();
    const gain = context.createGain();

    osc.type = "square";
    osc.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(level, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(pulseGain);
    osc.start(now);
    osc.stop(now + duration + 0.04);
  }

  function sparkle(frequency) {
    if (!context || !sparkleGain) return;

    const now = context.currentTime;
    const osc = context.createOscillator();
    const gain = context.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(frequency, now);
    osc.frequency.exponentialRampToValueAtTime(frequency * 1.5, now + 0.42);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.028, now + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);

    osc.connect(gain);
    gain.connect(sparkleGain);
    osc.start(now);
    osc.stop(now + 0.62);
  }

  function startSequencers() {
    if (pulseTimer || sparkleTimer) return;

    const pulsePattern = [110, 0, 164.81, 0, 146.83, 0, 164.81, 220];
    pulseTimer = window.setInterval(() => {
      if (!running || readMuted()) return;
      const frequency = pulsePattern[step % pulsePattern.length];
      if (frequency) pulseNote(frequency, step % 8 === 7 ? 0.32 : 0.16, step % 8 === 7 ? 0.036 : 0.03);
      step += 1;
    }, 360);

    const sparkleNotes = [659.25, 739.99, 987.77, 880, 1174.66];
    sparkleTimer = window.setInterval(() => {
      if (!running || readMuted()) return;
      if (Math.random() < 0.55) sparkle(sparkleNotes[Math.floor(Math.random() * sparkleNotes.length)]);
    }, 2800);
  }

  function startMusic() {
    if (readMuted()) return Promise.resolve(false);

    const ctx = createContext();
    if (!ctx) return Promise.resolve(false);

    return ctx.resume().then(() => {
      running = true;
      buildDrone();
      pulseGain.gain.value = 0.78;
      sparkleGain.gain.value = 0.78;
      startSequencers();
      setMusicMuted(false);
      return true;
    }).catch(() => false);
  }

  function stopMusic() {
    running = false;
    setMusicMuted(true);
  }

  function wrapStartGame() {
    if (typeof startGame !== "function") return;

    const originalStartGame = startGame;
    startGame = function startGameWithMusic() {
      const result = originalStartGame.apply(this, arguments);
      startMusic();
      return result;
    };
  }

  function refreshFromSoundSetting() {
    const isMuted = readMuted();
    if (isMuted) stopMusic();
    else if (running) setMusicMuted(false);
  }

  if (soundButton) {
    soundButton.addEventListener("pointerdown", () => {
      window.setTimeout(refreshFromSoundSetting, 0);
      window.setTimeout(refreshFromSoundSetting, 80);
    }, { passive: true });
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopMusic();
    else if (running && !readMuted()) startMusic();
  });

  window.addEventListener("pagehide", stopMusic);
  window.addEventListener("pageshow", refreshFromSoundSetting);

  wrapStartGame();

  window.orbitMusic = {
    start: startMusic,
    stop: stopMusic,
    refresh: refreshFromSoundSetting,
  };
})();
