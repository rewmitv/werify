import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createServer} from '../server.mjs';
import {translations} from '../public/i18n.js';
const server=createServer();let base;
before(async()=>{await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));base=`http://127.0.0.1:${server.address().port}`;});
after(()=>new Promise(resolve=>server.close(resolve)));
test('serves the UI and its local assets without dependencies',async()=>{
 for(const path of ['/','/app.js','/i18n.js','/styles.css']){const r=await fetch(base+path);assert.equal(r.status,200,path);assert.ok(r.headers.get('content-security-policy'));}
});
test('health accurately reports that verification is not connected',async()=>{const r=await fetch(base+'/api/health');assert.equal((await r.json()).liveVerification,false);});
test('real claims never receive a fabricated verdict',async()=>{
 const r=await fetch(base+'/api/verify',{method:'POST',body:JSON.stringify({claim:'A new rule starts tomorrow',lang:'en'})});
 assert.equal(r.status,503);assert.deepEqual(await r.json(),{error:'VERIFICATION_NOT_CONFIGURED'});
});
test('rejects empty input, unsupported locale, malformed JSON and oversized bodies',async()=>{
 for(const body of [JSON.stringify({claim:' ',lang:'en'}),JSON.stringify({claim:'x',lang:'zz'}),'null','{']){const r=await fetch(base+'/api/verify',{method:'POST',body});assert.equal(r.status,400);}
 const r=await fetch(base+'/api/verify',{method:'POST',body:'a'.repeat(9000)});assert.equal(r.status,413);
});
test('server does not expose source files or credentials',async()=>{
 for(const path of ['/.env','/server.mjs','/package.json','/tests/server.test.mjs']){const r=await fetch(base+path);assert.equal(r.status,404,path);}
});
test('every UI translation exists in all three languages',async()=>{
 const keys=Object.keys(translations.fr).sort();
 for(const lang of ['en','es']){assert.deepEqual(Object.keys(translations[lang]).sort(),keys);for(const key of keys)assert.ok(translations[lang][key].trim());}
 const html=await readFile(new URL('../public/index.html',import.meta.url),'utf8');
 for(const [,key] of html.matchAll(/data-t="([^"]+)"/g))assert.ok(translations.fr[key],key);
});
