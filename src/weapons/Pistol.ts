import * as pc from "playcanvas";
import { GAME_CONFIG } from "../config/gameConfig.ts";
import { addBox, addPrimitive, type MaterialSet } from "../core/playcanvasHelpers.ts";
import { clamp, damp, randomRange, vec3 } from "../core/math.ts";
import type { PlayerFrame, ShotResult, WeaponFrame } from "../core/types.ts";
import type { AudioManager } from "../audio/AudioManager.ts";

type WeaponAction = "ready" | "shoot" | "reloadPartial" | "reloadEmpty" | "pressCheck" | "dryFire";
type ShotResolver = (origin: pc.Vec3, direction: pc.Vec3, maxRange: number) => ShotResult;

interface TempEntity {
  entity: pc.Entity;
  velocity: pc.Vec3;
  angular: pc.Vec3;
  life: number;
  maxLife: number;
}

export class Pistol {
  private readonly root = new pc.Entity("First-person weapon root");
  private readonly weaponPivot = new pc.Entity("Pistol pivot");
  private readonly slide: pc.Entity;
  private readonly magazine: pc.Entity;
  private readonly muzzleFlash: pc.Entity;
  private readonly tempEntities: TempEntity[] = [];
  private action: WeaponAction = "ready";
  private actionTime = 0;
  private cooldown = 0;
  private muzzleTimer = 0;
  private magazineRounds: number = GAME_CONFIG.weapon.magazineSize;
  private reserveAmmo: number = GAME_CONFIG.weapon.reserveAmmo;
  private chambered = true;
  private slideLocked = false;
  private recoilKick = 0;
  private swayX = 0;
  private swayY = 0;
  private microSeed = Math.random() * 100;
  private magAudioPlayed = false;
  private slideAudioPlayed = false;

  constructor(
    private readonly app: pc.Application,
    camera: pc.Entity,
    private readonly materials: MaterialSet,
    private readonly audio: AudioManager
  ) {
    camera.addChild(this.root);
    this.root.addChild(this.weaponPivot);

    const polymer = new pc.StandardMaterial();
    polymer.name = "matte polymer frame";
    polymer.diffuse = new pc.Color(0.018, 0.019, 0.018);
    polymer.gloss = 0.28;
    polymer.update();

    const steel = new pc.StandardMaterial();
    steel.name = "dark nitrided slide";
    steel.diffuse = new pc.Color(0.045, 0.047, 0.046);
    steel.metalness = 0.4;
    steel.gloss = 0.52;
    steel.update();

    const skin = new pc.StandardMaterial();
    skin.name = "glove and sleeve";
    skin.diffuse = new pc.Color(0.025, 0.027, 0.026);
    skin.gloss = 0.18;
    skin.update();

    addPrimitive(this.app, "support sleeve", "capsule", vec3(-0.28, -0.18, -0.2), vec3(0.13, 0.54, 0.13), skin, this.root, vec3(58, -18, 8));
    addPrimitive(this.app, "strong hand", "sphere", vec3(0.15, -0.23, -0.43), vec3(0.17, 0.12, 0.2), skin, this.root, vec3(0, 0, 0));
    addPrimitive(this.app, "support hand", "sphere", vec3(-0.08, -0.26, -0.38), vec3(0.15, 0.1, 0.17), skin, this.root, vec3(0, 0, 0));

    addBox(this.app, "pistol frame", vec3(0.13, -0.13, -0.58), vec3(0.22, 0.18, 0.36), polymer, this.weaponPivot);
    this.slide = addBox(this.app, "pistol slide", vec3(0.13, -0.01, -0.61), vec3(0.24, 0.14, 0.48), steel, this.weaponPivot);
    addBox(this.app, "front sight", vec3(0.13, 0.075, -0.82), vec3(0.045, 0.035, 0.04), steel, this.weaponPivot);
    addBox(this.app, "rear sight", vec3(0.13, 0.078, -0.43), vec3(0.1, 0.035, 0.035), steel, this.weaponPivot);
    addBox(this.app, "barrel hood", vec3(0.13, -0.01, -0.84), vec3(0.11, 0.075, 0.07), this.materials.iron, this.weaponPivot);
    addBox(this.app, "trigger guard", vec3(0.13, -0.24, -0.69), vec3(0.18, 0.11, 0.12), polymer, this.weaponPivot);
    addBox(this.app, "trigger", vec3(0.13, -0.245, -0.68), vec3(0.035, 0.09, 0.03), steel, this.weaponPivot);
    addBox(this.app, "grip", vec3(0.13, -0.36, -0.45), vec3(0.19, 0.39, 0.18), polymer, this.weaponPivot, vec3(-12, 0, 0));
    this.magazine = addBox(this.app, "magazine", vec3(0.13, -0.52, -0.43), vec3(0.15, 0.32, 0.13), steel, this.weaponPivot, vec3(-12, 0, 0));

    this.muzzleFlash = addPrimitive(this.app, "muzzle flash", "cone", vec3(0.13, -0.02, -0.98), vec3(0.28, 0.28, 0.28), this.materials.muzzle, this.weaponPivot, vec3(-90, 0, 0));
    this.muzzleFlash.enabled = false;
    this.reset();
  }

