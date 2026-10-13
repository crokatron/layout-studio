/* Coordinate helpers shared by Studio and the Home Assistant card. */

(function(root){

 'use strict';

 const wrap=a=>((a%360)+360)%360;

 function rotate(p,a){const r=a*Math.PI/180,c=Math.cos(r),s=Math.sin(r);return {x:p.x*c-p.y*s,y:p.x*s+p.y*c};}

 function bounds(points,a=0,pad=60){const p=points.map(q=>rotate({x:q[0],y:q[1]},a));if(!p.length)p.push({x:0,y:0},{x:1000,y:1000});const x=Math.min(...p.map(q=>q.x))-pad,y=Math.min(...p.map(q=>q.y))-pad;return {x,y,w:Math.max(1,Math.max(...p.map(q=>q.x))-x+pad),h:Math.max(1,Math.max(...p.map(q=>q.y))-y+pad)};}

 function zoom(v,f,p={x:v.x+v.w/2,y:v.y+v.h/2}){f=Math.min(15000,Math.max(100,v.w*f))/v.w;return {x:p.x-(p.x-v.x)*f,y:p.y-(p.y-v.y)*f,w:v.w*f,h:v.h*f};}

 function frame(v,width,height){const scale=Math.min(width/v.w,height/v.h);return {scale,left:(width-v.w*scale)/2,top:(height-v.h*scale)/2};}

 function project(p,v,width,height,a=0){const q=rotate(p,a),f=frame(v,width,height);return {x:f.left+(q.x-v.x)*f.scale,y:f.top+(q.y-v.y)*f.scale};}

 function unproject(p,v,width,height,a=0){const f=frame(v,width,height);return rotate({x:(p.x-f.left)/f.scale+v.x,y:(p.y-f.top)/f.scale+v.y},-a);}

 // Keep the same world point beneath the fingers while panning, pinching and twisting.

 function gesture(v,a,width,height,start,end){

  const two=start.d>=12&&end.d>=12,rotation=two?wrap(a+end.angle-start.angle):a;

  const world=unproject(start,v,width,height,a),before=rotate(world,a),after=rotate(world,rotation);

  const view=zoom(v,two?start.d/end.d:1,before),scale=frame(view,width,height).scale;

  view.x+=after.x-before.x-(end.x-start.x)/scale;view.y+=after.y-before.y-(end.y-start.y)/scale;

  return {view,rotation};

 }

 const api={wrap,rotate,bounds,zoom,frame,project,unproject,gesture};if(typeof module==='object'&&module.exports)module.exports=api;else root.MapCamera=api;

})(typeof window==='object'?window:globalThis);

