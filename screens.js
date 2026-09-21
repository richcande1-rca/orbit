// Adds the Orbit screen arc without changing the core renderer.
// Training -> reward run cards -> space warp completion.
const orbitFinalRun = 12;
const orbitMoveCooldownSeconds = 0.4;
const orbitLevelHoldMs = 700;
const orbitLayerCardMs = 950;
const orbitSpecialHoldMs = 1350;
const orbitRewardHoldMs = 1100;
function orbitUseLowPowerMode() {
  return !!window.orbitPerformance?.lowPower;
}
const orbitRewardCards = {
  4: {
    title: "ORBIT BREACH",
    lines: ["Run 3 cleared.", "Inner field broken.", "Click or tap anywhere to continue."],
  },
  7: {
    title: "DEEP ORBIT",
    lines: ["Run 6 cleared.", "The system opens wider.", "Click or tap anywhere to continue."],
  },
  11: {
    title: "EVENT HORIZON",
    lines: ["Run 10 cleared.", "Space begins to fold.", "Click or tap anywhere to continue."],
  },
};
const orbitDifficultyModes = {
  easy: { label: "Easy", moveCooldown: 0.28, postRewardGrace: 0.15 },
  normal: { label: "Normal", moveCooldown: orbitMoveCooldownSeconds, postRewardGrace: 0.08 },
  hard: { label: "Hard", moveCooldown: 0.58, postRewardGrace: 0.04 },
};
const orbitCounterflowRun = 5;
const orbitCrosscurrentRun = 6;
const orbitSafeCorridorRun = 8;
const orbitPhaseShiftRun = 9;
const orbitTwinCometRun = 10;
const orbitSafeCorridorMs = 4200;
const orbitPhaseHiddenMs = 900;
const orbitPhaseGapMs = 2400;
const orbitFirstLightRun = 1;
const orbitFirstLightDurationMs = 1450;
const orbitFirstLightTextAtMs = 900;
const orbitBloomRun = 2;
const orbitBloomDurationMs = 1450;
const orbitBloomTextAtMs = 930;
const orbitGravityLensRun = 3;
const orbitGravityLensDurationMs = 2050;
const orbitGravityLensTextAtMs = 620;

let orbitRewardSeen = new Set();
let orbitCompleteShown = false;
let orbitLastSeenLevel = 1;
let orbitInputUnlockAt = 0;
let orbitLayerHideAt = 0;
let orbitDifficulty = "normal";
let orbitPostRewardJump = false;
let orbitLiteBackgroundCache = null;
let orbitSafeLane = -1;
let orbitSafeLaneUntil = 0;
let orbitPhaseLane = -1;
let orbitPhaseLaneUntil = 0;
let orbitNextPhaseAt = 0;
let orbitFirstLightActive = false;
let orbitFirstLightStartedAt = 0;
let orbitFirstLightTextShown = false;
let orbitFirstLightFrozenHazards = [];
let orbitFirstLightFrozenBonus = null;
let orbitFirstLightStreaks = [];
let orbitBloomActive = false;
let orbitBloomStartedAt = 0;
let orbitBloomTextShown = false;
let orbitBloomFrozenHazards = [];
let orbitBloomFrozenBonus = null;
let orbitGravityLensActive = false;
let orbitGravityLensStartedAt = 0;
let orbitGravityLensTextShown = false;
let orbitGravityLensFrozenHazards = [];
let orbitGravityLensFrozenBonus = null;

function rebuildOrbitLiteBackgroundCache() {
  if (!orbitUseLowPowerMode() || width <= 0 || height <= 0) {
    orbitLiteBackgroundCache = null;
    return;
  }

  const cacheCanvas = document.createElement("canvas");
  cacheCanvas.width = Math.max(1, Math.floor(width));
  cacheCanvas.height = Math.max(1, Math.floor(height));
  const cacheCtx = cacheCanvas.getContext("2d");
  if (!cacheCtx) {
    orbitLiteBackgroundCache = null;
    return;
  }

  const gradient = cacheCtx.createRadialGradient(centerX, centerY, 10, centerX, centerY, Math.max(width, height));
  gradient.addColorStop(0, "#14275d");
  gradient.addColorStop(0.28, "#081331");
  gradient.addColorStop(0.62, "#030713");
  gradient.addColorStop(1, "#000106");
  cacheCtx.fillStyle = gradient;
  cacheCtx.fillRect(0, 0, width, height);

  cacheCtx.fillStyle = "#ffffff";
  for (const star of bgStars) {
    cacheCtx.globalAlpha = 0.46;
    cacheCtx.beginPath();
    cacheCtx.arc(star.x, star.y, star.r, 0, TAU);
    cacheCtx.fill();
  }
  cacheCtx.globalAlpha = 1;

  orbitLiteBackgroundCache = cacheCanvas;
}

function orbitNow() {
  return performance.now();
}

function orbitDifficultyConfig() {
  return orbitDifficultyModes[orbitDifficulty] || orbitDifficultyModes.normal;
}

