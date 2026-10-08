import { useMemo, useState, type FormEvent } from 'react';
import { Check, ShieldPlus, UserRoundX, UserRoundCheck } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Alert } from '../../components/ui/Feedback';
import { SelectField, TextField } from '../../components/ui/Forms';
import { useCurrentUser } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useAppState } from '../../hooks/useAppState';
import { usePageTitle } from '../../hooks/usePageTitle';
import { approveStaff, provisionAdministrator, rejectStaff, setStaffSuspended, type ProvisionAdminInput } from '../../services/registrationService';
import { errorMessage } from '../../services/api';
import type { OfficerUser } from '../../types';

const DEPARTMENT_OPTIONS = [
  { value: 'all', label: 'All departments' },
  { value: 'caste', label: 'Caste Certificate Department' },
  { value: 'income', label: 'Income Certificate Department' },
  { value: 'domicile', label: 'Domicile Certificate Department' },
];
const EMPTY_ADMIN: ProvisionAdminInput = { name: '', email: '', password: '', confirmPassword: '' };

export default function AdminStaffPage() {
  usePageTitle('Staff management');
  const admin = useCurrentUser();
  const users = useAppState((state) => state.users);
  const departments = useAppState((state) => state.departments);
  const { toast } = useToast();
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [rejectionReason, setRejectionReason] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adminForm, setAdminForm] = useState<ProvisionAdminInput>(EMPTY_ADMIN);
  const [provisionError, setProvisionError] = useState<string | null>(null);
  const [provisioning, setProvisioning] = useState(false);
  const staff = useMemo(() => users.filter((user): user is OfficerUser => 'employeeId' in user)
    .filter((user) => departmentFilter === 'all' || user.departmentId === departmentFilter)
    .filter((user) => `${user.name} ${user.employeeId} ${user.email}`.toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name)), [users, departmentFilter, query]);

  const runAction = async (user: OfficerUser, action: 'approve' | 'reject' | 'suspend' | 'reactivate') => {
    setBusyId(user.id);
    setError(null);
    try {
      if (action === 'approve') await approveStaff(admin, user.id);
      if (action === 'reject') await rejectStaff(admin, user.id, rejectionReason[user.id] ?? '');
      if (action === 'suspend') await setStaffSuspended(admin, user.id, true);
      if (action === 'reactivate') await setStaffSuspended(admin, user.id, false);
      toast({ title: 'Staff status updated', description: `${user.name}: ${action}.` });
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusyId(null);
    }
  };

  const provision = async (event: FormEvent) => {
    event.preventDefault();
    setProvisioning(true);
    setProvisionError(null);
    try {
      const created = await provisionAdministrator(admin, adminForm);
      setAdminForm(EMPTY_ADMIN);
      toast({ title: 'Administrator provisioned', description: `${created.email} can now sign in.` });
    } catch (cause) {
      setProvisionError(errorMessage(cause));
    } finally {
      setProvisioning(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Staff management" description="Review local-development staff requests, manage account status, and provision additional administrators." />
      {error && <Alert tone="danger" title="Could not update staff account">{error}</Alert>}
      <Card>
        <CardHeader title="Department staff accounts" description="Approval and suspension changes take effect immediately in this browser." />
        <CardBody className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField label="Filter by department" value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)} options={DEPARTMENT_OPTIONS} />
            <TextField label="Search staff" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, employee ID, or email" />
          </div>
          {staff.length === 0 ? <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">No staff accounts match these filters.</p> : (
            <ul className="space-y-3">
              {staff.map((member) => {
                const departmentName = departments.find((department) => department.id === member.departmentId)?.name ?? member.departmentId;
                const status = member.accountStatus ?? (member.active ? 'approved' : 'suspended');
                const busy = busyId === member.id;
                return (
                  <li key={member.id} className="min-w-0 rounded-xl border border-slate-200 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-navy-900">{member.name}</h3>
                        <p className="mt-1 break-all text-sm text-slate-700">{member.email}</p>
                        <p className="mt-1 text-sm text-slate-600">{member.employeeId} · {departmentName} · {member.designation}</p>
                        {member.staffReference && <p className="mt-1 text-xs text-slate-500">Reference: {member.staffReference}</p>}
                        <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-600">Status: {status.replace('_', ' ')}</p>
                        {member.approvalAt && <p className="mt-1 text-xs text-slate-500">Approved {new Date(member.approvalAt).toLocaleString()} by {member.approvedBy ?? 'first administrator'}</p>}
                        {member.rejectionReason && <p className="mt-2 rounded bg-red-50 p-2 text-sm text-red-900">Rejection reason: {member.rejectionReason}</p>}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {status === 'pending_approval' && <>
                          <Button size="sm" icon={Check} loading={busy} loadingLabel="Approving…" onClick={() => void runAction(member, 'approve')}>Approve</Button>
                          <Button size="sm" variant="danger" icon={UserRoundX} disabled={busy} onClick={() => void runAction(member, 'reject')}>Reject</Button>
                        </>}
                        {status === 'approved' && <Button size="sm" variant="secondary" icon={UserRoundX} loading={busy} loadingLabel="Suspending…" onClick={() => void runAction(member, 'suspend')}>Suspend</Button>}
                        {status === 'suspended' && <Button size="sm" variant="secondary" icon={UserRoundCheck} loading={busy} loadingLabel="Reactivating…" onClick={() => void runAction(member, 'reactivate')}>Reactivate</Button>}
                      </div>
                    </div>
                    {status === 'pending_approval' && (
                      <div className="mt-4 max-w-2xl">
                        <TextField label={`Rejection reason for ${member.name}`} value={rejectionReason[member.id] ?? ''} onChange={(event) => setRejectionReason((state) => ({ ...state, [member.id]: event.target.value }))} hint="Required when rejecting; at least 10 characters." />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Provision another administrator" description="Protected local-development provisioning. Never use this browser-only mechanism as production authorization." />
        <CardBody>
          <Alert tone="warning" className="mb-5">The invitation/provisioning record and password verifier remain in browser storage. Production administrator provisioning must be performed by a trusted backend.</Alert>
          {provisionError && <Alert tone="danger" className="mb-5">{provisionError}</Alert>}
          <form onSubmit={(event) => void provision(event)} noValidate className="grid gap-4 sm:grid-cols-2">
            <TextField label="Full name" required value={adminForm.name} onChange={(event) => setAdminForm((state) => ({ ...state, name: event.target.value }))} />
            <TextField label="Email" type="email" required value={adminForm.email} onChange={(event) => setAdminForm((state) => ({ ...state, email: event.target.value }))} />
            <TextField label="Temporary password" type="password" required value={adminForm.password} onChange={(event) => setAdminForm((state) => ({ ...state, password: event.target.value }))} hint="At least 10 characters with uppercase, lowercase, a number, and a symbol." />
            <TextField label="Confirm password" type="password" required value={adminForm.confirmPassword} onChange={(event) => setAdminForm((state) => ({ ...state, confirmPassword: event.target.value }))} />
            <div className="sm:col-span-2"><Button type="submit" icon={ShieldPlus} loading={provisioning} loadingLabel="Provisioning…">Provision administrator</Button></div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
