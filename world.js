/** Shared, deterministic coastal world. Coordinates and heights are metres. */
export const ISLANDS = [
 {name:'South Bay',x:650,z:50,rx:2050,rz:2300,height:108,seed:52},
 {name:'Northport',x:1450,z:-10250,rx:2600,rz:2700,height:138,seed:79},
 {name:'West ridge',x:-3300,z:-4400,rx:2050,rz:3100,height:590,seed:21},
 {name:'East headland',x:4300,z:-4300,rx:2100,rz:2000,height:410,seed:39},
 {name:'Northern peaks',x:-3900,z:-11200,rx:1900,rz:2600,height:830,seed:11},
 {name:'South headland',x:3600,z:3700,rx:2200,rz:2200,height:430,seed:43},
 {name:'Heron key',x:1600,z:-4300,rx:520,rz:900,height:62,seed:8},
 {name:'Lighthouse key',x:-550,z:-2450,rx:300,rz:520,height:34,seed:6},
 {name:'Outer key',x:3300,z:-7600,rx:600,rz:340,height:88,seed:24},
 {name:'Ridgefield',x:-6900,z:-18100,rx:2500,rz:3200,height:180,seed:42},
 {name:'Highland wall',x:-10100,z:-18000,rx:2450,rz:3500,height:1250,seed:61},
 {name:'Northern headland',x:-3600,z:-21200,rx:2200,rz:2500,height:820,seed:37},
 {name:'Western stepping stone',x:-6200,z:-14200,rx:900,rz:1600,height:165,seed:77},
 {name:'Palm Reach',x:11100,z:-21500,rx:3100,rz:3500,height:95,seed:91,kind:'coral'},
 {name:'Lagoon key',x:8100,z:-17300,rx:1500,rz:1900,height:42,seed:17,kind:'atoll'},
 {name:'Coral passage',x:8800,z:-13100,rx:1300,rz:1700,height:58,seed:95,kind:'coral'},
 {name:'Outer coral',x:11800,z:-15100,rx:1300,rz:1000,height:75,seed:54,kind:'coral'},
 {name:'Eastern ridge',x:13700,z:-21800,rx:1600,rz:2500,height:670,seed:66},
];
export function airportPoint(airport,along=0,lateral=0,height=0){const h=airport.heading||0;return {x:airport.x+Math.sin(h)*along+Math.cos(h)*lateral,y:(airport.elevation||0)+height,z:airport.z-Math.cos(h)*along+Math.sin(h)*lateral};}
export function airportCoordinates(airport,point){const h=airport.heading||0,x=point.x-airport.x,z=point.z-airport.z;return {along:x*Math.sin(h)-z*Math.cos(h),lateral:x*Math.cos(h)+z*Math.sin(h)};}
function defineAirport(data){const a={heading:0,elevation:0,width:64,gateLateral:300,gateAlong:480,...data};a.gate=airportPoint(a,a.gateAlong,a.gateLateral);return a;}
export const AIRPORTS=[
 defineAirport({id:'southbay',name:'South Bay',code:'SBY',x:0,z:-550,length:1800,gateLateral:220,gateAlong:-1050,style:'coastal',platform:{lat0:-220,lat1:650,along0:-1550,along1:1050}}),
 defineAirport({id:'northport',name:'Northport',code:'NPT',x:700,z:-9900,length:2000,style:'harbour',platform:{lat0:-420,lat1:800,along0:-1400,along1:1650}}),
 defineAirport({id:'ridgefield',name:'Ridgefield',code:'RGF',x:-7200,z:-17800,length:1900,elevation:80,style:'highland',platform:{lat0:-420,lat1:850,along0:-1450,along1:1650}}),
 defineAirport({id:'palmreach',name:'Palm Reach',code:'PLM',x:11000,z:-21200,length:2000,style:'island',platform:{lat0:-420,lat1:900,along0:-1700,along1:1800}}),
];
export function inAirportBounds(airport,x,z,padding=0){const local=airportCoordinates(airport,{x,z}),p=airport.platform;return local.lateral>p.lat0-padding&&local.lateral<p.lat1+padding&&local.along>p.along0-padding&&local.along<p.along1+padding;}
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
export function seeded(seed){return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
function hash(x,z,seed){const n=Math.sin(x*127.1+z*311.7+seed*51.93)*43758.5453123;return n-Math.floor(n);}
export function noise2(x,z,seed=0){const ix=Math.floor(x),iz=Math.floor(z),fx=smooth(x-ix),fz=smooth(z-iz);const a=hash(ix,iz,seed),b=hash(ix+1,iz,seed),c=hash(ix,iz+1,seed),d=hash(ix+1,iz+1,seed);return (a+(b-a)*fx)*(1-fz)+(c+(d-c)*fx)*fz;}
export function islandHeight(island,x,z){
 const lx=(x-island.x)/island.rx,lz=(z-island.z)/island.rz,angle=Math.atan2(lz,lx);
 const edge=1+.075*Math.sin(angle*3+island.seed)+.045*Math.sin(angle*7+island.seed*.6);
 const radius=Math.hypot(lx,lz)/edge;if(radius>=1.08)return -14;
 const rise=Math.max(0,1-radius*radius);
 const hills=.74+noise2(x*.0016,z*.0016,island.seed)*.40+noise2(x*.0048,z*.0048,island.seed+3)*.12;
 return island.kind==='atoll'?-12+Math.exp(-Math.pow((radius-.68)/.18,2))*island.height*hills:-10+Math.pow(rise,2.1)*island.height*hills;
}
export function airportHeight(x,z,natural){let height=natural;for(const a of AIRPORTS){const p=a.platform,local=airportCoordinates(a,{x,z}),d=Math.hypot(Math.max(p.lat0-local.lateral,0,local.lateral-p.lat1),Math.max(p.along0-local.along,0,local.along-p.along1));if(d<190){const mix=smooth(d/190);height=a.elevation*(1-mix)+height*mix;}}return height;}
export function terrainHeight(x,z){let h=-14;for(const island of ISLANDS)h=Math.max(h,islandHeight(island,x,z));return airportHeight(x,z,h);}
export function surfaceHeight(x,z){return Math.max(-5,terrainHeight(x,z));}
export function onAirport(x,z,padding=0){return AIRPORTS.some(a=>inAirportBounds(a,x,z,padding));}
export const CONDITIONS={
 clear:{id:'clear',name:'Clear coast',short:'CLEAR',description:'Bright skies, calm air. The easy coastal hop.',windX:0,windZ:0,seed:0,palette:{sky:'#3c94ce',horizon:'#c5e0e4',sun:'#fff1ce',sunX:-11000,sunY:6800,sunZ:-13000,water:'#176c83',waterLight:'#3d9b9a',fog:'#b6d5dc',hemi:'#d7edf6',light:'#fff0d6',exposure:1.05,fogDensity:.000045}},
 golden:{id:'golden',name:'Golden hour',short:'SUNSET',description:'A warm evening arrival. Same friendly flight.',windX:0,windZ:0,seed:1,palette:{sky:'#678db6',horizon:'#efd2ad',sun:'#ffd69d',sunX:-14000,sunY:2600,sunZ:-16000,water:'#2a6878',waterLight:'#7ba397',fog:'#c4c0af',hemi:'#ddd9dc',light:'#ffd49b',exposure:1.04,fogDensity:.00005}},
 breeze:{id:'breeze',name:'Coastal breeze',short:'BREEZE',description:'A light crosswind. Watch the runway centreline.',windX:3.2,windZ:-.8,seed:2,palette:{sky:'#4187ba',horizon:'#cadde2',sun:'#fff1d7',sunX:-8000,sunY:5700,sunZ:-15000,water:'#205a74',waterLight:'#398e93',fog:'#aac7d2',hemi:'#d4e6f3',light:'#fff0d7',exposure:1.03,fogDensity:.00006}},
};
export function condition(id){return CONDITIONS[id]||CONDITIONS.clear;}
export function windAt(id,time=0,altitude=0){const c=condition(id);if(!c.windX&&!c.windZ)return {x:0,z:0};const ramp=clamp(altitude/30,.4,1),gust=Math.sin(time*.09)*.45+Math.sin(time*.037+2)*.25;return {x:(c.windX+gust)*ramp,z:(c.windZ+gust*.3)*ramp};}
