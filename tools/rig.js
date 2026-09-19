import * as T from '../assets/vendor/three.module.js';
// Original articulated model. Fixed anatomical sword/right and shield/left.
const W=192,H=224,N=16;
const renderer=new T.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});
renderer.setSize(W,H);renderer.setClearColor(0,0);renderer.outputColorSpace=T.SRGBColorSpace;
document.body.append(renderer.domElement);
const scene=new T.Scene(),camera=new T.OrthographicCamera(-2.2,2.2,2.5666667,-2.5666667,.1,30);
camera.position.set(0,7.2,6);camera.lookAt(0,1.2,0);camera.updateMatrixWorld();
scene.add(new T.HemisphereLight(0xe6f1ec,0x485048,2.4));
const light=new T.DirectionalLight(0xffe6be,3.1);light.position.set(-3,7,5);scene.add(light);
const rim=new T.DirectionalLight(0xb1cfe2,1.5);rim.position.set(4,3,-4);scene.add(rim);
const mat=(c)=>new T.MeshStandardMaterial({color:c,roughness:.8,metalness:.12,flatShading:true});
const steel=mat('#c4d1cb'),dark=mat('#364c54'),gold=mat('#bc8d48'),leather=mat('#493c32'),red=mat('#984940'),cloth=mat('#336d70'),edge=mat('#e7eadb');
const root=new T.Group(),lower=new T.Group(),upper=new T.Group();root.add(lower,upper);scene.add(root);
function mesh(g,geo,m,x=0,y=0,z=0){const o=new T.Mesh(geo,m);o.position.set(x,y,z);g.add(o);return o;}
const box=(g,m,w,h,d,x,y,z)=>mesh(g,new T.BoxGeometry(w,h,d),m,x,y,z);
const ball=(g,m,r,x,y,z)=>mesh(g,new T.IcosahedronGeometry(r,1),m,x,y,z);
function bone(g,m,r){const o=mesh(g,new T.CylinderGeometry(r*.9,r,1,7),m);return o;}
function placeBone(o,a,b){const av=new T.Vector3(...a),bv=new T.Vector3(...b),d=bv.clone().sub(av);o.position.copy(av.add(bv).multiplyScalar(.5));o.scale.y=d.length();o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());}
const legs=[-1,1].map(s=>({s,thigh:bone(lower,dark,.14),shin:bone(lower,steel,.135),knee:ball(lower,gold,.14,0,0,0),boot:box(lower,leather,.27,.2,.42,0,0,0)}));
box(upper,cloth,.7,.4,.45,0,.94,0);
const skirt=mesh(upper,new T.CylinderGeometry(.36,.48,.36,7),cloth,0,1.0,0);skirt.scale.z=.72;
box(upper,gold,.77,.1,.48,0,1.19,0);box(upper,gold,.15,.13,.04,0,1.2,.27);
const chest=mesh(upper,new T.CylinderGeometry(.38,.3,.58,6),steel,0,1.5,0);chest.scale.z=.75;
box(upper,gold,.12,.48,.07,0,1.53,.27);box(upper,gold,.5,.09,.07,0,1.67,.26);
const cape=box(upper,red,.67,.9,.06,0,1.17,-.31);cape.rotation.x=-.12;
ball(upper,dark,.17,0,1.86,0);
const helmet=ball(upper,steel,.37,0,2.1,0);helmet.scale.set(.96,1.04,.92);
box(upper,dark,.49,.11,.07,0,2.12,.31);
box(upper,gold,.36,.025,.08,0,2.12,.35);
box(upper,steel,.09,.27,.12,0,2.02,.35);
const plume=mesh(upper,new T.ConeGeometry(.12,.5,5),red,0,2.55,-.025);plume.rotation.x=-.3;
for(const s of [-1,1]){const pauldron=ball(upper,steel,.25,s*.45,1.71,0);pauldron.scale.set(1.1,.7,1.1);}
const arms=[-1,1].map(s=>({s,upper:bone(upper,dark,.105),fore:bone(upper,steel,.115),hand:ball(upper,leather,.115,0,0,0)}));
const sword=new T.Group();upper.add(sword);
box(sword,leather,.075,.22,.075,0,.03,0);ball(sword,gold,.075,0,-.12,0);
box(sword,gold,.34,.06,.09,0,.16,0);
const blade=box(sword,edge,.12,.77,.055,0,.58,0);
const tip=mesh(sword,new T.ConeGeometry(.085,.22,4),edge,0,1.075,0);tip.rotation.y=Math.PI/4;
box(sword,steel,.025,.7,.062,0,.58,0);
const shield=new T.Group();upper.add(shield);
const shieldShape=new T.Shape();shieldShape.moveTo(-.32,.4);shieldShape.lineTo(.32,.4);shieldShape.lineTo(.35,-.06);shieldShape.lineTo(0,-.48);shieldShape.lineTo(-.35,-.06);shieldShape.closePath();
mesh(shield,new T.ExtrudeGeometry(shieldShape,{depth:.09,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.045,bevelThickness:.02}),gold);
const face=mesh(shield,new T.ShapeGeometry(shieldShape),cloth,0,0,.12);face.scale.set(.83,.83,1);
box(shield,gold,.085,.59,.04,0,.04,.145);box(shield,gold,.42,.075,.04,0,.12,.145);ball(shield,edge,.085,0,.12,.16);
const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
function pose(clip,q,dir){
 root.position.set(0,0,0);root.rotation.set(0,(2-dir)*Math.PI/4,0);upper.rotation.set(0,0,0);upper.position.set(0,0,0);
 const running=clip==='legs-run',dodging=clip==='dodge',bash=clip==='upper-bash',attack=clip==='upper-attack';
 const phase=q*Math.PI*2,bob=running?.026*Math.cos(phase*2):.01*Math.sin(phase);
 let crouch=dodging?-.32*Math.sin(Math.PI*q):0;
 for(const l of legs){
  const p=phase+(l.s<0?Math.PI:0),z=running?.32*Math.cos(p):(dodging?.3*Math.sin(q*Math.PI)*(l.s):0);
  const fy=.14+(running?.19*Math.max(0,Math.sin(p)):0);
  const hip=[l.s*.205,.99+crouch,z*.04],ankle=[l.s*.205,fy,z];
  const dy=ankle[1]-hip[1],dz=ankle[2]-hip[2],dist=Math.hypot(dy,dz),len=.48;
  const bend=Math.sqrt(Math.max(0,len*len-dist*dist/4));
  const knee=[hip[0],(hip[1]+ankle[1])/2-dz/dist*bend,(hip[2]+ankle[2])/2+(-dy/dist)*bend];
  placeBone(l.thigh,hip,knee);placeBone(l.shin,knee,ankle);l.knee.position.set(...knee);l.boot.position.set(ankle[0],ankle[1]-.06,ankle[2]+.07);
 }
 upper.position.y=bob+crouch;
 let hand=[-.52,1.24,.17],sdir=new T.Vector3(-.28,.88,.25).normalize();
 let left=[.55,1.35,.29];
 if(attack){
  const wind=smooth(q/.32),slash=smooth((q-.32)/.25),back=smooth((q-.65)/.35);
  const a=(-1.15*wind+2.9*slash)*(1-back);
  hand=[-.52+.5*Math.sin(a),1.24+.43*wind*(1-slash),.17+.5*slash*(1-back)];
  sdir.lerp(new T.Vector3(-.8,.9,-.2).normalize(),wind).lerp(new T.Vector3(.75,-.25,1).normalize(),slash).normalize();
  sdir.lerp(new T.Vector3(-.28,.88,.25).normalize(),back).normalize();
  upper.rotation.y=-.3*wind*(1-slash)+.35*slash*(1-back);
 }
 if(bash){const b=smooth(q/.23)*(1-smooth((q-.64)/.36));left=[.55-.12*b,1.35+.14*b,.29+.51*b];upper.rotation.x=-.12*b;hand=[-.52+.03*b,1.24+.06*b,.17-.14*b];}
 if(dodging){const b=Math.sin(Math.PI*q);upper.rotation.x=.65*b;hand=[-.52+.05*b,1.24+.16*b,.17+.11*b];left=[.55-.05*b,1.35+.15*b,.29+.09*b];sdir.lerp(new T.Vector3(-.3,.8,-.6).normalize(),b).normalize();}
 const hands=[hand,left];
 arms.forEach((a,i)=>{const h=hands[i],shoulder=[a.s*.46,1.65,0],elbow=[a.s*.6,(h[1]+1.65)/2-.12,h[2]*.42];placeBone(a.upper,shoulder,elbow);placeBone(a.fore,elbow,h);a.hand.position.set(...h);});
 sword.position.set(...hand);sword.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),sdir);
 shield.position.set(left[0],left[1],left[2]+.03);shield.rotation.set(-.1, bash?.18*(1-Math.sin(Math.PI*q)):.18, -.08);
 cape.rotation.x=-.12+(running?.12*Math.sin(phase):0)-(dodging?.35*Math.sin(Math.PI*q):0);
 lower.visible=clip.startsWith('legs')||dodging;upper.visible=clip.startsWith('upper')||dodging;
}
window.bake=async()=>{
 const clips=['legs-idle','legs-run','upper-idle','upper-attack','upper-bash','dodge'];
 const pivot=new T.Vector3(0,0,0).project(camera);
 const meta={frameWidth:W,frameHeight:H,frames:N,directions:['E','SE','S','SW','W','NW','N','NE'],origin:[(pivot.x+1)/2,(1-pivot.y)/2],clips,handedness:'right sword / left shield',source:'tools/rig.js',view:'orthographic oblique'};
 for(const clip of clips){
  const canvas=document.createElement('canvas');canvas.width=W*N;canvas.height=H*8;const ctx=canvas.getContext('2d');
  for(let d=0;d<8;d++)for(let f=0;f<N;f++){pose(clip,clip==='upper-idle'||clip.startsWith('legs')?f/N:f/(N-1),d);renderer.render(scene,camera);ctx.drawImage(renderer.domElement,f*W,d*H);}
  await window.saveAtlas(clip,canvas.toDataURL('image/png'));
 }
 return meta;
};
