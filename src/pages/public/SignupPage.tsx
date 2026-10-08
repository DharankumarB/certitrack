import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { usePageTitle } from '../../hooks/usePageTitle';
import { Button } from '../../components/ui/Button';
import { TextField, SelectField, Checkbox } from '../../components/ui/Forms';
import { Alert } from '../../components/ui/Feedback';
import { Card, CardBody } from '../../components/ui/Card';
import { signup, type SignupInput } from '../../services/authService';
import { errorMessage, isServiceError } from '../../services/api';
import { DISTRICTS, DISTRICT_TALUKS, GENDER_OPTIONS } from '../../config/geography';
import { ROLE_HOME } from '../../config/navigation';

const EMPTY: SignupInput = { name: '', email: '', mobile: '', dob: '', gender: '', password: '', confirmPassword: '', address: '', district: '', taluk: '', village: '', acceptTerms: false };

export default function SignupPage() {
  usePageTitle('Create account');
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [form, setForm] = useState<SignupInput>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof SignupInput, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={ROLE_HOME[user.role]} replace />;

  const set = <K extends keyof SignupInput>(key: K, value: SignupInput[K]) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setFormError(null);
    try {
      const created = await signup(form);
      toast({ title: 'Account created', description: `Welcome, ${created.name.split(' ')[0]}. You are signed in.` });
      navigate(ROLE_HOME.citizen, { replace: true });
    } catch (err) {
      if (isServiceError(err) && err.fieldErrors) setErrors(err.fieldErrors as typeof errors);
      setFormError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 md:py-14">
      <div className="mb-8 space-y-2">
        <h1 className="text-3xl font-bold text-navy-900">Create a citizen account</h1>
        <p className="text-sm text-slate-600">Your details are used only in this prototype. Use fictional details for testing.</p>
      </div>
      <Card>
        <CardBody className="p-6 sm:p-8">
          {formError && <Alert tone="danger" className="mb-6">{formError}</Alert>}
          <form onSubmit={submit} noValidate className="space-y-8">
            <fieldset className="grid gap-5 sm:grid-cols-2">
              <legend className="mb-4 text-base font-semibold text-navy-900">Your details</legend>
              <TextField label="Full name (as on your ID)" value={form.name} onChange={(e) => set('name', e.target.value)} error={errors.name} required autoComplete="name" wrapperClassName="sm:col-span-2" />
              <TextField label="Date of birth" type="date" value={form.dob} onChange={(e) => set('dob', e.target.value)} error={errors.dob} required autoComplete="bday" />
              <SelectField label="Gender" value={form.gender} onChange={(e) => set('gender', e.target.value)} error={errors.gender} required placeholder="Select" options={GENDER_OPTIONS.map((g) => ({ value: g, label: g }))} />
              <TextField label="Mobile number" inputMode="tel" autoComplete="tel" value={form.mobile} onChange={(e) => set('mobile', e.target.value)} error={errors.mobile} required hint="10 digits, starts with 6 to 9" />
              <TextField label="Email" type="email" autoComplete="email" value={form.email} onChange={(e) => set('email', e.target.value)} error={errors.email} required />
            </fieldset>
            <fieldset className="grid gap-5 sm:grid-cols-2">
              <legend className="mb-4 text-base font-semibold text-navy-900">Address</legend>
              <TextField label="House, street and locality" value={form.address} onChange={(e) => set('address', e.target.value)} error={errors.address} required wrapperClassName="sm:col-span-2" autoComplete="street-address" />
              <SelectField label="District" value={form.district} onChange={(e) => setForm((f) => ({ ...f, district: e.target.value, taluk: '' }))} error={errors.district} required placeholder="Select district" options={DISTRICTS.map((d) => ({ value: d, label: d }))} />
              <SelectField label="Taluk" value={form.taluk} onChange={(e) => set('taluk', e.target.value)} error={errors.taluk} required placeholder={form.district ? 'Select taluk' : 'Choose a district first'} disabled={!form.district} options={(DISTRICT_TALUKS[form.district] ?? []).map((t) => ({ value: t, label: t }))} />
              <TextField label="Village or town" value={form.village} onChange={(e) => set('village', e.target.value)} error={errors.village} required />
            </fieldset>
            <fieldset className="grid gap-5 sm:grid-cols-2">
              <legend className="mb-4 text-base font-semibold text-navy-900">Password</legend>
              <TextField label="Password" type="password" autoComplete="new-password" value={form.password} onChange={(e) => set('password', e.target.value)} error={errors.password} required hint="At least 8 characters with a letter and a number" />
              <TextField label="Confirm password" type="password" autoComplete="new-password" value={form.confirmPassword} onChange={(e) => set('confirmPassword', e.target.value)} error={errors.confirmPassword} required />
            </fieldset>
            <Checkbox checked={form.acceptTerms} onChange={(v) => set('acceptTerms', v)} label="I understand this is a prototype with fictional data and that I should not enter real personal information." error={errors.acceptTerms} />
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-600">
                Already registered?{' '}
                <Link to="/login" className="font-semibold text-navy-800 hover:underline focus-visible:outline-2 focus-visible:outline-navy-500">
                  Sign in
                </Link>
              </p>
              <Button type="submit" size="lg" icon={UserPlus} loading={busy} loadingLabel="Creating account…">
                Create account
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
