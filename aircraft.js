import * as T from './vendor/three.module.js';
import {mat,box,cylinder,polygon,label,batchStatic} from './geometry.js?v=world2-1016';
function finGeometry(){const outline=[[11,1],[17.2,8.9],[19.7,8.45],[19.1,1]],points=[];for(const x of[-.14,.14])for(const [z,y]of outline)points.push(x,y,z);const indices=[0,2,1,0,3,2,4,5,6,4,6,7];for(let i=0;i<4;i++){const j=(i+1)%4;indices.push(i,j,i+4,j,j+4,i+4);}const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(points,3));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;}
function wingGeometry(side){const sections=[[2,-4,5,.62,0],[8,-1.2,6.3,.4,.1],[14.8,2.15,7.1,.21,.5],[18.1,4.6,7.4,.11,.95]],points=[],indices=[];for(const [x,lead,trail,thickness,y]of sections){const chord=trail-lead;points.push(side*x,y,lead,side*x,y+thickness*.53,lead+chord*.27,side*x,y,trail,side*x,y-thickness*.48,lead+chord*.28);}for(let i=0;i<sections.length-1;i++)for(let j=0;j<4;j++){const a=i*4+j,b=i*4+(j+1)%4,c=(i+1)*4+j,d=(i+1)*4+(j+1)%4;if(side>0)indices.push(a,b,c,b,d,c);else indices.push(a,c,b,b,c,d);}if(side>0)indices.push(0,1,2,0,2,3,12,14,13,12,15,14);else indices.push(0,2,1,0,3,2,12,13,14,12,14,15);const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(points,3));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;}
function fanGeometry(){const points=[],indices=[];for(let i=0;i<14;i++){const angle=i/14*Math.PI*2,start=points.length/3;for(const [r,a]of[[.28,angle],[.96,angle+.17],[.91,angle+.39],[.29,angle+.24]])points.push(Math.sin(a)*r,Math.cos(a)*r,0);indices.push(start,start+1,start+2,start,start+2,start+3);}const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(points,3));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;}
/** Original narrow-body airliner, 41 m long / 38 m span; all geometry is local. */
export function createAirliner(){
 const group=new T.Group(),white=mat('#eceee8',.32,.24),navy=mat('#17475c',.35,.3),teal=mat('#42bbae',.33,.35),dark=mat('#17282f',.35,.4),silver=mat('#abb7b8',.24,.72),panel=mat('#ccd5d3',.5,.28),glass=mat('#1e4352',.12,.65),seamMaterial=new T.LineBasicMaterial({color:'#82979a',transparent:true,opacity:.62});
 const profile=[[.08,-21],[.7,-19.5],[1.47,-16],[1.96,-11],[2.03,-7],[2.03,10],[1.94,13],[1.62,15.7],[1.12,18],[.12,20]].map(point=>new T.Vector2(...point));
 const fuselage=new T.Mesh(new T.LatheGeometry(profile,40),white);fuselage.rotation.x=-Math.PI/2;group.add(fuselage);
 const belly=new T.Mesh(new T.LatheGeometry(profile.map(point=>new T.Vector2(point.x*1.004,point.y)),40,Math.PI/2,Math.PI),navy);belly.rotation.x=-Math.PI/2;group.add(belly);
 for(const side of[-1,1]){
  group.add(box(.035,.13,27.3,teal,side*2.033,.24,-.3));
  for(let i=0;i<22;i++){const window=new T.Mesh(new T.SphereGeometry(1,8,6),glass);window.scale.set(.072,.235,.17);window.position.set(side*2.025,.83,-12.7+i*1.18);group.add(window);}
  for(const z of[-12.5,11.3]){group.add(box(.045,1.85,.85,panel,side*2.028,.06,z));group.add(box(.06,.045,.25,dark,side*2.062,-.12,z));}
  const brand=label('KEEWI AIR',10.4,1.15,'#164c5d',null);brand.position.set(side*2.065,1.17,1.8);brand.rotation.y=side*Math.PI/2;group.add(brand);
  const registration=label('K–A104',3,.5,'#6b8486',null);registration.position.set(side*1.88,.72,12.9);registration.rotation.y=side*Math.PI/2;group.add(registration);
  const wing=new T.Mesh(wingGeometry(side),white);wing.position.y=-.55;group.add(wing);
  const leadingEdge=polygon([[side*2,-4.04],[side*8,-1.24],[side*14.8,2.1],[side*18.12,4.58],[side*18.1,4.87],[side*14.8,2.48],[side*8,-.88],[side*2,-3.64]],.035,silver);leadingEdge.position.y=-.56;group.add(leadingEdge);
  const flap=polygon([[side*2.7,3.5],[side*13.6,5.92],[side*14.2,6.94],[side*2.7,4.88]],.06,panel);flap.position.y=-.43;group.add(flap);
  const seamPoints=[];for(const x of[4.6,8,11,14]){const lead=-4+(x-2)*.5,trail=5+(x-2)*.17,y=-.39+(x-2)*.037;seamPoints.push(side*x,y,lead+.6,side*x,y,trail-.2);}const seams=new T.BufferGeometry();seams.setAttribute('position',new T.Float32BufferAttribute(seamPoints,3));group.add(new T.LineSegments(seams,seamMaterial));
  const winglet=polygon([[0,0],[side*1.4,.3],[side*.85,2.7],[0,2.5]],.17,teal);winglet.position.set(side*18.1,.39,4.7);winglet.rotation.z=side*.97;group.add(winglet);
  const tailplane=polygon([[side*1,12.6],[side*7.6,15.9],[side*7.8,18],[side*1,16.9]],.24,navy);tailplane.position.y=.8;group.add(tailplane);
  const wingMark=label(side<0?'KEEWI':'K–A104',4.3,1,'#3d646b',null);wingMark.rotation.x=-Math.PI/2;wingMark.rotation.z=side>0?-Math.PI/2:Math.PI/2;wingMark.position.set(side*11.3,.05,3.8);group.add(wingMark);
  const engine=new T.Group();engine.position.set(side*7.15,-1.85,-.1);const shell=cylinder(1.05,1.33,4.9,white,32);shell.rotation.x=Math.PI/2;engine.add(shell);
  const inlet=new T.Mesh(new T.CircleGeometry(1.11,32),dark);inlet.position.z=-2.46;inlet.rotation.y=Math.PI;engine.add(inlet);
  const lip=new T.Mesh(new T.TorusGeometry(1.21,.11,10,32),silver);lip.position.z=-2.46;engine.add(lip);
  const exhaust=new T.Mesh(new T.CircleGeometry(.82,24),dark);exhaust.position.z=2.46;engine.add(exhaust);const exhaustLip=new T.Mesh(new T.TorusGeometry(.88,.1,8,24),silver);exhaustLip.position.z=2.47;engine.add(exhaustLip);
  const cone=new T.Mesh(new T.ConeGeometry(.48,1.2,20),silver);cone.rotation.x=Math.PI/2;cone.position.z=2.6;engine.add(cone);
  group.add(engine);group.add(box(.55,1.45,2.8,panel,side*7.15,-.64,.65));
 }
 const fin=new T.Mesh(finGeometry(),navy);group.add(fin);
 for(const side of[-1,1]){const emblem=label('K',3.7,3.7,'#9ce5d0',null);emblem.position.set(side*.152,5.8,17.6);emblem.rotation.y=side*Math.PI/2;group.add(emblem);const accent=new T.Mesh(new T.BufferGeometry(),teal);accent.geometry.setAttribute('position',new T.Float32BufferAttribute([side*.154,1.2,16.1,side*.154,2.4,16.7,side*.154,7.9,19.5,side*.154,6.7,19.5],3));accent.geometry.setIndex(side>0?[0,1,2,0,2,3]:[0,2,1,0,3,2]);accent.geometry.computeVertexNormals();group.add(accent);}
 // The windscreen is mounted onto the nose contours, rather than painted onto its roof.
 for(const side of[-1,1]){const geometry=new T.BufferGeometry(),v=[side*.06,1.51,-18.25,side*1.18,1.20,-17.75,side*1.45,1.03,-16.1,side*.08,1.42,-16.75];geometry.setAttribute('position',new T.Float32BufferAttribute(v,3));geometry.setIndex(side>0?[0,2,1,0,3,2]:[0,1,2,0,2,3]);geometry.computeVertexNormals();const windscreen=new T.Mesh(geometry,new T.MeshStandardMaterial({color:'#163b4e',roughness:.12,metalness:.65,side:T.DoubleSide}));group.add(windscreen);}
 batchStatic(group);
 const fans=[];for(const side of[-1,1]){const fan=new T.Group();fan.position.set(side*7.15,-1.85,-2.57);fan.add(new T.Mesh(fanGeometry(),silver));const spinner=new T.Mesh(new T.ConeGeometry(.3,.6,16),silver);spinner.rotation.x=-Math.PI/2;spinner.position.z=-.12;fan.add(spinner);fan.userData.dynamic=true;group.add(fan);fans.push(fan);}
 const gear=new T.Group();for(const [x,z]of[[0,-12],[-3,4],[3,4]]){gear.add(box(.17,1.48,.19,silver,x,-2.35,z));gear.add(box(.5,.12,.45,panel,x,-1.77,z));for(const side of[-1,1]){const wheel=cylinder(.55,.55,.32,dark,16);wheel.rotation.z=Math.PI/2;wheel.position.set(x+side*.25,-3.1,z);gear.add(wheel);const hub=cylinder(.22,.22,.34,silver,12);hub.rotation.z=Math.PI/2;hub.position.copy(wheel.position);gear.add(hub);}}batchStatic(gear);gear.userData.dynamic=true;group.add(gear);
 const red=new T.MeshBasicMaterial({color:'#ff5c4c'}),green=new T.MeshBasicMaterial({color:'#94ffbe'}),whiteLight=new T.MeshBasicMaterial({color:'#fff1c9'}),lights=[];for(const [x,y,z,material]of[[-18.5,1.15,7,red],[18.5,1.15,7,green],[0,2.06,-2,red],[0,8.7,19.4,whiteLight]]){const light=new T.Mesh(new T.SphereGeometry(.15,8,6),material);light.position.set(x,y,z);light.userData.dynamic=true;group.add(light);lights.push(light);}
 group.add(box(.12,.1,.85,whiteLight,-1,-1.5,-13));group.add(box(.12,.1,.85,whiteLight,1,-1.5,-13));
 return {group,gear,lights,fans};
}
