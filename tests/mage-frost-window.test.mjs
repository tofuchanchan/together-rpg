import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/coop/model.js';
function arena(kind='slime',range=175){
 const w=new World(17);w.reset(['mage'],1);Object.assign(w,{enemies:[],pressure:null,pressureState:null,spawnQueue:[],waveDuration:Infinity,enrageAt:Infinity,obstacles:[],xpNext:Infinity,pickups:[],hazards:[],projectiles:[]});
 const h=w.heroes[0];h.x=h.y=0;h.skills=[0,1];const e=w.createEnemy(kind,range,0);w.enemies=[e];return {w,h,e};
}
for(const kind of ['mushroom','slime','goblin'])for(const range of [160,175,184])test(`mage E keeps its release in range of ${kind} starting at ${range}`,()=>{
 const {w,h,e}=arena(kind,range);for(let i=0;i<18;i++)w.advance(1/60,[w.aiInput(h)]);
 assert.equal(h.casts,1);assert.equal(e.maxHp-e.hp,23,'a safe frost windup must not retreat outside its own ring');assert.ok(e.slow>0,'the real ring applies control');
});
test('a newly appearing poison area overrides holding position during frost windup',()=>{
 const {w,h}=arena();w.advance(1/120,[{skill2:true}]);assert.equal(h.action.fired,false);
 w.hazards=[{type:'poison',x:h.x,y:h.y+15,r:65,timer:.05,life:2,damage:8}];const input=w.aiInput(h);
 assert.equal(h.aiIntent,'evade');assert.ok(Math.hypot(input.x,input.y)>.5);const start={x:h.x,y:h.y};w.advance(.05,[input]);assert.ok(Math.hypot(h.x-start.x,h.y-start.y)>3,'normal movement escapes even before the skill cancel point');
});
test('an interruptible frost recovery still uses an urgent roll',()=>{
 const {w,h}=arena();for(let i=0;i<13;i++)w.advance(1/60,[w.aiInput(h)]);assert.ok(h.action.t>=h.action.cancelAt);
 w.hazards=[{type:'poison',x:h.x,y:h.y,r:65,timer:.05,life:2,damage:8}];const input=w.aiInput(h);assert.equal(input.dodge,true);w.advance(1/120,[input]);assert.equal(h.action.type,'dodge');
});
test('coldfield keeps its moving placement behavior instead of inheriting the instant ring hold',()=>{
 const {w,h}=arena();h.forms[1]='coldfield';w.advance(1/120,[{skill2:true}]);const input=w.aiInput(h);assert.ok(Math.hypot(input.x,input.y)>.5);
});
