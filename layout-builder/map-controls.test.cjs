const test=require('node:test'),assert=require('node:assert/strict');

const C=require('./map-camera.js'),Sky=require('./sky-model.js'),M=require('./model.js');require('./constraints.js');

const Furniture=require('./furniture-symbols.js');

test('HA fitting includes outside markers at saved coordinates on phones and desktop',()=>{

 const vm=require('node:vm'),fs=require('node:fs');let Card;

 vm.runInNewContext(fs.readFileSync(require.resolve('./ha-floor-card.js'),'utf8'),{window:{MapCamera:C},HTMLElement:class{},customElements:{get:()=>null,define:(name,c)=>{if(name==='mungoon-floor-card')Card=c}}});

 const plan={rooms:[{points:[[0,0],[600,0],[600,300],[0,300]],label:[300,150]}],devices:[{x:-900,y:600},{x:1500,y:-500}],items:[]};

 const card={config:{plan},points:Card.prototype.points,draw(){}};

 for(const rotation of [0,45,138,270])for(const [w,h] of [[360,580],[1440,700]]){

  card.rotation=rotation;Card.prototype.fit.call(card);

  for(const d of plan.devices){const q=C.project(d,card.view,w,h,rotation),back=C.unproject(q,card.view,w,h,rotation);assert.ok(q.x>0&&q.x<w&&q.y>0&&q.y<h);assert.ok(Math.hypot(back.x-d.x,back.y-d.y)<1e-7);}

 }

});

test('rotated world points remain exactly attached in portrait, landscape and letterboxed views',()=>{

 for(const [w,h] of [[320,700],[390,650],[1400,600]])for(const a of [0,15,90,222,359]){

  const v=C.bounds([[0,0],[1300,0],[1300,900],[0,900]],a),p={x:410,y:770},screen=C.project(p,v,w,h,a),back=C.unproject(screen,v,w,h,a);

  assert.ok(Math.abs(back.x-p.x)<1e-8&&Math.abs(back.y-p.y)<1e-8);assert.ok(screen.x>=0&&screen.x<=w&&screen.y>=0&&screen.y<=h);

 }

});

test('room detail fits its own outline and only shows markers inside that room',()=>{

 const vm=require('node:vm'),fs=require('node:fs');let Card;

 vm.runInNewContext(fs.readFileSync(require.resolve('./ha-floor-card.js'),'utf8'),{window:{MapCamera:C},HTMLElement:class{},customElements:{get:()=>null,define:(name,c)=>{if(name==='mungoon-floor-card')Card=c}}});

 const room={id:'den',points:[[0,0],[300,0],[300,300],[0,300]],label:[150,150]},card={config:{focus_room:'den',plan:{rooms:[room],devices:[{x:100,y:100},{x:500,y:100}]}},points:Card.prototype.points,draw(){},rotation:90};

 assert.equal(Card.prototype.visibleDevices.call(card).length,1);Card.prototype.fit.call(card);assert.equal(card.view.w,440);assert.equal(card.view.h,440);

 const destination={id:'bath',points:[[900,900],[1100,900],[1100,1100],[900,1100]],label:[1000,1000]};card.config.plan.rooms.push(destination);card.moveDraft={roomId:'bath',x:1000,y:1000};

 Card.prototype.fit.call(card);const preview=C.project(card.moveDraft,card.view,390,650,card.rotation);assert.ok(preview.x>0&&preview.x<390&&preview.y>0&&preview.y<650,'rebuilding a room card must keep the destination pin in view');

 card.moveDraft.roomId='';Card.prototype.fit.call(card);for(const d of card.config.plan.devices){const q=C.project(d,card.view,390,650,card.rotation);assert.ok(q.x>0&&q.x<390&&q.y>0&&q.y<650,'Anywhere on plan must fit devices outside the original room');}

});

test('zoom keeps its anchor fixed and rotations never mutate source points',()=>{const v={x:0,y:0,w:1000,h:800},p={x:100,y:200};const z=C.zoom(v,.5,p);assert.equal((p.x-v.x)/v.w,(p.x-z.x)/z.w);assert.equal((p.y-v.y)/v.h,(p.y-z.y)/z.h);assert.deepEqual(v,{x:0,y:0,w:1000,h:800});assert.equal(C.wrap(132-270),222);});

function closePoint(actual,expected){assert.ok(Math.hypot(actual.x-expected.x,actual.y-expected.y)<1e-7,JSON.stringify({actual,expected}));}

function fingers(a,b){return {x:(a.x+b.x)/2,y:(a.y+b.y)/2,d:Math.hypot(b.x-a.x,b.y-a.y),angle:Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI};}

test('two fingers keep their world points attached during simultaneous twist, pinch and pan',()=>{

 for(const [w,h] of [[390,610],[900,400]])for(const rotation of [0,222,359])for(const twist of [35,-70,179,-179]){

  const view={x:-100,y:20,w:1400,h:1000},original={...view},a={x:90,y:180},b={x:260,y:360},start=fingers(a,b);

  const move=p=>{const q=C.rotate({x:p.x-start.x,y:p.y-start.y},twist);return {x:start.x+q.x*1.4+21,y:start.y+q.y*1.4-32};};

  const c=move(a),d=move(b),next=C.gesture(view,rotation,w,h,start,fingers(c,d));

  closePoint(C.project(C.unproject(a,view,w,h,rotation),next.view,w,h,next.rotation),c);

  closePoint(C.project(C.unproject(b,view,w,h,rotation),next.view,w,h,next.rotation),d);

  assert.ok(Math.abs(next.rotation-C.wrap(rotation+twist))<1e-7);assert.deepEqual(view,original);

 }

});

