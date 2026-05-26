import { randInt } from '../utils/random.js';
import { TERRAIN } from '../data/tileTypes.js';

const MIN_ROOM_SIZE = 4;
const MAX_ROOM_SIZE = 8;

export function generateRooms(grid, targetRooms) {
  const rooms = [];
  let attempts = targetRooms * 24;
  const maxWidth = Math.min(MAX_ROOM_SIZE, grid[0].length - 3);
  const maxHeight = Math.min(MAX_ROOM_SIZE, grid.length - 3);

  while (rooms.length < targetRooms && attempts-- > 0) {
    const w = randInt(MIN_ROOM_SIZE, maxWidth);
    const h = randInt(MIN_ROOM_SIZE, maxHeight);
    const x = randInt(1, grid[0].length - w - 2);
    const y = randInt(1, grid.length - h - 2);
    const overlap = rooms.some((r) =>
      x <= r.x + r.w + 1 && x + w + 1 >= r.x && y <= r.y + r.h + 1 && y + h + 1 >= r.y
    );
    if (overlap) continue;

    const room = { id: `room-${rooms.length + 1}`, x, y, w, h, type: 'transition' };
    rooms.push(room);

    for (let yy = y; yy < y + h; yy++) {
      for (let xx = x; xx < x + w; xx++) {
        grid[yy][xx].terrain = TERRAIN.FLOOR;
        grid[yy][xx].roomId = room.id;
      }
    }
  }

  return rooms;
}
