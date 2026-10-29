import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createState} from '../lib/domain.mjs';
import {localTransition} from '../lib/local-store.mjs';

test('local transactions persist once and reject stale tabs and changed retries',()=>{
 const initial={state:createState(),version:0};
 const action={type:'customer',name:'Yerel müşteri',phone:''};
 const request={version:0,operationId:'local-test-001',action};
 const next=localTransition(initial,request,'hash1');
 assert.equal(next.version,1);
 assert.equal(next.state.customers.length,1);
 assert.equal(initial.state.customers.length,0);
 assert.deepEqual(localTransition(next,request,'hash1'),next);
 assert.throws(()=>localTransition(next,request,'hash2'),/kimliği/);
 assert.throws(()=>localTransition(next,{...request,operationId:'local-test-002'},'hash1'),/sekmede/);
 assert.equal(createState().customers.length,0);
});

test('failed local validation leaves existing records unchanged',()=>{
 const current={state:createState(),version:0};
 assert.throws(()=>localTransition(current,{version:0,operationId:'local-test-003',action:{type:'sale',items:[]}},'hash3'));
 assert.equal(current.state.sales.length,0);
 assert.equal(current.version,0);
});
