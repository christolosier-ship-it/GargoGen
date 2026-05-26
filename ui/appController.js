import { initSettings, getSettingsFromForm } from './settingsPanel.js';
import { renderFloorTabs } from './floorNavigation.js';
import { renderTools } from './editTools.js';
import { updateSummary } from './summaryPanel.js';
import { printAll } from './printManager.js';
import { renderMap } from '../render/mapRenderer.js';
import { generateDungeon } from '../core/dungeonGenerator.js';
import { computeThreatStats } from '../core/entityPlacer.js';
import { validateFloor } from '../core/validator.js';
import { loadDungeon, loadSettings, saveDungeon, saveSettings } from '../storage/storageManager.js';
import { checkVersion, applyUpdate } from '../update/versionManager.js';

export function startApp(appVersion) {
  const el = (id) => document.getElementById(id);
  const state = { dungeon: loadDungeon(), currentFloorIndex: 0, currentTool: 'wall', currentPage: 'home' };
  initSettings(el('settingsForm'), loadSettings());

  const refreshFloor = (floor) => {
    floor.stats = computeThreatStats(floor);
    const v = validateFloor(floor);
    floor.stats = { ...floor.stats, isValid: v.ok, issues: v.issues };
  };

  const refreshDungeon = () => {
    if (!state.dungeon) return;
    for (const floor of state.dungeon.floors) refreshFloor(floor);
    const all = state.dungeon.floors.flatMap((f) => f.entities.map((e) => ({ floor: f.index, type: e.type })));
    const bossCount = all.filter((e) => e.type === 'boss').length;
    const miniBossCount = all.filter((e) => e.type === 'miniBoss').length;
    const crossIssue = (floor) => {
      if (bossCount > 1 || miniBossCount > 1) floor.stats.issues.push('cross-floor-duplicates');
    };
    state.dungeon.floors.forEach(crossIssue);
    state.dungeon.globalStats = {
      totalEntities: state.dungeon.floors.reduce((a, f) => a + f.entities.length, 0),
      totalRooms: state.dungeon.floors.reduce((a, f) => a + f.rooms.length, 0),
      totalCreatures: state.dungeon.floors.reduce((a, f) => a + f.entities.filter((e) => ['basic','tactical','special','brute','miniBoss','boss'].includes(e.type)).length, 0),
      totalInteractiveObjects: state.dungeon.floors.reduce((a, f) => a + f.entities.filter((e) => e.type === 'interactiveObject').length, 0),
      totalThreat: state.dungeon.floors.reduce((a, f) => a + (f.stats?.totalThreat || 0), 0)
    };
  };

  const editCell = (floor, x, y, tool) => {
    const cell = floor.grid[y][x];
    if (!cell) return;
    const terrainTools = ['wall', 'floor', 'door', 'entrance', 'exit', 'stairsIn', 'stairsOut'];
    if (tool === 'erase') { cell.entityId = null; cell.terrain = 'floor'; floor.entities = floor.entities.filter((e) => !(e.x === x && e.y === y)); }
    else if (terrainTools.includes(tool)) cell.terrain = tool;
    else {
      const ent = floor.entities.find((e) => e.x === x && e.y === y);
      if (ent) ent.type = tool; else floor.entities.push({ id: `manual-${Date.now()}`, type: tool, x, y, roomId: cell.roomId });
      cell.entityId = floor.entities.find((e) => e.x === x && e.y === y)?.id;
    }
    state.dungeon.updatedAt = new Date().toISOString();
    refreshDungeon();
    saveDungeon(state.dungeon);
    renderCurrentPage();
  };

  const renderCurrentPage = () => {
    ['page-home', 'page-dungeon', 'page-about', 'page-coming'].forEach((id) => el(id).hidden = true);
    el(`page-${state.currentPage}`).hidden = false;
    document.querySelectorAll('[data-page]').forEach((b) => b.classList.toggle('active', b.dataset.page === state.currentPage));

    if (!state.dungeon) return;
    const floor = state.dungeon.floors[state.currentFloorIndex];
    updateSummary(el('floorSummary'), el('dungeonSummary'), floor, state.dungeon);
    if (state.currentPage === 'dungeon') {
      renderFloorTabs(el('floorNav'), state.dungeon.floors, state.currentFloorIndex, (i) => { state.currentFloorIndex = i; renderCurrentPage(); });
      renderTools(el('editTools'), state.currentTool, (t) => { state.currentTool = t; renderCurrentPage(); });
      renderMap(el('map'), floor, (x, y) => editCell(floor, x, y, state.currentTool));
    }
  };

  document.querySelectorAll('[data-page]').forEach((btn) => btn.onclick = () => { state.currentPage = btn.dataset.page; renderCurrentPage(); });
  el('generateBtn').onclick = () => {
    const settings = getSettingsFromForm(el('settingsForm'));
    saveSettings(settings);
    state.dungeon = generateDungeon(settings, appVersion);
    state.currentFloorIndex = 0;
    refreshDungeon();
    renderCurrentPage();
    saveDungeon(state.dungeon);
  };
  el('printBtn').onclick = printAll;

  checkVersion(appVersion).then(v => {
    el('version').textContent = `v${v.local}`;
    el('versionAbout').textContent = `v${v.local}`;
    if (v.hasUpdate) {
      el('updateBanner').hidden = false;
      el('updateBtn').onclick = () => applyUpdate(v.remote);
    }
  }).catch(()=>{});

  if (!state.dungeon) el('generateBtn').click(); else { refreshDungeon(); renderCurrentPage(); }
}
