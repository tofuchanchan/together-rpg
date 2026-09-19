import {loadLayeredWarrior,drawLayeredWarrior,layeredAssetState,sampleEquippedWarrior} from './layered-warrior.js';
import {equipment,DEFAULT_GEAR} from './layered-pose.js';
import {actionTiming} from './combat-motion.js';
const $=id=>document.getElementById(id),canvas=$('rig-canvas'),c=canvas.getContext('2d'),names=['东','东南','南','西南','西','西北','北','东北'];
const original=new Image();original.src='assets/characters/warrior.png';
let clock=0,last=0,playing=true,manual=false,gear=equipment(),keys=new Set();
await Promise.all([loadLayeredWarrior(),original.decode()]);const old=await(await fetch('assets/characters/warrior.json')).json();
export function previewPose(face,q=clock,clip=$('clip').value){
 const running=['run','backstep','strafe','run-attack'].includes(clip),moveAngle=(face+(clip==='backstep'?4:clip==='strafe'?2:0))*Math.PI/4;
 const type=['attack','run-attack'].includes(clip)?'attack':clip,timing=type==='dodge'?{duration:.29}:actionTiming('warrior',type);
 return {id:0,role:'warrior',face,gait:running?1:0,stride:q*Math.PI*2/2.2,move:{x:running?Math.cos(moveAngle):0,y:running?Math.sin(moveAngle):0},
 action:['attack','run-attack','bash','dodge'].includes(clip)?{type,...timing,t:q*timing.duration,facing:face}:null,
 hitReaction:clip==='hit'?{x:1,y:0,life:(1-q)*.3,max:.3}:null};
}
function label(text,x,y,size=16,color='#f5edce'){c.fillStyle=color;c.font=`${size}px system-ui`;c.textAlign='center';c.fillText(text,x,y);}
function shadow(x,y,r=34){c.fillStyle='#38573255';c.beginPath();c.ellipse(x,y,r,r*.3,0,0,Math.PI*2);c.fill();}
function originalAt(face,x,y,scale){const row=[6,7,0,1,2,3,4,5][face],f=old.frames[row*4],u=old.displayScale*scale;c.drawImage(original,f.x,f.y,256,256,x-128*u,y-210*u,256*u,256*u);}
function draw(){
 c.fillStyle='#8e9e76';c.fillRect(0,0,1200,830);c.fillStyle='#7c9165';c.fillRect(16,16,1168,300);c.strokeStyle='#60734f';c.beginPath();c.moveTo(600,35);c.lineTo(600,295);c.stroke();
 const face=+$('direction').value,q=((clock%1)+1)%1,h=previewPose(face,q);
 label('原版造型 · 静态对照',300,47,18);label('独立分层 · 实时装配',900,47,18);
 shadow(300,274,58);originalAt(face,300,274,1.75);shadow(900,274,58);
 c.save();c.translate(900,274);drawLayeredWarrior(c,h,q*Math.PI*2/2.2,1.75,{gear,debug:$('debug').checked,explode:+$('explode').value});c.restore();
 for(let d=0;d<8;d++){
  const x=150+(d%4)*300,y=510+Math.floor(d/4)*240;c.fillStyle=(d===face?'#809869':'#81946d');c.fillRect(x-135,y-167,270,214);
  shadow(x,y,35);c.save();c.translate(x,y);drawLayeredWarrior(c,previewPose(d,q),q*Math.PI*2/2.2,1.08,{gear,debug:$('debug').checked,explode:+$('explode').value*.6});c.restore();label(names[d],x,y+29,16);
 }
 $('timeline').value=Math.min(59,Math.floor(q*60+1e-7));$('frame').textContent=`${Math.min(59,Math.floor(q*60+1e-7))+1} / 60`;
 $('status').textContent=`${$('clip').selectedOptions[0].text} · 144 个独立部件 · 八方向均可实时换装`;
}
function syncGear(){gear=equipment(Object.fromEntries(Object.keys(DEFAULT_GEAR).map(k=>[k,$(k).value])));const params=new URLSearchParams({warriorRig:'layered',...gear});$('battle').href=`index.html?${params}`;draw();}
for(const slot of Object.keys(DEFAULT_GEAR))$(slot).onchange=syncGear;
function pause(){playing=!playing;$('pause').textContent=playing?'暂停':'播放';}
function step(n){playing=false;$('pause').textContent='播放';clock=((Math.floor(clock*60+1e-7)+n+60)%60)/60;draw();}
$('pause').onclick=pause;$('prev').onclick=()=>step(-1);$('next').onclick=()=>step(1);
$('timeline').oninput=()=>{playing=false;$('pause').textContent='播放';clock=+$('timeline').value/60;draw();};
$('clip').onchange=()=>{clock=0;draw();};$('direction').onchange=$('debug').onchange=$('explode').oninput=draw;
$('reset').onclick=()=>{for(const [k,v] of Object.entries(DEFAULT_GEAR))$(k).value=v;$('explode').value=0;syncGear();};
function config(){return{version:1,character:'warrior',appearance:{...gear},asset:'assets/characters/layered/warrior.json',direction:+$('direction').value,clip:$('clip').value};}
$('export').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(config(),null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='warrior-appearance.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
const controls=['KeyW','KeyA','KeyS','KeyD','KeyJ','Space'];
function keyPose(){const x=Number(keys.has('KeyD'))-Number(keys.has('KeyA')),y=Number(keys.has('KeyS'))-Number(keys.has('KeyW'));if(x||y)$('direction').value=((Math.round(Math.atan2(y,x)/(Math.PI/4))+8)%8).toString();$('clip').value=keys.has('Space')?'dodge':keys.has('KeyJ')?(x||y?'run-attack':'attack'):x||y?'run':'idle';}
canvas.onkeydown=e=>{if(!controls.includes(e.code))return;e.preventDefault();if(!e.repeat&&['KeyJ','Space'].includes(e.code))clock=0;keys.add(e.code);keyPose();playing=true;$('pause').textContent='暂停';};
canvas.onkeyup=e=>{if(!controls.includes(e.code))return;keys.delete(e.code);keyPose();draw();};canvas.onblur=()=>{if(keys.size){keys.clear();keyPose();draw();}};
function frame(t){const dt=last?Math.min(.05,(t-last)/1000):0;last=t;if(!manual&&playing)clock=(clock+dt*+$('speed').value)%1;draw();requestAnimationFrame(frame);}
window.layeredLab={ready:true,draw,step,config,pose:previewPose,sample:()=>sampleEquippedWarrior(previewPose(+$('direction').value),clock*Math.PI*2/2.2,gear)};
window.render_game_to_text=()=>JSON.stringify({mode:'layered-lab',coordinates:'rig-local, pixels, origin at feet, +x right, +y down; before root transform',assets:layeredAssetState(),playing,phase:clock,...config(),sockets:window.layeredLab.sample().sockets});
window.advanceTime=ms=>{manual=true;if(playing)clock=(clock+Math.max(0,ms)/1000*+$('speed').value)%1;draw();};
syncGear();requestAnimationFrame(frame);
