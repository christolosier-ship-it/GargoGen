import { createGrid } from '../utils/grid.js';
import { generateRooms } from './roomGenerator.js';
import { connectRooms } from './corridorGenerator.js';
import { placeEntities, recalculateThreats, rebuildEntityIndex } from './entityPlacer.js';
import { validateFloor } from './validator.js';
import { MAX_RETRIES, THREAT_BUDGETS, ROOM_COUNT_BY_SIZE } from '../data/generationRules.js';
import { TERRAIN } from '../data/tileTypes.js';
import { randInt } from '../utils/random.js';

const extraTypes = ['piège', 'trésor', 'objet interactif', 'spéciale'];

export function generateFloor({ index, role, size, sizeLabel, generationState, settings, dungeonFloors = [] }) {
  const roomConfig = ROOM_COUNT_BY_SIZE[sizeLabel] || ROOM_COUNT_BY_SIZE.Moyen;
  let roomsTarget = randInt(roomConfig.min, roomConfig.max);

  for (let tryNo = 0; tryNo < MAX_RETRIES; tryNo++) {
    const grid = createGrid(size, size);
    const rooms = generateRooms(grid, roomsTarget, settings?.structure);
    if (rooms.length < 3) continue;
    connectRooms(grid, rooms, settings?.structure);
    rooms[0].type = index === 1 ? 'entrée' : 'combat';
    rooms[rooms.length - 1].type = index === 5 ? 'boss' : 'combat';
    if (rooms[1]) rooms[1].type = 'combat';
    if (rooms[2]) rooms[2].type = extraTypes[index % extraTypes.length];

    const cIn = center(rooms[0]);
    grid[cIn.y][cIn.x].terrain = index === 1 ? TERRAIN.ENTRANCE : TERRAIN.STAIRS_IN;
    const cOut = center(rooms[rooms.length - 1]);
    grid[cOut.y][cOut.x].terrain = index === 5 ? TERRAIN.EXIT : TERRAIN.STAIRS_OUT;

    const perRoomBudget = THREAT_BUDGETS[index - 1];
    const floor = { id: `floor-${index}`, index, role, name: `Étage ${index}`, width: size, height: size, grid, rooms, entities: [], stats: {}, threatBudget: perRoomBudget };

    const tempState = { ...generationState };
    placeEntities(floor, perRoomBudget, { dungeonFloors: [...dungeonFloors, floor], settings });
    rebuildEntityIndex(floor);
    recalculateThreats(floor);
    const validation = validateFloor(floor, [...dungeonFloors, floor]);
    floor.stats = { ...floor.stats, isValid: validation.ok, issues: validation.issues };
    if (validation.ok) {
      tempState.bossPlaced = tempState.bossPlaced || floor.entities.some((e) => e.type === 'boss');
      tempState.miniBossPlaced = tempState.miniBossPlaced || floor.entities.some((e) => e.type === 'miniBoss');
      generationState.bossPlaced = tempState.bossPlaced;
      generationState.miniBossPlaced = tempState.miniBossPlaced;
      return floor;
    }
  }
  throw new Error(`Échec génération étage ${index}`);
}

const center = (r) => ({ x: Math.floor(r.x + r.w / 2), y: Math.floor(r.y + r.h / 2) });
