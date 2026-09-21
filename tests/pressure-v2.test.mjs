import test from 'node:test';
import assert from 'node:assert/strict';
import {ENEMIES} from '../src/coop/enemies.js';
import {rareRoll,scaledEnemy,wavePlan} from '../src/coop/encounters.js';
import {pressurePlan,pressureKind,pressureTick,createPressureState} from '../src/coop/pressure.js';
import {XP_CHANCE,XP_VALUE,GOLD_CHANCE,GOLD_VALUE,POTION_CHANCE,lootRoll,xpRequired} from '../src/coop/loot.js';
import {companionInput} from '../src/coop/ai.js';

const rng=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};

test('pressure opens with a crowd and adds timed reinforcements without deaths',()=>{
 const p=pressurePlan(1,1),s=createPressureState(p),first=pressureTick(p,s,{elapsed:0,alive:0});
 assert.equal(first.count,20);assert.equal(s.spawned,0);assert.equal(first.state.lastAlive,20);
 const second=pressureTick(p,first.state,{elapsed:p.interval,alive:20});assert.equal(second.count,8);assert.equal(second.reason,'timed');
});

test('death above the target population is replaced on the very next pressure tick',()=>{
 const p=pressurePlan(4,1),s={spawned:80,lastAlive:50,nextAt:20,pendingRefill:0};
 const next=pressureTick(p,s,{elapsed:10,alive:49});assert.equal(next.count,1);assert.equal(next.state.lastAlive,50);assert.equal(next.reason,'refill');
});

test('mass death replacement is paced across ticks without losing the owed replacements',()=>{
 const p=pressurePlan(4,1);let state={spawned:50,lastAlive:50,nextAt:20,pendingRefill:0},alive=20,total=0;
 for(let i=0;i<4;i++){const n=pressureTick(p,state,{elapsed:1+i/120,alive});assert.ok(n.count<=p.refillBurst);total+=n.count;alive+=n.count;state=n.state;}
 assert.equal(total,30);assert.equal(alive,50);assert.equal(state.pendingRefill,0);
});

test('live cap and lifetime budget bound pressure even under extreme killing',()=>{
 const p=pressurePlan(1,1);let state=createPressureState(p),sum=0;
 for(let i=0;i<1000;i++){const n=pressureTick(p,state,{elapsed:i/120,alive:0});sum+=n.count;state=n.state;assert.ok(n.count<=p.aliveCap);assert.ok(state.spawned<=p.totalBudget);}
 assert.equal(sum,p.totalBudget);
 const capped=pressureTick(p,{spawned:100,lastAlive:p.aliveCap,nextAt:0,pendingRefill:0},{elapsed:20,alive:p.aliveCap});assert.equal(capped.count,0);assert.ok(capped.state.nextAt>20);
});

test('wave deadline discards all refill debt and never queues late reinforcements',()=>{
 const p=pressurePlan(1,1),n=pressureTick(p,{spawned:50,lastAlive:50,nextAt:0,pendingRefill:20},{elapsed:p.duration,alive:0});
 assert.equal(n.count,0);assert.equal(n.closed,true);assert.equal(n.state.pendingRefill,0);
});

test('dense roster is mostly three fragile shapes but guarantees all existing specialist kinds',()=>{
 const kinds=new Set(),counts={swarm:0,total:0};
 for(let seed=17;seed<27;seed++){const random=rng(seed);for(let i=0;i<180;i++){const kind=pressureKind(9,2,i,random);assert.ok(ENEMIES[kind]);kinds.add(kind);counts.total++;counts.swarm+=!!ENEMIES[kind].swarm;}}
 assert.equal(kinds.size,13);assert.ok(counts.swarm/counts.total>.75&&counts.swarm/counts.total<.85);
 for(const key of ['seedling','dustling','gnat']){const d=ENEMIES[key];assert.ok(d.hp<=20&&d.damage<=5);assert.ok(d.bodyRadius>0&&d.contactDamage>0);}
});

