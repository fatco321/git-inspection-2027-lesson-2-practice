export const TERMINAL = {
  x: -4.8,
  z: 2,
  rotation: Math.PI / 2,
  interactionX: -3.65,
  interactionZ: 2,
} as const;
export const STATIONS = [
  {
    id: "terminal",
    name: "Терминал проверок",
    x: TERMINAL.interactionX,
    z: TERMINAL.interactionZ,
  },
  { id: "plan", name: "План мероприятий", x: -1.8, z: 1.6 },
  { id: "enter-admin", name: "Войти в администрацию", x: -6, z: -0.35 },
  { id: "task0", name: "Ограждение площадки", x: -5.2, z: 5.7 },
  {
    id: "enter-protection",
    name: "Войти на склад средств защиты",
    x: 0,
    z: -2.65,
  },
  {
    id: "task2",
    name: "Проход у склада",
    x: 5.7,
    z: 1.25,
    interactionArea: { x: 5.7, z: 0.15, halfWidth: 1.3, halfDepth: 0.4 },
  },
  { id: "guide", name: "Подсказка Андрея", x: 0.6, z: 4 },
] as const;
export function canStand(x: number, z: number) {
  if (Math.abs(x) > 9.05 || z > 6.9 || z < -6.6) return false;
  const boxes = [
    [8.2, -0.5, 1.4, 0.8],
    [-6, -3.3, 4.8, 4.3],
    [5.8, -3.3, 5.3, 4.6],
    [0, -5, 4.3, 3.3],
    [TERMINAL.x, TERMINAL.z, 0.82, 1.12],
    [-6.5, 3.5, 2, 1.1],
    [6.5, 3.5, 2, 1.1],
    [-1.8, 0.65, 2.1, 0.75],
    [-5.2, 6.45, 2.6, 0.7],
    [5.7, 0.15, 2.6, 0.8],
    [0.6, 4, 0.65, 0.65],
  ];
  return !boxes.some(
    ([cx, cz, w, d]) =>
      Math.abs(x - cx) < w / 2 + 0.2 && Math.abs(z - cz) < d / 2 + 0.2,
  );
}

/** Wide objects can be approached along their perimeter, not just a front hotspot. */
export function interactionDistance(
  station: {
    x: number;
    z: number;
    interactionArea?: {
      x: number;
      z: number;
      halfWidth: number;
      halfDepth: number;
    };
  },
  x: number,
  z: number,
): number {
  const area = station.interactionArea;
  return area
    ? Math.hypot(
        Math.max(0, Math.abs(x - area.x) - area.halfWidth),
        Math.max(0, Math.abs(z - area.z) - area.halfDepth),
      )
    : Math.hypot(station.x - x, station.z - z);
}
