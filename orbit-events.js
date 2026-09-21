// Orbit event layer: clear game-over cards and comet strikes.
(function orbitEventLayer() {
  const cometMinRun = 3;
  const cometWarningMs = 1180;
  const cometTrailLength = 190;
  const cometHitWidth = 16;
  const cometStrikeDamage = 3;
  const cometKnockbackRings = 2;
  const cometTwinRun = 10;
  const cometTwinGapSeconds = 0.65;

  const orbitTestParams = new URLSearchParams(window.location.search);
  let orbitTestMode =
    orbitTestParams.get("test") === "1" ||
    orbitTestParams.get("test") === "true";
  let orbitTestBadge = null;

  let comet = null;
  let cometSprite = null;
  let cometCooldown = rand(4.5, 7);
  let cometTwinPending = false;
  let cometTwinSecondQueued = false;
  let cometTwinTriggeredRun = 0;
  let cometObservedLevel = level;

  function getCometSprite() {
    if (cometSprite) return cometSprite;

    // Build the comet once. Flight rendering is then only one rotated drawImage,
    // which keeps the LITE/mobile path cheap and avoids per-frame blur/gradients.
    const sprite = document.createElement("canvas");
    sprite.width = cometTrailLength + 56;
    sprite.height = 58;
    const sctx = sprite.getContext("2d");
    const headX = cometTrailLength + 22;
    const cy = sprite.height / 2;

    sctx.lineCap = "round";
    sctx.lineJoin = "round";

    // Broad, tapered ion haze.
    const haze = sctx.createLinearGradient(4, cy, headX, cy);
    haze.addColorStop(0, "rgba(96, 204, 255, 0)");
    haze.addColorStop(0.42, "rgba(98, 215, 255, 0.10)");
    haze.addColorStop(0.82, "rgba(156, 235, 255, 0.24)");
    haze.addColorStop(1, "rgba(224, 252, 255, 0.38)");
    sctx.fillStyle = haze;
    sctx.beginPath();
    sctx.moveTo(4, cy);
    sctx.quadraticCurveTo(headX * 0.58, cy - 11, headX, cy - 5);
    sctx.lineTo(headX, cy + 5);
    sctx.quadraticCurveTo(headX * 0.58, cy + 11, 4, cy);
    sctx.closePath();
    sctx.fill();

    // Two faint separated wisps keep the tail airy rather than crayon-thick.
    const wisp = sctx.createLinearGradient(18, cy, headX, cy);
    wisp.addColorStop(0, "rgba(145, 226, 255, 0)");
    wisp.addColorStop(0.55, "rgba(156, 232, 255, 0.16)");
    wisp.addColorStop(1, "rgba(221, 251, 255, 0.58)");
    sctx.strokeStyle = wisp;
    sctx.lineWidth = 1.4;

    sctx.beginPath();
    sctx.moveTo(18, cy - 5);
    sctx.quadraticCurveTo(headX * 0.58, cy - 10, headX - 4, cy - 2);
    sctx.stroke();

    sctx.beginPath();
    sctx.moveTo(34, cy + 7);
    sctx.quadraticCurveTo(headX * 0.66, cy + 10, headX - 3, cy + 2);
    sctx.stroke();

    // Tight, bright centerline.
    const coreTrail = sctx.createLinearGradient(28, cy, headX, cy);
    coreTrail.addColorStop(0, "rgba(219, 249, 255, 0)");
    coreTrail.addColorStop(0.62, "rgba(218, 249, 255, 0.42)");
    coreTrail.addColorStop(1, "rgba(255, 255, 255, 0.94)");
    sctx.strokeStyle = coreTrail;
    sctx.lineWidth = 2.8;
    sctx.beginPath();
    sctx.moveTo(28, cy);
    sctx.lineTo(headX - 3, cy);
    sctx.stroke();

    // A few fixed shed sparks add texture without a live particle system.
    sctx.fillStyle = "rgba(205, 246, 255, 0.62)";
    for (const spark of [
      { x: headX - 72, y: cy - 9, r: 1.1 },
      { x: headX - 49, y: cy + 8, r: 0.9 },
      { x: headX - 28, y: cy - 7, r: 1.0 },
    ]) {
      sctx.beginPath();
      sctx.arc(spark.x, spark.y, spark.r, 0, TAU);
      sctx.fill();
    }

    // Compact halo and white-hot nucleus.
    sctx.fillStyle = "rgba(108, 217, 255, 0.12)";
    sctx.beginPath();
    sctx.arc(headX, cy, 13, 0, TAU);
    sctx.fill();

    sctx.fillStyle = "rgba(184, 242, 255, 0.32)";
    sctx.beginPath();
    sctx.arc(headX, cy, 8, 0, TAU);
    sctx.fill();

    sctx.fillStyle = "rgba(247, 254, 255, 0.98)";
    sctx.beginPath();
    sctx.arc(headX, cy, 4.2, 0, TAU);
    sctx.fill();

    sctx.fillStyle = "#ffffff";
    sctx.beginPath();
    sctx.arc(headX + 1.1, cy - 0.8, 2.0, 0, TAU);
    sctx.fill();

    cometSprite = sprite;
    return cometSprite;
  }
  let cometWarningDelay = 0;
  let cometFlash = 0;

  function injectOrbitEventStyles() {
    if (document.getElementById("orbit-event-styles")) return;

    const style = document.createElement("style");
    style.id = "orbit-event-styles";
    style.textContent = `
      .instruction.screen-gameover {
        background: radial-gradient(circle at 50% 0%, rgba(255, 75, 42, 0.28), transparent 40%), linear-gradient(135deg, rgba(95, 6, 12, 0.88), rgba(9, 10, 30, 0.84));
        border-color: rgba(255, 93, 76, 0.72);
        box-shadow: 0 0 34px rgba(255, 64, 54, 0.34), 0 0 44px rgba(255, 137, 63, 0.12) inset;
      }

      .instruction.screen-gameover strong {
        color: #fff0e8;
        text-shadow: 0 0 16px rgba(255, 65, 55, 0.95), 0 0 24px rgba(255, 160, 92, 0.3);
      }

      .instruction.screen-gameover span {
        color: #fff7f0;
        opacity: 0.98;
      }

      .orbit-test-badge {
        position: fixed;
        right: 10px;
        bottom: 10px;
        z-index: 40;
        padding: 6px 9px;
        border: 1px solid rgba(155, 235, 255, 0.52);
        border-radius: 999px;
        background: rgba(3, 12, 26, 0.78);
        color: #dffbff;
        font: 700 11px/1 system-ui, sans-serif;
        letter-spacing: 0.08em;
        pointer-events: none;
        opacity: 0.86;
      }

      .orbit-test-badge.hidden {
        display: none;
      }

      @media (max-width: 720px), (pointer: coarse) {
        .instruction.screen-gameover {
          box-shadow: 0 0 18px rgba(255, 110, 120, 0.18);
        }

        .instruction.screen-gameover strong {
          text-shadow: 0 0 10px rgba(255, 255, 255, 0.38);
        }
      }
    `;

    document.head.appendChild(style);
  }

  function ensureOrbitTestBadge() {
    if (orbitTestBadge && orbitTestBadge.isConnected) return orbitTestBadge;

    orbitTestBadge = document.createElement("div");
    orbitTestBadge.className = "orbit-test-badge hidden";
    orbitTestBadge.textContent = "TEST MODE • INVINCIBLE";
    document.body.appendChild(orbitTestBadge);
    return orbitTestBadge;
  }

  function setOrbitTestMode(enabled, announce = true) {
    orbitTestMode = !!enabled;
    const badge = ensureOrbitTestBadge();
    badge.classList.toggle("hidden", !orbitTestMode);

    if (announce) {
      updateHud(
        orbitTestMode
          ? "TEST MODE: Nova is invincible."
          : "TEST MODE OFF."
      );
    }

    return orbitTestMode;
  }

  function randomCometCooldown() {
    if (level === cometTwinRun) return rand(1.8, 2.8);
    if (level <= 3) return rand(4.5, 7);
    if (level <= 5) return rand(7, 10.5);
    if (level <= 7) return rand(6, 9);
    return rand(4.8, 8);
  }

  function clearComet(resetTimer = true) {
    comet = null;
    cometWarningDelay = 0;
    cometTwinPending = false;
    cometTwinSecondQueued = false;
    if (resetTimer) cometCooldown = randomCometCooldown();
  }

  function finishCometPass() {
    comet = null;
    cometWarningDelay = 0;

    if (level === cometTwinRun && cometTwinPending) {
      cometTwinPending = false;
      cometTwinSecondQueued = true;
      cometCooldown = cometTwinGapSeconds;
      return;
    }

    cometTwinSecondQueued = false;
    cometCooldown = randomCometCooldown();
  }

  function cometEligible() {
    return state === "running" && level >= cometMinRun;
  }

  function triggerCometWarning() {
    cometWarningDelay = cometWarningMs / 1000;

    if (level === cometTwinRun && cometTwinTriggeredRun !== level) {
      cometTwinTriggeredRun = level;
      cometTwinPending = true;
      updateHud("TWIN COMETS DETECTED!");
      return;
    }

    if (level === cometTwinRun && cometTwinSecondQueued) {
      cometTwinSecondQueued = false;
      updateHud("SECOND COMET INBOUND!");
      return;
    }

    updateHud("COMET DETECTED INBOUND!");
  }

  function spawnComet() {
    const angle = rand(0, TAU);
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    const nx = -dy;
    const ny = dx;
    const offset = rand(-Math.min(width, height) * 0.28, Math.min(width, height) * 0.28);
    const baseX = centerX + nx * offset;
    const baseY = centerY + ny * offset;
    const distance = Math.hypot(width, height) * 0.72 + cometTrailLength;
    const speed = rand(680, 900);

    comet = {
      x: baseX - dx * distance,
      y: baseY - dy * distance,
      previousX: baseX - dx * distance,
      previousY: baseY - dy * distance,
      vx: dx * speed,
      vy: dy * speed,
      dx,
      dy,
      age: 0,
      life: (distance * 2) / speed,
    };

    cometWarningDelay = 0;
  }

  function distanceToSegment(px, py, ax, ay, bx, by) {
    const vx = bx - ax;
    const vy = by - ay;
    const wx = px - ax;
    const wy = py - ay;
    const lengthSq = vx * vx + vy * vy;

    if (lengthSq <= 0.0001) {
      return Math.hypot(px - ax, py - ay);
    }

    const t = clamp((wx * vx + wy * vy) / lengthSq, 0, 1);
    const closestX = ax + vx * t;
    const closestY = ay + vy * t;
    return Math.hypot(px - closestX, py - closestY);
  }

  function eraseHazardsCrossedByComet(ax, ay, bx, by) {
    if (!hazards.length) return;

    hazards = hazards.filter((hazard) => {
      const p = pointOnRing(hazard.lane, hazard.angle);
      const crossed = distanceToSegment(p.x, p.y, ax, ay, bx, by) < hazard.size + cometHitWidth;
      return !crossed;
    });
  }

  function cometHitsNova(ax, ay, bx, by) {
    if (state !== "running") return false;

    const p = pointOnRing(player.lane, player.angle);
    const hit =
      distanceToSegment(p.x, p.y, ax, ay, bx, by) <
      player.radius + cometHitWidth;

    if (hit && orbitTestMode) {
      if (!comet.testNovaContact) {
        comet.testNovaContact = true;
        shake = Math.max(shake, 0.18);
        flash = Math.max(flash, 0.3);
        cometFlash = Math.max(cometFlash, 0.26);
        invulnerable = Math.max(invulnerable, 0.2);
        updateHud("TEST MODE: comet impact ignored.");
      }
      return false;
    }

    return hit;
  }

  function showGameOverCard(reason) {
    state = "gameover";
    lives = 0;
    moveCooldown = 0;
    invulnerable = 0;
    clearComet();

    setOrbitScreen("GAME OVER", [
      reason,
      `Final score: ${score}`,
      "Tap planet to restart.",
    ], "final");

    instructionEl.classList.remove("screen-final");
    instructionEl.classList.add("screen-gameover");

    updateHud("");
    updateControlButtons();
  }

  function endRunByComet() {
    lives = Math.max(0, lives - cometStrikeDamage);
    shake = 0.72;
    flash = 0.8;
    cometFlash = 0.72;
    clearComet();

    if (lives <= 0) {
      showGameOverCard("Comet impact.");
      return;
    }

    const previousLane = player.lane;
    player.lane = Math.max(0, player.lane - cometKnockbackRings);
    moveCooldown = typeof orbitMoveCooldownSeconds === "number" ? orbitMoveCooldownSeconds : moveCooldownSeconds;
    invulnerable = 1.4;
    updateHud(previousLane > player.lane ? `Comet impact. -${cometStrikeDamage} lives. Knocked inward hard.` : `Comet impact. -${cometStrikeDamage} lives. Hold the inner orbit.`);
    updateControlButtons();
  }

  function updateCometSystem(dt) {
    if (cometObservedLevel !== level) {
      cometObservedLevel = level;
      cometTwinPending = false;
      cometTwinSecondQueued = false;

      if (level === cometTwinRun && cometTwinTriggeredRun !== level) {
        cometCooldown = Math.min(cometCooldown, 1.8);
      }
    }

    if (cometFlash > 0) {
      cometFlash = Math.max(0, cometFlash - dt);
    }

    if (state !== "running") {
      cometWarningDelay = 0;
      return;
    }

    if (!cometEligible()) {
      return;
    }

    if (comet) {
      const ax = comet.x;
      const ay = comet.y;

      comet.previousX = ax;
      comet.previousY = ay;
      comet.x += comet.vx * dt;
      comet.y += comet.vy * dt;
      comet.age += dt;

      eraseHazardsCrossedByComet(ax, ay, comet.x, comet.y);

      if (cometHitsNova(ax, ay, comet.x, comet.y)) {
        endRunByComet();
        return;
      }

      if (comet.age > comet.life) {
        finishCometPass();
      }

      return;
    }

    if (cometWarningDelay > 0) {
      cometWarningDelay = Math.max(0, cometWarningDelay - dt);
      if (cometWarningDelay === 0) {
        spawnComet();
      }
      return;
    }

    cometCooldown -= dt;
    if (cometCooldown <= 0) {
      triggerCometWarning();
    }
  }

  function drawComet() {
    if (!comet) return;

    const sprite = getCometSprite();
    const headX = cometTrailLength + 22;
    const angle = Math.atan2(comet.dy, comet.dx);

    ctx.save();
    ctx.translate(comet.x, comet.y);
    ctx.rotate(angle);
    ctx.drawImage(sprite, -headX, -sprite.height / 2);
    ctx.restore();
  }

  function drawCometFlash() {
    if (cometFlash <= 0) return;

    ctx.save();
    ctx.globalAlpha = cometFlash * 0.22;
    ctx.fillStyle = "#dff8ff";
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  function refreshTrainingCopy() {
    if (state !== "waiting") return;

    setOrbitScreen("TRAINING ORBIT", [
      "Tap the blue center planet to move outward.",
      "Tap anywhere else to move inward.",
      "Dodge pink debris and collect stars.",
      "Collect 3 stars to add a life!",
      "Jump outward past the outer ring to clear a run.",
      "CAREFUL! Comet strikes remove 3 lives!",
    ]);
    updateHud("");
    updateControlButtons();
  }

  injectOrbitEventStyles();
  setOrbitTestMode(orbitTestMode, false);

  if (typeof setOrbitScreen === "function") {
    const originalSetOrbitScreen = setOrbitScreen;
    setOrbitScreen = function setOrbitScreenWithoutOldGameOverClass(title, lines, tone = "normal") {
      instructionEl.classList.remove("screen-gameover");
      originalSetOrbitScreen(title, lines, tone);
    };
  }

  const originalStartGame = startGame;
  startGame = function startGameWithCometReset() {
    originalStartGame();
    cometTwinTriggeredRun = 0;
    cometObservedLevel = level;
    clearComet();
    instructionEl.classList.remove("screen-gameover");
  };

  crash = function crashWithGameOverCard() {
    if (invulnerable > 0 || state !== "running") return;

    if (orbitTestMode) {
      shake = Math.max(shake, 0.12);
      flash = Math.max(flash, 0.2);
      invulnerable = Math.max(invulnerable, 0.22);
      updateHud("TEST MODE: debris impact ignored.");
      return;
    }

    lives -= 1;
    shake = 0.42;
    flash = 0.55;
    player.lane = 0;
    player.angle -= 0.2;
    moveCooldown = typeof orbitMoveCooldownSeconds === "number" ? orbitMoveCooldownSeconds : moveCooldownSeconds;
    invulnerable = 0.75;

    if (lives <= 0) {
      showGameOverCard("Nova lost.");
    } else {
      updateHud("Crash. Back to inner orbit.");
    }
  };

  if (typeof showOrbitMilestoneScreen === "function") {
    const originalShowOrbitMilestoneScreen = showOrbitMilestoneScreen;
    showOrbitMilestoneScreen = function showOrbitMilestoneScreenWithCometClear() {
      clearComet();
      originalShowOrbitMilestoneScreen();
    };
  }

  if (typeof showOrbitCompleteScreen === "function") {
    const originalShowOrbitCompleteScreen = showOrbitCompleteScreen;
    showOrbitCompleteScreen = function showOrbitCompleteScreenWithCometClear() {
      clearComet();
      originalShowOrbitCompleteScreen();
    };
  }

  const originalUpdate = update;
  update = function updateWithComets(dt) {
    originalUpdate(dt);
    updateCometSystem(dt);
  };

  const originalDraw = draw;
  draw = function drawWithComets() {
    originalDraw();
    drawComet();
    drawCometFlash();
  };

  canvas.addEventListener(
    "pointerdown",
    (event) => {
      if (state !== "gameover") return;

      event.preventDefault();
      event.stopImmediatePropagation();

      if (!tappedPlanet(event)) {
        updateHud("Tap planet to restart.");
        return;
      }

      startGame();
    },
    { passive: false, capture: true }
  );

  window.addEventListener(
    "keydown",
    (event) => {
      if (state !== "gameover") return;
      if (event.code !== "Space" && event.code !== "Enter") return;

      event.preventDefault();
      event.stopImmediatePropagation();
      startGame();
    },
    { capture: true }
  );

  window.addEventListener(
    "keydown",
    (event) => {
      if (event.code !== "KeyT" || event.repeat) return;
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target?.isContentEditable
      ) {
        return;
      }

      event.preventDefault();
      setOrbitTestMode(!orbitTestMode);
    },
    { capture: true }
  );

  window.orbitSetTestMode = (enabled) => setOrbitTestMode(enabled);
  window.orbitGetTestMode = () => orbitTestMode;

  refreshTrainingCopy();
})();