import test from 'node:test';
import assert from 'node:assert/strict';
import {ACTIVE,ATTRIBUTES,CORES,FORMS,PASSIVES,skillPool,evolutionStatus,attributePool,applyReward} from '../src/coop/builds.js';
import {ROUTES,BRANCHES} from '../src/coop/progression-data.js';
import {AWAKENINGS,awakeningAvailable} from '../src/coop/universal-data.js';
import {EQUIPMENT_APPEARANCES,EQUIPMENT_AFFIXES,EQUIPMENT_RARITIES,equipmentPrice,rollEquipment} from '../src/coop/equipment-data.js';
import {ENEMIES} from '../src/coop/enemies.js';
import {RARITIES,AFFIXES} from '../src/coop/encounters.js';
import {BOSS_SKILLS,bossPhase} from '../src/coop/boss.js';
import {HERO_ROLES,createHero} from '../src/coop/recruitment.js';
import {applyEquipment} from '../src/coop/equipment.js';
import {lootRoll} from '../src/coop/loot.js';
import {World} from '../src/coop/model.js';

const live={ACTIVE,ATTRIBUTES,CORES,FORMS,PASSIVES,ROUTES,BRANCHES,AWAKENINGS,EQUIPMENT_APPEARANCES,EQUIPMENT_AFFIXES,EQUIPMENT_RARITIES,ENEMIES,RARITIES,AFFIXES,HERO_ROLES};
const before=structuredClone(live);
const {CODEX_CATEGORIES,CODEX_ENTRIES,findCodexEntry,filterCodexEntries}=await import('../src/coop/codex-data.js');
const text=entry=>entry.sections.flatMap(section=>section.lines).join('\n');
const count=kind=>CODEX_ENTRIES.filter(entry=>entry.kind===kind).length;

test('catalogue has valid stable unique IDs and nonempty searchable player copy',()=>{
 assert.equal(new Set(CODEX_ENTRIES.map(entry=>entry.id)).size,CODEX_ENTRIES.length);
 assert.deepEqual(CODEX_CATEGORIES.map(category=>category.id),['skills','equipment','monsters']);
 for(const entry of CODEX_ENTRIES){
  assert.ok(CODEX_CATEGORIES.some(category=>category.id===entry.category));
  assert.ok(['all',...Object.keys(HERO_ROLES)].includes(entry.role));
  assert.ok(entry.name&&entry.summary&&entry.kind&&entry.sections.length,entry.id);
  assert.ok(entry.tags.every(tag=>typeof tag==='string'&&tag.length));
  assert.ok(entry.sections.every(section=>section.title&&section.lines.length&&section.lines.every(line=>typeof line==='string'&&line.length)),entry.id);
  assert.ok(['hero','icon','equipment','enemy'].includes(entry.art.type));
  assert.equal(findCodexEntry(entry.id),entry);
 }
 assert.equal(findCodexEntry('missing'),null);
});

test('live roles, skills, cores and every currently selectable form and evolution are covered',()=>{
 assert.equal(count('role'),Object.keys(HERO_ROLES).length);
 assert.equal(count('active'),Object.values(ACTIVE).flat().length);
 for(const [role,actives] of Object.entries(ACTIVE))actives.forEach((active,slot)=>assert.equal(findCodexEntry(`active:${role}:${slot}`).name,active.title));
 for(const [key,core] of Object.entries(CORES))assert.equal(findCodexEntry(`core:${key}`).summary,core.desc);
 assert.equal(count('core'),Object.keys(CORES).length);
 for(const [key,form] of Object.entries(FORMS))assert.equal(findCodexEntry(`form:${key}`).summary,form.desc);
 assert.equal(count('form'),Object.keys(FORMS).length);
 assert.equal(count('evolution'),Object.values(ROUTES).flatMap(route=>route.branches).length);
 for(const route of Object.values(ROUTES))for(const branch of route.branches){
  const entry=findCodexEntry(`evolution:${branch}`);
  assert.equal(entry.summary,BRANCHES[branch].desc);
  assert.match(text(entry),/III/);
  assert.match(text(entry),/不是进化门槛/);
  for(const keys of route.recipes)for(const key of keys)assert.ok(entry.relatedIds.includes(`passive:${key}`),`${branch} -> ${key}`);
 }
 assert.match(text(findCodexEntry('form:coldfield')),/没有可抽取/);
 assert.ok(!CODEX_ENTRIES.some(entry=>entry.kind==='rune'),'unoffered legacy runes must not masquerade as available rewards');
});

