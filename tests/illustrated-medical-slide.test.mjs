import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createServer} from 'vite';
import react from '@vitejs/plugin-react';

test('Professional NMJ illustration renders prominently with verified license, teaching phases and source references',async()=>{
 const vite=await createServer({configFile:false,appType:'custom',plugins:[react()],server:{middlewareMode:true}});
 try{
  const {IllustratedMedicalSlide,findTeachingFigure}=await vite.ssrLoadModule('/src/components/study/IllustratedMedicalSlide.tsx');
  const lesson={
   source_mode:'lecture',explanation:'A neuromuscular junction is where a motor neuron communicates with muscle.',
   clinical_layers:{core_concept:{text:'The nerve signal reaches a muscle.',source_item_ids_used:['p4-t1']},
    mechanism:{steps:[{text:'The action potential arrives at the presynaptic terminal.',source_item_ids_used:['p4-t1']},
      {text:'Acetylcholine binds receptors at the motor end plate.',source_item_ids_used:['p5-t1']}]},
    clinical_correlation:{text:'',source_item_ids_used:[]},visual_cues:[]},
   source_registry:[{item_id:'p4-t1',page_number:4,source_ref:'lecture:page:4:item:p4-t1',content_type:'text'}],
   mechanism:[],source_quotes:[],questions:[{question:'What binds the receptor?',options:['ACh','Calcium'],
    correct_index:0,explanations:['Correct','Incorrect'],source_quote:'ACh'}],
   high_yield:['ACh binds the nicotinic receptor.'],
   clinical_connection:{text:'Receptor blockers can impair transmission.',basis:'lecture',source_quote:'lecture'}
  };
  assert.equal(findTeachingFigure('neuromuscular junction')?.license,'CC BY 4.0');
  assert.equal(findTeachingFigure('cardiac myocardium'),undefined);
  assert.ok(findTeachingFigure('Neuron dendrites and axon'));
  const html=renderToStaticMarkup(React.createElement(IllustratedMedicalSlide,{
    lesson,slide:'Neuromuscular junction and acetylcholine release',anatomyAvailable:true,
    onToolSelect:()=>{}
  }));
  assert.match(html,/Neuro_Muscular_Junction\.png/);
  assert.match(html,/alt="Neuromuscular junction/);
  assert.match(html,/creativecommons\.org\/licenses\/by\/4\.0/);
  assert.match(html,/Doctor Jana/);
  assert.match(html,/ACh binds the nicotinic receptor/);
  assert.match(html,/The nerve signal reaches a muscle/);
  assert.match(html,/quiz|افتحي السؤال والخيارات/i);
  assert.match(html,/فتح أطلس 3D/);
  assert.match(html,/p4-t1/);
  assert.doesNotMatch(html,/<iframe/);
  assert.doesNotMatch(html,/<video/);
 }finally{await vite.close();}
});

test('Uploaded lecture page is never misrepresented as curated external anatomy',async()=>{
 const vite=await createServer({configFile:false,appType:'custom',plugins:[react()],server:{middlewareMode:true}});
 try{
  const {IllustratedMedicalSlide}=await vite.ssrLoadModule('/src/components/study/IllustratedMedicalSlide.tsx');
  const lesson={explanation:'Cartilage',mechanism:[],clinical_layers:undefined,source_registry:[],
   source_quotes:[],questions:[],high_yield:[]};
  const html=renderToStaticMarkup(React.createElement(IllustratedMedicalSlide,{
   lesson,slide:'Articular cartilage',sourceImages:[{page:7,image:'data:image/png;base64,iVBORw0KGgo='}]
  }));
  assert.match(html,/Original uploaded lecture/);
  assert.match(html,/Page 7/);
  assert.doesNotMatch(html,/Doctor Jana/);
  assert.doesNotMatch(html,/video/);
 }finally{await vite.close();}
});
