import { pick, randInt } from '../utils/random.js';
import { uid } from '../utils/ids.js';
import { allowedByFloor } from './balanceEngine.js';
import { ENTITY_TYPES } from '../data/entityTypes.js';

const THREAT_TYPES = new Set(['basic', 'tactical', 'special', 'brute', 'miniBoss', 'boss']);

export function placeEntities(floor, roomBudget) {
  const entities = [];
  const combats = floor.rooms.filter((r) => ['combat', 'boss', 'mini-boss'].includes(r.type));

  for (const room of combats) {
    let left = roomBudget;
    const allowed = allowedByFloor(floor.index - 1);

    if (floor.index === 5 && room.type === 'boss') {
      entities.push(spawn('boss', room));
      left -= ENTITY_TYPES.boss.threat;
    }

    while (left > 0) {
      const type = pick(allowed);
      const cost = ENTITY_TYPES[type]?.threat ?? 0;
      if (cost <= 0 || cost > left) break;
      entities.push(spawn(type, room, entities));
      left -= cost;
      if (randInt(0, 2) === 0) break;
    }
  }

  for (const room of floor.rooms) {
    if (room.type === 'trésor') entities.push(spawn('chest', room, entities));
    if (room.type === 'piège') entities.push(spawn('trap', room, entities));
    if (room.type === 'objet interactif') entities.push(spawn('interactiveObject', room, entities));
  }

  return entities;
}

export function computeThreatStats(floor) {
  const threatByRoom = {};
  for (const room of floor.rooms) threatByRoom[room.id] = 0;

  for (const entity of floor.entities) {
    if (!THREAT_TYPES.has(entity.type)) continue;
    threatByRoom[entity.roomId] = (threatByRoom[entity.roomId] || 0) + (ENTITY_TYPES[entity.type]?.threat || 0);
  }

  const totalThreat = Object.values(threatByRoom).reduce((acc, n) => acc + n, 0);
  return { threatByRoom, totalThreat };
}

function spawn(type, room, existing = []) {
  const occupied = new Set(existing.filter((e) => e.roomId === room.id).map((e) => `${e.x},${e.y}`));
  for (let y = room.y + 1; y < room.y + room.h - 1; y++) {
    for (let x = room.x + 1; x < room.x + room.w - 1; x++) {
      const key = `${x},${y}`;
      if (!occupied.has(key)) return { id: uid('ent'), type, x, y, roomId: room.id };
    }
  }
  return { id: uid('ent'), type, x: room.x + 1, y: room.y + 1, roomId: room.id };
}
