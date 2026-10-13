// Visual rules are compiled and validated by the NAS before saving in HA.

let autoCatalog={revision:null,rules:[]},autoOptions={entities:[],actions:[],timezone:''},autoRule=null,autoBaseline='',autoBusy=false,autoLoaded=false,autoMode='simple',autoRecord=null,autoRawText='',autoRawBaseline='',autoReadAt=0,autoSuggestions=[],autoSuggestionMode='templates';

const AM=window.AutomationModel;

const AL=window.ActionLibrary,autoActions=AL.actions;

// Android TV actions are shared by Easy Automations and Easy Buttons.

const tvCommandLabels=[['DPAD_UP','Up'],['DPAD_DOWN','Down'],['DPAD_LEFT','Left'],['DPAD_RIGHT','Right'],['DPAD_CENTER','OK / Select'],['HOME','Home'],['BACK','Back'],['MENU','Menu'],['VOLUME_UP','Volume up'],['VOLUME_DOWN','Volume down'],['VOLUME_MUTE','Mute / Unmute'],['MEDIA_PLAY_PAUSE','Play / Pause'],['MEDIA_PLAY','Play'],['MEDIA_PAUSE','Pause'],['MEDIA_STOP','Stop'],['MEDIA_NEXT','Next'],['MEDIA_PREVIOUS','Previous'],['MEDIA_REWIND','Rewind'],['MEDIA_FAST_FORWARD','Fast forward']];

Object.assign(autoActions,{tv_command:['Android TV · Remote button',['remote'],'Remote button','DPAD_CENTER',tvCommandLabels],tv_on:['Android TV · Turn on',['remote']],tv_off:['Android TV · Turn off',['remote']]});

// BEGIN SOUNDBAR ACTIONS

Object.assign(autoActions,{number_value:['Set bass / device level',['number'],'Level',0],select_option:['Set sound mode / device option',['select'],'Option','']});

// END SOUNDBAR ACTIONS

const autoTargetAllowed=AL.allowed;

const tvSetupHelp='<p class="auto-empty">No paired Android TV remotes match. Pair Android TV Remote in <a href="https://example.invalid/config/integrations/dashboard" target="_blank" rel="noopener">HA integrations</a>, then Refresh from HA.</p>';

function autoValueControl(a,index,button=false){

 const meta=autoActions[a.action],delay=a.action==='delay',attr=button?'data-button-value':'data-action-value';if(!meta[2])return '';

 const value=delay?a.seconds??60:a.value??meta[3],entities=(button?buttonOptions:autoOptions).entities,targets=entities.filter(e=>a.entities?.includes(e.entity_id)),level=a.action==='number_value',humidity=a.action==='humidity';let options=meta[4];

 if(AL.optionAttributes[a.action]){const values=AL.choices(a,entities);options=[['',targets.length?'Choose an option…':'Choose target devices first…'],...values.map(v=>[v,v])];if(value&&!values.includes(value))options.push([value,value+' (not available for selected devices)']);}

 const low=level&&targets.length?Math.max(...targets.map(e=>e.attributes?.min??-100000)):humidity&&targets.length?Math.max(...targets.map(e=>e.attributes?.min_humidity??0)):delay?1:a.action==='temperature'?-50:level?-100000:0;

 const high=level&&targets.length?Math.min(...targets.map(e=>e.attributes?.max??100000)):humidity&&targets.length?Math.min(...targets.map(e=>e.attributes?.max_humidity??100)):delay?86400:level?100000:100;

 return `<label class="field" data-setting-value="${index}">${esc(meta[2])}${options?`<select aria-label="${esc(meta[2])} for action ${index+1}" ${attr}="${index}" required>${options.map(([v,n])=>`<option value="${esc(v)}" ${v===value?'selected':''}>${esc(n)}</option>`).join('')}</select>`:`<input ${attr}="${index}" type="number" step="${humidity?1:level&&targets.length===1?esc(targets[0].attributes?.step||'any'):'any'}" min="${low}" max="${high}" required value="${esc(value)}">`}</label>`;

}

function autoReadValue(a,value){if(['fan_oscillate','media_mute'].includes(a.action))return value==='true';return AL.optionAttributes[a.action]||autoActions[a.action][4]?value:value===''?null:Number(value);}



