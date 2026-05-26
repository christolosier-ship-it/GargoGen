import { pick, randInt } from '../utils/random.js';
import { uid } from '../utils/ids.js';
import { allowedByFloor } from './balanceEngine.js';
import { ENTITY_TYPES } from '../data/entityTypes.js';
import { TERRAIN } from '../data/tileTypes.js';

const THREAT_VALUES = { basic: 1, tactical: 2, special: 3, brute: 3, miniBoss: 4, boss: 5 };
const THREAT_TYPES = new Set(Object.keys(THREAT_VALUES));
const INVALID_SPAWN_TERRAINS = new Set([TERRAIN.WALL, TERRAIN.DOOR, TERRAIN.ENTRANCE, TERRAIN.STAIRS_IN, TERRAIN.STAIRS_OUT, TERRAIN.EXIT]);
const AVOID_NEAR_SPECIAL_TERRAINS = new Set([TERRAIN.DOOR, TERRAIN.STAIRS_IN, TERRAIN.STAIRS_OUT, TERRAIN.ENTRANCE, TERRAIN.EXIT]);

export function rebuildEntityIndex(floor) {
  const errors = [];
  const seen = new Set();
  for (const row of floor.grid) for (const cell of row) cell.entityId = null;
  for (const entity of floor.entities) {
    const cell = floor.grid?.[entity.y]?.[entity.x];
    const key = `${entity.x},${entity.y}`;
    if (!cell) { errors.push('entity-outside-grid'); continue; }
    if (INVALID_SPAWN_TERRAINS.has(cell.terrain)) errors.push('entity-on-special');
    if (seen.has(key)) { errors.push('entity-overlap'); continue; }
    seen.add(key);
    cell.entityId = entity.id;
  }
  return [...new Set(errors)];
}

export function recalculateThreats(floor) {
  const threatByRoom = {};
  for (const room of floor.rooms) { room.threatUsed = 0; threatByRoom[room.id] = 0; }
  for (const entity of floor.entities) {
    if (!THREAT_TYPES.has(entity.type)) continue;
    const threat = THREAT_VALUES[entity.type] ?? 0;
    threatByRoom[entity.roomId] = (threatByRoom[entity.roomId] ?? 0) + threat;
  }
  for (const room of floor.rooms) room.threatUsed = threatByRoom[room.id] ?? 0;
  const totalThreat = Object.values(threatByRoom).reduce((a, n) => a + n, 0);
  floor.stats = { ...(floor.stats || {}), totalThreat };
  return { threatByRoom, totalThreat };
}

export function validateEntityPlacement(floor, entity, options = {}) {
  if (!floor) return { ok: false, reason: 'floor-missing' };
  if (!entity?.type) return { ok: false, reason: 'type-missing' };
  const room = floor.rooms.find((r) => r.id === entity.roomId);
  if (!room) return { ok: false, reason: 'room-invalid' };
  const cell = floor.grid?.[entity.y]?.[entity.x];
  if (!cell) return { ok: false, reason: 'cell-invalid' };
  if (cell.roomId !== room.id) return { ok: false, reason: 'room-invalid' };
  if (INVALID_SPAWN_TERRAINS.has(cell.terrain)) return { ok: false, reason: 'invalid-cell' };
  if (floor.entities.some((e) => e.x === entity.x && e.y === entity.y)) return { ok: false, reason: 'occupied' };
  if (THREAT_TYPES.has(entity.type)) {
    recalculateThreats(floor);
    const cost = THREAT_VALUES[entity.type] ?? 0;
    if ((room.threatUsed ?? 0) + cost > (room.threatBudget ?? floor.threatBudget ?? 0)) return { ok: false, reason: 'budget' };
    if (entity.type === 'boss' && floor.index !== 5) return { ok: false, reason: 'boss-floor' };
    if (entity.type === 'miniBoss' && floor.index !== 4) return { ok: false, reason: 'miniboss-floor' };
    if (options.dungeonFloors) {
      const all = options.dungeonFloors.flatMap((f) => f.entities || []);
      if (entity.type === 'boss' && all.some((e) => e.type === 'boss')) return { ok: false, reason: 'boss-exists' };
      if (entity.type === 'miniBoss' && all.some((e) => e.type === 'miniBoss')) return { ok: false, reason: 'miniboss-exists' };
    }
  }
  return { ok: true };
}

