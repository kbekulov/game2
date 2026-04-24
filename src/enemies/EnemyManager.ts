import * as pc from "playcanvas";
import { GAME_CONFIG } from "../config/gameConfig.ts";
import { horizontalDistanceSq, raySphere, vec3 } from "../core/math.ts";
import { addBox, addPrimitive, type MaterialSet } from "../core/playcanvasHelpers.ts";
import type { AudioManager } from "../audio/AudioManager.ts";
import type { LevelCollider } from "../level/LevelCollider.ts";
import type { EnemySpawn } from "../level/TownLevel.ts";
import type { PlayerFrame, RayHit, ShotResult } from "../core/types.ts";

type EnemyState = "patrol" | "chase" | "attack" | "dead";

interface EnemyNpc {
  id: string;
  root: pc.Entity;
  body: pc.Entity;
  head: pc.Entity;
  muzzle: pc.Entity;
  patrol: pc.Vec3[];
  patrolIndex: number;
  health: number;
  state: EnemyState;
  fireCooldown: number;
  flashTimer: number;
  hitTimer: number;
  yaw: number;
}

export class EnemyManager {
  private readonly enemies: EnemyNpc[] = [];
  private readonly root = new pc.Entity("Enemies");

  constructor(
    private readonly app: pc.Application,
    private readonly collider: LevelCollider,
    private readonly materials: MaterialSet,
    private readonly audio: AudioManager,
    private readonly onPlayerDamage: (amount: number) => void
  ) {
    this.app.root.addChild(this.root);
  }

  spawn(spawns: EnemySpawn[]): void {
    this.clear();
    for (const spawn of spawns) this.createEnemy(spawn);
  }

  clear(): void {
    for (const enemy of this.enemies) enemy.root.destroy();
    this.enemies.length = 0;
  }

  update(dt: number, player: PlayerFrame): void {
    for (const enemy of this.enemies) {
      if (enemy.state === "dead") continue;
      enemy.fireCooldown = Math.max(0, enemy.fireCooldown - dt);
      enemy.flashTimer = Math.max(0, enemy.flashTimer - dt);
      enemy.hitTimer = Math.max(0, enemy.hitTimer - dt);
      enemy.muzzle.enabled = enemy.flashTimer > 0;
      enemy.body.render!.material = enemy.hitTimer > 0 ? this.materials.enemyHit : this.materials.enemy;

      const enemyEye = enemy.root.getPosition().clone().add(vec3(0, 1.3, 0));
      const toPlayer = player.cameraPosition.clone().sub(enemyEye);
      const distance = toPlayer.length();
      const visible = distance <= GAME_CONFIG.enemy.sightRange && this.collider.hasLineOfSight(enemyEye, player.cameraPosition);

      if (visible) {
        enemy.state = distance <= GAME_CONFIG.enemy.attackRange ? "attack" : "chase";
      } else if (enemy.state !== "patrol") {
        enemy.state = "patrol";
      }

      if (enemy.state === "attack") {
        this.face(enemy, player.position, dt, 12);
        if (enemy.fireCooldown <= 0) this.enemyFire(enemy, player);
      } else {
        const target = enemy.state === "chase" ? player.position : enemy.patrol[enemy.patrolIndex];
        this.moveToward(enemy, target, dt, enemy.state === "chase" ? GAME_CONFIG.enemy.chaseSpeed : GAME_CONFIG.enemy.moveSpeed);
        if (enemy.state === "patrol" && horizontalDistanceSq(enemy.root.getPosition(), target) < 0.7) {
          enemy.patrolIndex = (enemy.patrolIndex + 1) % enemy.patrol.length;
        }
      }
    }
  }

  raycast(origin: pc.Vec3, direction: pc.Vec3, maxDistance: number, worldHit: RayHit | null): ShotResult {
    const worldDistance = worldHit?.distance ?? maxDistance;
    let bestEnemy: EnemyNpc | null = null;
    let bestDistance = worldDistance;
    let bestCenter: pc.Vec3 | null = null;

    for (const enemy of this.enemies) {
      if (enemy.state === "dead") continue;
      const center = enemy.root.getPosition().clone().add(vec3(0, 1.05, 0));
      const distance = raySphere(origin, direction, center, 0.58, bestDistance);
      if (distance !== null && distance < bestDistance) {
        bestEnemy = enemy;
        bestDistance = distance;
        bestCenter = center;
      }
    }

    if (bestEnemy && bestCenter) {
      bestEnemy.health -= GAME_CONFIG.weapon.damage;
      bestEnemy.hitTimer = GAME_CONFIG.enemy.hitStunTime;
      const point = origin.clone().add(direction.clone().mulScalar(bestDistance));
      const normal = point.clone().sub(bestCenter).normalize();
      if (bestEnemy.health <= 0) this.killEnemy(bestEnemy, direction);
      return {
        hit: true,
        enemyHit: true,
        killedEnemy: bestEnemy.state === "dead",
        hitPoint: point,
        normal,
        surface: "flesh",
        distance: bestDistance
      };
    }

    if (worldHit) {
      return {
        hit: true,
        enemyHit: false,
        killedEnemy: false,
        hitPoint: worldHit.point,
        normal: worldHit.normal,
        surface: worldHit.surface,
        distance: worldHit.distance
      };
    }

    return { hit: false, enemyHit: false, killedEnemy: false };
  }

