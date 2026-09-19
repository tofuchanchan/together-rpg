import {sampleLayered,DEFAULT_GEAR,attachmentPoint} from './layered-pose.js';
let pending,atlas;
export function loadLayeredWarrior(){return pending??= (async()=>{
 const url=new URL('../../assets/characters/layered/warrior.json',import.meta.url),response=await fetch(url);if(!response.ok)throw Error('分层角色配置加载失败');
 const manifest=await response.json(),images={};await Promise.all(Object.entries(manifest.pages).map(async([key,page])=>{const im=new Image();im.src=new URL(page.file,url).href;await im.decode();images[key]=im;}));atlas={manifest,images};return atlas;
})();}
export function layeredAssetState(){return {ready:!!atlas,parts:atlas?Object.keys(atlas.manifest.parts).length:0,source:'independent-layered-png',runtime:'canvas-rigid-bones'};}
export function sampleEquippedWarrior(h,time=0,gear=DEFAULT_GEAR){
 const pose=sampleLayered(h,time,gear),weapon=atlas?.manifest.parts[`${pose.gear.weapon}/${pose.view}`];
 if(weapon)pose.sockets.weaponTip=attachmentPoint(weapon,weapon.tip,70,pose.weaponAngle,pose.sockets.weaponGrip);
 return pose;
}
export function drawLayeredWarrior(c,h,time=0,scale=1,options={}){
 if(!atlas)return;const pose=sampleEquippedWarrior(h,time,options.gear||h.appearance||DEFAULT_GEAR),{bones:b,arms,gear}=pose,explode=options.explode||0;
 const weapon=atlas.manifest.parts[`${gear.weapon}/${pose.view}`];
 c.save();c.scale(scale*.84,scale*.84);c.translate(pose.root.x,pose.root.y);c.rotate(pose.down?-1.35:pose.bodyRotation);if(pose.down)c.globalAlpha*=.65;
 if(h.invuln>0&&!h.down&&h.action?.type!=='dodge'&&!(h.hitFlash>0))c.globalAlpha*=.82+.18*Math.cos(time*38)**2;
 if(h.hitFlash>0)c.filter='brightness(1.18) saturate(.8)';
 const draw=(id,point,height,pivot=[.5,.5],rotation=0,offset=[0,0],widthScale=1)=>{
  if(!id||id==='none')return;const f=atlas.manifest.parts[`${id}/${pose.view}`];if(!f)throw Error(`Missing attachment ${id}/${pose.view}`);
  const width=f.w/f.h*height*widthScale;c.save();c.translate(point.x+offset[0]*explode,point.y+offset[1]*explode);c.rotate(rotation);c.drawImage(atlas.images[f.page],f.x,f.y,f.w,f.h,-width*pivot[0],-height*pivot[1],width,height);c.restore();
 };
 const capePivots={S:[.5,.06],SW:[.22,.06],W:[.16,.06],NW:[.25,.06],N:[.5,.06],NE:[.8,.06],E:[.88,.06],SE:[.92,.18]};
 const capeHeight=pose.view==='SE'?58:pose.view==='S'?36:56;
 const cape=()=>draw(gear.cape,{x:-Math.cos(pose.face*Math.PI/4)*18,y:pose.view==='SE'?-80:-64},capeHeight,capePivots[pose.view],pose.capeAngle,[0,25]);
 const arm=side=>{
  const a=arms[side],sign=side==='right'?-1:1,offset=[sign*45,0];
  draw(`upper-${side}`,a.start,29,[.5,.25],a.upper,offset);draw(`fore-${side}`,a.elbow,14,[.5,.13],a.fore,offset);
  if(side==='right'){
   draw(gear.weapon,a.end,70,weapon?.pivot||[.5,.84],pose.weaponAngle,[sign*60,5]);
  }
  draw(`hand-${side}`,a.end,12,[.5,.5],a.fore*.25,offset);
  if(side==='left')draw(gear.shield,a.end,65,[.5,.45],-.05,[sign*60,8],['E','W'].includes(pose.view)?1.8:1);
 };
 if(!pose.capeFront)cape();
 for(const side of pose.farArms)arm(side);
 for(const side of ['right','left'])draw(`leg-${side}`,b[`leg-${side}`],26,[.5,.1],0,[side==='right'?-16:16,38]);
 draw('torso',b.torso,34,[.5,.5],0,[0,0],1.65);draw('pelvis',b.pelvis,12,[.5,.5],0,[0,17],2.1);
 if(pose.capeFront)cape();
 // A closed helmet hides hair/face attachments, rather than leaving hair around its edge.
 draw(gear.helmet==='none'?'head':gear.helmet,b.head,74,[.5,.92],0,[0,-36]);
 for(const side of pose.nearArms)arm(side);
 if(options.debug){
  c.save();c.lineWidth=1;c.strokeStyle='#70ffdc';c.fillStyle='#70ffdc';
  for(const a of Object.values(arms)){c.beginPath();c.moveTo(a.start.x,a.start.y);c.lineTo(a.elbow.x,a.elbow.y);c.lineTo(a.end.x,a.end.y);c.stroke();}
  for(const [name,p] of Object.entries(b)){c.beginPath();c.arc(p.x,p.y,2,0,Math.PI*2);c.fill();}
  c.strokeStyle='#ffca61';for(const p of Object.values(pose.sockets)){c.beginPath();c.moveTo(p.x-4,p.y);c.lineTo(p.x+4,p.y);c.moveTo(p.x,p.y-4);c.lineTo(p.x,p.y+4);c.stroke();}c.restore();
 }
 c.restore();return pose;
}
