import test from 'node:test';
import assert from 'node:assert/strict';
import {World,ROLES} from '../src/coop/model.js';
import {companionInput} from '../src/coop/ai.js';
import {segmentCircle} from '../src/coop/collision.js';

const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function arena(role='warrior',point={x:46,y:0},obstacles=[{x:0,y:0,r:26}],target={x:-420,y:0}){
 const w=new World(17);w.reset([role],1);w.enemies=[];w.pressure=null;w.pressureState=null;w.spawnQueue=[];w.waveDuration=Infinity;w.enrageAt=Infinity;w.xpNext=Infinity;w.pickups=[];w.hazards=[];w.projectiles=[];w.bossWarnings=[];w.obstacles=obstacles;
 const h=w.heroes[0];Object.assign(h,point);const foe=w.createEnemy('skeleton',target.x,target.y);foe.cd=10;w.enemies=[foe];
 return {w,h,foe};
}
function assertSafeSegment(h,input,obstacles,travel=64){
 const end={x:h.x+input.x*travel,y:h.y+input.y*travel};
 for(const o of obstacles){const start=distance(h,o),endDistance=distance(end,o);if(start<=o.r+17+1e-6)assert.ok(endDistance>start,'a touching actor must leave the body');else assert.equal(segmentCircle(h,end,o,o.r+17),Infinity,'escape must never cut through a physical body');}
 return end;
}

for(const role of ['warrior','mage','archer'])test(`${role} escapes the recorded 4px navigation/body gap without entering the obstacle`,()=>{
 const {w,h}=arena(role,{x:204.29,y:-756.05},[{x:244.9489742783178,y:-734.8469228349534,r:26}],{x:490,y:-731});
 const start={x:h.x,y:h.y},input=w.aiInput(h);assert.ok(Math.hypot(input.x,input.y)>.5,'AI must emit an escape instead of zeroing every candidate');assertSafeSegment(h,input,w.obstacles);
 for(let i=0;i<60;i++)w.advance(1/120,[w.aiInput(h)]);
 assert.ok(distance(h,start)>10,'normal World movement actually leaves the initial point');assert.ok(distance(h,w.obstacles[0])>=47-1e-6);
});

for(const role of ['warrior','mage','archer'])test(`${role} leaves the inner clearance tangentially when its target is behind the obstacle`,()=>{
 const {w,h,foe}=arena(role);let escaped=false;const before=distance(h,foe);
 for(let i=0;i<120;i++){
  const input=w.aiInput(h);assert.ok(Math.hypot(input.x,input.y)>.1||distance(h,foe)<ROLES[role].range,'no idle deadlock outside attack range');assertSafeSegment(h,input,w.obstacles,input.dodge?112:64);
  w.advance(1/120,[input]);const d=distance(h,w.obstacles[0]);assert.ok(d>=43-1e-6);if(escaped)assert.ok(d>=47-1e-5,'walking does not oscillate back into clearance');escaped ||= d>=47;
 }
 assert.ok(escaped);assert.ok(distance(h,foe)<before-30,'escapes then progresses toward the target');
});

test('a second obstacle remains blocking while leaving the first obstacle clearance',()=>{
 const {w,h}=arena('warrior',{x:46,y:0},[{x:0,y:0,r:26},{x:120,y:0,r:26}],{x:400,y:0});
 const input=w.aiInput(h);assert.ok(Math.hypot(input.x,input.y)>.5);const end=assertSafeSegment(h,input,w.obstacles);assert.equal(segmentCircle(h,end,w.obstacles[1],47),Infinity);
});

test('a physical boundary contact can move outward but cannot cross through the body',()=>{
 const {w,h}=arena('warrior',{x:43,y:0});const input=w.aiInput(h);assert.ok(Math.hypot(input.x,input.y)>.5);assert.ok(input.x>=-1e-8);assertSafeSegment(h,input,w.obstacles);
});

test('map-edge clearance and an obstacle corner do not erase a legal physical corridor',()=>{
 const map={x:120,y:120},{w,h}=arena('warrior',{x:101,y:95},[{x:50,y:50,r:26}],{x:-60,y:95});let moved=0;
 for(let i=0;i<90;i++){
  const input=companionInput(w,h,ROLES[h.role],map);assertSafeSegment(h,input,w.obstacles);assert.ok(Math.hypot(input.x,input.y)>.5,'a boundary strip can be followed toward its exit');
  const next={x:h.x+input.x*ROLES[h.role].speed/120,y:h.y+input.y*ROLES[h.role].speed/120};assert.ok(Math.abs(next.x)<=map.x-17&&Math.abs(next.y)<=map.y-17,'cannot escape outside the physical map');moved+=distance(h,next);Object.assign(h,next);w.time+=1/120;
 }
 assert.ok(moved>50);assert.ok(h.x<98||h.y<80,'progresses out of the corner');
});

test('escaping navigation clearance still prioritizes an imminent poison area',()=>{
 const {w,h}=arena();w.hazards=[{type:'poison',x:46,y:60,r:50,timer:.1,life:3,damage:8}];
 const input=w.aiInput(h);assert.equal(h.aiIntent,'evade');assert.equal(input.dodge,true);assert.equal(input.skill1,false);assert.equal(input.skill2,false);assert.ok(input.y<-.5);assertSafeSegment(h,input,w.obstacles,112);
});

test('escaping navigation clearance still rolls away from a threatening projectile',()=>{
 const {w,h}=arena();w.projectiles=[{hostile:true,x:46,y:-80,dx:0,dy:1,speed:400,life:2,damage:10}];
 const input=w.aiInput(h);assert.equal(h.aiIntent,'evade');assert.equal(input.dodge,true);assert.ok(input.x>.5,'cannot evade left through the obstacle');assertSafeSegment(h,input,w.obstacles,112);
});

test('a blocked goal does not force a detour when every legal detour crosses poison',()=>{
 const {w,h}=arena('warrior',{x:47.1,y:0});
 w.hazards=[{x:47.1,y:64},{x:47.1,y:-64},{x:111.1,y:0}].map(p=>({...p,type:'poison',r:25,timer:.3,life:3,damage:8}));
 const input=w.aiInput(h);assert.equal(Math.hypot(input.x,input.y),0,'waiting is safer than navigating into a forecast impact');assert.equal(input.dodge,false);
});

test('an ally remains still while down and resumes egress after an actual revive',()=>{
 const {w,h}=arena();const help=new World(18);help.reset(['mage'],1);const other=help.heroes[0];other.id=1;other.x=h.x+60;other.y=h.y;w.heroes.push(other);h.ai=true;h.down=true;h.hp=0;
 const start={x:h.x,y:h.y};for(let i=0;i<120;i++)w.advance(1/120,[{},{}]);assert.equal(h.down,true);assert.equal(distance(h,start),0);
 for(let i=0;i<200;i++)w.advance(1/120,[{},{}]);assert.equal(h.down,false);assert.ok(distance(h,start)>10);assert.ok(distance(h,w.obstacles[0])>=47-1e-6);
});
