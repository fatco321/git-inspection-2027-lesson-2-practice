export const CABINET = {
  x: 0,
  z: -2.45,
  rotation: 0,
  interactionX: 0,
  interactionZ: -1.25,
  workerX: 0.55,
  workerZ: -1.75,
} as const;
export const PROTECTION_STATIONS = [
  {
    id: "task1",
    name: "Шкаф средств защиты",
    x: CABINET.interactionX,
    z: CABINET.interactionZ,
  },
  { id: "exit-protection", name: "Выйти во двор", x: 2.6, z: 2.25 },
] as const;
export function canStandInProtection(x: number, z: number): boolean {
  if (Math.abs(x) > 3.55 || z < -2.65 || z > 2.65) return false;
  return ![
    [CABINET.x, CABINET.z, 2, 0.6],
    [-3.1, -1.8, 0.7, 1.8],
    [-2.8, 1.1, 1.2, 0.65],
    [3, -1.9, 0.8, 1.4],
  ].some(
    ([cx, cz, w, d]) =>
      Math.abs(x - cx) < w / 2 + 0.23 && Math.abs(z - cz) < d / 2 + 0.23,
  );
}
