// NOVA OVERDRIVE: earned arcade power-up, not a movement-speed modifier.
// Sits last in the gameplay hook chain and preserves Orbital Surge's timing.
(() => {
  const FULL = 100;
  const DURATION = 5;
  const SHOCKWAVE_BONUS = 25;
  const MAX_SHOCKWAVE_HITS = 4;
  const CHARGE = Object.freeze({
    nearMiss: 30,
    bonusStar: 16,
    chaseStar: 16,
    orbitalSurge: 22,
    runClear: 12,
  });

  let energy = 0;
  let activeSeconds = 0;
  let waveSeconds = 0;
  let animation = 0;
  let clearedHazards = 0;

  const meter = document.createElement("div");
  meter.id = "orbit-overdrive";
  meter.className = "orbit-overdrive";
  meter.setAttribute("role", "status");
  meter.setAttribute("aria-label", "Nova Overdrive charge");
  meter.innerHTML =
    '<div class="orbit-overdrive-caption"><span>NOVA OVERDRIVE</span><span class="orbit-overdrive-readout">0%</span></div>' +
    '<div class="orbit-overdrive-track"><span class="orbit-overdrive-fill"></span></div>';
  const fill = meter.querySelector(".orbit-overdrive-fill");
  const readout = meter.querySelector(".orbit-overdrive-readout");
  document.body.appendChild(meter);
  // Avoid repeatedly writing DOM styles on every 1/60s physics substep.
  // Mobile LITE can run several update steps per animation frame.
  let lastVisible = null;
  let lastActive = null;
  let lastText = "";
  let lastFill = "";

  function syncMeter() {
    const show = state !== "waiting" && state !== "gameover" &&
      !document.body.classList.contains("title-screen-active");
    const active = activeSeconds > 0;
    const text = active ? Math.max(0, activeSeconds).toFixed(1) + "s · ×2"
      : Math.round(energy) + "%";
    const width = active ? "100%" : energy + "%";
    if (show !== lastVisible) {
      meter.classList.toggle("orbit-overdrive-visible", show);
      lastVisible = show;
    }
    if (active !== lastActive) {
      meter.classList.toggle("orbit-overdrive-active", active);
      lastActive = active;
    }
    if (text !== lastText) {
      readout.textContent = text;
      lastText = text;
    }
    if (width !== lastFill) {
      fill.style.width = width;
      lastFill = width;
    }
  }

  function shockwave() {
    const p = pointOnRing(player.lane, player.angle);
    if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) return 0;
    const separation = rings.length > 1 ? Math.abs(rings[1] - rings[0]) : 32;
    const radius = Math.max(58, Math.min(130, separation * 2.55));
    let removed = 0;
    hazards = hazards.filter((hazard) => {
      if (removed >= MAX_SHOCKWAVE_HITS) return true;
      const h = pointOnRing(hazard.lane, hazard.angle);
      const dx = p.x - h.x;
      const dy = p.y - h.y;
      if (dx * dx + dy * dy > (radius + hazard.size) ** 2) return true;
      removed += 1;
      return false;
    });
    return removed;
  }

  function engage() {
    if (activeSeconds > 0 || energy < FULL || state !== "running") return;
    energy = 0;
    activeSeconds = DURATION;
    waveSeconds = 0.65;
    clearedHazards = shockwave();
    const gained = SHOCKWAVE_BONUS + clearedHazards * 5;
    score += gained;
    flash = Math.max(flash, 0.52);
    shake = Math.max(shake, 0.10);
    window.orbitAudio?.reward?.();
    updateHud("NOVA OVERDRIVE! +" + gained + " · ×2 NEAR MISSES");
    syncMeter();
  }

  function charge(kind) {
    const value = CHARGE[kind] || 0;
    if (!value || activeSeconds > 0 || state === "waiting" ||
        state === "paused" || state === "gameover") return;
    energy = Math.min(FULL, energy + value);
    if (energy >= FULL) engage();
    syncMeter();
  }

  window.orbitOverdriveCharge = charge;
  window.orbitOverdriveActive = () => activeSeconds > 0 && state === "running";
  window.orbitOverdriveStatus = () => ({
    energy, activeSeconds, clearedHazards,
  });

  const originalStart = startGame;
  startGame = function startGameWithOverdrive() {
    energy = 0;
    activeSeconds = 0;
    waveSeconds = 0;
    animation = 0;
    clearedHazards = 0;
    originalStart();
    syncMeter();
  };

  // All ordinary run advances (including the animated first three levels)
  // pass this single function; reward only genuine completion.
  if (typeof advanceOrbitToNextRun === "function") {
    const originalAdvance = advanceOrbitToNextRun;
    advanceOrbitToNextRun = function advanceOrbitWithOverdrive() {
      const before = level;
      originalAdvance();
      if (level > before) charge("runClear");
    };
  }

  // The final run ends on the SPACE WARP card instead of advancing the
  // numeric level; reserve its earned energy for the next cycle.
  if (typeof showOrbitCompleteScreen === "function") {
    const originalComplete = showOrbitCompleteScreen;
    showOrbitCompleteScreen = function completeOrbitWithOverdrive() {
      originalComplete();
      charge("runClear");
    };
  }

  // The ordinary moving bonus star is handled through its actual collection,
  // not by proximity or attempted taps, and is never counted twice.
  const originalCheckBonusStar = checkBonusStar;
  checkBonusStar = function collectBonusStarWithOverdrive() {
    const before = starsCollected;
    originalCheckBonusStar();
    if (starsCollected > before) charge("bonusStar");
  };

  const originalCrash = crash;
  crash = function crashWithOverdriveReset() {
    const before = lives;
    originalCrash();
    if (lives < before) {
      activeSeconds = 0;
      waveSeconds = 0;
      // Losing a life costs momentum, not the entire saved charge.
      energy = Math.floor(energy * 0.5);
      syncMeter();
    }
  };

  const originalUpdate = update;
  update = function updateWithOverdrive(dt) {
    if (state === "running" && activeSeconds === 0 && energy >= FULL) engage();

    const wasRunning = state === "running";
    const lifeBefore = lives;
    // Run the normal physics stack unmodified. OVERDRIVE rewards skill
    // without making ring-to-ring jumps harder to time.
    // Run 2's independently earned Orbital Surge remains untouched.
    originalUpdate(dt);

    // Comet damage is applied directly, outside the regular crash() hook.
    if (lives < lifeBefore && activeSeconds > 0) {
      activeSeconds = 0;
      waveSeconds = 0;
      energy = Math.floor(energy * 0.5);
    }
    if (state === "gameover") {
      activeSeconds = 0;
      waveSeconds = 0;
    }
    if (state === "running") {
      animation += dt;
      if (activeSeconds > 0 && wasRunning) {
        activeSeconds = Math.max(0, activeSeconds - dt);
      }
      if (waveSeconds > 0) waveSeconds = Math.max(0, waveSeconds - dt);
    }
    syncMeter();
  };

  const originalDraw = draw;
  draw = function drawWithOverdrive() {
    originalDraw();
    if (state !== "running" || (activeSeconds <= 0 && waveSeconds <= 0)) return;
    const p = pointOnRing(player.lane, player.angle);
    ctx.save();
    // Lightweight canvas arcs: friendly to the existing mobile LITE path.
    if (activeSeconds > 0) {
      const pulse = 0.45 + 0.23 * Math.sin(animation * 15);
      ctx.globalAlpha = pulse;
      ctx.strokeStyle = "#70f4ff";
      ctx.lineWidth = 2;
      for (let lane = 1; lane < ringCount; lane++) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, rings[lane], 0, TAU);
        ctx.stroke();
      }
      ctx.globalAlpha = 0.94;
      ctx.strokeStyle = "#aafaff";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(p.x, p.y, player.radius + 9 + Math.sin(animation * 17) * 2, 0, TAU);
      ctx.stroke();
      // Electric ribbons follow Nova without altering input or hitboxes.
      ctx.lineWidth = 2.4;
      for (let j = 0; j < 3; j++) {
        const a = player.angle - 0.13 - j * 0.085;
        const radius = rings[player.lane];
        ctx.globalAlpha = 0.72 - j * 0.18;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius + (j - 1) * 4, a - 0.12, a);
        ctx.stroke();
      }
    }
    if (waveSeconds > 0) {
      const progress = 1 - waveSeconds / 0.65;
      const spacing = rings.length > 1 ? Math.abs(rings[1] - rings[0]) : 32;
      const outer = Math.max(58, Math.min(130, spacing * 2.55));
      ctx.globalAlpha = (1 - progress) * 0.92;
      ctx.strokeStyle = "#c5ffff";
      ctx.lineWidth = 5 * (1 - progress) + 1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 12 + progress * outer, 0, TAU);
      ctx.stroke();
      ctx.globalAlpha = (1 - progress) * 0.85;
      ctx.fillStyle = "#e8ffff";
      ctx.textAlign = "center";
      ctx.font = "900 15px system-ui, sans-serif";
      ctx.fillText("NOVA OVERDRIVE!", p.x, p.y - 30 - progress * 25);
    }
    ctx.restore();
  };

  syncMeter();
})();
