(() => {
  const alertMessage = "COMET DETECTED INBOUND!";
  let timer = 0;

  function showBottomAlert() {
    if (!messageEl) return;

    clearTimeout(timer);
    messageEl.textContent = "⚠ COMET WARNING ⚠";
    Object.assign(messageEl.style, {
      color: "#ff2f2f",
      fontWeight: "950",
      letterSpacing: "0.12em",
      textTransform: "uppercase",
      textShadow: "0 0 10px rgba(255, 47, 47, 1), 0 0 22px rgba(255, 0, 0, 0.75)",
      animation: "orbitBottomWarningFlash 0.22s steps(2, end) infinite",
    });

    timer = setTimeout(() => {
      messageEl.style.color = "";
      messageEl.style.fontWeight = "";
      messageEl.style.letterSpacing = "";
      messageEl.style.textTransform = "";
      messageEl.style.textShadow = "";
      messageEl.style.animation = "";
    }, 1180);
  }

  function ensureBottomAlertStyle() {
    if (document.getElementById("orbit-bottom-warning-style")) return;

    const style = document.createElement("style");
    style.id = "orbit-bottom-warning-style";
    style.textContent = `
      @keyframes orbitBottomWarningFlash {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.34; }
      }
    `;
    document.head.appendChild(style);
  }

  ensureBottomAlertStyle();

  const originalUpdateHud = updateHud;
  updateHud = function updateHudWithOrbitAlert(text) {
    originalUpdateHud(text);
    if (text === alertMessage) showBottomAlert();
  };
})();
