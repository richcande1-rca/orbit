// Adds the Orbit screen arc without changing the core renderer.
// Training -> Run 5 checkpoint -> Run 10 completion.
const orbitMilestoneRun = 5;
const orbitFinalRun = 10;
const orbitLevelHoldMs = 700;
const orbitSpecialHoldMs = 1350;

let orbitMilestoneShown = false;
let orbitCompleteShown = false;
let orbitLastSeenLevel = 1;
let orbitInputUnlockAt = 0;

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

makeHazards = function makeHazardsWithSafeInnerRing() {
  const speedScale = 1 + (level - 1) * 0.09;
  hazards = [];

  for (let lane = 1; lane < ringCount; lane++) {
    const count = 1 + (level > 4 && Math.random() < 0.42 ? 1 : 0);
    const laneRate = laneSpeedRates[lane] || 1;

    for (let i = 0; i < count; i++) {
      const direction = lane % 2 === 0 ? 1 : -1;
      hazards.push({
        lane,
        angle: rand(0, TAU),
        speed: direction * rand(0.5, 0.86) * laneRate * speedScale,
        size: rand(10, 15),
        wobble: rand(0, TAU),
      });
    }
  }
};

function setOrbitScreen(title, lines, tone = "normal") {
  instructionEl.replaceChildren();
  instructionEl.classList.remove("hidden", "screen-special", "screen-final");

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

function showOrbitTrainingScreen() {
  orbitMilestoneShown = false;
  orbitCompleteShown = false;
  orbitLastSeenLevel = 1;
  orbitInputUnlockAt = 0;
  setOrbitScreen("TRAINING ORBIT", [
    "Tap planet to move outward.",
    "Tap rings to move inward.",
    "Dodge pink debris.",
    "Reach the outer orbit.",
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
  holdOrbitInput(orbitSpecialHoldMs);

  setOrbitScreen("DEEP ORBIT", [
    "Good. Now it gets faster.",
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
  }

  if (state === "running" && level !== orbitLastSeenLevel) {
    if (level > orbitLastSeenLevel) holdOrbitInput(orbitLevelHoldMs);
    orbitLastSeenLevel = level;
  }

  if (state === "running" && !orbitMilestoneShown && level > orbitMilestoneRun) {
    showOrbitMilestoneScreen();
  }

  if (state === "running" && !orbitCompleteShown && level > orbitFinalRun) {
    showOrbitCompleteScreen();
  }

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

showOrbitTrainingScreen();
requestAnimationFrame(watchOrbitProgress);
