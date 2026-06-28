(() => {
  const mobileControls = document.getElementById("mobileControls");
  const mobileInButton = document.getElementById("mobile-in");
  const mobileOutButton = document.getElementById("mobile-out");

  if (!mobileControls || !mobileInButton || !mobileOutButton) return;

  const compactControlsQuery = window.matchMedia("(pointer: coarse), (max-width: 720px)");

  function moveControlsEnabled() {
    return state === "waiting" || state === "running" || state === "paused";
  }

  function updateMobileControls() {
    const controlsVisible = moveControlsEnabled();
    document.body.classList.toggle("mobile-controls-active", controlsVisible);
    mobileControls.setAttribute("aria-hidden", controlsVisible ? "false" : "true");

    mobileInButton.disabled = !(state === "running" || state === "paused");
    mobileOutButton.disabled = !(state === "waiting" || state === "running" || state === "paused");
  }

  function setMobileTrainingText() {
    if (!compactControlsQuery.matches || state !== "waiting") return;
    if (!instructionEl || instructionEl.classList.contains("hidden")) return;

    setOrbitScreen("TRAINING ORBIT", [
      "Use OUT to move outward.",
      "Use IN to move inward.",
      "Dodge pink debris and collect stars.",
      "Collect 4 stars to add a life!",
      "Jump outward past the outer ring to clear a run.",
      "CAREFUL! Comet strikes remove 3 lives!",
    ]);
  }

  function handleMoveControl(event, direction) {
    event.preventDefault();
    event.stopPropagation();

    if (state === "paused") {
      togglePause();
      updateMobileControls();
      return;
    }

    if (state === "waiting") {
      if (direction > 0) {
        startGame();
      } else {
        updateHud("Use OUT to begin.");
      }
      updateMobileControls();
      return;
    }

    if (state !== "running") {
      updateMobileControls();
      return;
    }

    movePlayer(direction);
    updateMobileControls();
  }

  const originalUpdateControlButtons = updateControlButtons;
  updateControlButtons = function updateControlButtonsWithMoveButtons() {
    originalUpdateControlButtons();
    updateMobileControls();
  };

  mobileInButton.addEventListener("pointerdown", (event) => handleMoveControl(event, -1), { passive: false });
  mobileOutButton.addEventListener("pointerdown", (event) => handleMoveControl(event, 1), { passive: false });

  if (typeof compactControlsQuery.addEventListener === "function") {
    compactControlsQuery.addEventListener("change", () => {
      setMobileTrainingText();
      updateMobileControls();
    });
  }

  window.addEventListener("resize", updateMobileControls);

  setMobileTrainingText();
  updateMobileControls();
})();