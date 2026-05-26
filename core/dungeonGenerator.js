import { BASTOGNAC } from '../data/bastognac.js';
import { GRID_SIZES } from '../data/generationRules.js';
import { uid } from '../utils/ids.js';
import { generateFloor } from './floorGenerator.js';

export function generateDungeon(settings, appVersion) {
  const now = new Date().toISOString();
  const sizeLabel = settings.size in GRID_SIZES ? settings.size : 'Moyen';
  const size = GRID_SIZES[sizeLabel];
  const generationState = { miniBossPlaced: false, bossPlaced: false };
  const floors = BASTOGNAC.floorRoles.map((role, i) => generateFloor({ index: i + 1, role, size, sizeLabel, generationState }));
  return {
    id: uid('run'),
    appVersion,
    name: `${BASTOGNAC.dungeonName} (${now.slice(0, 10)})`,
    dungeonName: BASTOGNAC.dungeonName,
    settings,
    floorCount: 5,
    floors,
    globalStats: { totalEntities: 0, totalRooms: 0, totalCreatures: 0, totalInteractiveObjects: 0, totalThreat: 0 },
    createdAt: now,
    updatedAt: now
  };
}
