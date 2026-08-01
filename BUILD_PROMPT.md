# NEON STRIKE — Mobile 3D FPS (Build Spec)

Build a complete, polished, genuinely FUN mobile-first 3D first-person shooter using
Vite + vanilla Three.js. This is a single-player arena shooter with levels, obstacles,
enemies, particles, juice, and a satisfying game loop. Fully procedural — NO external
asset files (no textures, no models, no audio files). Everything generated in code.

## Tech Stack
- Vite (vanilla JS template)
- three (latest stable, import from `three` and `three/addons/` where needed)
- No React, no TypeScript, no Tailwind — plain modern JS + CSS
- Deploy target: Cloudflare Pages (static, `dist/` output)

## Project Structure (create exactly these files)
```
index.html
package.json
vite.config.js
wrangler.toml            (name = "neon-strike", pages_build_output_dir = "dist")
src/main.js              — bootstrap, game state machine, render loop
src/config.js            — ALL tunable parameters in one place
src/input.js             — touch joystick + touch look + mouse/keyboard fallback
src/player.js            — player movement, health, camera rig
src/weapons.js           — weapon types, projectiles, fire logic
src/enemies.js           — enemy types, AI behaviours, spawning
src/level.js             — level definitions, obstacles, arena building
src/particles.js         — pooled particle system (explosions, sparks, trails)
src/effects.js           — screen shake, hit flashes, floating score popups, damage vignette
src/audio.js             — Web Audio API procedural sounds (no audio files)
src/hud.js               — HUD: health, score, combo, level banner, menus, crosshair
src/game.js              — game loop orchestration, collisions, scoring, win/lose
```

## Game Design (make it FUN)
- **Arena shooter**: player stands on a large flat arena per level, enemies spawn in waves
  and come at you. Player can move freely (walk + jump), aim with camera, shoot.
- **Theme**: neon sci-fi — dark background, glowing neon grid floor, emissive colored
  enemies, bloom-like glow via additive materials and sprites (NO UnrealBloomPass — too
  heavy for mobile; fake it with emissive materials, additive blending, and glow sprites).
- **5 levels**, each bigger/harder with its own colour palette:
  1. "Training Grid" (cyan) — slow grunts, teaches movement + shooting
  2. "The Reactor" (orange) — grunts + shooters, moving hazard pillars
  3. "The Vault" (green) — rushers added, more obstacles, cover crates
  4. "The Hive" (magenta) — everything, dense waves, turret-like snipers
  5. "The Overlord" (red) — BOSS level: giant enemy with multiple attack patterns
- **Enemy types** (all procedural geometry — boxes, spheres, icosahedrons with emissive eyes):
  - Grunt: slow, walks at player, melee range attack
  - Shooter: keeps distance, fires slow glowing projectiles at player
  - Rusher: fast, low HP, darts at player (dangerous, satisfying to pop)
  - Sniper/Turret: stationary or slow, fires fast single shots, telegraphed with laser sight
  - Boss: huge, multi-phase — phase 1 radial bullet burst, phase 2 spawns minions,
    phase 3 charges at player + shockwave. Big HP bar on screen.
- **Obstacles** (in levels):
  - Destructible crates (explode into particles, sometimes drop health/ammo)
  - Solid cover blocks (not destructible)
  - Moving hazard pillars (slide back and forth, damage on touch)
  - Laser fence barriers (damage on touch, visual glow)
- **Weapons** (3, switchable via weapon pickups):
  - Blaster (default): single shot, medium damage, infinite ammo
  - SMG pickup: rapid fire, low damage
  - Plasma cannon pickup: slow, heavy, explosive AoE
  - Weapon pickups spawn as floating glowing boxes; switching weapons with buttons
- **Pickups**: health packs (+30 HP), weapon pickups, score gems (small, +100, scattered)
- **Scoring / combo**: +100 per kill, combo multiplier increases with kills within 3s
  window (x1, x2, x3, x4...). Combo resets on taking damage. Show combo in HUD with
  satisfying pop animation. Floating score popups on kills.
- **Game juice (critical — this is what makes it fun)**:
  - Screen shake on firing (subtle) and on explosions/hits (stronger)
  - Enemy hit flash (emissive flashes white briefly on damage)
  - Muzzle flash light + sprite
  - Impact sparks on walls, blood-like neon particle burst on enemy death
  - Explosion shockwave ring sprite on plasma/explosions
  - Damage vignette (red pulsing edge overlay when low health)
  - Kill streak announcements ("DOUBLE KILL", "RAMPAGE", "UNSTOPPABLE") as big text
  - Level complete banner + stats, then auto-advance
  - Victory screen after level 5
- **Audio** (Web Audio API, all procedural):
  - Laser pew (oscillator sweep down)
  - SMG rapid chirp (short square blip)
  - Plasma boom (noise burst + low sine drop)
  - Enemy hit (short thud)
  - Explosion (noise burst with lowpass decay)
  - Pickup (rising arpeggio blip)
  - Player hurt (low thud + distortion)
  - Jump (quick whoosh)
  - Level complete fanfare (little melody)
  - Boss roar (low sawtooth sweep)
  - Background music: simple looping synthwave arpeggio (sequencer with oscillators)
    — keep it quiet, adds atmosphere. Mute button.

