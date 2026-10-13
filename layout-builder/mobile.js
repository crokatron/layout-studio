// Phone sheets share the desktop controls; the saved model is identical.

const phoneLayout=()=>window.LayoutDisplay.isMobile();

function mobileFocusRoom(){if(!phoneLayout()||selected?.type!=='room')return;const b=MapCamera.bounds(current().points,viewRotation,0),rect=stage.getBoundingClientRect(),scale=Math.min(Math.max(1,rect.width-120)/Math.max(1,b.w),Math.max(1,rect.height-120)/Math.max(1,b.h));view={x:b.x-60/scale,y:b.y-60/scale,w:b.w+120/scale,h:b.h+120/scale};drawPlan();}

function mobilePanel(name){if(!phoneLayout())return;const library=document.querySelector('.library'),inspectorEl=document.querySelector('.inspector');library.classList.toggle('sheet-open',['devices','furniture'].includes(name));library.dataset.panel=name;inspectorEl.classList.toggle('sheet-open',name==='edit');document.querySelectorAll('[data-mobile-panel]').forEach(b=>b.classList.toggle('active',b.dataset.mobilePanel===name));if(name==='devices')$('library-title').textContent='Devices';if(name==='furniture')$('library-title').textContent='Furniture';}

document.querySelectorAll('[data-mobile-panel]').forEach(b=>b.onclick=()=>{const name=b.dataset.mobilePanel;if(name==='automate'){autoOpen();return;}if(name==='plan'){setMode('pan');mobilePanel('plan');return;}if(name==='furniture')setMode('furnish');if(name==='devices')setMode('devices');if(name==='edit')setMode('rooms');mobilePanel(name);});

document.querySelectorAll('[data-sheet-close]').forEach(b=>b.onclick=()=>mobilePanel('plan'));

$('mobile-more').onclick=()=>{const open=document.querySelector('.header-actions').classList.toggle('menu-open');$('mobile-more').setAttribute('aria-expanded',String(open));};

document.querySelector('.header-actions').addEventListener('click',e=>{if(e.target.closest('button')?.id!=='mobile-more')document.querySelector('.header-actions').classList.remove('menu-open');});

$('catalog').addEventListener('click',e=>{if(e.target.closest('[data-library]'))mobilePanel('plan');});

$('room-list').addEventListener('click',()=>{mobilePanel('plan');mobileFocusRoom();});

window.addEventListener('layoutviewchange',e=>{

  if(!e.detail.changed)return;

  document.querySelector('.header-actions').classList.remove('menu-open');

  $('mobile-more').setAttribute('aria-expanded','false');

  if(phoneLayout())mobilePanel('plan');

  else document.querySelectorAll('.sheet-open').forEach(panel=>panel.classList.remove('sheet-open'));

  drawPlan();

});

// Capture multi-touch before editing handlers. A second finger restores any

// tentative drag, then pans/zooms the view only. Single tap tools commit on up.

const touchPoints=new Map();let pinch=null,pendingTouch=null,ignoreTouch=false;

function touchDistance(){const [a,b]=[...touchPoints.values()];return {distance:Math.hypot(a.x-b.x,a.y-b.y),x:(a.x+b.x)/2,y:(a.y+b.y)/2};}

stage.addEventListener('pointerdown',e=>{if(e.pointerType!=='touch')return;if(e.isPrimary){touchPoints.clear();pinch=null;pendingTouch=null;ignoreTouch=false;}touchPoints.set(e.pointerId,{x:e.clientX,y:e.clientY});if(touchPoints.size>=2){if(drag?.before)plan=M.clone(drag.before);drag=null;pendingTouch=null;snapGuide=null;ignoreTouch=true;const t=touchDistance();pinch={...t,view:{...view},anchor:viewportPoint({clientX:t.x,clientY:t.y}),matrix:svg.getScreenCTM()};drawPlan();e.stopImmediatePropagation();e.preventDefault();stage.setPointerCapture(e.pointerId);return;}const marker=e.target.closest('[data-ha-device]');if(marker&&mode!=='box'&&usePlacementGuide()&&!tool){pendingTouch={id:e.pointerId,x:e.clientX,y:e.clientY,deviceId:marker.dataset.haDevice,view:{...view},matrix:svg.getScreenCTM()};e.stopImmediatePropagation();e.preventDefault();stage.setPointerCapture(e.pointerId);return;}if((mode==='rooms'&&['draw-wall','measure','wall-pair'].includes(tool))||(mode==='devices'&&haPending)){pendingTouch={id:e.pointerId,x:e.clientX,y:e.clientY,target:e.target};e.stopImmediatePropagation();e.preventDefault();stage.setPointerCapture(e.pointerId);}},{capture:true});

stage.addEventListener('pointermove',e=>{if(e.pointerType!=='touch'||!touchPoints.has(e.pointerId))return;touchPoints.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pinch&&touchPoints.size>=2){const t=touchDistance(),factor=Math.max(.1,Math.min(10,pinch.distance/Math.max(1,t.distance))),w=Math.max(150,Math.min(15000,pinch.view.w*factor)),f=w/pinch.view.w;view={x:pinch.anchor.x-(pinch.anchor.x-pinch.view.x)*f-(t.x-pinch.x)/pinch.matrix.a*f,y:pinch.anchor.y-(pinch.anchor.y-pinch.view.y)*f-(t.y-pinch.y)/pinch.matrix.d*f,w,h:pinch.view.h*f};drawPlan();e.stopImmediatePropagation();e.preventDefault();}else if(pendingTouch){if(Math.hypot(e.clientX-pendingTouch.x,e.clientY-pendingTouch.y)>10)pendingTouch.moved=true;if(pendingTouch.deviceId&&pendingTouch.moved){const d=pendingTouch;view={...d.view,x:d.view.x-(e.clientX-d.x)/d.matrix.a,y:d.view.y-(e.clientY-d.y)/d.matrix.d};drawPlan();}const p=point(e);if(tool==='measure'){measureHover=pickMeasurement(p);snapGuide=measureHover;drawPlan();}if(tool==='draw-wall'){wallHover=wallPick(p,e);drawPlan();}e.stopImmediatePropagation();}else if(ignoreTouch)e.stopImmediatePropagation();},{capture:true});

function touchEnd(e){if(e.pointerType!=='touch')return;touchPoints.delete(e.pointerId);if(ignoreTouch||pendingTouch){const tap=pendingTouch;pendingTouch=null;if(!ignoreTouch&&tap&&!tap.moved&&e.type==='pointerup'){const p=point(e);if(tap.deviceId)placementOpen(tap.deviceId);else if(tool==='wall-pair')wallPairTap(p);else if(tool==='measure')measurementTap(p);else if(tool==='draw-wall')structurePointerDown(e,p);else if(mode==='devices'&&haPending)haPlace(haPending,p);}e.stopImmediatePropagation();e.preventDefault();}if(touchPoints.size===0){pinch=null;ignoreTouch=false;}if(stage.hasPointerCapture(e.pointerId))stage.releasePointerCapture(e.pointerId);}

stage.addEventListener('pointerup',touchEnd,{capture:true});stage.addEventListener('pointercancel',touchEnd,{capture:true});

if(phoneLayout()){mode='pan';mobilePanel('plan');}

