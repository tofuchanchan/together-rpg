import {ROLES,clamp,MAP,MAP_SCALE} from './model.js';
import {ACTIVE,PASSIVES,CORES,RUNES,skillName} from './builds.js';
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

export class View{
 constructor(canvas,world,router,actions){this.c=canvas.getContext('2d');this.world=world;this.router=router;this.actions=actions;this.ground=makeGround();this.regions=[];this.roles=['warrior','mage'];this.humanCount=2;this.showDebug=false;this.animTime=0;this.displayPoses=new Map();}
 button(label,x,y,w,h,action,color=CYAN,disabled=false){skin(this.c,`button-${disabled?'disabled':variant(color)}`,x,y,w,h);text(this.c,label,x+w/2,y+h/2,17,CREAM,'center');if(!disabled)this.regions.push({x,y,w,h,action});}
 click(x,y){const b=[...this.regions].reverse().find(r=>x>=r.x&&y>=r.y&&x<=r.x+r.w&&y<=r.y+r.h);if(b)b.action();}
 cycleRole(slot){const keys=Object.keys(ROLES);let i=keys.indexOf(this.roles[slot]);do{i=(i+1)%3;}while(keys[i]===this.roles[1-slot]);this.roles[slot]=keys[i];}
 draw(dt=0){
  this.animTime+=dt;const c=this.c,w=this.world;this.regions=[];c.clearRect(0,0,W,H);c.fillStyle='#173f34';c.fillRect(0,0,W,H);
  c.save();let sx=0,sy=0;if(w.options.shake&&w.options.feedback&&w.shake>0){sx=Math.sin(w.time*93)*w.shake*17;sy=Math.cos(w.time*109)*w.shake*12;}
  c.translate(720+sx-w.camera.x*w.camera.zoom,369+sy-w.camera.y*.707*w.camera.zoom);c.scale(w.camera.zoom,w.camera.zoom);c.drawImage(this.ground,-800*MAP_SCALE,-550*MAP_SCALE,1600*MAP_SCALE,1100*MAP_SCALE);
  for(const f of w.hazards){drawArt(c,f.type==='poison'?'frost-2':'blast-2',f.x,f.y*.707,f.r*2,f.r*1.414,{alpha:.55,filter:f.type==='poison'?'hue-rotate(230deg) saturate(1.5)':undefined});}
  if(w.options.feedback){for(const f of w.effects)if(f.type!=='number'&&f.layer!=='depth')effect(c,f);for(const h of w.heroes)if(actionLayout(h)?.layer==='ground')heroAction(c,h);}
  for(const p of w.pickups){actorShadow(c,p.x,p.y*.707,15);icon(c,'heal',p.x,p.y*.707-17,20);}
  for(const e of w.enemies)if(e.action&&(!e.action.hit||(e.action.from&&e.action.t<e.action.windup+e.action.travelTime))&&!e.boss)warning(c,e.action);for(const a of w.bossWarnings)if(!a.hit)warning(c,a);
  const actors=[...SCENE_PROPS.map(p=>({...p,x:p.x*MAP_SCALE,y:p.y*MAP_SCALE,prop:true})),...w.obstacles.map(o=>({...o,obstacle:true})),...w.enemies,...w.heroes,...w.projectiles.map(p=>({...p,projectile:true})),...(w.options.feedback?w.effects.filter(f=>f.layer==='depth').map(f=>({...f,depthEffect:true})):[]),...(w.options.feedback?w.heroes.filter(h=>actionLayout(h)?.layer==='depth').map(h=>({...actionLayout(h),actionHero:h})):[])].sort((a,b)=>(a.depthY??a.y)-(b.depthY??b.y));
  for(const h of actors){
   if(h.depthEffect){effect(c,h);continue;}
   if(h.prop){sceneProp(c,h);continue;}
   if(h.projectile){projectile(c,h,w.time);continue;}if(h.actionHero){heroAction(c,h.actionHero);continue;}
   c.save();c.translate(h.x,h.y*.707);if(h.obstacle){rock(c,0,0,h.r);c.restore();continue;}
   const allied=h.role!==undefined;actorShadow(c,0,1,allied?28:h.boss?65:h.kind==='mushroom'?42:27);
   if(allied){
    const col=colors[h.id],a=h.action;playerRing(c,0,0,33,h.id);
    if(a?.type==='dodge'&&w.options.feedback){for(let i=3;i>0;i--){c.save();c.globalAlpha=(4-i)*.055;c.translate(-a.dir.x*i*17,-a.dir.y*i*12);hero(c,h,w.time);c.restore();}}
    let drawH=h;if(h.visualStop>0&&w.options.feedback&&this.displayPoses.has(h.id)){const cached=h.hitPose||this.displayPoses.get(h.id);drawH={...h,action:cached.action,stride:h.stride};}else this.displayPoses.set(h.id,{action:h.action?{...h.action}:null,stride:h.stride});
    hero(c,drawH,w.time);
   }else{
    enemy(c,h,w.time);
   }
   c.restore();
  }
  // Nameplates and health bars are a separate overlay, never occluded by foreground effects.
  for(const h of [...w.enemies,...w.heroes]){c.save();c.translate(h.x,h.y*.707);if(h.role){const col=colors[h.id],top=h.role==='mage'?-126:-116;skin(c,`button-${h.ai?'neutral':variant(col)}`,-18,top-29,36,25);text(c,h.ai?'AI':`P${h.id+1}`,0,top-16,13,CREAM,'center');bar(c,-28,top,56,10,h.hp/h.maxHp,h.down?'#eea467':'#9edb7b');if(h.down){text(c,'靠近救援',0,24,13,CREAM,'center');bar(c,-31,36,62,10,h.revive/2,'#efd276');}}else{if(h.hp<h.maxHp||h.rarity)bar(c,-25,-enemyDef(h).size-16,50,9,h.hp/h.maxHp,'#e58a6d');if(h.rarity){text(c,`${RARITIES[h.rarity].name} · ${h.affixes.map(a=>AFFIXES[a]).join(' / ')}`,0,-enemyDef(h).size-31,12,RARITIES[h.rarity].color,'center');}}c.restore();}
  if(w.options.feedback)for(const f of w.effects){
   if(f.type==='number'){c.save();c.globalAlpha=Math.min(1,f.life*3);c.shadowColor='#253323';c.shadowBlur=2;text(c,f.text,f.x,f.y*.707-(f.height||107)-(1-f.life/f.max)*28,20,f.color,'center',900);c.restore();}
  }
  if(this.showDebug){for(const h of w.heroes){ellipse(c,h.x,h.y*.707,17,12,'#00000000','#afffea',1);text(c,`${h.face} / ${h.action?.type||'idle'}`,h.x,h.y*.707+40,11,'#e4f7da','center');}for(const e of w.enemies)if(e.action)ellipse(c,e.action.x,e.action.y*.707,e.action.r,e.action.r*.707,'#00000000','#ff577e',2);}
  c.restore();if(w.mode!=='menu')this.hud();if(w.mode==='menu')this.menu();if(w.mode==='upgrade')this.upgrade();if(['paused','complete','defeat'].includes(w.mode))this.modal();
 }
 hud(){const c=this.c,w=this.world;
  w.heroes.filter(h=>h.ai).forEach((ai,index)=>{const x=23+index*218;skin(c,'panel-neutral',x,18,215,73);drawArt(c,'portrait-frame',x+39,56,60);c.save();c.translate(x+38,80);hero(c,{...ai,action:null,face:1,move:{x:0,y:0},gait:0,down:false,hitFlash:0,hitReaction:null,invuln:0},0,.45);c.restore();text(c,`AI · ${ROLES[ai.role].name}`,x+73,42,16);bar(c,x+73,59,116,13,ai.hp/ai.maxHp);});
  skin(c,'panel-neutral',588,17,267,60);text(c,`林间遗迹  ${String(w.room).padStart(2,'0')}`,721,40,20,CREAM,'center');text(c,w.bossRoom?`首领战 · ${w.enemies.length} 敌人`:`第 ${w.wave}/2 波 · 批次 ${w.batchSpawned}/${w.batchTotal} · ${w.enemies.length} 敌人`,721,62,12,'#c5d0ab','center');
  this.iconButton('pause',865,23,40,40,()=>this.actions.pause());this.iconButton(w.options.sound?'sound':'muted',920,23,40,40,()=>{w.options.sound=!w.options.sound;});
  skin(c,'panel-neutral',1230,18,186,125);c.save();c.beginPath();c.roundRect(1247,35,152,89,7);c.clip();c.globalAlpha=.7;c.drawImage(this.ground,1247,35,152,89);c.globalAlpha=1;
  for(const e of w.enemies)ellipse(c,1323+e.x*.118/MAP_SCALE,79+e.y*.1/MAP_SCALE,3,3,'#ee9472',null);for(const h of w.heroes)ellipse(c,1323+h.x*.118/MAP_SCALE,79+h.y*.1/MAP_SCALE,4,4,colors[h.id],null);c.restore();
  text(c,`击败 ${w.kills}`,1209,40,15,CREAM,'right');
  for(let i=0;i<w.humanCount;i++)this.playerHUD(i,w.humanCount===1?422:i===0?24:820);bar(c,476,783,488,23,w.xp/w.xpNext,'#f1c864');text(c,`小队 Lv.${w.level}  ·  ${w.xp} / ${w.xpNext}`,720,795,13,CREAM,'center');
  if(w.mode==='play'){text(c,w.enraged?'狂暴 · 小怪移速 +35% / 伤害 +30% / 冷却恢复 +40%':`狂暴倒计时 ${Math.max(0,Math.ceil(w.enrageAt-w.waveElapsed))} 秒`,720,158,14,w.enraged?'#ff986e':'#c9d5b4','center');const boss=w.enemies.find(e=>e.boss);if(boss){skin(c,'panel-gold',427,83,586,57);text(c,`荆冠古王 · 阶段 ${boss.phase}/3  ${boss.action?BOSS_SKILLS[boss.action.kind]:''}`,720,99,18,CREAM,'center');bar(c,447,118,546,12,boss.hp/boss.maxHp,'#e58a6d');}else{const next=w.spawnQueue[0],remaining=Math.max(0,Math.ceil(w.waveDuration-w.waveElapsed));text(c,next?`增援 ${Math.ceil(Math.max(0,next.at-w.waveElapsed))} 秒 · 波次剩余 ${remaining} 秒`:remaining?`波次剩余 ${remaining} 秒 · 清理残敌`:w.enemies.length?'清理残敌后选择构筑':'清波奖励即将开启…',720,104,16,CREAM,'center');}}
  if(w.mode==='play'&&w.time<8){skin(c,'button-neutral',440,620,560,32);text(c,'自动普攻 · 看准红圈闪避 · 靠近倒地队友可救援',720,636,14,'#edf0ca','center');}
 }
 iconButton(name,x,y,w,h,action){skin(this.c,'button-neutral',x,y,w,h);icon(this.c,name,x+w/2,y+h/2,13);this.regions.push({x,y,w,h,action});}
 playerHUD(i,x){const c=this.c,w=this.world,h=w.heroes[i],color=colors[i];
  skin(c,`panel-${variant(color)}`,x,665,596,107);drawArt(c,'portrait-frame',x+51,720,89);
  c.save();c.translate(x+51,749);hero(c,{...h,face:i===0?1:3,action:null,move:{x:0,y:0},gait:0,down:false,hitFlash:0,hitReaction:null,invuln:0},0,.59);c.restore();
  text(c,`P${i+1} · ${ROLES[h.role].name}`,x+101,690,18);text(c,this.router.describe(i),x+277,690,11,'#bfceae','right');bar(c,x+100,711,177,17,h.hp/h.maxHp);text(c,`${Math.ceil(h.hp)} / ${h.maxHp}`,x+101,738,16);text(c,'AUTO',x+277,738,11,'#b4c49f','right');
  text(c,`${h.core?CORES[h.core].title:'未定流派'} · 盾 ${Math.ceil(h.shield||0)}`,x+101,776,10,'#ffe096');text(c,Object.entries(h.passives).map(([key,rank])=>`${PASSIVES[key].title}${rank}`).join(' · ')||'被动：0 / 4',x+101,757,10,'#cdd7b1');
  const keys=this.router.labels(i),icons=h.role==='warrior'?['shield','spin']:h.role==='mage'?['fire','frost']:['pierce','fan'];
  for(let j=0;j<3;j++){const bx=x+310+j*88,locked=j<2&&!h.skills[j];skin(c,'skill-slot',bx,678,70,73);if(locked)text(c,'待习得',bx+35,709,15,'#a5b8a1','center');else{icon(c,j===2?'dodge':icons[j],bx+35,711,25);if(j<2)text(c,h.evolved[j]?'进化':`Lv.${h.skills[j]}`,bx+35,684,10,'#ffe096','center');}
   const cd=j===2?h.dodgeCd:h.cd[j];if(cd>0){c.save();c.fillStyle='#112b26b8';c.beginPath();c.roundRect(bx+7,685,56,53,7);c.fill();c.restore();text(c,cd.toFixed(1),bx+35,709,23,CREAM,'center');}
   skin(c,'button-neutral',bx+2,737,66,24);text(c,keys[j],bx+35,749,11,CREAM,'center');
  }
 }
 veil(alpha=.65){this.c.fillStyle=`rgba(9,27,22,${alpha})`;this.c.fillRect(0,0,W,H);}
 menu(){const c=this.c;this.veil(.45);skin(c,'panel-gold',466,35,508,146);text(c,'TOGETHER  /  ROGUELITE',720,67,13,'#c9d5b4','center');text(c,'同行 · 林间远征',720,121,43,CREAM,'center',900);
  this.button('单人 + 双 AI',478,196,228,43,()=>{this.humanCount=1;this.router.awaiting=null;},this.humanCount===1?CYAN:'#9ab38b');this.button('双人 + AI',734,196,228,43,()=>this.humanCount=2,this.humanCount===2?ORANGE:'#9ab38b');
  for(let i=0;i<2;i++){const x=255+i*485,col=colors[i],h=this.world.heroes[i],ai=i>=this.humanCount;skin(c,`card-${variant(col)}`,x,260,445,265);text(c,ai?'AI 队友':`PLAYER ${i+1}`,x+28,291,15,col);
   c.save();c.translate(x+87,439);hero(c,{...h,role:this.roles[i],face:i?3:1,action:null,move:{x:0,y:0},gait:0,down:false,hitFlash:0,hitReaction:null,invuln:0},this.animTime,1.3);c.restore();text(c,ROLES[this.roles[i]].name,x+173,340,29);text(c,ROLES[this.roles[i]].skills.join('  /  '),x+173,382,16,'#d0d9ba');
   this.button('切换职业',x+174,412,135,38,()=>this.cycleRole(i),col);text(c,ai?'自动走位 · 战斗 · 拾药 · 成长':this.router.describe(i),x+27,485,14,'#bdcdb0');if(!ai){this.button('绑定手柄',x+219,466,102,37,()=>this.router.claim(i),col);this.button('键盘',x+332,466,80,37,()=>this.router.bind(i,{type:'keyboard',id:i}),col);}
  }
  const ai=Object.keys(ROLES).find(r=>!this.roles.includes(r));text(c,`第三位队友：AI ${ROLES[ai].name}  ·  开局无技能，清波后构筑`,720,554,16,'#e0e5c9','center');this.button('出发  →',554,589,332,64,()=>this.actions.start(this.roles),CYAN);
  text(c,'P1  WASD 移动 · Q / E 技能 · 空格闪避',720,694,16,CREAM,'center');text(c,'P2  方向键移动 · 小键盘 1 / 2 技能 · 小键盘 0 闪避   |   手柄：左摇杆 + X / Y / A',720,726,14,'#cdd8ba','center');text(c,'Enter 出发 · F 全屏 · P 暂停 · 两个玩家均可绑定手柄',720,758,13,'#b2c3a5','center');if(this.router.awaiting!==null)this.claimOverlay();
 }
 claimOverlay(){const c=this.c;skin(c,`panel-${variant(colors[this.router.awaiting])}`,408,566,624,109);icon(c,'gamepad',451,614,24);text(c,`请在 P${this.router.awaiting+1} 的手柄上按任意按钮`,740,601,21,CREAM,'center');this.button('取消',662,629,116,31,()=>this.router.awaiting=null,'#9cb798');}
 upgrade(){const c=this.c,w=this.world,skills=w.rewardType==='skill';this.veil(.82);text(c,skills?'清波 · 选择构筑':'升级 · 强化属性',720,70,36,CREAM,'center');text(c,skills?'1 个流派核心 · 2 个主动与独立分支 · 4 个被动 · 配方进化':`小队 Lv.${w.level} · 选完立即回到战斗，经验溢出保留`,720,111,17,'#c9d7b8','center');
  for(let i=0;i<w.humanCount;i++){const x=w.humanCount===1?450:126+i*648,col=colors[i],h=w.heroes[i];text(c,`P${i+1} · ${ROLES[h.role].name}`,x+270,157,22,col,'center');
   for(let j=0;j<w.offers[i].length;j++){const y=180+j*112,selected=w.selection[i]===j,o=w.offers[i][j];skin(c,selected?(w.ready[i]?'card-ready':`card-${variant(col)}`):'card-neutral',x,y,540,102);icon(c,o.icon,x+45,y+48,23);text(c,o.title,x+84,y+29,21);this.wrap(o.desc,x+84,y+56,434,14);if(o.detail)text(c,o.kind==='evolution'?o.detail:['passive','core','rune'].includes(o.kind)?o.detail:'主动技能 · 清波可继续强化',x+84,y+85,11,'#f1d598');this.regions.push({x,y,w:540,h:102,action:()=>w.choose(i,j)});if(selected&&w.ready[i])icon(c,'confirm',x+507,y+27,15);}
   this.button(w.ready[i]?'已就绪 ✓':this.router.slots[i].type==='gamepad'?'确认 · A':i===0?'确认 · E':'确认 · Enter',x+70,527,400,44,()=>this.actions.confirm(i),col,w.ready[i]);
   text(c,`当前：暴击 ${Math.round(h.crit*100)}% · 闪避 ${Math.round(h.evasion*100)}% · 减伤 ${Math.round(h.armor*100)}%`,x+270,600,14,'#c9d7b8','center');
   text(c,`核心：${h.core?CORES[h.core].title:'尚未选择'}  ·  ${h.core?'流派已锁定':''}`,x+10,615,12,'#ffe096');ACTIVE[h.role].forEach((a,slot)=>{text(c,`${slot?'E':'Q'}  ${h.skills[slot]?skillName(h,slot)+' '+h.skills[slot]+(h.runes?.[slot]?' / '+RUNES[h.runes[slot]].title:''):'未习得 '+a.title}  →  ${a.title} III + ${PASSIVES[a.need].title} II`,x+10,632+slot*23,13,'#e7d9ad');});
   this.wrap('被动 '+(Object.entries(h.passives).map(([key,rank])=>PASSIVES[key].title+' '+rank).join(' / ')||'暂无'),x+10,687,520,14);
  }
  text(c,w.humanCount===1?'AI 已自动选择 · 你的确认即可继续':w.ready[0]?'等待 P2 选择':w.ready[1]?'等待 P1 选择':'战斗已暂停 · 两人独立选择，确认后继续',720,742,16,'#d0ddbf','center');
 }
 wrap(value,x,y,width,size){let line='',row=0;this.c.font=`600 ${size}px sans-serif`;for(const char of value){if(this.c.measureText(line+char).width>width){text(this.c,line,x,y+row*18,size,'#d5dfc1');line=char;row++;}else line+=char;}text(this.c,line,x,y+row*18,size,'#d5dfc1');}
 modal(){const c=this.c,w=this.world;this.veil(.69);skin(c,w.mode==='complete'?'panel-gold':'panel-neutral',393,143,654,510);
  const title=w.mode==='complete'?'配合默契，房间清理完成':w.mode==='defeat'?'小队倒下了':'暂时歇一口气';icon(c,w.mode==='complete'?'confirm':w.mode==='defeat'?'skull':'pause',720,180,18);text(c,title,720,221,30,CREAM,'center');text(c,w.mode==='paused'?w.reason:`击败 ${w.kills} 个敌人 · 小队 Lv.${w.level}`,720,261,17,'#c9d6b6','center');
  if(w.mode==='paused'){for(let i=0;i<w.humanCount;i++){text(c,`P${i+1}  ${this.router.describe(i)}`,438,315+i*56,16,colors[i]);this.button('绑定手柄',739,295+i*56,125,39,()=>this.router.claim(i),colors[i]);this.button('键盘',880,295+i*56,100,39,()=>this.router.bind(i,{type:'keyboard',id:i}),colors[i]);}
   this.button(`反馈 ${w.options.feedback?'开':'关'}`,440,424,155,40,()=>w.options.feedback=!w.options.feedback,'#9ab38b');this.button(`震屏 ${w.options.shake?'开':'关'}`,642,424,155,40,()=>w.options.shake=!w.options.shake,'#9ab38b');this.button(`判定 ${this.showDebug?'开':'关'}`,843,424,155,40,()=>this.showDebug=!this.showDebug,'#9ab38b');this.button('继续 · P',491,506,458,49,()=>this.actions.pause(),CYAN);
  }else {this.button(w.mode==='complete'?'继续下一间 →':'重新出发',491,373,458,58,()=>this.actions.proceed(),CYAN);icon(c,w.mode==='complete'?'door':'retry',526,402,17);}
  this.button('返回选人',553,582,334,40,()=>this.actions.menu(),'#839f76');if(this.router.awaiting!==null)this.claimOverlay();
 }
}
