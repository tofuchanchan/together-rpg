import {ellipse,box,text} from './art.js';
import {hero,loadCharacterSprites} from './sprites.js';
const directions=['东','东南','南','西南','西','西北','北','东北'];
const $=s=>document.querySelector(s),canvas=$('#sheet'),c=canvas.getContext('2d');
let clock=0,playing=true,last=0;
$('#hint').textContent='正在加载三职业精灵图…';
try{await loadCharacterSprites();}catch(error){$('#hint').textContent=`素材加载失败：${error.message}`;throw error;}
export function pose(role,clip,dir,q){
 const angle=dir*Math.PI/4,skills=role==='warrior'?['bash','spin']:role==='mage'?['fireball','frost']:['pierce','fan'];
 const type=clip==='skill1'?skills[0]:clip==='skill2'?skills[1]:clip==='run-attack'?'attack':clip,running=clip==='run'||clip==='run-attack';
 return{id:0,role,face:dir,move:{x:running?Math.cos(angle):0,y:running?Math.sin(angle):0},stride:q,
  action:['idle','run'].includes(type)?null:{type,t:q,duration:1,dir:{x:Math.cos(angle),y:Math.sin(angle)}},hitFlash:0,down:false};
}
function draw(){
 const role=$('#role').value,clip=$('#clip').value,q=(Math.floor(clock*16)%16)/16;c.clearRect(0,0,1344,490);
 for(let d=0;d<8;d++){
  const x=168+(d%4)*336,y=185+Math.floor(d/4)*235;
  box(c,x-153,y-162,306,215,18,'#7b9569','#537a58',2);ellipse(c,x,y,40,13,'#46674980',null);
  c.save();c.translate(x,y);hero(c,pose(role,clip,d,q),q*2,1.32);c.restore();
  text(c,`${directions[d]} / ${d*45}°`,x,y+34,17,'#f6edc8','center');
 }
 $('#timeline').value=Math.floor(q*16);$('#frame').textContent=`${Math.floor(q*16)+1} / 16`;
 $('#hint').textContent=`${$('#role').selectedOptions[0].text} · ${$('#clip').selectedOptions[0].text} · PNG 关键姿态播放 / 时间轴 16 等分`;
}
function raf(t){const dt=last?(t-last)/1000:0;last=t;if(playing)clock=(clock+Math.min(.1,dt)*Number($('#speed').value))%1;draw();requestAnimationFrame(raf);}
$('#pause').onclick=()=>{playing=!playing;$('#pause').textContent=playing?'暂停':'播放';};
function step(n){playing=false;$('#pause').textContent='播放';clock=((Math.floor(clock*16)+n+16)%16)/16;draw();}
$('#next').onclick=()=>step(1);$('#prev').onclick=()=>step(-1);
$('#timeline').oninput=()=>{playing=false;$('#pause').textContent='播放';clock=+$('#timeline').value/16;draw();};
$('#role').onchange=$('#clip').onchange=()=>{clock=0;draw();};
window.exportBeanAtlas=async role=>{
 const [response,metadata]=await Promise.all([fetch(`assets/characters/${role}.png`),fetch(`assets/characters/${role}.json`)]);
 if(!response.ok||!metadata.ok)throw new Error('精灵图下载失败');
 const blob=await response.blob(),manifest=await metadata.json();
 const png=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob);});
 return{png,manifest};
};
$('#export').onclick=async()=>{const role=$('#role').value,{png}=await exportBeanAtlas(role),a=document.createElement('a');a.href=png;a.download=`${role}-illustrated-atlas.png`;a.click();};
window.beanLab={pose,draw,step,ready:true};draw();requestAnimationFrame(raf);
