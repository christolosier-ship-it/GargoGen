import { TERRAIN_SYMBOL } from '../data/tileTypes.js';
import { ENTITY_TYPES } from '../data/entityTypes.js';

export function renderMap(container, floor, onCellClick) {
  container.innerHTML = '';
  container.style.gridTemplateColumns = `repeat(${floor.width}, minmax(22px, 1fr))`;
  floor.grid.forEach((row) => row.forEach((cell) => {
    const div = document.createElement('button');
    div.className = `cell terrain-${cell.terrain}`;
    div.dataset.x = cell.x;
    div.dataset.y = cell.y;
    const ent = floor.entities.find((e) => e.id === cell.entityId);
    const terrainSymbol = cell.terrain === 'wall' ? '' : (TERRAIN_SYMBOL[cell.terrain] || '.');
    div.textContent = ent ? ENTITY_TYPES[ent.type]?.symbol || '?' : terrainSymbol;
    div.onclick = () => onCellClick(cell.x, cell.y);
    container.appendChild(div);
  }));
}
