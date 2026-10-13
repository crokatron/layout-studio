/* Parametric geometry. Equality graphs solve each coordinate exactly; no rounding

   or sequential corner edits can silently relax a saved driving dimension. */

(function(root){

'use strict';

const M=typeof module!=='undefined'?require('./model.js'):root.LayoutModel;

const fail=detail=>{throw Error('Overdefined: '+detail+' No geometry was changed.');};

const key=(room,node)=>'room:'+room+'\0'+node;

const wallKey=(wall,end)=>'wall:'+wall+'\0'+end;

const anchorKey=a=>a?.wallId?wallKey(a.wallId,a.end):a?key(a.roomId,a.nodeId):null;

const legacy={validate:M.validate,resolveEnd:M.resolveEnd,removeNode:M.removeNode,detachAnchors:M.detachAnchors,calibrate:M.calibrate};

M.resolveEnd=function(p,d,k){const a=d[k+'Anchor'];if(a?.wallId){const w=(p.walls||[]).find(w=>w.id===a.wallId);if(w&&['a','b'].includes(a.end))return [...w[a.end]];}return legacy.resolveEnd(p,d,k);};

function vertices(p){const out=[];for(const r of p.rooms)r.points.forEach((q,i)=>out.push({key:key(r.id,r.nodeIds[i]),q,room:r,index:i}));for(const w of p.walls||[])for(const end of ['a','b'])out.push({key:wallKey(w.id,end),q:w[end],wall:w,end});return out;}

function edges(p){const out=[];for(const r of p.rooms)r.points.forEach((a,i)=>{const j=(i+1)%r.points.length;out.push({a,b:r.points[j],ak:key(r.id,r.nodeIds[i]),bk:key(r.id,r.nodeIds[j])});});for(const w of p.walls||[])out.push({a:w.a,b:w.b,ak:wallKey(w.id,'a'),bk:wallKey(w.id,'b')});return out;}

function signedArea(points){return points.reduce((s,a,i)=>{const b=points[(i+1)%points.length];return s+a[0]*b[1]-b[0]*a[1];},0);}

function checkShape(before,after){

  for(const r of after.rooms){const old=before.rooms.find(q=>q.id===r.id);if(old&&JSON.stringify(old.points)===JSON.stringify(r.points))continue;

    if(M.area(r.points)<.01||old&&signedArea(old.points)*signedArea(r.points)<=0)fail('this measurement would collapse or invert '+r.name+'.');

    for(let i=0;i<r.points.length;i++){const a=r.points[i],b=r.points[(i+1)%r.points.length];const oi=old?.nodeIds.indexOf(r.nodeIds[i]),oj=old?.nodeIds.indexOf(r.nodeIds[(i+1)%r.points.length]);if(M.distance(a,b)<.1&&!(oi>=0&&oj>=0&&M.distance(old.points[oi],old.points[oj])<.1))fail('two room corners would overlap.');

      for(let j=i+2;j<r.points.length;j++){if(i===0&&j===r.points.length-1)continue;const c=r.points[j],d=r.points[(j+1)%r.points.length],cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);if(cross(a,b,c)*cross(a,b,d)<-1e-5&&cross(c,d,a)*cross(c,d,b)<-1e-5)fail('room walls would cross.');}

    }

  }

  for(const w of after.walls||[])if(M.distance(w.a,w.b)<1)fail('a wall must stay at least 1 cm long.');

}

// Weighted union/find represents x_b - x_a = delta. Contradictory cycles are

// detected before any coordinates are applied, including opposite room walls.

class Equations{

  constructor(n){this.parent=Array.from({length:n},(_,i)=>i);this.weight=Array(n).fill(0);this.rank=Array(n).fill(0);}

  find(i){if(this.parent[i]!==i){const p=this.parent[i],r=this.find(p);this.weight[i]+=this.weight[p];this.parent[i]=r;}return this.parent[i];}

  add(a,b,delta,reason){const ra=this.find(a),rb=this.find(b),difference=delta+this.weight[a]-this.weight[b];if(ra===rb){if(Math.abs(difference)>1e-5)fail(reason);return;}

    if(this.rank[ra]<this.rank[rb]){this.parent[ra]=rb;this.weight[ra]=-difference;}else{this.parent[rb]=ra;this.weight[rb]=difference;if(this.rank[ra]===this.rank[rb])this.rank[ra]++;}}

}

function solve(p,targets=[],options={}){

  const draft=M.clone(p);M.joinWallNodes(draft);const before=M.clone(draft),nodes=vertices(draft),map=new Map(nodes.map((n,i)=>[n.key,i])),datum=nodes.length;

  const eq=[new Equations(nodes.length+1),new Equations(nodes.length+1)],edgeList=edges(before);

  const add=(axis,ak,bk,value,why)=>{const a=map.get(ak),b=map.get(bk);if(a===undefined||b===undefined)fail('a dimension endpoint no longer exists.');eq[axis].add(a,b,value,why);};

  for(let i=0;i<nodes.length;i++)for(let j=0;j<i;j++)if(M.samePoint(nodes[i].q,nodes[j].q))for(const axis of [0,1])eq[axis].add(i,j,0,'connected corners conflict.');

  for(const e of edgeList){if(options.skipEdge&&e.ak===options.skipEdge)continue;for(const axis of [0,1])if(Math.abs(e.a[axis]-e.b[axis])<.01)add(axis,e.ak,e.bk,0,'horizontal / vertical walls conflict with this measurement.');}

  for(const d of draft.dimensions||[])if(d.driving){for(const axis of [0,1])add(axis,anchorKey(d.aAnchor),anchorKey(d.bAnchor),d.driving.direction[axis]*d.driving.length,'the '+d.driving.length+' cm dimension conflicts with another dimension or wall alignment.');}

  for(const c of draft.wallAlignments||[])for(const a of c.anchors.slice(1))add(c.axis,anchorKey(c.anchors[0]),anchorKey(a),0,'the saved collinear walls conflict with another dimension or wall alignment. Release the collinear alignment first.');

  // Lock every edge vector, including slopes and collinear joints. This fixes

  // the complete shape while still allowing the whole room to translate.

  for(const r of before.rooms)if(r.dimensionsLocked)r.points.forEach((a,i)=>{const j=(i+1)%r.points.length,b=r.points[j];for(const axis of [0,1])add(axis,key(r.id,r.nodeIds[i]),key(r.id,r.nodeIds[j]),b[axis]-a[axis],r.name+' is locked. Unlock the room before changing its dimensions.');});

  for(const t of targets){const i=map.get(t.key);if(i===undefined)fail('the selected corner no longer exists.');for(const axis of [0,1])if(t.point[axis]!==null)eq[axis].add(datum,i,t.point[axis],'the requested position conflicts with a driving dimension.');}

  for(const axis of [0,1]){const graph=eq[axis],sums=new Map();for(let i=0;i<nodes.length;i++){const r=graph.find(i),v=sums.get(r)||[0,0];v[0]+=nodes[i].q[axis]-graph.weight[i];v[1]++;sums.set(r,v);}const fixed=graph.find(datum),origin=-graph.weight[datum];for(let i=0;i<nodes.length;i++){const r=graph.find(i),v=r===fixed?origin:sums.get(r)[0]/sums.get(r)[1];nodes[i].q[axis]=Math.round((v+graph.weight[i])*1e8)/1e8;}}

  checkShape(before,draft);

  // Keep fixtures on the same wall, including newly drawn partitions.

  const afterMap=new Map(vertices(draft).map(n=>[n.key,n.q]));

  for(const it of draft.items){let best=null;for(const e of edgeList){const A=afterMap.get(e.ak),B=afterMap.get(e.bk);if(M.samePoint(e.a,A)&&M.samePoint(e.b,B))continue;const f=M.fixtureOnWall(it,e.a,e.b);if(f){const gap=M.projectPoint(f.centre,e.a,e.b).distance;if(!best||gap<best.gap)best={...f,...e,A,B,gap};}}

    if(best){const {a,b,A,B,t}=best;it.rotation+=(Math.atan2(B[1]-A[1],B[0]-A[0])-Math.atan2(b[1]-a[1],b[0]-a[0]))*180/Math.PI;const rad=it.rotation*Math.PI/180,c=[A[0]+(B[0]-A[0])*t,A[1]+(B[1]-A[1])*t];it.x=c[0]-(it.kind==='door'?Math.sin(rad)*it.h/2:0);it.y=c[1]+(it.kind==='door'?Math.cos(rad)*it.h/2:0);}

  }

  for(const r of draft.rooms){const old=before.rooms.find(q=>q.id===r.id);if(JSON.stringify(old.points)!==JSON.stringify(r.points)){const delta=[r.points[0][0]-old.points[0][0],r.points[0][1]-old.points[0][1]],translated=r.points.every((q,i)=>M.samePoint(q,[old.points[i][0]+delta[0],old.points[i][1]+delta[1]]));if(translated)r.label=[old.label[0]+delta[0],old.label[1]+delta[1]];else r.measurementSource='edited';}}

  M.repairLabels(draft);Object.assign(p,draft);return p;

}

function anchorTarget(p,q){for(const r of p.rooms)for(let i=0;i<r.points.length;i++)if(M.distance(q,r.points[i])<.1)return {anchor:{roomId:r.id,nodeId:r.nodeIds[i]}};for(const w of p.walls||[])for(const end of ['a','b'])if(M.distance(q,w[end])<.1)return {anchor:{wallId:w.id,end}};for(const r of p.rooms)for(let i=0;i<r.points.length;i++){const hit=M.projectPoint(q,r.points[i],r.points[(i+1)%r.points.length]);if(hit.distance<.1&&hit.t>.001&&hit.t<.999)return {roomId:r.id,index:i,point:hit.point};}return null;}

M.canDriveDimension=(p,d)=>['a','b'].every(k=>d[k+'Anchor']||anchorTarget(p,d[k]));

// Wall selection is independent of corner snapping. A perpendicular span uses

// the common run of the two segments, even when the taps are far out of line.

M.measurementWalls=function(p){const out=[];for(const r of p.rooms)r.points.forEach((a,i)=>{const b=r.points[(i+1)%r.points.length];if(M.distance(a,b)>=1)out.push({key:'room:'+r.id+':'+r.nodeIds[i],roomId:r.id,nodeId:r.nodeIds[i],a:[...a],b:[...b],label:r.name+' · wall '+(i+1)});});for(const w of p.walls||[])out.push({key:'wall:'+w.id,wallId:w.id,a:[...w.a],b:[...w.b],label:w.name});const geometry={rooms:[...p.rooms,...(p.walls||[]).map(w=>({points:[w.a,w.b]}))]},runs=[];for(const wall of out){const [a,b]=M.wallRun(geometry,wall.a,wall.b);if(!runs.some(w=>M.samePoint(w.a,a)&&M.samePoint(w.b,b)||M.samePoint(w.a,b)&&M.samePoint(w.b,a)))runs.push({...wall,a,b});}return runs;};

M.pickMeasurementWall=function(p,point,tolerance){let best=null;for(const wall of M.measurementWalls(p)){const hit=M.projectPoint(point,wall.a,wall.b);if(hit.distance<=tolerance&&(!best||hit.distance<best.distance-.001))best={...hit,wall,label:wall.label,snapped:true};}return best||{point:[...point],snapped:false};};

M.resolveWall=function(p,ref){

  let a,b,label;if(ref?.wallId){const w=(p.walls||[]).find(w=>w.id===ref.wallId);if(w){a=w.a;b=w.b;label=w.name;}}

  else if(ref?.roomId){const r=p.rooms.find(r=>r.id===ref.roomId),i=r?.nodeIds.indexOf(ref.nodeId);if(i>=0){a=r.points[i];b=r.points[(i+1)%r.points.length];label=r.name+' · wall '+(i+1);}}

  if(!a||!b||M.distance(a,b)<1)throw Error('A selected wall changed. Choose the two walls again.');

  const geometry={rooms:[...p.rooms,...(p.walls||[]).map(w=>({points:[w.a,w.b]}))]},span=M.wallRun(geometry,a,b);

  return {...ref,a:span[0],b:span[1],label};

};

M.wallReference=wall=>wall.wallId?{wallId:wall.wallId}:{roomId:wall.roomId,nodeId:wall.nodeId};

M.makeWallsCollinear=function(p,id,first,second){

  const draft=M.clone(p);M.joinWallNodes(draft);const a=M.resolveWall(draft,first),b=M.resolveWall(draft,second);

  const axis=Math.abs(a.a[0]-a.b[0])<.001?0:Math.abs(a.a[1]-a.b[1])<.001?1:null;

  if(axis===null)throw Error('Choose a horizontal or vertical reference wall first. You can swap the two walls.');

  if(Math.abs(b.b[1-axis]-b.a[1-axis])<1)fail('these walls are perpendicular. Making them collinear would collapse the second wall.');

  const on=(n,w)=>M.projectPoint(n.q,w.a,w.b).distance<.001,nodes=vertices(draft),fixed=nodes.filter(n=>on(n,a)),moving=nodes.filter(n=>on(n,b));

  if(!fixed.length||!moving.length)throw Error('Choose two existing walls.');

  if(moving.every(n=>fixed.some(f=>f.key===n.key)))throw Error('These are already the same straight wall.');

  const anchor=n=>n.wall?{wallId:n.wall.id,end:n.end}:{roomId:n.room.id,nodeId:n.room.nodeIds[n.index]};

  const anchors=[...new Map([...fixed,...moving].map(n=>[n.key,anchor(n)])).values()];

  draft.wallAlignments=draft.wallAlignments||[];

  if(draft.wallAlignments.length>=500)throw Error('The plan already has 500 wall alignments.');

  draft.wallAlignments.push({id,axis,anchors,firstWall:M.wallReference(first),secondWall:M.wallReference(second)});

  solve(draft,fixed.map(n=>({key:n.key,point:[...n.q]})));M.validate(draft);Object.assign(p,draft);return id;

};

M.wallAlignmentsFor=function(p,ref){const w=M.resolveWall(p,ref),map=new Map(vertices(p).map(n=>[n.key,n.q]));return (p.wallAlignments||[]).filter(c=>c.anchors.some(a=>{const q=map.get(anchorKey(a));return q&&M.projectPoint(q,w.a,w.b).distance<.001;}));};

M.releaseWallAlignment=function(p,id){p.wallAlignments=(p.wallAlignments||[]).filter(c=>c.id!==id);};

M.findWallDimension=function(p,first,second){const a=M.resolveWall(p,first),b=M.resolveWall(p,second),on=(q,w)=>M.projectPoint(q,w.a,w.b).distance<.001;return p.dimensions.find(d=>{if(!d.driving)return false;const A=M.resolveEnd(p,d,'a'),B=M.resolveEnd(p,d,'b'),u=a.b.map((v,i)=>v-a.a[i]);return Math.abs((B[0]-A[0])*u[0]+(B[1]-A[1])*u[1])<.001&&((on(A,a)&&on(B,b))||(on(A,b)&&on(B,a)));});};

M.betweenWalls=function(p,first,second,at){

  const a=M.resolveWall(p,first),b=M.resolveWall(p,second);

  const len=M.distance(a.a,a.b),other=M.distance(b.a,b.b),u=a.b.map((v,i)=>(v-a.a[i])/len),v=b.b.map((q,i)=>(q-b.a[i])/other);

  if(Math.abs(u[0]*v[1]-u[1]*v[0])>1e-5)throw Error('Choose two parallel walls. Use Point to point for an angled measurement.');

  if(Math.min(Math.abs(u[0]),Math.abs(u[1]))>1e-5)throw Error('Choose horizontal or vertical walls. Use Point to point for angled walls.');

  const along=q=>(q[0]-a.a[0])*u[0]+(q[1]-a.a[1])*u[1],ends=[along(b.a),along(b.b)],lo=Math.max(0,Math.min(...ends)),hi=Math.min(len,Math.max(...ends));

  if(hi<lo-.001)throw Error('These walls do not overlap. Choose facing walls, or use Point to point.');

  const t=Math.max(lo,Math.min(hi,along(at))),A=a.a.map((q,i)=>q+u[i]*t),B=M.projectPoint(A,b.a,b.b).point;

  if(M.distance(A,B)<1)throw Error('Choose a different wall across the gap.');

  return {a:A,b:B,first:a,second:b,length:M.distance(A,B)};

};

function wallMeasurementAnchor(p,ref,point){

  // Straight runs can cross existing room nodes and partition joints. Anchor

  // the actual segment under the perpendicular endpoint, not the original tap.

  const on=(a,b)=>M.projectPoint(point,a,b).distance<.001;

  const rooms=[...p.rooms].sort((a,b)=>Number(b.id===ref.roomId)-Number(a.id===ref.roomId));

  const room=rooms.find(r=>r.points.some((a,i)=>on(a,r.points[(i+1)%r.points.length])));

  if(room){const r=room;for(let i=0;i<r.points.length;i++)if(M.distance(point,r.points[i])<.001)return {roomId:r.id,nodeId:r.nodeIds[i]};

    const i=r.points.findIndex((a,i)=>M.projectPoint(point,a,r.points[(i+1)%r.points.length]).distance<.001);if(i<0)throw Error('The selected wall changed.');return {roomId:r.id,nodeId:M.insertNode(p,r.id,i,point)};}

  const w=[...p.walls].sort((a,b)=>Number(b.id===ref.wallId)-Number(a.id===ref.wallId)).find(w=>on(w.a,w.b));if(!w)throw Error('The selected wall changed.');for(const end of ['a','b'])if(M.distance(point,w[end])<.001)return {wallId:w.id,end};

  // An interior measurement adds a joint in an internal wall, just as it adds

  // a node to a room boundary. Keep the existing endpoint constraints attached.

  if(p.walls.length>=500)throw Error('The plan already has 500 internal walls.');

  let suffix=1,id;const ids=new Set([...p.rooms,...p.items,...p.walls,...p.dimensions].map(o=>o.id));do{id=w.id.slice(0,120)+'-joint-'+suffix++;}while(ids.has(id));

  const tail={...M.clone(w),id,a:[...point]};w.b=[...point];p.walls.push(tail);

  for(const d of p.dimensions)for(const k of ['a','b'])if(d[k+'Anchor']?.wallId===w.id&&d[k+'Anchor'].end==='b')d[k+'Anchor']={wallId:id,end:'b'};

  for(const c of p.wallAlignments||[])for(const anchor of c.anchors)if(anchor.wallId===w.id&&anchor.end==='b')anchor.wallId=id;

  return {wallId:w.id,end:'b'};

}

M.dimensionBetweenWalls=function(p,id,first,second,at,length){

  const draft=M.clone(p),span=M.betweenWalls(draft,first,second,at);

  const existing=M.findWallDimension(draft,first,second);if(existing){if(M.projectPoint(M.resolveEnd(draft,existing,'a'),span.first.a,span.first.b).distance>.001){[existing.a,existing.b]=[existing.b,existing.a];[existing.aAnchor,existing.bAnchor]=[existing.bAnchor,existing.aAnchor];existing.driving.direction=existing.driving.direction.map(v=>-v);existing.offset=-existing.offset;}M.driveDimension(draft,existing.id,length);M.validate(draft);Object.assign(p,draft);return existing.id;}

  const aAnchor=wallMeasurementAnchor(draft,span.first,span.a),bAnchor=wallMeasurementAnchor(draft,span.second,span.b);

  draft.dimensions.push({id,a:[...span.a],b:[...span.b],aAnchor,bAnchor,offset:0,label:''});

  M.driveDimension(draft,id,length);M.validate(draft);Object.assign(p,draft);return id;

};

M.driveDimension=function(p,id,length){if(!Number.isFinite(length)||length<1||length>50000)throw Error('Enter a length between 1 and 50,000 cm.');const draft=M.clone(p),d=draft.dimensions.find(d=>d.id===id);if(!d)throw Error('Select a dimension first.');for(const k of ['a','b'])if(!d[k+'Anchor']){const t=anchorTarget(draft,d[k]);if(!t)throw Error('Place both dimension endpoints on room walls or internal wall endpoints first.');d[k+'Anchor']=t.anchor||{roomId:t.roomId,nodeId:M.insertNode(draft,t.roomId,t.index,t.point)};}

  const a=M.resolveEnd(draft,d,'a'),b=M.resolveEnd(draft,d,'b'),len=M.distance(a,b);if(len<.01)fail('dimension endpoints coincide.');let direction=d.driving?.direction||[(b[0]-a[0])/len,(b[1]-a[1])/len];if(!d.driving){if(Math.abs(direction[0])<.02)direction=[0,Math.sign(direction[1])];else if(Math.abs(direction[1])<.02)direction=[Math.sign(direction[0]),0];}d.driving={length,direction};solve(draft,[{key:anchorKey(d.aAnchor),point:a}]);Object.assign(p,draft);return p;};

M.setWallLength=function(p,roomId,nodeId,length){const draft=M.clone(p),r=draft.rooms.find(r=>r.id===roomId),i=r?.nodeIds.indexOf(nodeId);if(i===undefined||i<0)throw Error('Select a wall first.');const j=(i+1)%r.points.length,aAnchor={roomId,nodeId},bAnchor={roomId,nodeId:r.nodeIds[j]};let d=draft.dimensions.find(d=>anchorKey(d.aAnchor)===anchorKey(aAnchor)&&anchorKey(d.bAnchor)===anchorKey(bAnchor));if(!d){d={id:'wall-dim-'+roomId+'-'+nodeId,a:[...r.points[i]],b:[...r.points[j]],aAnchor,bAnchor,offset:30,label:''};draft.dimensions.push(d);}M.driveDimension(draft,d.id,length);Object.assign(p,draft);return d.id;};

function unlockedRoom(p,id){const r=p.rooms.find(r=>r.id===id);if(r?.dimensionsLocked)fail(r.name+' is locked. Unlock the room before changing its walls.');return r;}

M.setRoomLock=function(p,id,locked){const r=p.rooms.find(r=>r.id===id);if(!r||typeof locked!=='boolean')throw Error('Select a room first.');if(locked)r.dimensionsLocked=true;else delete r.dimensionsLocked;return p;};

M.moveNode=(p,roomId,nodeId,point)=>{unlockedRoom(p,roomId);return solve(p,[{key:key(roomId,nodeId),point}]);};

M.snapNode10=(p,roomId,nodeId)=>{const r=p.rooms.find(r=>r.id===roomId),i=r?.nodeIds.indexOf(nodeId);return M.moveNode(p,roomId,nodeId,r.points[i].map(M.snap10));};

M.moveWall=function(p,roomId,nodeId,dx,dy){const r=unlockedRoom(p,roomId),i=r.nodeIds.indexOf(nodeId),span=M.wallRun(p,r.points[i],r.points[(i+1)%r.points.length]);const draft=M.clone(p);M.joinWallNodes(draft);const targets=vertices(draft).filter(n=>M.projectPoint(n.q,...span).distance<.01).map(n=>({key:n.key,point:[n.q[0]+dx,n.q[1]+dy]}));solve(draft,targets);Object.assign(p,draft);return p;};

M.alignWall=function(p,roomId,nodeId,axis){const r=p.rooms.find(r=>r.id===roomId),i=r.nodeIds.indexOf(nodeId),a=r.points[i],j=(i+1)%r.points.length,b=[...r.points[j]];b[axis==='vertical'?0:1]=a[axis==='vertical'?0:1];return solve(p,[{key:key(roomId,nodeId),point:a},{key:key(roomId,r.nodeIds[j]),point:b}],{skipEdge:key(roomId,nodeId)});};

M.transformRoom=function(p,roomId,x,y,w,h){const r=p.rooms.find(r=>r.id===roomId),b=M.bounds(r.points);if(r.dimensionsLocked&&(Math.abs(w-b.w)>.00001||Math.abs(h-b.h)>.00001))unlockedRoom(p,roomId);const transform=q=>[x+(q[0]-b.x)*w/b.w,y+(q[1]-b.y)*h/b.h],label=transform(r.label);solve(p,r.points.map((q,i)=>({key:key(r.id,r.nodeIds[i]),point:transform(q)})));const room=p.rooms.find(r=>r.id===roomId);room.label=label;M.repairLabels(p);return p;};

M.moveSelection=function(p,s,dx,dy){if(!Number.isFinite(dx)||!Number.isFinite(dy)||Math.abs(dx)>50000||Math.abs(dy)>50000)throw Error('Enter a valid movement in cm.');const draft=M.clone(p),old=M.clone(p);if((s.nodes||[]).length||(s.wallNodes||[]).length)solve(draft,(s.nodes||[]).map(n=>{const r=p.rooms.find(r=>r.id===n.roomId),i=r.nodeIds.indexOf(n.nodeId);return {key:key(n.roomId,n.nodeId),point:[r.points[i][0]+dx,r.points[i][1]+dy]};}).concat((s.wallNodes||[]).map(n=>{const w=(p.walls||[]).find(w=>w.id===n.wallId);return {key:wallKey(n.wallId,n.end),point:[w[n.end][0]+dx,w[n.end][1]+dy]};})));for(const device of draft.devices||[])if((s.devices||[]).includes(device.device_id)){const before=(old.devices||[]).find(d=>d.device_id===device.device_id);device.x=before.x+dx;device.y=before.y+dy;}for(const it of draft.items)if(s.items.includes(it.id)){const before=old.items.find(q=>q.id===it.id);it.x=before.x+dx;it.y=before.y+dy;}

  for(const d of draft.dimensions)if(s.dimensions.includes(d.id)&&!d.driving){const oldDim=old.dimensions.find(q=>q.id===d.id);for(const k of ['a','b']){const q=M.resolveEnd(old,oldDim,k),target=[q[0]+dx,q[1]+dy];if(d[k+'Anchor']&&!M.samePoint(M.resolveEnd(draft,d,k),target))delete d[k+'Anchor'];d[k]=target;}}Object.assign(p,draft);return p;};

M.addWall=function(p,wall){if(M.distance(wall.a,wall.b)<1)throw Error('Choose two wall endpoints at least 1 cm apart.');const draft=M.clone(p);draft.walls=draft.walls||[];if(draft.walls.length>=500)throw Error('The plan already has 500 internal walls.');draft.walls.push(M.clone(wall));M.joinWallNodes(draft);Object.assign(p,draft);return p;};

M.movePartition=function(p,id,delta,end){const w=p.walls.find(w=>w.id===id);return solve(p,(end?[end]:['a','b']).map(k=>({key:wallKey(id,k),point:[w[k][0]+delta[0],w[k][1]+delta[1]]})));};

M.dimensionPartition=function(p,id,length){const draft=M.clone(p),w=draft.walls.find(w=>w.id===id);let d=draft.dimensions.find(d=>d.aAnchor?.wallId===id&&d.bAnchor?.wallId===id);if(!d){d={id:'wall-dim-'+id,a:[...w.a],b:[...w.b],aAnchor:{wallId:id,end:'a'},bAnchor:{wallId:id,end:'b'},offset:30,label:''};draft.dimensions.push(d);}M.driveDimension(draft,d.id,length);Object.assign(p,draft);return p;};

M.removeNode=function(p,roomId,nodeId){unlockedRoom(p,roomId);if((p.wallAlignments||[]).some(c=>c.anchors.some(a=>a.roomId===roomId&&a.nodeId===nodeId)))fail('release the collinear alignment before deleting its corner.');if(p.dimensions.some(d=>d.driving&&[d.aAnchor,d.bAnchor].some(a=>a?.roomId===roomId&&a.nodeId===nodeId)))fail('remove the driving dimension before deleting its corner.');return legacy.removeNode(p,roomId,nodeId);};

M.detachAnchors=function(p,roomId,nodeId){if(p.wallAlignments)p.wallAlignments=p.wallAlignments.filter(c=>!c.anchors.some(a=>a.roomId===roomId&&(!nodeId||a.nodeId===nodeId)));for(const d of p.dimensions)if([d.aAnchor,d.bAnchor].some(a=>a?.roomId===roomId&&(!nodeId||a.nodeId===nodeId)))delete d.driving;return legacy.detachAnchors(p,roomId,nodeId);};

M.removePartition=function(p,id){if(p.wallAlignments)p.wallAlignments=p.wallAlignments.filter(c=>!c.anchors.some(a=>a.wallId===id));for(const d of p.dimensions)for(const k of ['a','b'])if(d[k+'Anchor']?.wallId===id){d[k]=M.resolveEnd(p,d,k);delete d[k+'Anchor'];delete d.driving;}p.walls=p.walls.filter(w=>w.id!==id);};

M.calibrate=function(p,width){if(p.rooms.some(r=>r.dimensionsLocked))fail('unlock rooms before recalibrating the whole plan.');if(p.dimensions.some(d=>d.driving))fail('release driving dimensions before recalibrating the whole plan.');const old=M.bounds(p.rooms.flatMap(r=>r.points)),f=width*100/old.w;legacy.calibrate(p,width);for(const w of p.walls||[])for(const k of ['a','b'])w[k]=[old.x+(w[k][0]-old.x)*f,old.y+(w[k][1]-old.y)*f];return p;};

M.validate=function(raw){const p=legacy.validate(raw),number=n=>typeof n==='number'&&Number.isFinite(n)&&Math.abs(n)<100000,point=q=>Array.isArray(q)&&q.length===2&&q.every(number),ids=new Set([...p.rooms,...p.items,...p.dimensions].map(o=>o.id));

  if(p.walls!==undefined&&(!Array.isArray(p.walls)||p.walls.length>500))throw Error('Invalid internal walls.');

  for(const w of p.walls||[]){if(!w||typeof w.id!=='string'||!w.id||w.id.length>150||ids.has(w.id)||typeof w.name!=='string'||w.name.length>150||!point(w.a)||!point(w.b)||M.distance(w.a,w.b)<1||!number(w.thickness)||w.thickness<1||w.thickness>100)throw Error('Invalid internal wall.');ids.add(w.id);}

  for(const r of p.rooms)if(r.labelManual!==undefined&&typeof r.labelManual!=='boolean')throw Error('Invalid room label.');

  for(const r of p.rooms)if(r.dimensionsLocked!==undefined&&typeof r.dimensionsLocked!=='boolean')throw Error('Invalid room dimension lock.');

  const map=new Map(vertices(p).map(n=>[n.key,n.q]));for(const d of p.dimensions)if(d.driving){const c=d.driving,a=map.get(anchorKey(d.aAnchor)),b=map.get(anchorKey(d.bAnchor));if(!number(c.length)||c.length<1||c.length>50000||!point(c.direction)||Math.abs(Math.hypot(...c.direction)-1)>1e-6||!a||!b)throw Error('Invalid driving dimension.');if([0,1].some(axis=>Math.abs(b[axis]-a[axis]-c.direction[axis]*c.length)>.001))fail('saved geometry does not match its driving dimensions.');}

  if(p.wallAlignments!==undefined&&(!Array.isArray(p.wallAlignments)||p.wallAlignments.length>500))throw Error('Invalid wall alignments.');

  for(const c of p.wallAlignments||[]){if(!c||typeof c.id!=='string'||!c.id||c.id.length>150||ids.has(c.id)||![0,1].includes(c.axis)||!Array.isArray(c.anchors)||c.anchors.length<2||c.anchors.length>12000||c.anchors.some(a=>!a||typeof a!=='object'||!map.has(anchorKey(a))))throw Error('Invalid collinear wall alignment.');ids.add(c.id);const fixed=map.get(anchorKey(c.anchors[0]))[c.axis];if(c.anchors.some(a=>Math.abs(map.get(anchorKey(a))[c.axis]-fixed)>.001))fail('saved walls do not match their collinear alignment.');}

  return p;};

if(typeof module!=='undefined')module.exports=M;

})(typeof window!=='undefined'?window:globalThis);

