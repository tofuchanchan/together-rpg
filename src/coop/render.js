import {drawAdventureActor,drawAdventureSprite,drawAdventureWarning,drawAdventureEffect} from './adventure-art.js';
import {drawRoute,drawRouteReward,drawObjectiveHUD} from './adventure-view.js';
import {MOSSBELL_SKILLS,MOSSBELL_SIZE,MOSSBELL_BODY_RADIUS} from './mossbell.js';
import {drawBonusCreature} from './shop-event-art.js';
import {drawEquipmentEffect,drawEquipmentObject} from './equipment-effects.js';
import {createHero} from './recruitment.js';
import {drawShop,handleShopInput} from './shop-view.js';
import {ROLES,clamp,MAP,MAP_SCALE} from './model.js';
import {equippedSkills,advanceInfo,pairFor,SKILL_PAIRS} from './skill-pairs.js';
import {ACTIVE,PASSIVES,CORES,RUNES,skillName,formInfo,evolutionText,evolutionStatus} from './builds.js';
import {drawBuildEffect,drawBuildProjectile,drawBuildIcon} from './build-art.js';
import {drawPet,drawPickup,drawSwarm,drawUniversalIcon,drawUniversalObject,drawUniversalEffect} from './universal-art.js';
import {AWAKENINGS,universalSources} from './universal-data.js';
import {enemyDef} from './enemies.js';
import {RARITIES,AFFIXES,waveNumber} from './encounters.js';
import {BOSS_SKILLS} from './boss.js';
import {actionLayout} from './effect-layout.js';
import {hero} from './sprites.js';
import {drawHeroPortrait} from './portraits.js';
import {text,heading,uiFont,ellipse,CREAM,CYAN,ORANGE} from './art.js';
import {drawArt,drawContent,skin} from './world-assets.js';
import {enemy,rock,makeGround,bar,icon,actorShadow,playerRing,warning,effect,projectile,heroAction,SCENE_PROPS,sceneProp} from './world-art.js';
const W=1440,H=810,colors=[CYAN,ORANGE,'#e1d7aa'];
const variant=color=>color===CYAN?'cyan':color===ORANGE?'orange':'neutral';
const tagNames={melee:'近战',shield:'护盾',counter:'反击',bleed:'流血',area:'范围',spell:'法术',frost:'寒意',pierce:'贯穿',projectile:'箭矢',mark:'猎印',shadow:'残影',dodge:'闪避'};
const baseAction=h=>!(h.action?.type==='bash'&&h.forms?.[0]==='aegis'||h.action?.type==='spin'&&h.forms?.[1]==='bloodspin');

