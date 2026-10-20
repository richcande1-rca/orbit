// Orbit's lightweight adaptive difficulty and mid-run collectible upgrades.
// Loaded after the screen/event layers, before sound hooks.
(() => {
  const MOVE_COOLDOWN = 0.28;
  const COLORS = {
    shield: "#55eeff",
    stasis: "#b889ff",
    repair: "#ffe08a",
  };
  const MODE_SPEED = { easy: 0.82, normal: 1, hard: 1.14 };
  const MODE_SIZE = { easy: 0.88, normal: 1, hard: 1.06 };
  const pickSprites = {};

  let mercy = 1;
  let recoveryDelay = 0;
  let cleanStreak = 0;
  let damagedThisRun = false;
  let shieldReady = false;
  let stasisSeconds = 0;
  let pickup = null;
  let spawnedThisRun = false;
  let trackedLevel = level;
  let runAge = 0;
  let animationAge = 0;
  let lastBadge = "";

  const badge = document.createElement("div");
  badge.id = "orbit-upgrade-status";
  badge.setAttribute("aria-live", "polite");
  Object.assign(badge.style, {
    position: "fixed",
    top: "max(76px, env(safe-area-inset-top))",
    left: "12px",
    zIndex: "8",
    padding: "5px 10px",
    border: "1px solid rgba(120,230,255,0.35)",
    borderRadius: "999px",
    background: "rgba(2,9,28,0.78)",
    color: "#e9ffff",
    font: "800 11px/1.3 system-ui,sans-serif",
    letterSpacing: "0.08em",
    pointerEvents: "none",
    display: "none",
  });
  document.body.appendChild(badge);

  function mode() {
    return typeof window.orbitGetDifficulty === "function"
      ? window.orbitGetDifficulty()
      : "normal";
  }

  function pressure() {
    // Each completed cycle escalates modestly, capped to preserve playable
    // timing. Secondary counterflow changes the decisions, not just speed.
    const cycle = Math.max(1, window.orbitGetCycle?.() || 1);
    const cyclePressure = Math.min(0.28, (cycle - 1) * 0.08);
    if (mode() === "easy") return 1 + cyclePressure;
    const lateRun = Math.max(0, Math.min(8, level - 4)) * 0.028;
    const momentum = Math.min(5, cleanStreak) * 0.045;
    return 1 + cyclePressure + lateRun + momentum;
  }

  function scale() {
    const anomalyScale = window.orbitGetGravityPulseFactor?.() || 1;
    return (MODE_SPEED[mode()] || 1) * mercy * pressure() * anomalyScale * (stasisSeconds > 0 ? 0.64 : 1);
  }

  // Mobile rings sit much closer together than desktop rings. Scale debris
  // from actual ring spacing, not pixel ratio or a fixed phone breakpoint.
  // 375px portrait / five rings -> about 0.64x; desktop -> exactly 1x.
  // Keep the original hazard radius cached so resizing never compounds.
  function viewportHazardScale() {
    if (rings.length < 2) return 1;
    const spacing = Math.abs(rings[1] - rings[0]);
    if (!Number.isFinite(spacing) || spacing <= 0) return 1;
    return Math.max(0.55, Math.min(1, spacing / 32));
  }

  function applyHazardBalance() {
    const speedScale = scale();
    const viewportScale = viewportHazardScale();
    const sizeScale = (MODE_SIZE[mode()] || 1) * viewportScale;
    for (const hazard of hazards) {
      // Keep the natural orbit pattern intact; scale from the original values
      // so repeated adjustments never compound or reverse its direction.
      if (hazard.orbitBaseSpeed === undefined) hazard.orbitBaseSpeed = hazard.speed;
      if (hazard.orbitBaseSize === undefined) hazard.orbitBaseSize = hazard.size;
      hazard.speed = hazard.orbitBaseSpeed * speedScale;
      hazard.size = hazard.orbitBaseSize * sizeScale;
      // The glow/wobble is decorative; scale its amplitude with the
      // physical hit radius so the visual silhouette stays proportional.
      hazard.orbitViewportSizeScale = viewportScale;
    }
  }

  function updateBadge() {
    const parts = [];
    if (shieldReady) parts.push("SHIELD READY");
    if (stasisSeconds > 0) parts.push("SLOW FIELD " + Math.ceil(stasisSeconds) + "s");
    const next = parts.join("  ·  ");
    if (next === lastBadge) return;
    lastBadge = next;
    badge.textContent = next;
    badge.style.display = next ? "block" : "none";
  }

  function recordRealHit() {
    if (mode() === "easy") {
      // Preserve Easy's gentler recovery and second-chance pickups.
      mercy = Math.max(0.74, mercy - 0.09);
      spawnedThisRun = false;
    } else {
      // Brief relief after a hit, rather than a permanent reduction lasting
      // several more cleared runs.
      mercy = 0.84;
      recoveryDelay = 3.0;
      cleanStreak = 0;
      damagedThisRun = true;
    }
    applyHazardBalance();
    pickup = null;
    runAge = 0;
  }

  function observeRunChange() {
    if (trackedLevel === level) return;
    if (level > trackedLevel) {
      if (mode() === "easy") {
        mercy = Math.min(1, mercy + 0.055);
      } else {
        cleanStreak = damagedThisRun ? 0 : Math.min(5, cleanStreak + 1);
      }
      damagedThisRun = false;
    }
    trackedLevel = level;
    spawnedThisRun = false;
    pickup = null;
    runAge = 0;
    applyHazardBalance();
  }

  function addCrossTraffic() {
    const difficulty = mode();
    const cycle = Math.max(1, window.orbitGetCycle?.() || 1);
    if (level > 12 || level < (cycle === 1 ? 6 : 3)) return;
    if (difficulty === "easy" && cycle === 1) return;

    // The first two runs remain an introduction, even in later cycles.
    // Further cycles add a limited counter-moving lane starting at Run 3.
    // Retain each run's distinctive patterns, including Run 6 crosscurrent.
    const count = cycle > 1
      ? (level === 6 ? 0
        : difficulty === "easy" ? (cycle >= 3 && Math.random() < 0.5 ? 1 : 0)
        : Math.random() < Math.min(0.9, 0.55 + (cycle - 2) * 0.10) ? 1 : 0)
      : level >= 12 && difficulty === "hard" ? 2
      : level >= 8 ? 1
      : Math.random() < (level === 6 ? 0.35 : 0.6) ? 1 : 0;
    const freeLanes = [];
    for (let lane = 2; lane < ringCount; lane++) {
      if (hazards.filter(h => h.lane === lane).length === 1) freeLanes.push(lane);
    }
    for (let i = 0; i < count && freeLanes.length; i++) {
      const laneIndex = Math.floor(Math.random() * freeLanes.length);
      const lane = freeLanes.splice(laneIndex, 1)[0];
      const original = hazards.find(h => h.lane === lane);
      const counter = createOrbitHazard(lane, orbitRunTrafficSpeedScale(), true);
      // Do not sandwich a new counter-hazard on top of existing debris.
      counter.angle = (original.angle + rand(1.45, TAU - 1.45)) % TAU;
      hazards.push(counter);
    }
  }

  function maybeSpawnPickup() {
    if (pickup || spawnedThisRun || level < 2 || state !== "running") return;
    if (player.lane < 1) return;
    // Offer one visible choice mid-crossing, not an unavoidable bonus
    // or an item on an already-passed lane.
    if (player.lane < 2 && runAge < 3.2) return;
    const difficulty = mode();
    spawnedThisRun = true; // At most one offer per run on Normal/Hard.
    if (difficulty !== "easy" && Math.random() < (difficulty === "hard" ? 0.32 : 0.20)) return;
    const r = Math.random();
    let type = difficulty === "easy"
      ? (r < 0.44 ? "shield" : r < 0.80 ? "stasis" : "repair")
      : (r < 0.53 ? "shield" : r < 0.92 ? "stasis" : "repair");
    const lifeCap = difficulty === "hard" ? 4 : difficulty === "normal" ? 5 : Infinity;
    if (type === "repair" && lives >= lifeCap) type = r < 0.5 ? "shield" : "stasis";
    pickup = {
      type,
      lane: player.lane,
      angle: (player.angle + 0.60 + Math.random() * 0.26) % TAU,
      timeLeft: difficulty === "easy" ? 7.5 : 6.2,
    };
  }

  function collectPickup() {
    const kind = pickup.type;
    pickup = null;
    flash = Math.max(flash, 0.34);
    if (kind === "shield") {
      window.orbitAudio?.star?.();
      shieldReady = true;
      updateHud("SHIELD ACQUIRED — blocks one hit!");
    } else if (kind === "stasis") {
      window.orbitAudio?.star?.();
      stasisSeconds = 6;
      applyHazardBalance();
      updateHud("SLOW FIELD — debris slowed for 6 seconds!");
    } else {
      window.orbitAudio?.extraLife?.();
      lives += 1;
      updateHud("REPAIR +1 LIFE!");
      updateControlButtons();
    }
    updateBadge();
    updateHud();
  }

  function tryAbsorbHit(label) {
    if (!shieldReady || state !== "running" || invulnerable > 0) return false;
    shieldReady = false;
    invulnerable = Math.max(invulnerable, 1.0);
    flash = Math.max(flash, 0.52);
    shake = Math.max(shake, 0.16);
    updateBadge();
    updateHud("SHIELD ABSORBED " + label + "!");
    return true;
  }

  // The comet code calls these explicitly because its three-life impact
  // happens outside the normal debris crash() function.
  window.orbitPowerupAbsorbComet = () => tryAbsorbHit("COMET");
  window.orbitPowerupRecordCometHit = () => recordRealHit();

  const originalMakeHazards = makeHazards;
  makeHazards = function makeHazardsWithAdaptiveSpeed() {
    originalMakeHazards();
    addCrossTraffic();
    applyHazardBalance();
  };
  // Run 8's safe corridor creates its hazard after its original spawn pass.
  window.orbitApplyHazardBalance = applyHazardBalance;

  // The game's original resize listener runs first and rebuilds rings.
  // Reapply from each hazard's cached original size after rotation/resizing.
  window.addEventListener("resize", () => applyHazardBalance());

  const originalStartGame = startGame;
  startGame = function startGameWithUpgrades() {
    mercy = 1;
    recoveryDelay = 0;
    cleanStreak = 0;
    damagedThisRun = false;
    shieldReady = false;
    stasisSeconds = 0;
    pickup = null;
    spawnedThisRun = false;
    runAge = 0;
    trackedLevel = 1;
    originalStartGame();
    observeRunChange();
    applyHazardBalance();
    updateBadge();
  };

  const originalMovePlayer = movePlayer;
  movePlayer = function movePlayerWithResponsiveControls(direction) {
    const beforeLane = player.lane;
    const beforeLevel = level;
    originalMovePlayer(direction);
    if (state === "running" && (player.lane !== beforeLane || level !== beforeLevel)) {
      moveCooldown = Math.min(moveCooldown, MOVE_COOLDOWN);
      observeRunChange();
      maybeSpawnPickup();
    }
  };

  const originalCrash = crash;
  crash = function crashWithPowerupShield() {
    if (window.orbitGetTestMode?.()) return originalCrash();
    if (tryAbsorbHit("DEBRIS")) return;
    const beforeLives = lives;
    originalCrash();
    if (lives < beforeLives) recordRealHit();
  };

  const originalUpdate = update;
  update = function updateWithOrbitUpgrades(dt) {
    originalUpdate(dt);
    observeRunChange();
    if (state !== "running") return;

    runAge += dt;
    animationAge += dt;

    if (mode() !== "easy" && mercy < 1) {
      recoveryDelay = Math.max(0, recoveryDelay - dt);
      if (recoveryDelay === 0) {
        mercy = Math.min(1, mercy + dt * 0.075);
        applyHazardBalance();
      }
    }

    if (stasisSeconds > 0) {
      stasisSeconds = Math.max(0, stasisSeconds - dt);
      if (stasisSeconds === 0) applyHazardBalance();
    }

    if (pickup) {
      pickup.timeLeft -= dt;
      if (pickup.timeLeft <= 0) {
        pickup = null;
      } else if (
        player.lane === pickup.lane &&
        angleDistance(player.angle, pickup.angle) < 0.16
      ) {
        collectPickup();
      }
    }

    maybeSpawnPickup();
    updateBadge();
  };

  function spriteFor(kind) {
    if (pickSprites[kind]) return pickSprites[kind];
    const sprite = document.createElement("canvas");
    sprite.width = 64;
    sprite.height = 64;
    const g = sprite.getContext("2d");
    if (!g) return null;

    g.fillStyle = "rgba(5,12,32,0.94)";
    g.strokeStyle = COLORS[kind];
    g.lineWidth = 3;
    g.beginPath();
    g.arc(32, 32, 24, 0, TAU);
    g.fill();
    g.stroke();
    g.globalAlpha = 0.24;
    g.beginPath();
    g.arc(32, 32, 29, 0, TAU);
    g.stroke();
    g.globalAlpha = 1;
    g.lineWidth = 3.4;
    g.lineCap = "round";
    g.lineJoin = "round";

    if (kind === "shield") {
      g.beginPath();
      g.moveTo(32, 17); g.lineTo(46, 23); g.lineTo(43, 39);
      g.lineTo(32, 48); g.lineTo(21, 39); g.lineTo(18, 23);
      g.closePath(); g.stroke();
    } else if (kind === "stasis") {
      g.beginPath();
      g.moveTo(23, 19); g.lineTo(41, 19);
      g.moveTo(23, 45); g.lineTo(41, 45);
      g.moveTo(25, 21); g.lineTo(39, 43);
      g.moveTo(39, 21); g.lineTo(25, 43);
      g.stroke();
    } else {
      g.lineWidth = 6;
      g.beginPath();
      g.moveTo(32, 21); g.lineTo(32, 43);
      g.moveTo(21, 32); g.lineTo(43, 32);
      g.stroke();
    }

    pickSprites[kind] = sprite;
    return sprite;
  }

  const originalDraw = draw;
  draw = function drawWithOrbitUpgradePickup() {
    originalDraw();
    if (!pickup || state !== "running") return;
    const sprite = spriteFor(pickup.type);
    if (!sprite) return;
    const p = pointOnRing(pickup.lane, pickup.angle);
    const pulse = 0.95 + Math.sin(animationAge * 5) * 0.07;
    const s = 41 * pulse;
    ctx.save();
    ctx.globalAlpha = Math.min(1, pickup.timeLeft / 0.8);
    ctx.drawImage(sprite, p.x - s / 2, p.y - s / 2, s, s);
    ctx.restore();
  };

  // Presentation-only state for the compact cockpit readout.
  // Existing shield and slow-field mechanics remain unchanged.
  window.orbitUpgradeStatus = () => ({
    shield: shieldReady,
    stasisSeconds,
  });

  window.addEventListener("orbitdifficultychange", applyHazardBalance);
  updateBadge();
})();