test('later pressure grows speed, attack rate, contact damage and population as well as health',()=>{
 const early=scaledEnemy(ENEMIES.dustling,1,0,()=>.5).stats,late=scaledEnemy(ENEMIES.dustling,18,0,()=>.5).stats;
 assert.ok(late.hp>early.hp);assert.ok(late.speed>early.speed);assert.ok(late.damage>early.damage);assert.ok(late.contactDamage>early.contactDamage);assert.ok(late.cd<early.cd);
 const p=pressurePlan(9,2);assert.ok(p.targetAlive>pressurePlan(1,1).targetAlive);assert.ok(p.totalBudget>pressurePlan(1,1).totalBudget);
});

test('rarities introduce one-affix elites before rare and legendary threats',()=>{
 for(const progress of [1,2,3])assert.equal(rareRoll(()=>0,progress),0);
 assert.equal(rareRoll(()=>0,4),1);assert.equal(rareRoll(()=>0,7),1);assert.equal(rareRoll(()=>0,8),2);assert.equal(rareRoll(()=>0,13),2);assert.equal(rareRoll(()=>0,14),3);
 assert.equal(rareRoll(()=>.189,11),1);assert.equal(rareRoll(()=>.191,11),0);assert.equal(rareRoll(()=>.01,18),3);
});
test('healing support waits until wave eighteen, including scheduled specialist slots',()=>{
 for(let progress=1;progress<18;progress++)for(let i=0;i<240;i++)assert.notEqual(pressureKind(Math.ceil(progress/2),progress%2||2,i,()=>.98),'shaman');
 const kinds=Array.from({length:240},(_,i)=>pressureKind(9,2,i,()=>.98));assert.ok(kinds.includes('shaman'));
});
test('experience is common but not guaranteed; rare monsters improve both odds and values',()=>{
 assert.ok(XP_CHANCE[0]>=.55&&XP_CHANCE[0]<=.70);
 for(let rank=1;rank<4;rank++){assert.ok(XP_CHANCE[rank]>XP_CHANCE[rank-1]);assert.ok(XP_VALUE[rank]>XP_VALUE[rank-1]);assert.ok(GOLD_CHANCE[rank]>GOLD_CHANCE[rank-1]);assert.ok(GOLD_VALUE[rank]>GOLD_VALUE[rank-1]);}
 assert.deepEqual(lootRoll({rarity:0},()=>.999),[]);
 assert.ok(lootRoll({rarity:0},()=>.5).some(d=>d.type==='xp'));assert.ok(POTION_CHANCE[0]===.011&&GOLD_CHANCE[0]===.04);
 let calls=0;lootRoll({rarity:3},()=>{calls++;return .5;});assert.equal(calls,3);
});

test('boss drops are explicit while summons cannot farm gold or medicine',()=>{
 assert.deepEqual(lootRoll({boss:true},()=>.5),[{type:'xp',value:24},{type:'gold',value:10},{type:'potion',value:35}]);
 assert.deepEqual(lootRoll({rarity:3,summonedBy:99},()=>0),[{type:'xp',value:7}]);
});

function aiArena(){
 const h={id:1,role:'archer',ai:true,x:0,y:0,hp:105,maxHp:105,rangeBonus:1,skills:[0,0],cd:[0,0],lastMove:{x:1,y:0},dodgeCd:0,action:null},leader={id:0,ai:false,x:900,y:500,down:false};
 const w={time:0,heroes:[leader,h],enemies:[],hazards:[],projectiles:[],obstacles:[],pickups:[],bossWarnings:[],lineClear:()=>true};
 return {w,h,role:{range:370},map:{x:1347,y:845}};
}

