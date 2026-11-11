import {defineConfig} from 'astro/config';
import {createHash} from 'node:crypto';
import {readFileSync,readdirSync} from 'node:fs';
import pages from './adapter/pages.mjs';
// HTML contains hashed asset URLs. Never reuse it across builds or hosts.
const hash=createHash('sha256');
for(const root of ['src','adapter'])for(const file of readdirSync(new URL('./'+root+'/',import.meta.url),{recursive:true,withFileTypes:true}).filter(x=>x.isFile()).map(x=>x.parentPath+'/'+x.name).sort())hash.update(file.split('/'+root+'/').pop()).update(readFileSync(file));
for(const file of ['package-lock.json','astro.config.mjs','tailwind.config.mjs']){try{hash.update(readFileSync(new URL('./'+file,import.meta.url)));}catch{}}
const htmlBuild=hash.digest('hex').slice(0,20);
export default defineConfig({output:'server',adapter:pages(),image:{service:{entrypoint:'astro/assets/services/noop'}},vite:{define:{'import.meta.env.ASETEMYT_HTML_BUILD':JSON.stringify(htmlBuild)}}});
