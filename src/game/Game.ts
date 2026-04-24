import * as pc from "playcanvas";
import { AudioManager } from "../audio/AudioManager.ts";
import { GAME_CONFIG } from "../config/gameConfig.ts";
import { InputManager } from "../core/input.ts";
import type { GameMode, PlayerFrame, ShotResult, WeaponFrame } from "../core/types.ts";
import { EnemyManager } from "../enemies/EnemyManager.ts";
import { TownLevel } from "../level/TownLevel.ts";
import { PlayerController } from "../player/PlayerController.ts";
import { Hud } from "../ui/Hud.ts";
import { Pistol } from "../weapons/Pistol.ts";

export class OldTownFpsGame {
  private readonly app: pc.Application;
  private readonly input: InputManager;
  private readonly audio = new AudioManager();
  private readonly level: TownLevel;
  private readonly player: PlayerController;
  private readonly weapon: Pistol;
  private readonly enemies: EnemyManager;
  private readonly hud: Hud;
  private mode: GameMode = "start";
  private sensitivityScale = 1;
  private hitPulse = 0;
  private notice = "Click Begin to enter the district.";
  private lastWeaponFrame: WeaponFrame = {
    ammoInMagazine: GAME_CONFIG.weapon.magazineSize + 1,
    reserveAmmo: GAME_CONFIG.weapon.reserveAmmo,
    chambered: true,
    slideLocked: false,
    stateLabel: "ready",
    canShoot: true
  };
  private lastPlayerFrame: PlayerFrame | null = null;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    uiRoot: HTMLDivElement
  ) {
    this.app = new pc.Application(canvas, {
      keyboard: new pc.Keyboard(window),
      mouse: new pc.Mouse(canvas),
      graphicsDeviceOptions: {
        antialias: true,
        alpha: false,
        powerPreference: "high-performance"
      }
    });
    this.app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
    this.app.setCanvasResolution(pc.RESOLUTION_AUTO);
    this.app.graphicsDevice.maxPixelRatio = Math.min(window.devicePixelRatio, 1.5);

    this.input = new InputManager(canvas);
    this.level = new TownLevel(this.app);
    this.level.build();
    this.player = new PlayerController(this.app, this.input, this.level.collider, this.audio);
    this.weapon = new Pistol(this.app, this.player.camera, this.level.materials, this.audio);
    this.enemies = new EnemyManager(this.app, this.level.collider, this.level.materials, this.audio, (damage) => {
      if (this.mode === "playing") this.player.applyDamage(damage);
    });

    this.hud = new Hud(uiRoot, {
      onStart: () => this.startRun(),
      onResume: () => this.resume(),
      onRestart: () => this.startRun(),
      onSensitivity: (value) => {
        this.sensitivityScale = value;
      },
      onVolume: (value) => {
        this.audio.setVolume(value);
      }
    });

    this.input.onPointerLock((locked) => {
      if (!locked && this.mode === "playing") this.pause();
    });
    window.addEventListener("resize", () => this.app.resizeCanvas());
  }

  start(): void {
    this.enemies.spawn(this.level.enemySpawns);
    this.app.on("update", (dt: number) => this.update(Math.min(dt, 0.05)));
    this.app.start();
    this.renderHud();
  }

  private update(dt: number): void {
    this.hitPulse = Math.max(0, this.hitPulse - dt * 4.5);

    if (this.input.wasPressed("Enter") && (this.mode === "start" || this.mode === "won" || this.mode === "lost")) {
      this.startRun();
    }

    if (this.mode === "playing") {
      if (this.input.wasPressed("Escape")) this.pause();
      this.updatePlaying(dt);
    }

    this.renderHud();
    this.input.beginFrame();
  }

  private updatePlaying(dt: number): void {
    if (!this.input.isPointerLocked() && this.canvas === document.activeElement) this.input.requestPointerLock();

    const playerFrame = this.player.update(dt, this.sensitivityScale);
    this.lastPlayerFrame = playerFrame;

    if (this.input.wasPressed("KeyR")) this.weapon.requestReload();
    if (this.input.wasPressed("KeyC")) this.weapon.requestPressCheck();
    if (this.input.isMouseDown()) {
      const result = this.weapon.tryFire(playerFrame.cameraPosition, playerFrame.forward, playerFrame, (origin, direction, maxRange) =>
        this.resolveShot(origin, direction, maxRange)
      );
      if (result?.enemyHit) this.hitPulse = 1;
      if (result?.killedEnemy && this.enemies.getAliveCount() === 0) this.win();
      if (result && this.lastWeaponFrame.chambered) {
        this.player.addRecoil(GAME_CONFIG.weapon.recoilPitch, (Math.random() - 0.5) * GAME_CONFIG.weapon.recoilYaw);
      }
    }

    this.lastWeaponFrame = this.weapon.update(dt, playerFrame);
    this.enemies.update(dt, playerFrame);

    if (!this.player.isAlive()) this.lose();
    if (this.enemies.getAliveCount() === 0) this.win();
    this.notice = this.noticeForState();
  }

  private resolveShot(origin: pc.Vec3, direction: pc.Vec3, maxRange: number): ShotResult {
    const worldHit = this.level.collider.raycast(origin, direction, maxRange);
    return this.enemies.raycast(origin, direction, maxRange, worldHit);
  }

  private startRun(): void {
    this.audio.unlock();
    this.mode = "playing";
    this.notice = "Clear the district.";
    this.hitPulse = 0;
    this.player.reset();
    this.weapon.reset();
    this.enemies.spawn(this.level.enemySpawns);
    this.lastWeaponFrame = this.weapon.getFrame();
    this.input.requestPointerLock();
  }

  private pause(): void {
    if (this.mode !== "playing") return;
    this.mode = "paused";
    this.notice = "Paused.";
  }

  private resume(): void {
    this.audio.unlock();
    this.mode = "playing";
    this.input.requestPointerLock();
  }

  private win(): void {
    if (this.mode !== "playing") return;
    this.mode = "won";
    document.exitPointerLock();
  }

  private lose(): void {
    if (this.mode !== "playing") return;
    this.mode = "lost";
    document.exitPointerLock();
  }

  private noticeForState(): string {
    if (this.lastWeaponFrame.slideLocked) return "Slide locked. Reload.";
    if (this.lastWeaponFrame.reserveAmmo <= 0 && this.lastWeaponFrame.ammoInMagazine <= 0) return "No ammunition. Break contact.";
    if (this.lastPlayerFrame?.sprinting) return "Sprinting.";
    if (this.enemies.getAliveCount() <= 2) return "Final hostiles near the civic square.";
    return "Clear alleys, control angles, move with purpose.";
  }

  private renderHud(): void {
    this.hud.update({
      mode: this.mode,
      health: this.player.getHealth(),
      enemiesAlive: this.enemies.getAliveCount(),
      enemiesTotal: this.enemies.getTotalCount(),
      weapon: this.lastWeaponFrame,
      notice: this.notice,
      hitPulse: this.hitPulse
    });
  }
}
