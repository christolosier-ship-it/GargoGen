import { randInt } from '../utils/random.js';
import { TERRAIN } from '../data/tileTypes.js';

export function generateRooms(grid, targetRooms) {
  const rooms = [];
  let attempts = targetRooms * 12;
  while (rooms.length < targetRooms && attempts-- > 0) {
    const w = randInt(3, 5), h = randInt(3, 5);
    const x = randInt(1, grid[0].length - w - 2), y = randInt(1, grid.length - h - 2);
    const overlap = rooms.some(r => x <= r.x + r.w + 1 && x + w + 1 >= r.x && y <= r.y + r.h + 1 && y + h + 1 >= r.y);
    if (overlap) continue;
    const room = { id: `room-${rooms.length + 1}`, x, y, w, h, type: 'transition' };
    rooms.push(room);
    for (let yy=y; yy<y+h; yy++) for (let xx=x; xx<x+w; xx++) { grid[yy][xx].terrain = TERRAIN.FLOOR; grid[yy][xx].roomId = room.id; }
  }
  return rooms;
}
