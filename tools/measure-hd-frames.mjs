import {chromium} from 'file:///C:/Users/fuweicheng/.codex/skills/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

// Freeze simulation, then sample one View.draw in each ordinary Phaser rAF.
// Timing ends at draw submission: intervals reveal renderer backpressure but do
// not measure physical presentation, input latency or a real game FPS benchmark.
const out='output/verification/hd-ui',gpu=process.argv.includes('--gpu');
const countArg=process.argv.find(a=>a.startsWith('--frames='));
const sampleFrames=Number(countArg?.split('=')[1]||180),warmup=45;
const only=process.argv.find(a=>a.startsWith('--only='))?.split('=')[1];
fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:gpu?['--enable-gpu']:[]});
const cdp=await browser.newBrowserCDPSession();
const info=await cdp.send('SystemInfo.getInfo');
const results=[];
const percentile=(samples,q)=>samples[Math.min(samples.length-1,Math.floor(samples.length*q))];
const summary=values=>{const a=[...values].sort((x,y)=>x-y);return {count:a.length,mean:a.reduce((x,y)=>x+y,0)/a.length,p50:percentile(a,.5),p95:percentile(a,.95),max:a.at(-1)};};
try{
 for(const mode of ['baseline','density-1','layered-hd','full-hd'].filter(x=>!only||x===only)){
  const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1.5});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  if(mode==='baseline'){
   await page.route('**/src/coop/*.js*',route=>{const name=path.basename(new URL(route.request().url()).pathname),file=path.join(out,'baseline-src',name);return fs.existsSync(file)?route.fulfill({status:200,contentType:'text/javascript',body:fs.readFileSync(file)}):route.continue();});
   await page.route('http://127.0.0.1:4173/',route=>route.fulfill({status:200,contentType:'text/html',body:fs.readFileSync(path.join(out,'baseline-index.html'))}));
  }else if(mode==='full-hd'){
   await page.route('**/src/coop/render.js*',route=>{
    const source=fs.readFileSync('src/coop/render.js','utf8');
    const pattern=/const buffered=\(this\.renderScaleX\|\|1\)>1;/;
    if(!pattern.test(source))throw Error('World layer experiment needs review: production guard changed.');
    return route.fulfill({status:200,contentType:'text/javascript',body:source.replace(pattern,'const buffered=false;')});
   });
  }
  await page.goto('http://127.0.0.1:4173/');
  await page.waitForFunction(()=>window.assetsReady===true,null,{timeout:60000});
  await page.evaluate(()=>document.fonts.ready);
  if(mode!=='baseline')await page.waitForFunction(()=>JSON.parse(render_game_to_text()).heroPortraits.ready,null,{timeout:60000});
  await page.locator('#title-start').click();await page.evaluate(()=>advanceTime(0));
  if(mode==='density-1')await page.evaluate(()=>coopTest.setRenderScaleForTest(1));
  const records=[];
  for(const enemies of [0,24,128]){
   await page.evaluate(enemies=>{
    const w=coopTest.world;
    if(enemies){
     coopTest.start(['warrior','mage'],2);w.pressure=null;w.enemies=[];
     for(let i=0;i<enemies;i++){const a=i*2.39996,r=60+(i%11)*31;w.enemies.push(w.createEnemy(['seedling','goblin','bat','gnat'][i%4],Math.cos(a)*r,Math.sin(a)*r));}
     w.heroes.forEach(h=>{h.action=null;h.hitFlash=0;h.invuln=0;});
    }
    coopTest.render();
   },enemies);
   const samples=await page.evaluate(({warmup,sampleFrames})=>new Promise((resolve,reject)=>{
    const view=coopTest.view,draw=view.draw,start=performance.now(),worldBefore=JSON.stringify(coopTest.world.snapshot());
    const duration=[],intervals=[],rafIntervals=[];let previous,lastRaf,frames=0,rafId;
    function tick(t){if(lastRaf!==undefined&&frames>warmup)rafIntervals.push(t-lastRaf);lastRaf=t;rafId=requestAnimationFrame(tick);}
    rafId=requestAnimationFrame(tick);
    const timer=setTimeout(()=>{view.draw=draw;cancelAnimationFrame(rafId);reject(Error('Frame sampling timed out'));},60000);
    view.draw=function(dt){
     const t=performance.now();draw.call(this,dt);const end=performance.now();
     if(++frames>warmup){duration.push(end-t);if(previous!==undefined)intervals.push(t-previous);}
     previous=t;
     if(duration.length>=sampleFrames){view.draw=draw;clearTimeout(timer);cancelAnimationFrame(rafId);resolve({duration,intervals,rafIntervals,elapsed:end-start,worldUnchanged:JSON.stringify(coopTest.world.snapshot())===worldBefore});}
    };
   }),{warmup,sampleFrames});
   records.push({scene:enemies?`${enemies}-enemies`:'setup',drawSubmissionMs:summary(samples.duration),drawStartIntervalMs:summary(samples.intervals),rafIntervalMs:summary(samples.rafIntervals),intervalsAbove25ms:samples.intervals.filter(t=>t>25).length,intervalsAbove50ms:samples.intervals.filter(t=>t>50).length,worldUnchanged:samples.worldUnchanged});
   console.log(JSON.stringify({mode,...records.at(-1)}));
  }
  results.push({mode,records,dimensions:await page.evaluate(()=>{const c=coopTest.game.canvas,r=c.getBoundingClientRect();return {css:[r.width,r.height],backing:[c.width,c.height],view:[coopTest.view.c.canvas.width,coopTest.view.c.canvas.height],dpr:devicePixelRatio,renderSurface:JSON.parse(render_game_to_text()).renderSurface};}),errors});
  await page.close();
 }
 const hashes=Object.fromEntries(['app.js','render.js','render-resolution.js','portraits.js','world-art.js','world-assets.js','art.js'].map(name=>[name,crypto.createHash('sha256').update(fs.readFileSync(`src/coop/${name}`)).digest('hex')]));
 const result={capturedAt:new Date().toISOString(),scope:'One measured View.draw per normal Phaser requestAnimationFrame; simulation frozen; fixed 1920x1080 DPR1.5. Submission and browser callback intervals only: not physical presented FPS, input latency or real gameplay throughput. No browser screenshots during measured frames.',gpuFlag:gpu,sampleFrames,warmup,backend:info,results,hashes};
 const suffix=only?`-${only}`:'';fs.writeFileSync(`${out}/frame-performance-${gpu?'gpu':'default'}${suffix}.json`,JSON.stringify(result,null,2));
 console.log(JSON.stringify({backend:info.gpu,output:`frame-performance-${gpu?'gpu':'default'}${suffix}.json`}));
}finally{await browser.close();}
