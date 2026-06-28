// Orbit gameplay balance tuning.
starLimitForLevel = function starLimitForLevelWithLateRunCaps() {
  if (level <= 2) return 4;
  if (level <= 8) return 2;
  return 1;
};
