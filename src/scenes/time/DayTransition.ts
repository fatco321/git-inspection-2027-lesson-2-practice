import type { Scene } from "@babylonjs/core/scene";
import type { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import type { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import "./day-transition.css";

/** Presentation only: PracticeState remains the sole owner of the academic clock. */
export class DayTransition {
  private readonly overlay = document.createElement("div");
  private readonly title = document.createElement("strong");
  private readonly phase = document.createElement("span");
  private elapsed = 0;
  private targetDay = 0;
  private duration = 3.2;
  private resolve?: () => void;
  private saved?: {
    sky: number;
    sun: number;
    skyColor: Color3;
    sunColor: Color3;
    background: Color4;
  };
  constructor(
    private scene: Scene,
    private sky: HemisphericLight,
    private sun: DirectionalLight,
  ) {
    this.overlay.className = "day-transition";
    this.overlay.hidden = true;
    this.overlay.setAttribute("role", "status");
    this.overlay.setAttribute("aria-live", "polite");
    const icon = document.createElement("div");
    icon.className = "day-transition-orb";
    icon.setAttribute("aria-hidden", "true");
    const card = document.createElement("div");
    card.className = "day-transition-card";
    card.append(icon, this.title, this.phase);
    this.overlay.append(card);
    document.body.append(this.overlay);
  }
  play(from: number, to: number): Promise<void> {
    this.elapsed = 0;
    this.targetDay = to;
    this.duration = window.matchMedia("(prefers-reduced-motion: reduce)")
      .matches
      ? 0.8
      : 3.2;
    this.saved = {
      sky: this.sky.intensity,
      sun: this.sun.intensity,
      skyColor: this.sky.diffuse.clone(),
      sunColor: this.sun.diffuse.clone(),
      background: this.scene.clearColor.clone(),
    };
    this.title.textContent = `День ${from}`;
    this.phase.textContent = "Наступает вечер";
    this.overlay.dataset.phase = "evening";
    this.overlay.hidden = false;
    return new Promise((resolve) => {
      this.resolve = resolve;
    });
  }
  update(dt: number) {
    if (!this.saved) return;
    this.elapsed += dt;
    const t = Math.min(1, this.elapsed / this.duration);
    const night = Math.pow(Math.sin(Math.PI * t), 0.8);
    this.sky.intensity = this.saved.sky * (1 - 0.76 * night);
    this.sun.intensity = this.saved.sun * (1 - 0.97 * night);
    const twilight =
      t < 0.5
        ? Color3.FromHexString("#d09b80")
        : Color3.FromHexString("#e3bc87");
    this.sky.diffuse = Color3.Lerp(
      this.saved.skyColor,
      Color3.FromHexString("#6c85b9"),
      night,
    );
    this.sun.diffuse = Color3.Lerp(this.saved.sunColor, twilight, night);
    this.scene.clearColor = Color4.Lerp(
      this.saved.background,
      Color4.FromHexString("#080e21ff"),
      night,
    );
    this.overlay.style.setProperty("--night", String(night));
    const phase = t < 0.28 ? "evening" : t < 0.67 ? "night" : "morning";
    if (this.overlay.dataset.phase !== phase) {
      this.overlay.dataset.phase = phase;
      this.phase.textContent =
        phase === "night" ? "Ночь" : "Наступил новый день";
      if (phase === "morning")
        this.title.textContent = `День ${this.targetDay}`;
    }
    if (t === 1) this.finish();
  }
  private finish() {
    if (this.saved) {
      this.sky.intensity = this.saved.sky;
      this.sun.intensity = this.saved.sun;
      this.sky.diffuse.copyFrom(this.saved.skyColor);
      this.sun.diffuse.copyFrom(this.saved.sunColor);
      this.scene.clearColor.copyFrom(this.saved.background);
      this.saved = undefined;
    }
    this.overlay.hidden = true;
    const resolve = this.resolve;
    this.resolve = undefined;
    resolve?.();
  }
  dispose() {
    this.finish();
    this.overlay.remove();
  }
}
