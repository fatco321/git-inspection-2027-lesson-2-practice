import type { Scene } from "@babylonjs/core/scene";
import type { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Matrix, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { formatDays, type PracticeState } from "../../practice/PracticeState";
import "./work-progress.css";
export class WorkProgressLabels {
  private readonly root = document.createElement("div");
  private readonly labels: HTMLDivElement[] = [];
  constructor() {
    this.root.className = "work-progress-labels";
    for (let i = 0; i < 3; i++) {
      const label = document.createElement("div");
      label.className = "work-progress-label";
      label.hidden = true;
      this.labels.push(label);
      this.root.append(label);
    }
    document.body.append(this.root);
  }
  update(
    scene: Scene,
    workers: TransformNode[],
    state: PracticeState,
    visible: boolean,
  ) {
    const camera = scene.activeCamera,
      engine = scene.getEngine(),
      canvas = engine.getRenderingCanvas();
    if (!camera || !canvas) return;
    const rect = canvas.getBoundingClientRect(),
      viewport = camera.viewport.toGlobal(
        engine.getRenderWidth(),
        engine.getRenderHeight(),
      );
    this.labels.forEach((label, i) => {
      const worker = workers[i],
        job = state.jobs[i];
      if (!visible || !worker?.isEnabled() || job.status !== "working") {
        label.hidden = true;
        return;
      }
      const position = worker
        .getAbsolutePosition()
        .add(new Vector3(0, 2.05, 0));
      const projected = Vector3.Project(
        position,
        Matrix.Identity(),
        scene.getTransformMatrix(),
        viewport,
      );
      const x = projected.x / engine.getRenderWidth(),
        y = projected.y / engine.getRenderHeight();
      label.hidden =
        projected.z <= 0 ||
        projected.z >= 1 ||
        x < 0.04 ||
        x > 0.96 ||
        y < 0.04 ||
        y > 0.95;
      if (label.hidden) return;
      label.textContent = `Ещё ${formatDays(job.finish - state.day)}`;
      label.style.left = `${rect.left + x * rect.width}px`;
      label.style.top = `${rect.top + y * rect.height}px`;
    });
  }
  dispose() {
    this.root.remove();
  }
}
