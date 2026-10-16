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

  // Polar curtains stay ON the sphere. No orbital ellipses or halo strokes.
  // Two shared gradients and a handful of ribbon paths keep LITE mode cheap.
  function drawAuroraCurtains(radius, turbulence, stormIntensity) {
    const strength = 0.35 + turbulence * 0.32 + stormIntensity * 0.27;
    ctx.save();
    ctx.globalCompositeOperation = "screen";

    for (const pole of [
      { sign: -1, count: 8, span: 0.59, reach: 0.21, opacity: 1 },
      { sign: 1, count: 5, span: 0.48, reach: 0.34, opacity: 0.58 },
    ]) {
      const topY = centerY + pole.sign * radius * 0.94;
      const bottomY = centerY + pole.sign * radius * pole.reach;
      const glow = ctx.createLinearGradient(centerX, topY, centerX, bottomY);
      glow.addColorStop(0, "rgba(95, 255, 208, 0)");
      glow.addColorStop(0.22, "rgba(95, 255, 208, 0.84)");
      glow.addColorStop(0.60, "rgba(169, 124, 255, 0.55)");
      glow.addColorStop(1, "rgba(111, 218, 255, 0)");
      ctx.fillStyle = glow;

      for (let i = 0; i < pole.count; i++) {
        const t = i / (pole.count - 1);
        const x = (t * 2 - 1) * pole.span;
        const edge = 1 - Math.pow(Math.abs(x / pole.span), 1.9) * 0.57;
        const phase = weatherTime * (0.44 + i * 0.025) + i * 1.07;
        const sway = Math.sin(phase) * radius * (0.037 + turbulence * 0.015);
        const curl = Math.sin(phase * 0.69 + i) * radius * 0.085;
        const left = centerX + radius * x + sway;
        const startY = centerY + pole.sign * radius * (0.91 - (i % 3) * 0.065);
        const endY = centerY + pole.sign * radius *
          (pole.reach + (1 - edge) * 0.36 + (i % 2) * 0.045);
        const midY = (startY + endY) * 0.5;
        const width = radius * (0.075 + (i % 3) * 0.024);
        const tipX = left + curl + radius * 0.06 * (t - 0.5);
        const shimmer = 0.89 + Math.sin(weatherTime * 1.13 + i * 1.8) * 0.11;

        ctx.globalAlpha = strength * pole.opacity * edge * shimmer;
        ctx.beginPath();
        ctx.moveTo(left - width * 0.23, startY);
        ctx.bezierCurveTo(
          left - width * 0.95, midY - pole.sign * radius * 0.12,
          tipX - width * 0.7, midY + pole.sign * radius * 0.07,
          tipX, endY
        );
        ctx.bezierCurveTo(
          tipX + width * 0.62, midY + pole.sign * radius * 0.07,
          left + width * 1.05, midY - pole.sign * radius * 0.10,
          left + width * 0.23, startY
        );
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = i % 3 === 0 ? "#a6ffe5" : "#d0b0ff";
        ctx.lineWidth = Math.max(0.75, radius * 0.012);
        ctx.globalAlpha = strength * pole.opacity * edge * 0.20;
        ctx.beginPath();
        ctx.moveTo(left, startY);
        ctx.quadraticCurveTo(left + curl * 0.25, midY, tipX, endY);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  // Drift clouds and polar curtains over the existing sphere surface.
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
    // Draw before restoring the planet clip: no light can float beyond its limb.
    drawAuroraCurtains(radius, turbulence, intensity);
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
