import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

/** Regression for the real incident: 227 points were planned, but the
 * three-column deck displaced its only content panel outside the iPhone viewport. */
test('The sole lecture panel stays in the visible 100%-wide Safari viewport',async()=>{
 const css=await readFile('src/study.css','utf8');
 const source=await readFile('src/components/study/LectureCourse.tsx','utf8');
 const rule=css.match(/\.course-swipe-track\{[^}]+\}/g)?.find(text=>text.includes('will-change:transform'))||'';
 assert.match(rule,/width:100%/);
 assert.match(rule,/display:block/);
 assert.match(rule,/translate3d\(var\(--drag-x,0px\),0,0\)/);
 assert.doesNotMatch(rule,/width:300%|grid-template-columns:repeat\(3|33\.33333%/);
 assert.match(source,/className="course-swipe-track"/);
 assert.match(source,/course-slide-panel course-slide-motion-/);
 assert.doesNotMatch(source,/course-slide-preview/);
 assert.match(source,/onTouchStart=\{onSlideTouchStart\}/);
 assert.match(source,/onTouchEnd=\{onSlideTouchEnd\}/);
 assert.match(source,/aria-label=\{\x60مفهوم/);
});

test('Unreviewed slides show original source and explicit actionable status, never empty space',async()=>{
 const source=await readFile('src/components/study/LectureCourse.tsx','utf8');
 const lesson=await readFile('src/components/study/LessonJourney.tsx','utf8');
 assert.match(source,/className="course-pending-lesson"/);
 assert.match(source,/role="status" aria-label="حالة إنشاء سلايد الشرح"/);
 assert.match(source,/إنشاء شرح هذا السلايد/);
 assert.match(source,/cardPoints\.map\(p=><div key=\{p\.id\}/);
 assert.match(source,/إنشاء ومراجعة/);
 assert.match(lesson,/ClinicalTeachingLayers/);
 assert.doesNotMatch(lesson,/\(!showExplain\|\|!hasOpening\|\|revealed\)/);
});
