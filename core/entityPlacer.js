import { randInt } from '../utils/random.js';
import { uid } from '../utils/ids.js';
import { TERRAIN } from '../data/tileTypes.js';

const THREAT_VALUES = { basic: 1, tactical: 2, special: 3, brute: 3, miniBoss: 4, boss: 5 };
const CREATURE_TYPES = new Set(Object.keys(THREAT_VALUES));
const BLOCKED_TERRAINS = new Set([TERRAIN.WALL, TERRAIN.DOOR, TERRAIN.ENTRANCE, TERRAIN.EXIT, TERRAIN.STAIRS_IN, TERRAIN.STAIRS_OUT]);
const ALLOWED_BY_FLOOR = {
  1: ['basic', 'tactical'],
  2: ['basic', 'tactical', 'special'],
  3: ['basic', 'tactical', 'special', 'brute'],
  4: ['basic', 'tactical', 'special', 'brute', 'miniBoss'],
  5: ['basic', 'tactical', 'special', 'brute', 'boss']
};

export function clearCreaturesFromFloor(floor) {
  floor.entities = (floor.entities || []).filter((e) => !CREATURE_TYPES.has(e.type));
}
export function rebuildEntityIndex(floor) {
  const errors = []; const seen = new Set();
  for (const row of floor.grid) for (const cell of row) cell.entityId = null;
  for (const entity of floor.entities || []) {
    const cell = floor.grid?.[entity.y]?.[entity.x]; const key = `${entity.x},${entity.y}`;
    if (!cell) { errors.push('entity-outside-grid'); continue; }
    if (seen.has(key)) { errors.push('entity-overlap'); continue; }
    seen.add(key); cell.entityId = entity.id;
  }
  return [...new Set(errors)];
}
export function recalculateThreats(floor) {
  const threatByRoom = Object.fromEntries((floor.rooms || []).map((r) => [r.id, 0]));
  for (const room of floor.rooms || []) room.threatUsed = 0;
  for (const entity of floor.entities || []) if (CREATURE_TYPES.has(entity.type)) threatByRoom[entity.roomId] = (threatByRoom[entity.roomId] || 0) + THREAT_VALUES[entity.type];
  for (const room of floor.rooms || []) room.threatUsed = threatByRoom[room.id] || 0;
  return { threatByRoom, totalThreat: Object.values(threatByRoom).reduce((a, b) => a + b, 0) };
}

function roomCells(room, floor) { const out = []; for (let y = room.y; y < room.y + room.h; y++) for (let x = room.x; x < room.x + room.w; x++) out.push(floor.grid[y][x]); return out; }
function isSpawnValidCell(floor, room, x, y) {
  const cell = floor.grid?.[y]?.[x]; if (!cell || cell.roomId !== room.id) return false;
  if (BLOCKED_TERRAINS.has(cell.terrain)) return false;
  if (cell.entityId) return false;
  return true;
}
function isEntryRoom(room, floor) {
  return roomCells(room, floor).some((c) => [TERRAIN.ENTRANCE, TERRAIN.STAIRS_IN].includes(c.terrain));
}
export function getPreferredCreatureCells(floor, room) {
  const doors = []; for (const c of roomCells(room, floor)) if (c.terrain === TERRAIN.DOOR) doors.push(c);
  const entries = roomCells(room, floor).filter((c) => [TERRAIN.ENTRANCE, TERRAIN.STAIRS_IN, TERRAIN.EXIT, TERRAIN.STAIRS_OUT].includes(c.terrain));
  const cx = room.x + Math.floor(room.w / 2), cy = room.y + Math.floor(room.h / 2);
  const scored = [];
  for (let y = room.y; y < room.y + room.h; y++) for (let x = room.x; x < room.x + room.w; x++) {
    if (!isSpawnValidCell(floor, room, x, y)) continue;
    let s = 0;
    const wallDist = Math.min(x - room.x, y - room.y, room.x + room.w - 1 - x, room.y + room.h - 1 - y);
    s += wallDist <= 1 ? 5 : wallDist === 2 ? 2 : -1;
    const isCornerish = (x - room.x <= 2 || room.x + room.w - 1 - x <= 2) && (y - room.y <= 2 || room.y + room.h - 1 - y <= 2);
    if (isCornerish) s += 3;
    if (x === cx && y === cy) s -= 6;
    for (const d of doors) { const dist = Math.abs(d.x - x) + Math.abs(d.y - y); if (dist <= 1) s += 2; }
    for (const e of entries) { const dist = Math.abs(e.x - x) + Math.abs(e.y - y); if (dist <= 1) s -= 9; else if (dist <= 2) s -= 4; }
    scored.push({ x, y, score: s + randInt(0, 2) });
  }
  return scored.sort((a, b) => b.score - a.score);
}

function buildExactThreatGroup(floor, room, targetThreat) {
  const allowed = [...(ALLOWED_BY_FLOOR[floor.index] || ['basic'])].filter((t) => t !== 'boss' && t !== 'miniBoss').sort((a,b)=>THREAT_VALUES[b]-THREAT_VALUES[a]);
  const group = [];
  let remaining = targetThreat;
  if (room.type === 'boss' && floor.index === 5) {
    group.push('boss');
    remaining -= THREAT_VALUES.boss;
  } else if (room.type === 'mini-boss' && floor.index === 4 && remaining >= THREAT_VALUES.miniBoss) {
    group.push('miniBoss');
    remaining -= THREAT_VALUES.miniBoss;
  }
  while (remaining > 0) {
    const next = allowed.find((t) => THREAT_VALUES[t] <= remaining);
    if (!next) return null;
    group.push(next);
    remaining -= THREAT_VALUES[next];
  }
  return group;
}

export function tryPlaceCreature(floor, room, type, options = {}) {
  if (!CREATURE_TYPES.has(type)) return { ok: false, reason: 'invalid-type' };
  const budget = room.threatBudget ?? floor.threatBudget;
  recalculateThreats(floor);
  if ((room.threatUsed || 0) + THREAT_VALUES[type] > budget) return { ok: false, reason: 'budget' };
  const cells = getPreferredCreatureCells(floor, room);
  const spot = options.at || cells[0]; if (!spot) return { ok: false, reason: 'no-cell' };
  const entity = { id: uid('ent'), type, x: spot.x, y: spot.y, roomId: room.id };
  floor.entities.push(entity); rebuildEntityIndex(floor); recalculateThreats(floor);
  return { ok: true, entity };
}

export function placeCreaturesForFloor(floor) {
  clearCreaturesFromFloor(floor); rebuildEntityIndex(floor); recalculateThreats(floor);
  for (const room of floor.rooms) {
    room.threatBudget = floor.threatBudget;
    room.placementType = room.type === 'boss' ? 'boss' : room.type === 'mini-boss' ? 'miniBoss' : (isEntryRoom(room, floor) ? 'safe' : 'combat');
  }

  for (const room of floor.rooms) {
    if (room.placementType === 'safe') continue;
    const group = buildExactThreatGroup(floor, room, room.threatBudget ?? floor.threatBudget);
    if (!group) continue;
    for (const type of group) {
      const placed = tryPlaceCreature(floor, room, type);
      if (!placed.ok) break;
    }
  }
}

export function placeEntities(floor, roomBudget, options = {}) {
  floor.threatBudget = roomBudget;
  placeCreaturesForFloor(floor, options.settings || {}, { floors: options.dungeonFloors || [floor] });
  return floor.entities;
}

export const tryPlaceEntity = tryPlaceCreature;
