export const OFFICE_STATIONS = [
  { id: "admin", name: "Поговорить с сотрудником", x: 0, z: 0.05 },
  { id: "exit-admin", name: "Выйти во двор", x: 2.6, z: 2.25 },
] as const;
export function canStandInOffice(x: number, z: number): boolean {
  if (Math.abs(x) > 3.55 || z < -2.65 || z > 2.65) return false;
  return ![
    [0, -1.55, 2.3, 2.15], // Desk, seated administrator and chair.
    [-3.05, -1.7, 0.65, 1.8], // Filing cabinet.
    [3.05, -2.1, 0.65, 0.65], // Plant.
  ].some(
    ([cx, cz, w, d]) =>
      Math.abs(x - cx) < w / 2 + 0.23 && Math.abs(z - cz) < d / 2 + 0.23,
  );
}
