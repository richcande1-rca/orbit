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

    // Bake diffuse, sheared storm clouds. No outlined spiral arms or
    // fluorescent bullseye: at game size this should read as weather.
    const c = STORM_SIZE / 2;
    swirlCtx.save();
    swirlCtx.translate(c, c);
    swirlCtx.scale(1, 0.76);
    const outerHaze = swirlCtx.createRadialGradient(0, 0, 3, 0, 0, c * 0.90);
    outerHaze.addColorStop(0, "rgba(134,184,203,0.14)");
    outerHaze.addColorStop(0.42, "rgba(148,196,213,0.23)");
    outerHaze.addColorStop(0.76, "rgba(85,132,175,0.13)");
    outerHaze.addColorStop(1, "rgba(60,115,167,0)");
    swirlCtx.fillStyle = outerHaze;
    swirlCtx.beginPath();
    swirlCtx.arc(0, 0, c * 0.9, 0, TAU);
    swirlCtx.fill();

    for (let band = 0; band < 3; band++) {
      const count = 13 + band * 4;
      for (let i = 0; i < count; i++) {
        const theta = i * TAU / count + band * 0.56;
        const distance = c * (0.23 + band * 0.22) +
          Math.sin(i * 1.7 + band) * c * 0.042;
        const px = Math.cos(theta) * distance;
        const py = Math.sin(theta) * distance;
        const width = c * (0.19 + band * 0.026);
        const height = c * (0.070 + band * 0.021);
        swirlCtx.save();
        swirlCtx.translate(px, py);
        swirlCtx.rotate(theta + 0.55 + Math.sin(theta * 2.5) * 0.14);
        swirlCtx.scale(width, height);
        const puff = swirlCtx.createRadialGradient(0, 0, 0, 0, 0, 1);
        const alpha = (0.17 + (i % 4) * 0.025) * (1 - band * 0.08);
        puff.addColorStop(0, "rgba(203,220,229," + alpha + ")");
        puff.addColorStop(0.44, "rgba(165,193,215," + alpha * 0.64 + ")");
        puff.addColorStop(1, "rgba(101,154,194,0)");
        swirlCtx.fillStyle = puff;
        swirlCtx.beginPath();
        swirlCtx.arc(0, 0, 1, 0, TAU);
        swirlCtx.fill();
        swirlCtx.restore();
      }
    }
    // A subdued calm eye, not a bright swirl emblem.
    const eye = swirlCtx.createRadialGradient(-3, -2, 0, 0, 0, c * 0.19);
    eye.addColorStop(0, "rgba(24,64,113,0.46)");
    eye.addColorStop(0.48, "rgba(88,145,171,0.23)");
    eye.addColorStop(1, "rgba(140,190,209,0)");
    swirlCtx.fillStyle = eye;
    swirlCtx.beginPath();
    swirlCtx.ellipse(0, 0, c * 0.21, c * 0.15, 0.18, 0, TAU);
    swirlCtx.fill();
    swirlCtx.restore();

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
    ctx.globalAlpha = Math.min(0.72, 0.43 + turbulence * 0.07 + stormIntensity * 0.16);
    ctx.drawImage(
      cloudSheet, centerX - diameter * 0.5 + driftX,
      centerY - diameter * 0.5 + driftY, diameter, diameter
    );

    // The storm system is distinct from the cloud banks: a rotating eye near
    // the equator, brighter and slightly more turbulent during ion storms.
    const cycloneX = centerX + radius * (0.21 + Math.sin(weatherTime * 0.13) * 0.035);
    const cycloneY = centerY + radius * (0.18 + Math.cos(weatherTime * 0.12) * 0.026);
    ctx.translate(cycloneX, cycloneY);
    ctx.rotate(weatherTime * (0.055 + turbulence * 0.025 + stormIntensity * 0.035));
    ctx.scale(0.94, 0.76);
    ctx.globalAlpha = Math.min(0.76, 0.49 + turbulence * 0.09 + stormIntensity * 0.16);
    const eyeSize = radius * 1.21;
    ctx.drawImage(cycloneSheet, -eyeSize * 0.5, -eyeSize * 0.5, eyeSize, eyeSize);
    ctx.restore();
  }

  // Two diffuse polar aurora washes rather than vertical, crystalline
  // ribbons. They are barely visible until later runs or the electrical storm.
  function drawPolarHaze(radius, turbulence, stormIntensity) {
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    for (const sign of [-1, 1]) {
      const drift = Math.sin(weatherTime * 0.22 + sign) * radius * 0.055;
      const y = centerY + sign * radius * 0.88;
      const glow = ctx.createRadialGradient(
        centerX + drift, y, radius * 0.03,
        centerX + drift, y, radius * 0.64
      );
      glow.addColorStop(0, "rgba(81,188,175,0.26)");
      glow.addColorStop(0.35, "rgba(117,164,211,0.11)");
      glow.addColorStop(1, "rgba(80,139,186,0)");
      ctx.globalAlpha = (sign < 0 ? 1 : 0.48) *
        (0.18 + turbulence * 0.27 + stormIntensity * 0.18);
      ctx.fillStyle = glow;
      ctx.fillRect(centerX - radius, centerY - radius, radius * 2, radius * 2);
    }
    ctx.restore();
  }

  // Called by planet.js BEFORE it paints the foreground ring. This keeps
  // everything attached to the illuminated sphere, rather than overlaying
  // the front ring with cloud or aurora graphics.
  window.orbitRenderPlanetWeather = function renderPlanetWeather() {
    if (!(planetRadius > 0)) return;
    const radius = planetRadius;
    const turbulence = Math.min(1, Math.max(0, (level - 1) / 11));
    const intensity = stormStage === "active" ? 1 : stormStage === "warning" ? 0.6 : 0;
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.985, 0, TAU);
    ctx.clip();

    drawMovingClouds(radius, turbulence, intensity);
    drawPolarHaze(radius, turbulence, intensity);

    if (intensity > 0) {
      // Lightning stays within the planet's weather layer.
      ctx.globalAlpha = intensity * (0.42 + 0.19 * Math.sin(weatherTime * 16));
      ctx.strokeStyle = "#d1e6f4";
      ctx.lineWidth = Math.max(1.2, radius * 0.024);
      const sx = centerX + Math.sin(weatherTime * 1.8) * radius * 0.26;
      const sy = centerY - radius * 0.23;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + radius * 0.07, sy + radius * 0.14);
      ctx.lineTo(sx - radius * 0.03, sy + radius * 0.24);
      ctx.lineTo(sx + radius * 0.06, sy + radius * 0.36);
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
