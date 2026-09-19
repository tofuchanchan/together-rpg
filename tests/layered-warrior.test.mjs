import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {sampleLayered,twoBone,equipment,DEFAULT_GEAR,attachmentPoint,VIEWS} from '../src/coop/layered-pose.js';
const manifest=JSON.parse(fs.readFileSync(new URL('../assets/characters/layered/warrior.json',import.meta.url)));
test('two-bone IK keeps limb lengths for reachable, unreachable and zero-distance targets',()=>{
 for(const target of [{x:0,y:0},{x:2,y:3},{x:100,y:0},{x:-30,y:-20}])for(const bend of [-1,1]){
  const p=twoBone({x:0,y:0},target,11,10,bend);
  assert.ok(Math.abs(Math.hypot(p.elbow.x,p.elbow.y)-11)<1e-7);
  assert.ok(Math.abs(Math.hypot(p.end.x-p.elbow.x,p.end.y-p.elbow.y)-10)<1e-7);
 }
});
test('eight views have complete separate attachments and transparent packing margins',()=>{
 assert.equal(Object.keys(manifest.parts).length,144);
 for(const view of VIEWS)for(const id of ['head','helmet-silver','torso','pelvis','leg-right','leg-left','upper-right','upper-left','fore-right','fore-left','hand-right','hand-left','sword','axe','shield-kite','shield-round','cape-red','helmet-bronze']){
  const f=manifest.parts[`${id}/${view}`];assert.ok(f);assert.ok(f.x>=0&&f.y>=0&&f.x+f.w<=2048&&f.y+f.h<=1536);assert.ok(f.w<256&&f.h<256);
 }
});
test('idle keeps anatomy fixed while cape moves a small amount',()=>{
 for(let face=0;face<8;face++){
  const a=sampleLayered({face},0),b=sampleLayered({face},.8);assert.deepEqual(a.bones,b.bones);assert.deepEqual(a.root,b.root);
  assert.ok(Math.abs(a.capeAngle-b.capeAngle)>0&&Math.abs(a.capeAngle-b.capeAngle)<.0361);
 }
});
test('attack layer preserves walking leg phase and anatomical weapon hand in every view',()=>{
 for(let face=0;face<8;face++)for(let n=0;n<60;n++){
  const hero={face,stride:.28,gait:1,move:{x:.6,y:.8}},walk=sampleLayered(hero),pose=sampleLayered({...hero,action:{type:'attack',facing:face,t:n/60,duration:1,windup:.25,activeEnd:.6}});
  assert.deepEqual(pose.bones['leg-right'],walk.bones['leg-right']);assert.deepEqual(pose.bones['leg-left'],walk.bones['leg-left']);
  assert.deepEqual(pose.sockets.weaponGrip,pose.bones['hand-right']);assert.deepEqual(pose.sockets.offhandGrip,pose.bones['hand-left']);
  assert.deepEqual([...pose.farArms,...pose.nearArms].sort(),['left','right']);
 }
});
test('equipment swaps do not reset pose or modify hero stats; invalid IDs cannot become asset paths',()=>{
 const hero={face:1,stride:.4,gait:1,move:{x:1,y:0},hp:200},saved=structuredClone(hero),a=sampleLayered(hero,.7),b=sampleLayered(hero,.7,{weapon:'axe',helmet:'helmet-bronze'});
 assert.deepEqual(a.bones,b.bones);assert.deepEqual(hero,saved);assert.deepEqual(equipment({weapon:'../../bad.png',shield:'banana'}),DEFAULT_GEAR);
});
test('weapon attachment pivot stays on hand throughout all views and attack phases',()=>{
 for(const id of ['sword','axe'])for(let face=0;face<8;face++)for(let n=0;n<60;n++){
  const pose=sampleLayered({face,action:{type:'attack',facing:face,t:n/60,duration:1}}),part=manifest.parts[`${id}/${pose.view}`];
  assert.deepEqual(attachmentPoint(part,part.pivot,60,pose.weaponAngle,pose.sockets.weaponGrip),pose.sockets.weaponGrip);
  const tip=attachmentPoint(part,part.tip,60,pose.weaponAngle,pose.sockets.weaponGrip);assert.ok(Number.isFinite(tip.x)&&Number.isFinite(tip.y));
  assert.ok(Math.hypot(tip.x-pose.sockets.weaponGrip.x,tip.y-pose.sockets.weaponGrip.y)>20);
 }
});
test('resting sword tip stays outside the helmet in side and rear three-quarter views',()=>{
 for(const face of [0,3,4,5,7]){
  const p=sampleLayered({face}),part=manifest.parts[`sword/${p.view}`],tip=attachmentPoint(part,part.tip,70,p.weaponAngle,p.sockets.weaponGrip);
  assert.ok(Math.abs(tip.x)>35,`${p.view}: weapon concealed behind helmet`);
 }
});
