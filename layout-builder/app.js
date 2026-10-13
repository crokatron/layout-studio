(() => {

'use strict';

const M=window.LayoutModel,$=id=>document.getElementById(id),NS='http://www.w3.org/2000/svg';

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

const key='community-layout-v1'+(new URLSearchParams(location.search).has('test')?'-test':'');

let plan=M.clone(M.initial),selected=null,mode='furnish',history=new M.History(),drag=null,space=false,tool=null,measureStart=null,measureHover=null,snapGuide=null,groupAxis='free';

let viewRotation=0,measureKind='points';

let view={x:-110,y:-110,w:1500,h:1420},toastTimer,editBaseline=null;

try{const saved=localStorage.getItem(key);if(saved){plan=M.validate(JSON.parse(saved));if(!plan.blueprintRevision||plan.blueprintRevision<2){if(!localStorage.getItem(key+'-before-node-update'))localStorage.setItem(key+'-before-node-update',saved);const before=M.clone(plan);before.blueprintRevision=2;M.correctedSketch(plan);history.push(before);localStorage.setItem(key,JSON.stringify(plan));}}}catch(e){$('save-status').textContent='Use Save layout to keep a copy';}

const svg=$('plan'),stage=$('stage');

const fmt=n=>Number(n.toFixed(1)).toLocaleString(undefined,{maximumFractionDigits:1});

const snap=n=>$('snap').checked?M.snap10(n):n;

const itemBox=o=>({x:-o.w/2,y:o.kind==='door'&&M.doorDirection(o)<0?-o.h*1.5:-o.h/2,w:o.w,h:o.h});

const current=()=>selected?.type==='wall'?(plan.walls||[]).find(w=>w.id===selected.id):selected?.type==='device'?(plan.devices||[]).find(d=>d.device_id===selected.id):selected?.type==='dimension'?plan.dimensions.find(d=>d.id===selected.id):selected?.type==='room'?plan.rooms.find(r=>r.id===selected.id):plan.items.find(i=>i.id===selected?.id);

const allBounds=()=>{let pts=plan.rooms.flatMap(r=>[...r.points,r.label]);for(const w of plan.walls||[])pts.push(w.a,w.b);for(const d of plan.devices||[])pts.push([d.x-30,d.y-30],[d.x+30,d.y+30]);for(const i of plan.items){const rad=Math.hypot(i.w,i.h)*(i.kind==='door'?1.6:.5);pts.push([i.x-rad,i.y-rad],[i.x+rad,i.y+rad]);}for(const d of plan.dimensions){const a=M.resolveEnd(plan,d,'a'),b=M.resolveEnd(plan,d,'b'),l=M.distance(a,b)||1,n=[-(b[1]-a[1])/l,(b[0]-a[0])/l];pts.push(a,b,[a[0]+n[0]*d.offset,a[1]+n[1]*d.offset],[b[0]+n[0]*d.offset,b[1]+n[1]*d.offset]);}return pts.length?M.bounds(pts):{x:0,y:0,w:1000,h:1000};};

const uniqueId=prefix=>{let id;do{id=prefix+(plan.nextId++);}while((plan.wallAlignments||[]).some(w=>w.id===id)||(plan.walls||[]).some(w=>w.id===id)||plan.items.some(i=>i.id===id)||plan.rooms.some(r=>r.id===id)||plan.dimensions.some(d=>d.id===id));return id;};

function toast(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,4200);}

function persist(){try{localStorage.setItem(key,JSON.stringify(plan));$('save-status').textContent='Saved in this browser';}catch(e){$('save-status').textContent='Autosave unavailable · use Save layout';}renderButtons();}

function commit(before){try{M.editorData(plan);M.repairLabels(plan);M.validate(plan);}catch(error){plan=before;geometryFailure(error);render();return false;}clearGeometryFailure();if(JSON.stringify(before)!==JSON.stringify(plan)){history.push(before);persist();}render();return true;}

function flushEdit(){if(editBaseline){if(JSON.stringify(editBaseline)!==JSON.stringify(plan)){history.push(editBaseline);persist();}editBaseline=null;}}

function mutate(fn){flushEdit();const before=M.clone(plan),selection=M.clone(selected);try{fn();return commit(before);}catch(error){plan=before;selected=selection;geometryFailure(error);render();return false;}}

function renderButtons(){$('undo').disabled=!history.past.length;$('redo').disabled=!history.future.length;}

function undo(){flushEdit();const result=history.undo(plan);if(result){plan=result;selected=null;persist();render();toast('Change undone');}}

function redo(){const result=history.redo(plan);if(result){plan=result;selected=null;persist();render();toast('Change restored');}}

function roomOf(item){return plan.rooms.find(r=>M.inside(item.x,item.y,r.points));}

const symbol=window.FurnitureSymbols.symbol;

function drawCatalog(){const query=$('search').value.toLowerCase(),items=M.catalog.filter(c=>c.name.toLowerCase().includes(query));$('catalog').innerHTML=[...new Set(items.map(c=>c.category))].map(cat=>`<div class="category">${esc(cat)}</div><div class="catalog-grid">${items.filter(c=>c.category===cat).map(c=>`<button class="catalog-item" draggable="true" data-library="${c.key}" title="Add ${esc(c.name)}" aria-label="Add ${esc(c.name)}"><svg viewBox="${-c.w/2-10} ${-c.h/2-10} ${c.w+20} ${c.h+20}" aria-hidden="true">${window.FurnitureSymbols.render(c)}</svg><span>${esc(c.name)}</span><small>${c.w} × ${c.h} cm</small></button>`).join('')}</div>`).join('')||'<p class="subtle">No matching furniture.</p>';}

function labelSvg(r){const anchor=M.labelPosition(r),b=M.bounds(r.points),max=Math.max(7,Math.floor(b.w/11)),words=((r.dimensionsLocked?'🔒 ':'')+r.name).split(' '),lines=[];let line='';for(const word of words){if(line&&(line+' '+word).length>max){lines.push(line);line=word;}else line+=(line?' ':'')+word;}if(line)lines.push(line);return `<g class="room-label" data-room-label="${esc(r.id)}"><text class="room-name" x="${anchor[0]}" y="${anchor[1]-(lines.length-1)*10}">${lines.map((l,i)=>`<tspan x="${anchor[0]}" dy="${i?21:0}">${esc(l)}</tspan>`).join('')}</text><text class="room-size" x="${anchor[0]}" y="${anchor[1]+(lines.length-1)*11+23}">${r.measurementSource==='measured'?'':'~ '}${M.area(r.points).toFixed(1)} m²</text></g>`;}

function dimensionSvg(){const r=plan.rooms.find(r=>r.id==='balcony');if(!r||r.measurementSource!=='measured')return '';const b=M.bounds(r.points),x=b.x,y=b.y;return `<g fill="#7c8971" stroke="#8e9d80" stroke-width="1.2" font-size="12"><path d="M${x} ${y-20}v-28m0 13h170m0-13v28M${x-20} ${y}h-40m15 0v955m-15 0h40M${x+102.5} ${y+978}v25m0-13h144m0-13v25" fill="none"/><text x="${x+85}" y="${y-46}" text-anchor="middle" stroke="none">170 cm</text><text transform="translate(${x-59},${y+477.5}) rotate(-90)" text-anchor="middle" stroke="none">955 cm total</text><text x="${x+174.5}" y="${y+1012}" text-anchor="middle" stroke="none">144 cm</text><text transform="translate(${x+188},${y+193}) rotate(-90)" text-anchor="middle" stroke="none">385 cm</text><text transform="translate(${x+268},${y+670}) rotate(-90)" text-anchor="middle" stroke="none">570 cm</text><text x="${x+208.25}" y="${y+374}" text-anchor="middle" stroke="none" font-size="11">76.5</text></g>`;}

function markup(exporting=false){

  const showLabels=$('labels').checked;const b=allBounds();

  let out=`<defs><pattern id="smallGrid" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M10 0H0V10" fill="none" stroke="#23343b" stroke-width=".6"/></pattern><pattern id="gridPattern" width="100" height="100" patternUnits="userSpaceOnUse"><rect width="100" height="100" fill="url(#smallGrid)"/><path d="M100 0H0V100" fill="none" stroke="#30464e" stroke-width="1"/></pattern></defs><style>.room-shape{stroke:#728d92;stroke-width:5;stroke-linejoin:round}.room-name{fill:#e0eceb;font-family:Segoe UI,Arial,sans-serif;font-size:17px;font-weight:600;text-anchor:middle}.room-size{fill:#93b2b7;font-family:Segoe UI,Arial,sans-serif;font-size:12px;text-anchor:middle}.floor-note{fill:#93b2b7;font-family:Segoe UI,Arial,sans-serif;font-size:13px;text-anchor:middle}</style>`;

  out+=`<rect x="-50000" y="-50000" width="100000" height="100000" fill="${!exporting&&$('grid').checked?'url(#gridPattern)':'#101b20'}"/>`;

  for(const r of plan.rooms)out+=`<g class="room-group ${!exporting&&selected?.id===r.id?'selected':''}" data-room="${esc(r.id)}"><polygon class="room-shape" points="${r.points.map(p=>p.join(',')).join(' ')}" fill="${darkFloorColor(r.color)}"/></g>`;

  for(const w of plan.walls||[])out+=partitionMarkup(w,exporting);

  for(const it of plan.items)out+=`<g class="furniture ${!exporting&&selected?.id===it.id?'selected':''}" data-item="${esc(it.id)}" transform="translate(${it.x} ${it.y}) rotate(${it.rotation})"><title>${esc(it.name)} · ${fmt(it.w)} × ${fmt(it.h)} cm</title>${window.FurnitureSymbols.render(it)}</g>`;

  if(showLabels)for(const r of plan.rooms)out+=(exporting?null:roomTileMarkup(r))??labelSvg(r);out+=haMarkers(exporting);if(showLabels&&(exporting||mode!=='rooms'))out+=dimensionSvg();

  for(const d of plan.dimensions)out+=dimensionMarkup(d,exporting);

  if(!exporting&&measureStart&&measureHover&&measureKind!=='walls')out+=dimensionMarkup({a:measureStart.point,b:measureHover.point,offset:30,label:''},false,true);

  if(!exporting&&selected){const obj=current();if(obj&&selected.type==='item'){const box=itemBox(obj);out+=`<g transform="translate(${obj.x} ${obj.y}) rotate(${obj.rotation})"><rect class="selection-box" x="${-obj.w/2-5}" y="${box.y-5}" width="${obj.w+10}" height="${obj.h+10}"/><path d="M0 ${box.y-5}v-33" stroke="#376a4d" stroke-width="2"/><circle class="handle rotate-handle" data-handle="rotate" cx="0" cy="${box.y-40}" r="8"/><rect class="handle" data-handle="resize" x="${obj.w/2-4}" y="${box.y+box.h-4}" width="12" height="12"/></g>`;}else if(obj&&selected.type==='room'&&mode==='rooms'){out+=wallControls(obj);}}

  if(!exporting)out+=groupMarkup()+(tool==='measure'&&measureKind==='walls'?'':snapGuideMarkup())+wallPreview()+roomMeasureMarkup()+wallMeasurementMarkup()+wallPairMarkup();

  if(exporting)out+=`<text class="floor-note" x="${b.x+b.w/2}" y="${b.y+b.h+69}">${esc(plan.title)} · Balcony measured in cm; other room sizes estimated</text>`;

  return out;

}

function drawPlan(){svg.setAttribute('viewBox',`${view.x} ${view.y} ${view.w} ${view.h}`);svg.innerHTML=`<g id="map-world" transform="rotate(${viewRotation})">${markup()}</g>`;if(typeof skyWidget!=='undefined'){refreshSky();if(document.activeElement!==$('map-angle'))$('map-angle').value=Math.round(viewRotation);}}

function roomList(){$('room-count').textContent='('+plan.rooms.length+')';$('room-list').innerHTML=plan.rooms.map(r=>`<button class="room-link" data-select-room="${esc(r.id)}"><span class="swatch" style="background:${r.color}"></span>${r.dimensionsLocked?'🔒 ':''}${esc(r.name)}<small>${plan.items.filter(it=>roomOf(it)?.id===r.id).length||''}</small></button>`).join('');}

const numberField=(name,value,label,disabled=false)=>`<label class="field">${label}<input type="number" step="1" data-field="${name}" value="${Number(value.toFixed(1))}" ${disabled?'disabled':''}></label>`;

function inspector(){if(selected?.type==='wall-pair'){inspectWallPair();return;}if(selected?.type==='wall'&&current()){inspectPartition(current());return;}if(haInspector())return;if(mode==='box'){groupInspector();return;}const o=current(),isRoom=selected?.type==='room';if(o&&selected.type==='dimension'){inspectDimension(o);return;}if(!o){$('selection-panel').innerHTML=`<div class="eyebrow">Start arranging</div><h2>Your home, reimagined</h2><div class="empty-icon">⌑</div><p class="subtle">Select a room, then add a piece from the library. Or drag furniture straight onto the plan.</p><p class="subtle">Every piece can be resized and rotated to match what you own.</p>`;return;}

  const b=isRoom?M.bounds(o.points):{w:o.w,h:o.h,x:o.x,y:o.y},lock=isRoom&&mode!=='rooms';

  $('selection-panel').innerHTML=`<div class="eyebrow">${isRoom?'Room':'Selected furniture'}</div><h2>${esc(o.name)}</h2><p class="subtle">${isRoom?o.measurementSource==='measured'?'Measured polygon · dimensions in cm':'Approximate room · adjust as you measure':esc(roomOf(o)?.name||'Outside the rooms')+' · dimensions in cm'}</p><label class="field">Name<input data-field="name" value="${esc(o.name)}" maxlength="90"></label>${isRoom?roomLockControls(o)+roomTileFields(o)+geometryInspector(o)+haRoomFields(o):''}<div class="fields">${numberField('w',b.w,isRoom?'Bounding width':'Width',lock||isRoom&&o.dimensionsLocked)}${numberField('h',b.h,isRoom?'Bounding length':'Depth / length',lock||isRoom&&o.dimensionsLocked)}${numberField('x',b.x,isRoom?'Left position':'Centre X',lock)}${numberField('y',b.y,isRoom?'Top position':'Centre Y',lock)}</div>${isRoom&&!lock?'<button class="button" data-action="apply-room-bounds">Apply room bounds</button>':''}${isRoom?'':`<div class="fields">${numberField('rotation',o.rotation,'Rotation °')}<label class="field">Colour<input type="color" data-field="color" value="${o.color}"></label></div>`}${isRoom?`<label class="field">Floor colour<input type="color" data-field="color" value="${o.color}"></label><p class="subtle">${M.area(o.points).toFixed(2)} m² ${o.measurementSource==='measured'?'· calculated from your measurements':'· estimated'}${o.dimensionsLocked?'<br>Unlock the room to change its outline.':lock?'<br>Choose Edit rooms to change the outline.':'<br>Drag corner handles to change the outline.'}</p>`:''}${!isRoom&&o.kind==='door'?`<label class="field">Opening direction<select data-door-swing><option value="cw" ${M.doorSwing(o)==='cw'?'selected':''}>Clockwise</option><option value="ccw" ${M.doorSwing(o)==='ccw'?'selected':''}>Anticlockwise</option></select></label><p class="subtle">Direction is viewed from above. Switching direction keeps the hinge and opening in place.</p>`:''}<div class="object-actions">${!isRoom?'<button class="button" data-action="duplicate">Duplicate</button><button class="button" data-action="rotate">Rotate 90°</button><button class="button" data-action="mirror-x">Mirror left / right</button><button class="button" data-action="mirror-y">Mirror front / back</button><button class="button" data-action="back">Send back</button><button class="button" data-action="front">Bring front</button>':''}${!isRoom&&o.kind==='door'?'<button class="button" data-action="flip">Swap hinge side</button>':''}<button class="button danger" data-action="delete" ${lock?'disabled':''}>Remove</button><button class="button" data-action="deselect">Deselect</button></div>${isRoom&&o.id==='balcony'?'<p class="subtle">Original balcony: 170 top width · 385 upper length · 76.5 step · 570 lower length · 144 bottom width.</p>':''}`;

}

function render(){haRenderList();$('mode-devices').classList.toggle('active',mode==='devices');drawPlan();inspector();roomList();renderButtons();$('mode-furnish').classList.toggle('active',mode==='furnish');$('mode-rooms').classList.toggle('active',mode==='rooms');$('mode-pan').classList.toggle('active',mode==='pan');$('mode-box').classList.toggle('active',mode==='box');svg.classList.toggle('box-mode',mode==='box');$('add-room').hidden=mode!=='rooms';$('mode-note').textContent=mode==='box'?(selected?.type==='multi'?'Drag selection to move · Shift locks an axis · Esc clears':'Drag a box around corners and objects · B = box select'):mode==='dimension'?(measureStart?'Click the end point · Esc cancels':'Click two points to add a dimension · Snaps to wall nodes'):mode==='pan'?'Drag to pan · Scroll, pinch or use + / − to zoom':mode==='rooms'?(tool==='add-node'?'Click a wall to insert a node · Esc cancels':'Draw walls · Drag room names · Select a wall for driving dimensions'):mode==='devices'?(usePlacementGuide()?'Choose a device and room · Position the pin · Place here':'Choose a device, then click inside its room · Drag markers to adjust'):'Drag furniture to place it · Space + drag to pan';$('scale-state').textContent=plan.rooms.some(r=>r.id==='balcony'&&r.measurementSource==='measured')?'Balcony measured · other rooms estimated':'Room dimensions in cm · check against measurements';structureControls();}

function fit(){const raw=allBounds(),b=MapCamera.bounds([[raw.x,raw.y],[raw.x+raw.w,raw.y],[raw.x+raw.w,raw.y+raw.h],[raw.x,raw.y+raw.h]],viewRotation,0);view={x:b.x-110,y:b.y-100,w:Math.max(400,b.w+220),h:Math.max(400,b.h+220)};drawPlan();}

function zoom(factor,centre){const c=centre||{x:view.x+view.w/2,y:view.y+view.h/2};const w=Math.min(15000,Math.max(150,view.w*factor)),f=w/view.w;view={x:c.x-(c.x-view.x)*f,y:c.y-(c.y-view.y)*f,w,h:view.h*f};drawPlan();}

function viewportPoint(e){const p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;const q=p.matrixTransform(svg.getScreenCTM().inverse());return {x:q.x,y:q.y};}

function point(e){return MapCamera.rotate(viewportPoint(e),-viewRotation);}

function addItem(entry,p){const room=selected?.type==='room'?current():null;let pos=p|| (room?{x:room.label[0],y:room.label[1]}:{x:view.x+view.w/2,y:view.y+view.h/2});mutate(()=>{const item={id:uniqueId('item-'),kind:entry.kind,name:entry.name,x:snap(pos.x),y:snap(pos.y),w:entry.w,h:entry.h,rotation:0,color:entry.color,mirrorX:!!entry.mirrorX,mirrorY:!!entry.mirrorY};if(entry.kind==='rug')plan.items.unshift(item);else plan.items.push(item);selected={type:'item',id:item.id};});toast(entry.name+' added · drag to place it');}

function remove(){const o=current();if(!o)return;if(selected.type==='room'&&mode!=='rooms')return;mutate(()=>{if(selected.type==='wall'){M.removePartition(plan,o.id);}else if(selected.type==='device'){plan.devices=haPlacements().filter(d=>d.device_id!==o.device_id);}else if(selected.type==='room'){M.detachAnchors(plan,o.id);plan.rooms=plan.rooms.filter(r=>r.id!==o.id);}else if(selected.type==='dimension')plan.dimensions=plan.dimensions.filter(d=>d.id!==o.id);else plan.items=plan.items.filter(i=>i.id!==o.id);selected=null;});haRenderList();toast('Removed · Undo is available');}

function duplicate(){const o=current();if(!o||selected.type!=='item')return;mutate(()=>{const copy={...M.clone(o),id:uniqueId('item-'),x:o.x+25,y:o.y+25};plan.items.push(copy);selected={type:'item',id:copy.id};});}

function rotate(angle){const o=current();if(o&&selected.type==='item')mutate(()=>o.rotation=(o.rotation+angle)%360);}

function setMode(value){flushEdit();mode=value;if(['multi','wall-pair'].includes(selected?.type))selected=null;tool=null;wallStart=null;wallHover=null;measureStart=null;measureHover=null;render();}

$('catalog').addEventListener('click',e=>{const b=e.target.closest('[data-library]');if(b)addItem(M.catalog.find(c=>c.key===b.dataset.library));});

$('catalog').addEventListener('dragstart',e=>{const b=e.target.closest('[data-library]');if(b){e.dataTransfer.setData('application/x-layout-furniture',b.dataset.library);e.dataTransfer.effectAllowed='copy';}});

stage.addEventListener('dragover',e=>{if(Array.from(e.dataTransfer.types).includes('application/x-layout-furniture')){e.preventDefault();e.dataTransfer.dropEffect='copy';stage.classList.add('drag-over');}});

stage.addEventListener('dragleave',e=>{if(!stage.contains(e.relatedTarget))stage.classList.remove('drag-over');});

stage.addEventListener('drop',e=>{e.preventDefault();stage.classList.remove('drag-over');const item=M.catalog.find(c=>c.key===e.dataTransfer.getData('application/x-layout-furniture'));if(item)addItem(item,point(e));});

svg.addEventListener('pointerdown',e=>{if(e.button!==0&&e.button!==1)return;flushEdit();const p=point(e);if(mode==='pan'||space||e.button===1){drag={kind:'pan',start:p,view:{...view},screen:{x:e.clientX,y:e.clientY},matrix:svg.getScreenCTM()};svg.setPointerCapture(e.pointerId);e.preventDefault();return;}

  if(mode==='rooms'&&(tool==='wall-pair'||!tool&&(e.ctrlKey||e.metaKey))){if(tool!=='wall-pair')beginWallPair(activeWallPick());wallPairTap(p);e.preventDefault();return;}

  if(mode==='rooms'&&tool==='measure'){measurementTap(p);e.preventDefault();return;}

  const lengthLabel=e.target.closest('[data-length-room],[data-length-wall]');if(lengthLabel&&mode==='rooms'){dimensionEditor(lengthLabel.dataset.lengthRoom?{room:lengthLabel.dataset.lengthRoom,node:lengthLabel.dataset.lengthNode}:{wall:lengthLabel.dataset.lengthWall});e.preventDefault();return;}

  if(structurePointerDown(e,p))return;

  if(mode==='box'){startBoxPointer(e,p);return;}

  const dimHandle=e.target.closest('[data-dim-handle]'),dim=e.target.closest('[data-dimension]'),offset=e.target.closest('[data-dimension-offset]');

  if(dimHandle&&selected?.type==='dimension'&&!current().driving){drag={kind:'dimension-end',end:dimHandle.dataset.dimHandle,start:p,before:M.clone(plan),object:M.clone(current())};}

  else if(dim){selected={type:'dimension',id:dim.dataset.dimension};if(offset)drag={kind:'dimension-offset',start:p,before:M.clone(plan),object:M.clone(current())};}

  else if(mode==='dimension'){const pick=pickMeasurement(p);if(!measureStart){measureStart=pick;measureHover=null;toast('Now click the end point.');}else{const start=measureStart;measureStart=null;measureHover=null;newDimension(start.point,pick.point,{...(start.anchor?{aAnchor:start.anchor}:{}),...(pick.anchor?{bAnchor:pick.anchor}:{})});}render();e.preventDefault();return;}

  else if(mode==='rooms'&&tool==='add-node'){insertNearestNode(p);e.preventDefault();return;}

  else{

    const handle=e.target.closest('[data-handle]'),vertex=e.target.closest('[data-vertex]'),mid=e.target.closest('[data-midpoint]'),edge=e.target.closest('[data-edge]'),item=e.target.closest('[data-item]'),room=e.target.closest('[data-room]'),nearWall=mode==='rooms'?nearestEditableWall(p):null;

    if(mid&&mode==='rooms'&&selected?.type==='room'){const r=current(),i=Number(mid.dataset.midpoint),a=r.points[i],b=r.points[(i+1)%r.points.length];addNodeAt(r,i,[(a[0]+b[0])/2,(a[1]+b[1])/2]);e.preventDefault();return;}

    if(handle&&current()){drag={kind:handle.dataset.handle,start:p,before:M.clone(plan),object:M.clone(current())};}

    else if(vertex&&current()&&selected?.type==='room'&&mode==='rooms'){const i=Number(vertex.dataset.vertex);selected.nodeId=current().nodeIds[i];delete selected.edgeId;drag={kind:'vertex',vertex:i,start:p,before:M.clone(plan),object:M.clone(current())};}

    else if(edge&&current()&&selected?.type==='room'&&mode==='rooms'){selected.edgeId=current().nodeIds[Number(edge.dataset.edge)];delete selected.nodeId;drag={kind:'wall',edgeId:selected.edgeId,start:p,before:M.clone(plan),object:M.clone(current())};}

    else if(item){selected={type:'item',id:item.dataset.item};drag={kind:'item',start:p,before:M.clone(plan),object:M.clone(current())};}

    else if(nearWall){selected={type:'room',id:nearWall.room.id,edgeId:nearWall.room.nodeIds[nearWall.index]};drag={kind:'wall',edgeId:selected.edgeId,start:p,before:M.clone(plan),object:M.clone(current())};}

    else if(room){selected={type:'room',id:room.dataset.room};if(mode==='rooms')drag={kind:'room',start:p,before:M.clone(plan),object:M.clone(current())};}

    else selected=null;

  }

  if(drag){svg.setPointerCapture(e.pointerId);e.preventDefault();}render();

});

svg.addEventListener('pointermove',e=>{if(!drag){if(tool==='draw-wall'&&wallStart){wallHover=wallPick(point(e),e);drawPlan();}if(mode==='rooms'&&tool==='measure'){measureHover=pickMeasurement(point(e));snapGuide=measureHover;drawPlan();}return;}if(drag.kind==='pan'){const dx=(e.clientX-drag.screen.x)/drag.matrix.a,dy=(e.clientY-drag.screen.y)/drag.matrix.d;view={...drag.view,x:drag.view.x-dx,y:drag.view.y-dy};drawPlan();return;}

  const p=point(e),dx=p.x-drag.start.x,dy=p.y-drag.start.y,o=current();if(!drag.moved&&Math.hypot(dx,dy)*(svg.getScreenCTM()?.a||1)<3)return;drag.moved=true;

  if(drag.kind==='marquee'){drag.last=p;selected=M.boxSelection(plan,[drag.start.x,drag.start.y],[p.x,p.y],drag.add?drag.previous:null);drawPlan();groupInspector();return;}

  try{drag.error=null;

  if(drag.kind==='group'){const delta=groupDragDelta(dx,dy,e);plan=M.clone(drag.before);M.moveSelection(plan,drag.selection,...delta);drawPlan();return;}

  if(!o)return;

  if(structureMove(e,p,dx,dy)){drawPlan();return;}

  if(drag.kind==='item'){o.x=snap(drag.object.x+dx);o.y=snap(drag.object.y+dy);}

  if(drag.kind==='room'){const b=M.bounds(drag.object.points);plan=M.clone(drag.before);M.transformRoom(plan,o.id,b.x+snap(dx),b.y+snap(dy),b.w,b.h);}

  if(drag.kind==='resize'){const rad=-drag.object.rotation*Math.PI/180,x=(p.x-o.x)*Math.cos(rad)-(p.y-o.y)*Math.sin(rad),y=(p.x-o.x)*Math.sin(rad)+(p.y-o.y)*Math.cos(rad);o.w=Math.max(10,snap(x*2));o.h=Math.max(10,snap(y*(o.kind==='door'&&M.doorDirection(o)<0?-2:2)));}

  if(drag.kind==='rotate'){const degrees=Math.atan2(p.y-o.y,p.x-o.x)*180/Math.PI+90;o.rotation=((Math.round(degrees/(e.shiftKey?1:15))*(e.shiftKey?1:15))%360+360)%360;}

  if(drag.kind==='vertex'){const old=drag.object.points[drag.vertex],wanted=[old[0]+dx,old[1]+dy],pick=e.altKey?{point:wanted}:M.smartSnap(drag.before,wanted,{exclude:[old],origin:old,tolerance:Math.min(10,9/(svg.getScreenCTM()?.a||1)),grid:$('snap').checked,align:$('align').checked});snapGuide=pick;plan=M.clone(drag.before);M.joinWallNodes(plan);M.moveNode(plan,o.id,selected.nodeId,pick.point);}

  if(drag.kind==='wall'){const delta=wallDragDelta(dx,dy,e);plan=M.clone(drag.before);M.moveWall(plan,o.id,drag.edgeId,delta[0],delta[1]);}

  if(drag.kind==='dimension-end'){const pick=pickMeasurement(p);o[drag.end]=pick.point;if(pick.anchor)o[drag.end+'Anchor']=pick.anchor;else delete o[drag.end+'Anchor'];}

  if(drag.kind==='dimension-offset'){const a=M.resolveEnd(plan,o,'a'),b=M.resolveEnd(plan,o,'b'),len=M.distance(a,b)||1;o.offset=((p.x-a[0])*(-(b[1]-a[1]))+(p.y-a[1])*(b[0]-a[0]))/len;}

  drawPlan();

  }catch(error){plan=M.clone(drag.before);drag.error=error;geometryFailure(error);drawPlan();}

});

function endDrag(e,cancel=false){if(!drag)return;const d=drag;drag=null;snapGuide=null;if(svg.hasPointerCapture(e.pointerId))svg.releasePointerCapture(e.pointerId);if(d.kind==='pan')return;if(d.kind==='marquee'){if(cancel)selected=d.previous;else if(!d.moved&&!d.add)selected=null;if(selected?.type==='multi'&&!M.selectionBounds(plan,selected))selected=null;render();return;}if(!d.moved){render();if(d.kind==='dimension-offset')dimensionEditor({dimension:d.object.id});else if(d.kind==='room')mobileFocusRoom();return;}if(cancel||d.error){plan=d.before;render();}else commit(d.before);}

svg.addEventListener('pointerup',e=>endDrag(e));svg.addEventListener('pointercancel',e=>endDrag(e,true));

svg.addEventListener('wheel',e=>{

  const delta=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?stage.clientHeight:1);

  if(!delta)return;

  e.preventDefault();

  zoom(Math.exp(Math.max(-1,Math.min(1,delta*.001))),viewportPoint(e));

},{passive:false});

