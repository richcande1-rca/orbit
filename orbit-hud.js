// ORBIT cockpit HUD: presentation only. No player, hazard or scoring writes.
(() => {
  const hudRight = document.querySelector(".hud-right");
  if (!hudRight) return;

  const panel = document.createElement("div");
  panel.id = "orbit-pilot-readouts";
  panel.className = "orbit-pilot-readouts";
  panel.setAttribute("aria-label", "Pilot status");

  const starChip = document.createElement("div");
  starChip.className = "orbit-pilot-chip orbit-pilot-stars";
  starChip.innerHTML =
    '<span class="orbit-pilot-star-icon" aria-hidden="true">★</span>' +
    '<span class="orbit-pilot-star-count">0 / 5</span>' +
    '<span class="orbit-pilot-star-track" aria-hidden="true"><span class="orbit-pilot-star-fill"></span></span>';
  const starText = starChip.querySelector(".orbit-pilot-star-count");
  const starFill = starChip.querySelector(".orbit-pilot-star-fill");

  function makeChip(className, label) {
    const chip = document.createElement("div");
    chip.className = "orbit-pilot-chip " + className;
    chip.textContent = label;
    return chip;
  }

  const difficultyChip = makeChip("orbit-pilot-difficulty", "NORMAL");
  const shieldChip = makeChip("orbit-pilot-shield", "◇ SHIELD");
  const slowChip = makeChip("orbit-pilot-slow", "◷ SLOW 6s");
  shieldChip.hidden = true;
  slowChip.hidden = true;
  panel.append(starChip, difficultyChip, shieldChip, slowChip);
  hudRight.appendChild(panel);

  const toast = document.createElement("div");
  toast.id = "orbit-pilot-toast";
  toast.className = "orbit-pilot-toast";
  toast.setAttribute("role", "status");
  toast.setAttribute("aria-live", "polite");
  document.body.appendChild(toast);
  document.body.classList.add("orbit-pilot-hud-enabled");

  let lastStatus = "";
  let toastTime = 0;
  let lastToastText = "";

  function refresh() {
    const difficulty = window.orbitGetDifficulty?.() || "normal";
    const threshold = difficulty === "easy" ? 3 :
      difficulty === "hard" ? 6 : 5;
    const cap = difficulty === "easy" ? Infinity :
      difficulty === "hard" ? 4 : 5;
    const stars = Math.min(threshold, Math.max(0, starsTowardLife));
    const status = window.orbitUpgradeStatus?.() || {};
    const slowSeconds = Math.max(0, Math.ceil(status.stasisSeconds || 0));
    const shield = !!status.shield;
    const maxed = lives >= cap;
    const key = [difficulty, threshold, stars, shield, slowSeconds, maxed].join("|");
    if (key !== lastStatus) {
      lastStatus = key;
      difficultyChip.textContent = difficulty.toUpperCase();
      starText.textContent = stars + " / " + threshold;
      starChip.setAttribute("aria-label", maxed
        ? "Stars " + stars + " of " + threshold + ". Life limit reached."
        : "Stars toward next life: " + stars + " of " + threshold);
      starFill.style.width = (100 * stars / threshold) + "%";
      shieldChip.hidden = !shield;
      slowChip.hidden = !slowSeconds;
      if (slowSeconds) slowChip.textContent = "◷ SLOW " + slowSeconds + "s";
      panel.classList.toggle("orbit-pilot-life-cap", maxed);
    }
  }

  function toastFor(message) {
    if (!message || typeof message !== "string") return null;
    const text = message.toUpperCase();

    // Existing bright-red comet warning is handled by orbit-alert-card.js.
    // Don't duplicate it, especially near the mobile IN/OUT buttons.
    if (/COMET DETECTED|TWIN COMETS|SECOND COMET/.test(text)) return null;

    if (/ION STORM FORMING/.test(text)) return ["warning", "⚠ ION STORM FORMING"];
    if (/ION STORM ACTIVE/.test(text)) return ["warning", "⚠ ION STORM ACTIVE"];
    if (/GRAVITY PULSE INBOUND/.test(text)) return ["warning", "⚠ GRAVITY PULSE INBOUND"];
    if (/GRAVITY PULSE —/.test(text)) return ["warning", "⚠ ORBITAL TRAFFIC ACCELERATING"];
    if (/HUNTER DRONE!/.test(text)) return ["warning", "⚠ HUNTER INCOMING"];
    if (/SATELLITE RESCUED/.test(text)) return ["reward", "SATELLITE DELIVERED +40"];
    if (/WORMHOLE TRAVERSED/.test(text)) return ["reward", "WORMHOLE +8"];
    if (/HUNTER EVADED/.test(text)) return ["reward", "HUNTER EVADED +35"];
    if (/CONSTELLATION COMPLETE/.test(text)) return ["reward", "CONSTELLATION COMPLETE +45"];
    if (/NOVA OVERDRIVE!/.test(text)) return ["reward", "NOVA OVERDRIVE ENGAGED"];
    if (/EXTRA LIFE!|REPAIR \+1 LIFE/.test(text)) return ["reward", "EXTRA LIFE"];
    if (/SHIELD ACQUIRED/.test(text)) return ["reward", "SHIELD READY"];
    if (/SLOW FIELD —/.test(text)) return ["reward", "SLOW FIELD ACTIVE"];
    if (/STAR CHASE CLEARED/.test(text)) return ["reward", "STAR CHASE COMPLETE"];
    return null;
  }

  const originalUpdateHud = updateHud;
  updateHud = function updateHudWithCockpit(message) {
    originalUpdateHud(message);
    refresh();
    const event = toastFor(message);
    if (!event || state !== "running" ||
        document.body.classList.contains("title-screen-active")) return;
    const [type, label] = event;
    // Keep one prominent, short-lived event at a time. Repeated
    // identical updates don't endlessly retrigger the same banner.
    if (lastToastText === type + "|" + label && toastTime > 0) return;
    lastToastText = type + "|" + label;
    toast.className = "orbit-pilot-toast orbit-pilot-toast-visible orbit-pilot-toast-" + type;
    toast.textContent = label;
    toastTime = type === "warning" ? 1.9 : 1.5;
  };

  const originalUpdate = update;
  update = function updateWithCockpit(dt) {
    originalUpdate(dt);
    refresh();
    if (state === "running" &&
        !document.body.classList.contains("title-screen-active")) {
      if (toastTime > 0) {
        toastTime = Math.max(0, toastTime - dt);
        if (toastTime === 0) toast.className = "orbit-pilot-toast";
      }
    } else if (toastTime > 0) {
      toastTime = 0;
      toast.className = "orbit-pilot-toast";
    }
  };

  window.orbitPilotHudStatus = () => ({
    difficulty: window.orbitGetDifficulty?.() || "normal",
    stars: starsTowardLife,
    shield: !!window.orbitUpgradeStatus?.()?.shield,
    slowSeconds: window.orbitUpgradeStatus?.()?.stasisSeconds || 0,
    toast: toastTime > 0 ? toast.textContent : "",
  });

  window.addEventListener("orbitdifficultychange", refresh);
  refresh();
})();
