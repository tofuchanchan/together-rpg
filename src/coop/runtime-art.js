import {RUNTIME_ART_FILES} from './runtime-art-files.js';
import {decodeArt} from './decode-art.js';
const root=new URL('../../',import.meta.url);
// Resolve relative to the repository root, including GitHub Pages subpaths.
export function runtimeArtUrl(file,base){
 const original=new URL(file,base),path=original.href.startsWith(root.href)?original.href.slice(root.href.length):null;
 return path&&RUNTIME_ART_FILES[path]?new URL(RUNTIME_ART_FILES[path],root).href:original.href;
}
export async function loadRuntimeImage(file,base){
 const image=new Image();image.decoding='async';image.fetchPriority='low';
 image.src=runtimeArtUrl(file,base);
 let timer;
 try{await Promise.race([decodeArt(image),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('素材加载超时，请重试')),45000);})]);return image;}
 finally{clearTimeout(timer);}
}
