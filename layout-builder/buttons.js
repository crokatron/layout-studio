let buttonCatalog={devices:[]},buttonOptions={entities:[],actions:[]},buttonBusy=false,buttonDraft=null,buttonBaseline='',buttonReadAt=0,buttonFilters={};

const buttonDirty=()=>buttonDraft&&JSON.stringify(buttonDraft)!==buttonBaseline;

const buttonEntityName=id=>buttonOptions.entities.find(e=>e.entity_id===id)?.name||id;

function buttonDescription(actions){return actions.map(a=>a.action==='delay'?'Wait '+a.seconds+' seconds':(autoActions[a.action]?.[0]||a.action)+(a.value!==undefined?' '+a.value:'')+' → '+a.entities.map(buttonEntityName).join(', ')).join(' · ');}

function buttonRender(){const device=buttonCatalog.devices.find(d=>d.id===$('buttons-device').value);$('buttons-device-info').textContent=device?[device.area,device.model].filter(Boolean).join(' · '):'';if(!device){$('buttons-presses').innerHTML='<p class="auto-empty">No supported button presses were reported by HA. Pair the button in HA, then refresh this tab.</p>';return;}

 const channels=[...new Set(device.presses.map(p=>p.channel))];$('buttons-presses').innerHTML=channels.map(channel=>`<h3 class="buttons-channel">${esc(channel)}</h3><div class="buttons-grid">${device.presses.filter(p=>p.channel===channel).map(p=>`<article class="button-press ${p.assignments.length?'assigned':''}"><h4>${esc(p.label)}</h4><p class="press-state">${p.assignments.length?p.assignments.some(a=>a.enabled)?'Assigned · Enabled':'Assigned · Paused':'Not assigned'}</p>${p.assignments.map(a=>`<div class="press-rule"><p>${esc(a.name)}</p><p>${a.restore_for?'Restores the states captured by single press':a.actions?esc(buttonDescription(a.actions)):'Advanced automation · all existing logic preserved'}</p>${p.assignments.length>1||!a.actions?`<button class="button" data-button-advanced="${esc(a.id)}">Edit advanced assignment</button>`:''}</div>`).join('')}${p.assignments.length>1?'<p>Multiple rules use this press. Edit each assignment here to review its logic.</p>':p.assignments.length&&!p.assignments[0].actions?'':`<button class="button ${p.assignments.length?'':'primary'}" data-button-press="${p.key}">${p.assignments.length?'Edit assignment':'Assign action'}</button>`}</article>`).join('')}</div>`).join('');}

async function buttonRefresh(){if(buttonBusy||$('button-edit-dialog').open)return;buttonBusy=true;$('buttons-refresh').disabled=true;$('buttons-status').textContent='Reading supported presses and assignments from HA…';try{const [catalog,options]=await Promise.all([haRequest('buttons'),haRequest('automation-options')]);const selected=$('buttons-device').value;buttonCatalog=catalog;buttonOptions=options;$('buttons-actions-summary').textContent=options.entities.filter(AL.curtainPreset).length+' saved curtain presets · '+options.entities.filter(e=>e.entity_id.startsWith('script.')).length+' HA scripts · '+options.actions.length+' action types. Choose a press to add them.';buttonReadAt=Date.now();$('buttons-device').innerHTML=catalog.devices.map(d=>`<option value="${esc(d.id)}">${esc(d.name)}</option>`).join('');if(catalog.devices.some(d=>d.id===selected))$('buttons-device').value=selected;buttonRender();$('buttons-status').textContent=`${catalog.devices.length} button device${catalog.devices.length===1?'':'s'} · Refreshed ${new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}`+(catalog.discovery_errors.length?' · Could not read: '+catalog.discovery_errors.join(', ')+'. Refresh to retry.':'')+(catalog.unreadable_rules?' · Some HA rules hide their configuration; their assignments cannot be listed here.':'');}catch(e){$('buttons-status').textContent='Refresh failed: '+e.message;}finally{buttonBusy=false;$('buttons-refresh').disabled=false;}}

