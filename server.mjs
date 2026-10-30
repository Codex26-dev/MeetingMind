import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)));
try { const raw=await readFile(resolve(ROOT,'.env'),'utf8'); for(const line of raw.split(/\r?\n/)){const m=line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);if(m&&!process.env[m[1]])process.env[m[1]]=m[2].replace(/^(['"])(.*)\1$/,'$2');} } catch {}
const PORT = Number(process.env.PORT || 4173);
const HOST = process.env.HOST || '127.0.0.1';
const PROVIDER = String(process.env.AI_PROVIDER || 'openai').toLowerCase();
const MODEL = process.env.AI_MODEL || (PROVIDER === 'ollama' ? 'qwen2.5:7b' : 'gpt-4.1-mini');
const MIME = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.json':'application/manifest+json; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon','.webmanifest':'application/manifest+json'};
const INSTRUCTIONS = 'You are MeetingMind, a friendly and professional personal secretary. Answer using only the user-provided context. Be concise, state when information is missing, and do not claim to perform actions. The app handles local reminders and drafts separately. Never claim to send messages, make payments, delete data, or start recording.';

async function readBody(req, limit=120_000) {
  let data=''; for await (const part of req) { data+=part; if(data.length>limit) throw new Error('Request is too large'); }
  return JSON.parse(data||'{}');
}
function json(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));}
async function askAI(message,context={}) {
  const prompt=`User request:\n${message}\n\nRelevant records approved for this request:\n${JSON.stringify(context).slice(0,60_000)}`;
  if(PROVIDER==='ollama'){
    const base=(process.env.OLLAMA_URL||'http://127.0.0.1:11434').replace(/\/$/,'');
    const response=await fetch(`${base}/api/chat`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:MODEL,stream:false,messages:[{role:'system',content:INSTRUCTIONS},{role:'user',content:prompt}]})});
    if(!response.ok)throw new Error(`Local model returned ${response.status}`);const data=await response.json();return data.message?.content||'';
  }
  const key=process.env.OPENAI_API_KEY;if(!key)throw new Error('OPENAI_API_KEY is not configured');
  const response=await fetch(process.env.OPENAI_API_URL||'https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({model:MODEL,instructions:INSTRUCTIONS,input:prompt,store:false})});
  if(!response.ok){const body=await response.text();throw new Error(`AI provider returned ${response.status}: ${body.slice(0,400)}`)}
  const data=await response.json();if(data.output_text)return data.output_text;
  return (data.output||[]).flatMap(item=>item.content||[]).filter(x=>x.type==='output_text').map(x=>x.text).join('\n');
}
const server=createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost');
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');res.setHeader('Permissions-Policy','microphone=(self), camera=(), geolocation=()');
  if(req.method==='GET'&&url.pathname.endsWith('/api/health'))return json(res,200,{ok:true,provider:PROVIDER,aiConfigured:PROVIDER==='ollama'||Boolean(process.env.OPENAI_API_KEY)});
  if(req.method==='POST'&&url.pathname.endsWith('/api/assistant')){
    try{const body=await readBody(req);if(typeof body.message!=='string'||!body.message.trim())return json(res,400,{error:'message is required'});if(PROVIDER==='openai'&&!process.env.OPENAI_API_KEY)return json(res,503,{error:'AI is not configured. Set OPENAI_API_KEY or choose AI_PROVIDER=ollama.'});const text=await askAI(body.message,body.context||{});return json(res,200,{text})}catch(e){return json(res,502,{error:e.message||'AI request failed'})}
  }
  if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405,{'Allow':'GET, HEAD'});return res.end('Method not allowed')}
  let path;try{path=decodeURIComponent(url.pathname)}catch{res.writeHead(400);return res.end('Bad path')}if(path.endsWith('/'))path+='index.html';let file=resolve(ROOT,`.${path}`);if(file!==ROOT&&!file.startsWith(ROOT+sep)){res.writeHead(403);return res.end('Forbidden')}const relative=file.slice(ROOT.length).split(sep).filter(Boolean);if(relative.some(part=>part.startsWith('.')||part==='node_modules')){res.writeHead(404);return res.end('Not found')}
  try{const info=await stat(file);if(!info.isFile())throw Error();const body=await readFile(file);res.writeHead(200,{'Content-Type':MIME[extname(file)]||'application/octet-stream','Cache-Control':path.endsWith('sw.js')?'no-cache':'public, max-age=300'});return res.end(req.method==='HEAD'?undefined:body)}catch{res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});return res.end('Not found')}
});
server.listen(PORT,HOST,()=>console.log(`MeetingMind available at http://${HOST}:${PORT}`));
