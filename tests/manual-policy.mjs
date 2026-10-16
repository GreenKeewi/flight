import {newFlight,step,toggleDoors,recover,target,bearing,wrap,distance} from '../sim.js';
// Independent digital-key pilot, exercising the same arrows/W/S available to players.
const s=newFlight();toggleDoors(s);recover(s);let last=s.phase;const history=[];
for(let i=0;i<60*400;i++){
 const control={};
 if(s.phase==='takeoff')control.throttleUp=true;
 if(['climb','cruise','approach'].includes(s.phase)){
  const t=s.phase==='approach'?{x:700,z:s.z-600}:target(s);const err=wrap(bearing(s,t)-s.heading);const turnGoal=err*.8;
  const bankGoal=Math.max(-.5,Math.min(.5,turnGoal*2));
  if(s.bank<bankGoal-.08)control.right=true;else if(s.bank>bankGoal+.08)control.left=true;
  const goalHeight=s.phase==='approach'?Math.max(-2,(s.z+9330)*.115):target(s).y;
  const desiredVS=Math.max(-12,Math.min(12,(goalHeight-s.y)*.2-(s.phase==='approach'?7:0)));
  if(s.verticalSpeed<desiredVS-1.8)control.up=true;else if(s.verticalSpeed>desiredVS+1.8)control.down=true;
  const goalThrust=s.phase==='approach'?.16:.65;
  if(s.throttle<goalThrust-.015)control.throttleUp=true;else if(s.throttle>goalThrust+.015)control.throttleDown=true;
 }
 if(s.phase==='landing')control.throttleDown=true;
 step(s,control,1/60);
 if(s.phase!==last){history.push({time:i/60,phase:s.phase,x:s.x,y:s.y,z:s.z,speed:s.speed});last=s.phase;}
 if(s.phase==='arrival'||s.recoveries>1)break;
}
console.log(JSON.stringify({history,state:s},null,2));
