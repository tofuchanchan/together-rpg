import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {simulateCampaign} from './audit-campaign.mjs';

const option=(key,fallback)=>process.argv.find(a=>a.startsWith(`--${key}=`))?.slice(key.length+3)||fallback;
const phase=option('phase','baseline'),root='output/verification/campaign-coherence';
const source=option('source',phase==='baseline'?`${root}/baseline-snapshot/coop`:'src/coop');
const {World}=await import(pathToFileURL(path.resolve(`${source}/model.js`)).href);
const hashes=Object.fromEntries(fs.readdirSync(source).filter(f=>f.endsWith('.js')).sort().map(f=>[f,crypto.createHash('sha256').update(fs.readFileSync(`${source}/${f}`)).digest('hex')]));
const rosters=[['warrior'],['mage'],['archer'],['warrior','mage'],['warrior','archer'],['mage','archer']];
const seeds=option('seeds','17,41').split(',').map(Number),strategies=option('strategies','legacy,coherent').split(','),policies=option('policies','recruit,build').split(','),routes=option('routes','safe').split(',');
const count=(array,key)=>Object.fromEntries([...new Set(array.map(key))].map(k=>[k,array.filter(o=>key(o)===k).length]));
const stats=rows=>({runs:rows.length,chapterCleared:rows.filter(r=>r.room>=11).length,defeats:rows.filter(r=>r.mode==='defeat').length,stalls:rows.filter(r=>r.anomalies.includes('wave-stall')).length,bossArrivals:rows.filter(r=>r.bosses.length).length,choices:count(rows.flatMap(r=>r.choices),o=>o.key.split(':')[0]),lessons:count(rows.flatMap(r=>r.shops.flatMap(s=>s.actions)).filter(a=>a.type==='lesson'),a=>a.kind),plans:count(rows.flatMap(r=>r.finalParty.filter(h=>!h.ai)),h=>h.plan||'none'),masteryHeroes:rows.flatMap(r=>r.finalParty.filter(h=>!h.ai)).filter(h=>Object.values(h.pairMastery||{}).some(Boolean)).length});
const report={date:new Date().toISOString(),method:{phase,seeds,rosters,strategies,policies,routes,dt:1/60,stopAtRoom:11,limit:1800,stall:240,controller:'Production AI; actual drops, private wallets and public menu/shop methods. No injected HP/XP/gold/equipment. First actually acquired skill chooses a plan, visible offers determine later progress. Recruit priority hires before courses/equipment; build priority buys courses/equipment before recruitment. Rank II+ active investments cannot be discarded. All results are automated-policy observations, not human win rates.',snapshot:source},policyHash:crypto.createHash('sha256').update(fs.readFileSync('tools/audit-campaign.mjs')).digest('hex'),hashes,results:[],summary:{}};
const out=option('out',`${root}/${phase}.json`);fs.mkdirSync(path.dirname(out),{recursive:true});
const save=()=>{report.summary=Object.fromEntries(strategies.flatMap(strategy=>policies.map(policy=>[`${strategy}/${policy}`,stats(report.results.filter(r=>r.strategy===strategy&&r.policy===policy))])));fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');};
save();
for(const strategy of strategies)for(const policy of policies)for(const roles of rosters)for(const routePolicy of routes)for(const seed of seeds){
 const start=performance.now(),result=simulateCampaign(roles,seed,{WorldClass:World,strategy,policy,routePolicy,limit:1800,stall:240,stopAtRoom:11});
 report.results.push({...result,routePolicy});save();
 console.log(JSON.stringify({strategy,policy,roles,routePolicy,seed,room:result.room,mode:result.mode,anomalies:result.anomalies,choices:count(result.choices,o=>o.key.split(':')[0]),lessons:result.shops.flatMap(s=>s.actions).filter(a=>a.type==='lesson').length,cpuMs:Math.round(performance.now()-start)}));
}
console.log(JSON.stringify(report.summary,null,2));
