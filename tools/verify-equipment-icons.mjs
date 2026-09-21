import {chromium} from 'file:///C:/Users/fuweicheng/.codex/skills/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const out='output/verification/equipment-icon-redraw';fs.mkdirSync(out,{recursive:true});
const html=`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>装备图标与实际换装对照</title><style>
*{box-sizing:border-box}body{margin:0;background:#e8eddc;color:#203e30;font-family:system-ui,"Microsoft YaHei",sans-serif}header{padding:20px 28px;background:#244c39;color:#fff8dc}h1{font-size:25px;margin:0 0 8px}p{margin:0;font-size:14px}nav{display:flex;gap:10px;padding:14px 28px}button{padding:10px 28px;border:0;border-radius:9px;background:#ccd7bb;color:#214733;font:700 16px inherit;cursor:pointer}button[aria-pressed="true"]{background:#285b43;color:#fff4cc}main{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;padding:0 28px 24px}article{border:1px solid #b9c6a6;background:#f7f8ec;border-radius:14px;padding:12px;overflow:hidden}h2{margin:0;font-size:18px}small{font-size:11px;color:#687d67}canvas{display:block;width:100%;height:auto}footer{padding:0 28px 20px;color:#60705d;font-size:13px}@media(max-width:800px){main{grid-template-columns:1fr}}
</style><header><h1>装备图标 × 实际换装</h1><p>左：游戏正面贴图　中：重绘物品图标　右：64px 商店尺寸。轮廓、颜色与标志逐件对照。</p></header><nav><button data-role="warrior" aria-pressed="true">战士 · 7件</button><button data-role="mage">法师 · 7件</button><button data-role="archer">弓手 · 7件</button></nav><main></main><footer>防具仅展示空盔、衣甲及配件。战斗中装备外观保持原样。</footer><script type="module">
import {EQUIPMENT_APPEARANCES} from '../../../src/coop/equipment-data.js';
import {loadShopEventArt,drawEquipmentIcon} from '../../../src/coop/shop-event-art.js';
const runtime=await(await fetch('../../../assets/equipment/manifest.json')).json();await loadShopEventArt();
async function show(role){document.body.dataset.ready='false';document.querySelectorAll('nav button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.role===role));document.querySelector('main').replaceChildren();
 for(const [slot,items]of Object.entries(EQUIPMENT_APPEARANCES[role]))for(const item of items){
  const article=document.createElement('article');article.innerHTML='<h2>'+item.name+'</h2><small>'+item.key+'</small>';const canvas=document.createElement('canvas');canvas.width=420;canvas.height=242;const c=canvas.getContext('2d');
  const entry=(slot==='weapon'?runtime.weapons:runtime.bodies)[item.key],im=new Image();im.src='../../../assets/equipment/'+entry.image;await im.decode();const cut=document.createElement('canvas');cut.width=cut.height=256;const ctx=cut.getContext('2d',{willReadFrequently:true}),f=entry.frames[0];ctx.drawImage(im,f.x,f.y,256,256,0,0,256,256);const px=ctx.getImageData(0,0,256,256).data;let l=256,t=256,r=0,b=0;for(let y=0;y<256;y++)for(let x=0;x<256;x++)if(px[(y*256+x)*4+3]>32){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);}const w=r-l+1,h=b-t+1,s=Math.min(126/w,170/h);c.drawImage(cut,l,t,w,h,70-w*s/2,102-h*s/2,w*s,h*s);
  if(!drawEquipmentIcon(c,{visualKey:item.key},232,104,180))throw Error(item.key);c.fillStyle='#244c39';c.beginPath();c.roundRect(335,67,80,80,10);c.fill();drawEquipmentIcon(c,{visualKey:item.key},375,107,64);
  c.fillStyle='#486149';c.textAlign='center';c.font='14px sans-serif';c.fillText('实际装备',70,222);c.fillText('重绘图标',232,222);c.fillText('64px',375,173);article.append(canvas);document.querySelector('main').append(article);
 }document.body.dataset.role=role;document.body.dataset.ready='true';
}document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>show(b.dataset.role));await show('warrior');
</script></html>`;
fs.writeFileSync(`${out}/index.html`,html);
const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1440,height:1150}}),errors=[],checks=[];
page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
try{
 await page.goto(`http://127.0.0.1:4173/${out}/index.html`);await page.waitForFunction(()=>document.body.dataset.ready==='true');
 for(const role of ['warrior','mage','archer']){await page.locator('button[data-role="'+role+'"]').click();await page.waitForFunction(role=>document.body.dataset.ready==='true'&&document.body.dataset.role===role,role);assert.equal(await page.locator('article').count(),7);await page.screenshot({path:`${out}/${role}-comparison.png`,fullPage:true});checks.push(`${role}: seven actual runtime sprites, item icons and 64px previews`);}
 await page.goto('http://127.0.0.1:4173/?shopTrial=warrior&players=2');await page.waitForFunction(()=>window.assetsReady===true);await page.waitForFunction(()=>typeof coopTest!=='undefined'&&coopTest.world.mode==='shop');
 assert.deepEqual(await page.evaluate(()=>JSON.parse(render_game_to_text()).shopEventArt),{ready:true,equipmentIcons:21,bonusFrames:8});await page.locator('#game canvas').screenshot({path:`${out}/shop-duo.png`});checks.push('Actual two-player shop loads new ID-bound icons');
 assert.deepEqual(errors,[]);fs.writeFileSync(`${out}/browser.json`,JSON.stringify({checks,errors},null,2));console.log(JSON.stringify({checks,errors},null,2));
}finally{await browser.close();}
