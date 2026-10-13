// Compiled into app.js's closure by build.py.

function roomLockControls(o){return `<section class="room-lock-controls"><button class="button ${o.dimensionsLocked?'active':''}" data-action="toggle-room-lock" aria-pressed="${!!o.dimensionsLocked}">${o.dimensionsLocked?'🔒 Unlock room dimensions':'🔓 Lock room dimensions'}</button><p class="subtle">${o.dimensionsLocked?'Size and shape locked. Other wall edits cannot resize this room. You can still move the whole room, rename it and arrange its contents.':'Once the room is measured, lock its size and shape to protect it while editing other rooms.'}</p></section>`;}

function geometryInspector(o){

  if(mode!=='rooms')return '';

  const ni=o.nodeIds.indexOf(selected.nodeId),ei=o.nodeIds.indexOf(selected.edgeId);

  let out=`<section class="node-tools"><h3>Wall nodes · ${o.points.length}</h3><button class="button ${tool==='add-node'?'active':''}" data-action="add-node">${tool==='add-node'?'Cancel add node':'+ Add node'}</button><p>Choose Add node and tap a wall. Tap any length on the plan to resize it. Click a corner to edit it.</p>`;

  if(ni>=0){out+=`<h3>Selected node ${ni+1}</h3><div class="fields"><label class="field">Node X (cm)<input data-node-axis="0" type="number" step="0.1" value="${Number(o.points[ni][0].toFixed(2))}"></label><label class="field">Node Y (cm)<input data-node-axis="1" type="number" step="0.1" value="${Number(o.points[ni][1].toFixed(2))}"></label></div><button class="button" data-action="apply-node">Apply node position</button><button class="button" data-action="snap-node">Snap node to 10 cm</button><button class="button danger" data-action="remove-node" ${o.points.length<=3?'disabled':''}>Remove selected node</button><p>Snap 10 cm controls dragging. Typed measurements stay exact.</p>`;}

  if(ei>=0){const a=o.points[ei],b=o.points[(ei+1)%o.points.length];out+=`<h3>Selected wall · nodes ${ei+1}–${(ei+1)%o.points.length+1}</h3>${wallAlignmentControls({roomId:o.id,nodeId:selected.edgeId})}<div class="object-actions"><button class="button" data-action="wall-vertical">Make vertical</button><button class="button" data-action="wall-horizontal">Make horizontal</button></div><p>Drag the highlighted wall to move it sideways. The straight wall run, connected corners and doors follow. Shift = free movement · Alt = no snapping.</p><label class="field">Wall length (cm)<input id="wall-length" type="number" min="1" step="0.1" value="${Number(M.distance(a,b).toFixed(2))}"></label><button class="button" data-action="set-wall-length">Set driving length</button><button class="button" data-action="dimension-wall">Dimension this wall</button><p>A driving length keeps the first corner fixed, adjusts connected walls and stays locked for future edits.</p>`;}

  out+=`<h3>Room name position</h3><p>Drag the name on the plan, or enter its position.</p><div class="fields"><label class="field">Label X (cm)<input data-label-axis="0" type="number" step="1" value="${Number(o.label[0].toFixed(2))}"></label><label class="field">Label Y (cm)<input data-label-axis="1" type="number" step="1" value="${Number(o.label[1].toFixed(2))}"></label></div><button class="button" data-action="centre-label">Centre room label</button>`;

  return out+'</section>';

}

function inspectDimension(d){const a=M.resolveEnd(plan,d,'a'),b=M.resolveEnd(plan,d,'b'),anchored=M.canDriveDimension(plan,d);$('selection-panel').innerHTML=`<div class="eyebrow">${d.driving?'◆ Driving dimension':'◇ Reference dimension'}</div><h2>${fmt(M.distance(a,b))} cm</h2><p class="subtle">${d.driving?'This length is locked. Edits preserve wall alignment and all other driving dimensions.':anchored?'Both ends touch walls. Set a driving length to anchor them and resize the geometry.':'Reference measurement. Drag its endpoints onto room walls or internal wall endpoints to drive geometry.'}</p><label class="field">Note (optional)<input data-dim-field="label" maxlength="100" value="${esc(d.label||'')}"></label><label class="field">Line offset (cm)<input data-dim-field="offset" type="number" step="1" value="${Number(d.offset.toFixed(1))}"></label><label class="field">Driving length (cm)<input id="dimension-length" type="number" min="1" max="50000" step="0.1" value="${Number(M.distance(a,b).toFixed(2))}"></label><button class="button" data-action="dimension-length">Apply dimension</button>${d.driving?'<button class="button" data-action="release-dimension">Make reference (unlock)</button>':''}<div class="object-actions"><button class="button danger" data-action="delete">Remove</button><button class="button" data-action="deselect">Deselect</button></div>`;}



