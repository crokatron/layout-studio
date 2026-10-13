// Dimension labels live on the drawing. Editing them drives the room solver.

let dimensionTarget=null;

function dimensionEditor(target){dimensionTarget=target;let length;if(target.span)length=target.span.length;else if(target.dimension){const d=plan.dimensions.find(d=>d.id===target.dimension);if(!d)return;length=M.distance(M.resolveEnd(plan,d,'a'),M.resolveEnd(plan,d,'b'));}else if(target.wall){const w=plan.walls.find(w=>w.id===target.wall);length=M.distance(w.a,w.b);}else{const r=plan.rooms.find(r=>r.id===target.room),i=r.nodeIds.indexOf(target.node);length=M.distance(r.points[i],r.points[(i+1)%r.points.length]);}$('dimension-title').textContent=target.span?'Distance between walls':'Edit dimension';$('dimension-description').textContent=target.span?'The first wall stays fixed. Enter the distance between the highlighted wall lines. Connected walls keep their alignment.':'Connected walls update together. Horizontal and vertical walls keep their alignment.';$('direct-length').value=Number(length.toFixed(2));$('direct-error').textContent='';$('dimension-dialog').showModal();$('direct-length').focus();$('direct-length').select();}

$('dimension-form').onsubmit=e=>{e.preventDefault();const length=Number($('direct-length').value),before=M.clone(plan),previousSelection=M.clone(selected);try{if(!Number.isFinite(length)||length<1||length>50000)throw Error('Enter a length from 1 to 50,000 cm.');if(dimensionTarget.span){const s=dimensionTarget.span,id=uniqueId('dimension-');const savedId=M.dimensionBetweenWalls(plan,id,s.first,s.second,s.a,length);selected={type:'dimension',id:savedId};}else if(dimensionTarget.dimension)M.driveDimension(plan,dimensionTarget.dimension,length);else if(dimensionTarget.wall)M.dimensionPartition(plan,dimensionTarget.wall,length);else M.setWallLength(plan,dimensionTarget.room,dimensionTarget.node,length);M.validate(plan);tool=null;measureStart=null;measureHover=null;snapGuide=null;commit(before);$('dimension-dialog').close();mobilePanel('plan');toast('Dimension applied · connected walls updated');}catch(error){plan=before;selected=previousSelection;$('direct-error').textContent=error.message;geometryFailure(error);drawPlan();}};

function roomMeasureMarkup(){if(mode!=='rooms'||tool||!selected)return '';const scale=svg.getScreenCTM()?.a||1,s=1/scale;let walls=[];if(selected.type==='room'){const r=current();walls=r.points.map((a,i)=>({a,b:r.points[(i+1)%r.points.length],attr:`data-length-room="${esc(r.id)}" data-length-node="${esc(r.nodeIds[i])}"`}));}else if(selected.type==='wall'){const w=current();walls=[{a:w.a,b:w.b,attr:`data-length-wall="${esc(w.id)}"`}];}return walls.map(({a,b,attr})=>{const len=M.distance(a,b);if(len*scale<42)return '';const n=[-(b[1]-a[1])/len,(b[0]-a[0])/len],mid=[(a[0]+b[0])/2+n[0]*24*s,(a[1]+b[1])/2+n[1]*24*s];let angle=Math.atan2(b[1]-a[1],b[0]-a[0])*180/Math.PI;if(angle>90)angle-=180;if(angle< -90)angle+=180;return `<g class="wall-measure" ${attr} role="button" tabindex="0" aria-label="Edit wall length ${fmt(len)} centimetres" transform="translate(${mid[0]} ${mid[1]}) rotate(${angle})"><rect x="${-42*s}" y="${-18*s}" width="${84*s}" height="${36*s}" rx="${6*s}" fill="#10262e" fill-opacity=".92"/><text text-anchor="middle" dominant-baseline="central" font-size="${12*s}" stroke-width="${3*s}">${fmt(len)} cm</text></g>`;}).join('');}

