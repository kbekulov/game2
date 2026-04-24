# Asset Manifest

This vertical slice intentionally ships with procedural placeholder assets so the project runs without external downloads.

| Asset | Location | Source | License | Notes |
| --- | --- | --- | --- | --- |
| Old European town geometry | `src/level/TownLevel.ts` | Procedural PlayCanvas primitives | Project source license | Stucco buildings, arches, cobblestones, plaza, stairs, balconies, shutters, fountain, lamps, cover, and props are built from primitive meshes and generated materials. |
| Glock-style sidearm silhouette | `src/weapons/Pistol.ts` | Procedural PlayCanvas primitives | Project source license | Generic polymer-frame sidearm with no trademarks, logos, or copied real-world model data. |
| First-person arms/gloves | `src/weapons/Pistol.ts` | Procedural PlayCanvas primitives | Project source license | Simple modern sleeves/gloves designed as replaceable first-person placeholders. |
| Enemy NPCs | `src/enemies/EnemyManager.ts` | Procedural PlayCanvas primitives | Project source license | Stylized armed silhouettes with patrol/chase/ranged behavior. |
| Muzzle flash, casings, impacts, hit feedback | `src/weapons/Pistol.ts`, `src/level/TownLevel.ts` | Procedural primitives | Project source license | Generated at runtime. |
| Audio cues | `src/audio/AudioManager.ts` | Runtime Web Audio synthesis | Project source license | Pistol, dry fire, reload, slide, press-check, footsteps, hit, enemy fire, ambience, wind/birds are synthesized. |

## Replacement Pipeline

Place future permissively licensed GLB models under `assets/models/` and audio under `assets/audio/`, then map them in the relevant system without changing gameplay code. Recommended replacements:

- modular old-town kit: cobblestone alleys, stucco facades, archways, balconies, shutters, lamps, plaza props
- generic striker-fired pistol model without trademarks
- first-person arms rig with reload/press-check animation clips
- enemy character GLB with simple locomotion, hit, and death clips
- permissively licensed Foley and firearm audio with clear attribution
