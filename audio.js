// Generated arcade sound effects for Orbit. No music, no audio files.
(() => {
  const soundButton = document.getElementById("sound");
  const storageKey = "orbit-sound-muted";
  const masterVolume = 0.44;

  let audioContext = null;
  let masterGain = null;
  let spaceDelay = null;
  let delayFilter = null;
  let delayFeedback = null;
  let delayReturn = null;
  let muted = readMutedSetting();
  let audioReady = false;

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

    spaceDelay = audioContext.createDelay(0.75);
    spaceDelay.delayTime.value = 0.135;

    delayFilter = audioContext.createBiquadFilter();
    delayFilter.type = "lowpass";
    delayFilter.frequency.value = 1700;

    delayFeedback = audioContext.createGain();
    delayFeedback.gain.value = 0.26;

    delayReturn = audioContext.createGain();
    delayReturn.gain.value = 0.18;

    spaceDelay.connect(delayFilter);
    delayFilter.connect(delayFeedback);
    delayFeedback.connect(spaceDelay);
    delayFilter.connect(delayReturn);
    delayReturn.connect(masterGain);

    return audioContext;
  }

  function updateSoundButton() {
    if (!soundButton) return;

    soundButton.textContent = muted ? "🔇" : "🔊";
    soundButton.setAttribute("aria-label", muted ? "Unmute sound effects" : "Mute sound effects");
  }

  function unlockAudio() {
    if (muted) return Promise.resolve(false);

    const context = getAudioContext();
    if (!context) return Promise.resolve(false);

    if (context.state === "running") {
      audioReady = true;
      return Promise.resolve(true);
    }

    return context.resume()
      .then(() => {
        audioReady = context.state === "running";
        return audioReady;
      })
      .catch(() => false);
  }

  function withAudio(callback) {
    if (muted) return;

    const context = getAudioContext();
    if (!context || !masterGain) return;

    if (context.state === "running") {
      audioReady = true;
      callback(context);
      return;
    }

    context.resume()
      .then(() => {
        if (context.state !== "running") return;
        audioReady = true;
        callback(context);
      })
      .catch(() => {});
  }

  function connectVoice(context, node, echoAmount = 0.08) {
    node.connect(masterGain);

    if (!spaceDelay || echoAmount <= 0) return;

    const echoSend = context.createGain();
    echoSend.gain.value = echoAmount;
    node.connect(echoSend);
    echoSend.connect(spaceDelay);
  }

  function toneAt(context, start, frequency, endFrequency, duration, volume = 0.1, type = "sine", filterFrequency = 2200, echoAmount = 0.1) {
    const safeStart = context.currentTime + Math.max(0, start);
    const safeEnd = safeStart + duration;
    const oscillator = context.createOscillator();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(Math.max(20, frequency), safeStart);

    if (endFrequency && endFrequency !== frequency) {
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), safeEnd);
    }

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(filterFrequency, safeStart);

    gain.gain.setValueAtTime(0.0001, safeStart);
    gain.gain.exponentialRampToValueAtTime(volume, safeStart + 0.014);
    gain.gain.exponentialRampToValueAtTime(0.0001, safeEnd);

    oscillator.connect(filter);
    filter.connect(gain);
    connectVoice(context, gain, echoAmount);
    oscillator.start(safeStart);
    oscillator.stop(safeEnd + 0.04);
  }

  function noiseAt(context, start, duration, volume = 0.06, filterFrequency = 900, filterType = "lowpass", echoAmount = 0.04) {
    const safeStart = context.currentTime + Math.max(0, start);
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
    connectVoice(context, gain, echoAmount);
    source.start(safeStart);
    source.stop(safeStart + duration);
  }

  function moveOut() {
    withAudio((context) => {
      toneAt(context, 0, 420, 760, 0.105, 0.105, "sine", 1900, 0.13);
      toneAt(context, 0.018, 840, 1120, 0.085, 0.042, "triangle", 2300, 0.09);
    });
  }

  function moveIn() {
    withAudio((context) => {
      toneAt(context, 0, 360, 210, 0.105, 0.095, "sine", 1700, 0.12);
      toneAt(context, 0.018, 240, 150, 0.085, 0.04, "triangle", 1100, 0.08);
    });
  }

  function clearRun() {
    withAudio((context) => {
      toneAt(context, 0, 440, 660, 0.12, 0.09, "triangle", 2200, 0.14);
      toneAt(context, 0.09, 660, 990, 0.16, 0.095, "sine", 2600, 0.18);
      toneAt(context, 0.2, 880, 1320, 0.2, 0.055, "sine", 3200, 0.22);
    });
  }

  function star() {
    withAudio((context) => {
      toneAt(context, 0, 990, 1480, 0.085, 0.085, "sine", 3600, 0.2);
      toneAt(context, 0.055, 1480, 1980, 0.11, 0.065, "triangle", 4000, 0.18);
      noiseAt(context, 0.015, 0.08, 0.022, 2600, "bandpass", 0.14);
    });
  }

  function extraLife() {
    withAudio((context) => {
      toneAt(context, 0, 520, 660, 0.12, 0.085, "triangle", 2100, 0.14);
      toneAt(context, 0.1, 660, 880, 0.14, 0.09, "sine", 2600, 0.18);
      toneAt(context, 0.22, 880, 1320, 0.26, 0.085, "sine", 3400, 0.24);
    });
  }

  function crashFx() {
    withAudio((context) => {
      noiseAt(context, 0, 0.18, 0.08, 620, "lowpass", 0.04);
      toneAt(context, 0, 118, 52, 0.24, 0.12, "triangle", 900, 0.06);
    });
  }

  function gameOver() {
    withAudio((context) => {
      toneAt(context, 0, 220, 140, 0.18, 0.095, "triangle", 1200, 0.1);
      toneAt(context, 0.16, 150, 72, 0.34, 0.085, "sine", 900, 0.12);
      noiseAt(context, 0.05, 0.22, 0.035, 500, "lowpass", 0.04);
    });
  }

  function cometWarning() {
    withAudio((context) => {
      toneAt(context, 0, 128, 128, 0.16, 0.12, "sine", 900, 0.08);
      toneAt(context, 0.2, 128, 168, 0.18, 0.12, "sine", 1100, 0.1);
      toneAt(context, 0.02, 512, 420, 0.1, 0.025, "triangle", 1600, 0.05);
      noiseAt(context, 0.02, 0.16, 0.022, 460, "bandpass", 0.04);
    });
  }

  function cometImpact() {
    withAudio((context) => {
      noiseAt(context, 0, 0.26, 0.095, 520, "lowpass", 0.06);
      toneAt(context, 0, 86, 30, 0.42, 0.15, "triangle", 720, 0.08);
      toneAt(context, 0.04, 46, 24, 0.52, 0.07, "sine", 520, 0.06);
    });
  }

  function reward() {
    withAudio((context) => {
      toneAt(context, 0, 440, 660, 0.12, 0.085, "triangle", 2200, 0.18);
      toneAt(context, 0.09, 660, 990, 0.18, 0.08, "sine", 2800, 0.22);
      toneAt(context, 0.22, 990, 1480, 0.32, 0.06, "sine", 3600, 0.28);
      noiseAt(context, 0.05, 0.22, 0.018, 2800, "bandpass", 0.2);
    });
  }

  function warp() {
    withAudio((context) => {
      toneAt(context, 0, 130, 1180, 1.2, 0.095, "triangle", 1800, 0.22);
      toneAt(context, 0.22, 260, 1960, 1.0, 0.07, "sine", 3000, 0.24);
      noiseAt(context, 0.05, 1.05, 0.04, 1700, "bandpass", 0.18);
      toneAt(context, 1.04, 880, 1760, 0.22, 0.08, "sine", 3600, 0.28);
    });
  }

  function start() {
    withAudio((context) => {
      toneAt(context, 0, 260, 440, 0.12, 0.08, "triangle", 1900, 0.14);
      toneAt(context, 0.1, 440, 660, 0.14, 0.08, "sine", 2300, 0.18);
      noiseAt(context, 0.02, 0.16, 0.016, 2200, "bandpass", 0.14);
    });
  }

  function testBeep() {
    withAudio((context) => {
      toneAt(context, 0, 660, 880, 0.1, 0.085, "sine", 2600, 0.16);
      toneAt(context, 0.08, 990, 1320, 0.12, 0.065, "triangle", 3300, 0.18);
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
      unlockAudio().then((ready) => {
        if (ready) testBeep();
      });
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

    if (typeof setOrbitScreen === "function") {
      const originalSetOrbitScreen = setOrbitScreen;
      setOrbitScreen = function setOrbitScreenWithSound(title, lines, tone = "normal") {
        originalSetOrbitScreen(title, lines, tone);

        if (title === "GAME OVER" && Array.isArray(lines) && lines[0] === "Comet impact.") {
          cometImpact();
          gameOver();
        }
      };
    }

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
    unlockAudio,
    testBeep,
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
