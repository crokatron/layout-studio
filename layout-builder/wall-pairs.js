// Two-wall selection shares the geometry solver with direct dimensions.

function activeWallPick(){

  let ref;if(selected?.type==='wall')ref={wallId:selected.id};

  else if(selected?.type==='room'&&selected.edgeId)ref={roomId:selected.id,nodeId:selected.edgeId};

  if(!ref)return null;const wall=M.resolveWall(plan,ref);return {wall,point:wall.a.map((v,i)=>(v+wall.b[i])/2)};

}

function beginWallPair(first=null){

  setMode('rooms');clearGeometryFailure();selected={type:'wall-pair',picks:first?[first]:[]};tool='wall-pair';snapGuide=null;render();mobilePanel('plan');

}

function wallPairTap(p){

  const hit=M.pickMeasurementWall(plan,[p.x,p.y],28/(svg.getScreenCTM()?.a||1));

  if(!hit.snapped){toast('Tap anywhere along a wall. Pinch or scroll to zoom.');return;}

  if(selected?.type!=='wall-pair')selected={type:'wall-pair',picks:[]};

  const picks=selected.picks;

  if(picks.length){const a=M.resolveWall(plan,picks[0].wall),b=hit.wall;if(M.projectPoint(a.a,b.a,b.b).distance<.001&&M.projectPoint(a.b,b.a,b.b).distance<.001){toast('Choose a different wall.');return;}}

  if(picks.length===2)picks.pop();picks.push({wall:M.wallReference(hit.wall),point:hit.point});

  render();if(picks.length===2)mobilePanel('edit');else toast('First wall selected · tap the second wall');

}

function wallPairSpan(){const picks=selected?.type==='wall-pair'?selected.picks:[];if(picks.length!==2)throw Error('Select two walls first.');return M.betweenWalls(plan,picks[0].wall,picks[1].wall,picks[0].point);}

function inspectWallPair(){

  const picks=selected.picks;let distance='',problem='',collinear=false;if(picks.length===2)try{const a=M.resolveWall(plan,picks[0].wall),b=M.resolveWall(plan,picks[1].wall),dx=a.b[0]-a.a[0],dy=a.b[1]-a.a[1],length=Math.hypot(dx,dy);collinear=[b.a,b.b].every(q=>Math.abs(dx*(q[1]-a.a[1])-dy*(q[0]-a.a[0]))/length<.001);}catch{};if(picks.length===2)try{distance=fmt(wallPairSpan().length)+' cm';}catch(e){problem=e.message;}

  const names=picks.map((p,i)=>{try{return `<li><b>${i+1}${i===0?' · Fixed reference':''}</b><span>${esc(M.resolveWall(plan,p.wall).label)}</span></li>`;}catch{return '<li>Wall no longer exists · select again</li>';}}).join('');

  let commonAlignment=false;if(picks.length===2)try{const ids=new Set(M.wallAlignmentsFor(plan,picks[0].wall).map(c=>c.id));commonAlignment=M.wallAlignmentsFor(plan,picks[1].wall).some(c=>ids.has(c.id));}catch{}

  let alignments=[];for(const p of picks)try{for(const c of M.wallAlignmentsFor(plan,p.wall))if(!alignments.some(a=>a.id===c.id))alignments.push(c);}catch{}

  $('selection-panel').innerHTML=`<div class="eyebrow">Edit rooms · wall tools</div><h2>${picks.length===2?'Two walls selected':'Select two walls'}</h2><p class="subtle">The first wall stays fixed when applying a distance or alignment. Use Swap reference to move the other wall.</p><ol class="wall-pair-list">${names}</ol>${picks.length<2?'<p class="subtle">Tap the next wall on the plan. On desktop you can also Ctrl/Cmd-click a second wall.</p>':`<p class="wall-pair-distance">${distance?`Distance · <b>${distance}</b>`:collinear?'Collinear · same straight line':esc(problem)}</p><div class="object-actions"><button class="button primary" data-action="pair-distance" ${distance?'':'disabled'}>Drive distance</button><button class="button" data-action="pair-collinear" ${collinear&&commonAlignment?'disabled':''}>Make collinear</button></div><p class="subtle">Collinear puts both walls on one straight line and keeps them aligned in future edits. The reference wall must be horizontal or vertical.</p><button class="button" data-action="pair-swap">Swap reference</button>`}${alignments.map(c=>`<p class="subtle">Saved collinear alignment</p><button class="button" data-action="release-wall-alignment" data-alignment="${esc(c.id)}">Release collinear alignment</button>`).join('')}<div class="object-actions"><button class="button" data-action="pair-reset">Select different walls</button><button class="button" data-action="pair-done">Done</button></div>`;

}

