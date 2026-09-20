// First intersection, including an origin already inside the circle. Infinity = miss.
export function segmentCircle(a,b,c,r){
 const x=a.x-c.x,y=a.y-c.y,dx=b.x-a.x,dy=b.y-a.y,A=dx*dx+dy*dy,C=x*x+y*y-r*r;
 if(C<=0)return 0;if(A<1e-12)return Infinity;
 const B=x*dx+y*dy,D=B*B-A*C;if(D<0)return Infinity;
 const t=(-B-Math.sqrt(D))/A;return t>=0&&t<=1?t:Infinity;
}

// Constrain the requested move, never an already collision-resolved position.
// A separated/revived pair keeps its present radius until it moves inward;
// neither idle heroes nor their partner are pulled across the world.
export function constrainSharedMove(actor,other,dx,dy){
 if(!other||other.down||actor.down||!Math.hypot(dx,dy))return {dx,dy};
 const x=actor.x-other.x,y=(actor.y-other.y)*.72,r=Math.max(900,Math.hypot(x,y)),nx=x+dx,ny=y+dy*.72,d=Math.hypot(nx,ny);
 if(d<=r)return {dx,dy};
 // Euclidean closest point on the ellipse. Radial scaling in screen space
 // can reverse a diagonal world-space request because its axes have different
 // lengths; solve the ellipse projection before applying any physical move.
 const qx=nx/r,qy=ny/(r*.72),s=.72*.72;let lambda=0;
 for(let i=0;i<8;i++){const a=1+lambda,b=1+s*lambda,f=qx*qx/(a*a)+s*qy*qy/(b*b)-1;if(Math.abs(f)<1e-13)break;lambda+=f/(2*qx*qx/(a*a*a)+2*s*s*qy*qy/(b*b*b));}
 const px=qx*r/(1+lambda)-x,py=qy*r/(1+s*lambda)-y/.72,length=Math.hypot(px,py);
 if(length<1e-9)return {dx:0,dy:0};
 const scale=Math.min(1,Math.hypot(dx,dy)/length);
 return {dx:px*scale,dy:py*scale};
}
