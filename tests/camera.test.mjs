import {test} from 'node:test';
import assert from 'node:assert/strict';
import {findProductByBarcode,normalizeBarcode,cameraErrorMessage} from '../lib/barcodes.mjs';
import {startCameraSession} from '../lib/camera.mjs';
import {createBarcodeReader} from '../lib/camera.mjs';
import {createState,applyAction} from '../lib/domain.mjs';
test('EAN13 leading zero and UPC12 match without losing original barcode',()=>{const products=[{id:'p',barcode:'0123456789012'}];assert.equal(findProductByBarcode(products,'123456789012')?.id,'p');assert.equal(normalizeBarcode(' 8691234567890 '),'8691234567890');assert.equal(normalizeBarcode('https://example.com'),null);assert.equal(normalizeBarcode('123'),null);assert.equal(findProductByBarcode([{id:'blank',barcode:''}],'00000000'),null);});
test('camera only emits the first valid decode and releases owned tracks',async()=>{let callback,stops=0,controlStops=0;const stream={getTracks:()=>[{stop:()=>stops++}]};const video={srcObject:null,pause(){}};const controller=new AbortController();const reads=[];const reader={async decodeFromStream(s,v,cb){callback=cb;return {stop:()=>controlStops++};}};await startCameraSession({video,signal:controller.signal,mediaDevices:{getUserMedia:async()=>stream},createReader:async()=>reader,onCode:code=>reads.push(code)});callback({getText:()=> 'not-a-barcode'});callback({getText:()=> '8691234567890'});callback({getText:()=> '8691234567890'});assert.deepEqual(reads,['8691234567890']);assert.equal(stops,1);assert.equal(controlStops,1);controller.abort();assert.equal(stops,1);});
test('closing before permission resolves immediately stops the late stream',async()=>{let resolve,stops=0,decodes=0;const controller=new AbortController();const promise=new Promise(r=>resolve=r);const work=startCameraSession({video:{srcObject:null,pause(){}},signal:controller.signal,mediaDevices:{getUserMedia:()=>promise},createReader:async()=>({decodeFromStream:async()=>{decodes++;return {stop(){}};}}),onCode:()=>assert.fail('late result')});await Promise.resolve();controller.abort();resolve({getTracks:()=>[{stop:()=>stops++}]});await work;assert.equal(stops,1);assert.equal(decodes,0);});
test('decode startup failure releases the camera and permission denial is readable',async()=>{let stops=0;await assert.rejects(()=>startCameraSession({video:{srcObject:null,pause(){}},signal:new AbortController().signal,mediaDevices:{getUserMedia:async()=>({getTracks:()=>[{stop:()=>stops++}]})},createReader:async()=>({decodeFromStream:async()=>{throw new Error('decoder');}}),onCode(){}}),/decoder/);assert.equal(stops,1);assert.match(cameraErrorMessage({name:'NotAllowedError'}),/izn/i);assert.match(cameraErrorMessage({name:'NotFoundError'}),/kamera/i);});
test('binding an unknown scan cannot overwrite another barcode or alias an existing product',()=>{let s=createState();const p=structuredClone(s.products[0]);s=applyAction(s,{type:'bindBarcode',productId:p.id,barcode:'0123456789012',expectedProduct:p});assert.equal(s.products[0].barcode,'0123456789012');assert.throws(()=>applyAction(s,{type:'bindBarcode',productId:s.products[1].id,barcode:'123456789012',expectedProduct:s.products[1]}),/başka/i);assert.throws(()=>applyAction(s,{type:'bindBarcode',productId:p.id,barcode:'8691234567890',expectedProduct:s.products[0]}),/barkod/i);});
test('manual product save also rejects an EAN/UPC alias owned by another product',()=>{let s=createState();s=applyAction(s,{type:'product',product:{...s.products[0],barcode:'0123456789012'}});assert.throws(()=>applyAction(s,{type:'product',product:{...s.products[1],barcode:'123456789012'}}),/barkod/i);});
test('a late decoder finalizer cannot clear a newer session with its own video',async()=>{
 const video1={srcObject:null,pause(){}},video2={srcObject:null,pause(){}};let finishOld;const late=new Promise(r=>finishOld=r);let newStops=0;
 const stream1={getTracks:()=>[{stop(){}}]},stream2={getTracks:()=>[{stop(){newStops++;}}]};const abort1=new AbortController();
 const old=startCameraSession({video:video1,signal:abort1.signal,mediaDevices:{getUserMedia:async()=>stream1},createReader:async()=>({async decodeFromStream(s,v){v.srcObject=s;await late;return {stop(){v.srcObject=null;}};}}),onCode(){}});
 await new Promise(resolve=>setImmediate(resolve));abort1.abort();
 const stopNew=await startCameraSession({video:video2,signal:new AbortController().signal,mediaDevices:{getUserMedia:async()=>stream2},createReader:async()=>({async decodeFromStream(s,v){v.srcObject=s;return {stop(){v.srcObject=null;}};}}),onCode(){}});
 finishOld();await old;assert.equal(video2.srcObject,stream2);assert.equal(newStops,0);stopNew();assert.equal(newStops,1);
});
test('the real camera decoder recognizes an EAN13 image',async()=>{
 const {RGBLuminanceSource,HybridBinarizer,BinaryBitmap}=await import('@zxing/library');
 // A deterministic EAN-13 test image: 4006381333931, first-digit parity LGLLGG.
 const digits='4006381333931',left=['0001101','0011001','0010011','0111101','0100011','0110001','0101111','0111011','0110111','0001011'];
 const invert=x=>x.replace(/[01]/g,c=>c==='0'?'1':'0');
 let bars='101';const parity='LGLLGG';for(let i=1;i<=6;i++){const l=left[Number(digits[i])];bars+=parity[i-1]==='L'?l:invert(l.split('').reverse().join(''));}bars+='01010';for(let i=7;i<13;i++)bars+=invert(left[Number(digits[i])]);bars+='101';
 const scale=4,width=(bars.length+24)*scale,height=140,pixels=new Uint8ClampedArray(width*height).fill(255);
 for(let y=10;y<height-10;y++)for(let x=0;x<bars.length;x++)if(bars[x]==='1')for(let dx=0;dx<scale;dx++)pixels[y*width+(x+12)*scale+dx]=0;
 const reader=await createBarcodeReader();const result=reader.decodeBitmap(new BinaryBitmap(new HybridBinarizer(new RGBLuminanceSource(pixels,width,height))));assert.equal(result.getText(),digits);
 let state=createState();state=applyAction(state,{type:'product',product:{...state.products[0],barcode:digits,price:10000,cost:8000,stock:10,verified:true}});const found=findProductByBarcode(state.products,result.getText());assert.ok(found);state=applyAction(state,{type:'sale',id:'decoded-camera-sale',payment:'cash',items:[{id:found.id,quantity:1,unit:'pack'}]});assert.equal(state.products[0].stock,9);assert.equal(state.sales[0].total,10000);
});