async function buttonsOpen(){studioPage('buttons');if(!haOwner){$('buttons-status').textContent='Sign in as the project owner to assign button actions.';return;}if(Date.now()-buttonReadAt>10000)await buttonRefresh();}

function buttonRows(action,index){const f=buttonFilters[index]||{},wanted=(f.query||'').toLowerCase();return buttonOptions.entities.filter(e=>autoTargetAllowed(action,e)&&(!e.entity_category||f.settings||['number_value','select_option'].includes(action.action)||action.entities.includes(e.entity_id))&&(!f.room||e.area_name===f.room)&&(!wanted||[e.name,e.area_name,e.entity_id].join(' ').toLowerCase().includes(wanted)));}

function buttonTargets(action,index){return buttonRows(action,index).map(e=>`<label class="auto-target"><input type="checkbox" data-button-target="${esc(e.entity_id)}" data-action-index="${index}" ${action.entities.includes(e.entity_id)?'checked':''}><span>${esc(e.name)}<small>${esc([AL.curtainPreset(e)?'Saved curtain preset':e.area_name,e.entity_category?'Device setting':'',e.state].filter(Boolean).join(' · '))}</small></span></label>`).join('')||(action.action.startsWith('tv_')?tvSetupHelp:'<p class="auto-empty">No matching targets. Try another room, clear the search or include device settings.</p>');}

function buttonRoomOptions(selected=''){return '<option value="">All rooms</option>'+[...new Set(buttonOptions.entities.map(e=>e.area_name).filter(Boolean))].sort().map(room=>`<option value="${esc(room)}" ${room===selected?'selected':''}>${esc(room)}</option>`).join('');}

function buttonRenderShortcuts(){const rows=AL.shortcuts(buttonOptions,$('button-shortcut-room').value);$('button-shortcuts').innerHTML=rows.map(s=>`<button type="button" class="button" data-button-shortcut="${esc(s.id)}" ${!s.available||buttonDraft.actions.length>=16?'disabled':''}>${esc(s.label)}<small>${esc(s.detail)}</small></button>`).join('');}

function buttonRenderActions(){if(!buttonDraft)return;$('button-action-list').innerHTML=buttonDraft.actions.map((a,i)=>{

 const f=buttonFilters[i]||{},delay=a.action==='delay',choices=[...buttonOptions.actions,'delay'];if(!choices.includes(a.action))choices.push(a.action);

 return `<section class="auto-action"><div class="button-action-top"><h3>Action ${i+1}</h3><div>${buttonDraft.actions.length>1?`<button class="button" type="button" data-button-order="${i}" data-step="-1" aria-label="Move action ${i+1} up" ${i===0?'disabled':''}>↑</button><button class="button" type="button" data-button-order="${i}" data-step="1" aria-label="Move action ${i+1} down" ${i===buttonDraft.actions.length-1?'disabled':''}>↓</button><button class="button" type="button" data-button-remove="${i}">Remove</button>`:''}</div></div><label class="field">What to do<select aria-label="What to do for action ${i+1}" data-button-action="${i}">${choices.filter(k=>autoActions[k]).map(k=>`<option value="${k}" ${k===a.action?'selected':''}>${esc(autoActions[k][0])}</option>`).join('')}</select></label>${autoValueControl(a,i,true)}${delay?'':`<div class="auto-row"><label class="field">Room<select aria-label="Room for action ${i+1}" data-button-room="${i}">${buttonRoomOptions(f.room)}</select></label><label class="field button-target-search">Find devices, presets or scripts<input type="search" data-button-search="${i}" value="${esc(f.query||'')}" placeholder="Search by name or room…"></label></div><label class="auto-enable"><input type="checkbox" data-button-settings="${i}" ${f.settings?'checked':''}>Include device settings</label><div class="button-target-tools"><button type="button" class="button" data-button-all="${i}">Select all shown</button><button type="button" class="button" data-button-clear="${i}">Clear selection</button></div><div class="auto-targets" data-button-targets="${i}">${buttonTargets(a,i)}</div><p class="auto-count" data-button-count="${i}">${a.entities.length} selected</p><p class="subtle">${esc(a.entities.map(buttonEntityName).join(' · '))}</p>`}</section>`;

 }).join('');$('button-add-action').disabled=buttonDraft.actions.length>=16;buttonRenderShortcuts();buttonRenderRestore();}



