// A living planet: cached cloud masses, an animated storm eye, polar auroras,
// and one warned electrical storm.
// The storm is a special Run 5 hazard; it uses the normal crash/shield/test-mode pipeline.
(() => {
  const STORM_RUN = 5;
  const WARNING_SECONDS = 2.0;
  const ACTIVE_SECONDS = 3.0;
  const CLOUD_SIZE = 288;
  const STORM_SIZE = 144;
  let cloudSheet = null;
  let cycloneSheet = null;

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


  // Paint atmospheric texture only once, not every frame. Uneven wisps and
  // separate cloud banks replace the old full-width horizontal stripes.
  function prepareCloudSheets() {
    if (cloudSheet && cycloneSheet) return;

    const clouds = document.createElement("canvas");
    const storm = document.createElement("canvas");
    clouds.width = clouds.height = CLOUD_SIZE;
    storm.width = storm.height = STORM_SIZE;
    const cloudCtx = clouds.getContext("2d");
    const swirlCtx = storm.getContext("2d");
    if (!cloudCtx || !swirlCtx) return;

    const banks = [
      // Three broken weather regions, not continuous belts.
      { x: -0.28, y: -0.38, spreadX: 0.43, spreadY: 0.19, count: 11,
        color: "185,231,255", alpha: 0.29 },
      { x: 0.17, y: -0.06, spreadX: 0.54, spreadY: 0.26, count: 15,
        color: "155,215,255", alpha: 0.32 },
      { x: -0.14, y: 0.42, spreadX: 0.44, spreadY: 0.16, count: 10,
        color: "107,140,232", alpha: 0.32 },
    ];

    for (let region = 0; region < banks.length; region++) {
      const bank = banks[region];
      for (let i = 0; i < bank.count; i++) {
        // A deterministic, uneven scatter avoids a repeating stripe pattern.
        const angle = i * 2.39996323 + region * 1.37;
        const distance = Math.sqrt((i + 0.46) / bank.count);
        const x = bank.x + Math.cos(angle) * bank.spreadX * distance;
        const y = bank.y + Math.sin(angle) * bank.spreadY * distance;
        const puffWidth = 0.13 + 0.045 * (1 + Math.sin(i * 2.7 + region)) * 0.5;
        const puffHeight = 0.095 + 0.05 * (1 + Math.cos(i * 1.81 + region)) * 0.5;
        const opacity = bank.alpha * (0.62 + 0.38 * Math.sin(i * 0.73 + 1.1) ** 2);

        cloudCtx.save();
        cloudCtx.translate((x + 1) * CLOUD_SIZE * 0.5, (y + 1) * CLOUD_SIZE * 0.5);
        cloudCtx.rotate(Math.sin(i * 0.9 + region) * 0.36);
        cloudCtx.scale(puffWidth * CLOUD_SIZE * 0.5, puffHeight * CLOUD_SIZE * 0.5);
        const haze = cloudCtx.createRadialGradient(0, 0, 0.03, 0, 0, 1);
        haze.addColorStop(0, "rgba(" + bank.color + "," + opacity + ")");
        haze.addColorStop(0.47, "rgba(" + bank.color + "," + opacity * 0.48 + ")");
        haze.addColorStop(1, "rgba(" + bank.color + ",0)");
        cloudCtx.fillStyle = haze;
        cloudCtx.beginPath();
        cloudCtx.arc(0, 0, 1, 0, TAU);
        cloudCtx.fill();
        cloudCtx.restore();
      }
    }

    // A perspective fade near the limb suggests clouds curving away around
    // the sphere instead of appearing pasted across its face.
    cloudCtx.globalCompositeOperation = "destination-in";
    const limb = cloudCtx.createLinearGradient(0, 0, CLOUD_SIZE, 0);
    limb.addColorStop(0, "rgba(255,255,255,0)");
    limb.addColorStop(0.14, "rgba(255,255,255,0.22)");
    limb.addColorStop(0.30, "rgba(255,255,255,0.85)");
    limb.addColorStop(0.5, "rgba(255,255,255,1)");
    limb.addColorStop(0.70, "rgba(255,255,255,0.85)");
    limb.addColorStop(0.86, "rgba(255,255,255,0.22)");
    limb.addColorStop(1, "rgba(255,255,255,0)");
    cloudCtx.fillStyle = limb;
    cloudCtx.fillRect(0, 0, CLOUD_SIZE, CLOUD_SIZE);

    // A small recognizable cyclone with a soft eye and three unequal spiral
    // arms. Its whole sprite rotates gently; no spiral geometry per frame.
    const c = STORM_SIZE * 0.5;
    const halo = swirlCtx.createRadialGradient(c, c, 2, c, c, c * 0.91);
    halo.addColorStop(0, "rgba(225,251,255,0.30)");
    halo.addColorStop(0.27, "rgba(116,239,255,0.22)");
    halo.addColorStop(0.62, "rgba(73,166,247,0.13)");
    halo.addColorStop(1, "rgba(38,126,219,0)");
    swirlCtx.fillStyle = halo;
    swirlCtx.beginPath();
    swirlCtx.arc(c, c, c * 0.92, 0, TAU);
    swirlCtx.fill();

    swirlCtx.lineCap = "round";
    for (let arm = 0; arm < 3; arm++) {
      swirlCtx.beginPath();
      for (let step = 0; step <= 36; step++) {
        const t = step / 36;
        const theta = arm * TAU / 3 + t * 4.4 + arm * 0.18;
        const radius = c * (0.16 + 0.60 * t);
        const px = c + Math.cos(theta) * radius;
        const py = c + Math.sin(theta) * radius * 0.77;
        if (step === 0) swirlCtx.moveTo(px, py);
        else swirlCtx.lineTo(px, py);
      }
      swirlCtx.strokeStyle = arm === 1
        ? "rgba(174,183,255,0.36)" : "rgba(182,247,255,0.58)";
      swirlCtx.lineWidth = arm === 0 ? 8 : 5.5;
      swirlCtx.stroke();
    }

    const eye = swirlCtx.createRadialGradient(c - 3, c - 2, 0, c, c, c * 0.21);
    eye.addColorStop(0, "rgba(235,254,255,0.94)");
    eye.addColorStop(0.39, "rgba(150,231,255,0.66)");
    eye.addColorStop(1, "rgba(80,166,239,0)");
    swirlCtx.fillStyle = eye;
    swirlCtx.beginPath();
    swirlCtx.ellipse(c, c, c * 0.23, c * 0.16, -0.26, 0, TAU);
    swirlCtx.fill();

    cloudSheet = clouds;
    cycloneSheet = storm;
  }

  function drawMovingClouds(radius, turbulence, stormIntensity) {
    prepareCloudSheets();
    if (!cloudSheet || !cycloneSheet) return;

    const driftX = Math.sin(weatherTime * 0.22) * radius * 0.065;
    const driftY = Math.cos(weatherTime * 0.16) * radius * 0.028;
    const diameter = radius * 2.06;

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = Math.min(0.98, 0.74 + turbulence * 0.08 + stormIntensity * 0.16);
    ctx.drawImage(
      cloudSheet, centerX - diameter * 0.5 + driftX,
      centerY - diameter * 0.5 + driftY, diameter, diameter
    );

    // The storm system is distinct from the cloud banks: a rotating eye near
    // the equator, brighter and slightly more turbulent during ion storms.
    const cycloneX = centerX + radius * (0.21 + Math.sin(weatherTime * 0.13) * 0.035);
    const cycloneY = centerY + radius * (0.18 + Math.cos(weatherTime * 0.12) * 0.026);
    ctx.translate(cycloneX, cycloneY);
    ctx.rotate(weatherTime * (0.13 + turbulence * 0.07 + stormIntensity * 0.09));
    ctx.scale(0.94, 0.76);
    ctx.globalAlpha = Math.min(1, 0.79 + turbulence * 0.10 + stormIntensity * 0.11);
    const eyeSize = radius * 0.86;
    ctx.drawImage(cycloneSheet, -eyeSize * 0.5, -eyeSize * 0.5, eyeSize, eyeSize);
    ctx.restore();
  }

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

  // Draw animated cached cloud banks, cyclone, and auroras over the sphere.
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

    // Cached irregular cloud banks + rotating cyclone, entirely inside the globe.
    drawMovingClouds(radius, turbulence, intensity);

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
