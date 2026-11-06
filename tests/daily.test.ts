import { describe,it,expect } from 'vitest';
import { validDaily } from '@/lib/daily/model';
import { effectiveRole,validPermissions,type AccessRole } from '@/lib/auth/permissions';
describe('day overview input and permission boundaries',()=>{
 it('requires explicit car/driver and waste quantities',()=>{
  expect(validDaily({notes:'',diners:'',rides:[],waste:[]})).toBeTruthy();
  expect(validDaily({notes:'',diners:'',rides:[{car:'',driver:'A',passengers:''}],waste:[]})).toBeFalsy();
  expect(validDaily({notes:'',diners:'',rides:[],waste:[{product:'Test',quantity:'',reason:''}]})).toBeFalsy();
 });
 it('allows a day-only role and does not open cash for a day exception',()=>{
  expect(validPermissions(['day.open','day.edit'])).toBe(true);expect(validPermissions(['day.edit'])).toBe(false);
  const role:AccessRole={id:'test',name:'Test',description:'',version:1,is_admin:false,all_locations:false,permissions:[]};
  expect(effectiveRole(role,[{permission:'day.edit',expires_at:null}]).permissions).toEqual(['day.edit','day.open']);
 });
});
