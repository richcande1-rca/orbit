// Orbit event layer: clear game-over cards and comet strikes.
(function orbitEventLayer() {
  const cometMinRun = 3;
  const cometWarningMs = 1180;
  const cometTrailLength = 190;
  const cometHitWidth = 16;
  const cometStrikeDamage = 3;

  let comet = null;
  let cometCooldown = rand(4.5, 7);
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

  function randomCometCooldown() {
    if (level <= 3) return rand(4.5, 7);
    if (level <= 5) return rand(7, 10.5);
    if (level <= 7) return rand(6, 9);
    return rand(4.8, 8);
  }

  function clearComet(resetTimer = true) {
    comet = null;
    cometWarningDelay = 0;
    if (resetTimer) cometCooldown = randomCometCooldown();
  }

  function cometEligible() {
    return state === "running" && level >= cometMinRun;
  }

  function triggerCometWarning() {
    cometWarningDelay = cometWarningMs / 1000;
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
    return distanceToSegment(p.x, p.y, ax, ay, bx, by) < player.radius + cometHitWidth;
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

    player.lane = 0;
    moveCooldown = typeof orbitMoveCooldownSeconds === "number" ? orbitMoveCooldownSeconds : moveCooldownSeconds;
    invulnerable = 1.4;
    updateHud(`Comet impact. -${cometStrikeDamage} lives.`);
    updateControlButtons();
  }

  function updateCometSystem(dt) {
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
        clearComet();
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

    const tailX = comet.x - comet.dx * cometTrailLength;
    const tailY = comet.y - comet.dy * cometTrailLength;

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";

    const streak = ctx.createLinearGradient(tailX, tailY, comet.x, comet.y);
    streak.addColorStop(0, "rgba(255, 109, 36, 0)");
    streak.addColorStop(0.52, "rgba(255, 132, 36, 0.72)");
    streak.addColorStop(1, "rgba(255, 238, 180, 1)");

    ctx.shadowBlur = 24;
    ctx.shadowColor = "rgba(255, 124, 38, 0.95)";
    ctx.strokeStyle = streak;
    ctx.lineWidth = orbitLowPowerMode ? 8 : 11;
    ctx.beginPath();
    ctx.moveTo(tailX, tailY);
    ctx.lineTo(comet.x, comet.y);
    ctx.stroke();

    ctx.shadowBlur = 18;
    ctx.fillStyle = "rgba(255, 241, 203, 0.96)";
    ctx.beginPath();
    ctx.arc(comet.x, comet.y, orbitLowPowerMode ? 5 : 7, 0, TAU);
    ctx.fill();

    ctx.restore();
  }

  function drawCometFlash() {
    if (cometFlash <= 0) return;

    ctx.save();
    ctx.globalAlpha = cometFlash * 0.28;
    ctx.fillStyle = "#ff8a2a";
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  function refreshTrainingCopy() {
    if (state !== "waiting") return;

    setOrbitScreen("TRAINING ORBIT", [
      "Tap the blue center planet to move outward.",
      "Tap anywhere else to move inward.",
      "Dodge pink debris and collect stars.",
      "Collect 4 stars to add a life!",
      "Jump outward past the outer ring to clear a run.",
      "CAREFUL! Comet strikes remove 3 lives!",
    ]);
    updateHud("");
    updateControlButtons();
  }

  injectOrbitEventStyles();

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
    clearComet();
    instructionEl.classList.remove("screen-gameover");
  };

  crash = function crashWithGameOverCard() {
    if (invulnerable > 0 || state !== "running") return;

    lives -= 1;
    shake = 0.42;
    flash = 0.55;
    const previousLane = player.lane;
    player.lane = Math.max(0, player.lane - 1);
    player.angle -= 0.2;
    moveCooldown = typeof orbitMoveCooldownSeconds === "number" ? orbitMoveCooldownSeconds : moveCooldownSeconds;
    invulnerable = 1.1;

    if (lives <= 0) {
      showGameOverCard("Nova lost.");
    } else {
      updateHud(previousLane > player.lane ? "Crash. Knocked inward one ring." : "Crash. Hold the inner orbit.");
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

  refreshTrainingCopy();
})();