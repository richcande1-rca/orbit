// Four-page, scrollable mission manual. The overlay is always optional and
// does not change Nova's movement, physics, rewards, or progression.
(() => {
  const pages = [
    {
      eyebrow: "01 / FLIGHT BASICS",
      title: "HOW TO PLAY",
      intro: "Nova is a small spacecraft orbiting the planet automatically. You choose WHEN to change rings.",
      sections: [
        {
          heading: "YOUR OBJECTIVE",
          rows: [
            ["Climb outward", "Move between orbital rings, then jump beyond the outermost ring to finish a run."],
            ["Survive", "Avoid pink debris, comets and special hazards. A collision can cost a life."],
            ["Progress", "Clear 12 runs to reach SPACE WARP, then start a tougher cycle without losing your score."],
            ["Optional challenges", "Special missions reward daring routes, but never prevent you from clearing a normal run."],
          ],
        },
        {
          heading: "DIFFICULTY",
          rows: [
            ["EASY", "Gentler obstacles and more forgiving power-ups."],
            ["NORMAL", "The balanced challenge."],
            ["HARD", "More dangerous traffic and harsher comet damage."],
          ],
        },
      ],
    },
    {
      eyebrow: "02 / PILOT INPUT",
      title: "CONTROLS",
      intro: "Nova flies around each orbit on her own. Every control moves her between rings; you do not have to steer around the planet.",
      sections: [
        {
          heading: "KEYBOARD",
          rows: [
            ["SPACE / →", "Move OUTWARD one ring. Enter also works during gameplay."],
            ["←", "Move INWARD one ring."],
            ["P / ESC", "Pause or resume the game."],
            ["TOP CONTROLS", "Use pause, restart, sound/music volume, leaderboard and ? for this guide."],
          ],
        },
        {
          heading: "MOBILE / TOUCH",
          rows: [
            ["OUT / IN", "Tap the large on-screen buttons to change rings."],
            ["PLANET TAP", "Tap the blue planet in the center to move outward."],
            ["ELSEWHERE", "Tap the game canvas outside the planet to move inward."],
          ],
        },
        {
          heading: "TIMING TIP",
          rows: [
            ["Watch the traffic", "The safest jump isn't always the earliest jump. Wait for a gap, then change rings."],
          ],
        },
      ],
    },
    {
      eyebrow: "03 / REWARDS & RISKS",
      title: "POWER-UPS & SCORING",
      intro: "Stars and close escapes are useful. Taking the riskier route can be worth it.",
      sections: [
        {
          heading: "STARS & LIVES",
          rows: [
            ["STARS", "Regular stars add 3 points each."],
            ["EXTRA LIVES", "Every 3 stars on Easy, 5 on Normal or 6 on Hard can earn a life. Normal has a 5-life cap; Hard has a 4-life cap."],
            ["NEAR MISSES", "Narrowly avoid debris for combo bonuses and OVERDRIVE charge."],
          ],
        },
        {
          heading: "COLLECTIBLE UPGRADES",
          rows: [
            ["SHIELD", "Blocks one collision."],
            ["SLOW FIELD", "Slows nearby orbital debris for 6 seconds."],
            ["REPAIR", "Restores one life, subject to the difficulty limit."],
            ["NOVA OVERDRIVE", "Charges from near misses, stars and run clears. Activates automatically for 5 seconds with a shockwave and doubled near-miss points. It does NOT accelerate Nova."],
          ],
        },
        {
          heading: "SPECIAL EVENTS",
          rows: [
            ["ORBITAL SURGE", "A separate, brief speed boost on Run 2. Unlike OVERDRIVE, this does make Nova fly faster."],
            ["PLANET HAZARDS", "Watch for warned storms, gravity pulses and other events as the runs get harder."],
          ],
        },
      ],
    },
    {
      eyebrow: "04 / OPTIONAL SIDE MISSIONS",
      title: "NOVA'S ADVENTURES",
      intro: "These four bonus objectives appear on their assigned runs and return in later cycles. All use the same IN / OUT controls.",
      sections: [
        {
          heading: "THE MISSIONS",
          rows: [
            ["RUN 4 · RESCUE", "Catch the damaged satellite, tow it safely and jump beyond the outer ring to deliver it. +40 points. A collision drops the satellite."],
            ["RUN 6 · WORMHOLE", "Enter the glowing cyan gate to emerge at a violet gate farther out. +8 points. The shortcut works once per run, and waits for a clear exit."],
            ["RUN 7 · THE HUNTER", "A hostile drone follows Nova between rings. Survive its pursuit for 10 seconds to earn +35 points. Contact invokes normal shield/damage rules."],
            ["RUN 9 · CONSTELLATION", "Collect four linked stars in order. +45 points on completion. Damage resets an unfinished sequence."],
          ],
        },
        {
          heading: "REMEMBER",
          rows: [
            ["YOUR CHOICE", "You can ignore any bonus mission and finish a run by crossing the outer ring as usual."],
          ],
        },
      ],
    },
  ];

  const overlay = document.createElement("section");
  overlay.id = "orbit-help-overlay";
  overlay.className = "orbit-help-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-labelledby", "orbit-help-title");
  overlay.setAttribute("aria-label", "ORBIT instructions");
  overlay.hidden = true;

  const panel = document.createElement("div");
  panel.className = "orbit-help-panel";

  const header = document.createElement("header");
  header.className = "orbit-help-header";
  const headingBox = document.createElement("div");
  const eyebrow = document.createElement("div");
  eyebrow.className = "orbit-help-eyebrow";
  const title = document.createElement("h2");
  title.id = "orbit-help-title";
  title.className = "orbit-help-title";
  headingBox.append(eyebrow, title);
  const closeButton = document.createElement("button");
  closeButton.className = "orbit-help-close";
  closeButton.type = "button";
  closeButton.textContent = "CLOSE ×";
  closeButton.setAttribute("aria-label", "Close How to Play");
  header.append(headingBox, closeButton);

  const scroller = document.createElement("div");
  scroller.className = "orbit-help-scroll";
  scroller.setAttribute("tabindex", "0");

  const footer = document.createElement("nav");
  footer.className = "orbit-help-nav";
  footer.setAttribute("aria-label", "Instruction pages");
  const backButton = document.createElement("button");
  backButton.type = "button";
  backButton.textContent = "← BACK";
  const pageNumber = document.createElement("span");
  pageNumber.className = "orbit-help-page-number";
  pageNumber.setAttribute("aria-live", "polite");
  const nextButton = document.createElement("button");
  nextButton.type = "button";
  nextButton.textContent = "NEXT →";
  footer.append(backButton, pageNumber, nextButton);

  panel.append(header, scroller, footer);
  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  const toolbarButton = document.getElementById("help");

  let open = false;
  let pageIndex = 0;
  let resumeWhenClosed = false;
  let previousFocus = null;

  function makeText(tag, className, text) {
    const element = document.createElement(tag);
    element.className = className;
    element.textContent = text;
    return element;
  }

  function renderPage() {
    const page = pages[pageIndex];
    eyebrow.textContent = page.eyebrow;
    title.textContent = page.title;
    scroller.replaceChildren();
    scroller.appendChild(makeText("p", "orbit-help-intro", page.intro));
    for (const section of page.sections) {
      const block = document.createElement("section");
      block.className = "orbit-help-section";
      block.appendChild(makeText("h3", "orbit-help-section-title", section.heading));
      const rows = document.createElement("div");
      rows.className = "orbit-help-rows";
      for (const [label, description] of section.rows) {
        const row = document.createElement("div");
        row.className = "orbit-help-row";
        row.append(
          makeText("strong", "orbit-help-term", label),
          makeText("span", "orbit-help-definition", description)
        );
        rows.appendChild(row);
      }
      block.appendChild(rows);
      scroller.appendChild(block);
    }
    backButton.disabled = pageIndex === 0;
    nextButton.disabled = pageIndex === pages.length - 1;
    pageNumber.textContent = "PAGE " + (pageIndex + 1) + " OF " + pages.length;
    scroller.scrollTop = 0;
  }

  function changePage(delta) {
    if (!open) return;
    const target = Math.max(0, Math.min(pages.length - 1, pageIndex + delta));
    if (target === pageIndex) return;
    pageIndex = target;
    renderPage();
  }

  function openHelp(event) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    if (open) return;
    previousFocus = document.activeElement;
    resumeWhenClosed = state === "running" &&
      !document.body.classList.contains("title-screen-active");
    if (resumeWhenClosed) togglePause();
    pageIndex = 0;
    open = true;
    overlay.hidden = false;
    renderPage();
    closeButton.focus();
  }

  function closeHelp(event) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    if (!open) return;
    open = false;
    overlay.hidden = true;
    if (resumeWhenClosed && state === "paused") togglePause();
    resumeWhenClosed = false;
    if (previousFocus?.isConnected && typeof previousFocus.focus === "function") {
      previousFocus.focus();
    }
    previousFocus = null;
  }

  window.orbitOpenHelp = openHelp;
  window.orbitHelpIsOpen = () => open;

  toolbarButton?.addEventListener("click", openHelp);
  closeButton.addEventListener("click", closeHelp);
  backButton.addEventListener("click", () => changePage(-1));
  nextButton.addEventListener("click", () => changePage(1));

  // The global game and title screens listen for keyboard movement.
  // Intercept only while this modal is open; keyboard activation of the
  // focused help controls still works and game movement stays suppressed.
  window.addEventListener("keydown", (event) => {
    if (!open) return;
    if (event.code === "Tab") return;
    if (event.code === "Escape") {
      event.preventDefault();
      event.stopImmediatePropagation();
      closeHelp();
      return;
    }
    if (event.code === "ArrowRight" || event.code === "ArrowLeft") {
      event.preventDefault();
      event.stopImmediatePropagation();
      changePage(event.code === "ArrowRight" ? 1 : -1);
      return;
    }
    if (event.code === "Space" || event.code === "Enter" || event.code === "KeyP") {
      event.preventDefault();
      event.stopImmediatePropagation();
      if ((event.code === "Space" || event.code === "Enter") &&
          event.target?.tagName === "BUTTON" &&
          overlay.contains(event.target)) {
        event.target.click();
      }
    }
  }, { capture: true });

  // Click outside the card to close; interacting with its content never
  // accidentally starts a game or activates a title screen.
  overlay.addEventListener("pointerdown", (event) => {
    if (event.target === overlay) closeHelp(event);
  });
})();
