import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from '../server.mjs';
function result({searched=true,url='https://example.com/product',status='completed'}={}){
 return {status,output:[...(searched?[{type:'web_search_call',status:'completed'}]:[]),{type:'message',content:[{type:'output_text',text:'The product is available.',annotations:[{type:'url_citation',url,title:'Manufacturer',start_index:0,end_index:25}]}]}]};
}
test('reuses successful identical research briefly, expires it, and never caches failures',async()=>{
 let calls=0,clock=0;
 const server=createServer({apiKey:'test',now:()=>clock,minIntervalMs:0,fetchImpl:async()=>{calls++;return Response.json(calls===3?{status:'completed',output:[]}:result());}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const verify=claim=>fetch(`http://127.0.0.1:${server.address().port}/api/verify`,{method:'POST',body:JSON.stringify({claim,lang:'en'})}).then(r=>r.json());
 try{
  assert.equal((await verify('same')).grounded,true);
  assert.equal((await verify('same')).grounded,true);assert.equal(calls,1);
  clock=300001;await verify('same');assert.equal(calls,2);
  assert.equal((await verify('other')).grounded,false);
  assert.equal((await verify('other')).grounded,true);assert.equal(calls,4);
 }finally{await new Promise(resolve=>server.close(resolve));}
});
