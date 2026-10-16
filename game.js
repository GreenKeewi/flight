import {FlightRenderer} from './renderer.js';
import {FlightAudio} from './audio.js';
import {newFlight,step,toggleDoors,toggleAutopilot,recover,target,distance,bearing,wrap,clamp,ROUTE,RUNWAYS,PHASE_NAMES,snapshot} from './sim.js';
const $=id=>document.getElementById(id);
const ui={};for(const el of document.querySelectorAll('[id]'))ui[el.id]=el;
let state=newFlight(),renderer,audio=new FlightAudio(),active=false,menu=true,last=performance.now(),accumulator=0,lastHUD=0,lastEvent='',resultShown=false,qualityMeasured=false,menuArtReady=false;
const keys=new Set(),config={reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches,lowQuality:false,sound:true};
try{const p=JSON.parse(localStorage.getItem('cloudliner-settings')||'{}');for(const k of ['lowQuality','sound','reducedMotion'])if(typeof p[k]==='boolean')config[k]=p[k];}catch{}
const phaseNumbers={gate:'01 / 08',taxi:'02 / 08',takeoff:'03 / 08',climb:'04 / 08',cruise:'05 / 08',approach:'06 / 08',landing:'07 / 08',arrival:'08 / 08',parked:'08 / 08',complete:'08 / 08'};
function settingsSave(){try{localStorage.setItem('cloudliner-settings',JSON.stringify(config));}catch{}}
function focusCanvas(){ui.world.focus({preventScroll:true});}
function showModal(id,focusId){for(const n of ['pause','restart-dialog','results'])ui[n].hidden=n!==id;if(focusId)ui[focusId].focus({preventScroll:true});}
function start(practice=false){
 state=newFlight();keys.clear();menu=false;active=true;resultShown=false;accumulator=0;lastEvent='';
 ui.menu.hidden=true;ui.hud.hidden=false;ui.results.hidden=true;ui.pause.hidden=true;ui['restart-dialog'].hidden=true;document.body.classList.remove('cockpit');
 if(practice){Object.assign(state,{x:700,y:300,z:-7000,speed:76,verticalSpeed:-6,heading:0,pitch:-.08,throttle:.32,phase:'approach',routeIndex:4,doors:false,grounded:false,autopilot:false,gear:1,flaps:1});state.event='Landing practice. Follow the green glide path. Space lets your crew demonstrate.';state.eventTime=8;}
 renderer.initial=true;audio.setEnabled(config.sound);updateSoundButton();focusCanvas();updateHUD();
}
function pause(force){if(!active||state.completed)return;state.paused=force??!state.paused;keys.clear();if(state.paused)showModal('pause','resume');else {showModal(null);focusCanvas();}updateHUD();}
function mainMenu(){active=false;menu=true;state.paused=false;keys.clear();showModal(null);ui.hud.hidden=true;ui.menu.hidden=false;state=newFlight();document.body.classList.remove('cockpit');audio.update(state,true);ui.start.focus();renderer.initial=true;}
function restartDialog(){if(!active||state.completed)return;state.paused=true;keys.clear();showModal('restart-dialog','cancel-restart');}
function changeCamera(){state.camera=state.camera==='chase'?'cockpit':'chase';renderer.initial=true;document.body.classList.toggle('cockpit',state.camera==='cockpit');ui.cockpit.hidden=state.camera!=='cockpit';updateHUD();}
function updateSoundButton(){ui['sound-button'].textContent='Sound '+(audio.enabled?'on':'off')+' ';const k=document.createElement('kbd');k.textContent='M';ui['sound-button'].append(k);ui['sound-button'].setAttribute('aria-pressed',String(audio.enabled));}
function toggleSound(){config.sound=!config.sound;audio.setEnabled(config.sound);settingsSave();updateSoundButton();}
function goAround(){if(!['approach','landing'].includes(state.phase)||state.grounded){state.event='Go-around is available while airborne on approach. H offers a safe recovery.';state.eventTime=5;return;}recover(state,'Go-around requested. Your crew set up a fresh approach.');}
ui.start.onclick=()=>start();ui.practice.onclick=()=>start(true);ui['camera-button'].onclick=()=>{changeCamera();focusCanvas();};ui['sound-button'].onclick=toggleSound;ui['autopilot-button'].onclick=()=>{toggleAutopilot(state);focusCanvas();};ui['pause-button'].onclick=()=>pause(true);ui.resume.onclick=()=>pause(false);ui.restart.onclick=()=>start();ui['main-menu'].onclick=mainMenu;ui['cancel-restart'].onclick=()=>pause(false);ui['confirm-restart'].onclick=()=>start();ui['fly-again'].onclick=()=>start();
ui['low-quality'].checked=config.lowQuality;ui['reduced-motion'].checked=config.reducedMotion;ui['low-quality'].onchange=()=>{config.lowQuality=ui['low-quality'].checked;renderer.setQuality(config.lowQuality);settingsSave();};ui['reduced-motion'].onchange=()=>{config.reducedMotion=ui['reduced-motion'].checked;settingsSave();};
const gameKeys=new Set(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyW','KeyS','Space','KeyE','KeyC','KeyM','KeyP','Escape','KeyH','KeyG','KeyR']);
addEventListener('keydown',e=>{
 const typing=/^(TEXTAREA|SELECT)$/.test(e.target.tagName)||(e.target.tagName==='INPUT'&&!['checkbox','radio','range'].includes(e.target.type));if(typing)return;
 const modal=document.querySelector('.modal-shade:not([hidden])');
 if(e.code==='Tab'&&modal){const f=[...modal.querySelectorAll('button,a,input,summary')].filter(el=>!el.hidden&&el.offsetParent!==null);if(f.length&&(e.shiftKey&&document.activeElement===f[0]||!e.shiftKey&&document.activeElement===f[f.length-1])){e.preventDefault();(e.shiftKey?f[f.length-1]:f[0]).focus();}return;}
 if(!active||menu)return;
 if(e.code==='Escape'||e.code==='KeyP'){if(e.repeat)return;e.preventDefault();if(!ui['restart-dialog'].hidden){pause(false);return;}pause();return;}
 if(modal)return;
 if((e.target.tagName==='BUTTON'||e.target.tagName==='A'||e.target.tagName==='SUMMARY')&&['Space','Enter'].includes(e.code))return;
 if(!gameKeys.has(e.code))return;e.preventDefault();
 if(e.code.startsWith('Arrow')||['KeyW','KeyS'].includes(e.code)){keys.add(e.code);return;}
 if(e.repeat)return;
 switch(e.code){case'Space':toggleAutopilot(state);break;case'KeyE':toggleDoors(state);break;case'KeyC':changeCamera();break;case'KeyM':toggleSound();break;case'KeyH':recover(state);renderer.initial=true;break;case'KeyG':goAround();renderer.initial=true;break;case'KeyR':restartDialog();break;}
});
addEventListener('keyup',e=>keys.delete(e.code));addEventListener('blur',()=>keys.clear());document.addEventListener('visibilitychange',()=>{keys.clear();if(document.hidden&&active&&!state.paused&&!state.completed)pause(true);});
function input(){return {left:keys.has('ArrowLeft'),right:keys.has('ArrowRight'),up:keys.has('ArrowUp'),down:keys.has('ArrowDown'),throttleUp:keys.has('KeyW'),throttleDown:keys.has('KeyS')};}
const fmtTime=seconds=>`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(Math.floor(seconds)%60).padStart(2,'0')}`;
const meters=m=>m>=1000?`${(m/1000).toFixed(1)} km`:`${Math.round(m)} m`;
function instructions(s){const t=target(s);switch(s.phase){case'gate':return'Boarding complete. Press E to close the doors. Your crew is ready.';case'taxi':return'Follow the blue lights. W moves, S brakes, ← → steer. Space can taxi for you.';case'takeoff':return'Hold W for takeoff thrust. Keep straight. The aircraft lifts gently at 120 kt.';case'climb':return`Climb toward ${Math.round(t.y*3.28084/100)*100} ft. ↑ lifts the nose; ← → turn toward the blue ring.`;case'cruise':return`Next: ${t.label}. Aim for ${Math.round(t.y*3.28084/100)*100} ft. Space lets your crew fly.`;case'approach':return'Line up with the green rings. S reduces thrust; ↓ lowers the nose. Aim for 115–140 kt.';case'landing':return'Welcome to Northport! Hold S to brake. Follow the blue lights once below 20 kt.';case'arrival':return'Taxi to Gate 04. W moves, S brakes, ← → steer. Space can park for you.';case'parked':return'Parking brake set. Press E to open the doors and welcome everyone to Northport.';case'complete':return'Flight complete.';default:return'';}}
function updateHUD(){
 const s=state,t=target(s);ui['phase-number'].textContent=phaseNumbers[s.phase];ui['phase-title'].textContent=PHASE_NAMES[s.phase];ui.instruction.textContent=instructions(s);ui['flight-time'].textContent=fmtTime(s.flightTime);
 ui['next-target'].textContent=t?(s.phase==='taxi'?'TAXI':s.phase==='arrival'?'GATE 04':`ROUTE ${s.routeIndex+1} / 5`):s.phase==='gate'?'GATE 01':s.phase==='takeoff'?'RUNWAY 36':s.phase==='landing'?'RUNWAY 36':'GATE 04';
 ui['autopilot-button'].setAttribute('aria-pressed',String(s.autopilot));ui['ap-status'].textContent=s.autopilot?'ON':'OFF';ui['autopilot-button'].style.background=s.autopilot?'#8adfc92b':'';
 const kt=Math.round(s.speed*1.94384),feet=Math.max(0,Math.round(s.y*3.28084/10)*10),heading=(Math.round(s.heading*180/Math.PI)+360)%360;
 ui.speed.innerHTML=`${kt}<em>kt</em>`;ui.altitude.innerHTML=`${feet.toLocaleString()}<em>ft</em>`;ui.heading.innerHTML=`${String(heading).padStart(3,'0')}<em>°</em>`;ui.throttle.innerHTML=`${Math.round(s.throttle*100)}<em>%</em>`;ui['thrust-fill'].style.width=`${s.throttle*100}%`;
 ui['speed-note'].textContent=s.stall?'LOW AIRSPEED':s.grounded?(s.speed<.5?'PARKED':'GROUND SPEED'):'INDICATED';ui['speed-note'].style.color=s.stall?'#ffd7a4':'';ui.vs.textContent=s.grounded?'ON GROUND':Math.abs(s.verticalSpeed)<.3?'LEVEL':`${s.verticalSpeed>0?'↑':'↓'} ${Math.abs(Math.round(s.verticalSpeed*196.85/50)*50)} FT/MIN`;ui['heading-note'].textContent=['NORTH','NORTHEAST','EAST','SOUTHEAST','SOUTH','SOUTHWEST','WEST','NORTHWEST'][Math.round(heading/45)%8];
 ui['camera-button'].innerHTML=`${s.camera==='chase'?'Chase':'Cockpit'} <kbd>C</kbd>`;ui['gear-status'].textContent=`GEAR ${s.gear>.5?'DOWN':'UP'} · ${s.flaps>.5?'FLAPS LANDING':'FLAPS UP'}`;ui.cockpit.hidden=s.camera!=='cockpit';document.body.classList.toggle('cockpit',s.camera==='cockpit');ui['cockpit-speed'].textContent=kt;ui['cockpit-altitude'].textContent=feet.toLocaleString();ui['attitude-horizon'].style.transform=`translateY(${s.pitch*180}px) rotate(${s.bank*180/Math.PI}deg)`;
 let progress=s.phase==='gate'?0:s.phase==='taxi'?.035+s.taxiIndex*.02:s.phase==='takeoff'?.12:s.phase==='climb'||s.phase==='cruise'?.17+clamp((-s.z-300)/8100,0,1)*.58:s.phase==='approach'?.77:s.phase==='landing'?.88:s.phase==='arrival'?.91+s.arrivalIndex*.02:1;
 ui['journey-fill'].style.width=`${progress*100}%`;ui['journey-plane'].style.left=`${progress*100}%`;
 if(lastEvent!==s.event&&s.eventTime>0){lastEvent=s.event;ui.toast.textContent=s.event;}ui.toast.classList.toggle('show',s.eventTime>0);
 if(s.completed&&!resultShown){resultShown=true;keys.clear();ui['result-time'].textContent=fmtTime(s.flightTime);ui['result-landing'].textContent=s.landingScore>380?'Smooth':s.landingScore>220?'Safe':'Firm';ui['result-score'].textContent=s.score.toLocaleString();showModal('results','fly-again');}
 drawMap(s);
}
function updateTarget(){const t=target(state),projected=t?renderer.projectTarget(t):null;ui['target-marker'].hidden=!t;ui['offscreen-direction'].hidden=true;if(!t||!projected)return;const inside=projected.front&&Math.abs(projected.x)<.80&&Math.abs(projected.y)<.70;if(inside){ui['target-marker'].style.left=`${(projected.x*.5+.5)*100}%`;ui['target-marker'].style.top=`${(-projected.y*.5+.5)*100}%`;ui['target-name'].textContent=t.label;ui['target-distance'].textContent=meters(distance(state,t));}else {ui['target-marker'].hidden=true;ui['offscreen-direction'].hidden=false;const turn=wrap(bearing(state,t)-state.heading);ui['offscreen-direction'].firstElementChild.style.transform=turn>0?'':'scaleX(-1)';ui['offscreen-direction'].lastElementChild.textContent=meters(distance(state,t));}}
const map=ui.map.getContext('2d');
function drawMap(s){
 const c=map,w=220,h=230;c.clearRect(0,0,w,h);c.fillStyle='#17404d';c.fillRect(0,0,w,h);const xy=(x,z)=>[30+(x+2000)/5000*170,19+(-z+600)/12500*190];
 c.fillStyle='#365c59';for(let [x,z,rx,rz]of[[400,0,2200,2100],[1100,-10500,2400,2600],[-3500,-4300,2100,3100],[4000,-4600,2200,1800]]){const[a,b]=xy(x,z);c.beginPath();c.ellipse(a,b,rx/5000*170,rz/12500*190,0,0,Math.PI*2);c.fill();}
 c.strokeStyle='#90b9b744';c.lineWidth=.5;for(let j=0;j<5;j++){c.beginPath();c.moveTo(j*55,0);c.lineTo(j*55,h);c.stroke();}for(let j=0;j<5;j++){c.beginPath();c.moveTo(0,j*50);c.lineTo(w,j*50);c.stroke();}
 c.strokeStyle='#9fdfc3';c.lineWidth=1;c.setLineDash([3,4]);c.beginPath();const route=[{x:0,z:0},...ROUTE,{x:700,z:-9500}];route.forEach((p,i)=>{const [a,b]=xy(p.x,p.z);i?c.lineTo(a,b):c.moveTo(a,b);});c.stroke();c.setLineDash([]);for(let i=0;i<ROUTE.length;i++){const[a,b]=xy(ROUTE[i].x,ROUTE[i].z);c.beginPath();c.arc(a,b,2.2,0,Math.PI*2);c.fillStyle=i<s.routeIndex?'#80bdb0':'#d3f2cd';c.fill();}
 for(let i=0;i<RUNWAYS.length;i++){const r=RUNWAYS[i],[a,b]=xy(r.x,r.z);c.fillStyle='#c4ded0';c.fillRect(a-1.5,b-14,3,28);c.font='bold 8px Arial';c.fillStyle='#badbd2';c.fillText(i?'NPT':'SBY',a+8,b+2);}
 const[a,b]=xy(s.x,s.z);c.save();c.translate(a,b);c.rotate(s.heading);c.fillStyle='#a6ffe2';c.beginPath();c.moveTo(0,-7);c.lineTo(5,5);c.lineTo(0,2);c.lineTo(-5,5);c.closePath();c.fill();c.restore();c.font='bold 7px Arial';c.fillStyle='#94c8bc';c.fillText('N ↑',193,17);
}
function frame(now){requestAnimationFrame(frame);if(!renderer)return;const realDt=Math.min((now-last)/1000,.5);last=now;accumulator+=realDt;
 if(active&&!state.paused&&!state.completed){let steps=0;while(accumulator>=1/60&&steps<30){step(state,input(),1/60);accumulator-=1/60;steps++;}}else accumulator=0;
 if((!menu||!menuArtReady)&&!state.paused)renderer.render(state,realDt,{menu,reducedMotion:config.reducedMotion});if(active){updateTarget();if(now-lastHUD>90){updateHUD();lastHUD=now;}}audio.update(state,!active||state.paused);
}
try{renderer=new FlightRenderer(ui.world);renderer.setQuality(config.lowQuality);ui.loading.hidden=true;ui.menu.hidden=false;ui.start.focus();const art=new Image();art.onload=()=>{menuArtReady=true;document.querySelector('.menu-art').classList.add('has-art');document.querySelector('.art-caption').hidden=false;};art.src='assets/airliner-menu-art.webp';requestAnimationFrame(frame);}catch(e){ui.loading.hidden=true;ui.error.hidden=false;ui['error-text'].textContent='This game needs WebGL 2. Try reloading with hardware acceleration enabled. '+e.message;console.error(e);}
// Stable QA surface. Mutation is explicit; normal gameplay uses the exact same sim step.
window.flightTest={get state(){return state;},start,reset:()=>start(),step:(seconds=1,controls={})=>{for(let i=0;i<Math.round(seconds*60);i++)step(state,controls,1/60);updateHUD();renderer.render(state,1/60,{menu:false,reducedMotion:true});return snapshot(state);},set:(patch)=>{Object.assign(state,patch);renderer.initial=true;updateHUD();return snapshot(state);},snapshot:()=>snapshot(state),toggleAutopilot:()=>toggleAutopilot(state),toggleDoors:()=>toggleDoors(state),get renderer(){return renderer;},get active(){return active;}};
