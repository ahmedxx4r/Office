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
const partition=(x,z,w,d,h=2.7)=>{const gap=Math.min(1.25,Math.max(.9,w-.35));box(w,h,.13,wall,x,h/2,z-d/2);box((w-gap)/2,h,.13,wall,x-(w+gap)/4,h/2,z+d/2);box((w-gap)/2,h,.13,wall,x+(w+gap)/4,h/2,z+d/2);box(.13,h,d,wall,x-w/2,h/2,z);box(.13,h,d,wall,x+w/2,h/2,z);box(.08,h,.08,gold,x-gap/2,h/2,z+d/2);box(.08,h,.08,gold,x+gap/2,h/2,z+d/2);const door=new THREE.Group();door.position.set(x-gap/2,.05,z+d/2);scene.add(door);box(gap-.08,2.35,.09,wood,(gap-.08)/2,1.17,0,door);box(.06,.08,.12,gold,gap-.2,1.16,.08,door);door.rotation.y=-.55;};
const chair=(x,z,ma=black)=>{box(.62,.16,.62,ma,x,.5,z);box(.62,.72,.13,ma,x,.88,z+.25);cyl(.06,.5,gold,x,.22,z);};
const desk=(x,z,w=2.1,d=1.1)=>{box(w,.13,d,wood2,x,.92,z);for(const dx of [-w*.42,w*.42])for(const dz of [-d*.38,d*.38])box(.09,.88,.09,black,x+dx,.45,z+dz);box(.55,.06,.28,screen,x,.99,z-.22);box(.48,.025,.18,cream,x,.99,z+.18);chair(x,z+d*.75);};
const plant=(x,z,k=1)=>{cyl(.32*k,.5*k,wood,x,.25*k,z);for(let i=0;i<7;i++){const leaf=new THREE.Mesh(new THREE.ConeGeometry(.13*k,.9*k,7),M('#47734c'));leaf.position.set(x+Math.sin(i*2.4)*.23*k,.85*k,z+Math.cos(i*2.4)*.23*k);leaf.rotation.z=Math.sin(i*2.4)*.35;scene.add(leaf);}};
const sofa=(x,z,w=2.4,ma=fabric)=>{box(w,.42,.82,ma,x,.42,z);box(w,.82,.2,ma,x,.78,z+.34);for(const dx of [-w*.34,w*.34])box(.16,.5,.86,ma,x+dx,.55,z);};
const table=(x,z,r=.65)=>{cyl(r,.12,wood2,x,.72,z);cyl(.09,.68,black,x,.34,z);};
const person=(x,z,color)=>{const g=new THREE.Group();g.position.set(x,0,z);scene.add(g);cyl(.2,.34,black,0,.55,.34,g);box(.58,.16,.58,black,0,.55,.34,g);box(.58,.72,.12,black,0,.91,.59,g);const torso=new THREE.Mesh(new THREE.CapsuleGeometry(.22,.38,4,8),M(color));torso.position.set(0,1.12,-.03);g.add(torso);sphere(.17,skin,0,1.55,-.12,g);sphere(.175,black,0,1.62,-.12,g);box(.12,.43,.12,M(color),-.23,1.18,-.25,g).rotation.x=-.7;box(.12,.43,.12,M(color),.23,1.18,-.25,g).rotation.x=-.7;box(.13,.48,.13,black,-.13,.27,.02,g).rotation.x=-.25;box(.13,.48,.13,black,.13,.27,.02,g).rotation.x=-.25;};
room(0,0,34,22);box(34,.65,.5,black,0,.1,-11);box(34,.65,.5,black,0,.1,11);box(.5,.65,22,black,-17,.1,0);box(.5,.65,22,black,17,.1,0);
// Enclosed offices and meeting rooms along the rear wall
partition(-12,-7,9,7);partition(-4.7,-7,4.8,7);partition(2,-7,8.2,7);partition(11,-7,8,7);
for(const x of [-15,-10,-6,-2,2,6,10,14])box(2,.95,.08,glass,x,1.05,-3.45);
desk(-13,-7,2.5,1.35);sofa(-14.4,-9,1.5);table(-12.2,-9.1,.5);plant(-16,-9,.8);box(2.6,1.5,.18,wood,-13,1.3,-10.35);plant(-9,-9,.7);
desk(-5,-7,2,1.2);desk(-5,-5,1.8,1);plant(-3.2,-9,.6);
// Boardroom: meeting table and chairs stay within room boundaries
box(4.4,.18,1.55,wood2,2,.95,-7);for(let x=.1;x<=3.9;x+=1.25){chair(x,-8.25);chair(x,-5.75);}box(3,.95,.08,screen,2,2.7,-10.22);box(2.6,.035,.03,red,2,2.7,-10.15);
// Conference room: compact table and chairs clear of entrance
box(3.5,.18,1.45,wood2,11,.95,-7);for(let x=9.6;x<=12.4;x+=1.35){chair(x,-8.2);chair(x,-5.8);}plant(14.6,-9,.65);
// Eight individual executive-style workstations — no shared bench tables
const workstations=[[-11,-2.1],[-4,-2.1],[3,-2.1],[10,-2.1],[-11,4.1],[-4,4.1],[3,4.1],[10,4.1]];
workstations.forEach(([x,z],i)=>{const w=2.35,d=1.35;box(w,.16,d,wood2,x,.98,z);for(const dx of [-1,1])for(const dz of [-.52,.52])box(.09,.92,.09,black,x+dx,.48,z+dz);box(.78,.62,.09,black,x,1.38,z-.48);box(.68,.48,.025,screen,x,1.39,z-.425);box(.58,.04,.28,cream,x,1.09,z+.22);box(.26,.025,.2,black,x-.56,1.09,z+.22);box(.18,.04,.18,gold,x+.55,1.1,z+.22);person(x,z+1.42,team[i][1]);plant(x+1.35,z-.35,.48);});

