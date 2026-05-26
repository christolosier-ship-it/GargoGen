import { TERRAIN } from '../data/tileTypes.js';
export const createGrid = (w, h) => Array.from({ length: h }, (_, y) =>
  Array.from({ length: w }, (_, x) => ({ x, y, terrain: TERRAIN.WALL, roomId: null, entityId: null, isRevealed: true }))
);
export const inBounds = (grid, x, y) => y >= 0 && x >= 0 && y < grid.length && x < grid[0].length;
export const cardinals = [[1,0],[-1,0],[0,1],[0,-1]];
