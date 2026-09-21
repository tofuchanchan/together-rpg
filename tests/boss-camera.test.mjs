import test from 'node:test';
import assert from 'node:assert/strict';
import {World,MAP,MAP_SCALE} from '../src/coop/model.js';
import {createHero} from '../src/coop/recruitment.js';
import {frameBossCamera} from '../src/coop/boss-camera.js';

function arena(positions=[{x:230,y:180}],bossPosition={x:0,y:-20}){
 const w=new World(17);w.reset(positions.map(()=> 'warrior'),positions.length);Object.assign(w,{room:10,bossRoom:true,enemies:[],obstacles:[],pressure:null,spawnQueue:[],waveDuration:Infinity,enrageAt:Infinity,xpNext:Infinity});
 w.heroes.forEach((h,i)=>Object.assign(h,positions[i],{attackCd:999}));const boss=w.createEnemy('mossbell',bossPosition.x,bossPosition.y);boss.cd=999;w.enemies=[boss];w.updateEnemy=()=>{};w.aiInput=()=>({x:0,y:0});return {w,boss};
}
const screen=(w,p)=>({x:720+(p.x-w.camera.x)*w.camera.zoom,y:369+(p.y-w.camera.y)*.707*w.camera.zoom});
function humansVisible(w){for(const h of w.heroes.slice(0,w.humanCount)){const p=screen(w,h);assert.ok(p.x-48*w.camera.zoom>=36-1e-6&&p.x+48*w.camera.zoom<=1404+1e-6,`human x ${p.x}`);assert.ok(p.y-170*w.camera.zoom>=96-1e-6,`human head ${p.y-170*w.camera.zoom}`);assert.ok(p.y+14*w.camera.zoom<=646+1e-6,`human feet ${p.y+14*w.camera.zoom}`);}}
function bossVisible(w,boss){const p=screen(w,boss);assert.ok(p.y-450*w.camera.zoom>=98,`raised hammer above title: ${p.y-450*w.camera.zoom}`);assert.ok(p.y+20*w.camera.zoom<=646,`boss feet ${p.y}`);}

test('nearby raised Boss fits below its title and above player HUD while humans stand in the lower half',()=>{
 const {w,boss}=arena();w.advance(3);humansVisible(w);bossVisible(w,boss);assert.ok(screen(w,w.heroes[0]).y>490);assert.ok(w.camera.zoom>=.79,'nearby Boss is framed without reducing its scale');
});
test('camera includes a Boss below the player without hiding the player head under its title',()=>{
 const {w,boss}=arena([{x:-230,y:-420}],{x:0,y:0});w.advance(3);humansVisible(w);bossVisible(w,boss);
});
for(const x of [-1,1])for(const y of [-1,1])test(`Boss framing at map corner ${x},${y} keeps the artwork and human visible`,()=>{
 const h={x:x*(MAP.x-70),y:y*(MAP.y-70)},b={x:h.x-x*210,y:h.y-120};const {w,boss}=arena([h],b);w.advance(3);humansVisible(w);bossVisible(w,boss);
 assert.ok(w.camera.x-720/w.camera.zoom>=-800*MAP_SCALE-1e-6);assert.ok(w.camera.x+720/w.camera.zoom<=800*MAP_SCALE+1e-6);
 assert.ok(w.camera.y*.707-369/w.camera.zoom>=-550*MAP_SCALE-1e-6);assert.ok(w.camera.y*.707+441/w.camera.zoom<=550*MAP_SCALE+1e-6);
});
test('a distant Boss yields framing priority to the human instead of dragging them offscreen',()=>{
 const {w}=arena([{x:1100,y:650}],{x:-1050,y:-650});w.advance(3);humansVisible(w);assert.ok(w.camera.x>750);assert.ok(w.camera.y>350);
});
test('widely separated humans stay visible, including a downed partner, while distant AI do not pull camera',()=>{
 const {w}=arena([{x:-20,y:-600},{x:20,y:600}],{x:0,y:0});w.heroes[1].down=true;w.heroes[1].hp=0;w.advance(3);humansVisible(w);assert.ok(w.camera.zoom<.6);
 const before={...w.camera},ai=createHero('mage',2,{ai:true});Object.assign(ai,{x:1250,y:700,attackCd:999});w.heroes.push(ai);w.advance(.02);assert.ok(Math.abs(w.camera.x-before.x)<.05&&Math.abs(w.camera.y-before.y)<.05);
});
test('framing eases into a Boss fight and does not chase pose or shake on each frame',()=>{
 const {w,boss}=arena(),samples=[];for(let i=0;i<120;i++){const old=w.camera.y;w.advance(1/120);samples.push(w.camera.y-old);}assert.ok(samples.every(n=>n<=0));assert.ok(samples.every(n=>Math.abs(n)<10),'entry should ease rather than jump');
 w.advance(4);const before={...w.camera};for(const kind of ['sweep','summon','leap','ultimate','transition']){boss.action={kind,t:.8,windup:1.4};w.shake=.4;w.advance(.05);assert.ok(Math.abs(w.camera.y-before.y)<.05,'fixed envelope does not breathe with each pose');}
});
test('pause freezes camera just as it freezes the encounter',()=>{const {w}=arena();w.advance(.3);const before={...w.camera};w.pause();w.advance(5);assert.deepEqual(w.camera,before);});
test('opposite human dodges keep both full characters within the camera guard band every tick',()=>{
 const {w}=arena([{x:0,y:-580},{x:0,y:580}]);w.advance(3);
 for(let i=0;i<75;i++){w.advance(1/120,[{x:0,y:-1,dodge:i===0},{x:0,y:1,dodge:i===0}]);humansVisible(w);}
});
test('Boss death returns framing smoothly instead of snapping back to the hero',()=>{
 const {w,boss}=arena();w.advance(3);const previous=w.camera.y;boss.hp=0;w.advance(1/120);assert.ok(w.camera.y>previous&&w.camera.y-previous<12);w.advance(3);humansVisible(w);
});
test('framing only mutates camera, never battle state, random sequence, actors or skill warnings',()=>{
 const {w}=arena();const state=()=>structuredClone({heroes:w.heroes,enemies:w.enemies,bossWarnings:w.bossWarnings,events:w.events,seed:w.seed,time:w.time,mode:w.mode,projectiles:w.projectiles,effects:w.effects});
 const before=state();frameBossCamera(w,.5,MAP_SCALE);assert.deepEqual(state(),before);
});
test('ordinary rooms retain their existing camera trajectory and zoom hysteresis',()=>{
 const {w}=arena([{x:150,y:250}]);w.bossRoom=false;w.enemies=[];const k=1-Math.exp(-1/120*3),before={...w.camera};w.advance(1/120);
 assert.ok(Math.abs(w.camera.x-(before.x+(150*.85-before.x)*k))<1e-10);assert.ok(Math.abs(w.camera.y-(before.y+(250*.8-before.y)*k))<1e-10);assert.equal(w.camera.zoom,before.zoom);
});
