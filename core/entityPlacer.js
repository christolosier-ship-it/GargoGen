import { pick, randInt } from '../utils/random.js';
import { uid } from '../utils/ids.js';
import { allowedByFloor } from './balanceEngine.js';
import { ENTITY_TYPES } from '../data/entityTypes.js';
import { TERRAIN } from '../data/tileTypes.js';

const THREAT_TYPES = new Set(['basic', 'tactical', 'special', 'brute', 'miniBoss', 'boss']);
const INVALID_SPAWN_TERRAINS = new Set([TERRAIN.WALL, TERRAIN.DOOR, TERRAIN.ENTRANCE, TERRAIN.STAIRS_IN, TERRAIN.STAIRS_OUT, TERRAIN.EXIT]);
const AVOID_NEAR_SPECIAL_TERRAINS = new Set([TERRAIN.DOOR, TERRAIN.STAIRS_IN, TERRAIN.STAIRS_OUT, TERRAIN.ENTRANCE, TERRAIN.EXIT]);

export function placeEntities(floor, roomBudget, generationState = { miniBossPlaced: false, bossPlaced: false }) {
  const entities = [];
  const normalPool = allowedByFloor(floor.index);

  for (const room of floor.rooms) {
    room.threatBudget = roomBudget;
    room.threatUsed = 0;
  }

  for (const room of floor.rooms) {
    if (!['combat', 'boss', 'mini-boss'].includes(room.type)) continue;

    if (floor.index === 5 && room.type === 'boss' && !generationState.bossPlaced) {
      const boss = trySpawnEntity('boss', room, floor.grid, entities);
      if (boss && canAfford(room, boss.type)) {
        addEntity(room, boss, entities);
        generationState.bossPlaced = true;
      }
    }

    if (floor.index === 4 && room.type === 'mini-boss' && !generationState.miniBossPlaced) {
      if (randInt(0, 1) === 1) {
        const mini = trySpawnEntity('miniBoss', room, floor.grid, entities);
        if (mini && canAfford(room, mini.type)) {
          addEntity(room, mini, entities);
          generationState.miniBossPlaced = true;
        }
      }
    }

    let iterations = 0;
    while (iterations < 20) {
      iterations += 1;
      const remaining = room.threatBudget - room.threatUsed;
      if (remaining <= 0) break;
      const affordable = normalPool.filter((t) => (ENTITY_TYPES[t]?.threat ?? 0) <= remaining);
      if (!affordable.length) break;
      const type = pick(affordable.sort((a, b) => (ENTITY_TYPES[b].threat - ENTITY_TYPES[a].threat)));
      const spawned = trySpawnEntity(type, room, floor.grid, entities);
      if (!spawned) break;
      addEntity(room, spawned, entities);
      if (randInt(0, 3) === 0) break;
    }
  }

  for (const room of floor.rooms) {
    if (room.type === 'trésor') addEntityNoThreat(trySpawnEntity('chest', room, floor.grid, entities), entities);
    if (room.type === 'piège') addEntityNoThreat(trySpawnEntity('trap', room, floor.grid, entities), entities);
    placeInteractiveObjectsForRoom(room, floor.grid, entities);
  }

  return entities;
}

function placeInteractiveObjectsForRoom(room, grid, entities) {
  const eligibleCells = getRoomSpawnCells(room, grid, entities, { avoidSpecialMargin: false });
  if (!eligibleCells.length) return;
  const ratio = randInt(10, 20) / 100;
  const proposed = Math.round(eligibleCells.length * ratio);
  const count = Math.max(1, Math.min(6, proposed || 1));
  for (let i = 0; i < count; i++) {
    const obj = trySpawnEntity('interactiveObject', room, grid, entities);
    if (!obj) break;
    addEntityNoThreat(obj, entities);
  }
}

function canAfford(room, type) {
  return room.threatUsed + (ENTITY_TYPES[type]?.threat ?? 0) <= room.threatBudget;
}

function addEntity(room, ent, entities) {
  if (!ent) return;
  entities.push(ent);
  room.threatUsed += ENTITY_TYPES[ent.type]?.threat ?? 0;
}

function addEntityNoThreat(ent, entities) {
  if (ent) entities.push(ent);
}

export function computeThreatStats(floor) {
  const threatByRoom = {};
  for (const room of floor.rooms) threatByRoom[room.id] = room.threatUsed ?? 0;
  for (const entity of floor.entities) {
    if (!THREAT_TYPES.has(entity.type)) continue;
    if (typeof threatByRoom[entity.roomId] === 'number') continue;
    threatByRoom[entity.roomId] = (threatByRoom[entity.roomId] || 0) + (ENTITY_TYPES[entity.type]?.threat || 0);
  }
  return { threatByRoom, totalThreat: Object.values(threatByRoom).reduce((a, n) => a + n, 0) };
}

function trySpawnEntity(type, room, grid, existing = []) {
  const preferred = getRoomSpawnCells(room, grid, existing, { avoidSpecialMargin: true });
  const fallback = preferred.length ? preferred : getRoomSpawnCells(room, grid, existing, { avoidSpecialMargin: false });
  if (!fallback.length) return null;
  const chosen = pick(fallback);
  return { id: uid('ent'), type, x: chosen.x, y: chosen.y, roomId: room.id };
}

function getRoomSpawnCells(room, grid, existing, { avoidSpecialMargin }) {
  const occupied = new Set(existing.filter((e) => e.roomId === room.id).map((e) => `${e.x},${e.y}`));
  const cells = [];
  for (let y = room.y + 1; y < room.y + room.h - 1; y++) {
    for (let x = room.x + 1; x < room.x + room.w - 1; x++) {
      const cell = grid?.[y]?.[x];
      const key = `${x},${y}`;
      if (!cell || occupied.has(key) || cell.entityId || INVALID_SPAWN_TERRAINS.has(cell.terrain)) continue;
      if (avoidSpecialMargin && isNearSpecial(grid, x, y)) continue;
      cells.push({ x, y });
    }
  }
  return cells;
}

function isNearSpecial(grid, x, y) {
  for (let yy = y - 1; yy <= y + 1; yy++) {
    for (let xx = x - 1; xx <= x + 1; xx++) {
      if (AVOID_NEAR_SPECIAL_TERRAINS.has(grid?.[yy]?.[xx]?.terrain)) return true;
    }
  }
  return false;
}
