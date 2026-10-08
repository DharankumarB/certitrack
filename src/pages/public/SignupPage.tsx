import { useState, type FormEvent } from 'react';
import { Eye, EyeOff, UserPlus } from 'lucide-react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { usePageTitle } from '../../hooks/usePageTitle';
import { Button } from '../../components/ui/Button';
import { TextField, Checkbox } from '../../components/ui/Forms';
import { Alert } from '../../components/ui/Feedback';
import { Card, CardBody } from '../../components/ui/Card';
import { signup, type SignupInput } from '../../services/authService';
import { errorMessage, isServiceError } from '../../services/api';
import { homeFor } from '../../services/authService';

const EMPTY: SignupInput = { name: '', email: '', mobile: '', password: '', confirmPassword: '', acceptTerms: false };

export default function SignupPage() {
  usePageTitle('Create citizen account');
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [form, setForm] = useState<SignupInput>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof SignupInput, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={homeFor(user)} replace />;
  const set = <K extends keyof SignupInput>(key: K, value: SignupInput[K]) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setErrors({});
    setFormError(null);
    try {
      const created = await signup(form);
      toast({ title: 'Account created', description: `Welcome, ${created.name.split(' ')[0]}. This local prototype account is signed in.` });
      navigate('/citizen/dashboard', { replace: true });
    } catch (error) {
      if (isServiceError(error) && error.fieldErrors) setErrors(error.fieldErrors as typeof errors);
      setFormError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 md:py-14">
      <div className="mb-8 space-y-2">
        <h1 className="text-3xl font-bold text-navy-900">Create a citizen account</h1>
        <p className="text-sm text-slate-600">Use fictional contact details. This browser-only account is for local development and is not a verified government identity.</p>
      </div>
      <Card>
        <CardBody className="p-6 sm:p-8">
          {formError && <Alert tone="danger" className="mb-6">{formError}</Alert>}
          <form onSubmit={(event) => void submit(event)} noValidate className="space-y-6">
            <TextField label="Full name" value={form.name} onChange={(event) => set('name', event.target.value)} error={errors.name} required autoComplete="name" />
            <div className="grid gap-5 sm:grid-cols-2">
              <TextField label="Email address" type="email" autoComplete="email" value={form.email} onChange={(event) => set('email', event.target.value)} error={errors.email} required />
              <TextField label="Mobile number" inputMode="tel" autoComplete="tel" value={form.mobile} onChange={(event) => set('mobile', event.target.value)} error={errors.mobile} required hint="10 digits, starts with 6 to 9" />
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <TextField label="Password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={form.password} onChange={(event) => set('password', event.target.value)} error={errors.password} required hint="At least 10 characters with uppercase, lowercase, a number, and a symbol." />
                <button type="button" className="text-xs font-semibold text-navy-800 hover:underline" aria-pressed={showPassword} onClick={() => setShowPassword((value) => !value)}>{showPassword ? <EyeOff className="mr-1 inline size-3.5" /> : <Eye className="mr-1 inline size-3.5" />}{showPassword ? 'Hide password' : 'Show password'}</button>
              </div>
              <div className="space-y-2">
                <TextField label="Confirm password" type={showConfirm ? 'text' : 'password'} autoComplete="new-password" value={form.confirmPassword} onChange={(event) => set('confirmPassword', event.target.value)} error={errors.confirmPassword} required />
                <button type="button" className="text-xs font-semibold text-navy-800 hover:underline" aria-pressed={showConfirm} onClick={() => setShowConfirm((value) => !value)}>{showConfirm ? 'Hide confirmation' : 'Show confirmation'}</button>
              </div>
            </div>
            <Checkbox checked={form.acceptTerms} onChange={(value) => set('acceptTerms', value)} label="I acknowledge the prototype terms and privacy limitations. I will use fictional data and not store real identity documents." error={errors.acceptTerms} />
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-600">Already registered? <Link to="/citizen/login" className="font-semibold text-navy-800 hover:underline">Sign in</Link></p>
              <Button type="submit" size="lg" icon={UserPlus} loading={busy} loadingLabel="Creating account…">Create citizen account</Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
