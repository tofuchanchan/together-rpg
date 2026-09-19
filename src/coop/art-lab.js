import {loadWorldArt,worldArtState,drawArt,skin,frameInfo} from './world-assets.js';
import {enemy,effect,actorShadow} from './world-art.js';
import {WORLD_SHEETS} from './world-art-defs.js';
import {ENEMIES} from './enemies.js';
import {text} from './art.js';
const $=id=>document.getElementById(id),ctx=id=>$(id).getContext('2d');
await loadWorldArt();
let time=0,paused=false,last=performance.now();
const directionNames=['东','东南','南','西南','西','西北','北','东北'];
const names={
 'rock-large':'苔石','rock-small':'碎石','stump':'树桩','barrel':'木桶','pillar':'残柱','banner':'远征旗','bush':'灌木','fern':'蕨草','mushrooms':'蘑菇丛','arch':'遗迹拱门','tree':'树','canopy':'前景树冠',
 shield:'盾冲',spin:'旋风斩',fire:'火球',frost:'冰霜环',pierce:'贯穿箭',fan:'扇射',dodge:'闪避',sword:'武器',heart:'生命',boot:'移速',heal:'补给',focus:'技能强化',pause:'暂停',sound:'声音',muted:'静音',retry:'重试',confirm:'就绪',gamepad:'手柄',door:'下一间',skull:'倒地',
 'bolt-0':'魔法弹 1','bolt-1':'魔法弹 2','bolt-2':'魔法弹 3','bolt-3':'魔法弹 4','fireball-0':'火球 1','fireball-1':'火球 2','fireball-2':'火球 3','fireball-3':'火球 4','arrow':'普通箭','pierce-arrow':'贯穿箭','heal-burst':'救援光芒','shield-burst':'盾冲冲击','shadow':'脚下阴影','ring-cyan':'P1 标记','ring-orange':'P2 标记','warning-ring':'敌方预警',
 'panel-neutral':'中性面板','panel-cyan':'P1 面板','panel-orange':'P2 面板','panel-gold':'清房面板','card-neutral':'普通卡片','card-cyan':'P1 选中','card-orange':'P2 选中','card-ready':'已就绪','button-neutral':'普通按钮','button-cyan':'P1 按钮','button-orange':'P2 按钮','button-disabled':'禁用按钮','skill-slot':'技能槽','portrait-frame':'头像框','health-fill':'血量','xp-fill':'经验'
};
function base(id){const c=ctx(id);c.clearRect(0,0,c.canvas.width,c.canvas.height);c.fillStyle=id==='ui'?'#193e33':'#78936c';c.fillRect(0,0,c.canvas.width,c.canvas.height);return c;}
function enemies(){const c=base('enemies'),clip=$('clip').value;for(let row=0;row<2;row++){const kind=row?'mushroom':'goblin';for(let face=0;face<8;face++){
 const x=80+face*160,y=171+row*200;c.save();c.translate(x,y);if(row)c.scale(.74,.74);actorShadow(c,0,0,row?39:29);enemy(c,{kind,x:0,y:0,face,stride:time*2.8,slow:0,hitFlash:0,action:clip==='move'?null:{x:0,y:0,hit:clip==='strike',t:.2,windup:.6}},time);c.restore();text(c,directionNames[face],x,y+22,14,'#203d2d','center');
 }}$('phase').textContent=`${Math.floor(time*2.8)%2+1} / 2 步态`;}
function effects(){const c=base('effects'),labels=['剑弧','旋风斩','冰霜环','火焰爆破','命中火花','尘雾'];['slash','spin','frost','blast','hit','dust'].forEach((type,i)=>{
 const x=213+(i%3)*426,y=95+Math.floor(i/3)*210,q=time%1;drawArt(c,`${type}-${Math.min(3,Math.floor(q*4))}`,x,y,180,type==='frost'||type==='spin'?132:180,{alpha:Math.min(1,(1-q)*3)});text(c,labels[i],x,y+85,16,'#203d2d','center');
 });}
function grid(id,columns,cellH){const c=base(id),sheet=WORLD_SHEETS.find(s=>s.source===id),cellW=c.canvas.width/columns;sheet.keys.forEach((key,i)=>{const x=(i%columns+.5)*cellW,y=Math.floor(i/columns)*cellH;const size=id==='props'?174:id==='icons'?90:86;drawArt(c,key,x,y+(id==='props'?230:cellH*.42),size,size);text(c,names[key]||key,x,y+cellH-22,14,'#203d2d','center');});}
function ui(){const c=base('ui'),keys=WORLD_SHEETS.find(s=>s.source==='ui').keys;keys.forEach((key,i)=>{const x=(i%4)*320+18,y=Math.floor(i/4)*150+12;if(i<12)skin(c,key,x,y,284,i<8?105:66);else drawArt(c,key,x+142,y+54,key.includes('fill')?250:106,key.includes('fill')?95:106);text(c,names[key],x+142,y+125,14,'#ecedcc','center');});}
function draw(){enemies();effects();const c=base('bestiary');Object.entries(ENEMIES).slice(2).forEach(([kind,d],i)=>{const x=160+(i%4)*320,y=155+Math.floor(i/4)*210;for(let pose=0;pose<4;pose++){c.save();c.translate(x-110+pose*73,y);c.scale(.62,.62);enemy(c,{kind,face:0,stride:pose===1?.7:0,action:pose<2?null:{x:0,y:0,hit:pose===3}},time);c.restore();}text(c,d.name,x,y+30,16,'#203d2d','center');});}
grid('props',6,295);grid('icons',10,210);grid('projectiles',8,185);ui();draw();
$('pause').onclick=()=>{paused=!paused;$('pause').textContent=paused?'播放':'暂停';};
$('step').onclick=()=>{paused=true;$('pause').textContent='播放';time+=.25;draw();};$('clip').onchange=draw;
function animate(now){const dt=Math.max(0,Math.min(.05,(now-last)/1000));last=now;if(!paused){time+=dt*Number($('speed').value);draw();}requestAnimationFrame(animate);}requestAnimationFrame(animate);
const state=worldArtState();$('status').textContent=`已载入 ${state.pages} 张图集、${state.frames} 个透明单元与 1 张场景背景。`;
window.artLab={ready:true,draw,freeze:t=>{paused=true;time=t;draw();},state};
