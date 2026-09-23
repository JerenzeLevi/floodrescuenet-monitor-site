/* Geometric illustration only: no cloth, tension, current or load simulation. */
(function(global){
'use strict';
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const smooth=t=>{t=clamp(t);return t*t*(3-2*t);};
function sample(progress){
 const p=clamp(progress),feed=clamp(p/.8),advance=28*feed,settle=smooth((p-.8)/.2);
 const rows=18,cols=36,net=[],hem=[],stored=[],weights=[],ties=[];
 function exposed(q,v){
  const unfurl=clamp((q+5*settle)/5),drop=2+29*unfurl;
  const sag=.38*Math.sin(Math.PI*q/28)*(1-v);
  return [.23*Math.sin(q*.48)*Math.sin(Math.PI*v),38-drop*v-sag,-14+q];
 }
 function line(arr,a,b){if(a.some((n,i)=>Math.abs(n-b[i])>1e-6))arr.push(a,b);}
 if(advance>0){
  // Always include the exact outlet and leading edge, including partial cells.
  const qs=[0];for(let i=1;i<cols;i++)if(i*28/cols<advance)qs.push(i*28/cols);qs.push(advance);
  for(let i=0;i<qs.length;i++)for(let j=0;j<=rows;j++){
   if(j<rows)line(net,exposed(qs[i],j/rows),exposed(qs[i],(j+1)/rows));
   if(i<qs.length-1)line(net,exposed(qs[i],j/rows),exposed(qs[i+1],j/rows));
  }
  for(let i=0;i<qs.length-1;i++)for(const v of [0,1])line(hem,exposed(qs[i],v),exposed(qs[i+1],v));
  line(hem,exposed(0,0),exposed(0,1));line(hem,exposed(advance,0),exposed(advance,1));
  for(let i=0;i<9;i++){const m=i*3.5;if(m<=advance){weights.push(exposed(advance-m,1));ties.push(exposed(advance-m,0));}}
 }
 if(feed<1){
  // Connected gathered mesh follows an open route above the wall and chute.
  const remaining=1-feed,fade=1-smooth((feed-.92)/.08),points=[];
  const count=10*remaining,top=5+count*1.55;
  for(let i=0;i<=Math.floor(count);i++)points.push({y:5+i*1.55,z:-25+(i%2?2:-2),w:2.35*fade,v:0});
  if(count%1>1e-6){const i=Math.floor(count),t=count-i;points.push({y:top,z:-25+(i%2?2-4*t:-2+4*t),w:2.35*fade,v:0});}
  points.push({y:top+2,z:-25,w:1.1*fade,v:0},{y:36,z:-25,w:.85*fade,v:0},
    {y:41,z:-25,w:.85*fade,v:0},{y:41,z:-16.2,w:.65*fade,v:0},{y:37,z:-14,w:0,v:1});
  const grid=[];
  for(let i=0;i<points.length-1;i++)for(let j=0;j<4;j++){
   const t=j/4,a=points[i],b=points[i+1],k={};for(const prop of ['y','z','w','v'])k[prop]=a[prop]+(b[prop]-a[prop])*t;grid.push(k);
  }
  grid.push(points[points.length-1]);
  const at=(i,j)=>{const k=grid[i],u=1-2*j/rows;return [k.w*u,k.y+k.v*u,k.z];};
  for(let i=0;i<grid.length;i++)for(let j=0;j<=rows;j++){
   if(j<rows)line(stored,at(i,j),at(i,j+1));
   if(i<grid.length-1)line(stored,at(i,j),at(i+1,j));
  }
 }
 return {feed,advance,net,hem,stored,weights,ties,leading:exposed(advance,0)};
}
global.NetShape={sample};if(typeof module!=='undefined')module.exports=global.NetShape;
})(typeof window!=='undefined'?window:globalThis);