test('all passives, awakenings and attributes use the live effect descriptions',()=>{
 for(const [key,passive] of Object.entries(PASSIVES)){
  const ids=key==='volley'?['passive:volley:mage','passive:volley:archer']:[`passive:${key}`];
  for(const id of ids)assert.equal(findCodexEntry(id).summary,passive.desc);
 }
 assert.equal(count('passive'),Object.keys(PASSIVES).length+1);
 for(const [key,awakening] of Object.entries(AWAKENINGS)){
  const entry=findCodexEntry(`awakening:${key}`);
  assert.equal(entry.summary,awakening.desc);
  assert.match(text(entry),/第 19 次清波/);
  assert.match(text(entry),/至少一件达到 II/);
 }
 assert.equal(count('awakening'),Object.keys(AWAKENINGS).length);
 for(const attribute of ATTRIBUTES)assert.equal(findCodexEntry(`attribute:${attribute.key}`).summary,attribute.desc);
 assert.equal(count('attribute'),ATTRIBUTES.length);
});

test('all equipment appearance and affix definitions are covered without assigning fixed quality to a skin',()=>{
 const appearances=Object.values(EQUIPMENT_APPEARANCES).flatMap(slots=>Object.values(slots).flat());
 assert.equal(count('weapon')+count('armor'),appearances.length);
 for(const [role,slots] of Object.entries(EQUIPMENT_APPEARANCES))for(const [slot,skins] of Object.entries(slots))for(const skin of skins){
  const entry=findCodexEntry(`equipment:${skin.key}`);
  assert.equal(entry.name,skin.name);assert.equal(entry.role,role);assert.equal(entry.kind,slot);assert.equal(entry.art.style,skin.key);
  assert.match(text(entry),/品质不固定|外观不固定/);
  assert.match(text(entry),/随机一项/);
 }
 for(const [key,affix] of Object.entries(EQUIPMENT_AFFIXES))assert.equal(findCodexEntry(`affix:${key}`).summary,affix.desc);
 assert.equal(count('affix'),Object.keys(EQUIPMENT_AFFIXES).length);
 for(const [rank,rarity] of EQUIPMENT_RARITIES.entries())if(rarity){
  const copy=text(findCodexEntry(`equipment-rarity:${rank}`));
  assert.ok(copy.includes(`第 5 关商店基础售价：${equipmentPrice(rank,5)} 金币`));
  assert.ok(copy.includes(`第 10 关商店基础售价：${equipmentPrice(rank,10)} 金币`));
 }
});

test('all 13 enemies, Boss skills, rarity and traits are documented with base-stat boundaries',()=>{
 assert.equal(count('enemy'),Object.keys(ENEMIES).length);
 for(const [key,enemy] of Object.entries(ENEMIES)){
  const entry=findCodexEntry(`enemy:${key}`);assert.equal(entry.name,enemy.name);assert.equal(entry.art.kind,key);
  assert.ok(text(entry).includes(`生命 ${enemy.hp}`));assert.match(text(entry),/第 1 波普通个体/);
 }
 const boss=text(findCodexEntry('boss:thornking'));
 for(const skill of Object.values(BOSS_SKILLS))assert.ok(boss.includes(skill));
 assert.equal(bossPhase({hp:65,maxHp:100}),2);assert.equal(bossPhase({hp:30,maxHp:100}),3);
 assert.match(boss,/65%/);assert.match(boss,/30%/);
 assert.equal(count('enemy-rarity'),RARITIES.length);
 assert.equal(count('trait'),Object.keys(AFFIXES).length);
 for(const [key,name] of Object.entries(AFFIXES))assert.equal(findCodexEntry(`trait:${key}`).name,name);
});