const autoEntity=id=>autoOptions.entities.find(e=>e.entity_id===id),autoEntityName=id=>autoEntity(id)?.name||id||'Choose a device';

const autoDirty=()=>!!autoRule&&(JSON.stringify(autoRule)!==autoBaseline||(autoRule.format==='ha'&&autoRawText!==autoRawBaseline));

const autoId=()=>'mungoon_fp_'+crypto.randomUUID().replaceAll('-','');

function autoSetError(message){$('auto-error').textContent=message;$('auto-error').hidden=!message;}

async function autoCanLeave(){if(!autoDirty())return true;const dialog=$('auto-discard-dialog');dialog.returnValue='keep';dialog.showModal();return new Promise(resolve=>dialog.addEventListener('close',()=>resolve(dialog.returnValue==='discard'),{once:true}));}

$('auto-keep-editing').onclick=()=>$('auto-discard-dialog').close('keep');$('auto-confirm-discard').onclick=()=>$('auto-discard-dialog').close('discard');

function autoClause(kind='state'){return kind==='time'?{kind,at:'18:00',after:'18:00',before:'23:00'}:kind==='sun'?{kind,event:'sunset',offset_minutes:0}:kind==='weekday'?{kind,days:['mon','tue','wed','thu','fri']}:{kind,entity_id:'',state:'on',operator:'above',value:60,seconds:0};}

function autoSelect(rule,isNew=false){autoRule=AM.normalize(rule);autoRecord=isNew?null:autoCatalog.rules.find(r=>r.rule.id===rule.id);autoRawText=JSON.stringify(autoRule.config||{},null,2);autoRawBaseline=autoRawText;autoBaseline=isNew?'':JSON.stringify(autoRule);autoMode=AM.advanced(autoRule)?'advanced':'simple';$('automations-dialog').classList.remove('show-list');autoSetError('');autoRender();}

async function autoNew(){if(!await autoCanLeave())return;autoSelect({id:autoId(),name:'',enabled:false,triggers:[autoClause('time')],conditions:[],actions:[{action:'turn_on',entities:[]}]},true);$('auto-name').focus();}

function autoDuplicate(){if(!autoRule)return;const source=M.clone(autoRule);if(source.format==='ha'){try{source.config=JSON.parse(autoRawText);if(!source.config||Array.isArray(source.config)||typeof source.config!=='object')throw Error();}catch{autoSetError('Fix the configuration JSON before duplicating. Your edits are preserved.');return;}}autoSelect(AM.duplicate(source,autoId()),true);$('auto-name').focus();toast('Copy created, paused and ready to edit');}

function autoAllowedEntities(c){return autoOptions.entities.filter(e=>c.kind==='numeric'?['sensor','number','input_number'].includes(e.entity_id.split('.')[0]):['sensor','binary_sensor','switch','light','fan','climate','cover','media_player','person','device_tracker','input_boolean','input_select','select'].includes(e.entity_id.split('.')[0]));}

function autoEntityOptions(c,filter=''){const rows=autoAllowedEntities(c).filter(e=>e.entity_id===c.entity_id||`${e.name} ${e.entity_id} ${e.unit}`.toLowerCase().includes(filter.toLowerCase()));return '<option value="">Choose a device or sensor…</option>'+rows.map(e=>`<option value="${esc(e.entity_id)}" ${e.entity_id===c.entity_id?'selected':''}>${esc(e.name)}${e.unit?' · '+esc(e.unit):''}</option>`).join('');}

function autoStateOptions(c){const e=autoEntity(c.entity_id),domain=e?.entity_id.split('.')[0];let states=[['on','On'],['off','Off']];if(domain==='binary_sensor'){const dc=e.device_class;states=['motion','occupancy','presence'].includes(dc)?[['on','Detected'],['off','Clear']]:['door','window','opening','garage_door'].includes(dc)?[['on','Open'],['off','Closed']]:[['on','Active / detected'],['off','Inactive / clear']];}else if(['person','device_tracker'].includes(domain))states=[['home','Home'],['not_home','Away']];else if(domain==='cover')states=[['open','Open'],['closed','Closed'],['opening','Opening'],['closing','Closing']];else if(domain==='media_player')states=[['playing','Playing'],['paused','Paused'],['idle','Idle'],['off','Off']];if(e?.state&&!['unknown','unavailable'].includes(e.state)&&!states.some(s=>s[0]===e.state))states.push([e.state,e.state]);if(c.state&&!states.some(s=>s[0]===c.state))states.push([c.state,c.state]);return states.map(([v,n])=>`<option value="${esc(v)}" ${v===c.state?'selected':''}>${esc(n)}</option>`).join('');}

