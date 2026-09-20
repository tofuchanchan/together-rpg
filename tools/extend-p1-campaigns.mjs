import fs from 'node:fs';
import assert from 'node:assert/strict';
import {simulateCampaign} from './audit-campaign.mjs';
import {World} from '../output/p1-fixes/release-src/model.js';
import {World as BaselineWorld} from '../output/p1-fixes/baseline-src/model.js';
const group=process.argv[2];if(!['solo','melee','ranged'].includes(group))throw Error('Specify solo, melee or ranged');
const source=`output/p1-fixes/balance-release-${group}.json`,out=`output/p1-fixes/campaign-release-${group}.json`,checkpoint=JSON.parse(fs.readFileSync(source));
assert.equal(checkpoint.results.length,24,'Finish all checkpoint runs before extending this group');
const report={...checkpoint,date:new Date().toISOString(),method:{...checkpoint.method,stopAtRoom:null,checkpointSource:source,extension:'Every survivor at room 12 is deterministically rerun from its original start to natural defeat/victory or the original time/stall limit. Earlier completed failures are retained. Prefix waves and choices must exactly reproduce the checkpoint run.'},results:[]};
for(const old of checkpoint.results){let result=old;if(old.mode==='play'&&old.room===12&&old.clears===21){const t=performance.now();result=simulateCampaign(old.roles,old.seed,{WorldClass:World,resetSeed:new BaselineWorld(old.seed).seed});assert.deepEqual(result.waves.slice(0,old.waves.length),old.waves,'Checkpoint combat prefix changed');assert.deepEqual(result.choices.slice(0,old.choices.length),old.choices,'Checkpoint reward prefix changed');console.log(JSON.stringify({roles:old.roles.join('+'),seed:old.seed,room:result.room,clears:result.clears,mode:result.mode,time:result.time,anomalies:result.anomalies,cpuMs:Math.round(performance.now()-t)}));}report.results.push(result);fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({group,n:report.results.length,victories:report.results.filter(r=>r.mode==='victory').length,lateShops:report.results.filter(r=>r.shops.some(s=>s.room===15)).length,anomalies:report.results.filter(r=>r.anomalies.length).map(r=>({roles:r.roles,seed:r.seed,room:r.room,anomalies:r.anomalies}))}));
