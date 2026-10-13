/* Shared action choices and editable shortcuts for Buttons and Automations. */

(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.ActionLibrary=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){

 const actions={

  turn_on:['Turn on',['light','switch','fan','humidifier','climate','input_boolean','media_player']],

  turn_off:['Turn off',['light','switch','fan','humidifier','climate','input_boolean','media_player']],

  toggle:['Toggle on / off',['light','switch','fan','humidifier','input_boolean']],

  scene:['Apply a saved preset / scene',['scene']],script:['Run an HA script',['script']],

  brightness:['Set brightness',['light'],'Brightness (%)',75],

  open_cover:['Open curtains / cover',['cover']],close_cover:['Close curtains / cover',['cover']],stop_cover:['Stop curtains / cover',['cover']],cover_position:['Set curtain / cover position',['cover'],'Position (0 closed, 100 open)',50],

  humidity:['Set target humidity',['humidifier'],'Target humidity (%)',50],humidifier_mode:['Set dehumidifier / humidifier mode',['humidifier'],'Mode',''],

  fan_speed:['Set fan speed',['fan'],'Fan speed (%)',50],fan_preset:['Set purifier / fan preset',['fan'],'Preset',''],fan_oscillate:['Set fan oscillation',['fan'],'Oscillation',true,[[true,'On'],[false,'Off']]],

  temperature:['Set temperature',['climate'],'Target temperature',22],

  media_play:['Play media',['media_player']],media_pause:['Pause media',['media_player']],media_play_pause:['Play / pause media',['media_player']],media_stop:['Stop media',['media_player']],media_next:['Next track',['media_player']],media_previous:['Previous track',['media_player']],

  media_volume:['Set speaker / TV volume',['media_player'],'Volume (%)',25],media_mute:['Mute / unmute audio',['media_player'],'Audio',true,[[true,'Mute'],[false,'Unmute']]],media_source:['Set soundbar / TV input',['media_player'],'Input',''],media_sound_mode:['Set media player sound mode',['media_player'],'Sound mode',''],

  number_value:['Set bass / device level',['number'],'Level',0],select_option:['Set sound mode / device option',['select'],'Option',''],

  delay:['Wait',[],'Seconds',60]

 };

 const optionAttributes={select_option:'options',fan_preset:'preset_modes',humidifier_mode:'available_modes',media_source:'source_list',media_sound_mode:'sound_mode_list'};

 function allowed(a,e){return !!e&&!!actions[a.action]?.[1].includes(e.entity_id.split('.')[0])&&(!a.action.startsWith('tv_')||e.platform==='androidtv_remote')&&(!e.supported_actions||e.supported_actions.includes(a.action));}

 const domain=e=>e.entity_id.split('.')[0],text=e=>[e.name,e.device_name,e.entity_id].join(' '),normal=e=>!e.entity_category;

 const curtainPreset=e=>domain(e)==='scene'&&(String(e.attributes?.id||'').startsWith('mungoon_den_curtains_')||/curtain|blind/i.test(text(e)));

 function family(e,kind){

  if(kind==='lights')return normal(e)&&(domain(e)==='light'||domain(e)==='switch'&&/lamp|light/i.test(text(e))&&!/indicator|backlight|led|child.lock|camera|infrared|\bir[ _]lamp/i.test(text(e)));

  if(kind==='dehumidifiers')return normal(e)&&(domain(e)==='humidifier'&&(e.device_class==='dehumidifier'||/dehumid/i.test(text(e)))||['switch','fan'].includes(domain(e))&&/dehumid/i.test(text(e))&&!/lock|countdown/i.test(text(e)));

  if(kind==='purifiers')return normal(e)&&domain(e)==='fan'&&/purifier|scrubber/i.test(text(e))&&!/dehumid/i.test(text(e));

  if(kind==='curtains')return normal(e)&&domain(e)==='cover';

  return false;

 }

 function targets(options,kind,action,room=''){

  let rows=options.entities.filter(e=>family(e,kind)&&allowed({action},e)&&(!room||e.area_name===room));

  // Arete exposes both fan and dehumidifier power: choose its primary control once.

  if(kind==='dehumidifiers'){rows.sort((a,b)=>(domain(a)==='humidifier'?0:1)-(domain(b)==='humidifier'?0:1));rows=rows.filter((e,i)=>!e.device_id||rows.findIndex(x=>x.device_id===e.device_id)===i);}

  return rows;

 }

 function shortcuts(options,room=''){

  const specs=[['lights-off','Lights off','lights','turn_off'],['lights-on','Lights on','lights','turn_on'],['lights-toggle','Toggle lights','lights','toggle'],['dehumidifiers-off','Dehumidifiers off','dehumidifiers','turn_off'],['dehumidifiers-on','Dehumidifiers on','dehumidifiers','turn_on'],['purifiers-off','Air purifiers off','purifiers','turn_off'],['curtains-close','Close curtains','curtains','close_cover'],['curtains-open','Open curtains','curtains','open_cover'],['curtains-stop','Stop curtains','curtains','stop_cover']];

  const list=specs.map(([id,label,kind,action])=>{const rows=targets(options,kind,action,room);return{id,label,detail:rows.length+' device'+(rows.length===1?'':'s'),actions:[{action,entities:rows.map(e=>e.entity_id)}],available:rows.length>0};});

  for(const e of options.entities.filter(e=>curtainPreset(e)&&allowed({action:'scene'},e)))list.push({id:e.entity_id,label:e.name,detail:'Saved curtain preset · HA',actions:[{action:'scene',entities:[e.entity_id]}],available:true,preset:true});

  return list;

 }

 function choices(a,entities){const key=optionAttributes[a.action];if(!key)return null;const rows=entities.filter(e=>a.entities?.includes(e.entity_id));return rows.length?[...new Set(rows[0].attributes?.[key]||[])].filter(v=>rows.every(e=>(e.attributes?.[key]||[]).includes(v))):[];}

 function restoreSummary(steps,entities){

  const supported=['turn_on','turn_off','toggle','brightness','open_cover','close_cover','cover_position','temperature','humidity','humidifier_mode','fan_speed','fan_preset','fan_oscillate','number_value','select_option','scene','delay'],domains=['light','switch','input_boolean','cover','fan','humidifier','climate','number','select'],ids=[];

  for(const a of steps){if(!supported.includes(a.action))return {error:'Scripts, TV commands and media playback cannot reliably restore their previous state.'};

   for(const id of a.entities||[]){const e=entities.find(e=>e.entity_id===id),members=a.action==='scene'?e?.attributes?.entity_id:[id],list=typeof members==='string'?[members]:members;

    if(!list?.length)return {error:'HA does not report the devices in this preset. Previous-state restore is unavailable for it.'};

    for(const member of list){if(!domains.includes(member.split('.')[0])||!entities.some(e=>e.entity_id===member))return {error:'One of these targets cannot reliably restore its previous state.'};if(!ids.includes(member))ids.push(member);}

   }

  }

  return ids.length?{targets:ids}:{error:'Choose the devices for your actions first.'};

 }

 return {actions,allowed,shortcuts,targets,curtainPreset,optionAttributes,choices,restoreSummary};

});

