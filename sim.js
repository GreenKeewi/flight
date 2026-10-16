/** Cloudliner — deterministic, forgiving flight model. World metres, seconds, radians. */
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const lerp=(a,b,t)=>a+(b-a)*t;
export const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
export const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export const bearing=(a,b)=>Math.atan2(b.x-a.x,-(b.z-a.z));
export const ROUTE=[
 {x:0,y:220,z:-1700,label:'Climb out',radius:280},
 {x:-850,y:450,z:-3400,label:'West coastline',radius:400},
 {x:-1150,y:520,z:-5100,label:'Harbour turn',radius:420},
 {x:700,y:400,z:-6500,label:'Arrival corridor',radius:400},
 {x:700,y:170,z:-7900,label:'Final approach',radius:280},
];
export const TAXI=[{x:220,z:280},{x:135,z:170},{x:0,z:170},{x:0,z:25}];
export const ARRIVAL=[{x:700,z:-10500},{x:820,z:-10600},{x:1000,z:-10600},{x:1000,z:-10380}];
export const RUNWAYS=[{x:0,z:-550,length:1800,width:64},{x:700,z:-9900,length:2000,width:64}];
export const PHASE_NAMES={gate:'Boarding',taxi:'Taxi to runway',takeoff:'Takeoff',climb:'Climb out',cruise:'Island crossing',approach:'Approach',landing:'Runway rollout',arrival:'Taxi to gate',parked:'Open the doors',complete:'Welcome to Northport'};
export function newFlight(){return {x:220,y:0,z:500,heading:0,pitch:0,bank:0,speed:0,verticalSpeed:0,throttle:0,phase:'gate',routeIndex:0,taxiIndex:0,arrivalIndex:0,autopilot:false,doors:true,time:0,flightTime:0,distance:0,paused:false,gear:1,flaps:1,landingScore:null,recoveries:0,overspeedTime:0,offRouteTime:0,completed:false,event:'Welcome aboard. Close the doors with E.',eventTime:6,grounded:true,engine:0,score:0,camera:'chase',weather:'clear',dwell:0,helpUsed:false,stall:false,goAround:false};}
export function notify(s,text,duration=5){s.event=text;s.eventTime=duration;}
export function toggleDoors(s){
 if(s.speed>.7||!['gate','parked','complete'].includes(s.phase)){notify(s,'Doors stay locked until parked safely at the gate.');return false;}
 s.doors=!s.doors;
 if(s.phase==='gate'&&!s.doors){s.phase='taxi';notify(s,'Doors closed. Follow the blue taxi lights. Space: autopilot.');}
 if(s.phase==='parked'&&s.doors){s.phase='complete';s.completed=true;s.score=Math.max(100,1000+(s.landingScore||0)-s.recoveries*150-Math.max(0,Math.round(s.flightTime-480)));notify(s,'Flight complete. Welcome to Northport!',20);}
 return true;
}
export function toggleAutopilot(s){if(s.completed)return;s.autopilot=!s.autopilot;notify(s,s.autopilot?'Autopilot on. Your crew is flying; any flight input returns control.':'You have control. Follow the next blue ring.');}
export function target(s){if(s.phase==='taxi')return {...TAXI[s.taxiIndex],y:0,label:'Taxi point'};if(s.phase==='arrival')return {...ARRIVAL[s.arrivalIndex],y:0,label:'Gate 04'};if(['climb','cruise'].includes(s.phase))return ROUTE[s.routeIndex];if(s.phase==='approach')return {x:700,y:0,z:-9330,label:'Runway 36'};return null;}
export function recover(s,reason='Your crew has set up a safe approach.'){
 s.recoveries++;s.helpUsed=true;
 if(['gate','taxi','takeoff'].includes(s.phase)&&s.grounded){Object.assign(s,{x:0,y:0,z:25,heading:0,pitch:0,bank:0,speed:0,throttle:0,phase:'takeoff',grounded:true,doors:false,autopilot:false,taxiIndex:3});notify(s,'Lined up on runway 36. Hold W to take off.',7);return;}
 Object.assign(s,{x:700,y:300,z:-7000,heading:0,pitch:-.07,bank:0,speed:76,verticalSpeed:-5,throttle:.29,phase:'approach',routeIndex:4,grounded:false,autopilot:true,doors:false,goAround:true});notify(s,reason+' Autopilot is guiding you in.',8);
}
function groundSteer(s,dt,desired,speed){const error=wrap(desired-s.heading);s.heading=wrap(s.heading+clamp(error*2,-.65,.65)*dt*clamp(s.speed/3,0,1));s.speed=lerp(s.speed,speed,Math.min(1,dt*.9));s.bank=lerp(s.bank,0,dt*4);s.pitch=lerp(s.pitch,0,dt*4);}
function move(s,dt){const travel=s.speed*dt;s.x+=Math.sin(s.heading)*travel;s.z-=Math.cos(s.heading)*travel;s.distance+=travel;}
export function step(s,input={},delta=1/60){
 if(s.paused||s.completed)return s;
 const dt=clamp(delta,0,.1);if(!dt)return s;
 s.time+=dt;s.eventTime=Math.max(0,s.eventTime-dt);
 const manual=!!(input.left||input.right||input.up||input.down||input.throttleUp||input.throttleDown);
 if(manual&&s.autopilot){s.autopilot=false;notify(s,'You have control. Space returns the flight to your crew.',3);}
 if(s.phase==='gate'){s.engine=lerp(s.engine,.12,dt);return s;}
 s.flightTime+=dt;
 if(s.phase==='parked'){s.speed=0;s.throttle=0;s.engine=lerp(s.engine,0,dt*.5);return s;}
 const isGround=['taxi','takeoff','landing','arrival'].includes(s.phase)&&s.grounded;
 if(isGround){
  s.y=0;s.verticalSpeed=0;
  if(s.phase==='taxi'||s.phase==='arrival'){
   const list=s.phase==='taxi'?TAXI:ARRIVAL;
   const idx=s.phase==='taxi'?s.taxiIndex:s.arrivalIndex;
   const t=list[idx];const d=distance(s,t);
   if(s.autopilot){const error=Math.abs(wrap(bearing(s,t)-s.heading));const desiredSpeed=Math.min(s.phase==='taxi'?10:9,Math.max(2,d*.4))*(error>1.2?.35:1);groundSteer(s,dt,bearing(s,t),desiredSpeed);s.throttle=.14;}
   else {s.throttle=clamp(s.throttle+((input.throttleUp||input.up)?.35:0)*dt-((input.throttleDown||input.down)?.75:0)*dt,0,.32);const brake=input.down||input.throttleDown;s.speed=clamp(s.speed+(s.throttle*10-.2-s.speed*.03-(brake?5:0))*dt,0,s.phase==='taxi'?14:12);s.heading=wrap(s.heading+((input.right?1:0)-(input.left?1:0))*dt*.7*clamp(s.speed/3,0,1));}
   move(s,dt);
   if(d<18){
    if(idx<list.length-1){if(s.phase==='taxi')s.taxiIndex++;else s.arrivalIndex++;}
    else if(s.phase==='taxi'){s.phase='takeoff';s.throttle=s.autopilot?1:0;s.speed=Math.min(s.speed,8);if(Math.abs(wrap(s.heading))<.45||s.autopilot)s.heading=0;notify(s,'Cleared for takeoff. Hold W; the nose lifts gently at flying speed.',7);}
    else {s.phase='parked';s.speed=0;s.throttle=0;s.heading=Math.PI;notify(s,'Parking brake set. Press E to open the doors and finish.',15);}
   }
   if(s.phase==='taxi'&&Math.min(...TAXI.map(t=>distance(s,t)))>600)notify(s,'Need a hand? H lines you up on the departure runway.',2);
  }else if(s.phase==='takeoff'){
   if(s.autopilot){s.throttle=1;s.heading=lerp(s.heading,0,dt*2);}else {s.throttle=clamp(s.throttle+((input.throttleUp||input.up)?.55:0)*dt-((input.throttleDown||input.down)?.8:0)*dt,0,1);s.heading=wrap(s.heading+((input.right?1:0)-(input.left?1:0))*dt*.35*clamp(s.speed/8,0,1));}
   s.speed=clamp(s.speed+(s.throttle*6.1-.1-s.speed*.007-(input.down?7:0))*dt,0,100);move(s,dt);s.pitch=lerp(s.pitch,s.speed>52?.065:0,dt*2);
   if(s.speed>61&&Math.abs(s.x)<60){s.grounded=false;s.phase='climb';s.y=1;s.pitch=.13;notify(s,'Positive climb! Gear retracting. Follow the blue route rings.',6);}
   if(s.z<-1480||Math.abs(s.x)>90){recover(s,'Takeoff reset.');}
  }else if(s.phase==='landing'){
   s.throttle=0;s.speed=Math.max(0,s.speed-dt*(s.autopilot?2.5:1.1+(input.down||input.throttleDown?4:0)));s.heading=wrap(s.heading+clamp(wrap(-s.heading),-.25,.25)*dt*2+((input.right?1:0)-(input.left?1:0))*.18*dt);move(s,dt);s.pitch=lerp(s.pitch,0,dt*2);
   if(s.speed<11&&s.z<-9700){s.phase='arrival';s.arrivalIndex=s.z<-10480?1:0;s.speed=Math.min(s.speed,8);notify(s,'Runway clear ahead. Follow the blue taxi lights to Gate 04.',8);}
   if(s.z<-10900){s.speed=0;s.phase='arrival';s.arrivalIndex=1;notify(s,'Automatic end-of-runway braking. Taxi to Gate 04.');}
  }
  s.engine=lerp(s.engine,s.throttle,dt*1.5);s.gear=1;s.flaps=1;s.bank=lerp(s.bank,0,dt*3);return s;
 }
 // Airborne: thrust and attitude have inertia; bank-to-turn and automatic trim ease the workload.
 let desiredPitch=0,desiredBank=0;
 if(s.autopilot){
  const t=target(s);let desiredSpeed=110;
  if(s.phase==='approach'){
   const remaining=Math.max(0,s.z+9330);const glide=remaining*.115;
   desiredPitch=clamp((glide-s.y)*.008-.10,-.18,.13);
   if(remaining<190)desiredPitch=clamp((-1-s.y)*.025,-.065,-.015);
   desiredSpeed=remaining>1400?82:remaining>650?69:59;
  }else {desiredPitch=clamp((t.y-s.y)*.003,-.17,.18);desiredSpeed=s.phase==='climb'?93:118;}
  const courseTarget=s.phase==='approach'?{x:700,z:s.z-800}:t;const error=wrap(bearing(s,courseTarget)-s.heading);desiredBank=clamp(error*1.4,-.44,.44);
  s.throttle=clamp((desiredSpeed-43)/104,0,1);
 }else {
  s.throttle=clamp(s.throttle+((input.throttleUp)?.25:0)*dt-((input.throttleDown)?.3:0)*dt,.03,1);
  desiredBank=((input.right?1:0)-(input.left?1:0))*.52;
  desiredPitch=((input.up?1:0)-(input.down?1:0))*.21;
  // Gentle climb-out trim, then hold height when the arrow keys are released.
  if(s.phase==='climb'&&!input.down&&!input.up)desiredPitch=s.y<220?.13:0;
 }
 s.pitch=lerp(s.pitch,desiredPitch,dt*1.7);s.bank=lerp(s.bank,desiredBank,dt*2.5);
 s.heading=wrap(s.heading+Math.tan(s.bank)*9.81/Math.max(45,s.speed)*dt*7.0);
 const targetSpeed=43+s.throttle*104-Math.max(0,s.pitch)*65;
 s.speed=lerp(s.speed,targetSpeed,dt*.13);
 s.stall=s.speed<49;s.verticalSpeed=s.speed*Math.sin(s.pitch)-(s.stall?(49-s.speed)*.35:0);
 s.y+=s.verticalSpeed*dt;move(s,dt);
 s.engine=lerp(s.engine,s.throttle,dt*1.5);
 s.gear=lerp(s.gear,s.phase==='approach'?1:0,dt*.8);s.flaps=lerp(s.flaps,s.phase==='approach'?1:0,dt*.8);
 if(['climb','cruise'].includes(s.phase)){
  const t=ROUTE[s.routeIndex];const d=distance(s,t);
  if(d<t.radius&&Math.abs(s.y-t.y)<330){s.routeIndex++;if(s.routeIndex>=ROUTE.length){s.phase='approach';s.routeIndex=ROUTE.length-1;notify(s,'Cleared to land runway 36. Slow down; follow the green glide path.',8);}else {s.phase=s.routeIndex<1?'climb':'cruise';notify(s,`Route ${s.routeIndex} of 5 checked. Next: ${ROUTE[s.routeIndex].label}.`,4);}}
 }
 const onArrival=Math.abs(s.x-700)<44&&s.z<-8900&&s.z>-10950;
 const onDeparture=Math.abs(s.x)<44&&s.z<350&&s.z>-1450;
 if(s.y<=0){
  if((onArrival||onDeparture)&&Math.abs(wrap(s.heading))<.45&&s.speed<88){
   const sink=Math.abs(s.verticalSpeed);s.y=0;s.grounded=true;s.phase=onArrival?'landing':'takeoff';s.pitch=0;s.throttle=0;
   s.landingScore=Math.max(0,Math.round(500-sink*20-Math.abs(s.x-700)*3-Math.max(0,s.speed-65)*8));
   if(onArrival)notify(s,sink<5?'Beautiful touchdown. Hold S to brake; taxi to Gate 04.':'Safely down! Hold S to brake; taxi to Gate 04.',8);
  }else recover(s,'Go-around! Your crew recovered the approach.');
 }
 if(s.phase==='approach'&&(s.z<-10650&&s.y>12||Math.abs(s.x-700)>2600))recover(s,'Missed approach. Let’s try again.');
 if(s.y>1800){s.y=1800;s.pitch=Math.min(0,s.pitch);notify(s,'Cabin ceiling reached. Gently descend toward your route.');}
 if(s.y<4&&!onArrival&&!onDeparture&&s.phase!=='approach'){recover(s,'Terrain ahead. Your crew brought you safely to the approach.');}
 if(Math.abs(s.x)>14000||Math.abs(s.z)>23000)recover(s,'Your crew brought you back to the arrival corridor.');
 return s;
}
export function snapshot(s){return JSON.parse(JSON.stringify(s));}
