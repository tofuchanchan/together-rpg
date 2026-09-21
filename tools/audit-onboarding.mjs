import fs from 'node:fs';
import assert from 'node:assert/strict';
import {simulateCampaign} from './audit-campaign.mjs';
const out='output/verification/skill-quality';fs.mkdirSync(out,{recursive:true});
const rows=[];
for(const roles of [['warrior'],['mage'],['archer'],['warrior','mage']])for(const seed of [17,41,83,127]){
 let firstLevel=null;
 const r=simulateCampaign(roles,seed,{stopAtRoom:4,limit:700,observe:w=>{if(firstLevel===null&&w.level>1)firstLevel=+w.time.toFixed(2);}});
 assert.deepEqual(r.anomalies,[]);assert.ok(Number.isFinite(r.damage));
 rows.push({...r,firstLevel});console.log(JSON.stringify({roles,seed,clears:r.clears,firstLevel,level:r.level,damage:r.damage,seconds:r.time,gold:r.gold,potions:r.drops.potion}));
}
fs.writeFileSync(out+'/onboarding.json',JSON.stringify({scope:'16 fixed-seed runs to six cleared waves, normal HP/equipment/drops and production AI issuing player inputs. Existing campaign visible-card policy. First level sampled once per second. No human win-rate or later-game balance claim.',rows},null,2));
