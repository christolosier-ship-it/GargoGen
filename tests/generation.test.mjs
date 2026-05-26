import assert from 'node:assert/strict';
import { generateDungeon } from '../core/dungeonGenerator.js';
import { validateFloor } from '../core/validator.js';

const sizes = ['Petit','Moyen','Grand'];
const difficulties = ['Facile','Normal','Difficile','Gargotesque'];
const heroes = ['1','2','3','4'];

for (let i = 0; i < 300; i++) {
  const settings = { size: sizes[i%3], difficulty: difficulties[i%4], heroCount: heroes[i%4], structure: ['Linéaire','Labyrinthe','Hub central','Arène'][i%4], dungeonName:'Le Château de Bastognac' };
  let dungeon;
  let lastErr;
  for (let t = 0; t < 5; t++) {
    try { dungeon = generateDungeon(settings, '0.3.2'); break; } catch (e) { lastErr = e; }
  }
  assert.ok(dungeon, `Generation failed after retries on run ${i}: ${lastErr?.message}`);
  assert.equal(dungeon.floors.length, 5, `Floors missing on run ${i}`);
  const all = dungeon.floors.flatMap(f=>f.entities.map(e=>({...e,floor:f.index})));
  const bosses = all.filter(e=>e.type==='boss');
  assert.equal(bosses.length, 1, `Boss count invalid on run ${i}`);
  assert.equal(bosses[0].floor, 5, `Boss wrong floor on run ${i}`);
  const minis = all.filter(e=>e.type==='miniBoss');
  assert.ok(minis.length<=1, `Too many miniBoss on run ${i}`);
  if (minis[0]) assert.equal(minis[0].floor, 4, `MiniBoss wrong floor on run ${i}`);
  for (const floor of dungeon.floors) {
    const v = validateFloor(floor, dungeon.floors);
    assert.ok(v.ok, `Validation failed on run ${i} floor ${floor.index}: ${v.issues.join(',')}`);
    for (const room of floor.rooms) assert.ok((room.threatUsed??0) <= (room.threatBudget??floor.threatBudget), `Budget exceeded run ${i} floor ${floor.index}`);
  }
}
console.log('300 generations OK');
