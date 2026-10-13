const {test}=require('node:test'),assert=require('node:assert/strict'),P=require('./placement-geometry.js');

const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);

test('a centred pin maps to the same plan location in portrait, landscape and letterboxed views',()=>{

 const v={x:80,y:150,w:500,h:700};

 for(const r of [{x:0,y:120,width:360,height:390},{x:10,y:60,width:720,height:180},{x:30,y:90,width:400,height:400}]){const p=P.at(v,r,{x:r.x+r.width/2,y:r.y+r.height/2});close(p.x,330);close(p.y,500);}

});

test('room fitting keeps the entire room visible while an off-centre device stays under the pin',()=>{

 const b={x:0,y:0,w:600,h:300},target={x:520,y:40},r={x:0,y:150,width:360,height:420};const v=P.fit(b,target,r),k=P.scale(v,r);assert.deepEqual(P.centre(v),target);assert.ok(v.x<=b.x&&v.y<=b.y&&v.x+v.w>=b.x+b.w&&v.y+v.h>=b.y+b.h);assert.ok(k>0);

});

test('finger panning moves the map under a fixed pin and does not mutate the starting view',()=>{

 const v={x:0,y:0,w:400,h:600},original={...v},r={x:0,y:50,width:400,height:600},next=P.pan(v,r,80,-50);assert.deepEqual(v,original);assert.deepEqual(P.centre(next),{x:120,y:350});

});

test('pinch zoom keeps the world point under the moving finger midpoint',()=>{

 const v={x:50,y:70,w:500,h:800},r={x:12,y:150,width:360,height:400},a={x:100,y:250},b={x:140,y:230};const wanted=P.at(v,r,a),next=P.pinch(v,r,a,b,.6),actual=P.at(next,r,b);close(actual.x,wanted.x);close(actual.y,wanted.y);close(next.w,300);

});

test('zoom controls and fine adjustment preserve a precise target across orientation changes',()=>{

 const v={x:10,y:40,w:320,h:500},target=P.centre(v),zoomed=P.zoom(v,.8);assert.deepEqual(P.centre(zoomed),target);const adjusted=P.centred(zoomed,{x:target.x+5,y:target.y-5});for(const r of [{x:0,y:0,width:390,height:500},{x:0,y:0,width:820,height:160}]){const p=P.at(adjusted,r,{x:r.width/2,y:r.height/2});close(p.x,target.x+5);close(p.y,target.y-5);}

});

test('zoom limits keep extreme gestures finite and centred',()=>{const v={x:0,y:0,w:400,h:600};for(const factor of [1e-10,1e10]){const n=P.zoom(v,factor);assert.ok(n.w>=30&&n.w<=15000);assert.deepEqual(P.centre(n),P.centre(v));}});

