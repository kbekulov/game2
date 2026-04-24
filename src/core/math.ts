import * as pc from "playcanvas";
import type { Aabb } from "./types.ts";

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export const lerp = (from: number, to: number, alpha: number): number =>
  from + (to - from) * alpha;

export const damp = (from: number, to: number, lambda: number, dt: number): number =>
  lerp(from, to, 1 - Math.exp(-lambda * dt));

export const approach = (from: number, to: number, amount: number): number => {
  if (from < to) return Math.min(to, from + amount);
  if (from > to) return Math.max(to, from - amount);
  return to;
};

export const randomRange = (min: number, max: number): number =>
  min + Math.random() * (max - min);

export const vec3 = (x = 0, y = 0, z = 0): pc.Vec3 => new pc.Vec3(x, y, z);

export const setVec = (target: pc.Vec3, x: number, y: number, z: number): pc.Vec3 => {
  target.x = x;
  target.y = y;
  target.z = z;
  return target;
};

export const horizontalDistanceSq = (a: pc.Vec3, b: pc.Vec3): number => {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return dx * dx + dz * dz;
};

export const yawPitchToForward = (yaw: number, pitch: number): pc.Vec3 => {
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  return new pc.Vec3(-sy * cp, -sp, -cy * cp).normalize();
};

export const yawToRight = (yaw: number): pc.Vec3 => new pc.Vec3(Math.cos(yaw), 0, -Math.sin(yaw));

export const makeAabb = (
  name: string,
  center: pc.Vec3,
  halfExtents: pc.Vec3,
  surface: Aabb["surface"],
  blocksPlayer = true,
  blocksSight = true
): Aabb => ({
  min: new pc.Vec3(center.x - halfExtents.x, center.y - halfExtents.y, center.z - halfExtents.z),
  max: new pc.Vec3(center.x + halfExtents.x, center.y + halfExtents.y, center.z + halfExtents.z),
  surface,
  blocksPlayer,
  blocksSight,
  name
});

export const aabbOverlaps = (a: Aabb, b: Aabb): boolean =>
  a.min.x <= b.max.x &&
  a.max.x >= b.min.x &&
  a.min.y <= b.max.y &&
  a.max.y >= b.min.y &&
  a.min.z <= b.max.z &&
  a.max.z >= b.min.z;

export const rayAabb = (
  origin: pc.Vec3,
  direction: pc.Vec3,
  aabb: Aabb,
  maxDistance: number
): { distance: number; normal: pc.Vec3 } | null => {
  let tMin = 0;
  let tMax = maxDistance;
  const normal = new pc.Vec3();

  const axes: Array<"x" | "y" | "z"> = ["x", "y", "z"];
  for (const axis of axes) {
    const o = origin[axis];
    const d = direction[axis];
    const min = aabb.min[axis];
    const max = aabb.max[axis];

    if (Math.abs(d) < 0.00001) {
      if (o < min || o > max) return null;
      continue;
    }

    let t1 = (min - o) / d;
    let t2 = (max - o) / d;
    let axisNormalSign = -1;
    if (t1 > t2) {
      const temp = t1;
      t1 = t2;
      t2 = temp;
      axisNormalSign = 1;
    }

    if (t1 > tMin) {
      tMin = t1;
      normal.set(0, 0, 0);
      normal[axis] = axisNormalSign;
    }
    tMax = Math.min(tMax, t2);
    if (tMin > tMax) return null;
  }

  if (tMin < 0 || tMin > maxDistance) return null;
  return { distance: tMin, normal };
};

export const raySphere = (
  origin: pc.Vec3,
  direction: pc.Vec3,
  center: pc.Vec3,
  radius: number,
  maxDistance: number
): number | null => {
  const oc = origin.clone().sub(center);
  const b = oc.dot(direction);
  const c = oc.dot(oc) - radius * radius;
  const h = b * b - c;
  if (h < 0) return null;
  const t = -b - Math.sqrt(h);
  if (t < 0 || t > maxDistance) return null;
  return t;
};
