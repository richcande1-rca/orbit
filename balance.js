// Orbit gameplay balance tuning.
starLimitForLevel = function starLimitForLevelWithLateRunCaps() {
  if (level <= 2) return 4;
  if (level <= 8) return 2;
  return 1;
};

const baseMakeHazardsForBalance = makeHazards;
makeHazards = function makeHazardsWithEarlyRunMercy() {
  baseMakeHazardsForBalance();

  const earlyRunSpeedScale = level === 1 ? 0.82 : level === 2 ? 0.92 : 1;
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
