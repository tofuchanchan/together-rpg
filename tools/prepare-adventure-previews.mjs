import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {chromium} from 'file:///C:/Users/fuweicheng/.codex/skills/node_modules/playwright/index.mjs';
import {CODEX_PREVIEW_FILES} from '../src/coop/codex-preview-files.js';
const browser=await chromium.launch({headless:true});
try{
 const p=await browser.newPage();await p.route('**/__adventure-previews',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><title>Export</title>'}));await p.goto('http://127.0.0.1:4173/__adventure-previews');
 const previews=await p.evaluate(async()=>{const [{loadCodexArt,paintCodexArt},{findCodexEntry}]=await Promise.all([import('/src/coop/codex-art.js'),import('/src/coop/codex-data.js')]);await loadCodexArt();const c=document.createElement('canvas');c.width=640;c.height=380;return ['boss:mossbell','objective:nest','objective:beacon'].map(id=>{const e=findCodexEntry(id);paintCodexArt(c,e);return [`enemy-${e.art.kind}`,c.toDataURL('image/webp',.9).split(',')[1]];});});
 const files={...CODEX_PREVIEW_FILES};for(const [key,base64] of previews){const data=Buffer.from(base64,'base64'),hash=createHash('sha256').update(data).digest('hex').slice(0,12),file=`${key}-${hash}.webp`;fs.writeFileSync(`assets/codex/${file}`,data);files[key]=file;}
 fs.writeFileSync('src/coop/codex-preview-files.js',`// Generated independent 640 x 380 catalogue previews.\nexport const CODEX_PREVIEW_FILES=Object.freeze(${JSON.stringify(files,null,2)});\n`);console.log('Exported three adventure previews');
}finally{await browser.close();}
