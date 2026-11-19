import React,{useEffect,useRef} from 'react';
import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
const people=[['Nour','General Manager','#9a83ee'],['Atlas','Research','#6598dc'],['Nova','Developer','#55b99a'],['Echo','Content','#d58aaf'],['Pixel','Marketing','#dfaa68'],['Mira','People Ops','#7bbac5'],['Ledger','Finance','#9b9ad5'],['Sage','Assistant','#8dbb78']];
export default function OfficeScene(){
 const mount=useRef(null);
 useEffect(()=>{const host=mount.current;if(!host)return;
 const scene=new THREE.Scene();scene.background=new THREE.Color('#d9e3ef');scene.fog=new THREE.Fog('#d9e3ef',22,45);
 const camera=new THREE.PerspectiveCamera(38,1,.1,100);camera.position.set(12,13,19);
 const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;host.appendChild(renderer.domElement);
 const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,1,0);controls.enableDamping=true;controls.maxPolarAngle=Math.PI*.48;controls.minDistance=11;controls.maxDistance=29;
 scene.add(new THREE.HemisphereLight('#fff','#8190a7',2));const sun=new THREE.DirectionalLight('#fff1d9',3);sun.position.set(-7,13,8);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);scene.add(sun);const fill=new THREE.DirectionalLight('#c7d9ff',1.2);fill.position.set(8,8,-8);scene.add(fill);
 const mat=(c,r=.75)=>new THREE.MeshStandardMaterial({color:c,roughness:r});
 const box=(w,h,d,m,x,y,z,p=scene)=>{const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;p.add(o);return o;};
 const cyl=(a,b,h,m,x,y,z,p=scene)=>{const o=new THREE.Mesh(new THREE.CylinderGeometry(a,b,h,14),m);o.position.set(x,y,z);o.castShadow=true;p.add(o);return o;};
 const floor=mat('#d6dce5'),wall=mat('#edf1f6'),trim=mat('#aab7c7'),wood=mat('#bd9875'),dark=mat('#303b4d'),metal=mat('#77879b'),screen=mat('#172438',.3);
 box(22,.35,17,floor,0,-.2,0);box(22,5,.25,wall,0,2.3,-8.5);box(.25,5,17,wall,-11,2.3,0);box(.25,5,17,wall,11,2.3,0);
 for(let i=0;i<5;i++){let x=-8.5+i*4.25;box(3.7,2.7,.13,mat('#9fc2df',.25),x,2.55,-8.32);box(3.85,.12,.25,trim,x,1.15,-8.25);box(.1,2.85,.2,trim,x,2.55,-8.2);}
 for(let x=-8;x<=8;x+=4)box(.12,.15,16,trim,x,4.8,0);
 for(let x=-6;x<=6;x+=4){cyl(.06,.06,.8,metal,x,4.15,0);const lamp=new THREE.Mesh(new THREE.CylinderGeometry(.48,.62,.12,24),mat('#fff4d7'));lamp.position.set(x,3.72,0);scene.add(lamp);}
 box(3.4,.22,1.5,wood,-7,.95,5);box(.16,1.1,.16,dark,-8.4,.45,5);box(.16,1.1,.16,dark,-5.6,.45,5);
 people.forEach((p,i)=>{const row=i<4?0:1,col=i%4,x=-7.2+col*4.8,z=row===0?-2.7:2.7;
 const desk=new THREE.Group();desk.position.set(x,0,z);scene.add(desk);box(3.25,.18,1.65,wood,0,1.12,0,desk);for(const dx of [-1.42,1.42])for(const dz of [-.62,.62])box(.12,1.08,.12,dark,dx,.52,dz,desk);
 box(1.05,.68,.09,dark,0,1.57,-.53,desk);box(.91,.53,.025,screen,0,1.58,-.47,desk);box(.18,.22,.18,metal,0,1.18,-.53,desk);box(.62,.045,.25,mat('#e8edf3'),0,1.24,.38,desk);
 const chair=new THREE.Group();chair.position.set(x,0,z+1.55);scene.add(chair);cyl(.08,.08,.62,metal,0,.42,0,chair);box(.82,.16,.75,dark,0,.78,0,chair);box(.82,.95,.16,dark,0,1.28,.34,chair);
 for(let a=0;a<5;a++){let t=a*Math.PI*2/5;cyl(.045,.045,.55,metal,Math.cos(t)*.32,.12,Math.sin(t)*.32,chair);}
 const avatar=new THREE.Group();avatar.position.set(x,0,z+1.05);scene.add(avatar);const skin=mat(i%3===0?'#c58f72':i%3===1?'#e0b394':'#a9755e'),shirt=mat(p[2]),hair=mat(i%2?'#3b3031':'#282b35');
 cyl(.32,.34,.42,dark,0,.95,0,avatar);const torso=new THREE.Mesh(new THREE.CapsuleGeometry(.34,.55,5,10),shirt);torso.position.set(0,1.42,-.02);torso.rotation.x=-.12;avatar.add(torso);
 const head=new THREE.Mesh(new THREE.SphereGeometry(.25,20,16),skin);head.position.set(0,2.05,-.08);avatar.add(head);const cap=new THREE.Mesh(new THREE.SphereGeometry(.255,20,12,0,Math.PI*2,0,Math.PI*.48),hair);cap.position.set(0,2.1,-.08);avatar.add(cap);
 const limb=(a,b,r,m)=>{const d=new THREE.Vector3().subVectors(b,a);const o=new THREE.Mesh(new THREE.CylinderGeometry(r,r,d.length(),10),m);o.position.copy(a).add(b).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());avatar.add(o);};
 limb(new THREE.Vector3(-.28,1.62,-.03),new THREE.Vector3(-.55,1.3,-.55),.095,shirt);limb(new THREE.Vector3(.28,1.62,-.03),new THREE.Vector3(.55,1.3,-.55),.095,shirt);limb(new THREE.Vector3(-.55,1.3,-.55),new THREE.Vector3(-.42,1.22,-.8),.07,skin);limb(new THREE.Vector3(.55,1.3,-.55),new THREE.Vector3(.42,1.22,-.8),.07,skin);limb(new THREE.Vector3(-.2,.92,.05),new THREE.Vector3(-.2,.55,.62),.13,dark);limb(new THREE.Vector3(.2,.92,.05),new THREE.Vector3(.2,.55,.62),.13,dark);
 const cv=document.createElement('canvas');cv.width=512;cv.height=128;const cx=cv.getContext('2d');cx.fillStyle='rgba(28,40,58,.9)';cx.beginPath();cx.roundRect(8,8,496,112,24);cx.fill();cx.fillStyle='#fff';cx.font='bold 42px Arial';cx.textAlign='center';cx.fillText(p[0]+' · '+p[1],256,78);const tx=new THREE.CanvasTexture(cv);tx.colorSpace=THREE.SRGBColorSpace;const tag=new THREE.Sprite(new THREE.SpriteMaterial({map:tx,transparent:true}));tag.position.set(x,3.15,z+1.05);tag.scale.set(2.25,.56,1);scene.add(tag);
 });
 for(const x of [-9.4,9.4]){cyl(.45,.55,.65,mat('#b98c72'),x,.3,6.9);for(let j=0;j<5;j++){const leaf=new THREE.Mesh(new THREE.ConeGeometry(.18,1.2,8),mat('#5d9b7e'));leaf.position.set(x+(j-2)*.16,.95,6.9+(j%2)*.15);scene.add(leaf);}}
 const resize=()=>{const w=host.clientWidth||800,h=host.clientHeight||560;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h);};resize();const observer=new ResizeObserver(resize);observer.observe(host);let frame;const animate=()=>{frame=requestAnimationFrame(animate);controls.update();renderer.render(scene,camera);};animate();
 return()=>{cancelAnimationFrame(frame);observer.disconnect();controls.dispose();renderer.dispose();if(renderer.domElement.parentNode===host)host.removeChild(renderer.domElement);scene.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material){const ms=Array.isArray(o.material)?o.material:[o.material];ms.forEach(m=>{if(m.map)m.map.dispose();m.dispose();});}});};
 },[]);
 return <div className="office-scene office-three" ref={mount} aria-label="Interactive 3D office with employees seated at individual desks"><div className="scene-hint">DRAG TO ROTATE · SCROLL TO ZOOM</div></div>;
}