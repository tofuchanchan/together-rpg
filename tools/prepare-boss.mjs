// Pack generated artwork; this script does not draw the boss.
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {chromium} from 'file:///C:/Users/fuweicheng/.codex/skills/node_modules/playwright/index.mjs';
const {PNG}=createRequire(import.meta.url)('C:/Users/fuweicheng/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/pngjs');
const root='assets/world',raw=fs.readFileSync(`${root}/source/thornking.png`),img=PNG.sync.read(raw),cells=[];
for(let i=0;i<8;i++){const x0=Math.floor(i%4*img.width/4),y0=Math.floor(Math.floor(i/4)*img.height/2),x1=Math.floor((i%4+1)*img.width/4),y1=Math.floor((Math.floor(i/4)+1)*img.height/2);let l=x1,t=y1,r=x0,b=y0;
 for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)if(img.data[(y*img.width+x)*4+3]>50){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);}
 if(r<=l||b<=t)throw Error('Empty boss cell');cells.push({l,t,w:r-l+1,h:b-t+1});
}
const scale=Math.min(...cells.map(c=>Math.min(290/c.w,265/c.h))),browser=await chromium.launch({headless:true});
try{const p=await browser.newPage(),png=await p.evaluate(async({url,cells,scale})=>{const img=new Image();img.src=url;await img.decode();const c=document.createElement('canvas');c.width=1280;c.height=640;const ctx=c.getContext('2d');cells.forEach((f,i)=>ctx.drawImage(img,f.l,f.t,f.w,f.h,(i%4)*320+160-f.w*scale/2,Math.floor(i/4)*320+286-f.h*scale,f.w*scale,f.h*scale));return c.toDataURL();},{url:'data:image/png;base64,'+raw.toString('base64'),cells,scale});fs.writeFileSync(`${root}/thornking.png`,Buffer.from(png.split(',')[1],'base64'));}finally{await browser.close();}
const m=JSON.parse(fs.readFileSync(`${root}/manifest.json`));m.pages.thornking={file:'thornking.png',width:1280,height:640,count:8};cells.forEach((f,i)=>m.frames[`thornking-${i}`]={page:'thornking',x:i%4*320,y:Math.floor(i/4)*320,w:320,h:320,anchor:[.5,286/320],displayScale:190/(cells[0].h*scale),content:[160-f.w*scale/2,286-f.h*scale,f.w*scale,f.h*scale]});fs.writeFileSync(`${root}/manifest.json`,JSON.stringify(m,null,2));console.log('Packed 8 boss poses with foot-aligned anchors');
