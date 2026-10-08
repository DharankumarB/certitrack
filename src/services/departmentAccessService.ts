import type { DepartmentId, User } from '../types';
import { normalizeRole } from './access';

export function canEnterDepartmentWorkspace(user: User | null | undefined, departmentId: DepartmentId): boolean {
  return !!user &&
    normalizeRole(user.role) === 'department_staff' &&
    'departmentId' in user &&
    user.active &&
    (user.accountStatus === undefined || user.accountStatus === 'approved') &&
    user.departmentId === departmentId;
}
