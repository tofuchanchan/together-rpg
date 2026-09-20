import test from 'node:test';
import assert from 'node:assert/strict';
import {planRenderSurface,LOGICAL_WIDTH,LOGICAL_HEIGHT,MAX_RENDER_PIXELS} from '../src/coop/render-resolution.js';

test('both display axes and DPR determine required pixels, not the fixed game size',()=>{
 for(const width of [1440,1920])for(const dpr of [1,1.5,2]){
  const result=planRenderSurface(width,width*9/16,dpr);
  const scale=Math.min(2,width*dpr/1440);
  assert.equal(result.pixelWidth,Math.ceil(1440*scale));
  assert.equal(result.pixelHeight,Math.ceil(810*scale));
  assert.equal(result.logicalWidth,1440);assert.equal(result.logicalHeight,810);
 }
});
test('small displays do not allocate a desktop-sized framebuffer',()=>{
 const result=planRenderSurface(390,390*9/16,2);
 assert.equal(result.pixelWidth,780);assert.equal(result.pixelHeight,439);
 assert.ok(result.scaleX<1);assert.ok(result.scaleY<1);
});
test('4K and high-DPR screens stay within the 2x / 4.67 MP budget',()=>{
 for(const size of [[3840,2160,2],[7680,4320,4],[1920,1080,10]]){
  const result=planRenderSurface(...size);
  assert.equal(result.pixelWidth,2880);assert.equal(result.pixelHeight,1620);
  assert.ok(result.pixelWidth*result.pixelHeight<=MAX_RENDER_PIXELS);
 }
});
test('invalid or hidden display sizes retain a safe logical fallback',()=>{
 for(const size of [[0,0,1],[-1,810,NaN],[Infinity,810,2]]){
  const result=planRenderSurface(...size);
  assert.equal(result.pixelWidth,LOGICAL_WIDTH);assert.equal(result.pixelHeight,LOGICAL_HEIGHT);
 }
});
test('test-only legacy density changes pixels without changing logical geometry',()=>{
 const result=planRenderSurface(1920,1080,2,1);
 assert.equal(result.pixelWidth,1440);assert.equal(result.pixelHeight,810);
 assert.equal(result.displayWidth,1920);assert.equal(result.displayHeight,1080);
 assert.equal(result.scaleX,1);assert.equal(result.scaleY,1);
});
