const test=require('node:test'),assert=require('node:assert/strict'),R=require('./device-room-moves.js');

const rooms=[{id:'den',name:'Den',points:[[0,0],[200,0],[200,50],[50,50],[50,200],[0,200]],label:[100,100]},{id:'bath',name:'Bathroom',points:[[250,0],[450,0],[450,200],[250,200]],label:[350,100]}];

test('concave rooms choose an interior point away from occupied markers and labels',()=>{const p=R.pointForRoom(rooms[0],[{device_id:'other',x:25,y:25}]);assert(R.inside(p.x,p.y,rooms[0].points));assert(Math.hypot(p.x-25,p.y-25)>10);});

test('room moves update only established prefixes and preserve custom names and icon',()=>{const p={rooms,ha_device_names:{d:'Den · Dehumidifier'}},d={device_id:'d',name:'Den · Dehumidifier',icon:'mdi:air-humidifier-off',entity_id:'humidifier.d'};R.rename(p,d,rooms[1]);assert.equal(d.name,'Bathroom · Dehumidifier');assert.equal(p.ha_device_names.d,d.name);assert.equal(d.entity_id,'humidifier.d');assert.equal(d.icon,'mdi:air-humidifier-off');p.ha_device_names.d='My custom name';R.rename(p,d,rooms[0]);assert.equal(p.ha_device_names.d,'My custom name');});

test('save subscribes before sending and only accepts matching owner replies',async()=>{let listener,unsubscribed=false;const order=[],config={user_id:'owner',event:'move',reply_event:'reply'},request={request_id:'abc'};const hass={connection:{async subscribeEvents(cb,type){listener=cb;order.push(type);return ()=>unsubscribed=true;}},async callWS(value){order.push(value.event_type);listener({context:{user_id:'other'},data:{request_id:'abc',saved:true}});listener({context:{user_id:'owner'},data:{request_id:'wrong',saved:true}});listener({context:{user_id:'owner'},data:{request_id:'abc',saved:true,revision:'fresh'}});}};const result=await R.send(hass,config,request);assert.deepEqual(order,['reply','move']);assert.equal(result.revision,'fresh');assert(unsubscribed);});

test('timeout and rejection do not claim success and unsubscribe',async()=>{let cleaned=false;const hass={connection:{async subscribeEvents(){return ()=>cleaned=true;}},async callWS(){}};await assert.rejects(R.send(hass,{user_id:'owner'},{},5),/not confirmed/);assert(cleaned);});



test('confirmed saves update frozen HA dashboard data without mutating it',()=>{const freeze=o=>{Object.values(o).filter(v=>v&&typeof v==='object').forEach(freeze);return Object.freeze(o);};const config=freeze({plan:{rooms,devices:[{device_id:'d',name:'Den · Dehumidifier',x:20,y:30,icon:'mdi:air-humidifier-off'},{device_id:'other',x:10,y:10}]},movement:{revision:'old'}});const next=R.withSavedMove(config,{device:{device_id:'d',name:'Bathroom · Dehumidifier',x:300,y:80},revision:'new'});assert.equal(next.plan.devices[0].x,300);assert.equal(next.plan.devices[0].name,'Bathroom · Dehumidifier');assert.equal(next.plan.devices[0].icon,'mdi:air-humidifier-off');assert.equal(next.movement.revision,'new');assert.equal(config.plan.devices[0].x,20);assert.equal(config.movement.revision,'old');assert.equal(next.plan.devices[1],config.plan.devices[1]);});

