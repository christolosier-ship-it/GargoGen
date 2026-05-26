export function updateSummary(floorEl, dungeonEl, floor, dungeon) {
  const totalThreat = floor.stats?.totalThreat ?? 0;
  floorEl.textContent = `Étage ${floor.index} (${floor.role}) • salles: ${floor.rooms.length} • entités: ${floor.entities.length} • budget/salle: ${floor.threatBudget} • menace totale: ${totalThreat}`;
  dungeonEl.textContent = `Donjon: ${dungeon.dungeonName} • étages: ${dungeon.floorCount} • total entités: ${dungeon.globalStats.totalEntities}`;
}