  reset(): void {
    this.magazineRounds = GAME_CONFIG.weapon.magazineSize;
    this.reserveAmmo = GAME_CONFIG.weapon.reserveAmmo;
    this.chambered = true;
    this.slideLocked = false;
    this.action = "ready";
    this.actionTime = 0;
    this.cooldown = 0;
    this.recoilKick = 0;
    this.tempEntities.splice(0).forEach((item) => item.entity.destroy());
  }

  update(dt: number, frame: PlayerFrame): WeaponFrame {
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.muzzleTimer = Math.max(0, this.muzzleTimer - dt);
    this.muzzleFlash.enabled = this.muzzleTimer > 0;

    this.updateAction(dt);
    this.updatePose(dt, frame);
    this.updateTempEntities(dt);

    return this.getFrame();
  }

  tryFire(origin: pc.Vec3, direction: pc.Vec3, frame: PlayerFrame, resolveShot: ShotResolver): ShotResult | null {
    if (!this.canInterruptForShot()) return null;
    if (this.cooldown > 0) return null;
    this.cooldown = GAME_CONFIG.weapon.fireInterval;

    if (!this.chambered) {
      this.action = "dryFire";
      this.actionTime = 0;
      this.audio.playDryFire();
      this.recoilKick = Math.max(this.recoilKick, 0.08);
      return { hit: false, enemyHit: false, killedEnemy: false };
    }

    this.audio.playShot();
    this.action = "shoot";
    this.actionTime = 0;
    this.muzzleTimer = GAME_CONFIG.weapon.muzzleFlashTime;
    this.recoilKick = 1;
    this.consumeRound();
    this.spawnCasing(frame);

    const shot = resolveShot(origin, direction, GAME_CONFIG.weapon.maxRange);
    if (shot.hit && shot.hitPoint && shot.normal && shot.surface) {
      this.spawnImpact(shot.hitPoint, shot.normal, shot.surface);
      this.audio.playImpact(shot.surface);
      if (shot.enemyHit) this.audio.playHitMarker();
    }
    return shot;
  }

  requestReload(): void {
    if (this.isBusy()) return;
    if (this.reserveAmmo <= 0) return;
    if (this.magazineRounds >= GAME_CONFIG.weapon.magazineSize && this.chambered) return;

    this.action = this.slideLocked || !this.chambered ? "reloadEmpty" : "reloadPartial";
    this.actionTime = 0;
    this.magAudioPlayed = false;
    this.slideAudioPlayed = false;
  }

  requestPressCheck(): void {
    if (this.isBusy()) return;
    this.action = "pressCheck";
    this.actionTime = 0;
    this.slideAudioPlayed = false;
    this.audio.playPressCheck();
  }

  getFrame(): WeaponFrame {
    const loaded = this.magazineRounds + (this.chambered ? 1 : 0);
    return {
      ammoInMagazine: loaded,
      reserveAmmo: this.reserveAmmo,
      chambered: this.chambered,
      slideLocked: this.slideLocked,
      stateLabel: this.labelForState(),
      canShoot: this.chambered && !this.isBusy()
    };
  }

  private updateAction(dt: number): void {
    if (this.action === "ready") return;
    this.actionTime += dt;

    if ((this.action === "reloadPartial" || this.action === "reloadEmpty") && !this.magAudioPlayed && this.actionTime > 0.36) {
      this.audio.playMagazineOut();
      this.magAudioPlayed = true;
    }
    if ((this.action === "reloadPartial" || this.action === "reloadEmpty") && this.actionTime > 0.78 && this.actionTime - dt <= 0.78) {
      this.audio.playMagazineIn();
    }
    if (this.action === "reloadEmpty" && !this.slideAudioPlayed && this.actionTime > 1.22) {
      this.audio.playSlide();
      this.slideAudioPlayed = true;
    }

    const duration = this.getActionDuration(this.action);
    if (this.actionTime < duration) return;

    if (this.action === "reloadPartial" || this.action === "reloadEmpty") this.finishReload(this.action === "reloadEmpty");
    this.action = "ready";
    this.actionTime = 0;
  }

