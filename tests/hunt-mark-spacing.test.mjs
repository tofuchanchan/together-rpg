import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/coop/model.js';
function arena(){const w=new World(41);w.reset(['archer'],1);Object.assign(w,{enemies:[],obstacles:[],pickups:[],hazards:[],projectiles:[]});const h=w.heroes[0];Object.assign(h,{x:0,y:0,core:'sniper',huntStacks:3});const marked=w.createEnemy('mushroom',300,0),healer=w.createEnemy('shaman',250,50);w.enemies=[marked,healer];h.huntTarget=marked.id;return{w,h,marked,healer};}
test('a valid personal hunt mark keeps ranged spacing despite a nearby healer',()=>{const {w,h}=arena(),input=w.aiInput(h);assert.equal(h.aiIntent,'attack');assert.equal(input.x,0);assert.equal(input.y,0);});
test('an invalidated hunt mark can resume approaching the healer',()=>{const {w,h}=arena();h.huntStacks=0;const input=w.aiInput(h);assert.equal(h.aiIntent,'approach');assert.ok(input.x>.5);});
test('a valid hunt mark never overrides urgent poison evasion',()=>{const {w,h}=arena();w.hazards=[{type:'poison',x:0,y:15,r:65,timer:.05,life:2,damage:8}];const input=w.aiInput(h);assert.equal(h.aiIntent,'evade');assert.equal(input.dodge,true);assert.ok(Math.hypot(input.x,input.y)>.5);});
