import {createState,applyAction} from './domain.mjs';

export function localTransition(current,request,hash){
 if(!Number.isSafeInteger(request.version)||request.version<0||typeof request.operationId!=='string'||!/^[-a-zA-Z0-9]{8,100}$/.test(request.operationId))throw new Error('İşlem bilgileri geçersiz.');
 const prior=current.state.operations?.find(x=>x.id===request.operationId);
 if(prior){if(prior.hash!==hash)throw Object.assign(new Error('İşlem kimliği farklı içerikle kullanılamaz.'),{status:409});return current;}
 if(current.version!==request.version)throw Object.assign(new Error('Kayıtlar başka sekmede değişti. Yeniden deneyin.'),{status:409});
 const next=applyAction(structuredClone(current.state),request.action);
 next.operations=[...(current.state.operations||[]),{id:request.operationId,hash}];
 return {state:next,version:current.version+1};
}

let opening;
function openDatabase(){
 if(!opening)opening=new Promise((resolve,reject)=>{
  const request=indexedDB.open('tekel-device-v1',1);
  request.onupgradeneeded=()=>request.result.createObjectStore('records');
  request.onerror=()=>reject(new Error('Cihaz depolaması açılamadı. Tarayıcı depolama iznini kontrol edin.'));
  request.onblocked=()=>reject(new Error('Diğer TEKEL sekmelerini kapatıp yeniden açın.'));
  request.onsuccess=()=>{request.result.onversionchange=()=>{request.result.close();opening=undefined;};resolve(request.result);};
 }).catch(error=>{opening=undefined;throw error;});
 return opening;
}

export async function localRequest(_url,options={}){
 try{
  const request=options.method==='POST'?JSON.parse(options.body):null;
  const hash=request?Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(request.action))))).map(x=>x.toString(16).padStart(2,'0')).join(''):null;
  const db=await openDatabase();
  const result=await new Promise((resolve,reject)=>{
   const tx=db.transaction('records','readwrite'),store=tx.objectStore('records');
   let result,error;
   tx.oncomplete=()=>resolve(result);
   tx.onabort=()=>reject(error||new Error('Kayıt saklanamadı. Depolama alanını kontrol edin; yedeğinizi alın.'));
   tx.onerror=()=>{};
   const read=store.get('state');
   read.onsuccess=()=>{try{
    const current=read.result||{state:createState(),version:0};
    result=request?localTransition(current,request,hash):current;
    if(request||!read.result)store.put(result,'state');
   }catch(e){error=Object.assign(e,{status:e.status||400});tx.abort();}};
  });
  return Response.json(result);
 }catch(error){return Response.json({error:error.message||'Cihaz kaydı okunamadı.'},{status:error.status||503});}
}
