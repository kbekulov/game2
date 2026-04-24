import * as pc from "playcanvas";
import { GAME_CONFIG } from "../config/gameConfig.ts";
import { clamp, damp, setVec, yawPitchToForward, yawToRight } from "../core/math.ts";
import type { PlayerFrame } from "../core/types.ts";
import type { InputManager } from "../core/input.ts";
import type { LevelCollider } from "../level/LevelCollider.ts";
import type { AudioManager } from "../audio/AudioManager.ts";

export class PlayerController {
  readonly camera: pc.Entity;
  private readonly position = new pc.Vec3();
  private readonly velocity = new pc.Vec3();
  private yaw = GAME_CONFIG.game.respawnYaw;
  private pitch = 0;
  private grounded = true;
  private landingStrength = 0;
  private bobPhase = 0;
  private bobOffset = 0;
  private landingOffset = 0;
  private recoilPitch = 0;
  private recoilYaw = 0;
  private recoilPitchVelocity = 0;
  private recoilYawVelocity = 0;
  private footstepPhase = 0;
  private health: number = GAME_CONFIG.game.playerHealth;
  private justLanded = false;
  private lastGrounded = true;

  constructor(
    private readonly app: pc.Application,
    private readonly input: InputManager,
    private readonly collider: LevelCollider,
    private readonly audio: AudioManager
  ) {
    this.camera = new pc.Entity("First-person Camera");
    this.camera.addComponent("camera", {
      clearColor: new pc.Color(0.56, 0.52, 0.44),
      fov: 72,
      nearClip: 0.05,
      farClip: 120
    });
    this.app.root.addChild(this.camera);
    this.reset();
  }

  reset(): void {
    const spawn = GAME_CONFIG.game.respawnPosition;
    this.position.set(spawn.x, spawn.y, spawn.z);
    this.velocity.set(0, 0, 0);
    this.yaw = GAME_CONFIG.game.respawnYaw;
    this.pitch = 0;
    this.grounded = true;
    this.lastGrounded = true;
    this.health = GAME_CONFIG.game.playerHealth;
    this.recoilPitch = 0;
    this.recoilYaw = 0;
    this.recoilPitchVelocity = 0;
    this.recoilYawVelocity = 0;
    this.bobPhase = 0;
    this.bobOffset = 0;
    this.landingOffset = 0;
  }

