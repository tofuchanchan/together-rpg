import fs from 'node:fs';
import assert from 'node:assert/strict';
import {chromium} from 'file:///C:/Users/fuweicheng/.codex/skills/node_modules/playwright/index.mjs';
const out='output/verification/boss-specialist/upgrade';fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true}),p=await browser.newPage({viewport:{width:1440,height:940},deviceScaleFactor:1}),errors=[];
p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
try{
 await p.goto('http://127.0.0.1:4173/?adventureTrial=boss');await p.waitForFunction(()=>window.assetsReady,null,{timeout:60000});await p.evaluate(()=>advanceTime(0));
 const rows=await p.evaluate(async()=>{
  const {frameBossCamera}=await import('/src/coop/boss-camera.js'),{MAP,MAP_SCALE}=await import('/src/coop/model.js'),{startMossbellSkill}=await import('/src/coop/mossbell.js'),{bossPose}=await import('/src/coop/adventure-art.js'),manifest=await(await fetch('/assets/adventure/manifest.json')).json(),rows=[];
  coopTest.setRenderScaleForTest(1);
  function fixture(positions=[{x:230,y:180}],point={x:0,y:-20}){
   coopTest.start(positions.length===2?['warrior','archer']:['warrior'],positions.length);const w=coopTest.world;Object.assign(w,{enemies:[],room:10,wave:1,obstacles:[],xpNext:1e9,effects:[]});w.spawnWave();w.time=20;w.options.shake=false;
   w.heroes.forEach((h,i)=>Object.assign(h,positions[i],{attackCd:999}));const b=w.enemies[0];Object.assign(b,point,{cd:999,phase:1});w.camera={x:0,y:0,zoom:.8};frameBossCamera(w,3,MAP_SCALE);return{w,b};
  }
  function take(name,w,b,scope){
   const c=coopTest.view.c,draw=c.drawImage,paints=[];
   c.drawImage=function(img,...args){if(img?.src?.includes('/mossbell'))paints.push({alpha:this.globalAlpha,src:img.src.split('/').at(-1)});return draw.call(this,img,...args);};
   try{coopTest.render();}finally{c.drawImage=draw;}
   const z=w.camera.zoom,project=(x,y)=>({x:720+(x-w.camera.x)*z,y:369+(y-w.camera.y)*.707*z}),pose=bossPose(b,w.time),a=manifest.assets[pose.asset],f=a.frames[pose.frame],scale=b.stats.size/a.referenceHeight,anchor=f.anchor||{x:f.w/2,y:f.h},foot=project(b.x,b.y),flip=b.face<3||b.face>5;
   const rect={left:foot.x+(flip?anchor.x-f.w:-anchor.x)*scale*z,right:foot.x+(flip?anchor.x:f.w-anchor.x)*scale*z,top:foot.y+(pose.offset-anchor.y*scale)*z,bottom:foot.y+(pose.offset+(f.h-anchor.y)*scale)*z};
   rows.push({name,scope,camera:{...w.camera},time:w.time,pose,boss:{x:b.x,y:b.y,size:b.stats.size,rect,paints},heroes:w.heroes.map(h=>({role:h.role,x:h.x,y:h.y,screen:project(h.x,h.y),hp:h.hp})),png:c.canvas.toDataURL()});
  }
  {
   const {w,b}=fixture();startMossbellSkill(w,b,'sweep');w.advance(b.action.windup*.87);take('camera-single-raised',w,b,'Single player; normal live sweep windup and live Boss camera.');
  }
  {
   const {w,b}=fixture([{x:-300,y:90},{x:300,y:-150}],{x:0,y:0});startMossbellSkill(w,b,'sweep');w.advance(b.action.windup*.87);take('camera-duo-opposite',w,b,'Two humans on opposite sides; production shared view.');
  }
  {
   const {w,b}=fixture([{x:-125,y:-200}],{x:0,y:0});startMossbellSkill(w,b,'transition');take('camera-behind-start',w,b,'Real movement behind a phase-transition Boss; no visibility override.');
   w.advance(.73,[{x:1,y:0},{}]);take('camera-behind-middle',w,b,'Real movement behind Boss; production occlusion transparency should expose the human.');
   w.advance(.69,[{x:1,y:0},{}]);take('camera-behind-end',w,b,'Continued real movement out the opposite side, preserving the same camera.');
  }
  {
   const {w,b}=fixture([{x:1100,y:650}],{x:-1050,y:-650});take('camera-far-boss',w,b,'Distant Boss yields to human visibility; Boss is expected offscreen.');
  }
  for(const side of [-1,1]){
   const h={x:side*(MAP.x-70),y:side*(MAP.y-120)},point={x:h.x-side*200,y:h.y-90},{w,b}=fixture([h],point);startMossbellSkill(w,b,'sweep');w.advance(b.action.windup*.87);take(`camera-edge-${side<0?'northwest':'southeast'}`,w,b,'Map-edge human and Boss; background must cover frame and raised weapon fit.');
  }
  {
   const {w,b}=fixture();startMossbellSkill(w,b,'sweep');w.advance(b.action.windup*.87);const camera={...w.camera};
   for(const size of [235,350]){b.stats.size=size;w.camera={...camera};take(`size-${size}`,w,b,'Same fixed camera, same new artwork, same pose and world; fixture stats.size is the only changed value. This is a size comparison, not a full old-versus-new version comparison.');}
  }
  return rows;
 });
 for(const row of rows){fs.writeFileSync(`${out}/${row.name}.png`,Buffer.from(row.png.split(',')[1],'base64'));delete row.png;}
 assert.deepEqual(errors,[]);
 for(const row of rows){
  for(const h of row.heroes){assert.ok(h.screen.x>40&&h.screen.x<1400,row.name+' human X');assert.ok(h.screen.y-150*row.camera.zoom>90,row.name+' human head');assert.ok(h.screen.y+14*row.camera.zoom<650,row.name+' human feet');}
  if(row.name!=='camera-far-boss'){assert.ok(row.boss.rect.top>90,row.name+' raised weapon/title boundary');assert.ok(row.boss.rect.left>0&&row.boss.rect.right<1440,row.name+' weapon side boundary');}
 }
 assert.ok(rows.find(r=>r.name==='camera-behind-middle').boss.paints.some(p=>Math.abs(p.alpha-.48)<.01),'actual native draw uses production occlusion transparency');
 assert.deepEqual(rows.find(r=>r.name==='size-235').camera,rows.find(r=>r.name==='size-350').camera);
 fs.writeFileSync(`${out}/camera-report.json`,JSON.stringify({scope:'Native production World/View; real advances for sweep and behind-Boss traversal; fixed fixtures for location coverage. Runtime screenshots require visual review, not just numeric bounds.',rows,errors},null,2));
 console.log(JSON.stringify({captures:rows.length,errors,rows:rows.map(r=>({name:r.name,bossTop:r.boss.rect.top,hero:r.heroes.map(h=>h.screen),bossAlpha:r.boss.paints.map(p=>p.alpha)}))},null,2));
}finally{await browser.close();}
