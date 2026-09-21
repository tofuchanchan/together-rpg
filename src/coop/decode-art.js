// Chromium can reject an eager decode even after a valid image has loaded.
// Retry once on the next task; real network/corruption errors still propagate.
export async function decodeArt(image){
 try{await image.decode();}
 catch(error){
  if(!image.complete||!image.naturalWidth||!image.naturalHeight)throw error;
  await new Promise(resolve=>setTimeout(resolve,0));
  await image.decode();
 }
}
