import type { User } from '../../types';
import { mockDepartments } from '../../data/mockDepartments';

/** Display name for an officer's department. */
export function DEPARTMENT_NAME(user: User): string {
  if (user.role !== 'officer') return 'Department';
  return mockDepartments.find((d) => d.id === user.departmentId)?.shortName ?? 'Department';
}
