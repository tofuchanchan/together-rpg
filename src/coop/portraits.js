// Selection artwork is independent from the small, animated combat atlases.
const ROLES=['warrior','mage','archer'];
const entries=new Map();
let pending;
export function loadHeroPortraits(){
 return pending??=(async()=>{
 const manifest=await fetch(new URL('../../assets/portraits/manifest.json',import.meta.url)).then(r=>{if(!r.ok)throw new Error('Portrait metadata unavailable');return r.json();}).catch(()=>null);
 return Promise.allSettled(ROLES.map(async role=>{
  const entry={role,status:'loading',image:new Image()};entries.set(role,entry);
  entry.bbox=manifest?.[role]?.bbox;
  entry.image.src=new URL(`../../${manifest?.[role]?.src||`assets/portraits/${role}-hd.png`}`,import.meta.url).href;
  try{await entry.image.decode();entry.status='ready';}catch(error){entry.status='failed';entry.error=error.message;throw error;}
 }));
 })();
}
export function heroPortraitState(){return {ready:ROLES.every(role=>entries.get(role)?.status==='ready'),roles:ROLES.map(role=>{const e=entries.get(role);return {role,status:e?.status||'pending',source:e?.image.src||null,width:e?.image.naturalWidth||0,height:e?.image.naturalHeight||0};})};}
export function drawHeroPortrait(c,role,x,y,w,h,mirror=false){
 const entry=entries.get(role);if(entry?.status!=='ready')return false;
 const image=entry.image,b=entry.bbox;
 // Crop transparent margins only during drawing; keep the original PNG untouched.
 const sx=b?Math.max(0,b.x-8):0,sy=b?Math.max(0,b.y-8):0;
 const sw=b?Math.min(image.naturalWidth-sx,b.width+16):image.naturalWidth,sh=b?Math.min(image.naturalHeight-sy,b.height+16):image.naturalHeight;
 const scale=Math.min(w/sw,h/sh),width=sw*scale,height=sh*scale;
 // High-quality downsampling is expensive; prepare it once per display density.
 // Keep only the current size per role so resizing cannot grow an unbounded cache.
 const transform=c.getTransform(),pw=Math.max(1,Math.ceil(width*Math.hypot(transform.a,transform.b))),ph=Math.max(1,Math.ceil(height*Math.hypot(transform.c,transform.d)));
 if(entry.preview?.width!==pw||entry.preview?.height!==ph){
  const preview=document.createElement('canvas');preview.width=pw;preview.height=ph;
  const ctx=preview.getContext('2d');ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(image,sx,sy,sw,sh,0,0,pw,ph);entry.preview=preview;
 }
 c.save();c.imageSmoothingEnabled=true;c.imageSmoothingQuality='low';
 c.translate(x+w/2,y+h);if(mirror)c.scale(-1,1);
 c.drawImage(entry.preview,-width/2,-height,width,height);c.restore();return true;
}
