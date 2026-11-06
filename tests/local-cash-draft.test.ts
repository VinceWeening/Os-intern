import {describe,expect,it} from 'vitest';
import {emptyDraft} from '@/lib/cash/model';
import {readLocalDraft} from '@/lib/cash/local-draft';
describe('local cash recovery',()=>{
 const item={schema:1,id:'draft-a',userId:'user-a',version:3,savedAt:'2026-11-01T20:00:00Z',submissionKey:null,draft:emptyDraft('10000000-0000-0000-0000-000000000001','2026-11-01')};
 it('retains unfinished input and its original server version',()=>{
  item.draft.rows[5000].amount='12,';item.draft.rows[5000].edited='amount';
  expect(readLocalDraft(JSON.stringify(item),'user-a','draft-a')?.draft.rows[5000].amount).toBe('12,');
  expect(readLocalDraft(JSON.stringify(item),'user-a','draft-a')?.version).toBe(3);
 });
 it('does not restore another account or malformed browser data',()=>{
  expect(readLocalDraft(JSON.stringify(item),'user-b')).toBeNull();
  expect(readLocalDraft('not-json','user-a')).toBeNull();
  expect(readLocalDraft(JSON.stringify({...item,draft:{...item.draft,rows:{}}}),'user-a')).toBeNull();
 });
});

import {tidyLocalDrafts,writeLocalDraft,removeLocalDraft,localKey,DRAFT_RETENTION_MS,type LocalDraft} from '@/lib/cash/local-draft';
function storage() {
 const data=new Map<string,string>();
 return {get length(){return data.size;},key:(i:number)=>[...data.keys()][i]??null,getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>{data.set(key,value);},removeItem:(key:string)=>{data.delete(key);}};
}
function draft(id:string,at:number):LocalDraft {return {schema:1,id,userId:'a',version:0,savedAt:new Date(at).toISOString(),submissionKey:null,draft:emptyDraft('10000000-0000-0000-0000-000000000001','2026-11-02')};}
describe('bounded local recovery storage',()=>{
 const now=Date.parse('2026-11-02T12:00:00Z');
 it('migrates old accumulated entries to only the newest copy of this user',()=>{
  const store=storage();store.setItem('os-werkplek:cash:v1:a:old',JSON.stringify(draft('old',now-1000)));store.setItem('os-werkplek:cash:v1:a:new',JSON.stringify(draft('new',now)));store.setItem('os-werkplek:cash:v1:b:other','untouched');
  expect(tidyLocalDrafts(store,'a',now)?.id).toBe('new');expect(store.length).toBe(2);expect(store.getItem('os-werkplek:cash:v1:b:other')).toBe('untouched');
 });
 it('expires recovery after exactly three days',()=>{
  const store=storage();store.setItem(localKey('a'),JSON.stringify(draft('old',now-DRAFT_RETENTION_MS)));
  expect(tidyLocalDrafts(store,'a',now)).toBeNull();expect(store.length).toBe(0);
 });
 it('keeps at most one slot and does not let another tab clear a newer draft',()=>{
  const store=storage();writeLocalDraft(store,draft('one',Date.now()));writeLocalDraft(store,draft('two',Date.now()));
  expect(store.length).toBe(1);removeLocalDraft(store,'a','one');expect(tidyLocalDrafts(store,'a')?.id).toBe('two');
 });
 it('does not discard or replace an uncertain submission',()=>{
  const store=storage();const pending={...draft('pending',now-DRAFT_RETENTION_MS-1000),submissionKey:'retry-key'};store.setItem(localKey('a'),JSON.stringify(pending));
  expect(tidyLocalDrafts(store,'a',now)?.id).toBe('pending');expect(()=>writeLocalDraft(store,draft('other',now))).toThrow(/RESOLVE_PENDING/);expect(store.length).toBe(1);
 });
});
