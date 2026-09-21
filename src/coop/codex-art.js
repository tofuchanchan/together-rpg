import {loadShopEventArt,drawBonusCreature} from './shop-event-art.js';
import {BONUS_CREATURES} from './bonus-events.js';
import {loadCharacterSprites,hero} from './sprites.js';
import {loadEquipmentArt,drawEquippedHero} from './equipment-art.js';
import {EQUIPMENT_APPEARANCES} from './equipment-data.js';
import {loadWorldArt,drawArt,frameInfo} from './world-assets.js';
import {enemy} from './world-art.js';
import {ICON_ALIASES} from './world-art-defs.js';
import {loadBuildArt,drawBuildIcon} from './build-art.js';
import {loadUniversalArt,drawUniversalIcon,drawSwarm} from './universal-art.js';
import {ENEMIES} from './enemies.js';
import {BOSS_DEF} from './encounters.js';

let pending,ready=false;
const previews=new Map(),roles=['warrior','mage','archer'];

// This promise is shared by the catalogue and its detail view. A missing asset
// rejects to the UI instead of silently replacing the illustration with a glyph.
export function loadCodexArt(){
 return pending??=Promise.all([loadCharacterSprites(),loadWorldArt(),loadBuildArt(),loadUniversalArt(),loadEquipmentArt(),loadShopEventArt()]).then(()=>{ready=true;});
}

function previewActor(role){
 if(!roles.includes(role))throw Error(`未知图鉴职业：${role}`);
 return{id:0,role,face:1,x:0,y:0,stride:0,gait:0,move:{x:0,y:0},lastMove:{x:1,y:1},hitFlash:0,invuln:0,down:false};
}

function drawPreview(c,art,time){
 if(art.type==='icon'){
  if(drawUniversalIcon(c,art.key,0,0,230)||drawBuildIcon(c,art.key,0,0,230))return;
  const key=ICON_ALIASES[art.key]||art.key;
  frameInfo(key);drawArt(c,key,0,0,280,280,{anchor:[.5,.5]});return;
 }
 if(art.type==='hero'){hero(c,previewActor(art.role),time,1.8);return;}
 if(art.type==='equipment'){
  const key=art.style||art.key,shapes=EQUIPMENT_APPEARANCES[art.role]?.[art.slot];
  if(!shapes?.some(s=>s.key===key))throw Error(`未知图鉴装备：${key}`);
  const h=previewActor(art.role);h.equipment={[art.slot]:{visualKey:key}};
  if(!drawEquippedHero(c,h,0,0,time,1.8))throw Error(`装备预览未加载：${key}`);
  return;
 }
 if(art.type==='enemy'){
  const kind=art.kind||art.key;const bonusKind=kind==='experienceGrub'?'xp':kind==='coinRunner'?'gold':null;if(bonusKind){c.scale(2.4,2.4);drawBonusCreature(c,{bonusKind,stats:BONUS_CREATURES[bonusKind],stride:time,face:0});return;}const boss=kind==='thornking',stats=boss?BOSS_DEF:ENEMIES[kind];
  if(!stats)throw Error(`未知图鉴怪物：${kind}`);
  const e={kind,boss,stats,phase:1,face:1,x:0,y:0,stride:0,rarity:0,spawnGrace:0,hitFlash:0};
  c.scale(1.7,1.7);if(!drawSwarm(c,e,time))enemy(c,e,time);return;
 }
 throw Error(`未知图鉴插画类型：${art.type}`);
}

function illustration(art,time){
 const cacheKey=JSON.stringify(art),cached=time===0&&previews.get(cacheKey);if(cached)return cached;
 const source=document.createElement('canvas');source.width=source.height=640;
 const c=source.getContext('2d',{willReadFrequently:true});c.translate(320,art.type==='icon'?320:480);drawPreview(c,art,time);
 // Fit the actual painted silhouette, including wide hats and held weapons.
 // Atlas cells include very different transparent margins across asset families.
 const pixels=c.getImageData(0,0,640,640).data;let left=640,top=640,right=-1,bottom=-1;
 for(let y=0;y<640;y++)for(let x=0;x<640;x++)if(pixels[(y*640+x)*4+3]>2){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);}
 if(right<left)throw Error(`图鉴插画为空：${art.key||art.kind||art.role}`);
 if(left===0||top===0||right===639||bottom===639)throw Error(`图鉴插画超出取景范围：${art.key||art.kind||art.role}`);
 const cropped=document.createElement('canvas');cropped.width=right-left+3;cropped.height=bottom-top+3;
 cropped.getContext('2d').drawImage(source,left-1,top-1,cropped.width,cropped.height,0,0,cropped.width,cropped.height);
 if(time===0)previews.set(cacheKey,cropped);return cropped;
}

// Canvas dimensions are backing-store pixels. Callers can size their CSS box
// independently for HiDPI displays; this function always fits the full artwork.
export function paintCodexArt(canvas,entry,time=0){
 if(!ready)throw Error('图鉴插画尚未加载');
 const art=entry?.art;if(!art)throw Error('图鉴条目缺少插画');
 const c=canvas.getContext('2d'),w=canvas.width,h=canvas.height;if(!c||w<1||h<1)throw Error('无效图鉴画布');
 const painted=illustration(art,Number.isFinite(time)?time:0),pad=Math.max(9,Math.min(w,h)*.08),isIcon=art.type==='icon';
 const scale=Math.min((w-pad*2)/painted.width,(h-pad*2)/painted.height),pw=painted.width*scale,ph=painted.height*scale,x=(w-pw)/2,y=(h-ph)/2;
 c.save();c.resetTransform();c.clearRect(0,0,w,h);c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';
 const paper=c.createLinearGradient(0,0,w,h);paper.addColorStop(0,'#f6f3df');paper.addColorStop(1,'#dce9cd');c.fillStyle=paper;c.fillRect(0,0,w,h);
 const glow=c.createRadialGradient(w*.5,h*.42,0,w*.5,h*.42,Math.max(w,h)*.58);glow.addColorStop(0,'#ffffff80');glow.addColorStop(1,'#ffffff00');c.fillStyle=glow;c.fillRect(0,0,w,h);
 if(!isIcon){c.save();c.globalAlpha=.15;c.fillStyle='#39593e';c.beginPath();c.ellipse(w*.5,y+ph-pad*.13,Math.min(pw*.38,w*.32),Math.max(3,h*.025),0,0,Math.PI*2);c.fill();c.restore();}
 c.drawImage(painted,x,y,pw,ph);c.restore();return true;
}
