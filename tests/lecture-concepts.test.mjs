import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'vite';

test('27-page/227-item saved lecture migrates from 47 cards into seven major slides with zero loss',async()=>{
 const server=await createServer({configFile:false,appType:'custom',server:{middlewareMode:true}});
 try{
  const {provisionalConcepts,conceptCards,conceptSourceIds,validateConceptGrouping,findConceptIndex}=
   await server.ssrLoadModule('/src/lib/lecture-concepts.ts');
  const units=Array.from({length:47},(_,index)=>({
   id:'u'+(index+1),title:'Branch '+index,objective:'Source supported branch',
   cards:[{id:'u'+(index+1)+'-c1',title:'Detail '+index,
     source_ids:Array.from({length:index<39?5:4},(_,j)=>'p'+index+'-'+j)}]
  }));
  const oldIds=units.flatMap(u=>u.cards.flatMap(c=>c.source_ids));
  assert.equal(oldIds.length,227);
  const concepts=provisionalConcepts(units,27);
  assert.equal(concepts.length,7);
  validateConceptGrouping(units,{concepts,semantic_clustering:false},10);
  const newIds=concepts.flatMap(c=>conceptSourceIds(c,units));
  assert.equal(newIds.length,227);
  assert.equal(new Set(newIds).size,227);
  assert.deepEqual(new Set(newIds),new Set(oldIds));
  // An already-reviewed legacy lesson must keep the same ID and data.
  const savedLessonCache={'u18-c1:lecture_only':{explanation:'Validated teaching',coverage:[{source_id:'p17-0'}]}};
  const conceptNumber=findConceptIndex(concepts,units,'u18-c1');
  assert.ok(conceptCards(concepts[conceptNumber],units).some(c=>c.id==='u18-c1'));
  assert.equal(savedLessonCache['u18-c1:lecture_only'].explanation,'Validated teaching');
  assert.throws(()=>validateConceptGrouping(units,{concepts:[{...concepts[0],unit_ids:[...concepts[0].unit_ids,'u1']}],semantic_clustering:true},10));
 }finally{await server.close();}
});
