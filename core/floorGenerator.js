import { createGrid } from '../utils/grid.js';
import { generateRooms } from './roomGenerator.js';
import { connectRooms } from './corridorGenerator.js';
import { placeEntities } from './entityPlacer.js';
import { validateFloor } from './validator.js';
import { MAX_RETRIES, THREAT_BUDGETS } from '../data/generationRules.js';
import { TERRAIN } from '../data/tileTypes.js';

const extraTypes = ['piège', 'trésor', 'objet interactif', 'spéciale'];

export function generateFloor({ index, role, size }) {
  let roomsTarget = Math.max(4, Math.floor(size / 3));
  for (let tryNo = 0; tryNo < MAX_RETRIES; tryNo++) {
    const grid = createGrid(size, size);
    const rooms = generateRooms(grid, roomsTarget);
    if (rooms.length < 3) { roomsTarget--; continue; }
    connectRooms(grid, rooms);
    rooms[0].type = 'entrée';
    rooms[rooms.length - 1].type = index === 5 ? 'boss' : 'combat';
    if (rooms[1]) rooms[1].type = 'combat';
    if (rooms[2]) rooms[2].type = extraTypes[index % extraTypes.length];
    const cIn = center(rooms[0]);
    grid[cIn.y][cIn.x].terrain = index === 1 ? TERRAIN.ENTRANCE : TERRAIN.STAIRS_IN;
    const cOut = center(rooms[rooms.length - 1]);
    grid[cOut.y][cOut.x].terrain = index === 5 ? TERRAIN.EXIT : TERRAIN.STAIRS_OUT;
    const budget = THREAT_BUDGETS[index - 1];
    const floor = { id:`floor-${index}`, index, role, name:`Étage ${index}`, width:size, height:size, grid, rooms, entities:[], stats:{}, threatBudget:budget };
    floor.entities = placeEntities(floor, budget);
    for (const e of floor.entities) {
      const cell = floor.grid[e.y]?.[e.x];
      if (!cell || cell.terrain === 'wall' || cell.entityId) continue;
      cell.entityId = e.id;
    }
    if (validateFloor(floor)) return floor;
    roomsTarget = Math.max(3, roomsTarget - 1);
  }
  throw new Error(`Échec génération étage ${index}`);
}

const center = (r) => ({ x: Math.floor(r.x + r.w / 2), y: Math.floor(r.y + r.h / 2) });