// Reception + Nexlova feature wall
box(4.5,.18,1.15,black,-14,.95,3.9);box(5,.1,.35,wood,-14,.2,-1.5);box(5,3,.22,wood,-14,1.55,-1.8);box(1.1,1.3,.08,red,-14,2.15,-1.65);
const cv=document.createElement('canvas');cv.width=1024;cv.height=256;const ctx=cv.getContext('2d');ctx.fillStyle='#f5e8d2';ctx.font='bold 110px Arial';ctx.textAlign='center';ctx.fillText('NEXLOVA',512,155);const tex=new THREE.CanvasTexture(cv);tex.colorSpace=THREE.SRGBColorSpace;const logo=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true}));logo.position.set(-14,1.25,-1.62);logo.scale.set(3.5,.85,1);scene.add(logo);
// Lounge, coffee corner and cafe tables on the right
sofa(11,1.7,2.7);sofa(14,1.6,2.3,red);sofa(12.5,4.1,2.4);table(12.4,2.9,.8);chair(9.4,3.5);plant(16,4,.95);plant(9,1,.8);
box(4.8,.22,1.1,wood2,14,.9,-1.9);box(4.8,1.5,.14,black,14,1.7,-2.45);box(4.4,.85,.05,screen,14,1.8,-2.35);box(4.5,.04,.04,gold,14,1.35,-2.3);for(let x=12.2;x<=15.8;x+=.8){box(.35,.35,.32,black,x,1.2,-1.8);cyl(.13,.05,gold,x,1.4,-1.8);}for(const x of [12,15.5]){table(x,0,.58);chair(x-.65,-.1);chair(x+.65,-.1);}
// Studio and call rooms, recreation, communal counter and utility rooms
desk(-15,7,2.1,1.1);desk(-15,4.8,2.1,1.1);box(2.2,2.2,.15,black,-16,1.3,6.2);box(1.8,1.2,.05,screen,-16,1.4,6.1);plant(-12,9,.8);
// Removed undersized phone cubicles.
box(5,.12,4,green,-4.5,.05,8.4);box(2.3,.22,1.1,wood2,-4.5,.55,8.4);chair(-6.5,8.4,red);chair(-2.5,8.4,red);sphere(.48,red,-6.2,.55,9.5);
// Removed the long communal table and its row of chairs; keep this area open.
table(2.5,8.5,.62);chair(1.7,8.5);chair(3.3,8.5);table(6.2,8.5,.62);chair(5.4,8.5);chair(7,8.5);plant(4.3,9.7,.65);
partition(12,8.1,5.2,5.2,2.5);box(1.5,.08,1.1,black,10.4,.8,6.8);box(1.5,.08,1.1,black,12.4,.8,6.8);cyl(.28,.4,cream,10.4,.6,8);cyl(.28,.4,cream,12.4,.6,8);box(1.3,1.5,.08,wood,14.2,1,9.5);plant(15.8,9.7,.7);