function setOrbitDifficulty(nextDifficulty) {
  if (!orbitDifficultyModes[nextDifficulty]) return;
  orbitDifficulty = nextDifficulty;
  updateHud(`Jump speed: ${orbitDifficultyConfig().label}.`);
  window.dispatchEvent(new CustomEvent("orbitdifficultychange", {
    detail: { difficulty: orbitDifficulty },
  }));
}

function orbitDestinationHasThreat(lane) {
  if (lane < 0 || lane >= ringCount || !rings[lane]) return false;

  return hazards.some((hazard) => {
    if (hazard.lane !== lane) return false;
    const ringRadius = rings[hazard.lane];
    const angularHitBox = hazard.size / ringRadius + 0.08;
    return angleDistance(player.angle, hazard.angle) < angularHitBox;
  });
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

const orbitOriginalStartGame = startGame;
startGame = function startGameWithOrbitDifficulty() {
  cancelOrbitFirstLight();
  cancelOrbitBloom();
  cancelOrbitGravityLens();
  orbitPostRewardJump = false;
  orbitOriginalStartGame();
};

makeBackground = function makeBackgroundPerformance() {
  const starDensity = orbitUseLowPowerMode() ? 8600 : 3900;
  const minStars = orbitUseLowPowerMode() ? 38 : 96;
  const maxStars = orbitUseLowPowerMode() ? 88 : 285;
  const starCount = Math.floor(clamp((width * height) / starDensity, minStars, maxStars));

  bgStars = Array.from({ length: starCount }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    r: rand(0.45, orbitUseLowPowerMode() ? 1.25 : 1.9),
    twinkle: rand(0, TAU),
    speed: rand(0.52, orbitUseLowPowerMode() ? 1.45 : 1.75),
    sparkle: rand(0.86, 1.18),
  }));

  const dustCount = orbitUseLowPowerMode() ? 4 : 26;
  dust = Array.from({ length: dustCount }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    r: rand(24, orbitUseLowPowerMode() ? 54 : 90),
    drift: rand(-0.06, 0.06),
    alpha: rand(0.018, orbitUseLowPowerMode() ? 0.026 : 0.055),
  }));

  rebuildOrbitLiteBackgroundCache();
};

drawBackground = function drawBackgroundTwinkleTune() {
  if (orbitUseLowPowerMode() && orbitLiteBackgroundCache) {
    ctx.globalAlpha = 1;
    ctx.drawImage(orbitLiteBackgroundCache, 0, 0, width, height);
    return;
  }

  const gradient = ctx.createRadialGradient(centerX, centerY, 10, centerX, centerY, Math.max(width, height));
  gradient.addColorStop(0, "#14275d");
  gradient.addColorStop(0.28, "#081331");
  gradient.addColorStop(0.62, "#030713");
  gradient.addColorStop(1, "#000106");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  const maxAlpha = orbitUseLowPowerMode() ? 0.82 : 0.94;

  for (const star of bgStars) {
    const shimmer = 0.5 + Math.sin(star.twinkle) * 0.5;
    const alpha = 0.14 + shimmer * 0.68 * (star.sparkle || 1);
    ctx.globalAlpha = clamp(alpha, 0.08, maxAlpha);
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.r, 0, TAU);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
  }

  ctx.globalAlpha = 1;
};

resize = function resizeOrbitPerformance() {
  const dprCap = orbitUseLowPowerMode() ? 1 : 2;
  const dpr = Math.max(1, Math.min(dprCap, window.devicePixelRatio || 1));
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
  if (orbitUseLowPowerMode()) return;
  orbitOriginalDrawNebula();
};

const orbitOriginalDrawOrbitGlow = drawOrbitGlow;
drawOrbitGlow = function drawOrbitGlowPerformance() {
  if (orbitGravityLensActive) {
    drawOrbitGravityLensRings();
    return;
  }

  if (orbitBloomActive) {
    drawOrbitBloomRings();
    return;
  }

  if (!orbitUseLowPowerMode()) {
    orbitOriginalDrawOrbitGlow();
    return;
  }

  ctx.save();

  const now = orbitNow();
  const safeLaneActive =
    level === orbitSafeCorridorRun &&
    orbitSafeLane >= 1 &&
    now < orbitSafeLaneUntil;
  const phaseLaneActive =
    level === orbitPhaseShiftRun &&
    orbitPhaseLane >= 1 &&
    now < orbitPhaseLaneUntil;

  rings.forEach((radius, lane) => {
    const active = lane === player.lane;
    const safe = safeLaneActive && lane === orbitSafeLane;
    const phased = phaseLaneActive && lane === orbitPhaseLane;
    ctx.lineWidth = phased ? 0.8 : safe ? 2.8 : active ? 2.4 : 1.1;
    ctx.strokeStyle = phased
      ? "rgba(125, 195, 255, 0.025)"
      : safe
        ? "rgba(128, 255, 190, 0.82)"
        : active
          ? "rgba(141, 236, 255, 0.72)"
          : "rgba(125, 195, 255, 0.18)";
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, TAU);
    ctx.stroke();
  });

  ctx.restore();
};

