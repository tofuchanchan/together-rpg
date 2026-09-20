import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {CODEX_ENTRIES} from '../src/coop/codex-data.js';
import {codexImageKey} from '../src/coop/codex-image-key.js';
import {CODEX_PREVIEW_FILES} from '../src/coop/codex-preview-files.js';
import {codexImageUrl} from '../src/coop/codex-image.js';

test('every catalogue entry has a real content-versioned preview',()=>{
 const files=new Set();
 for(const entry of CODEX_ENTRIES){
  const key=codexImageKey(entry.art),file=CODEX_PREVIEW_FILES[key];assert.ok(file,entry.id);
  const url=codexImageUrl(entry),data=fs.readFileSync(new URL(url));
  assert.equal(data.subarray(0,4).toString(),'RIFF');assert.equal(data.subarray(8,12).toString(),'WEBP');
  assert.ok(file.includes(createHash('sha256').update(data).digest('hex').slice(0,12)),`${entry.id}: filename must change when artwork changes`);
  assert.ok(data.length<40000,`${entry.id}: preview should be small enough for mobile`);files.add(file);
 }
 assert.equal(files.size,Object.keys(CODEX_PREVIEW_FILES).length);
});
test('different art types cannot collide and filename parts cannot escape assets',()=>{
 assert.notEqual(codexImageKey({type:'hero',role:'warrior'}),codexImageKey({type:'icon',key:'warrior'}));
 assert.throws(()=>codexImageKey({type:'icon',key:'../../secret'}));
 assert.throws(()=>codexImageKey({type:'unknown',key:'warrior'}));
});
