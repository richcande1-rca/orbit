const BOARD_LIMIT = 20;
const MAX_NAME_LENGTH = 18;
const MAX_MESSAGE_LENGTH = 42;
const ALLOWED_ORIGINS = new Set([
  "https://richcande1-rca.github.io",
  "http://localhost:8787",
  "http://127.0.0.1:8787",
]);

function corsHeaders(request) {
  const origin = request.headers.get("Origin") || "";
  const allowOrigin = ALLOWED_ORIGINS.has(origin) ? origin : "https://richcande1-rca.github.io";

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

function jsonResponse(request, body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(request),
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function cleanText(value, fallback, maxLength) {
  const text = String(value || fallback).trim().replace(/\s+/g, " ");
  return (text || fallback).slice(0, maxLength);
}

function cleanInteger(value, fallback, min, max) {
  const number = Number.parseInt(value, 10);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function cleanResult(value) {
  const result = cleanText(value, "In orbit", 16);
  if (result === "Escaped" || result === "Lost" || result === "In orbit") return result;
  return "In orbit";
}

async function getBoard(request, env) {
  const result = await env.DB.prepare(
    `SELECT name, message, score, run, cleared_runs AS clearedRuns, stars, lives, result, created_at AS createdAt
     FROM entries
     ORDER BY score DESC, cleared_runs DESC, stars DESC, created_at DESC
     LIMIT ?`
  ).bind(BOARD_LIMIT).all();

  return jsonResponse(request, {
    ok: true,
    entries: result.results || [],
  });
}

async function postBoard(request, env) {
  let payload;

  try {
    payload = await request.json();
  } catch (error) {
    return jsonResponse(request, { ok: false, error: "Invalid JSON." }, 400);
  }

  const entry = {
    name: cleanText(payload.name, "Nova", MAX_NAME_LENGTH),
    message: cleanText(payload.message, "Kilroy was here.", MAX_MESSAGE_LENGTH),
    score: cleanInteger(payload.score, 0, 0, 999999),
    run: cleanInteger(payload.run, 1, 1, 12),
    clearedRuns: cleanInteger(payload.clearedRuns, 0, 0, 12),
    stars: cleanInteger(payload.stars, 0, 0, 9999),
    lives: cleanInteger(payload.lives, 0, 0, 99),
    result: cleanResult(payload.result),
  };

  await env.DB.prepare(
    `INSERT INTO entries (name, message, score, run, cleared_runs, stars, lives, result)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    entry.name,
    entry.message,
    entry.score,
    entry.run,
    entry.clearedRuns,
    entry.stars,
    entry.lives,
    entry.result
  ).run();

  const board = await env.DB.prepare(
    `SELECT id
     FROM entries
     ORDER BY score DESC, cleared_runs DESC, stars DESC, created_at DESC
     LIMIT -1 OFFSET ?`
  ).bind(BOARD_LIMIT).all();

  const idsToDelete = (board.results || []).map((row) => row.id);
  if (idsToDelete.length) {
    const placeholders = idsToDelete.map(() => "?").join(",");
    await env.DB.prepare(`DELETE FROM entries WHERE id IN (${placeholders})`).bind(...idsToDelete).run();
  }

  return getBoard(request, env);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }

    if (!env.DB) {
      return jsonResponse(request, { ok: false, error: "D1 binding DB is missing." }, 500);
    }

    if (url.pathname === "/" && request.method === "GET") {
      return jsonResponse(request, {
        ok: true,
        service: "Orbit Board API",
        endpoint: "/api/board",
      });
    }

    if (url.pathname !== "/api/board") {
      return jsonResponse(request, { ok: false, error: "Not found." }, 404);
    }

    if (request.method === "GET") return getBoard(request, env);
    if (request.method === "POST") return postBoard(request, env);

    return jsonResponse(request, { ok: false, error: "Method not allowed." }, 405);
  },
};
