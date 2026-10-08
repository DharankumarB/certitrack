import type { AppData } from '../types';

export function updateDepartmentSlaMutator(s: AppData, departmentId: string, slaDays: number): AppData {
  return {
    ...s,
    departments: s.departments.map((d) => (d.id === departmentId ? { ...d, slaDays } : d)),
  };
}