function dimensionMarkup(d,exporting=false,preview=false){

  const a=M.resolveEnd(plan,d,'a'),b=M.resolveEnd(plan,d,'b'),length=M.distance(a,b);if(length<.01)return '';

  const u=[(b[0]-a[0])/length,(b[1]-a[1])/length],n=[-u[1],u[0]],off=d.offset??30,A=[a[0]+n[0]*off,a[1]+n[1]*off],B=[b[0]+n[0]*off,b[1]+n[1]*off],mid=[(A[0]+B[0])/2,(A[1]+B[1])/2];

  let angle=Math.atan2(u[1],u[0])*180/Math.PI;if(angle>90)angle-=180;if(angle<-90)angle+=180;

  const active=!exporting&&selected?.type==='dimension'&&selected.id===d.id,ink=preview?'#7b92a4':active?'#19648e':'#3b7698',hr=exporting?7:Math.max(7,6/(svg.getScreenCTM()?.a||1));

  let out=`<g class="dimension-line ${active?'dimension-selected':''}" ${preview?'':`data-dimension="${esc(d.id)}"`}><path d="M${a[0]} ${a[1]}L${A[0]+n[0]*8} ${A[1]+n[1]*8}M${b[0]} ${b[1]}L${B[0]+n[0]*8} ${B[1]+n[1]*8}M${A[0]} ${A[1]}L${B[0]} ${B[1]}" fill="none" stroke="${ink}" stroke-width="1.8"/><path d="M${A[0]-u[0]*5-n[0]*5} ${A[1]-u[1]*5-n[1]*5}l${u[0]*10+n[0]*10} ${u[1]*10+n[1]*10}M${B[0]-u[0]*5-n[0]*5} ${B[1]-u[1]*5-n[1]*5}l${u[0]*10+n[0]*10} ${u[1]*10+n[1]*10}" stroke="${ink}" stroke-width="2"/>`;

  if(!exporting&&!preview)out+=`<path d="M${A[0]} ${A[1]}L${B[0]} ${B[1]}" stroke="transparent" stroke-width="${hr*3}" fill="none"/>`;

  out+=`<text ${exporting||preview?'':`data-dimension-offset="${esc(d.id)}" role="button" tabindex="0" aria-label="Edit dimension ${fmt(length)} centimetres"`} x="0" y="-7" transform="translate(${mid[0]} ${mid[1]}) rotate(${angle})" text-anchor="middle" fill="${ink}" font-family="Segoe UI,Arial,sans-serif" font-size="${exporting?16:12/(svg.getScreenCTM()?.a||1)}" stroke="#fbfcf6" stroke-width="5" paint-order="stroke" stroke-linejoin="round">${esc(d.label?d.label+' · ':'')}${fmt(length)} cm${d.driving?' ◆':''}</text>`;

  if(active&&!d.driving)for(const [key,p] of [['a',a],['b',b]])out+=`<circle class="dimension-handle" data-dim-handle="${key}" cx="${p[0]}" cy="${p[1]}" r="${hr}" stroke-width="2"/>`;

  return out+'</g>';

}

function newDimension(a,b,anchors={}){if(M.distance(a,b)<1){toast('Choose two different points.');return;}mutate(()=>{const d={id:uniqueId('dimension-'),a:[...a],b:[...b],offset:30,label:'',...anchors};plan.dimensions.push(d);selected={type:'dimension',id:d.id};});}

function pickMeasurement(p){const pos=[p.x,p.y],scale=svg.getScreenCTM()?.a||1,tolerance=(matchMedia('(pointer:coarse)').matches?26:20)/scale;if(tool==='measure'&&measureKind==='walls')return M.pickMeasurementWall(plan,pos,28/scale);let best={distance:tolerance};

 for(const r of plan.rooms)r.points.forEach((q,i)=>{const dist=M.distance(q,pos);if(dist<best.distance)best={distance:dist,point:[...q],anchor:{roomId:r.id,nodeId:r.nodeIds[i]},label:'Corner',snapped:true};});

 for(const w of plan.walls||[])for(const end of ['a','b']){const dist=M.distance(w[end],pos);if(dist<best.distance)best={distance:dist,point:[...w[end]],anchor:{wallId:w.id,end},label:'Wall endpoint',snapped:true};}

 if(best.point&&best.distance<12/scale)return best;

 for(const r of plan.rooms)r.points.forEach((q,i)=>{const b=r.points[(i+1)%r.points.length],hit=M.projectPoint(pos,q,b);if(hit.distance<best.distance){let point=hit.point;if(measureStart){const a=measureStart.point;if(Math.abs(q[0]-b[0])<.01&&Math.abs(a[1]-point[1])<tolerance&&a[1]>=Math.min(q[1],b[1])&&a[1]<=Math.max(q[1],b[1]))point=[q[0],a[1]];if(Math.abs(q[1]-b[1])<.01&&Math.abs(a[0]-point[0])<tolerance&&a[0]>=Math.min(q[0],b[0])&&a[0]<=Math.max(q[0],b[0]))point=[a[0],q[1]];}best={...hit,point,label:'Wall',snapped:true};}});

 return best.point?best:{point:[snap(p.x),snap(p.y)],snapped:false};}

