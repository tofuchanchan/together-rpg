import {ROLES,clamp} from './model.js';
import {hero} from './sprites.js';
import {text,ellipse,CREAM,CYAN,ORANGE} from './art.js';
import {drawArt,drawContent,skin} from './world-assets.js';
import {enemy,rock,makeGround,bar,icon,actorShadow,playerRing,warning,effect,projectile,heroAction,SCENE_PROPS,sceneProp} from './world-art.js';
const W=1440,H=810,colors=[CYAN,ORANGE,'#e1d7aa'];
const variant=color=>color===CYAN?'cyan':color===ORANGE?'orange':'neutral';

export class View{
 constructor(canvas,world,router,actions){this.c=canvas.getContext('2d');this.world=world;this.router=router;this.actions=actions;this.ground=makeGround();this.regions=[];this.roles=['warrior','mage'];this.showDebug=false;this.animTime=0;this.displayPoses=new Map();}
 button(label,x,y,w,h,action,color=CYAN,disabled=false){skin(this.c,`button-${disabled?'disabled':variant(color)}`,x,y,w,h);text(this.c,label,x+w/2,y+h/2,17,CREAM,'center');if(!disabled)this.regions.push({x,y,w,h,action});}
 click(x,y){const b=[...this.regions].reverse().find(r=>x>=r.x&&y>=r.y&&x<=r.x+r.w&&y<=r.y+r.h);if(b)b.action();}
 cycleRole(slot){const keys=Object.keys(ROLES);let i=keys.indexOf(this.roles[slot]);do{i=(i+1)%3;}while(keys[i]===this.roles[1-slot]);this.roles[slot]=keys[i];}
 draw(dt=0){
  this.animTime+=dt;const c=this.c,w=this.world;this.regions=[];c.clearRect(0,0,W,H);c.fillStyle='#173f34';c.fillRect(0,0,W,H);
  c.save();let sx=0,sy=0;if(w.options.shake&&w.options.feedback&&w.shake>0){sx=Math.sin(w.time*93)*w.shake*17;sy=Math.cos(w.time*109)*w.shake*12;}
  c.translate(720+sx-w.camera.x*w.camera.zoom,369+sy-w.camera.y*.707*w.camera.zoom);c.scale(w.camera.zoom,w.camera.zoom);c.drawImage(this.ground,-800,-550);
  if(w.options.feedback)for(const f of w.effects)if(['frost','impact'].includes(f.type))effect(c,f);
  for(const e of w.enemies)if(e.action&&!e.action.hit)warning(c,e.action);
  const actors=[...SCENE_PROPS.map(p=>({...p,prop:true})),...w.obstacles.map(o=>({...o,obstacle:true})),...w.enemies,...w.heroes].sort((a,b)=>a.y-b.y);
  for(const h of actors){
   if(h.prop){sceneProp(c,h);continue;}
   c.save();c.translate(h.x,h.y*.707);if(h.obstacle){rock(c,0,0,h.r);c.restore();continue;}
   const allied=h.role!==undefined;actorShadow(c,0,1,allied?28:h.kind==='mushroom'?42:27);
   if(allied){
    const col=colors[h.id],a=h.action;playerRing(c,0,0,33,h.id);
    if(a?.type==='dodge'&&w.options.feedback){for(let i=3;i>0;i--){c.save();c.globalAlpha=(4-i)*.055;c.translate(-a.dir.x*i*17,-a.dir.y*i*12);hero(c,h,w.time);c.restore();}}
    let drawH=h;if(h.visualStop>0&&w.options.feedback&&this.displayPoses.has(h.id)){const cached=this.displayPoses.get(h.id);drawH={...h,action:cached.action,stride:cached.stride};}else this.displayPoses.set(h.id,{action:h.action?{...h.action}:null,stride:h.stride});
    hero(c,drawH,w.time);if(w.options.feedback)heroAction(c,drawH);
    const top=h.role==='mage'?-126:-116;skin(c,`button-${h.id===2?'neutral':variant(col)}`,-18,top-29,36,25);text(c,h.ai?'AI':`P${h.id+1}`,0,top-16,13,CREAM,'center');bar(c,-28,top,56,10,h.hp/h.maxHp,h.down?'#eea467':'#9edb7b');
    if(h.down){text(c,'靠近救援',0,24,13,CREAM,'center');bar(c,-31,36,62,10,h.revive/2,'#efd276');}
   }else{
    enemy(c,h,w.time);if(h.hp<h.maxHp)bar(c,-25,h.kind==='mushroom'?-142:-104,50,9,h.hp/h.maxHp,'#e58a6d');
    if(h.hitFlash>0&&w.options.feedback)drawArt(c,`hit-${Math.max(0,Math.min(3,Math.floor((1-h.hitFlash/.13)*4)))}`,0,h.kind==='mushroom'?-65:-42,57,57,{alpha:.85});
   }
   c.restore();
  }
  for(const p of w.projectiles)projectile(c,p,w.time);
  if(w.options.feedback)for(const f of w.effects){
   if(f.type==='number'){c.save();c.globalAlpha=Math.min(1,f.life*3);c.shadowColor='#253323';c.shadowBlur=2;text(c,f.text,f.x,f.y*.707-107-(1-f.life/f.max)*28,20,f.color,'center',900);c.restore();}
   else if(!['frost','impact'].includes(f.type))effect(c,f);
  }
  if(this.showDebug){for(const h of w.heroes){ellipse(c,h.x,h.y*.707,17,12,'#00000000','#afffea',1);text(c,`${h.face} / ${h.action?.type||'idle'}`,h.x,h.y*.707+40,11,'#e4f7da','center');}for(const e of w.enemies)if(e.action)ellipse(c,e.action.x,e.action.y*.707,e.action.r,e.action.r*.707,'#00000000','#ff577e',2);}
  c.restore();if(w.mode!=='menu')this.hud();if(w.mode==='menu')this.menu();if(w.mode==='upgrade')this.upgrade();if(['paused','complete','defeat'].includes(w.mode))this.modal();
 }
 hud(){const c=this.c,w=this.world,ai=w.heroes[2];
  skin(c,'panel-neutral',23,18,215,73);drawArt(c,'portrait-frame',62,56,60);c.save();c.translate(61,80);hero(c,{...ai,action:null,face:1,move:{x:0,y:0},down:false,hitFlash:0},0,.45);c.restore();text(c,`AI · ${ROLES[ai.role].name}`,96,42,16);bar(c,96,59,116,13,ai.hp/ai.maxHp);
  skin(c,'panel-neutral',588,17,267,60);text(c,`林间遗迹  ${String(w.room).padStart(2,'0')}`,721,40,20,CREAM,'center');text(c,`第 ${w.wave} / 2 波  ·  ${w.enemies.length} 敌人`,721,62,12,'#c5d0ab','center');
  this.iconButton('pause',865,23,40,40,()=>this.actions.pause());this.iconButton(w.options.sound?'sound':'muted',920,23,40,40,()=>{w.options.sound=!w.options.sound;});
  skin(c,'panel-neutral',1230,18,186,125);c.save();c.beginPath();c.roundRect(1247,35,152,89,7);c.clip();c.globalAlpha=.7;c.drawImage(this.ground,1247,35,152,89);c.globalAlpha=1;
  for(const e of w.enemies)ellipse(c,1323+e.x*.118,79+e.y*.1,3,3,'#ee9472',null);for(const h of w.heroes)ellipse(c,1323+h.x*.118,79+h.y*.1,4,4,colors[h.id],null);c.restore();
  text(c,`击败 ${w.kills}`,1209,40,15,CREAM,'right');
  for(let i=0;i<2;i++)this.playerHUD(i,i===0?24:820);bar(c,476,771,488,23,w.xp/11,'#f1c864');text(c,`小队 Lv.${w.level}`,720,783,13,CREAM,'center');
  if(w.mode==='play'&&!w.enemies.length)text(c,w.wave===1?'下一波即将抵达…':'房间已清理',720,153,23,CREAM,'center');
  if(w.mode==='play'&&w.time<8){skin(c,'button-neutral',440,620,560,32);text(c,'自动普攻 · 看准红圈闪避 · 靠近倒地队友可救援',720,636,14,'#edf0ca','center');}
 }
 iconButton(name,x,y,w,h,action){skin(this.c,'button-neutral',x,y,w,h);icon(this.c,name,x+w/2,y+h/2,13);this.regions.push({x,y,w,h,action});}
 playerHUD(i,x){const c=this.c,w=this.world,h=w.heroes[i],color=colors[i];
  skin(c,`panel-${variant(color)}`,x,665,596,107);drawArt(c,'portrait-frame',x+51,720,89);
  c.save();c.translate(x+51,749);hero(c,{...h,face:i===0?1:3,action:null,move:{x:0,y:0},down:false,hitFlash:0},0,.59);c.restore();
  text(c,`P${i+1} · ${ROLES[h.role].name}`,x+101,690,18);text(c,this.router.describe(i),x+277,690,11,'#bfceae','right');bar(c,x+100,711,177,17,h.hp/h.maxHp);text(c,`${Math.ceil(h.hp)} / ${h.maxHp}`,x+101,747,16);text(c,'AUTO',x+277,747,11,'#b4c49f','right');
  const keys=this.router.labels(i),icons=h.role==='warrior'?['shield','spin']:h.role==='mage'?['fire','frost']:['pierce','fan'];
  for(let j=0;j<3;j++){const bx=x+310+j*88;skin(c,'skill-slot',bx,678,70,73);icon(c,j===2?'dodge':icons[j],bx+35,711,25);
   const cd=j===2?h.dodgeCd:h.cd[j];if(cd>0){c.save();c.fillStyle='#112b26b8';c.beginPath();c.roundRect(bx+7,685,56,53,7);c.fill();c.restore();text(c,cd.toFixed(1),bx+35,709,23,CREAM,'center');}
   skin(c,'button-neutral',bx+2,737,66,24);text(c,keys[j],bx+35,749,11,CREAM,'center');
  }
 }
 veil(alpha=.65){this.c.fillStyle=`rgba(9,27,22,${alpha})`;this.c.fillRect(0,0,W,H);}
 menu(){const c=this.c;this.veil(.45);skin(c,'panel-gold',466,67,508,146);text(c,'TOGETHER  /  LOCAL CO-OP',720,99,13,'#c9d5b4','center');text(c,'同行 · 林间远征',720,153,43,CREAM,'center',900);text(c,'两个人，一支小队。走位、出招，把彼此带出密林。',720,233,18,CREAM,'center');
  for(let i=0;i<2;i++){const x=255+i*485,col=colors[i],h=this.world.heroes[i];skin(c,`card-${variant(col)}`,x,260,445,265);text(c,`PLAYER ${i+1}`,x+28,291,15,col);
   c.save();c.translate(x+87,439);hero(c,{...h,role:this.roles[i],face:i?3:1,action:null,move:{x:0,y:0},down:false,hitFlash:0},this.animTime,1.3);c.restore();text(c,ROLES[this.roles[i]].name,x+173,340,29);text(c,ROLES[this.roles[i]].skills.join('  /  '),x+173,382,16,'#d0d9ba');
   this.button('切换职业',x+174,412,135,38,()=>this.cycleRole(i),col);text(c,this.router.describe(i),x+27,485,14,'#bdcdb0');this.button('绑定手柄',x+219,466,102,37,()=>this.router.claim(i),col);this.button('键盘',x+332,466,80,37,()=>this.router.bind(i,{type:'keyboard',id:i}),col);
  }
  const ai=Object.keys(ROLES).find(r=>!this.roles.includes(r));text(c,`第三位队友：AI ${ROLES[ai].name}  ·  两位玩家的职业不可重复`,720,554,16,'#e0e5c9','center');this.button('出发  →',554,589,332,64,()=>this.actions.start(this.roles),CYAN);
  text(c,'P1  WASD 移动 · Q / E 技能 · 空格闪避',720,694,16,CREAM,'center');text(c,'P2  方向键移动 · 小键盘 1 / 2 技能 · 小键盘 0 闪避   |   手柄：左摇杆 + X / Y / A',720,726,14,'#cdd8ba','center');text(c,'Enter 出发 · F 全屏 · P 暂停 · 两个玩家均可绑定手柄',720,758,13,'#b2c3a5','center');if(this.router.awaiting!==null)this.claimOverlay();
 }
 claimOverlay(){const c=this.c;skin(c,`panel-${variant(colors[this.router.awaiting])}`,408,566,624,109);icon(c,'gamepad',451,614,24);text(c,`请在 P${this.router.awaiting+1} 的手柄上按任意按钮`,740,601,21,CREAM,'center');this.button('取消',662,629,116,31,()=>this.router.awaiting=null,'#9cb798');}
 upgrade(){const c=this.c,w=this.world;this.veil(.67);text(c,'一起变强',720,112,42,CREAM,'center');text(c,`小队 Lv.${w.level}  ·  每人选择一项强化`,720,161,18,'#c9d7b8','center');
  for(let i=0;i<2;i++){const x=126+i*648,col=colors[i];text(c,`P${i+1} · ${ROLES[w.heroes[i].role].name}`,x+240,211,24,col,'center');
   for(let j=0;j<3;j++){const y=245+j*109,selected=w.selection[i]===j;skin(c,selected?(w.ready[i]?'card-ready':`card-${variant(col)}`):'card-neutral',x,y,540,93);icon(c,w.offers[i][j].icon,x+49,y+46,25);text(c,w.offers[i][j].title,x+94,y+31,22);text(c,w.offers[i][j].desc,x+94,y+63,16,'#d5dfc1');this.regions.push({x,y,w:540,h:93,action:()=>w.choose(i,j)});if(selected&&w.ready[i])icon(c,'confirm',x+505,y+45,18);}
   this.button(w.ready[i]?'已就绪 ✓':this.router.slots[i].type==='gamepad'?'确认 · A':i===0?'确认 · E':'确认 · Enter',x+70,590,400,49,()=>this.actions.confirm(i),col,w.ready[i]);
  }
  text(c,w.ready[0]?'等待 P2 选择':w.ready[1]?'等待 P1 选择':'战斗已暂停 · 各自选择，双方就绪后继续',720,664,16,'#d0ddbf','center');
 }
 modal(){const c=this.c,w=this.world;this.veil(.69);skin(c,w.mode==='complete'?'panel-gold':'panel-neutral',393,143,654,510);
  const title=w.mode==='complete'?'配合默契，房间清理完成':w.mode==='defeat'?'小队倒下了':'暂时歇一口气';icon(c,w.mode==='complete'?'confirm':w.mode==='defeat'?'skull':'pause',720,180,18);text(c,title,720,221,30,CREAM,'center');text(c,w.mode==='paused'?w.reason:`击败 ${w.kills} 个敌人 · 小队 Lv.${w.level}`,720,261,17,'#c9d6b6','center');
  if(w.mode==='paused'){for(let i=0;i<2;i++){text(c,`P${i+1}  ${this.router.describe(i)}`,438,315+i*56,16,colors[i]);this.button('绑定手柄',739,295+i*56,125,39,()=>this.router.claim(i),colors[i]);this.button('键盘',880,295+i*56,100,39,()=>this.router.bind(i,{type:'keyboard',id:i}),colors[i]);}
   this.button(`反馈 ${w.options.feedback?'开':'关'}`,440,424,155,40,()=>w.options.feedback=!w.options.feedback,'#9ab38b');this.button(`震屏 ${w.options.shake?'开':'关'}`,642,424,155,40,()=>w.options.shake=!w.options.shake,'#9ab38b');this.button(`判定 ${this.showDebug?'开':'关'}`,843,424,155,40,()=>this.showDebug=!this.showDebug,'#9ab38b');this.button('继续 · P',491,506,458,49,()=>this.actions.pause(),CYAN);
  }else {this.button(w.mode==='complete'?'继续下一间 →':'重新出发',491,373,458,58,()=>this.actions.proceed(),CYAN);icon(c,w.mode==='complete'?'door':'retry',526,402,17);}
  this.button('返回选人',553,582,334,40,()=>this.actions.menu(),'#839f76');if(this.router.awaiting!==null)this.claimOverlay();
 }
}
