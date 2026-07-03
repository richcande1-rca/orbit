(() => {
  const alertMessage = "COMET DETECTED INBOUND!";
  const warningDurationMs = 1550;
  let timer = 0;

  function showBottomAlert() {
    if (!messageEl) return;

    clearTimeout(timer);
    messageEl.textContent = "⚠ COMET WARNING ⚠";
    Object.assign(messageEl.style, {
      position: "fixed",
      left: "50%",
      bottom: "max(22px, env(safe-area-inset-bottom))",
      transform: "translateX(-50%)",
      zIndex: "16",
      width: "max-content",
      maxWidth: "calc(100vw - 28px)",
      padding: "8px 14px",
      border: "1px solid rgba(255, 47, 47, 0.74)",
      borderRadius: "999px",
      background: "rgba(18, 0, 0, 0.72)",
      color: "#ff2f2f",
      fontSize: "clamp(0.95rem, 4vw, 1.32rem)",
      fontWeight: "950",
      letterSpacing: "0.12em",
      lineHeight: "1.1",
      textAlign: "center",
      textTransform: "uppercase",
      textShadow: "0 0 10px rgba(255, 47, 47, 1), 0 0 22px rgba(255, 0, 0, 0.75)",
      boxShadow: "0 0 18px rgba(255, 0, 0, 0.34), 0 0 26px rgba(255, 47, 47, 0.18) inset",
      pointerEvents: "none",
      animation: "orbitBottomWarningFlash 0.22s steps(2, end) infinite",
    });

    timer = setTimeout(() => {
      messageEl.style.position = "";
      messageEl.style.left = "";
      messageEl.style.bottom = "";
      messageEl.style.transform = "";
      messageEl.style.zIndex = "";
      messageEl.style.width = "";
      messageEl.style.maxWidth = "";
      messageEl.style.padding = "";
      messageEl.style.border = "";
      messageEl.style.borderRadius = "";
      messageEl.style.background = "";
      messageEl.style.color = "";
      messageEl.style.fontSize = "";
      messageEl.style.fontWeight = "";
      messageEl.style.letterSpacing = "";
      messageEl.style.lineHeight = "";
      messageEl.style.textAlign = "";
      messageEl.style.textTransform = "";
      messageEl.style.textShadow = "";
      messageEl.style.boxShadow = "";
      messageEl.style.pointerEvents = "";
      messageEl.style.animation = "";
    }, warningDurationMs);
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
