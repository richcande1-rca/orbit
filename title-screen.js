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
      title: "INSTRUCTIONS",
      tagline: "",
      lines: [
        "OUT: move outward",
        "IN: move inward",
        "Stars: +3 points",
        "Every 4 stars: +1 life",
        "Debris: -1 life",
        "Comets: -3 lives",
        "Clear 12 runs.",
      ],
      button: "ENTER ORBIT",
      hint: "",
    },
  ];

  let titlePageIndex = 0;
  let titleOpen = true;

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