## Controls (MOBILE FIRST — this is the key requirement)
- **Left half of screen**: virtual joystick (dynamic origin where thumb touches) → movement
- **Right half of screen**: touch-drag to aim/look (camera yaw + pitch)
- **Fire button** (bottom right): hold to auto-fire
- **Jump button** (bottom right, above fire): tap to jump
- **Weapon switch buttons** (small, bottom center-right): cycle weapons
- **Desktop fallback** (works automatically): WASD move, mouse drag to look (pointer
  lock optional, use mouse drag on canvas for simplicity + reliability), click to fire,
  Space jump, 1/2/3 weapon switch
- Touch handling MUST use Pointer Events with `touch-action: none` and
  `{ passive: false }` — otherwise mobile browsers hijack gestures.
- Joystick: show a base circle + knob; dynamic origin at touchstart; knob clamped to
  radius; dead zone ~0.15; movement vector from knob offset.
- No scrolling/zooming on the page ever. Fullscreen fixed canvas. `overflow: hidden`.

## Visual Style (must look GREAT)
- Dark scene background (#05060f-ish), subtle fog
- Neon grid floor: large plane with a procedurally generated canvas texture (grid lines
  with glow), or GridHelper with additive material — pick whichever looks better; make
  the grid lines glow cyan/orange per level palette
- Emissive materials with bloom-like glow sprites on enemies, pickups, projectiles
- Camera at eye height ~1.7 units, FOV ~75 (feels good on mobile)
- Skybox: procedural gradient (canvas texture on large sphere) or just dark + stars
  (Points) + distant skyline silhouettes (dark boxes) for depth
- Post-processing: NONE heavy. Use renderer.toneMapping = ACESFilmicToneMapping,
  outputColorSpace default. Additive blending for glow. This is the mobile-safe approach.
- Antialias true, pixelRatio = Math.min(devicePixelRatio, 2)

## Physics / Collision
- Simple, custom, raycast-free where possible:
  - Player vs arena bounds: clamp position to arena rect
  - Player vs obstacles: AABB circle-vs-box push-out (player is a cylinder radius ~0.4)
  - Player vs enemies: distance check + push-out + contact damage
  - Projectiles vs enemies: raycast against enemy meshes (THREE.Raycaster is fine,
    they're few) or distance-based with projectile speed steps — use Raycaster against
    a maintained list of enemy meshes + obstacle meshes
  - Projectile vs obstacles: Raycaster against obstacle meshes
- No physics engine — hand-rolled, deterministic, fast.

## Performance (mobile MUST stay 60fps)
- Pixel ratio cap 2 (1.5 if possible)
- Pool ALL particles (preallocate, recycle)
- InstancedMesh not required but keep draw calls low — reuse geometries/materials
- Cap enemies alive per level (e.g. max 12-15 active)
- Delta time capped at 0.05s
- Avoid per-frame allocations in hot loops
- No shadows on mobile (disable shadow maps entirely — fake contact glow with a sprite
  under enemies if needed, or just skip; additive glow is enough)

## Game Flow
- Title screen: game title with neon glow, "TAP TO START", controls hint, mute button
- Level intro: banner "LEVEL 1 — TRAINING GRID", 2s countdown, then waves begin
- Wave system: each level has N waves; between waves 3s breather + "WAVE X" banner;
  when all waves cleared → LEVEL COMPLETE banner (time, kills, max combo) → next level
- Player death: death screen with stats + "TAP TO RETRY" (restart current level)
- Victory after level 5: victory screen, total stats, "PLAY AGAIN"
- Score persisted in localStorage (high score shown on title screen)

## HUD Layout (DOM overlay, absolutely positioned, mobile-safe)
- Top-left: HP bar (segmented, animated damage flash)
- Top-center: level + wave indicator
- Top-right: score + combo (big pop animation on combo up)
- Center: crosshair (small + shape, glow)
- Bottom-left: joystick area (transparent, no visual unless touching)
- Bottom-right: FIRE (large round button), JUMP (smaller), weapon slots (3 small icons
  showing owned weapons + active highlight)
- Boss HP bar: large bar at top-center when boss active
- All HUD elements: CSS with neon glow (text-shadow / box-shadow), pointer-events none
  except buttons

## Acceptance Criteria (make these true before finishing)
1. `npm install && npm run build` succeeds with zero errors
2. Game loads on mobile: no console errors, canvas renders, controls work
3. Movement joystick works, look-drag works, fire works on touch
4. Enemies spawn, chase/attack, take damage, die with particle burst + score
5. All 5 levels load and are completable
6. Boss fight works with 3 phases + HP bar
7. Particles, screen shake, hit flash, combo, kill-streak text all work
8. Audio works (procedural, no files), mute button works
9. No heavy post-processing; runs smoothly on a mid-range phone
10. Desktop fallback controls work (WASD + mouse drag + click fire)

## Wrangler/Deploy Notes
- wrangler.toml: `name = "neon-strike"`, `pages_build_output_dir = "dist"`, NO `[build]` section
- package.json scripts: dev (vite), build (vite build), preview (vite preview)
- index.html title: "NEON STRIKE — Mobile FPS"
- Make sure the game is playable from a static file server with no API calls

Build it. Make it genuinely fun — juice is not optional. When done, run
`npm run build` and fix any errors until it builds clean.
