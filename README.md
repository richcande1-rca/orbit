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

## Living planet — October 15 (build 2026.10.15.3)

- Low-cost, animated atmospheric cloud bands and green-violet auroras respond
  subtly to the campaign's progress. They are visual only.
- Run 5 introduces an **ION STORM** created by the planet. An inner-middle ring
  flashes amber with a 2.0-second warning before glowing electric cyan for
  3.0 seconds. Leave the marked ring or time your crossing.
- The active charged ring uses the normal debris crash logic: one-life damage,
  shield protection, test-mode invincibility, and normal recovery/invulnerability.
  A shield save nudges Nova into a safe adjacent orbit rather than trapping it.
- Weather is drawn over the existing planet with only a handful of strokes.
  Storm arcs are drawn beneath Nova and hazards and require no new resources.
- No changes to core movement timing, standard collision geometry, gravity
  pulses, or the SPACE WARP ending. No volcanic fragments yet.

## Polar aurora visual correction (build 2026.10.15.4)

- Remove detached hovering halo strokes above the planet.
- Replace them with irregular, animated cyan-green/violet polar curtains
  clipped to the planet's disk, with tapered ribbons and faded globe edges.
- Auroras brighten in later runs and electrical storms without expensive
  blur effects or changes to the existing hazards and controls.

## Atmospheric cloudscape (build 2026.10.15.5)

- Remove both sets of horizontal stripes: the original planet surface bands
  and the five drawn-in-motion weather lines.
- Add three irregular, broken atmospheric cloud regions with varied blue haze,
  softened edges and stronger limb fading.
- Add a compact, recognizable rotating cyclone with a bright eye; it intensifies
  slightly during Run 5's ion storm and as the campaign advances.
- Cache cloud banks and cyclone artwork in two small canvases on first use:
  only two transformed `drawImage` calls per weather frame, not dozens of
  live gradients. Preserve auroras, existing storm damage, controls and physics.

## Planetary realism pass (build 2026.10.15.6)

- Replace the overly bright radial-gradient center planet with a cached
  spherical blue cloud texture. Curved coordinates, layered procedural
  turbulence, a directional light source, a shaded terminator and subtle
  limb falloff give the globe depth rather than an airbrushed glow.
- Replace the small, literal spiral icon with a diffuse oval cyclone:
  irregular cloud wisps rotate slowly around a muted calm eye.
- Replace the crystalline-looking polar ribbons with very faint,
  broad green-blue auroral haze confined to the globe's surface.
- Draw weather and polar haze **before** the near half of the ring,
  restoring the correct foreground/background depth.
- Render the 256-square globe sprite just once and retain the two cached
  weather sprites. No new texture generation occurs on subsequent frames.
- Keep the Run 5 electrical warning/damage, responsive movement, collision
  geometry, near-miss scoring, and finale behavior unchanged.

## Layered ring realism (build 2026.10.15.7)

- Retain the established tilted ring shape and direction; replace the single
  thick blue-white ribbon with five fine, low-opacity foreground dust lanes
  and three dimmer background lanes.
- Add a hairline division and restrained density variation to break the flat
  plastic-band appearance. Both sides are thinner and less neon than before.
- Restore natural ring depth: draw the back half behind the spherical texture,
  place a subtle clipped cast shadow on the globe, then draw the foreground
  dust lanes over the atmosphere and rim.
- Keep planet weather, auroras, stars, Nova movement, collisions, difficulty,
  near misses, and the Run 5 ion storm exactly as before.

## Planet rotation and Ringfall — build 2026.10.15.8

- Animated cloud masses and cyclone follow projected longitude across the
  hemisphere instead of swaying in place. Cloud features taper and fade at
  the limb and rotate out of sight in ~94 seconds. The cached blue cloud
  base, lighting and the planetary dust-ring appearance stay untouched.
- **RINGFALL** now identifies Run 12: a specific section of the existing
  planetary dust ring flashes amber and shows the outgoing path for 2.15s
  before small icy fragments physically leave the ring and travel radially
  outward through the gameplay lanes. A second wave follows.
- Fragments exist as moving objects with actual positions and radii, and
  collide with Nova using world-space distances. Shields, existing
  invulnerability, test-mode invincibility, and life loss use the normal
  crash handler. They disappear only after impact or leaving the outer orbit.
- The warning precedes the launch, and the relatively narrow ice fan leaves
  maneuvering space. Easy mode emits two fragments per wave instead of three.
- Neither Nova's movement rules nor the late-game SPACE WARP ending change.

## Visible gas giant rotation — build 2026.10.15.9

- Fix the previous update's oversight: the main cloud texture was baked into a
  stationary globe, so the faint rotating weather overlays did not register.
- Generate a one-time longitude/latitude albedo map with seamless noise and
  a recognizable storm feature; reproject it onto the shaded hemisphere as
  longitude advances. Both limb curvature and the directional lighting remain
  stationary while the actual clouds move across the disk.
- Synchronize the cached translucent cloud banks with the same ~48-second
  rotational clock; motion also continues on the waiting/game-over screens.
  An explicit pause freezes the clock and gameplay as before.
- CPU updates are limited to a change of one source-map column (~8 updates
  per second); the noise map and sphere sampling geometry are cached.
- Preserve the existing dust rings, hazards, shields, Ringfall, and SPACE WARP.

## Early arcade opportunities — build 2026.10.15.10

- Run 1 now features **STAR CHASE**: three distinct gold collectible targets
  across rings 2–4, awarded in sequence for +3, +5 and +8 points. Each target
  has an 8-second window. If missed, the chain simply ends; normal scoring,
  debris and FIRST LIGHT finale continue.
- Run 2 now features **ORBITAL SURGE**: a bright gold segment moving around
  the third orbit. Enter its sector at the right time for +6 points and 2.4
  seconds of +25% angular movement speed (not invulnerability). Camping the
  ring or touching the segment long after entering pays nothing. The surge
  bonus is limited to once per run and never leaves the early levels.
- Initial star-chain placement, and the direction and start position of
  the moving sector, have small controlled variations between attempts.
- Both options are voluntary skill rewards, not additional enemies or extra
  lives. Easy offers a wider capture window. No changes to existing hazard
  collisions, pickup balance, FIRST LIGHT/BLOOM events, or later runs.
- Both features reuse the existing canvas primitives, draw below Nova, and
  show a compact progress / timing prompt with no expensive filters.

## Desktop arrow controls — build 2026.10.16.1

- Add **Left Arrow** for inward movement and **Right Arrow** for outward
  movement during active play. Both use the exact existing movement function,
  including cooldown, lane restrictions, reward systems and hazards.
- Keep **Space / Enter** moving outward and all mouse/touch controls unchanged.
- Prevent arrow-key page scrolling during active play, without intercepting
  text entry, modal title screens, or other non-running game states.
- Respect the existing input hold/lock for reward cards and stage transitions.
- Update desktop training instructions, build stamp, and changed script URLs.