function buttonRenderRestore(){const device=buttonCatalog.devices.find(d=>d.id===buttonDraft.device_id),press=device?.presses.find(p=>p.key===buttonDraft.press_key),section=$('button-restore-section');section.hidden=!press?.restore;if(section.hidden)return;const summary=AL.restoreSummary(buttonDraft.actions,buttonOptions.entities),reason=press.restore.available?summary.error:press.restore.reason;$('button-restore').checked=!!buttonDraft.restore_previous;$('button-restore').disabled=!!reason&&!buttonDraft.restore_previous;$('button-restore-info').textContent=reason||'Will remember: '+summary.targets.map(buttonEntityName).join(' · ');}

$('button-restore').onchange=e=>{buttonDraft.restore_previous=e.target.checked;buttonRenderRestore();};

function buttonEdit(key){const device=buttonCatalog.devices.find(d=>d.id===$('buttons-device').value),press=device?.presses.find(p=>p.key===key);if(!press)return;const assignment=press.assignments[0];if(assignment?.restore_for)return buttonEdit(assignment.restore_for);buttonEditorMode(false);buttonDraft={device_id:device.id,press_key:key,revision:press.revision,restore_previous:!!assignment?.restore_previous,restore_revision:press.restore?.revision,enabled:assignment?.enabled||false,actions:M.clone(assignment?.actions||[{action:'toggle',entities:[]}])};if(!assignment&&!buttonOptions.actions.includes('toggle'))buttonDraft.actions[0].action=buttonOptions.actions[0];buttonFilters={};$('button-shortcut-room').innerHTML=buttonRoomOptions(device.area);buttonBaseline=JSON.stringify(buttonDraft);$('button-edit-title').textContent=press.channel+' · '+press.label;$('button-edit-device').textContent=device.name;$('button-enabled').checked=buttonDraft.enabled;$('button-edit-error').textContent='';$('button-discard').hidden=true;buttonRenderActions();$('button-edit-dialog').showModal();}

function buttonClose(){if(buttonBusy)return;if(buttonDirty()){$('button-discard').hidden=false;return;}$('button-edit-dialog').close();buttonDraft=null;}

$('studio-buttons-tab').onclick=buttonsOpen;$('buttons-refresh').onclick=buttonRefresh;$('buttons-device').onchange=buttonRender;

function buttonEditorMode(native,readOnly=false){

 $('button-native-editor').hidden=!native;$('button-simple-editor').hidden=native;

 $('button-simple-editor').querySelectorAll('input,select,button').forEach(el=>el.disabled=native);

 $('button-native-name').required=native;$('button-native-config').required=native;

 $('button-native-name').disabled=!native||readOnly;$('button-native-config').disabled=!native||readOnly;

 $('button-enabled').disabled=readOnly;$('button-save').disabled=readOnly;

}

