import { randInt } from '../utils/random.js';
import { uid } from '../utils/ids.js';
import { TERRAIN } from '../data/tileTypes.js';

const THREAT_VALUES = { basic: 1, tactical: 2, special: 3, brute: 3, miniBoss: 4, boss: 5 };
const CREATURE_TYPES = new Set(Object.keys(THREAT_VALUES));
const BLOCKED_TERRAINS = new Set([TERRAIN.WALL, TERRAIN.DOOR, TERRAIN.ENTRANCE, TERRAIN.EXIT, TERRAIN.STAIRS_IN, TERRAIN.STAIRS_OUT]);

const ROOM_COUNTS_BY_FLOOR = { 1: [1, 2], 2: [2, 3], 3: [3, 4], 4: [3, 5], 5: [2, 4] };
const ROOM_TYPE_RANGES = {
  safe: [0, 0], transition: [0, 0.2], lightCombat: [0.3, 0.5], combat: [0.5, 0.75], hardCombat: [0.7, 0.9],
  treasureGuard: [0.3, 0.6], trapGuard: [0.2, 0.5], miniBoss: [0.45, 1], boss: [0.55, 1]
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

function classifyRoom(room, floor) {
  const hasSpecial = (terrains) => roomCells(room, floor).some((c) => terrains.includes(c.terrain));
  if (hasSpecial([TERRAIN.ENTRANCE, TERRAIN.STAIRS_IN, TERRAIN.EXIT])) return 'safe';
  if (floor.index === 5 && room.type === 'boss') return 'boss';
  if (floor.index === 4 && room.type === 'mini-boss') return 'miniBoss';
  if (room.type === 'trésor') return 'treasureGuard';
  if (room.type === 'piège') return 'trapGuard';
  const area = room.w * room.h;
  if (area <= 24) return 'transition';
  if (area <= 40) return 'lightCombat';
  if (area <= 70) return 'combat';
  return 'hardCombat';
}
function roomCells(room, floor) { const out = []; for (let y = room.y; y < room.y + room.h; y++) for (let x = room.x; x < room.x + room.w; x++) out.push(floor.grid[y][x]); return out; }
function isSpawnValidCell(floor, room, x, y) {
  const cell = floor.grid?.[y]?.[x]; if (!cell || cell.roomId !== room.id) return false;
  if (BLOCKED_TERRAINS.has(cell.terrain)) return false;
  if (cell.entityId) return false;
  return true;
}
export function getPreferredCreatureCells(floor, room) {
  const doors = []; for (const c of roomCells(room, floor)) if (c.terrain === TERRAIN.DOOR) doors.push(c);
  const entries = roomCells(room, floor).filter((c) => [TERRAIN.ENTRANCE, TERRAIN.STAIRS_IN].includes(c.terrain));
  const cx = room.x + Math.floor(room.w / 2), cy = room.y + Math.floor(room.h / 2);
  const scored = [];
  for (let y = room.y + 1; y < room.y + room.h - 1; y++) for (let x = room.x + 1; x < room.x + room.w - 1; x++) {
    if (!isSpawnValidCell(floor, room, x, y)) continue;
    let s = 0;
    const wallDist = Math.min(x - room.x, y - room.y, room.x + room.w - 1 - x, room.y + room.h - 1 - y);
    s += wallDist <= 1 ? 4 : wallDist === 2 ? 2 : 0;
    const isCornerish = (x - room.x <= 2 || room.x + room.w - 1 - x <= 2) && (y - room.y <= 2 || room.y + room.h - 1 - y <= 2);
    if (isCornerish) s += 2;
    if (x === cx && y === cy) s -= 4;
    for (const d of doors) { const dist = Math.abs(d.x - x) + Math.abs(d.y - y); if (dist <= 1) s -= 7; else if (dist <= 2) s -= 3; }
    for (const e of entries) { const dist = Math.abs(e.x - x) + Math.abs(e.y - y); if (dist <= 1) s -= 8; else if (dist <= 2) s -= 3; else s += 1; }
    scored.push({ x, y, score: s + randInt(0, 2) });
  }
  return scored.sort((a, b) => b.score - a.score);
}

export function selectRoomsForCreatures(floor) {
  const classified = floor.rooms.map((r) => ({ room: r, placementType: classifyRoom(r, floor), cells: getPreferredCreatureCells(floor, r) }));
  const eligible = classified.filter((r) => r.placementType !== 'safe' && r.cells.length >= 1);
  const [minCount, maxCount] = ROOM_COUNTS_BY_FLOOR[floor.index] || [1, 2];
  const prio = { boss: 10, miniBoss: 9, hardCombat: 8, combat: 7, treasureGuard: 6, trapGuard: 5, lightCombat: 4, transition: 3 };
  eligible.sort((a, b) => (prio[b.placementType] || 0) - (prio[a.placementType] || 0));
  const selected = eligible.slice(0, Math.min(maxCount, eligible.length));
  if (selected.length < minCount) selected.push(...eligible.slice(selected.length, minCount));
  return selected;
}

export function getTargetThreatForRoom(room, floor, settings = {}) {
  const type = room.placementType || classifyRoom(room, floor);
  const [minR, maxR] = ROOM_TYPE_RANGES[type] || [0.4, 0.6];
  const diffBias = { Facile: 0, Normal: 0.5, Difficile: 0.8, Gargotesque: 1 }[settings.difficulty] ?? 0.5;
  const heroAdj = { 1: -0.1, 2: -0.05, 3: 0, 4: 0.08 }[Number(settings.heroCount) || 3];
  const ratio = Math.min(1, Math.max(0, minR + (maxR - minR) * diffBias + heroAdj));
  let target = Math.floor((room.threatBudget ?? floor.threatBudget) * ratio);
  if (type === 'miniBoss') target = Math.max(4, target);
  if (type === 'boss') target = Math.max(5, target);
  return Math.min(room.threatBudget ?? floor.threatBudget, Math.max(0, target));
}

export function buildCreatureGroupForRoom(room, floor, targetThreat) {
  const normalPools = { 1: ['basic', 'tactical'], 2: ['basic', 'tactical', 'special'], 3: ['basic', 'tactical', 'special', 'brute'], 4: ['basic', 'tactical', 'special', 'brute'], 5: ['basic', 'tactical', 'special', 'brute'] };
  const types = [...(normalPools[floor.index] || ['basic'])].sort((a,b)=>THREAT_VALUES[b]-THREAT_VALUES[a]);
  const group = []; let remaining = Math.min(targetThreat, room.threatBudget ?? floor.threatBudget);
  if (room.placementType === 'boss') { group.push('boss'); remaining -= 5; }
  if (room.placementType === 'miniBoss') { group.push('miniBoss'); remaining -= 4; }
  while (remaining > 0 && group.length < 8) {
    const afford = types.filter((t) => THREAT_VALUES[t] <= remaining);
    if (!afford.length) break;
    const t = afford[randInt(0, Math.max(0, afford.length - 1))];
    group.push(t); remaining -= THREAT_VALUES[t]; if (randInt(0, 100) < 25) break;
  }
  return group;
}

export function tryPlaceCreature(floor, room, type, options = {}) {
  if (!CREATURE_TYPES.has(type)) return { ok: false, reason: 'invalid-type' };
  const budget = room.threatBudget ?? floor.threatBudget;
  recalculateThreats(floor);
  if ((room.threatUsed || 0) + THREAT_VALUES[type] > budget) return { ok: false, reason: 'budget' };
  const cells = getPreferredCreatureCells(floor, room);
  const maxBySpace = Math.max(1, Math.floor(cells.length / 6));
  const maxCap = floor.index === 1 ? 4 : (room.placementType === 'boss' ? 6 : 5);
  const cap = Math.max(1, Math.min(maxBySpace, maxCap));
  const currentCount = (floor.entities || []).filter((e) => e.roomId === room.id && CREATURE_TYPES.has(e.type)).length;
  if (currentCount >= cap) return { ok: false, reason: 'capacity' };
  const spot = options.at || cells[0]; if (!spot) return { ok: false, reason: 'no-cell' };
  const entity = { id: uid('ent'), type, x: spot.x, y: spot.y, roomId: room.id };
  floor.entities.push(entity); rebuildEntityIndex(floor); recalculateThreats(floor);
  return { ok: true, entity };
}

export function placeCreaturesForFloor(floor, settings = {}, dungeonContext = {}) {
  clearCreaturesFromFloor(floor); rebuildEntityIndex(floor); recalculateThreats(floor);
  for (const room of floor.rooms) room.threatBudget = floor.threatBudget;
  const picked = selectRoomsForCreatures(floor, settings);
  for (const p of floor.rooms) p.placementType = classifyRoom(p, floor);
  for (const selected of picked) selected.room.placementType = selected.placementType;
  if (floor.index === 5 && !picked.some((p) => p.placementType === 'boss')) {
    const fallback = [...picked].sort((a,b)=>b.cells.length-a.cells.length)[0] || { room: floor.rooms[floor.rooms.length-1], placementType: 'boss' };
    fallback.room.placementType = 'boss';
    if (!picked.includes(fallback)) picked.unshift(fallback);
  }
  for (const selected of picked) {
    const room = selected.room;
    const target = getTargetThreatForRoom(room, floor, settings);
    const group = buildCreatureGroupForRoom(room, floor, target, settings, dungeonContext);
    for (const type of group) tryPlaceCreature(floor, room, type, { dungeonFloors: dungeonContext.floors });
  }
  const nonBossCreatures = (floor.entities || []).filter((e) => CREATURE_TYPES.has(e.type) && e.type !== 'boss');
  if (nonBossCreatures.length === 0) {
    const allCandidates = floor.rooms.filter((r) => classifyRoom(r, floor) !== 'safe' && classifyRoom(r, floor) !== 'boss' && getPreferredCreatureCells(floor, r).length > 0);
    const fallback = allCandidates[0] || picked.find((p) => p.placementType !== 'safe' && p.placementType !== 'boss')?.room;
    if (fallback) tryPlaceCreature(floor, fallback, floor.index === 1 ? 'basic' : 'tactical', { dungeonFloors: dungeonContext.floors });
  }
}

export function placeEntities(floor, roomBudget, options = {}) {
  floor.threatBudget = roomBudget;
  placeCreaturesForFloor(floor, options.settings || {}, { floors: options.dungeonFloors || [floor] });
  return floor.entities;
}

export const tryPlaceEntity = tryPlaceCreature;
