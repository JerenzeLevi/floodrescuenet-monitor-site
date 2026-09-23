(function(global){
'use strict';
function build(T,scene){
 const assembly=new T.Group();scene.add(assembly);
 let seed=731;const random=()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646;};
 function canvasTexture(kind){
  const c=document.createElement('canvas');c.width=c.height=512;const x=c.getContext('2d');
  x.fillStyle=kind==='wood'?'#c8a475':'#b8996d';x.fillRect(0,0,512,512);
  if(kind==='wood'){
   for(let i=0;i<230;i++){const y=i*2.5;x.beginPath();x.moveTo(0,y);x.bezierCurveTo(150,y+Math.sin(i*.18)*8,330,y-Math.cos(i*.25)*10,512,y+3);x.strokeStyle=i%5?'rgba(117,77,35,.12)':'rgba(250,220,170,.35)';x.lineWidth=.6+random()*1.3;x.stroke();}
  }
  for(let i=0;i<19000;i++){const light=i%3===0;x.fillStyle=light?'rgba(255,247,227,.09)':'rgba(84,56,28,.07)';x.fillRect(random()*512,random()*512,1+random()*2,.6+random()*2);}
  const tex=new T.CanvasTexture(c);tex.encoding=T.sRGBEncoding;tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.repeat.set(kind==='wood'?2:1,kind==='wood'?2:3);return tex;
 }
 const cardTex=canvasTexture('card'),woodTex=canvasTexture('wood');
 const material=(color,options={})=>new T.MeshStandardMaterial({color,roughness:.7,...options});
 const m={card:material(0xffffff,{map:cardTex,bumpMap:cardTex,bumpScale:.035,roughness:.95}),edge:material(0x917144),wood:material(0xffffff,{map:woodTex,bumpMap:woodTex,bumpScale:.025,roughness:.8}),tape:material(0xbaa580,{roughness:.39,transparent:true,opacity:.83}),steel:material(0xbbc3c7,{metalness:.62,roughness:.27}),gold:material(0xbaa05c,{metalness:.65,roughness:.3}),black:material(0x202c30),dark:material(0x101b23),blue:material(0x267ecc),pcb:material(0x1d6a72),red:material(0xb4473a),white:material(0xe9e9dc),cord:material(0xe4d4b2,{roughness:.95}),net:material(0x236dc2,{roughness:.85}),netPale:material(0x2675c3,{roughness:.8}),weight:material(0x6f777b,{metalness:.45,roughness:.5}),plastic:material(0xf0f7fa,{transparent:true,opacity:.115,depthWrite:false,side:T.DoubleSide,roughness:.22}),rim:material(0xe7f0f3,{transparent:true,opacity:.58,depthWrite:false,roughness:.32})};
 function add(g,mat,pos=[0,0,0],parent=assembly){const o=new T.Mesh(g,mat);o.position.set(...pos);o.castShadow=!mat.transparent;o.receiveShadow=!mat.transparent;parent.add(o);return o;}
 const box=(pos,size,mat,parent=assembly)=>add(new T.BoxGeometry(...size),mat,pos,parent);
 function bevel(pos,size,mat,r=.18,parent=assembly){
  const [w,h,d]=size,rr=Math.min(r,w/2,h/2),s=new T.Shape();
  s.moveTo(-w/2+rr,-h/2);s.lineTo(w/2-rr,-h/2);s.quadraticCurveTo(w/2,-h/2,w/2,-h/2+rr);s.lineTo(w/2,h/2-rr);s.quadraticCurveTo(w/2,h/2,w/2-rr,h/2);s.lineTo(-w/2+rr,h/2);s.quadraticCurveTo(-w/2,h/2,-w/2,h/2-rr);s.lineTo(-w/2,-h/2+rr);s.quadraticCurveTo(-w/2,-h/2,-w/2+rr,-h/2);
  const g=new T.ExtrudeGeometry(s,{steps:1,depth:d-rr*.3,bevelEnabled:true,bevelSegments:2,bevelSize:rr*.15,bevelThickness:rr*.15,curveSegments:4});g.translate(0,0,-d/2+rr*.15);return add(g,mat,pos,parent);
 }
 const v=a=>new T.Vector3(...a);
 function rod(a,b,r,mat,parent=assembly,sides=8){const av=v(a),bv=v(b),o=add(new T.CylinderGeometry(r,r,av.distanceTo(bv),sides),mat,av.clone().add(bv).multiplyScalar(.5).toArray(),parent);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),bv.sub(av).normalize());return o;}
 function curve(points,r,mat,parent=assembly){return add(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(v)),32,r,6,false),mat,[0,0,0],parent);}
 function label(text,pos,w,h,{color='#45545a',background='#f2ebdb',parent=assembly,flat=false}={}){
  const c=document.createElement('canvas');c.width=512;c.height=128;const x=c.getContext('2d');x.fillStyle=background;x.fillRect(0,0,512,128);x.fillStyle=color;x.font='500 52px Arial';x.textAlign='center';x.textBaseline='middle';x.fillText(text,256,68,482);
  const tx=new T.CanvasTexture(c);tx.encoding=T.sRGBEncoding;const o=add(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:tx,side:T.DoubleSide}),pos,parent);if(flat)o.rotation.x=-Math.PI/2;return o;
 }
 function screw(x,y,z,parent=assembly){const o=add(new T.CylinderGeometry(.13,.13,.07,10),m.steel,[x,y,z],parent);box([x,y+.038,z],[.17,.012,.025],m.black,parent);return o;}
 function gusset(a,b,c,thick,mat){const shape=new T.Shape();shape.moveTo(a[1],a[2]);shape.lineTo(b[1],b[2]);shape.lineTo(c[1],c[2]);shape.closePath();const g=new T.ExtrudeGeometry(shape,{depth:thick,bevelEnabled:false});const o=add(g,mat);o.rotation.y=Math.PI/2;o.position.x=a[0]-thick/2;return o;}
 // Plywood backing, layered edge and light wear. Dimensions are centimetres.
 bevel([0,-1.8,4],[91,2.2,71],m.wood,.55);
 for(let y of [-2.55,-2.12,-1.69,-1.26]){box([0,y,39.48],[89.8,.085,.045],m.edge);box([45.48,y,4],[.045,.085,69.8],m.edge);}
 for(const x of [-42,42])for(const z of [-28,35]){add(new T.CylinderGeometry(1,1,.6,18),m.black,[x,-3.1,z]);screw(x,-.65,z);}
 label('FLOOD NET / TABLETOP',[0,-.67,36.2],19,2.8,{flat:true});
 // Transparent tapered storage box, detailed rim, reinforcing ribs and handles.
 const lo=[[-32,.4,-17],[32,.4,-17],[32,.4,17],[-32,.4,17]],hi=[[-35,22,-20],[35,22,-20],[35,22,20],[-35,22,20]];
 bevel([0,.3,0],[64,.65,34],m.plastic,.45);
 for(let i=0;i<4;i++){const j=(i+1)%4,g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute([lo[i],lo[j],hi[j],lo[i],hi[j],hi[i]].flat(),3));g.computeVertexNormals();add(g,m.plastic).renderOrder=3;rod(hi[i],hi[j],.39,m.rim,assembly,12);rod(lo[i],lo[j],.24,m.rim);rod(lo[i],hi[i],.19,m.rim);}
 for(const zSign of [-1,1]){
  rod([-34.8,20.8,zSign*19.82],[34.8,20.8,zSign*19.82],.12,m.rim);
  for(const x of [-26,-13,13,26])rod([x,.7,zSign*17.08],[x,20.5,zSign*19.82],.08,m.rim);
 }
 for(const sign of [-1,1]){
  const handle=new T.Group();assembly.add(handle);handle.position.set(sign*35.8,20,0);
  box([0,0,-4.4],[1.3,3,1],m.rim,handle);box([0,0,4.4],[1.3,3,1],m.rim,handle);box([0,-1.2,0],[1.3,.7,9.5],m.rim,handle);
 }
 // Storage housing: four removable cardboard walls and exposed corrugation.
 const storage=new T.Group();assembly.add(storage);const panels=[];
 const wallData=[[-3.55,21,-25,.55,38,7.5],[3.55,21,-25,.55,38,7.5],[0,21,-28.55,7.65,38,.55],[0,21,-21.45,7.65,38,.55]];
 wallData.forEach((d,i)=>{const group=new T.Group();storage.add(group);panels.push(group);box(d.slice(0,3),d.slice(3),m.card,group);
  for(const y of [9,30]){const dd=d.slice(3);dd[1]=1.45;dd[0]+=.03;dd[2]+=.03;box([d[0],y,d[2]],dd,m.tape,group);}
  if(i<2)for(let z=-28.2;z<-21.7;z+=.28)box([d[0],40.02,z],[.23,.05,.10],m.edge,group);
  else for(let x=-3.4;x<3.5;x+=.28)box([x,40.02,d[2]],[.1,.05,.23],m.edge,group);
 });
 box([0,1,-25],[12,2,11],m.wood);box([0,4.65,-25],[6.6,.45,6.3],m.card);
 for(const x of [-3.2,3.2])for(const z of [-28.25,-21.75])rod([x,2,z],[x,39.8,z],.10,m.edge);
 for(const x of [-4.5,4.5]){rod([x*1.25,2,-25],[x*.7,13,-25],.26,m.wood);screw(x,2.08,-28.7);}
 // A top shelf ends before the vertical mesh path; no fabric through the tub.
 box([0,39.05,-20.9],[4.9,.4,8.6],m.card);box([-2.4,39.9,-20.9],[.22,1.4,8.6],m.card);box([2.4,39.9,-20.9],[.22,1.4,8.6],m.card);
 rod([-2.2,38.8,-16.5],[2.2,38.8,-16.5],.20,m.wood);
 for(const x of [-1.6,1.6])rod([x,39.5,-18],[x,39.5,-14],.13,m.wood);rod([-1.6,39.5,-14],[1.6,39.5,-14],.13,m.wood);rod([-2,37,-24],[-2,39,-17],.16,m.wood);rod([2,37,-24],[2,39,-17],.16,m.wood);
 label('01 / NET STORAGE',[0,26,-21.15],5.5,1.2,{parent:panels[3]});
 // Opposing cardboard column and external string winch. Drive is illustrative.
 bevel([0,21,25],[6.3,38,6.3],m.card,.15);box([0,1,25],[11,2,10],m.wood);
 for(const y of [9,30])box([0,y,25],[6.37,1.5,6.37],m.tape);
 for(const x of [-5,5])rod([x,2,25],[x*.5,12,25],.30,m.wood);
 label('02 / LINE WINCH',[0,32,28.19],5.4,1.2);
 box([0,40.25,25],[8.5,.5,8],m.wood);
 const drum=new T.Group();drum.position.set(0,42.5,25);assembly.add(drum);
 rod([-1.65,0,0],[1.65,0,0],1.0,m.wood,drum,20);
 for(const x of [-1.8,1.8])rod([x-.10,0,0],[x+.10,0,0],1.72,m.card,drum,28);
 for(let x=-1.4;x<=1.4;x+=.22){const ring=add(new T.TorusGeometry(1.03,.085,5,24),m.cord,[x,0,0],drum);ring.rotation.y=Math.PI/2;}
 rod([-2.6,42.5,25],[2.6,42.5,25],.14,m.steel);
 box([-2.5,41.1,25],[.5,2.6,2.1],m.wood);box([2.5,41.1,25],[.5,2.6,2.1],m.wood);
 rod([3,42.5,25],[6.1,42.5,25],1.0,m.steel,assembly,24);rod([6.1,42.5,25],[6.45,42.5,25],.96,m.white,assembly,20);
 rod([0,38.5,25],[0,38.5,14],.22,m.wood);rod([0,34.5,25],[0,38.5,16],.18,m.wood);
 const guide=new T.Group();assembly.add(guide);for(const z of [-14,14]){rod([0,z<0?39.5:38.5,z],[0,39.1,z],.09,m.steel);const eye=add(new T.TorusGeometry(.23,.065,6,12),m.steel,[0,39.1,z]);eye.rotation.y=0;}
 rod([0,39.1,-14],[0,39.1,14],.06,m.cord);
 // Compact sensor shelf with a triangular brace, attached to the receiver.
 // Its sensing footprint is illustrative, not a verified ultrasonic beam.
 const sensorGroup=new T.Group();assembly.add(sensorGroup);
 const shelf=box([3.1,30.8,20.2],[7.2,.45,9.8],m.card,sensorGroup);
 box([3.8,29.9,15.9],[4.5,.22,2.15],m.pcb,sensorGroup);
 box([1.2,28.9,24],[.3,3.6,2.0],m.card,sensorGroup);
 // Solid triangular brace in the y/z plane.
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute([1.2,30.55,24.7,1.2,26.3,24.7,1.2,30.55,16.5],3));g.computeVertexNormals();const brace=add(g,new T.MeshStandardMaterial({map:cardTex,roughness:1,side:T.DoubleSide}),[0,0,0],sensorGroup);
 for(const x of [2.55,5.05]){
  add(new T.CylinderGeometry(.78,.78,.95,24),m.steel,[x,29.2,15.9],sensorGroup);
  add(new T.CylinderGeometry(.63,.63,.015,24),m.black,[x,28.715,15.9],sensorGroup);
  for(let i=-2;i<=2;i++)rod([x-.5,28.69,15.9+i*.19],[x+.5,28.69,15.9+i*.19],.018,m.steel,sensorGroup,4);
 }
 for(const x of [2.0,5.8])screw(x,31.08,18.1,sensorGroup);
 for(let i=0;i<4;i++)curve([[2.2+i*.3,30,16.9],[2.2+i*.3,31.5,17.6],[2.2+i*.3,31.5,23.3],[3.6,30,25+i*.25],[3.5,5.5,25+i*.25],[12+i*.35,3.2,29]],.055,material([0x263139,0xc7473d,0xdac466,0x629076][i]));
 for(const y of [8,18,27])box([3.59,y,25.4],[.17,.5,2.0],m.tape);
 // Electronics deck: recognisable shapes and visual wiring, not a circuit guide.
 box([23,1.3,30],[29,1.6,15],m.wood);
 const breadboard=bevel([17,2.4,29],[12,.65,6.2],m.white,.32);
 box([17,2.74,29],[11.1,.04,.35],material(0xaaa99d));
 const holeMat=material(0x737b73),holeG=new T.CylinderGeometry(.075,.075,.035,6);
 const holes=new T.InstancedMesh(holeG,holeMat,200);assembly.add(holes);let holeCount=0;const dummy=new T.Object3D();
 for(let col=0;col<25;col++)for(const z of [-2.2,-1.55,1.55,2.2]){dummy.position.set(11.4+col*.465,2.758,29+z);dummy.updateMatrix();holes.setMatrixAt(holeCount++,dummy.matrix);}holes.count=holeCount;
 rod([11.35,2.77,26.25],[22.6,2.77,26.25],.025,m.red);rod([11.35,2.77,31.72],[22.6,2.77,31.72],.025,m.blue);
 // ESP32 board, module, antenna, USB and both pin rows.
 bevel([17,3.2,29],[5.3,.25,2.75],m.dark,.17);
 bevel([17.5,3.49,29],[2.5,.34,2.14],m.steel,.10);
 label('ESP32',[17.5,3.668,29],1.95,.65,{flat:true,color:'#555f65',background:'#b8c3c6'});
 box([14.73,3.52,29],[.63,.52,1.08],m.steel);box([14.4,3.52,29],[.015,.25,.7],m.dark);
 for(let i=0;i<12;i++)for(const z of [27.72,30.28]){box([14.65+i*.4,2.95,z],[.12,.55,.12],m.gold);box([14.65+i*.4,3.41,z],[.20,.10,.22],m.black);}
 for(let i=0;i<5;i++)rod([18.9+i*.13,3.37,28],[18.9+i*.13,3.37,30],.025,m.gold);
 const led=material(0xd33722,{emissive:0xff4020,emissiveIntensity:.4});add(new T.SphereGeometry(.08,8,6),led,[15.35,3.46,28.45]);
 // L298N-style board and heat sink.
 bevel([28,2.4,27.7],[5.5,.25,5],m.red,.12);
 box([28,3.3,27.5],[3.1,1.55,2.8],m.black);
 for(let i=0;i<7;i++)box([26.6+i*.46,4.25,27.5],[.15,2.1,2.8],m.black);
 for(const x of [26.15,29.8]){box([x,3,29.75],[1.7,1,1.1],m.blue);for(const dx of [-.4,.4])screw(x+dx,3.53,29.75);}
 for(const x of [26.2,29.8]){add(new T.CylinderGeometry(.35,.35,1.1,12),m.black,[x,3.05,25.7]);add(new T.CylinderGeometry(.35,.35,.055,12),m.steel,[x,3.625,25.7]);}
 // Actual photographed display is a character LCD with I2C backpack.
 const lcd=new T.Group();lcd.position.set(21,3.4,35);lcd.rotation.x=.38;assembly.add(lcd);
 bevel([0,0,0],[8,.23,3.6],m.pcb,.2,lcd);box([0,.26,0],[6.65,.4,2.5],m.black,lcd);
 box([0,.49,0],[5.9,.025,1.8],material(0x173944,{emissive:0x143746,emissiveIntensity:.35}),lcd);
 const screenCanvas=document.createElement('canvas');screenCanvas.width=512;screenCanvas.height=160;const screenContext=screenCanvas.getContext('2d');const screenTexture=new T.CanvasTexture(screenCanvas);screenTexture.encoding=T.sRGBEncoding;
 const screen=add(new T.PlaneGeometry(5.8,1.7),new T.MeshBasicMaterial({map:screenTexture}),[0,.515,0],lcd);screen.rotation.x=-Math.PI/2;
 for(const x of [-3.5,3.5])for(const z of [-1.35,1.35])screw(x,.18,z,lcd);
 add(new T.CylinderGeometry(.62,.62,.9,20),m.black,[29.6,2.9,34]);add(new T.CylinderGeometry(.19,.19,.018,12),m.dark,[29.6,3.36,34]);
 for(let i=0;i<4;i++)curve([[18+i*.35,3.4,30.3],[19+i*.3,5.4,32],[20+i*.3,3.8,34.2]],.055,material([0xdbad3f,0x4d8199,0xc45340,0x2e3334][i]));
 for(let i=0;i<3;i++)curve([[19+i*.4,3.4,27.7],[22+i*.6,5.2,25],[26+i*.4,3,29.3]],.06,material([0x535864,0xc45340,0xd3b86b][i]));
 curve([[6.35,42.5,25],[7.3,40,27],[4,36,28],[4,6,28],[27.1,3.5,29.6]],.08,m.red);
 curve([[6.35,42.3,25.5],[7.5,39.8,27.3],[4.4,36,28.3],[4.4,5.7,28.3],[28.5,3.5,29.6]],.08,m.black);
 // USB is a visual cable only; no physical or remote device is controlled.
 curve([[14.4,3.5,29],[10.2,3.6,31],[7,1.5,33],[8,-.45,38],[16,-.5,38]],.19,m.black);
 label('CONTROL DECK',[30,2.13,35.8],6.2,1,{flat:true});
 // Instancing gives the mesh round strands without thousands of draw calls.
 function strands(capacity,r,mat){const o=new T.InstancedMesh(new T.CylinderGeometry(1,1,1,5),mat,capacity);o.instanceMatrix.setUsage(T.DynamicDrawUsage);o.frustumCulled=false;o.castShadow=false;assembly.add(o);return{o,r,capacity};}
 const deployed=strands(1600,.046,m.net),packed=strands(2600,.036,m.netPale),hem=strands(180,.09,m.net),pull=strands(4,.066,m.cord);
 const transform=new T.Object3D(),axis=new T.Vector3(0,1,0);
 function setStrands(layer,points){const n=points.length/2;if(n>layer.capacity)throw Error('Mesh capacity exceeded');layer.o.count=n;for(let i=0;i<n;i++){const a=v(points[i*2]),b=v(points[i*2+1]),diff=b.clone().sub(a),length=diff.length();transform.position.copy(a.add(b).multiplyScalar(.5));transform.quaternion.setFromUnitVectors(axis,diff.normalize());transform.scale.set(layer.r,length,layer.r);transform.updateMatrix();layer.o.setMatrixAt(i,transform.matrix);}layer.o.instanceMatrix.needsUpdate=true;}
 const weights=[],ties=[];for(let i=0;i<9;i++){weights.push(add(new T.SphereGeometry(.23,10,8),m.weight));const ring=add(new T.TorusGeometry(.18,.06,6,12),m.white);ring.rotation.y=0;ties.push(ring);}
 let latestState;
 function setProgress(p){const s=global.NetShape.sample(p);latestState=s;setStrands(deployed,s.net);setStrands(packed,s.stored);const edges=s.hem.slice();for(const p of s.ties)edges.push(p,[p[0],38.9,p[2]]);setStrands(hem,edges);setStrands(pull,[s.leading,[0,39.1,14],[0,39.1,14],[0,42.5,24]]);drum.rotation.x=-s.feed*Math.PI*7;weights.forEach((o,i)=>{o.visible=i<s.weights.length;if(o.visible)o.position.set(...s.weights[i]);});ties.forEach((o,i)=>{o.visible=i<s.ties.length;if(o.visible)o.position.set(s.ties[i][0],39.1,s.ties[i][2]);});}
 // Water conforms to the taper instead of using a box that penetrates its walls.
 const waterMaterial=new T.MeshStandardMaterial({color:0x51b1c2,transparent:true,opacity:.32,depthWrite:false,roughness:.2,metalness:.05,side:T.DoubleSide});
 const waterSide=add(new T.BufferGeometry(),waterMaterial);waterSide.renderOrder=1;
 const surfaceGeometry=new T.PlaneGeometry(1,1,38,22);surfaceGeometry.rotateX(-Math.PI/2);
 const surface=add(surfaceGeometry,new T.MeshStandardMaterial({color:0x78bdc9,transparent:true,opacity:.42,depthWrite:false,roughness:.22,metalness:.12,side:T.DoubleSide}));surface.renderOrder=2;
 const baseSurface=surfaceGeometry.attributes.position.array.slice();let waterH=4;
 const waveBase=[];for(let k=0;k<7;k++){const line=new T.Line(new T.BufferGeometry(),new T.LineBasicMaterial({color:0xe3ffff,transparent:true,opacity:.25,depthWrite:false}));line.renderOrder=2;assembly.add(line);waveBase.push(line);}
 function setWater(h,level,net){waterH=h;surface.visible=waterSide.visible=h>.05;waveBase.forEach(o=>o.visible=h>.05);const z=17+3*h/22-.2,x=32+3*h/22-.2,bot=0.65,top=h+.65;
  const low=[[-31.8,bot,-16.8],[31.8,bot,-16.8],[31.8,bot,16.8],[-31.8,bot,16.8]],high=[[-x,top,-z],[x,top,-z],[x,top,z],[-x,top,z]],arr=[];for(let i=0;i<4;i++){const j=(i+1)%4;arr.push(...low[i],...low[j],...high[j],...low[i],...high[j],...high[i]);}waterSide.geometry.setAttribute('position',new T.Float32BufferAttribute(arr,3));waterSide.geometry.computeVertexNormals();waterSide.geometry.computeBoundingSphere();
  screenContext.fillStyle='#122f3b';screenContext.fillRect(0,0,512,160);screenContext.fillStyle='#a7e4db';screenContext.font='30px monospace';screenContext.fillText('WATER '+h.toFixed(1)+' CM',22,56);screenContext.fillText(net==='ready'?level:net.toUpperCase(),22,117);screenTexture.needsUpdate=true;
 }
 function animateWater(time){if(waterH<=.05)return;const x=32+3*waterH/22-.2,z=17+3*waterH/22-.2,p=surfaceGeometry.attributes.position;
  for(let i=0;i<p.count;i++){const bx=baseSurface[i*3],bz=baseSurface[i*3+2],fade=(1-4*bx*bx)*(1-4*bz*bz);p.setXYZ(i,bx*x*2,waterH+.65+Math.sin(bx*25+time*.65)*Math.cos(bz*20+time*.4)*.085*fade,bz*z*2);}p.needsUpdate=true;surfaceGeometry.computeVertexNormals();surfaceGeometry.computeBoundingSphere();
  for(let k=0;k<waveBase.length;k++){const pts=[];for(let i=0;i<=25;i++){const xx=-x+2+((2*x-4)*i/25),zz=(-.75+k*.24)*z+Math.sin(i*.5+time*.4+k)*.22;pts.push(xx,waterH+.76,zz);}waveBase[k].geometry.setAttribute('position',new T.Float32BufferAttribute(pts,3));waveBase[k].geometry.computeBoundingSphere();}
 }
 function inspect(key){panels.forEach((o,i)=>o.visible=key!=='column'||i===0||i===2);}
 setProgress(0);setWater(4,'NORMAL','ready');animateWater(0);
 return {assembly,setProgress,setWater,animateWater,inspect,materials:m,panels,anchors:{overview:[{text:'Net storage',point:[0,40,-25]},{text:'Line winch',point:[0,44,25]},{text:'Control deck',point:[24,5,31]}],column:[{text:'Folded mesh',point:[0,17,-25]},{text:'Top outlet',point:[0,41,-16]}],sensor:[{text:'Downward-facing sensor',point:[4,28.5,15.9]},{text:'Cardboard bracket',point:[4,31,21]}],electronics:[{text:'ESP32',point:[17,3.7,29]},{text:'Motor driver',point:[28,5.3,27.5]},{text:'LCD + buzzer',point:[24,4,35]}]},getState:()=>latestState};
}
global.PrototypeModel={build};if(typeof module!=='undefined')module.exports=global.PrototypeModel;
})(typeof window!=='undefined'?window:globalThis);
