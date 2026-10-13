/* Home Assistant custom card. All controls use the signed-in HA session. */

(()=>{'use strict';

const C=window.MapCamera,esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

const dark=color=>{const c=/^#[0-9a-f]{6}$/i.test(color)?color:'#718088';return '#'+[18,30,34].map((b,i)=>Math.round(parseInt(c.slice(1+i*2,3+i*2),16)*.2+b*.8).toString(16).padStart(2,'0')).join('');};

class MungoonFloorCard extends HTMLElement{

 constructor(){super();this.attachShadow({mode:'open'});this.rotation=0;this.pointers=new Map();this.suppressUntil=0;}

 setConfig(config){if(!config.plan?.rooms?.length)throw Error('The saved floor plan has no rooms.');this.config=config;this.build();}

 set hass(hass){this._hass=hass;if(this.config)this.updateStates();}

 getCardSize(){return 12;}

 connectedCallback(){this.mover?.listen();if(this.viewport){this.observer?.observe(this.viewport);this.draw();}}

 disconnectedCallback(){this.mover?.destroy();this.observer?.disconnect();clearTimeout(this.holdTimer);}

 markers(){const p=this.config.plan;return [...(p.devices||[]),...(this.moveDraft?[]:(p.ha_controls||[]).map(c=>({...c,device_id:'control:'+c.id,control:true})))];}

 visibleDevices(devices=this.config.plan.devices||[]){if(this.moveDraft)return devices;const room=this.config.focus_room&&this.config.plan.rooms.find(r=>r.id===this.config.focus_room);if(!room)return devices;return devices.filter(d=>{let inside=false;for(let i=0,j=room.points.length-1;i<room.points.length;j=i++){const a=room.points[i],b=room.points[j];if((a[1]>d.y)!==(b[1]>d.y)&&d.x<(b[0]-a[0])*(d.y-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;});}

 activateMarker(d){if(Date.now()<this.suppressUntil)return;if(this.mover?.active){if(!d.control)this.mover.pick(d.device_id);return;}if(d.control){this.navigate(d.navigation_path);return;}if(this.config.focus_room){this.moreInfo(d.entity_id);return;}const target=this.config.device_paths?.[d.device_id];if(target)this.navigate(target);else this.moreInfo(d.entity_id);}

 navigate(path){if(!path)return;history.pushState(null,'',path);window.dispatchEvent(new CustomEvent('location-changed',{detail:{replace:false}}));}

 roomNavigation(){const rooms=this.config.plan.rooms,index=rooms.findIndex(r=>r.id===this.config.focus_room),paths=this.config.room_paths||{};if(!Object.keys(paths).length)return '';return `<nav class="room-navigation" aria-label="Room navigation"><button data-room-home ${index<0?'disabled':''}>All rooms</button><button data-room-prev aria-label="Previous room" ${index<=0?'disabled':''}>←</button><label>Room<select aria-label="Choose room"><option value="">All rooms</option>${rooms.map(r=>`<option value="${esc(r.id)}" ${r.id===this.config.focus_room?'selected':''}>${esc(r.ha_name||r.name)}</option>`).join('')}</select></label><button data-room-next aria-label="Next room" ${index>=rooms.length-1?'disabled':''}>→</button>${index>=0?`<span>${index+1} / ${rooms.length}</span>`:''}</nav>`;}

 points(){const p=this.config.plan,focus=this.moveDraft?this.moveDraft.roomId:this.config.focus_room,room=focus&&p.rooms.find(r=>r.id===focus);if(room)return [...room.points,room.label];const points=p.rooms.flatMap(r=>[...r.points,r.label]);for(const w of p.walls||[])points.push(w.a,w.b);for(const i of p.items||[]){const r=Math.hypot(i.w,i.h)*(i.kind==='door'?1.6:.5);points.push([i.x-r,i.y-r],[i.x+r,i.y+r]);}for(const d of p.devices||[])points.push([d.x,d.y]);return points;}

 fit(){this.view=C.bounds(this.points(),this.rotation,70);this.draw();}

 rotate(angle){this.rotation=C.wrap(angle);this.fit();}

 build(){this.mover?.destroy();this.environment?.destroy();this.observer?.disconnect();const p=this.config.plan;this.shadowRoot.innerHTML=`<style>:host{display:block;color:#e0eeec;font-family:var(--primary-font-family,system-ui)}*{box-sizing:border-box}ha-card{overflow:hidden;background:#101b20;border:1px solid #30464e;border-radius:14px}.room-navigation{display:flex;align-items:center;gap:6px;flex-wrap:wrap;padding:8px;background:#20343c}.room-navigation button,.room-navigation select{font:inherit;min-height:44px;border:1px solid #526e78;border-radius:7px;background:#253b44;color:#e4efec;padding:6px 10px}.room-navigation button:disabled{opacity:.4}.room-navigation label{display:flex;align-items:center;gap:6px;flex:1;font-size:12px}.room-navigation select{width:100%;min-width:0;max-width:300px}.room-navigation span{font-size:12px}.toolbar{display:flex;align-items:center;gap:6px;flex-wrap:wrap;padding:8px;background:#172a32}.toolbar button,.toolbar input{background:#253b44;color:#e4efec;border:1px solid #526e78;border-radius:7px;min-height:42px;font:inherit;padding:6px 11px;cursor:pointer}.toolbar button:disabled{opacity:.65;cursor:wait}.refresh-status{padding:8px 12px;background:#493722;color:#ffe2b4;font-size:12px}.refresh-status[hidden]{display:none}.toolbar input{width:65px;padding:6px}.toolbar label{font-size:12px;display:flex;align-items:center;gap:5px}.viewport{position:relative;width:100%;height:clamp(350px,76dvh,1000px);overflow:hidden;touch-action:none;user-select:none}svg.floor{display:block;width:100%;height:100%;touch-action:none}.pins{position:absolute;inset:0;pointer-events:none}.pin{position:absolute;width:44px;height:44px;padding:calc((44px - var(--pin-icon-size))/2);border:0;border-radius:50%;background:transparent;color:#a9d9dc;transform:translate(-50%,-50%);pointer-events:auto;touch-action:none;cursor:pointer;--pin-icon-size:clamp(14px,4vw,22px);--mdc-icon-size:var(--pin-icon-size)}.pin:hover,.pin:focus-visible{background:#69c9bc40;outline:2px solid #86decf}.pin[data-unavailable="true"]{opacity:.45}.pin ha-state-icon,.pin ha-icon{width:var(--pin-icon-size);height:var(--pin-icon-size);display:block;--mdc-icon-size:var(--pin-icon-size)}.control-pin{background:#23483de6;outline:1px solid #83cdb9}.control-label{position:absolute;left:50%;top:43px;transform:translateX(-50%);white-space:nowrap;background:#152b28ed;border:1px solid #507d70;border-radius:5px;padding:3px 6px;color:#e0f4e8;font:11px var(--primary-font-family,system-ui);pointer-events:none}.pin .fallback{font:20px system-ui;color:#a9d9dc}.pins [hidden]{display:none}.hint{padding:7px 12px;font-size:12px;color:#a3bec6;background:#15262e}.sky{position:absolute;right:8px;top:8px;z-index:3}@media(max-width:550px){.toolbar{gap:4px;padding:6px}.toolbar button{padding:6px 9px}.viewport{height:72dvh;min-height:350px}.hint{font-size:11px}}.hub-floor-header{display:flex;align-items:center;gap:8px;padding:4px 8px;height:48px;background:#172a32}.hub-floor-header button{min-height:40px;padding:6px 12px;font:inherit;color:#e4efec;background:#253b44;border:1px solid #526e78;border-radius:7px}.hub-floor-header strong{flex:1}.toolbar,.room-navigation,.hint,.environment-section,.sky{display:none!important}.viewport{height:calc(100dvh - 116px);min-height:180px}ha-card{border-radius:0}

</style><ha-card><div class="hub-floor-header"><button data-hub-home>⌂ Home</button><strong>Floor plan</strong><button data-hub-fit>Fit</button><button data-hub-out aria-label="Zoom out">−</button><button data-hub-in aria-label="Zoom in">+</button></div>${this.roomNavigation()}<div class="toolbar" aria-label="Floor plan view"><button data-action="out" aria-label="Zoom out">−</button><button data-action="fit">Fit</button><button data-action="in" aria-label="Zoom in">+</button><button data-action="left" aria-label="Rotate map left">↶ 15°</button><label>Angle <input class="angle" type="number" min="0" max="359" step="15" aria-label="Map rotation degrees"></label><button data-action="right" aria-label="Rotate map right">15° ↷</button><button data-action="north">North up</button><button data-action="reset">Drawing up</button><button data-action="refresh" aria-label="Refresh floor plan" title="Reload the saved layout, live readings and latest floor-plan interface">↻ Refresh</button></div><div class="refresh-status" role="status" hidden></div><div class="viewport"><svg class="floor" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Interactive home floor plan"><g class="world">${p.rooms.map(r=>`<polygon points="${r.points.map(p=>p.join(',')).join(' ')}" fill="${dark(r.color)}" opacity="${this.config.focus_room&&r.id!==this.config.focus_room ? .35 : 1}" stroke="#728d92" stroke-width="5" stroke-linejoin="round"/>`).join('')}${(p.walls||[]).map(w=>`<line x1="${w.a[0]}" y1="${w.a[1]}" x2="${w.b[0]}" y2="${w.b[1]}" stroke="#9ab0b5" stroke-width="${w.thickness}"/>`).join('')}${(p.items||[]).map(i=>`<g data-furniture="${esc(i.id)}" transform="translate(${i.x} ${i.y}) rotate(${i.rotation||0})"><title>${esc(i.name)}</title>${FurnitureSymbols.render(i)}</g>`).join('')}${(window.RoomEnvironment&&this.config.room_environment?p.rooms.filter(r=>!window.RoomEnvironment.tileSettings(r).visible):p.rooms).map(r=>`<text x="${r.label[0]}" y="${r.label[1]}" fill="#e0eceb" font-size="18" font-weight="600" text-anchor="middle">${esc(r.name)}</text>`).join('')}</g></svg><div class="pins"></div><home-sky class="sky"></home-sky></div><div class="hint">Drag to pan · Use two fingers to zoom and rotate · ${this.config.focus_room?'Tap a device for quick controls · All room controls are below':'Tap a device for all controls · Hold for quick controls'}</div></ha-card>`;

 this.shadowRoot.querySelector('[data-hub-home]').onclick=()=>this._hass.callService('cast','show_lovelace_view',{entity_id:'media_player.hub',dashboard_path:'nest-hub',view_path:'home'});this.shadowRoot.querySelector('[data-hub-fit]').onclick=()=>this.fit();for(const [a,f] of [['in',.8],['out',1.25]])this.shadowRoot.querySelector('[data-hub-'+a+']').onclick=()=>{this.view=C.zoom(this.view,f);this.draw();};

 this.viewport=this.shadowRoot.querySelector('.viewport');this.svg=this.shadowRoot.querySelector('.floor');this.pins=this.shadowRoot.querySelector('.pins');this.sky=this.shadowRoot.querySelector('home-sky');

 for(const d of this.visibleDevices(this.markers())){const b=document.createElement('button');b.className='pin';b.dataset.device=d.device_id;b.title=d.name||d.entity_id;b.setAttribute('aria-label',b.title);const icon=document.createElement('ha-state-icon');if(d.icon)icon.icon=d.icon;b.append(icon);if(d.control){b.classList.add('control-pin');const label=document.createElement('span');label.className='control-label';label.textContent=d.name;b.append(label);}b.onclick=()=>this.activateMarker(d);b.onkeydown=e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();b.click();}};this.pins.append(b);}

 const nav=this.shadowRoot.querySelector('.room-navigation');if(nav){const rooms=p.rooms,index=rooms.findIndex(r=>r.id===this.config.focus_room),go=id=>this.navigate(id?this.config.room_paths[id]:'/floor-plan/rooms');nav.querySelector('select').onchange=e=>go(e.target.value);nav.querySelector('[data-room-home]').onclick=()=>go('');nav.querySelector('[data-room-prev]').onclick=()=>go(rooms[index-1]?.id);nav.querySelector('[data-room-next]').onclick=()=>go(rooms[index+1]?.id);}

 this.shadowRoot.querySelector('.toolbar').onclick=e=>{const action=e.target.closest('button')?.dataset.action;if(!action)return;if(action==='refresh'){this.refresh();return;}if(action==='fit')this.fit();if(action==='in'||action==='out'){this.view=C.zoom(this.view,action==='in'?.8:1.25);this.draw();}if(action==='left'||action==='right')this.rotate(this.rotation+(action==='left'?-15:15));if(action==='north')this.rotate(p.north_bearing??0);if(action==='reset')this.rotate(0);};const angleInput=this.shadowRoot.querySelector('.angle');angleInput.oninput=angleInput.onchange=e=>{if(e.target.value!==''&&Number.isFinite(+e.target.value))this.rotate(+e.target.value);};angleInput.onblur=()=>{angleInput.value=Math.round(this.rotation);};

 this.viewport.addEventListener('touchstart',e=>{if(this.mover?.allowed&&e.target.closest('.pin'))e.preventDefault();},{passive:false});

 this.viewport.addEventListener('pointerdown',e=>this.down(e));this.viewport.addEventListener('pointermove',e=>this.move(e));this.viewport.addEventListener('pointerup',e=>this.up(e));this.viewport.addEventListener('pointercancel',e=>this.up(e));this.viewport.addEventListener('wheel',e=>{if(e.target.closest('home-sky'))return;e.preventDefault();if(this.mover?.drag)return;const r=this.viewport.getBoundingClientRect(),p=C.unproject({x:e.clientX-r.left,y:e.clientY-r.top},this.view,r.width,r.height);this.view=C.zoom(this.view,Math.exp(Math.max(-1,Math.min(1,e.deltaY*.001))),p);this.draw();},{passive:false});

 const refreshStatus=this.shadowRoot.querySelector('.refresh-status');if(window.__mungoonFloorRefreshError){refreshStatus.textContent=window.__mungoonFloorRefreshError;refreshStatus.hidden=false;}

 this.environment=this.config.room_environment?window.RoomEnvironment?.mount(this):null;

 this.mover=this.config.allow_edit===true?window.FloorDeviceMove?.mount(this):null;this.observer=new ResizeObserver(()=>this.draw());this.observer.observe(this.viewport);this.fit();this.updateStates();

 }

 refresh(){const button=this.shadowRoot.querySelector('[data-action=refresh]');if(button.disabled)return;button.disabled=true;button.textContent='Refreshing…';try{window.FloorPlanRefresh.reload();}catch{button.disabled=false;button.textContent='↻ Refresh';const status=this.shadowRoot.querySelector('.refresh-status');status.textContent='Could not refresh. Please try again.';status.hidden=false;}}

 moreInfo(entity){this.dispatchEvent(new CustomEvent('hass-more-info',{bubbles:true,composed:true,detail:{entityId:entity}}));}

 updateStates(){this.mover?.updateAccess();this.environment?.update(this._hass);if(!this._hass||!this.pins)return;for(const d of this.markers()){const b=[...this.pins.children].find(p=>p.dataset.device===d.device_id),state=this._hass.states[d.entity_id];if(!b)continue;const icon=b.firstElementChild;icon.hass=this._hass;icon.stateObj=state;b.style.color=['on','open','playing','cooling','heating','cleaning'].includes(state?.state)?'#ffda75':'#a9d9dc';if(d.icon)icon.icon=d.icon;b.setAttribute('data-unavailable',String(!state||state.state==='unavailable'));b.title=(d.name||d.entity_id)+' · '+(state?.state||'Unavailable');}this.updateSky();}

 updateSky(){if(this.sky)this.sky.config={context:this._hass?.config,bearing:this.config.plan.north_bearing??0,rotation:this.rotation,calibration:this.config.plan.north_reference||'Set drawing north in Layout Studio.'};}

 draw(){this.environment?.draw();if(!this.view||!this.svg)return;const v=this.view;this.svg.setAttribute('viewBox',`${v.x} ${v.y} ${v.w} ${v.h}`);this.shadowRoot.querySelector('.world').setAttribute('transform',`rotate(${this.rotation})`);const r=this.viewport.getBoundingClientRect();if(!r.width||!r.height)return;for(const d of this.markers()){const point=this.moveDraft?.deviceId===d.device_id?this.moveDraft:d,q=C.project(point,v,r.width,r.height,this.rotation),b=[...this.pins.children].find(p=>p.dataset.device===d.device_id);if(!b)continue;b.dataset.moving=String(this.moveDraft?.deviceId===d.device_id);b.style.left=q.x+'px';b.style.top=q.y+'px';b.hidden=q.x<0||q.y<0||q.x>r.width||q.y>r.height;}const angleInput=this.shadowRoot.querySelector('.angle');if(this.shadowRoot.activeElement!==angleInput)angleInput.value=Math.round(this.rotation);this.mover?.draw();this.updateSky();}

 gesture(){const a=[...this.pointers.values()];return a.length>1?{x:(a[0].x+a[1].x)/2,y:(a[0].y+a[1].y)/2,d:Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y),angle:Math.atan2(a[1].y-a[0].y,a[1].x-a[0].x)*180/Math.PI}:{...a[0],d:0};}

 rebase(){if(!this.pointers.size){this.gestureStart=null;return;}this.gestureStart={...this.gesture(),view:{...this.view},rotation:this.rotation,rect:this.viewport.getBoundingClientRect()};this.gestureMoved=false;}

 nearestPin(e){let nearest=null,best=22;for(const b of this.pins.children){if(b.hidden||!b.dataset.device)continue;const r=b.getBoundingClientRect(),distance=Math.hypot(e.clientX-r.x-r.width/2,e.clientY-r.y-r.height/2);if(distance<best){best=distance;nearest=b;}}return nearest;}

 down(e){if(e.button!==0||e.target.closest('home-sky'))return;this.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});clearTimeout(this.holdTimer);

  if(this.pointers.size>1){this.dragCandidate=null;this.mover?.finishDrag(true);this.activePin=this.activeEnvironment=null;this.suppressUntil=Date.now()+1500;}

  else{this.activeEnvironment=e.target.closest('.environment-pin');this.activePin=this.activeEnvironment?null:this.nearestPin(e);this.dragCandidate=this.activePin&&!this.activePin.dataset.device.startsWith('control:')&&this.mover?.allowed?{id:this.activePin.dataset.device,x:e.clientX,y:e.clientY}:null;

   if(this.activePin&&!this.mover?.active&&!this.mover?.allowed){const d=this.markers().find(d=>d.device_id===this.activePin.dataset.device);this.holdTimer=setTimeout(()=>{this.dragCandidate=null;this.moreInfo(d.entity_id);this.suppressUntil=Date.now()+1500;},650);}}

  this.rebase();this.viewport.setPointerCapture(e.pointerId);

 }

 move(e){if(!this.pointers.has(e.pointerId)||!this.gestureStart)return;this.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});

 if(this.pointers.size===1&&(this.mover?.drag||this.dragCandidate&&Math.hypot(e.clientX-this.dragCandidate.x,e.clientY-this.dragCandidate.y)>=7&&this.mover.beginDrag(this.dragCandidate.id,this.dragCandidate))){clearTimeout(this.holdTimer);this.gestureMoved=true;this.suppressUntil=Date.now()+1500;this.mover.dragTo(e);e.preventDefault();return;}

 const t=this.gesture(),s=this.gestureStart,dx=t.x-s.x,dy=t.y-s.y,twist=s.d>=12&&t.d>=12?C.wrap(t.angle-s.angle+180)-180:0;if(!this.gestureMoved&&Math.hypot(dx,dy)<5&&Math.abs(t.d-s.d)<5&&Math.abs(twist)<2)return;this.gestureMoved=true;clearTimeout(this.holdTimer);this.suppressUntil=Date.now()+1500;

 const local=p=>({...p,x:p.x-s.rect.left,y:p.y-s.rect.top}),next=C.gesture(s.view,s.rotation,s.rect.width,s.rect.height,local(s),local(t));this.view=next.view;this.rotation=next.rotation;this.draw();e.preventDefault();}

 up(e){this.dragCandidate=null;if(this.mover?.drag){clearTimeout(this.holdTimer);this.pointers.delete(e.pointerId);if(this.viewport.hasPointerCapture(e.pointerId))this.viewport.releasePointerCapture(e.pointerId);this.mover.finishDrag(e.type==='pointercancel');this.activePin=this.activeEnvironment=null;this.suppressUntil=Date.now()+350;this.rebase();return;}if(this.mover?.active){clearTimeout(this.holdTimer);const tap=e.type==='pointerup'&&this.pointers.size===1&&!this.gestureMoved&&Date.now()>=this.suppressUntil;this.pointers.delete(e.pointerId);this.rebase();if(this.viewport.hasPointerCapture(e.pointerId))this.viewport.releasePointerCapture(e.pointerId);this.activePin=this.activeEnvironment=null;if(tap)this.mover.position(e);return;}clearTimeout(this.holdTimer);if(this.pointers.size>1||e.type==='pointercancel')this.suppressUntil=Date.now()+1500;this.pointers.delete(e.pointerId);this.rebase();if(this.viewport.hasPointerCapture(e.pointerId))this.viewport.releasePointerCapture(e.pointerId);if(e.type==='pointerup'&&this.activeEnvironment&&Date.now()>=this.suppressUntil){this.activeEnvironment.click();this.suppressUntil=Date.now()+250;}this.activeEnvironment=null;if(e.type==='pointerup'&&this.activePin&&Date.now()>=this.suppressUntil){this.activePin.click();this.suppressUntil=Date.now()+250;}this.activePin=null;}

}

