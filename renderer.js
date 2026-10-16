import * as T from './vendor/three.module.js';
import {ROUTE,TAXI,ARRIVAL,RUNWAYS,bearing,wrap,clamp} from './sim.js';
const mat=(color,roughness=.65,metalness=0)=>new T.MeshStandardMaterial({color,roughness,metalness});
const box=(w,h,d,m,x=0,y=0,z=0)=>{const a=new T.Mesh(new T.BoxGeometry(w,h,d),m);a.position.set(x,y,z);return a;};
const cylinder=(r1,r2,h,m,segments=20)=>new T.Mesh(new T.CylinderGeometry(r1,r2,h,segments),m);
function polygon(points,depth,material){const shape=new T.Shape();points.forEach(([x,z],i)=>i?shape.lineTo(x,z):shape.moveTo(x,z));shape.closePath();const geo=new T.ExtrudeGeometry(shape,{depth,bevelEnabled:false});geo.rotateX(Math.PI/2);return new T.Mesh(geo,material);}
function seeded(n){return()=>{n=(n*1664525+1013904223)>>>0;return n/4294967296;};}
function textTexture(text,{width=512,height=128,color='#ecf8f4',background=null,size=64}={}){const c=document.createElement('canvas');c.width=width;c.height=height;const x=c.getContext('2d');if(background){x.fillStyle=background;x.fillRect(0,0,width,height);}x.fillStyle=color;x.font=`bold ${size}px Arial`;x.textAlign='center';x.textBaseline='middle';x.fillText(text,width/2,height/2);const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;return t;}
function label(text,w,h,color='#e9f7f4',bg='#162c38'){const m=new T.MeshBasicMaterial({map:textTexture(text,{color,background:bg}),side:T.DoubleSide,transparent:true});return new T.Mesh(new T.PlaneGeometry(w,h),m);}
function runwayTexture(){const c=document.createElement('canvas');c.width=256;c.height=2048;const g=c.getContext('2d');g.fillStyle='#42484a';g.fillRect(0,0,256,2048);const random=seeded(271);for(let i=0;i<18000;i++){const b=40+random()*80;g.fillStyle=`rgba(${b},${b},${b},.12)`;g.fillRect(random()*256,random()*2048,1+random()*3,1+random()*3);}g.fillStyle='#e8ebe4';g.fillRect(7,0,3,2048);g.fillRect(246,0,3,2048);for(let j=170;j<1900;j+=100)g.fillRect(124,j,8,45);for(let y of[60,1910])for(let x=25;x<230;x+=26)g.fillRect(x,y,16,60);g.font='bold 86px Arial';g.textAlign='center';g.fillText('36',128,230);g.save();g.translate(128,1820);g.rotate(Math.PI);g.fillText('18',0,0);g.restore();g.fillStyle='#dce3dc';for(let side of[48,188])g.fillRect(side,320,20,75);const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;return t;}
// Bake fixed scenery by material. Fewer draw calls keep integrated Chromebook GPUs comfortable.
function batchStatic(scene){
 scene.updateMatrixWorld(true);const groups=new Map();
 scene.traverse(o=>{if(o.isMesh&&!o.isInstancedMesh&&o.material?.isMeshStandardMaterial&&!o.material.transparent&&!Array.isArray(o.material)){const id=o.material.uuid;if(!groups.has(id))groups.set(id,[]);groups.get(id).push(o);}});
 const v=new T.Vector3(),n=new T.Vector3(),nm=new T.Matrix3();
 for(const meshes of groups.values()){
  if(meshes.length<3)continue;const material=meshes[0].material,positions=[],normals=[],uvs=[],colors=[],indices=[];let offset=0;
  for(const m of meshes){const g=m.geometry,p=g.attributes.position,no=g.attributes.normal,uv=g.attributes.uv,col=g.attributes.color;nm.getNormalMatrix(m.matrixWorld);
   for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(m.matrixWorld);positions.push(v.x,v.y,v.z);if(no)n.fromBufferAttribute(no,i).applyMatrix3(nm).normalize();else n.set(0,1,0);normals.push(n.x,n.y,n.z);uvs.push(uv?uv.getX(i):0,uv?uv.getY(i):0);if(material.vertexColors)colors.push(col?col.getX(i):1,col?col.getY(i):1,col?col.getZ(i):1);}
   if(g.index){for(let i=0;i<g.index.count;i++)indices.push(g.index.getX(i)+offset);}else for(let i=0;i<p.count;i++)indices.push(i+offset);offset+=p.count;m.removeFromParent();
  }
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('normal',new T.Float32BufferAttribute(normals,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));if(material.vertexColors)geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));geometry.setIndex(indices);geometry.computeBoundingSphere();scene.add(new T.Mesh(geometry,material));
 }
}
export function createAirliner(){
 const group=new T.Group();const white=mat('#eeeae1',.35,.25),navy=mat('#143f57',.4,.3),teal=mat('#3bc9bd',.3,.4),dark=mat('#13242c',.3,.5),silver=mat('#abb8bc',.25,.65);
 const profile=[[.12,-21],[.8,-19],[1.65,-14],[2.03,-9],[2.03,11],[1.8,15],[1.2,18],[.15,20]].map(p=>new T.Vector2(...p));
 const fuselage=new T.Mesh(new T.LatheGeometry(profile,36),white);fuselage.rotation.x=-Math.PI/2;group.add(fuselage);
 const belly=new T.Mesh(new T.LatheGeometry(profile.map(p=>new T.Vector2(p.x*1.006,p.y)),36,Math.PI/2,Math.PI),navy);belly.rotation.x=-Math.PI/2;group.add(belly); // painted lower fuselage, beneath the window line
 // A narrow teal cheatline runs beneath both window rows.
 for(let side of[-1,1]){
  const stripe=box(.045,.17,28,teal,side*2.025,.25,-.2);group.add(stripe);
  for(let i=0;i<22;i++){const win=new T.Mesh(new T.SphereGeometry(1,8,6),dark);win.scale.set(.075,.25,.17);win.position.set(side*2.02,.83,-12.7+i*1.18);group.add(win);}
  for(let z of[-12.5,11.3]){const door=box(.07,1.9,.9,mat('#d0dcd9'),side*2.0,.2,z);group.add(door);const handle=box(.08,.05,.3,dark,side*2.05,-.15,z);group.add(handle);}
  const brand=label('KEEWI AIR',11,1.3,'#174354',null);brand.position.set(side*2.06,.9,2);brand.rotation.y=side*Math.PI/2;group.add(brand);
 }
 // Swept full-volume wings, fins and split engine nacelles give the aircraft its silhouette.
 for(let side of[-1,1]){
  const wing=polygon([[side*1.5,-4],[side*17.5,2.3],[side*18.9,6],[side*17.7,7.2],[side*2,4]],.38,white);wing.position.y=-.55;group.add(wing);
  const wingtip=polygon([[0,0],[side*1.4,.2],[side*.7,1.8],[0,1.8]],.2,teal);wingtip.position.set(side*17.7,-.35,5.4);wingtip.rotation.z=side*1.0;group.add(wingtip);
  const stabilizer=polygon([[side*1,13],[side*7.5,16.2],[side*7.8,18],[side*1,17]],.25,navy);stabilizer.position.y=.8;group.add(stabilizer);
  const eng=new T.Group();eng.position.set(side*7.2,-1.85,-.3);const shell=cylinder(1.27,1.12,4.8,white,24);shell.rotation.x=Math.PI/2;eng.add(shell);const hole=new T.Mesh(new T.CircleGeometry(.98,24),dark);hole.position.z=-2.42;hole.rotation.y=Math.PI;eng.add(hole);const fan=new T.Mesh(new T.ConeGeometry(.35,.8,16),silver);fan.rotation.x=-Math.PI/2;fan.position.z=-2.38;eng.add(fan);for(let i=0;i<12;i++){const blade=box(.08,.7,.05,silver);blade.position.set(Math.sin(i*Math.PI/6)*.5,Math.cos(i*Math.PI/6)*.5,-2.43);blade.rotation.z=-i*Math.PI/6+.35;eng.add(blade);}const lip=new T.Mesh(new T.TorusGeometry(1.12,.13,8,24),silver);lip.position.z=-2.4;eng.add(lip);group.add(eng);group.add(box(.6,1.2,3,white,side*7.2,-.65,.6));
 }
 const fin=new T.Mesh(new T.BufferGeometry(),navy);const verts=new Float32Array([0,1,11,0,8.9,17.2,0,8.5,20,0,1,19]);fin.geometry.setAttribute('position',new T.BufferAttribute(verts,3));fin.geometry.setIndex([0,1,2,0,2,3]);fin.geometry.computeVertexNormals();fin.material.side=T.DoubleSide;group.add(fin);
 for(let side of[-1,1]){const emblem=label('K',4,4,'#54e2d2',null);emblem.position.set(side*.03,5.8,17.3);emblem.rotation.y=side*Math.PI/2;group.add(emblem);}
 const glass=mat('#173d50',.15,.65);for(let side of[-1,1]){const g=polygon([[side*.15,-18.8],[side*1.5,-17.9],[side*1.5,-16],[side*.15,-16.8]],.02,glass);g.position.y=1.44;g.rotation.z=side*-.18;group.add(g);}
 const gear=new T.Group();for(let [x,z] of[[0,-12],[-3,4],[3,4]]){gear.add(box(.18,1.5,.2,silver,x,-2.4,z));for(let side of[-1,1]){const wheel=cylinder(.55,.55,.35,dark,12);wheel.rotation.z=Math.PI/2;wheel.position.set(x+side*.24,-3.1,z);gear.add(wheel);}}group.add(gear);
 const red=new T.MeshBasicMaterial({color:'#ff534c'}),green=new T.MeshBasicMaterial({color:'#73ffb1'}),lamp=new T.MeshBasicMaterial({color:'#fff3cc'});const lights=[];for(let [x,y,z,m]of[[-18,.1,6,red],[18,.1,6,green],[0,9,19,lamp]]){const light=new T.Mesh(new T.SphereGeometry(.2,8,6),m);light.position.set(x,y,z);group.add(light);lights.push(light);}
 return {group,gear,lights};
}
export class FlightRenderer{
 constructor(canvas){
  this.renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));this.renderer.setSize(innerWidth,innerHeight);this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.08;
  this.scene=new T.Scene();this.scene.background=new T.Color('#8bc1d4');this.scene.fog=new T.FogExp2('#a5cad2',.000075);
  this.camera=new T.PerspectiveCamera(58,innerWidth/innerHeight,.4,32000);this.camera.position.set(260,24,565);
  this.scene.add(new T.HemisphereLight('#d7edf9','#6a806c',2.1));const sun=new T.DirectionalLight('#fff0c4',3.3);sun.position.set(-3200,2800,-3000);this.scene.add(sun);
  this.makeSky();this.makeOcean();this.makeLand();this.makeAirports();batchStatic(this.scene);this.makeRoute();this.airliner=createAirliner();this.scene.add(this.airliner.group);this.makeShadow();
  this.camPosition=new T.Vector3();this.camLook=new T.Vector3();this.initial=true;this.targetVector=new T.Vector3();this.quality='high';this.frames=0;this.time=0;
  addEventListener('resize',()=>this.resize());
 }
 resize(){this.renderer.setSize(innerWidth,innerHeight);this.camera.aspect=innerWidth/innerHeight;this.camera.updateProjectionMatrix();}
 setQuality(low){this.quality=low?'low':'high';this.renderer.setPixelRatio(low?.75:Math.min(devicePixelRatio,1.5));this.resize();}
 makeSky(){
  const skyMat=new T.ShaderMaterial({side:T.BackSide,depthWrite:false,uniforms:{top:{value:new T.Color('#3c8fc5')},horizon:{value:new T.Color('#bbd9de')},bottom:{value:new T.Color('#85bac9')}},vertexShader:'varying vec3 p; void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec3 p;uniform vec3 top;uniform vec3 horizon;uniform vec3 bottom;void main(){float h=normalize(p).y;vec3 c=mix(horizon,top,pow(max(0.,h),.65));if(h<0.)c=mix(horizon,bottom,clamp(-h*4.,0.,1.));gl_FragColor=vec4(c,1.);\n#include <colorspace_fragment>\n}'});this.sky=new T.Mesh(new T.SphereGeometry(25000,24,16),skyMat);this.scene.add(this.sky);
  const sun=new T.Mesh(new T.SphereGeometry(250,20,12),new T.MeshBasicMaterial({color:'#ffebbd',fog:false}));sun.position.set(-12000,6500,-13000);this.scene.add(sun);
  const random=seeded(92),cloudMat=new T.MeshStandardMaterial({color:'#f5f7f1',roughness:1});for(let i=0;i<36;i++){const cloud=new T.Group();for(let j=0;j<4;j++){const puff=new T.Mesh(new T.SphereGeometry(1,10,7),cloudMat);puff.position.set(j*150,random()*60,random()*90);puff.scale.set(180+random()*130,95+random()*60,95+random()*90);cloud.add(puff);}cloud.position.set((random()-.5)*21000,1400+random()*1200,-random()*17000);this.scene.add(cloud);}
 }
 makeOcean(){
  this.ocean=new T.Mesh(new T.PlaneGeometry(60000,60000,1,1),new T.ShaderMaterial({uniforms:{time:{value:0},fogColor:{value:new T.Color('#9cbfcb')}},vertexShader:'varying vec3 w;void main(){w=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(w,1.);}',fragmentShader:'varying vec3 w;uniform float time;uniform vec3 fogColor;void main(){float a=sin(w.x*.012+w.z*.008+time*.5)*sin(w.z*.014-time*.3);float b=sin(w.x*.035+w.z*.024+time)*.35;vec3 c=mix(vec3(.105,.36,.43),vec3(.22,.53,.56),.5+a*.15+b*.1);float fog=1.-exp(-length(w.xz-cameraPosition.xz)*.00007);gl_FragColor=vec4(mix(c,fogColor,fog),1.);\n#include <colorspace_fragment>\n}'}));this.ocean.rotation.x=-Math.PI/2;this.ocean.position.y=-5;this.scene.add(this.ocean);
 }
 island(cx,cz,rx,rz,height,seed){
  const random=seeded(seed),segments=56,rings=13;const positions=[],colors=[],indices=[];const base=new T.Color('#62836c'),peak=new T.Color('#71857a'),sand=new T.Color('#b8b08a');
  for(let r=0;r<=rings;r++)for(let j=0;j<=segments;j++){const a=j/segments*Math.PI*2,q=r/rings;const wobble=1+.1*Math.sin(a*3+seed)+.07*Math.cos(a*7);const x=Math.cos(a)*rx*q*wobble,z=Math.sin(a)*rz*q*wobble;let y=-4+Math.pow(Math.max(0,1-q*q),2)*height*(.85+.12*Math.sin(x*.009)*Math.sin(z*.008));const wx=cx+x,wz=cz+z;if((wx>-370&&wx<700&&wz>-1600&&wz<950)||(wx>300&&wx<1500&&wz>-11600&&wz<-8700))y=Math.min(y,-.8);positions.push(wx,y,wz);const c=q>.9?sand.clone().lerp(base,Math.max(0,(.99-q)*8)):base.clone().lerp(peak,Math.max(0,y/height)*.7);const shade=.92+random()*.15;c.multiplyScalar(shade);colors.push(c.r,c.g,c.b);if(r<rings&&j<segments){const k=r*(segments+1)+j;indices.push(k,k+segments+1,k+1,k+1,k+segments+1,k+segments+2);}}
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));geo.setIndex(indices);geo.computeVertexNormals();const mesh=new T.Mesh(geo,new T.MeshStandardMaterial({vertexColors:true,roughness:1}));this.scene.add(mesh);
 }
 makeLand(){
  this.island(400,0,2200,2100,43,52);this.island(1100,-10500,2400,2600,34,79);this.island(-3500,-4300,2100,3100,440,21);this.island(4000,-4600,2200,1800,250,39);this.island(-3900,-11000,1800,2400,610,11);this.island(3700,3500,2200,2100,270,43);
  // Flat airport peninsulas are deliberately cut into the coastal terrain.
  const grass=mat('#718873'),road=mat('#737a75');for(let[x,z,w,d]of[[160,-350,950,2500],[900,-10150,1150,2800]]){const p=box(w,8,d,grass,x,-4,z);this.scene.add(p);const berm=box(w+45,4,d+40,mat('#c0b69a'),x,-6,z);this.scene.add(berm);}
  const random=seeded(83),houses=[mat('#d1c3a5'),mat('#c5d0cb'),mat('#c5a894')],roof=mat('#47646a');const geo=new T.BoxGeometry(1,1,1),buildings=new T.InstancedMesh(geo,mat('#b4c4bd'),230);const dummy=new T.Object3D();for(let i=0;i<230;i++){const arrival=i>110;const x=(arrival?1500:900)+random()*1100,z=(arrival?-10500:100)+random()*1700-700;const h=8+random()*35;dummy.position.set(x,h/2+2,z);dummy.scale.set(12+random()*28,h,15+random()*30);dummy.rotation.y=random()>.5?0:Math.PI/2;dummy.updateMatrix();buildings.setMatrixAt(i,dummy.matrix);}this.scene.add(buildings);
  // Harbour cranes and a few slow-looking cargo ships break up the sea.
  const crane=mat('#c6a15b'),ship=mat('#285765');for(let i=0;i<5;i++){const x=1900+i*100,z=-11300;this.scene.add(box(3,75,3,crane,x,37,z));this.scene.add(box(110,4,4,crane,x-35,73,z));this.scene.add(box(190,10,45,ship,x+200,-1,z-180));}
 }
 makeAirports(){
  const pavement=mat('#636b69'),white=mat('#e9ede5'),navy=mat('#214858'),glass=mat('#6e9aab',.2,.6),yellow=new T.MeshBasicMaterial({color:'#ffe49b'}),blue=new T.MeshBasicMaterial({color:'#4de0ed'});
  for(let i=0;i<RUNWAYS.length;i++){
   const r=RUNWAYS[i],arrival=i===1,x=r.x,z=r.z;
   const runway=new T.Mesh(new T.PlaneGeometry(r.width,r.length),new T.MeshStandardMaterial({map:runwayTexture(),roughness:.98}));runway.rotation.x=-Math.PI/2;runway.position.set(x,.22,z);this.scene.add(runway);
   for(let side of[-1,1])for(let j=-r.length/2;j<=r.length/2;j+=55){const l=new T.Mesh(new T.SphereGeometry(.65,6,4),white);l.position.set(x+side*34,.8,z+j);this.scene.add(l);}
   for(let j=0;j<10;j++){const l=box(2,.5,2,new T.MeshBasicMaterial({color:'#7ce8b7'}),x-27+j*6,.5,z+r.length/2-15);this.scene.add(l);}
   const apron=box(300,.2,490,pavement,x+205,.04,arrival?-10400:410);this.scene.add(apron);
   const taxiPoints=arrival?[{x:700,z:-10500},{x:820,z:-10600},{x:1000,z:-10600},{x:1000,z:-10380}]:[{x:220,z:500},...TAXI];
   for(let j=1;j<taxiPoints.length;j++){const a=taxiPoints[j-1],b=taxiPoints[j],len=Math.hypot(b.x-a.x,b.z-a.z),angle=Math.atan2(b.x-a.x,b.z-a.z);const surface=box(28,.15,len+25,pavement,(a.x+b.x)/2,.1,(a.z+b.z)/2);surface.rotation.y=angle;this.scene.add(surface);const stripe=box(.45,.05,len,yellow,(a.x+b.x)/2,.25,(a.z+b.z)/2);stripe.rotation.y=angle;this.scene.add(stripe);for(let k=0;k<len;k+=16){const t=k/len;for(let side of[-1,1]){const l=box(.8,.35,.8,blue,a.x+(b.x-a.x)*t+Math.cos(angle)*side*13,.4,a.z+(b.z-a.z)*t-Math.sin(angle)*side*13);this.scene.add(l);}}}
   const tx=arrival?1110:330,tz=arrival?-10350:565;this.scene.add(box(90,16,290,white,tx,8,tz));this.scene.add(box(92,8,290,glass,tx,9,tz));this.scene.add(box(98,2,300,navy,tx,17,tz));for(let j=0;j<6;j++){this.scene.add(box(45,5,9,white,tx-65,9,tz-110+j*45));this.scene.add(box(8,13,12,navy,tx-90,6.5,tz-110+j*45));}
   const title=label(arrival?'NORTHPORT':'SOUTH BAY',90,9);title.position.set(tx-45,16,tz);title.rotation.y=-Math.PI/2;this.scene.add(title);
   const towerx=x+440,towerz=arrival?-9800:40;this.scene.add(box(13,60,13,white,towerx,30,towerz));const tower=cylinder(17,12,12,glass,8);tower.position.set(towerx,62,towerz);this.scene.add(tower);this.scene.add(box(36,3,30,navy,towerx,69,towerz));
   const sign=label('36  ↑',15,5,'#f8df7a','#202b29');sign.position.set(x+55,3,z+750);this.scene.add(sign);
   const gate=label(arrival?'GATE 04':'GATE 01',30,6,'#fff9d9','#254d59');gate.position.set(arrival?1000:220,7,arrival?-10340:555);gate.rotation.y=arrival?0:Math.PI;this.scene.add(gate);
  }
 }
 makeRoute(){
  this.routeRings=[];for(let i=0;i<ROUTE.length;i++){const p=ROUTE[i],ring=new T.Mesh(new T.TorusGeometry(55,1.8,8,48),new T.MeshBasicMaterial({color:'#82e8da',transparent:true,opacity:.75}));ring.position.set(p.x,p.y,p.z);this.scene.add(ring);this.routeRings.push(ring);}
  this.glideRings=[];for(let j=0;j<8;j++){const z=-7900-j*180,y=Math.max(8,(z+9330)*.115);const r=new T.Mesh(new T.TorusGeometry(27,1,6,32),new T.MeshBasicMaterial({color:'#a1f7bc',transparent:true,opacity:.6}));r.position.set(700,y,z);this.scene.add(r);this.glideRings.push(r);}
  this.marker=new T.Group();const m=new T.Mesh(new T.ConeGeometry(5,10,4),new T.MeshBasicMaterial({color:'#8cf0de'}));m.rotation.z=Math.PI;this.marker.add(m);const circle=new T.Mesh(new T.TorusGeometry(13,1.1,6,24),new T.MeshBasicMaterial({color:'#8cf0de'}));circle.rotation.x=Math.PI/2;circle.position.y=-8;this.marker.add(circle);this.scene.add(this.marker);
 }
 makeShadow(){const c=document.createElement('canvas');c.width=128;c.height=128;const x=c.getContext('2d'),g=x.createRadialGradient(64,64,4,64,64,62);g.addColorStop(0,'rgba(10,25,32,.38)');g.addColorStop(1,'rgba(10,25,32,0)');x.fillStyle=g;x.fillRect(0,0,128,128);this.shadow=new T.Mesh(new T.PlaneGeometry(65,65),new T.MeshBasicMaterial({map:new T.CanvasTexture(c),transparent:true,depthWrite:false}));this.shadow.rotation.x=-Math.PI/2;this.shadow.position.y=.32;this.scene.add(this.shadow);}
 render(s,dt,{menu=false,reducedMotion=false}={}){
  this.time+=dt;this.ocean.material.uniforms.time.value=this.time;this.sky.position.copy(this.camera.position);
  const p=this.airliner.group;p.position.set(s.x,s.y+3.4,s.z);p.rotation.set(s.pitch,-s.heading,-s.bank,'YXZ');this.airliner.gear.scale.y=Math.max(.02,s.gear);this.airliner.gear.visible=s.gear>.03;
  this.shadow.position.set(s.x,.33,s.z);this.shadow.material.opacity=clamp(1-s.y/200,0,.8);this.shadow.scale.setScalar(1+s.y/90);
  this.airliner.lights.forEach((l,i)=>l.visible=i<2||Math.sin(this.time*6)>0);
  const h=s.heading,forward=new T.Vector3(Math.sin(h),0,-Math.cos(h)),right=new T.Vector3(Math.cos(h),0,Math.sin(h));
  let look,desired;
  if(menu){const a=this.time*.035;desired=new T.Vector3(s.x+Math.cos(a)*78,s.y+27,s.z+Math.sin(a)*78);look=new T.Vector3(s.x,s.y+5,s.z);p.visible=true;}
  else if(s.camera==='cockpit'){desired=new T.Vector3(s.x,s.y+5.2,s.z).addScaledVector(forward,14.8);look=desired.clone().addScaledVector(forward,500);look.y+=Math.sin(s.pitch)*350;this.camera.up.set(0,1,0).applyAxisAngle(forward,s.bank*.35);p.visible=false;}
  else {desired=new T.Vector3(s.x,s.y+20,s.z).addScaledVector(forward,-53).addScaledVector(right,20);look=new T.Vector3(s.x,s.y+6,s.z).addScaledVector(forward,36);this.camera.up.set(0,1,0);p.visible=true;}
  if(this.initial||s.camera==='cockpit'||menu){this.camPosition.copy(desired);this.camLook.copy(look);this.initial=false;}else {const t=reducedMotion?1:1-Math.exp(-dt*4);this.camPosition.lerp(desired,t);this.camLook.lerp(look,t);}
  this.camera.position.copy(this.camPosition);this.camera.lookAt(this.camLook);const fov=s.camera==='cockpit'?68:58+Math.min(9,s.speed/16);if(Math.abs(this.camera.fov-fov)>.1){this.camera.fov=fov;this.camera.updateProjectionMatrix();}
  this.routeRings.forEach((r,i)=>{r.visible=['climb','cruise'].includes(s.phase)&&i>=s.routeIndex;r.material.opacity=i===s.routeIndex?.85:.22;r.scale.setScalar(i===s.routeIndex?1+Math.sin(this.time*2)*.02:.8);});this.glideRings.forEach(r=>r.visible=s.phase==='approach'&&r.position.z<s.z);
  if(s.phase==='taxi'||s.phase==='arrival'){const t=s.phase==='taxi'?TAXI[s.taxiIndex]:ARRIVAL[s.arrivalIndex];this.marker.visible=true;this.marker.position.set(t.x,14+Math.sin(this.time*2)*1.5,t.z);}else this.marker.visible=false;
  this.renderer.render(this.scene,this.camera);
 }
 projectTarget(t){if(!t)return null;this.targetVector.set(t.x,t.y+5,t.z);const direction=this.targetVector.clone().sub(this.camera.position);const forward=new T.Vector3();this.camera.getWorldDirection(forward);const front=direction.dot(forward)>0;this.targetVector.project(this.camera);return {x:this.targetVector.x,y:this.targetVector.y,front};}
}
