// Four optional arcade adventures: rescue, wormholes, hunter and constellations.
// Visual/challenge layer only. Existing ring controls, hazards, upgrades and
// outer-ring progression remain the source of truth.
(() => {
  const EVENT_RUNS = Object.freeze({
    4: "rescue",
    6: "wormhole",
    7: "hunter",
    9: "constellation",
  });
  const REWARDS = Object.freeze({
    rescue: 40,
    wormhole: 8,
    hunter: 35,
    constellation: 45,
  });
  const TAU_LOCAL = Math.PI * 2;
  const clampValue = (n, low, high) => Math.max(low, Math.min(high, n));
  const wrapAngle = (a) => ((a % TAU_LOCAL) + TAU_LOCAL) % TAU_LOCAL;
  const shortestAngle = (from, to) =>
    wrapAngle(to - from + Math.PI) - Math.PI;

  let trackedKey = "";
  let mission = null;
  let popup = "";
  let popupTime = 0;
  let lastBadge = "";

  const badge = document.createElement("div");
  badge.id = "orbit-adventure-status";
  badge.className = "orbit-adventure-status";
  badge.setAttribute("role", "status");
  badge.setAttribute("aria-live", "polite");
  document.body.appendChild(badge);

  function announce(message, points = 0) {
    if (points) score += points;
    popup = points ? message + " +" + points : message;
    popupTime = 1.65;
    flash = Math.max(flash, 0.27);
    window.orbitAudio?.star?.();
    updateHud(popup);
  }

  function spawnSatellite() {
    return {
      lane: Math.min(2, ringCount - 2),
      angle: wrapAngle(player.angle + 0.90),
    };
  }

  function beginMission(kind) {
    if (kind === "rescue") {
      return { kind, satellite: spawnSatellite(), carrying: false, elapsed: 0 };
    }
    if (kind === "wormhole") {
      const entryAngle = wrapAngle(player.angle + 1.12);
      return {
        kind, used: false, elapsed: 0,
        entry: { lane: 1, angle: entryAngle },
        exit: { lane: Math.min(3, ringCount - 2), angle: wrapAngle(entryAngle + 1.55) },
      };
    }
    if (kind === "hunter") {
      return {
        kind, elapsed: 0, spawned: false, defeated: false,
        drone: null, chaseSeconds: 0, spawnGrace: 0,
      };
    }
    if (kind === "constellation") {
      const firstAngle = wrapAngle(player.angle + 0.85);
      const lanes = [1, 2, 3, Math.min(4, ringCount - 1)];
      return {
        kind, elapsed: 0, index: 0, done: false,
        stars: lanes.map((lane, i) => ({
          lane, angle: wrapAngle(firstAngle + i * 0.96),
        })),
      };
    }
    return null;
  }

  function syncMission(force = false) {
    const key = (window.orbitGetCycle?.() || 1) + ":" + level;
    if (!force && key === trackedKey) return;
    trackedKey = key;
    mission = beginMission(EVENT_RUNS[level]);
    syncBadge();
  }

  function badgeLabel() {
    if (!mission || state === "waiting" || state === "gameover" ||
        state === "complete" || state === "reward" ||
        document.body.classList.contains("title-screen-active")) return "";
    if (mission.kind === "rescue") {
      return mission.carrying
        ? "RESCUE · Deliver satellite at outer ring"
        : "RESCUE · Collect the damaged satellite";
    }
    if (mission.kind === "wormhole") {
      return mission.used
        ? "WORMHOLE · Jump completed"
        : "WORMHOLE · Enter the cyan gate";
    }
    if (mission.kind === "hunter") {
      if (mission.defeated) return "HUNTER · Survived!";
      if (!mission.spawned) return "HUNTER · Incoming tracking drone";
      return "HUNTER · Survive " + Math.ceil(Math.max(0, 10 - mission.chaseSeconds)) + "s";
    }
    if (mission.kind === "constellation") {
      return mission.done
        ? "CONSTELLATION · Complete!"
        : "CONSTELLATION · Star " + (mission.index + 1) + "/" + mission.stars.length;
    }
    return "";
  }

  function syncBadge() {
    const next = badgeLabel();
    if (next === lastBadge) return;
    lastBadge = next;
    badge.textContent = next;
    badge.classList.toggle("orbit-adventure-visible", !!next);
  }

  function damageMission() {
    if (!mission) return;
    if (mission.kind === "rescue" && mission.carrying) {
      mission.carrying = false;
      mission.satellite = spawnSatellite();
    } else if (mission.kind === "hunter" && mission.drone) {
      mission.drone = null;
      mission.defeated = true; // A failed chase ends; no survival bonus.
    } else if (mission.kind === "constellation" && !mission.done) {
      mission.index = 0;
    }
    syncBadge();
  }

  // The rescue only pays after an actual successful outward crossing.
  // A failed input or blocked move cannot earn the bonus.
  const originalMove = movePlayer;
  movePlayer = function moveWithAdventures(direction) {
    const beforeLevel = level;
    const beforeState = state;
    const fromOuter = player.lane === ringCount - 1;
    const delivering = mission?.kind === "rescue" && mission.carrying &&
      direction > 0 && fromOuter && beforeState === "running";
    originalMove(direction);
    const cleared = beforeState === "running" &&
      (level !== beforeLevel || state === "complete");
    if (delivering && cleared) {
      announce("SATELLITE RESCUED", REWARDS.rescue);
    }
    syncMission();
  };

  const originalStart = startGame;
  startGame = function startWithAdventures() {
    trackedKey = "";
    mission = null;
    popup = "";
    popupTime = 0;
    originalStart();
    syncMission(true);
  };

  const originalCrash = crash;
  crash = function crashWithAdventureConsequences(...args) {
    const beforeLives = lives;
    const outcome = originalCrash(...args);
    if (lives < beforeLives) damageMission();
    return outcome;
  };

  // Comet damage has a different path; only genuine unshielded strikes
  // reach this recorder. Do not punish protected contacts.
  const recordComet = window.orbitPowerupRecordCometHit;
  if (typeof recordComet === "function") {
    window.orbitPowerupRecordCometHit = (...args) => {
      const result = recordComet(...args);
      damageMission();
      return result;
    };
  }

  function nearPlayer(target, extra = 0.10) {
    if (!target || target.lane !== player.lane || !rings[target.lane]) return false;
    return angleDistance(player.angle, target.angle) <
      player.radius / rings[target.lane] + extra;
  }

  function updateRescue(dt) {
    const m = mission;
    m.elapsed += dt;
    if (m.carrying || !m.satellite) return;
    m.satellite.angle = wrapAngle(m.satellite.angle + dt * 0.18);
    if (nearPlayer(m.satellite, 0.13)) {
      m.carrying = true;
      m.satellite = null;
      announce("SATELLITE SECURED · REACH OUTER RING");
      syncBadge();
    }
  }

  function exitIsSafe(exitAngle, lane) {
    const r = rings[lane];
    if (!r) return false;
    return hazards.every((h) =>
      h.lane !== lane ||
      angleDistance(exitAngle, h.angle) > (h.size + player.radius) / r + 0.30
    );
  }

  function updateWormhole(dt) {
    const m = mission;
    m.elapsed += dt;
    if (m.used || !nearPlayer(m.entry, 0.13)) return;

    const exitAngle = m.exit.angle;
    // Do not materialize Nova inside an active hazard. If occupied, wait
    // for a clear moment instead of moving or deleting normal obstacles.
    if (!exitIsSafe(exitAngle, m.exit.lane)) return;

    player.lane = m.exit.lane;
    player.angle = exitAngle;
    moveCooldown = Math.max(moveCooldown, 0.25);
    invulnerable = Math.max(invulnerable, 0.40);
    m.used = true; // One-way, once per run; cannot ping-pong.
    announce("WORMHOLE TRAVERSED", REWARDS.wormhole);
    syncBadge();
  }

  function spawnHunter() {
    const m = mission;
    m.spawned = true;
    m.spawnGrace = 0.95;
    m.chaseSeconds = 0;
    m.drone = {
      lane: player.lane,
      angle: wrapAngle(player.angle - 1.35),
    };
    syncBadge();
    updateHud("HUNTER DRONE! DODGE AND SURVIVE 10 SECONDS!");
  }

  function updateHunter(dt) {
    const m = mission;
    if (m.defeated) return;
    m.elapsed += dt;
    if (!m.spawned) {
      if (m.elapsed >= 2.2 && player.lane >= 1) spawnHunter();
      return;
    }
    if (!m.drone) return;

    m.chaseSeconds += dt;
    m.spawnGrace = Math.max(0, m.spawnGrace - dt);
    if (m.chaseSeconds >= 10) {
      m.drone = null;
      m.defeated = true;
      announce("HUNTER EVADED", REWARDS.hunter);
      syncBadge();
      return;
    }

    const easy = window.orbitGetDifficulty?.() === "easy";
    // Hunters chase across lanes smoothly, never snap to the player.
    const angularSpeed = easy ? 1.22 : 1.40;
    const radialSpeed = easy ? 0.73 : 0.95;
    const d = m.drone;
    d.angle = wrapAngle(d.angle + clampValue(
      shortestAngle(d.angle, player.angle), -angularSpeed * dt, angularSpeed * dt
    ));
    d.lane += clampValue(player.lane - d.lane, -radialSpeed * dt, radialSpeed * dt);

    if (m.spawnGrace <= 0 && invulnerable <= 0) {
      const ringPos = rings[0] + d.lane * (rings[1] - rings[0]);
      const dx = centerX + Math.cos(d.angle) * ringPos -
        (centerX + Math.cos(player.angle) * rings[player.lane]);
      const dy = centerY + Math.sin(d.angle) * ringPos -
        (centerY + Math.sin(player.angle) * rings[player.lane]);
      if (dx * dx + dy * dy < (player.radius + 9) ** 2) {
        const livesBefore = lives;
        const invBefore = invulnerable;
        crash(); // Existing shield, difficulty, and test-mode rules apply.
        // The drone burns out on contact, including an absorbed shield hit.
        if (lives < livesBefore || invulnerable > invBefore ||
            window.orbitGetTestMode?.()) {
          m.drone = null;
          m.defeated = true;
        }
      }
    }
    syncBadge();
  }

  function updateConstellation(dt) {
    const m = mission;
    m.elapsed += dt;
    if (m.done) return;
    const star = m.stars[m.index];
    if (!nearPlayer(star, 0.13)) return;
    m.index += 1;
    if (m.index >= m.stars.length) {
      m.done = true;
      announce("CONSTELLATION COMPLETE", REWARDS.constellation);
    } else {
      announce("STAR LINK " + m.index + "/" + m.stars.length);
    }
    syncBadge();
  }

  const originalUpdate = update;
  update = function updateWithAdventures(dt) {
    originalUpdate(dt);
    syncMission();
    if (state !== "running") {
      syncBadge();
      return;
    }
    if (popupTime > 0) popupTime = Math.max(0, popupTime - dt);
    if (mission) {
      if (mission.kind === "rescue") updateRescue(dt);
      else if (mission.kind === "wormhole") updateWormhole(dt);
      else if (mission.kind === "hunter") updateHunter(dt);
      else if (mission.kind === "constellation") updateConstellation(dt);
    }
    syncBadge();
  };

  function drawSatellite(p, alpha = 1) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = "#93f4ff";
    ctx.lineWidth = 1.6;
    ctx.fillStyle = "#192a5b";
    ctx.fillRect(-13, -3.5, 8, 7);
    ctx.fillRect(5, -3.5, 8, 7);
    ctx.strokeRect(-13, -3.5, 8, 7);
    ctx.strokeRect(5, -3.5, 8, 7);
    ctx.fillStyle = "#ffe6a2";
    ctx.fillRect(-4, -4.5, 8, 9);
    ctx.strokeRect(-4, -4.5, 8, 9);
    ctx.fillStyle = "#ff6c83";
    ctx.fillRect(-1.4, -1.4, 2.8, 2.8);
    ctx.restore();
  }

  function drawRescue() {
    const m = mission;
    if (m.carrying) {
      // Tiny towed companion: purely visual, follows Nova's angle.
      const p = pointOnRing(player.lane, wrapAngle(player.angle - 0.11));
      drawSatellite(p, 0.86);
      return;
    }
    if (!m.satellite) return;
    const p = pointOnRing(m.satellite.lane, m.satellite.angle);
    ctx.save();
    ctx.strokeStyle = "#ffda90";
    ctx.globalAlpha = 0.55 + 0.22 * Math.sin(m.elapsed * 5);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 17, 0, TAU_LOCAL);
    ctx.stroke();
    ctx.restore();
    drawSatellite(p);
  }

  function drawWormholes() {
    const m = mission;
    if (m.used) return;
    for (const [gate, color] of [[m.entry, "#62faff"], [m.exit, "#c98cff"]]) {
      const p = pointOnRing(gate.lane, gate.angle);
      const pulse = 0.5 + 0.5 * Math.sin(m.elapsed * 6);
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.6;
      ctx.globalAlpha = 0.77 + 0.20 * pulse;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 11 + pulse * 2.3, 0, TAU_LOCAL);
      ctx.stroke();
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 8, 0, TAU_LOCAL);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawHunter() {
    const m = mission;
    if (!m.drone) return;
    const d = m.drone;
    const radius = rings[0] + d.lane * (rings[1] - rings[0]);
    const x = centerX + Math.cos(d.angle) * radius;
    const y = centerY + Math.sin(d.angle) * radius;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(d.angle + Math.PI / 2);
    ctx.globalAlpha = m.spawnGrace > 0 ? 0.45 + 0.28 * Math.sin(m.elapsed * 15) : 1;
    ctx.fillStyle = "#f04476";
    ctx.strokeStyle = "#ffc9e0";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(11, 0);
    ctx.lineTo(-8, -7);
    ctx.lineTo(-4, 0);
    ctx.lineTo(-8, 7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#ffedb7";
    ctx.beginPath();
    ctx.arc(-1.7, 0, 2.3, 0, TAU_LOCAL);
    ctx.fill();
    ctx.restore();
  }

  function drawConstellation() {
    const m = mission;
    if (m.done) return;
    const pts = m.stars.map(s => pointOnRing(s.lane, s.angle));
    ctx.save();
    ctx.strokeStyle = "rgba(255,222,132,0.44)";
    ctx.lineWidth = 1.15;
    ctx.beginPath();
    pts.forEach((p, i) => {
      if (!i) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();
    pts.forEach((p, i) => {
      ctx.save();
      ctx.globalAlpha = i < m.index ? 0.21 : i === m.index ? 1 : 0.40;
      const radius = i === m.index
        ? 8.2 + Math.sin(m.elapsed * 7) * 1.2 : 5.4;
      ctx.fillStyle = i === m.index ? "#fff2a7" : "#83dffb";
      ctx.strokeStyle = "#fff9d8";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let n = 0; n < 8; n++) {
        const angle = -Math.PI / 2 + n * Math.PI / 4;
        const r = n % 2 === 0 ? radius : radius * 0.43;
        if (!n) ctx.moveTo(p.x + Math.cos(angle) * r, p.y + Math.sin(angle) * r);
        else ctx.lineTo(p.x + Math.cos(angle) * r, p.y + Math.sin(angle) * r);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    });
    ctx.restore();
  }

  const originalDraw = draw;
  draw = function drawWithAdventures() {
    originalDraw();
    if (state !== "running" || !mission) return;
    if (mission.kind === "rescue") drawRescue();
    else if (mission.kind === "wormhole") drawWormholes();
    else if (mission.kind === "hunter") drawHunter();
    else if (mission.kind === "constellation") drawConstellation();
    if (popupTime > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, popupTime * 1.3);
      ctx.textAlign = "center";
      ctx.font = "800 14px system-ui, sans-serif";
      ctx.fillStyle = "#fff6c4";
      ctx.fillText(popup, centerX, centerY - Math.max(65, planetRadius + 20));
      ctx.restore();
    }
  };

  // Read-only debug/status entry point for playtesting, not a game control.
  window.orbitAdventureStatus = () => ({
    cycle: window.orbitGetCycle?.() || 1,
    run: level,
    kind: mission?.kind || null,
    carrying: !!mission?.carrying,
    portalUsed: !!mission?.used,
    hunterActive: !!mission?.drone,
    hunterSurvived: !!(mission?.kind === "hunter" && mission.defeated),
    constellationStep: mission?.kind === "constellation" ? mission.index : null,
  });

  syncMission(true);
})();
