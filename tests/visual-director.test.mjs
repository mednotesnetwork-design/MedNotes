import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
test('visual director uses scene citations, never unrelated chapter keywords or paid requests',async()=>{
 const vite=await createServer({configFile:false,appType:'custom',server:{middlewareMode:true,hmr:false}});
 try{
 const {directVisual}=await vite.ssrLoadModule('/src/components/studio/visual-director.ts');
 const page={id:'s1',page:1,title:'Lecture',text:'Axonal transport uses kinesin.',warnings:[]};
 assert.equal(directVisual('Axonal transport',[page]).kind,'axon');
 assert.equal(directVisual('Axonal transport',[page]).generationCost,0);
 assert.equal(directVisual('Axonal transport',[page]).basis,'additional');
 assert.equal(directVisual('Bone fractures',[page]).kind,'source');
 assert.equal(directVisual('Neuromuscular junction',[page]).kind,'source');
 assert.equal(directVisual('Axonal transport',[]).kind,'source');
 }finally{await vite.close()}
});
test('media library reuses fetches, rejects unsafe URLs, and does not cache network failure',async()=>{
 const vite=await createServer({configFile:false,appType:'custom',server:{middlewareMode:true,hmr:false}});const original=globalThis.fetch;let calls=0;
 try{
 const {findSharedMedia}=await vite.ssrLoadModule('/src/lib/shared-learning.ts');
 globalThis.fetch=async()=>{calls++;return {ok:true,json:async()=>({media:[{id:'ok',kind:'video',url:'https://cdn.example.org/film.mp4'},{id:'bad',kind:'image',url:'javascript:alert(1)'}]})}};
 const [a,b]=await Promise.all([findSharedMedia('anaphylaxis'),findSharedMedia('anaphylaxis')]);assert.equal(calls,1);assert.equal(a.length,1);assert.equal(b[0].id,'ok');
 await findSharedMedia('anaphylaxis');assert.equal(calls,1);
 globalThis.fetch=async()=>{calls++;throw Error('offline')};await findSharedMedia('fracture');await findSharedMedia('fracture');assert.equal(calls,3);
 }finally{globalThis.fetch=original;await vite.close()}
});