function autoClauseMarkup(c,index,trigger=false){const scope=(trigger?'t':'c')+index,field=key=>`data-auto-clause="${scope}" data-clause-field="${key}"`,kinds=trigger?[['state','A device changes state'],['numeric','A sensor crosses a threshold'],['time','At a time'],['sun','At sunrise or sunset']]:[['state','A device is in a state'],['numeric','A sensor is above / below'],['time','Within a time window'],...(autoMode==='advanced'?[['weekday','On selected weekdays']]:[])];let out=`<div class="auto-clause" data-clause="${scope}"><label class="field">${trigger?'Trigger '+(index+1):'Condition '+(index+1)}<select ${field('kind')}>${kinds.map(([v,n])=>`<option value="${v}" ${v===c.kind?'selected':''}>${n}</option>`).join('')}</select></label>`;

 if(['state','numeric'].includes(c.kind)){out+=`<label class="field">Find a device or sensor<input type="search" data-clause-search="${scope}" placeholder="Search by name…"></label><label class="field">Device / sensor<select ${field('entity_id')} required>${autoEntityOptions(c)}</select></label>`;if(c.kind==='state')out+=`<label class="field">${trigger?'Becomes':'Is'}<select ${field('state')}>${autoStateOptions(c)}</select></label>`;else out+=`<div class="auto-row"><label class="field">Reading is<select ${field('operator')}><option value="above" ${c.operator==='above'?'selected':''}>Above</option><option value="below" ${c.operator==='below'?'selected':''}>Below</option></select></label><label class="field">Threshold ${esc(autoEntity(c.entity_id)?.unit||'')}<input ${field('value')} type="number" required step="any" value="${c.value??''}"></label></div>`;if(trigger)out+=`<label class="field">For at least (seconds, 0 = immediately)<input ${field('seconds')} type="number" min="0" max="86400" required value="${c.seconds||0}"></label>`;}

 if(c.kind==='time')out+=trigger?`<label class="field">Time<input ${field('at')} type="time" required value="${c.at}"></label>`:`<div class="auto-row"><label class="field">After<input ${field('after')} type="time" required value="${c.after}"></label><label class="field">Before<input ${field('before')} type="time" required value="${c.before}"></label></div>`;

 if(c.kind==='sun')out+=`<label class="field">Sun event<select ${field('event')}><option value="sunset" ${c.event==='sunset'?'selected':''}>Sunset</option><option value="sunrise" ${c.event==='sunrise'?'selected':''}>Sunrise</option></select></label><label class="field auto-advanced-only">Offset (minutes, negative = before)<input ${field('offset_minutes')} type="number" min="-720" max="720" value="${c.offset_minutes||0}"></label>`;

 if(c.kind==='weekday')out+=`<fieldset class="auto-weekdays"><legend>Days of the week</legend>${[['mon','Mon'],['tue','Tue'],['wed','Wed'],['thu','Thu'],['fri','Fri'],['sat','Sat'],['sun','Sun']].map(([id,name])=>`<label><input type="checkbox" data-auto-day="${scope}" value="${id}" ${c.days.includes(id)?'checked':''}>${name}</label>`).join('')}</fieldset>`;

 if(!trigger||autoRule.triggers.length>1)out+=`<button class="button auto-remove" type="button" data-remove-clause="${scope}">Remove ${trigger?'trigger':'condition'}</button>`;return out+'</div>';}

function autoTargetMarkup(a,index,filter=''){const domains=autoActions[a.action][1],rows=autoOptions.entities.filter(e=>autoTargetAllowed(a,e)&&`${e.name} ${e.entity_id}`.toLowerCase().includes(filter.toLowerCase()));return rows.map(e=>{const registry=haData.entities.find(r=>r.entity_id===e.entity_id),device=haData.devices.find(d=>d.id===registry?.device_id),area=haData.areas.find(r=>r.area_id===(registry?.area_id||device?.area_id));return `<label class="auto-target"><input type="checkbox" data-action-target="${index}" value="${esc(e.entity_id)}" ${a.entities.includes(e.entity_id)?'checked':''}><span>${esc(e.name)}<small>${esc([area?.name,e.state].filter(Boolean).join(' · '))}</small></span></label>`;}).join('')||(a.action.startsWith('tv_')?tvSetupHelp:'<p class="auto-empty">No matching devices for this action.</p>');}