async function buttonEditAdvanced(id){

 if(buttonBusy)return;buttonBusy=true;

 try{const catalog=await haRequest('automations'),record=catalog.rules.find(r=>r.rule.id===id);if(!record)throw Error('This assignment was removed. Refresh Buttons.');

 const config=record.config||record.rule.config,readOnly=!!record.read_only||!config;

 buttonDraft={format:'ha',id,enabled:record.rule.enabled,name:record.rule.name,config_text:JSON.stringify(config||{},null,2),revision:catalog.revision,remote_revision:record.remote_revision,read_only:readOnly};buttonBaseline=JSON.stringify(buttonDraft);buttonEditorMode(true,readOnly);

 $('button-edit-title').textContent='Advanced press assignment';$('button-edit-device').textContent=record.rule.name;$('button-enabled').checked=buttonDraft.enabled;$('button-native-name').value=buttonDraft.name;$('button-native-config').value=buttonDraft.config_text;

 $('button-native-link').hidden=!record.ha_url;if(record.ha_url)$('button-native-link').href=record.ha_url;

 $('button-edit-error').textContent=record.notice||record.error||'';$('button-discard').hidden=true;$('button-edit-dialog').showModal();

 }catch(error){$('buttons-status').textContent=error.message;}finally{buttonBusy=false;}

}

$('button-native-name').oninput=e=>{if(buttonDraft?.format==='ha')buttonDraft.name=e.target.value;};

$('button-native-config').oninput=e=>{if(buttonDraft?.format==='ha')buttonDraft.config_text=e.target.value;};

$('buttons-presses').onclick=e=>{const press=e.target.closest('[data-button-press]');if(press)return buttonEdit(press.dataset.buttonPress);const advanced=e.target.closest('[data-button-advanced]');if(advanced)buttonEditAdvanced(advanced.dataset.buttonAdvanced);};



$('button-edit-close').onclick=buttonClose;$('button-edit-dialog').addEventListener('cancel',e=>{e.preventDefault();buttonClose();});$('button-discard-confirm').onclick=()=>{$('button-edit-dialog').close();buttonDraft=null;};

$('button-enabled').onchange=e=>buttonDraft.enabled=e.target.checked;

$('button-action-list').onchange=e=>{if(!buttonDraft)return;const el=e.target;

 if(el.dataset.buttonAction!==undefined){const a=buttonDraft.actions[Number(el.dataset.buttonAction)];a.action=el.value;a.entities=(a.entities||[]).filter(id=>autoTargetAllowed(a,buttonOptions.entities.find(e=>e.entity_id===id)||{entity_id:id}));delete a.value;if(a.action==='delay')a.seconds=60;else if(autoActions[a.action][2])a.value=autoActions[a.action][3];buttonRenderActions();}

 else if(el.dataset.buttonTarget){const i=Number(el.dataset.actionIndex),a=buttonDraft.actions[i];a.entities=el.checked?[...new Set([...a.entities,el.dataset.buttonTarget])]:a.entities.filter(id=>id!==el.dataset.buttonTarget);buttonRenderActions();}

 else if(el.dataset.buttonRoom!==undefined){(buttonFilters[el.dataset.buttonRoom]??={}).room=el.value;buttonRenderActions();}

 else if(el.dataset.buttonSettings!==undefined){(buttonFilters[el.dataset.buttonSettings]??={}).settings=el.checked;buttonRenderActions();}

 else if(el.dataset.buttonValue!==undefined){const a=buttonDraft.actions[Number(el.dataset.buttonValue)];a[a.action==='delay'?'seconds':'value']=autoReadValue(a,el.value);}

};

$('button-action-list').oninput=e=>{const i=e.target.dataset.buttonSearch;if(i!==undefined){(buttonFilters[i]??={}).query=e.target.value;document.querySelector(`[data-button-targets="${i}"]`).innerHTML=buttonTargets(buttonDraft.actions[Number(i)],Number(i));}if(e.target.dataset.buttonValue!==undefined){const a=buttonDraft.actions[Number(e.target.dataset.buttonValue)];a[a.action==='delay'?'seconds':'value']=autoReadValue(a,e.target.value);}};

