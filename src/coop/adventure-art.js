import {decodeArt} from './decode-art.js';
import {MOSSBELL_SIZE} from './mossbell.js';
let pending,manifest;const images=new Map();
export function loadAdventureArt(){return pending??=(async()=>{const base=new URL('../../assets/adventure/',import.meta.url),r=await fetch(new URL('manifest.json',base));if(!r.ok)throw Error('冒险素材清单加载失败');manifest=await r.json();await Promise.all(Object.entries(manifest.assets).map(async([key,a])=>{const image=new Image();image.src=new URL(a.file,base).href;await decodeArt(image);if(image.width!==a.width||image.height!==a.height)throw Error(`冒险素材尺寸不符：${key}`);images.set(key,image);}));})();}
export function adventureArtState(){return{ready:!!manifest&&images.size===Object.keys(manifest.assets).length,assets:[...images.keys()],frames:manifest?Object.values(manifest.assets).reduce((n,a)=>n+a.frames.length,0):0};}
export function drawAdventureSprite(c,key,frame,x,y,height,alpha=1){
 const a=manifest?.assets[key],image=images.get(key);if(!a||!image)return false;
 const f=a.frames[Math.max(0,Math.min(a.frames.length-1,frame))],scale=height/a.referenceHeight;
 const anchor=f.anchor||{x:f.w/2,y:f.h};
 c.save();c.globalAlpha*=alpha;
 if(f.clip){c.beginPath();for(const [left,top,w,h] of f.clip)c.rect(x+(left-anchor.x)*scale,y+(top-anchor.y)*scale,w*scale,h*scale);c.clip();}
 c.drawImage(image,f.x,f.y,f.w,f.h,x-anchor.x*scale,y-anchor.y*scale,f.w*scale,f.h*scale);c.restore();return true;
}
const pose=(asset,frame,offset=0)=>({asset,frame,offset});
const heldFrame=(t,stops)=>stops.find(([until])=>t<until)?.[1]??stops.at(-1)[1];
export function bossPose(e,time){
 const a=e.action;if(!a)return pose('mossbell',[0,1,2,3,2,1][Math.floor((e.stride||0)*6)%6]);
 const q=Math.min(1,a.t/a.windup),after=Math.max(0,a.t-a.windup);
 // Authored cels use the combat clock: the rapid release lands on the damage
 // frame; anticipation and recovery retain the full dodge / punish windows.
 if(a.kind==='sweep')return pose('mossbell-sweep-v2',q<1?heldFrame(q,[[.16,0],[.34,1],[.55,2],[.75,3],[.91,4],[.97,5],[1,6]]):heldFrame(after,[[.09,7],[.19,8],[.37,9],[.65,10],[2,11]]));
 if(a.kind==='roots'||a.kind==='summon')return pose('mossbell-ritual-v2',q<1?heldFrame(q,[[.16,0],[.38,1],[.64,2],[1,3]]):heldFrame(after,[[.13,4],[.3,5],[.49,6],[2,7]]));
 if(a.kind==='leap'){const flight=Math.max(0,Math.min(1,(q-.45)/.55));return pose('mossbell',q<.45?10:q<1?0:11,-Math.sin(flight*Math.PI)*100);}
 if(a.kind==='transition')return pose('mossbell-ritual-v2',8+Math.min(7,Math.floor(a.t/a.duration*8)));
 if(a.kind==='ultimate'){
  if(q<1)return pose('mossbell-bell-v2',heldFrame(q,[[.18,0],[.37,1],[.6,2],[1,3]]));
  if(after<1.4){const pulse=after%.7;return pose('mossbell-bell-v2',pulse<.16?4:pulse<.36?5:6);}
  if(after<1.58)return pose('mossbell-bell-v2',6);
  if(after<1.85)return pose('mossbell-bell-v2',7);
  return pose('mossbell-bell-v2',[8,9,10,11,10,9][Math.floor((after-1.85)*5)%6]);
 }
 if(a.kind==='stagger')return pose('mossbell-bell-v2',[8,9,10,11,10,9][Math.floor(a.t*5)%6]);
 return pose('mossbell',0);
}
export function drawAdventureActor(c,e,time){
 if(e.kind==='mossbell'){
  const pose=bossPose(e,time);c.save();if(e.face<3||e.face>5)c.scale(-1,1);if(e.hitFlash>0)c.filter='brightness(1.25)';
  // Keep each cel rigid and registered at the feet, independent of weapon bounds.
  const a=e.action,q=a?Math.min(1,a.t/a.windup):0,after=a?Math.max(0,a.t-a.windup):0;
  const settle=a&&['leap','roots'].includes(a.kind)&&q===1?Math.sin(after*19)*Math.exp(-after*7)*5:0;
  const size=e.stats?.size||MOSSBELL_SIZE,asset=manifest?.assets[pose.asset],frame=asset?.frames[pose.frame],scale=asset?size/asset.referenceHeight:1;
  drawAdventureSprite(c,pose.asset,pose.frame,0,pose.offset+settle,size);
  if(frame?.core){
   const x=(frame.core.x-frame.anchor.x)*scale,y=(frame.core.y-frame.anchor.y)*scale+pose.offset+settle;
   // Only the clapper glows. The body is never warped to fake breathing.
   if(e.phase>1||a?.kind==='ultimate'){c.save();c.globalCompositeOperation='screen';c.globalAlpha=.16+Math.sin(time*5)*.06;c.fillStyle='#ffbe4c';c.beginPath();c.ellipse(x,y,17*scale,19*scale,0,0,Math.PI*2);c.fill();c.restore();}
   const bakedCrack=pose.asset==='mossbell-bell-v2'||pose.asset==='mossbell-ritual-v2'&&(pose.frame>=10||pose.frame===6);
   if(e.phase>1&&!bakedCrack&&a?.kind!=='transition'){
    c.save();c.strokeStyle='#ffcf63';c.lineWidth=2.2*scale;c.lineJoin='round';c.beginPath();c.moveTo(x,y-18*scale);c.lineTo(x-3*scale,y-33*scale);c.lineTo(x+3*scale,y-46*scale);c.lineTo(x-6*scale,y-59*scale);c.lineTo(x-5*scale,y-76*scale);c.stroke();c.restore();
   }
  }
  c.restore();return true;
 }
 if(e.objectivePart){drawAdventureSprite(c,'nest',e.vulnerable?2:Math.floor(time*1.5)%4===0?1:0,0,10,92);return true;}
 return false;
}
export function drawAdventureEffect(c,f){
 if(f.type!=='boss-release')return false;
 const age=1-f.life/f.max,alpha=Math.max(0,1-age);c.save();c.scale(1,.707);c.translate(f.x,f.y);c.globalAlpha*=alpha;c.lineJoin='round';c.lineCap='round';
 // Mint is reserved for safe lanes. Released damage keeps the warm warning palette.
 c.fillStyle=f.skill==='ultimate'?'rgba(255,174,85,.32)':'rgba(237,176,81,.26)';c.strokeStyle=f.skill==='ultimate'?'#fff1c3':'#ffe6ad';c.lineWidth=5;
 c.beginPath();
 if(f.shape==='ring'){
  const start=f.gap+f.gapWidth/2,end=f.gap+Math.PI*2-f.gapWidth/2;
  c.arc(0,0,f.r,start,end);c.arc(0,0,f.inner,end,start,true);c.closePath();c.fill();c.stroke();
  c.beginPath();c.arc(0,0,f.inner+(f.r-f.inner)*Math.min(1,age*2.5),start,end);c.lineWidth=9*(1-age)+2;c.stroke();
 }else if(f.shape==='cone'){
  const start=f.angle-f.arc/2,end=f.angle+f.arc/2;c.moveTo(0,0);c.arc(0,0,f.r,start,end);c.closePath();c.fill();
  for(let i=0;i<3;i++){c.beginPath();c.arc(0,0,f.r*(.65+i*.14),start,end);c.lineWidth=8-i*2;c.stroke();}
 }else if(f.shape==='line'){
  const dx=f.to.x-f.x,dy=f.to.y-f.y,length=Math.hypot(dx,dy),angle=Math.atan2(dy,dx);c.rotate(angle);
  c.beginPath();c.moveTo(0,0);c.lineTo(length,0);c.strokeStyle='#364c30';c.lineWidth=f.r*1.6;c.stroke();
  c.beginPath();c.moveTo(0,0);for(let x=24;x<length;x+=24)c.lineTo(x,Math.sin(x*.13)*f.r*.36);c.lineTo(length,0);c.lineWidth=6;c.strokeStyle='#f0d58a';c.stroke();
  for(let x=42;x<length;x+=52){const side=Math.sin(x)>0?1:-1;c.beginPath();c.moveTo(x-13,0);c.lineTo(x,side*f.r*.8);c.lineTo(x+13,0);c.fillStyle='#d4b46c';c.fill();}
 }else{
  c.arc(0,0,f.r,0,Math.PI*2);c.fill();c.stroke();
  for(let i=0;i<14;i++){const a=i*Math.PI/7,r=f.r*(.35+age*.6);c.beginPath();c.moveTo(Math.cos(a)*r,Math.sin(a)*r);c.lineTo(Math.cos(a+.025)*f.r,Math.sin(a+.025)*f.r);c.stroke();}
  c.beginPath();c.arc(0,0,f.r*Math.min(1,.55+age),0,Math.PI*2);c.lineWidth=12*(1-age);c.stroke();
 }
 c.restore();return true;
}
export function drawAdventureWarning(c,a){
 if(!a.mossbell)return false;
 const progress=Math.max(0,Math.min(1,a.t/a.windup));c.save();c.scale(1,.707);c.translate(a.x,a.y);c.lineWidth=3;c.strokeStyle='#ffcf7c';c.fillStyle=`rgba(205,83,48,${.1+progress*.22})`;
 c.beginPath();
 if(a.shape==='ring'){
  const start=a.gap+a.gapWidth/2,end=a.gap+Math.PI*2-a.gapWidth/2;
  c.arc(0,0,a.r,start,end);c.arc(0,0,a.inner,end,start,true);c.closePath();c.fill();c.stroke();
  c.beginPath();c.arc(0,0,(a.inner+a.r)/2,a.gap-a.gapWidth/2,a.gap+a.gapWidth/2);c.strokeStyle='#a2f3d5';c.lineWidth=7;c.stroke();
 }else if(a.shape==='cone'){c.moveTo(0,0);c.arc(0,0,a.r,a.angle-a.arc/2,a.angle+a.arc/2);c.closePath();c.fill();c.stroke();}
 else if(a.shape==='line'){c.lineCap='round';c.moveTo(0,0);c.lineTo(a.to.x-a.x,a.to.y-a.y);c.lineWidth=a.r*2;c.strokeStyle=`rgba(219,91,46,${.16+progress*.24})`;c.stroke();c.lineWidth=3;c.strokeStyle='#ffe0a5';c.stroke();}
 else{c.arc(0,0,a.r,0,Math.PI*2);c.fill();c.stroke();c.beginPath();c.arc(0,0,a.r*progress,0,Math.PI*2);c.stroke();}
 c.restore();return true;
}
