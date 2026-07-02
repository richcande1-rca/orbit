// Lightweight ambient techno bed for Orbit. No audio files.
(() => {
  const soundButton = document.getElementById("sound");
  const musicVolumeSlider = document.getElementById("music-volume");
  const soundStorageKey = "orbit-sound-muted";
  const volumeStorageKey = "orbit-music-volume-v2";
  const maxMusicLevel = 0.72;
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
  let watchdogTimer = null;
  let running = false;
  let wantsMusic = false;
  let step = 0;
  let lastKnownLevel = 1;
  let musicVolume = readStoredVolume();

  function readMuted() {
    if (previewMuted) return true;
    try {
      return window.localStorage.getItem(soundStorageKey) === "true";
    } catch {
      return false;
    }
  }

  function readStoredVolume() {
    try {
      const stored = Number(window.localStorage.getItem(volumeStorageKey));
      if (Number.isFinite(stored)) return Math.max(0, Math.min(100, stored));
    } catch {
      // Local storage can be blocked. Use the default.
    }
    return 100;
  }

  function saveStoredVolume() {
    try {
      window.localStorage.setItem(volumeStorageKey, String(Math.round(musicVolume)));
    } catch {
      // Local storage can be blocked. The slider still works for this session.
    }
  }

  function volumeToLevel() {
    return maxMusicLevel * (musicVolume / 100);
  }

  function currentLevel() {
    if (typeof level === "number" && Number.isFinite(level)) {
      lastKnownLevel = Math.max(1, level);
    }
    return lastKnownLevel;
  }

  function currentGameState() {
    return typeof state === "string" ? state : "running";
  }

  function shouldPlayMusic() {
    return wantsMusic && !document.hidden && !readMuted() && musicVolume > 0 && currentGameState() === "running";
  }

  function beatMs() {
    const levelBoost = Math.min(8, currentLevel() - 1);
    return Math.max(245, 340 - levelBoost * 11);
  }

  function sparkleMs() {
    const levelBoost = Math.min(8, currentLevel() - 1);
    return Math.max(1500, 2300 - levelBoost * 85);
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
    filter.frequency.value = 2600;
    filter.Q.value = 0.82;
    filter.connect(master);

    delay = context.createDelay(1.2);
    delay.delayTime.value = 0.34;

    delayFeedback = context.createGain();
    delayFeedback.gain.value = 0.34;

    delayReturn = context.createGain();
    delayReturn.gain.value = 0.22;

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

  function setMasterLevel(levelValue, seconds = 0.8) {
    if (!context || !master) return;
    const now = context.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setTargetAtTime(levelValue, now, Math.max(0.03, seconds / 4));
  }

  function setMusicMuted(isMuted) {
    if (!context || !master) return;
    setMasterLevel(isMuted ? 0 : volumeToLevel(), isMuted ? 0.25 : 0.8);
  }

  function updateVolumeSlider() {
    if (!musicVolumeSlider) return;
    musicVolumeSlider.value = String(Math.round(musicVolume));
    musicVolumeSlider.setAttribute("aria-valuetext", `${Math.round(musicVolume)} percent`);
  }

  function applyVolumeFromSlider() {
    if (!musicVolumeSlider) return;
    musicVolume = Math.max(0, Math.min(100, Number(musicVolumeSlider.value) || 0));
    saveStoredVolume();
    if (shouldPlayMusic()) {
      ensureMusicPlaying();
      setMasterLevel(volumeToLevel(), 0.18);
    } else {
      setMusicMuted(true);
    }
    updateVolumeSlider();
  }

  function buildDrone() {
    if (!context || !droneGain || droneVoices.length) return;

    const notes = [110, 164.81, 220, 329.63];
    droneVoices = notes.map((frequency, index) => {
      const osc = context.createOscillator();
      const gain = context.createGain();
      const pan = context.createStereoPanner ? context.createStereoPanner() : null;

      osc.type = index % 2 ? "triangle" : "sine";
      osc.frequency.value = frequency;
      gain.gain.value = index === 0 ? 0.05 : 0.034;

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
    droneGain.gain.exponentialRampToValueAtTime(0.62, now + 2.2);
  }

  function pulseNote(frequency, duration = 0.18, levelValue = 0.065, type = "square") {
    if (!context || !pulseGain) return;

    const now = context.currentTime;
    const osc = context.createOscillator();
    const gain = context.createGain();
    const voiceFilter = context.createBiquadFilter();

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, now);
    voiceFilter.type = "lowpass";
    voiceFilter.frequency.setValueAtTime(1650, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(levelValue, now + 0.014);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(voiceFilter);
    voiceFilter.connect(gain);
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
    osc.frequency.exponentialRampToValueAtTime(frequency * 1.35, now + 0.42);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.045, now + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);

    osc.connect(gain);
    gain.connect(sparkleGain);
    osc.start(now);
    osc.stop(now + 0.62);
  }

  function playPulseStep() {
    if (!shouldPlayMusic()) {
      schedulePulse();
      return;
    }

    const pulsePattern = [220, 0, 329.63, 0, 293.66, 0, 329.63, 440];
    const arpPattern = [659.25, 739.99, 880, 987.77, 880, 739.99, 659.25, 554.37];
    const levelBoost = Math.min(8, currentLevel() - 1);
    const pulseFrequency = pulsePattern[step % pulsePattern.length];
    const arpFrequency = arpPattern[step % arpPattern.length];
    const pulseLift = 1 + levelBoost * 0.018;

    if (pulseFrequency) {
      pulseNote(
        pulseFrequency,
        step % 8 === 7 ? 0.34 : 0.17,
        (step % 8 === 7 ? 0.07 : 0.058) * pulseLift,
        "square"
      );
    }

    if (step % 2 === 0) {
      pulseNote(arpFrequency, 0.14, 0.026 * pulseLift, "triangle");
    }

    step += 1;
    schedulePulse();
  }

  function schedulePulse() {
    window.clearTimeout(pulseTimer);
    pulseTimer = window.setTimeout(playPulseStep, beatMs());
  }

  function playSparkleStep() {
    if (shouldPlayMusic()) {
      const sparkleNotes = [880, 987.77, 1174.66, 1318.51, 1479.98];
      if (Math.random() < 0.72) sparkle(sparkleNotes[Math.floor(Math.random() * sparkleNotes.length)]);
    }

    scheduleSparkle();
  }

  function scheduleSparkle() {
    window.clearTimeout(sparkleTimer);
    sparkleTimer = window.setTimeout(playSparkleStep, sparkleMs());
  }

  function startSequencers() {
    if (!pulseTimer) schedulePulse();
    if (!sparkleTimer) scheduleSparkle();
    if (!watchdogTimer) {
      watchdogTimer = window.setInterval(() => {
        if (shouldPlayMusic()) ensureMusicPlaying();
        else if (context && master) setMusicMuted(true);
      }, 1200);
    }
  }

  function ensureMusicPlaying() {
    if (!shouldPlayMusic()) return Promise.resolve(false);

    const ctx = createContext();
    if (!ctx) return Promise.resolve(false);

    return ctx.resume().then(() => {
      running = true;
      buildDrone();
      pulseGain.gain.value = 0.92;
      sparkleGain.gain.value = 0.86;
      startSequencers();
      setMusicMuted(false);
      return true;
    }).catch(() => false);
  }

  function startMusic() {
    wantsMusic = true;
    return ensureMusicPlaying();
  }

  function pauseMusic() {
    running = false;
    setMusicMuted(true);
  }

  function stopMusic() {
    wantsMusic = false;
    pauseMusic();
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

  function wrapPause() {
    if (typeof togglePause !== "function") return;

    const originalTogglePause = togglePause;
    togglePause = function togglePauseWithMusic() {
      const result = originalTogglePause.apply(this, arguments);
      if (currentGameState() === "running") startMusic();
      else pauseMusic();
      return result;
    };
  }

  function wrapCrash() {
    if (typeof crash !== "function") return;

    const originalCrash = crash;
    crash = function crashWithMusicState() {
      const result = originalCrash.apply(this, arguments);
      if (currentGameState() === "gameover") pauseMusic();
      return result;
    };
  }

  function refreshFromSoundSetting() {
    if (shouldPlayMusic()) ensureMusicPlaying();
    else setMusicMuted(true);
  }

  updateVolumeSlider();

  if (musicVolumeSlider) {
    musicVolumeSlider.addEventListener("input", applyVolumeFromSlider);
    musicVolumeSlider.addEventListener("change", applyVolumeFromSlider);
  }

  if (soundButton) {
    soundButton.addEventListener("pointerdown", () => {
      window.setTimeout(refreshFromSoundSetting, 0);
      window.setTimeout(refreshFromSoundSetting, 80);
    }, { passive: true });
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) pauseMusic();
    else refreshFromSoundSetting();
  });

  window.addEventListener("pagehide", pauseMusic);
  window.addEventListener("pageshow", refreshFromSoundSetting);

  wrapStartGame();
  wrapPause();
  wrapCrash();
  startSequencers();

  window.orbitMusic = {
    start: startMusic,
    stop: stopMusic,
    pause: pauseMusic,
    refresh: refreshFromSoundSetting,
  };
})();
