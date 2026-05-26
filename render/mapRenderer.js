import { TERRAIN_SYMBOL } from '../data/tileTypes.js';
import { ENTITY_TYPES } from '../data/entityTypes.js';

export function renderMap(container, floor, onCellClick, cellSize = 24) {
  container.innerHTML = '';
  container.style.setProperty('--cell-size', `${cellSize}px`);
  container.style.gridTemplateColumns = `repeat(${floor.width}, var(--cell-size))`;
  floor.grid.forEach((row) => row.forEach((cell) => {
    const div = document.createElement('button');
    div.className = `cell terrain-${cell.terrain}`;
    const ent = floor.entities.find((e) => e.x === cell.x && e.y === cell.y);
    const terrainSymbol = cell.terrain === 'wall' ? '' : (TERRAIN_SYMBOL[cell.terrain] || '.');
    div.textContent = ent ? ENTITY_TYPES[ent.type]?.symbol || '?' : terrainSymbol;
    div.onclick = () => onCellClick(cell.x, cell.y);
    container.appendChild(div);
  }));
}