test('recipe links and source prerequisites resolve, including mutual exclusions',()=>{
 for(const entry of CODEX_ENTRIES)for(const id of entry.relatedIds){assert.ok(findCodexEntry(id),`${entry.id} -> ${id}`);assert.notEqual(id,entry.id);}
 assert.match(text(findCodexEntry('passive:refractLens')),/与回旋弹芯互斥/);
 assert.match(text(findCodexEntry('passive:returnCore')),/与折射镜片互斥/);
 assert.ok(findCodexEntry('passive:refractLens').relatedIds.includes('passive:needleMagazine'));
 assert.ok(findCodexEntry('passive:shieldBrood').relatedIds.includes('affix:spellWard'));
 assert.match(text(findCodexEntry('passive:healingWave')),/单靠捡药瓶不会进入候选/);
 assert.match(text(findCodexEntry('passive:mixedFuse')),/至少两种本人异常/);
 assert.match(text(findCodexEntry('passive:duetMeter')),/Q、E 都已习得/);
});

test('category, role, kind and multiword search combine without leaking role-restricted entries',()=>{
 assert.equal(filterCodexEntries().length,CODEX_ENTRIES.length);
 assert.equal(filterCodexEntries({category:'missing'}).length,0);
 assert.ok(filterCodexEntries({category:'skills',role:'warrior'}).every(entry=>entry.role==='warrior'||entry.role==='all'));
 assert.ok(!filterCodexEntries({category:'skills',role:'warrior'}).some(entry=>entry.name==='分裂弹'));
 assert.equal(filterCodexEntries({category:'skills',role:'mage',query:'分裂弹'}).filter(entry=>entry.name==='分裂弹').length,1);
 assert.equal(filterCodexEntries({category:'equipment',role:'archer',kind:'armor'}).length,EQUIPMENT_APPEARANCES.archer.armor.length);
 assert.ok(filterCodexEntries({category:'skills',role:'warrior',query:'护盾 全职业'}).some(entry=>entry.id==='passive:guard'));
 assert.ok(filterCodexEntries({query:'  荆冠  五种技能 '}).some(entry=>entry.id==='boss:thornking'));
 assert.ok(filterCodexEntries({query:'ＳＨＡＤＯＷＶＯＬＬＥＹ'}).some(entry=>entry.id==='form:shadowvolley'));
 assert.ok(filterCodexEntries({query:'不存在的图鉴条目'}).length===0);
});

test('catalogue construction and reads never mutate live gameplay definitions',()=>{
 assert.deepEqual(live,before);
 const first=CODEX_ENTRIES[0];assert.ok(Object.isFrozen(CODEX_ENTRIES)&&Object.isFrozen(first)&&Object.isFrozen(first.sections[0].lines));
 assert.throws(()=>first.sections[0].lines.push('mutation'),TypeError);
 const result=filterCodexEntries();result.pop();
 assert.equal(filterCodexEntries().length,CODEX_ENTRIES.length);
 assert.deepEqual(live,before);
});

test('every displayed evolution recipe works through the real gate, with no core required',()=>{
 for(const route of Object.values(ROUTES))for(const recipe of route.recipes){
  const h=createHero(route.role,0);h.skills[route.slot]=3;if(route.form)h.forms[route.slot]=route.form;
  h.passives=Object.fromEntries(recipe.map(key=>[key,1]));
  assert.equal(evolutionStatus(h,route.slot).ready,false,'both rank I are insufficient');
  for(const key of recipe){
   h.passives[key]=2;assert.equal(h.core,null);assert.equal(evolutionStatus(h,route.slot).ready,true);
   const pool=skillPool(h,{clears:19});for(const branch of route.branches)assert.ok(pool.some(card=>card.key===`evolve:${route.slot}:${branch}`));
   const chosen=structuredClone(h);assert.ok(applyReward(chosen,`evolve:${route.slot}:${route.branches[0]}`).ok);
   assert.equal(applyReward(chosen,`evolve:${route.slot}:${route.branches[1]}`).ok,false,'a second branch is blocked');
   h.passives[key]=1;
  }
  h.passives[recipe[0]]=2;h.skills[route.slot]=2;assert.equal(evolutionStatus(h,route.slot).ready,false,'active II is insufficient');
 }
 const h=createHero('mage',0);h.skills=[3,3];h.forms[1]='coldfield';
 assert.equal(evolutionStatus(h,1).route,null,'coldfield has no selectable current route');
});

