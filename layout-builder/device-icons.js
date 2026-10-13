// The build embeds the vendored Material Design Icons catalog and its license.

((root)=>{

  const catalog=typeof module!=='undefined'?require('./icon-catalog.json'):__ICON_CATALOG__;

  const byId=new Map(catalog.map(icon=>[icon.id,icon]));

  const groups=[...new Set(catalog.map(icon=>icon.group))];

  const normalize=value=>String(value||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();

  const searchText=new Map(catalog.map(icon=>[icon.id,normalize(`${icon.id} ${icon.label} ${icon.group} ${icon.keywords}`)]));

  function search(query='',group=''){

    const words=normalize(query).split(' ').filter(Boolean);

    return catalog.filter(icon=>(!group||icon.group===group)&&words.every(word=>searchText.get(icon.id).includes(word)));

  }

  const domains={light:'lightbulb',switch:'power',fan:'fan',climate:'thermostat',cover:'window-shutter',media_player:'play-circle',vacuum:'robot-vacuum',lock:'lock',sensor:'gauge',binary_sensor:'shield-home',camera:'cctv',siren:'smoke-detector',button:'power'};

  function automatic(entityId){return 'mdi:'+(domains[String(entityId||'').split('.')[0]]||'power');}

  function resolve(placement){return byId.has(placement?.icon)?placement.icon:automatic(placement?.entity_id);}

  function get(id){return byId.get(id)||byId.get('mdi:power');}

  function svg(id,size=24){const icon=get(id);return `<svg class="device-symbol" data-icon="${icon.id}" viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true"><path fill="currentColor" d="${icon.path}"/></svg>`;}

  function set(placement,icon){if(icon&&!byId.has(icon))throw Error('Choose an icon from the list.');if(icon)placement.icon=icon;else delete placement.icon;return placement;}

  const api={catalog,groups,search,automatic,resolve,get,svg,set};

  if(typeof module!=='undefined')module.exports=api;else root.DeviceIcons=api;

})(typeof window!=='undefined'?window:globalThis);

