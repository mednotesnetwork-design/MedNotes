import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import react from '@vitejs/plugin-react';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
test('Mechanism player displays supported steps and never fills omitted SR/contraction steps',async()=>{
 const vite=await createServer({configFile:false,appType:'custom',plugins:[react()],server:{middlewareMode:true}});
 try{
  const {MechanismPlayer,mechanismSteps}=await vite.ssrLoadModule('/src/components/study/MechanismPlayer.tsx');
  const source='Neuromuscular junction. An action potential reaches the nerve terminal. Calcium enters the terminal. Acetylcholine is released. Acetylcholine binds receptors.';
  const steps=mechanismSteps(source);
  assert.deepEqual(steps.map(s=>s.id),['arrival','influx','release','receptor']);
  assert.ok(steps.every(s=>source.includes(s.quote)));
  const html=renderToStaticMarkup(React.createElement(MechanismPlayer,{source}));
  assert.match(html,/تشغيل المحاكاة/);assert.match(html,/STEP/);assert.match(html,/Nerve terminal/);
  assert.doesNotMatch(html,/Sarcoplasmic reticulum/);
  assert.equal(renderToStaticMarkup(React.createElement(MechanismPlayer,{source:'Bone remodeling.'})), '');
  assert.equal(mechanismSteps('Acetylcholine release is blocked.').length,0);
 }finally{await vite.close();}
});
