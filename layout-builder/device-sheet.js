// Live inventory belongs to HA; explicit name edits share the floor plan's ETag,

// undo, durable NAS autosave and background HA synchronization.

let sheetReference={tabs:[],device_notes:{}},sheetLoaded=false,sheetBusy=false,sheetReadAt=null,sheetPageName='devices';

function studioPage(name){if(studioHashTimer){clearInterval(studioHashTimer);studioHashTimer=null;}const auto=name==='automations',sheet=name==='sheet',buttons=name==='buttons';document.body.classList.toggle('buttons-active',buttons);$('buttons-panel').hidden=!buttons;document.body.classList.toggle('automations-active',auto);document.body.classList.toggle('device-sheet-active',sheet);$('automations-dialog').hidden=!auto;$('device-sheet-panel').hidden=!sheet;for(const [id,active] of [['studio-floor-tab',!auto&&!sheet&&!buttons],['studio-buttons-tab',buttons],['studio-automations-tab',auto],['studio-sheet-tab',sheet]])$(id).setAttribute('aria-selected',String(active));mobilePanel('plan');window.history.replaceState(null,'',location.pathname+location.search+(auto?'#automations':sheet?'#device-sheet':buttons?'#buttons':''));}

function sheetStatus(){const when=sheetReadAt?' · Read '+new Date(sheetReadAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',second:'2-digit'}):'';$('sheet-status').textContent=($('ha-status').textContent||'Connecting to Home Assistant…')+when;$('sheet-status').classList.toggle('ha-error',haState.state==='error');}

function sheetError(message){$('sheet-error').textContent=message;$('sheet-error').hidden=!message;}

function sheetRender(){if(document.activeElement?.matches('[data-sheet-name]'))return;const q=$('sheet-search').value.toLowerCase(),filter=$('sheet-filter').value,placed=new Map(haPlacements().map(d=>[d.device_id,d]));const rows=haData.devices.filter(d=>d.entry_type!=='service'&&!d.disabled_by).map(d=>({d,p:placed.get(d.id),area:haData.areas.find(a=>a.area_id===d.area_id),entities:haEntities(d.id)})).filter(({d,p,area})=>(filter==='all'||filter==='placed'&&p||filter==='unplaced'&&!p||filter==='unassigned'&&!area)&&`${haName(d)} ${area?.name||''} ${d.model||''} ${d.manufacturer||''}`.toLowerCase().includes(q)).sort((a,b)=>(a.area?.name||'~').localeCompare(b.area?.name||'~')||haName(a.d).localeCompare(haName(b.d)));

 $('sheet-count').textContent=`${rows.length} shown · ${placed.size} placed on the floor plan · Includes separate integration records for the same hardware`;

 $('sheet-device-rows').innerHTML=rows.map(({d,p,area,entities})=>{const active=entities.filter(e=>!e.entity_category),readings=active.length?active:entities,available=readings.some(e=>!['unknown','unavailable'].includes(e.state)),note=sheetReference.device_notes[d.id],icon=DI.resolve(p||{entity_id:entities[0]?.entity_id});return `<tr><td data-label="Device name"><div class="sheet-name-cell">${DI.svg(icon,24)}<div><label class="sr-only" for="sheet-name-${esc(d.id)}">Name for ${esc(haName(d))}</label><input id="sheet-name-${esc(d.id)}" data-sheet-name="${esc(d.id)}" value="${esc(haName(d))}" maxlength="150" ${haOwner?'':'disabled'}></div></div>${note?`<details class="sheet-note"><summary>Device notes</summary><p>${esc(note)}</p></details>`:''}</td><td data-label="HA room">${esc(area?.name||'Unassigned')}</td><td data-label="Model">${esc(d.model||'Not reported')}<small>${esc(d.manufacturer||'')}</small></td><td data-label="Availability"><span class="sheet-device-availability ${available?'':'unavailable'}">${available?'Available':readings.length?'Unavailable / unknown':'No active entities'}</span></td><td data-label="Floor plan">${p?esc(roomOf(p)?.name||'Needs positioning'):'Not placed'} <button class="button" type="button" data-sheet-place="${esc(d.id)}" ${entities.length?'':'disabled'}>${p?'Move':'Place'}</button></td></tr>`;}).join('')||'<tr><td colspan="5">No matching devices.</td></tr>';sheetStatus();}

async function sheetRefresh(){if(sheetBusy)return;if(!haOwner){sheetError('Sign in as the project owner to read or rename HA devices.');return;}sheetBusy=true;$('sheet-refresh').disabled=true;try{const [inventory,status]=await Promise.all([haRequest('inventory'),haRequest('status')]);haData=inventory;haShowStatus(status);sheetReadAt=Date.now();sheetError('');haRenderList();sheetRender();if(!sheetLoaded){sheetReference=await haRequest('device-sheet');sheetLoaded=true;$('sheet-reference-tab').innerHTML=sheetReference.tabs.map((t,i)=>`<option value="${i}">${esc(t.title)}</option>`).join('');if(sheetReference.source_url){$('sheet-old-link').href=sheetReference.source_url;$('sheet-old-link').hidden=false;}sheetRenderReference();sheetRender();}}catch(error){sheetError(error.message);}finally{sheetBusy=false;$('sheet-refresh').disabled=false;}}

async function sheetOpen(){studioPage('sheet');await sheetRefresh();}

function sheetRename(input){const id=input.dataset.sheetName,value=input.value.trim(),device=haData.devices.find(d=>d.id===id);if(!haOwner||!device)return;if(!value||value.length>150){sheetError('Enter a device name between 1 and 150 characters.');input.value=haName(device);return;}if(value===haName(device))return;const changed=mutate(()=>{plan.ha_device_names=plan.ha_device_names||{};plan.ha_device_names[id]=value;const p=haPlacements().find(d=>d.device_id===id);if(p){p.name=value;p.ha_name=value;}});if(changed){input.value=value;sheetError('');haRenderList();toast('Device name saved in the layout · syncing HA');sheetStatus();}}

function sheetRenderReference(){const tab=sheetReference.tabs[Number($('sheet-reference-tab').value)||0];if(!tab){$('sheet-reference-content').textContent='Workbook notes have not been imported yet.';return;}const cell=value=>/^https?:\/\/[^\s]+$/.test(value)?`<a href="${esc(value)}" target="_blank" rel="noopener">${esc(value)}</a>`:esc(value);$('sheet-reference-content').innerHTML='<table class="reference-table"><tbody>'+tab.rows.filter(row=>row.some(Boolean)).map(row=>'<tr>'+row.map(value=>'<td>'+cell(value)+'</td>').join('')+'</tr>').join('')+'</tbody></table>';}

$('studio-sheet-tab').onclick=sheetOpen;$('sheet-refresh').onclick=sheetRefresh;$('sheet-search').oninput=sheetRender;$('sheet-filter').onchange=sheetRender;$('sheet-reference-tab').onchange=sheetRenderReference;

$('sheet-device-rows').addEventListener('change',e=>{if(e.target.matches('[data-sheet-name]'))sheetRename(e.target);});$('sheet-device-rows').addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.matches('[data-sheet-name]')){e.preventDefault();sheetRename(e.target);e.target.blur();}});

$('sheet-device-rows').addEventListener('click',e=>{const b=e.target.closest('[data-sheet-place]');if(!b)return;studioPage('floor');placementOpen(b.dataset.sheetPlace);});

document.querySelectorAll('[data-sheet-view]').forEach(button=>button.onclick=()=>{sheetPageName=button.dataset.sheetView;$('sheet-live').hidden=sheetPageName!=='devices';$('sheet-reference').hidden=sheetPageName!=='reference';document.querySelectorAll('[data-sheet-view]').forEach(b=>b.classList.toggle('primary',b===button));});

setInterval(()=>{if(!document.hidden&&!$('device-sheet-panel').hidden&&!document.activeElement?.matches('[data-sheet-name]'))sheetRefresh();},30000);

setInterval(()=>{if(!$('device-sheet-panel').hidden)sheetStatus();},2000);

const initialStudioSection=location.hash;let studioHashTimer=['#device-sheet','#automations','#buttons'].includes(initialStudioSection)?setInterval(()=>{if(haOwner){clearInterval(studioHashTimer);studioHashTimer=null;if(initialStudioSection==='#device-sheet')sheetOpen();else if(initialStudioSection==='#buttons')buttonsOpen();else autoOpen();}},250):null;

