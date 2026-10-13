// Display preferences belong to this browser, never to a saved floor plan.

(() => {

  'use strict';

  const root=document.documentElement, storageKey='layout-studio-view-v1';

  const choices=['auto','mobile','desktop'];

  let preference='auto';

  try { const saved=localStorage.getItem(storageKey); if(choices.includes(saved))preference=saved; } catch (_) {}

  const widthRules=[];

  // Keep one responsive stylesheet for all tabs. Explicit modes evaluate its

  // width breakpoints at a phone/desktop width; height and print rules stay intact.

  for(const rule of document.getElementById('studio-styles').sheet.cssRules){

    if(rule.media && /\(max-width\s*:\s*\d+px\)/i.test(rule.media.mediaText))widthRules.push({rule,original:rule.media.mediaText});

  }

  function apply(){

    // clientWidth remains the CSS viewport when a forced desktop canvas overflows

    // a phone. innerWidth can include that overflow and mis-detect Auto as desktop.

    const viewportWidth=root.clientWidth;

    const width=preference==='mobile'?Math.min(viewportWidth,850):preference==='desktop'?Math.max(viewportWidth,1200):viewportWidth;

    for(const {rule,original} of widthRules){

      rule.media.mediaText=preference==='auto'?original:original.replace(/\(max-width\s*:\s*(\d+)px\)/gi,(_,limit)=>width<=Number(limit)?'(min-width:0px)':'(max-width:0px)');

    }

    const previous=root.dataset.layout;

    root.dataset.layoutMode=preference;

    root.dataset.layout=width<=850?'mobile':'desktop';

    const picker=document.getElementById('layout-view');

    if(picker){picker.value=preference;picker.title='Layout view: '+preference+' · Saved in this browser';}

    window.dispatchEvent(new CustomEvent('layoutviewchange',{detail:{mobile:width<=850,changed:previous!==root.dataset.layout}}));

  }

  window.LayoutDisplay=Object.freeze({

    isMobile:()=>root.dataset.layout==='mobile',

    set(value){

      if(!choices.includes(value))return;

      preference=value;

      try { localStorage.setItem(storageKey,value); } catch (_) {}

      apply();

    }

  });

  apply();

  window.addEventListener('resize',apply);

  document.addEventListener('DOMContentLoaded',()=>{

    const picker=document.getElementById('layout-view');

    picker.addEventListener('change',()=>window.LayoutDisplay.set(picker.value));

    apply();

  });

})();

