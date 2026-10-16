// A living planet: lightweight moving cloud bands, auroras, and one warned electrical storm.
// The storm is a special Run 5 hazard; it uses the normal crash/shield/test-mode pipeline.
(() => {
  const STORM_RUN = 5;
  const WARNING_SECONDS = 2.0;
  const ACTIVE_SECONDS = 3.0;
  const WEATHER_BANDS = [-0.49, -0.23, 0.07, 0.32, 0.55];

  let weatherTime = 0;
  let observedRun = level;
  let stormStage = "done";
  let stormLane = -1;
  let stormAge = 0;

  function resetStormForRun() {
    observedRun = level;
    stormAge = 0;
    if (level === STORM_RUN && state === "running") {
      // Keep the first and outermost rings clear, so there is always a way out.
      stormLane = Math.random() < 0.5 ? 2 : 3;
      stormStage = "warning";
      updateHud("ION STORM FORMING — RING " + (stormLane + 1) + "!");
    } else {
      stormLane = -1;
      stormStage = "done";
    }
  }

  function advanceStorm(dt) {
    if (stormStage === "done" || stormStage === "idle") return;
    stormAge += dt;

    if (stormStage === "warning") {
      if (stormAge >= WARNING_SECONDS) {
        stormStage = "active";
        stormAge = 0;
        updateHud("ION STORM ACTIVE — LEAVE RING " + (stormLane + 1) + "!");
      }
      return;
    }

    if (stormAge >= ACTIVE_SECONDS) {
      stormStage = "done";
      stormAge = 0;
      updateHud("ION STORM CLEARED.");
      return;
    }

    // A continuous charged ring, not an invisible random strike.
    // No damage during the warning. Invulnerability and shield rules apply.
    if (state !== "running" || player.lane !== stormLane || invulnerable > 0) return;
    const previousLives = lives;
    const previousLane = player.lane;
    crash();

    // If a shield (or invincible test mode) absorbed the hit, move Nova to
    // a safe adjacent orbit so its invulnerability doesn't expire in place.
    if (state === "running" && player.lane === previousLane && invulnerable > 0) {
      player.lane = Math.max(0, stormLane - 1);
      moveCooldown = Math.max(moveCooldown, 0.28);
      updateHud("ELECTRICAL ARC — NOVA PUSHED INWARD!");
    } else if (lives < previousLives) {
      updateHud("ELECTRICAL ARC — NOVA HIT!");
    }
  }

  const originalStartGame = startGame;
  startGame = function startGameWithPlanetaryWeather() {
    stormStage = "done";
    stormLane = -1;
    originalStartGame();
    resetStormForRun();
  };

  const originalUpdate = update;
  update = function updateWithPlanetaryWeather(dt) {
    originalUpdate(dt);
    if (state === "paused") return;
    // Keep clouds alive on the training screen; freeze hazards outside gameplay.
    weatherTime += dt * (state === "running" ? 1 : 0.4);
    if (observedRun !== level) resetStormForRun();
    if (state === "running") advanceStorm(dt);
  };

  // Overlay subtle clouds on top of the existing planet texture rather than
  // rebuilding gradients every frame. Five short lines plus polar auroras.
  const previousDrawPlanet = drawPlanet;
  drawPlanet = function drawPlanetWithWeather() {
    previousDrawPlanet();
    if (!planetRadius || !ctx) return;

    const radius = planetRadius;
    const turbulence = Math.min(1, Math.max(0, (level - 1) / 11));
    const intensity = stormStage === "active" ? 1 : stormStage === "warning" ? 0.6 : 0;

    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.985, 0, TAU);
    ctx.clip();
    ctx.lineCap = "round";

    for (let i = 0; i < WEATHER_BANDS.length; i++) {
      const y = WEATHER_BANDS[i];
      const drift = Math.sin(weatherTime * (0.24 + turbulence * 0.19) + i * 1.4);
      const wave = Math.sin(weatherTime * 0.39 + i * 1.9);
      const baseline = centerY + radius * (y + wave * 0.045);
      const startX = centerX - radius * 1.15 + drift * radius * 0.16;
      const endX = centerX + radius * 1.16 + drift * radius * 0.16;
      ctx.beginPath();
      ctx.moveTo(startX, baseline);
      ctx.bezierCurveTo(
        centerX - radius * 0.39, baseline - radius * (0.15 + turbulence * 0.08),
        centerX + radius * 0.36, baseline + radius * (0.14 + turbulence * 0.09),
        endX, baseline + radius * wave * 0.035
      );
      ctx.lineWidth = Math.max(1.4, radius * (0.07 + (i % 2) * 0.026));
      ctx.strokeStyle = i % 2 === 0 ? "#9beaff" : "#a8a2ff";
      ctx.globalAlpha = 0.15 + turbulence * 0.16 + intensity * 0.09;
      ctx.stroke();
    }

    if (stormStage === "warning" || stormStage === "active") {
      // Small atmospheric lightning on the planet itself.
      ctx.strokeStyle = stormStage === "active" ? "#f9e7ff" : "#74dcff";
      ctx.lineWidth = Math.max(1.5, radius * 0.027);
      ctx.globalAlpha = (stormStage === "active" ? 0.82 : 0.40) *
        (0.77 + 0.23 * Math.sin(weatherTime * 17));
      const sx = centerX + Math.sin(weatherTime * 1.8) * radius * 0.34;
      const sy = centerY - radius * 0.35;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + radius * 0.10, sy + radius * 0.20);
      ctx.lineTo(sx - radius * 0.03, sy + radius * 0.33);
      ctx.lineTo(sx + radius * 0.08, sy + radius * 0.48);
      ctx.stroke();
    }
    ctx.restore();

    // Aurora arcs bloom progressively in later runs, without shadowBlur.
    ctx.save();
    ctx.lineCap = "round";
    for (let i = 0; i < 2; i++) {
      const drift = Math.sin(weatherTime * 0.6 + i * 1.8);
      ctx.beginPath();
      ctx.ellipse(
        centerX, centerY - radius * (0.52 + i * 0.14),
        radius * (1.08 + i * 0.1), radius * (0.28 + i * 0.04),
        -0.12 + drift * 0.1, Math.PI * 1.05, Math.PI * 1.96
      );
      ctx.strokeStyle = i === 0 ? "#5ff5e3" : "#ca91ff";
      ctx.globalAlpha = 0.11 + turbulence * 0.25 + intensity * 0.12;
      ctx.lineWidth = 1.3 + i * 1.1 + turbulence;
      ctx.stroke();
    }
    ctx.restore();
  };

  // Draw the storm with the orbital lines, BELOW Nova and physical hazards.
  const previousDrawOrbitGlow = drawOrbitGlow;
  drawOrbitGlow = function drawOrbitGlowWithIonStorm() {
    previousDrawOrbitGlow();
    if (level !== STORM_RUN || stormStage === "done" || stormLane < 0 || !rings[stormLane]) return;
    const r = rings[stormLane];
    const active = stormStage === "active";
    const charge = 0.5 + 0.5 * Math.sin(weatherTime * (active ? 16 : 7));

    ctx.save();
    ctx.strokeStyle = active ? "#aff9ff" : "#ffd38f";
    ctx.lineWidth = active ? 5 : 3;
    ctx.globalAlpha = active ? (0.50 + charge * 0.35) : (0.38 + charge * 0.24);
    ctx.beginPath();
    ctx.arc(centerX, centerY, r, 0, TAU);
    ctx.stroke();

    // Short jagged arcs visibly distinguish a lethal charged orbit.
    if (active) {
      ctx.lineWidth = 1.9;
      ctx.strokeStyle = "#e1fdff";
      ctx.globalAlpha = 0.68;
      for (let i = 0; i < 9; i++) {
        const a = i * TAU / 9 + weatherTime * 0.45;
        const a2 = a + 0.25;
        ctx.beginPath();
        ctx.moveTo(centerX + Math.cos(a) * r, centerY + Math.sin(a) * r);
        ctx.lineTo(centerX + Math.cos(a + 0.115) * (r + 6), centerY + Math.sin(a + 0.115) * (r + 6));
        ctx.lineTo(centerX + Math.cos(a2) * r, centerY + Math.sin(a2) * r);
        ctx.stroke();
      }
    }
    ctx.restore();
  };

  // Readable countdown, persistent even when normal HUD messages are replaced.
  const originalDraw = draw;
  draw = function drawWithStormCountdown() {
    originalDraw();
    if (level !== STORM_RUN || state !== "running" || stormStage === "done") return;
    ctx.save();
    ctx.textAlign = "center";
    ctx.font = "bold 13px system-ui, sans-serif";
    ctx.fillStyle = stormStage === "warning" ? "#ffdda6" : "#b7faff";
    ctx.globalAlpha = 0.98;
    const remain = stormStage === "warning" ? WARNING_SECONDS - stormAge : ACTIVE_SECONDS - stormAge;
    ctx.fillText(
      (stormStage === "warning" ? "ION STORM IN " : "ION STORM ") +
      Math.max(0, remain).toFixed(1) + "s  ·  RING " + (stormLane + 1),
      centerX, centerY - planetRadius - 18
    );
    ctx.restore();
  };
})();
