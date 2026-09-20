(() => {
  const titleScreen = document.createElement("section");
  titleScreen.className = "title-screen";
  titleScreen.setAttribute("aria-label", "Opening title screen");

  const orbitBuildStamp = "Orbit build 2026.09.20.12";

  const skipButton = document.createElement("button");
  skipButton.className = "title-skip";
  skipButton.type = "button";
  skipButton.textContent = "SKIP";

  const card = document.createElement("div");
  card.className = "title-card";
  card.setAttribute("role", "button");
  card.setAttribute("tabindex", "0");

  const versionStamp = document.createElement("div");
  versionStamp.className = "title-version-stamp";
  versionStamp.textContent = orbitBuildStamp;
  Object.assign(versionStamp.style, {
    position: "absolute",
    left: "max(14px, env(safe-area-inset-left))",
    bottom: "max(12px, env(safe-area-inset-bottom))",
    zIndex: "2",
    color: "rgba(238, 247, 255, 0.42)",
    fontSize: "11px",
    fontWeight: "800",
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    pointerEvents: "none",
  });

  const hudHeader = document.querySelector(".hud-header");
  const moveControls = document.getElementById("mobileControls");

  function setGameChromeVisible(visible) {
    const value = visible ? "" : "hidden";
    if (hudHeader) hudHeader.style.visibility = value;
    if (moveControls) moveControls.style.visibility = value;
  }

  titleScreen.append(skipButton, card, versionStamp);
  document.body.appendChild(titleScreen);

  const titlePages = [
    {
      mode: "attract",
      kicker: "",
      title: "ORBIT",
      tagline: "Tap to continue",
      lines: [],
      button: "",
      hint: "",
    },
    {
      mode: "notes",
      kicker: "",
      title: "NOVA ONLINE",
      tagline: "You are the blue-white spark.",
      lines: [
        "Watch the pattern.",
        "Tap the blue center planet to move outward.",
        "Tap anywhere else to move inward.",
        "Avoid pink moons. Reach the outer orbit.",
        "Stars add points and lives. Comets hurt.",
      ],
      button: "ENTER ORBIT",
      hint: "",
    },
  ];

  const difficultyButtons = [];
  const difficultyChoices = [
    ["easy", "EASY"],
    ["normal", "NORMAL"],
    ["hard", "HARD"],
  ];

  let titlePageIndex = 0;
  let titleOpen = true;

  function updateDifficultyButtons() {
    const current = typeof window.orbitGetDifficulty === "function" ? window.orbitGetDifficulty() : "normal";

    for (const button of difficultyButtons) {
      const active = button.dataset.difficulty === current;
      button.disabled = false;
      button.setAttribute("aria-pressed", active ? "true" : "false");
      button.style.borderColor = active ? "rgba(151, 235, 255, 0.9)" : "rgba(151, 235, 255, 0.34)";
      button.style.background = active
        ? "linear-gradient(135deg, rgba(46, 126, 174, 0.9), rgba(78, 53, 154, 0.9))"
        : "rgba(2, 8, 22, 0.42)";
      button.style.color = active ? "#ffffff" : "#eef7ff";
      button.style.boxShadow = active
        ? "0 0 14px rgba(83, 213, 255, 0.34), 0 0 20px rgba(83, 213, 255, 0.18) inset"
        : "none";
      button.style.transform = active ? "translateY(-1px)" : "none";
    }
  }

  function addDifficultySelector() {
    if (typeof window.orbitSetDifficulty !== "function") return;

    const row = document.createElement("div");
    row.className = "title-difficulty-row";
    Object.assign(row.style, {
      display: "flex",
      flexWrap: "wrap",
      justifyContent: "center",
      gap: "8px",
      margin: "4px 0 0",
    });

    const label = document.createElement("div");
    label.textContent = "JUMP SPEED";
    Object.assign(label.style, {
      flexBasis: "100%",
      color: "rgba(238, 247, 255, 0.66)",
      fontSize: "0.72rem",
      fontWeight: "900",
      letterSpacing: "0.14em",
    });
    row.appendChild(label);

    difficultyButtons.length = 0;

    for (const [value, text] of difficultyChoices) {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.difficulty = value;
      button.textContent = text;
      Object.assign(button.style, {
        minWidth: "78px",
        minHeight: "34px",
        border: "1px solid rgba(151, 235, 255, 0.34)",
        borderRadius: "999px",
        background: "rgba(2, 8, 22, 0.42)",
        color: "#eef7ff",
        font: "inherit",
        fontSize: "0.72rem",
        fontWeight: "900",
        letterSpacing: "0.12em",
        cursor: "pointer",
      });

      const chooseDifficulty = (event) => {
        event.preventDefault();
        event.stopPropagation();
        window.orbitSetDifficulty(value);
        updateDifficultyButtons();
      };

      button.addEventListener("pointerdown", chooseDifficulty, { passive: false });
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
      });

      row.appendChild(button);
      difficultyButtons.push(button);
    }

    card.appendChild(row);
    updateDifficultyButtons();
  }

  function renderTitlePage() {
    const page = titlePages[titlePageIndex];
    const isAttract = page.mode === "attract";
    card.replaceChildren();

    titleScreen.classList.toggle("title-attract", isAttract);
    titleScreen.classList.toggle("title-notes", !isAttract);
    card.className = isAttract ? "title-card title-card-attract" : "title-card title-card-notes";

    const orbitDot = document.createElement("div");
    orbitDot.className = "title-orbit-dot";

    const title = document.createElement("h1");
    title.className = "title-logo";
    title.textContent = page.title;

    card.append(orbitDot, title);

    if (page.tagline) {
      const tagline = document.createElement("p");
      tagline.className = "title-tagline";
      tagline.textContent = page.tagline;
      card.appendChild(tagline);
    }

    if (page.kicker) {
      const kicker = document.createElement("div");
      kicker.className = "title-kicker";
      kicker.textContent = page.kicker;
      card.prepend(kicker);
    }

    if (page.lines.length) {
      const lines = document.createElement("div");
      lines.className = "title-lines";
      for (const line of page.lines) {
        const item = document.createElement("span");
        item.textContent = line;
        lines.appendChild(item);
      }
      card.appendChild(lines);
    }

    if (page.button) {
      const button = document.createElement("button");
      button.className = "title-primary";
      button.type = "button";
      button.textContent = page.button;
      card.appendChild(button);
    }

    if (!isAttract) {
      addDifficultySelector();
    }

    if (page.hint) {
      const hint = document.createElement("div");
      hint.className = "title-hint";
      hint.textContent = page.hint;
      card.appendChild(hint);
    }
  }

  function hideTitleScreen() {
    titleOpen = false;
    titleScreen.classList.add("hidden");
    document.body.classList.remove("title-screen-active");
    setGameChromeVisible(true);
  }

  function skipTitle(event) {
    event.preventDefault();
    event.stopPropagation();
    hideTitleScreen();
    updateControlButtons();
  }

  function playTitleSound() {
    if (!window.orbitAudio) return;

    if (typeof window.orbitAudio.unlockAudio === "function") {
      window.orbitAudio.unlockAudio().then(() => {
        if (typeof window.orbitAudio.titleAnthem === "function") {
          window.orbitAudio.titleAnthem();
        } else if (typeof window.orbitAudio.start === "function") {
          window.orbitAudio.start();
        }
      });
      return;
    }

    if (typeof window.orbitAudio.titleAnthem === "function") {
      window.orbitAudio.titleAnthem();
    }
  }

  function advanceTitle(event) {
    event.preventDefault();
    event.stopPropagation();

    if (!titleOpen) return;

    if (titlePageIndex === 0) {
      playTitleSound();
      titlePageIndex = 1;
      renderTitlePage();
      return;
    }

    hideTitleScreen();
    startGame();
  }

  function handleTitleKey(event) {
    if (!titleOpen) return;

    if (event.code === "Space" || event.code === "Enter") {
      advanceTitle(event);
    }

    if (event.code === "Escape") {
      skipTitle(event);
    }
  }

  card.addEventListener("pointerdown", advanceTitle, { passive: false });
  skipButton.addEventListener("pointerdown", skipTitle, { passive: false });
  card.addEventListener("keydown", handleTitleKey);
  window.addEventListener("keydown", handleTitleKey, { capture: true });
  window.addEventListener("orbitdifficultychange", updateDifficultyButtons);

  document.body.classList.add("title-screen-active");
  setGameChromeVisible(false);
  renderTitlePage();
  updateControlButtons();
})();