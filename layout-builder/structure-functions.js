// Drawing, labels and constraint feedback, compiled into the editor closure.

let wallStart=null,wallHover=null;

function geometryFailure(error){$('geometry-error').textContent=error.message||String(error);$('geometry-error').hidden=false;toast(error.message||String(error));}

function clearGeometryFailure(){$('geometry-error').hidden=true;$('geometry-error').textContent='';}

function structureControls(){

  $('structure-tools').hidden=mode!=='rooms';

  $('select-wall-pair').classList.toggle('active',tool==='wall-pair');

  if(mode==='rooms'&&tool==='wall-pair')$('mode-note').textContent=selected?.picks?.length===2?'Two walls selected · Drive distance or Make collinear in Edit':selected?.picks?.length?'Tap the second wall · The first is the fixed reference':'Tap two walls · Or select a wall and Ctrl/Cmd-click another';

  $('draw-wall').classList.toggle('active',tool==='draw-wall');$('draw-wall').textContent=tool==='draw-wall'?'Done drawing':'+ Draw wall';

  const measuring=tool==='measure';

  $('add-dimension').classList.toggle('active',measuring&&measureKind==='points');$('add-dimension').textContent=measuring&&measureKind==='points'?'Cancel points':'Point to point';

  $('add-wall-dimension').classList.toggle('active',measuring&&measureKind==='walls');$('add-wall-dimension').textContent=measuring&&measureKind==='walls'?'Cancel measurement':'↔ Between walls';

  $('measure-reset').hidden=!measuring||!measureStart;

  if(mode==='rooms'&&measuring)$('mode-note').textContent=measureKind==='walls'?(measureStart?'2 · Tap the facing wall · The distance lines up automatically':'1 · Tap anywhere along the first wall · Pinch or scroll to zoom'):(measureStart?'Start snapped · tap another wall or corner':'Tap a wall or corner · Esc cancels');

  $('move-labels').classList.toggle('active',tool==='move-labels');

  svg.classList.toggle('edit-rooms',mode==='rooms');

  if(mode==='rooms'&&tool==='draw-wall')$('mode-note').textContent=wallStart?'Click wall end · Horizontal / vertical by default · Shift for an angle · Esc cancels':'Click the first wall endpoint · Draw separate segments to leave a doorway';

  if(mode==='rooms'&&tool==='move-labels')$('mode-note').textContent='Drag a room name to place it · Use Label X / Y for exact placement';

}

function wallPick(p,e){const picked=pickMeasurement(p);if(!wallStart||e.shiftKey)return picked.point;const a=wallStart,dx=picked.point[0]-a[0],dy=picked.point[1]-a[1];return Math.abs(dx)>=Math.abs(dy)?[picked.point[0],a[1]]:[a[0],picked.point[1]];}

function structurePointerDown(e,p){

  if(mode!=='rooms')return false;

  if(tool==='draw-wall'){

    const q=wallPick(p,e);if(!wallStart){wallStart=q;wallHover=q;toast('Click the other end of this wall.');}

    else{const a=wallStart;wallStart=null;wallHover=null;mutate(()=>{const id=uniqueId('partition-');M.addWall(plan,{id,name:'Internal wall',a,b:q,thickness:8});selected={type:'wall',id};});}render();e.preventDefault();return true;

  }

  const label=e.target.closest('[data-room-label]'),partition=e.target.closest('[data-partition]'),endpoint=e.target.closest('[data-wall-end]');

  if(label){selected={type:'room',id:label.dataset.roomLabel,label:true};drag={kind:'label',start:p,before:M.clone(plan),object:M.clone(current())};}

  else if(partition){selected={type:'wall',id:partition.dataset.partition};drag={kind:'partition',end:endpoint?.dataset.wallEnd,start:p,before:M.clone(plan),object:M.clone(current())};}

  else if(tool==='move-labels'){const room=e.target.closest('[data-room]');if(room){selected={type:'room',id:room.dataset.room};render();}return true;}

  else return false;

  svg.setPointerCapture(e.pointerId);e.preventDefault();render();return true;

}

function structureMove(e,p,dx,dy){

  if(drag.kind==='label'){const o=current();o.label=[snap(drag.object.label[0]+dx),snap(drag.object.label[1]+dy)];o.labelManual=true;return true;}

  if(drag.kind==='partition'){plan=M.clone(drag.before);const w=drag.object,origin=w[drag.end||'a'],delta=e.altKey?[dx,dy]:[snap(origin[0]+dx)-origin[0],snap(origin[1]+dy)-origin[1]];M.movePartition(plan,w.id,delta,drag.end);return true;}

  return false;

}

