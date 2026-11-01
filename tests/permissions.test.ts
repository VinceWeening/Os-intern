import { describe, expect, it } from 'vitest';
import { hasPermission, validPermissions, type AccessRole } from '@/lib/auth/permissions';
import { validateRole, validateUser, managementError } from '@/lib/admin/validation';

const role: AccessRole = {id:'40000000-0000-0000-0000-000000000001',name:'Manager',description:'',is_admin:false,all_locations:false,permissions:[],version:1};
const user = { id:'20000000-0000-0000-0000-000000000001',name:'Test',roleId:role.id,active:true,locationIds:[],version:1,reason:'Testwijziging' };
describe('permission decisions',()=>{
  it('does not grant permissions by a role name',()=>{
    expect(hasPermission(role,'cash.open')).toBe(false);
    expect(hasPermission({...role,permissions:['cash.open']},'cash.open')).toBe(true);
    expect(hasPermission({...role,is_admin:true},'cash.open')).toBe(true);
  });
  it('rejects unknown permission keys and missing module dependencies',()=>{
    expect(validPermissions(['users.manage'])).toBe(false);
    expect(validPermissions(['cash.review'])).toBe(false);
    expect(validPermissions(['cash.open','cash.review'])).toBe(true);
    expect(validPermissions([])).toBe(true);
  });
  it('validates user identifiers, reason and version before database access',()=>{
    expect(validateUser(user)).toBe(true);
    expect(validateUser({...user,reason:' '})).toBe(false);
    expect(validateUser({...user,version:-1})).toBe(false);
    expect(validateUser({...user,locationIds:['foreign']})).toBe(false);
  });
  it('validates role permissions and names',()=>{
    const change={id:role.id,name:'Avondteam',description:'',isAdmin:false,allLocations:false,permissions:['cash.open'],version:1,reason:'Nieuwe rol'};
    expect(validateRole(change)).toBe(true);
    expect(validateRole({...change,permissions:['unknown']})).toBe(false);
    expect(validateRole({...change,name:' '})).toBe(false);
  });
  it('gives actionable messages without echoing raw SQL errors',()=>{
    expect(managementError({code:'PT409'})).toContain('ander apparaat');
    expect(managementError({message:'LAST_ADMIN'})).toContain('minimaal één');
    expect(managementError({message:'raw sensitive SQL'})).not.toContain('raw sensitive SQL');
  });
});
