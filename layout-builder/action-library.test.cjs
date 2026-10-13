const test=require('node:test'),assert=require('node:assert/strict'),A=require('./action-library.js');

const entity=(id,name,extra={})=>({entity_id:id,name,area_name:'Den',supported_actions:['turn_off','turn_on','toggle'],...extra});

const options={entities:[entity('switch.lamp','Den · Wine Rack Lamp'),entity('switch.grow','Den · Grow Light'),entity('switch.plug','Master Bedroom · Bedside Plug',{area_name:'Master Bedroom'}),entity('switch.led','Den · Indicator light',{entity_category:'config'}),entity('switch.dishwasher','Dishwasher'),entity('fan.arete','Arete Dehumidifier',{device_id:'arete'}),entity('humidifier.arete','Arete Dehumidifier',{device_id:'arete'}),entity('switch.bath','Guest Bathroom · Dehumidifier Plug',{area_name:'Guest Bathroom'}),entity('scene.tv','Den curtains · TV',{attributes:{id:'mungoon_den_curtains_tv'},supported_actions:['scene'],area_name:''})]};

test('lights off selects the room lamps and grow lights without unrelated plugs or settings',()=>{assert.deepEqual(A.targets(options,'lights','turn_off','Den').map(e=>e.entity_id),['switch.lamp','switch.grow']);});

test('lights off excludes camera infrared lamps even when not marked as settings',()=>{assert.deepEqual(A.targets({entities:[entity('switch.camera_ir_lamp','Den Camera IR lamp'),entity('switch.infrared','IR lamp'),entity('switch.lamp','Den Lamp')]},'lights','turn_off').map(e=>e.entity_id),['switch.lamp']);});

test('dehumidifiers off uses one primary Arete entity and includes the separate dehumidifier plug',()=>{assert.deepEqual(A.targets(options,'dehumidifiers','turn_off').map(e=>e.entity_id),['humidifier.arete','switch.bath']);assert.deepEqual(A.targets(options,'dehumidifiers','turn_off','Den').map(e=>e.entity_id),['humidifier.arete']);});

test('saved curtain presets without registry devices or rooms are discoverable and untouched',()=>{const before=JSON.stringify(options),shortcut=A.shortcuts(options,'Den').find(s=>s.id==='scene.tv');assert.deepEqual(shortcut.actions,[{action:'scene',entities:['scene.tv']}]);assert.equal(JSON.stringify(options),before);assert.equal(A.shortcuts(options,'Empty').find(s=>s.id==='lights-off').available,false);});

test('target support and shared mode choices reject unsupported hardware',()=>{const e=[entity('fan.a','Purifier',{attributes:{preset_modes:['sleep','auto']},supported_actions:['fan_preset']}),entity('fan.b','Fan',{attributes:{preset_modes:['normal','sleep']},supported_actions:['fan_preset']})];assert.deepEqual(A.choices({action:'fan_preset',entities:e.map(x=>x.entity_id)},e),['sleep']);assert.equal(A.allowed({action:'fan_speed'},e[0]),false);assert.equal(A.allowed({action:'fan_preset'},e[0]),true);});

test('previous-state restore expands curtain presets and rejects opaque scripts',()=>{const rows=[entity('switch.lamp','Lamp'),entity('humidifier.arete','Arete'),entity('cover.den','Curtains'),entity('scene.tv','TV',{attributes:{entity_id:['cover.den']}})];assert.deepEqual(A.restoreSummary([{action:'turn_off',entities:['switch.lamp','humidifier.arete']},{action:'scene',entities:['scene.tv']}],rows).targets,['switch.lamp','humidifier.arete','cover.den']);assert.match(A.restoreSummary([{action:'script',entities:['script.nest']}],rows).error,/cannot reliably/);});

