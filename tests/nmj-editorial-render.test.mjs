import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createServer} from 'vite';
import react from '@vitejs/plugin-react';

test('An NMJ editorial illustration shows only labels supported by its audited text',async()=>{
 const server=await createServer({configFile:false,appType:'custom',
   plugins:[react()],server:{middlewareMode:true}});
 try{
  const {SourceAwareNMJ}=await server.ssrLoadModule('/src/components/study/SourceAwareNMJ.tsx');
  const lesson={explanation:'Ca²⁺ enters the presynaptic terminal. ACh vesicles release acetylcholine, which binds Nm receptors.',
   source_quotes:['ACh vesicles','Ca²⁺'],visual:{labels:[],source_quotes:[]},
   clinical_layers:{mechanism:{steps:[]}}};
  const html=renderToStaticMarkup(React.createElement(SourceAwareNMJ,{lesson}));
  assert.match(html,/PRESYNAPTIC TERMINAL/);
  assert.match(html,/MUSCLE MEMBRANE/);
  assert.match(html,/Ca²⁺/);
  assert.match(html,/ACh receptors/);
  assert.match(html,/SCHEMATIC/);
  assert.match(html,/ليس|مقياسي/);
  const limited=renderToStaticMarkup(React.createElement(SourceAwareNMJ,{
   lesson:{explanation:'Signal between a motor neuron and muscle membrane.',
    source_quotes:[],visual:{labels:[],source_quotes:[]}}
  }));
  assert.doesNotMatch(limited,/>Ca²⁺</);
  assert.doesNotMatch(limited,/ACh receptors/);
  assert.doesNotMatch(limited,/>ACh</);
 }finally{await server.close();}
});
