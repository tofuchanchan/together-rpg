import {drawEquipmentEffect,drawEquipmentObject} from './equipment-effects.js';
import {createHero} from './recruitment.js';
import {drawShop,handleShopInput} from './shop-view.js';
import {ROLES,clamp,MAP,MAP_SCALE} from './model.js';
import {ACTIVE,PASSIVES,CORES,RUNES,skillName,formInfo,evolutionText,evolutionStatus} from './builds.js';
import {drawBuildEffect,drawBuildProjectile,drawBuildIcon} from './build-art.js';
import {drawPet,drawPickup,drawSwarm,drawUniversalIcon,drawUniversalObject,drawUniversalEffect} from './universal-art.js';
import {AWAKENINGS,universalSources} from './universal-data.js';
import {enemyDef} from './enemies.js';
import {RARITIES,AFFIXES,waveNumber} from './encounters.js';
import {BOSS_SKILLS} from './boss.js';
import {actionLayout} from './effect-layout.js';
import {hero} from './sprites.js';
import {text,ellipse,CREAM,CYAN,ORANGE} from './art.js';
import {drawArt,drawContent,skin} from './world-assets.js';
import {enemy,rock,makeGround,bar,icon,actorShadow,playerRing,warning,effect,projectile,heroAction,SCENE_PROPS,sceneProp} from './world-art.js';
const W=1440,H=810,colors=[CYAN,ORANGE,'#e1d7aa'];
const variant=color=>color===CYAN?'cyan':color===ORANGE?'orange':'neutral';
const tagNames={melee:'近战',shield:'护盾',counter:'反击',bleed:'流血',area:'范围',spell:'法术',frost:'寒意',pierce:'贯穿',projectile:'箭矢',mark:'猎印',shadow:'残影',dodge:'闪避'};
const baseAction=h=>!(h.action?.type==='bash'&&h.forms?.[0]==='aegis'||h.action?.type==='spin'&&h.forms?.[1]==='bloodspin');

