import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/coop/model.js';
import {createHero} from '../src/coop/recruitment.js';
import {combatStats,ENRAGE} from '../src/coop/enemy-tactics.js';
import {pressureSpawn} from '../src/coop/pressure.js';

function arena(role='mage'){
 const w=new World(83);w.reset([role,'archer'],2);Object.assign(w,{enemies:[],pressure:null,pressureState:null,spawnQueue:[],waveDuration:Infinity,enrageAt:Infinity,obstacles:[],xpNext:Infinity,pickups:[],hazards:[],projectiles:[]});
 for(const h of w.heroes)Object.assign(h,{x:0,y:0,attackCd:999,skills:[1,1]});
 const foe=(kind,x=0,y=0)=>{const e=w.createEnemy(kind,x,y);e.cd=99;w.enemies.push(e);return e;};
 return {w,h:w.heroes[0],ally:w.heroes[1],foe};
}
const cast=e=>{e.cd=e.stats.cd;e.action={kind:'healer',t:.99,windup:1,x:e.x,y:e.y,r:110,hit:false};};

test('a heal excludes its caster, other healers, full health and dead bodies',()=>{
 const {w,foe}=arena(),shaman=foe('shaman'),other=foe('shaman',50),hurt=foe('goblin',90),full=foe('goblin',120),dead=foe('goblin',150);
 shaman.hp-=30;other.hp-=30;hurt.hp-=30;dead.hp=0;const before=[shaman.hp,other.hp,hurt.hp,full.hp,dead.hp];cast(shaman);w.updateEnemy(shaman,.02);
 assert.deepEqual([shaman.hp,other.hp,hurt.hp,full.hp,dead.hp],[before[0],before[1],before[2]+22,before[3],0]);
});
test('healing chooses only three injured allies and cannot heal through a wall or beyond 220',()=>{
 const {w,foe}=arena(),shaman=foe('shaman'),eligible=[30,55,80,105].map(x=>foe('goblin',x)),blocked=foe('goblin',0,180),far=foe('goblin',230);
 for(const e of [...eligible,blocked,far])e.hp=e.maxHp-30;w.obstacles=[{x:0,y:90,r:20}];cast(shaman);w.updateEnemy(shaman,.02);
 assert.equal(eligible.filter(e=>e.hp===e.maxHp-8).length,3);assert.equal(blocked.hp,blocked.maxHp-30);assert.equal(far.hp,far.maxHp-30);
});
test('healer needs an eligible target to begin casting and resolves visibility at release',()=>{
 const {w,foe}=arena(),shaman=foe('shaman',150),other=foe('shaman',180);shaman.hp-=20;other.hp-=20;shaman.cd=0;w.updateEnemy(shaman,.01);assert.equal(shaman.action,null);
 const target=foe('goblin',300);target.hp-=25;w.updateEnemy(shaman,.01);assert.equal(shaman.action.kind,'healer');w.obstacles=[{x:225,y:0,r:20}];w.updateEnemy(shaman,1.01);assert.equal(target.hp,target.maxHp-25);
});
for(const freeze of [.6,.001])test(`hard control ${freeze}s cancels a pending heal, leaves recovery and never resumes the cancelled release`,()=>{
 const {w,foe}=arena(),shaman=foe('shaman'),target=foe('goblin',80);target.hp-=30;cast(shaman);shaman.cd=0;shaman.freeze=freeze;w.updateEnemy(shaman,.01);
 assert.equal(shaman.action,null);assert.ok(shaman.cd>=.75);assert.equal(target.hp,target.maxHp-30);
 for(let i=0;i<60;i++)w.updateEnemy(shaman,.01);assert.equal(target.hp,target.maxHp-30);
});
test('enrage preserves healer cast cadence while increasing movement and damage normally',()=>{
 const {w,foe}=arena(),shaman=foe('shaman'),target=foe('goblin',80);target.hp-=30;shaman.cd=0;w.enraged=true;const raw={...shaman.stats},stats=combatStats(shaman,true);
 assert.equal(stats.cd,raw.cd);assert.equal(stats.speed,raw.speed*ENRAGE.speed);assert.equal(stats.damage,raw.damage*ENRAGE.damage);w.updateEnemy(shaman,.01);assert.equal(shaman.cd,raw.cd);assert.equal(shaman.action.windup,raw.windup);assert.deepEqual(shaman.stats,raw);
});