function createOrbitHazard(lane, speedScale, reverseFlow = false) {
  const laneRate = laneSpeedRates[lane] || 1;
  let direction = lane % 2 === 0 ? 1 : -1;
  if (reverseFlow) direction *= -1;

  return {
    lane,
    angle: rand(0, TAU),
    speed: direction * rand(0.54, 0.92) * laneRate * speedScale,
    size: rand(10, 15),
    wobble: rand(0, TAU),
  };
}

makeHazards = function makeHazardsWithRunIdentity() {
  const speedScale = 1 + (level - 1) * 0.13;
  const reverseFlow = level === orbitCounterflowRun;
  hazards = [];
  orbitSafeLane = -1;
  orbitSafeLaneUntil = 0;
  orbitPhaseLane = -1;
  orbitPhaseLaneUntil = 0;
  orbitNextPhaseAt = level === orbitPhaseShiftRun ? orbitNow() + 1600 : 0;

  if (level === orbitSafeCorridorRun) {
    orbitSafeLane = Math.floor(rand(1, ringCount));
    orbitSafeLaneUntil = orbitNow() + orbitSafeCorridorMs;
  }

  for (let lane = 1; lane < ringCount; lane++) {
    if (lane === orbitSafeLane) continue;

    if (level === orbitCrosscurrentRun) {
      hazards.push(createOrbitHazard(lane, speedScale, false));
      hazards.push(createOrbitHazard(lane, speedScale, true));
      continue;
    }

    const count = 1 + (level > 3 && Math.random() < 0.52 ? 1 : 0);
    for (let i = 0; i < count; i++) {
      hazards.push(createOrbitHazard(lane, speedScale, reverseFlow));
    }
  }
};

function closeOrbitSafeCorridorIfReady() {
  if (level !== orbitSafeCorridorRun || orbitSafeLane < 1) return;
  if (orbitNow() < orbitSafeLaneUntil) return;

  const lane = orbitSafeLane;
  orbitSafeLane = -1;
  orbitSafeLaneUntil = 0;

  const speedScale = 1 + (level - 1) * 0.13;
  hazards.push(createOrbitHazard(lane, speedScale));
  updateHud("SAFE CORRIDOR CLOSED.");
}

function updateOrbitPhaseShift() {
  if (level !== orbitPhaseShiftRun || state !== "running") {
    orbitPhaseLane = -1;
    orbitPhaseLaneUntil = 0;
    return;
  }

  const now = orbitNow();

  if (orbitPhaseLane >= 1) {
    if (now < orbitPhaseLaneUntil) return;

    orbitPhaseLane = -1;
    orbitPhaseLaneUntil = 0;
    orbitNextPhaseAt = now + orbitPhaseGapMs;
    updateHud("ORBIT RESTORED.");
    return;
  }

  if (now < orbitNextPhaseAt || ringCount <= 1) return;

  orbitPhaseLane = Math.floor(rand(1, ringCount));
  orbitPhaseLaneUntil = now + orbitPhaseHiddenMs;
  updateHud("PHASE SHIFT — ORBIT LINE LOST.");
}

function advanceOrbitToNextRun() {
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
}

movePlayer = function movePlayerWithBalance(direction) {
  if (moveCooldown > 0) return;

  if (direction < 0 && player.lane === 0) {
    updateHud("Inner orbit. Tap planet to go out.");
    return;
  }

  const difficulty = orbitDifficultyConfig();
  const destinationLane = player.lane + direction;
  const rewardGraceBlocked = orbitPostRewardJump && orbitDestinationHasThreat(destinationLane);

  player.lane += direction;
  moveCooldown = difficulty.moveCooldown;
  flash = 0.2;

  if (player.lane >= ringCount) {
    score += 1;

    if (level === orbitFirstLightRun) {
      beginOrbitFirstLight();
    } else if (level === orbitBloomRun) {
      beginOrbitBloom();
    } else if (level === orbitGravityLensRun) {
      beginOrbitGravityLens();
    } else {
      advanceOrbitToNextRun();
    }
  } else {
    updateHud(direction > 0 ? "Outward." : "Inward.");
  }

  if (orbitPostRewardJump) {
    if (!rewardGraceBlocked) {
      invulnerable = Math.max(invulnerable, difficulty.postRewardGrace);
    }

    orbitPostRewardJump = false;
  }
};

