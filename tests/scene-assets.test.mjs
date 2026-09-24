import test from 'node:test';
import assert from 'node:assert/strict';
import {requiredSceneAssets,upcomingSceneAssets,createSceneAssets} from '../src/coop/scene-assets.js';
test('opening room and setup do not require future equipment, bonus monsters or boss',()=>{
 for(const mode of ['menu','play'])assert.deepEqual(requiredSceneAssets({mode,room:1,heroes:[{equipment:{}}]}),[]);
 assert.deepEqual(upcomingSceneAssets({mode:'menu',room:10,time:100}),[]);
 assert.deepEqual(upcomingSceneAssets({mode:'play',room:1,time:10}),[]);
});
test('every future scene requires its art before drawing or advancing',()=>{
 assert.deepEqual(requiredSceneAssets({mode:'shop'}),['shop','equipment']);
 assert.deepEqual(requiredSceneAssets({mode:'routeReward'}),['shop','equipment']);
 assert.deepEqual(requiredSceneAssets({mode:'route'}),['objectives']);
 assert.deepEqual(requiredSceneAssets({objective:{kind:'defend'}}),['objectives']);
 assert.deepEqual(requiredSceneAssets({bonusEvent:{}}),['bonus']);
 assert.deepEqual(requiredSceneAssets({enemies:[{kind:'mossbell'}]}),['boss']);
 assert.deepEqual(requiredSceneAssets({effects:[{type:'adventure-death'}]}),['boss']);
 assert.deepEqual(requiredSceneAssets({heroes:[{equipment:{armor:{}}}]}),['equipment']);
});
test('concurrent requests share work, failures block until explicit retry',async()=>{
 let calls=0,release;const gate=new Promise(r=>release=r);
 const assets=createSceneAssets({boss:async()=>{calls++;await gate;if(calls===1)throw Error('offline');}});
 assert.equal(assets.ready(['boss']),false);assets.ready(['boss']);await Promise.resolve();assert.equal(calls,1);
 release();await assets.wait(['boss']);assert.equal(assets.snapshot().boss.status,'error');
 assert.equal(assets.ready(['boss']),false);assert.equal(calls,1);
 await assets.retry(['boss']);assert.equal(assets.ready(['boss']),true);assert.equal(calls,2);
 await assets.wait(['boss']);assert.equal(calls,2);
});
test('prefetch does not download every future group together',async()=>{
 let release;const gate=new Promise(r=>release=r),calls=[];
 const a=createSceneAssets({shop:async()=>{calls.push('shop');await gate;},equipment:async()=>{calls.push('equipment');}});
 a.prefetch(['shop','equipment']);a.prefetch(['shop','equipment']);await Promise.resolve();assert.deepEqual(calls,['shop']);
 release();await a.wait(['shop']);a.prefetch(['shop','equipment']);await a.wait(['equipment']);assert.deepEqual(calls,['shop','equipment']);
});
