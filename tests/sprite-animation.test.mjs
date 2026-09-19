import test from 'node:test';
import assert from 'node:assert/strict';
import { DIRECTION_ROWS, spritePose } from '../src/coop/sprite-animation.js';

const hero = { id: 0, role: 'warrior', face: 0, move: { x: 0, y: 0 }, stride: 0 };
test('sprite compass maps all eight authored views, including actual back rows', () => {
  assert.equal(new Set(DIRECTION_ROWS).size, 8);
  assert.equal(spritePose({ ...hero, face: 2 }).row, 0); // south/front
  assert.equal(spritePose({ ...hero, face: 6 }).row, 4); // north/back
  assert.equal(spritePose({ ...hero, face: 0 }).row, 6); // east
});
test('attack impact sprite starts with combat hit timing and returns to standing', () => {
  const at = q => spritePose({ ...hero, action: { type: 'attack', t: q, duration: 1 } });
  assert.equal(at(.32).column, 0);
  assert.equal(at(.33).column, 1);
  assert.equal(at(.6).column, 2);
  assert.equal(at(.95).sheet, 'move');
});
test('locomotion uses opposite contact poses without mutating game state', () => {
  const h = { ...hero, move: { x: 1, y: 0 }, stride: .1 };
  const before = JSON.stringify(h);
  assert.equal(spritePose(h).column, 1);
  assert.equal(spritePose({ ...h, stride: .6 }).column, 3);
  assert.equal(JSON.stringify(h), before);
});
test('dodge and spin select illustrated action frames for every facing', () => {
  for (let face = 0; face < 8; face++) {
    const pose = spritePose({ ...hero, face, action: { type: 'dodge', t: .5, duration: 1 } });
    assert.equal(pose.sheet, 'combat'); assert.equal(pose.column, 3);
    assert.equal(pose.row, DIRECTION_ROWS[face]);
  }
  const views = new Set(Array.from({ length: 16 }, (_, i) => spritePose({ ...hero, action: { type: 'spin', t: i / 16, duration: 1 } }).row));
  assert.equal(views.size, 8);
});
