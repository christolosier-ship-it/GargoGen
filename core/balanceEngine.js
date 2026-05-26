export function allowedByFloor(floorIndex) {
  if (floorIndex === 1) return ['basic', 'tactical'];
  if (floorIndex === 2) return ['basic', 'tactical', 'special'];
  return ['basic', 'tactical', 'special', 'brute'];
}