for(const size of [1,2,3])test(`first healer introduction caps ${size}-member squads to one normal or elite without shrinking batches`,()=>{
 const {w}=arena();w.humanCount=Math.min(size,2);w.heroes=w.heroes.slice(0,Math.min(size,2));if(size===3)w.heroes.push(createHero('warrior',2,{ai:true}));Object.assign(w,{room:9,wave:2,waveSpawned:0});w.random=()=>.981;
 // Force every rarity roll to legendary while keeping normal spawn selection.
 const create=w.createEnemy.bind(w);const ranks=[];w.createEnemy=(kind,x,y,rank)=>{ranks.push({kind,rank});return create(kind,x,y,rank);};
 let calls=0;w.random=()=>{calls++;return calls%7===5?0:.981;};w.spawnBatch({count:30,index:0});
 assert.equal(w.enemies.length,30);assert.equal(w.enemies.filter(e=>e.kind==='shaman').length,1);assert.ok(ranks.filter(e=>e.kind==='shaman').every(e=>e.rank<=1));
});
for(const size of [1,2,3])for(const group of [['beetle','shaman'],['wisp','spider']])test(`chapter-one mixed ${group.join('+')} cap for ${size} members preserves exact spawned count`,()=>{
 const {w}=arena();Object.assign(w,{room:9,wave:2});
 for(let i=0;i<25;i++){const kind=group[i%2],choice=pressureSpawn(w.room,w.wave,kind,i%4,w.enemies,size);w.enemies.push(w.createEnemy(choice.kind,i*30,0,choice.rank));}
 assert.equal(w.enemies.length,25);assert.equal(w.enemies.filter(e=>group.includes(e.kind)).length,size+1);assert.ok(w.enemies.filter(e=>!group.includes(e.kind)).every(e=>e.stats.swarm));
 const victim=w.enemies.find(e=>group.includes(e.kind));victim.hp=0;const choice=pressureSpawn(w.room,w.wave,victim.kind,0,w.enemies,size);assert.equal(choice.kind,victim.kind);
});
test('threat-combination caps are local to rooms7–9 and do not lower later specialist rarity',()=>{
 const living=Array.from({length:12},(_,i)=>({id:i,kind:'wisp',hp:1}));
 for(const room of [6,10,11,20])assert.deepEqual(pressureSpawn(room,2,'spider',3,living,1),{kind:'spider',rank:3});
 for(const room of [7,8,9])assert.deepEqual(pressureSpawn(room,2,'spider',3,living,1),{kind:'dustling',rank:3});
 assert.deepEqual(pressureSpawn(11,2,'shaman',3,[],3),{kind:'shaman',rank:3});
});
test('large Boss body separates an overlapping small monster across a two-cell grid boundary',()=>{
 for(const bossFirst of [true,false]){
  const {w,foe}=arena();w.heroes.forEach(h=>{h.x=-500;h.y=500;});
  const createBoss=()=>{const e=foe('mossbell',79);e.stats.bodyRadius=78;return e;};
  let boss,small;if(bossFirst){boss=createBoss();small=foe('dustling',165);}else{small=foe('dustling',165);boss=createBoss();}
  const before=small.x;w.resolveBodies();assert.equal(boss.x,79);assert.ok(small.x>before,'body radius reaches across two cells regardless of spawn order');
 }
});
test('dense off-screen enemies do not cancel automatic or AI support priority; immediate threats still do',()=>{
 const {w,h,foe}=arena(),near=foe('goblin',160),support=foe('shaman',230,40);for(let i=0;i<20;i++)foe('dustling',900,i*10);
 assert.equal(w.nearest(h,400),support);w.aiInput(h);assert.equal(h.aiIntent,'approach');near.x=95;assert.equal(w.nearest(h,400),near);w.aiInput(h);assert.notEqual(h.aiIntent,'approach');
});
test('unsafe rescue approach clears threats and waits for a stable opening before retrying',()=>{
 const {w,h,ally,foe}=arena();Object.assign(ally,{x:300,y:0,hp:0,down:true});const e=foe('goblin',300,30);w.aiInput(h);assert.notEqual(h.aiIntent,'revive');assert.equal(h.rescueState,'clear');
 e.hp=0;w.time+=.3;w.aiInput(h);assert.notEqual(h.aiIntent,'revive');w.time+=.4;w.aiInput(h);assert.equal(h.aiIntent,'revive');assert.equal(h.rescueState,'approach');
});
test('a hostile pool at a downed ally blocks rescue entry while safe active attacks remain available',()=>{
 const {w,h,ally,foe}=arena();Object.assign(ally,{x:300,y:0,hp:0,down:true});foe('mushroom',175);w.hazards=[{type:'poison',x:300,y:0,r:60,timer:.2,life:2,damage:8}];const input=w.aiInput(h);
 assert.notEqual(h.aiIntent,'revive');assert.equal(h.rescueState,'clear');assert.ok(input.skill1||input.skill2);
});
test('safe committed rescue remains still and suppresses offensive skills while progress advances',()=>{
 const {w,h,ally,foe}=arena();Object.assign(ally,{x:45,y:0,hp:0,down:true});foe('mushroom',175);const input=w.aiInput(h);assert.equal(h.aiIntent,'revive');assert.equal(h.rescueState,'channel');assert.equal(input.skill1,false);assert.equal(input.skill2,false);w.advance(1/120,[input,{}]);assert.ok(ally.revive>0);
});
