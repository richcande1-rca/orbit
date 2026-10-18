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
- Comet impacts cost 1 life on Easy, 1 on Normal, and 3 on Hard.
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

## Endless cycles + automatic STARBOARD — build 2026.10.16.2

- Clearing Run 12 opens SPACE WARP into **Cycle 2** rather than ending the
  game. Continue through repeated 12-run chapters, retaining accumulated
  score, earned stars, remaining lives, and chosen difficulty.
- Recycle FIRST LIGHT, BLOOM, GRAVITY LENS, Run 5 ion storms, and late-run
  events every cycle. Difficulty escalates by up to 28% additional baseline
  debris speed, and cycles 2+ introduce selective extra counter-traffic
  beginning in Run 3. Early runs remain playable, and speeds are capped.
- Score, lives, run and cycle are visible in the HUD. SPACE WARP announces
  the next cycle and waits for user confirmation; it never submits a score.
- When Nova actually runs out of lives, show the existing Cloudflare D1
  STARBOARD automatically with final score, cycle, run and **Top 10** rankings.
  Only qualifying final scores prompt for 1–3 initials; once submitted, the
  entry cannot be posted twice. A Play Again button begins a fresh game.
- The STARBOARD can still be opened manually during play, but it is now
  read-only until Game Over. Cloud failure falls back to local scores, with
  an explicit local-only status.
- The currently deployed worker supports runs 1–12 and 20 saved entries,
  with no separate cycle column; to avoid database migrations or disrupting
  existing records, cycle 2+ is encoded in the existing message field and
  decoded by the new client. The shared board still stores up to 20 entries,
  and the game displays the **Top 10**.

## Earlier skill checks — build 2026.10.16.3

- No new game mechanics: challenge comes from revised traffic combinations
  and tighter timing on Normal and Hard. Easy retains its original opening
  speeds and hazard counts.
- Normal/Hard opening hazard speed multiplier changes: Run 1 **0.82→0.94**,
  Run 2 **0.92→1.0**, before the existing difficulty scale.
- Run 3 now pairs two well-separated hazards in one randomly chosen middle
  orbit; Run 4 pressures two middle/outer orbits. Run 5 keeps reversed traffic
  but includes two consistently contested lanes.
- Run 6 preserves full crosscurrent, now spawning opposing debris apart.
- Runs 7–9 contain additional paired threats on middle and outer rings,
  including a reverse-moving pair. Run 8's safe corridor stays clear.
- All base pairs start with an angular separation of at least 1.95 radians,
  with at most two hazards per ring; all other cycles, events, and rewards
  continue using the original gameplay rules.

## Run-by-run difficulty ramp — build 2026.10.16.4

- Normal comet damage is **one life** (previously two); Easy remains one,
  Hard remains three. A comet still knocks Nova two rings inward, has the
  same warning/cooldown/trajectory and still respects shields and test mode.
- **Run 1 is unchanged.** Run 2 now gets a second hazard in one middle
  orbit and 8% additional debris speed on Normal/Hard, so there is an
  immediate, tangible difference from Run 1.
- Run 3 has pairs in two lanes, Run 4 pairs in three lanes with one moving
  against the others, Run 5 pairs three lanes while maintaining its full
  traffic reversal, and Run 6 retains its uniquely all-ring crosscurrent.
- Runs 7–9 apply two-hazard traffic across every available lane with two
  opposed pairs (Run 8's special safe corridor remains entirely clear
  until it closes). Runs 10–12 maintain those tense pairings, with
  higher levels gaining one additional lane as the orbit expands.
- The added Normal/Hard speed ramp grows gradually from 8% at Run 2 to
  23% at Run 12 and **does not change Easy**. It respects the established
  hazard physics, special-event flow, existing per-cycle escalation,
  shield/stasis, combo/recovery, STARBOARD, and mobile/desktop controls.
- Hazards never spawn stacked together: all pairs begin at least 1.95
  radians apart, and standard generation uses at most two per lane.

## Mobile hazard geometry — build 2026.10.16.5

- Hazard *radius* adapts to the actual space between orbit rings, rather
  than staying desktop-sized on phone screens. On a 375px-wide portrait
  phone with five rings, hazards are roughly 36% smaller; on a 390px phone
  roughly 31% smaller. Later six-ring layouts shrink them a little further
  to fit the tighter geometry. Desktop-sized ring layouts remain unchanged.
