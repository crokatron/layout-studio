// Room tiles share HA's renderer and the plan's normal undo/save history.

function roomTileMarkup(room){

 const E=window.RoomEnvironment;if(!E||!E.tileSettings(room).visible)return null;

 const scale=Math.min(stage.clientWidth/view.w,stage.clientHeight/view.h)||1,layout=E.pinLayout(room,scale),settings=E.tileSettings(room);

 const rows=E.fromInventory(room,haData,haState.rooms),states=Object.fromEntries(haData.entities.map(e=>[e.entity_id,{state:e.state,attributes:{unit_of_measurement:e.unit}}]));

 const values=E.summary(rows,states),w=layout.width,h=180;

 return `<g class="room-label" data-room-label="${esc(room.id)}" transform="translate(${room.label.join(' ')}) rotate(${-viewRotation})"><foreignObject x="${-w/2/scale}" y="${-h/2/scale}" width="${w/scale}" height="${h/scale}" style="overflow:visible;pointer-events:none"><div xmlns="http://www.w3.org/1999/xhtml" style="position:relative;width:${w}px;height:${h}px;transform:scale(${1/scale});transform-origin:0 0;pointer-events:none"><button type="button" class="environment-pin" data-compact="${layout.compact}" data-empty="${!rows.length}" aria-label="Edit ${esc(room.name)} room tile" style="left:50%;top:50%;width:100%;--room-font:${layout.font}px;background:${settings.color}">${E.pinMarkup(room,values)}</button></div></foreignObject></g>`;

}

function roomTileFields(room){

 const E=window.RoomEnvironment,s=E.tileSettings(room);

 return `<section class="room-tile-editor"><h3>Room tile</h3><p class="subtle">The same tile appears here and in HA. Drag it in Edit rooms, or enter its position below. In HA, tap it to open this room and its controls.</p><label><input type="checkbox" data-room-tile="visible" ${s.visible?'checked':''}> Show tile on plan</label><label class="field">Tile title<input data-room-tile="title" maxlength="90" value="${esc(s.title||'')}" placeholder="${esc(room.ha_name||room.name)}"></label><div class="fields"><label class="field">Tile width (cm)<input type="number" min="80" max="400" step="10" data-room-tile="width" value="${s.width}"></label><label class="field">Tile colour<input type="color" data-room-tile="color" value="${s.color}"></label></div><div class="fields"><label class="field">Tile X (cm)<input type="number" data-tile-axis="0" value="${room.label[0]}"></label><label class="field">Tile Y (cm)<input type="number" data-tile-axis="1" value="${room.label[1]}"></label></div><p class="subtle">Choose up to four readings. Only sensors assigned to this room are used.</p><div class="room-tile-metrics">${Object.entries(E.METRICS).map(([key,[name]])=>`<label><input type="checkbox" data-tile-metric="${key}" ${s.metrics.includes(key)?'checked':''}> ${name}</label>`).join('')}</div><button type="button" class="button primary" data-apply-room-tile>Apply room tile</button> <button type="button" class="button" data-refresh-room-readings>Refresh readings</button><p class="subtle">Readings are from the last HA device refresh. Tile changes save to NAS and flow through to HA.</p></section>`;

}

$('selection-panel').addEventListener('click',e=>{

 if(e.target.closest('[data-refresh-room-readings]')){haRefresh();return;}

 if(!e.target.closest('[data-apply-room-tile]')||selected?.type!=='room')return;

 const panel=$('selection-panel'),settings={};for(const input of panel.querySelectorAll('[data-room-tile]'))settings[input.dataset.roomTile]=input.type==='checkbox'?input.checked:input.type==='number'?Number(input.value):input.value.trim();

 settings.metrics=[...panel.querySelectorAll('[data-tile-metric]:checked')].map(n=>n.dataset.tileMetric);if(!settings.title)delete settings.title;

 const position=[0,1].map(i=>Number(panel.querySelector('[data-tile-axis="'+i+'"]').value));

 if(mutate(()=>{if(!position.every(n=>Number.isFinite(n)&&Math.abs(n)<=50000))throw Error('Enter a valid tile position.');const room=current();room.room_tile=settings;room.label=position;room.labelManual=true;}))toast('Room tile updated · saving to NAS and HA');

});

svg.addEventListener('keydown',e=>{const label=e.target.closest('[data-room-label]');if(label&&['Enter',' '].includes(e.key)){e.preventDefault();selected={type:'room',id:label.dataset.roomLabel,label:true};setMode('rooms');mobilePanel('edit');}});

const roomTileStyle=document.createElement('style');roomTileStyle.textContent=window.RoomEnvironment.PIN_STYLE+'.room-tile-metrics{display:grid;gap:10px;margin:12px 0}.room-tile-editor{border-top:1px solid var(--line);padding-top:10px;margin-top:15px}.room-tile-editor h3{font-size:14px}.room-tile-editor input[type=checkbox]{min-width:18px;min-height:18px;vertical-align:middle}.room-tile-editor label{font-size:12px}';document.head.append(roomTileStyle);



let roomTileTap=null;

stage.addEventListener('pointerdown',e=>{if(roomTileTap){roomTileTap=null;return;}const label=e.target.closest('[data-room-label]');if(label&&e.button===0&&!tool&&mode!=='box')roomTileTap={id:e.pointerId,room:label.dataset.roomLabel,x:e.clientX,y:e.clientY};},true);

stage.addEventListener('pointerup',e=>{const tap=roomTileTap;roomTileTap=null;if(!tap||tap.id!==e.pointerId||Math.hypot(e.clientX-tap.x,e.clientY-tap.y)>5)return;selected={type:'room',id:tap.room,label:true};setMode('rooms');mobilePanel('edit');});

stage.addEventListener('pointercancel',()=>roomTileTap=null);

