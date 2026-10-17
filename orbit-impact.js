// A brief full-viewport impact cue. No physics or collision changes.
// Loaded after the existing game layers so shield saves and test-mode
// contacts are distinguished from real damage.
(() => {
  const impact = document.createElement("div");
  impact.className = "orbit-impact-screen";
  impact.setAttribute("aria-hidden", "true");
  impact.innerHTML =
    '<span class="orbit-impact-core"></span>' +
    '<span class="orbit-impact-after"></span>';
  document.body.appendChild(impact);

  let lastImpactAt = -Infinity;

  function playImpact(kind) {
    // Damage is normally invulnerability-limited; this also prevents
    // stacked impacts in one update step from creating a rapid strobe.
    const now = performance.now();
    if (now - lastImpactAt < 250) return;
    lastImpactAt = now;

    impact.classList.remove("impact-active");
    impact.classList.toggle("impact-comet", kind === "comet");
    // Restart the two short CSS animations on each *real* hit.
    // No timers, redraw loops, or blocking input overlays.
    void impact.offsetWidth;
    impact.classList.add("impact-active");
  }

  const originalCrash = crash;
  crash = function crashWithFullScreenImpact(...args) {
    const livesBefore = lives;
    const result = originalCrash(...args);
    // An absorbed shield hit or invincible test contact costs no life.
    if (lives < livesBefore) playImpact("debris");
    return result;
  };

  // Comets use their own damage path instead of crash(). Its callback
  // fires only after a genuine unshielded comet impact.
  const originalRecordCometHit = window.orbitPowerupRecordCometHit;
  if (typeof originalRecordCometHit === "function") {
    window.orbitPowerupRecordCometHit = (...args) => {
      const result = originalRecordCometHit(...args);
      playImpact("comet");
      return result;
    };
  }
})();
