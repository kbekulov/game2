import * as pc from "playcanvas";
import { addBox, addPrimitive, createMaterialSet, type MaterialSet } from "../core/playcanvasHelpers.ts";
import { vec3 } from "../core/math.ts";
import type { SurfaceType } from "../core/types.ts";
import { LevelCollider } from "./LevelCollider.ts";

export interface EnemySpawn {
  id: string;
  position: pc.Vec3;
  patrol: pc.Vec3[];
}

interface BoxSpec {
  name: string;
  position: pc.Vec3;
  scale: pc.Vec3;
  material: pc.Material;
  surface: SurfaceType;
  blocksPlayer?: boolean;
  blocksSight?: boolean;
  rotation?: pc.Vec3;
}

export class TownLevel {
  readonly collider = new LevelCollider();
  readonly materials: MaterialSet;
  readonly enemySpawns: EnemySpawn[] = [];
  private readonly root = new pc.Entity("Old Town Level");

  constructor(private readonly app: pc.Application) {
    this.materials = createMaterialSet();
    this.app.root.addChild(this.root);
  }

  build(): void {
    this.configureScene();
    this.buildFloors();
    this.buildBuildings();
    this.buildPlaza();
    this.buildAlleys();
    this.buildRaisedWalkway();
    this.buildProps();
    this.buildLightingProps();
    this.spawnEnemies();
  }

  private configureScene(): void {
    this.app.scene.ambientLight = new pc.Color(0.39, 0.35, 0.3);
    this.app.scene.fog.type = pc.FOG_LINEAR;
    this.app.scene.fog.color = new pc.Color(0.5, 0.47, 0.4);
    this.app.scene.fog.start = 22;
    this.app.scene.fog.end = 82;

    const sun = new pc.Entity("Late afternoon sun");
    sun.setEulerAngles(43, 138, 0);
    sun.addComponent("light", {
      type: "directional",
      color: new pc.Color(1, 0.82, 0.55),
      intensity: 2.65,
      castShadows: true,
      shadowDistance: 72,
      shadowResolution: 2048,
      normalOffsetBias: 0.05,
      shadowBias: 0.12
    });
    this.app.root.addChild(sun);

    const skyFill = new pc.Entity("Cool overcast fill");
    skyFill.setEulerAngles(-25, -42, 0);
    skyFill.addComponent("light", {
      type: "directional",
      color: new pc.Color(0.45, 0.55, 0.7),
      intensity: 0.58,
      castShadows: false
    });
    this.app.root.addChild(skyFill);
  }

  private buildFloors(): void {
    this.floor("arrival street", 0, 0, 7.6, 44, 0, "stone");
    this.floor("market plaza", 0, 3.7, 27, 22.5, 0, "stone");
    this.floor("north alley", 0, -16, 8, 20, 0, "stone");
    this.floor("civic square", 0, -36, 23, 21, 0, "stone");
    this.floor("east lane", 16.5, 0, 25, 7, 0, "stone");
    this.floor("upper walk", 17, -14, 12, 15, 1.65, "stone");

    for (let i = 0; i < 8; i += 1) {
      const z = -4.3 - i * 1.05;
      const height = (i + 1) * 0.205;
      this.floor(`stone stair ${i + 1}`, 11.2 + i * 0.55, z, 3.4, 1.25, height, "stone");
      this.box({
        name: `visible stair ${i + 1}`,
        position: vec3(11.2 + i * 0.55, height * 0.5 - 0.04, z),
        scale: vec3(3.5, Math.max(0.08, height), 1.08),
        material: this.materials.darkStone,
        surface: "stone",
        blocksPlayer: false,
        blocksSight: false
      });
    }
  }

