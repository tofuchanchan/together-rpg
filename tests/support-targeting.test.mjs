import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/coop/model.js';

function arena(role='mage'){
 const w=new World(41);w.reset([role],1);w.enemies=[];w.pressure=null;w.spawnQueue=[];w.obstacles=[];
 const h=w.heroes[0];Object.assign(h,{x:0,y:0,crit:0,skills:[1,1],ai:false});
 const foe=(kind,x,y=0)=>{const e=w.createEnemy(kind,x,y);e.cd=99;w.enemies.push(e);return e;};
 return {w,h,foe};
}

test('sparse enemy groups prioritize visible support equally for human and AI automatic aiming',()=>{
 for(const role of ['warrior','mage','archer'])for(const ai of [false,true]){
  const {w,h,foe}=arena(role);h.ai=ai;foe('goblin',150);const support=foe('shaman',190,40);
  assert.equal(w.nearest(h,250),support,`${role} ai=${ai}`);
 }
});

test('support priority retains the actual query range and obstacle visibility',()=>{
 const {w,h,foe}=arena(),near=foe('goblin',150),support=foe('shaman',300,100);
 assert.equal(w.nearest(h,250),near);
 w.obstacles=[{x:150,y:50,r:20}];assert.equal(w.nearest(h,500),near);
 w.obstacles=[];assert.equal(w.nearest(h,500),support);
 assert.equal(w.nearest(h,100),null);
});

test('a support cannot override an immediate threat or a dense living group',()=>{
 const {w,h,foe}=arena(),near=foe('goblin',100),support=foe('shaman',220);
 assert.equal(w.nearest(h,400),near);
 near.x=101;assert.equal(w.nearest(h,400),support);
 for(let i=0;i<7;i++)foe('goblin',350,i*10);
 assert.equal(w.nearest(h,400),near);
 w.enemies.at(-1).hp=0;assert.equal(w.nearest(h,400),support,'dead enemies do not count toward group size');
});

test('personal marks retain priority until the existing 140-unit danger interruption',()=>{
 for(const source of ['core','form']){
  const {w,h,foe}=arena('archer'),near=foe('goblin',160),support=foe('shaman',250,50),marked=foe('goblin',300,-50);
  if(source==='core')h.core='sniper';else h.forms[0]='markedshot';h.huntTarget=marked.id;
  assert.equal(w.nearest(h,400),marked);
  near.x=140;assert.equal(w.nearest(h,400),support,'the mark is interrupted; sparse support priority remains above non-immediate targets');
  near.x=99;assert.equal(w.nearest(h,400),near);
  near.x=160;assert.equal(w.nearest(h,280),support,'out-of-range marks are ignored');
  w.obstacles=[{x:150,y:-25,r:12}];assert.equal(w.nearest(h,400),support,'occluded marks are ignored');
 }
});

test('manual skill buttons use support priority without a hidden bot-only target',()=>{
 const {w,h,foe}=arena();foe('goblin',160,-90);const support=foe('shaman',280,60);
 assert.equal(w.request(h,'skill1',{x:0,y:1}),true);
 const n=Math.hypot(support.x,support.y);
 assert.ok(Math.abs(h.action.dir.x-support.x/n)<1e-10);
 assert.ok(Math.abs(h.action.dir.y-support.y/n)<1e-10);
});

test('support aiming still hits intervening bodies with normal non-piercing projectiles',()=>{
 const {w,h,foe}=arena(),blocker=foe('goblin',160),support=foe('shaman',330);
 const target=w.nearest(h,500);assert.equal(target,support);
 w.shoot(h,{x:1,y:0},'bolt',10,1000);w.updateProjectiles(.4);
 assert.equal(blocker.hp,blocker.maxHp-10);assert.equal(support.hp,support.maxHp);assert.equal(w.projectiles.length,0);
});
