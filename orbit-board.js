(() => {
  const boardButton = document.getElementById("board");
  if (!boardButton) return;

  const storageKey = "orbit-the-board-v1";
  const lastNameKey = "orbit-the-board-last-name";
  const maxEntries = 20;

  let boardOpen = false;
  let pausedByBoard = false;

  const board = document.createElement("section");
  board.id = "orbitBoard";
  board.className = "orbit-board is-hidden";
  board.setAttribute("role", "dialog");
  board.setAttribute("aria-modal", "true");
  board.setAttribute("aria-label", "The Board");

  board.innerHTML = `
    <div class="orbit-board-card">
      <div class="orbit-board-top">
        <div>
          <h2 class="orbit-board-title">The Board</h2>
          <p class="orbit-board-note">Local scores on this browser</p>
        </div>
        <button id="orbitBoardClose" class="orbit-board-close" type="button" aria-label="Close The Board">×</button>
      </div>

      <div class="orbit-board-form">
        <input id="orbitBoardName" class="orbit-board-input" maxlength="18" autocomplete="nickname" placeholder="Your name" />
        <input id="orbitBoardMessage" class="orbit-board-input" maxlength="42" value="Kilroy was here." />
        <div class="orbit-board-actions">
          <button id="orbitBoardSign" class="orbit-board-action" type="button">Sign the Board</button>
          <button id="orbitBoardClear" class="orbit-board-action orbit-board-clear" type="button">Clear Local Board</button>
        </div>
      </div>

      <div id="orbitBoardList" class="orbit-board-list" aria-live="polite"></div>
    </div>
  `;

  document.body.appendChild(board);

  const closeButton = document.getElementById("orbitBoardClose");
  const nameInput = document.getElementById("orbitBoardName");
  const messageInput = document.getElementById("orbitBoardMessage");
  const signButton = document.getElementById("orbitBoardSign");
  const clearButton = document.getElementById("orbitBoardClear");
  const list = document.getElementById("orbitBoardList");

  try {
    nameInput.value = localStorage.getItem(lastNameKey) || "";
  } catch (error) {
    // Local storage can be blocked. The Board still works for the current page session.
  }

  function safeNumber(value) {
    return Number.isFinite(value) ? value : 0;
  }

  function loadEntries() {
    try {
      return JSON.parse(localStorage.getItem(storageKey) || "[]");
    } catch (error) {
      return [];
    }
  }

  function saveEntries(entries) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(entries));
    } catch (error) {
      updateHud("The Board could not save locally.");
    }
  }

  function currentBoardEntry() {
    const finalRun = typeof orbitFinalRun === "number" ? orbitFinalRun : 12;
    const currentLevel = safeNumber(level);
    const completed = state === "complete" || currentLevel > finalRun;
    const clearedRuns = completed ? finalRun : clamp(currentLevel - 1, 0, finalRun);
    const displayRun = completed ? finalRun : clamp(currentLevel, 1, finalRun);

    return {
      name: (nameInput.value || "Nova").trim().slice(0, 18) || "Nova",
      message: (messageInput.value || "Kilroy was here.").trim().slice(0, 42) || "Kilroy was here.",
      score: safeNumber(score),
      lives: safeNumber(lives),
      stars: safeNumber(starsCollected),
      run: displayRun,
      clearedRuns,
      result: completed ? "Escaped" : state === "gameover" ? "Lost" : "In orbit",
      when: new Date().toISOString(),
    };
  }

  function sortEntries(entries) {
    return entries.sort((a, b) =>
      b.score - a.score ||
      b.clearedRuns - a.clearedRuns ||
      b.stars - a.stars ||
      new Date(b.when).getTime() - new Date(a.when).getTime()
    );
  }

  function renderEntries() {
    const entries = sortEntries(loadEntries()).slice(0, maxEntries);
    list.replaceChildren();

    if (!entries.length) {
      const empty = document.createElement("div");
      empty.className = "orbit-board-empty";
      empty.textContent = "No names on the wall yet. Go break orbit.";
      list.appendChild(empty);
      return;
    }

    entries.forEach((entry, index) => {
      const item = document.createElement("div");
      item.className = "orbit-board-entry";

      const main = document.createElement("div");
      main.className = "orbit-board-entry-main";

      const name = document.createElement("span");
      name.textContent = `${index + 1}. ${entry.name}`;

      const scoreText = document.createElement("span");
      scoreText.className = "orbit-board-entry-score";
      scoreText.textContent = `${entry.score} pts`;

      const meta = document.createElement("div");
      meta.className = "orbit-board-entry-meta";
      meta.textContent = `${entry.result} • Run ${entry.run} • ${entry.stars} stars • ${entry.lives} lives`;

      const message = document.createElement("div");
      message.className = "orbit-board-entry-message";
      message.textContent = entry.message;

      main.append(name, scoreText);
      item.append(main, meta, message);
      list.appendChild(item);
    });
  }

  function signBoard() {
    const entry = currentBoardEntry();
    const entries = sortEntries([entry, ...loadEntries()]).slice(0, maxEntries);
    saveEntries(entries);

    try {
      localStorage.setItem(lastNameKey, entry.name);
    } catch (error) {
      // Ignore storage failures for remembered name.
    }

    renderEntries();
    updateHud("Signed The Board.");
  }

  function openBoard() {
    boardOpen = true;
    pausedByBoard = false;

    if (state === "running" && typeof togglePause === "function") {
      togglePause();
      pausedByBoard = true;
    }

    board.classList.remove("is-hidden");
    boardButton.setAttribute("aria-expanded", "true");
    renderEntries();
    nameInput.focus({ preventScroll: true });
  }

  function closeBoard() {
    boardOpen = false;
    board.classList.add("is-hidden");
    boardButton.setAttribute("aria-expanded", "false");

    if (pausedByBoard) {
      updateHud("Board closed. Tap pause to resume.");
    }
  }

  boardButton.addEventListener("click", openBoard);
  closeButton.addEventListener("click", closeBoard);
  signButton.addEventListener("click", signBoard);
  clearButton.addEventListener("click", () => {
    saveEntries([]);
    renderEntries();
    updateHud("Local Board cleared.");
  });

  board.addEventListener("pointerdown", (event) => {
    if (event.target === board) closeBoard();
  });

  window.addEventListener("keydown", (event) => {
    if (!boardOpen || event.code !== "Escape") return;
    event.preventDefault();
    closeBoard();
  });

  boardButton.setAttribute("aria-expanded", "false");
  renderEntries();
})();