function wallPairMarkup(){

  if(mode!=='rooms'||selected?.type!=='wall-pair')return '';const s=1/(svg.getScreenCTM()?.a||1);let out='<g class="wall-pair-overlay" pointer-events="none">';

  if(tool==='wall-pair')for(const w of M.measurementWalls(plan))out+=`<line x1="${w.a[0]}" y1="${w.a[1]}" x2="${w.b[0]}" y2="${w.b[1]}" stroke="#a6d9f6" stroke-opacity=".12" stroke-width="${14*s}"/>`;

  selected.picks.forEach((pick,i)=>{try{const w=M.resolveWall(plan,pick.wall),q=M.projectPoint(pick.point,w.a,w.b).point,color=i===0?'#82f0c6':'#ffd68a';out+=`<g data-selected-wall="${i+1}"><line x1="${w.a[0]}" y1="${w.a[1]}" x2="${w.b[0]}" y2="${w.b[1]}" stroke="${color}" stroke-width="${7*s}" stroke-linecap="round"/><circle cx="${q[0]}" cy="${q[1]}" r="${12*s}" fill="${color}" stroke="#10262e" stroke-width="${2*s}"/><text x="${q[0]}" y="${q[1]}" text-anchor="middle" dominant-baseline="central" font-size="${13*s}" fill="#10262e">${i+1}</text></g>`;}catch{}});

  try{out+=dimensionMarkup({...wallPairSpan(),offset:0,label:''},false,true);}catch{}

  return out+'</g>';

}

function wallAlignmentControls(ref){let links=[];try{links=M.wallAlignmentsFor(plan,ref);}catch{}return `<button class="button" data-action="select-second-wall">Select second wall</button><p class="subtle">Select two walls to drive their distance or make them collinear. Ctrl/Cmd-click adds the second wall on desktop.</p>${links.map(c=>`<button class="button" data-action="release-wall-alignment" data-alignment="${esc(c.id)}">Release collinear alignment</button>`).join('')}`;}

function wallPairAction(action,button){

  if(action==='select-second-wall'){beginWallPair(activeWallPick());return true;}

  if(action==='release-wall-alignment'){if(mutate(()=>M.releaseWallAlignment(plan,button.dataset.alignment)))toast('Collinear alignment released');return true;}

  if(!action?.startsWith('pair-'))return false;

  if(action==='pair-reset'){beginWallPair();return true;}

  if(action==='pair-done'){tool=null;selected=null;render();mobilePanel('plan');return true;}

  if(action==='pair-swap'){selected.picks.reverse();render();return true;}

  if(action==='pair-distance'){try{dimensionEditor({span:wallPairSpan()});}catch(error){geometryFailure(error);}return true;}

  if(action==='pair-collinear'){

    if(selected?.picks?.length!==2)return true;const picks=M.clone(selected.picks);

    if(mutate(()=>M.makeWallsCollinear(plan,uniqueId('alignment-'),picks[0].wall,picks[1].wall))){tool=null;render();mobilePanel('plan');toast('Walls made collinear · alignment saved');}

    return true;

  }

  return false;

}

$('select-wall-pair').onclick=()=>beginWallPair();