if(!customElements.get('mungoon-floor-card'))customElements.define('mungoon-floor-card',MungoonFloorCard);

window.customCards=window.customCards||[];window.customCards.push({type:'mungoon-floor-card',name:'Mungoon Floor Plan',description:'Interactive saved Layout Studio floor plan with full device controls and home sky.'});

})();



/* All-device navigation. Uses only the current authenticated HA session. */

(()=>{'use strict';

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function availability(device,states){

 if(device.device_disabled)return {label:'Device disabled',rank:4};

 if(!device.entity_ids.length)return {label:device.disabled_count?'All entities disabled':'No entities',rank:5};

 let known=0,unavailable=0,unknown=0;

 for(const id of device.entity_ids){const state=states[id]?.state;if(state==='unavailable')unavailable++;else if(state===undefined||state==='unknown')unknown++;else known++;}

 if(known===device.entity_ids.length)return {label:'Available',rank:0};

 if(known)return {label:`Partial: ${unavailable+unknown} unavailable / unknown`,rank:1};

 if(unavailable)return {label:`Unavailable${unknown?' / unknown':''}`,rank:3};

 return {label:'Unknown',rank:2};

}

function visibleDevices(devices,states,query,room,sort){

 const q=query.trim().toLocaleLowerCase();

 return devices.filter(d=>(room==='__all__'||d.room_id===room)&&(!q||[d.name,d.model,d.manufacturer,d.room,d.kind,...d.integrations,...d.entity_ids].join(' ').toLocaleLowerCase().includes(q)))

 .map(d=>({...d,availability:availability(d,states)})).sort((a,b)=>{

  if(sort==='room'){const unassigned=Number(!a.room_id)-Number(!b.room_id);if(unassigned)return unassigned;const r=a.room.localeCompare(b.room);if(r)return r;}

  if(sort==='availability'){const r=a.availability.rank-b.availability.rank;if(r)return r;}

  return a.name.localeCompare(b.name)||a.id.localeCompare(b.id);

 });

}

class MungoonDeviceNavigator extends HTMLElement{

 constructor(){super();this.attachShadow({mode:'open'});this.query='';this.room='__all__';this.sort='room';}

 setConfig(config){if(!Array.isArray(config.devices))throw Error('Device inventory is missing.');this.config=config;try{Object.assign(this,JSON.parse(sessionStorage.getItem('mungoon-device-nav')||'{}'));}catch{}this.build();}

 set hass(hass){this._hass=hass;if(this.config)this.renderRows();}

 getCardSize(){return 12;}

 build(){

  const rooms=new Map(this.config.devices.filter(d=>d.room_id).map(d=>[d.room_id,d.room]));

  if(this.room!=='__all__'&&this.room!==''&&!rooms.has(this.room))this.room='__all__';

  this.shadowRoot.innerHTML=`<ha-card><style>

   :host{display:block}*{box-sizing:border-box}.wrap{padding:20px;color:var(--primary-text-color)}h1{font-size:24px;margin:0 0 6px}.intro,.meta,.count{color:var(--secondary-text-color);font-size:13px;line-height:1.5}.intro{margin:0 0 16px}.filters{display:grid;grid-template-columns:2fr 1fr 1fr;gap:12px;margin:16px 0}label{font-size:12px;font-weight:600;display:grid;gap:5px}input,select{width:100%;min-height:44px;padding:10px;border-radius:8px;border:1px solid var(--divider-color);background:var(--card-background-color);color:var(--primary-text-color);font:inherit;font-size:14px}input:focus,select:focus,a:focus{outline:2px solid var(--primary-color);outline-offset:2px}.group{font-size:16px;margin:22px 0 10px}.list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}a{display:flex;justify-content:space-between;gap:10px;padding:14px;text-decoration:none;color:inherit;border:1px solid var(--divider-color);border-radius:10px;min-width:0;background:var(--card-background-color)}a:hover{border-color:var(--primary-color)}.name{font-weight:600;line-height:1.4;overflow-wrap:anywhere}.meta{overflow-wrap:anywhere}.status{font-size:12px;margin-top:7px;line-height:1.4}.status[data-rank="0"]{color:var(--success-color,#278a61)}.status[data-rank="3"]{color:var(--error-color,#d75b5b)}.arrow{font-size:22px;color:var(--secondary-text-color)}.empty{padding:24px 0}.count{min-height:20px}.foot{font-size:12px;color:var(--secondary-text-color);margin-top:20px} @media(max-width:600px){.wrap{padding:14px}.filters{grid-template-columns:1fr 1fr}.search{grid-column:1/-1}.list{grid-template-columns:1fr}h1{font-size:22px}}

  </style><div class="wrap"><h1>Devices</h1><p class="intro">Every device registry record, including unplaced devices and software services. Open a record for its readings and controls.</p><div class="filters"><label class="search">Search devices<input type="search" aria-label="Search devices" placeholder="Name, model, integration or room" value="${esc(this.query)}"></label><label>Room<select aria-label="Room filter"><option value="__all__">All rooms</option>${[...rooms].sort((a,b)=>a[1].localeCompare(b[1])).map(([id,name])=>`<option value="${esc(id)}">${esc(name)}</option>`).join('')}<option value="">Unassigned</option></select></label><label>Sort by<select aria-label="Sort devices"><option value="room">Room</option><option value="name">Name</option><option value="availability">Availability</option></select></label></div><div class="count" role="status" aria-live="polite"></div><div class="results"></div><p class="foot">Availability reflects enabled HA entity states. Unknown is shown separately; duplicated integration records and records without entities remain visible.</p></div></ha-card>`;

  const search=this.shadowRoot.querySelector('input'),room=this.shadowRoot.querySelector('[aria-label="Room filter"]'),sort=this.shadowRoot.querySelector('[aria-label="Sort devices"]');room.value=this.room;sort.value=this.sort;

  const change=()=>{this.query=search.value;this.room=room.value;this.sort=sort.value;try{sessionStorage.setItem('mungoon-device-nav',JSON.stringify({query:this.query,room:this.room,sort:this.sort}));}catch{}this._signature=null;this.renderRows();};search.addEventListener('input',change);room.addEventListener('change',change);sort.addEventListener('change',change);this.renderRows();

 }

 renderRows(){

  if(!this.config||!this.shadowRoot.querySelector('.results'))return;

  const rows=visibleDevices(this.config.devices,this._hass?.states||{},this.query,this.room,this.sort);const signature=JSON.stringify(rows.map(d=>[d.id,d.availability.label]));if(signature===this._signature)return;this._signature=signature;

  const enabled=this.config.devices.reduce((n,d)=>n+d.entity_ids.length,0),disabled=this.config.devices.reduce((n,d)=>n+d.disabled_count,0);

  this.shadowRoot.querySelector('.count').textContent=`${rows.length} of ${this.config.devices.length} records · ${enabled} enabled entities · ${disabled} disabled`;

  let group=null,markup='';for(const d of rows){const title=this.sort==='room'?d.room:this.sort==='availability'?d.availability.label:'All devices';if(title!==group){if(group!==null)markup+='</div>';markup+=`<h2 class="group">${esc(title)}</h2><div class="list">`;group=title;}markup+=`<a href="${esc(d.path)}" data-device-id="${esc(d.id)}"><div><div class="name">${esc(d.name)}</div><div class="meta">${esc([d.model,d.integrations.join(', ')].filter(Boolean).join(' · '))}</div><div class="meta">${esc(d.room)} · ${esc(d.kind)} · ${d.entity_ids.length} enabled / ${d.disabled_count} disabled</div><div class="status" data-rank="${d.availability.rank}">${esc(d.availability.label)}</div></div><span class="arrow" aria-hidden="true">›</span></a>`;}if(group!==null)markup+='</div>';if(!rows.length)markup='<p class="empty">No devices match these filters.</p>';this.shadowRoot.querySelector('.results').innerHTML=markup;

  for(const link of this.shadowRoot.querySelectorAll('a'))link.addEventListener('click',event=>{if(event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;event.preventDefault();history.pushState(null,'',link.getAttribute('href'));window.dispatchEvent(new CustomEvent('location-changed',{detail:{replace:false}}));});

 }

}

if(typeof customElements!=='undefined'&&!customElements.get('mungoon-device-navigator'))customElements.define('mungoon-device-navigator',MungoonDeviceNavigator);

if(typeof module!=='undefined')module.exports={availability,visibleDevices};

})();