test('awakening recipes read from player copy match live gates, reward timing and exclusivity',()=>{
 const keyByTitle=new Map(Object.entries(PASSIVES).map(([key,definition])=>[definition.title,key]));
 for(const [key] of Object.entries(AWAKENINGS)){
  const copy=findCodexEntry(`awakening:${key}`).sections.find(section=>section.title==='必需配方').lines;
  const recipes=copy.filter(line=>line.includes(' + ')).map(line=>line.split(' + ').map(title=>keyByTitle.get(title)));
  assert.ok(recipes.length&&recipes.every(pair=>pair.length===2&&pair.every(Boolean)),key);
  for(const recipe of recipes){
   const h=createHero('mage',0);h.skills=[1,1];h.core='pyromancer';h.passives=Object.fromEntries(recipe.map(part=>[part,1]));
   assert.equal(awakeningAvailable(h,key),false,`${key}: both rank I`);
   for(const part of recipe){
    h.passives[part]=2;assert.equal(awakeningAvailable(h,key),true,`${key}: ${part} II`);
    assert.ok(!skillPool(h,{clears:18,highReward:true}).some(card=>card.key===`awakening:${key}`));
    assert.ok(!skillPool(h,{clears:19,highReward:false}).some(card=>card.key===`awakening:${key}`));
    assert.ok(skillPool(h,{clears:19,highReward:true}).some(card=>card.key===`awakening:${key}`));
    const chosen=structuredClone(h);assert.ok(applyReward(chosen,`awakening:${key}`).ok);
    assert.ok(Object.keys(AWAKENINGS).every(other=>!awakeningAvailable(chosen,other)));
    h.passives[part]=1;
   }
  }
 }
});

test('documented source requirements use real class, active, crit, anomaly and equipment gates',()=>{
 const available=(h,key)=>skillPool(h,{clears:19}).some(card=>card.key===key);
 const h=createHero('warrior',0);
 assert.ok(!skillPool(h,{clears:2}).some(card=>card.kind==='core'));
 assert.ok(available(h,'core:berserker'));assert.ok(!available(h,'core:bulwark'));
 assert.ok(!available(h,'passive:guard'));assert.ok(!available(h,'passive:blood'));
 h.skills[0]=1;assert.ok(available(h,'core:bulwark'));assert.ok(available(h,'passive:guard'));
 h.passives.momentum=1;assert.ok(available(h,'passive:blood'));
 h.passives.needleMagazine=1;assert.ok(available(h,'passive:refractLens'));assert.ok(available(h,'passive:returnCore'));
 h.passives.returnCore=1;assert.ok(!available(h,'passive:refractLens'));delete h.passives.returnCore;
 h.passives.refractLens=1;assert.ok(!available(h,'passive:returnCore'));
 assert.ok(!available(h,'passive:volley'));assert.ok(!available(h,'passive:afterimage'));
 const mage=createHero('mage',0);assert.ok(available(mage,'passive:volley'));assert.ok(!available(mage,'passive:healingWave'));
 mage.passives.harvest=1;assert.ok(available(mage,'passive:healingWave'));
 mage.passives.ember=1;mage.skills[0]=1;assert.ok(available(mage,'passive:transferNeedle'));assert.ok(!available(mage,'passive:mixedFuse'));
 mage.skills[1]=1;assert.ok(available(mage,'passive:mixedFuse'));assert.ok(available(mage,'passive:duetMeter'));
 mage.skills=[0,0];mage.passives={};const armor=rollEquipment('mage','armor',5,()=>0,'codex-ward');
 assert.ok(armor.affixes.some(affix=>affix.key==='spellWard'));assert.ok(applyEquipment(mage,armor).ok);
 assert.ok(!available(mage,'passive:shieldBrood'));mage.skills[0]=1;assert.ok(available(mage,'passive:shieldBrood'));
 assert.match(text(findCodexEntry('passive:shieldBrood')),/咏唱护壁装备配合主动/);
});

test('finite attribute caps and unbounded training match real rewards rather than a generic limit claim',()=>{
 const h=createHero('warrior',0);for(let i=0;i<100;i++){applyReward(h,'power');applyReward(h,'hp');applyReward(h,'range');}
 assert.ok(attributePool(h).some(card=>card.key==='power'));assert.ok(attributePool(h).some(card=>card.key==='hp'));
 assert.ok(!attributePool(h).some(card=>card.key==='range'));assert.equal(h.rangeBonus,1.5);
 assert.match(text(findCodexEntry('attribute:power')),/没有固定训练次数上限/);
 assert.match(text(findCodexEntry('attribute:hp')),/没有固定训练次数上限/);
 assert.match(text(findCodexEntry('attribute:range')),/达到训练上限/);
});

