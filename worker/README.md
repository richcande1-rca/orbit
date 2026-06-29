# Orbit Board Worker

Cloudflare Worker API for Orbit's shared leaderboard.

## API

Base route:

```txt
/api/board
```

### GET `/api/board`

Returns the top local-cloud board entries:

```json
{
  "ok": true,
  "entries": []
}
```

### POST `/api/board`

Accepts an Orbit score entry:

```json
{
  "name": "Nova",
  "message": "Kilroy was here.",
  "score": 12,
  "run": 7,
  "clearedRuns": 6,
  "stars": 8,
  "lives": 2,
  "result": "Lost"
}
```

Valid `result` values are `Escaped`, `Lost`, and `In orbit`.

## Cloudflare setup

1. Create a new Worker named `orbit-board-api`.
2. Create a D1 database named `orbit_board`.
3. Bind that D1 database to the Worker with binding name `DB`.
4. Run `schema.sql` against the D1 database.
5. Deploy `src/index.js`.
6. The frontend should point to:

```txt
https://orbit-board-api.rich-gothic.workers.dev/api/board
```

## Wrangler setup

From this `worker` folder:

```bash
npm install
npx wrangler d1 create orbit_board
```

Copy the generated database ID into `wrangler.toml`, replacing:

```txt
replace-with-cloudflare-d1-database-id
```

Then initialize the remote D1 database:

```bash
npm run db:init:remote
```

Deploy:

```bash
npm run deploy
```

## Notes

- CORS currently allows `https://richcande1-rca.github.io`.
- The Worker keeps the top 20 entries.
- Entries are ranked by score, then cleared runs, then stars, then newest time.
- This is intentionally tiny: no accounts, no passwords, no user tracking.
