(() => {
  const boardButton = document.getElementById("board");
  if (!boardButton) return;

  const apiUrl = "https://orbit-board-api.rich-gothic.workers.dev/api/board";
  const localKey = "orbit-the-board-v1";
  const nameKey = "orbit-the-board-last-name";
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
          <p id="orbitBoardNote" class="orbit-board-note">Shared Orbit board</p>
        </div>
        <button id="orbitBoardClose" class="orbit-board-close" type="button" aria-label="Close The Board">×</button>
      </div>

      <div class="orbit-board-form">
        <input id="orbitBoardName" class="orbit-board-input" maxlength="18" autocomplete="nickname" placeholder="Your name" />
        <input id="orbitBoardMessage" class="orbit-board-input" maxlength="42" value="Kilroy was here." />
        <div class="orbit-board-actions">
          <button id="orbitBoardSign" class="orbit-board-action" type="button">Sign the Board</button>
          <button id="orbitBoardRefresh" class="orbit-board-action orbit-board-clear" type="button">Refresh Board</button>
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
  const refreshButton = document.getElementById("orbitBoardRefresh");
  const list = document.getElementById("orbitBoardList");
  const note = document.getElementById("orbitBoardNote");

  try {
    nameInput.value = localStorage.getItem(nameKey) || "";
  } catch (error) {
    // Storage may be blocked. Cloud board still works when reachable.
  }

  function numberOrZero(value) {
    return Number.isFinite(value) ? value : Number(value) || 0;
  }

  function loadLocal() {
    try {
      return JSON.parse(localStorage.getItem(localKey) || "[]");
    } catch (error) {
      return [];
    }
  }

  function saveLocal(entries) {
    try {
      localStorage.setItem(localKey, JSON.stringify(entries));
    } catch (error) {
      updateHud("The Board could not save locally.");
    }
  }

  function rememberName(name) {
    try {
      localStorage.setItem(nameKey, name);
    } catch (error) {
      // Fine without remembered name.
    }
  }

  function entryTime(entry) {
    const stamp = entry.createdAt || entry.when || "";
    const time = new Date(stamp).getTime();
    return Number.isFinite(time) ? time : 0;
  }

  function sortEntries(entries) {
    return entries.sort((a, b) =>
      numberOrZero(b.score) - numberOrZero(a.score) ||
      numberOrZero(b.clearedRuns) - numberOrZero(a.clearedRuns) ||
      numberOrZero(b.stars) - numberOrZero(a.stars) ||
      entryTime(b) - entryTime(a)
    );
  }

  function currentEntry() {
    const finalRun = typeof orbitFinalRun === "number" ? orbitFinalRun : 12;
    const currentRun = numberOrZero(level);
    const escaped = state === "complete" || currentRun > finalRun;
    const run = escaped ? finalRun : clamp(currentRun, 1, finalRun);
    const clearedRuns = escaped ? finalRun : clamp(currentRun - 1, 0, finalRun);

    return {
      name: (nameInput.value || "Nova").trim().slice(0, 18) || "Nova",
      message: (messageInput.value || "Kilroy was here.").trim().slice(0, 42) || "Kilroy was here.",
      score: numberOrZero(score),
      run,
      clearedRuns,
      stars: numberOrZero(starsCollected),
      lives: numberOrZero(lives),
      result: escaped ? "Escaped" : state === "gameover" ? "Lost" : "In orbit",
      createdAt: new Date().toISOString(),
    };
  }

  function renderLoading(text = "Contacting mission control...") {
    note.textContent = "Shared Orbit board";
    list.replaceChildren();
    const row = document.createElement("div");
    row.className = "orbit-board-empty";
    row.textContent = text;
    list.appendChild(row);
  }

  function render(entries, mode) {
    const ranked = sortEntries([...entries]).slice(0, maxEntries);
    note.textContent = mode === "cloud" ? "Shared Orbit board" : "Local fallback board";
    list.replaceChildren();

    if (!ranked.length) {
      const row = document.createElement("div");
      row.className = "orbit-board-empty";
      row.textContent = mode === "cloud" ? "No names on the cloud wall yet. Go break orbit." : "Cloud offline. No local scores saved yet.";
      list.appendChild(row);
      return;
    }

    ranked.forEach((entry, index) => {
      const item = document.createElement("div");
      item.className = "orbit-board-entry";

      const main = document.createElement("div");
      main.className = "orbit-board-entry-main";

      const name = document.createElement("span");
      name.textContent = `${index + 1}. ${entry.name}`;

      const points = document.createElement("span");
      points.className = "orbit-board-entry-score";
      points.textContent = `${numberOrZero(entry.score)} pts`;

      const meta = document.createElement("div");
      meta.className = "orbit-board-entry-meta";
      meta.textContent = `${entry.result || "In orbit"} • Run ${numberOrZero(entry.run)} • ${numberOrZero(entry.stars)} stars • ${numberOrZero(entry.lives)} lives`;

      const message = document.createElement("div");
      message.className = "orbit-board-entry-message";
      message.textContent = entry.message || "Kilroy was here.";

      main.append(name, points);
      item.append(main, meta, message);
      list.appendChild(item);
    });
  }

  async function fetchCloudBoard() {
    const response = await fetch(apiUrl, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`Board API returned ${response.status}.`);
    const body = await response.json();
    if (!body.ok || !Array.isArray(body.entries)) throw new Error("Bad board response.");
    saveLocal(body.entries);
    return body.entries;
  }

  async function postCloudEntry(entry) {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(entry),
    });
    if (!response.ok) throw new Error(`Board API returned ${response.status}.`);
    const body = await response.json();
    if (!body.ok || !Array.isArray(body.entries)) throw new Error("Bad board response.");
    saveLocal(body.entries);
    return body.entries;
  }

  async function refreshBoard() {
    renderLoading();
    try {
      render(await fetchCloudBoard(), "cloud");
    } catch (error) {
      render(loadLocal(), "local");
      updateHud("Cloud Board unavailable. Showing local fallback.");
    }
  }

  async function signBoard() {
    const entry = currentEntry();
    rememberName(entry.name);
    signButton.disabled = true;
    signButton.textContent = "Signing...";

    try {
      render(await postCloudEntry(entry), "cloud");
      updateHud("Signed the Cloud Board.");
    } catch (error) {
      const entries = sortEntries([entry, ...loadLocal()]).slice(0, maxEntries);
      saveLocal(entries);
      render(entries, "local");
      updateHud("Cloud Board unavailable. Signed local fallback.");
    } finally {
      signButton.disabled = false;
      signButton.textContent = "Sign the Board";
    }
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
    refreshBoard();
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
  refreshButton.addEventListener("click", refreshBoard);

  board.addEventListener("pointerdown", (event) => {
    if (event.target === board) closeBoard();
  });

  window.addEventListener("keydown", (event) => {
    if (!boardOpen || event.code !== "Escape") return;
    event.preventDefault();
    closeBoard();
  });

  boardButton.setAttribute("aria-expanded", "false");
  render(loadLocal(), "local");
})();
