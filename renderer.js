import * as T from './vendor/three.module.js';
import {TAXI,clamp,target} from './sim.js?v=world2-1016';
import {routeFor,arrivalTaxi,approachInfo} from './routes.js?v=world2-1016';
import {airportPoint} from './world.js?v=world2-1016';
import {terrainHeight} from './world.js?v=world2-1016';
import {createCoast,updateCoast} from './scenery.js?v=world2-1016';
import {createAirliner} from './aircraft.js?v=world2-1016';
import {createCockpit} from './cockpit.js?v=world2-1016';
export class FlightRenderer{
 constructor(canvas){
  this.renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
  this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));this.renderer.setSize(innerWidth,innerHeight);
  this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;
  this.scene=new T.Scene();this.scene.background=new T.Color('#bddbe1');this.scene.fog=new T.FogExp2('#bddbe1',.000045);
  this.camera=new T.PerspectiveCamera(58,innerWidth/innerHeight,.4,32000);this.camera.position.set(260,24,565);
  this.scene.add(this.camera);this.cockpit=createCockpit(this.camera);this.cockpit.group.visible=false;this.environment=createCoast(this.scene);this.airliner=createAirliner();this.scene.add(this.airliner.group);this.makeRoute();this.makeShadow();
  this.camPosition=new T.Vector3();this.camLook=new T.Vector3();this.initial=true;this.targetVector=new T.Vector3();this.quality='high';this.frames=0;this.time=0;this.previousPhase=null;this.touchdownAt=-100;this.previousPlane=new T.Vector3();this.planeDelta=new T.Vector3();
  this.forward=new T.Vector3();this.right=new T.Vector3();this.desired=new T.Vector3();this.look=new T.Vector3();
  addEventListener('resize',()=>this.resize());
 }
 resize(){this.renderer.setSize(innerWidth,innerHeight);this.camera.aspect=innerWidth/innerHeight;this.camera.updateProjectionMatrix();}
 setQuality(low){this.quality=low?'low':'high';this.renderer.setPixelRatio(low?.75:Math.min(devicePixelRatio,1.5));this.resize();}
 makeRoute(){
  this.routeRings=[];for(let i=0;i<7;i++){const ring=new T.Mesh(new T.TorusGeometry(65,1.25,6,56),new T.MeshBasicMaterial({color:'#a0edda',transparent:true,opacity:.7}));this.scene.add(ring);this.routeRings.push(ring);}
  this.glideRings=[];for(let j=0;j<8;j++){const ring=new T.Mesh(new T.TorusGeometry(29,.8,6,40),new T.MeshBasicMaterial({color:'#b8f4c8',transparent:true,opacity:.6}));this.scene.add(ring);this.glideRings.push(ring);}
  this.goAroundRing=new T.Mesh(new T.TorusGeometry(65,1.25,6,56),new T.MeshBasicMaterial({color:'#a0edda',transparent:true,opacity:.7}));this.scene.add(this.goAroundRing);this.currentFlight=null;this.marker=new T.Group();const arrow=new T.Mesh(new T.ConeGeometry(4.5,7,4),new T.MeshBasicMaterial({color:'#b4f3d8'}));arrow.rotation.z=Math.PI;this.marker.add(arrow);const circle=new T.Mesh(new T.TorusGeometry(10,.75,6,32),new T.MeshBasicMaterial({color:'#b4f3d8'}));circle.rotation.x=Math.PI/2;circle.position.y=-6;this.marker.add(circle);this.scene.add(this.marker);
 }
 makeShadow(){const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;const ctx=canvas.getContext('2d');ctx.filter='blur(4px)';ctx.fillStyle='rgba(15,29,32,.42)';ctx.beginPath();ctx.moveTo(128,30);ctx.bezierCurveTo(140,35,140,57,140,90);ctx.lineTo(228,151);ctx.lineTo(229,163);ctx.lineTo(140,137);ctx.lineTo(138,198);ctx.lineTo(171,220);ctx.lineTo(171,226);ctx.lineTo(128,219);ctx.lineTo(85,226);ctx.lineTo(85,220);ctx.lineTo(118,198);ctx.lineTo(116,137);ctx.lineTo(27,163);ctx.lineTo(28,151);ctx.lineTo(116,90);ctx.bezierCurveTo(116,57,116,35,128,30);ctx.fill();const texture=new T.CanvasTexture(canvas);this.shadow=new T.Mesh(new T.PlaneGeometry(55,55),new T.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false}));this.shadow.rotation.x=-Math.PI/2;this.scene.add(this.shadow);}
 render(state,delta,{menu=false,reducedMotion=false}={}){
  const dt=Math.min(delta,.12);this.time+=dt;const s=state,p=this.airliner.group;
  if(s.phase==='landing'&&this.previousPhase!=='landing')this.touchdownAt=this.time;this.previousPhase=s.phase;
  const bounce=reducedMotion?0:Math.sin((this.time-this.touchdownAt)*14)*.11*Math.exp(-(this.time-this.touchdownAt)*3);
  p.position.set(s.x,s.y+3.4+Math.max(-.1,bounce),s.z);p.rotation.set(s.pitch,-s.heading,-s.bank,'YXZ');this.airliner.gear.scale.y=Math.max(.02,s.gear);this.airliner.gear.visible=s.gear>.03;
  this.airliner.lights.forEach((light,index)=>light.visible=index<2||Math.sin(this.time*6)>0);if(this.airliner.fans)for(const fan of this.airliner.fans)fan.rotation.z-=dt*(4+s.engine*45);
  const shadowScale=Math.max(0,s.y-Math.max(0,terrainHeight(s.x,s.z)));this.shadow.position.set(s.x+shadowScale*.3,terrainHeight(s.x+shadowScale*.3,s.z+shadowScale*.2)+.2,s.z+shadowScale*.2);this.shadow.rotation.z=-s.heading;this.shadow.material.opacity=clamp(1-shadowScale/180,0,.65);this.shadow.scale.setScalar(1+shadowScale/250);this.shadow.visible=shadowScale<180&&terrainHeight(this.shadow.position.x,this.shadow.position.z)>-1;
  const h=s.heading,forward=this.forward.set(Math.sin(h),0,-Math.cos(h)),right=this.right.set(Math.cos(h),0,Math.sin(h));const desired=this.desired,look=this.look;
  if(menu){const angle=this.time*.035;desired.set(s.x+Math.cos(angle)*75,s.y+24,s.z+Math.sin(angle)*75);look.set(s.x,s.y+5,s.z);p.visible=true;}
  else if(s.camera==='cockpit'){desired.set(s.x,s.y+5.2,s.z).addScaledVector(forward,14.8);look.copy(desired).addScaledVector(forward,500);look.y+=Math.sin(s.pitch)*400;this.camera.up.set(0,1,0).applyAxisAngle(forward,s.bank*.5);p.visible=false;}
  else {const rise=s.grounded?20:16;desired.set(s.x,s.y+rise,s.z).addScaledVector(forward,-55).addScaledVector(right,20+(reducedMotion?0:-s.bank*5));look.set(s.x,s.y+5,s.z).addScaledVector(forward,36);this.camera.up.set(0,1,0);p.visible=true;}
  if(!reducedMotion&&s.grounded&&s.speed>30)desired.y+=Math.sin(this.time*26)*.035*Math.min(1,s.speed/65);
  if(!this.initial&&s.camera!=='cockpit'&&!menu){this.planeDelta.set(s.x,s.y,s.z).sub(this.previousPlane);this.camPosition.add(this.planeDelta);this.camLook.add(this.planeDelta);}this.previousPlane.set(s.x,s.y,s.z);if(this.initial||s.camera==='cockpit'||menu){this.camPosition.copy(desired);this.camLook.copy(look);this.initial=false;}else {const mix=reducedMotion?1:1-Math.exp(-dt*4);this.camPosition.lerp(desired,mix);this.camLook.lerp(look,mix);}
  this.camera.position.copy(this.camPosition);this.camera.lookAt(this.camLook);const goalFov=s.camera==='cockpit'?68:58+Math.min(8,s.speed/17);const fov=this.camera.fov+(goalFov-this.camera.fov)*Math.min(1,dt*3);if(Math.abs(this.camera.fov-fov)>.02){this.camera.fov=fov;this.camera.updateProjectionMatrix();}
  updateCoast(this.environment,this.scene,this.renderer,s,this.time,this.camera,this.quality==='low');
  const route=routeFor(s),info=approachInfo(s);if(this.currentFlight!==s.flightId){this.currentFlight=s.flightId;this.routeRings.forEach((ring,index)=>{if(!route[index])return;const point=route[index],previous=index?route[index-1]:{x:0,z:0};ring.position.set(point.x,point.y,point.z);ring.rotation.y=-Math.atan2(point.x-previous.x,-(point.z-previous.z));});this.glideRings.forEach((ring,index)=>{const remaining=1430-index*180,point=airportPoint(info.airport,info.touchdownAlong-remaining,0,Math.max(8,remaining*.115));ring.position.set(point.x,point.y,point.z);ring.rotation.y=-info.airport.heading;});}this.routeRings.forEach((ring,index)=>{ring.visible=['climb','cruise'].includes(s.phase)&&index>=s.routeIndex&&index<route.length;ring.material.opacity=index===s.routeIndex?.75:.16;});this.glideRings.forEach((ring,index)=>ring.visible=s.phase==='approach'&&info.remaining>1430-index*180);this.goAroundRing.visible=s.phase==='goaround';if(this.goAroundRing.visible){const point=target(s);this.goAroundRing.position.set(point.x,point.y,point.z);this.goAroundRing.lookAt(this.camera.position);}
  if(s.phase==='taxi'||s.phase==='arrival'){const point=s.phase==='taxi'?TAXI[s.taxiIndex]:arrivalTaxi(s)[s.arrivalIndex];this.marker.visible=true;this.marker.position.set(point.x,(point.y||0)+10+Math.sin(this.time*2)*.6,point.z);}else this.marker.visible=false;
  this.cockpit.group.visible=!menu&&s.camera==='cockpit';if(this.cockpit.group.visible)this.cockpit.update(s,this.time);this.renderer.render(this.scene,this.camera);this.frames++;
 }
 projectTarget(target){if(!target)return null;this.targetVector.set(target.x,target.y+5,target.z);const direction=this.targetVector.clone().sub(this.camera.position);const front=direction.dot(this.forward)>0;this.targetVector.project(this.camera);return {x:this.targetVector.x,y:this.targetVector.y,front};}
}
