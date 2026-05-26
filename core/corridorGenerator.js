import { TERRAIN } from '../data/tileTypes.js';

const BLOCKED_DOOR_TERRAINS = new Set([TERRAIN.ENTRANCE, TERRAIN.STAIRS_IN, TERRAIN.STAIRS_OUT, TERRAIN.EXIT]);

export function connectRooms(grid, rooms) {
  const doors = [];
  for (let i = 1; i < rooms.length; i++) {
    const a = rooms[i - 1], b = rooms[i];
    const ax = Math.floor(a.x + a.w / 2), ay = Math.floor(a.y + a.h / 2);
    const bx = Math.floor(b.x + b.w / 2), by = Math.floor(b.y + b.h / 2);

    const corridorCells = [];
    for (let x = Math.min(ax, bx); x <= Math.max(ax, bx); x++) {
      grid[ay][x].terrain = TERRAIN.FLOOR;
      corridorCells.push({ x, y: ay });
    }
    for (let y = Math.min(ay, by); y <= Math.max(ay, by); y++) {
      grid[y][bx].terrain = TERRAIN.FLOOR;
      corridorCells.push({ x: bx, y });
    }

    for (const room of [a, b]) {
      const door = placeDoorAtRoomConnection(grid, room, corridorCells);
      if (door) doors.push(door);
    }
  }
  return doors;
}

export function placeDoorAtRoomConnection(grid, room, corridorCells) {
  for (const c of corridorCells) {
    if (!isRoomBoundary(room, c.x, c.y)) continue;
    const cell = grid[c.y]?.[c.x];
    if (!cell || BLOCKED_DOOR_TERRAINS.has(cell.terrain)) continue;
    cell.terrain = TERRAIN.DOOR;
    return { x: c.x, y: c.y, type: 'door' };
  }
  return null;
}

function isRoomBoundary(room, x, y) {
  const inOuter = x >= room.x && x < room.x + room.w && y >= room.y && y < room.y + room.h;
  if (!inOuter) return false;
  return x === room.x || x === room.x + room.w - 1 || y === room.y || y === room.y + room.h - 1;
}