function addNodeAt(room,index,p){try{mutate(()=>{const id=M.insertNode(plan,room.id,index,p);selected={type:'room',id:room.id,nodeId:id};tool=null;});toast('Node added. Drag it or enter its X and Y coordinates.');}catch(e){toast(e.message);}}

function insertNearestNode(p){const rooms=selected?.type==='room'?[current()]:plan.rooms;let best=null;for(const r of rooms.filter(Boolean))r.points.forEach((a,i)=>{const hit=M.projectPoint([p.x,p.y],a,r.points[(i+1)%r.points.length]);if(!best||hit.distance<best.distance)best={...hit,room:r,index:i};});if(!best||best.distance>18/(svg.getScreenCTM()?.a||1)){toast('Click directly on a wall to add a node.');return;}addNodeAt(best.room,best.index,best.point);}

function nearestEditableWall(p){let best=null;const rooms=[...plan.rooms].sort((a,b)=>(b.id===selected?.id?1:0)-(a.id===selected?.id?1:0)),tol=Math.min(12,6/(svg.getScreenCTM()?.a||1));for(const r of rooms)r.points.forEach((a,i)=>{const hit=M.projectPoint([p.x,p.y],a,r.points[(i+1)%r.points.length]);if(M.distance(a,r.points[(i+1)%r.points.length])>1&&hit.distance<tol&&(!best||hit.distance<best.distance-.01))best={...hit,room:r,index:i};});return best;}

function editorAction(action){

  const o=current();

  if(action==='toggle-room-lock'&&selected?.type==='room'){const locked=!o.dimensionsLocked;if(mutate(()=>M.setRoomLock(plan,o.id,locked)))toast(locked?'Room size and shape locked':'Room unlocked · existing driving dimensions are still active');return true;}

  if(action==='add-node'){tool=tool==='add-node'?null:'add-node';render();return true;}

  if(action==='remove-node'){try{mutate(()=>{M.removeNode(plan,o.id,selected.nodeId);delete selected.nodeId;});}catch(e){toast(e.message);}return true;}

  if(action==='snap-node'){try{mutate(()=>M.snapNode10(plan,o.id,selected.nodeId));toast('Node snapped to the nearest 10 cm.');}catch(e){toast(e.message);}return true;}

  if(action==='wall-vertical'||action==='wall-horizontal'){try{mutate(()=>M.alignWall(plan,o.id,selected.edgeId,action==='wall-vertical'?'vertical':'horizontal'));}catch(e){toast(e.message);}return true;}

  if(action==='centre-label'){mutate(()=>{delete o.labelManual;o.label=M.labelPosition(o,true);});return true;}

  if(action==='set-wall-length'){const value=Number($('wall-length').value);try{mutate(()=>M.setWallLength(plan,o.id,selected.edgeId,value));}catch(e){toast(e.message);}return true;}

  if(action==='dimension-wall'){const i=o.nodeIds.indexOf(selected.edgeId),j=(i+1)%o.points.length;newDimension(o.points[i],o.points[j],{aAnchor:{roomId:o.id,nodeId:o.nodeIds[i]},bAnchor:{roomId:o.id,nodeId:o.nodeIds[j]}});return true;}

  if(action==='dimension-length'&&M.canDriveDimension(plan,o)){mutate(()=>M.driveDimension(plan,o.id,Number($('dimension-length').value)));return true;}

  if(action==='dimension-length'){toast('Snap both endpoints onto walls or corners first.');return true;}

  if((action==='mirror-x'||action==='mirror-y')&&selected?.type==='item'){mutate(()=>{const k=action==='mirror-x'?'mirrorX':'mirrorY';o[k]=!o[k];});return true;}

  if(action==='flip'){mutate(()=>{o.swing=M.doorSwing(o);o.flip=!o.flip;});return true;}

  return false;

}

