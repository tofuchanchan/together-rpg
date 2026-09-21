import {chromium} from 'file:///C:/Users/fuweicheng/.codex/skills/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {EQUIPMENT_APPEARANCES} from '../src/coop/equipment-data.js';
const root='assets/shop',runtime=JSON.parse(fs.readFileSync('assets/equipment/manifest.json','utf8'));
const prior=JSON.parse(fs.readFileSync(`${root}/manifest.json`,'utf8')),icons={};
if(!prior.icons)fs.writeFileSync('output/verification/equipment-icon-redraw/previous-manifest.json',JSON.stringify(prior,null,2));
const browser=await chromium.launch({headless:true}),page=await browser.newPage();
try{
 await page.goto('http://127.0.0.1:4173/cel-lab.html');
 for(const slots of Object.values(EQUIPMENT_APPEARANCES))for(const [slot,items] of Object.entries(slots))for(const item of items){
  const file=`items/${item.key}.png`;
  const frame=await page.evaluate(async file=>{
   const im=new Image();im.src='/assets/shop/'+file;await im.decode();const c=document.createElement('canvas');c.width=im.width;c.height=im.height;
   const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(im,0,0);const px=ctx.getImageData(0,0,c.width,c.height).data;
   let l=c.width,t=c.height,r=0,b=0,transparent=0;
   for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){const a=px[(y*c.width+x)*4+3];if(a===0)transparent++;if(a>8){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);}}
   if(transparent/(c.width*c.height)<.15)throw Error(`Icon lacks transparency: ${file}`);
   if(r<=l||b<=t)throw Error(`Empty icon: ${file}`);
   l=Math.max(0,l-4);t=Math.max(0,t-4);r=Math.min(c.width-1,r+4);b=Math.min(c.height-1,b+4);return [l,t,r-l+1,b-t+1];
  },file);
  const source=(slot==='weapon'?runtime.weapons:runtime.bodies)[item.key].image;
  icons[item.key]={file,frame,source:`assets/equipment/${source}`,sourceSha256:createHash('sha256').update(fs.readFileSync(`assets/equipment/${source}`)).digest('hex')};
 }
 fs.writeFileSync(`${root}/manifest.json`,JSON.stringify({icons,bonus:prior.bonus},null,2)+'\n');console.log(`Registered ${Object.keys(icons).length} transparent icons against runtime appearance IDs`);
}finally{await browser.close();}
