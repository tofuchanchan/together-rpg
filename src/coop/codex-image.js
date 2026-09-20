import {codexImageKey} from './codex-image-key.js';
import {CODEX_PREVIEW_FILES} from './codex-preview-files.js';

export function codexImageUrl(entry){
 const key=codexImageKey(entry.art),file=CODEX_PREVIEW_FILES[key];
 if(!file)throw Error(`缺少图鉴预览：${key}`);
 return new URL(`../../assets/codex/${file}`,import.meta.url).href;
}

// Native, independent images avoid downloading/decoding the entire combat atlas
// and allocating hundreds of animation canvases just to read one entry on a phone.
export function createCodexImage(entry,className,onChange){
 const box=document.createElement('div'),image=new Image(),status=document.createElement('span'),detail=className==='codex-preview';
 box.className=`${className} codex-art-surface`;box.dataset.entry=entry.id;box.dataset.art='loading';box.setAttribute('aria-busy','true');
 image.alt=`${entry.name}插画`;image.width=640;image.height=380;image.decoding='async';image.loading=detail?'eager':'lazy';if(detail)image.fetchPriority='high';
 status.className='codex-image-status';status.setAttribute('role','status');status.textContent='插画载入中…';box.append(image,status);
 const update=state=>{box.dataset.art=state;box.setAttribute('aria-busy',String(state==='loading'));onChange(box);};
 const load=retry=>{status.hidden=false;status.textContent='插画载入中…';update('loading');image.src=codexImageUrl(entry)+(retry?`?retry=${Date.now()}`:'');};
 image.addEventListener('load',()=>{if(!image.naturalWidth)return;status.hidden=true;update('ready');});
 image.addEventListener('error',()=>{
  status.textContent=detail?'插画暂未载入':'插画暂未载入 · 点开重试';
  if(detail){const retry=document.createElement('button');retry.type='button';retry.className='codex-image-retry';retry.textContent='重新加载插画';retry.addEventListener('click',()=>load(true));status.append(retry);}
  update('error');
 });
 // The first load starts before insertion; the view performs its initial state
 // scan after rendering. Later events only update that view's connected images.
 image.src=codexImageUrl(entry);return box;
}
