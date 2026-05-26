import { initSettings, getSettingsFromForm } from './settingsPanel.js';
import { renderFloorTabs } from './floorNavigation.js';
import { renderTools } from './editTools.js';
import { updateSummary } from './summaryPanel.js';
import { printAll } from './printManager.js';
import { renderMap } from '../render/mapRenderer.js';
import { generateDungeon } from '../core/dungeonGenerator.js';
import { loadDungeon, loadSettings, saveDungeon, saveSettings } from '../storage/storageManager.js';
import { checkVersion, applyUpdate } from '../update/versionManager.js';

export function startApp(appVersion) {
  const el = (id) => document.getElementById(id);
  const state = { dungeon: loadDungeon(), floorIndex: 0, tool: 'wall' };
  initSettings(el('settingsForm'), loadSettings());

  const rerender = () => {
    if (!state.dungeon) return;
    const floor = state.dungeon.floors[state.floorIndex];
    renderFloorTabs(el('floorNav'), state.dungeon.floors, state.floorIndex, (i)=>{state.floorIndex=i;rerender();});
    renderTools(el('editTools'), state.tool, (t)=>{state.tool=t;rerender();});
    renderMap(el('map'), floor, (x,y)=>editCell(floor,x,y,state.tool));
    updateSummary(el('floorSummary'), el('dungeonSummary'), floor, state.dungeon);
    saveDungeon(state.dungeon);
  };

  const editCell = (floor,x,y,tool) => {
    const cell = floor.grid[y][x];
    if (!cell) return;
    const terrainTools = ['wall','floor','door','entrance','exit'];
    if (tool === 'erase') { cell.entityId = null; cell.terrain='floor'; }
    else if (terrainTools.includes(tool)) cell.terrain = tool;
    else {
      const ent = floor.entities.find(e => e.x===x && e.y===y);
      if (ent) ent.type = tool; else floor.entities.push({ id: `manual-${Date.now()}`, type: tool, x, y, roomId: cell.roomId });
      cell.entityId = floor.entities.find(e => e.x===x && e.y===y)?.id;
    }
    state.dungeon.updatedAt = new Date().toISOString();
    rerender();
  };

  el('generateBtn').onclick = () => {
    const settings = getSettingsFromForm(el('settingsForm'));
    saveSettings(settings);
    state.dungeon = generateDungeon(settings, appVersion);
    state.floorIndex = 0;
    rerender();
  };
  el('printBtn').onclick = printAll;

  checkVersion(appVersion).then(v => {
    el('version').textContent = `v${v.local}`;
    if (v.hasUpdate) {
      el('updateBanner').hidden = false;
      el('updateBtn').onclick = () => applyUpdate(v.remote);
    }
  }).catch(()=>{});

  if (state.dungeon) rerender(); else el('generateBtn').click();
}
