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
  const body=JSON.parse(opts.body);assert.equal(body.tools[0].type,'web_search');assert.equal(body.store,false);assert.equal(body.max_output_tokens,6000);assert.match(body.input[1].content,/Test claim/);
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
function structuredResult(assessment='CONTRADICTED'){
 const text=`[[ASSESSMENT]]\n${assessment}\n[[CORRECTION]]\nThe device uses USB-C.\n[[EVIDENCE]]\nManufacturer lists USB-C.\n[[UNCERTAINTY]]\nCharging speed was not checked.\n[[DRAFT]]\nThe device uses USB-C, according to the manufacturer.`;
 const annotations=['Manufacturer lists USB-C.','The device uses USB-C, according to the manufacturer.'].map(passage=>({type:'url_citation',url:'https://example.com/specs',title:'Official specs',start_index:text.indexOf(passage),end_index:text.indexOf(passage)+passage.length}));
 return {status:'completed',output:[{type:'web_search_call',status:'completed'},{type:'message',phase:'commentary',content:[{type:'output_text',text:'I will search now.'}]},{type:'message',phase:'final_answer',content:[{type:'output_text',text,annotations}]}]};
}
test('structured report uses final cited answer and separate short draft',()=>{
 for(const assessment of ['SUPPORTED','CONTRADICTED','INSUFFICIENT']){
  const parsed=parseResearch(structuredResult(assessment));
  assert.equal(parsed.report.assessment,assessment.toLowerCase());assert.equal(parsed.sources.length,1);
  assert.match(parsed.report.draft,/manufacturer\.\[1\]/);assert.doesNotMatch(parsed.text,/I will search/);
  assert.equal(parsed.report.correction,'The device uses USB-C.');
 }
});
test('incomplete formats and uncited drafts fall back without inventing verdicts',()=>{
 const missingDraft=structuredResult();missingDraft.output[2].content[0].annotations.pop();
 assert.equal(parseResearch(missingDraft).report,undefined);
 const badAssessment=structuredResult('DEFINITELY TRUE');assert.equal(parseResearch(badAssessment).report,undefined);
 const absentSearch=structuredResult();absentSearch.output.shift();assert.equal(parseResearch(absentSearch).grounded,false);
});
test('citations in commentary cannot ground an uncited final answer',()=>{
 const data=structuredResult();data.output[1]=result().output[1];data.output[1].phase='commentary';data.output[2].content[0].annotations=[];
 assert.equal(parseResearch(data).grounded,false);
});

test('distinguishes provider failures, timeouts and incomplete responses without leaking details',async()=>{
 for(const [status,code] of [[400,'META_REQUEST_REJECTED'],[422,'META_REQUEST_REJECTED'],[500,'META_SERVICE_ERROR'],[503,'META_SERVICE_ERROR'],[429,'META_RATE_LIMIT'],[402,'META_BILLING_ERROR']]){
  await assert.rejects(()=>researchClaim({claim:'x',lang:'en'},{apiKey:'test-secret',fetchImpl:async()=>new Response('private provider details',{status})}),{message:code});
 }
 await assert.rejects(()=>researchClaim({claim:'x',lang:'en'},{apiKey:'test-secret',fetchImpl:async()=>{throw new DOMException('private timeout details','TimeoutError');}}),{message:'META_TIMEOUT'});
 await assert.rejects(()=>researchClaim({claim:'x',lang:'en'},{apiKey:'test-secret',fetchImpl:async()=>Response.json(result({status:'incomplete'}))}),{message:'INCOMPLETE_RESEARCH'});
 await assert.rejects(()=>researchClaim({claim:'x',lang:'en'},{apiKey:'test-secret',fetchImpl:async()=>new Response('not JSON')}),{message:'META_INVALID_RESPONSE'});
});

function clarificationResult(text='[[NEEDS_CONTEXT]]\nWhich phone model do you mean, and which phones or battery test are you comparing it with?'){
 return {status:'completed',output:[{type:'message',phase:'final_answer',content:[{type:'output_text',text,annotations:[]}]}]};
}
test('missing context requests details without asserting a sourced conclusion',()=>{
 const parsed=parseResearch(clarificationResult());
 assert.equal(parsed.grounded,false);assert.equal(parsed.text,'');assert.deepEqual(parsed.sources,[]);assert.equal(parsed.report,undefined);
 assert.match(parsed.clarification,/Which phone model/);
 for(const text of ['[[NEEDS_CONTEXT]]','[[NEEDS_CONTEXT]] '+ 'x'.repeat(601),'[[NEEDS_CONTEXT]] https://example.com','[[NEEDS_CONTEXT]] Example [1]','[[NEEDS_CONTEXT]] Which model? [[DRAFT]] Something'])assert.equal(parseResearch(clarificationResult(text)).clarification,undefined);
 const partial=clarificationResult();partial.status='incomplete';assert.throws(()=>parseResearch(partial),/INCOMPLETE_RESEARCH/);
});
test('output exhaustion is distinguished from other unfinished responses',()=>{
 assert.throws(()=>parseResearch({status:'incomplete',incomplete_details:{reason:'max_output_tokens'}}),/META_OUTPUT_LIMIT/);
 assert.throws(()=>parseResearch({status:'incomplete',incomplete_details:{reason:'private reason'}}),/INCOMPLETE_RESEARCH/);
 assert.throws(()=>parseResearch(null),/META_INVALID_RESPONSE/);
});
test('HTTP returns clarification without fabricated grounding or sources',async()=>{
 let calls=0;const server=createServer({apiKey:'test-secret',fetchImpl:async()=>{calls++;return Response.json(clarificationResult());}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{
  const response=await fetch(`http://127.0.0.1:${server.address().port}/api/verify`,{method:'POST',body:JSON.stringify({claim:'This phone has the best battery life.',lang:'en'})});
  const data=await response.json();assert.equal(response.status,200);assert.equal(data.grounded,false);assert.match(data.clarification,/Which phone model/);assert.deepEqual(data.sources,[]);assert.equal(calls,1);
 }finally{await new Promise(resolve=>server.close(resolve));}
});
