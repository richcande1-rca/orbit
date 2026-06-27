(() => {
  const titleScreen = document.createElement("section");
  titleScreen.className = "title-screen";
  titleScreen.setAttribute("aria-label", "Opening title screen");

  const skipButton = document.createElement("button");
  skipButton.className = "title-skip";
  skipButton.type = "button";
  skipButton.textContent = "SKIP";

  const card = document.createElement("div");
  card.className = "title-card";
  card.setAttribute("role", "button");
  card.setAttribute("tabindex", "0");

  titleScreen.append(skipButton, card);
  document.body.appendChild(titleScreen);

  const titlePages = [
    {
      kicker: "orbital mechanics",
      title: "ORBIT",
      tagline: "Find the window. Ride the gravity. Break orbit.",
      lines: ["A quiet little arcade problem for nervous thumbs."],
      button: "CONTINUE",
      hint: "tap to open flight notes",
    },
    {
      kicker: "flight notes",
      title: "RUN THE LANES",
      tagline: "Move with the field, not against it.",
      lines: [
        "OUT climbs one orbit. IN falls back toward safety.",
        "Collect stars for points. Every fourth star adds a life.",
        "Pink debris costs a life. Comets remove three.",
        "Clear twelve runs and punch through the final warp.",
      ],
      button: "ENTER ORBIT",
      hint: "tap to begin the run",
    },
  ];

  let titlePageIndex = 0;
  let titleOpen = true;

  function renderTitlePage() {
    const page = titlePages[titlePageIndex];
    card.replaceChildren();

    const orbitDot = document.createElement("div");
    orbitDot.className = "title-orbit-dot";

    const kicker = document.createElement("div");
    kicker.className = "title-kicker";
    kicker.textContent = page.kicker;

    const title = document.createElement("h1");
    title.className = "title-logo";
    title.textContent = page.title;

    const tagline = document.createElement("p");
    tagline.className = "title-tagline";
    tagline.textContent = page.tagline;

    const lines = document.createElement("div");
    lines.className = "title-lines";
    for (const line of page.lines) {
      const item = document.createElement("span");
      item.textContent = line;
      lines.appendChild(item);
    }

    const button = document.createElement("button");
    button.className = "title-primary";
    button.type = "button";
    button.textContent = page.button;

    const hint = document.createElement("div");
    hint.className = "title-hint";
    hint.textContent = page.hint;

    card.append(orbitDot, kicker, title, tagline, lines, button, hint);
  }

  function hideTitleScreen() {
    titleOpen = false;
    titleScreen.classList.add("hidden");
    document.body.classList.remove("title-screen-active");
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

  document.body.classList.add("title-screen-active");
  renderTitlePage();
  updateControlButtons();
})();
