// This module runs inside the editor, so placements share its undo and NAS save flow.

let haData={areas:[],devices:[],entities:[]},haState={},haOwner=false,haPending=null,haLoading=false,haListFilter='all';

const haName=d=>plan.ha_device_names?.[d.id]||d.name_by_user||d.name||d.model||'Unnamed device';

const haPlacements=()=>plan.devices||[];

const haSource=d=>(d.integrations||[]).map(p=>({cast:'Google Cast',androidtv_remote:'Android TV Remote',smartthings:'SmartThings',tplink:'TP-Link',matter:'Matter',switchbot:'SwitchBot',onvif:'ONVIF',zha:'Zigbee (ZHA)',vesync:'VeSync',meross_lan:'Meross LAN',samsungtv:'Samsung TV'}[p]||p.replace(/_/g,' '))).join(' + ');

const haEntities=id=>haData.entities.filter(e=>e.device_id===id&&!e.disabled_by).sort((a,b)=>{

  const domains=['light','switch','fan','climate','cover','media_player','vacuum','lock','sensor','binary_sensor'];

  const rank=e=>(e.entity_category?100:0)+(domains.includes(e.entity_id.split('.')[0])?domains.indexOf(e.entity_id.split('.')[0]):50);

  return rank(a)-rank(b)||a.name.localeCompare(b.name);

});

const haGlyph=id=>({light:'☀',switch:'⏻',fan:'✣',climate:'♨',cover:'▤',media_player:'▶',vacuum:'◎',lock:'▣',sensor:'◈',binary_sensor:'◉',camera:'◉'}[id?.split('.')[0]]||'⌁');