$('button-action-list').onclick=e=>{

 const remove=e.target.closest('[data-button-remove]'),order=e.target.closest('[data-button-order]'),all=e.target.closest('[data-button-all]'),clear=e.target.closest('[data-button-clear]');

 if(remove){buttonDraft.actions.splice(Number(remove.dataset.buttonRemove),1);buttonFilters={};}

 if(order){AM.move(buttonDraft.actions,Number(order.dataset.buttonOrder),Number(order.dataset.step));buttonFilters={};}

 if(all){const i=Number(all.dataset.buttonAll),a=buttonDraft.actions[i];a.entities=[...new Set([...a.entities,...buttonRows(a,i).map(e=>e.entity_id)])];}

 if(clear)buttonDraft.actions[Number(clear.dataset.buttonClear)].entities=[];

 if(remove||order||all||clear)buttonRenderActions();

};

$('button-shortcut-room').onchange=buttonRenderShortcuts;

$('button-shortcuts').onclick=e=>{const b=e.target.closest('[data-button-shortcut]');if(!b)return;const shortcut=AL.shortcuts(buttonOptions,$('button-shortcut-room').value).find(s=>s.id===b.dataset.buttonShortcut);if(!shortcut?.available)return;const actions=buttonDraft.actions;if(actions.length===1&&actions[0].action!=='delay'&&!actions[0].entities.length)actions.splice(0,1);if(actions.length+shortcut.actions.length>16)return;actions.push(...M.clone(shortcut.actions));buttonRenderActions();};

$('button-add-action').onclick=()=>{buttonDraft.actions.push({action:buttonOptions.actions.includes('turn_on')?'turn_on':buttonOptions.actions[0],entities:[]});buttonRenderActions();};

$('button-edit-form').onsubmit=async e=>{

 e.preventDefault();if(buttonBusy||!buttonDraft||buttonDraft.read_only)return;

 let request=buttonDraft,route='buttons';

 if(buttonDraft.format==='ha'){

  let config;try{config=JSON.parse(buttonDraft.config_text);if(!config||Array.isArray(config)||typeof config!=='object')throw Error();}catch{$('button-edit-error').textContent='Enter valid HA configuration JSON. Your edits are preserved.';return;}

  route='automations';request={operation:'save',revision:buttonDraft.revision,rule:{format:'ha',id:buttonDraft.id,name:buttonDraft.name,enabled:buttonDraft.enabled,config},...(buttonDraft.remote_revision?{remote_revision:buttonDraft.remote_revision}:{})};

 }else if(buttonDraft.actions.some(a=>a.action!=='delay'&&!a.entities.length)){$('button-edit-error').textContent='Choose at least one target device for every action.';return;}

 buttonBusy=true;const controls=[...$('button-edit-form').querySelectorAll('button,input,select,textarea')],disabled=controls.map(c=>c.disabled);controls.forEach(c=>c.disabled=true);$('button-edit-error').textContent='Saving assignment to HA…';

 try{const result=await haRequest(route,request),saved=route==='automations'?result.rules.find(r=>r.rule.id===buttonDraft.id):result;

  if(route==='automations')buttonDraft.revision=result.revision;

  if(saved?.state!=='saved')throw Error(saved?.error||'HA did not confirm the save. Your draft is kept; save again to retry.');

  buttonBaseline=JSON.stringify(buttonDraft);$('button-edit-dialog').close();buttonDraft=null;toast('Button assignment saved to HA');autoReadAt=0;

  // Refresh the shared catalog revision without replacing an automation draft.

  try{autoCatalog=await haRequest('automations');autoRenderList();}catch{}

 }catch(error){$('button-edit-error').textContent=error.message;}finally{controls.forEach((c,i)=>c.disabled=disabled[i]);buttonBusy=false;if(!$('button-edit-dialog').open)await buttonRefresh();}

};



setInterval(()=>{if(!document.hidden&&!$('buttons-panel').hidden&&!$('button-edit-dialog').open)buttonRefresh();},60000);

window.addEventListener('beforeunload',e=>{if(buttonDirty()){e.preventDefault();e.returnValue='';}});

