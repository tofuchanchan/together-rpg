import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {RUNTIME_ART_FILES} from '../src/coop/runtime-art-files.js';
import {runtimeArtUrl} from '../src/coop/runtime-art.js';
const root=new URL('../',import.meta.url);
const read=path=>fs.readFileSync(new URL(path,root));
test('every runtime image is content-addressed and retains its authored source',()=>{
 const records=JSON.parse(read('assets/runtime/build-report.json'));
 for(const r of records){
  assert.ok(read(r.source).length>0);const image=read(r.target);
  assert.equal(image.length,r.bytes);assert.equal(image.toString('ascii',8,12),'WEBP');
  assert.ok(r.target.includes(createHash('sha256').update(image).digest('hex').slice(0,12)));
  if(r.thumbnail)assert.ok(Math.max(r.width,r.height)<=384);
  else assert.equal(RUNTIME_ART_FILES[r.source],r.target);
 }
 assert.ok(records.reduce((s,r)=>s+r.bytes,0)<records.reduce((s,r)=>s+r.sourceBytes,0)*.65);
});
test('thumbnail catalog preserves appearance identity and bonus frame geometry',()=>{
 const before=JSON.parse(read('assets/shop/manifest.json')),after=JSON.parse(read('assets/runtime/shop-manifest.json'));
 assert.deepEqual(Object.keys(after.icons),Object.keys(before.icons));assert.deepEqual(after.bonus,before.bonus);
 for(const [key,icon] of Object.entries(after.icons)){
  assert.equal(icon.sourceSha256,before.icons[key].sourceSha256);assert.equal(icon.source,before.icons[key].source);
  assert.deepEqual(icon.frame.slice(0,2),[0,0]);assert.ok(Math.max(...icon.frame.slice(2))<=384);
  assert.ok(read(new URL(icon.file,new URL('assets/shop/',root)).href).length>0);
 }
});
test('runtime URL resolver preserves repository base and unknown assets',()=>{
 assert.equal(runtimeArtUrl('warrior.png',new URL('assets/characters/',root)),new URL(RUNTIME_ART_FILES['assets/characters/warrior.png'],root).href);
 assert.equal(runtimeArtUrl('manifest.json',new URL('assets/characters/',root)),new URL('assets/characters/manifest.json',root).href);
 assert.equal(runtimeArtUrl('https://example.org/image.png',root),'https://example.org/image.png');
});