  private buildBuildings(): void {
    const facadeSpecs: Array<[string, number, number, number, number, number, pc.Material]> = [
      ["arrival west homes", -5.8, 23, 4.2, 34, 5.4, this.materials.plasterWarm],
      ["arrival east homes", 5.8, 24, 4.2, 36, 5.7, this.materials.plasterCool],
      ["plaza west block", -16.3, 4, 6.4, 26, 7.2, this.materials.plasterCool],
      ["plaza east block", 16.3, 7, 6.4, 20, 6.7, this.materials.plasterWarm],
      ["north alley west", -6.6, -16, 4.2, 19, 6.1, this.materials.plasterWarm],
      ["north alley east", 6.6, -16, 4.2, 19, 6.4, this.materials.plasterCool],
      ["civic west", -14.5, -36, 5.6, 23, 7.5, this.materials.plasterWarm],
      ["civic east", 14.5, -36, 5.6, 23, 7.2, this.materials.plasterCool],
      ["east lane north", 16.5, 5.2, 26, 3.4, 5.4, this.materials.plasterWarm],
      ["east lane south", 16.5, -4.9, 18, 3.4, 5.8, this.materials.plasterCool],
      ["upper walk rear", 22.8, -14, 4.2, 16, 6.8, this.materials.plasterWarm]
    ];

    for (const [name, x, z, sx, sz, height, material] of facadeSpecs) {
      this.box({
        name,
        position: vec3(x, height * 0.5, z),
        scale: vec3(sx, height, sz),
        material,
        surface: "plaster"
      });
      this.roof(name, x, z, sx + 0.5, sz + 0.55, height + 0.32);
      this.addWindows(x, z, sx, sz, height);
    }

    this.arch("arrival arch", vec3(0, 1.75, 12.5), 8.8, 4.2, 1.2);
    this.arch("civic arch", vec3(0, 1.9, -25.5), 8.5, 4.6, 1.25);
    this.clockTower();
  }

  private buildPlaza(): void {
    addPrimitive(this.app, "fountain basin", "cylinder", vec3(0, 0.28, 4.4), vec3(4.8, 0.56, 4.8), this.materials.stone, this.root);
    addPrimitive(this.app, "fountain water", "cylinder", vec3(0, 0.59, 4.4), vec3(4.25, 0.08, 4.25), this.materials.water, this.root);
    addPrimitive(this.app, "fountain pedestal", "cylinder", vec3(0, 1.0, 4.4), vec3(1.15, 0.86, 1.15), this.materials.darkStone, this.root);
    addPrimitive(this.app, "fountain statue", "capsule", vec3(0, 1.9, 4.4), vec3(0.58, 1.65, 0.58), this.materials.stone, this.root);
    this.collider.addSolid("fountain basin", vec3(0, 0.4, 4.4), vec3(5, 0.8, 5), "stone", true, false);

    this.box({ name: "market stall counter", position: vec3(-8, 0.55, 8.8), scale: vec3(4.1, 1.1, 1.2), material: this.materials.wood, surface: "wood" });
    this.box({ name: "market stall awning", position: vec3(-8, 2.45, 8.8), scale: vec3(4.8, 0.16, 2.4), material: this.materials.cloth, surface: "wood", blocksPlayer: false, blocksSight: false, rotation: vec3(0, 0, -4) });
    this.box({ name: "stacked crates", position: vec3(6.7, 0.75, 11), scale: vec3(2.2, 1.5, 1.4), material: this.materials.wood, surface: "wood" });
    this.box({ name: "stone planter", position: vec3(8.4, 0.48, -2.6), scale: vec3(3.2, 0.96, 1.25), material: this.materials.stone, surface: "stone" });
  }

  private buildAlleys(): void {
    for (let i = 0; i < 13; i += 1) {
      const x = i % 2 === 0 ? -4.22 : 4.22;
      const z = 28 - i * 3.2;
      this.box({
        name: `wall lantern bracket ${i}`,
        position: vec3(x, 2.8, z),
        scale: vec3(0.12, 0.12, 0.75),
        material: this.materials.iron,
        surface: "metal",
        blocksPlayer: false,
        blocksSight: false
      });
    }

    this.box({ name: "narrow alley barrel A", position: vec3(-2.65, 0.58, -10.6), scale: vec3(0.92, 1.16, 0.92), material: this.materials.darkWood, surface: "wood" });
    this.box({ name: "narrow alley barrel B", position: vec3(2.7, 0.58, -17.9), scale: vec3(0.9, 1.16, 0.9), material: this.materials.darkWood, surface: "wood" });
    this.box({ name: "civic low wall", position: vec3(-3.6, 0.65, -34.1), scale: vec3(4.8, 1.3, 0.78), material: this.materials.stone, surface: "stone" });
    this.box({ name: "civic crates", position: vec3(4.2, 0.78, -31.4), scale: vec3(2.3, 1.56, 1.4), material: this.materials.wood, surface: "wood" });
  }