function autoActionMarkup(a,index){const meta=autoActions[a.action],delay=a.action==='delay';return `<div class="auto-action"><div class="auto-action-heading"><b>Step ${index+1}</b><div class="auto-step-controls">${autoRule.actions.length>1?`<button class="button" type="button" data-action-move="${index}" data-step="-1" aria-label="Move step ${index+1} up" ${index===0?'disabled':''}>↑</button><button class="button" type="button" data-action-move="${index}" data-step="1" aria-label="Move step ${index+1} down" ${index===autoRule.actions.length-1?'disabled':''}>↓</button><button class="button auto-remove" type="button" data-remove-action="${index}">Remove step</button>`:''}</div></div><label class="field">What to do<select data-action-kind="${index}">${Object.entries(autoActions).filter(([k])=>autoOptions.actions.includes(k)||k==='delay'&&autoMode==='advanced').map(([k,m])=>`<option value="${k}" ${k===a.action?'selected':''}>${m[0]}</option>`).join('')}</select></label>${autoValueControl(a,index)}${delay?'':`<label class="field">Which devices<input type="search" data-target-search="${index}" placeholder="Search devices…"></label><p class="auto-count" id="auto-count-${index}">${a.entities.length} selected</p><div class="auto-targets" id="auto-targets-${index}">${autoTargetMarkup(a,index)}</div>`}</div>`;}

function autoDescribe(c,trigger=false){const name=autoEntityName(c.entity_id);if(c.kind==='time')return trigger?'at '+c.at:'the time is between '+c.after+' and '+c.before;if(c.kind==='sun')return 'at '+c.event+(c.offset_minutes?' ('+c.offset_minutes+' min)':'');if(c.kind==='weekday')return 'on '+c.days.join(', ');if(c.kind==='numeric')return name+' '+(trigger?'crosses ':'is ')+c.operator+' '+c.value+' '+(autoEntity(c.entity_id)?.unit||'');return name+' '+(trigger?'becomes ':'is ')+c.state+(c.seconds?' for '+c.seconds+' seconds':'');}

function autoSummary(){if(!autoRule)return;const r=autoRule;if(r.format==='ha'){$('auto-summary').textContent='The full HA configuration will be saved with this name. '+(r.enabled?'Enabled after saving.':'Saved paused.');$('auto-timezone').textContent=autoRecord?.notice||'HA validates the configuration before applying it.';}else{const actions=r.actions.map(a=>a.action==='delay'?'Wait '+a.seconds+' seconds':autoActions[a.action][0]+(autoActions[a.action][2]?' to '+(a.value??autoActions[a.action][3]):'')+' → '+(a.entities.length?a.entities.map(autoEntityName).join(', '):'choose devices'));$('auto-summary').textContent='When '+r.triggers.map(c=>autoDescribe(c,true)).join(' OR ')+(r.conditions.length?', only if '+r.conditions.map(c=>autoDescribe(c)).join(r.condition_mode==='any'?' OR ':' AND '):'')+', '+actions.join('; then ')+'. '+(r.enabled?'Enabled after saving.':'Saved paused.');$('auto-timezone').textContent='Times use '+autoOptions.timezone+'. Sensor thresholds trigger when the reading crosses the limit.';}$('auto-draft-status').textContent=autoDirty()?'Unsaved edits':'All edits saved';$('auto-revert').disabled=!autoDirty();}

