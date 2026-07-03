(() => {
  const alertMessage = "COMET DETECTED INBOUND!";
  let card;
  let timer = 0;

  function showAlertCard() {
    if (!card) {
      card = document.createElement("div");
      card.textContent = "COMET WARNING";
      card.setAttribute("aria-hidden", "true");
      Object.assign(card.style, {
        position: "fixed",
        inset: "0",
        zIndex: "18",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        background: "radial-gradient(circle at 50% 48%, rgba(255, 105, 42, 0.32), transparent 34%), rgba(8, 2, 10, 0.55)",
        color: "#fff8e8",
        fontSize: "clamp(3rem, 14vw, 9rem)",
        fontWeight: "950",
        letterSpacing: "0.12em",
        lineHeight: "0.9",
        textAlign: "center",
        textTransform: "uppercase",
        textShadow: "0 0 12px rgba(255,255,255,.9), 0 0 36px rgba(255,135,42,.95), 0 0 90px rgba(255,60,24,.5)",
        pointerEvents: "none",
        opacity: "0",
        transition: "opacity 120ms ease-out",
      });
      document.body.appendChild(card);
    }

    clearTimeout(timer);
    card.style.opacity = "1";
    timer = setTimeout(() => {
      card.style.opacity = "0";
    }, 1180);
  }

  const originalUpdateHud = updateHud;
  updateHud = function updateHudWithOrbitAlert(text) {
    originalUpdateHud(text);
    if (text === alertMessage) showAlertCard();
  };
})();
