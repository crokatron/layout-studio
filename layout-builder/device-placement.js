// A separate preview keeps touch gestures and unconfirmed locations out of autosave.

const PG=window.PlacementGeometry,placementDialog=$('device-placement'),placementSvg=$('placement-plan'),placementMap=$('placement-map');

let placementSession=null,placementView=null,placementGesture=null,placementMulti=false;

const placementPointers=new Map();

const usePlacementGuide=()=>phoneLayout()||matchMedia('(pointer:coarse)').matches;

function placementRoom(){return plan.rooms.find(r=>r.id===placementSession?.roomId);}

function placementRect(){const r=placementMap.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};}

function placementTarget(){const p=PG.centre(placementView);return {x:Math.round(p.x),y:Math.round(p.y)};}

function placementUpdate(){if(!placementSession||!placementView)return;placementSvg.setAttribute('viewBox',`${placementView.x} ${placementView.y} ${placementView.w} ${placementView.h}`);const p=placementTarget(),room=plan.rooms.find(r=>M.inside(p.x,p.y,r.points)),valid=!placementSession.roomId||room?.id===placementSession.roomId;$('placement-confirm').disabled=!valid;placementDialog.classList.toggle('placement-invalid',!valid);$('placement-status').textContent=valid?(room?'Pin is inside '+room.name:'Outside rooms · existing HA room stays unchanged'):room?'Pin is in '+room.name+' · move it inside '+placementRoom().name:'Pin is outside the room · drag the map under the pin';}

function placementFit(){const room=placementRoom(),b=room?M.bounds(room.points):allBounds(),label=room?M.labelPosition(room,true):[b.x+b.w/2,b.y+b.h/2],stored=haPlacements().find(d=>d.device_id===placementSession.id),p=stored&&(!room||M.inside(stored.x,stored.y,room.points))?{x:stored.x,y:stored.y}:{x:label[0],y:label[1]};placementView=PG.fit(b,p,placementRect());placementUpdate();}

function placementChooseRoom(id){placementSession.roomId=id;$('placement-rooms').hidden=true;$('placement-position').hidden=false;$('placement-step').textContent='Position the pin';$('placement-room-name').textContent=placementRoom()?.name||'Anywhere on plan';$('placement-fit').textContent=id?'Fit room':'Fit map';$('placement-confirm').textContent=haPlacements().some(d=>d.device_id===placementSession.id)?'Save position':'Place here';placementSvg.innerHTML=markup(true);for(const e of placementSvg.querySelectorAll('[data-ha-device]'))if(e.dataset.haDevice===placementSession.id)e.remove();for(const e of placementSvg.querySelectorAll('[data-room] .room-shape')){const active=!id||e.closest('[data-room]').dataset.room===id;e.style.opacity=active?'1':'.4';if(active)e.style.stroke='#9bedd0';}placementFit();$('placement-confirm').focus({preventScroll:true});}

function placementShowRooms(){if(!placementSession)return;placementPointers.clear();placementGesture=null;placementView=null;$('placement-step').textContent='Choose a room';$('placement-position').hidden=true;$('placement-rooms').hidden=false;const stored=haPlacements().find(d=>d.device_id===placementSession.id),device=haData.devices.find(d=>d.id===placementSession.id),area=haData.areas.find(a=>a.area_id===device?.area_id);$('placement-room-list').innerHTML='<button type="button" class="button placement-room" data-placement-room=""><b>Anywhere on plan</b><small>Inside or outside rooms · choose freely</small></button>'+plan.rooms.map(r=>{const current=stored&&M.inside(stored.x,stored.y,r.points),suggested=current||(!stored&&(haState.rooms?.[r.id]?.area_id===device?.area_id||r.name===area?.name));return `<button type="button" class="button placement-room ${suggested?'suggested':''}" data-placement-room="${esc(r.id)}"><b>${esc(r.name)}</b><small>${current?'Current placement':suggested?'Current HA room':plan.rooms.filter(other=>other.name===r.name).length>1?esc(r.ha_name||r.id):'Tap to position device'}</small></button>`;}).join('');}