- Use the same scaled `hazard.size` for both the LITE/mobile hazard sprite
  core and the collision radius, including other mechanics such as comets
  clearing debris. The visual glow/wobble scales proportionally too.
- Recalculate sizes after viewport resize / phone rotation without compounding
  multipliers by retaining each hazard's original size.
- Speed, debris counts, comet damage, power-ups, Normal/Hard difficulty,
  special modes, endless cycles, and online leaderboard are unchanged.

## NOVA OVERDRIVE — build 2026.10.16.6

**Skill-based automatic arcade power-up.** A small HUD gauge fills once per
legitimate event: +30 near miss, +16 ordinary bonus star, +16 Star Chase
target, +22 Orbital Surge sector, +12 cleared run. Repeated button inputs
or standing still do not create energy. The 100-point gauge automatically
starts a 5-second OVERDRIVE surge during live play; if the meter fills on
a reward or SPACE WARP screen, the activation waits until running resumes.

- On activation, a cyan shockwave removes at most four nearby existing
  debris hazards and grants +25 points (+5 for each cleared obstacle).
- While active, Nova keeps her **normal orbital movement speed and jump
  timing**, and earned **near-miss points are doubled**. Lane-change input
  and every original collision rule remain unchanged. A genuine hit cancels
  the surge. Run 2's independent Orbital Surge speed boost is unchanged.
- Electric ribbons, pulsing ring lights, an expanding shockwave, and a
  seconds-remaining badge celebrate the activation. Effects are simple
  canvas strokes so the mobile LITE path stays efficient.
- The sound uses the existing reward cue, honoring mute settings.
  Energy and boosts freeze during pauses and reward screens; a new game
  fully resets them, while remaining charge carries over across levels
  and SPACE WARP cycles. Ordinary hits halve stored charge.
- Run 1/2 timed skill events, shield/stasis pickups, all difficulty modes,
  comet damage, multi-cycle progression, and cloud STARBOARD are preserved.
- No manual activation button or extra control required.

## Overdrive control consistency — build 2026.10.17.1

- Remove OVERDRIVE's temporary 16% orbital movement-speed boost.
  Speed changes made jumping between rings harder to time, especially
  when they overlapped with Run 2's Orbital Surge.
- Preserve the five-second duration, charge rules, automatic activation,
  cyan shockwave, debris clearing, bonus points, double near-miss scoring,
  audiovisual effects, and crash cancellation exactly as before.
- No changes to base player movement, lane-change cooldowns, normal/Hard
  debris difficulty, comet strikes, or the separate 25% Run 2 Orbital Surge.

## Arcade impact flash — build 2026.10.17.2

- Real damage from debris, electrical storms, ringfall ice, or comets
  produces a very brief full-screen electrical flash.
- First stage: nearly white for 58ms. Second: a pink/magenta afterglow
  fades away over 112ms, starting 44ms after impact. Comets use a
  cooler blue-white hit with a blue afterglow.
- Effects sit above the regular canvas and game-over overlays but use
  pointer-events: none; they do not pause or change physics, movement,
  collision sizes, scoring, lives, or the existing screen shake.
- Shields and invincible test-mode contacts do not trigger the bright
  impact effect. Rapid double triggers are suppressed within 250ms.
  Reduced-motion settings receive one softer, 85ms blink without
  the second colored afterglow.
- No rapid multi-strobe or timer-driven overlay. CSS animations handle
  the brief effect, with no additional canvas per-frame rendering.

## Impact pulse follow-up — build 2026.10.17.3

- Playtesting showed the previous impact looked like only a momentary white
  blink. Keep the first 58ms white flash but follow it with a clearly visible
  magenta full-screen pulse (155ms, starting 47ms in). An overlapping
  radial edge glow continues to 248ms, so the color retreats toward
  the edges as the center clears. Comets use the equivalent cool-blue palette.
- This is one impact sequence, not repeated strobes. Keep the existing
  250ms anti-strobe retrigger guard, original screen shake, shield/test-mode
  exclusions, mobile performance, scoring, physics and game-over behavior.
- Reduced-motion preference displays only one gentler 85ms white blink.
  The full-screen overlay remains pointer-events: none.

## Nova gets her silhouette — build 2026.10.17.4

