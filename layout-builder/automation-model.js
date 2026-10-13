(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.AutomationModel=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){

  const clone=value=>JSON.parse(JSON.stringify(value));

  function normalize(value){const r=clone(value);if(r.format==='ha')return r;r.triggers=r.triggers||[r.trigger];delete r.trigger;r.conditions=r.conditions||[];r.condition_mode=r.condition_mode||'all';r.mode=r.mode||'single';r.max_runs=r.max_runs||10;r.description=r.description||'';return r;}

  function duplicate(value,id){const r=normalize(value);r.id=id;r.name=(r.name+' (Copy)').slice(0,100);r.enabled=false;if(r.format==='ha'){r.config.id=id;r.config.alias=r.name;r.config.initial_state=false;}return r;}

  function advanced(value){const r=normalize(value);return r.format==='ha'||r.triggers.length>1||r.conditions.length>1||r.actions.length>1||r.condition_mode!=='all'||r.mode!=='single'||!!r.description||r.conditions.some(c=>c.kind==='weekday')||r.triggers.some(c=>c.offset_minutes)||r.actions.some(a=>a.action==='delay');}

  function move(list,index,step){const to=index+step;if(to<0||to>=list.length)return;[list[index],list[to]]=[list[to],list[index]];}

  function suggestions(options,catalog){

    const available=(options.entities||[]).filter(e=>!e.entity_category&&!['unavailable','unknown'].includes(e.state)),domain=e=>e.entity_id.split('.')[0],label=e=>[e.name,e.device_name].filter(Boolean).join(' '),actions=options.actions||[],out=[];

    const unique=rows=>[...new Map(rows.map(e=>[e.device_id||e.entity_id,e])).values()];

    const lamps=unique(available.filter(e=>['light','switch'].includes(domain(e))&&/lamp|light/i.test(label(e))&&!/grow|seedling|indicator|backlight|status led/i.test(label(e))));

    const add=(key,name,reason,triggers,conditions,steps,devices)=>{

      if(steps.some(a=>!actions.includes(a.action)))return;

      const targets=steps.flatMap(a=>a.entities||[]),references=[...targets,...available.filter(e=>targets.includes(e.entity_id)).map(e=>e.device_id).filter(Boolean)],overlaps=(catalog.rules||[]).filter(r=>references.some(id=>JSON.stringify(r.config||r.rule.config||r.rule.actions||[]).includes('"'+id+'"'))).map(r=>r.rule.name);

      out.push({key,reason,devices:devices.map(e=>e.device_name||e.name),overlaps,rule:normalize({id:'',name,enabled:false,triggers,conditions,actions:steps})});

    };

    const lampGroups=[...new Set(lamps.map(e=>e.area_name).filter(Boolean))].slice(0,2);

    for(const room of lampGroups){const rows=lamps.filter(e=>e.area_name===room),ids=rows.map(e=>e.entity_id);

      add('evening-'+room,room+' · Evening Lamps','Turn on the room’s lamps at sunset. Review the selected lamps before saving.',[{kind:'sun',event:'sunset',offset_minutes:0}],[],[{action:'turn_on',entities:ids}],rows);

      add('bedtime-'+room,room+' · Lamps Off at Bedtime','A suggested 23:00 bedtime; change it to suit your routine.',[{kind:'time',at:'23:00'}],[],[{action:'turn_off',entities:ids}],rows);

    }

    const curtains=unique(available.filter(e=>domain(e)==='cover'&&/curtain|blind/i.test(label(e))));

    if(curtains.length)add('curtains-evening','Home · Close Curtains at Sunset','Uses the available curtain controls. Check each room and curtain before enabling.',[{kind:'sun',event:'sunset',offset_minutes:0}],[],[{action:'close_cover',entities:curtains.map(e=>e.entity_id)}],curtains);

    const dehumidifiers=unique(available.filter(e=>['switch','humidifier'].includes(domain(e))&&/dehumidifier/i.test(label(e))));

    for(const d of dehumidifiers.filter(e=>domain(e)==='switch').slice(0,1)){

      const sensor=available.find(e=>domain(e)==='sensor'&&e.device_class==='humidity'&&e.area_name&&e.area_name===d.area_name);

      if(sensor){add('humidity-on',d.area_name+' · Humidity Control On','Suggested 65% threshold held for 5 minutes. Verify that this sensor represents the dehumidifier’s room.',[{kind:'numeric',entity_id:sensor.entity_id,operator:'above',value:65,seconds:300}],[],[{action:'turn_on',entities:[d.entity_id]}],[sensor,d]);add('humidity-off',d.area_name+' · Humidity Control Off','Pairs with the high-humidity rule. The lower 55% threshold avoids rapid on/off cycling.',[{kind:'numeric',entity_id:sensor.entity_id,operator:'below',value:55,seconds:300}],[],[{action:'turn_off',entities:[d.entity_id]}],[sensor,d]);}

    }

    const person=available.find(e=>domain(e)==='person');

    if(person&&lamps.length)add('away-lamps','Home · Lamps Off When Away','Wait 10 minutes after this person leaves. Review this carefully if anyone else may still be home.',[{kind:'state',entity_id:person.entity_id,state:'not_home',seconds:600}],[],[{action:'turn_off',entities:lamps.map(e=>e.entity_id)}],[person,...lamps]);

    return out;

  }

  function automationRows(catalog){return (catalog.rules||[]).filter(row=>!row.button_assignment);}

  function templates(options,catalog={rules:[]}){

    const available=(options.entities||[]).filter(e=>!e.entity_category&&!['unavailable','unknown'].includes(e.state));

    const domain=e=>e.entity_id.split('.')[0],label=e=>[e.name,e.device_name].filter(Boolean).join(' ');

    const unique=rows=>[...new Map(rows.map(e=>[e.device_id||e.entity_id,e])).values()];

    const lamps=unique(available.filter(e=>['light','switch'].includes(domain(e))&&/lamp|light/i.test(label(e))&&!/grow|seedling|indicator|backlight|status led/i.test(label(e))));

    const grow=unique(available.filter(e=>['light','switch'].includes(domain(e))&&/grow|seedling/i.test(label(e))));

    const curtains=unique(available.filter(e=>domain(e)==='cover'&&/curtain|blind/i.test(label(e))));

    const purifiers=unique(available.filter(e=>domain(e)==='fan'&&/purifier|filter|scrubber/i.test(label(e))));

    const humidity=available.filter(e=>domain(e)==='sensor'&&e.device_class==='humidity');

    const dryer=available.find(e=>domain(e)==='switch'&&/dehumidifier/i.test(label(e))&&e.area_name&&humidity.some(s=>s.area_name===e.area_name));

    const humid=dryer&&humidity.find(e=>e.area_name===dryer.area_name);

    const motion=available.find(e=>domain(e)==='binary_sensor'&&['motion','occupancy','presence'].includes(e.device_class)&&e.area_name&&lamps.some(l=>l.area_name===e.area_name));

    const roomLamps=motion?lamps.filter(e=>e.area_name===motion.area_name):[];

    const person=available.find(e=>domain(e)==='person'),ids=rows=>rows.map(e=>e.entity_id),step=(action,rows,extra={})=>({action,entities:ids(rows),...extra});

    const time=at=>({kind:'time',at}),sun=event=>({kind:'sun',event,offset_minutes:0}),state=(entity,value,seconds=0)=>({kind:'state',entity_id:entity?.entity_id||'',state:value,seconds});

    const numeric=(operator,value)=>({kind:'numeric',entity_id:humid?.entity_id||'',operator,value,seconds:300});

    const drafts=[

      ['evening-lights','Lighting','Evening lights at sunset','Turn on selected lamps at sunset. Grow lights are kept separate.',[sun('sunset')],[],[step('turn_on',lamps)]],

      ['bedtime-lights','Lighting','Lights off at bedtime','Switch off selected lamps at 23:00. Change the time to your bedtime.',[time('23:00')],[],[step('turn_off',lamps)]],

      ['morning-curtains','Curtains','Weekday morning curtains','Open selected curtains at 07:00 on weekdays. Edit the time and days.',[time('07:00')],[{kind:'weekday',days:['mon','tue','wed','thu','fri']}],[step('open_cover',curtains)]],

      ['evening-curtains','Curtains','Close curtains at sunset','Close selected curtains when the sun sets.',[sun('sunset')],[],[step('close_cover',curtains)]],

      ['quiet-purifiers','Air & comfort','Quiet air purifiers at night','Set selected air purifiers to 25% at 22:30. This may turn them on; review the speed and time.',[time('22:30')],[],[step('fan_speed',purifiers,{value:25})]],

      ['humidity-high','Air & comfort','Dehumidifier on above 65%','Use a sensor in the same room. Start after humidity stays above 65% for five minutes; pair with the off template.',[numeric('above',65)],[],[step('turn_on',dryer?[dryer]:[])]],

      ['humidity-low','Air & comfort','Dehumidifier off below 55%','Stop after humidity stays below 55% for five minutes. The gap between thresholds reduces repeated switching.',[numeric('below',55)],[],[step('turn_off',dryer?[dryer]:[])]],

      ['motion-lights','Presence','Evening motion lighting','Turn on lamps in the motion sensor’s room between 18:00 and 07:00. Choose a matching sensor and lamps.',[state(motion,'on')],[{kind:'time',after:'18:00',before:'07:00'}],[step('turn_on',roomLamps)]],

      ['motion-clear','Presence','Lights off when motion clears','After five minutes with no motion, turn off the selected room’s lamps. Review the delay for occupied rooms.',[state(motion,'off',300)],[],[step('turn_off',roomLamps)]],

      ['away-lights','Presence','Lights off when away','Turn off selected lamps ten minutes after the selected person leaves. Add conditions if someone else may still be home.',[state(person,'not_home',600)],[],[step('turn_off',lamps)]],

      ['grow-morning','Plant care','Grow lights on in the morning','Turn on selected grow lights at 07:00. Review existing grow-light schedules before using this template.',[time('07:00')],[],[step('turn_on',grow)]],

      ['grow-evening','Plant care','Grow lights off at night','Turn off selected grow lights at 22:00. Pair with the morning template and edit the growing hours.',[time('22:00')],[],[step('turn_off',grow)]],

    ];

    return drafts.map(([key,category,name,reason,triggers,conditions,actions])=>{

      const targets=actions.flatMap(a=>a.entities),selected=available.filter(e=>targets.includes(e.entity_id)||triggers.some(t=>t.entity_id===e.entity_id));

      const refs=[...targets,...selected.map(e=>e.device_id).filter(Boolean)];

      const missing=[];if(triggers.some(t=>'entity_id' in t&&!t.entity_id))missing.push('Choose a trigger device or sensor');if(actions.some(a=>!a.entities.length))missing.push('Choose target devices');

      const supported=actions.every(a=>(options.actions||[]).includes(a.action));

      return {key,category,reason,supported,missing,devices:selected.map(e=>e.device_name||e.name),

        overlaps:(catalog.rules||[]).filter(r=>refs.some(id=>JSON.stringify(r.config||r.rule.config||r.rule.actions||[]).includes('"'+id+'"'))).map(r=>r.rule.name),

        rule:normalize({id:'',name,enabled:false,triggers,conditions,actions})};

    });

  }

  return {normalize,duplicate,advanced,move,suggestions,templates,automationRows};

});