function measurementTap(p){const pick=pickMeasurement(p);snapGuide=measureKind==='walls'?null:pick;if(!pick.snapped){toast(measureKind==='walls'?'Tap anywhere along a wall. Pinch or scroll to zoom in.':'Tap near a wall or corner. Zoom in to separate nearby walls.');drawPlan();return;}if(!measureStart){measureStart=pick;measureHover=pick;toast(measureKind==='walls'?'First wall selected · tap the facing wall':'Start snapped · tap the other wall or corner');}else if(measureKind==='walls'){measureHover=pick;try{const span=M.betweenWalls(plan,measureStart.wall,pick.wall,measureStart.point);drawPlan();dimensionEditor({span});}catch(error){toast(error.message);drawPlan();}return;}else{const start=measureStart;if(M.distance(start.point,pick.point)<1){toast('Choose a different endpoint.');return;}measureStart=null;measureHover=null;tool=null;snapGuide=null;newDimension(start.point,pick.point,{...(start.anchor?{aAnchor:start.anchor}:{}),...(pick.anchor?{bAnchor:pick.anchor}:{})});}render();}

function beginMeasurement(kind){const cancel=tool==='measure'&&measureKind===kind;setMode('rooms');clearGeometryFailure();measureKind=kind;tool=cancel?null:'measure';selected=null;snapGuide=null;render();mobilePanel('plan');}

$('add-dimension').onclick=()=>beginMeasurement('points');

$('add-wall-dimension').onclick=()=>beginMeasurement('walls');

$('measure-reset').onclick=()=>{measureStart=null;measureHover=null;snapGuide=null;render();};

function wallMeasurementMarkup(){

  if(mode!=='rooms'||tool!=='measure'||measureKind!=='walls')return '';

  const scale=svg.getScreenCTM()?.a||1,s=1/scale;let span=null;

  if(measureStart?.wall&&measureHover?.wall)try{span=M.betweenWalls(plan,measureStart.wall,measureHover.wall,measureStart.point);}catch{}

  let out='<g class="wall-measure-targets" pointer-events="none">';

  for(const wall of M.measurementWalls(plan)){const first=wall.key===measureStart?.wall?.key,hover=wall.key===measureHover?.wall?.key,ink=first?'#82f0c6':hover?'#ffd68a':'#a6d9f6';out+=`<line data-measure-wall="${esc(wall.key)}" x1="${wall.a[0]}" y1="${wall.a[1]}" x2="${wall.b[0]}" y2="${wall.b[1]}" stroke="${ink}" stroke-opacity="${first||hover ? .9 : .12}" stroke-width="${(first||hover?8:14)*s}" stroke-linecap="round"/>`;}

  if(span)out+=dimensionMarkup({...span,offset:0,label:''},false,true);

  for(const [pick,number,pt] of [[measureStart,1,span?.a],[measureHover,2,span?.b]]){if(!pick?.wall||number===2&&(!measureStart||pick.wall.key===measureStart.wall.key))continue;const q=pt||pick.point;out+=`<g transform="translate(${q[0]} ${q[1]})"><circle r="${12*s}" fill="${number===1?'#82f0c6':'#ffd68a'}" stroke="#10262e" stroke-width="${2*s}"/><text text-anchor="middle" dominant-baseline="central" fill="#10262e" font-size="${13*s}" font-weight="700">${number}</text></g>`;}

  return out+'</g>';

}

svg.addEventListener('keydown',e=>{if(!['Enter',' '].includes(e.key))return;const label=e.target.closest('[data-length-room],[data-length-wall],[data-dimension-offset]');if(!label)return;e.preventDefault();dimensionEditor(label.dataset.lengthRoom?{room:label.dataset.lengthRoom,node:label.dataset.lengthNode}:label.dataset.lengthWall?{wall:label.dataset.lengthWall}:{dimension:label.dataset.dimensionOffset});});

