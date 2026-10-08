import { useEffect, useId, useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, LogIn, UserRound, Building2, ShieldCheck, FlaskConical } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { usePageTitle } from '../../hooks/usePageTitle';
import { Button } from '../../components/ui/Button';
import { TextField, Checkbox } from '../../components/ui/Forms';
import { Alert } from '../../components/ui/Feedback';
import { Card, CardBody } from '../../components/ui/Card';
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from '../../config/demo';
import { ROLE_HOME, ROLE_LABEL } from '../../config/navigation';
import { isServiceError, errorMessage } from '../../services/api';
import type { UserRole } from '../../types';

const ICONS = { citizen: UserRound, officer: Building2, admin: ShieldCheck } as const;

export default function LoginPage() {
  usePageTitle('Sign in');
  const { user, signIn, signInDemo } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { toast } = useToast();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ identifier?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const formId = useId();
  const next = params.get('next');
  const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : null;

  useEffect(() => {
    if (window.location.hash === '#demo') document.getElementById('demo')?.scrollIntoView({ block: 'start' });
  }, []);

  if (user) return <Navigate to={safeNext ?? ROLE_HOME[user.role]} replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setBusy('form');
    try {
      const signed = await signIn({ identifier, password, remember });
      toast({ title: `Welcome back, ${signed.name.split(' ')[0]}`, description: `Signed in as ${ROLE_LABEL[signed.role]}.` });
      navigate(safeNext ?? ROLE_HOME[signed.role], { replace: true });
    } catch (err) {
      if (isServiceError(err) && err.fieldErrors) setErrors(err.fieldErrors as typeof errors);
      setFormError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const demo = async (role: UserRole) => {
    setBusy(role);
    try {
      const signed = await signInDemo(role, false);
      toast({ title: `Signed in as ${ROLE_LABEL[signed.role]}`, description: 'Prototype demo account. Data is fictional.' });
      navigate(ROLE_HOME[signed.role], { replace: true });
    } catch (err) {
      toast({ tone: 'danger', title: 'Demo sign-in failed', description: errorMessage(err) });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 md:py-14 lg:grid-cols-[1fr_1.05fr] lg:gap-12 lg:px-8 grid-cols-1">
      <Card className="self-start">
        <CardBody className="space-y-6 p-6 sm:p-8">
          <div>
            <h1 className="text-2xl font-bold text-navy-900">Sign in to CertiTrack</h1>
            <p className="mt-1 text-sm text-slate-600">Use your registered email or mobile number.</p>
          </div>
          {formError && <Alert tone="danger" title="We could not sign you in">{formError}</Alert>}
          <form onSubmit={submit} className="space-y-5" noValidate id={formId}>
            <TextField label="Email or mobile number" name="identifier" autoComplete="username" value={identifier} onChange={(e) => setIdentifier(e.target.value)} error={errors.identifier} required inputMode="email" />
            <div className="space-y-1.5">
              <div className="flex items-end justify-between gap-2">
                <TextField
                  label="Password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  error={errors.password}
                  required
                  wrapperClassName="flex-1"
                />
              </div>
              <div className="flex items-center justify-between gap-3">
                <button type="button" onClick={() => setShowPassword((v) => !v)} className="inline-flex items-center gap-1.5 text-xs font-semibold text-navy-800 hover:underline focus-visible:outline-2 focus-visible:outline-navy-500" aria-pressed={showPassword}>
                  {showPassword ? <EyeOff className="size-3.5" aria-hidden="true" /> : <Eye className="size-3.5" aria-hidden="true" />}
                  {showPassword ? 'Hide password' : 'Show password'}
                </button>
                <Link to="/forgot-password" className="text-xs font-semibold text-navy-800 hover:underline focus-visible:outline-2 focus-visible:outline-navy-500">
                  Forgot password?
                </Link>
              </div>
            </div>
            <Checkbox id={`${formId}-remember`} checked={remember} onChange={setRemember} label="Keep me signed in on this device" description="Off = this browser tab only, so you can use several demo roles in different tabs." />
            <Button type="submit" fullWidth size="lg" icon={LogIn} loading={busy === 'form'} loadingLabel="Signing in…">
              Sign in
            </Button>
          </form>
          <p className="text-center text-sm text-slate-600">
            New to CertiTrack?{' '}
            <Link to="/signup" className="font-semibold text-navy-800 hover:underline focus-visible:outline-2 focus-visible:outline-navy-500">
              Create a citizen account
            </Link>
          </p>
        </CardBody>
      </Card>

      <section id="demo" aria-labelledby="demo-title" className="scroll-mt-24 space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 id="demo-title" className="text-xl font-bold text-navy-900">Demo accounts</h2>
          <span className="inline-flex items-center gap-1 rounded-full bg-navy-50 px-2.5 py-0.5 text-xs font-semibold text-navy-800 ring-1 ring-inset ring-navy-100">
            <FlaskConical className="size-3.5" aria-hidden="true" /> Prototype only
          </span>
        </div>
        <p className="text-sm text-slate-600">
          One click opens each role’s workspace with fictional data. For manual sign-in use the password <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-900">{DEMO_PASSWORD}</code>. This is a shared demo password, not a real credential.
        </p>
        <div className="grid gap-4 grid-cols-1">
          {DEMO_ACCOUNTS.map((acc) => {
            const Icon = ICONS[acc.role];
            return (
              <Card key={acc.role} className="transition-shadow hover:shadow-md">
                <CardBody className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-start gap-4">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-navy-900 text-amber-300">
                      <Icon className="size-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold text-navy-900">{acc.title}</p>
                      <p className="text-xs text-slate-500 break-all">{acc.email}</p>
                      <p className="mt-1 text-sm text-slate-600">{acc.summary}</p>
                    </div>
                  </div>
                  <Button variant="secondary" onClick={() => void demo(acc.role)} loading={busy === acc.role} loadingLabel="Opening…" className="shrink-0 sm:w-auto" fullWidth>
                    Sign in as {acc.title.replace(' Demo', '')}
                  </Button>
                </CardBody>
              </Card>
            );
          })}
        </div>
        <Alert tone="info" title="Prototype notice">
          Nothing here is real. Demo accounts do not transmit personal data, WhatsApp messages are previews, and e-sign is simulated.
        </Alert>
      </section>
    </div>
  );
}
