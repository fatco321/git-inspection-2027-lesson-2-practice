import type { Scene } from "@babylonjs/core/scene";
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";

/** Small deterministic, seamless textures drawn locally; no external texture assets. */
export function courtyardMaterials(scene: Scene) {
  let seed = 3719;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const make = (
    name: string,
    base: string,
    draw: (ctx: CanvasRenderingContext2D) => void,
    tileSize: number,
  ) => {
    const texture = new DynamicTexture(
      name + "-texture",
      { width: 512, height: 512 },
      scene,
      true,
      Texture.TRILINEAR_SAMPLINGMODE,
    );
    const ctx = texture.getContext() as CanvasRenderingContext2D;
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, 512, 512);
    draw(ctx);
    texture.wrapU = texture.wrapV = Texture.WRAP_ADDRESSMODE;
    texture.anisotropicFilteringLevel = 4;
    texture.update();
    const mat = new StandardMaterial(name, scene);
    mat.diffuseColor = Color3.White();
    mat.diffuseTexture = texture;
    mat.specularColor.setAll(0.05);
    mat.metadata = { tileSize };
    return mat;
  };
  const grain = (
    ctx: CanvasRenderingContext2D,
    count: number,
    alpha: number,
  ) => {
    for (let i = 0; i < count; i++) {
      ctx.fillStyle =
        i % 2 ? `rgba(255,255,255,${alpha})` : `rgba(24,40,43,${alpha})`;
      const size = 1 + random() * 3;
      ctx.fillRect(
        Math.floor(random() * 512),
        Math.floor(random() * 512),
        size,
        size,
      );
    }
  };
  const asphalt = make(
    "yard-asphalt",
    "#829c9e",
    (ctx) => grain(ctx, 9500, 0.11),
    2,
  );
  const concrete = make(
    "cast-concrete",
    "#9faeaa",
    (ctx) => {
      grain(ctx, 3000, 0.055);
      ctx.strokeStyle = "#909f9c";
      ctx.lineWidth = 2;
      ctx.strokeRect(0, 0, 512, 512);
    },
    2,
  );
  const brick = make(
    "sand-brick",
    "#b8b4a2",
    (ctx) => {
      for (let row = 0; row < 8; row++)
        for (let col = -1; col < 5; col++) {
          const x = col * 128 + (row % 2) * 64,
            y = row * 64;
          const shade = Math.floor(random() * 12);
          ctx.fillStyle = `rgb(${206 + shade},${193 + shade},${166 + shade})`;
          ctx.fillRect(x + 3, y + 3, 122, 58);
          ctx.fillStyle = "#e2d7bb";
          ctx.fillRect(x + 4, y + 4, 120, 2);
        }
      grain(ctx, 2400, 0.035);
    },
    2,
  );
  const paving = make(
    "walkway-pavers",
    "#b5b5a5",
    (ctx) => {
      for (let row = 0; row < 4; row++)
        for (let col = 0; col < 4; col++) {
          const shade = Math.floor(random() * 9);
          ctx.fillStyle = `rgb(${202 + shade},${199 + shade},${179 + shade})`;
          ctx.fillRect(col * 128 + 2, row * 128 + 2, 124, 124);
          ctx.strokeStyle = "#dcd9c8";
          ctx.lineWidth = 2;
          ctx.strokeRect(col * 128 + 5, row * 128 + 5, 118, 118);
        }
      grain(ctx, 1800, 0.035);
    },
    2.4,
  );
  const roof = make(
    "standing-seam-roof",
    "#657b8a",
    (ctx) => {
      for (let x = 0; x < 512; x += 128) {
        ctx.fillStyle = "#475f70";
        ctx.fillRect(x, 0, 5, 512);
        ctx.fillStyle = "#91a3ab";
        ctx.fillRect(x + 5, 0, 3, 512);
      }
      grain(ctx, 1300, 0.035);
    },
    2.4,
  );
  const metal = make(
    "painted-shutter",
    "#649091",
    (ctx) => {
      for (let y = 0; y < 512; y += 64) {
        ctx.fillStyle = "#486e74";
        ctx.fillRect(0, y, 512, 4);
        ctx.fillStyle = "#80a5a2";
        ctx.fillRect(0, y + 4, 512, 3);
      }
      grain(ctx, 1200, 0.035);
    },
    1.6,
  );
  const wood = make(
    "wooden-crates",
    "#b18c62",
    (ctx) => {
      for (let x = 0; x < 512; x += 128) {
        ctx.fillStyle = "#816749";
        ctx.fillRect(x, 0, 4, 512);
        for (let j = 0; j < 9; j++) {
          ctx.strokeStyle = "rgba(99,70,39,.15)";
          ctx.lineWidth = 1 + random() * 2;
          ctx.beginPath();
          const offset = x + 12 + random() * 100;
          ctx.moveTo(offset, 0);
          ctx.bezierCurveTo(offset + 10, 150, offset - 10, 350, offset, 512);
          ctx.stroke();
        }
      }
    },
    0.8,
  );
  return { asphalt, concrete, brick, paving, roof, metal, wood };
}
