/* Real requestAnimationFrame missions. Controls use keyboard only; evaluation observes state. */
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path');
const OUT=path.resolve(__dirname,'../evidence/destinations-realtime');fs.mkdirSync(OUT,{recursive:true});
const BASE=process.env.FLIGHT_URL||'http://127.0.0.1:8202/';
async function tabTo(page,selector){for(let i=0;i<50;i++){if(await page.evaluate(sel=>document.activeElement?.matches(sel),selector))return;await page.keyboard.press('Tab');}throw Error('Keyboard focus did not reach '+selector);}
(async()=>{const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-webgl']});const page=await browser.newPage({viewport:{width:1366,height:768}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>m.type()==='error'&&errors.push(m.text()));const runs=[];
try{await page.goto(BASE);await page.waitForFunction(()=>window.flightTest&&document.activeElement?.id==='start',{timeout:60000});
for(const [id,index,condition]of[['coastal',0,'clear'],['highland',1,'golden'],['islands',2,'breeze']]){
 await tabTo(page,'#destination');await page.keyboard.press('Home');for(let i=0;i<index;i++)await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');
 if(condition!=='clear'){await tabTo(page,'#conditions summary');if(!await page.locator('#conditions').evaluate(e=>e.open))await page.keyboard.press('Enter');await tabTo(page,`[data-condition="${condition}"]`);await page.keyboard.press('Enter');}
 await tabTo(page,'#start');await page.keyboard.press('Enter');await page.keyboard.press('KeyP');const pauseBefore=await page.evaluate(()=>window.flightTest.snapshot());await page.waitForTimeout(500);const pauseAfter=await page.evaluate(()=>window.flightTest.snapshot());if(pauseBefore.time!==pauseAfter.time)throw Error('Paused clock advanced');await page.keyboard.press('Enter');await page.keyboard.press('KeyE');await page.keyboard.press('Space');
 const start=Date.now(),records=[],perf=[];let last='',cockpit=false;
 for(let i=0;i<600;i++){await page.waitForTimeout(1500);const state=await page.evaluate(()=>window.flightTest.snapshot());
  if(i%20===0){const p=await page.evaluate(()=>({calls:window.flightTest.renderer.renderer.info.render.calls,triangles:window.flightTest.renderer.renderer.info.render.triangles,phase:window.flightTest.state.phase}));perf.push(p);console.log(JSON.stringify({route:id,heartbeat:true,wallSeconds:(Date.now()-start)/1000,simSeconds:state.flightTime,phase:state.phase}));}
  if(state.flightId!==id||state.condition!==condition)throw Error('Wrong selected flight or condition');
  if(state.recoveries!==0||!state.autopilot)throw Error('Unexpected recovery/AP override');
  if(state.phase!==last){last=state.phase;records.push({wallSeconds:(Date.now()-start)/1000,state});console.log(JSON.stringify({route:id,condition,phase:last,time:state.flightTime,recoveries:state.recoveries}));await page.screenshot({path:path.join(OUT,`${id}-${last}.png`)});
   if(last==='cruise'){await page.keyboard.press('KeyC');cockpit=true;await page.waitForTimeout(900);await page.screenshot({path:path.join(OUT,`${id}-cockpit-cruise.png`)});await page.keyboard.press('KeyC');cockpit=false;}
   if(last==='approach'&&id==='highland'){await page.keyboard.press('KeyC');cockpit=true;await page.waitForTimeout(900);await page.screenshot({path:path.join(OUT,`${id}-cockpit-approach.png`)});await page.keyboard.press('KeyC');cockpit=false;}
   if(last==='parked'){await page.keyboard.press('KeyE');await page.waitForTimeout(500);const end=await page.evaluate(()=>window.flightTest.snapshot());if(!end.completed||end.phase!=='complete')throw Error('Gate doors did not complete trip');await page.screenshot({path:path.join(OUT,`${id}-complete.png`)});records.push({wallSeconds:(Date.now()-start)/1000,state:end});break;}
  }
 }
 if(records.at(-1)?.state.phase!=='complete')throw Error('Flight timed out '+id);runs.push({id,condition,records,perf,wallSeconds:(Date.now()-start)/1000});fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify({base:BASE,mode:'Normal requestAnimationFrame; keyboard controls; no stepping or state mutation',runs,errors},null,2));
 if(id!=='islands'){await tabTo(page,'#choose-destination');await page.keyboard.press('Enter');}
}
if(errors.length)throw Error(errors.join('\n'));console.log('PASS all three normal-rAF keyboard-operated destination flights');
}finally{fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify({base:BASE,mode:'Normal requestAnimationFrame; keyboard controls; no stepping or state mutation',runs,errors},null,2));await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
