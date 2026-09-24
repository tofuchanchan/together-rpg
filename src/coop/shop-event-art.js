import {EQUIPMENT_APPEARANCES} from './equipment-data.js';
import {loadRuntimeImage} from './runtime-art.js';
const sheets={},map={},root=new URL('../../assets/shop/',import.meta.url);
for(const slots of Object.values(EQUIPMENT_APPEARANCES))for(const item of [...slots.weapon,...slots.armor])map[item.key]=true;
let manifest,pending;const loading=new Map();
export async function loadShopEventArt(group='all'){
 if(!manifest)await(pending??=(async()=>{const response=await fetch(new URL('../runtime/shop-manifest.json',root),{signal:AbortSignal.timeout(45000)});if(!response.ok)throw Error('Shop art manifest');manifest=await response.json();})().catch(e=>{pending=null;throw e;}));
 for(const key of Object.keys(map))if(!manifest.icons?.[key])throw Error(`Missing equipment icon: ${key}`);
 const entries=Object.entries(group==='bonus'?{bonus:manifest.bonus}:group==='icons'?manifest.icons:{...manifest.icons,bonus:manifest.bonus});
 await Promise.all(entries.map(([key,data])=>{
  if(sheets[key])return;
  if(!loading.has(key))loading.set(key,loadRuntimeImage(data.file,root).then(img=>{sheets[key]=img;}).finally(()=>loading.delete(key)));
  return loading.get(key);
 }));
}
export const shopEventArtState=()=>({ready:!!sheets.bonus&&Object.keys(map).every(key=>!!sheets[key]),equipmentIcons:Object.keys(map).length,bonusFrames:manifest?.bonus.frames.length||0});
export function drawEquipmentIcon(c,item,x,y,size){
 const key=item.visualKey||item.appearance;if(!map[key]||!sheets[key])return false;
 const [sx,sy,sw,sh]=manifest.icons[key].frame,scale=size/Math.max(sw,sh);
 c.drawImage(sheets[key],sx,sy,sw,sh,x-sw*scale/2,y-sh*scale/2,sw*scale,sh*scale);return true;
}
export function drawBonusCreature(c,e){
 if(!e.bonusKind||!sheets.bonus)return false;
 const index=(e.bonusKind==='gold'?4:0)+Math.floor((e.stride||0)*4)%4,[sx,sy,sw,sh]=manifest.bonus.frames[index],scale=e.stats.size/(e.bonusKind==='gold'?350:343);
 c.save();if(e.face===4)c.scale(-1,1);if(e.hitFlash>0)c.filter='brightness(1.55)';
 c.drawImage(sheets.bonus,sx,sy,sw,sh,-sw*scale/2,-sh*scale,sw*scale,sh*scale);c.restore();return true;
}
