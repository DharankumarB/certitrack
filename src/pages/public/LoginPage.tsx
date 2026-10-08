import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, LogIn, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { usePageTitle } from '../../hooks/usePageTitle';
import { Button } from '../../components/ui/Button';
import { TextField, Checkbox } from '../../components/ui/Forms';
import { Alert } from '../../components/ui/Feedback';
import { Card, CardBody } from '../../components/ui/Card';
import { errorMessage, isServiceError } from '../../services/api';
import { homeFor, type LoginInput } from '../../services/authService';
import { useAppState } from '../../hooks/useAppState';
import type { DepartmentId } from '../../types';

const DEPARTMENTS: Record<string, { id: DepartmentId; label: string }> = {
  caste: { id: 'caste', label: 'Caste Certificate Department' },
  income: { id: 'income', label: 'Income Certificate Department' },
  domicile: { id: 'domicile', label: 'Domicile Certificate Department' },
};

export default function LoginPage() {
  const { user, signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const { department: departmentSlug } = useParams();
  const department = departmentSlug ? DEPARTMENTS[departmentSlug] : undefined;
  const path = location.pathname;
  const expectedRole: LoginInput['expectedRole'] = path.startsWith('/staff/') ? 'department_staff' : path.startsWith('/admin/') ? 'super_admin' : path.startsWith('/citizen/') ? 'citizen' : undefined;
  const title = expectedRole === 'department_staff'
    ? `${department?.label ?? 'Department Staff'} sign in`
    : expectedRole === 'super_admin'
      ? 'Administrator sign in'
      : expectedRole === 'citizen'
        ? 'Citizen sign in'
        : 'Sign in to CertiTrack';
  usePageTitle(title);
  const { toast } = useToast();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ identifier?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const safeNext = params.get('next');
  const hasAdmin = useAppState((state) => state.users.some((account) => account.role === 'super_admin' || account.role === 'admin'));

  if (user) return <Navigate to={homeFor(user)} replace />;
  if (departmentSlug && !department) return <Navigate to="/login" replace />;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setFormError(null);
    setErrors({});
    try {
      const signed = await signIn({
        identifier,
        password,
        remember,
        expectedRole,
        expectedDepartment: department?.id,
      });
      toast({ title: 'Signed in', description: `Welcome, ${signed.name.split(' ')[0]}.` });
      const allowedPrefix = 'departmentId' in signed ? `/staff/${signed.departmentId}/` : signed.role === 'citizen' ? '/citizen/' : '/admin/';
      navigate(safeNext?.startsWith(allowedPrefix) && !safeNext.startsWith('//') ? safeNext : homeFor(signed), { replace: true });
    } catch (error) {
      if (isServiceError(error) && error.fieldErrors) setErrors(error.fieldErrors as typeof errors);
      if (isServiceError(error) && error.code === 'PENDING_APPROVAL') {
        navigate(`/staff/pending-approval?email=${encodeURIComponent(identifier)}`, { replace: true });
        return;
      }
      setFormError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const registerPath = expectedRole === 'department_staff' ? '/staff/register' : expectedRole === 'super_admin' ? '/admin/register' : '/citizen/register';
  const identifierLabel = expectedRole === 'department_staff' ? 'Official email or employee ID' : 'Email address';
  const forgotPath = expectedRole === 'department_staff'
    ? department ? `/staff/${department.id}/forgot-password` : '/staff/forgot-password'
    : expectedRole === 'super_admin' ? '/admin/forgot-password' : '/citizen/forgot-password';

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 md:py-14 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.85fr)] lg:gap-12 lg:px-8">
      <Card className="self-start">
        <CardBody className="space-y-6 p-6 sm:p-8">
          <div className="flex items-start gap-3">
            {expectedRole === 'super_admin' && <ShieldCheck className="mt-1 size-6 shrink-0 text-navy-800" aria-hidden="true" />}
            <div>
              <h1 className="text-2xl font-bold text-navy-900">{title}</h1>
              <p className="mt-1 text-sm text-slate-600">Local development prototype. Do not use real passwords or personal information.</p>
            </div>
          </div>
          {expectedRole === 'super_admin' && (
            <Alert tone="warning" title="Shared prototype administrator">
              Default demo sign-in: <strong>admin@gmail.com</strong> / <strong>admin@123</strong>. This public, browser-only account is intentionally insecure. Use fictional data only and never deploy it.
            </Alert>
          )}
          {formError && <Alert tone="danger" title="Sign in failed">{formError}</Alert>}
          <form onSubmit={(event) => void submit(event)} className="space-y-5" noValidate>
            <TextField label={identifierLabel} name="identifier" autoComplete="username" value={identifier} onChange={(event) => setIdentifier(event.target.value)} error={errors.identifier} required />
            <div className="space-y-2">
              <TextField
                label="Password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                error={errors.password}
                required
                wrapperClassName="flex-1"
              />
              <div className="flex items-center justify-between gap-3">
                <button type="button" onClick={() => setShowPassword((visible) => !visible)} className="inline-flex items-center gap-1.5 text-xs font-semibold text-navy-800 hover:underline focus-visible:outline-2 focus-visible:outline-navy-500" aria-pressed={showPassword}>
                  {showPassword ? <EyeOff className="size-3.5" aria-hidden="true" /> : <Eye className="size-3.5" aria-hidden="true" />}
                  {showPassword ? 'Hide password' : 'Show password'}
                </button>
                <Link to={forgotPath} className="text-xs font-semibold text-navy-800 hover:underline focus-visible:outline-2 focus-visible:outline-navy-500">Forgot password?</Link>
              </div>
            </div>
            <Checkbox checked={remember} onChange={setRemember} label="Keep me signed in on this device" description="Local browser session only; do not use on shared devices." />
            <Button type="submit" fullWidth size="lg" icon={LogIn} loading={busy} loadingLabel="Signing in…">Sign in</Button>
          </form>
          <p className="text-sm text-slate-600">
            {expectedRole === 'department_staff' ? 'Need a staff account?' : expectedRole === 'super_admin' ? 'First administrator?' : 'New to CertiTrack?'}{' '}
            {expectedRole === 'super_admin' && hasAdmin
              ? <span className="font-medium">New administrator accounts must be provisioned by an existing administrator.</span>
              : <Link to={registerPath} className="font-semibold text-navy-800 hover:underline">{expectedRole === 'super_admin' ? 'Set up first administrator' : expectedRole === 'department_staff' ? 'Register as staff' : 'Create an account'}</Link>}
          </p>
          {expectedRole === 'department_staff' && <p className="text-xs text-slate-500">{department ? `Department selected: ${department.label}. ` : ''}Your approved assignment determines the portal you can access.</p>}
        </CardBody>
      </Card>
      <aside className="space-y-4">
        <Card>
          <CardBody className="space-y-3 p-6">
            <h2 className="font-semibold text-navy-900">Choose another sign-in</h2>
            <div className="grid gap-2">
              <Link className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-navy-900 hover:bg-slate-50" to="/citizen/login">Citizen sign in</Link>
              {Object.entries(DEPARTMENTS).map(([slug, entry]) => (
                <Link key={slug} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-navy-900 hover:bg-slate-50" to={`/staff/${slug}/login`}>{entry.label} staff sign in</Link>
              ))}
              <Link className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-navy-900 hover:bg-slate-50" to="/admin/login">Administrator sign in</Link>
            </div>
            <Link to="/login" className="inline-block text-sm font-semibold text-navy-800 hover:underline">All sign-in options</Link>
          </CardBody>
        </Card>
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-950">
          Prototype limitation: account records and sessions are stored in this browser and can be inspected or changed. This is not production authentication. Use fictional data only.
        </p>
      </aside>
    </div>
  );
}