function autoRenderSuggestions(){

 const templates=autoSuggestionMode==='templates',category=$('auto-template-category').value,catalog={...autoCatalog,rules:AM.automationRows(autoCatalog)};

 autoSuggestions=templates?AM.templates(autoOptions,catalog).filter(s=>!category||s.category===category):AM.suggestions(autoOptions,catalog);

 $('auto-template-tab').setAttribute('aria-pressed',String(templates));$('auto-home-tab').setAttribute('aria-pressed',String(!templates));$('auto-category-field').hidden=!templates;

 $('auto-template-help').textContent=templates?'Ready-made routines with editable settings. Matching devices are preselected where possible; missing choices are marked.':'Suggestions matched to your currently available devices and rooms.';

 $('auto-suggestions').innerHTML=autoSuggestions.map((s,i)=>`<article class="auto-suggestion"><div class="auto-template-meta"><span>${esc(s.category||'Matched to your home')}</span><span>${AM.advanced(s.rule)?'Advanced':'Simple'}</span></div><h3>${esc(s.rule.name)}</h3><p>${esc(s.reason)}</p><p class="subtle">${s.devices.length?esc([...new Set(s.devices)].join(' · ')):'Choose your devices in the editor.'}</p>${s.missing?.length?`<p class="auto-template-missing">${esc(s.missing.join(' · '))}</p>`:''}${s.supported===false?'<p class="auto-template-missing">The required action is not available in HA yet.</p>':''}${s.overlaps.length?`<p class="auto-overlap">Uses devices already in: ${esc(s.overlaps.join(', '))}. Check for conflicting actions or schedules.</p>`:''}<button class="button primary" data-auto-suggestion="${i}" type="button" ${s.supported===false?'disabled':''}>${templates?'Use template':'Review paused draft'}</button></article>`).join('')||'<p>No matched suggestions yet. Choose Templates for routines you can configure yourself.</p>';

}

function autoRenderList(){

 const all=AM.automationRows(autoCatalog),buttons=autoCatalog.rules.length-all.length,q=$('auto-library-search').value.toLowerCase(),rows=all.filter(({rule:r,entity_id})=>(r.name+' '+(entity_id||'')).toLowerCase().includes(q));

 $('auto-library-count').textContent=all.length+' automation'+(all.length===1?'':'s')+' · HA + Studio';$('auto-button-count').textContent=buttons?buttons+' button assignment'+(buttons===1?' is':'s are')+' in the Buttons tab.':'Manage press assignments in the Buttons tab.';

 $('auto-list').innerHTML=rows.length?rows.map(({rule:original,state,error,source,last_triggered,notice,read_only})=>{const r=AM.normalize(original);return `<button class="auto-rule ${autoRule?.id===r.id?'active':''}" data-auto-edit="${esc(r.id)}" type="button"><b>${esc(r.name)}</b><small>${state==='saved'?(r.enabled?'Enabled':'Paused'):state==='error'?'Needs attention':'Save pending'} · ${source==='ha'?'From HA':'Studio'}${read_only?' · View in HA':''}<br>${r.format==='ha'?'Full HA configuration':esc(r.triggers.map(c=>autoDescribe(c,true)).join(' or '))}${last_triggered?'<br>Last run: '+esc(new Date(last_triggered).toLocaleString()):'<br>Never triggered'}${error?'<br>'+esc(error):''}</small></button>`;}).join(''):'<p class="auto-empty">'+(q?'No matching automations.':'No saved automations here yet. Choose a template to get started.')+'</p>';

}



