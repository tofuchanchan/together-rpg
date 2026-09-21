import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {bossPose,adventureArtState} from '../src/coop/adventure-art.js';
const manifest=JSON.parse(fs.readFileSync(new URL('../assets/adventure/manifest.json',import.meta.url)));
const action=(kind,t,windup,duration)=>bossPose({action:{kind,t,windup,duration}},t);
test('adventure loading does not claim ready before the whole manifest is decoded',()=>assert.equal(adventureArtState().ready,false));
test('registered atlases keep full poses, valid foot anchors and unmodified source hashes',()=>{
 assert.equal(Object.values(manifest.assets).reduce((n,a)=>n+a.frames.length,0),64);
 for(const [key,a] of Object.entries(manifest.assets)){
  const bytes=fs.readFileSync(new URL('../assets/adventure/'+a.file,import.meta.url));assert.equal(createHash('sha256').update(bytes).digest('hex'),a.sha256,key);
  for(const f of a.frames){assert.ok(f.x>=0&&f.y>=0&&f.x+f.w<=a.width&&f.y+f.h<=a.height,key);
   if(key.startsWith('mossbell')){assert.ok(f.anchor.x>0&&f.anchor.x<f.w);assert.ok(f.anchor.y>f.h*.7&&f.anchor.y<=f.h);assert.ok(f.core.x>0&&f.core.x<f.w);assert.ok(f.core.y>0&&f.core.y<f.h);}
   for(const [x,y,w,h] of f.clip||[])assert.ok(x>=0&&y>=0&&x+w<=f.w&&y+h<=f.h);
  }
 }
});
test('sweep anticipates then releases exactly on the combat windup, with visible recovery',()=>{
 assert.equal(action('sweep',1.099,1.1,2.25).frame,6);
 assert.deepEqual(action('sweep',1.1,1.1,2.25),{asset:'mossbell-sweep-v2',frame:7,offset:0});
 assert.equal(action('sweep',1.2,1.1,2.25).frame,8);
 assert.equal(action('sweep',1.5,1.1,2.25).frame,10);
 assert.equal(action('sweep',2.2,1.1,2.25).frame,11);
});
test('summon and transition replace the single held pose with complete authored sequences',()=>{
 const frames=new Set();for(let t=0;t<2.1;t+=1/60){const p=action('summon',t,1.3,2.1);assert.equal(p.asset,'mossbell-ritual-v2');frames.add(p.frame);}assert.equal(frames.size,8);
 assert.equal(action('summon',1.3,1.3,2.1).frame,4);
 const transition=new Set();for(let t=0;t<1.5;t+=1/60)transition.add(action('transition',t,1.4,1.5).frame);assert.deepEqual([...transition],[8,9,10,11,12,13,14,15]);
});
test('ultimate poses track all three released rings then stay exposed through recovery',()=>{
 for(const t of [2.2,2.9,3.6])assert.ok([4,6].includes(action('ultimate',t+1e-7,2.2,7.6).frame));
 for(const t of [4.1,5,6,7.5])assert.ok(action('ultimate',t,2.2,7.6).frame>=8);
 assert.ok(action('leap',.98,1.4,2.7).offset<0);
 assert.ok(Math.abs(action('leap',1.4,1.4,2.7).offset)<1e-9);
});
