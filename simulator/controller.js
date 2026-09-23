(function(global){
class Simulation {
 constructor(){this.water=4;this.warning=10;this.danger=16;this.mode='automatic';this.net='ready';this.progress=0;this.events=[];this.record('Simulation ready');}
 record(message){this.events.unshift({time:new Date().toISOString(),message});this.events=this.events.slice(0,30);}
 get level(){return this.water>=this.danger?'DANGER':this.water>=this.warning?'WARNING':'NORMAL';}
 setWater(value){if(!Number.isFinite(value)||value<0||value>20)throw Error('Water must be between 0 and 20 cm.');let old=this.level;this.water=value;if(old!==this.level)this.record('Water status: '+this.level);this.automatic();}
 setThresholds(w,d){if(!Number.isFinite(w)||!Number.isFinite(d)||w<=0||w>=d||d>20)throw Error('Use 0 < warning < danger ≤ 20 cm.');this.warning=w;this.danger=d;this.record('Simulation thresholds updated');this.automatic();}
 setMode(mode){if(!['automatic','manual'].includes(mode))throw Error('Invalid mode');this.mode=mode;this.record('Mode: '+mode);this.automatic();}
 automatic(){if(this.mode==='automatic'&&this.level==='DANGER'&&this.net==='ready')this.deploy('Automatic threshold');}
 deploy(source='Manual command'){if(this.net!=='ready')return false;this.net='deploying';this.record(source+': deployment accepted');return true;}
 tick(dt){if(this.net!=='deploying')return;this.progress=Math.min(1,this.progress+Math.max(0,Math.min(dt,.1))/5);if(this.progress>=1){this.net='deployed';this.record('Deployment completed — inspection and repacking required');}}
 reset(){this.water=4;this.net='ready';this.progress=0;this.record('Demo reset: water lowered and manual repacking represented');}
 snapshot(){return {source:'simulation',waterCm:this.water,level:this.level,net:this.net,progress:this.progress,mode:this.mode,appConnected:false};}
}
global.Simulation=Simulation;if(typeof module!=='undefined')module.exports=Simulation;
})(typeof window!=='undefined'?window:globalThis);