  private updatePose(dt: number, frame: PlayerFrame): void {
    const speed01 = clamp(frame.speed / GAME_CONFIG.movement.sprintSpeed, 0, 1);
    const sprint = frame.sprinting ? 1 : 0;
    const t = performance.now() * 0.001 + this.microSeed;
    const idle = Math.sin(t * 1.4) * 0.006;
    const moveBob = Math.sin(t * (frame.sprinting ? 13 : 9)) * 0.018 * speed01;
    const moveSide = Math.sin(t * (frame.sprinting ? 6.5 : 4.6)) * 0.014 * speed01;

    this.swayX = damp(this.swayX, clamp(-frame.lookDeltaX * 0.0012, -0.07, 0.07), 13, dt);
    this.swayY = damp(this.swayY, clamp(-frame.lookDeltaY * 0.001, -0.052, 0.052), 13, dt);

    let x = 0.19 + this.swayX + moveSide + sprint * 0.12;
    let y = -0.26 + idle + moveBob - sprint * 0.13 + this.swayY;
    let z = -0.24 - sprint * 0.08;
    let rx = -1.5 - speed01 * 1.8 + sprint * 11;
    let ry = -1.5 + this.swayX * 38 + sprint * 14;
    let rz = -1.5 + moveSide * 90 - sprint * 12;

    const actionPose = this.getActionPose();
    x += actionPose.x;
    y += actionPose.y;
    z += actionPose.z;
    rx += actionPose.rx;
    ry += actionPose.ry;
    rz += actionPose.rz;

    this.recoilKick = damp(this.recoilKick, 0, 18, dt);
    z += this.recoilKick * 0.085;
    y += this.recoilKick * 0.018;
    rx -= this.recoilKick * 7.5;

    this.root.setLocalPosition(x, y, z);
    this.root.setLocalEulerAngles(rx, ry, rz);

    const slideBack = this.slideLocked ? 0.07 : 0;
    const fireSlide = this.action === "shoot" ? (1 - clamp(this.actionTime / 0.11, 0, 1)) * 0.105 : 0;
    const press = this.action === "pressCheck" ? Math.sin(clamp(this.actionTime / GAME_CONFIG.weapon.pressCheckTime, 0, 1) * Math.PI) * 0.045 : 0;
    this.slide.setLocalPosition(0.13, -0.01, -0.61 + slideBack + fireSlide + press);

    const magDrop = this.action === "reloadPartial" || this.action === "reloadEmpty" ? this.magazineDropCurve() : 0;
    this.magazine.setLocalPosition(0.13, -0.52 - magDrop * 0.35, -0.43 + magDrop * 0.05);
  }

  private getActionPose(): { x: number; y: number; z: number; rx: number; ry: number; rz: number } {
    const zero = { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0 };
    if (this.action === "ready") return zero;
    const p = clamp(this.actionTime / this.getActionDuration(this.action), 0, 1);
    const pulse = Math.sin(p * Math.PI);

    if (this.action === "shoot") return { x: randomRange(-0.004, 0.004), y: 0.016, z: 0.055 * (1 - p), rx: -5.2 * (1 - p), ry: randomRange(-1.2, 1.2), rz: randomRange(-0.8, 0.8) };
    if (this.action === "dryFire") return { x: 0, y: -0.006 * pulse, z: 0.014 * pulse, rx: -1.8 * pulse, ry: 0, rz: 0 };
    if (this.action === "pressCheck") return { x: -0.055 * pulse, y: 0.035 * pulse, z: 0.02 * pulse, rx: 4.5 * pulse, ry: -9 * pulse, rz: 6 * pulse };
    if (this.action === "reloadPartial") return { x: -0.09 * pulse, y: -0.11 * pulse, z: 0.12 * pulse, rx: 16 * pulse, ry: -22 * pulse, rz: 12 * pulse };
    if (this.action === "reloadEmpty") return { x: -0.12 * pulse, y: -0.14 * pulse, z: 0.16 * pulse, rx: 21 * pulse, ry: -28 * pulse, rz: 16 * pulse };
    return zero;
  }

  private magazineDropCurve(): number {
    const duration = this.getActionDuration(this.action);
    const p = clamp(this.actionTime / duration, 0, 1);
    if (p < 0.25) return p / 0.25;
    if (p < 0.55) return 1;
    if (p < 0.78) return 1 - (p - 0.55) / 0.23;
    return 0;
  }

