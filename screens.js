// Adds the Orbit screen arc without changing the core renderer.
// Training -> layered run cards -> Run 5 checkpoint -> Run 12 completion.
const orbitMilestoneRun = 5;
const orbitFinalRun = 12;
const orbitMoveCooldownSeconds = 0.4;
const orbitLevelHoldMs = 700;
const orbitLayerCardMs = 950;
const orbitSpecialHoldMs = 1350;
const orbitLowPowerMode = window.matchMedia("(pointer: coarse), (max-width: 720px)").matches;
const orbitDprCap = orbitLowPowerMode ? 1 : 2;

let orbitMilestoneShown = false;
let orbitCompleteShown = false;
let orbitLastSeenLevel = 1;
let orbitInputUnlockAt = 0;
let orbitLayerHideAt = 0;

function orbitNow() {
  return performance.now();
}

function holdOrbitInput(ms) {
  orbitInputUnlockAt = Math.max(orbitInputUnlockAt, orbitNow() + ms);
}

function orbitInputLocked() {
  return orbitNow() < orbitInputUnlockAt;
}

function stopOrbitInput(event) {
  event.preventDefault();
  event.stopImmediatePropagation();
}

makeBackground = function makeBackgroundPerformance() {
  const starDensity = orbitLowPowerMode ? 9800 : 4300;
  const minStars = orbitLowPowerMode ? 35 : 85;
  const maxStars = orbitLowPowerMode ? 80 : 260;
  const starCount = Math.floor(clamp((width * height) / starDensity, minStars, maxStars));

  bgStars = Array.from({ length: starCount }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    r: rand(0.45, orbitLowPowerMode ? 1.2 : 1.85),
    twinkle: rand(0, TAU),
    speed: rand(0.25, 1.2),
  }));

  const dustCount = orbitLowPowerMode ? 4 : 26;
  dust = Array.from({ length: dustCount }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    r: rand(24, orbitLowPowerMode ? 54 : 90),
    drift: rand(-0.06, 0.06),
    alpha: rand(0.018, orbitLowPowerMode ? 0.026 : 0.055),
  }));
};

resize = function resizeOrbitPerformance() {
  const dpr = Math.max(1, Math.min(orbitDprCap, window.devicePixelRatio || 1));
  width = Math.floor(window.innerWidth);
  height = Math.floor(window.innerHeight);
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  centerX = width / 2;
  centerY = height / 2 + Math.min(24, height * 0.03);

  const maxRadius = Math.min(width, height) * 0.41;
  const inner = Math.max(72, Math.min(width, height) * 0.16);
  const spacing = (maxRadius - inner) / (ringCount - 1);
  rings = Array.from({ length: ringCount }, (_, i) => inner + i * spacing);
  planetRadius = Math.max(34, inner * 0.52);

  makeBackground();
};

const orbitOriginalDrawNebula = drawNebula;
drawNebula = function drawNebulaPerformance() {
  if (orbitLowPowerMode) return;
  orbitOriginalDrawNebula();
};

const orbitOriginalDrawOrbitGlow = drawOrbitGlow;
drawOrbitGlow = function drawOrbitGlowPerformance() {
  if (!orbitLowPowerMode) {
    orbitOriginalDrawOrbitGlow();
    return;
  }

  ctx.save();

  rings.forEach((radius, lane) => {
    const active = lane === player.lane;
    ctx.lineWidth = active ? 2.4 : 1.1;
    ctx.strokeStyle = active ? "rgba(141, 236, 255, 0.72)" : "rgba(125, 195, 255, 0.18)";
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, TAU);
    ctx.stroke();
  });

  ctx.restore();
};

makeHazards = function makeHazardsWithSafeInnerRing() {
  const speedScale = 1 + (level - 1) * 0.13;
  hazards = [];

  for (let lane = 1; lane < ringCount; lane++) {
    const count = 1 + (level > 3 && Math.random() < 0.52 ? 1 : 0);
    const laneRate = laneSpeedRates[lane] || 1;

    for (let i = 0; i < count; i++) {
      const direction = lane % 2 === 0 ? 1 : -1;
      hazards.push({
        lane,
        angle: rand(0, TAU),
        speed: direction * rand(0.54, 0.92) * laneRate * speedScale,
        size: rand(10, 15),
        wobble: rand(0, TAU),
      });
    }
  }
};

movePlayer = function movePlayerWithBalance(direction) {
  if (moveCooldown > 0) return;

  if (direction < 0 && player.lane === 0) {
    updateHud("Inner orbit. Tap planet to go out.");
    return;
  }

  player.lane += direction;
  moveCooldown = orbitMoveCooldownSeconds;
  flash = 0.2;

  if (player.lane >= ringCount) {
    score += 1;
    level += 1;
    levelStarsCollected = 0;
    player.lane = 0;
    invulnerable = 0.9;
    const orbitChange = typeof applyRingCountForLevel === "function" && applyRingCountForLevel();
    makeHazards();
    placeBonusStar();

    if (orbitChange === "expanded") {
      updateHud(`Level ${level}. Orbit expanded.`);
    } else if (orbitChange === "stabilized") {
      updateHud(`Level ${level}. Orbit stabilized.`);
    } else {
      updateHud(`Level ${level}. Planet out. Rings in.`);
    }
  } else {
    updateHud(direction > 0 ? "Outward." : "Inward.");
  }
};

function setOrbitScreen(title, lines, tone = "normal") {
  instructionEl.replaceChildren();
  instructionEl.classList.remove("hidden", "screen-layer", "screen-special", "screen-final");

  if (tone === "layer") instructionEl.classList.add("screen-layer");
  if (tone === "special") instructionEl.classList.add("screen-special");
  if (tone === "final") instructionEl.classList.add("screen-final");

  const heading = document.createElement("strong");
  heading.textContent = title;
  instructionEl.appendChild(heading);

  for (const line of lines) {
    const item = document.createElement("span");
    item.textContent = line;
    instructionEl.appendChild(item);
  }

  messageEl.textContent = "";
}

