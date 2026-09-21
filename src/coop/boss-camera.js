import {enemyDef} from './enemies.js';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),fit=(v,a,b)=>a<=b?clamp(v,a,b):(a+b)/2;
// Coordinates match View's 1440x810 scene transform. Leave the title and the
// player HUD clear; use a fixed action envelope, never the current pose frame.
const cameraBounds=(heroes,z,{left=44,right=1396,top=112,bottom=630}={})=>({
 x0:Math.max(...heroes.map(h=>h.x+48-(right-720)/z)),x1:Math.min(...heroes.map(h=>h.x-48+(720-left)/z)),
 y0:Math.max(...heroes.map(h=>h.y+(14-(bottom-369)/z)/.707)),y1:Math.min(...heroes.map(h=>h.y-(170+(top-369)/z)/.707)),
});
export function frameBossCamera(w,dt,mapScale){
 if(!w.bossRoom)return false;
 const ps=w.heroes.slice(0,w.humanCount),camera=w.camera,k=1-Math.exp(-dt*3),cx=ps.reduce((n,h)=>n+h.x,0)/ps.length,cy=ps.reduce((n,h)=>n+h.y,0)/ps.length;
 const dx=Math.max(...ps.map(h=>h.x))-Math.min(...ps.map(h=>h.x)),dy=Math.max(...ps.map(h=>h.y))-Math.min(...ps.map(h=>h.y));
 const baseZoom=clamp(1.04-Math.max(dx/1800,dy/1500),.78,1.02)*.8;
 // Zoom belongs to the shared view: only human separation can require more
 // room. A remote Boss or companion may never shrink the nearby player.
 const z=Math.min(baseZoom,1352/(dx+96),518/(dy*.707+184));
 if(Math.abs(z-camera.zoom)>.025)camera.zoom+=(z-camera.zoom)*k;
 camera.zoom=Math.min(camera.zoom,1368/(dx+96),550/(dy*.707+184));
 const zoom=camera.zoom,human=cameraBounds(ps,zoom),boss=w.enemies.find(e=>e.boss&&e.hp>0);
 let targetX=cx*.85,targetY=cy*.8;
 if(boss){
  const size=enemyDef(boss).size,top=Math.max(size*1.32,size+100),halfWidth=size*.85;
  const weight=clamp((1050-Math.hypot(boss.x-cx,(boss.y-cy)*.707))/400,0,1);
  const bx=fit(targetX,boss.x+halfWidth-(1396-720)/zoom,boss.x-halfWidth+(720-44)/zoom);
  const by=fit(targetY,boss.y+(20-(630-369)/zoom)/.707,boss.y-(top+(112-369)/zoom)/.707);
  targetX+=(bx-targetX)*weight;targetY+=(by-targetY)*weight;
 }
 targetX=fit(targetX,human.x0,human.x1);targetY=fit(targetY,human.y0,human.y1);
 const boundZoom=Math.min(z,zoom),ground={x0:-800*mapScale+720/boundZoom,x1:800*mapScale-720/boundZoom,y0:(-550*mapScale+369/boundZoom)/.707,y1:(550*mapScale-441/boundZoom)/.707};
 targetX=fit(targetX,ground.x0,ground.x1);targetY=fit(targetY,ground.y0,ground.y1);
 camera.x+=(targetX-camera.x)*k;camera.y+=(targetY-camera.y)*k;
 // This wider guard band only catches a fast dodge at the edge. Ordinary
 // follow remains eased; no actor is ever moved to satisfy camera framing.
 const safe=cameraBounds(ps,zoom,{left:36,right:1404,top:96,bottom:646});
 camera.x=fit(camera.x,Math.max(safe.x0,-800*mapScale+720/zoom),Math.min(safe.x1,800*mapScale-720/zoom));
 camera.y=fit(camera.y,Math.max(safe.y0,(-550*mapScale+369/zoom)/.707),Math.min(safe.y1,(550*mapScale-441/zoom)/.707));
 return true;
}