test('listed equipment rarity prices match actual rolled shop items at all displayed rooms',()=>{
 for(const room of [5,10,15])for(const [roll,rank] of [[.9,1],[.4,2],[.1,3],[0,4]])for(const role of Object.keys(HERO_ROLES))for(const slot of ['weapon','armor']){
  let first=true;const item=rollEquipment(role,slot,room,()=>{if(first){first=false;return roll;}return .5;},`${role}-${slot}-${room}-${rank}`);
  assert.equal(item.rarity,rank);assert.equal(item.affixes.length,rank-1);
  assert.ok(text(findCodexEntry(`equipment-rarity:${rank}`)).includes(`第 ${room} 关商店基础售价：${item.price} 金币`));
 }
});

test('displayed drop percentages and values are the actual independent loot roll boundaries',()=>{
 const types=['xp','gold','potion'];
 for(let rank=0;rank<RARITIES.length;rank++){
  const copy=findCodexEntry(`enemy-rarity:${rank}`).sections.find(section=>section.title==='普通击杀掉落').lines;
  for(const [index,type] of types.entries()){
   const chance=Number(copy[index].match(/：([\d.]+)%/)[1])/100;
   const value=Number(copy[index].match(index===2?/回复 (\d+)/:/概率，(\d+)/)[1]);
   const run=roll=>{let cursor=0;return lootRoll({rarity:rank},()=>cursor++===index?roll:.999999);};
   assert.deepEqual(run(chance-1e-8),[{type,value}],`${rank}:${type}: below boundary`);
   assert.equal(run(chance).length,0,`${rank}:${type}: exact boundary`);
  }
  assert.deepEqual(lootRoll({rarity:rank,summonedBy:99},()=>0),[{type:'xp',value:[1,2,4,7][rank]}]);
 }
 assert.deepEqual(lootRoll({boss:true,kind:'thornking',rarity:0},()=>.999999),[{type:'xp',value:24},{type:'gold',value:10},{type:'potion',value:35}]);
});

test('healer copy matches actual radius, self healing and non-offensive cast',()=>{
 const w=new World(17);w.reset(['warrior'],1);w.obstacles=[];const h=w.heroes[0];h.x=0;h.y=0;
 const shaman=w.createEnemy('shaman',0,0),near=w.createEnemy('goblin',219,0),far=w.createEnemy('goblin',221,0);
 w.enemies=[shaman,near,far];for(const e of w.enemies)e.hp=e.maxHp-30;
 shaman.action={t:.99,windup:1,x:0,y:0,r:110,kind:'healer'};const hp=h.hp;
 w.updateEnemy(shaman,.02);
 assert.equal(shaman.hp,shaman.maxHp-8);assert.equal(near.hp,near.maxHp-8);assert.equal(far.hp,far.maxHp-30);assert.equal(h.hp,hp);
 const copy=text(findCodexEntry('enemy:shaman'));assert.match(copy,/220 距离/);assert.match(copy,/22 生命，包括自己/);assert.match(copy,/治疗本身不会主动攻击玩家/);
});

test('basic fireball copy distinguishes direct damage from 65 percent splash using actual projectile hits',()=>{
 const w=new World(17);w.reset(['mage'],1);w.obstacles=[];const h=w.heroes[0];h.x=0;h.y=0;
 const direct=w.createEnemy('mushroom',100,0),splash=w.createEnemy('mushroom',100,60);w.enemies=[direct,splash];
 w.shoot(h,{x:1,y:0},'fireball',42,390,'skill');w.updateProjectiles(.3);
 assert.equal(direct.maxHp-direct.hp,42);assert.ok(Math.abs((splash.maxHp-splash.hp)-42*.65)<1e-10);
 assert.match(text(findCodexEntry('active:mage:0')),/周围溅射.*65%/);
});

test('familiar player aliases find archer, potion, pets and compact Q skill labels',()=>{
 assert.ok(filterCodexEntries({query:'射手',kind:'role'}).some(entry=>entry.id==='role:archer'));
 assert.ok(filterCodexEntries({query:'血瓶',category:'monsters'}).length>0);
 assert.ok(filterCodexEntries({query:'宠物'}).some(entry=>entry.id==='passive:boneWhistle'));
 assert.ok(filterCodexEntries({query:'Q技能',kind:'active'}).some(entry=>entry.id==='active:mage:0'));
});
