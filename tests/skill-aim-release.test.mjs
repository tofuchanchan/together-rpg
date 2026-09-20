import test from 'node:test';
import assert from 'node:assert/strict';
import {World,norm,dir8} from '../src/coop/model.js';

function arena(role='mage',angle=0){
 const w=new World(17);w.reset([role],1);
 Object.assign(w,{enemies:[],pressure:null,pressureState:null,spawnQueue:[],waveDuration:Infinity,enrageAt:Infinity,obstacles:[],xpNext:Infinity,pickups:[],hazards:[],projectiles:[]});
 const h=w.heroes[0];Object.assign(h,{x:0,y:0,skills:[1,0],attackCd:99,crit:0});
 const e=w.createEnemy('spider',Math.cos(angle)*280,Math.sin(angle)*280);Object.assign(e,{freeze:10,hp:1000,maxHp:1000});w.enemies=[e];
 const shots=[],shoot=w.shoot;w.shoot=function(...args){const p=shoot.apply(this,args);shots.push({...p,hit:p.hit});return p;};
 return {w,h,e,shots};
}
const near=(a,b,message)=>assert.ok(Math.abs(a-b)<1e-10,`${message}: ${a} vs ${b}`);
function expectAim(shot,point){const d=norm(point.x-shot.x,point.y-shot.y);near(shot.dx,d.x,'direction x');near(shot.dy,d.y,'direction y');}
function release(w,h,input={}){for(let i=0;i<120&&!h.action?.fired;i++)w.advance(1/120,[input]);assert.ok(h.action?.fired,'the cast releases within one second');}

for(const role of ['mage','archer'])for(let direction=0;direction<8;direction++)test(`${role} Q preserves the world aim point during lateral movement in direction ${direction}`,()=>{
 const angle=direction*Math.PI/4,{w,h,e,shots}=arena(role,angle),aim={x:e.x,y:e.y};
 assert.equal(w.request(h,'skill1',{x:0,y:0}),true);const action=h.action,windup=action.windup;
 release(w,h,{x:-Math.sin(angle),y:Math.cos(angle)});const p=shots[0];
 assert.ok(Math.hypot(p.x,p.y)>20,'the hero really moved during windup');expectAim(p,aim);
 assert.equal(action.facing,dir8(p.dx,p.dy));assert.equal(h.face,action.facing);
 assert.equal(p.damage,role==='mage'?42:45);assert.equal(p.speed,role==='mage'?390:650);assert.equal(p.life,1.7);assert.equal(action.windup,windup);
 w.advance(.9,[{}]);assert.ok(p.hit.has(e.id),'the real straight projectile hits the stationary target');
});
for(const role of ['mage','archer'])test(`${role} stationary Q keeps its exact original direction and target point`,()=>{
 const {w,h,e,shots}=arena(role,.43);w.request(h,'skill1',{});const initial={...h.action.dir};release(w,h);
 assert.deepEqual({x:shots[0].dx,y:shots[0].dy},initial);expectAim(shots[0],e);
});
for(const role of ['mage','archer'])for(const death of [false,true])test(`${role} Q does not track or retarget a ${death?'dead':'moving'} initial target`,()=>{
 const {w,h,e,shots}=arena(role),aim={x:e.x,y:e.y};w.request(h,'skill1',{});e.y=180;if(death)e.hp=0;
 const other=w.createEnemy('spider',70,-140);other.freeze=10;w.enemies.push(other);
 release(w,h,{x:0,y:1});const p=shots[0];expectAim(p,aim);
 w.advance(.2,[{}]);const live=w.projectiles.find(s=>s.id===p.id);assert.ok(live);near(live.dx,p.dx,'flight stays straight x');near(live.dy,p.dy,'flight stays straight y');
 assert.equal(other.hp,other.maxHp);if(!death)assert.equal(e.hp,1000);
});
for(const role of ['mage','archer'])test(`${role} Q with no target preserves input direction while moving`,()=>{
 const {w,h,shots}=arena(role);w.enemies=[];w.request(h,'skill1',{x:-1,y:0});release(w,h,{x:0,y:1});
 assert.equal(shots[0].dx,-1);assert.equal(shots[0].dy,0);assert.equal(h.action.aimPoint,undefined);
});
test('coincident release origin falls back to the initial unit direction without NaN',()=>{
 const {w,h,e,shots}=arena();w.request(h,'skill1',{});const initial={...h.action.dir};h.x=e.x;h.y=e.y;e.hp=0;
 release(w,h);assert.deepEqual({x:shots[0].dx,y:shots[0].dy},initial);assert.ok([shots[0].x,shots[0].y,shots[0].dx,shots[0].dy].every(Number.isFinite));
});
for(const role of ['mage','archer'])test(`${role} corrected Q remains blocked by an obstacle added during windup`,()=>{
 const {w,h,e,shots}=arena(role);w.request(h,'skill1',{});w.obstacles=[{x:140,y:10,r:30}];
 release(w,h,{x:0,y:1});w.advance(.9,[{}]);assert.equal(e.hp,1000);assert.equal(shots[0].hit.size,0);assert.ok(!w.projectiles.some(p=>p.id===shots[0].id));
});
for(const [role,form,branch] of [['mage','icelance',null],['mage','icelance','frostrail'],['archer','markedshot',null],['archer','markedshot','execution'],['mage',null,'wildfire'],['mage',null,'molten']])test(`${role} specialized ${form||branch} keeps its existing directional release`,()=>{
 const {w,h,shots}=arena(role);h.forms[0]=form;h.evolutionBranches[0]=branch;w.request(h,'skill1',{});const initial={...h.action.dir};
 release(w,h,{x:0,y:1});assert.equal(h.action.aimPoint,undefined);assert.deepEqual({x:shots[0].dx,y:shots[0].dy},initial);
});
test('natural seed83 event830 geometry corrects shooter drift while keeping the original world point',()=>{
 const {w,h,e,shots}=arena();Object.assign(h,{x:522.5566019587287,y:196.81799610418693});Object.assign(e,{x:795.6586920278238,y:167.4299235175544});
 const aim={x:e.x,y:e.y};w.request(h,'skill1',{});Object.assign(h,{x:507.90183459807486,y:214.72679802790475});Object.assign(e,{x:776.8149974734813,y:166.35664866093603});
 release(w,h);const p=shots[0];expectAim(p,aim);const error=Math.abs((e.x-p.x)*p.dy-(e.y-p.y)*p.dx);assert.ok(error<5,`release error ${error} remains the target's own motion, within radius18`);
 w.advance(.9,[{}]);assert.ok(p.hit.has(e.id));
});
