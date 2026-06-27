// Generated arcade sound effects for Orbit. No music, no audio files.
(() => {
  const soundButton = document.getElementById("sound");
  const storageKey = "orbit-sound-muted";
  const masterVolume = 0.22;

  let audioContext = null;
  let masterGain = null;
  let muted = readMutedSetting();

  function readMutedSetting() {
    try {
      return window.localStorage.getItem(storageKey) === "true";
    } catch {
      return false;
    }
  }

  function saveMutedSetting() {
    try {
      window.localStorage.setItem(storageKey, muted ? "true" : "false");
    } catch {
      // Local storage can be blocked. Sound still works for this session.
    }
  }

  function getAudioContext() {
    if (audioContext) return audioContext;

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;

    audioContext = new AudioContextClass();
    masterGain = audioContext.createGain();
    masterGain.gain.value = muted ? 0 : masterVolume;
    masterGain.connect(audioContext.destination);
    return audioContext;
  }

  function updateSoundButton() {
    if (!soundButton) return;

    soundButton.textContent = muted ? "🔇" : "🔊";
    soundButton.setAttribute("aria-label", muted ? "Unmute sound effects" : "Mute sound effects");
  }

  function unlockAudio() {
    if (muted) return;

    const context = getAudioContext();
    if (!context) return;

    if (context.state === "suspended") {
      context.resume().catch(() => {});
    }
  }

  function withAudio(callback) {
    if (muted) return;

    const context = getAudioContext();
    if (!context || !masterGain) return;

    if (context.state === "suspended") {
      context.resume().catch(() => {});
    }

    callback(context);
  }

  function toneAt(context, start, frequency, endFrequency, duration, volume = 0.1, type = "square") {
    const safeStart = Math.max(context.currentTime, context.currentTime + start);
    const safeEnd = safeStart + duration;
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(Math.max(20, frequency), safeStart);

    if (endFrequency && endFrequency !== frequency) {
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), safeEnd);
    }

    gain.gain.setValueAtTime(0.0001, safeStart);
    gain.gain.exponentialRampToValueAtTime(volume, safeStart + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, safeEnd);

    oscillator.connect(gain);
    gain.connect(masterGain);
    oscillator.start(safeStart);
    oscillator.stop(safeEnd + 0.03);
  }

  function noiseAt(context, start, duration, volume = 0.08, filterFrequency = 900, filterType = "lowpass") {
    const safeStart = Math.max(context.currentTime, context.currentTime + start);
    const bufferSize = Math.max(1, Math.floor(context.sampleRate * duration));
    const buffer = context.createBuffer(1, bufferSize, context.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i += 1) {
      data[i] = Math.random() * 2 - 1;
    }

    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();

    source.buffer = buffer;
    filter.type = filterType;
    filter.frequency.setValueAtTime(filterFrequency, safeStart);
    gain.gain.setValueAtTime(volume, safeStart);
    gain.gain.exponentialRampToValueAtTime(0.0001, safeStart + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    source.start(safeStart);
    source.stop(safeStart + duration);
  }

  function moveOut() {
    withAudio((context) => {
      toneAt(context, 0, 360, 760, 0.075, 0.085, "square");
      toneAt(context, 0.012, 720, 980, 0.045, 0.035, "triangle");
    });
  }

  function moveIn() {
    withAudio((context) => {
      toneAt(context, 0, 320, 180, 0.07, 0.075, "square");
      toneAt(context, 0.012, 210, 150, 0.055, 0.032, "triangle");
    });
  }

  function clearRun() {
    withAudio((context) => {
      toneAt(context, 0, 520, 780, 0.08, 0.075, "square");
      toneAt(context, 0.075, 780, 1160, 0.12, 0.08, "square");
    });
  }

  function star() {
    withAudio((context) => {
      toneAt(context, 0, 880, 1320, 0.075, 0.08, "triangle");
      toneAt(context, 0.052, 1320, 1760, 0.09, 0.06, "triangle");
    });
  }

  function extraLife() {
    withAudio((context) => {
      toneAt(context, 0, 520, 620, 0.08, 0.08, "triangle");
      toneAt(context, 0.08, 660, 760, 0.09, 0.09, "triangle");
      toneAt(context, 0.18, 880, 1120, 0.16, 0.085, "triangle");
    });
  }

  function crashFx() {
    withAudio((context) => {
      noiseAt(context, 0, 0.16, 0.075, 720, "lowpass");
      toneAt(context, 0, 110, 48, 0.18, 0.11, "sawtooth");
    });
  }

  function gameOver() {
    withAudio((context) => {
      toneAt(context, 0, 180, 96, 0.18, 0.09, "square");
      toneAt(context, 0.16, 120, 62, 0.28, 0.085, "square");
      noiseAt(context, 0.04, 0.22, 0.045, 420, "lowpass");
    });
  }

  function cometWarning() {
    withAudio((context) => {
      toneAt(context, 0, 136, 136, 0.12, 0.1, "square");
      toneAt(context, 0.18, 136, 176, 0.14, 0.1, "square");
      noiseAt(context, 0.02, 0.12, 0.025, 360, "bandpass");
    });
  }

  function cometImpact() {
    withAudio((context) => {
      noiseAt(context, 0, 0.22, 0.09, 520, "lowpass");
      toneAt(context, 0, 88, 34, 0.34, 0.14, "sawtooth");
      toneAt(context, 0.035, 48, 26, 0.42, 0.08, "triangle");
    });
  }

  function reward() {
    withAudio((context) => {
      toneAt(context, 0, 440, 660, 0.1, 0.07, "triangle");
      toneAt(context, 0.075, 660, 880, 0.12, 0.07, "triangle");
      toneAt(context, 0.17, 990, 1480, 0.22, 0.055, "sine");
    });
  }

  function warp() {
    withAudio((context) => {
      toneAt(context, 0, 130, 1480, 1.15, 0.085, "sawtooth");
      toneAt(context, 0.18, 260, 1960, 0.95, 0.055, "triangle");
      noiseAt(context, 0.05, 0.95, 0.03, 1500, "bandpass");
      toneAt(context, 1.04, 880, 1760, 0.18, 0.08, "sine");
    });
  }

  function start() {
    withAudio((context) => {
      toneAt(context, 0, 220, 440, 0.08, 0.06, "square");
      toneAt(context, 0.08, 440, 660, 0.1, 0.065, "square");
    });
  }

  function toggleMuted(event) {
    event.preventDefault();
    event.stopPropagation();

    muted = !muted;
    saveMutedSetting();

    if (masterGain) {
      masterGain.gain.value = muted ? 0 : masterVolume;
    }

    updateSoundButton();

    if (!muted) {
      unlockAudio();
      withAudio((context) => toneAt(context, 0, 660, 880, 0.08, 0.055, "triangle"));
    }
  }

  function wrapGameHooks() {
    const originalStartGame = startGame;
    startGame = function startGameWithSound() {
      const previousState = state;
      originalStartGame();

      if (previousState === "waiting" || previousState === "gameover" || previousState === "complete") {
        start();
      }
    };

    const originalMovePlayer = movePlayer;
    movePlayer = function movePlayerWithSound(direction) {
      const previousLane = player.lane;
      const previousLevel = level;
      const previousState = state;

      originalMovePlayer(direction);

      if (previousState !== "running" || state !== "running") return;
      if (level !== previousLevel) {
        clearRun();
        return;
      }

      if (player.lane !== previousLane) {
        if (direction > 0) moveOut();
        else moveIn();
      }
    };

    const originalCrash = crash;
    crash = function crashWithSound() {
      const previousLives = lives;
      const previousState = state;

      originalCrash();

      if (previousState !== "running" || lives >= previousLives) return;
      if (lives <= 0) gameOver();
      else crashFx();
    };

    const originalCheckBonusStar = checkBonusStar;
    checkBonusStar = function checkBonusStarWithSound() {
      const previousScore = score;
      const previousLives = lives;

      originalCheckBonusStar();

      if (score <= previousScore) return;
      if (lives > previousLives) extraLife();
      else star();
    };

    const originalUpdateHud = updateHud;
    let lastCometWarningAt = 0;
    updateHud = function updateHudWithSound(text) {
      originalUpdateHud(text);

      if (!text) return;

      const now = performance.now();
      if (text === "COMET DETECTED INBOUND!" && now - lastCometWarningAt > 600) {
        lastCometWarningAt = now;
        cometWarning();
        return;
      }

      if (text.startsWith("Comet impact")) {
        cometImpact();
      }
    };

    if (typeof showOrbitRewardScreen === "function") {
      const originalShowOrbitRewardScreen = showOrbitRewardScreen;
      showOrbitRewardScreen = function showOrbitRewardScreenWithSound(card) {
        originalShowOrbitRewardScreen(card);
        reward();
      };
    }

    if (typeof showOrbitCompleteScreen === "function") {
      const originalShowOrbitCompleteScreen = showOrbitCompleteScreen;
      showOrbitCompleteScreen = function showOrbitCompleteScreenWithSound() {
        originalShowOrbitCompleteScreen();
        warp();
      };
    }
  }

  document.addEventListener("pointerdown", unlockAudio, { capture: true });
  window.addEventListener("keydown", unlockAudio, { capture: true });

  if (soundButton) {
    soundButton.addEventListener("pointerdown", toggleMuted, { passive: false });
  }

  updateSoundButton();
  wrapGameHooks();

  window.orbitAudio = {
    moveOut,
    moveIn,
    clearRun,
    star,
    extraLife,
    crash: crashFx,
    gameOver,
    cometWarning,
    cometImpact,
    reward,
    warp,
    start,
  };
})();
