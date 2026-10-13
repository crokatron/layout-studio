// Geometry for the placement preview. Panning and zooming never modify the plan.

((root)=>{

  const centre=v=>({x:v.x+v.w/2,y:v.y+v.h/2});

  const centred=(v,p)=>({...v,x:p.x-v.w/2,y:p.y-v.h/2});

  const scale=(v,r)=>Math.min(r.width/v.w,r.height/v.h);

  function at(v,r,p){const k=scale(v,r);return {x:v.x+(p.x-r.x-(r.width-v.w*k)/2)/k,y:v.y+(p.y-r.y-(r.height-v.h*k)/2)/k};}

  function pan(v,r,dx,dy){const k=scale(v,r);return {...v,x:v.x-dx/k,y:v.y-dy/k};}

  function zoom(v,factor){const w=Math.max(30,Math.min(15000,v.w*factor)),f=w/v.w;return centred({...v,w,h:v.h*f},centre(v));}

  function fit(b,p,r){const width=Math.max(1,2*Math.max(Math.abs(p.x-b.x),Math.abs(p.x-b.x-b.w))),height=Math.max(1,2*Math.max(Math.abs(p.y-b.y),Math.abs(p.y-b.y-b.h))),k=Math.min(Math.max(30,r.width-64)/width,Math.max(30,r.height-64)/height);return centred({w:r.width/k,h:r.height/k},p);}

  function pinch(v,r,start,end,factor){let next=zoom(v,factor);const anchor=at(v,r,start),now=at(next,r,end);return {...next,x:next.x+anchor.x-now.x,y:next.y+anchor.y-now.y};}

  const api={centre,centred,scale,at,pan,zoom,fit,pinch};

  if(typeof module!=='undefined')module.exports=api;else root.PlacementGeometry=api;

})(typeof window!=='undefined'?window:globalThis);

