import React,{useEffect,useRef,useState} from 'react';
import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';

const team=[
 {id:'gm',name:'Nour',role:'General Manager',color:'#9b2634',status:'Working'},
 {id:'research',name:'Atlas',role:'Researcher',color:'#6688b8',status:'Working'},
 {id:'builder',name:'Nova',role:'Developer',color:'#4d9b83',status:'Coffee break'},
 {id:'copy',name:'Echo',role:'Content Specialist',color:'#b66f8d',status:'Working'},
 {id:'media',name:'Pixel',role:'Marketing Specialist',color:'#bd8c4d',status:'In a meeting'},
 {id:'hr',name:'Mira',role:'People Operations',color:'#5d9eaa',status:'Working'}
];

export default function OfficeScene(){
 const mount=useRef(null),[cameraMode,setCameraMode]=useState('top'),[selected,setSelected]=useState(null);
 useEffect(()=>{
  const host=mount.current;if(!host)return;
  const scene=new THREE.Scene();scene.background=new THREE.Color('#d8dfe5');
  const camera=new THREE.PerspectiveCamera(42,1,.1,180);camera.position.set(0,34,.1);
  const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.6));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;host.appendChild(renderer.domElement);
  const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,0,0);controls.enableDamping=true;controls.dampingFactor=.07;controls.maxPolarAngle=Math.PI*.49;controls.minDistance=8;controls.maxDistance=55;
  scene.add(new THREE.HemisphereLight('#ffffff','#8c8277',2.1));
  const sun=new THREE.DirectionalLight('#fff0dc',2.8);sun.position.set(-12,25,14);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-22;sun.shadow.camera.right=22;sun.shadow.camera.top=20;sun.shadow.camera.bottom=-20;scene.add(sun);
  const fill=new THREE.DirectionalLight('#c4d8ff',.8);fill.position.set(16,12,-18);scene.add(fill);
  const mat=(c,r=.72)=>new THREE.MeshStandardMaterial({color:c,roughness:r});
  const mats={floor:mat('#a79d90'),tile:mat('#b8ad9f'),wall:mat('#3e454b'),wood:mat('#806047'),oak:mat('#987b5c'),metal:mat('#333b43'),black:mat('#20262d'),screen:mat('#172c3d',.2),cream:mat('#e8dfd0'),fabric:mat('#66737c'),red:mat('#8d3435'),green:mat('#557a60'),skin:mat('#bd8d70'),gold:mat('#c6a16c',.35)};
  const box=(w,h,d,m,x,y,z,parent=scene)=>{const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;};
  const cyl=(r,h,m,x,y,z,parent=scene)=>{const o=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,18),m);o.position.set(x,y,z);o.castShadow=true;parent.add(o);return o;};
  const sphere=(r,m,x,y,z,parent=scene)=>{const o=new THREE.Mesh(new THREE.SphereGeometry(r,16,12),m);o.position.set(x,y,z);o.castShadow=true;parent.add(o);return o;};
  const label=(txt,x,z)=>{const c=document.createElement('canvas');c.width=512;c.height=128;const ctx=c.getContext('2d');ctx.fillStyle='#f5eee4';ctx.font='bold 46px Arial';ctx.textAlign='center';ctx.fillText(txt,256,78);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;const s=new THREE.Sprite(new THREE.SpriteMaterial({map:t,transparent:true}));s.position.set(x,2.9,z);s.scale.set(2.7,.68,1);scene.add(s);};
  const plant=(x,z,s=1)=>{cyl(.28*s,.38*s,mats.wood,x,.19*s,z);for(let i=0;i<6;i++){const l=new THREE.Mesh(new THREE.ConeGeometry(.14*s,.85*s,8),mat('#4e805a'));l.position.set(x+Math.sin(i*2.4)*.18*s,.72*s,z+Math.cos(i*2.4)*.18*s);l.rotation.z=Math.sin(i*2.4)*.3;scene.add(l);}};
  const chair=(x,z,rot=0)=>{const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=rot;scene.add(g);box(.62,.14,.62,mats.metal,0,.47,0,g);box(.62,.68,.13,mats.metal,0,.82,.25,g);cyl(.055,.42,mats.metal,0,.2,0,g);for(let i=0;i<4;i++){const a=i*Math.PI/2;box(.055,.045,.36,mats.metal,Math.sin(a)*.16,.05,Math.cos(a)*.16,g);}return g;};
  const desk=(x,z,rot=0)=>{const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=rot;scene.add(g);box(1.55,.13,.92,mats.oak,0,.91,0,g);for(const dx of [-.64,.64])for(const dz of [-.35,.35])box(.07,.84,.07,mats.metal,dx,.42,dz,g);box(.58,.43,.06,mats.black,0,1.19,-.29,g);box(.52,.34,.02,mats.screen,0,1.2,-.255,g);box(.44,.025,.18,mats.cream,0,1.02,.2,g);chair(x,z+1.03,0);};
  // Building shell and light oak floor.
  box(32,.35,22,mats.floor,0,-.19,0);
  for(let x=-15;x<16;x+=2)for(let z=-10;z<11;z+=2)box(1.96,.016,1.96,mats.tile,x,-.005,z);
  // Glazed perimeter walls keep the floor plan readable from above.
  box(32,2.9,.18,mats.wall,0,1.45,-11);box(32,2.9,.18,mats.wall,0,1.45,11);box(.18,2.9,22,mats.wall,-16,1.45,0);box(.18,2.9,22,mats.wall,16,1.45,0);
  const partition=(x,z,w,d,doorSide='south')=>{const h=2.55,t=.13;box(w,h,t,mats.wall,x,h/2,z-d/2);box(t,h,d,mats.wall,x-w/2,h/2,z);box(t,h,d,mats.wall,x+w/2,h/2,z);if(doorSide==='south'){box((w-1.15)/2,h,t,mats.wall,x-(w+1.15)/4,h/2,z+d/2);box((w-1.15)/2,h,t,mats.wall,x+(w+1.15)/4,h/2,z+d/2);}else box(w,h,t,mats.wall,x,h/2,z+d/2);};
  // Manager office: premium executive suite. Desk faces entrance; manager faces the door.
  partition(-11,-7,9,7);box(8.7,2.35,.045,mat('#a8c2cc',.22),-11,1.25,-3.47);label('MANAGER OFFICE',-11,-7);
  // Oversized walnut executive desk with dark modesty panel and brass detailing.
  box(2.65,.18,1.35,mat('#49372b'),-11,.98,-7.05);box(2.55,.12,1.27,mat('#8b6748'),-11,1.13,-7.05);
  box(2.35,.72,.12,mats.metal,-11,.53,-6.48);box(.09,.78,1.12,mats.gold,-12.18,.55,-7.05);box(.09,.78,1.12,mats.gold,-9.82,.55,-7.05);
  box(.62,.045,.34,mats.black,-11,1.24,-7.42);box(.56,.025,.28,mats.screen,-11,1.28,-7.42);
  // Executive chair on the inner side of the desk, facing the entrance.
  const execChair=new THREE.Group();execChair.position.set(-11,0,-8.35);scene.add(execChair);
  box(.9,.2,.82,mats.metal,0,.68,0,execChair);box(.9,1.15,.2,mats.metal,0,1.27,-.31,execChair);
  box(.68,.08,.62,mats.fabric,0,.82,.02,execChair);box(.68,.1,.1,mats.gold,0,1.05,-.18,execChair);
  cyl(.09,.58,mats.metal,0,.34,.02,execChair);cyl(.42,.08,mats.metal,0,.07,.02,execChair);
  // Guest sofa is offset to the left of the entrance, facing the executive desk; keep doorway clear.
  box(2.35,.38,.82,mats.fabric,-13.25,.38,-4.9);box(2.35,.78,.18,mats.fabric,-13.25,.77,-4.52);
  box(.16,.52,.84,mats.fabric,-14.35,.53,-4.9);box(.16,.52,.84,mats.fabric,-12.15,.53,-4.9);
  // Coffee table sits between the guest sofa and executive desk.
  box(1.15,.12,.65,mat('#74543a'),-12.05,.48,-5.95);box(.08,.42,.08,mats.gold,-12.5,.23,-5.95);box(.08,.42,.08,mats.gold,-11.6,.23,-5.95);
  // Executive credenza, brass trim and indoor greenery.
  box(2.15,.72,.42,mats.wood,-14.65,.38,-9.7);box(2.15,.06,.45,mats.gold,-14.65,.77,-9.7);
  box(1.5,.08,.5,mats.black,-14.6,1.05,-9.7);plant(-7.5,-9.5,.8);plant(-14.8,-4.1,.75);
  cyl(.42,.08,mats.gold,-8,.07,-5.2);
  // Conference room: a real meeting table and six individual chairs.
  partition(8,-7,13,7);box(12.7,2.35,.045,mat('#a8c2cc',.22),8,1.25,-3.47);label('MEETING ROOM',8,-7);
  box(5.2,.14,1.65,mats.oak,8,.88,-7.1);for(let x=6;x<=10;x+=1.35){chair(x,-8.35,Math.PI);chair(x,-5.85,0);}box(3.2,1.45,.08,mats.black,8,1.55,-10.15);box(2.9,1.15,.025,mats.screen,8,1.58,-10.1);
  // Six separate compact employee desks; each desk has its own chair and monitor.
  const stations=[[-9,.4],[-3,.4],[3,.4],[9,.4],[-6,5],[6,5]];
  stations.forEach(([x,z])=>desk(x,z,0));
  // Employee characters with articulated limbs and simple autonomous routes.
  const people=team.map((person,i)=>{
   const g=new THREE.Group();scene.add(g);const body= new THREE.Group();g.add(body);
   const shirt=mat(person.color),dark=mats.metal;
   cyl(.18,.22,dark,0,.16,0,body);
   const torso=new THREE.Mesh(new THREE.CapsuleGeometry(.22,.42,4,8),shirt);torso.position.y=.82;body.add(torso);
   sphere(.16,mats.skin,0,1.28,0,body);sphere(.17,mat('#332b29'),0,1.35,-.025,body);
   const armL=new THREE.Group(),armR=new THREE.Group();armL.position.set(-.24,1.02,0);armR.position.set(.24,1.02,0);body.add(armL,armR);
   box(.11,.42,.11,shirt,0,-.19,0,armL);box(.11,.42,.11,shirt,0,-.19,0,armR);
   const legL=new THREE.Group(),legR=new THREE.Group();legL.position.set(-.12,.43,0);legR.position.set(.12,.43,0);body.add(legL,legR);
   box(.13,.43,.14,dark,0,-.2,0,legL);box(.13,.43,.14,dark,0,-.2,0,legR);
   const home=new THREE.Vector3(stations[i][0],0,stations[i][1]+1.05);
   const destinations=[home,new THREE.Vector3(13,0,-1),new THREE.Vector3(12,0,5),new THREE.Vector3(8,0,-7.4)];
   const targetIndex=[0,0,1,0,3,0][i];
   g.position.copy(home);g.rotation.y=Math.PI;g.userData={home,destinations,target:destinations[targetIndex].clone(),phase:Math.random()*6.28,walking:false,armL,armR,legL,legR,body,person,index:i};
   return g;
  });
  // Coffee corner with an actual counter, espresso machine, mugs and shelves.
  box(4.8,.16,.85,mats.oak,13,.88,-1.7);box(4.8,1.45,.12,mats.black,13,1.65,-2.2);box(4.3,.8,.04,mats.screen,13,1.7,-2.12);
  box(1.05,.85,.72,mats.metal,11.6,1.38,-1.65);box(.65,.3,.48,mats.black,11.6,1.95,-1.65);for(let x=12.5;x<=14.8;x+=.65){cyl(.12,.07,mats.cream,x,1.05,-1.55);cyl(.065,.07,mats.gold,x,1.13,-1.55);}
  for(let y=2.35;y<=2.95;y+=.3)box(4.1,.05,.2,mats.oak,13,y,-2.35);label('COFFEE BAR',13,-1.3);
  // Lounge moved to the far lower-right corner, with a clear aisle from the final employee desk.
  box(7,.04,4.2,mat('#91877b'),11.5,.03,7.65);
  box(2.5,.38,.82,mats.fabric,10,.38,7.2);box(2.5,.72,.16,mats.fabric,10,.75,7.52);box(.16,.5,.84,mats.fabric,8.85,.52,7.2);box(.16,.5,.84,mats.fabric,11.15,.52,7.2);
  box(2.5,.38,.82,mats.red,13,.38,7.2);box(2.5,.72,.16,mats.red,13,.75,7.52);box(.16,.5,.84,mats.red,11.85,.52,7.2);box(.16,.5,.84,mats.red,14.15,.52,7.2);
  cyl(.65,.12,mats.oak,11.5,.48,9.05);cyl(.07,.42,mats.metal,11.5,.23,9.05);plant(15,9.2,.75);plant(8.2,9.2,.7);label('LOUNGE',11.5,6.2);
  // Reception branding: mount a large, front-facing sign directly on the back wall.
  box(3.8,.18,.9,mats.black,-13,.88,1.9);
  box(5.8,2.05,.16,mats.black,-10.7,2.05,-10.78);
  box(5.95,.07,.19,mats.gold,-10.7,3.09,-10.78);box(5.95,.07,.19,mats.gold,-10.7,1.01,-10.78);
  const c=document.createElement('canvas');c.width=1600;c.height=420;const ctx=c.getContext('2d');
  ctx.clearRect(0,0,c.width,c.height);ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.shadowColor='#000000';ctx.shadowBlur=12;ctx.fillStyle='#fff8eb';ctx.font='900 190px Arial';ctx.fillText('NEXLOVA',800,205);
  const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=renderer.capabilities.getMaxAnisotropy();
  const logo=new THREE.Mesh(new THREE.PlaneGeometry(5.35,1.4),new THREE.MeshBasicMaterial({map:tex,transparent:true,side:THREE.DoubleSide,depthWrite:false}));
  logo.position.set(-10.7,2.05,-10.68);scene.add(logo);
  plant(-15,8,.75);plant(-1,8,.7);plant(15,-9,.75);plant(4,-9,.65);plant(-15,-9,.7);
  // Pick a staff member by clicking their 3D character.
  const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
  const onPointer=e=>{const r=renderer.domElement.getBoundingClientRect();pointer.x=((e.clientX-r.left)/r.width)*2-1;pointer.y=-((e.clientY-r.top)/r.height)*2+1;raycaster.setFromCamera(pointer,camera);const hits=raycaster.intersectObjects(people,true);if(hits.length){let o=hits[0].object;while(o.parent&&!people.includes(o))o=o.parent;const idx=people.indexOf(o);if(idx>=0)setSelected(idx);}};
  renderer.domElement.addEventListener('pointerdown',onPointer);
  const resize=()=>{const w=host.clientWidth||900,h=host.clientHeight||650;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h);};resize();const obs=new ResizeObserver(resize);obs.observe(host);
  // Movement is intentionally paused: all six team members remain stationary at their assigned desks.
  let raf;const animate=()=>{raf=requestAnimationFrame(animate);controls.update();renderer.render(scene,camera);};animate();
  host.__officeCamera={set:(mode)=>{if(mode==='top'){camera.position.set(0,34,.1);controls.target.set(0,0,0);controls.minDistance=8;controls.maxDistance=55;controls.maxPolarAngle=Math.PI*.49;}else{camera.position.set(-2,2.4,8);controls.target.set(-2,1.7,0);controls.minDistance=.1;controls.maxDistance=12;controls.maxPolarAngle=Math.PI*.92;}controls.update();}};
  return()=>{cancelAnimationFrame(raf);obs.disconnect();renderer.domElement.removeEventListener('pointerdown',onPointer);controls.dispose();renderer.dispose();if(renderer.domElement.parentNode===host)host.removeChild(renderer.domElement);scene.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material){const ms=Array.isArray(o.material)?o.material:[o.material];ms.forEach(m=>{if(m.map)m.map.dispose();m.dispose();});}});delete host.__officeCamera;};
 },[]);
 const changeMode=mode=>{setCameraMode(mode);mount.current?.__officeCamera?.set(mode);};
 const chosen=selected===null?null:team[selected];
 return <div className="office-scene office-three" ref={mount} aria-label="Interactive realistic 3D NEXLOVA office">
  <div className="office-scene-toolbar"><div className="office-view-switch"><button className={cameraMode==='top'?'chosen':''} onClick={()=>changeMode('top')}>Top View</button><button className={cameraMode==='inside'?'chosen':''} onClick={()=>changeMode('inside')}>First Person</button></div><span className="office-staff-count">6 TEAM MEMBERS</span></div>
  {chosen&&<div className="office-agent-card"><button onClick={()=>setSelected(null)} aria-label="Close">×</button><b>{chosen.name}</b><span>{chosen.role}</span><small>{chosen.status}</small></div>}
  <div className="scene-hint">DRAG TO ROTATE · SCROLL TO ZOOM · CLICK A TEAM MEMBER</div>
 </div>;
}
