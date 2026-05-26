const ISSUE_MESSAGES = {
  'room-threat-over-budget': 'Une salle dépasse son budget de menace.',
  'room-threat-mismatch': 'Les menaces des salles ne correspondent pas aux entités.',
  'boss-required-floor-5': 'Le boss est obligatoire à l’étage 5.',
  'boss-wrong-floor': 'Le boss ne peut être placé qu’à l’étage 5.',
  'mini-boss-wrong-floor': 'Le mini boss ne peut être placé qu’à l’étage 4.',
  'too-many-boss': 'Un seul boss est autorisé.',
  'too-many-mini-boss': 'Un seul mini boss est autorisé.',
  'entity-overlap': 'Deux entités se superposent.',
  'entity-on-special': 'Une entité est placée sur une case interdite.',
  'special-unreachable': 'Sortie ou escalier inaccessible.',
  'boss-unreachable': 'Le boss est inaccessible.'
};

export function updateSummary(floorEl, dungeonEl, issuesEl, floor, dungeon) {
  const byType = countByType(floor.entities);
  const overBudget = floor.rooms.filter((r) => (r.threatUsed ?? 0) > (r.threatBudget ?? floor.threatBudget)).length;
  floorEl.textContent = `Étage ${floor.index} • ${floor.stats?.isValid ? 'Étage valide' : 'Étage invalide'} • Boss: ${byType.boss ? 'présent' : 'absent'} • Mini Boss: ${byType.miniBoss ? 'présent' : 'absent'} • Salles hors budget: ${overBudget} • Menace/salle: ${floor.rooms.map((r) => `${r.id} | ${r.placementType || r.type || 'n/a'} | ${r.threatUsed ?? 0}/${r.threatBudget ?? floor.threatBudget} | ${floor.entities.filter((e)=>e.roomId===r.id && ['basic','tactical','special','brute','miniBoss','boss'].includes(e.type)).length} créatures`).join(' | ')}`;
  dungeonEl.textContent = `Donjon ${dungeon.dungeonName} • Étages: ${dungeon.floorCount} • Menace totale: ${dungeon.globalStats.totalThreat}`;
  issuesEl.innerHTML = (floor.stats?.issues || []).map((i) => `<li>${ISSUE_MESSAGES[i] || i}</li>`).join('') || '<li>Aucun problème détecté.</li>';
}

function countByType(entities) { const out = { boss: 0, miniBoss: 0 }; for (const e of entities) if (e.type in out) out[e.type] += 1; return out; }
