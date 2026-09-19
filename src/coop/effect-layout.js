// Ground-space coordinates: depth sorting always uses feet, never texture center.
export function actionLayout(h){
 h={x:0,y:0,...h};const a=h.action;if(!a)return null;const range=h.rangeBonus||1;
 if(a.type==='spin')return{layer:'ground',x:h.x,y:h.y,size:340*range*(h.runes?.[1]==='wide'?1.25:1)};
 if(a.type==='dodge')return{layer:'ground',x:h.x-a.dir.x*35,y:h.y-a.dir.y*35,size:83};
 if(a.type==='attack'&&h.role==='warrior')return{layer:'depth',x:h.x+a.dir.x*135*range,y:h.y+a.dir.y*135*range,size:168*range};
 if(a.type==='bash')return{layer:'depth',x:h.x+a.dir.x*68,y:h.y+a.dir.y*68,size:77};
 return null;
}
