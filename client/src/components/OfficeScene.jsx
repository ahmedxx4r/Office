import React,{useEffect,useRef} from 'react';
import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
const team=[['Nour','#9b2634'],['Atlas','#6688b8'],['Nova','#4d9b83'],['Echo','#b66f8d'],['Pixel','#bd8c4d'],['Mira','#5d9eaa'],['Ledger','#8174a9'],['Sage','#78965b']];
export default function OfficeScene(){const mount=useRef(null);useEffect(()=>{const host=mount.current;if(!host)return;
const scene=new THREE.Scene();scene.background=new THREE.Color('#171512');
const camera=new THREE.PerspectiveCamera(34,1,.1,150);camera.position.set(23,31,34);
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.7));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;host.appendChild(renderer.domElement);
const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,0,0);controls.enableDamping=true;controls.maxPolarAngle=Math.PI*.47;controls.minDistance=20;controls.maxDistance=58;
scene.add(new THREE.HemisphereLight('#fff2df','#534536',2.1));const key=new THREE.DirectionalLight('#ffe0b0',3.1);key.position.set(-12,24,15);key.castShadow=true;key.shadow.mapSize.set(2048,2048);key.shadow.camera.left=-25;key.shadow.camera.right=25;key.shadow.camera.top=25;key.shadow.camera.bottom=-25;scene.add(key);const fill=new THREE.DirectionalLight('#b8c8ff',.85);fill.position.set(18,12,-18);scene.add(fill);
const M=(c,r=.72)=>new THREE.MeshStandardMaterial({color:c,roughness:r});const floor=M('#8b7a68'),tile=M('#aa9985'),wall=M('#302923'),glass=new THREE.MeshStandardMaterial({color:'#9bb8bb',roughness:.18,transparent:true,opacity:.32}),black=M('#171717'),wood=M('#8d5c38'),wood2=M('#b17a4e'),gold=M('#c49a61',.3),cream=M('#d8c5a7'),fabric=M('#62554c'),red=M('#7d2421'),green=M('#536b4d'),screen=M('#18232a',.2),skin=M('#bd8d70');
const box=(w,h,d,ma,x,y,z,p=scene)=>{const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),ma);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;p.add(o);return o;};
const cyl=(r,h,ma,x,y,z,p=scene)=>{const o=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,16),ma);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;p.add(o);return o;};
const sphere=(r,ma,x,y,z,p=scene)=>{const o=new THREE.Mesh(new THREE.SphereGeometry(r,14,10),ma);o.position.set(x,y,z);o.castShadow=true;p.add(o);return o;};
const room=(x,z,w,d)=>{box(w,.38,d,floor,x,-.22,z);for(let i=0;i<Math.floor(w/2);i++)for(let j=0;j<Math.floor(d/2);j++)box(1.96,.025,1.96,tile,x-w/2+1+i*2,-.015,z-d/2+1+j*2);};
const partition=(x,z,w,d,h=2.7)=>{box(w,h,.13,wall,x,h/2,z-d/2);box(w,h,.13,wall,x,h/2,z+d/2);box(.13,h,d,wall,x-w/2,h/2,z);box(.13,h,d,wall,x+w/2,h/2,z);};
const chair=(x,z,ma=black)=>{box(.62,.16,.62,ma,x,.5,z);box(.62,.72,.13,ma,x,.88,z+.25);cyl(.06,.5,gold,x,.22,z);};
const desk=(x,z,w=2.1,d=1.1)=>{box(w,.13,d,wood2,x,.92,z);for(const dx of [-w*.42,w*.42])for(const dz of [-d*.38,d*.38])box(.09,.88,.09,black,x+dx,.45,z+dz);box(.55,.06,.28,screen,x,.99,z-.22);box(.48,.025,.18,cream,x,.99,z+.18);chair(x,z+d*.75);};
const plant=(x,z,k=1)=>{cyl(.32*k,.5*k,wood,x,.25*k,z);for(let i=0;i<7;i++){const leaf=new THREE.Mesh(new THREE.ConeGeometry(.13*k,.9*k,7),M('#47734c'));leaf.position.set(x+Math.sin(i*2.4)*.23*k,.85*k,z+Math.cos(i*2.4)*.23*k);leaf.rotation.z=Math.sin(i*2.4)*.35;scene.add(leaf);}};
const sofa=(x,z,w=2.4,ma=fabric)=>{box(w,.42,.82,ma,x,.42,z);box(w,.82,.2,ma,x,.78,z+.34);for(const dx of [-w*.34,w*.34])box(.16,.5,.86,ma,x+dx,.55,z);};
const table=(x,z,r=.65)=>{cyl(r,.12,wood2,x,.72,z);cyl(.09,.68,black,x,.34,z);};
const person=(x,z,color)=>{const g=new THREE.Group();g.position.set(x,0,z);scene.add(g);cyl(.22,.38,black,0,.55,.08,g);const torso=new THREE.Mesh(new THREE.CapsuleGeometry(.22,.42,4,8),M(color));torso.position.set(0,1.05,0);g.add(torso);sphere(.17,skin,0,1.47,-.02,g);sphere(.175,black,0,1.54,-.02,g);box(.13,.48,.13,M(color),-.24,1.05,-.05,g).rotation.z=-.55;box(.13,.48,.13,M(color),.24,1.05,-.05,g).rotation.z=.55;box(.14,.58,.14,black,-.12,.24,.22,g).rotation.x=-.35;box(.14,.58,.14,black,.12,.24,.22,g).rotation.x=-.35;};
room(0,0,34,22);box(34,.65,.5,black,0,.1,-11);box(34,.65,.5,black,0,.1,11);box(.5,.65,22,black,-17,.1,0);box(.5,.65,22,black,17,.1,0);
// Enclosed offices and meeting rooms along the rear wall
partition(-12,-7,9,7);partition(-4.7,-7,4.8,7);partition(2,-7,8.2,7);partition(11,-7,8,7);
for(const x of [-15,-10,-6,-2,2,6,10,14])box(2,.95,.08,glass,x,1.05,-3.45);
desk(-13,-7,2.5,1.35);sofa(-14.4,-9,1.5);table(-12.2,-9.1,.5);plant(-16,-9,.8);box(2.6,1.5,.18,wood,-13,1.3,-10.35);plant(-9,-9,.7);
desk(-5,-7,2,1.2);desk(-5,-5,1.8,1);plant(-3.2,-9,.6);
// Boardroom
box(4.8,.18,1.8,wood2,2,.95,.95);for(let x=-.3;x<=4.3;x+=1.15){chair(x,-.3);chair(x,-2.3);}box(3,.95,.08,screen,2,2.7,-10.22);box(2.6,.035,.03,red,2,2.7,-10.15);
// Conference room
box(4.3,.18,1.8,wood2,11,.95,.9);for(let x=8.8;x<=13.2;x+=1.1){chair(x,-.3);chair(x,-2.3);}plant(15,-9,.8);
// Central collaboration desks
for(const x of [-8,0,8]){box(2.5,.16,7.2,wood2,x,.92,0);for(let z=-2.8;z<=2.8;z+=1.85){box(.09,.85,.09,black,x-1.05,.45,z);box(.09,.85,.09,black,x+1.05,.45,z);box(.48,.055,.26,screen,x,.99,z-.35);box(.42,.025,.16,cream,x,.99,z+.08);chair(x-1.75,z+.25);chair(x+1.75,z+.25);}}
team.forEach((p,i)=>person([-8,0,8][i%3]+(i%2?-.25:.25),[-2.5,-.4,2.1][Math.floor(i/3)]||2.2,p[1]));
// Reception + Nexlova feature wall
box(4.5,.18,1.15,black,-14,.95,3.9);box(5,.1,.35,wood,-14,.2,-1.5);box(5,3,.22,wood,-14,1.55,-1.8);box(1.1,1.3,.08,red,-14,2.15,-1.65);
const cv=document.createElement('canvas');cv.width=1024;cv.height=256;const ctx=cv.getContext('2d');ctx.fillStyle='#f5e8d2';ctx.font='bold 110px Arial';ctx.textAlign='center';ctx.fillText('NEXLOVA',512,155);const tex=new THREE.CanvasTexture(cv);tex.colorSpace=THREE.SRGBColorSpace;const logo=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true}));logo.position.set(-14,1.25,-1.62);logo.scale.set(3.5,.85,1);scene.add(logo);
// Lounge, coffee corner and cafe tables on the right
sofa(11,1.7,2.7);sofa(14,1.6,2.3,red);sofa(12.5,4.1,2.4);table(12.4,2.9,.8);chair(9.4,3.5);plant(16,4,.95);plant(9,1,.8);
box(4.8,.22,1.1,wood2,14,.9,-1.9);box(4.8,1.5,.14,black,14,1.7,-2.45);box(4.4,.85,.05,screen,14,1.8,-2.35);box(4.5,.04,.04,gold,14,1.35,-2.3);for(let x=12.2;x<=15.8;x+=.8){box(.35,.35,.32,black,x,1.2,-1.8);cyl(.13,.05,gold,x,1.4,-1.8);}for(const x of [12,15.5]){table(x,0,.58);chair(x-.65,-.1);chair(x+.65,-.1);}
// Studio and call rooms, recreation, communal counter and utility rooms
desk(-15,7,2.1,1.1);desk(-15,4.8,2.1,1.1);box(2.2,2.2,.15,black,-16,1.3,6.2);box(1.8,1.2,.05,screen,-16,1.4,6.1);plant(-12,9,.8);
for(let x=-10;x<=-7;x+=1.6){partition(x,7.7,1.35,2.2,2.2);sofa(x,7.6,.9,red);}
box(5,.12,4,green,-4.5,.05,8.4);box(2.3,.22,1.1,wood2,-4.5,.55,8.4);chair(-6.5,8.4,red);chair(-2.5,8.4,red);sphere(.48,red,-6.2,.55,9.5);
box(5,.2,.95,wood2,2,.85,9);for(let x=0;x<=4;x+=1)chair(x,10.1);table(7,8.2,.75);chair(6.2,8.2);chair(7.8,8.2);plant(4.7,9.7,.75);
partition(12,8.1,5.2,5.2,2.5);box(1.5,.08,1.1,black,10.4,.8,6.8);box(1.5,.08,1.1,black,12.4,.8,6.8);cyl(.28,.4,cream,10.4,.6,8);cyl(.28,.4,cream,12.4,.6,8);box(1.3,1.5,.08,wood,14.2,1,9.5);plant(15.8,9.7,.7);
// Warm accent lighting around the perimeter and lounge zones
for(const [x,z,w,d] of [[-14,3.9,4.6,1.3],[12.5,8.4,5.4,.12],[-4.5,8.4,5,.1],[2,9,5,.1]]){const l=new THREE.PointLight('#e7a65c',1.3,5);l.position.set(x,1.7,z);scene.add(l);box(w,.035,d,gold,x,.05,z);}
for(let x=-15;x<=15;x+=3){box(.07,1.2,.07,gold,x,.65,-10.7);box(.07,1.2,.07,gold,x,.65,10.7);}
const resize=()=>{const w=host.clientWidth||900,h=host.clientHeight||650;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h);};resize();const obs=new ResizeObserver(resize);obs.observe(host);let frame;const animate=()=>{frame=requestAnimationFrame(animate);controls.update();renderer.render(scene,camera);};animate();
return()=>{cancelAnimationFrame(frame);obs.disconnect();controls.dispose();renderer.dispose();if(renderer.domElement.parentNode===host)host.removeChild(renderer.domElement);scene.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material){const ms=Array.isArray(o.material)?o.material:[o.material];ms.forEach(m=>{if(m.map)m.map.dispose();m.dispose();});}});};},[]);
return <div className="office-scene office-three" ref={mount} aria-label="Interactive 3D Nexlova office floor plan"><div className="scene-hint">DRAG TO ROTATE · SCROLL TO ZOOM</div></div>;}