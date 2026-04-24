import * as pc from "playcanvas";
import { aabbOverlaps, makeAabb, rayAabb } from "../core/math.ts";
import type { Aabb, FloorZone, RayHit, SurfaceType } from "../core/types.ts";

export class LevelCollider {
  readonly solids: Aabb[] = [];
  readonly floors: FloorZone[] = [];

  addSolid(
    name: string,
    center: pc.Vec3,
    scale: pc.Vec3,
    surface: SurfaceType,
    blocksPlayer = true,
    blocksSight = true
  ): Aabb {
    const aabb = makeAabb(name, center, new pc.Vec3(scale.x * 0.5, scale.y * 0.5, scale.z * 0.5), surface, blocksPlayer, blocksSight);
    this.solids.push(aabb);
    return aabb;
  }

  addFloor(name: string, minX: number, maxX: number, minZ: number, maxZ: number, height: number, surface: SurfaceType): void {
    this.floors.push({ name, minX, maxX, minZ, maxZ, height, surface });
  }

  getGroundHeight(x: number, z: number): number {
    let best = -Infinity;
    for (const floor of this.floors) {
      if (x >= floor.minX && x <= floor.maxX && z >= floor.minZ && z <= floor.maxZ) {
        best = Math.max(best, floor.height);
      }
    }
    return Number.isFinite(best) ? best : 0;
  }

  getGroundSurface(x: number, z: number): SurfaceType {
    let bestHeight = -Infinity;
    let surface: SurfaceType = "stone";
    for (const floor of this.floors) {
      if (x >= floor.minX && x <= floor.maxX && z >= floor.minZ && z <= floor.maxZ && floor.height >= bestHeight) {
        bestHeight = floor.height;
        surface = floor.surface;
      }
    }
    return surface;
  }

  collidesPlayer(position: pc.Vec3, radius: number, height: number): boolean {
    const player = makeAabb(
      "player",
      new pc.Vec3(position.x, position.y + height * 0.5, position.z),
      new pc.Vec3(radius, height * 0.5, radius),
      "stone"
    );
    return this.solids.some((solid) => solid.blocksPlayer && aabbOverlaps(player, solid));
  }

  raycast(origin: pc.Vec3, direction: pc.Vec3, maxDistance: number, sightOnly = false): RayHit | null {
    let closest: RayHit | null = null;
    for (const solid of this.solids) {
      if (sightOnly && !solid.blocksSight) continue;
      const result = rayAabb(origin, direction, solid, maxDistance);
      if (!result) continue;
      if (!closest || result.distance < closest.distance) {
        closest = {
          point: origin.clone().add(direction.clone().mulScalar(result.distance)),
          normal: result.normal.clone(),
          distance: result.distance,
          surface: solid.surface,
          kind: "world",
          id: solid.name
        };
      }
    }
    return closest;
  }

  hasLineOfSight(from: pc.Vec3, to: pc.Vec3): boolean {
    const direction = to.clone().sub(from);
    const distance = direction.length();
    if (distance <= 0.001) return true;
    direction.mulScalar(1 / distance);
    const hit = this.raycast(from, direction, distance, true);
    return !hit || hit.distance >= distance - 0.08;
  }
}