function partitionMarkup(w,exporting=false){const active=!exporting&&selected?.type==='wall'&&selected.id===w.id,hr=Math.max(6,6/(svg.getScreenCTM()?.a||1));let out=`<g data-partition="${esc(w.id)}" class="partition"><title>${esc(w.name)} · ${fmt(M.distance(w.a,w.b))} cm</title><line x1="${w.a[0]}" y1="${w.a[1]}" x2="${w.b[0]}" y2="${w.b[1]}" stroke="${active?'#8ce5c5':'#9ab0b5'}" stroke-width="${w.thickness}" stroke-linecap="butt"/>`;

  if(!exporting&&mode==='rooms'){out+=`<line x1="${w.a[0]}" y1="${w.a[1]}" x2="${w.b[0]}" y2="${w.b[1]}" stroke="transparent" stroke-width="${Math.max(w.thickness,hr*3)}"/>`;if(active)for(const k of ['a','b'])out+=`<circle data-wall-end="${k}" cx="${w[k][0]}" cy="${w[k][1]}" r="${hr}" fill="#17342f" stroke="#8ce5c5" stroke-width="2"/>`;}

  return out+'</g>';

}

function wallPreview(){if(!wallStart||!wallHover)return '';const mid=[(wallStart[0]+wallHover[0])/2,(wallStart[1]+wallHover[1])/2];return `<g pointer-events="none"><line x1="${wallStart[0]}" y1="${wallStart[1]}" x2="${wallHover[0]}" y2="${wallHover[1]}" stroke="#8ce5c5" stroke-width="8" stroke-dasharray="10 5"/><text x="${mid[0]}" y="${mid[1]-18}" fill="#c5ffec" text-anchor="middle" font-size="18">${fmt(M.distance(wallStart,wallHover))} cm</text></g>`;}

function inspectPartition(w){$('selection-panel').innerHTML=`<div class="eyebrow">Internal wall</div><h2>${esc(w.name)}</h2>${wallAlignmentControls({wallId:w.id})}<p class="subtle">Drag the wall or either endpoint in Edit rooms. Horizontal and vertical walls keep their alignment. Joined endpoints move together.</p><label class="field">Name<input data-field="name" value="${esc(w.name)}" maxlength="90"></label><label class="field">Wall length (cm)<input id="partition-length" type="number" min="1" max="50000" step="0.1" value="${Number(M.distance(w.a,w.b).toFixed(2))}"></label><button class="button" data-action="partition-length">Set driving length</button><label class="field">Thickness (cm)<input data-wall-thickness type="number" min="1" max="100" step="1" value="${w.thickness}"></label><p class="subtle">Draw two wall segments to leave a doorway. Internal walls appear in HA after saving. Use Add room if this needs its own HA room.</p><div class="object-actions"><button class="button danger" data-action="delete">Remove wall</button><button class="button" data-action="deselect">Deselect</button></div>`;}

function structureAction(action){const o=current();if(action==='partition-length'){mutate(()=>M.dimensionPartition(plan,o.id,Number($('partition-length').value)));return true;}if(action==='release-dimension'){mutate(()=>delete o.driving);return true;}if(action==='apply-node'){const values=[...$('selection-panel').querySelectorAll('[data-node-axis]')].map(el=>el.value===''?NaN:Number(el.value));if(values.length===2&&values.every(n=>Number.isFinite(n)&&Math.abs(n)<=50000))mutate(()=>M.moveNode(plan,o.id,selected.nodeId,values));return true;}if(action==='apply-room-bounds'){const values=['x','y','w','h'].map(k=>Number($('selection-panel').querySelector('[data-field="'+k+'"]').value));if(o.dimensionsLocked){const b=M.bounds(o.points);values[2]=b.w;values[3]=b.h;}if(values.every(Number.isFinite)&&values[2]>=1&&values[3]>=1)mutate(()=>M.transformRoom(plan,o.id,...values));return true;}return false;}

function structureInput(e){const o=current();if(!o)return false;if(e.target.dataset.labelAxis!==undefined){const v=Number(e.target.value),axis=Number(e.target.dataset.labelAxis);if(e.target.value!==''&&Number.isFinite(v)&&Math.abs(v)<=50000&&(o.label[axis]!==v||!o.labelManual)){if(!editBaseline)editBaseline=M.clone(plan);o.label[axis]=v;o.labelManual=true;drawPlan();persist();clearGeometryFailure();}return true;}if(e.target.dataset.wallThickness!==undefined){const v=Number(e.target.value);if(Number.isFinite(v)&&v>=1&&v<=100&&o.thickness!==v){if(!editBaseline)editBaseline=M.clone(plan);o.thickness=v;drawPlan();persist();}return true;}return false;}

$('draw-wall').onclick=()=>{flushEdit();tool=tool==='draw-wall'?null:'draw-wall';wallStart=null;wallHover=null;render();};

$('move-labels').onclick=()=>{flushEdit();tool=tool==='move-labels'?null:'move-labels';wallStart=null;wallHover=null;$('labels').checked=true;render();};

$('selection-panel').addEventListener('change',e=>{if(structureInput(e))return;if(e.target.dataset.nodeAxis!==undefined){editorInput(e);return;}const o=current(),f=e.target.dataset.field;if(selected?.type==='room'&&['w','h','x','y'].includes(f)&&e.target.value!==''){const v=Number(e.target.value),b=M.bounds(o.points);if(Number.isFinite(v)&&Math.abs(v)<50000&&(!['w','h'].includes(f)||v>=1))mutate(()=>M.transformRoom(plan,o.id,f==='x'?v:b.x,f==='y'?v:b.y,f==='w'?v:b.w,f==='h'?v:b.h));}});

