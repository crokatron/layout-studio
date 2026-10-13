// Compiled into the app closure. Box selection is transient; only edits are saved.

function groupInspector(){

  const s=selected?.type==='multi'?selected:null,points=s?M.selectionPoints(plan,s):[],count=points.length+(s?.items.length||0)+(s?.dimensions.length||0)+(s?.devices?.length||0);

  $('selection-panel').innerHTML=`<div class="eyebrow">Box selection</div><h2>${count?'Move selected together':'Select part of the plan'}</h2><p class="subtle">Drag a box around the corners you want to move. To widen rooms, enclose the corners on one side and move them outward. The other corners stay fixed.</p>${count?`<p class="selection-count" role="status">${points.length} corners · ${s.items.length} objects · ${s.devices?.length||0} devices · ${s.dimensions.length} dimensions</p><label class="field" for="group-axis">Movement<select id="group-axis"><option value="free" ${groupAxis==='free'?'selected':''}>Free movement</option><option value="horizontal" ${groupAxis==='horizontal'?'selected':''}>Horizontal only — widen</option><option value="vertical" ${groupAxis==='vertical'?'selected':''}>Vertical only — lengthen</option></select></label><p class="subtle">Drag inside the blue selection to move it. Connected corners and doors follow. Shift locks a drag to one axis; Alt bypasses snapping.</p><div class="fields"><label class="field">Move right (cm)<input id="group-dx" type="number" value="0" step="10"></label><label class="field">Move down (cm)<input id="group-dy" type="number" value="0" step="10"></label></div><button class="button primary" data-action="move-group">Move selection</button><p class="subtle">Use negative numbers for left or up. Arrow keys nudge 1 cm; Shift + arrows moves 10 cm.</p><button class="button" data-action="new-box">New selection box</button><button class="button" data-action="deselect">Clear selection</button>`:'<p class="subtle">A box can start anywhere, even inside a room. Enclosed furniture, device centres, wall endpoints and dimensions are included. Shared corners always move together.</p>'}<p class="subtle">Shift + draw adds another box. Ctrl + draw starts a new box inside the current selection. Esc clears or cancels. Undo restores the last move.</p>`;

}

function groupMarkup(){

  if(mode!=='box')return '';const s=selected?.type==='multi'?selected:null,pts=s?M.selectionPoints(plan,s):[],scale=1/(svg.getScreenCTM()?.a||1),has=q=>pts.some(p=>M.samePoint(p,q));let out='';

  for(const r of plan.rooms)r.points.forEach((a,i)=>{const b=r.points[(i+1)%r.points.length];if(has(a)&&has(b))out+=`<path d="M${a[0]} ${a[1]}L${b[0]} ${b[1]}" stroke="#277ba6" stroke-width="${4*scale}" pointer-events="none"/>`;});

  const all=plan.rooms.flatMap(r=>r.points);for(const [i,q] of all.entries()){if(all.findIndex(p=>M.samePoint(p,q))!==i)continue;out+=`<circle class="box-node ${has(q)?'box-node-selected':''}" cx="${q[0]}" cy="${q[1]}" r="${(has(q)?5:3)*scale}" fill="${has(q)?'#277ba6':'#fffdf8'}" stroke="${has(q)?'#165d86':'#788d80'}" stroke-width="${1.4*scale}" pointer-events="none"/>`;}

  if(s){for(const d of plan.devices||[])if((s.devices||[]).includes(d.device_id))out+=`<circle cx="${d.x}" cy="${d.y}" r="${18*scale}" fill="#4a9dd71a" stroke="#70cfff" stroke-width="${2*scale}" pointer-events="none"/>`;for(const it of plan.items)if(s.items.includes(it.id))out+=`<polygon points="${M.itemCorners(it).map(q=>q.join(',')).join(' ')}" fill="#4a9dd71a" stroke="#277ba6" stroke-width="${2*scale}" pointer-events="none"/>`;for(const d of plan.dimensions)if(s.dimensions.includes(d.id)){const a=M.resolveEnd(plan,d,'a'),b=M.resolveEnd(plan,d,'b');out+=`<path d="M${a[0]} ${a[1]}L${b[0]} ${b[1]}" stroke="#277ba6" stroke-width="${4*scale}" stroke-dasharray="${5*scale} ${4*scale}" pointer-events="none"/>`;}

    const b=M.selectionBounds(plan,s);if(b&&drag?.kind!=='marquee'){const pad=12*scale;out+=`<rect class="group-frame" data-group-move x="${b.x-pad}" y="${b.y-pad}" width="${b.w+pad*2}" height="${b.h+pad*2}" rx="${4*scale}" fill="#438bc80c" stroke="#277ba6" stroke-width="${1.5*scale}" stroke-dasharray="${6*scale} ${4*scale}"/><g data-group-move class="group-handle" role="button" aria-label="Drag selection"><rect x="${b.x-pad}" y="${b.y-pad-27*scale}" width="${126*scale}" height="${24*scale}" rx="${5*scale}" fill="#277ba6"/><text x="${b.x-pad+10*scale}" y="${b.y-pad-11*scale}" font-size="${12*scale}" fill="white">↔ Move selection</text></g>`;}}

  if(drag?.kind==='marquee'){const b=M.bounds([[drag.start.x,drag.start.y],[drag.last.x,drag.last.y]]);out+=`<rect class="marquee" x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" fill="#438bc81c" stroke="#277ba6" stroke-width="${1.5*scale}" stroke-dasharray="${5*scale} ${4*scale}" pointer-events="none"/>`;}

  return out;

}

function startBoxPointer(e,p){

  const s=selected?.type==='multi'?selected:null;

  if(s&&e.target.closest('[data-group-move]')&&!e.ctrlKey&&!e.metaKey){drag={kind:'group',start:p,before:M.clone(plan),selection:M.clone(s),pointerId:e.pointerId};}

  else{drag={kind:'marquee',start:p,last:p,previous:s?M.clone(s):null,add:e.shiftKey,pointerId:e.pointerId};if(!e.shiftKey)selected=null;}

  svg.setPointerCapture(e.pointerId);e.preventDefault();render();

}

function groupDragDelta(dx,dy,e){

  let axis=groupAxis;if(e.shiftKey&&axis==='free')axis=Math.abs(dx)>=Math.abs(dy)?'horizontal':'vertical';let delta=[axis==='vertical'?0:dx,axis==='horizontal'?0:dy];

  if(!e.altKey&&$('snap').checked)delta=delta.map(M.snap10);snapGuide=null;

  const pts=M.selectionPoints(drag.before,drag.selection),anchor=pts[0];

  if(!e.altKey&&$('align').checked&&anchor){const pick=M.smartSnap(drag.before,[anchor[0]+delta[0],anchor[1]+delta[1]],{exclude:pts,origin:anchor,tolerance:Math.min(8,7/(svg.getScreenCTM()?.a||1)),grid:false});if(axis!=='vertical')delta[0]=pick.point[0]-anchor[0];if(axis!=='horizontal')delta[1]=pick.point[1]-anchor[1];snapGuide={...pick,point:[anchor[0]+delta[0],anchor[1]+delta[1]]};}

  return delta;

}

function moveGroupBy(dx,dy){if(selected?.type!=='multi')return;try{mutate(()=>M.moveSelection(plan,selected,dx,dy));}catch(e){toast(e.message);}}

