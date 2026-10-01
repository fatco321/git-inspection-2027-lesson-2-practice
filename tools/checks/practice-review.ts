import { PracticeGame } from '../../src/game/PracticeGame';
import { STATIONS } from '../../src/scenes/courtyard/practiceLayout';
import '../../src/styles/main.css';
const canvas=document.querySelector<HTMLCanvasElement>('#game')!;
const game=new PracticeGame(canvas);
const probe=game as unknown as { hero:{position:{x:number;z:number}}, flow:{ ui:{close():void;show(title:string,text:string,choices:unknown[]):void}, started:boolean }, walk:{stride:number}, camera:{setTarget(v:unknown):void;alpha:number} };
await game.ready;
const nav=document.createElement('nav');nav.style.cssText='position:fixed;z-index:30;right:0;top:0;display:flex;flex-direction:column;font:10px sans-serif';
for(const s of STATIONS){const b=document.createElement('button');b.textContent='Тест: '+s.id;b.onclick=()=>{probe.flow.ui.close();probe.hero.position.x=s.x;probe.hero.position.z=s.z;canvas.focus();};nav.append(b);}
const audit=document.createElement('button');audit.textContent='Тест: управление';
audit.onclick=async()=>{
  probe.flow.ui.close();probe.hero.position.x=-1.2;probe.hero.position.z=4;canvas.focus();
  const start={x:probe.hero.position.x,z:probe.hero.position.z};
  const alpha=probe.camera.alpha;
  window.dispatchEvent(new KeyboardEvent('keydown',{code:'ArrowUp',key:'ArrowUp'}));
  await new Promise(r=>setTimeout(r,600));
  window.dispatchEvent(new KeyboardEvent('keyup',{code:'ArrowUp',key:'ArrowUp'}));
  const moved=Math.hypot(probe.hero.position.x-start.x,probe.hero.position.z-start.z);
  probe.flow.ui.show('Проверка блокировки','Тест',[]);
  const locked={x:probe.hero.position.x,z:probe.hero.position.z};
  window.dispatchEvent(new KeyboardEvent('keydown',{code:'ArrowUp',key:'ArrowUp'}));
  await new Promise(r=>setTimeout(r,300));
  window.dispatchEvent(new KeyboardEvent('keyup',{code:'ArrowUp',key:'ArrowUp'}));
  const drift=Math.hypot(probe.hero.position.x-locked.x,probe.hero.position.z-locked.z);
  probe.flow.ui.show('Проверка управления',moved>.5&&drift<.001&&probe.walk.stride>=1.2&&Math.abs(alpha-probe.camera.alpha)<.001 ? `PASS: движение ${moved.toFixed(2)} м; полный цикл шага ${(probe.walk.stride/1.45).toFixed(2)} с; камера не вращается; диалог блокирует движение` : `FAIL ${moved} ${drift}`,[]);
};nav.append(audit);
const photoTest=document.createElement('button');photoTest.textContent='Тест: фото шкафа';
photoTest.onclick=async()=>{
  await roomProbe.changeLocation("protection");
  const runtime=game as unknown as {flow:{state:{inspected:boolean;jobs:{status:string;received:boolean}[]};ui:{close():void}},startPhoto(id:number):void};
  runtime.flow.ui.close();runtime.flow.state.inspected=true;runtime.flow.state.jobs[1].status='ready';runtime.flow.state.jobs[1].received=true;runtime.startPhoto(1);
};nav.append(photoTest);document.body.append(nav);
if(import.meta.hot)import.meta.hot.dispose(()=>{nav.remove();game.dispose();});
const roomProbe=game as unknown as {indoor:boolean;transitioning:boolean;changeLocation(inside:"courtyard"|"administration"|"protection"):Promise<void>;flow:{state:{day:number;inspected:boolean;budget:boolean};ui:{close():void;show(title:string,text:string,choices:unknown[]):void}}};
for(const s of [{id:'кабинет — сотрудник',x:0,z:.05},{id:'кабинет — выход',x:2.6,z:2.25}]){
 const b=document.createElement('button');b.textContent='Тест: '+s.id;b.onclick=()=>{if(!roomProbe.indoor)return;probe.flow.ui.close();probe.hero.position.x=s.x;probe.hero.position.z=s.z;canvas.focus();};nav.append(b);
}
const roundTrip=document.createElement('button');roundTrip.textContent='Тест: переходы';roundTrip.onclick=async()=>{
 roomProbe.flow.ui.close();roomProbe.flow.state.day=3;roomProbe.flow.state.inspected=true;roomProbe.flow.state.budget=true;const saved=JSON.stringify(roomProbe.flow.state);let loading=true;
 for(const inside of ["protection","courtyard","administration","courtyard","protection","courtyard","administration"] as const){const promise=roomProbe.changeLocation(inside);loading&&=roomProbe.transitioning&&!document.querySelector<HTMLElement>('.location-loading')!.hidden;await promise;}
 roomProbe.flow.ui.show('Проверка переходов',loading&&saved===JSON.stringify(roomProbe.flow.state)&&roomProbe.indoor&&!roomProbe.transitioning?'PASS: экран загрузки при каждом переходе; состояние и день сохранены; повторный вход работает':'FAIL',[]);
};nav.append(roundTrip);
const handReview=document.createElement('button');handReview.textContent='Тест: кисти крупно';handReview.onclick=async()=>{
 const runtime=game as unknown as {walk:{setEnabled(v:boolean):void};camera:import('@babylonjs/core/Cameras/arcRotateCamera').ArcRotateCamera;scene:import('@babylonjs/core/scene').Scene};
 roomProbe.flow.ui.close();if(!roomProbe.indoor)await roomProbe.changeLocation("administration");runtime.walk.setEnabled(false);
 const c=runtime.camera;c.lowerRadiusLimit=1;c.upperRadiusLimit=12;c.lowerAlphaLimit=null;c.upperAlphaLimit=null;c.alpha=1.15;c.beta=.65;c.radius=3.1;
 const {Vector3}=await import('@babylonjs/core/Maths/math.vector');c.setTarget(new Vector3(0,.9,-1.55));c.radius=3.1;
 const root=runtime.scene.getTransformNodeByName('administrator-pivot')!;
 const nodes=root.getChildTransformNodes();
 const pos=(n:string)=>{const node=nodes.find(x=>x.name===n)!;node.computeWorldMatrix(true);return node.getAbsolutePosition().clone();};
 handReview.textContent=['L','R'].map(side=>{const across=pos('Index2.'+side).subtract(pos('Pinky2.'+side)).normalize();return side+': vertical '+across.y.toFixed(3);}).join(' / ');
};nav.append(handReview);

