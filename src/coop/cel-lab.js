import {loadCelWarrior,drawOriginalCel as warriorOriginal,drawCelWarrior as warriorDraw,celAssetState as warriorState} from './cel-warrior.js';
import {loadCelCompanion,drawOriginalCompanion,drawCelCompanion,companionAssetState} from './cel-companions.js';
import {celFrame,celFrameTime} from './cel-motion.js';
const $=id=>document.getElementById(id),canvas=$('cel-canvas'),c=canvas.getContext('2d'),keys=new Set();
const role=()=>$('role').value;const drawOriginalCel=(c,dir,scale)=>role()==='warrior'?warriorOriginal(c,dir,scale):drawOriginalCompanion(c,role(),dir,scale);const drawCelWarrior=(c,dir,clip,t,scale)=>role()==='warrior'?warriorDraw(c,dir,clip,t,scale):drawCelCompanion(c,role(),dir,clip,t,scale);const celAssetState=()=>role()==='warrior'?warriorState():companionAssetState(role());
let clock=0,last=0,playing=true,manual=false,ready=false,keyboard=false;
const state=()=>({mode:'cel-study',role:role(),coordinates:'canvas pixels, origin upper left; +x right,+y down',ready,clip:$('clip').value,playing,speed:+$('speed').value,overlay:$('overlay').checked,...celFrame($('clip').value,clock,{role:role()}),assets:celAssetState()});
function label(text,x,y,size=14,color='#334e3b'){c.fillStyle=color;c.font=`${size}px system-ui`;c.textAlign='center';c.fillText(text,x,y);}
function actor(x,y,dir,kind,scale,time){c.fillStyle='#3a553521';c.beginPath();c.ellipse(x,y,scale*26,scale*8,0,0,Math.PI*2);c.fill();c.save();c.translate(x,y);if(kind==='original')drawOriginalCel(c,dir,scale);else{if($('overlay').checked){c.save();c.globalAlpha=.28;drawOriginalCel(c,dir,scale);c.restore();}drawCelWarrior(c,dir,$('clip').value,time,scale);}c.restore();}
function draw(){
 c.fillStyle='#a8b493';c.fillRect(0,0,1200,860);if(!ready)return;
 for(let row=0;row<2;row++){
  const dir=['SE','NE'][row],y=300+row*270;c.fillStyle=row?'#9fae88':'#b2bd9c';c.fillRect(16,65+row*270,1168,255);
  label(row?'东北 · 背面':'东南 · 正面',87,94+row*270,13);
  for(const x of [410,820]){c.strokeStyle='#80926f55';c.beginPath();c.moveTo(x,82+row*270);c.lineTo(x,304+row*270);c.stroke();}
  actor(220,y,dir,'original',1.9,0);actor(620,y,dir,'new',1.9,clock);actor(1000,y-18,dir,'new',.8,clock);
 }
 label('原版造型',220,39,17);label('关键姿势动画',620,39,17);label('游戏尺寸参考',1000,39,17);
 const s=state();label(`当前：${{idle:'待机 · 原画稳定',walk:'走路 · 接触 / 下沉 / 经过 / 抬起',attack:'普攻 · 蓄力 / 击出 / 收势'}[s.clip]}`,600,625,15);
 for(let i=0;i<8;i++){
  const x=75+i*150;c.fillStyle=i===s.frame?'#e7e9c9':'#99aa81';c.fillRect(x-67,645,134,198);
  for(let r=0;r<2;r++){c.save();c.translate(x,733+r*88);drawCelWarrior(c,['SE','NE'][r],s.clip,celFrameTime(s.clip,i,role()),.58);c.restore();}label(String(i+1),x,837,11);
 }
 $('timeline').value=s.frame;$('frame').textContent=`${s.frame+1} / 8${s.clip==='idle'?' 相位':''}`;$('phase').textContent={idle:'待机',walk:'步态循环',windup:'蓄力',active:'击出',recovery:'收势'}[s.phase];
}
function setPlaying(value){playing=value;$('pause').textContent=playing?'暂停':'播放';}
function selectClip(value){$('clip').value=value;clock=0;draw();}
function step(n){setPlaying(false);const clip=$('clip').value,frame=(celFrame(clip,clock,{role:role()}).frame+n+8)%8;clock=celFrameTime(clip,frame,role());draw();}
$('role').onchange=()=>{keys.clear();keyboard=false;clock=0;draw();};
$('pause').onclick=()=>{setPlaying(!playing);draw();};$('prev').onclick=()=>step(-1);$('next').onclick=()=>step(1);
$('clip').onchange=()=>{keys.clear();keyboard=false;clock=0;draw();};$('overlay').onchange=draw;
$('timeline').oninput=()=>{setPlaying(false);clock=celFrameTime($('clip').value,+$('timeline').value,role());draw();};
function keyPose(){const clip=keys.has('Space')?'attack':keys.has('KeyA')||keys.has('KeyD')?'walk':'idle';if($('clip').value!==clip)selectClip(clip);}
canvas.onkeydown=e=>{if(e.code==='Escape'&&document.fullscreenElement){e.preventDefault();document.exitFullscreen();return;}if(e.code==='KeyF'){e.preventDefault();if(!document.fullscreenElement)canvas.requestFullscreen();else document.exitFullscreen();return;}if(!['KeyA','KeyD','Space'].includes(e.code))return;e.preventDefault();keyboard=true;keys.add(e.code);keyPose();setPlaying(true);};
canvas.onkeyup=e=>{keys.delete(e.code);if(keyboard)keyPose();draw();};canvas.onblur=()=>{if(keyboard){keys.clear();keyPose();keyboard=false;}};
function advance(ms){if(playing)clock+=Math.max(0,ms)/1000*+$('speed').value;draw();}
window.advanceTime=ms=>{manual=true;advance(ms);};window.render_game_to_text=()=>JSON.stringify(state());window.celLab={state,draw,step,selectClip};
const requested=new URLSearchParams(location.search).get('role');if(['warrior','mage','archer'].includes(requested))$('role').value=requested;
try{await Promise.all([loadCelWarrior(),loadCelCompanion('mage'),loadCelCompanion('archer')]);ready=true;$('status').textContent='待机保留原图，仅局部配件轻摆；三职业各 32 张完整姿势；战士已验收，法师与弓手为新小样。';draw();}catch(e){$('status').textContent=`加载失败：${e.message}`;throw e;}
function frame(t){const dt=last?Math.min(.05,(t-last)/1000):0;last=t;if(!manual)advance(dt*1000);requestAnimationFrame(frame);}requestAnimationFrame(frame);
