import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from '../server.mjs';
const code='private-demo-code-for-tests';
const input={claim:'The iPhone 15 uses USB-C.',lang:'en'};
async function start(t,options){
 const server=createServer(options);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 t.after(()=>new Promise(resolve=>server.close(resolve)));
 const base=`http://127.0.0.1:${server.address().port}`;
 return {base,post:(value=code)=>fetch(base+'/api/verify',{method:'POST',headers:{'Content-Type':'application/json',...(value===null?{}:{'X-Werify-Access-Code':value})},body:JSON.stringify(input)})};
}
test('hosted live access fails closed without a code; public example assets remain available',async t=>{
 let calls=0;const {base,post}=await start(t,{apiKey:'fake',requireAccessCode:true,fetchImpl:async()=>{calls++;throw Error('must not call');}});
 const response=await post();assert.equal(response.status,503);assert.equal((await response.json()).error,'ACCESS_NOT_CONFIGURED');assert.equal(calls,0);
 const health=await (await fetch(base+'/api/health')).json();assert.equal(health.liveVerification,false);assert.equal(health.accessCodeRequired,true);
 assert.equal((await fetch(base+'/')).status,200);
});
test('unauthorized submissions never contact Meta or consume the allowance; codes are not exposed',async t=>{
 let calls=0;const {base,post}=await start(t,{apiKey:'fake',accessCode:code,maxRequests:1,fetchImpl:async()=>{calls++;return Response.json({},{status:500});}});
 for(const value of [null,'wrong','x'.repeat(257)]){const r=await post(value);assert.equal(r.status,401);assert.equal((await r.json()).error,'ACCESS_CODE_REQUIRED');}
 assert.equal(calls,0);
 const health=await (await fetch(base+'/api/health')).text();assert.ok(!health.includes(code));assert.equal(JSON.parse(health).liveVerification,true);
 assert.equal((await post()).status,502);assert.equal(calls,1);
 assert.equal((await (await post()).json()).error,'DEMO_USAGE_LIMIT');assert.equal(calls,1);
});
test('global interval blocks rapid attempts and allows the next attempt after cooldown',async t=>{
 let clock=0,calls=0;const {post}=await start(t,{apiKey:'fake',accessCode:code,now:()=>clock,fetchImpl:async()=>{calls++;return Response.json({},{status:500});}});
 assert.equal((await post()).status,502);
 const limited=await post();assert.equal(limited.status,429);assert.equal(limited.headers.get('retry-after'),'10');assert.equal((await limited.json()).error,'DEMO_RATE_LIMIT');assert.equal(calls,1);
 clock=10000;assert.equal((await post()).status,502);assert.equal(calls,2);
});
test('concurrent calls are blocked even after the interval; failures count toward the limit',async t=>{
 let clock=0,calls=0,release;const started=new Promise(resolve=>{release=resolve;});let finish;
 const pendingResponse=new Promise(resolve=>{finish=resolve;});
 const {post}=await start(t,{apiKey:'fake',accessCode:code,now:()=>clock,maxRequests:2,fetchImpl:async()=>{calls++;release();return pendingResponse;}});
 const first=post();await started;clock=20000;
 const second=await post();assert.equal((await second.json()).error,'DEMO_RATE_LIMIT');assert.equal(calls,1);
 finish(Response.json({},{status:500}));assert.equal((await first).status,502);
 assert.equal((await post()).status,502);assert.equal(calls,2);
 assert.equal((await (await post()).json()).error,'DEMO_USAGE_LIMIT');
});
test('invalid input and cross-origin submissions never contact Meta',async t=>{
 let calls=0;const {base}=await start(t,{apiKey:'fake',accessCode:code,fetchImpl:async()=>{calls++;throw Error('must not call');}});
 for(const [body,origin,status] of [['{',null,400],[JSON.stringify(input),'https://other.example',403]]){
  const r=await fetch(base+'/api/verify',{method:'POST',headers:{'X-Werify-Access-Code':code,...(origin?{Origin:origin}:{})},body});assert.equal(r.status,status);
 }
 assert.equal(calls,0);
});
test('short configured codes are refused at startup',()=>{assert.throws(()=>createServer({accessCode:'short'}),/16 to 256/);});