  update(dt: number, sensitivityScale: number): PlayerFrame {
    const look = this.input.getLookDelta();
    this.yaw -= look.dx * GAME_CONFIG.camera.sensitivity * sensitivityScale;
    this.pitch = clamp(
      this.pitch - look.dy * GAME_CONFIG.camera.sensitivity * sensitivityScale,
      GAME_CONFIG.camera.minPitch,
      GAME_CONFIG.camera.maxPitch
    );

    const forwardFlat = new pc.Vec3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)).normalize();
    const right = yawToRight(this.yaw);
    const wish = new pc.Vec3();
    if (this.input.isDown("KeyW")) wish.add(forwardFlat);
    if (this.input.isDown("KeyS")) wish.sub(forwardFlat);
    if (this.input.isDown("KeyD")) wish.add(right);
    if (this.input.isDown("KeyA")) wish.sub(right);
    if (wish.lengthSq() > 0.0001) wish.normalize();

    const wantsSprint = this.input.isDown("ShiftLeft") || this.input.isDown("ShiftRight");
    const sprinting = wantsSprint && wish.z * forwardFlat.z + wish.x * forwardFlat.x > 0.2 && this.grounded;
    const targetSpeed = wish.lengthSq() > 0 ? (sprinting ? GAME_CONFIG.movement.sprintSpeed : GAME_CONFIG.movement.jogSpeed) : 0;
    const accel = this.grounded
      ? targetSpeed > 0
        ? GAME_CONFIG.movement.acceleration
        : GAME_CONFIG.movement.deceleration
      : GAME_CONFIG.movement.airAcceleration * GAME_CONFIG.movement.airControl;

    const targetVx = wish.x * targetSpeed;
    const targetVz = wish.z * targetSpeed;
    this.velocity.x = damp(this.velocity.x, targetVx, accel, dt);
    this.velocity.z = damp(this.velocity.z, targetVz, accel, dt);

    if (this.grounded && this.input.wasPressed("Space")) {
      this.velocity.y = GAME_CONFIG.movement.jumpVelocity;
      this.grounded = false;
      this.audio.playJump();
    }

    this.velocity.y += GAME_CONFIG.movement.gravity * dt;
    this.moveHorizontal(dt);
    this.moveVertical(dt);
    this.updateCameraFeel(dt, sprinting);
    this.updateRecoil(dt);

    const forward = yawPitchToForward(this.yaw + this.recoilYaw, this.pitch + this.recoilPitch);
    const eyeY = this.position.y + GAME_CONFIG.movement.eyeHeight + this.bobOffset + this.landingOffset;
    const cameraPosition = new pc.Vec3(this.position.x, eyeY, this.position.z);
    this.camera.setPosition(cameraPosition);
    this.camera.setEulerAngles((this.pitch + this.recoilPitch) * pc.math.RAD_TO_DEG, (this.yaw + this.recoilYaw) * pc.math.RAD_TO_DEG, 0);

    return {
      position: this.position.clone(),
      cameraPosition,
      forward,
      right,
      yaw: this.yaw,
      pitch: this.pitch,
      speed: Math.hypot(this.velocity.x, this.velocity.z),
      grounded: this.grounded,
      sprinting,
      justLanded: this.justLanded,
      landingStrength: this.landingStrength,
      lookDeltaX: look.dx,
      lookDeltaY: look.dy,
      health: this.health
    };
  }

  applyDamage(amount: number): void {
    this.health = Math.max(0, this.health - amount);
  }

  getHealth(): number {
    return this.health;
  }

  isAlive(): boolean {
    return this.health > 0;
  }

  addRecoil(pitch: number, yaw: number): void {
    this.recoilPitchVelocity -= pitch * GAME_CONFIG.camera.recoilSnappiness;
    this.recoilYawVelocity += yaw * GAME_CONFIG.camera.recoilSnappiness;
  }

  getPosition(): pc.Vec3 {
    return this.position.clone();
  }

  private moveHorizontal(dt: number): void {
    const radius = GAME_CONFIG.movement.playerRadius;
    const height = GAME_CONFIG.movement.playerHeight;

    this.position.x += this.velocity.x * dt;
    if (this.collider.collidesPlayer(this.position, radius, height)) {
      this.position.x -= this.velocity.x * dt;
      this.velocity.x = 0;
    }

    this.position.z += this.velocity.z * dt;
    if (this.collider.collidesPlayer(this.position, radius, height)) {
      this.position.z -= this.velocity.z * dt;
      this.velocity.z = 0;
    }
  }

  private moveVertical(dt: number): void {
    this.lastGrounded = this.grounded;
    this.justLanded = false;
    this.landingStrength = 0;

    this.position.y += this.velocity.y * dt;
    const ground = this.collider.getGroundHeight(this.position.x, this.position.z);
    if (this.position.y <= ground + GAME_CONFIG.movement.stepSnap && this.velocity.y <= 0) {
      const impact = Math.abs(this.velocity.y);
      this.position.y = ground;
      this.velocity.y = 0;
      this.grounded = true;
      if (!this.lastGrounded && impact > 2.1) {
        this.justLanded = true;
        this.landingStrength = clamp((impact - 2) / 7, 0, 1);
        this.landingOffset -= this.landingStrength * GAME_CONFIG.camera.landingImpact;
        this.audio.playLand(this.landingStrength);
      }
      return;
    }

    this.grounded = false;
  }

  private updateCameraFeel(dt: number, sprinting: boolean): void {
    const horizontalSpeed = Math.hypot(this.velocity.x, this.velocity.z);
    const moving = horizontalSpeed > 0.18 && this.grounded;
    const amount = sprinting
      ? GAME_CONFIG.camera.sprintBobAmount
      : horizontalSpeed > GAME_CONFIG.movement.walkSpeed
        ? GAME_CONFIG.camera.jogBobAmount
        : GAME_CONFIG.camera.walkBobAmount;
    const frequency = sprinting
      ? GAME_CONFIG.camera.sprintBobFrequency
      : horizontalSpeed > GAME_CONFIG.movement.walkSpeed
        ? GAME_CONFIG.camera.jogBobFrequency
        : GAME_CONFIG.camera.walkBobFrequency;

    if (moving) {
      this.bobPhase += dt * frequency * (0.55 + horizontalSpeed / GAME_CONFIG.movement.sprintSpeed);
      this.bobOffset = Math.sin(this.bobPhase * 2) * amount * 0.55 + Math.abs(Math.sin(this.bobPhase)) * amount;
      this.footstepPhase += dt * frequency * (sprinting ? 1.12 : 0.92);
      if (this.footstepPhase > 1) {
        this.footstepPhase -= 1;
        this.audio.playFootstep(this.collider.getGroundSurface(this.position.x, this.position.z), sprinting);
      }
    } else {
      this.bobOffset = damp(this.bobOffset, 0, 8, dt);
      this.footstepPhase = 0.5;
    }
    this.landingOffset = damp(this.landingOffset, 0, 10, dt);
  }

  private updateRecoil(dt: number): void {
    this.recoilPitchVelocity = damp(this.recoilPitchVelocity, 0, GAME_CONFIG.camera.recoilReturn, dt);
    this.recoilYawVelocity = damp(this.recoilYawVelocity, 0, GAME_CONFIG.camera.recoilReturn, dt);
    this.recoilPitch += this.recoilPitchVelocity * dt;
    this.recoilYaw += this.recoilYawVelocity * dt;
    this.recoilPitch = damp(this.recoilPitch, 0, GAME_CONFIG.camera.recoilReturn * 0.72, dt);
    this.recoilYaw = damp(this.recoilYaw, 0, GAME_CONFIG.camera.recoilReturn * 0.86, dt);
    setVec(this.velocity, this.velocity.x, this.velocity.y, this.velocity.z);
  }
}