$('selection-panel').addEventListener('input',e=>{if(e.target.id==='group-axis'){groupAxis=e.target.value;return;}if(structureInput(e)||editorInput(e))return;const field=e.target.dataset.field,o=current();if(!field||!o)return;const isRoom=selected.type==='room';let v=e.target.value;if(!['name','color'].includes(field)){if(v==='')return;v=Number(v);if(!Number.isFinite(v)||Math.abs(v)>50000||(['w','h'].includes(field)&&v<10))return;}if(isRoom&&['w','h','x','y'].includes(field))return;if(!editBaseline)editBaseline=M.clone(plan);o[field]=field==='name'?v.trim()||'Unnamed':field==='rotation'?((v%360)+360)%360:v;drawPlan();roomList();persist();const h=$('selection-panel').querySelector('h2');if(h)h.textContent=o.name;});

$('selection-panel').addEventListener('focusout',flushEdit);

$('selection-panel').addEventListener('change',flushEdit);

$('selection-panel').addEventListener('click',e=>{const a=e.target.closest('[data-action]')?.dataset.action;if(a==='new-box'){selected=null;render();return;}if(a==='move-group'){moveGroupBy(Number($('group-dx').value),Number($('group-dy').value));return;}if(wallPairAction(a,e.target.closest('[data-action]'))||structureAction(a)||editorAction(a))return;if(a==='delete')remove();if(a==='duplicate')duplicate();if(a==='rotate')rotate(90);if(a==='deselect'){selected=null;render();}if(a==='back'||a==='front'){const o=current();if(o&&selected.type==='item')mutate(()=>{plan.items=plan.items.filter(i=>i.id!==o.id);a==='back'?plan.items.unshift(o):plan.items.push(o);});}});

