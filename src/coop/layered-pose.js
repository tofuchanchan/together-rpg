// This module is renderer-independent. Anatomical sides never change with facing.
export const VIEWS=['S','SW','W','NW','N','NE','E','SE'];
export const FACE_VIEWS=[6,7,0,1,2,3,4,5];
export const EQUIPMENT={weapon:['sword','axe','none'],shield:['shield-kite','shield-round','none'],helmet:['helmet-silver','helmet-bronze','none'],cape:['cape-red','none']};
export const DEFAULT_GEAR=Object.freeze({weapon:'sword',shield:'shield-kite',helmet:'helmet-silver',cape:'cape-red'});
export function equipment(value={}){return Object.fromEntries(Object.entries(EQUIPMENT).map(([slot,ids])=>[slot,ids.includes(value[slot])?value[slot]:DEFAULT_GEAR[slot]]));}
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
function curve(t,keys){for(let i=1;i<keys.length;i++)if(t<=keys[i][0]){const [a,x]=keys[i-1],[b,y]=keys[i];return x+(y-x)*smooth((t-a)/(b-a));}return keys.at(-1)[1];}
export function twoBone(start,target,a,b,bend=1){
 const dx=target.x-start.x,dy=target.y-start.y,raw=Math.hypot(dx,dy),d=clamp(raw,Math.abs(a-b)+.0001,a+b-.0001),angle=Math.atan2(dy,dx);
 const offset=Math.acos(clamp((a*a+d*d-b*b)/(2*a*d),-1,1))*bend;
 const elbow={x:start.x+Math.cos(angle+offset)*a,y:start.y+Math.sin(angle+offset)*a};
 const end={x:start.x+Math.cos(angle)*d,y:start.y+Math.sin(angle)*d};
 return {start,elbow,end,upper:Math.atan2(elbow.y-start.y,elbow.x-start.x)-Math.PI/2,fore:Math.atan2(end.y-elbow.y,end.x-elbow.x)-Math.PI/2};
}
export function attachmentPoint(part,point,height,angle,origin){
 const x=(point[0]-part.pivot[0])*height*part.w/part.h,y=(point[1]-part.pivot[1])*height;
 return{x:origin.x+x*Math.cos(angle)-y*Math.sin(angle),y:origin.y+x*Math.sin(angle)+y*Math.cos(angle)};
}
export function sampleLayered(h,time=0,gearValue=DEFAULT_GEAR){
 const gear=equipment(gearValue),a=h.action;let face=((a?.facing??h.face??0)%8+8)%8;
 if(a?.type==='spin'){const start=a.windup??a.duration*.32;face=(face+Math.floor(clamp((a.t-start)/(a.duration-start),0,1)*16))%8;}
 const angle=face*Math.PI/4,view=VIEWS[FACE_VIEWS[face]];
 const forward={x:Math.cos(angle),y:Math.sin(angle)*.707},right={x:-Math.sin(angle),y:Math.cos(angle)*.3};
 // Original side views retain a three-quarter silhouette: keep the weapon arm visible.
 if(Math.abs(right.x)<.05)right.x=forward.x>0?.8:-.8;
 const gait=h.gait??Math.min(1,Math.hypot(h.move?.x||0,h.move?.y||0)),phase=(h.stride||0)*Math.PI*2;
 const move=Math.hypot(h.move?.x||0,h.move?.y||0)>.001?h.move:(h.lastMove||{x:0,y:0}),length=Math.hypot(move.x,move.y)||1;
 const walk={x:move.x/length,y:move.y/length*.707};
 const hit=h.hitReaction?.life>0?Math.sin((1-h.hitReaction.life/h.hitReaction.max)*Math.PI)*2:0;
 const bob=-Math.pow(Math.sin(phase),2)*1.2*gait;
 let pulse=0,lunge=0,roll=0;
 if(a){const wind=a.windup??a.duration*.32,end=a.activeEnd??a.duration*.56;
  pulse=curve(a.t,[[0,0],[wind*.6,-.3],[wind,1],[end,.82],[a.duration,0]]);
  lunge=pulse*2.5;
  if(a.type==='dodge'||a.type==='bash'){roll=Math.sin(clamp(a.t/a.duration,0,1)*Math.PI);pulse=0;lunge=0;}
 }
 const root={x:forward.x*lunge-(h.hitReaction?.x||0)*hit,y:forward.y*lunge+bob-(h.hitReaction?.y||0)*hit};
 const bones={root:{x:0,y:0},pelvis:{x:0,y:-36},torso:{x:0,y:-51},head:{x:0,y:-60}};
 const arms={};
 for(const [side,sign] of [['right',1],['left',-1]]){
  const shoulder={x:right.x*27*sign,y:-62+right.y*27*sign-(side==='left'?6:0)};
  const sway=Math.sin(phase+(sign<0?Math.PI:0))*5*gait;
  const reach=side==='right'?pulse*19:a?.type==='bash'?roll*14:0;
  const target={x:shoulder.x+right.x*sign*(side==='left'?16:6)+forward.x*(reach+sway),y:shoulder.y+21+forward.y*(reach+sway)-Math.abs(reach)*.45};
  arms[side]=twoBone(shoulder,target,11,10,sign*(forward.y>=0?1:-1));
  bones[`shoulder-${side}`]=shoulder;bones[`elbow-${side}`]=arms[side].elbow;bones[`hand-${side}`]=arms[side].end;
  const swing=Math.sin(phase+(sign<0?Math.PI:0)),lift=Math.max(0,swing)*4*gait;
  bones[`leg-${side}`]={x:right.x*13*sign+walk.x*swing*5*gait,y:-27+right.y*13*sign+walk.y*swing*5*gait-lift};
 }
 const outward=right.x===0?(forward.x>=0?1:-1):Math.sign(right.x);
 const neutral=view==='SE'?Math.PI/2:outward*.65,attackAngle=Math.atan2(forward.y,forward.x)+Math.PI/2;
 let delta=((attackAngle-neutral+Math.PI*3)%(Math.PI*2))-Math.PI;
 let weaponAngle=neutral+delta*pulse;
 if(view==='SE'&&a&&['attack','spin'].includes(a.type)){
  const wind=a.windup??a.duration*.32,end=a.activeEnd??a.duration*.56;
  weaponAngle=curve(a.t,[[0,neutral],[wind*.6,.15],[wind,2.35],[end,2.5],[a.duration,neutral]]);
 }
 const grip={...arms.right.end};
 const sockets={weaponGrip:grip,offhandGrip:{...arms.left.end},head:{...bones.head},ground:{x:0,y:0}};
 const near=forward.y>=0;const depth=side=>right.y*(side==='right'?1:-1);
 const farArms=['right','left'].filter(s=>depth(s)<-.05||Math.abs(depth(s))<=.05&&!near),nearArms=['right','left'].filter(s=>!farArms.includes(s));
 const capeAngle=Math.sin(time*2.2+(h.id||0)*1.7)*.018+Math.sin(phase)*.025*gait;
 return {view,face,gear,bones,arms,root,sockets,weaponAngle,farArms,nearArms,capeFront:forward.y<-.1,capeAngle,roll,bodyRotation:roll*forward.x*.25,down:!!h.down};
}
