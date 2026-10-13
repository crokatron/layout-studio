/* Room moves share coordinates and naming in HA and Layout Studio. */

(function(root){

'use strict';

function inside(x,y,points){let yes=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const a=points[i],b=points[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;}

const roomAt=(plan,p)=>plan.rooms.find(r=>inside(p.x,p.y,r.points));

function pointForRoom(room,devices=[],skip){

 const xs=room.points.map(p=>p[0]),ys=room.points.map(p=>p[1]),x=Math.min(...xs),y=Math.min(...ys),w=Math.max(...xs)-x,h=Math.max(...ys)-y;

 const distance=(p,a,b)=>{const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((p.x-a[0])*dx+(p.y-a[1])*dy)/(dx*dx+dy*dy||1)));return Math.hypot(p.x-a[0]-t*dx,p.y-a[1]-t*dy);};

 let best=null,score=-1;

 for(let i=1;i<20;i++)for(let j=1;j<20;j++){const p={x:x+w*i/20,y:y+h*j/20};if(!inside(p.x,p.y,room.points))continue;

  const clearance=Math.min(...room.points.map((a,k)=>distance(p,a,room.points[(k+1)%room.points.length])),...devices.filter(d=>d.device_id!==skip).map(d=>Math.hypot(p.x-d.x,p.y-d.y)),Math.hypot(p.x-room.label[0],p.y-room.label[1]));

  if(clearance>score){best=p;score=clearance;}}

 if(!best)throw Error('Choose a position inside this room on the plan.');return {x:Math.round(best.x),y:Math.round(best.y)};

}

function rename(plan,marker,room){

 if(!room)return;

 const name=plan.ha_device_names?.[marker.device_id]||marker.ha_name||marker.name||'',prefix=plan.rooms.map(r=>(r.ha_name||r.name)+' · ').find(p=>name.startsWith(p));

 if(!prefix)return;

 const next=(room.ha_name||room.name)+' · '+name.slice(prefix.length);marker.name=marker.ha_name=next;(plan.ha_device_names??={})[marker.device_id]=next;

}

function withSavedMove(config,result){

 return {...config,plan:{...config.plan,devices:config.plan.devices.map(p=>p.device_id===result.device.device_id?{...p,...result.device}:p)},movement:{...config.movement,revision:result.revision}};

}

async function send(hass,config,request,timeout=25000){

 let unsubscribe,timer,finished=false;

 try{return await new Promise(async(resolve,reject)=>{

  timer=setTimeout(()=>reject(Error('Save not confirmed. Refresh to check the saved position before retrying.')),timeout);

  try{

   unsubscribe=await hass.connection.subscribeEvents(event=>{

    if(event.context?.user_id!==config.user_id||event.data?.request_id!==request.request_id)return;

    event.data.saved?resolve(event.data):reject(Error(event.data.error||'Move was not saved.'));

   },config.reply_event);

   if(finished){unsubscribe();return;}

   await hass.callWS({type:'fire_event',event_type:config.event,event_data:request});

  }catch(error){reject(error);}

 });}finally{finished=true;clearTimeout(timer);unsubscribe?.();}

}

const api={inside,roomAt,pointForRoom,rename,send,withSavedMove};

if(typeof module==='object'&&module.exports)module.exports=api;else root.RoomDeviceMoves=api;

})(typeof window==='object'?window:globalThis);

