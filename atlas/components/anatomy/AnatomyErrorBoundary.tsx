'use client';
import { Component,type ReactNode } from 'react';
export default class AnatomyErrorBoundary extends Component<{children:ReactNode},{failed:boolean}>{
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true};}
 render(){return this.state.failed?<main className="atlas-error" role="alert"><h1>The anatomy workspace was interrupted</h1><p>Your study progress is saved on this device. Reload to restore the atlas.</p><button className="primary-button" onClick={()=>location.reload()}>Reload MedNote</button></main>:this.props.children;}
}
