import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseResearch,researchClaim} from '../meta.mjs';
import {createServer} from '../server.mjs';
function result({searched=true,url='https://example.com/product',status='completed'}={}){
 return {status,output:[...(searched?[{type:'web_search_call',status:'completed'}]:[]),{type:'message',content:[{type:'output_text',text:'The product is available.',annotations:[{type:'url_citation',url,title:'Manufacturer',start_index:0,end_index:25}]}]}]};
}
test('preserves native citations and inserts numbered markers',()=>{
 const data=parseResearch(result());assert.equal(data.grounded,true);assert.equal(data.text,'The product is available.[1]');assert.equal(data.sources[0].passage,'The product is available.');
});
test('requires both an actual search and safe citation annotations',()=>{
 for(const data of [result({searched:false}),result({url:'javascript:alert(1)'}),{output:[]}])assert.deepEqual(parseResearch(data),{grounded:false,sources:[],text:''});
 const data=result();data.output[1].content[0].annotations[0].end_index=999;assert.equal(parseResearch(data).grounded,false);
 assert.throws(()=>parseResearch(result({status:'incomplete'})),/INCOMPLETE_RESEARCH/);
});
test('Meta requests use server-only auth, web search, token bound and no storage',async()=>{
 let calls=0;
 const data=await researchClaim({claim:'Test claim',lang:'en'},{apiKey:'test-secret',fetchImpl:async(url,opts)=>{
  calls++;assert.equal(url,'https://api.meta.ai/v1/responses');assert.equal(opts.headers.Authorization,'Bearer test-secret');
  const body=JSON.parse(opts.body);assert.equal(body.tools[0].type,'web_search');assert.equal(body.store,false);assert.equal(body.max_output_tokens,3000);assert.match(body.input[1].content,/Test claim/);
  return Response.json(result());
 }});
 assert.equal(calls,1);assert.equal(data.grounded,true);assert.equal(JSON.stringify(data).includes('test-secret'),false);
});
test('provider errors never leak response bodies or keys',async()=>{
 await assert.rejects(()=>researchClaim({claim:'x',lang:'en'},{apiKey:'test-secret',fetchImpl:async()=>new Response('secret upstream details',{status:401})}),{message:'META_AUTH_ERROR'});
 await assert.rejects(()=>researchClaim({claim:'x',lang:'en'},{apiKey:'test-secret',fetchImpl:async()=>{throw new Error('test-secret');}}),{message:'META_UNREACHABLE'});
});
test('HTTP integration returns research and rejects cross-origin paid requests',async()=>{
 let calls=0;const server=createServer({apiKey:'test-secret',fetchImpl:async()=>{calls++;return Response.json(result());}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${server.address().port}`;
 try{
  const opts={method:'POST',body:JSON.stringify({claim:'Test',lang:'en'})};
  const good=await fetch(base+'/api/verify',opts);assert.equal(good.status,200);assert.equal((await good.json()).grounded,true);
  const bad=await fetch(base+'/api/verify',{...opts,headers:{Origin:'https://evil.example'}});assert.equal(bad.status,403);assert.equal(calls,1);
 }finally{await new Promise(resolve=>server.close(resolve));}
});
