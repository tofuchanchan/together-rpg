import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {World} from '../src/coop/model.js';
import {applyReward} from '../src/coop/builds.js';
import {SKILL_PAIRS} from '../src/coop/skill-pairs.js';

const arg=(k,d)=>process.argv.find(v=>v.startsWith('--'+k+'='))?.split('=')[1]??d;
const rng=seed=>()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
const round=n=>Math.round(n*100)/100;
export const TRAINING=['skill','skill','skill','power','power','haste','haste','cooldown','cooldown','hp','hp','hp','hp','armor','armor'];
export function preparePair(w,key,{mastery=true,advanced=true}={}){
 const p=SKILL_PAIRS[key],h=w.heroes[0];
 for(const s of p.slots)for(let i=0;i<3;i++)assert.ok(applyReward(h,'active:'+s).ok);
 if(advanced)for(const s of p.slots)assert.ok(applyReward(h,'advance:'+s).ok);
 for(let i=0;i<2;i++)assert.ok(applyReward(h,'passive:'+p.component).ok);
 if(mastery)assert.ok(applyReward(h,'mastery:'+key).ok);
 for(const card of TRAINING)assert.ok(applyReward(h,card).ok);
 if(!mastery)assert.ok(applyReward(h,'skill').ok); // Spend the same last pick on a normal attribute.
 h.hp=h.maxHp;h.level=16;h.x=h.y=0;h.lastMove={x:1,y:0};return h;
}
export function balanceScenario(key,scenario,seed,options={}){
 const p=SKILL_PAIRS[key],w=new World(seed);w.reset([p.role],1);
 w.room=10;w.wave=1;w.level=16;w.clears=18;w.enemies=[];w.projectiles=[];w.effects=[];w.pickups=[];w.spawnQueue=[];w.pressure=null;w.pressureState=null;w.bossRoom=scenario==='boss';w.waveDuration=999;w.enrageAt=999;w.xpNext=1e9;w.obstacles=[];w.seed=seed;
 const h=preparePair(w,key,options),random=rng(seed),limit=scenario==='boss'?100:60;
 if(scenario==='boss'){const e=w.createEnemy('thornking',330,0);e.hp=e.maxHp=3700;w.enemies.push(e);}
 else{
  const count=scenario==='swarm'?48:scenario==='lane'?36:24,kinds=scenario==='swarm'?['seedling','dustling','gnat','goblin']:scenario==='lane'?['goblin','mushroom','slime']:['goblin','mushroom','slime','wolf','skeleton','spider','beetle','wisp'];
  for(let i=0;i<count;i++){const a=random()*Math.PI*2,r=280+random()*190,x=scenario==='lane'?260+Math.floor(i/3)*32:Math.cos(a)*r,y=scenario==='lane'?(i%3-1)*45+(random()-.5)*15:Math.sin(a)*r,e=w.createEnemy(kinds[i%kinds.length],x,y,scenario==='mixed'&&i%8===0?1:0);w.enemies.push(e);}
 }
 // Fixed already-formed encounter: omit drops/upgrades/recruitment, retaining real enemy AI, collision and damage.
 w.dropPickup=()=>null;
 const metrics={casts:[0,0,0,0],bursts:0,taken:0,absorbed:0,damage:{attack:0,skill:0,proc:0,dot:0},controlled:0,enemySeconds:0,bossDamage:0,peakProjectiles:0};
 const originalEmit=w.emit.bind(w),damage=w.damageEnemy.bind(w),hurt=w.damageHero.bind(w);
 w.emit=(type,data)=>{if(type==='skill')metrics.casts[h.action.slot]++;if(type==='buildBurst'&&data.key)metrics.bursts++;originalEmit(type,data);};
 w.damageEnemy=(e,n,...args)=>{const hp=e.hp;damage(e,n,...args);const actual=hp-e.hp,source=args[2]??'attack';metrics.damage[source]=(metrics.damage[source]||0)+actual;if(e.boss)metrics.bossDamage+=actual;};
 w.damageHero=(actor,...args)=>{const hp=actor.hp,shield=actor.shield;hurt(actor,...args);metrics.taken+=hp-actor.hp;metrics.absorbed+=Math.max(0,shield-actor.shield);};
 const phases=new Set();
 for(let frame=0;frame<limit*60&&w.mode==='play'&&w.enemies.length;frame++){
  w.advance(1/60,[w.aiInput(h)]);
  for(const e of w.enemies){metrics.enemySeconds+=1/60;if(e.freeze>0||e.slow>0)metrics.controlled+=1/60;if(e.boss)phases.add(e.phase);}
  metrics.peakProjectiles=Math.max(metrics.peakProjectiles,w.projectiles.filter(p=>!p.hostile).length);
  assert.ok(Number.isFinite(h.hp)&&Number.isFinite(h.damageDone)&&w.enemies.every(e=>Number.isFinite(e.hp)));
 }
 return {key,scenario,seed,won:!w.enemies.length,mode:w.mode,seconds:round(w.time),remaining:w.enemies.length,kills:w.kills,hp:round(h.hp),maxHp:h.maxHp,damageDone:round(h.damageDone),bossHp:round(w.enemies.find(e=>e.boss)?.hp||0),phases:[...phases],...Object.fromEntries(Object.entries(metrics).map(([k,v])=>[k,typeof v==='number'?round(v):v]))};
}
export function summarize(rows){
 const mean=(r,k)=>round(r.reduce((n,v)=>n+v[k],0)/r.length);
 return [...new Set(rows.map(r=>r.scenario))].flatMap(scenario=>Object.keys(SKILL_PAIRS).map(key=>{const r=rows.filter(v=>v.key===key&&v.scenario===scenario);return{scenario,key,runs:r.length,wins:r.filter(v=>v.won).length,seconds:mean(r,'seconds'),hpPct:round(r.reduce((n,v)=>n+v.hp/v.maxHp*100,0)/r.length),damage:mean(r,'damageDone'),bossDamage:mean(r,'bossDamage'),bursts:mean(r,'bursts'),absorbed:mean(r,'absorbed'),casts:round(r.reduce((n,v)=>n+v.casts.reduce((a,b)=>a+b,0),0)/r.length)};}));
}
export function pairCycle(key,mastery=true){
 const w=new World(811);w.reset([SKILL_PAIRS[key].role],1);w.enemies=[];w.obstacles=[];w.pressure=null;w.waveDuration=999;w.xpNext=1e9;
 const h=preparePair(w,key,{mastery});h.attackCd=999;w.dropPickup=()=>null;
 for(let i=0;i<18;i++){const e=w.createEnemy('goblin',100+(i%6)*55,(Math.floor(i/6)-1)*40);e.hp=e.maxHp=3000;e.stats={...e.stats,speed:0,damage:0,contactDamage:0};e.cd=999;w.enemies.push(e);}
 const order={fortress:[0,2],blades:[3,1],rail:[2,0],storm:[3,1],stars:[3,2],elements:[1,0]}[key];let bursts=0;
 const emit=w.emit.bind(w);w.emit=(type,data)=>{if(type==='buildBurst'&&data.key)bursts++;emit(type,data);};
 for(const s of order){assert.ok(w.request(h,h.loadout.indexOf(s)?'skill2':'skill1',{x:1,y:0}));const duration=h.action.duration;if(key==='fortress'&&s===0){w.advance(.12);w.damageHero(h,50,{x:50,y:0});w.advance(duration-.12+.02);}else w.advance(duration+.02);}
 w.advance(5);return {key,mastery,damage:round(h.damageDone),bursts};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const out=arg('out','output/verification/pair-balance/baseline.json'),seeds=arg('seeds','17,41,83,127').split(',').map(Number),mastery=arg('mastery','true')!=='false',rows=[];
 fs.mkdirSync(new URL('.',pathToFileURL(process.cwd()+'/'+out)),{recursive:true});
 const files=['model.js','pair-combat.js','ai.js','build-combat.js','skill-pairs.js'],hashes=Object.fromEntries(files.map(f=>[f,crypto.createHash('sha256').update(fs.readFileSync('src/coop/'+f)).digest('hex')])),cycles=Object.keys(SKILL_PAIRS).map(key=>pairCycle(key,mastery));
 const method={seeds,training:TRAINING,buildCards:11,mastery,alternative:mastery?null:'last mastery pick spent on skill strength attribute instead',gear:'none',core:'none',supportPassives:'only required component II',scenarios:['swarm','lane','mixed','boss'],controller:'production companion AI feeding normal player inputs',limits:'Fixed formed-build encounters, normal class HP and real enemy actions. No drops, reinforcements, progression or natural win-rate claim.'};
 for(const scenario of method.scenarios)for(const key of Object.keys(SKILL_PAIRS)){
  for(const seed of seeds)rows.push(balanceScenario(key,scenario,seed,{mastery}));
  fs.writeFileSync(out,JSON.stringify({method,hashes,cycles,rows,summary:summarize(rows)},null,2));
  console.log(JSON.stringify(summarize(rows).find(r=>r.scenario===scenario&&r.key===key)));
 }
}
