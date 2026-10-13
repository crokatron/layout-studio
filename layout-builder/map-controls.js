// Viewing transforms never alter room geometry or its parametric constraints.

const skyWidget=$('home-sky');let skyContext=null,skyError='';

function refreshSky(){skyWidget.config={context:skyContext,bearing:plan.north_bearing??0,rotation:viewRotation,error:skyError,calibration:plan.north_reference||'Set the true bearing of the top of this drawing.',onBearing:n=>mutate(()=>{plan.north_bearing=n;plan.north_reference='Drawing top calibrated to '+fmt(n)+'° true';})};}

function rotateView(angle){const centre={x:view.x+view.w/2,y:view.y+view.h/2},unrotated=MapCamera.rotate(centre,-viewRotation);viewRotation=MapCamera.wrap(angle);const moved=MapCamera.rotate(unrotated,viewRotation);view.x=moved.x-view.w/2;view.y=moved.y-view.h/2;drawPlan();}

$('rotate-map-left').onclick=()=>rotateView(viewRotation-15);

$('rotate-map-right').onclick=()=>rotateView(viewRotation+15);

$('map-angle').oninput=$('map-angle').onchange=e=>{if(e.target.value!==''&&Number.isFinite(+e.target.value))rotateView(+e.target.value);};

$('map-angle').onblur=()=>{$('map-angle').value=Math.round(viewRotation);};

$('map-north').onclick=()=>{rotateView(plan.north_bearing??0);fit();};

$('map-reset').onclick=()=>{rotateView(0);fit();};

skyError='No home location is configured in this local edition.';refreshSky();