function autoRender(){autoRenderList();$('auto-form').hidden=!autoRule;$('auto-welcome').hidden=!!autoRule;autoRenderSuggestions();if(!autoRule){$('auto-draft-status').textContent='';return;}const r=autoRule,native=r.format==='ha',readOnly=!!autoRecord?.read_only;

 $('auto-native-editor').hidden=!native;$('auto-visual-editor').hidden=native;$('auto-visual-editor').querySelectorAll('input,select,textarea,button').forEach(el=>el.disabled=native);$('auto-name').disabled=readOnly;$('auto-enabled').disabled=readOnly;$('auto-native-config').disabled=readOnly;$('auto-save').disabled=readOnly;$('auto-duplicate').disabled=native&&!Object.keys(r.config||{}).length;$('auto-native-link').hidden=!autoRecord?.ha_url;if(autoRecord?.ha_url)$('auto-native-link').href=autoRecord.ha_url;$('auto-source-note').textContent=autoRecord?.notice||(autoRecord?.source==='ha'?'Loaded directly from Home Assistant. Changes made in HA are checked again before saving.':'');$('auto-simple').disabled=native;$('auto-advanced').disabled=native;

 if(native){$('automations-dialog').classList.remove('simple-mode');$('auto-simple').classList.remove('active');$('auto-advanced').classList.add('active');$('auto-simple').setAttribute('aria-pressed','false');$('auto-advanced').setAttribute('aria-pressed','true');$('auto-mode-help').textContent='HA configuration mode preserves every trigger, condition and action.';$('auto-name').value=r.name;$('auto-enabled').checked=r.enabled;$('auto-native-config').value=autoRawText;autoSummary();return;}

 $('automations-dialog').classList.toggle('simple-mode',autoMode==='simple');$('auto-simple').classList.toggle('active',autoMode==='simple');$('auto-advanced').classList.toggle('active',autoMode==='advanced');$('auto-simple').setAttribute('aria-pressed',String(autoMode==='simple'));$('auto-advanced').setAttribute('aria-pressed',String(autoMode==='advanced'));$('auto-mode-help').textContent=autoMode==='simple'?'One trigger, an optional condition, and one action for any number of devices.':'Combine triggers and conditions, order actions, add delays, and choose how repeated triggers run.';

 $('auto-name').value=r.name;$('auto-enabled').checked=r.enabled;$('auto-description').value=r.description;$('auto-condition-mode').value=r.condition_mode;$('auto-run-mode').value=r.mode;$('auto-max-runs').value=r.max_runs;$('auto-max-field').hidden=!['queued','parallel'].includes(r.mode);$('auto-max-runs').disabled=$('auto-max-field').hidden;

 $('auto-trigger').innerHTML=r.triggers.map((c,i)=>autoClauseMarkup(c,i,true)).join('');$('auto-conditions').innerHTML=r.conditions.map((c,i)=>autoClauseMarkup(c,i)).join('');$('auto-actions').innerHTML=r.actions.map(autoActionMarkup).join('');$('auto-add-trigger').disabled=r.triggers.length>=8;$('auto-add-condition').disabled=r.conditions.length>=(autoMode==='simple'?1:8);$('auto-add-action').disabled=r.actions.length>=16;$('auto-add-delay').disabled=r.actions.length>=16;autoSummary();}

async function autoRefresh(silent=false){if(autoBusy||silent&&autoDirty()||!silent&&!await autoCanLeave())return;const showingList=$('automations-dialog').classList.contains('show-list');autoBusy=true;if(!silent)$('auto-status').textContent='Reading all HA automations and devices…';$('auto-refresh').disabled=true;try{const [catalog,options]=await Promise.all([haRequest('automations'),haRequest('automation-options')]);autoCatalog=catalog;autoOptions=options;autoLoaded=true;autoReadAt=Date.now();const saved=AM.automationRows(autoCatalog).find(r=>r.rule.id===autoRule?.id);if(saved)autoSelect(saved.rule);else{autoRule=null;autoRecord=null;autoBaseline='';}$('auto-status').textContent='Connected to Home Assistant · '+AM.automationRows(catalog).length+' automations · '+options.timezone+' · Refreshed '+new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});autoRender();$('automations-dialog').classList.toggle('show-list',showingList);}catch(e){$('auto-status').textContent='Refresh failed: '+e.message;if(!autoLoaded)$('auto-new').disabled=true;}finally{autoBusy=false;$('auto-refresh').disabled=false;$('auto-new').disabled=!autoLoaded;}}



function autoPage(open){studioPage(open?'automations':'floor');}

async function autoOpen(){if(autoHashTimer){clearInterval(autoHashTimer);autoHashTimer=null;}autoPage(true);if(!haOwner){$('auto-status').textContent='Sign in as the project owner and connect HA to create automations.';$('auto-new').disabled=true;return;}if(!autoLoaded||!autoDirty()&&Date.now()-autoReadAt>5000)await autoRefresh(true);}



$('open-automations').onclick=autoOpen;$('studio-automations-tab').onclick=autoOpen;$('studio-floor-tab').onclick=$('auto-close').onclick=()=>autoPage(false);$('auto-new').onclick=autoNew;$('auto-refresh').onclick=()=>autoRefresh(false);$('auto-list-toggle').onclick=()=>$('automations-dialog').classList.toggle('show-list');$('auto-library-search').oninput=autoRenderList;$('auto-duplicate').onclick=autoDuplicate;