function setOrbitScreen(title, lines, tone = "normal") {
  instructionEl.replaceChildren();
  instructionEl.classList.remove("hidden", "screen-layer", "screen-special", "screen-final", "screen-reward", "screen-warp", "screen-gameover");

  if (tone === "layer") instructionEl.classList.add("screen-layer");
  if (tone === "special") instructionEl.classList.add("screen-special");
  if (tone === "final") instructionEl.classList.add("screen-final");
  if (tone === "reward") instructionEl.classList.add("screen-reward");
  if (tone === "warp") instructionEl.classList.add("screen-warp");

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

function restoreOrbitFirstLightMotion() {
  for (const frozen of orbitFirstLightFrozenHazards) {
    if (frozen.hazard) frozen.hazard.speed = frozen.speed;
  }
  orbitFirstLightFrozenHazards = [];

  if (orbitFirstLightFrozenBonus?.star) {
    orbitFirstLightFrozenBonus.star.speed = orbitFirstLightFrozenBonus.speed;
  }
  orbitFirstLightFrozenBonus = null;
}

function cancelOrbitFirstLight() {
  if (!orbitFirstLightActive) return;
  restoreOrbitFirstLightMotion();
  orbitFirstLightActive = false;
  orbitFirstLightStartedAt = 0;
  orbitFirstLightTextShown = false;
  orbitFirstLightStreaks = [];
}

function beginOrbitFirstLight() {
  orbitFirstLightActive = true;
  orbitFirstLightStartedAt = orbitNow();
  orbitFirstLightTextShown = false;
  orbitLayerHideAt = 0;
  player.lane = Math.max(0, ringCount - 1);
  invulnerable = Math.max(invulnerable, 1.5);
  moveCooldown = 0;
  state = "stageevent";

  orbitFirstLightFrozenHazards = hazards.map((hazard) => {
    const frozen = { hazard, speed: hazard.speed };
    hazard.speed = 0;
    return frozen;
  });

  orbitFirstLightFrozenBonus = bonusStar
    ? { star: bonusStar, speed: bonusStar.speed }
    : null;
  if (bonusStar) bonusStar.speed = 0;

  orbitFirstLightStreaks = Array.from({ length: 9 }, (_, index) => ({
    angle: rand(0, TAU),
    delay: 540 + index * 24 + rand(0, 80),
    speed: rand(0.78, 1.12),
    length: rand(14, 26),
  }));

  instructionEl.classList.add("hidden");
  holdOrbitInput(orbitFirstLightDurationMs + 120);
  updateHud("");
  updateControlButtons();
}

function finishOrbitFirstLight() {
  if (!orbitFirstLightActive) return;

  restoreOrbitFirstLightMotion();
  orbitFirstLightActive = false;
  orbitFirstLightStartedAt = 0;
  orbitFirstLightTextShown = false;
  orbitFirstLightStreaks = [];
  instructionEl.classList.add("hidden");
  state = "running";
  advanceOrbitToNextRun();
  updateControlButtons();
}

function updateOrbitFirstLight() {
  if (!orbitFirstLightActive) return;

  const elapsed = orbitNow() - orbitFirstLightStartedAt;

  if (!orbitFirstLightTextShown && elapsed >= orbitFirstLightTextAtMs) {
    orbitFirstLightTextShown = true;
    setOrbitScreen("FIRST LIGHT", ["ORBIT STABLE"], "special");
  }

  if (elapsed >= orbitFirstLightDurationMs) {
    finishOrbitFirstLight();
  }
}

function drawOrbitFirstLight() {
  if (!orbitFirstLightActive) return;

  const elapsed = orbitNow() - orbitFirstLightStartedAt;
  const minDimension = Math.min(width, height);
  const pulseProgress = clamp(elapsed / 520, 0, 1);
  const pulseAlpha = Math.sin(pulseProgress * Math.PI);

  ctx.save();
  ctx.globalCompositeOperation = "source-over";

  if (pulseAlpha > 0) {
    ctx.globalAlpha = pulseAlpha * 0.12;
    ctx.fillStyle = "#eaffff";
    ctx.fillRect(0, 0, width, height);

    ctx.globalAlpha = pulseAlpha * 0.72;
    ctx.strokeStyle = "#dfffff";
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(
      centerX,
      centerY,
      planetRadius * (1.1 + pulseProgress * 3.1),
      0,
      TAU
    );
    ctx.stroke();

    ctx.globalAlpha = pulseAlpha * 0.55;
    ctx.fillStyle = "#efffff";
    ctx.beginPath();
    ctx.arc(centerX, centerY, planetRadius * (0.7 + pulseAlpha * 0.5), 0, TAU);
    ctx.fill();
  }

  rings.forEach((radius, lane) => {
    const ringStart = 230 + lane * 105;
    const ringProgress = (elapsed - ringStart) / 300;
    if (ringProgress <= 0 || ringProgress >= 1) return;

    const alpha = Math.sin(ringProgress * Math.PI);
    ctx.globalAlpha = alpha * 0.92;
    ctx.strokeStyle = lane % 2 === 0 ? "#e9ffff" : "#8cecff";
    ctx.lineWidth = 2 + alpha * 3;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, TAU);
    ctx.stroke();
  });

  const starBrighten = clamp(1 - Math.abs(elapsed - 720) / 360, 0, 1);
  if (starBrighten > 0) {
    ctx.globalAlpha = starBrighten * 0.72;
    ctx.fillStyle = "#ffffff";
    for (const star of bgStars) {
      ctx.beginPath();
      ctx.arc(star.x, star.y, Math.max(0.9, star.r * 1.35), 0, TAU);
      ctx.fill();
    }
  }

  const outerRadius = rings.length ? rings[rings.length - 1] : planetRadius * 3;
  for (const streak of orbitFirstLightStreaks) {
    const progress = clamp(
      (elapsed - streak.delay) / (560 / streak.speed),
      0,
      1
    );
    if (progress <= 0 || progress >= 1) continue;

    const headRadius = outerRadius + 8 + progress * minDimension * 0.32;
    const tailRadius = Math.max(
      outerRadius,
      headRadius - streak.length - progress * 12
    );
    const cos = Math.cos(streak.angle);
    const sin = Math.sin(streak.angle);

    ctx.globalAlpha = (1 - progress) * 0.9;
    ctx.strokeStyle = "#dffbff";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(centerX + cos * tailRadius, centerY + sin * tailRadius);
    ctx.lineTo(centerX + cos * headRadius, centerY + sin * headRadius);
    ctx.stroke();
  }

  ctx.restore();
}

