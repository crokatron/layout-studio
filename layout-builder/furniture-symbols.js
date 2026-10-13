/* Shared furniture symbols for Studio, exports and the HA interactive map. */

(function(root){

'use strict';

function symbol(kind,w,h,color,flip=false,swing){

  color=/^#[0-9a-f]{6}$/i.test(color)?color:'#80958c';

  const s=`stroke="#53645a" stroke-width="2"`,r=(x,y,a,b,fill=color,rx=5)=>`<rect x="${x}" y="${y}" width="${a}" height="${b}" rx="${rx}" fill="${fill}" ${s}/>`;

  if(kind==='double-sink')return r(-w/2,-h/2,w,h)+r(-w*.42,-h*.28,w*.34,h*.58,'#d5dfd9')+r(w*.08,-h*.28,w*.34,h*.58,'#d5dfd9');

  const line=(x,y,x2,y2)=>`<path d="M${x} ${y}L${x2} ${y2}" fill="none" ${s}/>`;

  const circle=(x,y,rad,fill=color)=>`<circle cx="${x}" cy="${y}" r="${rad}" fill="${fill}" ${s}/>`;

  const x=-w/2,y=-h/2;

  if(kind==='rug')return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${color}" stroke="#a48b6b" stroke-width="1.5"/><rect x="${x+9}" y="${y+9}" width="${Math.max(1,w-18)}" height="${Math.max(1,h-18)}" fill="none" stroke="#fff8e3" stroke-width="2" stroke-dasharray="4 4"/>`;

  if(kind==='bed'){let a=r(x,y,w,h,color,8)+r(x+5,y+4,w-10,h*.26,'#f8f4e9',6)+r(x+4,y+h*.33,w-8,h*.62,color,3);const count=w>120?2:1;for(let i=0;i<count;i++)a+=r(x+10+i*(w-14)/count,y+10,(w-26)/count,h*.15,'#fffef7',7);return a+line(x+5,y+h*.43,w/2-5,y+h*.43);}

  if(kind==='sofa'||kind==='armchair'||kind==='outdoor'){let a=r(x,y,w,h,color,10)+r(x+8,y+7,w-16,h*.22,color,5);a+=r(x+6,y+h*.25,w-12,h*.65,color,6);if(kind==='sofa'){a+=line(x+w/3,y+h*.26,x+w/3,y+h*.85)+line(x+w*2/3,y+h*.26,x+w*2/3,y+h*.85);}return a+r(x+2,y+14,Math.min(15,w*.2),h-20,color,5)+r(w/2-Math.min(15,w*.2)-2,y+14,Math.min(15,w*.2),h-20,color,5);}

  if(kind==='chaise')return r(x,y,w,h,color,10)+r(x+8,y+8,w-16,h*.2,color,7)+line(x+10,y+h*.55,w/2-10,y+h*.55);

  if(kind==='u-sofa')return `<path d="M${x} ${y}h${w}v${h}h${-w*.25}v${-h*.58}h${-w*.5}v${h*.58}h${-w*.25}Z" fill="${color}" ${s}/>`+line(x+12,y+18,w/2-12,y+18);

  if(kind==='corner-desk')return `<path d="M${x} ${y}h${w}v${h*.35}h${-w*.65}v${h*.65}h${-w*.35}Z" fill="${color}" ${s}/>`+r(x+w*.48,y+7,w*.35,h*.18,'#72878b',3);

  if(kind==='piano')return r(x,y,w,h,color,3)+r(x+6,y+h*.6,w-12,h*.3,'#ecede3',1)+Array.from({length:12},(_,i)=>line(x+8+i*(w-16)/12,y+h*.6,x+8+i*(w-16)/12,y+h*.9)).join('');

  if(kind==='treadmill')return r(x,y,w,h,color,5)+r(x+8,y+h*.25,w-16,h*.69,'#26363a',4)+r(x+4,y+6,w-8,h*.17,'#607b81',3);

  if(kind==='pet-bed')return `<ellipse rx="${w/2}" ry="${h/2}" fill="${color}" ${s}/><ellipse rx="${w*.37}" ry="${h*.34}" fill="#bdc7b5" ${s}/>`;

  if(kind==='sectional')return `<path d="M${x} ${y}h${w}v${h}h${-w*.36}v${-h*.52}h${-w*.64}Z" fill="${color}" ${s}/>`+line(x+12,y+20,w/2-12,y+20)+line(x+w*.33,y+22,x+w*.33,y+h*.46)+line(x+w*.64,y+22,x+w*.64,h/2-12);

  if(kind==='round-table'||kind==='plant'){let a=`<ellipse cx="0" cy="0" rx="${w/2}" ry="${h/2}" fill="${color}" ${s}/>`;if(kind==='plant'){for(let z=0;z<5;z++)a+=`<ellipse cx="0" cy="${-h*.16}" rx="${w*.14}" ry="${h*.24}" fill="#85a77e" stroke="#588060" stroke-width="1" transform="rotate(${z*72})"/>`;}return a;}

  if(kind==='dining')return r(x,y,w,h,color,14)+line(x+w*.12,y+5,x+w*.12,h/2-5)+line(w/2-w*.12,y+5,w/2-w*.12,h/2-5);

  if(kind==='chair'||kind==='office-chair')return r(x+4,y+6,w-8,h-10,color,9)+r(x+2,y+2,w-4,h*.26,color,7)+(kind==='office-chair'?line(x+2,0,x+2,h*.3)+line(w/2-2,0,w/2-2,h*.3):'');

  if(kind==='sink')return r(x,y,w,h,color,3)+r(x+w*.17,y+h*.21,w*.66,h*.6,'#ebf2ee',10)+circle(0,h*.06,3,'#728983')+line(0,y+4,0,y+h*.28);

  if(kind==='stove'){let a=r(x,y,w,h,color,3);for(const a1 of [-.24,.24])for(const a2 of [-.24,.24])a+=circle(w*a1,h*a2,Math.min(w,h)*.14,'#d2d8d1');return a;}

  if(kind==='toilet')return r(x,y,w,h*.25,'#f0f4ed',6)+`<ellipse cx="0" cy="${h*.1}" rx="${w*.42}" ry="${h*.36}" fill="#e4eeea" ${s}/><ellipse cx="0" cy="${h*.09}" rx="${w*.27}" ry="${h*.25}" fill="${color}" ${s}/>`;

  if(kind==='bath')return r(x,y,w,h,color,15)+r(x+8,y+8,w-16,h-16,'#e8f2ee',Math.min(w,h)*.25)+circle(0,y+20,3,'#8da29d');

  if(kind==='shower')return r(x,y,w,h,color,2)+line(x+7,y+7,w/2-7,h/2-7)+line(w/2-7,y+7,x+7,h/2-7)+circle(0,0,4,'#e0eee9');

  if(kind==='washer')return r(x,y,w,h,color,4)+circle(0,5,Math.min(w,h)*.3,'#e7efea')+line(x+3,y+11,w/2-3,y+11);

  if(kind==='sliding-door')return `<path d="M${x} 0h${w}" stroke="#101b20" stroke-width="20"/><rect x="${x}" y="${-h/2}" width="${w*.57}" height="${h*.42}" fill="#fffaf5" stroke="${color}" stroke-width="3"/><rect x="${x+w*.43}" y="${h*.08}" width="${w*.57}" height="${h*.42}" fill="#fffaf5" stroke="${color}" stroke-width="3"/><path d="M${x+10} 0h${w-20}" stroke="${color}" stroke-width="1"/>`;

  if(kind==='door')return `<g transform="translate(0 ${y}) scale(${flip?-1:1} ${(swing==='cw'?1:swing==='ccw'?-1:flip?-1:1)*(flip?-1:1)}) translate(0 ${-y})">`+`<path d="M${x} ${y}h${w}" stroke="#101b20" stroke-width="15"/><path d="M${x} ${y}v${h}" fill="none" stroke="${color}" stroke-width="4"/><path d="M${x} ${h/2}A${w} ${h} 0 0 0 ${w/2} ${y}" fill="none" stroke="${color}" stroke-width="2" stroke-dasharray="5 3"/></g>`;

  if(kind==='window')return r(x,y,w,h,'#e8f5f3',0)+line(x,0,w/2,0)+line(0,y,0,h/2);

  if(kind==='wall')return r(x,y,w,h,color,0);

  if(kind==='wardrobe'||kind==='shelf'||kind==='dresser')return r(x,y,w,h,color,2)+line(0,y,0,h/2)+line(-8,-4,-8,5)+line(8,-4,8,5);

  if(kind==='desk')return r(x,y,w,h,color,5)+r(-w*.18,y+h*.12,w*.36,h*.33,'#72878b',2)+line(-w*.15,y+h*.56,w*.15,y+h*.56);

  if(kind==='tv')return r(x,y,w,h,color,3)+r(-w*.41,y+h*.28,w*.82,h*.32,'#3e5153',2);

  if(kind==='fridge')return r(x,y,w,h,color,4)+line(x+5,y+h*.25,w/2-5,y+h*.25)+line(w/2-10,y+h*.4,w/2-10,y+h*.7);

  return r(x,y,w,h,color,kind==='coffee'?14:4);

}

function render(item){const inner=symbol(item.kind,item.w,item.h,item.color,item.flip,item.swing);return `<g transform="scale(${item.mirrorX?-1:1} ${item.mirrorY?-1:1})">${inner}</g>`;}

const api={symbol,render};if(typeof module!=='undefined')module.exports=api;else root.FurnitureSymbols=api;

})(typeof window!=='undefined'?window:globalThis);

