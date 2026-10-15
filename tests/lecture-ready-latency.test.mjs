import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('Lecture becomes ready after source mapping and concept grouping; teaching is on demand',async()=>{
 const source=await readFile('src/components/study/LectureCourse.tsx','utf8');
 const start=source.indexOf('async function organize(signal:AbortSignal)');
 const end=source.indexOf('async function openFile(',start);
 assert.ok(start>0&&end>start,'Expected lecture organizer exists');
 const organize=source.slice(start,end);
 assert.match(organize,/await consolidateConcepts\(signal\)/);
 assert.match(organize,/await save\(\{\.\.\.current\.current,phase:'ready'\}\)/);
 assert.doesNotMatch(organize,/await teachConceptOverview\(signal\)/);
 assert.doesNotMatch(organize,/await teach\(signal\)/);
 const grouping=source.slice(source.indexOf('async function consolidateConcepts('),start);
 assert.match(grouping,/\.slice\(0,900\)/);
 assert.ok(source.includes('async function teachConceptOverview('),'Explicit expert teaching available');
});
