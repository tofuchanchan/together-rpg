import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {execFileSync} from 'node:child_process';
import {chromium} from 'file:///C:/Users/fuweicheng/.codex/skills/node_modules/playwright/index.mjs';
const root=process.cwd(),out='output/verification/loading-optimization';fs.mkdirSync(out,{recursive:true});
const git=(...args)=>execFileSync('git',['-c',`safe.directory=${root.replaceAll('\\','/')}`,...args],{maxBuffer:32*1024*1024});
const baseline=process.env.LOADING_BASELINE||'e10ce31bfda61e95a36c2576d3f8175245143010';
const changed=git('diff',baseline,'--name-only').toString().trim().split('\n');
const originals=new Map(changed.filter(f=>/\.(?:html|js|css|json)$/.test(f)&&fs.existsSync(f)).map(f=>[f,git('show',`${baseline}:${f}`)]));
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp'};
const server=http.createServer((req,res)=>{
 const parts=decodeURIComponent(new URL(req.url,'http://localhost').pathname).split('/').filter(Boolean),version=parts.shift(),file=parts.join('/')||'index.html';
 const absolute=path.resolve(root,file);if(!absolute.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 try{const body=version==='before'&&originals.has(file)?originals.get(file):fs.readFileSync(absolute);res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'}).end(body);}catch{res.writeHead(404).end();}
});
await new Promise(r=>server.listen(4176,'127.0.0.1',r));const browser=await chromium.launch({headless:true}),results={baseline,network:{megabitsPerSecond:10,latencyMs:40,cache:'disabled'},runs:[]};
try{for(const version of ['before','after']){
 const context=await browser.newContext({viewport:{width:1440,height:900}}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
 const cdp=await context.newCDPSession(page);await cdp.send('Network.enable');await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:40,downloadThroughput:1250000,uploadThroughput:1250000});
 await page.addInitScript(()=>{performance.setResourceTimingBufferSize(1000);window.loadingMarks={};const poll=()=>{if(document.body?.dataset.screen==='title'&&!loadingMarks.title)loadingMarks.title=performance.now();if(window.assetsReady&&!loadingMarks.ready)loadingMarks.ready=performance.now();requestAnimationFrame(poll);};poll();});
 await page.goto(`http://127.0.0.1:4176/${version}/`,{waitUntil:'domcontentloaded',timeout:120000});
 await page.waitForFunction(()=>window.assetsReady&&window.loadingMarks.ready&&JSON.parse(render_game_to_text()).heroPortraits.ready,null,{timeout:180000});
 const result=await page.evaluate(()=>({marks:loadingMarks,files:performance.getEntriesByType('resource').map(r=>({path:new URL(r.name).pathname,size:r.decodedBodySize,wire:r.encodedBodySize,duration:r.duration})),state:JSON.parse(render_game_to_text())}));
 result.version=version;result.errors=errors;result.total=result.files.reduce((s,f)=>s+f.size,0);results.runs.push(result);
 console.log(JSON.stringify({version,total:result.total,requests:result.files.length,marks:result.marks,errors}));
 await page.screenshot({path:`${out}/${version}-title.png`});await page.locator('#title-start').click();await page.waitForFunction(()=>document.body.dataset.screen==='setup');await page.screenshot({path:`${out}/${version}-setup.png`});
 await page.keyboard.press('Enter');await page.waitForFunction(()=>document.body.dataset.screen==='game');await page.screenshot({path:`${out}/${version}-game.png`});await context.close();
 }}finally{fs.writeFileSync(`${out}/benchmark.json`,JSON.stringify(results,null,2));await browser.close();await new Promise(r=>server.close(r));}