function restoreOrbitBloomMotion() {
  for (const frozen of orbitBloomFrozenHazards) {
    if (frozen.hazard) frozen.hazard.speed = frozen.speed;
  }
  orbitBloomFrozenHazards = [];

  if (orbitBloomFrozenBonus?.star) {
    orbitBloomFrozenBonus.star.speed = orbitBloomFrozenBonus.speed;
  }
  orbitBloomFrozenBonus = null;
}

function cancelOrbitBloom() {
  if (!orbitBloomActive) return;
  restoreOrbitBloomMotion();
  orbitBloomActive = false;
  orbitBloomStartedAt = 0;
  orbitBloomTextShown = false;
}

function beginOrbitBloom() {
  orbitBloomActive = true;
  orbitBloomStartedAt = orbitNow();
  orbitBloomTextShown = false;
  orbitLayerHideAt = 0;
  player.lane = Math.max(0, ringCount - 1);
  invulnerable = Math.max(invulnerable, 1.5);
  moveCooldown = 0;
  state = "stageevent";

  orbitBloomFrozenHazards = hazards.map((hazard) => {
    const frozen = { hazard, speed: hazard.speed };
    hazard.speed = 0;
    return frozen;
  });

  orbitBloomFrozenBonus = bonusStar
    ? { star: bonusStar, speed: bonusStar.speed }
    : null;
  if (bonusStar) bonusStar.speed = 0;

  instructionEl.classList.add("hidden");
  holdOrbitInput(orbitBloomDurationMs + 120);
  updateHud("");
  updateControlButtons();
}

function finishOrbitBloom() {
  if (!orbitBloomActive) return;

  restoreOrbitBloomMotion();
  orbitBloomActive = false;
  orbitBloomStartedAt = 0;
  orbitBloomTextShown = false;
  instructionEl.classList.add("hidden");
  state = "running";
  advanceOrbitToNextRun();
  updateControlButtons();
}

function updateOrbitBloom() {
  if (!orbitBloomActive) return;

  const elapsed = orbitNow() - orbitBloomStartedAt;

  if (!orbitBloomTextShown && elapsed >= orbitBloomTextAtMs) {
    orbitBloomTextShown = true;
    setOrbitScreen("ORBITAL BLOOM", ["TRAJECTORY EXPANDING"], "special");
  }

  if (elapsed >= orbitBloomDurationMs) {
    finishOrbitBloom();
  }
}

function orbitBloomOpenAmount(elapsed) {
  if (elapsed <= 160) {
    const p = clamp(elapsed / 160, 0, 1);
    return p * p * (3 - 2 * p);
  }

  if (elapsed < 820) {
    const breathe = Math.sin((elapsed - 160) / 660 * Math.PI);
    return 0.9 + breathe * 0.1;
  }

  const close = clamp((elapsed - 820) / 190, 0, 1);
  const eased = close * close * (3 - 2 * close);
  return 1 - eased;
}

function drawOrbitBloomRings() {
  const elapsed = orbitNow() - orbitBloomStartedAt;
  const open = orbitBloomOpenAmount(elapsed);
  const segmentCount = 6;
  const segmentSpan = TAU / segmentCount;
  const gap = 0.115 * open;

  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  ctx.lineCap = "round";

  rings.forEach((radius, lane) => {
    const direction = lane % 2 === 0 ? 1 : -1;
    const rotation = direction * 0.18 * open;
    const active = lane === player.lane;

    ctx.strokeStyle = lane % 2 === 0
      ? "rgba(153, 231, 255, 0.88)"
      : "rgba(183, 142, 255, 0.86)";
    ctx.lineWidth = active ? 3.6 : 2.2;

    if (open < 0.025) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, TAU);
      ctx.stroke();
      return;
    }

    for (let segment = 0; segment < segmentCount; segment += 1) {
      const start = rotation + segment * segmentSpan + gap * 0.5;
      const end = rotation + (segment + 1) * segmentSpan - gap * 0.5;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, start, end);
      ctx.stroke();
    }
  });

  ctx.restore();
}

