export const LOGICAL_WIDTH=1440,LOGICAL_HEIGHT=810;
export const MAX_RENDER_SCALE=2,MAX_RENDER_PIXELS=LOGICAL_WIDTH*LOGICAL_HEIGHT*MAX_RENDER_SCALE**2;

// Game/input coordinates never depend on the monitor. Only presentation buffers do.
export function planRenderSurface(displayWidth,displayHeight,devicePixelRatio=1,testScale=null){
 const valid=Number.isFinite(displayWidth)&&Number.isFinite(displayHeight)&&displayWidth>0&&displayHeight>0;
 const dpr=Number.isFinite(devicePixelRatio)&&devicePixelRatio>0?devicePixelRatio:1;
 const requested=valid?Math.min(displayWidth/LOGICAL_WIDTH,displayHeight/LOGICAL_HEIGHT)*dpr:1;
 const override=Number.isFinite(testScale)&&testScale>0?testScale:requested;
 const scale=Math.min(MAX_RENDER_SCALE,Math.sqrt(MAX_RENDER_PIXELS/(LOGICAL_WIDTH*LOGICAL_HEIGHT)),Math.max(1/LOGICAL_HEIGHT,override));
 const pixelWidth=Math.ceil(LOGICAL_WIDTH*scale),pixelHeight=Math.ceil(LOGICAL_HEIGHT*scale);
 return {logicalWidth:LOGICAL_WIDTH,logicalHeight:LOGICAL_HEIGHT,displayWidth:valid?displayWidth:0,displayHeight:valid?displayHeight:0,devicePixelRatio:dpr,pixelWidth,pixelHeight,scaleX:pixelWidth/LOGICAL_WIDTH,scaleY:pixelHeight/LOGICAL_HEIGHT};
}

export class RenderSurface{
 constructor(scene,surface,image,view){
  this.scene=scene;this.game=scene.game;this.surface=surface;this.image=image;this.view=view;this.allocations=0;this.testScale=null;this.pending=0;
  this.schedule=()=>{if(!this.pending)this.pending=requestAnimationFrame(()=>{this.pending=0;this.sync();});};
  this.game.scale.on('resize',this.schedule);
  addEventListener('resize',this.schedule);globalThis.visualViewport?.addEventListener('resize',this.schedule);
  this.observer=new ResizeObserver(this.schedule);this.observer.observe(this.game.canvas);
  this.dprChanged=()=>{this.watchDpr();this.schedule();};this.watchDpr();
  // Some browsers/emulated monitors change DPR without a resize/media event.
  // This reads one number; layout reads and allocations remain event-driven.
  this.checkDpr=()=>{if(this.plan?.devicePixelRatio!==(devicePixelRatio||1))this.schedule();};scene.events.on('preupdate',this.checkDpr);
  scene.events.once('shutdown',()=>this.destroy());this.sync();
 }
 watchDpr(){
  this.dprQuery?.removeEventListener('change',this.dprChanged);
  this.dprQuery=matchMedia(`(resolution: ${devicePixelRatio||1}dppx)`);this.dprQuery.addEventListener('change',this.dprChanged);
 }
 sync(){
  const canvas=this.game.canvas,bounds=canvas.getBoundingClientRect();if(bounds.width<=0||bounds.height<=0)return;
  const plan=planRenderSurface(bounds.width,bounds.height,devicePixelRatio,this.testScale),{pixelWidth:width,pixelHeight:height,scaleX,scaleY}=plan;
  let allocated=false;
  if(this.surface.width!==width||this.surface.height!==height){this.surface.setSize(width,height);allocated=true;}
  if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;allocated=true;}
  if(allocated)this.allocations++;
  // Phaser 3.90 CanvasRenderer has no resolution multiplier. Resize its physical
  // target and presentation camera explicitly; leave ScaleManager at 1440x810 so
  // pointer.x/y, FIT sizing, world simulation and all menu hit regions stay logical.
  if(this.game.renderer.width!==width||this.game.renderer.height!==height)this.game.renderer.resize(width,height);
  this.image.setSize(width,height).setDisplaySize(LOGICAL_WIDTH,LOGICAL_HEIGHT);
  // The scene contains one full-screen image. A zero camera origin avoids the
  // default camera's half-pixel translation when a physical dimension is odd.
  this.scene.cameras.main.setViewport(0,0,width,height).setOrigin(0,0).setScroll(0,0).setZoom(scaleX,scaleY);
  this.view.renderScaleX=scaleX;this.view.renderScaleY=scaleY;
  // Text stays sharp through its physical-pixel transform. Keep the browser's
  // low-cost sprite filter: high quality would resample the entire battle every
  // frame and defeats the framebuffer budget on CPU Canvas2D renderers.
  this.view.c.setTransform(scaleX,0,0,scaleY,0,0);this.view.c.imageSmoothingEnabled=true;this.view.c.imageSmoothingQuality='low';
  this.plan=plan;this.view.draw();
 }
 setTestScale(scale){this.testScale=scale;this.sync();}
 snapshot(){
  const p=this.plan;if(!p)return null;
  return {logical:{width:LOGICAL_WIDTH,height:LOGICAL_HEIGHT},display:{width:p.displayWidth,height:p.displayHeight},pixels:{width:this.surface.width,height:this.surface.height},output:{width:this.game.canvas.width,height:this.game.canvas.height},scale:{x:p.scaleX,y:p.scaleY},devicePixelRatio:p.devicePixelRatio,gameSize:{width:this.game.scale.gameSize.width,height:this.game.scale.gameSize.height},maxPixels:MAX_RENDER_PIXELS,allocations:this.allocations};
 }
 destroy(){
  if(this.pending)cancelAnimationFrame(this.pending);this.pending=0;this.observer.disconnect();this.dprQuery?.removeEventListener('change',this.dprChanged);
  this.scene.events.off('preupdate',this.checkDpr);
  this.game.scale.off('resize',this.schedule);removeEventListener('resize',this.schedule);globalThis.visualViewport?.removeEventListener('resize',this.schedule);
 }
}