export function tryPlaceEntity(floor, room, type, options = {}) {
  if (!floor || !room || !type) return { ok: false, reason: 'invalid-input' };
  const candidates = options.at ? [options.at] : getRoomSpawnCells(room, floor.grid, floor.entities, { avoidSpecialMargin: true });
  const list = candidates.length ? candidates : getRoomSpawnCells(room, floor.grid, floor.entities, { avoidSpecialMargin: false });
  if (!list.length) return { ok: false, reason: 'invalid-cell' };
  const spot = options.at || pick(list);
  const entity = { id: uid('ent'), type, x: spot.x, y: spot.y, roomId: room.id };
  const check = validateEntityPlacement(floor, entity, options);
  if (!check.ok) return check;
  floor.entities.push(entity);
  rebuildEntityIndex(floor);
  recalculateThreats(floor);
  return { ok: true, entity };
}

export function placeEntities(floor, roomBudget, options = {}) {
  floor.entities = [];
  for (const room of floor.rooms) { room.threatBudget = roomBudget; room.threatUsed = 0; }
  const normalPool = allowedByFloor(floor.index);

  for (const room of floor.rooms) {
    if (!['combat', 'boss', 'mini-boss'].includes(room.type)) continue;
    if (floor.index === 5 && room.type === 'boss') {
      tryPlaceEntity(floor, room, 'boss', options);
    }
    if (floor.index === 4 && room.type === 'mini-boss' && randInt(0, 1) === 1) {
      tryPlaceEntity(floor, room, 'miniBoss', options);
    }

    let iterations = 0;
    while (iterations++ < 24) {
      recalculateThreats(floor);
      const remaining = (room.threatBudget ?? roomBudget) - (room.threatUsed ?? 0);
      if (remaining <= 0) break;
      const affordable = normalPool.filter((t) => (THREAT_VALUES[t] ?? 0) <= remaining).sort((a,b)=>THREAT_VALUES[b]-THREAT_VALUES[a]);
      let placed = false;
      for (const type of affordable) {
        const result = tryPlaceEntity(floor, room, type, options);
        if (result.ok) { placed = true; break; }
      }
      if (!placed || randInt(0, 4) === 0) break;
    }
  }

  for (const room of floor.rooms) {
    if (room.type === 'trésor') tryPlaceEntity(floor, room, 'chest', options);
    if (room.type === 'piège') tryPlaceEntity(floor, room, 'trap', options);
    placeInteractiveObjectsForRoom(floor, room, options);
  }
  rebuildEntityIndex(floor);
  recalculateThreats(floor);
  return floor.entities;
}

function placeInteractiveObjectsForRoom(floor, room, options) {
  const eligibleCells = getRoomSpawnCells(room, floor.grid, floor.entities, { avoidSpecialMargin: false });
  if (!eligibleCells.length) return;
  const ratio = randInt(10, 20) / 100;
  const count = Math.max(1, Math.min(6, Math.round(eligibleCells.length * ratio) || 1));
  for (let i = 0; i < count; i++) if (!tryPlaceEntity(floor, room, 'interactiveObject', options).ok) break;
}

function getRoomSpawnCells(room, grid, existing, { avoidSpecialMargin }) {
  const occupied = new Set(existing.filter((e) => e.roomId === room.id).map((e) => `${e.x},${e.y}`));
  const cells = [];
  for (let y = room.y + 1; y < room.y + room.h - 1; y++) for (let x = room.x + 1; x < room.x + room.w - 1; x++) {
    const cell = grid?.[y]?.[x]; const key = `${x},${y}`;
    if (!cell || occupied.has(key) || cell.entityId || INVALID_SPAWN_TERRAINS.has(cell.terrain)) continue;
    if (avoidSpecialMargin && isNearSpecial(grid, x, y)) continue;
    cells.push({ x, y });
  }
  return cells;
}
function isNearSpecial(grid, x, y) { for (let yy = y - 1; yy <= y + 1; yy++) for (let xx = x - 1; xx <= x + 1; xx++) if (AVOID_NEAR_SPECIAL_TERRAINS.has(grid?.[yy]?.[xx]?.terrain)) return true; return false; }
