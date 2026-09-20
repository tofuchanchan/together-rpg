// Technical atlas extraction only; source illustrations are generated with imagegen.
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {PNG}=require('C:/Users/fuweicheng/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/pngjs');
const sharp=require('C:/Users/fuweicheng/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const names=['seedling','dustling','gnat','spiritdog','paperbird','thornpet'];
const manifest={version:1,cell:256,frames:{}};
for(const name of names){
 const source=PNG.sync.read(fs.readFileSync(`assets/universal/source/${name}.png`)),cw=Math.floor(source.width/2),ch=Math.floor(source.height/2),bounds=[];
 for(let i=0;i<4;i++){
  const sx=i%2*cw,sy=Math.floor(i/2)*ch;let left=cw,top=ch,right=0,bottom=0,opaque=0;
  for(let y=0;y<ch;y++)for(let x=0;x<cw;x++)if(source.data[((sy+y)*source.width+sx+x)*4+3]>20){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);opaque++;}
  if(!opaque||opaque>cw*ch*.9)throw Error(`${name}: invalid alpha in frame ${i}`);
  bounds.push({left:sx+left,top:sy+top,width:right-left+1,height:bottom-top+1});
 }
 const scale=220/Math.max(...bounds.flatMap(b=>[b.width,b.height])),tiles=[];
 for(let i=0;i<4;i++){
  const b=bounds[i],width=Math.max(1,Math.round(b.width*scale)),height=Math.max(1,Math.round(b.height*scale));
  const input=await sharp(`assets/universal/source/${name}.png`).extract(b).resize(width,height).png().toBuffer();
  tiles.push({input,left:i%2*256+Math.round((256-width)/2),top:Math.floor(i/2)*256+236-height});
 }
 await sharp({create:{width:512,height:512,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(tiles).png().toFile(`assets/universal/${name}.png`);
 manifest.frames[name]={file:`${name}.png`,count:4,anchor:[.5,236/256],scale,bounds};
 console.log(`${name}: 4 transparent frames, shared scale ${scale.toFixed(3)}`);
}
fs.writeFileSync('assets/universal/manifest.json',JSON.stringify(manifest,null,2)+'\n');
