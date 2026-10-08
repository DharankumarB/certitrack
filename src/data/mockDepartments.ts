import type { Department } from '../types';

/** Departments are the access boundary: an officer only ever sees the department they belong to. */
export const mockDepartments: Department[] = [
  {
    id: 'caste',
    name: 'Caste Certificate Department',
    shortName: 'Caste',
    description: 'Verifies community and category claims against records and documentary evidence.',
    headName: 'Dr. Lakshmi Narayanan',
    slaDays: 7,
    status: 'operational',
    certificateTypes: ['caste'],
  },
  {
    id: 'income',
    name: 'Income Certificate Department',
    shortName: 'Income',
    description: 'Verifies household income declarations for the financial year.',
    headName: 'R. Venkatesh',
    slaDays: 5,
    status: 'operational',
    certificateTypes: ['income'],
  },
  {
    id: 'domicile',
    name: 'Domicile Certificate Department',
    shortName: 'Domicile',
    description: 'Confirms residence history for admissions, employment and residence-based schemes.',
    headName: 'S. Anitha Rao',
    slaDays: 7,
    status: 'operational',
    certificateTypes: ['domicile'],
  },
];
