import { createInspectionTerminal } from "./createInspectionTerminal";
import { courtyardMaterials } from "./courtyardMaterials";
import type { Scene } from "@babylonjs/core/scene";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3, Vector4 } from "@babylonjs/core/Maths/math.vector";
import type { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator";

export function createCourtyard(scene: Scene, shadows: ShadowGenerator) {
  const surfaces = courtyardMaterials(scene);
  const material = (name: string, color: string, glow = false) => {
    const m = new StandardMaterial(name, scene);
    m.diffuseColor = Color3.FromHexString(color);
    m.specularColor.setAll(0.08);
    if (glow) {
      m.emissiveColor = m.diffuseColor;
      m.disableLighting = true;
    }
    return m;
  };
  const slate = material("slate", "#385465"),
    floor = surfaces.asphalt,
    wall = material("warm-wall", "#e2d8c3"),
    teal = material("teal", "#5c8f94"),
    roof = surfaces.roof,
    glass = material("windows", "#aacfd4"),
    orange = material("orange", "#c98d57"),
    light = material("network-light", "#a4e6d1", true);
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
    const mesh = MeshBuilder.CreateBox(
      name,
      {
        width: w,
        height: h,
        depth: d,
        wrap: true,
        faceUV: m.metadata?.tileSize
          ? [
              new Vector4(
                0,
                0,
                w / m.metadata.tileSize,
                h / m.metadata.tileSize,
              ),
              new Vector4(
                0,
                0,
                w / m.metadata.tileSize,
                h / m.metadata.tileSize,
              ),
              new Vector4(
                0,
                0,
                d / m.metadata.tileSize,
                h / m.metadata.tileSize,
              ),
              new Vector4(
                0,
                0,
                d / m.metadata.tileSize,
                h / m.metadata.tileSize,
              ),
              new Vector4(
                0,
                0,
                w / m.metadata.tileSize,
                d / m.metadata.tileSize,
              ),
              new Vector4(
                0,
                0,
                w / m.metadata.tileSize,
                d / m.metadata.tileSize,
              ),
            ]
          : undefined,
      },
      scene,
    );
    mesh.position.set(x, y, z);
    mesh.material = m;
    mesh.receiveShadows = true;
    if (parent) mesh.parent = parent;
    shadows.addShadowCaster(mesh);
    return mesh;
  };
  box("floating-foundation", 0, -0.5, 0, 20, 0.9, 15, slate);
  box("courtyard-floor", 0, -0.025, 0, 19.8, 0.05, 14.8, floor);
  const line = (name: string, path: Vector3[], m = light) => {
    const mesh = MeshBuilder.CreateTube(
      name,
      { path, radius: 0.024, tessellation: 8 },
      scene,
    );
    mesh.material = m;
    return mesh;
  };
  line("perimeter", [
    new Vector3(-9.7, 0.04, 7.2),
    new Vector3(9.7, 0.04, 7.2),
    new Vector3(9.7, 0.04, -7.2),
    new Vector3(-9.7, 0.04, -7.2),
    new Vector3(-9.7, 0.04, 7.2),
  ]);
  // Three modest buildings, with repeated details rather than unrelated asset styles.
  for (const [i, b] of [
    { x: -6, z: -3.3, w: 4.5, d: 4, h: 3.1 },
    { x: 5.8, z: -3.3, w: 5, d: 4.3, h: 2.7 },
    { x: 0, z: -5, w: 4, d: 3, h: 2.2 },
  ].entries()) {
    box("building-" + i, b.x, b.h / 2, b.z, b.w, b.h, b.d, surfaces.brick);
    box("roof-" + i, b.x, b.h + 0.13, b.z, b.w + 0.3, 0.26, b.d + 0.3, roof);
    box(
      "foundation-" + i,
      b.x,
      0.15,
      b.z,
      b.w + 0.16,
      0.3,
      b.d + 0.16,
      surfaces.concrete,
    );
    const front = b.z + b.d / 2 + 0.035;
    box(
      "roof-front-trim",
      b.x,
      b.h + 0.03,
      front,
      b.w + 0.36,
      0.14,
      0.13,
      slate,
    );
    for (const side of [-1, 1])
      box(
        "downpipe",
        b.x + side * (b.w / 2 - 0.12),
        b.h / 2,
        front + 0.07,
        0.09,
        b.h,
        0.09,
        slate,
      );
    box(
      "roof-vent",
      b.x + 0.8,
      b.h + 0.48,
      b.z - 0.6,
      0.8,
      0.45,
      0.65,
      surfaces.metal,
    );
    box("vent-cap", b.x + 0.8, b.h + 0.73, b.z - 0.6, 0.95, 0.08, 0.8, slate);
    if (i === 0) {
      for (const y of [1, 2.2])
        for (const offset of [-1.45, -0.45, 0.55, 1.55]) {
          if (y === 1 && Math.abs(offset) < 0.8) continue;
          box("window-frame", b.x + offset, y, front, 0.77, 0.83, 0.08, wall);
          box(
            "office-window",
            b.x + offset,
            y,
            front + 0.055,
            0.64,
            0.7,
            0.06,
            glass,
          );
          box(
            "window-mullion",
            b.x + offset,
            y,
            front + 0.095,
            0.035,
            0.7,
            0.025,
            wall,
          );
          box(
            "window-sill",
            b.x + offset,
            y - 0.43,
            front + 0.12,
            0.85,
            0.08,
            0.26,
            surfaces.concrete,
          );
        }
      box("entrance", b.x, 0.87, front + 0.03, 1.05, 1.72, 0.08, teal);
    } else {
      box("roller-door", b.x, 0.96, front, 2.3, 1.85, 0.08, surfaces.metal);
      for (let j = 0; j < 6; j++)
        box(
          "door-slat",
          b.x,
          0.3 + j * 0.27,
          front + 0.05,
          2.22,
          0.025,
          0.02,
          slate,
        );
      box(
        "canopy",
        b.x,
        2.02,
        front + 0.3,
        2.8,
        0.15,
        0.75,
        i === 1 ? orange : teal,
      );
    }
  }
  // Clear pedestrian route and a few props keep the yard readable.
  box("walkway", 0, 0.018, 3.2, 8, 0.035, 4.6, surfaces.paving);
  for (const x of [-4.04, 4.04])
    box("walkway-curb", x, 0.075, 3.2, 0.12, 0.15, 4.6, surfaces.concrete);
  for (const [x, z] of [[5, 1.2]]) {
    box("drain-frame", x, 0.02, z, 0.9, 0.035, 0.45, slate);
    for (let i = 0; i < 7; i++)
      box(
        "drain-grille",
        x - 0.35 + i * 0.115,
        0.045,
        z,
        0.055,
        0.018,
        0.39,
        surfaces.concrete,
      );
  }
  const foliage = material("foliage", "#6d9679");
  for (const x of [-8.7, 8.7])
    for (const z of [-5, 0, 5]) {
      box("lamp-post", x, 1.45, z, 0.1, 2.9, 0.1, slate);
      box("lamp-cap", x, 2.93, z, 0.5, 0.1, 0.45, light);
    }
  for (const x of [-6.5, 6.5]) {
    box("planter", x, 0.3, 3.5, 1.7, 0.6, 0.8, slate);
    for (let i = 0; i < 3; i++) {
      const leaf = MeshBuilder.CreateSphere(
        "shrub",
        { diameter: 0.85, segments: 3 },
        scene,
      );
      leaf.position.set(x + (i - 1) * 0.5, 0.8, 3.5);
      leaf.material = foliage;
      shadows.addShadowCaster(leaf);
    }
  }
  for (let i = 0; i < 3; i++)
    box(
      "stacked-crate",
      7.9 + (i % 2) * 0.7,
      0.4 + Math.floor(i / 2) * 0.8,
      -0.5,
      0.65,
      0.8,
      0.65,
      surfaces.wood,
    );
  // The intact network behind the arrival point preserves the previous victory.
  for (const x of [-2, 0, 2]) {
    box("network-node", x, 0.18, 6, 0.45, 0.36, 0.45, teal);
    line("network-trace", [
      new Vector3(x, 0.07, 6),
      new Vector3(x, 0.07, 5.5),
      new Vector3(0, 0.07, 5.5),
      new Vector3(0, 0.07, 4.9),
    ]);
  }
  const label = (
    name: string,
    text: string,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    parent?: TransformNode,
  ) => {
    const mesh = MeshBuilder.CreatePlane(
      name,
      { width: w, height: h, sideOrientation: Mesh.DOUBLESIDE },
      scene,
    );
    mesh.position.set(x, y, z);
    mesh.billboardMode = Mesh.BILLBOARDMODE_ALL;
    if (parent) mesh.parent = parent;
    const texture = new DynamicTexture(
      name + "-text",
      { width: 768, height: 256 },
      scene,
      false,
    );
    const ctx = texture.getContext() as CanvasRenderingContext2D;
    ctx.fillStyle = "#203746";
    ctx.fillRect(0, 0, 768, 256);
    ctx.strokeStyle = "#9bcec9";
    ctx.lineWidth = 5;
    ctx.strokeRect(4, 4, 760, 248);
    ctx.fillStyle = "#f0f1e7";
    ctx.textAlign = "center";
    ctx.font = `600 ${text.includes("\n") ? 50 : 64}px sans-serif`;
    text
      .split("\n")
      .forEach((t, i, all) =>
        ctx.fillText(t, 384, 128 + (i - (all.length - 1) / 2) * 56 + 14),
      );
    texture.update();
    const m = material(name + "-material", "#ffffff", true);
    m.diffuseTexture = texture;
    m.emissiveTexture = texture;
    m.backFaceCulling = false;
    mesh.material = m;
    return mesh;
  };
  createInspectionTerminal(scene, shadows);
  const notification = label(
    "notification-screen",
    "Уведомления\nНовых сообщений нет",
    -4.8,
    2.1,
    2,
    2.6,
    0.87,
  );
  const board = new TransformNode("scenario-map", scene);
  board.position.set(0, 0, 0.3);
  board.setEnabled(false);
  // A single presentation desk: two separated exhibits and a dedicated document lane.
  board.rotation.y = 0;
  const ivory = material("exhibit-ivory", "#cbd0bc");
  const inset = material("exhibit-inset", "#426c77");
  const mint = material("exhibit-mint", "#a6c9ba");
  box("map-pedestal-foot", 0, 0.08, 0, 3.4, 0.16, 1.7, slate, board);
  box("map-pedestal", 0, 0.41, 0, 2.5, 0.66, 1.25, teal, board);
  box("map-rim", 0, 0.77, 0, 6.5, 0.16, 3.2, slate, board);
  box("map-surface", 0, 0.865, 0, 6.3, 0.035, 3, ivory, board);
  for (const x of [-1.6, 1.6]) {
    const plinth = MeshBuilder.CreateCylinder(
      "exhibit-plinth",
      {
        diameter: 2.15,
        height: 0.09,
        tessellation: 48,
      },
      scene,
    );
    plinth.parent = board;
    plinth.position.set(x, 0.925, -0.38);
    plinth.material = inset;
    plinth.receiveShadows = true;
    shadows.addShadowCaster(plinth);
    box("exhibit-stand", x, 1.13, -0.48, 0.16, 0.4, 0.16, slate, board);
  }
  // In this camera view positive local X is the left-hand exhibit.
  const planLabel = label(
    "scenario-one",
    "01 · План проверок",
    1.6,
    2.95,
    -0.38,
    2.65,
    0.7,
    board,
  );
  const folderLabel = label(
    "scenario-two",
    "02 · Предписание",
    -1.6,
    2.95,
    -0.38,
    2.65,
    0.7,
    board,
  );
  box("calendar", 1.6, 1.73, -0.38, 1.35, 1.05, 0.12, ivory, board);
  box("calendar-header", 1.6, 2.13, -0.3, 1.35, 0.24, 0.055, teal, board);
  for (const x of [1.2, 2])
    box("calendar-binding", x, 2.24, -0.29, 0.055, 0.18, 0.08, slate, board);
  for (let i = 0; i < 6; i++)
    box(
      "calendar-cell",
      1.22 + (i % 3) * 0.38,
      1.81 - Math.floor(i / 3) * 0.32,
      -0.295,
      0.24,
      0.2,
      0.035,
      i === 4 ? orange : mint,
      board,
    );
  for (const plaque of [planLabel, folderLabel]) {
    plaque.billboardMode = Mesh.BILLBOARDMODE_NONE;
    plaque.rotation.y = Math.PI;
  }
  // Papers visibly emerge from the folder; the front cover never intersects them.
  box("folder-back", -1.6, 1.65, -0.42, 1.35, 0.84, 0.08, orange, board);
  box("folder-tab", -1.95, 2.11, -0.42, 0.6, 0.16, 0.08, orange, board);
  box("folder-pages", -1.6, 1.78, -0.34, 1.15, 0.83, 0.055, ivory, board);
  box("folder-cover", -1.6, 1.59, -0.25, 1.4, 0.72, 0.07, orange, board);
  for (let i = 0; i < 3; i++)
    box(
      "folder-item",
      -1.6,
      1.78 - i * 0.18,
      -0.205,
      0.75,
      0.035,
      0.015,
      ivory,
      board,
    );
  box("document-lane", 0, 0.898, 1.02, 5.6, 0.028, 0.7, inset, board);
  const paper = box(
    "confirmation-document",
    -1.7,
    1.03,
    1.02,
    0.5,
    0.035,
    0.58,
    ivory,
    board,
  );
  for (let i = 0; i < 3; i++)
    box(
      "document-print",
      0,
      0.021,
      -0.15 + i * 0.12,
      0.32,
      0.007,
      0.024,
      teal,
      paper,
    );
  paper.setEnabled(false);
  const blockedLabel = label(
    "confirmation-label",
    "Подтверждение",
    0,
    0.58,
    1.64,
    2.5,
    0.45,
    board,
  );
  blockedLabel.billboardMode = Mesh.BILLBOARDMODE_NONE;
  blockedLabel.rotation.y = Math.PI;
  blockedLabel.setEnabled(false);
  return { light, board, paper, blockedLabel, notification };
}
