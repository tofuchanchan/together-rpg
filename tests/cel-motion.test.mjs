import test from 'node:test';
import assert from 'node:assert/strict';
import {celFrame,celFrameTime,WALK_SECONDS} from '../src/coop/cel-motion.js';
import {actionTiming} from '../src/coop/combat-motion.js';
test('cel attack release coincides with combat windup for different attack speeds',()=>{
 for(const role of ['warrior','mage','archer'])for(const haste of [.5,1,2,3]){const timing=actionTiming(role,'attack',haste);assert.equal(celFrame('attack',timing.windup-.0001,{haste,role}).frame,2);assert.equal(celFrame('attack',timing.windup,{haste,role}).frame,3);assert.equal(celFrame('attack',timing.activeEnd,{haste,role}).phase,'recovery');}
});
test('all eight poses are reachable by stepping and loop endpoints are safe',()=>{
 for(const role of ['warrior','mage','archer'])for(const clip of ['idle','walk','attack']){for(let i=0;i<8;i++)assert.equal(celFrame(clip,celFrameTime(clip,i,role),{role}).frame,i);const {duration}=celFrame(clip,0,{role});assert.equal(celFrame(clip,duration,{role}).frame,0);assert.equal(celFrame(clip,-.001,{role}).frame,7);assert.equal(celFrame(clip,duration,{loop:false,role}).frame,7);}
});
test('sampling is deterministic and walking phase is time-based, not render-count based',()=>{
 assert.equal(celFrame('walk',WALK_SECONDS/2).frame,4);const before=celFrame('walk',.3);for(let i=0;i<100;i++)assert.deepEqual(celFrame('walk',.3),before);
});
