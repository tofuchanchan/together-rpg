import test from 'node:test';
import assert from 'node:assert/strict';
import {decodeArt} from '../src/coop/decode-art.js';
test('loaded image retries one transient decode failure',async()=>{let attempts=0;await decodeArt({complete:true,naturalWidth:1254,naturalHeight:1254,decode:async()=>{if(++attempts===1)throw Error('decode');}});assert.equal(attempts,2);});
test('broken image cannot be accepted based on a retry',async()=>{let attempts=0;await assert.rejects(decodeArt({complete:true,naturalWidth:0,naturalHeight:0,decode:async()=>{attempts++;throw Error('broken');}}),/broken/);assert.equal(attempts,1);});
test('persistent decoder error still fails after the bounded retry',async()=>{let attempts=0;await assert.rejects(decodeArt({complete:true,naturalWidth:1254,naturalHeight:1254,decode:async()=>{attempts++;throw Error('failed');}}),/failed/);assert.equal(attempts,2);});
