// First intersection, including an origin already inside the circle. Infinity = miss.
export function segmentCircle(a,b,c,r){
 const x=a.x-c.x,y=a.y-c.y,dx=b.x-a.x,dy=b.y-a.y,A=dx*dx+dy*dy,C=x*x+y*y-r*r;
 if(C<=0)return 0;if(A<1e-12)return Infinity;
 const B=x*dx+y*dy,D=B*B-A*C;if(D<0)return Infinity;
 const t=(-B-Math.sqrt(D))/A;return t>=0&&t<=1?t:Infinity;
}
