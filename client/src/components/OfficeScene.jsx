import React from 'react';
export default function OfficeScene(){
 return <div className="office-scene office-3d" aria-label="3D virtual office with three employees">
  <div className="scene-glow"/><div className="scene-window"><i/><i/><i/><i/></div>
  <div className="iso-floor"/>
  <div className="office-zone zone-left"><div className="desk3d"><div className="desk-screen"><b>NX</b><i/><i/></div><div className="desk-surface"/><div className="desk-support"/></div><Employee color="violet" name="N"/><div className="seat3d"/></div>
  <div className="office-zone zone-center"><div className="desk3d"><div className="desk-screen"><b>AI</b><i/><i/></div><div className="desk-surface"/><div className="desk-support"/></div><Employee color="blue" name="A"/><div className="seat3d"/></div>
  <div className="office-zone zone-right"><div className="desk3d"><div className="desk-screen"><b>◎</b><i/><i/></div><div className="desk-surface"/><div className="desk-support"/></div><Employee color="mint" name="M"/><div className="seat3d"/></div>
  <div className="plant3d"><i/><i/><i/><b/></div>
  <div className="scene-caption"><span className="online-dot"/> 3 TEAM MEMBERS <small>VIRTUAL OFFICE</small></div>
 </div>;
}
function Employee({color,name}){
 return <div className={'employee employee-'+color}><div className="employee-head"><span>{name}</span></div><div className="employee-body"/><i className="employee-arm arm-left"/><i className="employee-arm arm-right"/></div>;
}