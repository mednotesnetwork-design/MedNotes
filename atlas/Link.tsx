import type {AnchorHTMLAttributes} from 'react';
export default function Link(props:AnchorHTMLAttributes<HTMLAnchorElement>){return <a {...props} href={props.href==='/'?import.meta.env.BASE_URL:props.href} target={props.href==='/'?'_top':props.target}/>;}
