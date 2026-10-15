import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';
export default defineConfig({plugins:[react(),tailwindcss()],resolve:{alias:{'@':path.resolve(import.meta.dirname,'src'),'@atlas':path.resolve(import.meta.dirname,'atlas'),'@workspace/api-client-react':path.resolve(import.meta.dirname,'src/lib/api-client.ts')},dedupe:['react','react-dom']},build:{outDir:'dist',rollupOptions:{input:{main:path.resolve(import.meta.dirname,'index.html'),atlas:path.resolve(import.meta.dirname,'atlas.html')}}},server:{host:'0.0.0.0',port:5173}});
