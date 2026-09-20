import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/coop/model.js';
const arena=(distance=600)=>{
 const w=new World(83);w.reset(['mage','mage'],2);Object.assign(w,{enemies:[],pressure:null,pressureState:null,spawnQueue:[],waveDuration:Infinity,enrageAt:Infinity,obstacles:[],xpNext:Infinity,pickups:[],hazards:[],projectiles:[]});
 const [h,ally]=w.heroes;Object.assign(h,{x:0,y:0,skills:[1,1]});Object.assign(ally,{x:distance,y:0,hp:0,down:true});w.enemies=[w.createEnemy('mushroom',175,0)];return{w,h,ally};
};
test('a distant downed ally does not forbid an otherwise safe active attack during rescue travel',()=>{
 const {w,h}=arena(),input=w.aiInput(h);assert.equal(h.aiIntent,'revive');assert.equal(input.skill1,true);assert.equal(input.skill2,true);w.advance(1/120,[input,{}]);assert.equal(h.action.type,'fireball');assert.equal(h.casts,1);
});
for(const distance of [45,81.9])test(`inside real ${distance}px revive range active skills remain suppressed while rescue progresses`,()=>{
 const {w,h,ally}=arena(distance),input=w.aiInput(h);assert.equal(input.skill1,false);assert.equal(input.skill2,false);w.advance(1/120,[input,{}]);assert.ok(ally.revive>0);assert.equal(h.casts,0);
});
test('the exact82px boundary still counts as approach rather than an active revive channel',()=>{
 const {w,h}=arena(82),input=w.aiInput(h);assert.equal(input.skill1,true);
});
test('an imminent poison attack overrides offensive rescue travel and requests a dodge',()=>{
 const {w,h}=arena();w.hazards=[{type:'poison',x:0,y:25,r:65,timer:.05,life:2,damage:8}];const input=w.aiInput(h);assert.equal(h.aiIntent,'evade');assert.equal(input.dodge,true);assert.equal(input.skill1,false);assert.equal(input.skill2,false);
});
test('an obstructed firing line does not become legal merely because an ally is down',()=>{
 const {w,h}=arena();w.obstacles=[{x:90,y:0,r:30}];const input=w.aiInput(h);assert.equal(input.skill1,false);assert.equal(input.skill2,false);
});
test('healing travel at critical health keeps priority over rescue offense',()=>{
 const {w,h}=arena();h.hp=20;w.pickups=[{id:1,type:'potion',x:-100,y:0,life:20,value:35}];const input=w.aiInput(h);assert.equal(h.aiIntent,'heal');assert.equal(input.skill1,false);assert.equal(input.skill2,false);
});