function drawOrbitBloomOverlay() {
  if (!orbitBloomActive) return;

  const elapsed = orbitNow() - orbitBloomStartedAt;
  const open = orbitBloomOpenAmount(elapsed);
  const planetStrength = clamp(1 - Math.abs(elapsed - 620) / 650, 0, 1);

  ctx.save();
  ctx.globalCompositeOperation = "source-over";

  if (planetStrength > 0) {
    ctx.globalAlpha = planetStrength * 0.24;
    ctx.fillStyle = "#9b72ff";
    ctx.beginPath();
    ctx.arc(centerX, centerY, planetRadius * (1.7 + open * 0.35), 0, TAU);
    ctx.fill();

    ctx.globalAlpha = planetStrength * 0.34;
    ctx.fillStyle = "#7e9cff";
    ctx.beginPath();
    ctx.arc(centerX, centerY, planetRadius * 1.18, 0, TAU);
    ctx.fill();

    ctx.globalAlpha = planetStrength * 0.28;
    ctx.fillStyle = "#e8e2ff";
    ctx.beginPath();
    ctx.arc(centerX, centerY, planetRadius * 0.72, 0, TAU);
    ctx.fill();
  }

  const shimmerProgress = clamp((elapsed - 820) / 500, 0, 1);
  if (shimmerProgress > 0 && shimmerProgress < 1) {
    const shimmerAlpha = Math.sin(shimmerProgress * Math.PI);
    const outerRadius = rings.length
      ? rings[rings.length - 1]
      : Math.min(width, height) * 0.4;
    const baseRadius = planetRadius * 1.8 + shimmerProgress * outerRadius * 1.2;

    ctx.globalAlpha = shimmerAlpha * 0.34;
    ctx.strokeStyle = "#d8cfff";
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(centerX, centerY, baseRadius, 0, TAU);
    ctx.stroke();

    ctx.globalAlpha = shimmerAlpha * 0.18;
    ctx.strokeStyle = "#8fe8ff";
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, baseRadius * 0.84, 0, TAU);
    ctx.stroke();
  }

  ctx.restore();
}

function restoreOrbitGravityLensMotion() {
  for (const frozen of orbitGravityLensFrozenHazards) {
    if (frozen.hazard) frozen.hazard.speed = frozen.speed;
  }
  orbitGravityLensFrozenHazards = [];

  if (orbitGravityLensFrozenBonus?.star) {
    orbitGravityLensFrozenBonus.star.speed = orbitGravityLensFrozenBonus.speed;
  }
  orbitGravityLensFrozenBonus = null;
}

function cancelOrbitGravityLens() {
  if (!orbitGravityLensActive) return;
  restoreOrbitGravityLensMotion();
  orbitGravityLensActive = false;
  orbitGravityLensStartedAt = 0;
  orbitGravityLensTextShown = false;
}

function beginOrbitGravityLens() {
  orbitGravityLensActive = true;
  orbitGravityLensStartedAt = orbitNow();
  orbitGravityLensTextShown = false;
  orbitLayerHideAt = 0;
  player.lane = Math.max(0, ringCount - 1);
  invulnerable = Math.max(invulnerable, 1.6);
  moveCooldown = 0;
  state = "stageevent";

  orbitGravityLensFrozenHazards = hazards.map((hazard) => {
    const frozen = { hazard, speed: hazard.speed };
    hazard.speed = 0;
    return frozen;
  });

  orbitGravityLensFrozenBonus = bonusStar
    ? { star: bonusStar, speed: bonusStar.speed }
    : null;
  if (bonusStar) bonusStar.speed = 0;

  instructionEl.classList.add("hidden");
  holdOrbitInput(orbitGravityLensDurationMs + 120);
  updateHud("");
  updateControlButtons();
}

function finishOrbitGravityLens() {
  if (!orbitGravityLensActive) return;

  restoreOrbitGravityLensMotion();
  orbitGravityLensActive = false;
  orbitGravityLensStartedAt = 0;
  orbitGravityLensTextShown = false;
  instructionEl.classList.add("hidden");
  state = "running";
  advanceOrbitToNextRun();
  updateControlButtons();
}

function updateOrbitGravityLens() {
  if (!orbitGravityLensActive) return;

  const elapsed = orbitNow() - orbitGravityLensStartedAt;

  if (!orbitGravityLensTextShown && elapsed >= orbitGravityLensTextAtMs) {
    orbitGravityLensTextShown = true;
    setOrbitScreen(
      "GRAVITY LENS",
      ["SPACETIME DISTORTION DETECTED"],
      "special"
    );
  }

  if (elapsed >= orbitGravityLensDurationMs) {
    finishOrbitGravityLens();
  }
}

function orbitGravityLensStrength(elapsed) {
  if (elapsed <= 220) {
    const p = clamp(elapsed / 220, 0, 1);
    return p * p * (3 - 2 * p);
  }

  if (elapsed < 1120) {
    return 1;
  }

  const release = clamp((elapsed - 1120) / 320, 0, 1);
  const eased = release * release * (3 - 2 * release);
  return 1 - eased;
}

function drawOrbitGravityLensRings() {
  const elapsed = orbitNow() - orbitGravityLensStartedAt;
  const strength = orbitGravityLensStrength(elapsed);

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.scale(1 + strength * 0.085, 1 - strength * 0.22);
  ctx.lineCap = "round";

  rings.forEach((radius, lane) => {
    const active = lane === player.lane;
    ctx.strokeStyle = active
      ? `rgba(205, 248, 255, ${0.78 + strength * 0.18})`
      : `rgba(134, 210, 255, ${0.24 + strength * 0.34})`;
    ctx.lineWidth = active ? 3.4 : 1.5 + strength * 0.8;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, TAU);
    ctx.stroke();
  });

  ctx.restore();
}

