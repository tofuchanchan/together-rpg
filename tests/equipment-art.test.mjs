import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {equipmentVisual,equipmentPose,equipmentAttackPulse,equipmentLocalMotion,drawEquippedHero,equipmentAssetState} from '../src/coop/equipment-art.js';
const manifest=JSON.parse(fs.readFileSync(new URL('../assets/equipment/manifest.json',import.meta.url)));
test('equipment art ships nine distinct full-body 32-cel atlases and six independent eight-view weapons',()=>{
 assert.equal(Object.keys(manifest.bodies).length,9);assert.equal(Object.keys(manifest.weapons).length,6);const hashes=new Set();
 for(const [key,entry]of [...Object.entries(manifest.bodies),...Object.entries(manifest.weapons)]){const data=fs.readFileSync(new URL('../assets/equipment/'+entry.image,import.meta.url)),body=key.includes('_armor_')||key.includes('_body_');assert.equal(data.subarray(1,4).toString(),'PNG');assert.equal(data.readUInt32BE(16),1024);assert.equal(data.readUInt32BE(20),body?2048:512);assert.equal(entry.frames.length,body?32:8);hashes.add(createHash('sha256').update(data).digest('hex'));
 for(const f of entry.frames){assert.ok(f.grip.every(n=>Number.isFinite(n)&&n>10&&n<246));assert.ok(f.x>=0&&f.y>=0);}}
 assert.equal(hashes.size,15);assert.deepEqual(manifest.directionRows,['S','SW','W','NW','N','NE','E','SE']);
});
test('weapon-only, armor-only and mixed slots resolve without baked old weapons',()=>{
 for(const role of ['warrior','mage','archer']){const armor=Object.keys(manifest.bodies).find(k=>k.startsWith(role+'_armor')),weapon=Object.keys(manifest.weapons).find(k=>k.startsWith(role));
 assert.equal(equipmentVisual({role,equipment:{armor:null,weapon:null}}),null);
 assert.deepEqual(equipmentVisual({role,equipment:{weapon:{visualKey:weapon}}}),{body:role+'_body_default',weapon});
 assert.equal(equipmentVisual({role,equipment:{armor:{visualKey:armor}}}).body,armor);
 assert.deepEqual(equipmentVisual({role,equipment:{armor:{visualKey:armor},weapon:{visualKey:weapon}}}),{body:armor,weapon});}
 assert.equal(equipmentVisual({role:'mage',equipment:{armor:{visualKey:'warrior_armor_plate'},weapon:{visualKey:'archer_weapon_crossbow'}}}),null);
 assert.equal(drawEquippedHero({}, {role:'warrior',equipment:{weapon:{visualKey:'warrior_weapon_iron'}}}),false);
 assert.equal(equipmentAssetState().bodyWarp,false);
});
test('equipment attack windup, hit and recovery meet continuously across exact event times',()=>{
 const eps=1e-6;
 for(const role of ['warrior','mage','archer'])for(const wind of [.06,.12,.3]){const end=wind+.09,duration=end+.22,h={role,face:1,gait:0,action:{facing:1,type:'attack',windup:wind,activeEnd:end,duration,t:0}};
 for(const t of [wind*.65,wind,end,duration]){h.action.t=t-eps;const before=equipmentPose(h);h.action.t=t+eps;const after=equipmentPose(h);for(const field of ['x','y','weaponAngle'])assert.ok(Math.abs(after[field]-before[field])<1e-4,role+' continuous '+field+' at '+t);}
 assert.equal(equipmentAttackPulse(0,wind,end,duration),0);assert.equal(equipmentAttackPulse(wind*.65,wind,end,duration),-1);assert.equal(equipmentAttackPulse(wind,wind,end,duration),1);assert.equal(equipmentAttackPulse(duration,wind,end,duration),0);}
});
test('local walking motion is continuous at old four-frame boundaries and keeps one rigid torso pose',()=>{
 const h={role:'warrior',face:0,gait:1,move:{x:1,y:0},stride:0};
 for(const stride of [0,.25,.5,.75,1]){h.stride=stride-1e-6;const a=equipmentLocalMotion(h),p=equipmentPose(h);h.stride=stride+1e-6;const b=equipmentLocalMotion(h),q=equipmentPose(h);assert.equal(p.column,q.column);for(let i=0;i<2;i++)for(const key of ['x','y','rotation'])assert.ok(Math.abs(a.feet[i][key]-b.feet[i][key])<.0001);}
 h.gait=0;const idleA=equipmentLocalMotion(h,0),idleB=equipmentLocalMotion(h,1);assert.notEqual(idleA.cloth,idleB.cloth);assert.ok(Math.abs(idleB.cloth)<.007);assert.ok(idleB.feet.every(p=>p.x===0&&p.y===0&&p.rotation===0));
});
test('all eight equipment directions follow gameplay compass and appearance sampling never mutates hero',()=>{
 const h={role:'mage',face:0,gait:1,stride:.2,move:{x:1,y:0},equipment:{armor:{visualKey:'mage_armor_leaf'}}},expected=[6,7,0,1,2,3,4,5];
 for(let face=0;face<8;face++){h.face=face;const before=JSON.stringify(h);assert.equal(equipmentPose(h,3).row,expected[face]);equipmentLocalMotion(h,3);equipmentVisual(h);assert.equal(JSON.stringify(h),before);}
});
