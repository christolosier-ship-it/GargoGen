export function updateSummary(floorEl, dungeonEl, floor, dungeon) {
  floorEl.textContent = `Étage ${floor.index} (${floor.role}) • salles: ${floor.rooms.length} • entités: ${floor.entities.length} • budget: ${floor.threatBudget}`;
  dungeonEl.textContent = `Donjon: ${dungeon.dungeonName} • étages: ${dungeon.floorCount} • total entités: ${dungeon.globalStats.totalEntities}`;
}