export class View{
 constructor(canvas,world,router,actions){this.c=canvas.getContext('2d');this.world=world;this.router=router;this.actions=actions;this.ground=makeGround();this.regions=[];this.roles=['warrior','mage'];this.humanCount=2;this.showDebug=false;this.animTime=0;this.displayPoses=new Map();}
 button(label,x,y,w,h,action,color=CYAN,disabled=false,id=null){const size=h<32?14:h<42?16:18;skin(this.c,`button-${disabled?'disabled':variant(color)}`,x,y,w,h);text(this.c,this.fit(label,w-22,size,700),x+w/2,y+h/2,size,CREAM,'center',700);if(!disabled){const region={x,y,w,h,action,label,id};this.regions.push(region);if(id)this.navRegions.push(region);}}
 navigationSnapshot(){return {screen:this.world.mode,focusId:this.navFocus||null,items:(this.navRegions||[]).map(({id,label})=>({id,label})),controllerActive:!!this.navActive};}
 drawNavigation(){
  const screen=this.router.awaiting!==null?'binding':this.world.mode;if(this.navScreen!==screen){this.navScreen=screen;this.navFocus=screen==='paused'?'pause-resume':screen==='menu'?'setup-single':'result-proceed';}
  if(!this.navRegions.some(r=>r.id===this.navFocus))this.navFocus=this.navRegions[0]?.id||null;
  if(!this.navActive)return;const r=this.navRegions.find(r=>r.id===this.navFocus);if(!r)return;
  const c=this.c;c.save();c.strokeStyle='#ffe79a';c.lineWidth=3;c.shadowColor='#162c24';c.shadowBlur=5;c.beginPath();c.roundRect(r.x-5,r.y-5,r.w+10,r.h+10,10);c.stroke();c.restore();
 }
 menuInput(input){
  this.navActive=true;this.draw();if(input.cancel){if(this.router.awaiting!==null)this.router.awaiting=null;else if(this.world.mode==='menu')this.actions.title();else if(this.world.mode==='paused')this.actions.pause();else this.actions.menu();this.router.flush();return;}
  const count=this.navRegions.length;if(!count)return;
  if(input.up||input.left||input.down||input.right){const at=this.navRegions.findIndex(r=>r.id===this.navFocus),dir=input.up||input.left?-1:1;this.navFocus=this.navRegions[(at+dir+count)%count].id;return;}
  if(input.confirm){this.navRegions.find(r=>r.id===this.navFocus)?.action();this.router.flush();}
 }
 shopInput(slot,input){handleShopInput(this,slot,input);}
 click(x,y){const b=[...this.regions].reverse().find(r=>x>=r.x&&y>=r.y&&x<=r.x+r.w&&y<=r.y+r.h);if(b)b.action();}
 cycleRole(slot){const keys=Object.keys(ROLES);let i=keys.indexOf(this.roles[slot]);i=(i+1)%3;this.roles[slot]=keys[i];}
 draw(dt=0){
  if(this.beforeDraw&&!this.beforeDraw())return;
  this.animTime+=dt;const output=this.c,w=this.world;let c=output;output.setTransform(this.renderScaleX||1,0,0,this.renderScaleY||1,0,0);this.regions=[];this.navRegions=[];
  // Combat atlases contain no extra high-DPI detail. Render that layer at the
  // original budget; portraits, nameplates, bars and menus still paint at full DPR.
  const buffered=(this.renderScaleX||1)>1;
  if(buffered){if(!this.sceneCanvas){this.sceneCanvas=document.createElement('canvas');this.sceneCanvas.width=W;this.sceneCanvas.height=H;}c=this.sceneCanvas.getContext('2d');c.setTransform(1,0,0,1,0,0);}
  c.clearRect(0,0,W,H);c.fillStyle='#173f34';c.fillRect(0,0,W,H);
  c.save();let sx=0,sy=0;if(w.options.shake&&w.options.feedback&&w.shake>0){sx=Math.sin(w.time*93)*w.shake*17;sy=Math.cos(w.time*109)*w.shake*12;}
  c.translate(720+sx-w.camera.x*w.camera.zoom,369+sy-w.camera.y*.707*w.camera.zoom);c.scale(w.camera.zoom,w.camera.zoom);c.drawImage(this.ground,-800*MAP_SCALE,-550*MAP_SCALE,1600*MAP_SCALE,1100*MAP_SCALE);
  for(const f of w.skillFields||[]){if(f.kind==='wave'&&f.age<f.next)continue;if(['wave','rain','orbit','ice','fire','scar'].includes(f.kind))drawBuildEffect(c,{type:'build',variant:'pair-'+f.kind,x:f.x,y:f.y,r:f.kind==='wave'?f.r*Math.min(1,(f.age-f.next)/Math.max(.08,Math.min(.4,f.life+f.age-f.next))):f.r,life:f.life,max:f.life+f.age,isField:true,untilPulse:f.next-f.age});}
  for(const f of w.hazards){if(f.type==='coldfield'){const owner=w.heroes[f.owner];if(f.life>0&&owner&&!owner.down)drawBuildEffect(c,{...f,type:'build',variant:'icefield',max:f.max||(owner.evolved[1]?5:3.6)});continue;}drawArt(c,f.type==='poison'?'frost-2':'blast-2',f.x,f.y*.707,f.r*2,f.r*1.414,{alpha:.55,filter:f.type==='poison'?'hue-rotate(230deg) saturate(1.5)':undefined});}
  // Persistent art reads combat state, never a second independent FX timer.
  for(const h of w.heroes)if(!h.down&&h.action?.form==='aegis'&&h.guardUntil>w.time)drawBuildEffect(c,{type:'build',variant:'aegis',x:h.x,y:h.y,r:105,dir:h.guardDir||h.action.dir,life:h.guardUntil-w.time,max:h.action.activeEnd-h.action.windup});
  if(w.options.feedback){for(const f of w.effects)if(f.type!=='number'&&f.layer!=='depth'){if(!drawAdventureEffect(c,f)&&!drawEquipmentEffect(c,f)&&!drawUniversalEffect(c,f)&&!drawBuildEffect(c,f)&&f.type!=='build')effect(c,f);}for(const h of w.heroes)if(baseAction(h)&&actionLayout(h)?.layer==='ground')heroAction(c,h);}
  for(const p of w.pickups)drawPickup(c,p,w.time);
  for(const o of w.universalObjects||[])if(!['needle','wheel','thornBolt','orbit','magnetStar'].includes(o.kind))drawUniversalObject(c,o,w.time);
  for(const e of w.enemies)if(e.action&&(!e.action.hit||(e.action.from&&e.action.t<e.action.windup+e.action.travelTime))&&!e.boss)warning(c,e.action);for(const a of w.bossWarnings)if(!a.hit&&!drawAdventureWarning(c,a))warning(c,a);
  for(const o of w.equipmentObjects||[])if(o.kind==='snare')drawEquipmentObject(c,o,w.time);
  const actors=[...(w.objective?.beacon?[{...w.objective.beacon,adventureProp:'beacon'}]:[]),...(w.objective?.nests||[]).filter(n=>n.hp<=0).map(n=>({...n,adventureProp:'nest'})),...(w.equipmentObjects||[]).filter(o=>o.kind!=='snare').map(o=>({...o,equipmentActor:true})),...(w.pets||[]).map(p=>({...p,petActor:true})),...(w.universalObjects||[]).filter(o=>['needle','wheel','thornBolt','orbit','magnetStar'].includes(o.kind)).map(o=>({...o,universalActor:true})),...SCENE_PROPS.map(p=>({...p,x:p.x*MAP_SCALE,y:p.y*MAP_SCALE,prop:true})),...w.obstacles.map(o=>({...o,obstacle:true})),...w.enemies,...w.heroes,...w.heroes.filter(h=>h.shadow?.life>0).map(h=>({...h,...h.shadow,shadowActor:true,action:null,invuln:0,hitFlash:0,hitReaction:null,move:{x:0,y:0}})),...w.projectiles.map(p=>({...p,projectile:true})),...(w.options.feedback?w.effects.filter(f=>f.layer==='depth').map(f=>({...f,depthEffect:true})):[]),...(w.options.feedback?w.heroes.filter(h=>actionLayout(h)?.layer==='depth').map(h=>({...actionLayout(h),actionHero:h})):[])].sort((a,b)=>(a.depthY??a.y)-(b.depthY??b.y));
  for(const h of actors){
   if(h.equipmentActor){drawEquipmentObject(c,h,w.time);continue;}if(h.petActor){drawPet(c,h,w.time);continue;}if(h.universalActor){drawUniversalObject(c,h,w.time);continue;}
   if(h.depthEffect){if(h.type==='adventure-death'){drawAdventureSprite(c,'mossbell',15,h.x,h.y*.707,MOSSBELL_SIZE,Math.min(1,h.life));continue;}if(!drawEquipmentEffect(c,h)&&!drawBuildEffect(c,h)&&h.type!=='build')effect(c,h);continue;}
   if(h.adventureProp){drawAdventureSprite(c,h.adventureProp,h.hp<=0?3:h.hp<h.maxHp*.4?2:Math.floor(w.time*2)%2,h.x,h.y*.707,h.adventureProp==='beacon'?145:92);continue;}
   if(h.prop){sceneProp(c,h);continue;}
   if(h.projectile){if(!drawBuildProjectile(c,h,w.time))projectile(c,h,w.time);continue;}if(h.actionHero){if(baseAction(h.actionHero))heroAction(c,h.actionHero);continue;}
   if(h.shadowActor){c.save();c.translate(h.x,h.y*.707);c.globalAlpha=.37*Math.min(1,h.life*2);c.filter='sepia(1) saturate(3) hue-rotate(220deg)';hero(c,h,w.time);c.restore();continue;}
   c.save();c.translate(h.x,h.y*.707);if(h.obstacle){rock(c,0,0,h.r);c.restore();continue;}
   const allied=h.role!==undefined;actorShadow(c,0,1,allied?28:h.kind==='mossbell'?MOSSBELL_BODY_RADIUS*1.18:h.boss?65:h.kind==='mushroom'?42:27);
   if(allied){
    const col=colors[h.id],a=h.action;playerRing(c,0,0,33,h.id);
    if(a?.type==='dodge'&&w.options.feedback){for(let i=3;i>0;i--){c.save();c.globalAlpha=(4-i)*.055;c.translate(-a.dir.x*i*17,-a.dir.y*i*12);hero(c,h,w.time);c.restore();}}
    let drawH=h;if(h.visualStop>0&&w.options.feedback&&this.displayPoses.has(h.id)){const cached=h.hitPose||this.displayPoses.get(h.id);drawH={...h,action:cached.action,stride:h.stride};}else this.displayPoses.set(h.id,{action:h.action?{...h.action}:null,stride:h.stride});
    hero(c,drawH,w.time);
   }else{
    // A larger foreground Boss must not completely hide a human behind it.
    if(h.kind==='mossbell'&&w.heroes.slice(0,w.humanCount).some(p=>p.y<h.y&&Math.abs(p.x-h.x)<MOSSBELL_SIZE*.34&&(h.y-p.y)*.707<MOSSBELL_SIZE-35))c.globalAlpha*=.48;
    if(!drawAdventureActor(c,h,w.time)&&!drawBonusCreature(c,h)&&!drawSwarm(c,h,w.time))enemy(c,h,w.time);
   }
   c.restore();
  }
  if(buffered){c.restore();c=output;c.drawImage(this.sceneCanvas,0,0,W,H);c.save();c.translate(720+sx-w.camera.x*w.camera.zoom,369+sy-w.camera.y*.707*w.camera.zoom);c.scale(w.camera.zoom,w.camera.zoom);}
  // Nameplates and health bars are a separate high-DPI overlay, never occluded by foreground effects.
  const statusTargets=new Set(w.heroes.filter(h=>!h.down).flatMap(h=>[w.nearest(h,520)?.id,h.huntTarget]).filter(id=>id!==undefined&&id!==null));
  for(const h of [...w.enemies,...w.heroes]){c.save();c.translate(h.x,h.y*.707);if(h.role){const col=colors[h.id],top=h.role==='mage'?-126:-116;skin(c,`button-${h.ai?'neutral':variant(col)}`,-18,top-29,36,25);text(c,h.ai?'AI':`P${h.id+1}`,0,top-16,13,CREAM,'center');bar(c,-28,top,56,10,h.hp/h.maxHp,h.down?'#eea467':'#9edb7b');if(h.down){text(c,'靠近救援',0,24,13,CREAM,'center');bar(c,-31,36,62,10,h.revive/2,'#efd276');}}else if(h.bonusKind){if(h.bonusKind==='gold')text(c,'命中掉金',0,-82,12,'#ffdb78','center');}else{if(!h.boss&&(h.hp<h.maxHp||h.rarity))bar(c,-25,-enemyDef(h).size-16,50,9,h.hp/h.maxHp,'#e58a6d');if(h.rarity){text(c,`${RARITIES[h.rarity].name} · ${h.affixes.map(a=>AFFIXES[a]).join(' / ')}`,0,-enemyDef(h).size-31,12,RARITIES[h.rarity].color,'center');}if(h.objectivePart){text(c,`${['近战巢','疾行巢','冲刺巢'][h.nestIndex]}${statusTargets.has(h.id)?' · 已锁定':''}`,0,-112,13,'#ffe0a0','center');bar(c,-35,-98,70,7,h.hp/h.maxHp,'#e58a6d');}this.enemyBuildStatus(h,statusTargets.has(h.id)||h.boss);}c.restore();}
  if(w.options.feedback)for(const f of w.effects){
   if(f.type==='number'){c.save();c.globalAlpha=Math.min(1,f.life*3);c.shadowColor='#253323';c.shadowBlur=2;text(c,f.text,f.x,f.y*.707-(f.height||107)-(1-f.life/f.max)*28,20,f.color,'center',900);c.restore();}
  }
  if(this.showDebug){for(const h of w.heroes){ellipse(c,h.x,h.y*.707,17,12,'#00000000','#afffea',1);text(c,`${h.face} / ${h.action?.type||'idle'}`,h.x,h.y*.707+40,11,'#e4f7da','center');}for(const e of w.enemies)if(e.action)ellipse(c,e.action.x,e.action.y*.707,e.action.r,e.action.r*.707,'#00000000','#ff577e',2);}
  c.restore();if(w.mode!=='menu')this.hud();if(w.mode==='menu')this.menu();if(w.mode==='upgrade')this.upgrade();if(w.mode==='shop')drawShop(this);if(w.mode==='route')drawRoute(this);if(w.mode==='routeReward')drawRouteReward(this);if(['paused','complete','defeat','victory'].includes(w.mode))this.modal();this.drawNavigation();
 }
 enemyBuildStatus(e,showBrittle){
  if(e.hp<=0)return;const c=this.c,w=this.world,ownerName=h=>h.ai?'AI':`P${h.id+1}`;
  const marks=Object.entries(e.huntMarks||{}).map(([id,mark])=>({owner:w.heroes[Number(id)],mark})).filter(({owner,mark})=>owner&&!owner.down&&mark.stacks>0&&w.time-mark.last<=4);
  let y=-enemyDef(e).size-(e.rarity?54:34);
  for(let i=0;i<marks.length;i++){const {owner,mark}=marks[i],x=(i-(marks.length-1)/2)*66;skin(c,'button-neutral',x-32,y-10,64,20);drawBuildIcon(c,'huntmark',x-20,y,16);text(c,`${ownerName(owner)} ${mark.stacks}`,x-7,y,11,colors[owner.id]||CREAM);}
  if(marks.length)y-=23;
  if(showBrittle){const active=Object.entries(e.chillBy||{}).map(([id,s])=>({owner:w.heroes[Number(id)],remaining:s.brittleUntil-w.time})).filter(s=>s.owner&&!s.owner.down&&s.remaining>0).sort((a,b)=>b.remaining-a.remaining);
   if(active.length){const s=active[0];skin(c,'button-neutral',-65,y-10,130,20);drawBuildIcon(c,'brittle',-52,y,17);text(c,`${ownerName(s.owner)} 脆弱 ${s.remaining.toFixed(1)}s`,-38,y,11,'#a8e4ff');}
  }
 }
 hud(){const c=this.c,w=this.world;
  w.heroes.filter(h=>h.ai).forEach((ai,index)=>{const x=23+index*218;skin(c,'panel-neutral',x,18,215,73);drawArt(c,'portrait-frame',x+39,56,60);c.save();c.translate(x+38,80);hero(c,{...ai,action:null,face:1,move:{x:0,y:0},gait:0,down:false,hitFlash:0,hitReaction:null,invuln:0},0,.45);c.restore();text(c,`${ai.name} · ${ROLES[ai.role].name}`,x+73,42,16);bar(c,x+73,59,116,13,ai.hp/ai.maxHp);});
  const bossHUD=w.mode==='play'&&!w.bonusEvent&&w.enemies.some(e=>e.boss);
  if(!bossHUD){skin(c,'panel-neutral',572,17,286,65);text(c,`林间遗迹  ${String(w.room).padStart(2,'0')}`,715,40,20,CREAM,'center',700);text(c,w.bonusEvent?`限时奖励 · ${w.enemies.length} 只` : w.bossRoom?`首领战 · ${w.enemies.length} 敌人`:`第 ${w.wave}/2 波 · ${w.enemies.length} 敌人 · 入场 ${w.waveSpawned}`,715,63,14,'#d1dcc0','center');}
  this.iconButton('pause',bossHUD?1025:865,23,40,40,()=>this.actions.pause());this.iconButton(w.options.sound?'sound':'muted',bossHUD?1080:920,23,40,40,()=>{w.options.sound=!w.options.sound;});
  skin(c,'panel-neutral',1230,18,186,125);c.save();c.beginPath();c.roundRect(1247,35,152,89,7);c.clip();c.globalAlpha=.7;c.drawImage(this.ground,1247,35,152,89);c.globalAlpha=1;
  for(const e of w.enemies)ellipse(c,1323+e.x*.118/MAP_SCALE,79+e.y*.1/MAP_SCALE,3,3,e.bonusKind==='xp'?'#80e6ff':e.bonusKind==='gold'?'#ffcf66':'#ee9472',null);for(const h of w.heroes)ellipse(c,1323+h.x*.118/MAP_SCALE,79+h.y*.1/MAP_SCALE,4,4,colors[h.id],null);c.restore();
  if(w.mode==='play'&&w.bonusEvent?.kind==='gold'&&w.bonusEvent.phase==='active'){
   const markers=[];
   for(const e of w.enemies){const px=720+(e.x-w.camera.x)*w.camera.zoom,py=369+(e.y-w.camera.y)*.707*w.camera.zoom;
    if(px>=62&&px<=1190&&py>=190&&py<=607)continue;
    const dx=px-720,dy=py-380,factor=Math.min(1,dx>0?470/dx:dx<0?-658/dx:1,dy>0?227/dy:dy<0?-190/dy:1),x=720+dx*factor,y=380+dy*factor,near=markers.find(m=>Math.hypot(m.x-x,m.y-y)<58);
    if(near)near.count++;else markers.push({x,y,angle:Math.atan2(dy,dx),e,count:1});
   }
   for(const m of markers){c.save();c.translate(m.x,m.y);skin(c,'button-neutral',-24,-23,48,46);c.save();c.translate(0,4);drawBonusCreature(c,{...m.e,face:0,stats:{...m.e.stats,size:24}});c.restore();if(m.count>1)text(c,`×${m.count}`,24,-16,12,'#ffda75','center',700);c.translate(0,13);c.rotate(m.angle);c.beginPath();c.moveTo(7,0);c.lineTo(-4,-5);c.lineTo(-4,5);c.closePath();c.fillStyle='#ffda75';c.fill();c.restore();}
  }
  text(c,`击败 ${w.kills}`,1209,40,16,CREAM,'right');text(c,`金币各自持有 · 商店 ${Math.ceil(w.room/5)*5}关`,1209,64,14,'#f3d58b','right');
  for(let i=0;i<w.humanCount;i++)this.playerHUD(i,w.humanCount===1?422:i===0?24:820);bar(c,476,783,488,23,w.xp/w.xpNext,'#f1c864');c.save();c.beginPath();c.roundRect(604,785,232,19,5);c.fillStyle='#102d24db';c.fill();text(c,`小队 Lv.${w.level}  ·  ${w.xp} / ${w.xpNext}`,720,795,14,'#fff4cf','center',700);c.restore();
  if(w.mode==='play'&&w.bonusEvent){const b=w.bonusEvent,col=b.kind==='xp'?'#8ee5ff':'#ffdb78';skin(c,'panel-gold',455,89,530,75);text(c,`${b.phase==='collect'?'拾取奖励':b.name}  ·  ${Math.ceil(b.remaining)} 秒`,720,110,22,col,'center',700);text(c,b.phase==='collect'?'奖励怪已离场 · 走近拾取地面战利品':b.kind==='xp'?`不断补充的无害虫潮 · 击败 ${b.killed} 只 · 必掉经验`:`追上逃跑的钱袋 · 每次命中掉金 · 已掉落 ${b.goldDropped} 金`,720,137,14,CREAM,'center');bar(c,478,152,484,5,b.remaining/(b.phase==='collect'?6:b.duration),col);}
  if(w.mode==='play'&&!w.bonusEvent){if(!w.bossRoom&&(!w.objective||w.objective.kind==='clear'||w.objective.phase==='cleanup'))text(c,w.enraged?'狂暴 · 小怪移速 +35% / 伤害 +30% / 冷却恢复 +40%':`狂暴倒计时 ${Math.max(0,Math.ceil(w.enrageAt-w.waveElapsed))} 秒`,720,158,14,w.enraged?'#ff986e':'#c9d5b4','center');const boss=w.enemies.find(e=>e.boss);if(boss){skin(c,'panel-gold',427,17,586,65);text(c,`${boss.kind==='mossbell'?'苔钟守卫':'荆冠古王'} · 阶段 ${boss.phase}/3  ${boss.action?(boss.kind==='mossbell'?MOSSBELL_SKILLS:BOSS_SKILLS)[boss.action.kind]:''}`,720,34,18,CREAM,'center');bar(c,447,53,546,12,boss.hp/boss.maxHp,'#e58a6d');if(boss.kind==='mossbell'){bar(c,447,70,390,5,(boss.stagger||0)/100,'#f1c864');text(c,boss.staggerUntil>w.time?'钟芯暴露 +25%':'失衡',848,73,12,'#f4dfa5');}}else if(!drawObjectiveHUD(this)){const remaining=Math.max(0,Math.ceil(w.waveDuration-w.waveElapsed));text(c,remaining&&!w.pressureClosed?`${w.eliteChallenge?'精英挑战 · ':''}持续增援 ${remaining} 秒 · 击杀立即补位`:w.enemies.length?'增援停止 · 清理残敌后选择构筑':'清波奖励即将开启…',720,104,16,CREAM,'center');}}
  if(w.mode==='play'&&!w.bonusEvent&&w.time<8){skin(c,'button-neutral',440,620,560,32);text(c,'自动普攻 · 拾取蓝晶获得经验 · 接触怪物会受伤',720,636,14,'#edf0ca','center');}
 }
 iconButton(name,x,y,w,h,action){skin(this.c,'button-neutral',x,y,w,h);icon(this.c,name,x+w/2,y+h/2,13);this.regions.push({x,y,w,h,action});}
 playerHUD(i,x){const c=this.c,w=this.world,h=w.heroes[i],color=colors[i];
  skin(c,`panel-${variant(color)}`,x,665,596,107);drawArt(c,'portrait-frame',x+51,720,89);
  c.save();c.translate(x+51,749);hero(c,{...h,face:i===0?1:3,action:null,move:{x:0,y:0},gait:0,down:false,hitFlash:0,hitReaction:null,invuln:0},0,.59);c.restore();
  text(c,`P${i+1} · ${ROLES[h.role].name}`,x+101,685,18,CREAM,'left',700);text(c,`${h.gold} 金`,x+277,685,13,'#f3d58b','right');text(c,this.fit(this.router.describe(i),177,12),x+101,702,12,'#d0dcc0');bar(c,x+100,714,177,14,h.hp/h.maxHp);text(c,`${Math.ceil(h.hp)} / ${h.maxHp}`,x+101,739,14);text(c,`盾 ${Math.ceil(h.shield||0)}${h.core!=='bulwark'&&h.storedGuard>0?' · 蓄 '+Math.round(h.storedGuard):''}`,x+277,739,12,'#cad7b8','right');
  const resourceName=h.passives.storage?'盾能':h.passives.volleyCharge?'齐射':h.core==='berserker'||h.passives.rageEdge?'怒气':h.core==='sniper'||h.forms?.[0]==='markedshot'?'猎印':null,markMax=h.core==='sniper'?5:3,amount=resourceName==='盾能'?(h.storedGuard||0):(h.resource||0),resource=resourceName==='猎印'?(h.huntStacks||0)/markMax:amount/100;
  if(resourceName){bar(c,x+100,749,177,6,resource,'#f1c864');text(c,`${resourceName}  ${resourceName==='猎印'?`${h.huntStacks||0} / ${markMax}`:Math.round(amount)+' / 100'}`,x+101,763,12,resource>=1?'#fff2ad':'#d1dcbc');}
  else text(c,this.fit(Object.entries(h.passives).map(([key,rank])=>`${PASSIVES[key].title}${rank}`).join(' · ')||'被动：0 / 4',177,12),x+101,759,12,'#d6dfc0');
  text(c,`${h.core?CORES[h.core].title:'未定流派'}${h.awakening?' · '+AWAKENINGS[h.awakening]?.title:''}`,x+21,652,14,'#ffe096');
  const keys=this.router.labels(i),icons=h.role==='warrior'?['shield','spin']:h.role==='mage'?['fire','frost']:['pierce','fan'];
  for(let j=0;j<3;j++){const slot=equippedSkills(h)[j],bx=x+310+j*88,locked=j<2&&!h.skills[slot],form=j<2?formInfo(h,slot):null;skin(c,'skill-slot',bx,674,70,77);if(locked)text(c,'待习得',bx+35,709,15,'#becfb5','center');else{if(!drawBuildIcon(c,form?.key||ACTIVE[h.role][slot]?.icon,bx+35,707,51))icon(c,j===2?'dodge':ACTIVE[h.role][slot].icon,bx+35,707,23);if(j<2)text(c,h.skillAdvances?.[slot]?'进阶':h.evolved[slot]?'进化':`Lv.${h.skills[slot]}`,bx+35,680,12,'#ffe096','center');}
   const cd=j===2?h.dodgeCd:h.cd[slot];if(cd>0){c.save();c.fillStyle='#112b26b8';c.beginPath();c.roundRect(bx+7,685,56,53,7);c.fill();c.restore();text(c,cd.toFixed(1),bx+35,709,23,CREAM,'center');}
   skin(c,'button-neutral',bx+2,732,66,22);text(c,keys[j],bx+35,743,13,CREAM,'center',700);text(c,this.fit(j===2?'闪避':locked?'清波习得':skillName(h,slot),80,12),bx+35,763,12,form?'#ffe6a4':'#d6dfc0','center');
  }
 }
 veil(alpha=.65){this.c.fillStyle=`rgba(9,27,22,${alpha})`;this.c.fillRect(0,0,W,H);}
 menu(){const c=this.c;this.veil(.45);skin(c,'panel-gold',466,35,508,146);text(c,'THREEFOLD ODYSSEY',720,67,14,'#d3dfbf','center',700);heading(c,'组建小队',720,121,43,CREAM,'center');
  this.button('单人冒险',478,196,228,43,()=>{this.humanCount=1;this.router.awaiting=null;},this.humanCount===1?CYAN:'#9ab38b',false,'setup-single');this.button('双人同行',734,196,228,43,()=>this.humanCount=2,this.humanCount===2?ORANGE:'#9ab38b',false,'setup-duo');
  for(let i=0;i<2;i++){const x=255+i*485,col=colors[i],h=createHero(this.roles[i],i),ai=i>=this.humanCount;skin(c,`card-${variant(col)}`,x,260,445,265);text(c,ai?'未启用 P2':`PLAYER ${i+1}`,x+28,291,15,col);
   if(!drawHeroPortrait(c,this.roles[i],x+10,305,158,164,i===1)){c.save();c.translate(x+87,439);hero(c,{...h,role:this.roles[i],face:i?3:1,action:null,move:{x:0,y:0},gait:0,down:false,hitFlash:0,hitReaction:null,invuln:0},this.animTime,1.3);c.restore();}heading(c,ROLES[this.roles[i]].name,x+173,340,31);for(let row=0;row<2;row++)text(c,this.fit(ROLES[this.roles[i]].skills.slice(row*2,row*2+2).join(' / '),242,15),x+173,372+row*23,15,'#dce3cb');
   this.button('切换职业',x+174,412,135,38,()=>this.cycleRole(i),col,ai,`setup-role-${i}`);text(c,ai?'第二手柄按 A 加入':this.router.describe(i),x+27,485,14,'#bdcdb0');if(!ai){this.button('绑定手柄',x+219,466,102,37,()=>this.router.claim(i),col,false,`setup-bind-${i}`);this.button('键盘',x+332,466,80,37,()=>this.router.bind(i,{type:'keyboard',id:i}),col,false,`setup-keyboard-${i}`);}
  }
  text(c,'开局无 AI · 每五关商店招募 · 小队最多三人 · 职业可重复',720,554,16,'#e0e5c9','center');this.button('出发  →',554,589,332,64,()=>this.actions.start(this.roles),CYAN,false,'setup-start');
  this.button('返回标题 · B',288,599,215,43,()=>this.actions.title(),'#9ab38b',false,'setup-title');this.button('全屏 / 窗口',937,599,215,43,()=>this.actions.fullscreen(),'#9ab38b',false,'setup-fullscreen');
  text(c,'手柄：方向键 / 摇杆选择 · A 确认 · B 返回 · 第二手柄按 A 加入',720,688,15,CREAM,'center');text(c,'战斗：左摇杆移动 · X / Y 技能 · LB 闪避 · Start 暂停 · View 图鉴',720,720,15,'#cdd8ba','center');text(c,'键盘：P1 WASD + Q/E/空格  ·  P2 方向键 + 小键盘1/2/0  ·  Enter 出发',720,754,13,'#b2c3a5','center');if(this.router.awaiting!==null)this.claimOverlay();
 }
 claimOverlay(){const c=this.c;this.regions=[];this.navRegions=[];skin(c,`panel-${variant(colors[this.router.awaiting])}`,408,566,624,109);icon(c,'gamepad',451,614,24);text(c,`P${this.router.awaiting+1}：新手柄按 A / Start 认领，B 取消`,740,601,19,CREAM,'center');this.button('取消 · B',662,629,116,31,()=>this.router.awaiting=null,'#9cb798',false,'binding-cancel');}
 upgrade(){const c=this.c,w=this.world,skills=w.rewardType==='skill';this.veil(.95);heading(c,skills?(w.highReward?'高阶奖励 · 选择方向':'清波 · 选择构筑'):'升级 · 强化属性',720,65,34,CREAM,'center');text(c,skills?'选完休整：存活队员回复 15% 生命 · 四被动槽 · 高阶构筑随机出现':`小队 Lv.${w.level} · 拾取经验升级，选完立即回到战斗`,720,107,16,'#d4dec6','center');
  for(let i=0;i<w.humanCount;i++){const x=w.humanCount===1?450:126+i*648,col=colors[i],h=w.heroes[i],menu=w.rewardMenus[i],choices=w.rewardChoices(i),count=choices.length,compact=count>3;
   text(c,`P${i+1} · ${ROLES[h.role].name}${['replace','skill-replace'].includes(menu?.type)?' · 选择被替换项':menu?.type==='route'?' · 先选领取方式':menu?.type==='reshape'?' · 重塑二选一':''}`,x+270,151,20,col,'center');
   for(let j=0;j<count;j++){const y=174+j*(compact?86:111),height=compact?79:102,selected=w.selection[i]===j,o=choices[j],form=o.form||(o.kind==='evolution'?h.forms?.[o.slot]:null);skin(c,selected?(w.ready[i]?'card-ready':`card-${variant(col)}`):'card-neutral',x,y,540,height);
    if(!drawUniversalIcon(c,o.icon,x+43,y+height*.48,48)&&!drawBuildIcon(c,form||o.icon,x+43,y+height*.48,50))icon(c,o.icon,x+43,y+height*.48,22);
    const q={common:'普通',uncommon:'精良',rare:'稀有',legendary:'觉醒'}[o.quality];text(c,this.fit((o.disabled?'× ':'')+o.title,390,compact?18:20,700),x+80,y+22,compact?18:20,CREAM,'left',700);if(q)text(c,q,x+513,y+21,12,o.quality==='legendary'?'#ffd87b':'#b7e3d4','right');
    this.wrap(o.desc,x+80,y+(compact?43:48),435,14,2);if(o.detail&&!compact)text(c,this.fit(o.kind==='evolution'?'主动 III · 两件配方组件且至少一件 II · 同槽分支互斥':o.detail,435,12),x+80,y+89,12,'#f1d598');this.regions.push({x,y,w:540,h:height,action:()=>w.choose(i,j)});
   }
   this.button(w.ready[i]?'已就绪 ✓':this.router.slots[i].type==='gamepad'?'确认 · A':i===0?'确认 · E':'确认 · Enter',x+16,520,306,42,()=>this.actions.confirm(i),col,w.ready[i]);
   if(['replace','skill-replace'].includes(menu?.type))this.button('取消 · B / R / Y',x+338,520,184,42,()=>{if(w.cancelReplacement(i))this.router.flush();},col,w.ready[i]);
   else{const device=this.router.slots[i],key=device.type==='gamepad'?'Y':device.id===1?'NUM3':'R';this.button(`重掷 ${key} · ${h.rerolls??0}`,x+338,520,184,42,()=>{if(w.reroll(i))this.router.flush();},col,w.ready[i]||!h.rerolls||!!menu);}
   if(w.rewardError?.slot===i)text(c,this.fit(w.rewardError.text,520,14),x+270,577,14,'#ffac8f','center');
   text(c,`暴击 ${Math.round(h.crit*100)}% · 闪避 ${Math.round(h.evasion*100)}% · 拾取 ${h.pickupRadius||75}`,x+270,597,14,'#d5dfc6','center');
   text(c,this.fit(`核心：${h.core?CORES[h.core].title:'尚未选择'}  ·  觉醒：${h.awakening?AWAKENINGS[h.awakening]?.title:'尚未获得'}`,520,14),x+10,617,14,'#ffe096');
   equippedSkills(h).forEach((slot,button)=>{const a=ACTIVE[h.role][slot],status=evolutionStatus(h,slot),y=641+button*50;text(c,this.fit(`${button?'E':'Q'}  ${h.skills[slot]?skillName(h,slot)+' '+h.skills[slot]:'未习得 '+a.title}`,520,14),x+10,y,14,'#e7d9ad');
    if(advanceInfo(h,slot))this.wrap(advanceInfo(h,slot).desc,x+10,y+17,520,12,2);
    else if(pairFor(h,slot)&&!h.forms?.[slot]&&!h.evolved[slot]){const [key,pair]=pairFor(h,slot);text(c,this.fit('进阶需 '+pair.slots.map(s=>ACTIVE[h.role][s].title+' '+(h.skills[s]||0)+'/2').join(' + ')+' · 清波8起随机',520,12),x+10,y+17,12,'#c7d8c4');}
    else if(h.evolved[slot])this.wrap(evolutionText(h,slot),x+10,y+17,520,12,2);
    else if(status.recipes?.length)status.recipes.forEach((r,index)=>text(c,this.fit(`${index?'或':'需主动III +'} ${r.parts.map(p=>p.title+(p.level?' '+p.level:' 缺')).join(' + ')}${index?'':'（一件II）'}`,520,12),x+10,y+17+index*16,12,r.ready?'#b3e9b7':'#c7d8c4'));
    else text(c,'取得形态后查看进化路线',x+10,y+17,12,'#c7d8c4');});
   text(c,this.fit('被动 '+(Object.entries(h.passives).map(([key,rank])=>(PASSIVES[key]?.title||key)+' '+rank).join(' / ')||'暂无'),520,14),x+10,744,14,'#d5dfc1');
   if(h.passives.elementFeed){const available=universalSources(h);if(available.burn&&available.chill)this.button(`饲料 ${this.router.slots[i].type==='gamepad'?'X':i?'NUM1':'Q'}：${h.universal?.feedElement==='chill'?'寒意':'燃烧'}`,x+360,750,165,23,()=>w.setFeedElement(i,h.universal?.feedElement==='chill'?'burn':'chill'),col);}
  }
  text(c,w.humanCount===1?(w.heroes.some(h=>h.ai)?'AI 已独立选择 · 你的确认即可继续':'确认后继续冒险'):w.ready[0]?'等待 P2 选择':w.ready[1]?'等待 P1 选择':'战斗已暂停 · 两人独立选择，确认后继续',720,776,14,'#d0ddbf','center');
 }
 fit(value,width,size,weight=500){const c=this.c;let result=String(value??'');c.font=uiFont(size,weight);if(c.measureText(result).width<=width)return result;while(result.length&&c.measureText(result+'…').width>width)result=result.slice(0,-1);return result+'…';}
 wrap(value,x,y,width,size,maxLines=99){let line='',row=0;const lineHeight=Math.max(18,Math.ceil(size*1.35));this.c.font=uiFont(size);const chars=[...String(value??'')];for(let k=0;k<chars.length;k++){const char=chars[k];if(this.c.measureText(line+char).width>width){if(row===maxLines-1){text(this.c,this.fit(line+chars.slice(k).join(''),width,size),x,y+row*lineHeight,size,'#d5dfc1');return;}text(this.c,line,x,y+row*lineHeight,size,'#d5dfc1');line=char;row++;}else line+=char;}text(this.c,line,x,y+row*lineHeight,size,'#d5dfc1');}
 modal(){const c=this.c,w=this.world;this.veil(.69);skin(c,w.mode==='complete'?'panel-gold':'panel-neutral',393,143,654,510);
  const title=w.mode==='victory'?'远征完成 · 二十关通关':w.mode==='complete'?'房间清理完成':w.mode==='defeat'?'小队倒下了':'暂时歇一口气';icon(c,w.mode==='complete'?'confirm':w.mode==='defeat'?'skull':'pause',720,180,18);heading(c,title,720,221,32,CREAM,'center');text(c,w.mode==='paused'?w.reason:`击败 ${w.kills} 个敌人 · 小队 Lv.${w.level}`,720,261,17,'#d3dfc6','center');
  if(w.mode==='paused'){for(let i=0;i<w.humanCount;i++){text(c,`P${i+1}  ${this.router.describe(i)}`,438,303+i*48,16,colors[i]);this.button('绑定手柄',739,283+i*48,125,35,()=>this.router.claim(i),colors[i],false,`pause-bind-${i}`);this.button('键盘',880,283+i*48,100,35,()=>this.router.bind(i,{type:'keyboard',id:i}),colors[i],false,`pause-keyboard-${i}`);}
   this.button(`反馈 ${w.options.feedback?'开':'关'}`,430,394,133,36,()=>w.options.feedback=!w.options.feedback,'#9ab38b',false,'pause-feedback');this.button(`震屏 ${w.options.shake?'开':'关'}`,579,394,133,36,()=>w.options.shake=!w.options.shake,'#9ab38b',false,'pause-shake');this.button(`判定 ${this.showDebug?'开':'关'}`,728,394,133,36,()=>this.showDebug=!this.showDebug,'#9ab38b',false,'pause-debug');this.button(`声音 ${w.options.sound?'开':'关'}`,877,394,133,36,()=>w.options.sound=!w.options.sound,'#9ab38b',false,'pause-sound');
   this.button('继续 · B / Start',491,450,458,44,()=>this.actions.pause(),CYAN,this.router.disconnected.some(i=>i<w.humanCount),'pause-resume');
   this.button('冒险图鉴',440,512,270,36,()=>this.actions.codex(),'#9ab38b',false,'pause-codex');this.button('全屏 / 窗口',730,512,270,36,()=>this.actions.fullscreen(),'#9ab38b',false,'pause-fullscreen');
   if(this.router.disconnected.some(i=>i<w.humanCount))text(c,'重连后按 A 认领原位置；也可选择“绑定手柄”换设备',720,370,12,'#ffe79a','center');
  }else {if(w.mode==='complete')text(c,'清波休整已结算 · 进入下一间再回复 12% 最大生命',720,326,15,'#d1dcbc','center');this.button(w.mode==='victory'?'进入无尽挑战 →':w.mode==='complete'?'继续下一间 →':'重新出发',491,373,458,58,()=>this.actions.proceed(),CYAN,false,'result-proceed');if(w.canChallenge())this.button(w.challengeNext?'已选精英挑战 · 高阶奖励':'下一间挑战精英 · 更高风险',491,453,458,42,()=>w.toggleChallenge(),w.challengeNext?ORANGE:CYAN,false,'result-challenge');if(w.mode==='victory')text(c,`持有金币 ${w.heroes.filter(h=>!h.ai).map(h=>`P${h.id+1}: ${h.gold}`).join(' / ')} · 本局等级 ${w.level} · 可结束冒险或继续无尽`,720,475,15,'#d1dcbc','center');icon(c,w.mode==='complete'?'door':'retry',526,402,17);}
  this.button('返回选人',440,583,270,38,()=>this.actions.menu(),'#839f76',false,w.mode==='paused'?'pause-setup':'result-setup');this.button('返回标题',730,583,270,38,()=>this.actions.title(),'#839f76',false,w.mode==='paused'?'pause-title':'result-title');text(c,'方向键 / 摇杆选择 · A 确认 · B 返回',720,677,14,'#d1dcbc','center');if(this.router.awaiting!==null)this.claimOverlay();
 }
}