for(const s of [{id:"кладовая — шкаф",x:0,z:-1.25},{id:"кладовая — выход",x:2.6,z:2.25}]){const b=document.createElement("button");b.textContent="Тест: "+s.id;b.onclick=async()=>{probe.flow.ui.close();await roomProbe.changeLocation("protection");probe.hero.position.x=s.x;probe.hero.position.z=s.z;canvas.focus();};nav.append(b);}

for(const [label,x,z] of [["слева",3.95,.15],["справа",7.45,.4],["далеко",5.7,3]] as const){const b=document.createElement("button");b.textContent="Тест: проход "+label;b.onclick=()=>{probe.flow.ui.close();probe.hero.position.x=x;probe.hero.position.z=z;canvas.focus();};nav.append(b);}
const dayTest=document.createElement('button');dayTest.textContent='Тест: новый день';dayTest.onclick=()=>{
 const runtime=game as unknown as {flow:{state:{found:boolean;inspected:boolean;planned:boolean;budget:boolean};refresh():void;interact(id:string):void}};
 runtime.flow.state.found=true;runtime.flow.state.inspected=true;runtime.flow.state.planned=true;runtime.flow.state.budget=true;runtime.flow.refresh();runtime.flow.interact('task0');
};nav.append(dayTest);

const workerTest=document.createElement('button');workerTest.textContent='Тест: исполнитель';workerTest.onclick=async()=>{
 const r=game as unknown as {flow:{state:{found:boolean;inspected:boolean;jobs:{status:string;finish:number}[];day:number};refresh():void;ui:{close():void}};walk:{setEnabled(v:boolean):void};camera:import('@babylonjs/core/Cameras/arcRotateCamera').ArcRotateCamera};
 r.flow.ui.close();await roomProbe.changeLocation('protection');r.flow.state.found=true;r.flow.state.inspected=true;r.flow.state.jobs[1].status='working';r.flow.state.jobs[1].finish=r.flow.state.day+3;r.flow.refresh();r.walk.setEnabled(false);
 const {Vector3}=await import('@babylonjs/core/Maths/math.vector');const c=r.camera;c.lowerRadiusLimit=2;c.lowerAlphaLimit=null;c.upperAlphaLimit=null;c.setTarget(new Vector3(.4,1,-1.9));c.alpha=0;c.beta=.9;c.radius=4;
};nav.append(workerTest);

const inspectionProbe=game as unknown as {flow:import('../../src/practice/PracticeFlow').PracticeFlow};
for(const [label,ready] of [['осмотры',false],['приёмка',true]] as const){
 const b=document.createElement('button');b.textContent='Тест: '+label;b.onclick=async()=>{
  inspectionProbe.flow.ui.close();await roomProbe.changeLocation('courtyard');
  const {PracticeState}=await import('../../src/practice/PracticeState');const state=new PracticeState();state.found=true;state.inspected=true;
  if(ready){for(let i=0;i<3;i++){state.survey(i);state.estimate(i);}state.planned=true;state.budget=true;state.jobs[0].status='ready';}
  inspectionProbe.flow.state=state;inspectionProbe.flow.started=true;inspectionProbe.flow.refresh();probe.hero.position.x=-5.2;probe.hero.position.z=5.7;canvas.focus();
 };nav.append(b);
}
const planReview=document.createElement('button');planReview.textContent='Тест: сборка плана';planReview.onclick=async()=>{
 inspectionProbe.flow.ui.close();await roomProbe.changeLocation('courtyard');
 const {PracticeState}=await import('../../src/practice/PracticeState');const state=new PracticeState();state.found=true;state.inspected=true;
 for(let i=0;i<3;i++){state.survey(i);state.estimate(i);}
 inspectionProbe.flow.state=state;inspectionProbe.flow.started=true;inspectionProbe.flow.refresh();inspectionProbe.flow.interact('plan');
};nav.append(planReview);
