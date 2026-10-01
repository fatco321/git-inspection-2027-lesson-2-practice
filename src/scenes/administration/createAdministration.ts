import type { Scene } from "@babylonjs/core/scene";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import type { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator";

export function createAdministration(scene: Scene, shadows: ShadowGenerator) {
  const root = new TransformNode("administration-room", scene);
  const mat = (name: string, color: string) => {
    const m = new StandardMaterial("office-" + name, scene);
    m.diffuseColor = Color3.FromHexString(color);
    m.specularColor.setAll(0.045);
    return m;
  };
  const wall = mat("wall", "#dedbc8"),
    trim = mat("trim", "#f2eddb"),
    teal = mat("teal", "#618a89"),
    wood = mat("oak", "#bf9664"),
    dark = mat("steel", "#425a64"),
    seat = mat("seat", "#648483"),
    paper = mat("paper", "#edead7"),
    glass = mat("glass", "#abcbd0"),
    leaf = mat("leaf", "#648963");
  glass.emissiveColor = Color3.FromHexString("#253536");
  const box = (
    name: string,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    m: StandardMaterial,
  ) => {
    const mesh = MeshBuilder.CreateBox(
      "office-" + name,
      { width: w, height: h, depth: d },
      scene,
    );
    mesh.parent = root;
    mesh.position.set(x, y, z);
    mesh.material = m;
    mesh.receiveShadows = true;
    shadows.addShadowCaster(mesh);
    return mesh;
  };
  // Open camera-facing walls provide a dollhouse view without wall/character occlusion.
  box("floor", 0, -0.075, 0, 7.8, 0.22, 6.2, wood);
  for (let i = 0; i < 13; i++)
    box("floor-joint", -3.6 + i * 0.6, 0.038, 0, 0.012, 0.004, 6.1, trim);
  box("rear-wall", 0, 1.45, -3, 7.8, 2.9, 0.15, wall);
  box("left-wall", -3.85, 1.45, 0, 0.15, 2.9, 6.1, wall);
  box("rear-panel", 0, 0.48, -2.91, 7.65, 0.9, 0.03, teal);
  box("left-panel", -3.76, 0.48, 0, 0.03, 0.9, 6, teal);
  box("rear-trim", 0, 0.98, -2.88, 7.65, 0.065, 0.04, trim);
  box("left-trim", -3.73, 0.98, 0, 0.04, 0.065, 6, trim);
  box("rear-base", 0, 0.1, -2.86, 7.65, 0.12, 0.07, trim);
  box("left-base", -3.7, 0.1, 0, 0.07, 0.12, 6, trim);
  box("window-frame", 1.35, 1.95, -2.87, 2, 1.35, 0.14, trim);
  box("window", 1.35, 1.95, -2.78, 1.82, 1.18, 0.03, glass);
  box("window-bar", 1.35, 1.95, -2.74, 0.065, 1.2, 0.04, trim);
  box("window-sill", 1.35, 1.26, -2.7, 2.15, 0.08, 0.35, trim);
  const desk = box("desk", 0, 0.82, -1.05, 2.2, 0.12, 1, wood);
  for (const x of [-0.93, 0.93])
    box("desk-leg", x, 0.42, -1.05, 0.12, 0.76, 0.8, dark);
  box("desk-panel", 0, 0.53, -0.65, 1.94, 0.48, 0.065, teal);
  box("chair-seat", 0, 0.46, -1.98, 0.57, 0.1, 0.55, seat);
  box("chair-back", 0, 0.89, -2.23, 0.57, 0.73, 0.08, seat);
  for (const x of [-0.22, 0.22])
    for (const z of [-2.18, -1.77])
      box("chair-leg", x, 0.24, z, 0.045, 0.43, 0.045, dark);
  box("folder", -0.58, 0.905, -1.03, 0.42, 0.05, 0.5, teal);
  box("papers", 0.15, 0.895, -1.05, 0.42, 0.025, 0.3, paper);
  box("monitor-foot", 0.69, 0.9, -0.97, 0.3, 0.04, 0.2, dark);
  box("monitor-neck", 0.69, 1.04, -0.97, 0.06, 0.25, 0.06, dark);
  box("monitor", 0.69, 1.27, -0.97, 0.55, 0.35, 0.055, dark);
  box("monitor-back", 0.69, 1.27, -0.93, 0.45, 0.24, 0.015, teal);
  box("shelf-back", -3.35, 1.02, -1.7, 0.08, 1.94, 1.8, teal);
  for (const z of [-2.6, -0.8])
    box("shelf-side", -3.07, 1.02, z, 0.64, 1.94, 0.07, wood);
  for (const y of [0.12, 0.68, 1.26, 1.99])
    box("shelf", -3.07, y, -1.7, 0.64, 0.06, 1.8, wood);
  for (let row = 0; row < 3; row++)
    for (let j = 0; j < 6; j++) {
      box(
        "binder",
        -3.01,
        0.37 + row * 0.58,
        -2.36 + j * 0.24,
        0.4,
        0.43,
        0.17,
        j % 2 ? teal : paper,
      );
      box(
        "binder-label",
        -2.8,
        0.39 + row * 0.58,
        -2.36 + j * 0.24,
        0.01,
        0.1,
        0.09,
        paper,
      );
    }
  box("plant-pot", 3.05, 0.3, -2.1, 0.45, 0.52, 0.45, wood);
  for (let i = 0; i < 5; i++) {
    const l = MeshBuilder.CreateSphere(
      "office-leaf",
      { diameter: 0.5, segments: 5 },
      scene,
    );
    l.parent = root;
    l.position.set(
      3.05 + Math.sin(i * 2.4) * 0.17,
      0.8 + i * 0.09,
      -2.1 + Math.cos(i * 2.4) * 0.17,
    );
    l.scaling.set(0.7, 1.3, 0.55);
    l.material = leaf;
    shadows.addShadowCaster(l);
  }
  return { root, desk };
}
