import type { SurfaceType } from "../core/types.ts";

type OscType = OscillatorType;

export class AudioManager {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private ambience: GainNode | null = null;
  private currentVolume = 0.75;
  private startedAmbience = false;

  setVolume(value: number): void {
    this.currentVolume = Math.max(0, Math.min(1, value));
    if (this.master) this.master.gain.value = this.currentVolume;
  }

  getVolume(): number {
    return this.currentVolume;
  }

  unlock(): void {
    const context = this.ensureContext();
    if (context.state === "suspended") void context.resume();
    if (!this.startedAmbience) this.startAmbience();
  }

  playShot(): void {
    const now = this.now();
    this.noiseBurst(now, 0.105, 0.86, 720, 0.55);
    this.tone(now, 0.055, 90, 0.24, "triangle", 0.7);
    this.tone(now + 0.012, 0.05, 1850, 0.11, "square", 0.18);
  }

  playEnemyShot(): void {
    const now = this.now();
    this.noiseBurst(now, 0.08, 0.32, 600, 0.42);
    this.tone(now, 0.05, 120, 0.1, "triangle", 0.55);
  }

  playDryFire(): void {
    const now = this.now();
    this.tone(now, 0.035, 1300, 0.18, "square", 0.15);
    this.tone(now + 0.024, 0.045, 430, 0.09, "triangle", 0.08);
  }

  playMagazineOut(): void {
    const now = this.now();
    this.tone(now, 0.06, 250, 0.16, "triangle", 0.16);
    this.noiseBurst(now + 0.03, 0.04, 0.12, 900, 0.2);
  }

  playMagazineIn(): void {
    const now = this.now();
    this.tone(now, 0.075, 170, 0.22, "triangle", 0.2);
    this.noiseBurst(now + 0.02, 0.055, 0.18, 800, 0.24);
  }

  playSlide(): void {
    const now = this.now();
    this.noiseBurst(now, 0.075, 0.2, 1300, 0.2);
    this.tone(now + 0.05, 0.05, 320, 0.12, "square", 0.12);
  }

  playPressCheck(): void {
    const now = this.now();
    this.noiseBurst(now, 0.04, 0.14, 1600, 0.16);
    this.tone(now + 0.08, 0.045, 380, 0.1, "triangle", 0.11);
  }

  playFootstep(surface: SurfaceType, sprinting: boolean): void {
    const now = this.now();
    const gain = sprinting ? 0.2 : 0.13;
    const filter = surface === "wood" ? 450 : surface === "metal" ? 1200 : 650;
    this.noiseBurst(now, 0.055, gain, filter, 0.22);
    if (surface === "stone") this.tone(now + 0.006, 0.035, 85, 0.05, "triangle", 0.12);
  }

  playJump(): void {
    this.noiseBurst(this.now(), 0.05, 0.09, 500, 0.2);
  }

  playLand(strength: number): void {
    this.noiseBurst(this.now(), 0.08, 0.12 + strength * 0.18, 420, 0.24);
  }

  playImpact(surface: SurfaceType): void {
    const now = this.now();
    if (surface === "metal") {
      this.tone(now, 0.08, 1300, 0.12, "square", 0.16);
      this.tone(now + 0.02, 0.12, 2500, 0.05, "sine", 0.1);
      return;
    }
    if (surface === "wood") {
      this.noiseBurst(now, 0.055, 0.12, 520, 0.18);
      this.tone(now + 0.01, 0.05, 210, 0.08, "triangle", 0.13);
      return;
    }
    if (surface === "flesh") {
      this.noiseBurst(now, 0.05, 0.1, 350, 0.12);
      return;
    }
    this.noiseBurst(now, 0.045, 0.1, 900, 0.16);
  }

  playHitMarker(): void {
    this.tone(this.now(), 0.035, 880, 0.08, "sine", 0.12);
  }

  private startAmbience(): void {
    const context = this.ensureContext();
    const master = this.ensureMaster();
    const ambience = context.createGain();
    ambience.gain.value = 0.08;
    ambience.connect(master);
    this.ambience = ambience;

    const wind = context.createBufferSource();
    wind.buffer = this.makeNoiseBuffer(2.5);
    wind.loop = true;
    const windFilter = context.createBiquadFilter();
    windFilter.type = "lowpass";
    windFilter.frequency.value = 360;
    wind.connect(windFilter);
    windFilter.connect(ambience);
    wind.start();

    window.setInterval(() => {
      if (!this.context || !this.ambience) return;
      const t = this.context.currentTime;
      const pitch = 1800 + Math.random() * 900;
      this.tone(t, 0.08, pitch, 0.014, "sine", 0.04, this.ambience);
      this.tone(t + 0.12 + Math.random() * 0.14, 0.06, pitch * 1.2, 0.008, "sine", 0.035, this.ambience);
    }, 4200);

    this.startedAmbience = true;
  }

  private ensureContext(): AudioContext {
    if (!this.context) this.context = new AudioContext();
    return this.context;
  }

  private ensureMaster(): GainNode {
    const context = this.ensureContext();
    if (!this.master) {
      this.master = context.createGain();
      this.master.gain.value = this.currentVolume;
      this.master.connect(context.destination);
    }
    return this.master;
  }

  private now(): number {
    return this.ensureContext().currentTime;
  }

  private tone(
    start: number,
    duration: number,
    frequency: number,
    gainValue: number,
    type: OscType,
    decay = 0.2,
    destination?: AudioNode
  ): void {
    const context = this.ensureContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, frequency * decay), start + duration);
    gain.gain.setValueAtTime(gainValue, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(destination ?? this.ensureMaster());
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  }

  private noiseBurst(
    start: number,
    duration: number,
    gainValue: number,
    filterFrequency: number,
    resonance: number
  ): void {
    const context = this.ensureContext();
    const source = context.createBufferSource();
    source.buffer = this.makeNoiseBuffer(duration);

    const filter = context.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = filterFrequency;
    filter.Q.value = resonance;

    const gain = context.createGain();
    gain.gain.setValueAtTime(gainValue, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.ensureMaster());
    source.start(start);
    source.stop(start + duration + 0.02);
  }

  private makeNoiseBuffer(duration: number): AudioBuffer {
    const context = this.ensureContext();
    const length = Math.max(1, Math.floor(context.sampleRate * duration));
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }
}