function drawOrbitGravityLensOverlay() {
  if (!orbitGravityLensActive) return;

  const elapsed = orbitNow() - orbitGravityLensStartedAt;
  const strength = orbitGravityLensStrength(elapsed);
  const nova = pointOnRing(player.lane, player.angle);

  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  ctx.lineCap = "round";

  // Brief opening flash makes the lens event impossible to miss without
  // adding blur, filters, or a particle system.
  const openingFlash = clamp(1 - elapsed / 260, 0, 1);
  if (openingFlash > 0) {
    ctx.globalAlpha = openingFlash * 0.22;
    ctx.fillStyle = "#e8fbff";
    ctx.fillRect(0, 0, width, height);
  }

  // Pull the visible starfield inward. The lines use the existing star
  // positions, so the effect stays deterministic and cheap in LITE mode.
  if (strength > 0.02) {
    ctx.strokeStyle = "#dffbff";
    ctx.lineWidth = 1;
    for (const star of bgStars) {
      const dx = centerX - star.x;
      const dy = centerY - star.y;
      const length = Math.hypot(dx, dy) || 1;
      const pull = Math.min(18, length * 0.055) * strength;
      const ux = dx / length;
      const uy = dy / length;

      ctx.globalAlpha = strength * 0.28;
      ctx.beginPath();
      ctx.moveTo(star.x, star.y);
      ctx.lineTo(star.x + ux * pull, star.y + uy * pull);
      ctx.stroke();
    }
  }

  // Hard blue-white lens halo around the planet.
  const halo = clamp(1 - Math.abs(elapsed - 760) / 820, 0, 1);
  if (halo > 0) {
    ctx.globalAlpha = halo * 0.18;
    ctx.fillStyle = "#bdefff";
    ctx.beginPath();
    ctx.arc(centerX, centerY, planetRadius * 2.25, 0, TAU);
    ctx.fill();

    ctx.globalAlpha = halo * 0.72;
    ctx.strokeStyle = "#eefeff";
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(centerX, centerY, planetRadius * 1.32, 0, TAU);
    ctx.stroke();

    ctx.globalAlpha = halo * 0.7;
    ctx.strokeStyle = "#d9fbff";
    ctx.lineWidth = 2.1;
    ctx.beginPath();
    ctx.arc(nova.x, nova.y, player.radius * 2.25, 0, TAU);
    ctx.stroke();
  }

  // The snap-back launches a clean ripple through the restored geometry.
  const snapProgress = clamp((elapsed - 1320) / 520, 0, 1);
  if (snapProgress > 0 && snapProgress < 1) {
    const snapAlpha = Math.sin(snapProgress * Math.PI);
    const outerRadius = rings.length
      ? rings[rings.length - 1]
      : Math.min(width, height) * 0.4;
    const rippleRadius =
      planetRadius * 1.4 + snapProgress * outerRadius * 1.18;

    ctx.globalAlpha = snapAlpha * 0.72;
    ctx.strokeStyle = "#efffff";
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(centerX, centerY, rippleRadius, 0, TAU);
    ctx.stroke();

    ctx.globalAlpha = snapAlpha * 0.24;
    ctx.fillStyle = "#dff8ff";
    ctx.fillRect(0, 0, width, height);
  }

  ctx.restore();
}

const orbitDrawBeforeStageEvents = draw;
draw = function drawWithOrbitStageEvents() {
  orbitDrawBeforeStageEvents();
  drawOrbitFirstLight();
  drawOrbitBloomOverlay();
  drawOrbitGravityLensOverlay();
};