  getAliveCount(): number {
    return this.enemies.filter((enemy) => enemy.state !== "dead").length;
  }

  getTotalCount(): number {
    return this.enemies.length;
  }

  private createEnemy(spawn: EnemySpawn): void {
    const root = new pc.Entity(`enemy ${spawn.id}`);
    root.setPosition(spawn.position);
    this.root.addChild(root);

    const body = addPrimitive(this.app, `${spawn.id} body`, "capsule", vec3(0, 0.9, 0), vec3(0.5, 1.25, 0.5), this.materials.enemy, root);
    const head = addPrimitive(this.app, `${spawn.id} head`, "sphere", vec3(0, 1.67, 0), vec3(0.34, 0.34, 0.34), this.materials.enemy, root);
    addBox(this.app, `${spawn.id} carbine silhouette`, vec3(0.28, 1.17, -0.32), vec3(0.1, 0.09, 0.72), this.materials.iron, root, vec3(0, -8, 0));
    const muzzle = addPrimitive(this.app, `${spawn.id} muzzle`, "sphere", vec3(0.31, 1.18, -0.78), vec3(0.16, 0.16, 0.16), this.materials.muzzle, root);
    muzzle.enabled = false;

    this.enemies.push({
      id: spawn.id,
      root,
      body,
      head,
      muzzle,
      patrol: spawn.patrol,
      patrolIndex: 0,
      health: GAME_CONFIG.enemy.health,
      state: "patrol",
      fireCooldown: 0.2 + Math.random() * 0.6,
      flashTimer: 0,
      hitTimer: 0,
      yaw: 0
    });
  }

  private moveToward(enemy: EnemyNpc, target: pc.Vec3, dt: number, speed: number): void {
    const position = enemy.root.getPosition();
    const delta = target.clone().sub(position);
    delta.y = 0;
    if (delta.lengthSq() < 0.01) return;
    delta.normalize();
    this.face(enemy, position.clone().add(delta), dt, 9);

    const next = position.clone().add(delta.mulScalar(speed * dt));
    next.y = this.collider.getGroundHeight(next.x, next.z);
    if (!this.collider.collidesPlayer(next, 0.38, 1.7)) {
      enemy.root.setPosition(next);
    }
  }

  private face(enemy: EnemyNpc, target: pc.Vec3, dt: number, speed: number): void {
    const position = enemy.root.getPosition();
    const dx = target.x - position.x;
    const dz = target.z - position.z;
    const desired = Math.atan2(-dx, -dz);
    let diff = desired - enemy.yaw;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    enemy.yaw += diff * Math.min(1, dt * speed);
    enemy.root.setEulerAngles(0, enemy.yaw * pc.math.RAD_TO_DEG, 0);
  }

  private enemyFire(enemy: EnemyNpc, player: PlayerFrame): void {
    enemy.fireCooldown = GAME_CONFIG.enemy.fireInterval + Math.random() * 0.35;
    enemy.flashTimer = 0.07;
    this.audio.playEnemyShot();

    const enemyEye = enemy.root.getPosition().clone().add(vec3(0, 1.25, 0));
    const distance = enemyEye.distance(player.cameraPosition);
    const accuracy = distance < 9 ? 0.72 : 0.52;
    if (Math.random() < accuracy && this.collider.hasLineOfSight(enemyEye, player.cameraPosition)) {
      this.onPlayerDamage(GAME_CONFIG.enemy.damage);
    }
  }

  private killEnemy(enemy: EnemyNpc, direction: pc.Vec3): void {
    enemy.state = "dead";
    enemy.body.render!.material = this.materials.enemyHit;
    enemy.head.render!.material = this.materials.enemyHit;
    enemy.root.setEulerAngles(86, enemy.yaw * pc.math.RAD_TO_DEG, direction.x > 0 ? -10 : 10);
    enemy.root.setPosition(enemy.root.getPosition().clone().add(direction.clone().mulScalar(0.25)));
    enemy.muzzle.enabled = false;
  }
}