export class View{
 constructor(canvas,world,router,actions){this.c=canvas.getContext('2d');this.world=world;this.router=router;this.actions=actions;this.ground=makeGround();this.regions=[];this.roles=['warrior','mage'];this.humanCount=2;this.showDebug=false;this.animTime=0;this.displayPoses=new Map();}
 button(label,x,y,w,h,action,color=CYAN,disabled=false){skin(this.c,`button-${disabled?'disabled':variant(color)}`,x,y,w,h);text(this.c,label,x+w/2,y+h/2,17,CREAM,'center');if(!disabled)this.regions.push({x,y,w,h,action});}
 shopInput(slot,input){handleShopInput(this,slot,input);}
 click(x,y){const b=[...this.regions].reverse().find(r=>x>=r.x&&y>=r.y&&x<=r.x+r.w&&y<=r.y+r.h);if(b)b.action();}
 cycleRole(slot){const keys=Object.keys(ROLES);let i=keys.indexOf(this.roles[slot]);i=(i+1)%3;this.roles[slot]=keys[i];}
 draw(dt=0){
  this.animTime+=dt;const c=this.c,w=this.world;this.regions=[];c.clearRect(0,0,W,H);c.fillStyle='#173f34';c.fillRect(0,0,W,H);
  c.save();let sx=0,sy=0;if(w.options.shake&&w.options.feedback&&w.shake>0){sx=Math.sin(w.time*93)*w.shake*17;sy=Math.cos(w.time*109)*w.shake*12;}
  c.translate(720+sx-w.camera.x*w.camera.zoom,369+sy-w.camera.y*.707*w.camera.zoom);c.scale(w.camera.zoom,w.camera.zoom);c.drawImage(this.ground,-800*MAP_SCALE,-550*MAP_SCALE,1600*MAP_SCALE,1100*MAP_SCALE);
  for(const f of w.hazards){if(f.type==='coldfield'){const owner=w.heroes[f.owner];if(f.life>0&&owner&&!owner.down)drawBuildEffect(c,{...f,type:'build',variant:'icefield',max:f.max||(owner.evolved[1]?5:3.6)});continue;}drawArt(c,f.type==='poison'?'frost-2':'blast-2',f.x,f.y*.707,f.r*2,f.r*1.414,{alpha:.55,filter:f.type==='poison'?'hue-rotate(230deg) saturate(1.5)':undefined});}
  // Persistent art reads combat state, never a second independent FX timer.
  for(const h of w.heroes)if(!h.down&&h.action?.form==='aegis'&&h.guardUntil>w.time)drawBuildEffect(c,{type:'build',variant:'aegis',x:h.x,y:h.y,r:105,dir:h.guardDir||h.action.dir,life:h.guardUntil-w.time,max:h.action.activeEnd-h.action.windup});
  if(w.options.feedback){for(const f of w.effects)if(f.type!=='number'&&f.layer!=='depth'){if(!drawEquipmentEffect(c,f)&&!drawUniversalEffect(c,f)&&!drawBuildEffect(c,f)&&f.type!=='build')effect(c,f);}for(const h of w.heroes)if(baseAction(h)&&actionLayout(h)?.layer==='ground')heroAction(c,h);}
  for(const p of w.pickups)drawPickup(c,p,w.time);
  for(const o of w.universalObjects||[])if(!['needle','wheel','thornBolt','orbit','magnetStar'].includes(o.kind))drawUniversalObject(c,o,w.time);
  for(const e of w.enemies)if(e.action&&(!e.action.hit||(e.action.from&&e.action.t<e.action.windup+e.action.travelTime))&&!e.boss)warning(c,e.action);for(const a of w.bossWarnings)if(!a.hit)warning(c,a);
  for(const o of w.equipmentObjects||[])if(o.kind==='snare')drawEquipmentObject(c,o,w.time);
  const actors=[...(w.equipmentObjects||[]).filter(o=>o.kind!=='snare').map(o=>({...o,equipmentActor:true})),...(w.pets||[]).map(p=>({...p,petActor:true})),...(w.universalObjects||[]).filter(o=>['needle','wheel','thornBolt','orbit','magnetStar'].includes(o.kind)).map(o=>({...o,universalActor:true})),...SCENE_PROPS.map(p=>({...p,x:p.x*MAP_SCALE,y:p.y*MAP_SCALE,prop:true})),...w.obstacles.map(o=>({...o,obstacle:true})),...w.enemies,...w.heroes,...w.heroes.filter(h=>h.shadow?.life>0).map(h=>({...h,...h.shadow,shadowActor:true,action:null,invuln:0,hitFlash:0,hitReaction:null,move:{x:0,y:0}})),...w.projectiles.map(p=>({...p,projectile:true})),...(w.options.feedback?w.effects.filter(f=>f.layer==='depth').map(f=>({...f,depthEffect:true})):[]),...(w.options.feedback?w.heroes.filter(h=>actionLayout(h)?.layer==='depth').map(h=>({...actionLayout(h),actionHero:h})):[])].sort((a,b)=>(a.depthY??a.y)-(b.depthY??b.y));
  for(const h of actors){
   if(h.equipmentActor){drawEquipmentObject(c,h,w.time);continue;}if(h.petActor){drawPet(c,h,w.time);continue;}if(h.universalActor){drawUniversalObject(c,h,w.time);continue;}
   if(h.depthEffect){if(!drawEquipmentEffect(c,h)&&!drawBuildEffect(c,h)&&h.type!=='build')effect(c,h);continue;}
   if(h.prop){sceneProp(c,h);continue;}
   if(h.projectile){if(!drawBuildProjectile(c,h,w.time))projectile(c,h,w.time);continue;}if(h.actionHero){if(baseAction(h.actionHero))heroAction(c,h.actionHero);continue;}
   if(h.shadowActor){c.save();c.translate(h.x,h.y*.707);c.globalAlpha=.37*Math.min(1,h.life*2);c.filter='sepia(1) saturate(3) hue-rotate(220deg)';hero(c,h,w.time);c.restore();continue;}
   c.save();c.translate(h.x,h.y*.707);if(h.obstacle){rock(c,0,0,h.r);c.restore();continue;}
   const allied=h.role!==undefined;actorShadow(c,0,1,allied?28:h.boss?65:h.kind==='mushroom'?42:27);
   if(allied){
    const col=colors[h.id],a=h.action;playerRing(c,0,0,33,h.id);
    if(a?.type==='dodge'&&w.options.feedback){for(let i=3;i>0;i--){c.save();c.globalAlpha=(4-i)*.055;c.translate(-a.dir.x*i*17,-a.dir.y*i*12);hero(c,h,w.time);c.restore();}}
    let drawH=h;if(h.visualStop>0&&w.options.feedback&&this.displayPoses.has(h.id)){const cached=h.hitPose||this.displayPoses.get(h.id);drawH={...h,action:cached.action,stride:h.stride};}else this.displayPoses.set(h.id,{action:h.action?{...h.action}:null,stride:h.stride});
    hero(c,drawH,w.time);
   }else{
    if(!drawSwarm(c,h,w.time))enemy(c,h,w.time);
   }
   c.restore();
  }
  // Nameplates and health bars are a separate overlay, never occluded by foreground effects.
  const statusTargets=new Set(w.heroes.filter(h=>!h.down).flatMap(h=>[w.nearest(h,520)?.id,h.huntTarget]).filter(id=>id!==undefined&&id!==null));
  for(const h of [...w.enemies,...w.heroes]){c.save();c.translate(h.x,h.y*.707);if(h.role){const col=colors[h.id],top=h.role==='mage'?-126:-116;skin(c,`button-${h.ai?'neutral':variant(col)}`,-18,top-29,36,25);text(c,h.ai?'AI':`P${h.id+1}`,0,top-16,13,CREAM,'center');bar(c,-28,top,56,10,h.hp/h.maxHp,h.down?'#eea467':'#9edb7b');if(h.down){text(c,'靠近救援',0,24,13,CREAM,'center');bar(c,-31,36,62,10,h.revive/2,'#efd276');}}else{if(h.hp<h.maxHp||h.rarity)bar(c,-25,-enemyDef(h).size-16,50,9,h.hp/h.maxHp,'#e58a6d');if(h.rarity){text(c,`${RARITIES[h.rarity].name} · ${h.affixes.map(a=>AFFIXES[a]).join(' / ')}`,0,-enemyDef(h).size-31,12,RARITIES[h.rarity].color,'center');}this.enemyBuildStatus(h,statusTargets.has(h.id)||h.boss);}c.restore();}
  if(w.options.feedback)for(const f of w.effects){
   if(f.type==='number'){c.save();c.globalAlpha=Math.min(1,f.life*3);c.shadowColor='#253323';c.shadowBlur=2;text(c,f.text,f.x,f.y*.707-(f.height||107)-(1-f.life/f.max)*28,20,f.color,'center',900);c.restore();}
  }
  if(this.showDebug){for(const h of w.heroes){ellipse(c,h.x,h.y*.707,17,12,'#00000000','#afffea',1);text(c,`${h.face} / ${h.action?.type||'idle'}`,h.x,h.y*.707+40,11,'#e4f7da','center');}for(const e of w.enemies)if(e.action)ellipse(c,e.action.x,e.action.y*.707,e.action.r,e.action.r*.707,'#00000000','#ff577e',2);}
  c.restore();if(w.mode!=='menu')this.hud();if(w.mode==='menu')this.menu();if(w.mode==='upgrade')this.upgrade();if(w.mode==='shop')drawShop(this);if(['paused','complete','defeat','victory'].includes(w.mode))this.modal();
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
  skin(c,'panel-neutral',588,17,267,60);text(c,`林间遗迹  ${String(w.room).padStart(2,'0')}`,721,40,20,CREAM,'center');text(c,w.bossRoom?`首领战 · ${w.enemies.length} 敌人`:`第 ${w.wave}/2 波 · ${w.enemies.length} 敌人 · 入场 ${w.waveSpawned}`,721,62,12,'#c5d0ab','center');
  this.iconButton('pause',865,23,40,40,()=>this.actions.pause());this.iconButton(w.options.sound?'sound':'muted',920,23,40,40,()=>{w.options.sound=!w.options.sound;});
  skin(c,'panel-neutral',1230,18,186,125);c.save();c.beginPath();c.roundRect(1247,35,152,89,7);c.clip();c.globalAlpha=.7;c.drawImage(this.ground,1247,35,152,89);c.globalAlpha=1;
  for(const e of w.enemies)ellipse(c,1323+e.x*.118/MAP_SCALE,79+e.y*.1/MAP_SCALE,3,3,'#ee9472',null);for(const h of w.heroes)ellipse(c,1323+h.x*.118/MAP_SCALE,79+h.y*.1/MAP_SCALE,4,4,colors[h.id],null);c.restore();
  text(c,`击败 ${w.kills}`,1209,40,15,CREAM,'right');text(c,`金币 ${w.gold} · 商店 ${Math.ceil(w.room/5)*5}关`,1209,64,13,'#f3d58b','right');
  for(let i=0;i<w.humanCount;i++)this.playerHUD(i,w.humanCount===1?422:i===0?24:820);bar(c,476,783,488,23,w.xp/w.xpNext,'#f1c864');text(c,`小队 Lv.${w.level}  ·  ${w.xp} / ${w.xpNext}`,720,795,13,CREAM,'center');
  if(w.mode==='play'){text(c,w.enraged?'狂暴 · 小怪移速 +35% / 伤害 +30% / 冷却恢复 +40%':`狂暴倒计时 ${Math.max(0,Math.ceil(w.enrageAt-w.waveElapsed))} 秒`,720,158,14,w.enraged?'#ff986e':'#c9d5b4','center');const boss=w.enemies.find(e=>e.boss);if(boss){skin(c,'panel-gold',427,83,586,57);text(c,`荆冠古王 · 阶段 ${boss.phase}/3  ${boss.action?BOSS_SKILLS[boss.action.kind]:''}`,720,99,18,CREAM,'center');bar(c,447,118,546,12,boss.hp/boss.maxHp,'#e58a6d');}else{const remaining=Math.max(0,Math.ceil(w.waveDuration-w.waveElapsed));text(c,remaining&&!w.pressureClosed?`${w.eliteChallenge?'精英挑战 · ':''}持续增援 ${remaining} 秒 · 击杀立即补位`:w.enemies.length?'增援停止 · 清理残敌后选择构筑':'清波奖励即将开启…',720,104,16,CREAM,'center');}}
  if(w.mode==='play'&&w.time<8){skin(c,'button-neutral',440,620,560,32);text(c,'自动普攻 · 拾取蓝晶获得经验 · 接触怪物会受伤',720,636,14,'#edf0ca','center');}
 }
 iconButton(name,x,y,w,h,action){skin(this.c,'button-neutral',x,y,w,h);icon(this.c,name,x+w/2,y+h/2,13);this.regions.push({x,y,w,h,action});}
 playerHUD(i,x){const c=this.c,w=this.world,h=w.heroes[i],color=colors[i];
  skin(c,`panel-${variant(color)}`,x,665,596,107);drawArt(c,'portrait-frame',x+51,720,89);
  c.save();c.translate(x+51,749);hero(c,{...h,face:i===0?1:3,action:null,move:{x:0,y:0},gait:0,down:false,hitFlash:0,hitReaction:null,invuln:0},0,.59);c.restore();
  text(c,`P${i+1} · ${ROLES[h.role].name}`,x+101,685,17);text(c,this.fit(this.router.describe(i),177,10),x+101,701,10,'#bfceae');bar(c,x+100,713,177,14,h.hp/h.maxHp);text(c,`${Math.ceil(h.hp)} / ${h.maxHp}`,x+101,737,13);text(c,`盾 ${Math.ceil(h.shield||0)}${h.core!=='bulwark'&&h.storedGuard>0?' · 蓄 '+Math.round(h.storedGuard):''}`,x+277,737,10,'#b4c49f','right');
  const resourceName=h.passives.storage?'盾能':h.passives.volleyCharge?'齐射':h.core==='berserker'||h.passives.rageEdge?'怒气':h.core==='sniper'||h.forms?.[0]==='markedshot'?'猎印':null,markMax=h.core==='sniper'?5:3,amount=resourceName==='盾能'?(h.storedGuard||0):(h.resource||0),resource=resourceName==='猎印'?(h.huntStacks||0)/markMax:amount/100;
  if(resourceName){bar(c,x+100,744,177,8,resource,'#f1c864');text(c,`${resourceName}  ${resourceName==='猎印'?`${h.huntStacks||0} / ${markMax}`:Math.round(amount)+' / 100'}`,x+101,762,10,resource>=1?'#fff2ad':'#d1dcbc');}
  else text(c,this.fit(Object.entries(h.passives).map(([key,rank])=>`${PASSIVES[key].title}${rank}`).join(' · ')||'被动：0 / 4',177,10),x+101,758,10,'#cdd7b1');
  text(c,`${h.core?CORES[h.core].title:'未定流派'}${h.awakening?' · '+AWAKENINGS[h.awakening]?.title:''}`,x+21,652,13,'#ffe096');
  const keys=this.router.labels(i),icons=h.role==='warrior'?['shield','spin']:h.role==='mage'?['fire','frost']:['pierce','fan'];
  for(let j=0;j<3;j++){const bx=x+310+j*88,locked=j<2&&!h.skills[j],form=j<2?formInfo(h,j):null;skin(c,'skill-slot',bx,674,70,77);if(locked)text(c,'待习得',bx+35,709,15,'#a5b8a1','center');else{if(!form||!drawBuildIcon(c,h.forms?.[j]||form.key,bx+35,707,51))icon(c,j===2?'dodge':icons[j],bx+35,707,23);if(j<2)text(c,h.evolved[j]?'进化':`Lv.${h.skills[j]}`,bx+35,679,10,'#ffe096','center');}
   const cd=j===2?h.dodgeCd:h.cd[j];if(cd>0){c.save();c.fillStyle='#112b26b8';c.beginPath();c.roundRect(bx+7,685,56,53,7);c.fill();c.restore();text(c,cd.toFixed(1),bx+35,709,23,CREAM,'center');}
   skin(c,'button-neutral',bx+2,732,66,22);text(c,keys[j],bx+35,743,11,CREAM,'center');text(c,this.fit(j===2?'闪避':locked?'清波习得':skillName(h,j),76,10),bx+35,763,10,form?'#ffe6a4':'#cdd7b1','center');
  }
 }
 veil(alpha=.65){this.c.fillStyle=`rgba(9,27,22,${alpha})`;this.c.fillRect(0,0,W,H);}
 menu(){const c=this.c;this.veil(.45);skin(c,'panel-gold',466,35,508,146);text(c,'TOGETHER  /  ROGUELITE',720,67,13,'#c9d5b4','center');text(c,'同行 · 林间远征',720,121,43,CREAM,'center',900);
  this.button('单人冒险',478,196,228,43,()=>{this.humanCount=1;this.router.awaiting=null;},this.humanCount===1?CYAN:'#9ab38b');this.button('双人同行',734,196,228,43,()=>this.humanCount=2,this.humanCount===2?ORANGE:'#9ab38b');
  for(let i=0;i<2;i++){const x=255+i*485,col=colors[i],h=createHero(this.roles[i],i),ai=i>=this.humanCount;skin(c,`card-${variant(col)}`,x,260,445,265);text(c,ai?'未启用 P2':`PLAYER ${i+1}`,x+28,291,15,col);
   c.save();c.translate(x+87,439);hero(c,{...h,role:this.roles[i],face:i?3:1,action:null,move:{x:0,y:0},gait:0,down:false,hitFlash:0,hitReaction:null,invuln:0},this.animTime,1.3);c.restore();text(c,ROLES[this.roles[i]].name,x+173,340,29);text(c,ROLES[this.roles[i]].skills.join('  /  '),x+173,382,16,'#d0d9ba');
   this.button('切换职业',x+174,412,135,38,()=>this.cycleRole(i),col);text(c,ai?'单人开局 · 第五关后可招募队友':this.router.describe(i),x+27,485,14,'#bdcdb0');if(!ai){this.button('绑定手柄',x+219,466,102,37,()=>this.router.claim(i),col);this.button('键盘',x+332,466,80,37,()=>this.router.bind(i,{type:'keyboard',id:i}),col);}
  }
  text(c,'开局无 AI · 每五关商店招募 · 小队最多三人 · 职业可重复',720,554,16,'#e0e5c9','center');this.button('出发  →',554,589,332,64,()=>this.actions.start(this.roles),CYAN);
  text(c,'P1  WASD 移动 · Q / E 技能 · 空格闪避',720,694,16,CREAM,'center');text(c,'P2  方向键移动 · 小键盘 1 / 2 技能 · 小键盘 0 闪避   |   手柄：左摇杆 + X / Y / A',720,726,14,'#cdd8ba','center');text(c,'Enter 出发 · F 全屏 · P 暂停 · 两个玩家均可绑定手柄',720,758,13,'#b2c3a5','center');if(this.router.awaiting!==null)this.claimOverlay();
 }
 claimOverlay(){const c=this.c;skin(c,`panel-${variant(colors[this.router.awaiting])}`,408,566,624,109);icon(c,'gamepad',451,614,24);text(c,`请在 P${this.router.awaiting+1} 的手柄上按任意按钮`,740,601,21,CREAM,'center');this.button('取消',662,629,116,31,()=>this.router.awaiting=null,'#9cb798');}
 upgrade(){const c=this.c,w=this.world,skills=w.rewardType==='skill';this.veil(.86);text(c,skills?(w.highReward?'高阶奖励 · 选择方向':'清波 · 选择构筑'):'升级 · 强化属性',720,65,32,CREAM,'center');text(c,skills?'选完休整：存活队员回复 15% 生命 · 四被动槽 · 高阶构筑随机出现':`小队 Lv.${w.level} · 拾取经验升级，选完立即回到战斗`,720,107,16,'#c9d7b8','center');
  for(let i=0;i<w.humanCount;i++){const x=w.humanCount===1?450:126+i*648,col=colors[i],h=w.heroes[i],menu=w.rewardMenus[i],choices=w.rewardChoices(i),count=choices.length,compact=count>3;
   text(c,`P${i+1} · ${ROLES[h.role].name}${menu?.type==='replace'?' · 选择被替换项':menu?.type==='route'?' · 先选领取方式':menu?.type==='reshape'?' · 重塑二选一':''}`,x+270,151,20,col,'center');
   for(let j=0;j<count;j++){const y=174+j*(compact?86:111),height=compact?79:102,selected=w.selection[i]===j,o=choices[j],form=o.form||(o.kind==='evolution'?h.forms?.[o.slot]:null);skin(c,selected?(w.ready[i]?'card-ready':`card-${variant(col)}`):'card-neutral',x,y,540,height);
    if(!drawUniversalIcon(c,o.icon,x+43,y+height*.48,48)&&!drawBuildIcon(c,form,x+43,y+height*.48,50))icon(c,o.icon,x+43,y+height*.48,22);
    const q={common:'普通',uncommon:'精良',rare:'稀有',legendary:'觉醒'}[o.quality];text(c,this.fit((o.disabled?'× ':'')+o.title,390,compact?17:19),x+80,y+22,compact?17:19);if(q)text(c,q,x+513,y+20,10,o.quality==='legendary'?'#ffd87b':'#9fd5c7','right');
    this.wrap(o.desc,x+80,y+(compact?42:47),435,compact?11:12,2);if(o.detail&&!compact)text(c,this.fit(o.kind==='evolution'?'主动 III · 两件配方组件且至少一件 II · 同槽分支互斥':o.detail,435,10),x+80,y+88,10,'#f1d598');this.regions.push({x,y,w:540,h:height,action:()=>w.choose(i,j)});
   }
   this.button(w.ready[i]?'已就绪 ✓':this.router.slots[i].type==='gamepad'?'确认 · A':i===0?'确认 · E':'确认 · Enter',x+16,520,306,42,()=>this.actions.confirm(i),col,w.ready[i]);
   if(menu?.type==='replace')this.button('取消替换 · R / Y',x+338,520,184,42,()=>{if(w.cancelReplacement(i))this.router.flush();},col,w.ready[i]);
   else{const device=this.router.slots[i],key=device.type==='gamepad'?'Y':device.id===1?'NUM3':'R';this.button(`重掷 ${key} · ${h.rerolls??0}`,x+338,520,184,42,()=>{if(w.reroll(i))this.router.flush();},col,w.ready[i]||!h.rerolls||!!menu);}
   if(w.rewardError?.slot===i)text(c,this.fit(w.rewardError.text,520,12),x+270,573,12,'#ffac8f','center');
   text(c,`暴击 ${Math.round(h.crit*100)}% · 闪避 ${Math.round(h.evasion*100)}% · 拾取 ${h.pickupRadius||75}`,x+270,592,13,'#c9d7b8','center');
   text(c,this.fit(`核心：${h.core?CORES[h.core].title:'尚未选择'}  ·  觉醒：${h.awakening?AWAKENINGS[h.awakening]?.title:'尚未获得'}`,520,12),x+10,609,12,'#ffe096');
   ACTIVE[h.role].forEach((a,slot)=>{const status=evolutionStatus(h,slot),y=630+slot*51;text(c,this.fit(`${slot?'E':'Q'}  ${h.skills[slot]?skillName(h,slot)+' '+h.skills[slot]:'未习得 '+a.title}`,520,12),x+10,y,12,'#e7d9ad');
    if(h.evolved[slot])this.wrap(evolutionText(h,slot),x+10,y+15,520,10,2);
    else if(status.recipes?.length)status.recipes.forEach((r,index)=>text(c,this.fit(`${index?'或':'需主动III +'} ${r.parts.map(p=>p.title+(p.level?' '+p.level:' 缺')).join(' + ')}${index?'':'（一件II）'}`,520,10),x+10,y+15+index*14,10,r.ready?'#b3e9b7':'#b5cbb9'));
    else text(c,'取得形态后查看进化路线',x+10,y+15,10,'#b5cbb9');});
   text(c,this.fit('被动 '+(Object.entries(h.passives).map(([key,rank])=>(PASSIVES[key]?.title||key)+' '+rank).join(' / ')||'暂无'),520,12),x+10,742,12,'#d5dfc1');
   if(h.passives.elementFeed){const available=universalSources(h);if(available.burn&&available.chill)this.button(`饲料：${h.universal?.feedElement==='chill'?'寒意':'燃烧'}`,x+390,750,135,23,()=>w.setFeedElement(i,h.universal?.feedElement==='chill'?'burn':'chill'),col);}
  }
  text(c,w.humanCount===1?(w.heroes.some(h=>h.ai)?'AI 已独立选择 · 你的确认即可继续':'确认后继续冒险'):w.ready[0]?'等待 P2 选择':w.ready[1]?'等待 P1 选择':'战斗已暂停 · 两人独立选择，确认后继续',720,776,14,'#d0ddbf','center');
 }
 fit(value,width,size){const c=this.c;let result=String(value??'');c.font=`600 ${size}px sans-serif`;if(c.measureText(result).width<=width)return result;while(result.length&&c.measureText(result+'…').width>width)result=result.slice(0,-1);return result+'…';}
 wrap(value,x,y,width,size,maxLines=99){let line='',row=0;this.c.font=`600 ${size}px sans-serif`;const chars=[...String(value??'')];for(let k=0;k<chars.length;k++){const char=chars[k];if(this.c.measureText(line+char).width>width){if(row===maxLines-1){text(this.c,this.fit(line+chars.slice(k).join(''),width,size),x,y+row*18,size,'#d5dfc1');return;}text(this.c,line,x,y+row*18,size,'#d5dfc1');line=char;row++;}else line+=char;}text(this.c,line,x,y+row*18,size,'#d5dfc1');}
 modal(){const c=this.c,w=this.world;this.veil(.69);skin(c,w.mode==='complete'?'panel-gold':'panel-neutral',393,143,654,510);
  const title=w.mode==='victory'?'远征完成 · 二十关通关':w.mode==='complete'?'房间清理完成':w.mode==='defeat'?'小队倒下了':'暂时歇一口气';icon(c,w.mode==='complete'?'confirm':w.mode==='defeat'?'skull':'pause',720,180,18);text(c,title,720,221,30,CREAM,'center');text(c,w.mode==='paused'?w.reason:`击败 ${w.kills} 个敌人 · 小队 Lv.${w.level}`,720,261,17,'#c9d6b6','center');
  if(w.mode==='paused'){for(let i=0;i<w.humanCount;i++){text(c,`P${i+1}  ${this.router.describe(i)}`,438,315+i*56,16,colors[i]);this.button('绑定手柄',739,295+i*56,125,39,()=>this.router.claim(i),colors[i]);this.button('键盘',880,295+i*56,100,39,()=>this.router.bind(i,{type:'keyboard',id:i}),colors[i]);}
   this.button(`反馈 ${w.options.feedback?'开':'关'}`,440,424,155,40,()=>w.options.feedback=!w.options.feedback,'#9ab38b');this.button(`震屏 ${w.options.shake?'开':'关'}`,642,424,155,40,()=>w.options.shake=!w.options.shake,'#9ab38b');this.button(`判定 ${this.showDebug?'开':'关'}`,843,424,155,40,()=>this.showDebug=!this.showDebug,'#9ab38b');this.button('继续 · P',491,506,458,49,()=>this.actions.pause(),CYAN);
  }else {if(w.mode==='complete')text(c,'清波休整已结算 · 进入下一间再回复 12% 最大生命',720,326,15,'#d1dcbc','center');this.button(w.mode==='victory'?'进入无尽挑战 →':w.mode==='complete'?'继续下一间 →':'重新出发',491,373,458,58,()=>this.actions.proceed(),CYAN);if(w.canChallenge())this.button(w.challengeNext?'已选精英挑战 · 高阶奖励':'下一间挑战精英 · 更高风险',491,453,458,42,()=>w.toggleChallenge(),w.challengeNext?ORANGE:CYAN);if(w.mode==='victory')text(c,`累计金币 ${w.gold} · 本局等级 ${w.level} · 可结束冒险或继续无尽`,720,475,15,'#d1dcbc','center');icon(c,w.mode==='complete'?'door':'retry',526,402,17);}
  this.button('返回选人',553,582,334,40,()=>this.actions.menu(),'#839f76');if(this.router.awaiting!==null)this.claimOverlay();
 }
}
