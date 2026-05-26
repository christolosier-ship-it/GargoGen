import { TERRAIN } from '../data/tileTypes.js';

export function connectRooms(grid, rooms) {
  const doors = [];
  for (let i = 1; i < rooms.length; i++) {
    const a = rooms[i - 1], b = rooms[i];
    const ax = Math.floor(a.x + a.w / 2), ay = Math.floor(a.y + a.h / 2);
    const bx = Math.floor(b.x + b.w / 2), by = Math.floor(b.y + b.h / 2);
    for (let x = Math.min(ax, bx); x <= Math.max(ax, bx); x++) grid[ay][x].terrain = TERRAIN.FLOOR;
    for (let y = Math.min(ay, by); y <= Math.max(ay, by); y++) grid[y][bx].terrain = TERRAIN.FLOOR;
    doors.push({ x: bx, y: ay, type: 'door' });
  }
  return doors;
}
