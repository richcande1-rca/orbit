# Orbit

A rough phone-friendly arcade prototype.

## Goal

Cross the orbit rings without crashing.

- Tap to jump outward one ring.
- Avoid glowing debris moving around each orbit.
- Reach the outside to score.
- Grab stars for bonus points.
- Each successful crossing makes the universe a little meaner.

## Controls

- Phone/tablet: tap anywhere
- Desktop: click, tap, or press Space

## Files

- `index.html` — page shell
- `style.css` — full-screen mobile layout
- `game.js` — canvas game loop

## Current rough-draft rules

1. Start on the inner orbit.
2. Tap outward ring by ring.
3. If you hit debris, you lose a life and reset to the inner orbit.
4. If you clear the outer ring, you score and the speed increases.
5. Three crashes ends the run.

This is intentionally simple: circular Frogger with a gorgeous starry background.

## October 2026 gameplay refresh

- The player jump timing is equally responsive on Easy, Normal, and Hard.
- Each difficulty scales the orbital hazards, while collisions temporarily
  reduce the pressure; clearing runs restores the chosen baseline.
- Comet impacts cost 1 life on Easy, 2 on Normal, and 3 on Hard.
- Starting on Run 2, a collectible power-up can appear **during** each run:
  - **Shield:** absorbs one debris or comet impact.
  - **Slow field:** slows orbital debris for 6 seconds.
  - **Repair:** restores one life.
- Colorful orbital rings and cached nebula clouds brighten the lightweight
  renderer without enabling expensive per-frame blur.

All gameplay is still the same basic challenge: read moving orbital traffic
and cross safely. Power-ups are optional and can expire if ignored.
## October 15 balance pass

- Easy retains its original forgiving tempo and power-up frequency.
- Normal and Hard gain pressure after consecutive clean clears; later runs
  accelerate further and occasionally add a carefully spaced counter-orbit hazard.
- Debris/comet hits reset the clean streak and give about three seconds of reduced
  hazard speed, followed by a short smooth recovery instead of lasting mercy.
- Normal and Hard offer fewer pickups, especially Repairs (8% of offers).
  Only one pickup offer is made per run even if Nova crashes.
- Star-earned lives now require 5 stars on Normal or 6 on Hard, versus 3 on Easy.
  Lives are capped at 5 on Normal and 4 on Hard; excess Repairs become a utility pickup.
- The Run 8 corridor-closing hazard now receives the current difficulty scaling.
- Nova's jump cooldown remains 0.28 seconds on every mode.

## Gravity Pulse and near-miss scoring — October 15

- On Runs 4, 7 and 11, a **Gravity Pulse** is telegraphed before a
  3.6-second burst of faster orbital debris. The pulse multiplies existing
  difficulty/recovery/Slow Field tuning rather than altering collision sizes
  or Nova's movement. Easy receives only a mild pulse.
- A close approach to a hazard, followed by a safe separation on the same ring,
  earns **NEAR MISS** points. Consecutive near misses within nine seconds
  build a ×1–×4 combo (2, 4, 6, then 8 points).
- Each piece of debris can pay a near-miss bonus just once per run. Nova must
  spend time on the threatened ring before a narrow escape: rapid lane hopping
  or invulnerability cannot manufacture a near miss. Real collisions and comet
  impacts break the combo.
- Pausing/reward screens suspend event timers. Rendering uses inexpensive arcs
  and one brief text popup; no additional sprite effects or new dependencies.
