/* Refresh only this floor-plan interface; keep HA sign-in and other caches. */

(()=>{'use strict';

const PARAM='floor_plan_refresh',RESOURCE='/local/mungoon/ha-floor-card-v2.js';

function requestToken(href){const value=new URL(href).searchParams.get(PARAM)||'';return /^[a-z0-9-]{8,80}$/.test(value)?value:null;}

function reload(env=window){

 const url=new URL(env.location.href);

 url.searchParams.set(PARAM,Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,12));

 // A document navigation reopens HA's connection and reads the saved dashboard.

 env.location.replace(url.href);

}

function start(install,env=window,load=url=>import(url)){

 const token=requestToken(env.location.href);

 if(!token||env.__mungoonFloorRefresh===token){install();return Promise.resolve();}

 env.__mungoonFloorRefresh=token;

 // Do not register the cached custom element before the fresh module arrives:

 // custom elements cannot be redefined inside an already-loaded document.

 return load(new URL(RESOURCE+'?refresh='+encodeURIComponent(token),env.location.href).href).catch(()=>{

  env.__mungoonFloorRefreshError='Could not download the latest floor plan. Showing the previous interface; check your connection and tap Refresh to retry.';

  install();

 });

}

const api={requestToken,reload,start};if(typeof module!=='undefined')module.exports=api;else window.FloorPlanRefresh=api;

})();

