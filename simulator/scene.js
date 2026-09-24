(()=>{
'use strict';
const root=document.getElementById('feed-through-net-concept');
const $=selector=>root.querySelector(selector);
const status=$('[data-status]'),loading=$('[data-loading]');
try{
 if(!window.THREE||!window.PrototypeModel||!window.NetShape)throw Error('Model assets did not load. Refresh to try again.');
 const T=window.THREE,stage=$('[data-stage]');
 const renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.75));renderer.outputEncoding=T.sRGBEncoding;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
 stage.appendChild(renderer.domElement);
 const scene=new T.Scene();scene.background=new T.Color(0xe5e9ed);scene.fog=new T.Fog(0xe5e9ed,240,420);
 const camera=new T.PerspectiveCamera(38,1,.1,600);
 scene.add(new T.HemisphereLight(0xf7fbff,0xa49b88,.95));
 const key=new T.DirectionalLight(0xfff5e7,2.1);key.position.set(-45,95,55);key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-80,right:80,top:80,bottom:-80,near:1,far:200});key.shadow.bias=-.00025;key.shadow.normalBias=.12;key.shadow.radius=3;scene.add(key);
 const fill=new T.DirectionalLight(0xdceeff,.68);fill.position.set(60,45,-65);scene.add(fill);
 const rim=new T.DirectionalLight(0xffffff,.45);rim.position.set(-15,30,-65);scene.add(rim);
 const floor=new T.Mesh(new T.PlaneGeometry(1200,1200),new T.MeshStandardMaterial({color:0xe5e9ed,roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-3.45;floor.receiveShadow=true;scene.add(floor);
 const model=PrototypeModel.build(T,scene),sim=new Simulation();window.__sim=sim;
 const presets={
  overview:{target:[0,9,2],yaw:53,pitch:.43,radius:168,min:100,max:225,title:'Complete assembly',number:'01',heading:'A prototype made from familiar materials',text:'Cardboard housings, a clear storage box, blue mesh and kit electronics on a plywood base. Select a component above to take a closer look.'},
  column:{target:[0,24,-23],yaw:41,pitch:.15,radius:68,min:43,max:105,title:'Inside the storage column',number:'02',heading:'Follow the folded net to the outlet',text:'Two walls are removed for this cutaway. The blue mesh folds back and forth on a tray, then feeds upward and over the top chute. Deploy to watch it empty; reset represents a manual repack.'},
  sensor:{target:[3,29,19],yaw:52,pitch:-.18,radius:34,min:22,max:70,title:'Compact sensor bracket',number:'03',heading:'A short shelf, with a clear view of the water',text:'The ultrasonic sensor sits under a braced cardboard shelf beside the column. Its two round faces point downward, and its wires follow the housing to the control deck. Mounting clearance still needs a physical check.'},
  electronics:{target:[22,3,30],yaw:30,pitch:.88,radius:48,min:32,max:85,title:'The control deck',number:'04',heading:'The kit components, in one place',text:'An ESP32 on the breadboard sits beside the motor driver, character LCD and active buzzer. These are visual component models; their cables are not a verified wiring diagram.'}
 };
 let view='overview',orbit={...presets.overview,target:new T.Vector3(...presets.overview.target)},desired={...orbit,target:orbit.target.clone()},drag=null,last=performance.now(),lastProgress=-1,paused=false,lastWaterFrame=0,frame=0,labelsOn=true;
 const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 const labelHost=$('[data-model-labels]'),labelElements=[];
 for(const [key,entries] of Object.entries(model.anchors))for(const item of entries){const el=document.createElement('div');el.className='model-label';const pin=document.createElement('span');pin.className='label-pin';const text=document.createElement('span');text.className='label-text';text.textContent=item.text;el.append(pin,text);labelHost.appendChild(el);labelElements.push({key,point:new T.Vector3(...item.point),el});}
 function drawLabels(){const w=stage.clientWidth,h=stage.clientHeight,used=[];for(const entry of labelElements){if(!labelsOn||entry.key!==view){entry.el.hidden=true;continue;}const p=entry.point.clone().project(camera);let x=(p.x*.5+.5)*w,y=(-p.y*.5+.5)*h;const width=entry.el.offsetWidth||150;
  const overlaps=used.some(a=>Math.abs(a.y-y)<30&&x<a.x+a.w&&x+width>a.x);
  const visible=p.z>-1&&p.z<1&&x>12&&x+width<w-62&&y>85&&y<h-45&&!overlaps;
  entry.el.hidden=!visible;if(visible){entry.el.style.transform='translate('+x.toFixed(1)+'px,'+(y-12).toFixed(1)+'px)';used.push({x,y,w:width});}
 }}
 function cameraFrame(dt=1){const a=reducedMotion?1:1-Math.exp(-dt*10);orbit.target.lerp(desired.target,a);for(const k of ['radius','yaw','pitch'])orbit[k]+=(desired[k]-orbit[k])*a;
  const r=orbit.radius,angle=orbit.yaw*Math.PI/180;camera.position.set(orbit.target.x+Math.sin(angle)*Math.cos(orbit.pitch)*r,orbit.target.y+Math.sin(orbit.pitch)*r,orbit.target.z+Math.cos(angle)*Math.cos(orbit.pitch)*r);camera.lookAt(orbit.target);camera.updateMatrixWorld();drawLabels();
 }
 function updateZoom(){const p=presets[view];$('[data-zoom-in]').disabled=desired.radius<=p.min;$('[data-zoom-out]').disabled=desired.radius>=p.max;}
 function selectView(key){view=key;const p=presets[key];desired={...p,target:new T.Vector3(...p.target)};model.inspect(key);$('[data-view-title]').textContent=p.title;$('[data-view-number]').textContent=p.number;$('[data-detail-title]').textContent=p.heading;$('[data-detail-text]').textContent=p.text;for(const b of root.querySelectorAll('[data-view]')){b.classList.toggle('selected',b.dataset.view===key);b.setAttribute('aria-pressed',String(b.dataset.view===key));}updateZoom();if(reducedMotion)cameraFrame();}
 for(const b of root.querySelectorAll('[data-view]'))b.onclick=()=>selectView(b.dataset.view);
 function zoom(direction){const p=presets[view];desired.radius=Math.max(p.min,Math.min(p.max,desired.radius*(direction<0?.88:1.12)));updateZoom();}
 $('[data-zoom-in]').onclick=()=>zoom(-1);$('[data-zoom-out]').onclick=()=>zoom(1);$('[data-home]').onclick=()=>selectView(view);
 $('[data-labels]').onchange=e=>{labelsOn=e.target.checked;drawLabels();};
 renderer.domElement.onpointerdown=e=>{if(e.button!==0||drag)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY,yaw:desired.yaw,pitch:desired.pitch};renderer.domElement.setPointerCapture(e.pointerId);};
 renderer.domElement.onpointermove=e=>{if(!drag||e.pointerId!==drag.id)return;desired.yaw=drag.yaw-(e.clientX-drag.x)*.38;desired.pitch=Math.max(-.32,Math.min(1.37,drag.pitch+(e.clientY-drag.y)*.006));};
 renderer.domElement.onpointerup=renderer.domElement.onpointercancel=e=>{if(drag?.id===e.pointerId)drag=null;};renderer.domElement.onlostpointercapture=()=>{drag=null;};
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();paused=true;status.textContent='The 3D view was interrupted. Refresh to restore it.';$('[data-action="deploy"]').disabled=true;$('[data-action="retract"]').disabled=true;});
 function syncProgress(){const p=sim.progress,phase=sim.net==='ready'?'ready':sim.net==='deployed'?'deployed':p<.8?'feeding':'unfolding';document.getElementById('progress-value').textContent=Math.round(p*100)+'%';document.getElementById('progress-fill').style.width=p*100+'%';document.getElementById('net-value').textContent={ready:'Ready to deploy',feeding:'Feeding the mesh',unfolding:'Releasing final folds',deployed:'Fully deployed'}[phase];for(const e of root.querySelectorAll('[data-phase]'))e.classList.toggle('active',e.dataset.phase===phase);}
 function sync(){document.getElementById('water-value').textContent=sim.water.toFixed(1);const w=document.getElementById('water');w.value=sim.water;w.setAttribute('aria-valuetext',sim.water.toFixed(1)+' centimetres');w.style.background='linear-gradient(to right,#68c0ac 0% '+sim.warning*5+'%,#bfa06a '+sim.warning*5+'% '+sim.danger*5+'%,#b7706b '+sim.danger*5+'% 100%)';const lv=document.getElementById('level-value');lv.textContent=sim.level;lv.className='level '+sim.level.toLowerCase();document.getElementById('warning-label').textContent=sim.warning+' cm';document.getElementById('danger-label').textContent=sim.danger+' cm';document.getElementById('mode').value=sim.mode;document.getElementById('mode-help').textContent=sim.mode==='automatic'?'The net deploys when water reaches the danger threshold.':'Only the Deploy net button starts deployment.';
  $('[data-action="deploy"]').disabled=sim.net!=='ready';$('[data-action="retract"]').disabled=false;$('[data-deploy-text]').textContent={ready:'Deploy net',deploying:'Deploying…',deployed:'Net deployed'}[sim.net];status.textContent={ready:'Ready · local simulation',deploying:'Deployment in progress',deployed:'Deployed · manual repacking required'}[sim.net];
  model.setWater(sim.water,sim.level,sim.net);syncProgress();const list=document.getElementById('events');list.replaceChildren();for(const event of sim.events){const li=document.createElement('li'),time=document.createElement('time'),text=document.createElement('span');time.dateTime=event.time;time.textContent=new Date(event.time).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',second:'2-digit'});text.textContent=event.message;li.append(time,text);list.append(li);}
 }
 function act(fn){try{fn();document.getElementById('error').textContent='';sync();}catch(e){document.getElementById('error').textContent=e.message;}}
 document.getElementById('water').oninput=e=>act(()=>sim.setWater(+e.target.value));document.getElementById('mode').onchange=e=>act(()=>sim.setMode(e.target.value));document.getElementById('apply').onclick=()=>act(()=>sim.setThresholds(+document.getElementById('warning').value,+document.getElementById('danger').value));
 $('[data-action="deploy"]').onclick=()=>act(()=>sim.deploy());$('[data-action="retract"]').onclick=()=>act(()=>{sim.reset();model.setProgress(0);lastProgress=0;});
 const observer=new ResizeObserver(()=>{const w=stage.clientWidth,h=stage.clientHeight;if(w<1||h<1)return;renderer.setSize(w,h);camera.aspect=w/h;camera.fov=w<h?49:38;camera.updateProjectionMatrix();cameraFrame();});observer.observe(stage);
 function loop(now){if(!root.isConnected){observer.disconnect();renderer.dispose();return;}frame=requestAnimationFrame(loop);if(paused||document.hidden){last=now;return;}const dt=Math.min((now-last)/1000,.1);last=now;const before=sim.net;sim.tick(dt);if(sim.progress!==lastProgress){model.setProgress(sim.progress);lastProgress=sim.progress;syncProgress();}if(before!==sim.net)sync();if(!reducedMotion&&now-lastWaterFrame>80){model.animateWater(now*.001);lastWaterFrame=now;}cameraFrame(dt);renderer.render(scene,camera);}
 if(document.modelContext?.registerTool){try{Promise.resolve(document.modelContext.registerTool({name:'read_simulation_state',description:'Read the local classroom simulation; no hardware or mobile app is connected.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:()=>sim.snapshot()})).catch(()=>{});}catch(e){}}
 loading.hidden=true;selectView('overview');cameraFrame();sync();requestAnimationFrame(loop);
}catch(e){loading.innerHTML='';const p=document.createElement('p');p.textContent='The 3D view could not start. Refresh, or use a browser with WebGL enabled.';loading.appendChild(p);status.textContent='3D viewer unavailable';document.getElementById('error').textContent=e.message;console.error(e);}
})();
