import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.json':'application/json'};
http.createServer((req,res)=>{
  let file;
  try { file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname)); } catch {res.writeHead(400).end();return;}
  if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  if(file===root)file=path.join(root,'index.html');
  fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end('Not found');return;}res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(data);});
}).listen(4173,'127.0.0.1',()=>console.log('Warrior lab http://127.0.0.1:4173'));
