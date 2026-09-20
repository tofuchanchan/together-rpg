import {DIRECTION_ROWS} from './sprite-animation.js';
import {reactionPose} from './combat-motion.js';
import {hurtFace} from './character-parts.js';
const DEFAULT_WEAPON={warrior:'warrior_weapon_iron',mage:'mage_weapon_ember',archer:'archer_weapon_longbow'};
const BODY_KEYS=['warrior_body_default','warrior_armor_plate','warrior_armor_raider','mage_body_default','mage_armor_star','mage_armor_leaf','archer_body_default','archer_armor_scout','archer_armor_ranger'];
const WEAPON_KEYS=['warrior_weapon_iron','warrior_weapon_cleaver','mage_weapon_crystal','mage_weapon_ember','archer_weapon_longbow','archer_weapon_crossbow'];
let assets,pending;
const makeCanvas=()=>{const cv=document.createElement('canvas');cv.width=cv.height=256;return cv;};
function localParts(image,frame,key,row){
 const original=makeCanvas(),oc=original.getContext('2d');oc.drawImage(image,frame.x,frame.y,256,256,0,0,256,256);
 const source=oc.getImageData(0,0,256,256),px=source.data,role=key.split('_')[0];let bottom=0;
 for(let y=150;y<226;y++)for(let x=75;x<184;x++)if(px[(y*256+x)*4+3]>120)bottom=Math.max(bottom,y);
 const cut=bottom-18,feet=[makeCanvas(),makeCanvas()],footData=feet.map(cv=>cv.getContext('2d').createImageData(256,256)),body=makeCanvas(),bc=body.getContext('2d'),bodyData=bc.createImageData(256,256),accessory=makeCanvas(),ac=accessory.getContext('2d'),partData=ac.createImageData(256,256),clothMask=new Uint8Array(65536),footMask=new Uint8Array(65536),pivot=role==='mage'?[128,72]:[128,137];
 for(let y=0;y<256;y++)for(let x=0;x<256;x++){const n=y*256+x,i=n*4,[r,g,b,a]=px.subarray(i,i+4);if(a<2)continue;
 const cloth=role==='warrior'?y>96&&y<cut&&r>g*1.6&&r>b*1.5&&r>75:role==='mage'?y<72&&x>60&&x<194:y>150&&y<cut&&(x<108||x>151)&&g>r*1.06&&g>b*.82;
 if(cloth)clothMask[n]=1;
 if(y>=cut&&y<bottom+2&&x>76&&x<183){
  const colored=(rr,gg,bb)=>role==='warrior'?(rr>gg*1.4&&rr>bb*1.3)||(gg>rr*1.2&&gg>bb*.8):role==='mage'?key.endsWith('leaf')?gg>rr*1.08:bb>gg*1.28:gg>rr*1.08;
  let garment=false;for(let dy=-2;dy<=2&&!garment;dy++)for(let dx=-2;dx<=2;dx++){const z=((y+dy)*256+x+dx)*4;if(px[z+3]>130&&colored(px[z],px[z+1],px[z+2])){garment=true;break;}}
  if(!garment)footMask[n]=1;
 }
 }
 // Include adjacent ink in an accessory while preserving fixed collar/hat join.
 const expanded=clothMask.slice();for(let y=2;y<254;y++)for(let x=2;x<254;x++)if(clothMask[y*256+x])for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const n=(y+dy)*256+x+dx,i=n*4;if(!footMask[n]&&px[i]<55&&px[i+1]<55&&px[i+2]<55)expanded[n]=1;}
 const feetCount=[0,0],footX=[0,0];
 for(let n=0;n<65536;n++){const i=n*4,x=n%256,y=Math.floor(n/256);if(footMask[n]){const side=x<128?0:1;footData[side].data.set(px.subarray(i,i+4),i);feetCount[side]++;footX[side]+=x;if(y<cut+3)bodyData.data.set(px.subarray(i,i+4),i);}else if(expanded[n]){partData.data.set(px.subarray(i,i+4),i);if(role==='mage'&&y>68)bodyData.data.set(px.subarray(i,i+4),i);}else bodyData.data.set(px.subarray(i,i+4),i);}
 bc.putImageData(bodyData,0,0);ac.putImageData(partData,0,0);feet.forEach((cv,i)=>cv.getContext('2d').putImageData(footData[i],0,0));
 let faceImage=image,faceFrame=frame;
 if(key.endsWith('scout')||key.endsWith('leaf')){faceImage=makeCanvas();const fc=faceImage.getContext('2d'),fp=oc.getImageData(0,0,256,256);for(let i=0;i<fp.data.length;i+=4)if(fp.data[i]>175&&fp.data[i+1]>140&&fp.data[i]-fp.data[i+1]<21)fp.data[i]=fp.data[i+1]=fp.data[i+2]=128;fc.putImageData(fp,0,0);faceFrame={x:0,y:0};}
 const hurt=hurtFace(faceImage,faceFrame,256,row,role),composite=makeCanvas();
 return{original,body,feet,accessory,pivot,composite,hurt,eyes:hurt.expression?.eyes||[],hips:feetCount.map((n,i)=>[n?footX[i]/n:(i?148:108),cut]),feetCount,accessoryPixels:expanded.reduce((n,v)=>n+v,0)};
}
export function equipmentLocalMotion(h,time=0){
 const amount=h.down?0:(h.gait??Math.min(1,Math.hypot(h.move?.x||0,h.move?.y||0))),phase=cycle(h.stride||0)*Math.PI*2,m=h.move||h.lastMove||{x:1,y:0},length=Math.hypot(m.x,m.y)||1;
 return{feet:[0,1].map(i=>{const s=Math.sin(phase+i*Math.PI);return{x:s*2.7*m.x/length*amount,y:(s*1.7*m.y/length-Math.max(0,s)*2.4)*amount,rotation:s*.055*amount};}),cloth:Math.sin(time*2.1+(h.id||0)*1.7)*(.006+amount*.009),weapon:Math.sin(phase)*.035*amount};
}
function drawLocalBody(parts,h,time){
 const cv=parts.composite,c=cv.getContext('2d'),motion=equipmentLocalMotion(h,time);c.clearRect(0,0,256,256);
 parts.feet.forEach((foot,i)=>{const [x,y]=parts.hips[i],p=motion.feet[i];c.save();c.translate(x+p.x,y+p.y);c.rotate(p.rotation);c.drawImage(foot,-x,-y);c.restore();});
 c.save();c.translate(...parts.pivot);c.rotate(h.down?0:motion.cloth);c.drawImage(parts.accessory,-parts.pivot[0],-parts.pivot[1]);c.restore();c.drawImage(parts.body,0,0);
 if(h.hitReaction?.life>0&&!h.down)for(const e of parts.eyes){const x=e.l-3,y=e.t-3,w=e.r-e.l+7,hh=e.b-e.t+7;c.drawImage(parts.hurt,x,y,w,hh,x,y,w,hh);}
 return cv;
}

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),cycle=n=>((n%1)+1)%1;
const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
export function equipmentAttackPulse(t,wind,end,duration){if(t<=0)return 0;const turn=wind*.65;if(t<turn)return-smooth(t/Math.max(.00001,turn));if(t<wind)return-1+2*smooth((t-turn)/Math.max(.00001,wind-turn));if(t<end)return 1;return 1-smooth((t-end)/Math.max(.00001,duration-end));}
const keyOf=item=>typeof item==='string'?item:item?.visualKey;
export function equipmentVisual(h){
 const armor=keyOf(h.equipment?.armor),weapon=keyOf(h.equipment?.weapon),role=h.role;
 const armorValid=armor?.startsWith(role+'_armor_')&&BODY_KEYS.includes(armor),weaponValid=weapon?.startsWith(role+'_weapon_')&&WEAPON_KEYS.includes(weapon);
 if(!armorValid&&!weaponValid)return null;
 return{body:armorValid?armor:role+'_body_default',weapon:weaponValid?weapon:DEFAULT_WEAPON[role]};
}
export function loadEquipmentArt(){return pending??=(async()=>{
 const base=new URL('../../assets/equipment/',import.meta.url),response=await fetch(new URL('manifest.json',base));if(!response.ok)throw Error('换装图集清单加载失败');
 const manifest=await response.json(),images={};
 if(BODY_KEYS.some(k=>!manifest.bodies[k])||WEAPON_KEYS.some(k=>!manifest.weapons[k]))throw Error('换装图集缺少外观');
 await Promise.all([...Object.values(manifest.bodies),...Object.values(manifest.weapons)].map(async entry=>{
 const im=new Image();im.src=new URL(entry.image,base).href;await im.decode();
 if(im.width!==1024||im.height!==(entry.frames.length===32?2048:512))throw Error('换装图集尺寸错误: '+entry.image);images[entry.image]=im;
 }));
 const parts={};for(const [key,entry]of Object.entries(manifest.bodies))parts[key]=Array.from({length:8},(_,row)=>localParts(images[entry.image],entry.frames[row*4],key,row));
 assets={manifest,images,parts};return equipmentAssetState();
 })().catch(error=>{pending=undefined;throw error;});}