function orbitLayerForRun(run) {
  if (run === orbitCounterflowRun) {
    return {
      title: "COUNTERFLOW",
      line: "Debris has reversed direction.",
    };
  }

  if (run === orbitCrosscurrentRun) {
    return {
      title: "CROSSCURRENT",
      line: "Traffic has split. Watch both directions.",
    };
  }

  if (run === orbitSafeCorridorRun) {
    return {
      title: "SAFE CORRIDOR",
      line: "One orbit is clear. It will not stay clear.",
    };
  }

  if (run === orbitPhaseShiftRun) {
    return {
      title: "PHASE SHIFT",
      line: "One orbit will fade. Track your position.",
    };
  }

  if (run === orbitTwinCometRun) {
    return {
      title: "TWIN COMETS",
      line: "Two inbound passes. Read the warning.",
    };
  }

  if (run <= 2) {
    return {
      title: "LOW ORBIT",
      line: "Read the lanes. Choose the window.",
    };
  }

  if (run <= 4) {
    return {
      title: "DEEP ORBIT",
      line: "The path opens wider now.",
    };
  }

  if (run <= 6) {
    return {
      title: "GRAVITY SHIFT",
      line: "The traffic pulls harder now.",
    };
  }

  if (run <= 9) {
    return {
      title: "COMET WARNING",
      line: "Stay patient. The gaps are moving.",
    };
  }

  return {
    title: "FINAL ORBIT",
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
  orbitRewardSeen = new Set();
  orbitCompleteShown = false;
  orbitLastSeenLevel = 1;
  orbitInputUnlockAt = 0;
  orbitLayerHideAt = 0;
  orbitPostRewardJump = false;
  setOrbitScreen("TRAINING ORBIT", [
    "Tap the blue center planet to move outward.",
    "Tap anywhere else to move inward.",
    "Dodge pink debris and collect stars.",
    "Collect 3 stars to add a life!",
    "Jump outward past the outer ring to clear a run.",
    "Press 1 / 2 / 3 for Easy / Normal / Hard jump speed.",
    "CAREFUL! Comet strikes remove 3 lives!",
  ]);
  updateHud("");
  updateControlButtons();
}

function showOrbitRewardScreen(card) {
  state = "reward";
  player.lane = 0;
  moveCooldown = 0;
  invulnerable = 0;
  flash = 0.55;
  orbitLayerHideAt = 0;
  holdOrbitInput(orbitRewardHoldMs);

  setOrbitScreen(card.title, card.lines, "reward");
  updateHud("");
  updateControlButtons();
}

function showOrbitRewardForLevel(nextLevel) {
  const card = orbitRewardCards[nextLevel];
  if (!card || orbitRewardSeen.has(nextLevel)) return false;

  orbitRewardSeen.add(nextLevel);
  showOrbitRewardScreen(card);
  return true;
}

function continueFromOrbitReward() {
  state = "running";
  player.lane = 0;
  moveCooldown = 0;
  invulnerable = 1.0;
  orbitPostRewardJump = true;
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
  flash = 1.1;
  orbitLayerHideAt = 0;
  holdOrbitInput(orbitSpecialHoldMs);

  setOrbitScreen("SPACE WARP", [
    "Run 12 cleared.",
    "You broke orbit.",
    "The debris field collapses behind you.",
    "The stars stretch into light.",
    `Final score: ${score}`,
    "Tap the blue planet to restart.",
  ], "warp");
  updateHud("");
  updateControlButtons();
}

function watchOrbitProgress() {
  updateOrbitFirstLight();
  updateOrbitBloom();
  updateOrbitGravityLens();

  if (state === "running" && level === 1 && score === 0) {
    orbitRewardSeen = new Set();
    orbitCompleteShown = false;
    orbitLastSeenLevel = 1;
    orbitInputUnlockAt = 0;
    orbitLayerHideAt = 0;
    orbitPostRewardJump = false;
  }

  if (state === "running" && level !== orbitLastSeenLevel) {
    const advanced = level > orbitLastSeenLevel;
    orbitLastSeenLevel = level;

    if (advanced) {
      if (!orbitCompleteShown && level > orbitFinalRun) {
        showOrbitCompleteScreen();
      } else if (showOrbitRewardForLevel(level)) {
        // Fullscreen reward card is now waiting for the player.
      } else {
        showOrbitLayerCard(level);
      }
    }
  }

  if (state === "running" && !orbitCompleteShown && level > orbitFinalRun) {
    showOrbitCompleteScreen();
  } else if (state === "running") {
    showOrbitRewardForLevel(level);
  }

  closeOrbitSafeCorridorIfReady();
  updateOrbitPhaseShift();
  hideOrbitLayerCardIfReady();
  requestAnimationFrame(watchOrbitProgress);
}

canvas.addEventListener(
  "pointerdown",
  (event) => {
    if ((state === "running" || state === "reward" || state === "complete") && orbitInputLocked()) {
      stopOrbitInput(event);
      return;
    }

    if (state !== "reward" && state !== "complete") return;

    stopOrbitInput(event);

    if (state === "reward") {
      continueFromOrbitReward();
      return;
    }

    if (!tappedPlanet(event)) {
      updateHud("Tap the blue planet to restart.");
      return;
    }

    startGame();
  },
  { passive: false, capture: true }
);

window.addEventListener(
  "keydown",
  (event) => {
    if (event.code === "Digit1" || event.code === "Numpad1") {
      event.preventDefault();
      setOrbitDifficulty("easy");
      return;
    }

    if (event.code === "Digit2" || event.code === "Numpad2") {
      event.preventDefault();
      setOrbitDifficulty("normal");
      return;
    }

    if (event.code === "Digit3" || event.code === "Numpad3") {
      event.preventDefault();
      setOrbitDifficulty("hard");
      return;
    }

    if (event.code !== "Space" && event.code !== "Enter") return;
    if (state !== "running" && state !== "reward" && state !== "complete") return;

    if (orbitInputLocked()) {
      stopOrbitInput(event);
      return;
    }

    if (state === "reward") {
      stopOrbitInput(event);
      continueFromOrbitReward();
      return;
    }

    if (state === "complete") {
      stopOrbitInput(event);
      startGame();
    }
  },
  { capture: true }
);

window.orbitSetDifficulty = setOrbitDifficulty;
window.orbitGetDifficulty = () => orbitDifficulty;

window.addEventListener("resize", resize);
resize();
showOrbitTrainingScreen();
requestAnimationFrame(watchOrbitProgress);