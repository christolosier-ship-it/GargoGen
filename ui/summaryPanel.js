export function updateSummary(floorEl, dungeonEl, floor, dungeon) {
  const totalThreat = floor.stats?.totalThreat ?? 0;
  const isValid = floor.stats?.isValid ? 'valide' : 'invalide';
  const byType = countByType(floor.entities);
  const roomThreat = floor.rooms.map((r) => `${r.id}:${r.threatUsed ?? 0}/${r.threatBudget ?? floor.threatBudget}`).join(', ');

  floorEl.textContent = `Étage ${floor.index} (${floor.role}) • salles: ${floor.rooms.length} • budget/salle: ${floor.threatBudget} • menace étage: ${totalThreat} • créatures: ${(byType.creatures)} • objets interactifs: ${byType.interactiveObject} • coffres: ${byType.chest} • pièges: ${byType.trap} • boss: ${byType.boss} • mini-boss: ${byType.miniBoss} • menace/salle: [${roomThreat}] • statut: ${isValid}`;

  const g = dungeon.globalStats;
  dungeonEl.textContent = `Donjon: ${dungeon.dungeonName} • taille: ${dungeon.settings.size} • structure: ${dungeon.settings.structure} • difficulté: ${dungeon.settings.difficulty} • héros: ${dungeon.settings.heroes} • étages: ${dungeon.floorCount} • salles totales: ${g.totalRooms} • créatures totales: ${g.totalCreatures} • objets interactifs totaux: ${g.totalInteractiveObjects} • menace totale: ${g.totalThreat}`;
}

function countByType(entities) {
  const out = { interactiveObject: 0, chest: 0, trap: 0, boss: 0, miniBoss: 0, creatures: 0 };
  for (const e of entities) {
    if (e.type in out) out[e.type] += 1;
    if (['basic', 'tactical', 'special', 'brute', 'miniBoss', 'boss'].includes(e.type)) out.creatures += 1;
  }
  return out;
}
