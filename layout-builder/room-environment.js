/* Room conditions: registry references in config, live readings from HA. */

(()=>{'use strict';

const METRICS={temperature:['Temperature','mdi:thermometer'],humidity:['Humidity','mdi:water-percent'],air_quality:['Air quality','mdi:air-filter'],pm25:['PM2.5','mdi:blur'],carbon_dioxide:['CO₂','mdi:molecule-co2'],aqi:['Air quality index','mdi:air-filter'],pm10:['PM10','mdi:blur'],volatile_organic_compounds:['VOC','mdi:air-filter'],volatile_organic_compounds_parts:['VOC (parts)','mdi:air-filter'],illuminance:['Light level','mdi:brightness-6']};

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

const special=s=>/bathroom|\bwc\b|filament|fridge|freezer|aquarium|soil|plant/i.test(s.source||'');

function reading(sensor,states,locale='en'){

 const state=states?.[sensor.entity_id],raw=state?.state,unit=state?.attributes?.unit_of_measurement??sensor.unit??'';

 const available=raw!==undefined&&!['unavailable','unknown','none',''].includes(raw)&&raw!==null;

 let value=available?String(raw).replace(/_/g,' '):raw==='unknown'?'Unknown':'Unavailable';

 if(available&&Number.isFinite(Number(raw)))value=new Intl.NumberFormat(locale,{maximumFractionDigits:1}).format(Number(raw));

 else if(available)value=value.charAt(0).toUpperCase()+value.slice(1);

 return {...sensor,available,value,unit:available?unit:'',label:METRICS[sensor.metric]?.[0]||sensor.metric,icon:METRICS[sensor.metric]?.[1]||'mdi:gauge'};

}

function summary(sensors,states,locale){

 return Object.keys(METRICS).flatMap(metric=>{

  const choices=sensors.filter(s=>s.metric===metric).map(s=>reading(s,states,locale));

  // Preserve the backend's direct-integration preference; never average sources.

  choices.sort((a,b)=>Number(b.available)-Number(a.available));

  return choices.length?[choices[0]]:[];

 });

}



const PIN_STYLE=` .environment-pins{position:absolute;inset:0;pointer-events:none}.environment-pin{position:absolute;transform:translate(-50%,-50%);pointer-events:auto;touch-action:none;min-height:44px;border:1px solid #527b7e;border-radius:9px;padding:5px 6px;background:#10272bec;color:#e5f5f1;text-align:center;cursor:pointer;box-shadow:0 2px 7px #0005;font:inherit;line-height:1.25}.environment-pin[data-compact="true"]{min-height:0;padding:3px;border-radius:5px}.environment-pin[data-compact="true"] strong{font-size:var(--room-font)}.environment-pin[data-compact="true"] .mini-values{font-size:calc(var(--room-font) + 1px);margin-top:2px}.environment-pin[data-compact="true"] small{display:none}.environment-pin[data-compact="true"] .mini-values{display:grid;gap:1px}.environment-pin .mini-reading{white-space:nowrap}.environment-pin .mini-reading+.mini-reading:before{content:" · "}.environment-pin[data-compact="true"] .mini-reading+.mini-reading:before{content:none}.environment-pin[data-compact="true"][data-empty="true"] .mini-values{font-size:var(--room-font)}.environment-pin strong{display:block;font-size:11px;font-weight:600;overflow-wrap:anywhere}.environment-pin .mini-values{display:block;color:#97e4d6;font-size:13px;font-weight:650;margin-top:3px}.environment-pin small{display:block;font-size:9px;color:#bdd0d0;margin-top:2px}.environment-pin:hover,.environment-pin:focus-visible{outline:2px solid #8ee6d4;background:#15383e}.environment-pin[hidden]{display:none}.environment-pin[data-empty="true"]{border-color:#40585f;background:#17272ce8}.environment-pin[data-empty="true"] .mini-values{color:#a4b8bd;font-size:10px;font-weight:400}`;

function tileSettings(room){return {visible:true,width:190,color:'#10272b',metrics:['temperature','humidity'],...room.room_tile};}

function tileReadings(room,values){const settings=tileSettings(room),rows=values.filter(r=>settings.metrics.includes(r.metric));return rows.length?rows:values.slice(0,1);}

function pinMarkup(room,values){const settings=tileSettings(room),name=settings.title||room.ha_name||room.name,tiny=tileReadings(room,values),sources=[...new Set(tiny.filter(special).map(s=>s.source.replace((room.ha_name||room.name)+' · ','')))];return `<strong>${esc(name)}</strong><span class="mini-values">${tiny.length?tiny.map(r=>`<span class="mini-reading" data-metric="${r.metric}">${r.available?esc(r.value)+(r.metric==='humidity'?'%':esc(r.unit)):'—'}</span>`).join(''):'No sensor'}</span>${sources.length?'<small>'+esc(sources[0])+'</small>':''}`;}

function pinLayout(room,scale){return {width:Math.max(32,Math.min(240,tileSettings(room).width*scale)),compact:scale<.55,font:Math.max(7,Math.min(11,18*scale))};}

function fromInventory(room,inventory,mapping){

 const area=mapping?.[room.id]?.area_id,devices=new Map((inventory.devices||[]).map(d=>[d.id,d])),priority={zha:0,zwave_js:0,tplink:0,vesync:0,tuya:1,matter:2,smartthings:3};

 if(!area)return [];

 return (inventory.entities||[]).flatMap(e=>{const d=devices.get(e.device_id)||{},metric=e.device_class||(e.entity_id.endsWith('_air_quality')?'air_quality':null);if(!e.entity_id.startsWith('sensor.')||e.disabled_by||d.disabled_by||e.entity_category||!METRICS[metric]||(e.area_id||d.area_id)!==area)return [];return [{entity_id:e.entity_id,metric,source:d.name_by_user||d.name||e.name,name:e.name,platform:e.platform,unit:e.unit||''}];}).sort((a,b)=>(priority[a.platform]??1)-(priority[b.platform]??1)||a.source.localeCompare(b.source)||a.entity_id.localeCompare(b.entity_id));

}



function mount(card){

 const root=card.shadowRoot,rooms=card.config.plan.rooms.filter(r=>!card.config.focus_room||r.id===card.config.focus_room),sensors=card.config.room_environment||{};

 const style=document.createElement('style');style.textContent=`

${PIN_STYLE}

 .environment-section{padding:12px;background:#101b20;border-top:1px solid #30464e}.environment-section>summary{cursor:pointer;font-size:16px;font-weight:650;padding:5px 0 12px}.environment-intro{font-size:12px;color:#a8c0c6;margin:0 0 12px}.environment-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px}.environment-room{appearance:none;text-align:left;cursor:pointer;border:1px solid #3e5c65;border-radius:12px;background:#162a31;color:#e2eeed;padding:14px;font:inherit;min-height:110px}.environment-room:hover,.environment-room:focus-visible{outline:2px solid #8ee6d4}.environment-room h3{font-size:15px;margin:0 0 10px}.environment-values{display:flex;flex-wrap:wrap;gap:10px 16px}.environment-value{display:flex;gap:5px;align-items:center}.environment-value ha-icon{--mdc-icon-size:19px;color:#8dd9ce}.environment-value b{font-size:18px;font-weight:600}.environment-value .unit{font-size:12px;color:#b9cecf}.environment-value small{display:block;font-size:10px;color:#b1c9ce}.environment-source{font-size:11px;line-height:1.5;color:#b2c8ca;margin-top:9px}.environment-empty{font-size:12px;line-height:1.5;color:#a8c0c6}.environment-dialog{color:#e4f2ef;background:#14262e;border:1px solid #59717a;border-radius:16px;padding:20px;width:min(540px,calc(100vw - 24px));max-height:85dvh;overflow:auto;overscroll-behavior:contain;box-shadow:0 18px 80px #0008}.environment-dialog::backdrop{background:#020b10b0}.environment-dialog h2{margin:0;font-size:22px}.environment-dialog header{display:flex;align-items:center;justify-content:space-between;gap:10px}.environment-dialog button{font:inherit;color:inherit;background:#203a43;border:1px solid #48656e;border-radius:9px;min-height:44px;padding:10px;cursor:pointer}.environment-dialog .close-environment{min-width:44px}.environment-dialog p{color:#b2c9ce;font-size:13px;line-height:1.5}.environment-sensors{display:grid;gap:8px}.environment-sensor{text-align:left;display:flex;align-items:center;justify-content:space-between;gap:14px}.environment-sensor span{min-width:0}.environment-sensor strong{display:block;font-size:13px}.environment-sensor small{display:block;color:#adc5ca;font-size:11px;overflow-wrap:anywhere;margin-top:3px}.environment-sensor b{font-size:17px;white-space:nowrap}.environment-sensor[data-available="false"] b{color:#a7b5ba;font-size:12px}@media(max-width:550px){.environment-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.environment-room{padding:11px;min-height:105px}.environment-room h3{font-size:13px}.environment-value b{font-size:16px}.environment-values{gap:9px}.environment-section{padding:10px}.environment-dialog{padding:16px}}

 `;root.append(style);

 const overlay=document.createElement('div');overlay.className='environment-pins';card.viewport.insertBefore(overlay,card.pins);

 const section=document.createElement('details');section.className='environment-section';section.open=true;section.innerHTML='<summary>Room conditions</summary><p class="environment-intro">Live from Home Assistant · Tap a room for its map, controls and readings.</p><div class="environment-grid"></div>';root.querySelector('ha-card').append(section);

 const dialog=document.createElement('dialog');dialog.className='environment-dialog';dialog.setAttribute('aria-labelledby','environment-title');dialog.innerHTML='<header><h2 id="environment-title"></h2><button class="close-environment" aria-label="Close room conditions">✕</button></header><p class="environment-description"></p><div class="environment-sensors"></div>';root.append(dialog);

 dialog.querySelector('.close-environment').onclick=()=>dialog.close();dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});

 const nodes=new Map();let hass,selected=null,signature='';

 function open(room){if(card.config.room_paths?.[room.id]&&card.config.focus_room!==room.id){card.navigate(card.config.room_paths[room.id]);return;}selected=room;updateDialog();dialog.showModal();}

 for(const room of rooms){

  const pin=document.createElement('button');pin.className='environment-pin';pin.dataset.room=room.id;pin.onclick=()=>{if(Date.now()>=card.suppressUntil)open(room);};overlay.append(pin);

  const tile=document.createElement('button');tile.className='environment-room';tile.dataset.room=room.id;tile.onclick=()=>open(room);section.querySelector('.environment-grid').append(tile);nodes.set(room.id,{pin,tile});

 }

 function updateDialog(){if(!selected)return;const rows=sensors[selected.id]||[];dialog.querySelector('h2').textContent=selected.ha_name||selected.name;dialog.querySelector('.environment-description').textContent=rows.length?'Each reading belongs to this HA room. Sources are kept separate, including alternate integrations. Tap a reading for its HA history.':'No environmental sensors are assigned to this HA room. Assign a temperature, humidity or air-quality sensor to this room in HA, then save or sync the layout.';

  const list=dialog.querySelector('.environment-sensors'),active=list.querySelector(':focus')?.dataset.entity;list.innerHTML=rows.map(s=>{const r=reading(s,hass?.states,hass?.locale?.language);return `<button class="environment-sensor" data-entity="${esc(s.entity_id)}" data-available="${r.available}"><span><strong>${esc(r.label)}</strong><small>${esc(s.source)}${s.platform?' · '+esc(s.platform):''}</small><small>${esc(s.name)}</small></span><b>${esc(r.value)} ${esc(r.unit)}</b></button>`;}).join('');

  for(const button of list.children){button.onclick=()=>{dialog.close();card.moreInfo(button.dataset.entity);};if(button.dataset.entity===active)button.focus();}

 }

 function update(value){hass=value;const next=JSON.stringify(Object.values(sensors).flat().map(s=>[s.entity_id,hass?.states?.[s.entity_id]?.state,hass?.states?.[s.entity_id]?.attributes?.unit_of_measurement]));if(next===signature)return;signature=next;

  for(const room of rooms){const rows=sensors[room.id]||[],values=summary(rows,hass?.states,hass?.locale?.language),{pin,tile}=nodes.get(room.id),name=room.ha_name||room.name,top=values.slice(0,3);const short=values.filter(r=>['temperature','humidity'].includes(r.metric));const tiny=short.length?short:values.slice(0,1);const sources=[...new Set(top.filter(special).map(s=>s.source.replace(name+' · ','')))];

   pin.innerHTML=pinMarkup(room,values);pin.style.background=tileSettings(room).color;pin.dataset.empty=String(!rows.length);pin.title=name+' · '+(values.map(r=>r.label+': '+r.value+' '+r.unit).join(' · ')||'No environmental sensor assigned');pin.setAttribute('aria-label',pin.title+' — open room conditions');

   tile.innerHTML=`<h3>${esc(name)}</h3>${top.length?'<div class="environment-values">'+top.map(r=>`<span class="environment-value"><ha-icon icon="${r.icon}"></ha-icon><span><b>${esc(r.value)}</b> <span class="unit">${esc(r.unit)}</span><small>${esc(r.label)}</small></span></span>`).join('')+'</div>':'<div class="environment-empty">No environmental sensor assigned</div>'}${sources.length?'<div class="environment-source">'+esc(sources.join(' · '))+'</div>':''}`;tile.setAttribute('aria-label',pin.title+' — open room conditions');

  }updateDialog();

 }

 function draw(){if(!card.view)return;const rect=card.viewport.getBoundingClientRect();for(const room of rooms){const {pin}=nodes.get(room.id),q=window.MapCamera.project({x:room.label[0],y:room.label[1]},card.view,rect.width,rect.height,card.rotation);pin.style.left=q.x+'px';pin.style.top=q.y+'px';const scale=Math.min(rect.width/card.view.w,rect.height/card.view.h),layout=pinLayout(room,scale);pin.style.width=layout.width+'px';pin.dataset.compact=String(layout.compact);pin.style.setProperty('--room-font',layout.font+'px');pin.hidden=!tileSettings(room).visible||q.x<0||q.y<0||q.x>rect.width||q.y>rect.height;}}

 update(card._hass);return {update,draw,destroy(){dialog.close();}};

}

const api={METRICS,reading,summary,mount,PIN_STYLE,tileSettings,tileReadings,pinMarkup,pinLayout,fromInventory};if(typeof module!=='undefined')module.exports=api;else window.RoomEnvironment=api;

})();

