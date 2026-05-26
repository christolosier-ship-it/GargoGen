import { pick, randInt } from '../utils/random.js';
import { uid } from '../utils/ids.js';
import { allowedByFloor } from './balanceEngine.js';

export function placeEntities(floor, budget) {
  const entities = [];
  const combats = floor.rooms.filter(r => ['combat', 'boss', 'mini-boss'].includes(r.type));
  for (const room of combats) {
    let left = budget;
    const allowed = allowedByFloor(floor.index - 1);
    if (floor.index === 5 && room.type === 'boss') {
      entities.push(spawn('boss', room));
      continue;
    }
    while (left > 0) {
      const type = pick(allowed);
      const cost = { basic:1, tactical:2, special:3, brute:3, miniBoss:4, boss:5 }[type] || 1;
      if (cost > left) break;
      entities.push(spawn(type, room));
      left -= cost;
      if (randInt(0,2) === 0) break;
    }
  }
  for (const room of floor.rooms) {
    if (room.type === 'trésor') entities.push(spawn('chest', room));
    if (room.type === 'piège') entities.push(spawn('trap', room));
    if (room.type === 'objet interactif') entities.push(spawn('interactiveObject', room));
  }
  return entities;
}

function spawn(type, room) {
  return { id: uid('ent'), type, x: room.x + 1, y: room.y + 1, roomId: room.id };
}