$('room-list').addEventListener('click',e=>{const b=e.target.closest('[data-select-room]');if(b){selected={type:'room',id:b.dataset.selectRoom};render();document.querySelector('.inspector').scrollTop=0;}});

$('add-room').onclick=()=>mutate(()=>{const id=uniqueId('room-'),x=snap(view.x+view.w*.5),y=snap(view.y+view.h*.5);plan.rooms.push({id,name:'New room',color:'#e6e4d8',points:[[x,y],[x+300,y],[x+300,y+300],[x,y+300]],label:[x+150,y+150],measurementSource:'estimated'});selected={type:'room',id};});

$('search').oninput=drawCatalog;$('mode-furnish').onclick=()=>setMode('furnish');$('mode-rooms').onclick=()=>setMode('rooms');$('mode-box').onclick=()=>setMode('box');$('mode-pan').onclick=()=>setMode('pan');$('undo').onclick=undo;$('redo').onclick=redo;$('fit').onclick=fit;$('zoom-in').onclick=()=>zoom(.8);$('zoom-out').onclick=()=>zoom(1.25);

for(const id of ['grid','snap','align','labels'])$(id).onchange=drawPlan;

document.addEventListener('keydown',e=>{if(document.body.classList.contains('automations-active')||document.body.classList.contains('device-sheet-active')||document.body.classList.contains('buttons-active')||e.target.closest('input,textarea,select')||document.querySelector('dialog[open]'))return;const command=e.ctrlKey||e.metaKey;if(command&&e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?redo():undo();return;}if(command&&e.key.toLowerCase()==='d'){e.preventDefault();duplicate();return;}if(e.code==='Space'){space=true;e.preventDefault();}if(!command&&e.key.toLowerCase()==='b'){setMode('box');return;}if(e.key==='Escape'){wallStart=null;wallHover=null;if(drag?.before)plan=drag.before;if(drag?.pointerId!==undefined&&svg.hasPointerCapture(drag.pointerId))svg.releasePointerCapture(drag.pointerId);drag=null;snapGuide=null;selected=null;tool=null;wallStart=null;wallHover=null;measureStart=null;measureHover=null;render();}if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();if(selected?.nodeId)editorAction('remove-node');else remove();}if(!command&&e.key.toLowerCase()==='r')rotate(15);if(e.key.startsWith('Arrow')){if(selected?.type==='multi'){e.preventDefault();const n=e.shiftKey?10:1;moveGroupBy(e.key==='ArrowLeft'?-n:e.key==='ArrowRight'?n:0,e.key==='ArrowUp'?-n:e.key==='ArrowDown'?n:0);return;}const o=current();if(!o||(selected.type==='room'&&mode!=='rooms'))return;e.preventDefault();const d=e.shiftKey?10:1,dx=e.key==='ArrowLeft'?-d:e.key==='ArrowRight'?d:0,dy=e.key==='ArrowUp'?-d:e.key==='ArrowDown'?d:0;mutate(()=>{if(selected.type==='wall'){M.movePartition(plan,o.id,[dx,dy]);}else if(selected.label){o.label=[o.label[0]+dx,o.label[1]+dy];o.labelManual=true;}else if(['item','device'].includes(selected.type)){o.x+=dx;o.y+=dy;}else if(selected.type==='dimension'){if(o.driving){o.offset+=dy||dx;return;}for(const k of ['a','b']){const p=M.resolveEnd(plan,o,k);o[k]=[p[0]+dx,p[1]+dy];delete o[k+'Anchor'];}}else if(selected.nodeId){const i=o.nodeIds.indexOf(selected.nodeId),pt=o.points[i];M.joinWallNodes(plan);M.moveNode(plan,o.id,selected.nodeId,[pt[0]+dx,pt[1]+dy]);}else if(selected.edgeId){M.moveWall(plan,o.id,selected.edgeId,dx,dy);}else{const b=M.bounds(o.points);M.transformRoom(plan,o.id,b.x+dx,b.y+dy,b.w,b.h);}});}});

