import fs from 'node:fs';
import {simulateCampaign} from './audit-campaign.mjs';
const phase=process.argv[2]||'before',out=`output/verification/boss-specialist/${phase}`;fs.mkdirSync(out,{recursive:true});
const results=[],rosters=[['warrior'],['mage'],['archer'],['warrior','mage'],['warrior','archer'],['mage','archer']];
for(const roles of rosters)for(const routePolicy of ['safe','risk'])for(const seed of [17,41]){
 const start=performance.now(),r=simulateCampaign(roles,seed,{limit:1800,stall:240,stopAtRoom:11,routePolicy});results.push({...r,routePolicy});
 fs.writeFileSync(`${out}/campaign.json`,JSON.stringify({method:'24 natural first-chapter campaigns: real drops, visible rewards, private wallets, paid gear/recruits, no injected power. Production AI. Gear-first shop policy does not buy mastery lessons; not an optimal build or human win-rate estimate.',results},null,2));
 console.log(JSON.stringify({roles,routePolicy,seed,mode:r.mode,room:r.room,level:r.level,clears:r.clears,boss:r.bosses,anomalies:r.anomalies,cpuMs:Math.round(performance.now()-start)}));
}
