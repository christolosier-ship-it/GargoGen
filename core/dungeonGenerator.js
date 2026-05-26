import { BASTOGNAC } from '../data/bastognac.js';
import { GRID_SIZES } from '../data/generationRules.js';
import { uid } from '../utils/ids.js';
import { generateFloor } from './floorGenerator.js';

export function generateDungeon(settings, appVersion) {
  const now = new Date().toISOString();
  const size = GRID_SIZES[settings.size] || GRID_SIZES.Moyen;
  const floors = BASTOGNAC.floorRoles.map((role, i) => generateFloor({ index: i + 1, role, size }));
  return { id: uid('run'), appVersion, name: `${BASTOGNAC.dungeonName} (${now.slice(0,10)})`, dungeonName: BASTOGNAC.dungeonName, settings, floorCount: 5, floors, globalStats: { totalEntities: floors.reduce((a,f)=>a+f.entities.length,0) }, createdAt: now, updatedAt: now };
}
