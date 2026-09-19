import test from 'node:test';
import assert from 'node:assert/strict';
import {spritePose,jointPose} from '../src/coop/sprite-animation.js';
import {actionTiming} from '../src/coop/combat-motion.js';
import {World} from '../src/coop/model.js';
const base={id:0,role:'warrior',face:0,stride:0,move:{x:0,y:0}};
test('attack displacement is continuous at impact, recovery and return to locomotion',()=>{
 for(const role of ['warrior','mage','archer'])for(const haste of [1,2]){
  const timing=actionTiming(role,'attack',haste),at=t=>spritePose({...base,role,action:{type:'attack',t,...timing}});
  for(const t of [timing.windup,timing.activeEnd,timing.duration*.9,timing.duration]){
   const a=at(t-.00001),b=at(t+.00001);assert.ok(Math.hypot(a.x-b.x,a.y-b.y)<.02,`${role} jump at ${t}`);
  }
  assert.ok(Math.abs(at(0).x)<.001);assert.ok(Math.abs(at(timing.duration).x)<.001);
 }
});
test('walk feet move continuously and in opposition around the complete cycle',()=>{
 const at=stride=>jointPose({...base,move:{x:1,y:0},stride});
 for(const t of [.125,.375,.625,.875]){const a=at(t);assert.ok(Math.abs(a.feet[0].x)>1);assert.ok(Math.abs(a.feet[0].x+a.feet[1].x)<1e-8);}
 const a=at(.999999),b=at(.000001);for(let i=0;i<2;i++)assert.ok(Math.abs(a.feet[i].x-b.feet[i].x)<.001);
});
test('moving attacks retain walking feet independently of their attack pose',()=>{
 for(const role of ['warrior','mage','archer']){
  const timing=actionTiming(role,'attack'),h={...base,role,move:{x:1,y:0},action:{type:'attack',...timing,t:timing.windup+.01}};
  const a=jointPose({...h,stride:.125}),b=jointPose({...h,stride:.625});
  assert.notDeepEqual(a.feet,b.feet);
  for(let t=0;t<=timing.duration;t+=1/120)assert.deepEqual(jointPose({...h,action:{...h.action,t}}).feet,jointPose({...h,action:null}).feet);
 }
});
test('standing idle has still feet and no whole-body warp; samplers are pure',()=>{
 const h={...base},before=JSON.stringify(h);assert.ok(jointPose(h).feet.every(f=>f.x===0&&f.y===0&&f.rotation===0));const p=spritePose(h,20);assert.equal(p.sx,1);assert.equal(p.sy,1);assert.equal(JSON.stringify(h),before);
});
test('running against a wall does not advance walking cadence and stopping settles smoothly',()=>{
 const w=new World();w.reset(['warrior','mage'],1);w.enemies=[];w.spawnQueue=[];w.waveDuration=999;w.obstacles=[];const h=w.heroes[0];h.attackCd=999;
 w.advance(.2,[{x:1,y:0},{}]);assert.ok(h.gait>.8);const gait=h.gait;w.advance(.00834,[{},{}]);assert.ok(h.gait>0&&h.gait<gait);w.advance(.8,[{},{}]);assert.equal(h.gait,0);
 h.x=100000;w.advance(.2,[{x:1,y:0},{}]);const stride=h.stride;w.advance(.2,[{x:1,y:0},{}]);assert.equal(h.stride,stride);
});

test('releasing movement keeps the last step direction while its amplitude settles',()=>{
 const h={...base,stride:.125,gait:1,move:{x:1,y:0},lastMove:{x:1,y:0}};
 const a=jointPose(h),b=jointPose({...h,move:{x:0,y:0},gait:.9});
 assert.ok(Math.abs(b.feet[0].x/a.feet[0].x-.9)<1e-8);
});
test('attacks preserve their facing and return the arm continuously to the walking pose',()=>{
 for(const role of ['warrior','mage','archer'])for(let face=0;face<8;face++){
  const timing=actionTiming(role,'attack'),h={...base,role,face:(face+4)%8,move:{x:1,y:0},stride:.3};
  const action={type:'attack',...timing,t:timing.windup,facing:face};
  assert.equal(spritePose({...h,action}).direction,face);
  assert.deepEqual(jointPose({...h,action:{...action,t:timing.duration}}),jointPose(h));
 }
});
