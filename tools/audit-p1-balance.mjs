import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {simulateCampaign} from './audit-campaign.mjs';
const arg=(k,d)=>process.argv.find(a=>a.startsWith(`--${k}=`))?.slice(k.length+3)||d;
const source=arg('source','src/coop'),out=arg('out','output/p1-fixes/balance-candidate.json');
const {World}=await import(pathToFileURL(path.resolve(source,'model.js')));
const {World:BaselineWorld}=await import('../output/p1-fixes/baseline-src/model.js');
const seeds=arg('seeds','17,41,83,127').split(',').map(Number);
const rosters=arg('rosters','warrior;mage;archer;warrior,mage;mage,mage;mage,archer;archer,archer').split(';').map(r=>r.split(','));
const report={date:new Date().toISOString(),source,method:{seeds,rosters,policy:'recruit',limit:5400,dt:1/60,controller:'Production AI, normal inputs and public menu/shop actions. Keep-full-build option when available. No granted stats, XP, equipment or recruits.'},hashes:Object.fromEntries(fs.readdirSync(source).filter(f=>f.endsWith('.js')).sort().map(f=>[f,crypto.createHash('sha256').update(fs.readFileSync(path.join(source,f))).digest('hex')])),results:[]};
fs.mkdirSync(path.dirname(out),{recursive:true});
report.method.seedNormalization='Restore the old constructor RNG state before the real reset: startup preview density cannot shift the comparison seed.';
report.method.stopAtRoom=Number(arg('stop-room','0'))||null;report.method.stopAtFirstShop=process.argv.includes('--early');
for(const roles of rosters)for(const seed of seeds){const t=performance.now();const r=simulateCampaign(roles,seed,{WorldClass:World,resetSeed:new BaselineWorld(seed).seed,stopAtShop:report.method.stopAtFirstShop,stopAtRoom:report.method.stopAtRoom});report.results.push(r);fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({roles:roles.join('+'),seed,room:r.room,wave:r.wave,clears:r.clears,mode:r.mode,shops:r.shops.length,party:r.finalParty.length,time:r.time,cpuMs:Math.round(performance.now()-t),anomalies:r.anomalies}));}
console.table(rosters.map(roles=>{const r=report.results.filter(r=>r.roles.join()===roles.join());return{roles:roles.join('+'),n:r.length,shop5:r.filter(r=>r.shops.some(s=>s.room===5)||r.mode==='shop'&&r.room===5).length,boss10:r.filter(r=>r.bosses.some(b=>b.room===10&&b.killed)).length,room12:r.filter(r=>r.room>=12).length,shop15:r.filter(r=>r.shops.some(s=>s.room===15)).length,win:r.filter(r=>r.mode==='victory').length};}));
