import {chromium} from 'file:///C:/Users/fuweicheng/.codex/skills/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const out='output/verification/equipment-icon-redraw';fs.mkdirSync(`${out}/references`,{recursive:true});
const browser=await chromium.launch({headless:true}),page=await browser.newPage();
try{
 await page.route('**/__icon-export.html',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><title>Equipment references</title>'}));
 await page.goto('http://127.0.0.1:4173/__icon-export.html');
 const data=await page.evaluate(async()=>{
  const manifest=await(await fetch('/assets/equipment/manifest.json')).json(),{EQUIPMENT_APPEARANCES}=await import('/src/coop/equipment-data.js'),results=[];
  for(const [role,slots] of Object.entries(EQUIPMENT_APPEARANCES))for(const [slot,items] of Object.entries(slots))for(const item of items){
   const entry=(slot==='weapon'?manifest.weapons:manifest.bodies)[item.key],im=new Image();im.src='/assets/equipment/'+entry.image;await im.decode();
   const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=500;const c=canvas.getContext('2d');c.fillStyle='#e5e9da';c.fillRect(0,0,1200,500);c.font='bold 21px sans-serif';c.fillStyle='#193b2c';c.textAlign='center';c.fillText(item.name+' / '+item.key,600,31);
   for(const [i,row]of [0,7,1].entries()){
    const frame=entry.frames[entry.frames.length===32?row*4:row],cut=document.createElement('canvas');cut.width=cut.height=256;const ctx=cut.getContext('2d',{willReadFrequently:true});ctx.drawImage(im,frame.x,frame.y,256,256,0,0,256,256);const px=ctx.getImageData(0,0,256,256).data;let l=256,t=256,r=0,b=0;for(let y=0;y<256;y++)for(let x=0;x<256;x++)if(px[(y*256+x)*4+3]>32){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);}
    const width=r-l+1,height=b-t+1,scale=Math.min(320/width,370/height);c.drawImage(cut,l,t,width,height,200+i*400-width*scale/2,60+(370-height*scale)/2,width*scale,height*scale);c.font='18px sans-serif';c.fillText(['S / front','SE','SW'][i],200+i*400,470);
   }
   results.push({key:item.key,role,slot,name:item.name,runtimeImage:entry.image,data:canvas.toDataURL('image/png').split(',')[1]});
  }
  return results;
 });
 for(const r of data)fs.writeFileSync(`${out}/references/${r.key}.png`,Buffer.from(r.data,'base64'));
 fs.writeFileSync(`${out}/references.json`,JSON.stringify(data.map(({data,...r})=>r),null,2));console.log(`Exported ${data.length} exact runtime reference sheets`);
}finally{await browser.close();}
