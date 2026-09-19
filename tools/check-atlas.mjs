import fs from 'node:fs';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{PNG}=require('C:/Users/fuweicheng/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/pngjs');
const m=JSON.parse(fs.readFileSync('assets/warrior/manifest.json')),images={};
assert.ok(m.origin.every(x=>x>=0&&x<=1));
let checked=0;const clipped=[];
for(const clip of m.clips){const im=PNG.sync.read(fs.readFileSync(`assets/warrior/${clip}.png`));images[clip]=im;assert.equal(im.width,m.frameWidth*16);assert.equal(im.height,m.frameHeight*8);
 for(let d=0;d<8;d++)for(let f=0;f<16;f++){let ink=0,border=0;for(let y=0;y<224;y++)for(let x=0;x<192;x++){const a=im.data[((d*224+y)*im.width+f*192+x)*4+3];if(a>16){ink++;if(x===0||y===0||x===191||y===223)border++;}}assert.ok(ink>100,`${clip}/${d}/${f} empty`);if(border)clipped.push({clip,d,f,border});checked++;}
}
assert.deepEqual(clipped,[],'atlas frames must have clear borders');
function equalFrames(a,b,d,af,bf){for(let y=0;y<224;y++)for(let x=0;x<192;x++)for(let c=0;c<4;c++)assert.equal(a.data[((d*224+y)*a.width+af*192+x)*4+c],b.data[((d*224+y)*b.width+bf*192+x)*4+c]);}
for(const clip of ['upper-attack','upper-bash'])for(let d=0;d<8;d++){equalFrames(images[clip],images['upper-idle'],d,0,0);equalFrames(images[clip],images['upper-idle'],d,15,0);}
const report={checkedFrames:checked,clipped,origin:m.origin,transitionEndpointComparisons:32,allPassed:true};
fs.mkdirSync('output',{recursive:true});fs.writeFileSync('output/atlas-check.json',JSON.stringify(report,null,2));console.log(report);