function placementOpen(id){if(!haOwner){toast('Sign in as the owner to place devices.');return;}const device=haData.devices.find(d=>d.id===id);if(!device||!haEntities(id).length){toast('Refresh devices before placing this device.');return;}flushEdit();haPending=null;placementSession={id,roomId:null,icon:haPlacements().find(d=>d.device_id===id)?.icon||''};placementPointers.clear();placementGesture=null;placementMulti=false;$('placement-title').textContent=haName(device);placementDrawIcon();if(!placementDialog.open)placementDialog.showModal();placementShowRooms();const stored=haPlacements().find(d=>d.device_id===id),room=stored&&roomOf(stored);if(stored)placementChooseRoom(room?.id||'');}

$('placement-room-list').onclick=e=>{const button=e.target.closest('[data-placement-room]');if(button)placementChooseRoom(button.dataset.placementRoom);};

$('placement-cancel').onclick=()=>placementDialog.close();$('placement-change-room').onclick=placementShowRooms;

placementDialog.addEventListener('close',()=>{placementSession=null;placementView=null;placementPointers.clear();placementGesture=null;placementMulti=false;});

$('placement-confirm').onclick=()=>{if(!placementSession||$('placement-confirm').disabled)return;const {id,roomId,icon}=placementSession;if(haPlace(id,placementTarget(),roomId,icon)){placementDialog.close();mobilePanel('plan');}};

$('placement-fit').onclick=placementFit;$('placement-zoom-in').onclick=()=>{placementView=PG.zoom(placementView,.8);placementUpdate();};$('placement-zoom-out').onclick=()=>{placementView=PG.zoom(placementView,1.25);placementUpdate();};

document.querySelectorAll('[data-placement-nudge]').forEach(b=>b.onclick=()=>{const [dx,dy]=b.dataset.placementNudge.split(',').map(Number),p=PG.centre(placementView);placementView=PG.centred(placementView,{x:p.x+dx,y:p.y+dy});placementUpdate();});

function placementTouchPair(){const [a,b]=[...placementPointers.values()];return {x:(a.x+b.x)/2,y:(a.y+b.y)/2,distance:Math.hypot(a.x-b.x,a.y-b.y)};}

function placementStartGesture(){const points=[...placementPointers.values()];if(!points.length){placementGesture=null;return;}placementGesture={view:{...placementView},rect:placementRect(),start:points.length>1?placementTouchPair():points[0],moved:false};}

placementMap.addEventListener('pointerdown',e=>{if(e.button!==0||!placementSession)return;e.preventDefault();placementPointers.set(e.pointerId,{x:e.clientX,y:e.clientY});placementMap.setPointerCapture(e.pointerId);if(placementPointers.size>1)placementMulti=true;placementStartGesture();});

placementMap.addEventListener('pointermove',e=>{if(!placementPointers.has(e.pointerId)||!placementGesture)return;e.preventDefault();placementPointers.set(e.pointerId,{x:e.clientX,y:e.clientY});const g=placementGesture;if(placementPointers.size>1){const p=placementTouchPair();placementView=PG.pinch(g.view,g.rect,g.start,p,g.start.distance/Math.max(1,p.distance));g.moved=true;}else{const dx=e.clientX-g.start.x,dy=e.clientY-g.start.y;if(Math.hypot(dx,dy)>5)g.moved=true;if(g.moved)placementView=PG.pan(g.view,g.rect,dx,dy);}placementUpdate();});

function placementEndPointer(e){if(!placementPointers.has(e.pointerId))return;e.preventDefault();if(e.type==='pointerup'&&!placementMulti&&!placementGesture.moved){const p=PG.at(placementView,placementRect(),{x:e.clientX,y:e.clientY});placementView=PG.centred(placementView,p);placementUpdate();}placementPointers.delete(e.pointerId);if(placementMap.hasPointerCapture(e.pointerId))placementMap.releasePointerCapture(e.pointerId);placementStartGesture();if(!placementPointers.size)placementMulti=false;}

placementMap.addEventListener('pointerup',placementEndPointer);placementMap.addEventListener('pointercancel',placementEndPointer);

placementMap.addEventListener('wheel',e=>{e.preventDefault();placementView=PG.zoom(placementView,e.deltaY>0?1.15:1/1.15);placementUpdate();},{passive:false});

// Rotation and browser chrome changes keep the target centred and visible.

new ResizeObserver(()=>{if(placementSession&&placementView)placementUpdate();}).observe(placementMap);

