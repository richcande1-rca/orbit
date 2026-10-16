// Ringfall: a warned, physically travelling fan of ice from a real ring segment.
// Final-run special event; Nova's movement and the existing debris stay unchanged.
(() => {
  const RUN = 12;
  const WINDUP = 0.75;
  const WARNING = 2.15;
  const WAVES = 2;
  const WAVE_INTERVAL = 0.78;
  const RING_THETA_OPTIONS = [Math.PI * 0.21, Math.PI * 0.79];

  let observedRun = level;
  let elapsed = 0, stageElapsed = 0;
  let stage = "done";
  let launch = null;
  let shards = [];
  let wavesLaunched = 0;

  function getOrigin() {
    const r = planetRadius;
    const tilt = -0.28;
    const theta = RING_THETA_OPTIONS[Math.random() < 0.5 ? 0 : 1];
    const x = r * 1.72 * Math.cos(theta);
    const y = r * 0.36 * Math.sin(theta);
    const px = x * Math.cos(tilt) - y * Math.sin(tilt);
    const py = x * Math.sin(tilt) + y * Math.cos(tilt);
    return {
      x: centerX + px, y: centerY + py,
      radius: Math.hypot(px, py),
      heading: Math.atan2(py, px)
    };
  }

  function syncRun(force = false) {
    if (!force && observedRun === level) return;
    observedRun = level;
    elapsed = 0;
    stageElapsed = 0;
    stage = level === RUN ? "idle" : "done";
    launch = null;
    shards = [];
    wavesLaunched = 0;
  }

  function beginWarning() {
    launch = getOrigin();
    stage = "warning";
    stageElapsed = 0;
    updateHud("RINGFALL INBOUND — FOLLOW THE FLASHING ICE!");
  }

  function launchWave() {
    const outerRadius = rings[ringCount - 1] || planetRadius * 4.5;
    const velocity = Math.max(62, outerRadius * 0.25);
    const count = window.orbitGetDifficulty?.() === "easy" ? 2 : 3;
    for (let i = 0; i < count; i++) {
      // Each fragment has its own exact radial/azimuthal position. The gaps
      // between them remain passable, and the wave starts at the ring.
      const offset = count === 2 ? (i ? 0.15 : -0.15) : (i - 1) * 0.16;
      shards.push({
        radius: launch.radius,
        angle: launch.heading + offset,
        spin: (i - (count - 1) / 2) * 0.027,
        speed: velocity * (0.89 + 0.11 * (i % 3)),
        size: 3.4 + (i % 2) * 0.7,
        spent: false
      });
    }
    wavesLaunched++;
  }

  function updateShards(dt) {
    const outerRadius = (rings[ringCount - 1] || planetRadius * 4.5) + 22;
    for (const shard of shards) {
      shard.radius += shard.speed * dt;
      shard.angle += shard.spin * dt;
      if (shard.spent || shard.radius > outerRadius) continue;
      if (invulnerable > 0 || player.lane < 0 || state !== "running") continue;
      const pr = rings[player.lane];
      if (!(pr > 0)) continue;
      const dx = Math.cos(shard.angle) * shard.radius - Math.cos(player.angle) * pr;
      const dy = Math.sin(shard.angle) * shard.radius - Math.sin(player.angle) * pr;
      const collision = player.radius + shard.size;
      if (dx * dx + dy * dy >= collision * collision) continue;
      shard.spent = true;
      const beforeLives = lives;
      crash(); // Standard shield, test-mode, invulnerability and hit logic.
      // Keep the existing SHIELD ABSORBED message if a shield saved Nova.
      if (state === "running" && lives < beforeLives) {
        updateHud("RINGFALL — ICE IMPACT!");
      }
    }
    shards = shards.filter(s => !s.spent && s.radius <= outerRadius);
  }

  function updateEvent(dt) {
    if (stage === "done" || state !== "running") return;
    if (stage === "idle") {
      elapsed += dt;
      if (elapsed >= WINDUP) beginWarning();
      return;
    }
    stageElapsed += dt;
    if (stage === "warning") {
      if (stageElapsed >= WARNING) {
        stageElapsed = 0;
        stage = "active";
        launchWave();
        updateHud("RINGFALL — ICE DEBRIS OUTBOUND!");
      }
      return;
    }

    if (wavesLaunched < WAVES && stageElapsed >= WAVE_INTERVAL) {
      launchWave();
    }
    updateShards(dt);
    if (wavesLaunched === WAVES && shards.length === 0) {
      stage = "done";
      updateHud("RINGFALL CLEARED.");
    }
  }

  const originalStart = startGame;
  startGame = function startWithRingfall() {
    originalStart();
    syncRun(true);
  };

  const originalUpdate = update;
  update = function updateWithRingfall(dt) {
    originalUpdate(dt);
    syncRun();
    if (state === "running") updateEvent(dt);
  };

  function drawWarning() {
    if (!launch) return;
    const pulse = 0.5 + 0.5 * Math.sin(stageElapsed * 11);
    const pathRadius = (rings[ringCount - 1] || planetRadius * 4.5) + 15;
    ctx.save();
    ctx.strokeStyle = stage === "warning" ? "#ffc98d" : "#a9f0ff";
    ctx.lineWidth = stage === "warning" ? 2.2 : 1.5;
    ctx.globalAlpha = (stage === "warning" ? 0.42 : 0.18) + pulse * 0.22;
    ctx.setLineDash([5, 9]);
    ctx.beginPath();
    ctx.moveTo(launch.x, launch.y);
    ctx.lineTo(centerX + Math.cos(launch.heading) * pathRadius,
      centerY + Math.sin(launch.heading) * pathRadius);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#e6f8ff";
    ctx.globalAlpha = 0.6 + pulse * 0.4;
    ctx.beginPath();
    ctx.arc(launch.x, launch.y, 3 + pulse * 2, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  function drawShards() {
    for (const shard of shards) {
      const ux = Math.cos(shard.angle), uy = Math.sin(shard.angle);
      const x = centerX + ux * shard.radius, y = centerY + uy * shard.radius;
      const length = Math.max(10, shard.size * 3.3);
      ctx.save();
      ctx.strokeStyle = "rgba(131,223,255,0.38)";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(x - ux * length, y - uy * length);
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.fillStyle = "#dbf7ff";
      ctx.beginPath();
      ctx.moveTo(x + ux * shard.size, y + uy * shard.size);
      ctx.lineTo(x - ux * shard.size - uy * shard.size * 0.65,
        y - uy * shard.size + ux * shard.size * 0.65);
      ctx.lineTo(x - ux * shard.size + uy * shard.size * 0.65,
        y - uy * shard.size - ux * shard.size * 0.65);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  const originalDrawHazards = drawHazards;
  drawHazards = function drawHazardsWithRingfall() {
    originalDrawHazards();
    if (state === "running" && level === RUN && stage !== "done") {
      if (stage !== "idle") drawWarning();
      drawShards();
    }
  };

  const originalDraw = draw;
  draw = function drawWithRingfallCountDown() {
    originalDraw();
    if (state !== "running" || level !== RUN || stage !== "warning") return;
    ctx.save();
    ctx.fillStyle = "#ffdba2";
    ctx.font = "bold 13px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("RINGFALL IN " + Math.max(0, WARNING - stageElapsed).toFixed(1) + "s",
      centerX, centerY - (rings[0] || planetRadius * 2) - 22);
    ctx.restore();
  };

  syncRun(true);
})();
