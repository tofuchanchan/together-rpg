import fs from 'node:fs';
import assert from 'node:assert/strict';
import {World} from '../src/coop/model.js';
import {ROUTES} from '../src/coop/adventure.js';
import {applyReward} from '../src/coop/builds.js';
import {createHero} from '../src/coop/recruitment.js';
const rows=[];
for(const kind of ['nest','defend','boss'])for(const roles of [['warrior'],['mage'],['archer'],['warrior','mage'],['mage','archer'],['warrior','mage','archer']])for(const seed of [17,83]){
 const w=new World(seed),humanCount=Math.min(2,roles.length);w.reset(roles,humanCount);if(roles.length===3)w.heroes.push(createHero(roles[2],2,{ai:true}));w.enemies=[];w.effects=[];w.projectiles=[];w.obstacles=[];w.pressure=null;w.xpNext=1e8;
 w.room=kind==='boss'?10:kind==='defend'?6:3;w.wave=kind==='boss'?1:2;w.route={...ROUTES[kind==='defend'?'watchpost':'nursery'],room:w.room};w.lastBonusClear=1e6;
 // Modest fixed chapter fixtures, no invulnerability, gear, evolution or mastery.
 const training=kind==='nest'?['hp','power','haste','skill']:['hp','hp','hp','power','power','haste','skill','skill','armor','cooldown'];
 for(const h of w.heroes){for(const key of training)applyReward(h,key);for(const s of [0,1])for(let i=0;i<(kind==='nest'?1:2);i++)applyReward(h,`active:${s}`);h.hp=h.maxHp;}
 w.spawnWave();let peak=0,shots=0,phases=new Set();
 while(w.mode==='play'&&w.time<240){const controls=w.heroes.slice(0,humanCount).map(h=>w.aiInput(h));w.advance(1/30,controls);peak=Math.max(peak,w.enemies.length);shots=Math.max(shots,w.projectiles.length);const boss=w.enemies.find(e=>e.boss);if(boss)phases.add(boss.phase);assert.ok(w.heroes.every(h=>Number.isFinite(h.hp)&&Number.isFinite(h.x)));}
 const row={kind,roles:roles.join('+'),seed,mode:w.mode,success:kind==='boss'?!w.enemies.some(e=>e.boss):w.objective.success===true,seconds:+w.time.toFixed(2),objective:w.objective?.phase,beaconPct:w.objective?.beacon?Math.round(w.objective.beacon.hp/w.objective.beacon.maxHp*100):null,bossPct:Math.round((w.enemies.find(e=>e.boss)?.hp||0)/(w.enemies.find(e=>e.boss)?.maxHp||1)*100),hp:w.heroes.map(h=>Math.round(h.hp/h.maxHp*100)),peakEnemies:peak,peakProjectiles:shots,phases:[...phases]};rows.push(row);console.log(JSON.stringify(row));
}
fs.mkdirSync('output/verification/adventure',{recursive:true});fs.writeFileSync('output/verification/adventure/simulation.json',JSON.stringify({method:'36 fixed chapter encounters, two seeds, solo/duo/three-member parties, real production AI controlling humans and companions. Normal health and damage; no gear or evolved skills; XP leveling disabled to isolate objective and boss balance. Not natural win rates or human enjoyment evidence.',rows},null,2));
