import type { GameMode, WeaponFrame } from "../core/types.ts";

export interface UiSnapshot {
  mode: GameMode;
  health: number;
  enemiesAlive: number;
  enemiesTotal: number;
  weapon: WeaponFrame;
  notice: string;
  hitPulse: number;
}

export interface UiCallbacks {
  onStart: () => void;
  onResume: () => void;
  onRestart: () => void;
  onSensitivity: (value: number) => void;
  onVolume: (value: number) => void;
}

export class Hud {
  private readonly hud = document.createElement("div");
  private readonly objective = document.createElement("div");
  private readonly healthBar = document.createElement("span");
  private readonly healthText = document.createElement("div");
  private readonly ammoMain = document.createElement("div");
  private readonly ammoReserve = document.createElement("div");
  private readonly weaponState = document.createElement("div");
  private readonly notice = document.createElement("div");
  private readonly hitMarker = document.createElement("div");
  private screen: HTMLDivElement | null = null;
  private lastMode: GameMode | null = null;

  constructor(
    private readonly root: HTMLDivElement,
    private readonly callbacks: UiCallbacks
  ) {
    this.hud.className = "hud";
    this.objective.className = "hud__objective";
    const status = document.createElement("div");
    status.className = "hud__status";
    this.healthText.textContent = "HEALTH 100";
    const bar = document.createElement("div");
    bar.className = "hud__bar";
    bar.append(this.healthBar);
    status.append(this.healthText, bar);

    const ammo = document.createElement("div");
    ammo.className = "hud__ammo";
    this.ammoMain.className = "hud__ammo-main";
    this.ammoReserve.className = "hud__ammo-reserve";
    ammo.append(this.ammoMain, this.ammoReserve);
    this.weaponState.className = "hud__weapon-state";

    const crosshair = document.createElement("div");
    crosshair.className = "crosshair";
    this.notice.className = "notice";
    this.hitMarker.className = "hit-marker";

    this.hud.append(this.objective, status, ammo, this.weaponState, crosshair, this.notice, this.hitMarker);
    this.root.append(this.hud);
  }

  update(snapshot: UiSnapshot): void {
    this.hud.style.display = snapshot.mode === "playing" || snapshot.mode === "paused" ? "block" : "none";
    this.objective.textContent = `Eliminate hostiles: ${snapshot.enemiesTotal - snapshot.enemiesAlive}/${snapshot.enemiesTotal}`;
    this.healthText.textContent = `HEALTH ${Math.round(snapshot.health)}`;
    this.healthBar.style.transform = `scaleX(${Math.max(0, Math.min(1, snapshot.health / 100))})`;
    this.ammoMain.textContent = String(snapshot.weapon.ammoInMagazine).padStart(2, "0");
    this.ammoReserve.textContent = `/ ${String(snapshot.weapon.reserveAmmo).padStart(2, "0")}`;
    this.weaponState.textContent = snapshot.weapon.stateLabel;
    this.notice.textContent = snapshot.notice;
    this.hitMarker.style.setProperty("--hit-opacity", String(snapshot.hitPulse));
    this.hitMarker.style.setProperty("--hit-scale", String(0.7 + snapshot.hitPulse * 0.55));

    if (snapshot.mode !== this.lastMode) {
      this.lastMode = snapshot.mode;
      this.renderScreen(snapshot.mode);
    }
  }

  private renderScreen(mode: GameMode): void {
    if (this.screen) {
      this.screen.remove();
      this.screen = null;
    }

    if (mode === "playing") return;

    const screen = document.createElement("div");
    screen.className = "screen";
    const panel = document.createElement("div");
    panel.className = "panel";
    screen.append(panel);
    this.screen = screen;
    this.root.append(screen);

    if (mode === "start") {
      panel.innerHTML = `
        <h1>Old Town FPS</h1>
        <p>Move through the district, control the alleys, and clear the hostile patrols with one disciplined sidearm.</p>
        <div class="controls">
          <div class="row"><kbd>W/A/S/D</kbd><span>Move</span></div>
          <div class="row"><kbd>Shift</kbd><span>Sprint</span></div>
          <div class="row"><kbd>Mouse 1</kbd><span>Fire</span></div>
          <div class="row"><kbd>R / C</kbd><span>Reload / press-check</span></div>
        </div>
      `;
      panel.append(this.settings(), this.actions("Begin", this.callbacks.onStart));
      return;
    }

    if (mode === "paused") {
      panel.innerHTML = `<h2>Paused</h2><p>Adjust feel, then resume the route.</p>`;
      panel.append(this.settings(), this.actions("Resume", this.callbacks.onResume, "Restart", this.callbacks.onRestart));
      return;
    }

    if (mode === "won") {
      panel.innerHTML = `<h2>District Clear</h2><p>All hostiles are down. The route is secure.</p>`;
      panel.append(this.actions("Run Again", this.callbacks.onRestart));
      return;
    }

    panel.innerHTML = `<h2>Down</h2><p>You were overwhelmed in the district.</p>`;
    panel.append(this.actions("Restart", this.callbacks.onRestart));
  }

  private actions(primaryLabel: string, primary: () => void, secondaryLabel?: string, secondary?: () => void): HTMLDivElement {
    const actions = document.createElement("div");
    actions.className = "menu-actions";
    const primaryButton = document.createElement("button");
    primaryButton.textContent = primaryLabel;
    primaryButton.addEventListener("click", primary);
    actions.append(primaryButton);
    if (secondaryLabel && secondary) {
      const secondaryButton = document.createElement("button");
      secondaryButton.className = "secondary";
      secondaryButton.textContent = secondaryLabel;
      secondaryButton.addEventListener("click", secondary);
      actions.append(secondaryButton);
    }
    return actions;
  }

  private settings(): DocumentFragment {
    const fragment = document.createDocumentFragment();
    fragment.append(
      this.slider("Sensitivity", 50, 150, 100, (value) => this.callbacks.onSensitivity(value / 100)),
      this.slider("Volume", 0, 100, 75, (value) => this.callbacks.onVolume(value / 100))
    );
    return fragment;
  }

  private slider(label: string, min: number, max: number, value: number, onInput: (value: number) => void): HTMLLabelElement {
    const wrapper = document.createElement("label");
    wrapper.className = "setting";
    const text = document.createElement("span");
    text.textContent = label;
    const slider = document.createElement("input");
    slider.type = "range";
    slider.min = String(min);
    slider.max = String(max);
    slider.value = String(value);
    const output = document.createElement("output");
    output.textContent = `${value}%`;
    slider.addEventListener("input", () => {
      output.textContent = `${slider.value}%`;
      onInput(Number(slider.value));
    });
    wrapper.append(text, slider, output);
    return wrapper;
  }
}
