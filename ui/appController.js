import { initSettings, getSettingsFromForm } from './settingsPanel.js';
import { renderFloorTabs } from './floorNavigation.js';
import { renderTools } from './editTools.js';
import { updateSummary } from './summaryPanel.js';
import { printAll } from './printManager.js';
import { renderMap } from '../render/mapRenderer.js';
import { generateDungeon } from '../core/dungeonGenerator.js';
import { recalculateRoomThreats } from '../core/entityPlacer.js';
import { validateFloor } from '../core/validator.js';
import { loadDungeon, loadSettings, saveDungeon, saveSettings } from '../storage/storageManager.js';
import { checkVersion, applyUpdate } from '../update/versionManager.js';
import { ENTITY_TYPES } from '../data/entityTypes.js';

const CREATURES = new Set(['basic','tactical','special','brute','miniBoss','boss']);
const INVALID_CREATURE_TERRAINS = new Set(['wall','door','entrance','exit','stairsIn','stairsOut']);

export function startApp(appVersion) {
  const el = (id) => document.getElementById(id);
  const state = { dungeon: loadDungeon(), currentFloorIndex: 0, currentTool: 'wall', currentPage: 'home', cellSize: 24 };
  initSettings(el('settingsForm'), loadSettings());
  const setFeedback = (m) => el('editFeedback').textContent = m || '';

  const refreshFloor = (floor) => { floor.stats = recalculateRoomThreats(floor); const v = validateFloor(floor); floor.stats = { ...floor.stats, isValid: v.ok, issues: v.issues }; };
  const refreshDungeon = () => { if (!state.dungeon) return; state.dungeon.floors.forEach(refreshFloor); state.dungeon.globalStats = { totalThreat: state.dungeon.floors.reduce((a,f)=>a+(f.stats?.totalThreat||0),0) }; };

  const applyCellRefs = (floor) => { for (const row of floor.grid) for (const c of row) c.entityId = null; for (const e of floor.entities) { const c = floor.grid[e.y]?.[e.x]; if (c) c.entityId = e.id; } };

  const editCell = (floor, x, y, tool) => {
    const cell = floor.grid[y]?.[x]; if (!cell) return;
    const existing = floor.entities.find((e) => e.x === x && e.y === y);
    const room = floor.rooms.find((r) => r.id === cell.roomId);
    if (tool === 'erase') { if (existing) floor.entities = floor.entities.filter((e) => e !== existing); cell.terrain = 'floor'; setFeedback('Case effacée.'); }
    else if (['wall','floor','door','entrance','exit','stairsIn','stairsOut'].includes(tool)) { if (existing) floor.entities = floor.entities.filter((e) => e !== existing); cell.terrain = tool; setFeedback('Terrain modifié.'); }
    else {
      if (existing) return setFeedback('Impossible : une entité existe déjà.');
      if (CREATURES.has(tool) && INVALID_CREATURE_TERRAINS.has(cell.terrain)) return setFeedback('Impossible : cette case n’est pas valide.');
      if (tool === 'boss' && floor.index !== 5) return setFeedback('Impossible : le boss ne peut être placé qu’au dernier étage.');
      if (tool === 'miniBoss' && floor.index !== 4) return setFeedback('Impossible : le mini boss ne peut être placé qu’à l’étage 4.');
      if ((tool === 'boss' || tool === 'miniBoss') && floor.entities.some((e) => e.type === tool)) return setFeedback('Impossible : doublon interdit.');
      if (CREATURES.has(tool)) {
        recalculateRoomThreats(floor);
        const used = room?.threatUsed ?? 0; const budget = room?.threatBudget ?? floor.threatBudget; const cost = ENTITY_TYPES[tool]?.threat ?? 0;
        if (!room || used + cost > budget) return setFeedback('Impossible : budget de menace dépassé.');
      }
      floor.entities.push({ id: `manual-${Date.now()}`, type: tool, x, y, roomId: cell.roomId }); setFeedback('Entité ajoutée.');
    }
    applyCellRefs(floor); state.dungeon.updatedAt = new Date().toISOString(); refreshDungeon(); saveDungeon(state.dungeon); renderCurrentPage();
  };

  const autoFit = (floor) => { const w = el('mapStage').clientWidth - 24; state.cellSize = Math.max(12, Math.min(28, Math.floor(w / floor.width))); renderCurrentPage(); };

  const renderCurrentPage = () => {
    ['page-home', 'page-dungeon', 'page-about', 'page-coming'].forEach((id) => el(id).hidden = true); el(`page-${state.currentPage}`).hidden = false;
    document.querySelectorAll('[data-page]').forEach((b) => b.classList.toggle('active', b.dataset.page === state.currentPage));
    if (!state.dungeon) return;
    const floor = state.dungeon.floors[state.currentFloorIndex];
    updateSummary(el('floorSummary'), el('dungeonSummary'), el('issuesList'), floor, state.dungeon);
    if (state.currentPage === 'dungeon') { renderFloorTabs(el('floorNav'), state.dungeon.floors, state.currentFloorIndex, (i) => { state.currentFloorIndex = i; renderCurrentPage(); }); renderTools(el('editTools'), state.currentTool, (t) => { state.currentTool = t; renderCurrentPage(); }); renderMap(el('map'), floor, (x, y) => editCell(floor, x, y, state.currentTool), state.cellSize); }
  };

  document.querySelectorAll('[data-page]').forEach((btn) => btn.onclick = () => { state.currentPage = btn.dataset.page; renderCurrentPage(); });
  el('zoomIn').onclick = () => { state.cellSize = Math.min(32, state.cellSize + 2); renderCurrentPage(); };
  el('zoomOut').onclick = () => { state.cellSize = Math.max(12, state.cellSize - 2); renderCurrentPage(); };
  el('zoomFit').onclick = () => autoFit(state.dungeon.floors[state.currentFloorIndex]);
  el('generateBtn').onclick = () => { const settings = getSettingsFromForm(el('settingsForm')); saveSettings(settings); state.dungeon = generateDungeon(settings, appVersion); state.currentFloorIndex = 0; refreshDungeon(); renderCurrentPage(); saveDungeon(state.dungeon); };
  el('printBtn').onclick = printAll;

  checkVersion(appVersion).then(v => { el('version').textContent = `v${v.local}`; el('versionAbout').textContent = `v${v.local}`; if (v.hasUpdate) { el('updateBanner').hidden = false; el('updateBtn').onclick = () => applyUpdate(v.remote); } }).catch(()=>{});
  if (!state.dungeon) el('generateBtn').click(); else { refreshDungeon(); renderCurrentPage(); }
}
