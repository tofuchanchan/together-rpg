// Mechanical sprite slicing/registration only. All painted pixels come from imagegen PNGs.
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {chromium} from 'file:///C:/Users/fuweicheng/.codex/skills/node_modules/playwright/index.mjs';
const require = createRequire(import.meta.url);
const {PNG} = require('C:/Users/fuweicheng/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/pngjs');
const root = 'assets/characters', out = 'output/character-rework';
fs.mkdirSync(out, {recursive:true});
const roles = process.argv.slice(2).length ? process.argv.slice(2) : ['warrior', 'mage', 'archer'];
const median = list => [...list].sort((a,b) => a-b)[Math.floor(list.length/2)];

function rowsOf(image, expected=8) {
  const bands = []; let begin = -1, last = -1;
  for (let y = 0; y < image.height; y++) {
    let count = 0;
    for (let x = 0; x < image.width; x++) if (image.data[(y*image.width+x)*4+3] > 100) count++;
    if (count > 12) { if (begin < 0) begin = y; last = y; }
    else if (begin >= 0 && y-last > 5) { bands.push([begin,last]); begin = -1; }
  }
  if (begin >= 0) bands.push([begin,last]);
  if (bands.length !== expected) throw new Error(`Expected ${expected} distinct sprite rows, got ${JSON.stringify(bands)}`);
  return bands;
}

function cut(image, row, column, role) {
  const columns=[];let begin=-1,last=-1;
  for(let x=0;x<image.width;x++) {
    let count=0;for(let y=row[0];y<=row[1];y++)if(image.data[(y*image.width+x)*4+3]>100)count++;
    if(count>1){if(begin<0)begin=x;last=x;}
    else if(begin>=0&&x-last>10){columns.push([begin,last]);begin=-1;}
  }
  if(begin>=0)columns.push([begin,last]);
  if(columns.length!==4)throw new Error(`Expected four separate columns at ${row}, got ${JSON.stringify(columns)}`);
  const left=Math.max(0,columns[column][0]-3),right=Math.min(image.width,columns[column][1]+4);
  let x0 = right, x1 = left, y0 = row[1], y1 = row[0];
  for (let y=row[0]; y<=row[1]; y++) for (let x=left; x<right; x++) {
    if (image.data[(y*image.width+x)*4+3] > 80) { x0=Math.min(x0,x); x1=Math.max(x1,x); y0=Math.min(y0,y); y1=Math.max(y1,y); }
  }
  if (x1<=x0 || y1<=y0) throw new Error(`Empty sprite at ${row}/${column}`);
  // Register at the painted head, so a long cape, bow or sword cannot pull the body sideways.
  const mask = new Set();
  for (let y=y0; y<y0+(y1-y0)*.62; y++) for (let x=x0; x<=x1; x++) {
    const i=(y*image.width+x)*4, [r,g,b,a]=image.data.subarray(i,i+4);
    const color=role==='warrior' ? Math.min(r,g,b)>85 && Math.max(r,g,b)-Math.min(r,g,b)<48
      : role==='mage' ? b>g*1.35 && r>g*1.12 && b>55 : g>r*1.12 && g>b*1.12 && g>42;
    if (a>150 && color) mask.add(y*image.width+x);
  }
  let biggest=[];
  while(mask.size) {
    const first=mask.values().next().value, component=[first]; mask.delete(first);
    for(let k=0;k<component.length;k++) for(const n of [component[k]-1,component[k]+1,component[k]-image.width,component[k]+image.width])
      if(mask.delete(n)) component.push(n);
    if(component.length>biggest.length) biggest=component;
  }
  const xs=biggest.map(n=>n%image.width);
  const pivotX=xs.length>20 ? (Math.min(...xs)+Math.max(...xs))/2 : (x0+x1)/2;
  const headWidth=xs.length>20 ? Math.max(...xs)-Math.min(...xs)+1 : (x1-x0)*.5;
  return {sx:Math.max(left,x0-2), sy:Math.max(0,y0-2), sw:x1-x0+5, sh:y1-y0+5,
    pivotX, pivotY:y1, height:y1-y0+1, headWidth};
}

