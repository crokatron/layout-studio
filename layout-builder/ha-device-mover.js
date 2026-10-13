/* HA owner-session move UI. The NAS confirms every revisioned save. */

(()=>{'use strict';

const R=window.RoomDeviceMoves,C=window.MapCamera,esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

const drafts=new Map(),notices=new Map();

class Mover{

 constructor(host){this.host=host;this.key=(host.config.movement?.user_id||'')+'|'+location.pathname;if(!host.moveDraft&&drafts.has(this.key))host.moveDraft=drafts.get(this.key);if(!host.moveStatus)host.moveStatus=notices.get(this.key)||'';this.mount();this.listen();}

 listen(){this.destroy();this.onResult=e=>{if(e.detail.key!==this.key)return;const h=this.host;h.moveSaving=false;if(e.detail.saved){h.moveDraft=null;h.config=R.withSavedMove(h.config,e.detail.result);}h.moveStatus=e.detail.message;h.build();};window.addEventListener('mungoon-move-finished',this.onResult);}

 destroy(){if(this.onResult)window.removeEventListener('mungoon-move-finished',this.onResult);}

 get active(){return !!this.host.moveDraft;}

 get allowed(){const h=this.host;return !!h.config.movement?.user_id&&h._hass?.user?.id===h.config.movement.user_id&&h._hass.user.is_admin;}

 mount(){const h=this.host,style=document.createElement('style');style.textContent=`.move-panel{padding:12px;background:#1a3038;display:grid;gap:10px}.move-panel[hidden],.move-start[hidden]{display:none}.move-panel label{display:grid;gap:5px;font-size:12px}.move-panel select,.move-panel button{min-height:44px;background:#253b44;color:#e4efec;border:1px solid #6d8e98;border-radius:8px;padding:9px;font:inherit}.move-panel .move-actions{display:flex;gap:8px}.move-panel button:disabled{opacity:.5}.move-panel .save-move{background:#b4ecd2;color:#16392b}.move-panel p{margin:0;font-size:13px;line-height:1.45}.move-result{padding:10px 12px;color:#d0f4dd}.move-result:empty{display:none}.move-preview{position:absolute;width:36px;height:36px;transform:translate(-50%,-50%);border:3px solid #c1ffdc;border-radius:50%;background:#22503ed9;color:white;text-align:center;line-height:29px;font-size:23px;pointer-events:none;box-shadow:0 0 0 5px #8fffc42b}.can-move .pin{cursor:grab}.can-move .pin[data-moving="true"]{cursor:grabbing;background:#8fffc433;outline:2px solid #c1ffdc}.move-drag-status{position:absolute;bottom:12px;left:12px;right:12px;padding:10px;background:#102923ed;border:1px solid #8bdab4;border-radius:8px;color:#e9fff1;pointer-events:none;z-index:4;font-size:13px}.move-drag-status[hidden]{display:none}.move-preview.invalid{border-color:#ffb4a9;background:#70382d}`;h.shadowRoot.append(style);

  this.button=document.createElement('button');this.button.className='move-start';this.button.textContent='Move devices';this.button.onclick=()=>this.open();h.shadowRoot.querySelector('.toolbar').append(this.button);

  this.panel=document.createElement('section');this.panel.className='move-panel';this.panel.setAttribute('aria-label','Move a device');h.viewport.before(this.panel);

  this.result=document.createElement('div');this.result.className='move-result';this.result.setAttribute('role','status');this.result.setAttribute('aria-live','polite');h.viewport.before(this.result);

  this.preview=document.createElement('div');this.preview.className='move-preview';this.preview.textContent='⌖';this.preview.hidden=true;h.pins.append(this.preview);this.dragNotice=document.createElement('div');this.dragNotice.className='move-drag-status';this.dragNotice.setAttribute('role','status');this.dragNotice.hidden=true;h.viewport.append(this.dragNotice);this.render();this.updateAccess();

 }

 updateAccess(){this.button.hidden=!this.allowed;this.button.disabled=this.active;this.host.viewport.classList.toggle('can-move',this.allowed);if(this.allowed)this.host.shadowRoot.querySelector('.hint').textContent='Drag a device to move it · Tap for controls · Drag empty space to pan · Two fingers zoom and rotate';}

 open(){if(!this.allowed)return;const h=this.host,d=h.visibleDevices()[0]||h.config.plan.devices[0];if(!d){this.result.textContent='Place a device in Layout Studio first.';return;}

  h.moveStatus='';h.moveDraft={deviceId:d.device_id,roomId:R.roomAt(h.config.plan,d)?.id||'',x:d.x,y:d.y,revision:h.config.movement.revision};drafts.set(this.key,h.moveDraft);h.build();h.mover.focusRoom();

 }

 pick(id){if(this.host.moveSaving||this.host.moveDraft?.saving)return;const d=this.host.config.plan.devices.find(d=>d.device_id===id);if(!d)return;Object.assign(this.host.moveDraft,{deviceId:id,roomId:R.roomAt(this.host.config.plan,d)?.id||'',x:d.x,y:d.y});this.render();this.focusRoom();}

 room(id){const h=this.host,d=h.moveDraft,r=h.config.plan.rooms.find(r=>r.id===id);d.roomId=id;if(r)Object.assign(d,R.pointForRoom(r,h.config.plan.devices,d.deviceId));this.render();this.focusRoom();}

 focusRoom(){const h=this.host,r=h.config.plan.rooms.find(r=>r.id===h.moveDraft?.roomId);h.view=C.bounds(r?r.points:h.points(),h.rotation,80);h.draw();}

 position(event){const h=this.host,d=h.moveDraft;if(!d||h.moveSaving||d.saving)return;const r=h.viewport.getBoundingClientRect(),p=C.unproject({x:event.clientX-r.left,y:event.clientY-r.top},h.view,r.width,r.height,h.rotation);d.x=Math.round(p.x);d.y=Math.round(p.y);this.render();h.draw();}

 beginDrag(id,start){

  const h=this.host;if(!this.allowed||h.moveSaving||h.moveDraft?.saving)return false;

  const marker=h.config.plan.devices.find(d=>d.device_id===id);if(!marker)return false;

  const previous=h.moveDraft?{...h.moveDraft}:null,origin=previous?.deviceId===id?previous:marker,rect=h.viewport.getBoundingClientRect();

  this.drag={previous,status:h.moveStatus,origin:{x:origin.x,y:origin.y},start:C.unproject({x:start.x-rect.left,y:start.y-rect.top},h.view,rect.width,rect.height,h.rotation),view:{...h.view},rotation:h.rotation,rect};

  h.moveDraft={deviceId:id,roomId:R.roomAt(h.config.plan,origin)?.id||'',x:origin.x,y:origin.y,revision:previous?.revision||h.config.movement.revision};drafts.set(this.key,h.moveDraft);h.moveStatus='';this.preview.hidden=false;this.dragNotice.hidden=false;return true;

 }

 dragTo(event){const h=this.host,s=this.drag;if(!s)return;const p=C.unproject({x:event.clientX-s.rect.left,y:event.clientY-s.rect.top},s.view,s.rect.width,s.rect.height,s.rotation),d=h.moveDraft;

  d.x=Math.round(s.origin.x+p.x-s.start.x);d.y=Math.round(s.origin.y+p.y-s.start.y);const room=R.roomAt(h.config.plan,d);d.roomId=room?.id||'';this.dragNotice.textContent=(room?'Move to '+(room.ha_name||room.name):'Outside rooms · keeps its existing HA room')+' · release, then Save position';h.draw();

 }

 finishDrag(cancel=false){const h=this.host,s=this.drag;if(!s)return;this.drag=null;this.dragNotice.hidden=true;

  if(cancel){h.moveDraft=s.previous;h.moveStatus=s.status;if(s.previous)drafts.set(this.key,s.previous);else drafts.delete(this.key);}

  else h.moveStatus='Position preview · choose Save position to update Layout Studio.';

  this.render();h.draw();

 }

 valid(){const h=this.host,d=h.moveDraft;return !!d&&(!d.roomId||R.roomAt(h.config.plan,d)?.id===d.roomId);}

 render(){const h=this.host,d=h.moveDraft;this.panel.hidden=!d;this.preview.hidden=!d;this.result.textContent=h.moveStatus||'';this.updateAccess();if(!d)return;

  const actual=R.roomAt(h.config.plan,d),valid=this.valid(),busy=h.moveSaving||d.saving;

  this.panel.innerHTML=`<label>Device to move<select aria-label="Device to move" ${busy?'disabled':''}>${h.config.plan.devices.map(p=>`<option value="${esc(p.device_id)}" ${p.device_id===d.deviceId?'selected':''}>${esc(p.name||p.entity_id)}</option>`).join('')}</select></label><label>Destination room<select aria-label="Destination room" ${busy?'disabled':''}><option value="">Anywhere on plan</option>${h.config.plan.rooms.map(r=>`<option value="${esc(r.id)}" ${r.id===d.roomId?'selected':''}>${esc(r.ha_name||r.name)}</option>`).join('')}</select></label><p>Drag the device icon between rooms, or tap the map to position it. Drag empty space to pan; pinch to zoom and rotate.</p><p role="status">${valid?(actual?'Pin in '+esc(actual.ha_name||actual.name):'Outside rooms · keeps its existing HA room'):'Move the pin inside the chosen room.'}</p><div class="move-actions"><button class="save-move" ${!valid||busy?'disabled':''}>${busy?'Saving…':'Save position'}</button><button class="cancel-move" ${busy?'disabled':''}>Cancel</button></div><p>Saves to Layout Studio and updates the device’s HA room. Room prefixes in names follow the move.</p>`;

  this.panel.querySelector('[aria-label="Device to move"]').onchange=e=>this.pick(e.target.value);this.panel.querySelector('[aria-label="Destination room"]').onchange=e=>this.room(e.target.value);this.panel.querySelector('.save-move').onclick=()=>this.save();this.panel.querySelector('.cancel-move').onclick=()=>{drafts.delete(this.key);h.moveDraft=null;h.moveStatus='Move cancelled. Saved position unchanged.';notices.set(this.key,h.moveStatus);h.build();};this.draw();

 }

 draw(){const h=this.host,d=h.moveDraft;if(!d||!h.view)return;const r=h.viewport.getBoundingClientRect(),p=C.project(d,h.view,r.width,r.height,h.rotation);this.preview.style.left=p.x+'px';this.preview.style.top=p.y+'px';this.preview.classList.toggle('invalid',!this.valid());}

 async save(){const h=this.host,d=h.moveDraft;if(!this.allowed||!this.valid()||h.moveSaving||d.saving)return;

  const request={request_id:Array.from(crypto.getRandomValues(new Uint8Array(16)),n=>n.toString(16).padStart(2,'0')).join(''),revision:d.revision,device_id:d.deviceId,room_id:d.roomId,x:d.x,y:d.y};h.moveSaving=d.saving=true;h.moveStatus='Saving to NAS…';this.render();let saved=false,result;

  try{result=await R.send(h._hass,h.config.movement,request);h.config=R.withSavedMove(h.config,result);h.moveDraft=null;drafts.delete(this.key);saved=true;h.moveStatus=result.message;}

  catch(error){h.moveStatus=error.message||'Move was not saved. Please refresh and try again.';}

  finally{h.moveSaving=d.saving=false;notices.set(this.key,h.moveStatus);window.dispatchEvent(new CustomEvent('mungoon-move-finished',{detail:{key:this.key,message:h.moveStatus,saved,result}}));}

 }

}

window.FloorDeviceMove={mount:host=>new Mover(host)};

})();

