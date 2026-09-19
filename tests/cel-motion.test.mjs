import test from 'node:test';
import assert from 'node:assert/strict';
import {celFrame,celFrameTime,WALK_SECONDS} from '../src/coop/cel-motion.js';
import {actionTiming} from '../src/coop/combat-motion.js';
test('cel attack release coincides with combat windup for different attack speeds',()=>{
 for(const haste of [.5,1,2,3]){const timing=actionTiming('warrior','attack',haste);assert.equal(celFrame('attack',timing.windup-.0001,{haste}).frame,2);assert.equal(celFrame('attack',timing.windup,{haste}).frame,3);assert.equal(celFrame('attack',timing.activeEnd,{haste}).phase,'recovery');}
});
test('all eight poses are reachable by stepping and loop endpoints are safe',()=>{
 for(const clip of ['idle','walk','attack']){for(let i=0;i<8;i++)assert.equal(celFrame(clip,celFrameTime(clip,i)).frame,i);const {duration}=celFrame(clip,0);assert.equal(celFrame(clip,duration).frame,0);assert.equal(celFrame(clip,-.001).frame,7);assert.equal(celFrame(clip,duration,{loop:false}).frame,7);}
});
test('sampling is deterministic and walking phase is time-based, not render-count based',()=>{
 assert.equal(celFrame('walk',WALK_SECONDS/2).frame,4);const before=celFrame('walk',.3);for(let i=0;i<100;i++)assert.deepEqual(celFrame('walk',.3),before);
});