// Fill the previously empty rooms with functional furniture and visible room identities
// Research / quiet office
box(1.5,1.7,.45,wood,-5.8,.85,-9.4);for(let y=.3;y<1.7;y+=.42)box(1.35,.035,.4,gold,-5.8,y,-9.15);desk(-3.8,-7,1.45,.9);chair(-3.8,-5.9);plant(-3.1,-9.7,.55);
// Boardroom storage, screen and individual conference chairs
box(1.5,1.55,.3,wood,4.65,.8,-9.55);for(let y=.35;y<1.5;y+=.35)box(1.35,.035,.28,gold,4.65,y,-9.35);box(3.2,1.75,.12,black,2,1.75,-10.25);box(2.8,1.35,.04,screen,2,1.78,-10.16);
// Removed duplicate chairs that were outside the boardroom.
// Meeting room storage and display
box(1.6,1.45,.35,wood,14.15,.73,-9.5);for(let y=.35;y<1.35;y+=.3)box(1.4,.035,.32,gold,14.15,y,-9.3);box(2.8,1.6,.12,black,11,1.65,-10.25);box(2.5,1.25,.04,screen,11,1.68,-10.16);
// Reception waiting chairs and filing shelves
sofa(-15.1,1.2,1.7);table(-12.8,1.4,.55);plant(-16,2.6,.8);box(1.2,2,.4,wood,-9.5,1,-1.2);for(let y=.35;y<1.8;y+=.4)box(1.12,.035,.38,gold,-9.5,y,-.98);
// Studio gets recording desk, monitor wall and acoustic panels
box(2.8,.16,1.05,wood2,-14.7,.95,8.6);for(let x=-16;x<=-13;x+=.5)box(.08,1.8,.12,black,x,1.35,10.1);box(2.5,1.3,.1,screen,-15,1.8,6.8);desk(-14.7,6.4,1.7,1);
// Call booths with doors and seating
// Two proper private call booths, each with one compact desk and one chair
for(const x of [-9.5,-6.2]){box(2.7,.12,3.1,floor,x,.02,7.7);box(2.7,2.25,.12,wall,x,1.12,6.15);box(.12,2.25,3.1,wall,x-1.35,1.12,7.7);box(.12,2.25,3.1,wall,x+1.35,1.12,7.7);box(1.35,.1,.08,gold,x,2.22,6.15);desk(x,7.1,1.25,.8);plant(x+.9,8.7,.4);}
// Lounge receives low tables, sideboard, cushions and greenery
table(10.4,4.2,.55);table(14.8,3.4,.48);box(2.2,.8,.35,wood,15.5, .4,5.7);for(let y=.25;y<.9;y+=.28)box(2,.035,.3,gold,15.5,y,5.52);plant(9.3,5.2,.9);plant(16,1.2,.9);
// Coffee corner shelves, espresso machines and menu display
for(let y=2.4;y<=3.1;y+=.35)box(4.2,.045,.25,wood2,14,y,-3.25);for(let x=12.4;x<=15.6;x+=1.05){box(.38,.58,.32,black,x,1.45,-1.9);cyl(.11,.08,gold,x,1.77,-1.9);}
// Utility room shelves and cleaning storage
box(1.4,1.8,.4,wood,15.2,.9,9.4);for(let y=.35;y<1.9;y+=.38)box(1.25,.035,.35,gold,15.2,y,9.2);

// Warm accent lighting around the perimeter and lounge zones
for(const [x,z,w,d] of [[-14,3.9,4.6,1.3],[12.5,8.4,5.4,.12],[-4.5,8.4,5,.1],[2,9,5,.1]]){const l=new THREE.PointLight('#e7a65c',1.3,5);l.position.set(x,1.7,z);scene.add(l);box(w,.035,d,gold,x,.05,z);}
for(let x=-15;x<=15;x+=3){box(.07,1.2,.07,gold,x,.65,-10.7);box(.07,1.2,.07,gold,x,.65,10.7);}
const resize=()=>{const w=host.clientWidth||900,h=host.clientHeight||650;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h);};resize();const obs=new ResizeObserver(resize);obs.observe(host);let frame;const animate=()=>{frame=requestAnimationFrame(animate);controls.update();renderer.render(scene,camera);};animate();
return()=>{cancelAnimationFrame(frame);obs.disconnect();controls.dispose();renderer.dispose();if(renderer.domElement.parentNode===host)host.removeChild(renderer.domElement);scene.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material){const ms=Array.isArray(o.material)?o.material:[o.material];ms.forEach(m=>{if(m.map)m.map.dispose();m.dispose();});}});};},[]);
return <div className="office-scene office-three" ref={mount} aria-label="Interactive 3D Nexlova office floor plan"><div className="scene-hint">DRAG TO ROTATE · SCROLL TO ZOOM</div></div>;}