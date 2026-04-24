import * as pc from "playcanvas";

export type SurfaceType = "stone" | "wood" | "metal" | "plaster" | "flesh";

export type GameMode = "start" | "playing" | "paused" | "won" | "lost";

export interface Aabb {
  min: pc.Vec3;
  max: pc.Vec3;
  surface: SurfaceType;
  blocksPlayer: boolean;
  blocksSight: boolean;
  name: string;
}

export interface FloorZone {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  height: number;
  surface: SurfaceType;
  name: string;
}

export interface RayHit {
  point: pc.Vec3;
  normal: pc.Vec3;
  distance: number;
  surface: SurfaceType;
  entity?: pc.Entity;
  kind: "world" | "enemy";
  id?: string;
}

export interface PlayerFrame {
  position: pc.Vec3;
  cameraPosition: pc.Vec3;
  forward: pc.Vec3;
  right: pc.Vec3;
  yaw: number;
  pitch: number;
  speed: number;
  grounded: boolean;
  sprinting: boolean;
  justLanded: boolean;
  landingStrength: number;
  lookDeltaX: number;
  lookDeltaY: number;
  health: number;
}

export interface ShotResult {
  hit: boolean;
  enemyHit: boolean;
  killedEnemy: boolean;
  hitPoint?: pc.Vec3;
  normal?: pc.Vec3;
  surface?: SurfaceType;
  distance?: number;
}

export interface WeaponFrame {
  ammoInMagazine: number;
  reserveAmmo: number;
  chambered: boolean;
  slideLocked: boolean;
  stateLabel: string;
  canShoot: boolean;
}
