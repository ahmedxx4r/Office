import React,{useEffect,useRef} from 'react';
import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';

const team=[['Nour','#9b2634'],['Atlas','#6688b8'],['Nova','#4d9b83'],['Echo','#b66f8d'],['Pixel','#bd8c4d'],['Mira','#5d9eaa'],['Ledger','#8174a9'],['Sage','#78965b']];
export default function OfficeScene(){
 const mount=useRef(null);
 useEffect(()=>{
  const host=mount.current;if(!host)return;
  const scene=new THREE.Scene();scene.background=new THREE.Color('#171512');
  const camera=new THREE.PerspectiveCamera(34,1,.1,150);camera.position.set(22,31,35);
  const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.6));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;host.appendChild(renderer.domElement);
  const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,0,0);controls.enableDamping=true;controls.dampingFactor=.07;controls.maxPolarAngle=Math.PI*.47;controls.minDistance=20;controls.maxDistance=55;
  scene.add(new THREE.HemisphereLight('#fff1df','#514538',2));const sun=new THREE.DirectionalLight('#ffe2bd',3);sun.position.set(-12,25,15);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-23;sun.shadow.camera.right=23;sun.shadow.camera.top=23;sun.shadow.camera.bottom=-23;scene.add(sun);const fill=new THREE.DirectionalLight('#b8c9ff',.75);fill.position.set(18,12,-18);scene.add(fill);
  const M=(c,r=.72)=>new THREE.MeshStandardMaterial({color:c,roughness:r});
  const floor=M('#948575'),tile=M('#b4a48f'),wall=M('#332b25'),wood=M('#8b5b39'),wood2=M('#b47b4d'),gold=M('#c69a5e',.35),black=M('#191a1b'),screen=M('#1a2834',.22),cream=M('#e4d6bd'),fabric=M('#65564d'),red=M('#842a25'),green=M('#55724e'),skin=M('#bd8d70');
  const box=(w,h,d,ma,x,y,z,p=scene)=>{const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),ma);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;p.add(o);return o;};
  const cyl=(r,h,ma,x,y,z,p=scene)=>{const o=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,18),ma);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;p.add(o);return o;};
  const sphere=(r,ma,x,y,z,p=scene)=>{const o=new THREE.Mesh(new THREE.SphereGeometry(r,16,12),ma);o.position.set(x,y,z);o.castShadow=true;p.add(o);return o;};
  const plant=(x,z,s=.8)=>{cyl(.27*s,.42*s,wood,x,.21*s,z);for(let i=0;i<6;i++){const l=new THREE.Mesh(new THREE.ConeGeometry(.13*s,.85*s,8),M('#47734c'));l.position.set(x+Math.sin(i*2.4)*.18*s,.75*s,z+Math.cos(i*2.4)*.18*s);l.rotation.z=Math.sin(i*2.4)*.3;scene.add(l);}};
  const chair=(x,z,rot=0)=>{const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=rot;scene.add(g);box(.62,.15,.62,black,0,.48,0,g);box(.62,.72,.13,black,0,.85,.25,g);cyl(.055,.42,gold,0,.2,0,g);for(let i=0;i<4;i++){const a=i*Math.PI/2;box(.06,.05,.38,black,Math.sin(a)*.16,.06,Math.cos(a)*.16,g);}};
  const desk=(x,z,rot=0)=>{const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=rot;scene.add(g);box(1.85,.14,1.15,wood2,0,.96,0,g);for(const dx of [-.78,.78])for(const dz of [-.43,.43])box(.08,.9,.08,black,dx,.46,dz,g);box(.68,.48,.07,black,0,1.27,-.38,g);box(.6,.39,.025,screen,0,1.28,-.335,g);box(.48,.035,.22,cream,0,1.06,.22,g);chair(0,1.05,Math.PI);};
  const person=(x,z,color)=>{const g=new THREE.Group();g.position.set(x,0,z);scene.add(g);cyl(.19,.3,black,0,.52,.3,g);box(.55,.14,.55,black,0,.52,.3,g);box(.55,.68,.12,black,0,.85,.54,g);const body=new THREE.Mesh(new THREE.CapsuleGeometry(.21,.36,4,8),M(color));body.position.set(0,1.1,-.06);g.add(body);sphere(.16,skin,0,1.52,-.12,g);sphere(.165,black,0,1.58,-.12,g);box(.11,.4,.11,M(color),-.22,1.14,-.27,g).rotation.x=-.65;box(.11,.4,.11,M(color),.22,1.14,-.27,g).rotation.x=-.65;box(.13,.46,.13,black,-.12,.25,.05,g).rotation.x=-.2;box(.13,.46,.13,black,.12,.25,.05,g).rotation.x=-.2;};
  const sofa=(x,z,w=2.2,color=fabric)=>{box(w,.38,.78,color,x,.38,z);box(w,.72,.16,color,x,.72,z+.3);for(const dx of [-w/2+.12,w/2-.12])box(.16,.48,.82,color,x+dx,.52,z);};
  const roundTable=(x,z,r=.55)=>{cyl(r,.12,wood2,x,.68,z);cyl(.07,.62,black,x,.31,z);};
  const label=(txt,x,z)=>{const c=document.createElement('canvas');c.width=512;c.height=128;const ctx=c.getContext('2d');ctx.fillStyle='#f2dfc2';ctx.font='bold 48px Arial';ctx.textAlign='center';ctx.fillText(txt,256,78);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;const s=new THREE.Sprite(new THREE.SpriteMaterial({map:t,transparent:true}));s.position.set(x,2.8,z);s.scale.set(2.3,.58,1);scene.add(s);};
  // One continuous tiled floor and a clean, rectangular building shell.
  box(34,.38,22,floor,0,-.2,0);
  for(let x=-16;x<17;x+=2)for(let z=-10;z<11;z+=2)box(1.96,.018,1.96,tile,x,-.005,z);
  box(34,3,.35,wall,0,1.5,-11);box(34,3,.35,wall,0,1.5,11);box(.35,3,22,wall,-17,1.5,0);box(.35,3,22,wall,17,1.5,0);
  // Room builder: solid back/side walls, front wall split around a real doorway.
  const room=(x,z,w,d,name)=>{const h=2.65,door=1.25,front=z+d/2;box(w,h,.16,wall,x,h/2,z-d/2);box(.16,h,d,wall,x-w/2,h/2,z);box(.16,h,d,wall,x+w/2,h/2,z);box((w-door)/2,h,.16,wall,x-(w+door)/4,h/2,front);box((w-door)/2,h,.16,wall,x+(w+door)/4,h/2,front);box(door,.07,.16,gold,x,h,front);const dgrp=new THREE.Group();dgrp.position.set(x-door/2,.05,front);scene.add(dgrp);box(door-.08,2.35,.08,wood,(door-.08)/2,1.17,0,dgrp);box(.055,.07,.1,gold,door-.2,1.16,.05,dgrp);dgrp.rotation.y=-.48;label(name,x,z);};
  // Back-left executive suite and quiet research office.
  room(-12,-7,8,7,'EXECUTIVE');desk(-13,-7.2,.0);sofa(-14.2,-9,1.5);roundTable(-11.8,-9,.48);plant(-15.2,-9.5);box(1.5,1.7,.35,wood,-9.1,.85,-9.5);plant(-9.8,-5,.55);
  room(-4.5,-7,5,7,'RESEARCH');desk(-4.5,-7.2);box(1.5,1.6,.32,wood,-5.9,.8,-9.5);for(let y=.35;y<1.5;y+=.35)box(1.35,.035,.28,gold,-5.9,y,-9.3);plant(-3.2,-9.3,.55);
  // Two properly furnished meeting rooms along the back, furniture clear of doors.
  room(3,-7,9,7,'BOARDROOM');box(5,.16,1.75,wood2,3,.94,-7.1);for(let x=.8;x<=5.2;x+=1.45){chair(x,-8.35,0);chair(x,-5.85,Math.PI);}box(3.4,1.65,.1,black,3,1.75,-10.25);box(3.1,1.35,.035,screen,3,1.78,-10.18);plant(6.7,-9.2,.55);
  room(12,-7,8,7,'MEETING');box(4.4,.16,1.5,wood2,12,.94,-7.1);for(let x=10.3;x<=13.7;x+=1.65){chair(x,-8.25);chair(x,-5.95,Math.PI);}box(2.8,1.5,.1,black,12,1.65,-10.25);box(2.5,1.2,.035,screen,12,1.68,-10.18);
  // Main open-plan work area: eight individual desks, generous aisles and no bench tables.
  const stations=[[-12,-1.6],[-5,-1.6],[2,-1.6],[9,-1.6],[-12,4.2],[-5,4.2],[2,4.2],[9,4.2]];
  stations.forEach(([x,z],i)=>{desk(x,z);person(x,z+1.55,team[i][1]);plant(x+1.2,z-.35,.38);});
  // Reception and branded feature wall.
  box(4.1,.18,1.05,black,-14,.95,2.5);box(5,.12,.22,wood,-14,1.45,-1.65);box(5,2.7,.18,wood,-14,1.55,-1.85);box(1.1,1.2,.06,red,-14,2.1,-1.73);
  const cv=document.createElement('canvas');cv.width=1024;cv.height=256;const ctx=cv.getContext('2d');ctx.fillStyle='#f5e8d2';ctx.font='bold 112px Arial';ctx.textAlign='center';ctx.fillText('NEXLOVA',512,155);const tx=new THREE.CanvasTexture(cv);tx.colorSpace=THREE.SRGBColorSpace;const logo=new THREE.Sprite(new THREE.SpriteMaterial({map:tx,transparent:true}));logo.position.set(-14,1.25,-1.68);logo.scale.set(3.5,.85,1);scene.add(logo);
  // Lounge at center-right: seating and coffee tables, no desks in circulation.
  sofa(11,2.4,2.4);sofa(14,2.4,2.4,red);sofa(12.5,4.7,2.5);roundTable(12.5,3.55,.68);roundTable(9.7,4.2,.42);plant(15.7,5.4,.8);plant(9.4,1.2,.7);
  // Coffee bar along the right perimeter with shelves and compact equipment.
  box(4.7,.18,1,wood2,14,.92,-1.8);box(4.7,1.65,.14,black,14,1.75,-2.35);box(4.25,.9,.035,screen,14,1.82,-2.26);for(let y=2.45;y<=3.05;y+=.3)box(4.1,.045,.22,wood2,14,y,-2.55);for(let x=12.3;x<=15.7;x+=.85){box(.36,.48,.3,black,x,1.3,-1.8);cyl(.1,.06,gold,x,1.58,-1.8);}
  // Content studio in the lower-left corner.
  room(-13,8,7,5,'STUDIO');desk(-14,7.6);box(2.8,1.65,.12,black,-14,1.65,5.7);box(2.45,1.25,.03,screen,-14,1.68,5.62);for(let x=-15.2;x<=-12.8;x+=.6)box(.12,1.7,.12,black,x,1.2,9.8);plant(-10.5,9.5,.6);
  // Two usable call rooms, each with one chair and a desk; not tiny chair-sized cubicles.
  room(-5.5,8,5,5,'CALL ROOM');desk(-5.5,7.8);sofa(-4.5,9.4,1.1);
  // Recreation nook with compact game table and soft seating.
  box(5.2,.12,4.2,green,-.2,.04,8.1);box(1.8,.18,1.05,wood2,-.2,.58,8.1);chair(-1.5,8.1);chair(1.1,8.1);sphere(.42,red,-2.1,.5,9.3);roundTable(2.6,8.3,.48);plant(3.8,9.6,.6);
  // Restrooms and utility room at lower-right; fixtures placed inside their footprint.
  room(12.5,8,7,5,'SERVICES');for(const x of [10.8,13]){box(1.15,.08,.9,black,x,.75,7.4);cyl(.22,.38,cream,x,.55,8.4);}box(1.3,1.5,.3,wood,15.1,.75,9.3);for(let y=.3;y<1.4;y+=.35)box(1.15,.035,.25,gold,15.1,y,9.1);
  // Indoor plants and warm indirect architectural lighting.
  for(const [x,z] of [[-16,-10],[ -8,-3],[7,5],[16,6],[-9,10],[5,-10]])plant(x,z,.65);
  for(const [x,z] of [[-14,2.5],[12,4],[14,-2]]){const l=new THREE.PointLight('#e8ad69',1.1,5);l.position.set(x,2,z);scene.add(l);}
  const resize=()=>{const w=host.clientWidth||900,h=host.clientHeight||650;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h);};resize();const obs=new ResizeObserver(resize);obs.observe(host);let frame;const animate=()=>{frame=requestAnimationFrame(animate);controls.update();renderer.render(scene,camera);};animate();
  return()=>{cancelAnimationFrame(frame);obs.disconnect();controls.dispose();renderer.dispose();if(renderer.domElement.parentNode===host)host.removeChild(renderer.domElement);scene.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material){const ms=Array.isArray(o.material)?o.material:[o.material];ms.forEach(m=>{if(m.map)m.map.dispose();m.dispose();});}});};
 },[]);
 return <div className="office-scene office-three" ref={mount} aria-label="Reorganized interactive 3D Nexlova office"><div className="scene-hint">DRAG TO ROTATE · SCROLL TO ZOOM</div></div>;
}