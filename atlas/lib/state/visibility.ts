import type { Entity } from '@atlas/lib/anatomy/schema';
import type { Visibility } from './viewer';
export function layerOf(e:Pick<Entity,'id'|'system'|'name'>):string {
 if(e.id.includes('lymph'))return 'lymphatic';
 if(e.system==='surface'&&/tendon|extensor expansion/i.test(e.name))return 'tendon';
 return e.system;
}
export function objectVisible(s:Visibility,id:string,system:string){return s.visibleSystems.includes(system)&&!s.hiddenIds.includes(id)&&(!s.isolateId||s.isolateId===id||s.isolateRevealIds.includes(id));}
export function objectOpacity(s:Visibility,id:string){return s.ghostIds.includes(id)?.12:s.transparentIds.includes(id)?.35:1;}
