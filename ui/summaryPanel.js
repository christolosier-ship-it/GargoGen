export function updateSummary(floorEl, dungeonEl, floor, dungeon) {
  const totalThreat = floor.stats?.totalThreat ?? 0;
  const isValid = floor.stats?.isValid ? 'oui' : 'non';
  const bossCount = floor.entities.filter((e) => e.type === 'boss').length;
  const miniBossCount = floor.entities.filter((e) => e.type === 'miniBoss').length;
  floorEl.textContent = `Étage ${floor.index} (${floor.role}) • salles: ${floor.rooms.length} • entités: ${floor.entities.length} • budget/salle: ${floor.threatBudget} • menace totale: ${totalThreat} • valide: ${isValid} • boss: ${bossCount} • mini-boss: ${miniBossCount}`;
  dungeonEl.textContent = `Donjon: ${dungeon.dungeonName} • étages: ${dungeon.floorCount} • total entités: ${dungeon.globalStats.totalEntities}`;
}
