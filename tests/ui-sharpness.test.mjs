import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {skinLayout} from '../src/coop/world-assets.js';
import {text,uiFont} from '../src/coop/art.js';
import {bar} from '../src/coop/world-art.js';
import {View} from '../src/coop/render.js';

const manifest=JSON.parse(fs.readFileSync(new URL('../assets/world/manifest.json',import.meta.url)));
test('Nine-slice boundaries tile each source and target and keep illustrated corners proportional',()=>{
 for(const [name,frame] of Object.entries(manifest.frames).filter(([name])=>/^(button-|panel-|card-|skill-slot)/.test(name))){
  for(const [width,height] of [[135,38],[66,22],[540,79],[508,146],[70,77]]){
   const parts=skinLayout(name,frame.content,width,height);
   for(const [key,total] of [['xs',frame.content[2]],['ys',frame.content[3]],['dx',width],['dy',height]]){
    assert.equal(parts[key][0],0);assert.equal(parts[key][3],total);
    assert.ok(parts[key].every((value,i)=>i===0||value>parts[key][i-1]),`${name} ${key} contains a reversed/empty slice`);
   }
   assert.ok(Math.abs(parts.dx[1]/parts.xs[1]-parts.dy[1]/parts.ys[1])<1e-10,`${name}: corners must not stretch vertically`);
  }
 }
});
test('Short buttons keep the source rounded inner rim in the preserved corner bands',()=>{
 const f=manifest.frames['button-cyan'],p=skinLayout('button-cyan',f.content,135,38);
 assert.ok(p.ys[1]>=45,'top cut must be inside the flat middle, below the curved upper rim');
 assert.ok(f.content[3]-p.ys[2]>=45,'bottom cut must preserve the curved lower rim');
 assert.ok(p.dy[2]-p.dy[1]>=14,'label center remains tall enough at the original 38 px size');
});
function textContext(){return {font:'',measured:[],drawn:[],measureText(value){this.measured.push(this.font);return {width:[...value].length*14};},fillText(value){this.drawn.push({value,font:this.font});}};}
test('Truncation measures the exact font family and weight used to paint text',()=>{
 const c=textContext(),v={c};
 for(const weight of [500,700]){const result=View.prototype.fit.call(v,'很长的升级技能说明文字',80,14,weight);text(c,result,0,0,14,undefined,undefined,weight);assert.ok(result.endsWith('…'));assert.equal(c.drawn.at(-1).font,uiFont(14,weight));assert.equal(c.measured.at(-1),c.drawn.at(-1).font);}
});
test('Wrapped descriptions use one font for every measurement and every drawn line',()=>{
 const c=textContext(),v={c,fit:View.prototype.fit};View.prototype.wrap.call(v,'技能说明换行后仍然正确测量不会越出右边界',0,0,84,14,2);
 assert.equal(c.drawn.length,2);assert.ok(c.measured.every(font=>font===uiFont(14)));assert.ok(c.drawn.every(line=>line.font===uiFont(14)&&[...line.value].length<=6));
});
test('Thin health and experience bars clamp fills and use crisp vector geometry without atlas stretching',()=>{
 for(const height of [6,9,13,23])for(const ratio of [-1,.5,2]){
  const fills=[],c={save(){},restore(){},beginPath(){},roundRect(){},clip(){},fill(){},fillRect(...args){fills.push(args);},drawImage(){assert.fail('Thin bars must not stretch atlas artwork');}};
  bar(c,0,0,100,height,ratio);assert.equal(fills.length,2);assert.ok(fills.every(([, ,w,h])=>w>=0&&w<=100&&h>0&&h<=height));
 }
});
