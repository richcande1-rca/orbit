// Orbit gameplay balance tuning.
starLimitForLevel = function starLimitForLevelWithRecoveryCaps() {
  // Keep a single readable star on the field, but allow more randomly placed
  // opportunities per run as the difficulty climbs.
  if (level <= 2) return 5;
  if (level <= 8) return 3;
  return 2;
};

const baseMakeHazardsForBalance = makeHazards;
makeHazards = function makeHazardsWithEarlyRunMercy() {
  baseMakeHazardsForBalance();

  // Easy remains a genuine training mode; Normal/Hard must earn a clean climb.
  const easy = window.orbitGetDifficulty?.() === "easy";
  const earlyRunSpeedScale = level === 1 ? (easy ? 0.82 : 0.94)
    : level === 2 ? (easy ? 0.92 : 1) : 1;
  if (earlyRunSpeedScale === 1) return;

  for (const hazard of hazards) {
    hazard.speed *= earlyRunSpeedScale;
  }
};

const fasterRingMoveCooldownSeconds = 0.4;
const baseMovePlayerForBalance = movePlayer;
movePlayer = function movePlayerWithFasterRingHops(direction) {
  const previousLane = player.lane;
  const previousLevel = level;

  baseMovePlayerForBalance(direction);

  if (player.lane !== previousLane || level !== previousLevel) {
    moveCooldown = Math.min(moveCooldown, fasterRingMoveCooldownSeconds);
  }
};