  private buildRaisedWalkway(): void {
    this.box({
      name: "upper walkway parapet left",
      position: vec3(12.4, 2.1, -14),
      scale: vec3(0.42, 0.9, 15),
      material: this.materials.stone,
      surface: "stone"
    });
    this.box({
      name: "upper walkway rear cover",
      position: vec3(17, 2.22, -20.9),
      scale: vec3(9.2, 1.1, 0.5),
      material: this.materials.stone,
      surface: "stone"
    });

    for (let i = 0; i < 5; i += 1) {
      this.box({
        name: `balcony rail ${i}`,
        position: vec3(13.2 + i * 1.6, 2.44, -6.55),
        scale: vec3(0.08, 0.72, 0.08),
        material: this.materials.iron,
        surface: "metal",
        blocksPlayer: false,
        blocksSight: false
      });
    }
    this.box({
      name: "balcony top rail",
      position: vec3(16.4, 2.84, -6.55),
      scale: vec3(7.3, 0.08, 0.08),
      material: this.materials.iron,
      surface: "metal",
      blocksPlayer: false,
      blocksSight: false
    });
  }

  private buildProps(): void {
    const cover: Array<[string, number, number, number, number, number, SurfaceType, pc.Material]> = [
      ["arrival cart", -2.1, 18.1, 2.9, 1.15, 1.8, "wood", this.materials.wood],
      ["stone bench plaza", 4.8, 1.3, 3.2, 0.65, 0.8, "stone", this.materials.stone],
      ["metal kiosk", 10.2, 1.4, 1.3, 1.9, 1.3, "metal", this.materials.iron],
      ["wood barricade", -1.8, -6.7, 3.2, 1.1, 0.9, "wood", this.materials.wood],
      ["civic fountain cover", 2.6, -39.1, 2.4, 1.1, 2.4, "stone", this.materials.stone]
    ];

    for (const [name, x, z, sx, sy, sz, surface, material] of cover) {
      this.box({ name, position: vec3(x, sy * 0.5, z), scale: vec3(sx, sy, sz), material, surface });
    }

    for (let i = 0; i < 7; i += 1) {
      const z = 24 - i * 7.3;
      this.cobbleStrip(z);
    }
  }

  private buildLightingProps(): void {
    const lampPositions = [
      vec3(-11.8, 2.9, 11.4),
      vec3(11.8, 2.9, 5.2),
      vec3(-4.5, 2.6, -12.4),
      vec3(4.5, 2.6, -20.3),
      vec3(-9.6, 3.1, -32.1),
      vec3(11.2, 3.2, -38.4)
    ];
    lampPositions.forEach((position, index) => {
      addPrimitive(this.app, `lamp glass ${index}`, "sphere", position, vec3(0.28, 0.28, 0.28), this.materials.brass, this.root);
      const light = new pc.Entity(`warm lamp ${index}`);
      light.setLocalPosition(position);
      light.addComponent("light", {
        type: "omni",
        color: new pc.Color(1, 0.68, 0.38),
        intensity: 0.72,
        range: 9,
        castShadows: false
      });
      this.root.addChild(light);
    });
  }

  private spawnEnemies(): void {
    this.enemySpawns.push(
      { id: "plaza-west", position: vec3(-7.5, 0, 2.2), patrol: [vec3(-8.8, 0, 2.2), vec3(-5.6, 0, 8.5)] },
      { id: "plaza-east", position: vec3(8.8, 0, 7.2), patrol: [vec3(8.8, 0, 7.2), vec3(6.2, 0, -1.4)] },
      { id: "north-alley", position: vec3(2.6, 0, -16.7), patrol: [vec3(2.6, 0, -16.7), vec3(-2.4, 0, -8.7)] },
      { id: "upper-walk", position: vec3(18.1, 1.65, -14.8), patrol: [vec3(18.1, 1.65, -14.8), vec3(14.1, 1.65, -18.6)] },
      { id: "civic-left", position: vec3(-6.2, 0, -35.7), patrol: [vec3(-7.6, 0, -37.8), vec3(-1.6, 0, -31.2)] },
      { id: "civic-right", position: vec3(7.3, 0, -39.5), patrol: [vec3(7.3, 0, -39.5), vec3(2.4, 0, -33.4)] }
    );
  }

  private box(spec: BoxSpec): pc.Entity {
    const entity = addBox(this.app, spec.name, spec.position, spec.scale, spec.material, this.root, spec.rotation);
    if (spec.blocksPlayer ?? true) {
      this.collider.addSolid(spec.name, spec.position, spec.scale, spec.surface, true, spec.blocksSight ?? true);
    } else if (spec.blocksSight) {
      this.collider.addSolid(spec.name, spec.position, spec.scale, spec.surface, false, true);
    }
    return entity;
  }

