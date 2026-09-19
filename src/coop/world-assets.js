let pending,manifest,background;
const images=new Map();
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
export function skin(c,name,x,y,w,h){
 const f=frameInfo(name),[cx,cy,cw,ch]=f.content,img=images.get(f.page);
 const border=Math.min(cw,ch)*.2,d=Math.min(15,w/3,h/3),xs=[0,border,cw-border,cw],ys=[0,border,ch-border,ch];
 const dx=[0,d,w-d,w],dy=[0,d,h-d,h];
 for(let j=0;j<3;j++)for(let i=0;i<3;i++)c.drawImage(img,f.x+cx+xs[i],f.y+cy+ys[j],xs[i+1]-xs[i],ys[j+1]-ys[j],x+dx[i],y+dy[j],dx[i+1]-dx[i],dy[j+1]-dy[j]);
}
export function makeIllustratedGround(){const cv=document.createElement('canvas');cv.width=1600;cv.height=1100;cv.getContext('2d').drawImage(background,0,0,1600,1100);return cv;}
