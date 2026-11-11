import {fileURLToPath} from 'node:url';
import {writeFile} from 'node:fs/promises';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
export default function pages() {
 let config;
 return {name:'asetemyt-pages',hooks:{
  'astro:config:setup':({config:initial,updateConfig,injectScript})=>{
   updateConfig({build:{client:initial.outDir,server:new URL('_worker.js/',initial.outDir),serverEntry:'index.js'},vite:{css:{postcss:{plugins:[tailwindcss(),autoprefixer()]}},ssr:{target:'webworker',noExternal:true}}});
   injectScript('page-ssr',`import ${JSON.stringify(fileURLToPath(new URL('../src/styles/tailwind.css',import.meta.url)))};`);
  },
  'astro:config:done':({config:resolved,setAdapter})=>{
   config=resolved;
   setAdapter({name:'asetemyt-pages',entrypointResolution:'auto',serverEntrypoint:fileURLToPath(new URL('./server.mjs',import.meta.url)),supportedAstroFeatures:{staticOutput:'stable',hybridOutput:'stable',serverOutput:'stable',sharpImageService:'unsupported',envGetSecret:'unsupported'},adapterFeatures:{buildOutput:'server'}});
  },
  'astro:build:done':async()=>{
   await writeFile(new URL('_routes.json',config.outDir),JSON.stringify({version:1,include:['/*'],exclude:['/_astro/*','/images/*','/favicon.ico','/favicon.png','/favicon.svg','/robots.txt','/ads.txt','/manifest.json']}));
  }
 }};
}
