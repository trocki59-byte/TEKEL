import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseProductsCSV,productsCSV} from '../lib/csv.mjs';
import {createState} from '../lib/domain.mjs';
test('CSV round trip preserves quoted names and leading barcode zero',()=>{const p={...createState().products[0],name:'Özel; "ürün"',barcode:'0123456789012',price:12550,cost:11025,stock:20,verified:true};assert.deepEqual(parseProductsCSV(productsCSV([p]))[0],{...p,id:undefined});});
test('CSV rejects invalid or missing columns',()=>{assert.throws(()=>parseProductsCSV('ad;fiyat\nA;100'));assert.throws(()=>parseProductsCSV(productsCSV([{...createState().products[0],price:NaN}])));});
