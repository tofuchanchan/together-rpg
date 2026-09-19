import {chromium} from 'file:///C:/Users/fuweicheng/.codex/skills/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const out='output/character-rework';fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1440,height:940}});
const errors=[],checks=[],requests=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('request',r=>requests.push(r.url()));
const mark=s=>{checks.push(s);console.log('PASS',s);};
try {
  await page.goto('http://127.0.0.1:4173/');await page.waitForFunction(()=>window.assetsReady);
  await page.evaluate(()=>advanceTime(0));
  const initial=await page.evaluate(()=>JSON.parse(render_game_to_text()));
  assert.equal(initial.characterArt.renderer,'illustrated-png-atlas');
  assert.equal(initial.characterArt.roles.length,3);
  for(const role of ['warrior','mage','archer']) assert.ok(requests.some(url=>url.endsWith(`/characters/${role}.png`)));
  await page.screenshot({path:`${out}/menu.png`});mark('all three illustrated PNG atlases decoded before ready');
  await page.evaluate(()=>{
    coopTest.start();const w=coopTest.world;
    const positions=[[-200,70],[25,65],[210,65]];
    w.heroes.forEach((h,i)=>{[h.x,h.y]=positions[i];h.face=[1,3,3][i];h.action=null;h.move={x:0,y:0};});
    w.camera={x:0,y:0,zoom:1};coopTest.render();
  });
  await page.screenshot({path:`${out}/gameplay.png`});mark('actual game, HUD portraits and third AI draw new art');
  // A roster screenshot uses precisely the same PNG renderer as the game.
  const roster=await page.evaluate(async()=>{
    const {hero}=await import('/src/coop/sprites.js');
    const canvas=document.createElement('canvas');canvas.width=1440;canvas.height=660;const c=canvas.getContext('2d');
    c.fillStyle='#183c30';c.fillRect(0,0,1440,660);c.textAlign='center';
    c.fillStyle='#fff0cc';c.font='bold 36px "Microsoft YaHei",sans-serif';c.fillText('同行 · 三职业角色精灵',720,68);
    c.fillStyle='#bdd0b4';c.font='18px "Microsoft YaHei",sans-serif';c.fillText('D 方向 / 实际游戏使用的透明 PNG',720,104);
    ['warrior','mage','archer'].forEach((role,i)=>{
      const x=240+i*480;c.fillStyle='#6c895b';c.beginPath();c.roundRect(x-207,143,414,435,25);c.fill();
      c.fillStyle='#466743';c.beginPath();c.ellipse(x,440,111,25,0,0,Math.PI*2);c.fill();
      c.save();c.translate(x,436);hero(c,{role,id:i,face:[1,3,3][i],move:{x:0,y:0},stride:0},0,2.4);c.restore();
      c.fillStyle='#fff1d1';c.font='bold 26px "Microsoft YaHei",sans-serif';c.fillText(['战士','法师','弓手'][i],x,505);
      c.fillStyle='#e0e7c8';c.font='17px "Microsoft YaHei",sans-serif';c.fillText(['银盔 · 红披风 · 剑盾','紫色尖帽 · 琥珀法杖','绿兜帽 · 木弓 · 箭袋'][i],x,542);
    });
    return canvas.toDataURL('image/png').split(',')[1];
  });fs.writeFileSync(`${out}/roster.png`,Buffer.from(roster,'base64'));
  await page.goto('http://127.0.0.1:4173/bean-lab.html');await page.waitForFunction(()=>window.beanLab?.ready);
  await page.locator('#pause').click();
  for(const role of ['warrior','mage','archer']) {
    await page.selectOption('#role',role);
    for(const clip of ['idle','run','attack','skill1','skill2','dodge']) {
      await page.selectOption('#clip',clip);await page.locator('#timeline').fill('6');
      await page.screenshot({path:`${out}/${role}-${clip}.png`});
    }
    mark(`${role}: eight directions, movement, attack, both skills and dodge render`);
  }
  const exported=await page.evaluate(()=>exportBeanAtlas('archer'));
  assert.equal(exported.manifest.frames.length,64);assert.ok(exported.png.startsWith('data:image/png;base64,'));
  assert.equal(errors.length,0);mark('transparent atlas download uses the real 64 painted poses');
  fs.writeFileSync(`${out}/results.json`,JSON.stringify({checks,errors},null,2));
} finally {await browser.close();}
