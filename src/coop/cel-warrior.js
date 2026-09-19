import {celFrame} from './cel-motion.js';
let assets,pending;
function idleLayers(image){
 const make=()=>{const cv=document.createElement('canvas');cv.width=cv.height=256;return cv;},body=make(),part=make(),composite=make(),ctx=body.getContext('2d');ctx.drawImage(image,0,0);
 const pixels=ctx.getImageData(0,0,256,256),mask=new Uint8Array(256*256),expanded=new Uint8Array(256*256);
 for(let y=95;y<203;y++)for(let x=0;x<256;x++){const n=y*256+x,i=n*4,[r,g,b,a]=pixels.data.subarray(i,i+4);if(a>30&&r>90&&r-g>55&&r>g*2&&r>b*2)mask[n]=1;}
 for(let y=2;y<254;y++)for(let x=2;x<254;x++)if(mask[y*256+x]){expanded[y*256+x]=1;for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const n=(y+dy)*256+x+dx,i=n*4;if(pixels.data[i]<65&&pixels.data[i+1]<65&&pixels.data[i+2]<65)expanded[n]=1;}}
 const pd=ctx.createImageData(256,256),bd=ctx.createImageData(256,256);for(let n=0;n<mask.length;n++){const i=n*4;(expanded[n]?pd:bd).data.set(pixels.data.subarray(i,i+4),i);}
 ctx.putImageData(bd,0,0);part.getContext('2d').putImageData(pd,0,0);return{body,part,composite,pivot:[128,128]};
}
export function loadCelWarrior(){return pending??=(async()=>{
 const base=new URL('../../assets/characters/cel/',import.meta.url),response=await fetch(new URL('warrior.json',base));if(!response.ok)throw Error('关键帧素材尚未准备完成');
 const manifest=await response.json(),images={},idle={};
 await Promise.all([...Object.values(manifest.clips).map(c=>c.file),...manifest.directions.map(d=>`source/idle-${d}.png`)].map(async file=>{const im=new Image();im.src=new URL(file,base).href;await im.decode();images[file]=im;}));
 for(const dir of manifest.directions)idle[dir]=idleLayers(images[`source/idle-${dir}.png`]);
 assets={manifest,images,idle};return assets;
})();}
export function celAssetState(){return{ready:!!assets,directions:assets?.manifest.directions||[],fullBodyCels:assets?32:0,bodyWarp:false};}
const originalScale=.6705927599634632;
export function drawOriginalCel(c,dir,scale=1){if(!assets)return;c.drawImage(assets.images[`source/idle-${dir}.png`],-128*originalScale*scale,-210*originalScale*scale,256*originalScale*scale,256*originalScale*scale);}
export function drawCelWarrior(c,dir,clip,time,scale=1,options={}){
 if(!assets)return;const sample=celFrame(clip,time,options),d=scale*originalScale;
 if(clip==='idle'){
  const parts=assets.idle[dir],g=parts.composite.getContext('2d'),[x,y]=parts.pivot;g.clearRect(0,0,256,256);
  g.save();g.translate(x,y);g.rotate(Math.sin(sample.t/2.4*Math.PI*2)*.006);g.drawImage(parts.part,-x,-y);g.restore();g.drawImage(parts.body,0,0);
  // Composite before resampling: separate scaled layers create dark dotted seams at cut edges.
  c.drawImage(parts.composite,-128*d,-210*d,256*d,256*d);
 }else{
  const sheet=assets.manifest.clips[`${dir}/${clip}`],f=sheet.frames[sample.frame],ref=assets.manifest.registration[dir],u=d*sheet.scale;
  c.drawImage(assets.images[sheet.file],f.x,f.y,f.w,f.h,-f.anchor[0]*u+(ref.headX-128)*d,-f.anchor[1]*u+(ref.ground-210)*d,f.w*u,f.h*u);
 }
 return sample;
}
