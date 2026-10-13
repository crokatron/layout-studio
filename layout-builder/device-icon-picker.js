const DI=window.DeviceIcons,iconDialog=$('device-icon-dialog');

let iconSession=null;

function iconChoices(){

 if(!iconSession)return;

 const q=$('device-icon-search').value.trim(),group=$('device-icon-category').value,matches=DI.search(q,group);

 const automatic=!group&&(!q||q.toLowerCase().split(/\s+/).every(w=>'default reset automatic'.includes(w)));

 const rows=[...(automatic?[{id:'',label:'Automatic',preview:DI.automatic(iconSession.entityId)}]:[]),...matches];

 $('device-icon-count').textContent=`${matches.length} of ${DI.catalog.length} icons${group?' · '+group:''}`;

 $('device-icon-options').innerHTML=rows.map(i=>`<button type="button" class="button device-icon-choice" data-device-icon="${esc(i.id)}" aria-label="${esc(i.label)}" aria-pressed="${i.id===iconSession.choice}" title="${esc(i.id||'Follow the device control')}">${DI.svg(i.preview||i.id,28)}<span>${esc(i.label)}</span></button>`).join('')||'<p class="device-icon-empty">No matching icons. Try another name or choose All categories.</p>';

 $('device-icon-options').scrollTop=0;

 iconPreview();

}

function iconPreview(){if(!iconSession)return;const id=iconSession.choice||DI.automatic(iconSession.entityId);$('device-icon-preview').innerHTML=DI.svg(id,28)+'<span>'+esc(iconSession.choice?DI.get(id).label:'Automatic · follows the device control')+'</span>';}

function iconOpen({deviceId,entityId,icon,onApply}){if(!haOwner)return;const device=haData.devices.find(d=>d.id===deviceId),placed=haPlacements().find(d=>d.device_id===deviceId);iconSession={deviceId,entityId,choice:icon||'',onApply};$('device-icon-device').textContent=device?haName(device):placed?.name||entityId;$('device-icon-search').value='';$('device-icon-category').value='';iconChoices();iconDialog.showModal();$('device-icon-cancel').focus({preventScroll:true});}

function haEditIcon(id){const d=haPlacements().find(p=>p.device_id===id);if(!d)return;iconOpen({deviceId:id,entityId:d.entity_id,icon:d.icon,onApply:icon=>mutate(()=>{const placed=haPlacements().find(p=>p.device_id===id);if(!placed)throw Error('This device is no longer on the plan.');DI.set(placed,icon);})});}

$('device-icon-search').oninput=iconChoices;

$('device-icon-category').innerHTML='<option value="">All categories</option>'+DI.groups.map(group=>`<option value="${esc(group)}">${esc(group)}</option>`).join('');

$('device-icon-category').onchange=iconChoices;

$('device-icon-options').onclick=e=>{const button=e.target.closest('[data-device-icon]');if(!button||!iconSession)return;iconSession.choice=button.dataset.deviceIcon;for(const b of $('device-icon-options').querySelectorAll('[data-device-icon]'))b.setAttribute('aria-pressed',String(b===button));iconPreview();};

$('device-icon-cancel').onclick=()=>iconDialog.close();

$('device-icon-apply').onclick=()=>{if(iconSession&&iconSession.onApply(iconSession.choice)!==false)iconDialog.close();};

iconDialog.addEventListener('close',()=>{iconSession=null;});

$('ha-device-list').addEventListener('click',e=>{const button=e.target.closest('[data-ha-icon-edit]');if(button)haEditIcon(button.dataset.haIconEdit);});

$('selection-panel').addEventListener('click',e=>{const button=e.target.closest('[data-ha-icon-edit]');if(button)haEditIcon(button.dataset.haIconEdit);});

$('placement-icon').onclick=()=>{if(!placementSession)return;const d=haPlacements().find(p=>p.device_id===placementSession.id),entityId=d?.entity_id||haEntities(placementSession.id)[0]?.entity_id;iconOpen({deviceId:placementSession.id,entityId,icon:placementSession.icon,onApply:icon=>{placementSession.icon=icon;placementDrawIcon();}});};

function placementDrawIcon(){if(!placementSession)return;const d=haPlacements().find(p=>p.device_id===placementSession.id),id=DI.resolve({icon:placementSession.icon,entity_id:d?.entity_id||haEntities(placementSession.id)[0]?.entity_id});$('placement-glyph').innerHTML=DI.svg(id,23);$('placement-icon').innerHTML=DI.svg(id,20)+'<span>Icon</span>';}

