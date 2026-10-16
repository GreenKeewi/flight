import {condition,windAt,terrainHeight,surfaceHeight,AIRPORTS,airportPoint,airportCoordinates} from './world.js?v=world2-1016';
import {flightPlan,routeFor,departureAirport,arrivalAirport,departureTaxi,arrivalTaxi,approachInfo,runwayContains} from './routes.js?v=world2-1016';
/** Cloudliner — deterministic, forgiving flight model. World metres, seconds, radians. */
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const lerp=(a,b,t)=>a+(b-a)*t;
export const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
export const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export const bearing=(a,b)=>Math.atan2(b.x-a.x,-(b.z-a.z));
export const ROUTE=flightPlan('coastal').waypoints;
export const TAXI=departureTaxi();
export const ARRIVAL=arrivalTaxi({flightId:'coastal'});
export const RUNWAYS=AIRPORTS;
export const PHASE_NAMES={gate:'Boarding',taxi:'Taxi to runway',takeoff:'Takeoff',climb:'Climb out',cruise:'Island crossing',approach:'Approach',goaround:'Go around',landing:'Runway rollout',arrival:'Taxi to gate',parked:'Open the doors',complete:'Flight complete'};
export function newFlight(options={}){const selected=condition(options.condition),plan=flightPlan(options.flightId),dep=departureAirport();return {x:dep.gate.x,y:dep.elevation,z:dep.gate.z,heading:dep.heading,flightId:plan.id,pitch:0,bank:0,speed:0,verticalSpeed:0,throttle:0,phase:'gate',routeIndex:0,taxiIndex:0,arrivalIndex:0,autopilot:false,doors:true,time:0,flightTime:0,distance:0,paused:false,gear:1,flaps:1,landingScore:null,recoveries:0,overspeedTime:0,offRouteTime:0,completed:false,event:'Welcome aboard. Close the doors with E.',eventTime:6,grounded:true,engine:0,score:0,camera:'chase',weather:selected.id,condition:selected.id,windX:0,windZ:0,clearance:0,manualAirTime:0,assistedAirTime:0,landingData:null,goAroundCount:0,goAroundIndex:0,goAroundRoute:[],dwell:0,helpUsed:false,stall:false,goAround:false};}
export function notify(s,text,duration=5){s.event=text;s.eventTime=duration;}
export function toggleDoors(s){
 if(s.speed>.7||!['gate','parked','complete'].includes(s.phase)){notify(s,'Doors stay locked until parked safely at the gate.');return false;}
 s.doors=!s.doors;
 if(s.phase==='gate'&&!s.doors){s.phase='taxi';notify(s,'Doors closed. Follow the blue taxi lights. Space: autopilot.');}
 if(s.phase==='parked'&&s.doors){s.phase='complete';s.completed=true;s.score=Math.max(100,1000+(s.landingScore||0)-s.recoveries*150);notify(s,`Flight complete. Welcome to ${arrivalAirport(s).name}!`,20);}
 return true;
}
export function toggleAutopilot(s){if(s.completed)return;s.autopilot=!s.autopilot;notify(s,s.autopilot?'Autopilot on. Your crew is flying; any flight input returns control.':'You have control. Follow the next blue ring.');}
export function target(s){if(s.phase==='goaround')return s.goAroundRoute[s.goAroundIndex];if(s.phase==='taxi')return {...TAXI[s.taxiIndex],y:0,label:'Taxi point'};if(s.phase==='arrival')return {...arrivalTaxi(s)[s.arrivalIndex],label:'Gate 04'};if(['climb','cruise'].includes(s.phase))return routeFor(s)[s.routeIndex];if(s.phase==='approach')return {...approachInfo(s).touchdown,label:'Runway 36'};return null;}
export function recover(s,reason='Your crew has set up a safe approach.'){
 s.recoveries++;s.helpUsed=true;const dep=departureAirport(),info=approachInfo(s),safe=info.practice;
 if(['gate','taxi','takeoff'].includes(s.phase)&&s.grounded){Object.assign(s,{x:TAXI[3].x,y:dep.elevation,z:TAXI[3].z,heading:dep.heading,pitch:0,bank:0,speed:0,throttle:0,phase:'takeoff',grounded:true,doors:false,autopilot:false,taxiIndex:3});notify(s,'Lined up on runway 36. Hold W to take off.',7);return;}
 Object.assign(s,{x:safe.x,y:safe.y,z:safe.z,heading:info.airport.heading,pitch:-.07,bank:0,speed:76,verticalSpeed:-5,throttle:.29,phase:'approach',routeIndex:routeFor(s).length-1,grounded:false,autopilot:true,doors:false,goAround:false});notify(s,reason+' Autopilot is guiding you in.',8);
}
/** A deliberate go-around flies a real circuit. H remains the immediate safety recovery. */
export function requestGoAround(s){
 if(s.grounded||!['approach','goaround'].includes(s.phase)){notify(s,'G starts a go-around while airborne on approach. H is your quick safety recovery.');return false;}
 if(s.phase==='goaround'){notify(s,'Your crew is already flying the circuit. Any flight input returns manual control.');return false;}
 const info=approachInfo(s),a=info.airport,safeHeight=Math.max(380,Math.min(850,s.y-a.elevation+160)),end=a.length/2;
 s.goAroundRoute=[{...airportPoint(a,end+800,0,safeHeight),label:'Climb away',radius:320},{...airportPoint(a,end+1500,1800,Math.max(520,safeHeight)),label:'Coastal turn',radius:380},{...airportPoint(a,info.touchdownAlong-2430,2300,520),label:'Downwind leg',radius:380},{...airportPoint(a,info.touchdownAlong-2430,0,300),label:'Rejoin final',radius:270}];
 s.phase='goaround';s.goAround=true;s.goAroundIndex=0;s.goAroundCount++;s.autopilot=true;s.pitch=Math.max(.06,s.pitch);s.throttle=Math.max(.7,s.throttle);s.doors=false;
 notify(s,'Going around. Your crew climbs, circles the coast, and rejoins final. Flight controls give you control.',10);return true;
}
export function landingGrade(score){return score>=450?'Featherlight':score>=380?'Smooth':score>=240?'Safe':'Firm';}
function groundSteer(s,dt,desired,speed){const error=wrap(desired-s.heading);s.heading=wrap(s.heading+clamp(error*2,-.65,.65)*dt*clamp(s.speed/3,0,1));s.speed=lerp(s.speed,speed,Math.min(1,dt*.9));s.bank=lerp(s.bank,0,dt*4);s.pitch=lerp(s.pitch,0,dt*4);}
function move(s,dt){const travel=s.speed*dt;s.x+=Math.sin(s.heading)*travel+(s.grounded?0:s.windX||0)*dt;s.z-=Math.cos(s.heading)*travel;s.z+=(s.grounded?0:s.windZ||0)*dt;s.distance+=travel;}
export function step(s,input={},delta=1/60){
 if(s.paused||s.completed)return s;
 const dt=clamp(delta,0,.1);if(!dt)return s;
 const dep=departureAirport(),arrival=arrivalAirport(s),route=routeFor(s);
 s.time+=dt;const wind=windAt(s.condition,s.time,s.y);s.windX=wind.x;s.windZ=wind.z;s.clearance=s.y-surfaceHeight(s.x,s.z);s.eventTime=Math.max(0,s.eventTime-dt);
 const manual=!!(input.left||input.right||input.up||input.down||input.throttleUp||input.throttleDown);
 if(manual&&s.autopilot){s.autopilot=false;notify(s,'You have control. Space returns the flight to your crew.',3);}
 if(s.phase==='gate'){s.engine=lerp(s.engine,.12,dt);return s;}
 s.flightTime+=dt;
 if(s.phase==='parked'){s.speed=0;s.throttle=0;s.engine=lerp(s.engine,0,dt*.5);return s;}
 const isGround=['taxi','takeoff','landing','arrival'].includes(s.phase)&&s.grounded;
 if(isGround){
  s.y=['landing','arrival'].includes(s.phase)?arrival.elevation:dep.elevation;s.verticalSpeed=0;
  if(s.phase==='taxi'||s.phase==='arrival'){
   const list=s.phase==='taxi'?TAXI:arrivalTaxi(s);
   const idx=s.phase==='taxi'?s.taxiIndex:s.arrivalIndex;
   const t=list[idx];const d=distance(s,t);
   if(s.autopilot){const error=Math.abs(wrap(bearing(s,t)-s.heading));const desiredSpeed=Math.min(s.phase==='taxi'?10:9,Math.max(2,d*.4))*(error>1.2?.35:1);groundSteer(s,dt,bearing(s,t),desiredSpeed);s.throttle=.14;}
   else {s.throttle=clamp(s.throttle+((input.throttleUp||input.up)?.35:0)*dt-((input.throttleDown||input.down)?.75:0)*dt,0,.32);const brake=input.down||input.throttleDown;s.speed=clamp(s.speed+(s.throttle*10-.2-s.speed*.03-(brake?5:0))*dt,0,s.phase==='taxi'?14:12);s.heading=wrap(s.heading+((input.right?1:0)-(input.left?1:0))*dt*.7*clamp(s.speed/3,0,1));}
   move(s,dt);
   if(d<18){
    if(idx<list.length-1){if(s.phase==='taxi')s.taxiIndex++;else s.arrivalIndex++;}
    else if(s.phase==='taxi'){s.phase='takeoff';s.throttle=s.autopilot?1:0;s.speed=Math.min(s.speed,8);if(Math.abs(wrap(s.heading-dep.heading))<.45||s.autopilot)s.heading=dep.heading;notify(s,s.autopilot?'Cleared for takeoff. Your crew is adding thrust.':'Cleared for takeoff. Hold W; the nose lifts gently at flying speed.',7);}
    else {s.phase='parked';s.speed=0;s.throttle=0;s.heading=wrap(arrival.heading+Math.PI);notify(s,'Parking brake set. Press E to open the doors and finish.',15);}
   }
   if(s.phase==='taxi'&&Math.min(...TAXI.map(t=>distance(s,t)))>600)notify(s,'Need a hand? H lines you up on the departure runway.',2);
  }else if(s.phase==='takeoff'){
   if(s.autopilot){s.throttle=1;s.heading=wrap(s.heading+wrap(dep.heading-s.heading)*dt*2);}else {s.throttle=clamp(s.throttle+((input.throttleUp||input.up)?.55:0)*dt-((input.throttleDown||input.down)?.8:0)*dt,0,1);s.heading=wrap(s.heading+((input.right?1:0)-(input.left?1:0))*dt*.35*clamp(s.speed/8,0,1));}
   s.speed=clamp(s.speed+(s.throttle*6.1-.1-s.speed*.007-(input.down?7:0))*dt,0,100);move(s,dt);s.pitch=lerp(s.pitch,s.speed>52?.065:0,dt*2);
   if(s.speed>61&&Math.abs(airportCoordinates(dep,s).lateral)<60){s.grounded=false;s.phase='climb';s.y=dep.elevation+1;s.pitch=.13;notify(s,s.autopilot?'Positive climb! Gear retracting; your crew is following the route.':'Positive climb! Gear retracting. Follow the blue route rings.',6);}
   if(airportCoordinates(dep,s).along>dep.length/2+30||Math.abs(airportCoordinates(dep,s).lateral)>90){recover(s,'Takeoff reset.');}
  }else if(s.phase==='landing'){
   s.throttle=0;s.speed=Math.max(0,s.speed-dt*(s.autopilot?2.5:1.1+(input.down||input.throttleDown?4:0)));s.heading=wrap(s.heading+clamp(wrap(arrival.heading-s.heading),-.25,.25)*dt*2+((input.right?1:0)-(input.left?1:0))*.18*dt);move(s,dt);s.pitch=lerp(s.pitch,0,dt*2);
   if(s.speed<11){s.phase='arrival';s.arrivalIndex=airportCoordinates(arrival,s).along>580?1:0;s.speed=Math.min(s.speed,8);notify(s,s.autopilot?'Runway clear ahead. Your crew is taxiing to Gate 04.':'Runway clear ahead. Follow the blue taxi lights to Gate 04.',8);}
   if(airportCoordinates(arrival,s).along>arrival.length/2){s.speed=0;s.phase='arrival';s.arrivalIndex=1;notify(s,'Automatic end-of-runway braking. Taxi to Gate 04.');}
  }
  s.engine=lerp(s.engine,s.throttle,dt*1.5);s.gear=1;s.flaps=1;s.bank=lerp(s.bank,0,dt*3);return s;
 }
 // Airborne: thrust and attitude have inertia; bank-to-turn and automatic trim ease the workload.
 if(s.autopilot)s.assistedAirTime+=dt;else s.manualAirTime+=dt;let desiredPitch=0,desiredBank=0;
 if(s.autopilot){
  const t=target(s);let desiredSpeed=110;
  if(s.phase==='approach'){
   const info=approachInfo(s),remaining=Math.max(0,info.remaining),glide=arrival.elevation+remaining*.115;
   desiredPitch=clamp((glide-s.y)*.008-.10,-.18,.13);
   if(remaining<190)desiredPitch=clamp((arrival.elevation-1-s.y)*.025,-.065,-.015);
   if(s.y-arrival.elevation<14&&remaining<700)desiredPitch=-.02;
   desiredSpeed=remaining>1400?82:remaining>650?69:59;
  }else {desiredPitch=clamp((t.y-s.y)*.003,-.17,.18);desiredSpeed=s.phase==='climb'?93:s.phase==='goaround'?105:118;}
  const courseTarget=s.phase==='approach'?approachInfo(s).course:t;const leadTime=distance(s,courseTarget)/Math.max(45,s.speed);const windCorrected={x:courseTarget.x-s.windX*leadTime,z:courseTarget.z-s.windZ*leadTime};const error=wrap(bearing(s,windCorrected)-s.heading);desiredBank=clamp(error*1.4,-.44,.44);
  s.throttle=clamp((desiredSpeed-43)/104,0,1);
 }else {
  s.throttle=clamp(s.throttle+((input.throttleUp)?.25:0)*dt-((input.throttleDown)?.3:0)*dt,.03,1);
  desiredBank=((input.right?1:0)-(input.left?1:0))*.52;
  desiredPitch=((input.up?1:0)-(input.down?1:0))*.21;
  // Gentle climb-out trim, then hold height when the arrow keys are released.
  if(s.phase==='climb'&&!input.down&&!input.up)desiredPitch=s.y<220?.13:0;
  if(s.phase==='approach'&&s.y-arrival.elevation<14&&!input.up&&!input.down&&s.throttle<.3&&s.speed<80)desiredPitch=-.025;
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
  const t=route[s.routeIndex];const d=distance(s,t);
  if(d<t.radius&&Math.abs(s.y-t.y)<330){s.routeIndex++;if(s.routeIndex>=route.length){s.phase='approach';s.routeIndex=route.length-1;notify(s,s.autopilot?'Cleared to land runway 36. Your crew is slowing for the glide path.':'Cleared to land runway 36. Slow down; follow the green glide path.',8);}else {s.phase=s.routeIndex<1?'climb':'cruise';notify(s,`Route ${s.routeIndex} of ${route.length} checked. Next: ${route[s.routeIndex].label}.`,4);}}
 }
 if(s.phase==='goaround'){const t=target(s);if(distance(s,t)<t.radius&&Math.abs(s.y-t.y)<260){s.goAroundIndex++;if(s.goAroundIndex>=s.goAroundRoute.length){s.phase='approach';s.goAround=false;s.routeIndex=route.length-1;notify(s,'Back on final. Your crew is guiding the landing. Any flight input gives you control.',8);}else notify(s,`Go-around: ${target(s).label.toLowerCase()}.`,4);}}
 const onArrival=runwayContains(arrival,s),onDeparture=runwayContains(dep,s),landingAirport=onArrival?arrival:dep;
 if(s.y<=(onArrival?arrival.elevation:onDeparture?dep.elevation:0)){
  if((onArrival||onDeparture)&&Math.abs(wrap(s.heading-landingAirport.heading))<.45&&s.speed<88){
   const sink=Math.abs(s.verticalSpeed);if(onArrival)s.landingData={sinkRate:sink,offset:Math.abs(airportCoordinates(arrival,s).lateral),speed:s.speed,headingError:Math.abs(wrap(s.heading-arrival.heading)),autopilot:s.autopilot,condition:s.condition,flightId:s.flightId,airport:arrival.id,time:s.flightTime};s.y=landingAirport.elevation;s.grounded=true;s.phase=onArrival?'landing':'takeoff';s.pitch=0;s.throttle=0;
   s.landingScore=Math.max(0,Math.round(500-sink*20-Math.abs(airportCoordinates(arrival,s).lateral)*3-Math.max(0,s.speed-65)*8));
   if(onArrival)notify(s,s.autopilot?'Beautiful touchdown. Your crew is braking and taxiing to Gate 04.':sink<5?'Beautiful touchdown. Hold S to brake; taxi to Gate 04.':'Safely down! Hold S to brake; taxi to Gate 04.',8);
  }else recover(s,'Go-around! Your crew recovered the approach.');
 }
 if(s.phase==='approach'&&(airportCoordinates(arrival,s).along>arrival.length/2-250&&s.y>arrival.elevation+12||Math.abs(airportCoordinates(arrival,s).lateral)>2600))recover(s,'Missed approach. Let’s try again.');
 if(s.y>1800){s.y=1800;s.pitch=Math.min(0,s.pitch);notify(s,'Cabin ceiling reached. Gently descend toward your route.');}
 const terrain=terrainHeight(s.x,s.z);s.clearance=s.y-Math.max(-5,terrain);if(!s.grounded&&!onArrival&&!onDeparture&&s.y<Math.max(0,terrain)+3&&(s.phase!=='approach'||terrain>1)){recover(s,'Terrain ahead. Your crew brought you safely to the approach.');}else if(['climb','cruise','goaround'].includes(s.phase)&&terrain>20&&s.clearance<60&&s.eventTime<1){notify(s,'Terrain ahead. ↑ climb, or H for a safe recovery.',3);}
 if(Math.abs(s.x)>14000||s.z< -26000||s.z>4000)recover(s,'Your crew brought you back to the arrival corridor.');
 return s;
}
export function snapshot(s){return JSON.parse(JSON.stringify(s));}
