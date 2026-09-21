import {clamp} from './model.js';
import {drawArt,drawContent,drawOutline,frameInfo,skin,makeIllustratedGround} from './world-assets.js';
import {RARITIES} from './encounters.js';
import {ICON_ALIASES,enemyFrame,effectFrame} from './world-art-defs.js';
import {enemyDef} from './enemies.js';
import {actionLayout} from './effect-layout.js';
import {reactionPose} from './combat-motion.js';
export {skin};
export function icon(c,name,x,y,size=24){drawArt(c,ICON_ALIASES[name]||name,x,y,size*2.35);}
export function bar(c,x,y,w,h,q,color='#78cd73'){
 const value=clamp(q,0,1);
 if(h<=23){
  // Tiny bars cannot carry the atlas's full illustrated rim without distortion.
  const inset=h<=10?1.5:2,r=Math.min(h/2,6);c.save();c.beginPath();c.roundRect(x,y,w,h,r);c.fillStyle='#112c25';c.fill();
  c.beginPath();c.roundRect(x+inset,y+inset,Math.max(0,w-2*inset),Math.max(0,h-2*inset),Math.max(1,r-inset));c.clip();
  c.fillStyle=color;c.fillRect(x+inset,y+inset,(w-2*inset)*value,h-2*inset);
  c.fillStyle='#ffffff30';c.fillRect(x+inset,y+inset,(w-2*inset)*value,Math.max(1,(h-2*inset)*.25));c.restore();return;
 }
 skin(c,'button-neutral',x,y,w,h);if(!value)return;
 c.save();c.beginPath();c.rect(x+3,y+3,(w-6)*value,Math.max(1,h-6));c.clip();
 const xp=color==='#efd276'||color==='#f1c864';
 if(!xp&&['#e58a6d','#eea467'].includes(color))c.filter='hue-rotate(280deg) saturate(.9)';
 drawContent(c,xp?'xp-fill':'health-fill',x+3,y+3,w-6,Math.max(1,h-6));c.restore();
}
export function enemy(c,e,time){const held=e.visualStop>0&&e.hitPose?{...e,...e.hitPose}:e,key=enemyFrame(held),f=frameInfo(key),size=f.w*f.displayScale;
 if(e.slow>0)drawArt(c,'frost-3',0,-3,e.kind==='mushroom'?98:67,e.kind==='mushroom'?42:28,{alpha:.55});
 const bob=held.action?0:-Math.abs(Math.sin(held.stride*Math.PI*2))*2,hit=reactionPose(e);
 c.save();c.translate(hit.x,hit.y);c.rotate(hit.rotation);c.scale(hit.sx,hit.sy);if(!['goblin','mushroom'].includes(e.kind)&&e.face>=3&&e.face<=5)c.scale(-1,1);if(e.rarity)drawOutline(c,key,0,bob,size,size,RARITIES[e.rarity].color);if(e.spawnGrace>0)c.globalAlpha=.35+(1-e.spawnGrace)*.65;drawArt(c,key,0,bob,size,size,{filter:e.freeze>0?'sepia(.7) hue-rotate(130deg)':e.hitFlash>0?`brightness(${hit.brightness}) saturate(.65)`:undefined});c.restore();
}
export function rock(c,x,y,r){drawArt(c,r>32?'rock-large':'rock-small',x,y+8,r*3.1);}
export const makeGround=makeIllustratedGround;
export function actorShadow(c,x,y,r){drawArt(c,'shadow',x,y,r*2.3,r*.82,{alpha:.55});}
export function playerRing(c,x,y,r,id){drawArt(c,id===1?'ring-orange':'ring-cyan',x,y,r*2.2,r*.85,{alpha:id===2?.65:1,filter:id===2?'sepia(.9) saturate(.5)':undefined});}
export function warning(c,a){
 if(a.from){const q=clamp(a.t/a.windup,0,1);c.save();c.scale(1,.707);c.lineCap='round';c.beginPath();c.moveTo(a.from.x,a.from.y);c.lineTo(a.x,a.y);c.strokeStyle='#e8745655';c.lineWidth=a.r*2;c.stroke();c.setLineDash([12,8]);c.strokeStyle='#ffe0a5';c.lineWidth=3;c.stroke();c.setLineDash([]);c.beginPath();c.moveTo(a.from.x,a.from.y);c.lineTo(a.from.x+(a.x-a.from.x)*q,a.from.y+(a.y-a.from.y)*q);c.strokeStyle='#ffb073';c.lineWidth=6;c.stroke();c.restore();return;}
 const q=clamp(a.t/a.windup,0,1);drawArt(c,'warning-ring',a.x,a.y*.707,a.r*2.1,a.r*2.1*.707,{alpha:.8});
 // Exact range/progress is functional geometry, kept aligned with the actual collision radius.
 c.save();c.beginPath();c.ellipse(a.x,a.y*.707,a.r*q,a.r*q*.707,0,0,Math.PI*2);c.fillStyle='#e56a4930';c.fill();
 c.beginPath();c.ellipse(a.x,a.y*.707,a.r,a.r*.707,0,0,Math.PI*2);c.lineWidth=2;c.strokeStyle='#e87456';c.stroke();
 c.beginPath();c.ellipse(a.x,a.y*.707,a.r,a.r*.707,0,-Math.PI/2,-Math.PI/2+q*Math.PI*2);c.lineWidth=2.5;c.strokeStyle='#ffe0a5';c.stroke();c.restore();
}
export function effect(c,f){
 if(f.type==='spawn'){drawArt(c,'warning-ring',f.x,f.y*.707,72,45,{alpha:f.life/f.max});return;}
 if(f.type==='chain'){c.save();c.strokeStyle='#b0edff';c.lineWidth=3;c.globalAlpha=f.life/f.max;c.beginPath();c.moveTo(f.x,f.y*.707-31);c.lineTo((f.x+f.to.x)/2+8,(f.y+f.to.y)*.3535-42);c.lineTo(f.to.x,f.to.y*.707-31);c.stroke();c.restore();return;}
 if(f.type==='contact'){const q=clamp(1-f.life/f.max,0,.999);drawArt(c,effectFrame('hit',q),f.x,f.y*.707-f.height,f.size*(.75+q*.6),f.size*(.75+q*.6),{alpha:Math.min(1,f.life/f.max*3),rotation:Math.atan2(f.dir.y*.707,f.dir.x),filter:f.hurt?'sepia(.8) saturate(2.4) hue-rotate(320deg)':undefined});return;}
 if(f.type==='heal'){drawArt(c,'heal-burst',f.x,f.y*.707,130,80,{alpha:f.life/f.max});return;}
 const progress=clamp(1-f.life/f.max,0,.999),alpha=Math.min(1,f.life/f.max*3),type=f.type==='poof'?'dust':f.type==='impact'?'hit':f.type;
 const radius=f.r||35,diameter=type==='dust'?95:radius*2.25;
 drawArt(c,effectFrame(type,progress),f.x,f.y*.707,diameter,diameter*(['frost','spin','blast'].includes(type)?.707:type==='hit'?.75:1),{alpha});
}
export function projectile(c,p,time){
 const key=p.type==='arrow'?'arrow':p.type==='pierce'?'pierce-arrow':`${p.type==='fireball'?'fireball':'bolt'}-${Math.floor(time*14)%4}`;
 const width=p.type==='pierce'?77:p.type==='fireball'?86:p.type==='arrow'?55:48;
 // Ground collision position is the leading edge, not the middle of a long arrow.
 const angle=Math.atan2(p.dy*.707,p.dx),offset=p.type==='arrow'||p.type==='pierce'?width*.35:0;
 drawArt(c,key,p.x-Math.cos(angle)*offset,p.y*.707-31-Math.sin(angle)*offset,width,width,{rotation:angle,filter:p.hostile?'sepia(.8) saturate(3) hue-rotate(320deg)':undefined});
}
export function heroAction(c,h){const a=h.action,layout=actionLayout(h);if(!a||!layout||a.pairSkill)return;const q=clamp(a.t/a.duration,0,.999),angle=Math.atan2(a.dir.y*.707,a.dir.x);c.save();c.translate(layout.x,layout.y*.707);
 const start=a.windup??a.duration*.33,end=a.activeEnd??a.duration*.56,fx=clamp((a.t-start)/Math.max(.001,end-start+.07),0,1);
 if(a.type==='attack'&&a.t>=start&&fx<1)drawArt(c,effectFrame('slash',fx),0,-28,layout.size,layout.size,{rotation:angle,alpha:.92*(1-fx*.6)});
 if(a.type==='spin'&&a.t>=(a.windup??.12)){c.scale(1,.707);drawArt(c,effectFrame('spin',q),0,0,layout.size,layout.size,{rotation:q*Math.PI,alpha:.75});}
 if(a.type==='bash'&&a.t>=(a.windup??0))drawArt(c,'shield-burst',0,-28,77,77,{rotation:angle,alpha:Math.sin(q*Math.PI)*.8});
 if(a.type==='dodge')drawArt(c,effectFrame('dust',q),0,0,83,60,{alpha:.65});c.restore();
}
export const SCENE_PROPS=[
 {name:'arch',x:0,y:-380,size:244},{name:'banner',x:-210,y:-385,size:159},{name:'banner',x:235,y:-385,size:159},
 {name:'pillar',x:-565,y:-260,size:143},{name:'pillar',x:570,y:-245,size:135},
 {name:'barrel',x:-588,y:-155,size:73},{name:'barrel',x:580,y:155,size:73},
 {name:'stump',x:-615,y:70,size:106},{name:'bush',x:607,y:55,size:103},{name:'bush',x:-610,y:235,size:96},
 {name:'fern',x:-580,y:350,size:80},{name:'fern',x:570,y:-350,size:80},
 {name:'mushrooms',x:470,y:355,size:68},{name:'mushrooms',x:-480,y:-350,size:62},
 {name:'rock-small',x:-370,y:360,size:75},{name:'rock-small',x:360,y:-365,size:68},
 {name:'tree',x:-725,y:120,size:252},{name:'tree',x:736,y:125,size:255},
 {name:'canopy',x:-560,y:620,size:246},{name:'canopy',x:570,y:620,size:251},
];
export function sceneProp(c,p){drawArt(c,p.name,p.x,p.y*.707,p.size);}