function darkFloorColor(color){const c=/^#[0-9a-f]{6}$/i.test(color)?color:'#718088';return '#'+[18,30,34].map((b,i)=>Math.round(parseInt(c.slice(1+i*2,3+i*2),16)*.2+b*.8).toString(16).padStart(2,'0')).join('');}

function haMarkers(exporting=false){const k=exporting?1:1/(svg.getScreenCTM()?.a||1),radius=exporting?23:11*k,size=exporting?25:18*k;return haPlacements().map(d=>{const icon=DI.get(DI.resolve(d));return `<g class="ha-marker ${selected?.type==='device'&&selected.id===d.device_id?'selected':''}" data-ha-device="${esc(d.device_id)}" data-device-icon="${icon.id}" transform="translate(${d.x} ${d.y})" role="button" tabindex="0" aria-label="${esc(d.name||d.entity_id)}"><title>${esc(d.name||d.entity_id)} - ${esc(roomOf(d)?.name||'Outside rooms')}</title>${exporting?'':`<circle r="${22*k}" style="fill:transparent;stroke:none"/>`}<circle r="${radius}" style="stroke-width:${1.2*k}px"/><g transform="translate(${-size/2} ${-size/2}) scale(${size/24})"><path d="${icon.path}" fill="#b4f4e5" stroke="none"/></g></g>`;}).join('');}

async function haRequest(path,body){const r=await fetch('/api/admin/ha/'+path,body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:undefined);let data;try{data=await r.json();}catch{throw Error('Sign in to Project Studio again.');}if(!r.ok)throw Error(data.error||'Home Assistant request failed.');return data;}

function haShowStatus(status){

  haState=status;

  const messages={pending:'Saved on NAS · HA sync queued',syncing:'Saved on NAS · syncing HA…',synced:'Saved on NAS · HA is up to date',error:status.error};

  const stale=status.state==='synced'&&status.synced_revision&&typeof nasEtag!=='undefined'&&nasEtag!==status.synced_revision;

  $('ha-status').textContent=status.connected?(stale?'NAS draft differs from HA · Save to NAS to sync':messages[status.state]||'HA connected'): 'Connect HA to read and place your devices.';

  $('ha-status').classList.toggle('ha-error',status.state==='error');

  $('ha-connect').textContent=status.connected?'Reconnect HA':'Connect HA';

  $('ha-refresh').disabled=!status.connected||haLoading;$('ha-retry').hidden=!status.connected;

  $('ha-dashboard').hidden=!status.connected;

}

function haRenderList(){

  const q=$('ha-search').value.toLowerCase(),filter=haListFilter;

  const available=haData.devices.filter(d=>!d.disabled_by&&d.entry_type!=='service'&&haEntities(d.id).length);

  const unplaced=available.filter(d=>!haPlacements().some(p=>p.device_id===d.id)).length;

  $('ha-show-unplaced').textContent='Not added ('+unplaced+')';

  $('ha-show-unplaced').setAttribute('aria-pressed',String(filter==='unplaced'));

  $('ha-show-all').setAttribute('aria-pressed',String(filter==='all'));

  const rows=available

    .filter(d=>`${haName(d)} ${d.manufacturer||''} ${d.model||''} ${haSource(d)}`.toLowerCase().includes(q))

    .filter(d=>filter!=='unplaced'||!haPlacements().some(p=>p.device_id===d.id)).sort((a,b)=>haName(a).localeCompare(haName(b)));

  $('ha-device-count').textContent=`${haPlacements().length} placed · ${rows.length} shown`;

  $('ha-device-list').innerHTML=rows.map(d=>{const placed=haPlacements().find(p=>p.device_id===d.id),area=haData.areas.find(a=>a.area_id===d.area_id)?.name||'Unassigned';return `<div class="ha-device-entry"><button class="ha-device-row ${haPending===d.id||selected?.id===d.id?'active':''}" data-ha-pick="${esc(d.id)}" draggable="${usePlacementGuide()?'false':'true'}"><span class="ha-device-icon">${DI.svg(DI.resolve(placed||{entity_id:haEntities(d.id)[0].entity_id}),24)}</span><span><b>${esc(haName(d))}</b><small>${placed?'Placed: '+esc(roomOf(placed)?.name||'Outside rooms')+' · Tap to move':'Tap to place · HA: '+esc(area)}</small>${haSource(d)?`<small class="ha-source">${esc(haSource(d))}${d.model?' · '+esc(d.model):''}</small>`:''}</span></button>${placed?`<button type="button" class="button ha-icon-edit" data-ha-icon-edit="${esc(d.id)}" aria-label="Change icon for ${esc(haName(d))}" title="Change device icon">${DI.svg(DI.resolve(placed),22)}</button>`:''}</div>`;}).join('')||`<p class="subtle">${haLoading?'Reading HA devices…':haState.connected?'No matching devices. Try All devices or Refresh devices.':'Your HA devices will appear here after connecting.'}</p>`;

}

async function haRefresh(){if(!haOwner||!haState.connected||haLoading)return;haLoading=true;haShowStatus(haState);haRenderList();try{haData=await haRequest('inventory');haRenderList();drawPlan();if(['device','room'].includes(selected?.type))inspector();}catch(e){$('ha-status').textContent=e.message;}finally{haLoading=false;$('ha-refresh').disabled=false;}}

function haPick(id){if(usePlacementGuide()){placementOpen(id);return;}haPending=id;setMode('devices');const placed=haPlacements().find(d=>d.device_id===id);selected=placed?{type:'device',id}:null;haRenderList();if(placed){haPending=null;render();}else{inspector();$('mode-note').textContent='Click on the plan to place '+haName(haData.devices.find(d=>d.id===id));toast('Click the exact position on the plan, or drag this device anywhere on the map.');}}

function haPlace(id,p,requiredRoomId,icon){

  p={x:Math.round(p.x),y:Math.round(p.y)};

  if(!haOwner){toast('Sign in as the owner to place devices.');return false;}

  const room=plan.rooms.find(r=>M.inside(p.x,p.y,r.points)),device=haData.devices.find(d=>d.id===id),entity=haEntities(id)[0];

  if(requiredRoomId&&room?.id!==requiredRoomId){toast('Move the pin inside the chosen room.');return false;}

  if(!device||!entity){toast('Refresh devices before placing this device.');return false;}

  const saved=mutate(()=>{plan.devices=plan.devices||[];let placement=plan.devices.find(d=>d.device_id===id);if(!placement){placement={device_id:id,entity_id:entity.entity_id,name:haName(device)};plan.devices.push(placement);}Object.assign(placement,{x:Math.round(p.x),y:Math.round(p.y)});window.RoomDeviceMoves?.rename(plan,placement,room);if(icon!==undefined)DI.set(placement,icon);selected={type:'device',id};haPending=null;});

  if(!saved)return false;

  haRenderList();toast(haName(device)+(room?' placed in '+room.name:' placed outside rooms')+' · saving');return true;

}

function haInspector(){

  if(selected?.type!=='device'){

    if(mode==='devices'&&haPending){const d=haData.devices.find(d=>d.id===haPending);$('selection-panel').innerHTML=`<div class="eyebrow">Ready to place</div><h2>${esc(d?haName(d):'Device')}</h2><p class="subtle">Click anywhere on the plan at the device’s real position. Drag its marker later to adjust it.</p>`;return true;}

    return false;

  }

  const d=current();if(!d)return false;

  const entities=haEntities(d.device_id),room=roomOf(d),options=entities.length?entities:[{entity_id:d.entity_id,name:d.entity_id,state:'Refresh to read'}];

  $('selection-panel').innerHTML=`<div class="eyebrow">Home Assistant device</div><h2>${esc(d.name||d.entity_id)}</h2><p class="subtle">${room?'Room: '+esc(room.name):'Outside rooms · saved to HA; existing HA room stays unchanged'}<br>Drag to position, or use the arrow keys.</p><button type="button" class="button ha-icon-control" data-ha-icon-edit="${esc(d.device_id)}" aria-label="Change device icon">${DI.svg(DI.resolve(d),26)}<span>${d.icon?esc(DI.get(d.icon).label):'Automatic icon'}</span><small>Change icon</small></button><label class="field">Device name in HA<input id="ha-device-name" maxlength="150" value="${esc(d.ha_name||d.name||'')}"></label><p class="subtle">Updates the device name after saving. Entity IDs stay unchanged.</p><label class="field">Main entity / hold control<select id="ha-entity">${options.map(e=>`<option value="${esc(e.entity_id)}" ${e.entity_id===d.entity_id?'selected':''}>${esc(e.name)} · ${esc(e.state)}</option>`).join('')}</select></label><div class="fields">${numberField('x',d.x,'Centre X (cm)')}${numberField('y',d.y,'Centre Y (cm)')}</div><p class="subtle">Tap the marker in HA for all device controls and readings. Hold it for the main entity’s controls. Removing a marker keeps the device’s current HA room.</p><button type="button" class="button" data-ha-move-room="${esc(d.device_id)}">Move to another room</button><button class="button danger" data-action="delete">Remove marker</button><button class="button" data-action="deselect">Deselect</button>`;

  return true;

}

function haRoomFields(room){if(!haOwner)return '';const mapped=haState.rooms?.[room.id];return `<label class="field">Home Assistant room name<input data-ha-room-name value="${esc(room.ha_name||'')}" placeholder="${esc(room.name)}" maxlength="150"></label><p class="subtle">${mapped?'HA area: '+esc(mapped.name):'Uses the room name. Duplicate labels receive distinct HA area names.'}<br>Renaming this room updates its linked HA area after saving.</p>`;}

$('ha-search').oninput=haRenderList;

$('ha-show-all').onclick=()=>{haListFilter='all';haRenderList();};

$('ha-show-unplaced').onclick=()=>{haListFilter='unplaced';haRenderList();};

$('ha-refresh').onclick=haRefresh;

$('ha-connect').onclick=async()=>{try{const result=await haRequest('connect',{});location.href=result.url;}catch(e){$('ha-status').textContent=e.message;}};

$('ha-retry').onclick=async()=>{try{haShowStatus(await haRequest('sync',{}));}catch(e){$('ha-status').textContent=e.message;}};

$('ha-device-list').addEventListener('click',e=>{const b=e.target.closest('[data-ha-pick]');if(b)haPick(b.dataset.haPick);});

$('ha-device-list').addEventListener('dragstart',e=>{const b=e.target.closest('[data-ha-pick]');if(b){e.dataTransfer.setData('application/x-ha-device',b.dataset.haPick);e.dataTransfer.effectAllowed='copy';}});

stage.addEventListener('dragover',e=>{if(Array.from(e.dataTransfer.types).includes('application/x-ha-device')){e.preventDefault();stage.classList.add('drag-over');}});

stage.addEventListener('drop',e=>{const id=e.dataTransfer.getData('application/x-ha-device');if(id){e.preventDefault();stage.classList.remove('drag-over');setMode('devices');haPlace(id,point(e));}});

svg.addEventListener('pointerdown',e=>{

  if(mode==='box')return;

  const marker=e.target.closest('[data-ha-device]');

  if(marker&&usePlacementGuide()&&!tool&&e.button===0&&e.pointerType!=='touch'){e.stopImmediatePropagation();e.preventDefault();placementOpen(marker.dataset.haDevice);return;}

  if(mode==='pan'||(mode==='rooms'&&tool)||space||e.button!==0)return;

  if(marker){e.stopImmediatePropagation();e.preventDefault();flushEdit();haPending=null;selected={type:'device',id:marker.dataset.haDevice};drag={kind:'item',start:point(e),before:M.clone(plan),object:M.clone(current())};svg.setPointerCapture(e.pointerId);render();}

  else if(mode==='devices'&&haPending){e.stopImmediatePropagation();e.preventDefault();haPlace(haPending,point(e));}

},true);

svg.addEventListener('keydown',e=>{const marker=e.target.closest('[data-ha-device]');if(marker&&['Enter',' '].includes(e.key)){e.preventDefault();if(usePlacementGuide()){placementOpen(marker.dataset.haDevice);return;}selected={type:'device',id:marker.dataset.haDevice};render();}});

$('selection-panel').addEventListener('change',e=>{

  if(e.target.id==='ha-device-name'&&selected?.type==='device'){const value=e.target.value.trim();if(value)mutate(()=>{current().name=value;current().ha_name=value;plan.ha_device_names=plan.ha_device_names||{};plan.ha_device_names[current().device_id]=value;});else toast('Enter a device name.');}

  if(e.target.id==='ha-entity'&&selected?.type==='device')mutate(()=>{current().entity_id=e.target.value;});

  if(e.target.matches('[data-ha-room-name]')&&selected?.type==='room')mutate(()=>{const room=current(),value=e.target.value.trim();if(value)room.ha_name=value;else delete room.ha_name;});

});

$('mode-devices').onclick=()=>{setMode('devices');haRenderList();mobilePanel('devices');};

async function haInit(){

  if(typeof nasLoaded==='undefined'){$('ha-status').textContent='Open the NAS editor to connect Home Assistant.';return;}

  $('save-project').textContent='Export JSON';

  $('save-nas').hidden=false;$('save-nas').onclick=()=>{flushEdit();saveNas();};

  if(!nasLoaded){$('stage').style.pointerEvents='none';$('save-nas').disabled=true;return;}

  try{

    const r=await fetch('/api/me');const me=await r.json();haOwner=me.owner===true;

    if(!haOwner){$('ha-panel').innerHTML='<h2>Home Assistant</h2><p class="subtle">HA connection and placement are owner-only.</p>';return;}

    const params=new URLSearchParams(location.search);

    if(params.has('code')&&params.has('state')){

      const code=params.get('code'),state=params.get('state');window.history.replaceState(null,'',location.pathname);

      await haRequest('complete',{code,state});

    }

    haShowStatus(await haRequest('status'));await haRefresh();

    setInterval(async()=>{if(document.hidden)return;try{haShowStatus(await haRequest('status'));}catch(e){$('ha-status').textContent=e.message;}},5000);

  }catch(e){$('ha-status').textContent=e.message;}

}

haInit();



$('selection-panel').addEventListener('click',e=>{const b=e.target.closest('[data-ha-move-room]');if(b){placementOpen(b.dataset.haMoveRoom);placementShowRooms();}});

