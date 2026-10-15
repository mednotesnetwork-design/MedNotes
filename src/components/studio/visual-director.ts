import type {Source} from './studio-types';
export type VisualKind='axon'|'action-potential'|'nmj'|'source';
export type VisualDecision={kind:VisualKind;sourceIds:string[];basis:'lecture'|'additional';reason:string;generationCost:0};
const rules:[Exclude<VisualKind,'source'>,RegExp][]=[
 ['axon',/axonal transport|النقل المحوري|النقل الأمامي|النقل العكسي|kinesin|dynein/i],
 ['nmj',/neuromuscular junction|neuromuscular transmission|الوصلة العصبية العضلية|neuromuscular synapse/i],
 ['action-potential',/action potential|جهد الفعل|depolariz|repolariz|إزالة الاستقطاب|إعادة الاستقطاب/i]
];
export function visualKindFor(text:string):VisualKind{return rules.find(([,pattern])=>pattern.test(text))?.[0]||'source'}
/** Deterministic routing: no paid model call, no global lecture-title bias.
 * A specialized drawing must be supported by this scene's cited pages.
 * Fixed atlas anatomy is explicitly supplemental, never a source extraction.
 */
export function directVisual(context:string,sources:Source[]):VisualDecision{
 const wanted=visualKindFor(context);
 const pattern=rules.find(([kind])=>kind===wanted)?.[1];
 const cited=sources.filter(s=>pattern?.test(s.text+' '+(s.observations||[]).map(o=>o.text).join(' ')));
 const supported=wanted!=='source'&&cited.length>0;
 return {kind:supported?wanted:'source',sourceIds:(supported?cited:sources).map(s=>s.id),basis:supported?'additional':'lecture',generationCost:0,
 reason:supported?'نموذج تعليمي يوضح المفهوم المذكور في المصدر؛ تفاصيل الرسم توضيح إضافي.':'عرض الرسم الأصلي أو الخطوة الموثقة دون اختراع تشريح غير متاح.'};
}
