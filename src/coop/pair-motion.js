const clamp=n=>Math.max(0,Math.min(1,n)),smooth=n=>{n=clamp(n);return n*n*(3-2*n);};
// Rigid poses over the accepted painted body: no stretch, view swapping or extra clocks.
export function pairMotion(h){
 const a=h.action;if(!a?.pairSkill)return null;
 const t=a.t,w=a.windup,e=a.activeEnd,d=a.duration,wind=smooth(t/Math.max(.001,w)),release=smooth((t-w)/Math.max(.001,e-w)),recover=1-smooth((t-e)/Math.max(.001,d-e));
 const lift=t<w?Math.sin(wind*Math.PI*.5):recover*(1-release),strike=t<w?(t<w*.65?-.3*smooth(t/(w*.65)):-.3+1.3*smooth((t-w*.65)/(w*.35))):recover;
 const angle=(a.facing??h.face??0)*Math.PI/4,sign=Math.cos(angle)<0?-1:1,pose={x:0,y:0,rotation:0,armX:0,armY:0,arm:0,footLift:0};
 if(h.role==='warrior'){
  if(a.slot===2){pose.y=-6*lift;pose.footLift=16*lift;pose.arm=-sign*.2*lift;pose.rotation=-sign*.025*lift;}
  else if(a.slot===0){const hold=t<w?wind:recover;pose.arm=-sign*.18*hold;pose.x=-Math.cos(angle)*2*hold;pose.y=1.5*hold;}
  else if(a.slot===1){const swing=t<w?wind*.35:(.35*(1-release)+Math.sin(release*Math.PI*4))*recover;pose.arm=sign*.65*swing;pose.rotation=sign*.025*swing;}
  else{pose.arm=sign*1.1*strike;pose.armX=Math.cos(angle)*7*strike;pose.armY=Math.sin(angle)*3*strike;pose.x=Math.cos(angle)*4*strike;pose.rotation=sign*.035*strike;}
 }else if(h.role==='archer'){
  const raised=a.slot===3;pose.arm=sign*(raised?-.45*lift:.18*strike);pose.armX=Math.cos(angle)*(raised?2:5)*strike;pose.armY=raised?-8*lift:0;pose.x=-Math.cos(angle)*2*strike;
 }else{
  const station=a.slot===3,hold=t<w?wind:recover;pose.arm=sign*(station?-.5:.26)*hold;pose.armY=(station?-9:-3)*hold;pose.armX=Math.cos(angle)*(station?2:7)*hold;pose.y=station?-2*lift:0;
 }
 return pose;
}
