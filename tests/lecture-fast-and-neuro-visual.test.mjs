import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';

test('Fast literal PDF extraction retains all text and builds fully traced source cards without Gemini',async()=>{
 const vite=await createServer({configFile:false,appType:'custom',server:{middlewareMode:true}});
 try{
  const {extractTextPoints,buildFastSourcePlan}=await vite.ssrLoadModule('/src/lib/lecture-fast.ts');
  const pages=Array.from({length:43},(_,index)=>{
   const page=index+1,text=`Neurons and Action Potential — Page ${page}\n`+
    'Resting membrane potential. Depolarization and repolarization. Sodium and potassium channels. '.repeat(23);
   return {number:page,text,points:extractTextPoints(page,text)};
  });
  for(const page of pages){
   assert.equal(page.points.map(p=>p.text).join(''),page.text);
   assert.ok(page.points.every(p=>p.page_number===page.number&&p.item_id===p.id&&p.source_ref.includes('page:'+page.number)));
  }
  const plan=buildFastSourcePlan(pages,'Neurons & Their Action Potential');
  assert.equal(plan.units.length,43);
  const original=pages.flatMap(p=>p.points.map(x=>x.id));
  const assigned=plan.units.flatMap(u=>u.cards.flatMap(c=>c.source_ids));
  assert.equal(original.length,assigned.length);
  assert.deepEqual(new Set(original),new Set(assigned));
  assert.ok(plan.units.every(u=>u.cards.every(c=>c.source_ids.length>=1&&c.source_ids.length<=8)));
 }finally{await vite.close();}
});

test('Interactive neuron and action potential diagrams show verified terms but not unsupported measurements',async()=>{
 const vite=await createServer({configFile:false,appType:'custom',server:{middlewareMode:true}});
 try{
  const {availableNeuroFigures,NeuroVisualLab}=await vite.ssrLoadModule('/src/components/study/NeuroVisualLab.tsx');
  const lesson={
   explanation:'Neurons contain dendrites, a cell body, an axon and myelin. Action potential follows resting potential, depolarization, repolarization and hyperpolarization. Sodium and potassium channels.',
   mechanism:[{label:'Depolarization',detail:'Membrane depolarization occurs after the resting state.',source_quote:''}],
   source_quotes:['Action potential and depolarization.'],
   visual:{kind:'sequence',title:'Neural membrane',labels:[],source_quotes:[]}
  };
  const available=availableNeuroFigures(lesson,lesson.explanation);
  assert.equal(available.potential,true);assert.equal(available.neuron,true);
  const html=renderToStaticMarkup(React.createElement(NeuroVisualLab,{lesson,slide:lesson.explanation}));
  assert.match(html,/Action Potential/);
  assert.match(html,/Membrane potential/);
  assert.match(html,/Sodium/);
  assert.match(html,/Resting potential/);
  assert.match(html,/<svg/);
  assert.doesNotMatch(html,/−70 mV|−55 mV|\+30 mV/);
  const absent=availableNeuroFigures({...lesson,explanation:'Glycogen is a carbohydrate',mechanism:[],source_quotes:[],visual:{kind:'none',labels:[]}},'Glycogen');
  assert.equal(absent.potential,false);
  assert.equal(absent.neuron,false);
 }finally{await vite.close();}
});