export function equipmentAssetState(){return{ready:!!assets,renderer:'full-body-cels-and-independent-weapon',animation:'rigid-torso-local-feet-accessories',bodyWarp:false,bodies:assets?Object.keys(assets.manifest.bodies):[],weapons:assets?Object.keys(assets.manifest.weapons):[],bodyFrames:assets?288:0,weaponViews:assets?48:0,localParts:assets?Object.fromEntries(Object.entries(assets.parts).map(([key,rows])=>[key,rows.map(p=>({feet:p.feetCount,eyes:p.eyes.length,accessoryPixels:p.accessoryPixels}))])):{}};}
export function equipmentPose(h,time=0){
 const a=h.action,amount=h.gait??Math.min(1,Math.hypot(h.move?.x||0,h.move?.y||0)),moving=amount>.001;
 let direction=((a?.facing??h.face??0)%8+8)%8,column=0;
 const hit=reactionPose(h),pose={direction,row:0,column,x:hit.x,y:hit.y,rotation:hit.rotation,weaponAngle:0,brightness:hit.brightness};
 if(moving)pose.y-=Math.sin(cycle(h.stride||0)*Math.PI*4)*.65*amount;
 if(a){const q=clamp(a.t/Math.max(.001,a.duration),0,1),wind=a.windup??a.duration*.33,end=a.activeEnd??a.duration*.56,attack=equipmentAttackPulse(a.t,wind,end,a.duration),angle=direction*Math.PI/4;
  pose.x+=Math.cos(angle)*attack*3;pose.y+=Math.sin(angle)*attack*2;
  const swing=h.role==='warrior'?.9:h.role==='mage'?.25:.12;pose.weaponAngle=attack*swing*(direction>=3&&direction<=5?-1:1);
  if(a.type==='spin')direction=(direction+Math.floor(q*16))%8;
  if(a.type==='dodge'||a.type==='bash'){pose.rotation+=Math.cos(angle)*Math.sin(q*Math.PI)*.08;pose.y-=Math.sin(q*Math.PI)*2;}
 }
 if(h.down){pose.rotation=-1.35;pose.y=-9;}
 pose.direction=direction;pose.row=DIRECTION_ROWS[direction];return pose;
}
function weaponScale(key){return key.endsWith('cleaver')?.47:key.endsWith('iron')?.39:key.endsWith('crossbow')?.34:key.endsWith('longbow')?.50:.48;}
function restingAngle(role,row){return role==='warrior'?[-.40,-.45,-.35,.42,.28,.43,.44,-.4][row]:role==='mage'?[-.15,-.20,-.18,-.12,.12,.20,.24,.2][row]:0;}
// Each cel remains one rigid painted figure. Only the independent held item rotates;
// the final tiny grip occlusion is copied from that same cel, never reconstructed.
export function drawEquippedHero(c,h,x=0,y=0,time=0,scale=1){
 const visual=equipmentVisual(h);if(!visual||!assets)return false;
 const {manifest,images}=assets,body=manifest.bodies[visual.body],weapon=manifest.weapons[visual.weapon];if(!body||!weapon)return false;
 const pose=equipmentPose(h,time),frame=body.frames[pose.row*4+pose.column],wf=weapon.frames[pose.row],unit=manifest.displayScale*scale,[ax,ay]=manifest.anchor,[gx,gy]=frame.grip;
 c.save();c.translate(x+pose.x*scale,y+pose.y*scale);c.rotate(pose.rotation);c.scale(unit,unit);
 c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';
 if(h.down)c.globalAlpha*=.65;
 if(h.hitFlash>0)c.filter='brightness('+Math.max(1.15,pose.brightness)+') saturate(.75)';
 if(h.invuln>0&&!h.down&&h.action?.type!=='dodge'&&h.hitFlash<=0)c.globalAlpha*=.82+.18*Math.cos(time*38)**2;
 const painted=drawLocalBody(assets.parts[visual.body][pose.row],h,time),drawBody=()=>c.drawImage(painted,-ax,-ay);
 const drawWeapon=()=>{const s=weaponScale(visual.weapon),rest=visual.weapon.endsWith('crossbow')?pose.direction*Math.PI/4+Math.PI/2:restingAngle(h.role,pose.row);c.save();c.translate(gx-ax,gy-ay);c.rotate(rest+pose.weaponAngle+equipmentLocalMotion(h,time).weapon);c.scale(s,s);c.drawImage(images[weapon.image],wf.x,wf.y,256,256,-wf.grip[0],-wf.grip[1],256,256);c.restore();};
 const behind=[3,4,5].includes(pose.row);
 if(behind){drawWeapon();drawBody();}else{drawBody();drawWeapon();c.save();c.beginPath();c.ellipse(gx-ax,gy-ay,7,7,0,0,Math.PI*2);c.clip();drawBody();c.restore();}
 c.restore();return true;
}