const browser=await chromium.launch({headless:true});
const page=await browser.newPage();
const report=[];
try {
  await page.goto('http://127.0.0.1:4173/');
  for(const role of roles) {
    const sets={};
    for(const sheet of ['move','combat']) {
      const image=PNG.sync.read(fs.readFileSync(`${root}/source/${role}-${sheet}.png`));
      const rows=rowsOf(image);
      sets[sheet]={width:image.width,height:image.height,frames:rows.flatMap((row,r)=>Array.from({length:4},(_,col)=>({...cut(image,row,col,role),row:r,column:col,sheet,sourceFile:`${role}-${sheet}.png`})))};
    }
    const desired=role==='mage'?174:160;
    const moveScale=desired/median(sets.move.frames.filter(f=>f.column===0).map(f=>f.height));
    // One sheet-level scale retains deliberate attack/crouch proportions.
    const headRatio=median(sets.move.frames.map(f=>f.headWidth))/median(sets.combat.frames.map(f=>f.headWidth));
    const combatScale=moveScale*Math.max(.75,Math.min(1.3,headRatio));
    const frames=[...sets.move.frames,...sets.combat.frames].map((f,i)=>({...f,scale:f.sheet==='move'?moveScale:combatScale,x:(i%8)*256,y:Math.floor(i/8)*256}));
    const fixes=role==='warrior' ? [{file:'warrior-diagonals.png',rows:4,map:[[0,'move',3],[1,'combat',3],[2,'move',7],[3,'combat',7]]}]
      : role==='mage' ? [{file:'mage-archer-corrections.png',rows:3,map:[[0,'combat',3],[1,'combat',4]]}]
      : [{file:'mage-archer-corrections.png',rows:3,map:[[2,'move',1]]}];
    for(const fix of fixes)if(fs.existsSync(`${root}/source/${fix.file}`)) {
      const image=PNG.sync.read(fs.readFileSync(`${root}/source/${fix.file}`)),rows=rowsOf(image,fix.rows);
      const keys=fix.map.flatMap(([sourceRow,sheet,row])=>Array.from({length:4},(_,column)=>({...cut(image,rows[sourceRow],column,role),sheet,row,column,sourceFile:fix.file})));
      for(const f of keys){
        const idle=keys.find(k=>k.sheet==='move'&&k.row===f.row&&k.column===0);
        const correctionScale=idle ? moveScale*sets.move.frames[f.row*4].height/idle.height
          : moveScale*median(sets.move.frames.filter(k=>k.row===f.row).map(k=>k.headWidth))/median(keys.filter(k=>k.row===f.row).map(k=>k.headWidth));
        const index=(f.sheet==='combat'?32:0)+f.row*4+f.column;frames[index]={...f,scale:correctionScale,x:frames[index].x,y:frames[index].y};
      }
    }
    // Reuse the correct painted rear stance where a generated anticipation switched hands.
    if(role==='warrior')frames[48]={...frames[16],sheet:'combat',x:frames[48].x,y:frames[48].y};
    // Reserve the widest weapon pose without shrinking individual animation frames.
    const fit=Math.min(1,...frames.flatMap(f=>[122/Math.max(1,(f.pivotX-f.sx)*f.scale),122/Math.max(1,(f.sx+f.sw-f.pivotX)*f.scale),204/Math.max(1,(f.pivotY-f.sy)*f.scale)]));
    frames.forEach(f=>f.scale*=fit);
    // The generated rear idle mage swaps its staff hand; use the correctly held passing key.
    if(role==='mage') Object.assign(frames[16], {...frames[18],x:frames[16].x,y:frames[16].y,column:0});
    const manifest={version:1,role,image:`${role}.png`,width:2048,height:2048,cell:256,anchor:[128,210],displayScale:.65/fit,
      source:'imagegen / D-coop-combat reference',directionRows:['S','SW','W','NW','N','NE','E','SE'],
      moveColumns:['idle','left-contact','passing','right-contact'],combatColumns:['anticipation','strike','follow-through','dodge-brace'],frames};
    const png=await page.evaluate(async({role,frames})=>{
      const images={};for(const file of new Set(frames.map(f=>f.sourceFile))) {const image=new Image();image.src=`/assets/characters/source/${file}`;await image.decode();images[file]=image;}
      const canvas=document.createElement('canvas');canvas.width=2048;canvas.height=2048;const c=canvas.getContext('2d');
      c.imageSmoothingQuality='high';
      for(const f of frames) c.drawImage(images[f.sourceFile],f.sx,f.sy,f.sw,f.sh,
        f.x+128+(f.sx-f.pivotX)*f.scale,f.y+210+(f.sy-f.pivotY)*f.scale,f.sw*f.scale,f.sh*f.scale);
      return canvas.toDataURL('image/png').split(',')[1];
    },{role,frames});
    const buffer=Buffer.from(png,'base64'), packed=PNG.sync.read(buffer);
    let empty=0,clipped=0;
    for(let row=0;row<8;row++) for(let col=0;col<8;col++) {
      let count=0,border=0;
      for(let y=0;y<256;y++) for(let x=0;x<256;x++) {
        const a=packed.data[((row*256+y)*packed.width+col*256+x)*4+3];
        if(a>24) {count++;if(x<2||y<2||x>253||y>253)border++;}
      }
      if(!count)empty++;if(border)clipped++;
    }
    if(empty||clipped)throw new Error(`${role}: empty ${empty}, clipped ${clipped}; correct registration before saving`);
    fs.writeFileSync(`${root}/${role}.png`,buffer);
    fs.writeFileSync(`${root}/${role}.json`,JSON.stringify(manifest,null,2));
    report.push({role,frames:64,empty,clipped,bytes:buffer.length,moveScale,combatScale});
  }
  fs.writeFileSync(`${out}/atlas-report.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
} finally {await browser.close();}
