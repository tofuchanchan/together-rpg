import {chromium} from 'file:///C:/Users/fuweicheng/.codex/skills/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const out=process.env.ART_OUT||'output/art-overhaul';fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1440,height:940}});
const errors=[],checks=[],requests=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.url().includes('/assets/world/'))requests.push({path:new URL(r.url()).pathname,status:r.status()});});
const mark=label=>{checks.push(label);console.log('PASS',label);};
const shot=async name=>{await page.evaluate(()=>coopTest.render());await page.locator('#game canvas').screenshot({path:`${out}/${name}.png`});};
try{
 await page.goto('http://127.0.0.1:4173/');await page.waitForFunction(()=>window.assetsReady);await page.evaluate(()=>advanceTime(0));
 const state=await page.evaluate(()=>JSON.parse(render_game_to_text()));assert.deepEqual(state.worldArt,{ready:true,source:'illustrated-png-atlases',pages:8,frames:192});assert.ok(state.characterArt.ready);await shot('menu');
 for(const name of ['forest','thornking','bestiary','enemies','props','icons','ui','effects','projectiles'])assert.ok(requests.some(r=>r.path.endsWith(`/${name}.png`)&&r.status===200));mark('All illustrated atlases and background loaded before gameplay');
 const spinBounds=await page.evaluate(async()=>{const {heroAction}=await import('/src/coop/world-art.js');return [.3,.6].map(q=>{const cv=document.createElement('canvas');cv.width=cv.height=480;const c=cv.getContext('2d');c.translate(240,240);heroAction(c,{role:'warrior',action:{type:'spin',t:q,duration:1,dir:{x:1,y:0}}});const d=c.getImageData(0,0,480,480).data;let l=480,r=0,t=480,b=0;for(let y=0;y<480;y++)for(let x=0;x<480;x++)if(d[(y*480+x)*4+3]>40){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);}return{width:r-l,height:b-t};});});
 for(const bounds of spinBounds)assert.ok(bounds.width/bounds.height>1.15,`Spin must stay on ground plane: ${JSON.stringify(bounds)}`);mark('Rotating spin remains horizontally projected at multiple action phases');
 await page.evaluate(()=>{coopTest.start();coopTest.world.heroes.forEach(h=>h.skills=[1,1]);});await page.keyboard.down('a');await page.keyboard.down('ArrowRight');await page.evaluate(()=>advanceTime(440));await page.keyboard.up('a');await page.keyboard.up('ArrowRight');await page.evaluate(()=>advanceTime(650));
 await page.keyboard.down('e');await page.keyboard.down('Numpad2');await page.evaluate(()=>advanceTime(260));await page.keyboard.up('e');await page.keyboard.up('Numpad2');await shot('combat');
 fs.writeFileSync(`${out}/combat-state.json`,await page.evaluate(()=>render_game_to_text()));
 // Deliberately staged art review: combat regressions separately use unmodified game rules.
 await page.evaluate(()=>{const w=coopTest.world;coopTest.start();w.heroes[0].x=-125;w.heroes[0].y=90;w.heroes[1].x=80;w.heroes[1].y=80;w.heroes[2].x=180;w.heroes[2].y=170;w.camera={x:0,y:0,zoom:1};w.enemies[0].x=215;w.enemies[0].y=-20;w.enemies[0].action={x:155,y:115,r:90,t:.49,windup:.7,hit:false};w.heroes[0].action={type:'spin',t:.17,duration:.53,dir:{x:1,y:0},hit:new Set()};w.heroes[1].action={type:'frost',t:.19,duration:.38,dir:{x:1,y:0}};w.effects=[{type:'frost',x:80,y:80,r:185,life:.27,max:.48},{type:'blast',x:-310,y:-40,r:95,life:.21,max:.4},{type:'poof',x:335,y:150,life:.22,max:.35}];w.projectiles=[{type:'fireball',x:50,y:-160,dx:1,dy:.2},{type:'pierce',x:190,y:185,dx:1,dy:-.4},{type:'bolt',x:300,y:-120,dx:-1,dy:.2}];coopTest.render();});await shot('effects-review');
 await page.evaluate(()=>{const w=coopTest.world;w.options.feedback=false;coopTest.render();});await shot('feedback-off');mark('Combat, layered effects, projectiles and enemy warning render with feedback on and off');
 await page.evaluate(()=>{coopTest.world.options.feedback=true;coopTest.world.beginUpgrade();coopTest.world.confirm(0);});await shot('upgrade');
 await page.evaluate(()=>coopTest.world.pause('暂停与设备绑定'));await shot('pause');
 await page.evaluate(()=>{coopTest.router.claim(1);});await shot('device-binding');
 await page.evaluate(()=>{coopTest.router.awaiting=null;coopTest.world.mode='complete';});await shot('complete');
 await page.evaluate(()=>{coopTest.world.mode='defeat';});await shot('defeat');mark('Menu, HUD, upgrades, waiting state, pause, binding, completion and defeat use illustrated UI');
 await page.goto('http://127.0.0.1:4173/art-lab.html');await page.waitForFunction(()=>window.artLab?.ready);await page.evaluate(()=>artLab.freeze(.4));
 for(const clip of ['move','windup','strike']){await page.selectOption('#clip',clip);await page.locator('#enemies').screenshot({path:`${out}/enemies-${clip}.png`});}
 for(const id of ['props','icons','ui','projectiles'])await page.locator(`#${id}`).screenshot({path:`${out}/${id}-review.png`});
 for(let i=0;i<4;i++){await page.evaluate(t=>artLab.freeze(t),i*.25+.03);await page.locator('#effects').screenshot({path:`${out}/effects-frame-${i}.png`});}mark('Both enemies at eight directions, all props/icons/UI/markers and four effect stages render in art lab');
 await page.setViewportSize({width:430,height:932});await page.goto('http://127.0.0.1:4173/');await page.waitForFunction(()=>window.assetsReady);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:`${out}/mobile-layout.png`});mark('Narrow layout stays inside viewport (touch gameplay not implemented)');
 const failed=await browser.newPage();await failed.route('**/assets/world/enemies.png',route=>route.abort());await failed.goto('http://127.0.0.1:4173/');await failed.waitForFunction(()=>document.querySelector('#status').textContent.includes('素材加载失败'));assert.equal(await failed.evaluate(()=>!!window.assetsReady),false);await failed.close();mark('Missing atlas blocks ready state and displays a loading error');
 assert.deepEqual(errors,[]);assert.ok(requests.every(r=>r.status===200));fs.writeFileSync(`${out}/results.json`,JSON.stringify({checks,errors,requests:[...new Map(requests.map(r=>[r.path,r])).values()],stagedScreenshots:['effects-review','feedback-off','upgrade','pause','device-binding','complete','defeat'],note:'Effects review is staged visual inspection, not a gameplay completion claim. Physical gamepads not tested.'},null,2));
}finally{await browser.close();}