$('auto-simple').onclick=()=>{if(AM.advanced(autoRule)){autoSetError('This automation uses advanced options. Remove extra triggers, conditions, delays or execution options before switching to Simple. Your work is preserved.');return;}autoMode='simple';autoSetError('');autoRender();};$('auto-advanced').onclick=()=>{autoMode='advanced';autoSetError('');autoRender();};

$('auto-revert').onclick=async()=>{if(!await autoCanLeave())return;const saved=autoCatalog.rules.find(r=>r.rule.id===autoRule.id);if(saved)autoSelect(saved.rule);else{autoRule=null;autoBaseline='';autoRender();}};

$('auto-list').onclick=async e=>{const b=e.target.closest('[data-auto-edit]');if(!b||!await autoCanLeave())return;autoSelect(autoCatalog.rules.find(r=>r.rule.id===b.dataset.autoEdit).rule);};

$('auto-add-trigger').onclick=()=>{autoRule.triggers.push(autoClause('time'));autoRender();};$('auto-add-condition').onclick=()=>{autoRule.conditions.push(autoClause());autoRender();};$('auto-add-action').onclick=()=>{autoRule.actions.push({action:'turn_on',entities:[]});autoRender();};$('auto-add-delay').onclick=()=>{autoRule.actions.push({action:'delay',seconds:60});autoRender();};

const autoScope=scope=>({list:scope[0]==='t'?autoRule.triggers:autoRule.conditions,index:Number(scope.slice(1))});

$('auto-form').addEventListener('click',e=>{const c=e.target.closest('[data-remove-clause]'),a=e.target.closest('[data-remove-action]'),m=e.target.closest('[data-action-move]');if(c){const s=autoScope(c.dataset.removeClause);s.list.splice(s.index,1);autoRender();}if(a){autoRule.actions.splice(Number(a.dataset.removeAction),1);autoRender();}if(m){AM.move(autoRule.actions,Number(m.dataset.actionMove),Number(m.dataset.step));autoRender();}});

function autoInput(e){if(!autoRule)return;const el=e.target,d=el.dataset;

 if(el.id==='auto-native-config'){autoRawText=el.value;autoSummary();return;}if(el.id==='auto-name')autoRule.name=el.value;if(el.id==='auto-enabled')autoRule.enabled=el.checked;if(el.id==='auto-description')autoRule.description=el.value;if(el.id==='auto-condition-mode')autoRule.condition_mode=el.value;if(el.id==='auto-max-runs')autoRule.max_runs=Number(el.value);if(el.id==='auto-run-mode'){autoRule.mode=el.value;$('auto-max-field').hidden=!['queued','parallel'].includes(el.value);$('auto-max-runs').disabled=$('auto-max-field').hidden;}

 if(d.clauseSearch!==undefined){const s=autoScope(d.clauseSearch);$('auto-form').querySelector(`[data-auto-clause="${d.clauseSearch}"][data-clause-field="entity_id"]`).innerHTML=autoEntityOptions(s.list[s.index],el.value);return;}

 if(d.targetSearch!==undefined){$('auto-targets-'+d.targetSearch).innerHTML=autoTargetMarkup(autoRule.actions[Number(d.targetSearch)],Number(d.targetSearch),el.value);return;}

 if(d.autoClause!==undefined){const s=autoScope(d.autoClause),c=s.list[s.index],f=d.clauseField;if(f==='kind'){s.list[s.index]=autoClause(el.value);autoRender();}else{c[f]=['value','seconds','offset_minutes'].includes(f)?(el.value===''?null:Number(el.value)):el.value;if(f==='entity_id'){const domain=c.entity_id.split('.')[0];c.state=domain==='cover'?'open':['person','device_tracker'].includes(domain)?'home':domain==='media_player'?'playing':'on';const state=$('auto-form').querySelector(`[data-auto-clause="${d.autoClause}"][data-clause-field="state"]`);if(state)state.innerHTML=autoStateOptions(c);}}}

 if(d.autoDay!==undefined){const s=autoScope(d.autoDay),c=s.list[s.index];c.days=c.days.filter(day=>day!==el.value);if(el.checked)c.days.push(el.value);}

 if(d.actionKind!==undefined){const a=autoRule.actions[Number(d.actionKind)];a.action=el.value;a.entities=(a.entities||[]).filter(id=>autoTargetAllowed(a,autoEntity(id)||{entity_id:id}));if(a.action==='delay'){a.seconds=60;delete a.value;}else if(autoActions[a.action][2])a.value=autoActions[a.action][3];else delete a.value;autoRender();}

 if(d.actionValue!==undefined){const a=autoRule.actions[Number(d.actionValue)];a[a.action==='delay'?'seconds':'value']=autoReadValue(a,el.value);}

 if(d.actionTarget!==undefined){const a=autoRule.actions[Number(d.actionTarget)];a.entities=a.entities.filter(id=>id!==el.value);if(el.checked)a.entities.push(el.value);$('auto-count-'+d.actionTarget).textContent=a.entities.length+' selected';if(AL.optionAttributes[a.action]||['number_value','humidity'].includes(a.action))el.closest('.auto-action').querySelector('[data-setting-value]').outerHTML=autoValueControl(a,Number(d.actionTarget));}autoSummary();

}