document.addEventListener('keyup',e=>{if(e.code==='Space')space=false;});window.addEventListener('blur',()=>space=false);

function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}

$('save-project').onclick=()=>{download(new Blob([JSON.stringify(plan,null,2)],{type:'application/json'}),'my-home-layout.json');toast('Layout downloaded · keep it as your editable backup');};

$('open-project').onclick=()=>$('import-file').click();

$('import-file').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{if(f.size>5e6)throw Error('Choose a layout file smaller than 5 MB.');const next=M.validate(JSON.parse(await f.text()));if(!next.blueprintRevision)next.blueprintRevision=2;mutate(()=>{plan=next;selected=null;});fit();toast('Layout opened · Undo returns to your previous plan');}catch(error){toast(error.message||'Could not open this layout.');}finally{e.target.value='';}};

$('export-image').onclick=()=>{const b=allBounds(),v={x:b.x-110,y:b.y-95,w:b.w+220,h:b.h+220},height=Math.round(2200*v.h/v.w),source=`<svg xmlns="${NS}" width="2200" height="${height}" viewBox="${v.x} ${v.y} ${v.w} ${v.h}">${markup(true)}</svg>`,url=URL.createObjectURL(new Blob([source],{type:'image/svg+xml'})),img=new Image();img.onload=()=>{try{const canvas=document.createElement('canvas');canvas.width=2200;canvas.height=height;canvas.getContext('2d').drawImage(img,0,0);canvas.toBlob(blob=>{if(blob){download(blob,'my-home-floor-plan.png');toast('Floor-plan image downloaded');}else toast('Could not export the image.');},'image/png');}catch(e){toast('Could not export the image.');}finally{URL.revokeObjectURL(url);}};img.onerror=()=>{URL.revokeObjectURL(url);toast('Could not render the export.');};img.src=url;};

$('source-top').onclick=()=>$('source-dialog').showModal();$('help-button').onclick=()=>$('help-dialog').showModal();$('measurements').onclick=()=>$('measure-dialog').showModal();

document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>b.closest('dialog').close());

/*EDITOR_FUNCTIONS*/

/*HA_FUNCTIONS*/

/*EXTRA_FUNCTIONS*/

try{const backup=localStorage.getItem(key+'-before-node-update');$('backup-before').hidden=!backup;$('backup-before').onclick=()=>download(new Blob([backup],{type:'application/json'}),'my-home-before-node-update.json');}catch(_){}

M.repairLabels(plan);drawCatalog();render();fit();

// Recompute screen-sized handles after responsive panels change the actual canvas.

const mapResizeObserver=new ResizeObserver(()=>{if(stage.clientWidth&&stage.clientHeight)drawPlan();});mapResizeObserver.observe(stage);

})();

