import type { Scene } from "@babylonjs/core/scene";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator";
import type { PracticeState } from "../../practice/PracticeState";
import { CABINET } from "../protection/protectionLayout";
import { HighlightLayer } from "@babylonjs/core/Layers/highlightLayer";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
export const PHOTO_TARGETS = [
  { center: new Vector3(-5.2, 0.65, 6.45), size: new Vector3(2.5, 1.3, 0.9) },
  {
    center: new Vector3(CABINET.x, 0.8855, CABINET.z),
    size: new Vector3(2, 1.7, 0.65),
  },
  { center: new Vector3(5.7, 0.3, 0.15), size: new Vector3(2.5, 0.6, 1.1) },
];
export class PracticeObjects {
  private readonly fixes: TransformNode[] = [];
  private readonly obstructions: TransformNode[] = [];
  private readonly highlight: HighlightLayer;
  private readonly targets = new Map<string, Mesh[]>();
  private highlighted: Mesh[] = [];
  register(id: string, meshes: Mesh[]) {
    this.targets.set(id, [...(this.targets.get(id) ?? []), ...meshes]);
  }
  dispose() {
    this.highlight.dispose();
  }
  constructor(scene: Scene, shadows: ShadowGenerator) {
    this.highlight = new HighlightLayer("interaction-outline", scene);
    this.highlight.innerGlow = false;
    this.highlight.blurHorizontalSize = 0.45;
    this.highlight.blurVerticalSize = 0.45;
    const mat = (name: string, color: string) => {
      const m = new StandardMaterial(name, scene);
      m.diffuseColor = Color3.FromHexString(color);
      m.specularColor.setAll(0.06);
      return m;
    };
    const cream = mat("practice-cream", "#c9c7ac"),
      steel = mat("practice-steel", "#587b87"),
      mint = mat("practice-mint", "#8ebfa3"),
      amber = mat("practice-work", "#c79959");
    const box = (
      name: string,
      x: number,
      y: number,
      z: number,
      w: number,
      h: number,
      d: number,
      m: StandardMaterial,
      parent?: TransformNode,
    ) => {
      const b = MeshBuilder.CreateBox(
        name,
        { width: w, height: h, depth: d },
        scene,
      );
      b.position.set(x, y, z);
      b.material = m;
      b.parent = parent ?? null;
      b.receiveShadows = true;
      shadows.addShadowCaster(b);
      return b;
    };
    box("planning-board", -1.8, 1.1, 0.65, 1.65, 1, 0.12, steel);
    box("planning-leg", -1.8, 0.45, 0.65, 0.15, 0.9, 0.15, steel);
    for (let i = 0; i < 5; i++)
      box("plan-row", -1.8, 1.44 - i * 0.16, 0.73, 1.3, 0.065, 0.035, cream);
    for (let i = 0; i < 3; i++) {
      this.fixes.push(new TransformNode("fixed-" + i, scene));
      this.obstructions.push(new TransformNode("before-" + i, scene));
    }
    box("platform", -5.2, 0.08, 6.45, 2.5, 0.16, 0.85, steel);
    for (const x of [-6.3, -4.1])
      box("railing-post", x, 0.7, 6.45, 0.09, 1.25, 0.09, cream);
    box(
      "missing-railing",
      -5.2,
      1.28,
      6.45,
      2.3,
      0.09,
      0.09,
      mint,
      this.fixes[0],
    );
    box(
      "missing-railing-middle",
      -5.2,
      0.75,
      6.45,
      2.3,
      0.065,
      0.065,
      mint,
      this.fixes[0],
    );
    const cabinet = new TransformNode("protection-cabinet", scene);
    cabinet.position.set(CABINET.x, 0.0355, CABINET.z);
    cabinet.rotation.y = CABINET.rotation;
    this.fixes[1].parent = cabinet;
    box("cabinet-back", 0, 0.85, -0.2, 1.8, 1.7, 0.08, steel, cabinet);
    for (const x of [-0.9, 0.9])
      box("cabinet-side", x, 0.85, 0, 0.08, 1.7, 0.5, steel, cabinet);
    for (const y of [0.12, 0.7, 1.35, 1.7])
      box("cabinet-shelf", 0, y, 0, 1.8, 0.07, 0.5, cream, cabinet);
    for (let i = 0; i < 6; i++)
      box(
        "protection-kit",
        -0.6 + (i % 3) * 0.6,
        0.39 + Math.floor(i / 3) * 0.72,
        0.07,
        0.38,
        0.4,
        0.3,
        mint,
        this.fixes[1],
      );
    for (const z of [-0.25, 0.55]) {
      box("old-marking", 5.0, 0.025, z, 1, 0.02, 0.065, cream);
      box("new-marking", 6.2, 0.027, z, 1.4, 0.023, 0.065, mint, this.fixes[2]);
    }
    for (let i = 0; i < 3; i++)
      box(
        "blocked-passage",
        5.2 + i * 0.5,
        0.35,
        0.15,
        0.43,
        0.7,
        0.43,
        amber,
        this.obstructions[2],
      );
    const groups: Record<string, RegExp> = {
      terminal: /^terminal-/,
      plan: /^(planning-|plan-row)/,
      "enter-admin": /^entrance$/,
      task0: /^(platform|railing-post|missing-railing)/,
      task1: /^(cabinet-|protection-kit)/,
      task2: /^(old-marking|new-marking|blocked-passage)/,
    };
    for (const [id, pattern] of Object.entries(groups))
      this.register(
        id,
        scene.meshes.filter((mesh) => pattern.test(mesh.name)) as Mesh[],
      );
  }

  update(state: PracticeState, nearest: string) {
    for (let i = 0; i < 3; i++) {
      const fixed = ["ready", "review", "returned", "accepted"].includes(
        state.jobs[i].status,
      );
      this.fixes[i].setEnabled(fixed);
      this.obstructions[i].setEnabled(!fixed);
    }
    const meshes = (this.targets.get(nearest) ?? []).filter(
      (mesh) => mesh.isEnabled() && mesh.isVisible,
    );
    if (
      meshes.length !== this.highlighted.length ||
      meshes.some((mesh, i) => mesh !== this.highlighted[i])
    ) {
      this.highlight.removeAllMeshes();
      for (const mesh of meshes)
        this.highlight.addMesh(mesh, Color3.FromHexString("#b2e3d2"));
      this.highlighted = meshes;
    }
  }
}
