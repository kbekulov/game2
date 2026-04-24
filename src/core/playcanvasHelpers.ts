import * as pc from "playcanvas";
import type { SurfaceType } from "./types.ts";

export interface MaterialSet {
  plasterWarm: pc.StandardMaterial;
  plasterCool: pc.StandardMaterial;
  stone: pc.StandardMaterial;
  darkStone: pc.StandardMaterial;
  cobble: pc.StandardMaterial;
  roof: pc.StandardMaterial;
  wood: pc.StandardMaterial;
  darkWood: pc.StandardMaterial;
  iron: pc.StandardMaterial;
  brass: pc.StandardMaterial;
  glass: pc.StandardMaterial;
  water: pc.StandardMaterial;
  cloth: pc.StandardMaterial;
  enemy: pc.StandardMaterial;
  enemyHit: pc.StandardMaterial;
  muzzle: pc.StandardMaterial;
  casing: pc.StandardMaterial;
  flesh: pc.StandardMaterial;
}

export const makeMaterial = (
  name: string,
  color: pc.Color,
  options: { metalness?: number; gloss?: number; emissive?: pc.Color; opacity?: number } = {}
): pc.StandardMaterial => {
  const material = new pc.StandardMaterial();
  material.name = name;
  material.diffuse = color;
  material.metalness = options.metalness ?? 0;
  material.gloss = options.gloss ?? 0.42;
  if (options.emissive) {
    material.emissive = options.emissive;
    material.emissiveIntensity = 1.25;
  }
  if (options.opacity !== undefined) {
    material.opacity = options.opacity;
    material.blendType = pc.BLEND_NORMAL;
    material.depthWrite = options.opacity > 0.92;
  }
  material.update();
  return material;
};

export const createMaterialSet = (): MaterialSet => ({
  plasterWarm: makeMaterial("Warm stucco", new pc.Color(0.78, 0.63, 0.45), { gloss: 0.23 }),
  plasterCool: makeMaterial("Aged pale stucco", new pc.Color(0.66, 0.68, 0.62), { gloss: 0.2 }),
  stone: makeMaterial("Limestone", new pc.Color(0.54, 0.51, 0.45), { gloss: 0.28 }),
  darkStone: makeMaterial("Weathered dark stone", new pc.Color(0.27, 0.28, 0.27), { gloss: 0.22 }),
  cobble: makeMaterial("Old cobblestone", new pc.Color(0.31, 0.32, 0.3), { gloss: 0.18 }),
  roof: makeMaterial("Terracotta roof", new pc.Color(0.56, 0.22, 0.12), { gloss: 0.16 }),
  wood: makeMaterial("Weathered wood", new pc.Color(0.36, 0.2, 0.11), { gloss: 0.23 }),
  darkWood: makeMaterial("Dark stained wood", new pc.Color(0.18, 0.11, 0.07), { gloss: 0.28 }),
  iron: makeMaterial("Wrought iron", new pc.Color(0.03, 0.035, 0.035), { metalness: 0.8, gloss: 0.42 }),
  brass: makeMaterial("Aged brass", new pc.Color(0.84, 0.61, 0.31), { metalness: 0.65, gloss: 0.38 }),
  glass: makeMaterial("Dim glass", new pc.Color(0.15, 0.2, 0.22), { gloss: 0.76, opacity: 0.54 }),
  water: makeMaterial("Fountain water", new pc.Color(0.22, 0.42, 0.48), { gloss: 0.92, opacity: 0.68 }),
  cloth: makeMaterial("Canvas awning", new pc.Color(0.62, 0.17, 0.12), { gloss: 0.18 }),
  enemy: makeMaterial("Enemy cloth", new pc.Color(0.16, 0.18, 0.18), { gloss: 0.2 }),
  enemyHit: makeMaterial("Enemy hit flash", new pc.Color(0.72, 0.2, 0.13), { gloss: 0.2 }),
  muzzle: makeMaterial("Muzzle flash", new pc.Color(1, 0.66, 0.22), {
    emissive: new pc.Color(1, 0.5, 0.12),
    opacity: 0.86
  }),
  casing: makeMaterial("Casing brass", new pc.Color(0.94, 0.69, 0.28), { metalness: 0.76, gloss: 0.5 }),
  flesh: makeMaterial("Reactive hit marker", new pc.Color(0.55, 0.08, 0.05), { gloss: 0.2 })
});

export const addPrimitive = (
  app: pc.Application,
  name: string,
  type: "box" | "sphere" | "cylinder" | "cone" | "capsule" | "plane",
  position: pc.Vec3,
  scale: pc.Vec3,
  material: pc.Material,
  parent?: pc.Entity,
  rotation?: pc.Vec3
): pc.Entity => {
  const entity = new pc.Entity(name);
  entity.setLocalPosition(position);
  entity.setLocalScale(scale);
  if (rotation) entity.setLocalEulerAngles(rotation.x, rotation.y, rotation.z);
  entity.addComponent("render", {
    type,
    material,
    castShadows: true,
    receiveShadows: true
  });
  (parent ?? app.root).addChild(entity);
  return entity;
};

export const addBox = (
  app: pc.Application,
  name: string,
  position: pc.Vec3,
  scale: pc.Vec3,
  material: pc.Material,
  parent?: pc.Entity,
  rotation?: pc.Vec3
): pc.Entity => addPrimitive(app, name, "box", position, scale, material, parent, rotation);

export const surfaceMaterial = (surface: SurfaceType, materials: MaterialSet): pc.Material => {
  switch (surface) {
    case "metal":
      return materials.iron;
    case "wood":
      return materials.wood;
    case "plaster":
      return materials.plasterWarm;
    case "flesh":
      return materials.flesh;
    case "stone":
    default:
      return materials.stone;
  }
};
