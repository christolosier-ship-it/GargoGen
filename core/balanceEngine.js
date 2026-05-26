export function allowedByFloor(floorIndex) {
  if (floorIndex === 1) return ['basic', 'tactical'];
  if (floorIndex === 2) return ['basic', 'tactical', 'special'];
  if (floorIndex === 3) return ['basic', 'tactical', 'special', 'brute'];
  if (floorIndex === 4) return ['basic', 'tactical', 'special', 'brute', 'miniBoss'];
  return ['basic', 'tactical', 'special', 'brute'];
}
