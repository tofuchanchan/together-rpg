import fs from 'node:fs';
import assert from 'node:assert/strict';
import {chromium} from 'file:///C:/Users/fuweicheng/.codex/skills/node_modules/playwright/index.mjs';
const out='output/verification/boss-specialist/'+(process.argv[2]||'upgrade');fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1440,height:940}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>{
 const Native=window.AudioContext,connect=AudioNode.prototype.connect;
 window.AudioContext=class extends Native{constructor(...args){super(...args);window.qaAudio=this;this.qaStream=this.createMediaStreamDestination();this.qaAnalyser=this.createAnalyser();connect.call(this.qaAnalyser,this.qaStream);}};
 AudioNode.prototype.connect=function(destination,...args){const a=window.qaAudio;if(a&&destination===a.destination)connect.call(this,a.qaAnalyser);return connect.call(this,destination,...args);};
});
try{
 await page.goto('http://127.0.0.1:4173/?adventureTrial=boss');await page.waitForFunction(()=>window.assetsReady,null,{timeout:60000});await page.evaluate(()=>advanceTime(0));await page.locator('#game canvas').click({position:{x:150,y:250}});
 const result=await page.evaluate(async()=>{
  const {frameBossCamera}=await import('/src/coop/boss-camera.js'),{MAP_SCALE}=await import('/src/coop/model.js'),{startMossbellSkill}=await import('/src/coop/mossbell.js'),{bossPose}=await import('/src/coop/adventure-art.js');
  const cv=coopTest.view.c.canvas,stream=cv.captureStream(60),audio=window.qaAudio;await audio.resume();audio.qaStream.stream.getAudioTracks().forEach(t=>stream.addTrack(t));
  const recorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp9,opus',videoBitsPerSecond:4500000}),chunks=[],clips=[],rms=[],pcm=new Float32Array(audio.qaAnalyser.fftSize);
  recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};recorder.start();const wall=performance.now();
  for(const skill of ['sweep','roots','leap','summon','ultimate','stagger','transition']){
   coopTest.start(['warrior'],1);const w=coopTest.world;w.enemies=[];w.room=10;w.wave=1;w.spawnWave();w.obstacles=[];w.xpNext=1e9;w.options.shake=true;w.options.sound=true;const h=w.heroes[0],b=w.enemies[0];h.x=220;h.y=180;h.attackCd=999;h.maxHp=h.hp=9999;h.armor=0;h.evasion=0;b.x=0;b.y=-20;b.cd=999;b.phase=3;startMossbellSkill(w,b,skill);frameBossCamera(w,3,MAP_SCALE);
   const clip={skill,startSeconds:(performance.now()-wall)/1000,frames:[],seconds:b.action.duration+.1},count=Math.ceil(clip.seconds*60);
   for(let i=0;i<count;i++){
    await new Promise(requestAnimationFrame);const before={x:b.x,y:b.y,hp:h.hp};advanceTime(1000/60);coopTest.render();
    audio.qaAnalyser.getFloatTimeDomainData(pcm);const level=Math.sqrt(pcm.reduce((n,v)=>n+v*v,0)/pcm.length);rms.push(level);
    clip.frames.push({t:w.time,x:b.x,y:b.y,dy:Math.hypot(b.x-before.x,b.y-before.y),pose:bossPose(b,w.time),damage:before.hp-h.hp,shake:w.shake});
   }clips.push(clip);
  }
  const stopped=new Promise(resolve=>recorder.onstop=resolve);recorder.stop();await stopped;stream.getTracks().forEach(t=>t.stop());
  const blob=new Blob(chunks,{type:'video/webm'}),bytes=new Uint8Array(await blob.arrayBuffer());let raw='';for(let i=0;i<bytes.length;i+=32768)raw+=String.fromCharCode(...bytes.subarray(i,i+32768));
  return{video:btoa(raw),clips,audio:{peakRms:Math.max(...rms),activeFrames:rms.filter(v=>v>.001).length},wallSeconds:(performance.now()-wall)/1000};
 });
 fs.writeFileSync(`${out}/boss-native-motion.webm`,Buffer.from(result.video,'base64'));delete result.video;
 assert.deepEqual(errors,[]);assert.ok(result.audio.peakRms>.005);assert.ok(result.clips.find(c=>c.skill==='leap').frames.every(f=>f.dy<15));
 fs.writeFileSync(`${out}/video-metrics.json`,JSON.stringify({...result,errors,scope:'Continuous native rendering at 60 simulation Hz via requestAnimationFrame. Production Boss camera, HP extended, no autoattack; actual audio pipeline recorded. Wall FPS is headless recording throughput, not a hardware benchmark.'},null,2));
 console.log(JSON.stringify({clips:result.clips.length,audio:result.audio,wallSeconds:result.wallSeconds}));
}finally{await browser.close();}
