import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createServer} from 'vite';
import react from '@vitejs/plugin-react';

test('Medical atlas renders a sourced comparison table, clinical warning, and mechanism flow',async()=>{
 const server=await createServer({configFile:false,appType:'custom',plugins:[react()],server:{middlewareMode:true}});
 try{
  const {MedicalAtlasLayouts}=await server.ssrLoadModule('/src/components/study/MedicalAtlasLayouts.tsx');
  const ids=['p4-t1'];
  const node={label:'Synapse',detail:'ACh binds receptor',source_item_ids_used:ids};
  const layouts=[
   {kind:'comparison_table',title:'NMJ comparison',columns:['Target','Role'],
    rows:[{cells:['ACh','Signal'],source_item_ids_used:ids}]},
   {kind:'classification_grid',title:'Nerve types',nodes:[node]},
   {kind:'flowchart',title:'NMJ mechanism',nodes:[node]},
   {kind:'tissue_layers',title:'Layers',nodes:[node]},
   {kind:'radial_map',title:'Bone remodeling',nodes:[node,node]},
   {kind:'hierarchy_tree',title:'Bone cells',nodes:[node,node]},
   {kind:'comparison_map',title:'Bone turnover',nodes:[node,node]}
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
  assert.match(html,/atlas-radial-map/);
  assert.match(html,/atlas-radial-links/);
  assert.match(html,/atlas-hierarchy-tree/);
  assert.match(html,/atlas-contrast-map/);
  assert.match(html,/MEDICAL NOTES \/ VISUAL LEARNING/);
  assert.match(html,/FIGURE 1/);
  assert.match(html,/Important lecture warning/);
  assert.match(html,/Clinical correlation/);
  assert.match(html,/Exam landmark/);
  assert.match(html,/صفحة 4/);
  assert.doesNotMatch(html,/<script/);
  const visual=renderToStaticMarkup(React.createElement(MedicalAtlasLayouts,{...props,view:'visual'}));
  assert.match(visual,/NMJ mechanism/);
  assert.match(visual,/Important lecture warning/);
 } finally{await server.close();}
});
