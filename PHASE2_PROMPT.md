# NEON STRIKE — Real 3D Models Integration (Phase 2)

The game currently uses procedural primitives (boxes, icosahedrons, cones) for weapons,
enemies, and props. Real GLB models have been downloaded, Draco-compressed, and staged
in `public/models/`. Your job: swap the primitives for these models while keeping ALL
gameplay, physics, HUD, particles, audio, and level logic EXACTLY as-is.

## Staged assets (all Draco-compressed, load with GLTFLoader)

```
public/models/weapon_blaster.glb   — Scifi Pistol   (9.5 KB)
public/models/weapon_smg.glb       — Scifi SMG      (13 KB)
public/models/weapon_plasma.glb    — Coil Gun       (47 KB)
public/models/enemy_grunt.glb      — Robot Enemy    (72 KB)
public/models/enemy_shooter.glb    — Soldier        (36 KB)
public/models/enemy_rusher.glb     — Crab Enemy     (121 KB)
public/models/enemy_sniper.glb     — Ghost Skull    (90 KB)
public/models/enemy_boss.glb       — Sentinel Mech  (88 KB)
public/models/prop_crate.glb       — Crate          (6 KB)
public/models/prop_barrier.glb     — Concrete Barrier (2 KB)
public/textures/sky.hdr            — Venice Sunset HDRI (1.4 MB)
```

## Integration plan

### 1. New module `src/models.js`
- Preload ALL models at startup with `GLTFLoader` (three/addons/loaders/GLTFLoader.js)
- Export an async `loadModels()` that returns a `Map<string, THREE.Group>` (deep-clone the
  scene per instance via `SkeletonUtils.clone` or `scene.clone(true)` — check which works
  with these static models; they have no skeletons so `group.clone(true)` is fine)
- Export `makeModel(key)` → cloned Group, zeroed/centered appropriately
- Cache textures: after first load, reuse material/texture instances where safe
- Loading state: game can start immediately with primitives as fallback; when models
  finish loading, swap them in (do NOT block the title screen)

### 2. `src/weapons.js` — first-person weapon model
- Currently fire spawns a projectile sphere. ADD a visible weapon Group attached to the
  camera: `camera.add(weaponGroup)` so it renders in first-person view (bottom-right).
- Load the model for the ACTIVE weapon (blaster/smg/plasma), position/rotate so it looks
  natural in the lower-right corner of the view. Scale to fit (~0.25-0.35 scale, offset
  x +0.35, y -0.32, z -0.55 relative to camera — TUNE so it looks right).
- When switching weapons, swap the visible model (remove old child, add new).
- Add a subtle idle bob (sin wave on y) and recoil kick (z offset + rotation.x pulse)
  on fire — small, fast.
- Keep the existing projectile spawning logic untouched.
- IMPORTANT: the weapon group attached to camera must be added AFTER camera setup and
  must NOT be added to the scene itself (only as camera child).

### 3. `src/enemies.js` — enemy models
- Replace the procedural geometries (icosahedron/box/cone/cylinder) with the model per type:
  - grunt   → enemy_grunt.glb
  - shooter → enemy_shooter.glb
  - rusher  → enemy_rusher.glb
  - sniper  → enemy_sniper.glb
  - boss    → enemy_boss.glb
- Keep: mesh.position as the entity's logical position (model child at 0,0,0), radius,
  hp, speed, damage, attack logic, laser sight, flash (hit flash: iterate model
  materials and set emissive to white then restore — if the model has no emissive
  materials, tint with a white overlay or scale-pulse instead — pick what works),
  death particle burst at mesh.position, boss phases.
- Scale models to match gameplay sizes: grunt ~0.9-1.1 height, boss ~2.5-3x bigger than
  grunt. Position y so the model's feet sit at y=0 (models may have origin at center or
  feet — center them by computing bounding box and adjusting).
- The boss must remain imposing: scale ~3.0, keep its radial attacks.

### 4. `src/level.js` — props + skybox
- Crates: replace procedural crate boxes with `prop_crate.glb` (keep destructible
  behaviour: on hit, particles + removal; collider size stays ~1.25x1.25)
- Solid cover blocks: replace with `prop_barrier.glb` where sensible (scale up 2-3x for
  cover height ~1.5-2.4)
- Skybox: load `public/textures/sky.hdr` with RGBELoader, apply as
  `scene.background = texture` with `texture.mapping = THREE.EquirectangularReflectionMapping`.
  ALSO set `scene.environment = texture` so PBR materials pick up reflections (this is
  the single biggest visual win). Keep the existing fog but reduce it slightly
  (0.026 → 0.018) so the skybox is visible.
- Floor: keep the neon grid floor but make it a MeshStandardMaterial (or
  MeshStandardMaterial with emissive grid) so it reacts to the HDRI environment.
  If the existing canvas grid texture is MeshBasicMaterial, switch to MeshStandard with
  the same texture as a map + emissiveMap.
- Remove the old procedural skyline boxes / star points IF they conflict with the
  skybox (keep them if they look good as distant silhouettes against the HDRI — decide
  visually; simplest is to remove them since the HDRI now provides the background).

### 5. Fallback strategy (CRITICAL)
- If a model fails to load (network, parse error), the game MUST still work with the
  existing procedural primitives. Wrap model loading in try/catch; if a model isn't in
  the map, fall back to the current primitive geometry for that entity.
- The title screen shows immediately; models swap in when ready.

### 6. Performance
- All models are already Draco-compressed (tiny). No further optimization needed.
- Do NOT add shadow maps. Keep additive glow sprites for projectiles.
- Keep pixel ratio cap 1.5.
- If the HDRI is too heavy on mobile, it's 1k (1.4MB) — fine for static file.

## Files to modify
- `src/models.js` (NEW)
- `src/weapons.js`
- `src/enemies.js`
- `src/level.js`
- `src/main.js` (call loadModels, pass map to game)

## Do NOT change
- Config values in `src/config.js` except where noted above
- Gameplay: movement, collisions, projectiles, combo, scoring, waves, levels, boss phases
- HUD, audio, particles, effects
- Vite config, wrangler.toml, package.json (except adding nothing)

## Acceptance criteria
1. `npm run build` succeeds
2. Game loads: title screen → models load in background → primitives are REPLACED by
   models (verify by inspecting the scene: enemies look like actual robots/soldiers,
   weapon visible in first person, crates/barriers look like real props)
3. Skybox visible (not black void), PBR materials react to HDRI light
4. All 5 enemy types + boss show their respective models
5. Weapon switching swaps visible weapon model
6. Killing enemies still spawns particles at correct position
7. No console errors
8. If models fail, game still runs with primitives (fallback works)
9. Check the models are not giant/tiny — visually verify scale on level 1

Build it. Verify `npm run build` passes at the end.
