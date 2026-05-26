import { cardinals, inBounds } from '../utils/grid.js';
import { recalculateThreats, rebuildEntityIndex } from './entityPlacer.js';

const BLOCKED_TERRAINS = new Set(['wall','door','entrance','exit','stairsIn','stairsOut']);
const CREATURE_TYPES = new Set(['basic','tactical','special','brute','miniBoss','boss']);

export function validateFloor(floor, dungeonFloors = [floor]) {
  const issues = [];
  const passable = (c) => c.terrain !== 'wall';
  const start = findCell(floor, floor.index === 1 ? 'entrance' : 'stairsIn');
  if (!start) issues.push('start-missing');
  const seen = floodFill(floor, start, passable);

  const mustReach = [];
  if (floor.index < 5) mustReach.push(findCell(floor, 'stairsOut'));
  if (floor.index === 5) mustReach.push(findCell(floor, 'exit'));
  for (const c of mustReach.filter(Boolean)) if (!seen.has(`${c.x},${c.y}`)) issues.push('special-unreachable');

  issues.push(...rebuildEntityIndex(floor));
  const computed = recalculateThreats(floor);
  for (const room of floor.rooms) {
    const expected = computed.threatByRoom[room.id] ?? 0;
    const budget = room.threatBudget ?? floor.threatBudget ?? 0;
    if (expected > budget) issues.push('room-threat-over-budget');
    if (room.placementType !== 'safe' && expected < budget) issues.push('room-threat-under-budget');
    if (room.placementType !== 'safe' && expected !== budget) issues.push('room-threat-not-equal-budget');
  }

  const allEntities = dungeonFloors.flatMap((f) => f.entities || []);
  const bosses = allEntities.filter((e) => e.type === 'boss');
  const miniBosses = allEntities.filter((e) => e.type === 'miniBoss');
  if (bosses.length > 1) issues.push('too-many-boss');
  if (miniBosses.length > 1) issues.push('too-many-mini-boss');
  if (floor.index === 5 && !floor.entities.some((e) => e.type === 'boss')) issues.push('boss-required-floor-5');

  for (const e of floor.entities) {
    const cell = floor.grid[e.y]?.[e.x];
    if (!cell) { issues.push('entity-outside-grid'); continue; }
    if (BLOCKED_TERRAINS.has(cell.terrain)) issues.push('entity-on-special');
    if (!floor.rooms.some((r) => r.id === e.roomId)) issues.push('entity-room-invalid');
    if (e.type === 'boss' && floor.index !== 5) issues.push('boss-wrong-floor');
    if (e.type === 'miniBoss' && floor.index !== 4) issues.push('mini-boss-wrong-floor');
  }


  for (const room of floor.rooms) {
    const pType = room.placementType;
    const creatureCount = floor.entities.filter((e) => CREATURE_TYPES.has(e.type) && e.roomId === room.id).length;
    if (pType === 'safe' && creatureCount > 0) issues.push('safe-room-has-creature');
    if (pType !== 'safe' && creatureCount === 0) issues.push('combat-room-empty');
  }
  for (const boss of floor.entities.filter((e) => e.type === 'boss')) if (!seen.has(`${boss.x},${boss.y}`)) issues.push('boss-unreachable');

  return { ok: issues.length === 0, issues: [...new Set(issues)] };
}
function floodFill(floor, start, passable) { const seen = new Set(); if (!start) return seen; seen.add(`${start.x},${start.y}`); const q = [start]; while (q.length) { const c=q.shift(); for (const [dx,dy] of cardinals) { const nx=c.x+dx, ny=c.y+dy; if (!inBounds(floor.grid,nx,ny)) continue; const n=floor.grid[ny][nx],k=`${nx},${ny}`; if (seen.has(k)||!passable(n)) continue; seen.add(k); q.push(n);} } return seen; }
function findCell(floor, terrain) { for (const row of floor.grid) for (const c of row) if (c.terrain === terrain) return c; return null; }
