import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'C:/Users/fuweicheng/.codex/skills/node_modules/playwright');
fs.mkdirSync('assets/warrior',{recursive:true});
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage();page.on('pageerror',e=>console.error(e));
 await page.exposeFunction('saveAtlas',(name,data)=>{fs.writeFileSync(`assets/warrior/${name}.png`,Buffer.from(data.split(',')[1],'base64'));console.log('Baked',name);});
 await page.goto('http://127.0.0.1:4173/tools/bake.html');await page.waitForFunction(()=>window.bake);
 const meta=await page.evaluate(()=>window.bake());fs.writeFileSync('assets/warrior/manifest.json',JSON.stringify(meta,null,2));console.log('8 directions × 6 layers × 16 frames ready');
}finally{await browser.close();}