function editorInput(e){

  const o=current();if(!o)return false;

  if(e.target.dataset.doorSwing!==undefined){mutate(()=>o.swing=e.target.value);return true;}

  if(e.target.dataset.nodeAxis!==undefined){if(e.type!=='change')return true;const axis=Number(e.target.dataset.nodeAxis),v=Number(e.target.value),i=o.nodeIds.indexOf(selected.nodeId);if(e.target.value===''||!Number.isFinite(v)||Math.abs(v)>50000||i<0)return true;const p=[...o.points[i]];p[axis]=v;mutate(()=>M.moveNode(plan,o.id,selected.nodeId,p));return true;}

  const field=e.target.dataset.dimField;if(field){let value=e.target.value;if(field==='offset'){if(value==='')return true;value=Number(value);if(!Number.isFinite(value)||Math.abs(value)>50000)return true;}if(!editBaseline)editBaseline=M.clone(plan);o[field]=value;drawPlan();persist();return true;}return false;

}

function wallControls(o){const hr=Math.max(6,6/(svg.getScreenCTM()?.a||1));let out='';o.points.forEach((a,i)=>{const b=o.points[(i+1)%o.points.length],len=M.distance(a,b)||1,mid=[(a[0]+b[0])/2-(b[1]-a[1])/len*hr*2.6,(a[1]+b[1])/2+(b[0]-a[0])/len*hr*2.6],active=selected.edgeId===o.nodeIds[i];if(active)out+=`<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="#347b9e" stroke-width="7" pointer-events="none"/>`;out+=`<line class="wall-target" data-edge="${i}" aria-label="Wall ${i+1}" x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="transparent" stroke-width="${hr*3}"/>`;});

  out+=o.points.map((p,i)=>`<circle class="handle vertex" data-vertex="${i}" cx="${p[0]}" cy="${p[1]}" r="${hr}" style="fill:${selected.nodeId===o.nodeIds[i]?'#659a72':'#fffef9'}"/>`).join('');return out;}



function wallDragDelta(dx,dy,e){

  const r=drag.object,i=r.nodeIds.indexOf(drag.edgeId),a=r.points[i],b=r.points[(i+1)%r.points.length],len=M.distance(a,b)||1,n=[-(b[1]-a[1])/len,(b[0]-a[0])/len];

  let delta=e.shiftKey?[dx,dy]:n.map(v=>v*(dx*n[0]+dy*n[1]));

  if(e.altKey){snapGuide=null;return delta;}

  const span=M.wallRun(drag.before,a,b),tol=Math.min(10,9/(svg.getScreenCTM()?.a||1)),moving=drag.before.rooms.flatMap(r=>r.points).filter(q=>M.projectPoint(q,...span).distance<.01),axis=Math.abs(b[0]-a[0])<.01?0:Math.abs(b[1]-a[1])<.01?1:null;

  if(axis!==null&&!e.shiftKey){

    const wanted=a[axis]+delta[axis];let value=$('snap').checked?M.snap10(wanted):wanted,label=$('snap').checked?'10 cm grid':'';

    if($('align').checked){let best=tol;for(const room of drag.before.rooms)for(const q of room.points){if(moving.some(m=>M.samePoint(m,q)))continue;const d=Math.abs(q[axis]-wanted);if(d<best){best=d;value=q[axis];label='Aligned wall';}}}

    delta[axis]=value-a[axis];delta[1-axis]=0;snapGuide={point:[a[0]+delta[0],a[1]+delta[1]],label,axes:[axis]};

  }else{const pick=M.smartSnap(drag.before,[a[0]+delta[0],a[1]+delta[1]],{exclude:moving,origin:a,tolerance:tol,grid:$('snap').checked,align:$('align').checked});delta=[pick.point[0]-a[0],pick.point[1]-a[1]];if(!e.shiftKey){const t=delta[0]*n[0]+delta[1]*n[1];delta=n.map(v=>v*t);}snapGuide={...pick,point:[a[0]+delta[0],a[1]+delta[1]]};}

  return delta;

}

function snapGuideMarkup(){if(!snapGuide?.label)return '';const [x,y]=snapGuide.point,s=1/(svg.getScreenCTM()?.a||1);return `<g pointer-events="none" class="snap-guide"><path d="M${x} ${view.y}V${view.y+view.h}M${view.x} ${y}H${view.x+view.w}" stroke="#c27a27" stroke-width="${s}" stroke-dasharray="${5*s} ${5*s}"/><circle cx="${x}" cy="${y}" r="${5*s}" fill="#fff8df" stroke="#c27a27" stroke-width="${2*s}"/><text x="${x+12*s}" y="${y-12*s}" fill="#89511b" font-size="${12*s}" stroke="#fffdf0" stroke-width="${4*s}" paint-order="stroke">${esc(snapGuide.label)}</text></g>`;}

