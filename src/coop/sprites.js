import {runtimeArtUrl} from './runtime-art.js';
import {drawEquippedHero} from './equipment-art.js';
import {loadLayeredWarrior,drawLayeredWarrior,layeredAssetState} from './layered-warrior.js';
import {equipment} from './layered-pose.js';
const appearanceQuery=new URLSearchParams(globalThis.location?.search||'');
const layeredPreview=appearanceQuery.get('warriorRig')==='layered';
const previewGear=equipment(Object.fromEntries(appearanceQuery));
import {spritePose,jointPose} from './sprite-animation.js';
import {splitAccessory,hurtFace} from './character-parts.js';
import {makeCharacterRig,drawCharacterRig,rigHurtBody} from './character-rig.js';

const atlases = new Map();
let pending;
export function loadCharacterSprites() {
  return pending ??= Promise.all(['warrior', 'mage', 'archer'].map(async role => {
    const url = new URL(`../../assets/characters/${role}.json`, import.meta.url);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`角色图集加载失败：${role} (${response.status})`);
    const manifest = await response.json();
    const image = new Image();
    image.src = runtimeArtUrl(manifest.image, url);
    await image.decode();
    if (image.width !== manifest.width || image.height !== manifest.height) throw new Error(`角色图集尺寸不符：${role}`);
    const atlas={image, manifest, parts:new Map(), faces:new Map(), rigs:new Map()};
    // Prepare all directions before play; never segment pixels on the first moving frame.
    for(let row=0;row<8;row++){
      const base=row*4,rig=makeCharacterRig(image,manifest.frames[base],manifest.cell,row,role,manifest.frames[role==='warrior'?32:32+base]);
      atlas.rigs.set(base,rig);rigHurtBody(rig,image);
    }
    atlases.set(role,atlas);
  })).then(async result=>{if(layeredPreview)await loadLayeredWarrior();return result;});
}

export function characterAssetState() {
  return { renderer: 'illustrated-png-atlas', ready: atlases.size === 3, ...(layeredPreview?{warriorPreview:layeredAssetState()}:{}),
    roles: [...atlases].map(([role, {manifest}]) => ({role, frames: manifest.frames.length, source: manifest.source})) };
}

// Only draw PNG pixels. This function no longer constructs the character from paths.
export function hero(c, h, time, scale = 1) {
  if(drawEquippedHero(c,h,0,0,time,scale))return;
  if(layeredPreview&&h.role==='warrior')return drawLayeredWarrior(c,h,time,scale,{gear:previewGear});
  const atlas = atlases.get(h.role);
  if (!atlas) return;
  const pose = spritePose(h, time);
  const index = (pose.sheet === 'combat' ? 32 : 0) + pose.row * 4 + pose.column;
  const frame = atlas.manifest.frames[index];
  const size = atlas.manifest.cell;
  const unit = atlas.manifest.displayScale * scale;
  c.save();
  c.translate(pose.x * scale, pose.y * scale);
  c.rotate(pose.rotation);
  c.scale(unit * pose.sx, unit * pose.sy);
  if (h.down) c.globalAlpha *= .65;
  // Hit flash is a bitmap color filter, never an opaque ellipse hiding the sprite.
  if (h.hitFlash > 0) c.filter = `brightness(${pose.brightness>1?pose.brightness:1.15}) saturate(.75)`;
  if(h.invuln>0&&!h.down&&h.action?.type!=='dodge'&&h.hitFlash<=0)c.globalAlpha*=.82+.18*Math.cos(time*38)**2;
  c.imageSmoothingEnabled = true;
  c.imageSmoothingQuality = 'high';
  if(!pose.cloth&&!h.down&&(h.action?.pairSkill||!['dodge','bash','spin'].includes(h.action?.type))){
    const base=pose.row*4;
    drawCharacterRig(c,atlas.rigs.get(base),jointPose(h,time),atlas.manifest.anchor,h.hitReaction?.life>0,atlas.image);
  }else if(h.hitReaction?.life>0&&!h.down){
    if(!atlas.faces.has(index))atlas.faces.set(index,hurtFace(atlas.image,frame,size,pose.row,h.role));
    c.drawImage(atlas.faces.get(index),-atlas.manifest.anchor[0],-atlas.manifest.anchor[1]);
  }else if(pose.cloth){
    if(!atlas.parts.has(index))atlas.parts.set(index,splitAccessory(atlas.image,frame,size,h.role));
    const parts=atlas.parts.get(index),ax=atlas.manifest.anchor[0],ay=atlas.manifest.anchor[1];
    c.drawImage(parts.body,-ax,-ay);
    if(parts.part){c.save();c.translate(parts.pivot[0]-ax,parts.pivot[1]-ay);c.rotate(Math.sin(time*2.2+h.id*1.7)*.018);c.drawImage(parts.part,-parts.pivot[0],-parts.pivot[1]);c.restore();}
  }else c.drawImage(atlas.image, frame.x, frame.y, size, size, -atlas.manifest.anchor[0], -atlas.manifest.anchor[1], size, size);
  c.restore();
}