test('idle AI keeps its own patrol anchor when the human moves elsewhere',()=>{
 const {w,h,role,map}=aiArena(),first=companionInput(w,h,role,map);w.heroes[0].x=-900;
 const second=companionInput(w,h,role,map);assert.equal(h.aiIntent,'patrol');assert.deepEqual({x:first.x,y:first.y},{x:second.x,y:second.y});assert.deepEqual(h.sentryAnchor,{x:0,y:0});
});

test('AI collects loose XP but low health routes to actual medicine rather than XP or coins',()=>{
 const {w,h,role,map}=aiArena();w.pickups=[{id:20,type:'xp',value:1,x:80,y:0},{id:21,type:'potion',value:35,x:0,y:-100}];
 let input=companionInput(w,h,role,map);assert.equal(h.aiIntent,'loot');assert.ok(input.x>.8);
 h.hp=10;input=companionInput(w,h,role,map);assert.equal(h.aiIntent,'heal');assert.ok(input.y<-.8);
});

test('AI ignores poisoned loose loot and keeps rescue ahead of gathering',()=>{
 const {w,h,role,map}=aiArena();w.pickups=[{id:20,type:'xp',x:80,y:0},{id:21,type:'gold',x:0,y:-160}];w.hazards=[{type:'poison',x:80,y:0,r:55,timer:.1}];
 let input=companionInput(w,h,role,map);assert.equal(h.aiIntent,'loot');assert.ok(input.y<0);
 w.hazards=[];Object.assign(w.heroes[0],{x:80,y:0,down:true});input=companionInput(w,h,role,map);assert.equal(h.aiIntent,'revive');assert.ok(input.x>0);
});

test('ten seeded pre-boss reward budgets slow levels despite common XP and many more kills',t=>{
 const legacy=['goblin','mushroom','slime','bat','wolf','skeleton','shaman','spider','beetle','wisp'];
 const legacyRank=(random,progress)=>{const r=random(),bonus=Math.min(.08,(progress-1)*.002);return r<.015+bonus*.2?3:r<.06+bonus*.5?2:r<.19+bonus?1:0;};
 const levelFor=(xp,next)=>{let level=1;while(xp>=next(level)){xp-=next(level);level++;}return level;};
 const rows=[];
 for(let seed=17;seed<27;seed++){
  const oldRandom=rng(seed),newRandom=rng(seed);let oldXp=0,newXp=0,oldCount=0,newCount=0,potions=0;
  for(let room=1;room<=9;room++)for(let wave=1;wave<=2;wave++){
   const progress=(room-1)*2+wave;
   for(const batch of wavePlan(room,wave).batches)for(let i=0;i<batch.count;i++){
    const kind=legacy[((room-1)*7+(wave-1)*5+batch.index*3+i)%legacy.length],rank=legacyRank(oldRandom,progress);
    oldXp+=scaledEnemy(ENEMIES[kind],progress,rank,oldRandom).stats.xp;oldCount++;
   }
   for(let i=0;i<pressurePlan(room,wave).totalBudget;i++){
    const kind=pressureKind(room,wave,i,newRandom),rank=rareRoll(newRandom,progress),grown=scaledEnemy(ENEMIES[kind],progress,rank,newRandom);newCount++;
    for(const drop of lootRoll({kind,rarity:rank,stats:grown.stats},newRandom)){if(drop.type==='xp')newXp+=drop.value;if(drop.type==='potion')potions++;}
   }
  }
  const row={seed,oldCount,newCount,oldXp,newXp,oldLevel:levelFor(oldXp,l=>5+(l-1)*3),newLevel:levelFor(newXp,xpRequired),level85:levelFor(newXp*.85,xpRequired),potions};rows.push(row);
  assert.ok(newCount>oldCount*5);assert.ok(row.newLevel>=14&&row.newLevel<=18);assert.ok(row.level85>=14);assert.ok(row.newLevel<row.oldLevel);assert.ok(potions<oldCount*.28*.45);
 }
 t.diagnostic('Budget only: every scheduled spawn killed; 100% and 85% XP collection assumptions, not a combat-survival simulation. '+JSON.stringify(rows));
});