function orbitLayerForRun(run) {
  if (run <= 2) {
    return {
      title: "LOW ORBIT",
      line: "Read the lanes. Choose the window.",
    };
  }

  if (run <= 5) {
    return {
      title: "GRAVITY SHEAR",
      line: "The traffic pulls harder now.",
    };
  }

  if (run <= 9) {
    return {
      title: "DEEP FIELD",
      line: "Stay patient. The gaps are moving.",
    };
  }

  return {
    title: "FINAL APPROACH",
    line: "One clean climb to apogee.",
  };
}

function showOrbitLayerCard(run) {
  const layer = orbitLayerForRun(run);
  orbitLayerHideAt = orbitNow() + orbitLayerCardMs;
  holdOrbitInput(orbitLevelHoldMs);
  setOrbitScreen(layer.title, [`Run ${run}`, layer.line], "layer");
}

function hideOrbitLayerCardIfReady() {
  if (state !== "running") return;
  if (!instructionEl.classList.contains("screen-layer")) return;
  if (orbitNow() < orbitLayerHideAt) return;

  instructionEl.classList.add("hidden");
}

function showOrbitTrainingScreen() {
  orbitMilestoneShown = false;
  orbitCompleteShown = false;
  orbitLastSeenLevel = 1;
  orbitInputUnlockAt = 0;
  orbitLayerHideAt = 0;
  setOrbitScreen("TRAINING ORBIT", [
    "Tap the blue center planet to move outward.",
    "Tap anywhere else to move inward.",
    "Dodge pink debris and comets.",
    "Collect 4 stars to add a life!",
    "Jump outward past the outer ring to clear a run.",
  ]);
  updateHud("");
  updateControlButtons();
}

function showOrbitMilestoneScreen() {
  orbitMilestoneShown = true;
  state = "milestone";
  player.lane = 0;
  moveCooldown = 0;
  invulnerable = 0;
  flash = 0.45;
  orbitLayerHideAt = 0;
  holdOrbitInput(orbitSpecialHoldMs);

  setOrbitScreen("DEEP ORBIT", [
    "Good. The orbit expands now.",
    "Tap planet to continue.",
  ], "special");
  updateHud("");
  updateControlButtons();
}

function continueFromOrbitMilestone() {
  state = "running";
  player.lane = 0;
  moveCooldown = 0;
  invulnerable = 1.0;
  instructionEl.classList.add("hidden");
  updateHud(`Run ${level}. Planet out. Rings in.`);
  updateControlButtons();
}

function showOrbitCompleteScreen() {
  orbitCompleteShown = true;
  state = "complete";
  player.lane = ringCount - 1;
  moveCooldown = 0;
  invulnerable = 0;
  flash = 0.9;
  orbitLayerHideAt = 0;
  holdOrbitInput(orbitSpecialHoldMs);

  setOrbitScreen("APOGEE REACHED", [
    "You escaped the orbit.",
    `Final score: ${score}`,
    "Tap planet to restart.",
  ], "final");
  updateHud("");
  updateControlButtons();
}

function watchOrbitProgress() {
  if (state === "running" && level === 1 && score === 0) {
    orbitMilestoneShown = false;
    orbitCompleteShown = false;
    orbitLastSeenLevel = 1;
    orbitInputUnlockAt = 0;
    orbitLayerHideAt = 0;
  }

  if (state === "running" && level !== orbitLastSeenLevel) {
    const advanced = level > orbitLastSeenLevel;
    orbitLastSeenLevel = level;

    if (advanced) {
      if (!orbitCompleteShown && level > orbitFinalRun) {
        showOrbitCompleteScreen();
      } else if (!orbitMilestoneShown && level > orbitMilestoneRun) {
        showOrbitMilestoneScreen();
      } else {
        showOrbitLayerCard(level);
      }
    }
  }

  if (state === "running" && !orbitCompleteShown && level > orbitFinalRun) {
    showOrbitCompleteScreen();
  } else if (state === "running" && !orbitMilestoneShown && level > orbitMilestoneRun) {
    showOrbitMilestoneScreen();
  }

  hideOrbitLayerCardIfReady();
  requestAnimationFrame(watchOrbitProgress);
}

canvas.addEventListener(
  "pointerdown",
  (event) => {
    if ((state === "running" || state === "milestone" || state === "complete") && orbitInputLocked()) {
      stopOrbitInput(event);
      return;
    }

    if (state !== "milestone" && state !== "complete") return;

    stopOrbitInput(event);

    if (!tappedPlanet(event)) {
      updateHud(state === "milestone" ? "Tap planet to continue." : "Tap planet to restart.");
      return;
    }

    if (state === "milestone") {
      continueFromOrbitMilestone();
      return;
    }

    startGame();
  },
  { passive: false, capture: true }
);

window.addEventListener(
  "keydown",
  (event) => {
    if (event.code !== "Space" && event.code !== "Enter") return;
    if (state !== "running" && state !== "milestone" && state !== "complete") return;

    if (orbitInputLocked()) {
      stopOrbitInput(event);
      return;
    }

    if (state === "milestone") {
      stopOrbitInput(event);
      continueFromOrbitMilestone();
      return;
    }

    if (state === "complete") {
      stopOrbitInput(event);
      startGame();
    }
  },
  { capture: true }
);

window.addEventListener("resize", resize);
resize();
showOrbitTrainingScreen();
requestAnimationFrame(watchOrbitProgress);
