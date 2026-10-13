/* Local layout model. Dimensions are centimetres at an uncalibrated draft scale. */

(function(root){

  const clone = value => JSON.parse(JSON.stringify(value));

  const initial = {"version": 1, "title": "Example home", "calibrated": false, "nextId": 1, "rooms": [{"id": "living", "name": "Living room", "color": "#dbe5db", "points": [[0, 0], [400, 0], [400, 400], [0, 400]], "label": [200, 200]}, {"id": "kitchen", "name": "Kitchen", "color": "#e8e2d3", "points": [[400, 0], [700, 0], [700, 200], [400, 200]], "label": [550, 100]}, {"id": "bedroom", "name": "Bedroom", "color": "#e4e1eb", "points": [[400, 200], [700, 200], [700, 400], [400, 400]], "label": [550, 300]}], "items": []};

  const catalog = [

    ['sofa','Sofa','Living',220,90,'#7c9a89'],['sectional','Corner sofa','Living',270,180,'#7c9a89'],

    ['armchair','Armchair','Living',85,85,'#9fa995'],['coffee','Coffee table','Living',110,60,'#b69975'],

    ['tv','TV console','Living',160,40,'#718088'],['rug','Rug','Living',240,170,'#d3bb99'],

    ['bed','Double bed','Bedroom',160,210,'#a6a3bb'],['bed','King bed','Bedroom',200,210,'#a6a3bb'],

    ['bed','Single bed','Bedroom',100,205,'#a6a3bb'],['nightstand','Bedside table','Bedroom',45,45,'#b69975'],

    ['wardrobe','Wardrobe','Bedroom',180,60,'#b7a386'],['dresser','Dresser','Bedroom',120,45,'#b7a386'],

    ['dining','Dining table','Dining & work',160,90,'#b69975'],['round-table','Round table','Dining & work',110,110,'#b69975'],

    ['chair','Dining chair','Dining & work',48,50,'#91a09a'],['desk','Desk','Dining & work',140,65,'#b69975'],

    ['office-chair','Office chair','Dining & work',65,65,'#718088'],['shelf','Bookshelf','Dining & work',100,35,'#b69975'],

    ['counter','Counter','Kitchen & bath',180,60,'#c4c4b7'],['sink','Sink unit','Kitchen & bath',80,60,'#b0c6c8'],

    ['stove','Hob','Kitchen & bath',60,60,'#929f9c'],['fridge','Fridge','Kitchen & bath',70,70,'#b7c5c2'],

    ['toilet','Toilet','Kitchen & bath',40,68,'#c8d9d7'],['shower','Shower','Kitchen & bath',90,90,'#b6d2d0'],

    ['bath','Bathtub','Kitchen & bath',75,170,'#c3d9d9'],['washer','Washing machine','Kitchen & bath',60,65,'#b5c7c5'],

    ['plant','Plant','Outdoor',45,45,'#749b77'],['outdoor','Outdoor chair','Outdoor',65,70,'#a5b390'],

    ['door','Hinged door','Structure',85,85,'#bc4b4b'],['sliding-door','Sliding door','Structure',160,16,'#bc4b4b'],['window','Window','Structure',120,12,'#99c6d0'],

    ['wall','Wall','Structure',200,12,'#5b625d'],['box','Custom object','Structure',100,100,'#a6b5ae']

  ].map(([kind,name,category,w,h,color],i)=>({key:'lib-'+i,kind,name,category,w,h,color}));

  const extraFurniture=[

    ['sectional','Corner sofa · left chaise','Living',270,180,'#7c9a89',true],

    ['sectional','Corner sofa · right chaise','Living',270,180,'#7c9a89'],

    ['u-sofa','U-shaped sofa','Living',320,200,'#7c9a89'],

    ['chaise','Chaise longue','Living',85,170,'#879d8c'],

    ['sofa','Loveseat','Living',150,85,'#7c9a89'],

    ['armchair','Recliner','Living',100,110,'#9fa995'],

    ['coffee','Ottoman','Living',90,65,'#9fa995'],

    ['sofa','Bench','Living',140,45,'#b69975'],

    ['shelf','Shoe cabinet','Living',100,30,'#b69975'],

    ['corner-desk','Corner desk · right return','Dining & work',180,150,'#b69975'],

    ['corner-desk','Corner desk · left return','Dining & work',180,150,'#b69975',true],

    ['desk','Standing desk','Dining & work',160,80,'#b69975'],

    ['dining','Six-seat dining table','Dining & work',200,100,'#b69975'],

    ['counter','Kitchen island','Kitchen & bath',200,100,'#c4c4b7'],

    ['double-sink','Double vanity','Kitchen & bath',140,60,'#b0c6c8'],

    ['piano','Piano / keyboard','Hobbies & pets',140,55,'#718088'],

    ['treadmill','Treadmill','Hobbies & pets',85,185,'#718088'],

    ['pet-bed','Pet bed','Hobbies & pets',70,55,'#a6a3bb'],

    ['shelf','Aquarium stand','Hobbies & pets',120,45,'#a0c2c5'],

    ['counter','3D printer workbench','Hobbies & pets',160,70,'#718088']

  ];

  extraFurniture.forEach(([kind,name,category,w,h,color,mirrorX=false])=>catalog.push({key:'lib-'+catalog.length,kind,name,category,w,h,color,mirrorX}));

  const bounds = points => ({x:Math.min(...points.map(p=>p[0])),y:Math.min(...points.map(p=>p[1])),w:Math.max(...points.map(p=>p[0]))-Math.min(...points.map(p=>p[0])),h:Math.max(...points.map(p=>p[1]))-Math.min(...points.map(p=>p[1]))});

  const area = points => Math.abs(points.reduce((sum,p,i)=>{const q=points[(i+1)%points.length];return sum+p[0]*q[1]-q[0]*p[1]},0))/20000;

  const inside=(x,y,points)=>{let c=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const a=points[i],b=points[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])c=!c;}return c;};

  const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);

  const samePoint=(a,b)=>distance(a,b)<.01;

  const snap10=value=>Math.round(value/10)*10;

  const snapNode10=(p,roomId,nodeId)=>{const r=p.rooms.find(r=>r.id===roomId),i=r?.nodeIds.indexOf(nodeId);if(!r||i<0)throw Error('Select a node first.');return moveNode(p,roomId,nodeId,r.points[i].map(snap10));};

  function projectPoint(p,a,b){const dx=b[0]-a[0],dy=b[1]-a[1],l=dx*dx+dy*dy;const t=l?Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/l)):0;const point=[a[0]+t*dx,a[1]+t*dy];return {point,t,distance:distance(p,point)};}

  function editorData(p){p.dimensions=p.dimensions||[];p.nextNode=Number.isSafeInteger(p.nextNode)&&p.nextNode>0?p.nextNode:1;for(const r of p.rooms){if(!Array.isArray(r.nodeIds)||r.nodeIds.length!==r.points.length)r.nodeIds=r.points.map(()=>r.id+':node-'+p.nextNode++);}return p;}

  function resolveEnd(p,d,key){const anchor=d[key+'Anchor'];if(anchor?.wallId){const wall=(p.walls||[]).find(w=>w.id===anchor.wallId);if(wall&&['a','b'].includes(anchor.end))return [...wall[anchor.end]];}if(anchor){const room=p.rooms.find(r=>r.id===anchor.roomId),idx=room?.nodeIds?.indexOf(anchor.nodeId);if(room&&idx>=0)return [...room.points[idx]];}return [...d[key]];}

  function detachAnchors(p,roomId,nodeId){for(const d of p.dimensions)for(const key of ['a','b']){const a=d[key+'Anchor'];if(a?.roomId===roomId&&(!nodeId||a.nodeId===nodeId)){d[key]=resolveEnd(p,d,key);delete d[key+'Anchor'];}}}

  function insertNode(p,roomId,index,at){editorData(p);const room=p.rooms.find(r=>r.id===roomId);if(!room)throw Error('Select a room first.');if(room.points.length>=100)throw Error('This room already has 100 nodes.');const a=room.points[index],b=room.points[(index+1)%room.points.length],hit=projectPoint(at,a,b);if(hit.t<.001||hit.t>.999)throw Error('There is already a node at this corner.');let added;

    for(const r of p.rooms){for(let i=r.points.length-1;i>=0;i--){const x=r.points[i],y=r.points[(i+1)%r.points.length],q=projectPoint(hit.point,x,y);if(q.distance<.01&&q.t>.001&&q.t<.999&&r.points.length<100){const id=r.id+':node-'+p.nextNode++;r.points.splice(i+1,0,[...hit.point]);r.nodeIds.splice(i+1,0,id);if(r.id===roomId)added=id;}}}return added;}

  function moveNode(p,roomId,nodeId,point){const room=p.rooms.find(r=>r.id===roomId),index=room?.nodeIds.indexOf(nodeId);if(!room||index<0)throw Error('The node no longer exists.');const old=[...room.points[index]];if(samePoint(old,point))return p;for(const r of p.rooms){let changed=false;r.points=r.points.map(pt=>{if(samePoint(pt,old)){changed=true;return [...point];}return pt;});if(changed)r.measurementSource='edited';}return p;}

  function removeNode(p,roomId,nodeId){const r=p.rooms.find(r=>r.id===roomId),i=r?.nodeIds.indexOf(nodeId);if(!r||i<0)throw Error('Select a node first.');if(r.points.length<=3)throw Error('A room must keep at least three nodes.');detachAnchors(p,roomId,nodeId);r.points.splice(i,1);r.nodeIds.splice(i,1);r.measurementSource='edited';}

  function setWallLength(p,roomId,nodeId,length){if(!Number.isFinite(length)||length<1||length>50000)throw Error('Enter a wall length between 1 and 50,000 cm.');const r=p.rooms.find(r=>r.id===roomId),i=r?.nodeIds.indexOf(nodeId);if(!r||i<0)throw Error('Select a wall first.');const j=(i+1)%r.points.length,a=r.points[i],b=r.points[j],len=distance(a,b);if(len<.01)throw Error('Separate the two nodes before setting a length.');moveNode(p,roomId,r.nodeIds[j],[a[0]+(b[0]-a[0])*length/len,a[1]+(b[1]-a[1])*length/len]);}

  function correctedSketch(p){p.blueprintRevision=2;return editorData(p);}
  function resizeRoom(room,x,y,w,h){const b=bounds(room.points);const p=([a,c])=>[x+(a-b.x)*w/b.w,y+(c-b.y)*h/b.h];room.points=room.points.map(p);room.label=p(room.label);}

  function calibrate(plan,widthMeters){if(!Number.isFinite(widthMeters)||widthMeters<1||widthMeters>100)throw Error('Enter an overall width between 1 and 100 metres.');const b=bounds(plan.rooms.flatMap(r=>r.points));const f=widthMeters*100/b.w;for(const room of plan.rooms){room.points=room.points.map(([x,y])=>[b.x+(x-b.x)*f,b.y+(y-b.y)*f]);room.label=[b.x+(room.label[0]-b.x)*f,b.y+(room.label[1]-b.y)*f];}for(const item of [...plan.items,...(plan.devices||[]),...(plan.ha_controls||[])]){item.x=b.x+(item.x-b.x)*f;item.y=b.y+(item.y-b.y)*f;}plan.calibrated=true;return plan;}

  function validate(raw){

    if(!raw||raw.version!==1||!Array.isArray(raw.rooms)||!Array.isArray(raw.items)||raw.rooms.length>100||raw.items.length>1000)throw Error('This is not a supported layout file.');

    const n=v=>typeof v==='number'&&Number.isFinite(v)&&Math.abs(v)<100000;

    if('north_bearing' in raw&&(!n(raw.north_bearing)||raw.north_bearing<0||raw.north_bearing>=360))throw Error('North bearing must be from 0 to less than 360 degrees.');

    if('north_reference' in raw&&(typeof raw.north_reference!=='string'||raw.north_reference.length>200))throw Error('Invalid north reference.');

    const s=v=>typeof v==='string'&&v.length<=150;

    const p=v=>Array.isArray(v)&&v.length===2&&v.every(n);

    const ids=new Set();

    for(const r of raw.rooms){if(!s(r.id)||ids.has(r.id)||!s(r.name)||!/^#[\da-f]{6}$/i.test(r.color)||!Array.isArray(r.points)||r.points.length<3||r.points.length>100||!r.points.every(p)||!p(r.label))throw Error('The room data is invalid.');if(bounds(r.points).w<1||bounds(r.points).h<1)throw Error('A room has no usable size.');ids.add(r.id);}

    for(const it of raw.items){if(['mirrorX','mirrorY'].some(k=>k in it&&typeof it[k]!=='boolean'))throw Error('Invalid furniture reflection.');if(!s(it.id)||ids.has(it.id)||!s(it.name)||!catalog.some(c=>c.kind===it.kind)||![it.x,it.y,it.w,it.h,it.rotation].every(n)||it.w<5||it.h<5||!/^#[\da-f]{6}$/i.test(it.color))throw Error('The furniture data is invalid.');ids.add(it.id);}

    for(const r of raw.rooms)if(r.nodeIds&&(!Array.isArray(r.nodeIds)||r.nodeIds.length!==r.points.length||!r.nodeIds.every(s)||new Set(r.nodeIds).size!==r.nodeIds.length))throw Error('The wall nodes are invalid.');

    if(raw.devices!==undefined&&(!Array.isArray(raw.devices)||raw.devices.length>1000))throw Error('Invalid Home Assistant devices.');

    const deviceIds=new Set();

    if(raw.ha_device_names!==undefined&&(typeof raw.ha_device_names!=='object'||raw.ha_device_names===null||Array.isArray(raw.ha_device_names)||Object.keys(raw.ha_device_names).length>1000||Object.entries(raw.ha_device_names).some(([id,name])=>!id||id.length>150||typeof name!=='string'||!name.trim()||name.length>150)))throw Error('Invalid HA device names.');

    for(const d of raw.devices||[]){if(!s(d.device_id)||!d.device_id||deviceIds.has(d.device_id)||!s(d.entity_id)||!d.entity_id||!n(d.x)||!n(d.y)||!s(d.name||''))throw Error('Invalid Home Assistant placement.');if(d.ha_name!==undefined&&(typeof d.ha_name!=='string'||!d.ha_name.trim()||d.ha_name.length>150))throw Error('Invalid HA device name.');if(d.icon!==undefined&&(typeof d.icon!=='string'||d.icon.length>100||!/^mdi:[a-z0-9]+(?:-[a-z0-9]+)*$/.test(d.icon)))throw Error('Invalid device icon.');deviceIds.add(d.device_id);}

    if(raw.ha_controls!==undefined&&(!Array.isArray(raw.ha_controls)||raw.ha_controls.length>100))throw Error('Invalid HA control shortcuts.');

    const controlIds=new Set();

    for(const c of raw.ha_controls||[]){if(!c||!s(c.id)||!c.id||controlIds.has(c.id)||!s(c.name)||!c.name||!s(c.entity_id)||!c.entity_id||!n(c.x)||!n(c.y)||typeof c.navigation_path!=='string'||!/^\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+$/.test(c.navigation_path)||(c.icon!==undefined&&(typeof c.icon!=='string'||c.icon.length>100||!/^mdi:[a-z0-9]+(?:-[a-z0-9]+)*$/.test(c.icon))))throw Error('Invalid HA control shortcut.');controlIds.add(c.id);}

    for(const r of raw.rooms)if(r.room_tile!==undefined){const t=r.room_tile,metrics=['temperature','humidity','air_quality','pm25','carbon_dioxide','aqi','pm10','volatile_organic_compounds','volatile_organic_compounds_parts','illuminance'];if(!t||typeof t!=='object'||Array.isArray(t)||Object.keys(t).some(k=>!['title','visible','width','color','metrics'].includes(k))||('title' in t&&(!s(t.title)||t.title.length>90))||('visible' in t&&typeof t.visible!=='boolean')||('width' in t&&(!n(t.width)||t.width<80||t.width>400))||('color' in t&&!/^#[a-f0-9]{6}$/i.test(t.color))||('metrics' in t&&(!Array.isArray(t.metrics)||!t.metrics.length||t.metrics.length>4||new Set(t.metrics).size!==t.metrics.length||t.metrics.some(m=>!metrics.includes(m)))))throw Error('Invalid room tile. Choose 1–4 readings and a width between 80 and 400 cm.');}

    for(const r of raw.rooms)if(r.ha_name!==undefined&&(!s(r.ha_name)||!r.ha_name.trim()))throw Error('Invalid Home Assistant room name.');

    if(raw.dimensions!==undefined&&(!Array.isArray(raw.dimensions)||raw.dimensions.length>500))throw Error('The dimensions are invalid.');

    for(const d of raw.dimensions||[]){if(!s(d.id)||ids.has(d.id)||!p(d.a)||!p(d.b)||!n(d.offset)||!s(d.label||''))throw Error('A dimension is invalid.');for(const key of ['a','b']){const a=d[key+'Anchor'];if(a&&(a.wallId?(!s(a.wallId)||!['a','b'].includes(a.end)):(!s(a.roomId)||!s(a.nodeId))))throw Error('A dimension anchor is invalid.');}ids.add(d.id);}

    return editorData({...clone(raw),title:s(raw.title)?raw.title:'My home',calibrated:raw.calibrated===true,nextId:Number.isSafeInteger(raw.nextId)&&raw.nextId>0?raw.nextId:1});

  }

  // Insert T-junctions before changing a wall so the neighbouring room shares its outline.

  function joinWallNodes(p){editorData(p);const corners=[...p.rooms.flatMap(r=>r.points.map(q=>[...q])),...(p.walls||[]).flatMap(w=>[w.a,w.b])];for(const r of p.rooms){for(let i=r.points.length-1;i>=0;i--){const a=r.points[i],b=r.points[(i+1)%r.points.length],hits=[];for(const q of corners){const h=projectPoint(q,a,b);if(h.distance<.01&&h.t>.00001&&h.t<.99999&&!hits.some(v=>samePoint(v.point,q)))hits.push(h);}hits.sort((a,b)=>a.t-b.t);if(r.points.length+hits.length>100)continue;r.points.splice(i+1,0,...hits.map(h=>h.point));r.nodeIds.splice(i+1,0,...hits.map(()=>r.id+':node-'+p.nextNode++));}}return p;}

  function doorSwing(it){return it.swing==='cw'||it.swing==='ccw'?it.swing:it.flip?'ccw':'cw';}

  function doorDirection(it){return (doorSwing(it)==='cw'?1:-1)*(it.flip?-1:1);}

  function fixtureOnWall(it,a,b,tolerance=12){if(!['door','sliding-door','window'].includes(it.kind))return null;const rad=it.rotation*Math.PI/180,centre=it.kind==='door'?[it.x+Math.sin(rad)*it.h/2,it.y-Math.cos(rad)*it.h/2]:[it.x,it.y],hit=projectPoint(centre,a,b),angle=Math.atan2(b[1]-a[1],b[0]-a[0])*180/Math.PI,diff=Math.abs(((it.rotation-angle+540)%180)-90);return hit.distance<=tolerance&&diff>=75?{centre,t:hit.t}:null;}

  function wallRun(p,a,b){const len=distance(a,b),u=[(b[0]-a[0])/len,(b[1]-a[1])/len];let lo=0,hi=len,changed=true;while(changed){changed=false;for(const r of p.rooms)r.points.forEach((q,i)=>{const v=r.points[(i+1)%r.points.length],cross=t=>Math.abs((t[0]-a[0])*u[1]-(t[1]-a[1])*u[0]);if(cross(q)>.01||cross(v)>.01)return;const vals=[q,v].map(t=>(t[0]-a[0])*u[0]+(t[1]-a[1])*u[1]),min=Math.min(...vals),max=Math.max(...vals);if(min<=hi+.01&&max>=lo-.01&&(min<lo-.01||max>hi+.01)){lo=Math.min(lo,min);hi=Math.max(hi,max);changed=true;}});}return [[a[0]+lo*u[0],a[1]+lo*u[1]],[a[0]+hi*u[0],a[1]+hi*u[1]]];}

  function reshapeWall(p,roomId,nodeId,A,B,span){const r=p.rooms.find(r=>r.id===roomId),i=r?.nodeIds.indexOf(nodeId);if(!r||i<0)throw Error('Select a wall first.');const a=span?span[0]:[...r.points[i]],b=span?span[1]:[...r.points[(i+1)%r.points.length]];if(distance(A,B)<1)throw Error('Keep the wall at least 1 cm long.');if(samePoint(a,A)&&samePoint(b,B))return p;joinWallNodes(p);const map=t=>[A[0]+(B[0]-A[0])*t,A[1]+(B[1]-A[1])*t];for(const room of p.rooms){let changed=false;room.points=room.points.map(q=>{const hit=projectPoint(q,a,b);if(hit.distance<.01){changed=true;return map(hit.t);}return q;});if(changed)room.measurementSource='edited';}

    const turn=(Math.atan2(B[1]-A[1],B[0]-A[0])-Math.atan2(b[1]-a[1],b[0]-a[0]))*180/Math.PI;

    for(const it of p.items){const f=fixtureOnWall(it,a,b);if(!f)continue;const centre=map(f.t);it.rotation+=turn;const rad=it.rotation*Math.PI/180;it.x=centre[0]-(it.kind==='door'?Math.sin(rad)*it.h/2:0);it.y=centre[1]+(it.kind==='door'?Math.cos(rad)*it.h/2:0);}

    repairLabels(p);return p;

  }

  function moveWall(p,roomId,nodeId,dx,dy){const r=p.rooms.find(r=>r.id===roomId),i=r?.nodeIds.indexOf(nodeId);if(!r||i<0)throw Error('Select a wall first.');if(Math.hypot(dx,dy)<.001)return p;const span=wallRun(p,r.points[i],r.points[(i+1)%r.points.length]),[a,b]=span;return reshapeWall(p,roomId,nodeId,[a[0]+dx,a[1]+dy],[b[0]+dx,b[1]+dy],span);}

  function alignWall(p,roomId,nodeId,axis){const r=p.rooms.find(r=>r.id===roomId),i=r?.nodeIds.indexOf(nodeId);if(!r||i<0)throw Error('Select a wall first.');const a=[...r.points[i]],b=[...r.points[(i+1)%r.points.length]],len=distance(a,b);if(axis==='vertical'){b[0]=a[0];if(Math.abs(b[1]-a[1])<1)b[1]=a[1]+len;}else{b[1]=a[1];if(Math.abs(b[0]-a[0])<1)b[0]=a[0]+len;}return reshapeWall(p,roomId,nodeId,a,b);}

  function smartSnap(p,target,{exclude=[],origin=null,tolerance=8,grid=true,align=true}={}){

    const omitted=q=>exclude.some(e=>samePoint(q,e)),points=p.rooms.flatMap(r=>r.points).filter(q=>!omitted(q));let best=null;

    if(align){for(const q of points){const d=distance(q,target);if(d<=tolerance&&(!best||d<best.distance))best={point:[...q],distance:d,label:'Corner'};}if(best)return best;

      for(const r of p.rooms)r.points.forEach((a,i)=>{const b=r.points[(i+1)%r.points.length];if(omitted(a)||omitted(b))return;const h=projectPoint(target,a,b);if(h.distance<=tolerance&&(!best||h.distance<best.distance))best={...h,a,b,label:'Wall'};});

      if(best){const pt=[...best.point];if(grid)for(const axis of [0,1])if(Math.abs(best.a[1-axis]-best.b[1-axis])<.01)pt[axis]=Math.max(Math.min(best.a[axis],best.b[axis]),Math.min(Math.max(best.a[axis],best.b[axis]),snap10(pt[axis])));return {point:pt,label:best.label};}

    }

    const result=grid?target.map(snap10):[...target],axes=[];

    if(align){for(const axis of [0,1]){let dist=tolerance,match=null;for(const q of [...points,...(origin?[origin]:[])]){const d=Math.abs(q[axis]-target[axis]);if(d<dist){dist=d;match=q[axis];}}if(match!==null){result[axis]=match;axes.push(axis);}}}

    return {point:result,label:axes.length?'Aligned':grid?'10 cm grid':'',axes};

  }

  function clearance(q,points){let d=Infinity;for(let i=0;i<points.length;i++)d=Math.min(d,projectPoint(q,points[i],points[(i+1)%points.length]).distance);return inside(q[0],q[1],points)?d:-d;}

  function labelPosition(room,force=false){const b=bounds(room.points),minimum=Math.min(26,b.w/5,b.h/5);if(!force&&(room.labelManual||clearance(room.label,room.points)>=minimum))return [...room.label];let best=[b.x+b.w/2,b.y+b.h/2],score=clearance(best,room.points);for(let x=1;x<25;x++)for(let y=1;y<25;y++){const q=[b.x+b.w*x/25,b.y+b.h*y/25],s=clearance(q,room.points);if(s>score){best=q;score=s;}}return best;}

  function repairLabels(p){for(const r of p.rooms)r.label=labelPosition(r);return p;}

  function itemCorners(it){const top=it.kind==='door'&&doorDirection(it)<0?-it.h*1.5:-it.h/2,rad=it.rotation*Math.PI/180;return [[-it.w/2,top],[it.w/2,top],[it.w/2,top+it.h],[-it.w/2,top+it.h]].map(([x,y])=>[it.x+x*Math.cos(rad)-y*Math.sin(rad),it.y+x*Math.sin(rad)+y*Math.cos(rad)]);}

  function selectionPoints(p,selection){const points=[];for(const n of selection.nodes||[]){const r=p.rooms.find(r=>r.id===n.roomId),i=r?.nodeIds.indexOf(n.nodeId);if(i>=0)points.push([...r.points[i]]);}for(const n of selection.wallNodes||[]){const w=(p.walls||[]).find(w=>w.id===n.wallId);if(w)points.push([...w[n.end]]);}return points.filter((q,i)=>points.findIndex(v=>samePoint(q,v))===i);}

  function boxSelection(p,a,b,previous){const rect=bounds([a,b]),contains=q=>q[0]>=rect.x-.001&&q[0]<=rect.x+rect.w+.001&&q[1]>=rect.y-.001&&q[1]<=rect.y+rect.h+.001,s=previous?clone(previous):{type:'multi',nodes:[],items:[],dimensions:[],devices:[],wallNodes:[]};s.devices=s.devices||[];s.wallNodes=s.wallNodes||[];for(const d of p.devices||[])if(contains([d.x,d.y])&&!s.devices.includes(d.device_id))s.devices.push(d.device_id);for(const w of p.walls||[])for(const end of ['a','b'])if(contains(w[end])&&!s.wallNodes.some(n=>n.wallId===w.id&&n.end===end))s.wallNodes.push({wallId:w.id,end});for(const r of p.rooms)r.points.forEach((q,i)=>{if(contains(q)&&!s.nodes.some(n=>n.roomId===r.id&&n.nodeId===r.nodeIds[i]))s.nodes.push({roomId:r.id,nodeId:r.nodeIds[i]});});for(const it of p.items)if(itemCorners(it).every(contains)&&!s.items.includes(it.id))s.items.push(it.id);for(const d of p.dimensions)if(contains(resolveEnd(p,d,'a'))&&contains(resolveEnd(p,d,'b'))&&!s.dimensions.includes(d.id))s.dimensions.push(d.id);return s;}

  function selectionBounds(p,s){const points=selectionPoints(p,s);for(const d of p.devices||[])if((s.devices||[]).includes(d.device_id))points.push([d.x,d.y]);for(const it of p.items)if(s.items.includes(it.id))points.push(...itemCorners(it));for(const d of p.dimensions)if(s.dimensions.includes(d.id)){const a=resolveEnd(p,d,'a'),b=resolveEnd(p,d,'b'),len=distance(a,b)||1,n=[-(b[1]-a[1])/len,(b[0]-a[0])/len];points.push(a,b,[a[0]+n[0]*d.offset,a[1]+n[1]*d.offset],[b[0]+n[0]*d.offset,b[1]+n[1]*d.offset]);}return points.length?bounds(points):null;}

  function moveSelection(p,s,dx,dy){

    if(!Number.isFinite(dx)||!Number.isFinite(dy)||Math.abs(dx)>50000||Math.abs(dy)>50000)throw Error('Enter a movement between −50,000 and 50,000 cm.');if(Math.hypot(dx,dy)<.001)return p;

    const points=selectionPoints(p,s);if(points.length)joinWallNodes(p);const before=clone(p),affected=q=>points.some(pt=>samePoint(pt,q));

    for(const r of p.rooms){const flags=r.points.map(affected);r.points=r.points.map((q,i)=>flags[i]?[q[0]+dx,q[1]+dy]:q);if(flags.every(Boolean))r.label=[r.label[0]+dx,r.label[1]+dy];else if(flags.some(Boolean))r.measurementSource='edited';}

    for(const it of p.items){if(s.items.includes(it.id)){it.x+=dx;it.y+=dy;continue;}let best=null;

      for(const r of before.rooms)r.points.forEach((a,i)=>{const b=r.points[(i+1)%r.points.length],ma=affected(a),mb=affected(b);if(!ma&&!mb||distance(a,b)<1)return;const f=fixtureOnWall(it,a,b);if(!f)return;const gap=projectPoint(f.centre,a,b).distance;if(!best||gap<best.gap-.001)best={...f,a,b,ma,mb,gap};});

      if(best){const {a,b,ma,mb,t}=best,A=[a[0]+(ma?dx:0),a[1]+(ma?dy:0)],B=[b[0]+(mb?dx:0),b[1]+(mb?dy:0)],centre=[A[0]+(B[0]-A[0])*t,A[1]+(B[1]-A[1])*t];it.rotation+=(Math.atan2(B[1]-A[1],B[0]-A[0])-Math.atan2(b[1]-a[1],b[0]-a[0]))*180/Math.PI;const rad=it.rotation*Math.PI/180;it.x=centre[0]-(it.kind==='door'?Math.sin(rad)*it.h/2:0);it.y=centre[1]+(it.kind==='door'?Math.cos(rad)*it.h/2:0);}

    }

    for(const d of p.dimensions)if(s.dimensions.includes(d.id)){const old=before.dimensions.find(q=>q.id===d.id);for(const k of ['a','b']){const q=resolveEnd(before,old,k),target=[q[0]+dx,q[1]+dy];if(d[k+'Anchor']&&!samePoint(resolveEnd(p,d,k),target))delete d[k+'Anchor'];d[k]=target;}}

    for(const d of p.devices||[])if((s.devices||[]).includes(d.device_id)){d.x+=dx;d.y+=dy;}

    for(const n of s.wallNodes||[]){const w=(p.walls||[]).find(w=>w.id===n.wallId);if(w)w[n.end]=[w[n.end][0]+dx,w[n.end][1]+dy];}

    repairLabels(p);return p;

  }

  class History {constructor(limit=80){this.past=[];this.future=[];this.limit=limit;}push(state){this.past.push(clone(state));if(this.past.length>this.limit)this.past.shift();this.future=[];}undo(state){if(!this.past.length)return null;this.future.push(clone(state));return this.past.pop();}redo(state){if(!this.future.length)return null;this.past.push(clone(state));return this.future.pop();}}

  const legacyInitial=clone(initial);correctedSketch(initial);

  const api={initial,legacyInitial,catalog,clone,bounds,area,inside,resizeRoom,calibrate,validate,History,distance,samePoint,snap10,snapNode10,projectPoint,editorData,resolveEnd,detachAnchors,insertNode,moveNode,removeNode,setWallLength,correctedSketch,joinWallNodes,reshapeWall,wallRun,moveWall,alignWall,smartSnap,labelPosition,repairLabels,clearance,doorSwing,doorDirection,fixtureOnWall,itemCorners,selectionPoints,boxSelection,selectionBounds,moveSelection};

  if(typeof module!=='undefined')module.exports=api;else root.LayoutModel=api;

})(typeof window!=='undefined'?window:globalThis);

