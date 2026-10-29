// Publish only compiled static assets. Credentials remain in memory.
import {execFileSync} from 'node:child_process';
import {readFileSync,readdirSync} from 'node:fs';
import {resolve,relative,join} from 'node:path';
const owner='trocki59-byte',repo='TEKEL',root=resolve('outputs/pages');
const raw=execFileSync('git',['credential','fill'],{input:'protocol=https\nhost=github.com\n\n',encoding:'utf8',env:{...process.env,GIT_TERMINAL_PROMPT:'0',GCM_INTERACTIVE:'never'},stdio:['pipe','pipe','pipe']});
const credential=Object.fromEntries(raw.trim().split('\n').map(x=>{const i=x.indexOf('=');return[x.slice(0,i),x.slice(i+1)];}));
const headers={Authorization:'Bearer '+credential.password,'User-Agent':'TEKEL-Pages',Accept:'application/vnd.github+json','Content-Type':'application/json','X-GitHub-Api-Version':'2022-11-28'};
async function api(path,method='GET',body){
 const r=await fetch('https://api.github.com'+path,{method,headers,body:body?JSON.stringify(body):undefined});
 const data=await r.json();if(!r.ok)throw Object.assign(new Error(`${method} ${path}: ${r.status} ${data.message}`),{status:r.status});return data;
}
const user=await api('/user');if(user.login!==owner)throw new Error('GitHub hesabı eşleşmiyor.');
const base=`/repos/${owner}/${repo}`;
let parent;try{parent=(await api(base+'/git/ref/heads/gh-pages')).object.sha;}catch(e){if(e.status!==404)throw e;}
function files(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(x=>x.isDirectory()?files(join(dir,x.name)):[join(dir,x.name)]);}
const tree=[];
for(const file of files(root)){
 const blob=await api(base+'/git/blobs','POST',{content:readFileSync(file).toString('base64'),encoding:'base64'});
 tree.push({path:relative(root,file).replaceAll('\\','/'),mode:'100644',type:'blob',sha:blob.sha});
}
const marker=await api(base+'/git/blobs','POST',{content:'',encoding:'utf-8'});
tree.push({path:'.nojekyll',mode:'100644',type:'blob',sha:marker.sha});
const createdTree=await api(base+'/git/trees','POST',{tree});
const commit=await api(base+'/git/commits','POST',{message:'Publish TEKEL device-local application',tree:createdTree.sha,parents:parent?[parent]:[]});
if(parent)await api(base+'/git/refs/heads/gh-pages','PATCH',{sha:commit.sha});
else await api(base+'/git/refs','POST',{ref:'refs/heads/gh-pages',sha:commit.sha});
console.log(JSON.stringify({branch:'gh-pages',commit:commit.sha,assets:tree.length}));
let pages;try{pages=await api(base+'/pages');}catch(e){if(e.status!==404)throw e;}
if(!pages)pages=await api(base+'/pages','POST',{source:{branch:'gh-pages',path:'/'},build_type:'legacy'});
else pages=await api(base+'/pages','PUT',{source:{branch:'gh-pages',path:'/'},build_type:'legacy'});
console.log(JSON.stringify({url:pages.html_url||`https://${owner}.github.io/${repo}/`,status:pages.status}));
