import {approachInfo,arrivalAirport,departureAirport} from './routes.js?v=world2-1016';
import {airportCoordinates} from './world.js?v=world2-1016';
import {target,bearing,wrap,distance,clamp} from './sim.js?v=world2-1016';
const feet=m=>Math.max(0,Math.round(m*3.28084/50)*50).toLocaleString();
const knots=speed=>Math.round(speed*1.94384);
const range=d=>d>=1000?`${(d/1000).toFixed(1)} km`:`${Math.round(d)} m`;
/** Contextual coaching only: these instructions never steer the aircraft. */
function manualGuidance(s){
 const t=target(s),turn=t?wrap(bearing(s,t)-s.heading)*180/Math.PI:0,d=t?distance(s,t):0,side=turn<0?'left':'right',key=turn<0?'←':'→',speed=knots(s.speed);
 const out={action:'',detail:'',tone:'normal',path:'',line:'',speed:'',targetAltitude:null,targetSpeed:null};
 if(s.phase==='gate')return {...out,action:'E · Close the doors',detail:'Boarding is complete. Close up, then follow the blue taxi lights.'};
 if(s.phase==='parked')return {...out,action:'E · Open the doors',detail:`Parking brake set. Welcome your passengers to ${arrivalAirport(s).name}.`};
 if(s.phase==='complete')return {...out,action:'A good day to fly.',detail:'Your landing debrief is ready.'};
 if(s.phase==='taxi'||s.phase==='arrival'){
  if(Math.abs(turn)>20&&s.speed>10)return {...out,action:'Slow a little before the turn',detail:`S reduces power and brakes. Then ${key} to steer ${side} · ${range(d)}.`,tone:'caution'};
  if(Math.abs(turn)>8)return {...out,action:`${key} · Turn gently ${side}`,detail:`${Math.round(Math.abs(turn))}° to the next blue marker · ${range(d)}. W/S set thrust; power stays set.`};
  return {...out,action:`Follow the centreline · ${range(d)}`,detail:'W adds thrust. S reduces it and brakes. Releasing W keeps the current power.'};
 }
 if(s.phase==='takeoff'){
  if(Math.abs(airportCoordinates(departureAirport(),s).lateral)>12)return {...out,action:`${airportCoordinates(departureAirport(),s).lateral>0?'←':'→'} · Ease toward the centreline`,detail:'Keep the nose straight along the runway. Hold W for takeoff thrust.',tone:'caution'};
  return {...out,action:s.speed<50?'W · Set takeoff thrust':'Almost flying. Keep straight.',detail:'Hold W. The nose lifts gently at 120 kt. You can use ↑ to climb once airborne.'};
 }
 if(s.phase==='landing')return {...out,action:s.speed>11?'S · Brake gently':'Follow the blue taxi lights',detail:'Hold S to slow below 20 kt, then taxi to Gate 04. ← → steer; Space can park for you.'};
 if(s.phase==='approach'){
  const info=approachInfo(s),expected=info.expectedHeight,error=s.y-info.expectedAltitude,lateral=-info.local.lateral,look=800/Math.max(45,s.speed),corrected={x:info.course.x-(s.windX||0)*look,z:info.course.z-(s.windZ||0)*look},headingError=wrap(bearing(s,corrected)-s.heading)*180/Math.PI;
  out.targetAltitude=expected;out.targetSpeed=64;out.path=Math.abs(error)<18?'ON PATH':error>0?'HIGH':'LOW';out.line=Math.abs(lateral)<16?'CENTRED':`${Math.round(Math.abs(lateral))} m ${lateral>0?'LEFT':'RIGHT'}`;out.speed=speed<108?'ADD POWER':speed>148?'SLOW DOWN':'SPEED GOOD';
  if(speed>150)return {...out,action:'S · Reduce thrust gently',detail:`Aim for 115–140 kt. Hold S briefly; the new power stays set. ${feet(expected)} ft above the runway is the glide path here.`,tone:'caution'};
  if(speed<105)return {...out,action:'W · Add a little thrust',detail:'Keep the wings nearly level. Aim for 115–140 kt before settling onto the runway.',tone:'caution'};
  if(Math.abs(headingError)>7||Math.abs(lateral)>55)return {...out,action:`${headingError<0?'←':'→'} · Line up ${headingError<0?'left':'right'}`,detail:`Runway 36 is ${Math.round(Math.abs(lateral))} m ${lateral>0?'right':'left'} of your position. Make small turns, then release to level.`};
  if(s.y-info.airport.elevation<14)return {...out,action:'Steady. Let the aircraft settle.',detail:'Release ↓ for a gentle flare. Keep straight; hold S once the wheels touch.',tone:'good'};
  if(error>18)return {...out,action:'↓ · Ease the nose down',detail:`You are high. Follow the green rings toward ${feet(expected)} ft above the runway here. Tap ↓, then let the nose settle.`,tone:'caution'};
  if(error< -18)return {...out,action:'↑ · Raise the nose a little',detail:`You are low. Aim for ${feet(expected)} ft above the runway here. G asks your crew to fly a go-around.`,tone:'caution'};
  return {...out,action:'On the glide path. Small inputs.',detail:'Keep the green rings lined up. ↓ descends, ↑ climbs. G flies a go-around if you need one.',tone:'good'};
 }
 if(s.phase==='goaround')return {...out,action:s.autopilot?'Your crew is flying the circuit.':`${key} · Rejoin the circuit ${side}`,detail:s.autopilot?`${t.label} · ${range(d)}. Any flight input returns control. H is the quick safety recovery.`:`Follow the blue target at ${feet(t.y)} ft. Space hands the aircraft back to your crew.`,targetAltitude:t.y,targetSpeed:105};
 if(['climb','cruise'].includes(s.phase)){
  out.targetAltitude=t.y;out.targetSpeed=s.phase==='climb'?93:118;
  if(s.clearance<65&&s.y>20)return {...out,action:'↑ · Terrain ahead. Climb gently.',detail:'Keep clear of the ridge. H asks your crew for an immediate safe recovery.',tone:'caution'};
  if(Math.abs(turn)>12)return {...out,action:`${key} · Bank ${side} toward the ring`,detail:`${t.label} · ${range(d)} · aim for ${feet(t.y)} ft. Release the arrow to level the wings.`};
  if(s.y<t.y-35)return {...out,action:`↑ · Climb toward ${feet(t.y)} ft`,detail:'Lift the nose gently, then release to hold height. W/S adjust thrust.'};
  if(s.y>t.y+35)return {...out,action:`↓ · Descend toward ${feet(t.y)} ft`,detail:'Tap ↓ to lower the nose, then release to hold height. Follow the blue ring.'};
  return {...out,action:`Nicely on course · ${range(d)}`,detail:`${t.label} ahead. Keep the blue ring ahead and enjoy the coast.`,tone:'good'};
 }
 return out;
}

export function guidance(s){const coach=manualGuidance(s);if(!s.autopilot||['gate','parked','complete'].includes(s.phase))return coach;const point=target(s),remaining=point?range(distance(s,point)):'';const actions={taxi:'Your crew is taxiing to the runway.',takeoff:'Your crew is taking off.',climb:'Your crew is climbing.',cruise:'Your crew is following the route.',approach:'Your crew is flying the approach.',goaround:'Your crew is flying the circuit.',landing:'Your crew is slowing the aircraft.',arrival:'Your crew is taxiing to the gate.'};return {...coach,action:actions[s.phase]||coach.action,detail:`${point?point.label+' · '+remaining+'. ':''}Any flight input returns manual control.`,tone:'normal'};}
