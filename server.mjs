import http from 'node:http';
import {loadEnvFile} from 'node:process';
import {researchClaim} from './meta.mjs';
try{loadEnvFile(fileURLToPath(new URL('./.env',import.meta.url)));}catch(error){if(error.code!=='ENOENT')throw error;}
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve, sep, extname} from 'node:path';

const root = fileURLToPath(new URL('./public/', import.meta.url));
const types = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml'};
function json(res,status,value){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value));}
export function createServer({apiKey=process.env.MODEL_API_KEY,fetchImpl=fetch}={}){let active=false;return http.createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Referrer-Policy','no-referrer');
  res.setHeader('Content-Security-Policy',"default-src 'self'; img-src 'self' blob: data:; style-src 'self'; script-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
  try {
    const url = new URL(req.url,'http://localhost');
    if(url.pathname==='/api/health' && req.method==='GET') return json(res,200,{status:'ok',liveVerification:Boolean(apiKey),version:'0.2.0'});
    if(url.pathname==='/api/verify' && req.method==='POST') {
      let body='';
      for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>8192)return json(res,413,{error:'INPUT_TOO_LARGE'});}
      let input;try{input=JSON.parse(body);}catch{return json(res,400,{error:'INVALID_JSON'});}
      if(!input || typeof input.claim!=='string' || !input.claim.trim() || input.claim.length>1000 || !['fr','en','es'].includes(input.lang))return json(res,400,{error:'INVALID_INPUT'});
      const origin=req.headers.origin;
      if(origin && origin!==`http://${req.headers.host}` && origin!==`https://${req.headers.host}`)return json(res,403,{error:'FORBIDDEN'});
      if(active)return json(res,429,{error:'META_RATE_LIMIT'});
      active=true;
      try{return json(res,200,await researchClaim(input,{apiKey,fetchImpl}));}
      catch(error){return json(res,error.status||502,{error:error.code||'META_REQUEST_FAILED'});}
      finally{active=false;}
    }
    if(url.pathname.startsWith('/api/'))return json(res,404,{error:'NOT_FOUND'});
    if(!['GET','HEAD'].includes(req.method))return json(res,405,{error:'METHOD_NOT_ALLOWED'});
    const pathname=decodeURIComponent(url.pathname);
    const file=resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
    if(!file.startsWith(root.endsWith(sep)?root:root+sep))return json(res,403,{error:'FORBIDDEN'});
    const data=await readFile(file);
    res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});
    res.end(req.method==='HEAD'?undefined:data);
  } catch(error){json(res,error.code==='ENOENT'||error.code==='EISDIR'?404:400,{error:'REQUEST_FAILED'});}
});}
if(process.argv[1]===fileURLToPath(import.meta.url)) {
  const port=Number(process.env.PORT||3000);
  createServer().listen(port,process.env.HOST||'127.0.0.1',()=>console.log(`Wérify running at http://localhost:${port}`));
}
