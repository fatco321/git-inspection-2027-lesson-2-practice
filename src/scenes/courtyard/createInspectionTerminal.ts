import type { Scene } from "@babylonjs/core/scene";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import type { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator";
import { TERMINAL } from "./practiceLayout";

/** Local +Z is the screen/front. Face the central square, away from administration. */
export function createInspectionTerminal(
  scene: Scene,
  shadows: ShadowGenerator,
) {
  const root = new TransformNode("inspection-terminal", scene);
  root.position.set(TERMINAL.x, 0, TERMINAL.z);
  root.rotation.y = TERMINAL.rotation;
  const mat = (name: string, color: string) => {
    const m = new StandardMaterial("terminal-" + name, scene);
    m.diffuseColor = Color3.FromHexString(color);
    m.specularColor.setAll(0.12);
    return m;
  };
  const shell = mat("enamel", "#dcdcca"),
    teal = mat("teal", "#4e858b"),
    dark = mat("graphite", "#2a404c"),
    metal = mat("metal", "#91a9ad");
  const box = (
    name: string,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    m: StandardMaterial,
    parent = root,
  ) => {
    const mesh = MeshBuilder.CreateBox(
      "terminal-" + name,
      { width: w, height: h, depth: d },
      scene,
    );
    mesh.parent = parent;
    mesh.position.set(x, y, z);
    mesh.material = m;
    mesh.receiveShadows = true;
    shadows.addShadowCaster(mesh);
    return mesh;
  };
  box("foot", 0, 0.065, 0, 1.02, 0.13, 0.74, dark);
  box("plinth", 0, 0.17, 0, 0.82, 0.12, 0.58, metal);
  box("body", 0, 0.75, -0.035, 0.72, 1.1, 0.43, shell);
  for (const x of [-0.365, 0.365])
    box("side-trim", x, 0.79, -0.035, 0.035, 1.14, 0.44, teal);
  box("front-inset", 0, 0.64, 0.19, 0.57, 0.68, 0.018, teal);
  box("receipt-slot", 0, 0.83, 0.21, 0.36, 0.034, 0.025, dark);
  box("slot-lip", 0, 0.79, 0.225, 0.4, 0.028, 0.06, metal);
  for (let i = 0; i < 4; i++)
    box("vent", 0, 0.39 + i * 0.045, -0.256, 0.38, 0.017, 0.018, dark);
  const head = new TransformNode("terminal-head", scene);
  head.parent = root;
  head.position.set(0, 1.46, -0.015);
  head.rotation.x = -0.16;
  box("display-shell", 0, 0, 0, 1.02, 0.83, 0.23, shell, head);
  box("display-bezel", 0, 0, 0.124, 0.89, 0.68, 0.045, dark, head);
  box("visor", 0, 0.45, 0.025, 1.09, 0.065, 0.34, teal, head);
  const texture = new DynamicTexture(
    "terminal-display",
    { width: 512, height: 384 },
    scene,
    false,
  );
  const c = texture.getContext();
  c.fillStyle = "#e8f0e9";
  c.fillRect(0, 0, 512, 384);
  c.fillStyle = "#315c70";
  c.fillRect(0, 0, 512, 64);
  // An information symbol, document and search icon: recognizable without extra instructions.
  c.fillStyle = "#c9e7dc";
  c.beginPath();
  c.arc(38, 32, 18, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = "#315c70";
  c.fillRect(35, 28, 6, 16);
  c.fillRect(35, 19, 6, 5);
  c.fillStyle = "#a7c8c7";
  c.fillRect(75, 26, 170, 10);
  c.fillStyle = "#ffffff";
  c.fillRect(58, 95, 190, 193);
  c.strokeStyle = "#6c999f";
  c.lineWidth = 6;
  c.strokeRect(58, 95, 190, 193);
  c.fillStyle = "#97b3b2";
  for (let i = 0; i < 4; i++)
    c.fillRect(82, 129 + i * 32, i === 3 ? 85 : 135, 8);
  c.strokeStyle = "#315c70";
  c.lineWidth = 15;
  c.beginPath();
  c.arc(349, 179, 52, 0, Math.PI * 2);
  c.stroke();
  c.beginPath();
  c.moveTo(387, 218);
  c.lineTo(425, 256);
  c.stroke();
  c.fillStyle = "#579994";
  c.fillRect(58, 316, 190, 38);
  c.fillStyle = "#bdcec8";
  c.fillRect(272, 316, 182, 38);
  texture.update();
  const display = mat("screen", "#ffffff");
  display.diffuseTexture = texture;
  display.emissiveTexture = texture;
  display.disableLighting = true;
  const screen = MeshBuilder.CreatePlane(
    "terminal-screen",
    { width: 0.8, height: 0.6 },
    scene,
  );
  screen.parent = head;
  screen.position.z = 0.15;
  screen.rotation.y = Math.PI;
  screen.material = display;
  const shelf = box("control-shelf", 0, 1.01, 0.3, 0.86, 0.08, 0.34, teal);
  shelf.rotation.x = -0.1;
  for (let i = 0; i < 3; i++) {
    const key = MeshBuilder.CreateCylinder(
      "terminal-key",
      { diameter: 0.065, height: 0.015, tessellation: 16 },
      scene,
    );
    key.parent = root;
    key.position.set(-0.13 + i * 0.13, 1.063, 0.32);
    key.material = i === 2 ? teal : metal;
    shadows.addShadowCaster(key);
  }
  return root;
}
