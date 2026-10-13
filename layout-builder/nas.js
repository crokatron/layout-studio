let nasEtag=null,nasTimer=null,nasSaving=false,nasPending=false,nasConflict=false,nasLoaded=false,nasSavedBody=null,nasChecking=false;

try {

  const r=await fetch('/api/designs/floor-plan');if(!r.ok)throw Error();

  nasEtag=r.headers.get('X-Project-Revision')||r.headers.get('ETag')?.replace(/^W\//,'');const saved=await r.json();if(saved)plan=M.validate(saved);

  nasLoaded=true;nasSavedBody=JSON.stringify(plan);$('save-status').textContent='Loaded from NAS';

} catch {nasConflict=true;$('save-status').textContent='NAS draft could not load · reload to edit';}

async function saveNas(){

  clearTimeout(nasTimer);

  if(nasSaving){nasPending=true;return;}

  if(nasConflict||!nasEtag){$('save-status').textContent='NAS save unavailable · export your layout';return;}

  nasSaving=true;const body=JSON.stringify(plan);$('save-status').textContent='Saving to NAS…';

  try{

    const r=await fetch('/api/designs/floor-plan',{method:'PUT',headers:{'Content-Type':'application/json','If-Match':nasEtag},body});

    if(r.status===409){nasConflict=true;throw Error('Newer NAS draft exists · export, then reload');}

    const result=await r.json();if(!r.ok)throw Error(result.error||'NAS save failed · retry Save to NAS');

    nasEtag=r.headers.get('X-Project-Revision')||r.headers.get('ETag')?.replace(/^W\//,'');nasSavedBody=body;$('save-status').textContent='Saved on NAS';

    if(result.ha)haShowStatus(result.ha);

  }catch(e){$('save-status').textContent=e.message;}

  finally{nasSaving=false;if(nasPending){nasPending=false;saveNas();}}

}

function queueNas(){clearTimeout(nasTimer);nasTimer=setTimeout(saveNas,600);}

function nasEditing(){return drag||editBaseline||placementSession||tool||document.activeElement?.matches('input,textarea,select,[contenteditable="true"]')||document.querySelector?.('dialog[open]');}

async function refreshNasChanges(){

  if(!nasLoaded||nasChecking||nasSaving||nasPending||document.hidden||nasEditing())return;

  nasChecking=true;

  try{

    const r=await fetch('/api/designs/floor-plan');if(!r.ok)return;

    const revision=r.headers.get('X-Project-Revision')||r.headers.get('ETag')?.replace(/^W\//,'');if(!revision||revision===nasEtag)return;

    const saved=await r.json();

    // Recheck after the network read: never replace edits begun while awaiting it.

    if(nasSaving||nasPending||nasEditing()||JSON.stringify(plan)!==nasSavedBody){$('save-status').textContent='Newer NAS layout exists · export your edits, then reload';return;}

    plan=M.validate(saved);nasEtag=revision;nasSavedBody=JSON.stringify(plan);nasConflict=false;selected=null;history=new M.History();

    try{localStorage.setItem(key,nasSavedBody);}catch{}

    render();haRenderList();$('save-status').textContent='Updated from NAS · HA changes loaded';

  }catch{}finally{nasChecking=false;}

}

setInterval(refreshNasChanges,5000);

window.addEventListener('focus',refreshNasChanges);

