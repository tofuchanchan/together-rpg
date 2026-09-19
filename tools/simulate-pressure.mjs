// Inputs/reward choices only; normal HP, enemies, potion drops and damage.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {World} from '../src/coop/model.js';
const results=[];
for(const policy of ['circle','responsive'])for(const role of ['archer','mage'])for(const seed of [17,41,83]){
 const w=new World(seed);w.reset([role,role==='mage'?'warrior':'mage'],1);let hits=0,loss=0;
 const original=w.damageHero.bind(w);w.damageHero=(h,...args)=>{const hp=h.hp;original(h,...args);if(h.id===0&&hp>h.hp){hits++;loss+=hp-h.hp;}};
 for(let i=0;i<60*200&&!['defeat','complete'].includes(w.mode);i++){if(w.mode==='upgrade'){w.confirm(0);continue;}const h=w.heroes[0],r=Math.hypot(h.x,h.y)||1,radial=(450-r)/170;w.advance(1/60,[policy==='circle'?{x:-h.y/r+h.x/r*radial,y:h.x/r+h.y/r*radial}:w.aiInput(h),{}]);}
 const result={policy,role,seed,result:w.mode,hits,loss:Math.round(loss),time:Math.round(w.time),kills:w.kills};results.push(result);console.log(result);
 if(policy==='circle')assert.ok(hits>0,'Repetitive circling must not be damage-free');else assert.equal(w.mode,'complete','Responsive play remains viable');
}
fs.mkdirSync('output/coop-verification/pressure',{recursive:true});fs.writeFileSync('output/coop-verification/pressure/simulations.json',JSON.stringify(results,null,2));
