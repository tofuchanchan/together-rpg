let pending,manifest,background;
const images=new Map();
const outlines=new Map();
export function loadWorldArt(){return pending??= (async()=>{
 const base=new URL('../../assets/world/',import.meta.url),response=await fetch(new URL('manifest.json',base));
 if(!response.ok)throw new Error(`美术清单加载失败 (${response.status})`);manifest=await response.json();
 await Promise.all([...Object.entries(manifest.pages),['background',{file:manifest.background}]].map(async([name,page])=>{
  const image=new Image();image.src=new URL(page.file,base).href;await image.decode();
  if(page.width&&(page.width!==image.width||page.height!==image.height))throw new Error(`图集尺寸不符：${name}`);
  if(name==='background')background=image;else images.set(name,image);
 }));
})();}
export function worldArtState(){return{ready:!!background&&images.size===Object.keys(manifest?.pages||{}).length,
 source:'illustrated-png-atlases',pages:images.size,frames:Object.keys(manifest?.frames||{}).length};}
export function frameInfo(name){const f=manifest?.frames[name];if(!f)throw new Error(`缺少美术贴图：${name}`);return f;}
export function drawArt(c,name,x,y,w,h=w,{alpha=1,rotation=0,anchor,filter}={}){
 const f=frameInfo(name),a=anchor||f.anchor;c.save();c.translate(x,y);c.rotate(rotation);c.globalAlpha*=alpha;if(filter)c.filter=filter;
 c.drawImage(images.get(f.page),f.x,f.y,f.w,f.h,-a[0]*w,-a[1]*h,w,h);c.restore();
}
export function drawContent(c,name,x,y,w,h){
 const f=frameInfo(name),[cx,cy,cw,ch]=f.content;c.drawImage(images.get(f.page),f.x+cx,f.y+cy,cw,ch,x,y,w,h);
}
export function drawOutline(c,name,x,y,w,h,color){
 const f=frameInfo(name),key=name+color;let silhouette=outlines.get(key);
 if(!silhouette){silhouette=document.createElement('canvas');silhouette.width=f.w;silhouette.height=f.h;const ctx=silhouette.getContext('2d');ctx.drawImage(images.get(f.page),f.x,f.y,f.w,f.h,0,0,f.w,f.h);ctx.globalCompositeOperation='source-in';ctx.fillStyle=color;ctx.fillRect(0,0,f.w,f.h);outlines.set(key,silhouette);}
 for(let i=0;i<8;i++){const a=i*Math.PI/4;c.drawImage(silhouette,x-f.anchor[0]*w+Math.cos(a)*3,y-f.anchor[1]*h+Math.sin(a)*3,w,h);}
}
// Each source has different corner ornaments. Keep those corners uniformly scaled;
// stretching a generic middle strip used to crush the button's inner rim.
const SKIN_CORNERS={panel:[64,64,16],card:[48,48,14],button:[52,50,12],skill:[76,76,16]};
export function skinLayout(name,content,w,h){
 const [, ,cw,ch]=content,[sx,sy,size]=SKIN_CORNERS[name.split('-')[0]]||SKIN_CORNERS.panel;
 const scale=Math.min(size/Math.max(sx,sy),w/(sx*2+1),h/(sy*2+1));
 const dx=sx*scale,dy=sy*scale;
 return {xs:[0,sx,cw-sx,cw],ys:[0,sy,ch-sy,ch],dx:[0,dx,w-dx,w],dy:[0,dy,h-dy,h]};
}
export function skin(c,name,x,y,w,h){
 const f=frameInfo(name),[cx,cy]=f.content,img=images.get(f.page),{xs,ys,dx,dy}=skinLayout(name,f.content,w,h);
 for(let j=0;j<3;j++)for(let i=0;i<3;i++)c.drawImage(img,f.x+cx+xs[i],f.y+cy+ys[j],xs[i+1]-xs[i],ys[j+1]-ys[j],x+dx[i],y+dy[j],dx[i+1]-dx[i],dy[j+1]-dy[j]);
}
export function makeIllustratedGround(){const cv=document.createElement('canvas');cv.width=1600;cv.height=1100;cv.getContext('2d').drawImage(background,0,0,1600,1100);return cv;}
