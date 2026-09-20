import test from 'node:test';
import assert from 'node:assert/strict';
import {World,MAP} from '../src/coop/model.js';
import {createHero} from '../src/coop/recruitment.js';
import {constrainSharedMove} from '../src/coop/collision.js';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),spread=(a,b)=>Math.hypot(a.x-b.x,(a.y-b.y)*.72);
function arena(roles=['mage','mage']){
 const w=new World(17);w.reset(roles,2);Object.assign(w,{enemies:[],pressure:null,pressureState:null,spawnQueue:[],waveDuration:Infinity,enrageAt:Infinity,obstacles:[],xpNext:Infinity,pickups:[],hazards:[],projectiles:[]});
 const [h,other]=w.heroes;Object.assign(h,{x:900,y:0});Object.assign(other,{x:0,y:0});return {w,h,other};
}
test('natural seed127 first-wave frame never pulls a resolved safe position into the slime body',()=>{
 const {w,h,other}=arena();Object.assign(h,{x:735.5634610735449,y:587.0197144571107});Object.assign(other,{x:-128.52004806922298,y:230.73270941479228});
 const slime={x:706.5731539035864,y:563.7737210992307},start={x:h.x,y:h.y};assert.ok(distance(h,slime)>36);
 w.advance(1/120,[{},{}]);assert.equal(distance(h,start),0,'an idle actor must not teleport after collision resolution');assert.ok(distance(h,slime)>36,'the camera boundary cannot re-enter the recorded slime contact radius');
});
for(const id of [0,1])test(`human${id+1} clips outward requests before collision while retaining tangent and inward motion`,()=>{
 const {w}=arena(['mage','archer']),h=w.heroes[id],other=w.heroes[1-id];Object.assign(h,{x:900,y:0});Object.assign(other,{x:0,y:0});
 w.moveActor(h,20,0);assert.ok(spread(h,other)<=900+1e-6);assert.equal(h.x,900);
 w.moveActor(h,20,40);assert.ok(h.y>30,'along-boundary motion remains possible');assert.ok(spread(h,other)<=900+1e-6);
 const before={x:h.x,y:h.y};w.moveActor(h,-20,0);assert.ok(Math.abs(h.x-before.x+20)<1e-6);assert.equal(h.y,before.y);
});
test('a previously over-limit pair is not teleported through an obstacle',()=>{
 const {w,h}=arena();h.x=1000;w.obstacles=[{x:950,y:0,r:26}];const start={x:h.x,y:h.y};w.advance(1/120,[{},{}]);assert.equal(distance(h,start),0);assert.ok(distance(h,w.obstacles[0])>=43);
 w.moveActor(h,0,30);assert.ok(h.y>25);assert.ok(distance(h,w.obstacles[0])>=43);
});
test('outward knockback is constrained without moving the other player or adding immunity',()=>{
 const {w,h,other}=arena();const start={x:other.x,y:other.y},hp=h.hp;
 w.damageHero(h,8,{x:800,y:0});assert.equal(h.hp,hp-8);assert.ok(spread(h,other)<=900+1e-6);assert.equal(distance(other,start),0);assert.equal(h.invuln,.55);
});
test('downed partner releases the boundary and actual remote revive does not snap either human',()=>{
 const {w,h,other}=arena();other.x=-900;other.down=true;other.hp=0;const helper=createHero('warrior',2,{ai:true});helper.x=-860;helper.y=0;w.heroes.push(helper);w.aiInput=()=>({x:0,y:0});
 w.moveActor(h,30,0);assert.equal(h.x,930);const before={x:h.x,y:h.y};for(let i=0;i<250;i++)w.advance(1/120,[{},{}]);assert.equal(other.down,false);assert.equal(distance(h,before),0);assert.equal(other.x,-900);
 w.moveActor(h,-20,0);assert.equal(h.x,910);w.moveActor(h,20,0);assert.ok(h.x<=910+1e-6,'revival cannot expand an existing over-limit separation');
});
test('camera and map corner constraints retain physical clearance',()=>{
 const {w,h,other}=arena();Object.assign(h,{x:MAP.x-18,y:MAP.y-18});Object.assign(other,{x:h.x-880,y:h.y-200});w.obstacles=[{x:h.x-45,y:h.y-50,r:26}];
 for(let i=0;i<60;i++){w.moveActor(h,3,3);assert.ok(h.x<=MAP.x-17&&h.y<=MAP.y-17);assert.ok(distance(h,w.obstacles[0])>=43-1e-6);}
});
test('ranged AI follows the real camera boundary instead of repeatedly choosing a cancelled retreat',()=>{
 const {w,h,other}=arena();w.enemies=[w.createEnemy('goblin',780,0)];let moved=0;
 for(let i=0;i<45;i++){const p={x:h.x,y:h.y},input=w.aiInput(h);w.advance(1/120,[input,{}]);moved+=distance(h,p);assert.ok(spread(h,other)<=900+1e-6);}
 assert.ok(moved>30,'normal input must make real progress around the camera edge');assert.ok(Math.abs(h.y)>20,'the ranged retreat uses a safe tangent');
});
test('a poisonous outward escape route uses a legal tangent dodge at the camera edge',()=>{
 const {w,h,other}=arena();w.enemies=[w.createEnemy('goblin',740,0)];w.hazards=[{type:'poison',x:870,y:0,r:60,timer:.2,life:2,damage:8}];
 const before={x:h.x,y:h.y},input=w.aiInput(h);assert.equal(input.dodge,true);assert.ok(Math.abs(input.y)>.5,'AI should not roll into the cancelled outward direction');
 w.advance(.23,[input,{}]);assert.ok(distance(h,before)>50);assert.ok(spread(h,other)<=900+1e-6);assert.ok(distance(h,w.hazards[0])>60);
});
test('elliptical boundary projection preserves the movement budget across angles and existing separation',()=>{
 for(const radius of [899,900,970])for(let a=0;a<16;a++)for(let b=0;b<16;b++){
  const h={x:Math.cos(a*Math.PI/8)*radius,y:Math.sin(a*Math.PI/8)*radius/.72},other={x:0,y:0},dx=Math.cos(b*Math.PI/8)*32,dy=Math.sin(b*Math.PI/8)*32,m=constrainSharedMove(h,other,dx,dy);
  assert.ok(Math.hypot(m.dx,m.dy)<=32+1e-6,'no movement-speed bonus from the projection');assert.ok(m.dx*dx+m.dy*dy>=-1e-6,'the requested displacement is not reversed');assert.ok(spread({x:h.x+m.dx,y:h.y+m.dy},other)<=Math.max(900,radius)+1e-6);
 }
});
for(const role of ['warrior','mage','archer'])test(`${role} manually dodges along the boundary without an after-movement pull`,()=>{
 const {w,h,other}=arena([role,'mage']),samples=[],move=w.moveActor.bind(w);let resolved;
 w.moveActor=(actor,...args)=>{const r=move(actor,...args);if(actor===h)resolved={x:h.x,y:h.y};return r;};
 let vx=h.vx;Object.defineProperty(h,'vx',{get:()=>vx,set:value=>{vx=value;samples.push(distance(h,resolved));}});
 for(let i=0;i<36;i++)w.advance(1/120,[{x:0,y:1,dodge:i===0},{}]);
 assert.ok(Math.abs(h.y)>100);assert.ok(spread(h,other)<=900+1e-6);assert.ok(samples.every(d=>d<1e-7),'no post-collision camera displacement');assert.equal(h.hp,h.maxHp);
});
