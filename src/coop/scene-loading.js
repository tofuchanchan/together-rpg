import {createSceneAssets,requiredSceneAssets,upcomingSceneAssets} from './scene-assets.js';
export function createSceneLoading(loaders,{flush,onBack}){
 const assets=createSceneAssets(loaders),box=document.createElement('section');
 box.id='scene-loading';box.hidden=true;box.setAttribute('role','status');box.setAttribute('aria-label','正在准备场景');
 box.innerHTML='<div class="loading-monster" aria-hidden="true"></div><div class="scene-loading-error" hidden><p>场景资源未能加载，请检查网络后重试。</p><button type="button">重试</button><button type="button">返回标题</button></div>';
 document.body.append(box);
 const errorBox=box.querySelector('.scene-loading-error'),[retry,back]=box.querySelectorAll('button');
 let keys=[],waiting=false,failed=false;
 function dismiss(){if(waiting)flush();waiting=false;failed=false;box.hidden=true;if(box.contains(document.activeElement))document.getElementById('game')?.focus({preventScroll:true});}
 function retryFailed(){void assets.retry(keys);failed=false;errorBox.hidden=true;}
 retry.onclick=retryFailed;back.onclick=()=>{dismiss();onBack();};
 return {
  assets,get waiting(){return waiting;},
  check(w,{active=true}={}){
   if(!active){dismiss();return true;}
   keys=requiredSceneAssets(w);const ready=assets.ready(keys);
   if(ready){dismiss();assets.prefetch(upcomingSceneAssets(w));return true;}
   if(!waiting)flush();waiting=true;box.hidden=false;
   const error=keys.some(key=>assets.snapshot()[key].status==='error');
   errorBox.hidden=!error;box.setAttribute('aria-busy',String(!error));
   if(error&&!failed)retry.focus();failed=error;return false;
  },
  key(e){if(!waiting)return false;if(e.code==='Escape'){dismiss();onBack();}else if(failed&&e.code==='Enter'&&!e.repeat){retryFailed();}e.preventDefault();return true;},
  pad(inputs){if(!waiting)return;if(inputs.some(i=>i.cancel)){dismiss();onBack();}else if(failed&&inputs.some(i=>i.confirm))retryFailed();},
  snapshot(){return{waiting,required:[...keys],groups:assets.snapshot()};},
 };
}
