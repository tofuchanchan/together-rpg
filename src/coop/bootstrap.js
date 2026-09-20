import {startScreen,withTimeout} from './start-screen.js';
startScreen.init();
window.assetsReady=false;
window.render_game_to_text=()=>JSON.stringify({assetsReady:false,mode:'menu',frontend:startScreen.snapshot()});
window.advanceTime=()=>{};
async function prepareGame(){
 await withTimeout(new Promise((resolve,reject)=>{
  const script=document.createElement('script');script.src=new URL('../../assets/vendor/phaser.min.js',import.meta.url).href;script.async=true;script.onload=resolve;script.onerror=()=>reject(new Error('游戏引擎加载失败'));document.head.append(script);
 }),30000,'游戏引擎加载超时');
 const app=await import('./app.js?v=0.10.0');await app.gameReady;
}
withTimeout(prepareGame(),60000,'游戏资源加载超时').catch(error=>startScreen.failGame(error));
