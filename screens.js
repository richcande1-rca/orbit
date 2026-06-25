// Adds the Orbit screen arc without changing the core renderer.
// Training -> Run 5 checkpoint -> Run 10 completion.
const orbitMilestoneRun = 5;
const orbitFinalRun = 10;

let orbitMilestoneShown = false;
let orbitCompleteShown = false;

function setOrbitScreen(title, lines) {
  instructionEl.replaceChildren();

  const heading = document.createElement("strong");
  heading.textContent = title;
  instructionEl.appendChild(heading);

  for (const line of lines) {
    const item = document.createElement("span");
    item.textContent = line;
    instructionEl.appendChild(item);
  }

  instructionEl.classList.remove("hidden");
  messageEl.textContent = "";
}

function showOrbitTrainingScreen() {
  orbitMilestoneShown = false;
  orbitCompleteShown = false;
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

  setOrbitScreen("DEEP ORBIT", [
    "Good. Now it gets faster.",
    "Tap planet to continue.",
  ]);
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

  setOrbitScreen("APOGEE REACHED", [
    "You escaped the orbit.",
    `Final score: ${score}`,
    "Tap planet to restart.",
  ]);
  updateHud("");
  updateControlButtons();
}

function watchOrbitProgress() {
  if (state === "running" && level === 1 && score === 0) {
    orbitMilestoneShown = false;
    orbitCompleteShown = false;
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
    if (state !== "milestone" && state !== "complete") return;

    event.preventDefault();
    event.stopImmediatePropagation();

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

showOrbitTrainingScreen();
requestAnimationFrame(watchOrbitProgress);