  private floor(name: string, x: number, z: number, sx: number, sz: number, y: number, surface: SurfaceType): void {
    addBox(this.app, `${name} cobbles`, vec3(x, y - 0.055, z), vec3(sx, 0.11, sz), this.materials.cobble, this.root);
    this.collider.addFloor(name, x - sx * 0.5, x + sx * 0.5, z - sz * 0.5, z + sz * 0.5, y, surface);
  }

  private roof(name: string, x: number, z: number, sx: number, sz: number, y: number): void {
    this.box({
      name: `${name} roof`,
      position: vec3(x, y, z),
      scale: vec3(sx, 0.32, sz),
      material: this.materials.roof,
      surface: "stone",
      blocksPlayer: false,
      blocksSight: true
    });
  }

  private addWindows(x: number, z: number, sx: number, sz: number, height: number): void {
    const faceX = x + Math.sign(-x || 1) * sx * 0.51;
    const count = Math.max(2, Math.floor(sz / 5));
    for (let i = 0; i < count; i += 1) {
      const localZ = z - sz * 0.32 + (i / Math.max(1, count - 1)) * sz * 0.64;
      for (const y of [2.4, Math.min(height - 1.1, 4.3)]) {
        this.box({
          name: `window ${x}:${z}:${i}:${y}`,
          position: vec3(faceX, y, localZ),
          scale: vec3(0.08, 0.82, 0.58),
          material: this.materials.glass,
          surface: "wood",
          blocksPlayer: false,
          blocksSight: false
        });
        this.box({
          name: `shutter ${x}:${z}:${i}:${y}`,
          position: vec3(faceX + Math.sign(faceX) * 0.025, y, localZ + 0.48),
          scale: vec3(0.07, 0.88, 0.17),
          material: this.materials.darkWood,
          surface: "wood",
          blocksPlayer: false,
          blocksSight: false
        });
        this.box({
          name: `shutter b ${x}:${z}:${i}:${y}`,
          position: vec3(faceX + Math.sign(faceX) * 0.025, y, localZ - 0.48),
          scale: vec3(0.07, 0.88, 0.17),
          material: this.materials.darkWood,
          surface: "wood",
          blocksPlayer: false,
          blocksSight: false
        });
      }
    }
  }

  private arch(name: string, position: pc.Vec3, width: number, height: number, depth: number): void {
    const sideWidth = 1.05;
    this.box({ name: `${name} left pier`, position: vec3(position.x - width * 0.5 + sideWidth * 0.5, position.y, position.z), scale: vec3(sideWidth, height, depth), material: this.materials.stone, surface: "stone" });
    this.box({ name: `${name} right pier`, position: vec3(position.x + width * 0.5 - sideWidth * 0.5, position.y, position.z), scale: vec3(sideWidth, height, depth), material: this.materials.stone, surface: "stone" });
    this.box({ name: `${name} lintel`, position: vec3(position.x, position.y + height * 0.5 - 0.42, position.z), scale: vec3(width, 0.84, depth), material: this.materials.stone, surface: "stone" });
    addPrimitive(this.app, `${name} curved keystone`, "cylinder", vec3(position.x, position.y + height * 0.28, position.z), vec3(width * 0.62, 0.36, depth * 0.9), this.materials.stone, this.root, vec3(90, 0, 0));
  }

  private clockTower(): void {
    this.box({ name: "civic tower base", position: vec3(0, 4.2, -46.2), scale: vec3(6.8, 8.4, 4.2), material: this.materials.plasterWarm, surface: "plaster" });
    this.roof("civic tower", 0, -46.2, 7.5, 4.9, 8.7);
    addPrimitive(this.app, "clock face", "cylinder", vec3(0, 5.6, -43.96), vec3(1.5, 0.08, 1.5), this.materials.brass, this.root, vec3(90, 0, 0));
  }

  private cobbleStrip(z: number): void {
    for (let i = 0; i < 7; i += 1) {
      const x = -3 + i;
      const material = i % 2 === 0 ? this.materials.darkStone : this.materials.stone;
      addBox(this.app, `individual cobble ${z}:${i}`, vec3(x, 0.01, z + (i % 3) * 0.16), vec3(0.72, 0.03, 0.42), material, this.root);
    }
  }
}
