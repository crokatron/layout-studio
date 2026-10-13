(function(root){

 'use strict';

 const sun=typeof module==='object'&&module.exports?require('./suncalc.js'):(root.MungoonSunCalc||root.SunCalc),deg=180/Math.PI,wrap=n=>(n%360+360)%360;

 const position=(date,lat,lon,moon=false)=>{const p=moon?sun.getMoonPosition(date,lat,lon):sun.getPosition(date,lat,lon);return {azimuth:wrap(p.azimuth*deg+180),altitude:p.altitude*deg};};

 function localParts(date,zone){return Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(date).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));}

 function localDate(text,zone){const nums=text.match(/\d+/g).map(Number);const desired=Date.UTC(nums[0],nums[1]-1,nums[2],nums[3]||0,nums[4]||0);let value=desired;for(let i=0;i<4;i++){const p=localParts(new Date(value),zone);value+=desired-Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute,+p.second);}return new Date(value);}

 function dateInput(date,zone){const p=localParts(date,zone);return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;}

 function events(date,lat,lon,zone){

  const day=dateInput(date,zone).slice(0,10),start=localDate(day+'T00:00',zone),next=new Date(Date.UTC(+day.slice(0,4),+day.slice(5,7)-1,+day.slice(8,10)+1)).toISOString().slice(0,10),end=localDate(next+'T00:00',zone);

  const result=[];const noon=localDate(day+'T12:00',zone),times=sun.getTimes(noon,lat,lon);

  for(const [key,label] of [['dawn','Civil dawn'],['sunrise','Sunrise'],['solarNoon','Solar noon'],['sunset','Sunset'],['dusk','Civil dusk']]){const d=times[key];if(d&&Number.isFinite(+d)&&d>=start&&d<end)result.push({label,date:d,...position(d,lat,lon)});}

  // Find moon horizon crossings within the HOME calendar day, not the browser day.

  let a=+start,va=position(new Date(a),lat,lon,true).altitude-.133;

  for(let b=Math.min(a+600000,+end);a<+end;b=Math.min(a+600000,+end)){const vb=position(new Date(b),lat,lon,true).altitude-.133;if(va*vb<0){let lo=a,hi=b;for(let i=0;i<15;i++){const mid=(lo+hi)/2,v=position(new Date(mid),lat,lon,true).altitude-.133;if((v>0)===(va>0))lo=mid;else hi=mid;}const d=new Date((lo+hi)/2);result.push({label:vb>va?'Moonrise':'Moonset',date:d,...position(d,lat,lon,true)});}a=b;va=vb;}

  return result.sort((a,b)=>a.date-b.date);

 }

 const eventCache=new Map();

 function snapshot(date,context){const {latitude:lat,longitude:lon,time_zone:zone}=context;const key=[dateInput(date,zone).slice(0,10),lat,lon,zone].join('|');if(!eventCache.has(key)){if(eventCache.size>20)eventCache.clear();eventCache.set(key,events(date,lat,lon,zone));}return {sun:position(date,lat,lon),moon:{...position(date,lat,lon,true),illumination:sun.getMoonIllumination(date).fraction},events:eventCache.get(key)};}

 const api={wrap,position,localDate,dateInput,events,snapshot};if(typeof module==='object'&&module.exports)module.exports=api;else root.HomeSky=api;

})(typeof window==='object'?window:globalThis);

