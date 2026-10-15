import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {zipSync,strToU8} from 'fflate';
test('Lecture backup restores source coverage and progress but never remote tokens or external images',async()=>{
 const vite=await createServer({configFile:false,appType:'custom',server:{middlewareMode:true,hmr:false}});
 try{
  const {decodeLectureArchive}=await vite.ssrLoadModule('/src/lib/lecture-archive.ts');
  const course={name:'Lecture.pdf',pages:[{number:1,text:'Source fact.',points:[{id:'p1-t1',page:1,kind:'text',text:'Source fact.',origin:'text'}]}],plan:{title:'Lecture',units:[{id:'u1',title:'Concept',objective:'Understand',cards:[{id:'u1-c1',title:'Fact',source_ids:['p1-t1']}]}]},concepts:[{id:'c1',title:'Concept',objective:'Understand',unit_ids:['u1']}],active:0,mode:'lecture_only',lessons:{},turns:{},answers:{'u1-c1:0':1},notes:{'u1-c1':'My note'},remote:{token:'must-not-be-restored'}};
  const archive=(c)=>zipSync({'manifest.json':strToU8(JSON.stringify({format:'mednote-lecture',version:1})),'course.json':strToU8(JSON.stringify(c))});
  const result=decodeLectureArchive(archive(course));
  assert.equal(result.course.notes['u1-c1'],'My note');assert.equal(result.course.answers['u1-c1:0'],1);
  assert.equal(result.course.remote,undefined);assert.equal(result.course.pages[0].points[0].text,'Source fact.');
  assert.notEqual(result.course.id,decodeLectureArchive(archive(course)).course.id);
  assert.throws(()=>decodeLectureArchive(archive({...course,pages:[{...course.pages[0],image:'https://example.com/tracker.png'}]})));
  assert.throws(()=>decodeLectureArchive(archive({...course,pages:[]})));
  assert.throws(()=>decodeLectureArchive(archive({...course,ingestComplete:false})));
  assert.throws(()=>decodeLectureArchive(archive({...course,pages:[course.pages[0],course.pages[0]]})));
 }finally{await vite.close();}
});
