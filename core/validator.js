import { cardinals, inBounds } from '../utils/grid.js';

export function validateFloor(floor) {
  const issues = [];
  const passable = (c) => c.terrain !== 'wall';
  const start = findCell(floor, floor.index === 1 ? 'entrance' : 'stairsIn');
  if (!start) issues.push('start-missing');

  const seen = new Set();
  if (start) {
    seen.add(`${start.x},${start.y}`);
    const q = [start];
    while (q.length) {
      const c = q.shift();
      for (const [dx, dy] of cardinals) {
        const nx = c.x + dx, ny = c.y + dy;
        if (!inBounds(floor.grid, nx, ny)) continue;
        const n = floor.grid[ny][nx], k = `${nx},${ny}`;
        if (seen.has(k) || !passable(n)) continue;
        seen.add(k); q.push(n);
      }
    }
  }

  const mustReach = [];
  if (floor.index === 1) mustReach.push(findCell(floor, 'entrance'));
  if (floor.index > 1) mustReach.push(findCell(floor, 'stairsIn'));
  if (floor.index < 5) mustReach.push(findCell(floor, 'stairsOut'));
  if (floor.index === 5) mustReach.push(findCell(floor, 'exit'));
  for (const c of mustReach.filter(Boolean)) if (!seen.has(`${c.x},${c.y}`)) issues.push('special-unreachable');

  const entityAt = new Set();
  const bosses = floor.entities.filter((e) => e.type === 'boss');
  const miniBosses = floor.entities.filter((e) => e.type === 'miniBoss');
  if (bosses.length > 1) issues.push('too-many-boss');
  if (miniBosses.length > 1) issues.push('too-many-mini-boss');
  if (floor.index === 5 && bosses.length !== 1) issues.push('boss-required-floor-5');
  if (floor.index !== 5 && bosses.length > 0) issues.push('boss-wrong-floor');
  if (floor.index !== 4 && miniBosses.length > 0) issues.push('mini-boss-wrong-floor');

  for (const e of floor.entities) {
    const cell = floor.grid[e.y]?.[e.x];
    const pos = `${e.x},${e.y}`;
    if (entityAt.has(pos)) issues.push('entity-overlap');
    entityAt.add(pos);
    if (!cell) { issues.push('entity-outside-grid'); continue; }
    if (cell.terrain === 'wall') issues.push('entity-on-wall');
    if (['door', 'stairsIn', 'stairsOut', 'entrance', 'exit'].includes(cell.terrain)) issues.push('entity-on-special');
  }

  for (const room of floor.rooms) {
    const rx = room.x + 1, ry = room.y + 1;
    if (!seen.has(`${rx},${ry}`)) issues.push('room-unreachable');
    if ((room.threatUsed ?? 0) > (room.threatBudget ?? floor.threatBudget ?? 0)) issues.push('room-threat-over-budget');
  }

  return { ok: issues.length === 0, issues: [...new Set(issues)] };
}

function findCell(floor, terrain) {
  for (const row of floor.grid) for (const c of row) if (c.terrain === terrain) return c;
  return null;
}