- Replace the original circular white/blue gameplay marker with a tiny
  pointed silver spacecraft, swept-back blue wings, blue engine tail,
  and a bright cyan canopy.
- The nose points in the actual direction of travel (tangent to the
  orbital path); a short cyan contrail follows the orbit behind her.
- Mobile/LITE mode rotates a tiny cached canvas sprite rather than
  reconstructing geometry every frame. The detailed renderer uses
  the same silhouette, avoiding differences between desktop and phone.
- Keep the original player collision radius, orbit center, movement
  speed, ring jumps, invulnerability blinking, impacts, scoring,
  power-ups, and game progression exactly as they were.
- No new controls, abilities, hitboxes, art downloads or physics changes.

## Overdrive meter placement — build 2026.10.18.1

- Move the OVERDRIVE charge meter from top-center to directly below the
  music-volume slider, in the upper-left control panel. The meter is
  anchored to the slider itself, so it follows the control on desktop
  and narrow mobile layouts without covering the other controls.
- Keep the gauge colors, charge display, active countdown, visibility
  rules and all gameplay, sound and volume interactions unchanged.
- The gauge remains pointer-events: none so it cannot block controls.

## Four optional orbital adventures — build 2026.10.18.2

- Introduce four distinct optional arcade side missions during the existing
  12-run progression, repeating on future cycles. The ordinary objective
  (cross the outer ring) always remains available; no extra button,
  control, extra life or new mandatory stage is added.
- **Run 4 · RESCUE:** A damaged golden satellite slowly moves along a
  middle ring. Intercept it, carry it with Nova, and cross beyond the
  outermost ring to deliver it (+40). A collision drops the cargo and
  respawns the satellite ahead for another opportunity.
- **Run 6 · WORMHOLE:** A cyan entry ring and purple exit ring form a
  visible one-way shortcut. Enter the inner gate to emerge two rings
  farther out (+8). Safe-exit checks wait until existing traffic clears
  instead of placing Nova inside a hazard. One transit per run prevents
  repeated bouncing between gates.
- **Run 7 · HUNTER:** A red tracking drone appears after Nova ventures
  beyond the inner ring. It gradually pursues both angle and ring,
  rather than snapping instantly. Evade for 10 seconds to earn +35;
  contact uses ordinary collision/shield rules and ends the chase with
  no survival bonus. Easy uses a gentler pursuit speed.
- **Run 9 · CONSTELLATION:** Four linked, numbered-by-progress stars
  appear on successive rings. Collect them in order for +45.
  A damaging collision resets sequence progress, but never blocks
  regular advancement.
- All event visuals run on the existing canvas; objective progress
  appears in a small non-interactive HUD badge. The event system
  freezes on pause/reward cards and resets on a new game or new run.
  Existing hazards, scores, movement, ship shape, OVERDRIVE, input
  cooldowns, and game-over/SPACE WARP handling are otherwise untouched.

## How to Play manual — build 2026.10.18.3

- Replace the overcrowded NOVA ONLINE introduction with a concise startup
  summary, and add a clear **HOW TO PLAY** button on that title page.
- Add a permanent ? help control in the top toolbar. It opens the same
  **four-page scrollable manual** during play; opening it pauses the running
  game, and closing it resumes only if the game was running beforehand.
- Page 1: Nova's automatic orbit, inward/outward ring moves, outer-ring
  clear, all 12 runs, SPACE WARP cycles, difficulty modes.
- Page 2: Keyboard **Space / Right Arrow OUT**, **Left Arrow IN**,
  **P / Esc pause**; Enter also moves outward. Mobile IN/OUT buttons,
  planet tap OUT and other canvas taps IN.
- Page 3: Star points, correct 3 Easy / 5 Normal / 6 Hard extra-life
  thresholds and life caps, near misses, shields, slow field, repair,
  OVERDRIVE charge and five-second effect, Orbital Surge distinction.
- Page 4: Run 4 Rescue, Run 6 Wormhole, Run 7 Hunter, Run 9
  Constellation and their rewards, all optional.
- Correct the old mobile TRAINING ORBIT text so it no longer incorrectly
  says three stars grant a life on every difficulty.
- No changes to player controls, physics, mission behavior, scoring,
  hazards, or audio; modal blocks underlying key input while open.
