// Shared STARBOARD: read-only while playing, automatic Top 10 after the final life.
(() => {
  const boardButton = document.getElementById("board");
  if (!boardButton) return;

  const apiUrl = "https://orbit-board-api.rich-gothic.workers.dev/api/board";
  const localKey = "orbit-the-board-v1";
  const nameKey = "orbit-the-board-last-name";
  const topSize = 10;
  let boardOpen = false;
  let pausedByBoard = false;
  let finalSnapshot = null;
  let submitted = false;
  let qualifies = false;
  let displayedEntries = [];
  let requestSerial = 0;
  let submissionBusy = false;
  let submissionStatus = "";

  const board = document.createElement("section");
  board.id = "orbitBoard";
  board.className = "orbit-board is-hidden";
  board.setAttribute("role", "dialog");
  board.setAttribute("aria-modal", "true");
  board.setAttribute("aria-label", "Starboard Top 10");

  board.innerHTML = [
    '<div class="orbit-board-card">',
      '<div class="orbit-board-top">',
        '<div><h2 class="orbit-board-title">STARBOARD</h2>',
        '<p id="orbitBoardNote" class="orbit-board-note">Shared Top 10</p></div>',
        '<button id="orbitBoardClose" class="orbit-board-close" type="button" aria-label="Close Starboard">×</button>',
      '</div>',
      '<div id="orbitBoardFinal" class="orbit-board-final is-hidden">',
        '<p class="orbit-board-final-title">GAME OVER · FINAL SCORE</p>',
        '<strong id="orbitBoardFinalScore" class="orbit-board-final-score">0</strong>',
        '<p id="orbitBoardFinalProgress" class="orbit-board-final-progress"></p>',
        '<p id="orbitBoardVerdict" class="orbit-board-final-verdict"></p>',
      '</div>',
      '<div id="orbitBoardForm" class="orbit-board-form is-hidden">',
        '<input id="orbitBoardName" class="orbit-board-input" maxlength="3" autocomplete="nickname" placeholder="AAA (initials)" aria-label="Your three initials" />',
        '<input id="orbitBoardMessage" class="orbit-board-input" maxlength="42" value="Kilroy was here." />',
        '<button id="orbitBoardSign" class="orbit-board-action" type="button">Submit Score</button>',
      '</div>',
      '<div class="orbit-board-actions">',
        '<button id="orbitBoardRefresh" class="orbit-board-action orbit-board-clear" type="button">Refresh Top 10</button>',
        '<button id="orbitBoardAgain" class="orbit-board-action is-hidden" type="button">Play Again</button>',
      '</div>',
      '<div id="orbitBoardList" class="orbit-board-list" aria-live="polite"></div>',
    '</div>',
  ].join("");
  document.body.appendChild(board);

  const closeButton = document.getElementById("orbitBoardClose");
  const nameInput = document.getElementById("orbitBoardName");
  const messageInput = document.getElementById("orbitBoardMessage");
  const signButton = document.getElementById("orbitBoardSign");
  const refreshButton = document.getElementById("orbitBoardRefresh");
  const againButton = document.getElementById("orbitBoardAgain");
  const list = document.getElementById("orbitBoardList");
  const note = document.getElementById("orbitBoardNote");
  const form = document.getElementById("orbitBoardForm");
  const finalBox = document.getElementById("orbitBoardFinal");
  const finalScore = document.getElementById("orbitBoardFinalScore");
  const finalProgress = document.getElementById("orbitBoardFinalProgress");
  const verdict = document.getElementById("orbitBoardVerdict");

  const integer = (value) => Math.max(0, Number.isFinite(Number(value)) ? Number(value) : 0);
  const initials = (value) => String(value || "")
    .toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 3);

  try { nameInput.value = initials(localStorage.getItem(nameKey)); }
  catch (error) { /* Cloud remains usable when storage is blocked. */ }

  nameInput.addEventListener("input", () => { nameInput.value = initials(nameInput.value); });
  nameInput.addEventListener("keydown", (event) => {
    if (event.code !== "Enter") return;
    event.preventDefault();
    signBoard();
  });

  function loadLocal() {
    try {
      const entries = JSON.parse(localStorage.getItem(localKey) || "[]");
      return Array.isArray(entries) ? entries : [];
    } catch (error) { return []; }
  }
  function saveLocal(entries) {
    try { localStorage.setItem(localKey, JSON.stringify(entries)); }
    catch (error) { /* Scores are still visible during this session. */ }
  }
  function rememberName(name) {
    try { localStorage.setItem(nameKey, name); }
    catch (error) { /* No remembered initials when storage is disabled. */ }
  }
  function entryTime(entry) {
    const date = new Date(entry.createdAt || entry.when || "").getTime();
    return Number.isFinite(date) ? date : 0;
  }
  function sortEntries(entries) {
    return entries.sort((a, b) =>
      integer(b.score) - integer(a.score) ||
      integer(b.clearedRuns) - integer(a.clearedRuns) ||
      integer(b.stars) - integer(a.stars) ||
      entryTime(b) - entryTime(a)
    );
  }

  // The existing D1 worker allows only the original fields and clamps
  // clearedRuns to 12. Reuse the 42-character message field for a versioned
  // Cycle prefix, preserving deployed cloud API/schema and all older entries.
  function decodeMessage(entry) {
    const message = String(entry.message || "Kilroy was here.");
    const match = /^C([1-9][0-9]*) \| /.exec(message);
    return {
      cycle: match ? Math.min(9999, Number(match[1])) : 1,
      message: match ? message.slice(match[0].length) : message,
    };
  }
  function snapshotFinal() {
    const cycle = Math.max(1, window.orbitGetCycle?.() || 1);
    const run = Math.max(1, Math.min(12, integer(level)));
    return {
      cycle, run,
      score: integer(score),
      clearedRuns: (cycle - 1) * 12 + run - 1,
      stars: integer(starsCollected),
      lives: integer(lives),
      createdAt: new Date().toISOString(),
    };
  }
  function currentEntry() {
    if (!finalSnapshot) return null;
    const message = String(messageInput.value || "Kilroy was here.").trim() || "Kilroy was here.";
    const prefix = finalSnapshot.cycle > 1 ? "C" + finalSnapshot.cycle + " | " : "";
    return {
      name: initials(nameInput.value) || "NVA",
      message: (prefix + message).slice(0, 42),
      score: finalSnapshot.score,
      run: finalSnapshot.run,
      clearedRuns: Math.min(12, finalSnapshot.clearedRuns),
      stars: finalSnapshot.stars,
      lives: finalSnapshot.lives,
      result: "Lost",
      createdAt: finalSnapshot.createdAt,
    };
  }
  function isTopTen(entries) {
    const challenger = currentEntry();
    return challenger && sortEntries([...entries, challenger]).slice(0, topSize).includes(challenger);
  }
  function showFinalState() {
    const ended = !!finalSnapshot && state === "gameover";
    finalBox.classList.toggle("is-hidden", !ended);
    againButton.classList.toggle("is-hidden", !ended);
    form.classList.toggle("is-hidden", !ended || !qualifies || submitted);
    signButton.disabled = !ended || !qualifies || submitted || submissionBusy;

    if (!ended) return;
    finalScore.textContent = finalSnapshot.score.toLocaleString() + " PTS";
    finalProgress.textContent = "Cycle " + finalSnapshot.cycle +
      " · Run " + finalSnapshot.run +
      " · " + finalSnapshot.clearedRuns + " total runs cleared";
    verdict.textContent = submitted
      ? (submissionStatus || "Score recorded. Play again!")
      : qualifies ? "TOP 10 SCORE! Enter your initials."
      : "Top 10 not reached. Play again and beat it!";
  }

  function showLoading(text) {
    note.textContent = "Shared Top 10";
    list.replaceChildren();
    const item = document.createElement("div");
    item.className = "orbit-board-empty";
    item.textContent = text;
    list.appendChild(item);
  }

  function render(entries, mode) {
    displayedEntries = sortEntries([...entries]);
    note.textContent = mode === "cloud" ? "Shared Top 10" : "Local fallback Top 10";
    if (finalSnapshot && !submitted) qualifies = !!isTopTen(displayedEntries);
    showFinalState();
    list.replaceChildren();
    const ranked = displayedEntries.slice(0, topSize);
    if (!ranked.length) {
      const item = document.createElement("div");
      item.className = "orbit-board-empty";
      item.textContent = "No scores yet. Make the first mark!";
      list.appendChild(item);
      return;
    }

    ranked.forEach((entry, index) => {
      const item = document.createElement("div");
      item.className = "orbit-board-entry";
      const main = document.createElement("div");
      main.className = "orbit-board-entry-main";
      const name = document.createElement("span");
      name.textContent = (index + 1) + ". " + String(entry.name || "NVA");
      const points = document.createElement("span");
      points.className = "orbit-board-entry-score";
      points.textContent = integer(entry.score).toLocaleString() + " pts";
      const meta = document.createElement("div");
      meta.className = "orbit-board-entry-meta";
      const info = decodeMessage(entry);
      meta.textContent = (entry.result || "In orbit") +
        " · Cycle " + info.cycle + " · Run " + integer(entry.run) +
        " · " + integer(entry.stars) + " stars";
      const message = document.createElement("div");
      message.className = "orbit-board-entry-message";
      message.textContent = info.message;
      main.append(name, points);
      item.append(main, meta, message);
      list.appendChild(item);
    });
  }

  async function fetchCloudBoard() {
    const response = await fetch(apiUrl, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error("Board API: " + response.status);
    const payload = await response.json();
    if (!payload.ok || !Array.isArray(payload.entries)) throw new Error("Invalid board.");
    saveLocal(payload.entries);
    return payload.entries;
  }
  async function postCloudEntry(entry) {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(entry),
    });
    if (!response.ok) throw new Error("Board API: " + response.status);
    const payload = await response.json();
    if (!payload.ok || !Array.isArray(payload.entries)) throw new Error("Invalid board.");
    saveLocal(payload.entries);
    return payload.entries;
  }

  async function refreshBoard() {
    const id = ++requestSerial;
    if (finalSnapshot && !submitted) {
      qualifies = false;
      showFinalState();
      verdict.textContent = "Checking the Top 10...";
    }
    showLoading("Contacting mission control...");
    try {
      const entries = await fetchCloudBoard();
      if (id === requestSerial && boardOpen) render(entries, "cloud");
    } catch (error) {
      if (id === requestSerial && boardOpen) {
        render(loadLocal(), "local");
        note.textContent = "Cloud unavailable · local scores";
      }
    }
  }

  async function signBoard() {
    if (!finalSnapshot || state !== "gameover" || !qualifies || submitted ||
        submissionBusy) return;
    const name = initials(nameInput.value);
    if (!name) {
      verdict.textContent = "Please enter 1–3 initials.";
      nameInput.focus({ preventScroll: true });
      return;
    }
    nameInput.value = name;
    const entry = currentEntry();
    rememberName(name);
    submissionBusy = true;
    signButton.textContent = "Submitting...";
    showFinalState();
    const id = ++requestSerial;
    try {
      const entries = await postCloudEntry(entry);
      if (id !== requestSerial) return;
      submitted = true;
      submissionStatus = "Saved to shared STARBOARD!";
      render(entries, "cloud");
    } catch (error) {
      if (id !== requestSerial) return;
      const entries = sortEntries([entry, ...loadLocal()]).slice(0, topSize);
      saveLocal(entries);
      submitted = true;
      submissionStatus = "Cloud unavailable — saved locally only.";
      render(entries, "local");
    } finally {
      submissionBusy = false;
      signButton.textContent = "Submit Score";
      showFinalState();
    }
  }

  function openBoard() {
    if (boardOpen) return;
    boardOpen = true;
    pausedByBoard = false;
    if (state === "running" && typeof togglePause === "function") {
      togglePause();
      pausedByBoard = true;
    }
    board.classList.remove("is-hidden");
    boardButton.setAttribute("aria-expanded", "true");
    showFinalState();
    refreshBoard();
  }
  function closeBoard() {
    if (!boardOpen) return;
    boardOpen = false;
    requestSerial++;
    board.classList.add("is-hidden");
    boardButton.setAttribute("aria-expanded", "false");
    if (pausedByBoard) updateHud("Starboard closed. Tap pause to resume.");
    pausedByBoard = false;
  }

  window.orbitIsStarboardOpen = () => boardOpen;
  window.orbitOnFinalGameOver = () => {
    if (finalSnapshot) return; // No duplicate game-over overlay or score submission.
    finalSnapshot = snapshotFinal();
    submitted = false;
    submissionStatus = "";
    qualifies = false;
    closeBoard();
    openBoard();
  };

  // A new game, unlike a new SPACE WARP cycle, resets the scorecard.
  const originalStartGame = startGame;
  startGame = function startWithFreshStarboard() {
    closeBoard();
    finalSnapshot = null;
    submitted = false;
    submissionStatus = "";
    qualifies = false;
    originalStartGame();
  };

  boardButton.addEventListener("click", openBoard);
  closeButton.addEventListener("click", closeBoard);
  signButton.addEventListener("click", signBoard);
  refreshButton.addEventListener("click", refreshBoard);
  againButton.addEventListener("click", () => {
    if (state === "gameover") startGame();
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
  render(loadLocal(), "local");
  showFinalState();
})();
