// ORBIT early-run skill opportunities: collect Star Chase in Run 1,
// time an Orbital Surge lane entry in Run 2. No new hazards or free lives.
(() => {
  const STAR_RUN = 1;
  const SURGE_RUN = 2;
  const STAR_LANES = [1, 2, 3];
  const STAR_POINTS = [3, 5, 8];
  const STAR_SECONDS = 8.0;
  const SURGE_LANE = 2;
  const SURGE_BOOST_SECONDS = 2.4;
  const SURGE_MULTIPLIER = 1.25;
  const SURGE_POINTS = 6;
  const normalSpeed = player.speed;

  let trackedRun = level;
  let starTargets = [];
  let starIndex = 0;
  let starState = "off"; // active, completed, missed
  let starSeconds = 0;
  let surgeAngle = 0;
  let surgeDirection = -1;
  let surgeState = "off"; // ready, claimed
  let surgeWindow = 0;
  let surgeSeconds = 0;
  let boostSeconds = 0;
  let popup = "";
  let popupTime = 0;

  function difficulty() {
    return window.orbitGetDifficulty?.() || "normal";
  }

  function stopBoost() {
    if (boostSeconds > 0) player.speed = normalSpeed;
    boostSeconds = 0;
  }

  function syncRun(force = false) {
    if (!force && trackedRun === level) return;
    stopBoost();
    trackedRun = level;
    starTargets = [];
    starIndex = 0;
    starState = "off";
    starSeconds = 0;
    surgeWindow = 0;
    surgeSeconds = 0;
    surgeState = "off";
    popupTime = 0;

    if (level === STAR_RUN) {
      starState = "active";
      const start = player.angle + 0.86 + (Math.random() - 0.5) * 0.26;
      for (let i = 0; i < STAR_LANES.length && STAR_LANES[i] < ringCount; i++) {
        starTargets.push({
          lane: STAR_LANES[i],
          angle: start + i * (0.91 + Math.random() * 0.12)
        });
      }
      if (!starTargets.length) starState = "off";
    } else if (level === SURGE_RUN && ringCount > SURGE_LANE) {
      surgeState = "ready";
      surgeAngle = player.angle + 1.10 + Math.random() * 0.55;
      surgeDirection = Math.random() < 0.5 ? -1 : 1;
    }
  }

  function collectStar() {
    const step = starIndex;
    const points = STAR_POINTS[step];
    score += points;
    starIndex += 1;
    starSeconds = 0;
    flash = Math.max(flash, 0.24);
    window.orbitAudio?.star?.();
    if (starIndex === starTargets.length) {
      starState = "completed";
      popup = "STAR CHASE COMPLETE  +" + points;
      updateHud("STAR CHASE CLEARED! TOTAL +" +
        STAR_POINTS.slice(0, starIndex).reduce((a, b) => a + b, 0));
    } else {
      popup = "STAR CHASE " + starIndex + "/" + starTargets.length + "  +" + points;
      updateHud("STAR CHASE +" + points + " — NEXT RING!");
    }
    popupTime = 1.5;
  }

  function updateStars(dt) {
    if (starState !== "active") return;
    starSeconds += dt;
    const target = starTargets[starIndex];
    if (!target || starSeconds > STAR_SECONDS) {
      starState = "missed";
      popup = "STAR CHAIN LOST";
      popupTime = 1.3;
      updateHud("Star chain expired. Keep climbing!");
      return;
    }
    if (player.lane !== target.lane || !rings[target.lane]) return;
    const allowance = player.radius / rings[target.lane] + 0.11;
    if (angleDistance(player.angle, target.angle) <= allowance) collectStar();
  }

  function claimSurge() {
    surgeState = "claimed";
    surgeWindow = 0;
    boostSeconds = SURGE_BOOST_SECONDS;
    player.speed = normalSpeed * SURGE_MULTIPLIER;
    score += SURGE_POINTS;
    flash = Math.max(flash, 0.32);
    popup = "ORBITAL SURGE  +" + SURGE_POINTS;
    popupTime = 1.7;
    window.orbitAudio?.star?.();
    updateHud("ORBITAL SURGE +6! FASTER FOR 2.4s!");
  }

  function trySurge() {
    if (surgeState !== "ready" || surgeWindow <= 0 || player.lane !== SURGE_LANE) return;
    const tolerance = difficulty() === "easy" ? 0.65
      : difficulty() === "hard" ? 0.46 : 0.54;
    if (angleDistance(player.angle, surgeAngle) < tolerance) claimSurge();
  }

  const originalStart = startGame;
  startGame = function startWithEarlyOpportunities() {
    stopBoost();
    originalStart();
    syncRun(true);
  };

  const originalMove = movePlayer;
  movePlayer = function moveWithEarlyOpportunities(direction) {
    const oldRun = level;
    const oldLane = player.lane;
    const oldState = state;
    originalMove(direction);
    syncRun();
    if (oldState !== "running" || state !== "running" || oldRun !== level) return;
    if (level === SURGE_RUN && oldLane !== SURGE_LANE && player.lane === SURGE_LANE) {
      // Enter the moving sector; simply camping on a glowing lane pays nothing.
      surgeWindow = 0.9;
      trySurge();
    } else if (level === SURGE_RUN && player.lane !== SURGE_LANE) {
      surgeWindow = 0;
    }
  };

  const originalUpdate = update;
  update = function updateWithEarlyOpportunities(dt) {
    originalUpdate(dt);
    syncRun();

    // A pause preserves earned boost time. Special completion cards and
    // game-over screens cancel it so it cannot leak into the next run.
    if (state === "paused") return;
    if (state !== "running") {
      stopBoost();
      return;
    }

    if (popupTime > 0) popupTime = Math.max(0, popupTime - dt);
    if (level === STAR_RUN) updateStars(dt);

    if (level === SURGE_RUN) {
      surgeSeconds += dt;
      if (surgeState === "ready") {
        surgeAngle += surgeDirection * (0.34 + Math.sin(surgeSeconds * 0.57) * 0.055) * dt;
        if (surgeWindow > 0) {
          surgeWindow = Math.max(0, surgeWindow - dt);
          trySurge();
        }
      }
      if (boostSeconds > 0) {
        boostSeconds = Math.max(0, boostSeconds - dt);
        if (boostSeconds === 0) player.speed = normalSpeed;
      }
    }
  };

  function paintStar(x, y, radius, alpha, current) {
    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = current ? "#fff4bc" : "#bf9a59";
    ctx.fillStyle = current ? "#ffdf74" : "rgba(255,207,111,0.13)";
    ctx.lineWidth = current ? 2 : 1.3;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const angle = i * Math.PI / 5 - Math.PI / 2;
      const size = i % 2 === 0 ? radius : radius * 0.48;
      const px = Math.cos(angle) * size;
      const py = Math.sin(angle) * size;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    if (current) {
      ctx.globalAlpha = alpha * 0.32;
      ctx.strokeStyle = "#ffc866";
      ctx.beginPath();
      ctx.arc(0, 0, radius * 1.75, 0, TAU);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawStars() {
    if (starState !== "active") return;
    const now = starTargets[starIndex];
    if (!now) return;
    for (let i = starIndex; i < starTargets.length; i++) {
      const target = starTargets[i];
      if (!rings[target.lane]) continue;
      const x = centerX + Math.cos(target.angle) * rings[target.lane];
      const y = centerY + Math.sin(target.angle) * rings[target.lane];
      const active = i === starIndex;
      const blink = 0.84 + Math.sin(starSeconds * 7) * 0.16;
      paintStar(x, y, active ? 10 : 6, active ? blink : 0.29, active);
    }
  }

  function drawSurge() {
    if (surgeState !== "ready" || !rings[SURGE_LANE]) return;
    const radius = rings[SURGE_LANE];
    const pulse = 0.83 + Math.sin(surgeSeconds * 6.3) * 0.17;
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.strokeStyle = "#ffd577";
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, surgeAngle - 0.42, surgeAngle + 0.42);
    ctx.stroke();
    ctx.strokeStyle = "#fff1c3";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, surgeAngle - 0.35, surgeAngle + 0.35);
    ctx.stroke();

    // A moving directional tick identifies the opportunity from a distance.
    const x = centerX + Math.cos(surgeAngle) * radius;
    const y = centerY + Math.sin(surgeAngle) * radius;
    ctx.fillStyle = "#fff2ce";
    ctx.beginPath();
    ctx.arc(x, y, 4.4, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  const originalDrawHazards = drawHazards;
  drawHazards = function drawHazardsWithEarlyOpportunities() {
    originalDrawHazards();
    if (state !== "running") return;
    if (level === STAR_RUN) drawStars();
    if (level === SURGE_RUN) drawSurge();
  };

  const originalDraw = draw;
  draw = function drawWithEarlyOpportunityStatus() {
    originalDraw();
    if (state !== "running" || (level !== STAR_RUN && level !== SURGE_RUN)) return;
    ctx.save();
    ctx.font = "bold 12px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffe9b5";
    const topY = Math.max(24, centerY - (rings[ringCount - 1] || planetRadius * 4) - 23);
    if (popupTime > 0) {
      ctx.fillText(popup, centerX, topY);
    } else if (level === STAR_RUN && starState === "active") {
      ctx.fillText("STAR CHASE " + starIndex + "/" + starTargets.length +
        "  ·  " + Math.max(0, Math.ceil(STAR_SECONDS - starSeconds)) + "s", centerX, topY);
    } else if (level === SURGE_RUN && surgeState === "ready") {
      ctx.fillText("ORBITAL SURGE · ENTER GOLDEN ARC", centerX, topY);
    } else if (level === SURGE_RUN && boostSeconds > 0) {
      ctx.fillText("SURGE BOOST " + boostSeconds.toFixed(1) + "s", centerX, topY);
    }
    ctx.restore();
  };

  // Populated when the initial level is already known (training / title).
  syncRun(true);
})();
