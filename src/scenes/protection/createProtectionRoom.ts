import type { Scene } from "@babylonjs/core/scene";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import type { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator";
export function createProtectionRoom(scene: Scene, shadows: ShadowGenerator) {
  const root = new TransformNode("protection-room", scene);
  const mat = (name: string, color: string) => {
    const m = new StandardMaterial("protection-" + name, scene);
    m.diffuseColor = Color3.FromHexString(color);
    m.specularColor.setAll(0.05);
    return m;
  };
  const wall = mat("wall", "#d9ddd0"),
    floor = mat("floor", "#879b9c"),
    trim = mat("trim", "#ebe5cf"),
    teal = mat("teal", "#638d8d"),
    dark = mat("steel", "#425c69"),
    wood = mat("wood", "#bb976c");
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
    const b = MeshBuilder.CreateBox(
      "protection-" + name,
      { width: w, height: h, depth: d },
      scene,
    );
    b.parent = root;
    b.position.set(x, y, z);
    b.material = m;
    b.receiveShadows = true;
    shadows.addShadowCaster(b);
    return b;
  };
  box("floor", 0, -0.075, 0, 7.8, 0.22, 6.2, floor);
  for (let i = -3; i <= 3; i++)
    box("floor-seam", i, 0.037, 0, 0.014, 0.003, 6.1, teal);
  for (let i = -2; i <= 2; i++)
    box("floor-seam", 0, 0.037, i, 7.7, 0.003, 0.014, teal);
  box("back-wall", 0, 1.45, -3, 7.8, 2.9, 0.15, wall);
  box("side-wall", -3.85, 1.45, 0, 0.15, 2.9, 6.1, wall);
  box("back-panel", 0, 0.5, -2.91, 7.65, 0.93, 0.03, teal);
  box("side-panel", -3.76, 0.5, 0, 0.03, 0.93, 6, teal);
  box("back-rail", 0, 1, -2.88, 7.65, 0.055, 0.04, trim);
  box("side-rail", -3.73, 1, 0, 0.04, 0.055, 6, trim);
  box("back-base", 0, 0.1, -2.86, 7.65, 0.13, 0.07, trim);
  box("side-base", -3.7, 0.1, 0, 0.07, 0.13, 6, trim);
  // Closed supply lockers and a changing bench leave the task cabinet clearly distinct.
  for (let i = 0; i < 3; i++) {
    const z = -2.4 + i * 0.6;
    box("locker", -3.1, 1, z, 0.65, 1.9, 0.55, teal);
    box("locker-door", -2.76, 1, z, 0.035, 1.77, 0.48, trim);
    box("locker-handle", -2.72, 1, z + 0.12, 0.045, 0.17, 0.025, dark);
    for (let j = 0; j < 3; j++)
      box("locker-vent", -2.735, 1.55 + j * 0.07, z, 0.012, 0.025, 0.3, dark);
  }
  box("bench", -2.8, 0.5, 1.1, 1.2, 0.1, 0.6, wood);
  for (const x of [-3.25, -2.35])
    box("bench-leg", x, 0.26, 1.1, 0.07, 0.43, 0.43, dark);
  box("packing-table", 3, 0.83, -1.9, 0.8, 0.1, 1.4, wood);
  for (const z of [-2.45, -1.35])
    box("packing-leg", 3, 0.42, z, 0.6, 0.76, 0.06, dark);
  box("empty-tray", 3, 0.93, -1.9, 0.55, 0.1, 0.6, teal);
  // A small high window keeps the cabinet well framed and the room visually lighter.
  box("window-frame", -2, 2.22, -2.87, 1.3, 0.65, 0.1, trim);
  box("window", -2, 2.22, -2.8, 1.16, 0.51, 0.025, mat("glass", "#b5d3d0"));
  return root;
}
