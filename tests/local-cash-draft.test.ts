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
