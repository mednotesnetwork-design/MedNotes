import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {build} from 'esbuild';

test('Medical atlas renders a sourced comparison table, clinical warning, and mechanism flow',async()=>{
 const temp=await mkdtemp(join(process.cwd(),'.atlas-test-'));
 try{
  const output=join(temp,'render.mjs');
  await build({entryPoints:['src/components/study/MedicalAtlasLayouts.tsx'],outfile:output,
    bundle:true,platform:'node',format:'esm',packages:'external',jsx:'automatic',logLevel:'silent'});
  const {MedicalAtlasLayouts}=await import(pathToFileURL(output).href);
  const ids=['p4-t1'];
  const node={label:'Synapse',detail:'ACh binds receptor',source_item_ids_used:ids};
  const layouts=[
   {kind:'comparison_table',title:'NMJ comparison',columns:['Target','Role'],
    rows:[{cells:['ACh','Signal'],source_item_ids_used:ids}]},
   {kind:'classification_grid',title:'Nerve types',nodes:[node]},
   {kind:'flowchart',title:'NMJ mechanism',nodes:[node]},
   {kind:'tissue_layers',title:'Layers',nodes:[node]}
  ];
  const callouts=[{kind:'warning',text:'Important lecture warning',source_item_ids_used:ids},
    {kind:'clinical',text:'Clinical correlation',source_item_ids_used:ids},
    {kind:'high_yield',text:'Exam landmark',source_item_ids_used:ids}];
  const props={layouts,callouts,view:'explain',
   registry:[{item_id:'p4-t1',page_number:4,source_ref:'lecture:page:4:item:p4-t1',content_type:'text'}]};
  const html=renderToStaticMarkup(React.createElement(MedicalAtlasLayouts,props));
  assert.match(html,/<table/);
  assert.match(html,/<th/);
  assert.match(html,/NMJ comparison/);
  assert.match(html,/atlas-flow-nodes/);
  assert.match(html,/atlas-classification-grid/);
  assert.match(html,/atlas-tissue-nodes/);
  assert.match(html,/Important lecture warning/);
  assert.match(html,/Clinical correlation/);
  assert.match(html,/Exam landmark/);
  assert.match(html,/صفحة 4/);
  assert.doesNotMatch(html,/<script/);
  const visual=renderToStaticMarkup(React.createElement(MedicalAtlasLayouts,{...props,view:'visual'}));
  assert.match(visual,/NMJ mechanism/);
  assert.doesNotMatch(visual,/Important lecture warning/);
 } finally{await rm(temp,{recursive:true,force:true});}
});
