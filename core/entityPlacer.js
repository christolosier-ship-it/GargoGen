import { pick, randInt } from '../utils/random.js';
import { uid } from '../utils/ids.js';
import { allowedByFloor } from './balanceEngine.js';
import { ENTITY_TYPES } from '../data/entityTypes.js';
import { TERRAIN } from '../data/tileTypes.js';

const THREAT_TYPES = new Set(['basic', 'tactical', 'special', 'brute', 'miniBoss', 'boss']);
const INVALID_SPAWN_TERRAINS = new Set([TERRAIN.WALL, TERRAIN.DOOR, TERRAIN.ENTRANCE, TERRAIN.STAIRS_IN, TERRAIN.STAIRS_OUT, TERRAIN.EXIT]);

export function placeEntities(floor, roomBudget, generationState = { miniBossPlaced: false, bossPlaced: false }) {
  const entities = [];
  const combats = floor.rooms.filter((r) => ['combat', 'boss', 'mini-boss'].includes(r.type));

  for (const room of combats) {
    let left = roomBudget;
    const allowed = allowedByFloor(floor.index).filter((t) => t !== 'boss' && t !== 'miniBoss');

    if (floor.index === 4 && !generationState.miniBossPlaced && randInt(0, 1) === 1) {
      const mini = spawn('miniBoss', room, entities, floor.grid);
      if (mini) {
        entities.push(mini);
        left -= ENTITY_TYPES.miniBoss.threat;
        generationState.miniBossPlaced = true;
      }
    }

    if (floor.index === 5 && room.type === 'boss' && !generationState.bossPlaced) {
      const boss = spawn('boss', room, entities, floor.grid);
      if (boss) {
        entities.push(boss);
        left -= ENTITY_TYPES.boss.threat;
        generationState.bossPlaced = true;
      }
    }

    while (left > 0 && allowed.length) {
      const type = pick(allowed);
      const cost = ENTITY_TYPES[type]?.threat ?? 0;
      if (cost <= 0 || cost > left) break;
      const ent = spawn(type, room, entities, floor.grid);
      if (!ent) break;
      entities.push(ent);
      left -= cost;
      if (randInt(0, 2) === 0) break;
    }
  }

  for (const room of floor.rooms) {
    if (room.type === 'trésor') entities.push(spawn('chest', room, entities, floor.grid));
    if (room.type === 'piège') entities.push(spawn('trap', room, entities, floor.grid));
    if (room.type === 'objet interactif') entities.push(spawn('interactiveObject', room, entities, floor.grid));
  }

  return entities.filter(Boolean);
}

export function computeThreatStats(floor) {
  const threatByRoom = {};
  for (const room of floor.rooms) threatByRoom[room.id] = 0;
  for (const entity of floor.entities) {
    if (!THREAT_TYPES.has(entity.type)) continue;
    threatByRoom[entity.roomId] = (threatByRoom[entity.roomId] || 0) + (ENTITY_TYPES[entity.type]?.threat || 0);
  }
  return { threatByRoom, totalThreat: Object.values(threatByRoom).reduce((a, n) => a + n, 0) };
}

function spawn(type, room, existing = [], grid) {
  const occupied = new Set(existing.filter((e) => e.roomId === room.id).map((e) => `${e.x},${e.y}`));
  const cells = [];
  const safeCells = [];
  for (let y = room.y + 1; y < room.y + room.h - 1; y++) {
    for (let x = room.x + 1; x < room.x + room.w - 1; x++) {
      const key = `${x},${y}`;
      const cell = grid?.[y]?.[x];
      if (!cell || occupied.has(key) || INVALID_SPAWN_TERRAINS.has(cell.terrain)) continue;
      cells.push({ x, y });
      if (hasMarginFromSpecials(grid, x, y)) safeCells.push({ x, y });
    }
  }
  const pool = safeCells.length ? safeCells : cells;
  if (!pool.length) return null;
  const chosen = pick(pool);
  return { id: uid('ent'), type, x: chosen.x, y: chosen.y, roomId: room.id };
}

function hasMarginFromSpecials(grid, x, y) {
  for (let yy = y - 1; yy <= y + 1; yy++) {
    for (let xx = x - 1; xx <= x + 1; xx++) {
      const t = grid?.[yy]?.[xx]?.terrain;
      if ([TERRAIN.DOOR, TERRAIN.STAIRS_IN, TERRAIN.STAIRS_OUT, TERRAIN.ENTRANCE, TERRAIN.EXIT].includes(t)) return false;
    }
  }
  return true;
}
