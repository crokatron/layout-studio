const test=require('node:test'),assert=require('node:assert/strict'),M=require('./model.js'),I=require('./device-icons.js');

test('an icon edit survives save, undo, relocation and changing the control without changing identity',()=>{

 const plan=M.clone(M.initial),d={device_id:'lamp',entity_id:'switch.lamp',name:'Corner lamp',x:543,y:888};plan.devices=[d];

 const before=M.clone(plan),history=new M.History();history.push(plan);I.set(d,'mdi:floor-lamp');

 assert.deepEqual({...d,icon:undefined},{...before.devices[0],icon:undefined});

 const saved=M.validate(JSON.parse(JSON.stringify(plan)));assert.equal(saved.devices[0].icon,'mdi:floor-lamp');

 saved.devices[0].x=550;saved.devices[0].entity_id='light.lamp';assert.equal(I.resolve(saved.devices[0]),'mdi:floor-lamp');

 assert.deepEqual(history.undo(saved),before);

});

test('automatic icon removes the override and follows the entity domain',()=>{

 const d={entity_id:'switch.lamp',icon:'mdi:desk-lamp'};I.set(d,'');assert.equal(Object.hasOwn(d,'icon'),false);assert.equal(I.resolve(d),'mdi:power');

 d.entity_id='light.lamp';assert.equal(I.resolve(d),'mdi:lightbulb');

 assert.throws(()=>I.set(d,'<script>'));assert.equal(Object.hasOwn(d,'icon'),false);

});

test('invalid stored icons reject without accepting markup or URLs',()=>{

 for(const icon of ['','power','https://example.test/x.svg','mdi:power\" onload=\"x','mdi:foo/bar','mdi:UPPER',null,3,{},'mdi:'+'x'.repeat(101)]){

  const p=M.clone(M.initial);p.devices=[{device_id:'lamp',entity_id:'switch.lamp',x:1,y:1,icon}];assert.throws(()=>M.validate(p),'Rejected '+JSON.stringify(icon));

 }

});

test('every picker icon has safe local SVG geometry and a matching HA icon identifier',()=>{

 assert.equal(new Set(I.catalog.map(i=>i.id)).size,I.catalog.length);

 for(const icon of I.catalog){assert.match(icon.id,/^mdi:[a-z0-9]+(?:-[a-z0-9]+)*$/);assert.match(icon.path,/^[MmZzLlHhVvCcSsQqTtAaEe0-9.,+\-\s]+$/);assert.match(I.svg(icon.id),/viewBox="0 0 24 24"/);assert.equal(I.resolve({icon:icon.id}),icon.id);}

});

test('expanded search finds real home devices by model, alias, MDI identifier and unordered words',()=>{

 for(const [query,id] of [['Q990F','mdi:soundbar'],['quattro','mdi:dialpad'],['switchbot','mdi:curtains'],['3d enclosed','mdi:printer-3d'],['mdi:soundbar','mdi:soundbar'],['uk socket','mdi:power-socket-uk'],['levoit','mdi:air-filter']]){

  assert.ok(I.search(query).some(icon=>icon.id===id),query);

 }

 assert.equal(I.search('not-a-real-household-device-zzzz').length,0);

});

test('categories narrow search without changing selections or the catalog',()=>{

 const before=JSON.stringify(I.catalog),d={entity_id:'media_player.den_soundbar',x:532,y:725};I.set(d,'mdi:soundbar');

 assert.ok(I.search('','Buttons & remotes').length>10);

 assert.ok(I.search('speaker','Entertainment').every(i=>i.group==='Entertainment'));

 assert.equal(I.search('soundbar','Lighting').length,0);

 assert.equal(I.resolve(d),'mdi:soundbar');assert.equal(JSON.stringify(I.catalog),before);

 assert.equal(I.search('   ').length,I.catalog.length);

});

