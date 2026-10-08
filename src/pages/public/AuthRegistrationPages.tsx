import { useState, type FormEvent } from 'react';
import { Eye, EyeOff, ShieldCheck, UserRoundPlus } from 'lucide-react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Card, CardBody } from '../../components/ui/Card';
import { Alert } from '../../components/ui/Feedback';
import { SelectField, TextField } from '../../components/ui/Forms';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useAppState } from '../../hooks/useAppState';
import { usePageTitle } from '../../hooks/usePageTitle';
import { errorMessage, isServiceError } from '../../services/api';
import { homeFor } from '../../services/authService';
import { registerStaff, setupFirstAdmin, type FirstAdminInput, type StaffRegistrationInput } from '../../services/registrationService';

const STAFF_EMPTY: StaffRegistrationInput = { name: '', email: '', employeeId: '', departmentId: 'caste', designation: '', password: '', confirmPassword: '', staffReference: '' };
const ADMIN_EMPTY: FirstAdminInput = { name: '', email: '', setupSecret: '', password: '', confirmPassword: '' };

export function StaffRegisterPage() {
  usePageTitle('Department staff registration');
  const departments = useAppState((state) => state.departments);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [form, setForm] = useState<StaffRegistrationInput>(STAFF_EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof StaffRegistrationInput, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof StaffRegistrationInput>(key: K, value: StaffRegistrationInput[K]) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setErrors({});
    setFormError(null);
    try {
      const pending = await registerStaff(form);
      toast({ title: 'Registration submitted', description: 'Administrator approval is required before access is granted.' });
      navigate(`/staff/pending-approval?email=${encodeURIComponent(pending.email)}`, { replace: true });
    } catch (error) {
      if (isServiceError(error) && error.fieldErrors) setErrors(error.fieldErrors as typeof errors);
      setFormError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 md:py-14">
      <header className="mb-7 max-w-2xl">
        <h1 className="text-3xl font-bold text-navy-900">Register as department staff</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">This local-development request starts as pending approval. Use fictional data. Department access is unavailable until an administrator reviews it.</p>
      </header>
      <Card><CardBody className="p-6 sm:p-8">
        {formError && <Alert tone="danger" className="mb-5">{formError}</Alert>}
        <form onSubmit={(event) => void submit(event)} noValidate className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField label="Full name" autoComplete="name" required value={form.name} onChange={(event) => set('name', event.target.value)} error={errors.name} />
            <TextField label="Official email address" type="email" autoComplete="email" required value={form.email} onChange={(event) => set('email', event.target.value)} error={errors.email} />
            <TextField label="Employee ID" required value={form.employeeId} onChange={(event) => set('employeeId', event.target.value)} error={errors.employeeId} />
            <SelectField label="Department" required value={form.departmentId} onChange={(event) => set('departmentId', event.target.value as StaffRegistrationInput['departmentId'])} error={errors.departmentId} options={departments.map((department) => ({ value: department.id, label: department.name }))} placeholder="Select department" />
            <TextField label="Designation" required value={form.designation} onChange={(event) => set('designation', event.target.value)} error={errors.designation} />
            <TextField label="Staff identification / reference number" value={form.staffReference} onChange={(event) => set('staffReference', event.target.value)} hint="Optional" />
            <TextField label="Password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" required value={form.password} onChange={(event) => set('password', event.target.value)} error={errors.password} hint="At least 10 characters with uppercase, lowercase, a number, and a symbol." />
            <TextField label="Confirm password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" required value={form.confirmPassword} onChange={(event) => set('confirmPassword', event.target.value)} error={errors.confirmPassword} />
          </div>
          <button type="button" onClick={() => setShowPassword((value) => !value)} aria-pressed={showPassword} className="inline-flex items-center gap-1 text-xs font-semibold text-navy-800 hover:underline">{showPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}{showPassword ? 'Hide passwords' : 'Show passwords'}</button>
          <Alert tone="info" title="Approval required">Your staff registration has been submitted. Access will be available after an administrator approves your account.</Alert>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
            <Link to="/staff/caste/login" className="self-center text-sm font-semibold text-navy-800 hover:underline">Already registered? Staff sign in</Link>
            <Button type="submit" icon={UserRoundPlus} loading={busy} loadingLabel="Submitting…">Submit for approval</Button>
          </div>
        </form>
      </CardBody></Card>
    </div>
  );
}

export function AdminRegisterPage() {
  usePageTitle('Set up first administrator');
  const { user, signIn } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const available = useAppState((state) => !state.users.some((account) => account.role === 'super_admin' || account.role === 'admin'));
  const [form, setForm] = useState<FirstAdminInput>(ADMIN_EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof FirstAdminInput, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [showPasswords, setShowPasswords] = useState(false);
  const [busy, setBusy] = useState(false);
  if (user) return <Navigate to={homeFor(user)} replace />;
  if (!available) return <Navigate to="/admin/login" replace />;
  const set = <K extends keyof FirstAdminInput>(key: K, value: FirstAdminInput[K]) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setErrors({});
    setFormError(null);
    try {
      await setupFirstAdmin(form);
      await signIn({ identifier: form.email, password: form.password, remember: false, expectedRole: 'super_admin' });
      toast({ title: 'Administrator account created', description: 'Local-development administrator setup is complete.' });
      navigate('/admin/dashboard', { replace: true });
    } catch (error) {
      if (isServiceError(error) && error.fieldErrors) setErrors(error.fieldErrors as typeof errors);
      setFormError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 md:py-14">
      <header className="mb-7">
        <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-navy-700"><ShieldCheck className="size-4" /> Local setup only</p>
        <h1 className="mt-2 text-3xl font-bold text-navy-900">Set up first administrator</h1>
      </header>
      <Card><CardBody className="p-6 sm:p-8">
        <Alert tone="warning" title="Development-only provisioning">The setup secret is bundled into the browser application and is not secure. This flow must be replaced by trusted server-side provisioning before production.</Alert>
        {formError && <Alert tone="danger" className="mt-5">{formError}</Alert>}
        <form onSubmit={(event) => void submit(event)} noValidate className="mt-5 space-y-5">
          <TextField label="Full name" autoComplete="name" required value={form.name} onChange={(event) => set('name', event.target.value)} error={errors.name} />
          <TextField label="Email address" type="email" autoComplete="email" required value={form.email} onChange={(event) => set('email', event.target.value)} error={errors.email} />
          <TextField label="Administrator setup secret" type="password" autoComplete="off" required value={form.setupSecret} onChange={(event) => set('setupSecret', event.target.value)} error={errors.setupSecret} />
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField label="Password" type={showPasswords ? 'text' : 'password'} autoComplete="new-password" required value={form.password} onChange={(event) => set('password', event.target.value)} error={errors.password} />
            <TextField label="Confirm password" type={showPasswords ? 'text' : 'password'} autoComplete="new-password" required value={form.confirmPassword} onChange={(event) => set('confirmPassword', event.target.value)} error={errors.confirmPassword} />
          </div>
          <button type="button" onClick={() => setShowPasswords((value) => !value)} aria-pressed={showPasswords} className="inline-flex items-center gap-1 text-xs font-semibold text-navy-800 hover:underline">{showPasswords ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}{showPasswords ? 'Hide passwords' : 'Show passwords'}</button>
          <Button type="submit" fullWidth icon={ShieldCheck} loading={busy} loadingLabel="Setting up…">Create first administrator</Button>
        </form>
      </CardBody></Card>
      <p className="mt-4 text-center text-sm"><Link to="/login" className="font-semibold text-navy-800 hover:underline">Back to sign-in options</Link></p>
    </div>
  );
}

export function PendingApprovalPage() {
  usePageTitle('Staff registration status');
  const [params] = useSearchParams();
  const email = params.get('email')?.toLowerCase();
  const account = useAppState((state) => state.users.find((user) => 'employeeId' in user && user.email.toLowerCase() === email));
  const rejected = account?.accountStatus === 'rejected';
  const suspended = account?.accountStatus === 'suspended';
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <Card><CardBody className="space-y-4 p-6 sm:p-8">
        {rejected || suspended ? <Alert tone="danger" title="Access unavailable">{account?.rejectionReason ?? 'This staff account is disabled. Contact your administrator.'}</Alert> : <Alert tone="info" title="Registration pending approval">Your staff registration has been submitted. Access will be available after an administrator approves your account.</Alert>}
        {account && 'employeeId' in account && <p className="text-sm text-slate-600">Request for {account.name} · {account.employeeId} · {account.departmentId} · status: {account.accountStatus ?? 'pending approval'}.</p>}
        <div className="flex flex-wrap gap-3">
          <Link to="/staff/caste/login" className="text-sm font-semibold text-navy-800 hover:underline">Staff sign in</Link>
          <Link to="/" className="text-sm font-semibold text-navy-800 hover:underline">Public homepage</Link>
        </div>
      </CardBody></Card>
    </div>
  );
}

export function AdminPendingPage() {
  usePageTitle('Administrator access');
  const hasAdmin = useAppState((state) => state.users.some((user) => user.role === 'super_admin' || user.role === 'admin'));
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <Card><CardBody className="space-y-4 p-6 sm:p-8">
        {hasAdmin ? <Alert tone="warning" title="Administrator provisioning is restricted">New administrator accounts can only be provisioned through the protected administrator workflow.</Alert> : <Alert tone="info" title="First administrator setup available">No administrator has been set up in this browser yet.</Alert>}
        <Link to={hasAdmin ? '/admin/login' : '/admin/register'} className="text-sm font-semibold text-navy-800 hover:underline">{hasAdmin ? 'Administrator sign in' : 'Set up first administrator'}</Link>
      </CardBody></Card>
    </div>
  );
}
