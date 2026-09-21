import fs from 'node:fs';
import {simulateCampaign} from './audit-campaign.mjs';
const out='output/verification/boss-specialist/after',results=[];
for(const role of ['warrior','mage','archer'])for(const control of ['full','walk-only','stationary'])for(const seed of [17,41,83,127]){
 const controller=control==='full'?null:control==='stationary'?()=>({x:0,y:0,dodge:false,skill1:false,skill2:false}):(w,h)=>({...w.aiInput(h),dodge:false,skill1:false,skill2:false});
 const r=simulateCampaign([role],seed,{limit:700,stopAtRoom:4,routePolicy:'safe',controller});results.push({...r,control});
 console.log(JSON.stringify({role,control,seed,room:r.room,mode:r.mode,level:r.level,clears:r.clears,damage:r.damage}));
}
fs.writeFileSync(`${out}/intro.json`,JSON.stringify({method:'First 3 rooms / 6 waves. Natural drops and visible upgrades. Full production policy versus removing skill/dodge buttons versus stationary autoattack. Walk-only retains AI foresight and is an input ablation, not a beginner model.',results},null,2));
