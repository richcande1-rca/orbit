// Lightweight arcade moments: a telegraphed gravity anomaly and skill-based near misses.
// This layer only adds behavior; Nova's controls and the collision hit boxes stay intact.
(() => {
  const PULSE_RUNS = new Set([4, 7, 11]);
  const PULSE_WARNING = 1.4;
  const PULSE_DURATION = 3.6;
  const PULSE_START = 1.15;
  const NEAR_MISS_POINTS = 2;
  const COMBO_WINDOW = 9;

  let trackedRun = level;
  let runAge = 0;
  let pulseStage = "done";
  let pulseAge = 0;
  let gravityFactor = 1;
  let trackedLane = player.lane;
  let laneAge = 0;
  let closeApproaches = new WeakMap();
  let rewardedHazards = new WeakSet();
  let combo = 0;
  let comboTime = 0;
  let popup = "";
  let popupTime = 0;
  let popupAngle = 0;
  let popupLane = 0;

  // The adaptive-difficulty layer reads this during its regular balancing,
  // preserving all existing mode, recovery and slow-field modifiers.
  window.orbitGetGravityPulseFactor = () => {
    return pulseStage === "active" && trackedRun === level ? gravityFactor : 1;
  };

  function difficulty() {
    return window.orbitGetDifficulty?.() || "normal";
  }

  function clearCombo() {
    combo = 0;
    comboTime = 0;
    closeApproaches = new WeakMap();
    popupTime = 0;
  }

  function syncRun(resetAll = false) {
    if (!resetAll && trackedRun === level) return;
    trackedRun = level;
    runAge = 0;
    pulseAge = 0;
    pulseStage = PULSE_RUNS.has(level) ? "idle" : "done";
    gravityFactor = 1;
    trackedLane = player.lane;
    laneAge = 0;
    closeApproaches = new WeakMap();
    rewardedHazards = new WeakSet();
    clearCombo();
    window.orbitApplyHazardBalance?.();
  }

  function switchPulse(next) {
    pulseStage = next;
    pulseAge = 0;
    if (next === "warning") {
      updateHud("GRAVITY PULSE INBOUND — WATCH THE RINGS!");
    } else if (next === "active") {
      gravityFactor = difficulty() === "easy" ? 1.12 : difficulty() === "hard" ? 1.42 : 1.34;
      window.orbitApplyHazardBalance?.();
      updateHud("GRAVITY PULSE — ORBITAL DEBRIS ACCELERATING!");
    } else if (next === "done") {
      gravityFactor = 1;
      window.orbitApplyHazardBalance?.();
      updateHud("GRAVITY NORMALIZED.");
    }
  }

  function updatePulse(dt) {
    if (pulseStage === "done") return;
    if (pulseStage === "idle") {
      if (runAge >= PULSE_START) switchPulse("warning");
      return;
    }
    pulseAge += dt;
    if (pulseStage === "warning" && pulseAge >= PULSE_WARNING) {
      switchPulse("active");
    } else if (pulseStage === "active" && pulseAge >= PULSE_DURATION) {
      switchPulse("done");
    }
  }

  function awardNearMiss(hazard, lane = player.lane, angle = player.angle) {
    rewardedHazards.add(hazard); // A given piece of debris pays once per run.
    combo = comboTime > 0 ? Math.min(4, combo + 1) : 1;
    comboTime = COMBO_WINDOW;
    const points = NEAR_MISS_POINTS * combo;
    score += points;
    popup = "NEAR MISS ×" + combo + "  +" + points;
    popupTime = 1.05;
    popupAngle = angle;
    popupLane = lane;
    window.orbitAudio?.star?.();
    updateHud(popup);
  }

  function updateNearMisses(dt) {
    if (trackedLane !== player.lane) {
      trackedLane = player.lane;
      laneAge = 0;
      closeApproaches = new WeakMap();
    }
    laneAge += dt;
    comboTime = Math.max(0, comboTime - dt);
    if (comboTime === 0) combo = 0;
    popupTime = Math.max(0, popupTime - dt);

    // During invulnerability and on the launch ring, traffic cannot earn bonus points.
    // Require time spent on a threatened ring: jumping briefly near debris isn't a pass.
    if (invulnerable > 0 || laneAge < 0.24 || player.lane < 1) return;
    const radius = rings[player.lane];
    if (!radius) return;

    for (const hazard of hazards) {
      if (hazard.lane !== player.lane || rewardedHazards.has(hazard)) continue;
      const hitRadius = hazard.size / radius + 0.08;
      const separation = angleDistance(player.angle, hazard.angle);
      const near = closeApproaches.get(hazard) === true;

      if (separation > hitRadius + 0.025 && separation < hitRadius + 0.18) {
        closeApproaches.set(hazard, true);
      } else if (near && separation >= hitRadius + 0.24) {
        closeApproaches.delete(hazard);
        awardNearMiss(hazard);
      }
    }
  }

  const originalStart = startGame;
  startGame = function startWithOrbitalMoments() {
    pulseStage = "done";
    gravityFactor = 1;
    originalStart();
    syncRun(true);
  };

  const originalMove = movePlayer;
  movePlayer = function moveWithNearMissEscape(direction) {
    const fromLane = player.lane;
    const fromLevel = level;
    const fromAngle = player.angle;
    const fromState = state;
    let escapedHazard = null;
    // In Orbit, a narrow escape usually happens *while changing rings*.
    // Check the ring being abandoned, but only award after a successful move.
    if (fromState === "running" && invulnerable <= 0 && laneAge >= 0.24 && rings[fromLane]) {
      for (const hazard of hazards) {
        if (hazard.lane !== fromLane || rewardedHazards.has(hazard)) continue;
        const collisionRadius = hazard.size / rings[fromLane] + 0.08;
        const separation = angleDistance(fromAngle, hazard.angle);
        if (separation > collisionRadius + 0.025 && separation < collisionRadius + 0.18) {
          escapedHazard = hazard;
          break;
        }
      }
    }
    originalMove(direction);
    if (player.lane !== fromLane) {
      laneAge = 0;
      trackedLane = player.lane;
      closeApproaches = new WeakMap();
      if (escapedHazard && level === fromLevel && state === "running") {
        awardNearMiss(escapedHazard, fromLane, fromAngle);
      }
    }
  };

  const originalUpdate = update;
  update = function updateWithOrbitalMoments(dt) {
    originalUpdate(dt);
    syncRun();
    if (state !== "running") return; // Pauses, rewards and stage events freeze these timers.
    runAge += dt;
    updatePulse(dt);
    updateNearMisses(dt);
  };

  const originalCrash = crash;
  crash = function crashWithNearMissStreak() {
    if (state === "running" && invulnerable <= 0) clearCombo();
    originalCrash();
  };

  // Comet strikes bypass crash(); reset streaks for both real hits and shield saves.
  const originalRecordCometHit = window.orbitPowerupRecordCometHit;
  if (typeof originalRecordCometHit === "function") {
    window.orbitPowerupRecordCometHit = (...args) => {
      clearCombo();
      return originalRecordCometHit(...args);
    };
  }
  const originalAbsorbComet = window.orbitPowerupAbsorbComet;
  if (typeof originalAbsorbComet === "function") {
    window.orbitPowerupAbsorbComet = (...args) => {
      const absorbed = originalAbsorbComet(...args);
      if (absorbed) clearCombo();
      return absorbed;
    };
  }

  const originalDraw = draw;
  draw = function drawWithOrbitalMoments() {
    originalDraw();
    if (state === "running" && (pulseStage === "warning" || pulseStage === "active")) {
      ctx.save();
      ctx.lineWidth = pulseStage === "warning" ? 2 : 3;
      ctx.strokeStyle = pulseStage === "warning" ? "#ffcb8f" : "#ff76dc";
      ctx.globalAlpha = pulseStage === "warning" ? 0.45 : 0.66;
      // Simple strokes (no blur or per-frame canvas allocations) keep LITE fast.
      for (let i = 1; i < ringCount; i++) {
        ctx.globalAlpha = 0.14 + (i % 2) * 0.1;
        ctx.beginPath();
        ctx.arc(centerX, centerY, rings[i], 0, TAU);
        ctx.stroke();
      }
      ctx.globalAlpha = 0.75;
      const maxRadius = rings[ringCount - 1];
      const progress = pulseStage === "warning"
        ? pulseAge / PULSE_WARNING
        : (pulseAge % 1.2) / 1.2;
      const radius = planetRadius + (maxRadius - planetRadius) * Math.min(1, progress);
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }
    if (popupTime > 0 && state === "running" && rings[popupLane]) {
      const p = pointOnRing(popupLane, popupAngle);
      ctx.save();
      ctx.globalAlpha = Math.min(1, popupTime * 1.6);
      ctx.font = "bold 14px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = "#f8de87";
      ctx.fillText(popup, p.x, p.y - 24 - (1.05 - popupTime) * 18);
      ctx.restore();
    }
  };

  window.addEventListener("orbitdifficultychange", () => {
    if (pulseStage === "active") {
      gravityFactor = difficulty() === "easy" ? 1.12 : difficulty() === "hard" ? 1.42 : 1.34;
      window.orbitApplyHazardBalance?.();
    }
  });
  syncRun(true);
})();
