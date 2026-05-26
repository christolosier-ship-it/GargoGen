import assert from 'node:assert/strict';
import { generateDungeon } from '../core/dungeonGenerator.js';
import { validateFloor } from '../core/validator.js';

const sizes = ['Petit', 'Moyen', 'Grand'];
const difficulties = ['Facile', 'Normal', 'Difficile', 'Gargotesque'];
const heroes = ['1', '2', '3', '4'];
const forbiddenTerrains = new Set(['wall', 'door', 'entrance', 'exit', 'stairsIn', 'stairsOut']);
const creatureTypes = new Set(['basic', 'tactical', 'special', 'brute', 'miniBoss', 'boss']);

for (let i = 0; i < 300; i++) {
  const settings = { size: sizes[i % 3], difficulty: difficulties[i % 4], heroCount: heroes[i % 4], structure: ['Linéaire', 'Labyrinthe', 'Hub central', 'Arène'][i % 4], dungeonName: 'Le Château de Bastognac' };
  const dungeon = generateDungeon(settings, '0.3.4');
  const all = dungeon.floors.flatMap((f) => f.entities.map((e) => ({ ...e, floor: f.index })));
  const bosses = all.filter((e) => e.type === 'boss');
  assert.equal(bosses.length, 1, `Boss count invalid run ${i}`);
  assert.equal(bosses[0].floor, 5, `Boss wrong floor run ${i}`);
  const minis = all.filter((e) => e.type === 'miniBoss');
  assert.ok(minis.length <= 1, `Too many miniBoss run ${i}`);
  if (minis[0]) assert.equal(minis[0].floor, 4, `MiniBoss wrong floor run ${i}`);

  for (const floor of dungeon.floors) {
    const v = validateFloor(floor, dungeon.floors);
    assert.ok(v.ok, `Validation failed run ${i}, floor ${floor.index}: ${v.issues.join(',')}`);
    for (const room of floor.rooms) {
      assert.ok((room.threatUsed ?? 0) <= (room.threatBudget ?? floor.threatBudget), `Budget exceeded run ${i}, floor ${floor.index}, room ${room.id}`);
      const creatures = floor.entities.filter((e) => creatureTypes.has(e.type) && e.roomId === room.id);
      if (room.placementType !== 'safe') assert.ok(creatures.length > 0, `Non-entry room empty run ${i}, floor ${floor.index}, room ${room.id} (${room.placementType})`);
      if (room.placementType === 'safe') assert.equal(creatures.length, 0, `Safe room has creatures run ${i}, floor ${floor.index}, room ${room.id}`);
      if (room.placementType !== 'safe') assert.equal((room.threatUsed ?? 0), (room.threatBudget ?? floor.threatBudget), `Threat must equal budget run ${i}, floor ${floor.index}, room ${room.id}`);
    }
    if (floor.index === 5) {
      const bossRoom = floor.rooms.find((r) => r.placementType === 'boss');
      assert.ok(bossRoom, `Missing boss room run ${i}`);
      const c = floor.entities.filter((e) => e.roomId === bossRoom.id && creatureTypes.has(e.type));
      assert.ok(c.length > 0, `Boss room empty run ${i}`);
    }

    const seenPos = new Set();
    for (const e of floor.entities.filter((x) => creatureTypes.has(x.type))) {
      const key = `${e.x},${e.y}`;
      assert.ok(!seenPos.has(key), `Creature overlap run ${i}, floor ${floor.index}, ${key}`);
      seenPos.add(key);
      const cell = floor.grid[e.y]?.[e.x];
      assert.ok(cell, `Creature outside grid run ${i}, floor ${floor.index}`);
      assert.ok(!forbiddenTerrains.has(cell.terrain), `Creature on forbidden terrain run ${i}, floor ${floor.index}, room ${e.roomId}, terrain ${cell.terrain}`);
    }
  }
}
console.log('300 generations OK');
