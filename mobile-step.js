// Keeps phone movement from slowing down when the frame rate drops.
// The main loop caps dt at 33ms; this restores real elapsed time on mobile,
// capped safely so a stalled tab cannot jump too far ahead.
const orbitMobileStepMode = window.matchMedia("(pointer: coarse), (max-width: 720px)").matches;
const orbitMobileStepMax = 0.06;
const orbitOriginalUpdateStep = update;
let orbitLastMobileStepAt = performance.now();

update = function updateWithMobileFrameStep(cappedDt) {
  if (!orbitMobileStepMode) {
    orbitOriginalUpdateStep(cappedDt);
    return;
  }

  const now = performance.now();
  const realDt = Math.min(orbitMobileStepMax, (now - orbitLastMobileStepAt) / 1000 || cappedDt);
  orbitLastMobileStepAt = now;
  orbitOriginalUpdateStep(realDt);
};
