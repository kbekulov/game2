# Old Town FPS Vertical Slice

A complete PlayCanvas standalone + TypeScript FPS slice set in a compact European old-town combat district. The project uses Vite, procedural placeholder art, and Web Audio synthesis so it runs immediately without external asset downloads.

## Run Locally

```bash
npm install
npm run dev
```

Open the Vite URL, click **Begin**, and allow pointer lock.

## Controls

| Input | Action |
| --- | --- |
| Mouse | Look |
| Left mouse | Fire |
| W/A/S/D | Move |
| Shift | Sprint |
| Space | Jump |
| R | Reload |
| C | Press-check |
| Esc | Pause |
| Enter | Start / restart from result screen |

## Objective

Eliminate all hostile patrols in the district before they wear you down. The route moves from a narrow arrival street into a plaza, through alleys, up a raised stair section, and into a civic square.

## Structure

```text
src/audio      Web Audio synthesis and volume control
src/config     Central tuning values
src/core       Input, math, PlayCanvas helpers, shared types
src/enemies    Enemy AI, hit reactions, and combat state
src/game       App bootstrap and game loop
src/level      Old-town procedural level and collision/raycasting
src/player     FPS movement, camera feel, head bob, recoil
src/ui         HUD, menus, sensitivity/volume controls
src/weapons    Procedural pistol model, weapon state machine, effects
assets         Asset manifest and replacement notes
```

## Tuning Notes

Movement, camera, weapon, enemy, and game tuning live in `src/config/gameConfig.ts`. The implementation favors one polished procedural sidearm and one handcrafted route over broad content. Reloads, press-checks, sprint posture, bob, sway, recoil, and landing impact are layered procedurally until authored GLB animations are available.

## Asset Provenance

All shipped visuals and audio are procedural and documented in `assets/manifest.md`. There are no downloaded third-party models, textures, or samples in this first playable slice.