test('twist crosses the angle boundary continuously and lifting a finger preserves rotation and zoom',()=>{

 const view={x:50,y:-40,w:1200,h:800},start={x:130,y:250,d:160,angle:175},end={...start,angle:-170};

 const next=C.gesture(view,350,390,610,start,end);assert.equal(next.rotation,5);

 const one={x:200,y:300,d:0},drag={x:215,y:280,d:0},pan=C.gesture(next.view,next.rotation,390,610,one,drag);

 assert.equal(pan.rotation,5);assert.equal(pan.view.w,next.view.w);assert.equal(pan.view.h,next.view.h);

 closePoint(C.project(C.unproject(one,next.view,390,610,next.rotation),pan.view,390,610,pan.rotation),drag);

});

test('gesture zoom limits retain the focal point and near-coincident fingers stay finite',()=>{

 const view={x:0,y:0,w:1000,h:800},start={x:100,y:300,d:20,angle:0},end={x:150,y:350,d:600,angle:90};

 const next=C.gesture(view,222,390,610,start,end);assert.equal(next.view.w,100);

 closePoint(C.project(C.unproject(start,view,390,610,222),next.view,390,610,next.rotation),end);

 const close=C.gesture(view,222,390,610,{...start,d:0},{...end,d:1});assert.equal(close.rotation,222);assert.equal(close.view.w,1000);assert.ok(Object.values(close.view).every(Number.isFinite));

});

test('home dates and moon events use HA timezone independently of browser timezone',()=>{

 const context={latitude:24.45,longitude:54.6,time_zone:'Asia/Dubai'},date=Sky.localDate('2026-10-04T23:30',context.time_zone);

 assert.equal(date.toISOString(),'2026-10-04T19:30:00.000Z');assert.equal(Sky.dateInput(date,context.time_zone),'2026-10-04T23:30');

 const s=Sky.snapshot(date,context);assert.ok(s.sun.altitude<0);assert.ok(s.moon.azimuth>=0&&s.moon.azimuth<360);

 const rise=s.events.find(e=>e.label==='Sunrise'),set=s.events.find(e=>e.label==='Sunset');assert.ok(rise.azimuth>85&&rise.azimuth<110);assert.ok(set.azimuth>250&&set.azimuth<275);assert.ok(set.date>rise.date);

 for(const e of s.events)assert.equal(Sky.dateInput(e.date,context.time_zone).slice(0,10),'2026-10-04');

});

test('polar dates omit missing solar events without invalid numbers',()=>{const s=Sky.snapshot(new Date('2026-06-21T12:00:00Z'),{latitude:80,longitude:10,time_zone:'Arctic/Longyearbyen'});assert.ok(!s.events.some(e=>e.label==='Sunrise'));assert.ok(s.events.every(e=>Number.isFinite(e.azimuth)&&Number.isFinite(+e.date)));});

function fixture(){const p=M.clone(M.initial);p.devices=[{device_id:'test',entity_id:'light.test',name:'Test',x:450,y:400}];return M.validate(p);}

test('device-only additive selection moves the marker once and supports undo',()=>{const p=fixture(),before=M.clone(p),h=new M.History();h.push(before);let s=M.boxSelection(p,[440,390],[460,410]);s=M.boxSelection(p,[440,390],[460,410],s);assert.deepEqual(s.devices,['test']);M.moveSelection(p,s,37,-19);assert.equal(p.devices[0].x,487);assert.equal(p.devices[0].y,381);assert.deepEqual(p.rooms,before.rooms);assert.deepEqual(h.undo(p),before);});

test('combined selection translates devices, furniture and internal walls together',()=>{const p=fixture();p.walls=[{id:'extra',name:'Divider',a:[450,400],b:[550,400],thickness:8}];M.editorData(p);const before=M.clone(p),s=M.boxSelection(p,[-1000,-1000],[5000,5000]);M.moveSelection(p,s,20,30);assert.equal(p.devices[0].x,before.devices[0].x+20);assert.deepEqual(p.walls[0].a,[470,430]);for(const i of p.items){const old=before.items.find(x=>x.id===i.id);assert.equal(i.x,old.x+20);assert.equal(i.y,old.y+30);}});

test('invalid group movement is atomic for devices and geometry',()=>{const p=fixture(),before=M.clone(p),s=M.boxSelection(p,[-1000,-1000],[5000,5000]);assert.throws(()=>M.moveSelection(p,s,Infinity,0));assert.deepEqual(p,before);});

test('shared furniture preserves sectional geometry and validates mirrored imports',()=>{const item={kind:'sectional',w:280,h:180,color:'#aabbcc'};assert.match(Furniture.render(item),/<path/);assert.match(Furniture.render({...item,mirrorX:true}),/scale\(-1 1\)/);assert.doesNotMatch(Furniture.render({...item,color:'" onload="alert(1)'}),/onload/);const p=fixture();p.items.push({id:'demo-chair',kind:'chair',name:'Example chair',x:100,y:100,w:50,h:50,rotation:0,color:'#aabbcc'});p.items[0].mirrorX=true;p.items[0].mirrorY=true;assert.equal(M.validate(M.clone(p)).items[0].mirrorX,true);p.items[0].mirrorX='yes';assert.throws(()=>M.validate(p));});