$('auto-form').addEventListener('input',autoInput);

$('auto-form').onsubmit=async e=>{e.preventDefault();if(autoBusy||!autoLoaded||autoRecord?.read_only)return;autoSetError('');const submitted=M.clone(autoRule);if(submitted.format==='ha'){try{submitted.config=JSON.parse(autoRawText);if(!submitted.config||Array.isArray(submitted.config)||typeof submitted.config!=='object')throw Error();}catch{autoSetError('Enter valid JSON for the HA configuration. Your edits are preserved.');return;}}else if(submitted.actions.some(a=>a.action!=='delay'&&!a.entities.length)){autoSetError('Choose at least one device for every action.');return;}autoBusy=true;$('auto-form').inert=true;$('auto-new').disabled=true;$('auto-refresh').disabled=true;$('auto-save').disabled=true;try{const result=await haRequest('automations',{operation:'save',revision:autoCatalog.revision,rule:submitted,...(autoRecord?.remote_revision?{remote_revision:autoRecord.remote_revision}:{})});const record=result.rules.find(r=>r.rule.id===submitted.id);autoCatalog.revision=result.revision;autoCatalog.rules=autoCatalog.rules.filter(r=>r.rule.id!==submitted.id);if(record)autoCatalog.rules.push(record);if(record?.state==='saved'){try{autoCatalog=await haRequest('automations');}catch{}autoSelect(submitted);$('auto-status').textContent='Saved in Home Assistant · '+(submitted.enabled?'Enabled':'Paused');toast('Automation saved to HA');}else autoSetError(record?.error||'HA has not confirmed this automation. Save again to retry.');autoRender();}catch(error){autoSetError(error.message);}finally{autoBusy=false;$('auto-form').inert=false;$('auto-new').disabled=false;$('auto-refresh').disabled=false;$('auto-save').disabled=!!autoRecord?.read_only;}};

$('auto-open-buttons').onclick=e=>{e.preventDefault();buttonsOpen();};

$('auto-template-tab').onclick=()=>{autoSuggestionMode='templates';autoRenderSuggestions();};$('auto-home-tab').onclick=()=>{autoSuggestionMode='home';autoRenderSuggestions();};$('auto-template-category').onchange=autoRenderSuggestions;

$('auto-show-suggestions').onclick=async()=>{if(!await autoCanLeave())return;autoRule=null;autoRecord=null;autoBaseline='';$('automations-dialog').classList.remove('show-list');$('auto-status').textContent='Choose a template or a suggestion · New drafts start paused';autoRender();};

$('auto-suggestions').onclick=async e=>{const b=e.target.closest('[data-auto-suggestion]');if(!b||!await autoCanLeave())return;const suggestion=autoSuggestions[Number(b.dataset.autoSuggestion)];autoSelect({...M.clone(suggestion.rule),id:autoId()},true);$('auto-status').textContent=(autoSuggestionMode==='templates'?'Template':'Suggested')+' draft · Review devices and values before saving · Paused';$('auto-name').focus();};

setInterval(()=>{if(!document.hidden&&!$('automations-dialog').hidden&&autoLoaded&&!autoBusy&&!autoDirty()&&!document.activeElement?.closest('#auto-form'))autoRefresh(true);},30000);



window.addEventListener('beforeunload',e=>{if(autoDirty()){e.preventDefault();e.returnValue='';}});

// HA owner status arrives asynchronously after the NAS draft loads.

let autoHashTimer=null;