  private consumeRound(): void {
    if (this.magazineRounds > 0) {
      this.magazineRounds -= 1;
      this.chambered = true;
      this.slideLocked = false;
      return;
    }
    this.chambered = false;
    this.slideLocked = true;
  }

  private finishReload(empty: boolean): void {
    if (empty) {
      const toLoad = Math.min(GAME_CONFIG.weapon.magazineSize, this.reserveAmmo);
      this.reserveAmmo -= toLoad;
      if (toLoad > 0) {
        this.chambered = true;
        this.magazineRounds = Math.max(0, toLoad - 1);
        this.slideLocked = false;
      }
      return;
    }

    const needed = GAME_CONFIG.weapon.magazineSize - this.magazineRounds;
    const loaded = Math.min(needed, this.reserveAmmo);
    this.magazineRounds += loaded;
    this.reserveAmmo -= loaded;
    this.slideLocked = false;
  }

  private spawnCasing(frame: PlayerFrame): void {
    const casing = addBox(this.app, "ejected casing", this.weaponPivot.getPosition().clone(), vec3(0.04, 0.025, 0.1), this.materials.casing);
    const velocity = frame.right
      .clone()
      .mulScalar(randomRange(1.7, 2.4))
      .add(new pc.Vec3(0, randomRange(1.0, 1.45), 0))
      .add(frame.forward.clone().mulScalar(randomRange(-0.25, 0.2)));
    this.tempEntities.push({
      entity: casing,
      velocity,
      angular: vec3(randomRange(200, 460), randomRange(-220, 220), randomRange(-360, 360)),
      life: GAME_CONFIG.weapon.casingLife,
      maxLife: GAME_CONFIG.weapon.casingLife
    });
  }

  private spawnImpact(point: pc.Vec3, normal: pc.Vec3, surface: ShotResult["surface"]): void {
    const material = surface === "metal" ? this.materials.brass : surface === "wood" ? this.materials.wood : surface === "flesh" ? this.materials.flesh : this.materials.darkStone;
    const impact = addPrimitive(
      this.app,
      "bullet impact",
      "sphere",
      point.clone().add(normal.clone().mulScalar(0.025)),
      vec3(0.06, 0.06, 0.06),
      material
    );
    this.tempEntities.push({
      entity: impact,
      velocity: normal.clone().mulScalar(0.18),
      angular: vec3(0, 0, 0),
      life: 0.55,
      maxLife: 0.55
    });
  }

  private updateTempEntities(dt: number): void {
    for (let i = this.tempEntities.length - 1; i >= 0; i -= 1) {
      const item = this.tempEntities[i];
      item.life -= dt;
      item.velocity.y -= 6.4 * dt;
      const pos = item.entity.getPosition().clone().add(item.velocity.clone().mulScalar(dt));
      item.entity.setPosition(pos);
      const euler = item.entity.getEulerAngles();
      item.entity.setEulerAngles(euler.x + item.angular.x * dt, euler.y + item.angular.y * dt, euler.z + item.angular.z * dt);
      const scale = clamp(item.life / item.maxLife, 0, 1);
      if (item.entity.name === "bullet impact") item.entity.setLocalScale(0.06 * scale, 0.06 * scale, 0.06 * scale);
      if (item.life <= 0) {
        item.entity.destroy();
        this.tempEntities.splice(i, 1);
      }
    }
  }

  private canInterruptForShot(): boolean {
    return this.action === "ready" || this.action === "shoot" || this.action === "dryFire";
  }

  private isBusy(): boolean {
    return this.action === "reloadPartial" || this.action === "reloadEmpty" || this.action === "pressCheck";
  }

  private getActionDuration(action: WeaponAction): number {
    if (action === "reloadPartial") return GAME_CONFIG.weapon.reloadPartialTime;
    if (action === "reloadEmpty") return GAME_CONFIG.weapon.reloadEmptyTime;
    if (action === "pressCheck") return GAME_CONFIG.weapon.pressCheckTime;
    if (action === "dryFire") return GAME_CONFIG.weapon.dryFireTime;
    if (action === "shoot") return 0.16;
    return 0;
  }

  private labelForState(): string {
    if (this.action === "reloadEmpty") return "empty reload";
    if (this.action === "reloadPartial") return "tactical reload";
    if (this.action === "pressCheck") return this.chambered ? "press-check: ready" : "press-check: empty";
    if (this.slideLocked) return "slide locked";
    if (!this.chambered) return "empty";
    if (this.action === "dryFire") return "dry fire";
    return "ready";
  }
}
