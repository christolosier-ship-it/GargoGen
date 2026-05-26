import { cardinals, inBounds } from '../utils/grid.js';

export function validateFloor(floor) {
  const passable = (c) => c.terrain !== 'wall';
  const start = findCell(floor, 'entrance') || findCell(floor, 'floor');
  if (!start) return false;
  const seen = new Set([`${start.x},${start.y}`]);
  const q = [start];
  while (q.length) {
    const c = q.shift();
    for (const [dx,dy] of cardinals) {
      const nx = c.x + dx, ny = c.y + dy;
      if (!inBounds(floor.grid,nx,ny)) continue;
      const n = floor.grid[ny][nx], k = `${nx},${ny}`;
      if (seen.has(k) || !passable(n)) continue;
      seen.add(k); q.push(n);
    }
  }
  const exit = findCell(floor, 'exit') || findCell(floor, 'stairsOut');
  if (exit && !seen.has(`${exit.x},${exit.y}`)) return false;
  const boss = floor.entities.find(e => e.type === 'boss');
  if (boss && !seen.has(`${boss.x},${boss.y}`)) return false;
  return floor.rooms.every(r => seen.has(`${r.x+1},${r.y+1}`));
}

function findCell(floor, terrain) {
  for (const row of floor.grid) for (const c of row) if (c.terrain === terrain) return c;
  return null;
}
