import { useState, type FormEvent } from 'react';
import { KeyRound, Save, ShieldCheck, Building2, UserRound } from 'lucide-react';
import { useCurrentUser } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { usePageTitle } from '../../hooks/usePageTitle';
import { changePassword, updateNotificationPreferences, updateProfile, type ProfilePatch } from '../../services/userService';
import { isServiceError, errorMessage } from '../../services/api';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card, CardBody, CardHeader, KeyValue } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { SelectField, Switch, TextAreaField, TextField } from '../../components/ui/Forms';
import { Alert } from '../../components/ui/Feedback';
import { Avatar } from '../../components/layout/Avatar';
import { SecurityNote } from '../../components/domain/Notices';
import { DISTRICTS, DISTRICT_TALUKS, GENDER_OPTIONS, LANGUAGE_OPTIONS } from '../../config/geography';
import { ROLE_LABEL } from '../../config/navigation';
import { mockDepartments } from '../../data/mockDepartments';
import { useAppState } from '../../hooks/useAppState';
import type { CitizenUser, OfficerUser, AdminUser, User } from '../../types';
import { maskEmail, maskMobile } from '../../utils/format';

type Errors = Partial<Record<keyof ProfilePatch | 'current' | 'next' | 'confirm', string>>;

export default function ProfilePage() {
  usePageTitle('Profile');
  const user = useCurrentUser();
  return (
    <div className="space-y-6">
      <PageHeader title="Profile and settings" description="Your contact details, notification choices and password." id="profile-title" />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem] grid-cols-1">
        <div className="min-w-0 space-y-6">
          <ProfileForm key={user.id} user={user} />
          <PasswordForm user={user} />
        </div>
        <aside className="space-y-6">
          <AccountSummary user={user} />
          {user.role === 'citizen' && <ChannelPrefs user={user as CitizenUser} />}
        </aside>
      </div>
    </div>
  );
}

function ProfileForm({ user }: { user: User }) {
  const { toast } = useToast();
  const citizen = user.role === 'citizen' ? (user as CitizenUser) : null;
  const [form, setForm] = useState<ProfilePatch>({
    name: user.name,
    email: user.email,
    mobile: user.mobile,
    address: citizen?.address ?? '',
    district: citizen?.district ?? '',
    taluk: citizen?.taluk ?? '',
    village: citizen?.village ?? '',
    gender: citizen?.gender ?? '',
    dob: citizen?.dateOfBirth ?? '',
    language: citizen?.language ?? 'en',
  });
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const set = <K extends keyof ProfilePatch>(k: K, v: ProfilePatch[K]) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    setFormError(null);
    try {
      await updateProfile(user, form);
      toast({ title: 'Profile saved', description: 'Your details are updated and the change is audit-logged.' });
    } catch (err) {
      if (isServiceError(err) && err.fieldErrors) setErrors(err.fieldErrors as Errors);
      setFormError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader title="Contact and personal details" description={citizen ? 'Used for new applications. Existing applications keep the details they were submitted with.' : 'Your account contact details.'} />
      <CardBody>
        {formError && <Alert tone="danger" className="mb-5">{formError}</Alert>}
        <form onSubmit={submit} noValidate className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2 grid-cols-1">
            <TextField label="Full name" value={form.name} onChange={(e) => set('name', e.target.value)} error={errors.name} required autoComplete="name" />
            <TextField label="Email" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} error={errors.email} required autoComplete="email" />
            <TextField label="Mobile number" inputMode="tel" value={form.mobile} onChange={(e) => set('mobile', e.target.value)} error={errors.mobile} required autoComplete="tel" />
            {citizen && <TextField label="Date of birth" type="date" value={form.dob} onChange={(e) => set('dob', e.target.value)} error={errors.dob} required />}
            {citizen && <SelectField label="Gender" value={form.gender} onChange={(e) => set('gender', e.target.value)} error={errors.gender} placeholder="Select" options={GENDER_OPTIONS.map((g) => ({ value: g, label: g }))} />}
            {citizen && <SelectField label="Preferred language" value={form.language} onChange={(e) => set('language', e.target.value as ProfilePatch['language'])} options={LANGUAGE_OPTIONS.map((l) => ({ value: l.code, label: l.label }))} hint="Interface translations are not part of this prototype." />}
            {citizen && (
              <>
                <TextAreaField label="Address" value={form.address} onChange={(e) => set('address', e.target.value)} error={errors.address} required rows={2} wrapperClassName="sm:col-span-2" />
                <SelectField label="District" value={form.district} onChange={(e) => setForm((f) => ({ ...f, district: e.target.value, taluk: '' }))} error={errors.district} required placeholder="Select" options={DISTRICTS.map((d) => ({ value: d, label: d }))} />
                <SelectField label="Taluk" value={form.taluk} onChange={(e) => set('taluk', e.target.value)} error={errors.taluk} required placeholder={form.district ? 'Select' : 'Choose a district first'} disabled={!form.district} options={(DISTRICT_TALUKS[form.district] ?? []).map((t) => ({ value: t, label: t }))} />
                <TextField label="Village or town" value={form.village} onChange={(e) => set('village', e.target.value)} error={errors.village} required />
              </>
            )}
          </div>
          <div className="flex justify-end">
            <Button type="submit" icon={Save} loading={saving} loadingLabel="Saving…">
              Save changes
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}

function PasswordForm({ user }: { user: User }) {
  const { toast } = useToast();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      await changePassword(user, current, next, confirm);
      setCurrent('');
      setNext('');
      setConfirm('');
      toast({ title: 'Password changed', description: 'Use the new password the next time you sign in.' });
    } catch (err) {
      if (isServiceError(err) && err.fieldErrors) setErrors(err.fieldErrors as Errors);
      else toast({ tone: 'danger', title: 'Password not changed', description: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card>
      <CardHeader title="Password" description="Passwords are stored as SHA-256 digests in this prototype, never in plain text." />
      <CardBody>
        <form onSubmit={submit} noValidate className="grid gap-5 sm:grid-cols-3 grid-cols-1">
          <TextField label="Current password" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} error={errors.current} required />
          <TextField label="New password" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} error={errors.next} required hint="8+ characters, letters and numbers" />
          <TextField label="Confirm new password" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} error={errors.confirm} required />
          <div className="sm:col-span-3 flex justify-end">
            <Button type="submit" variant="secondary" icon={KeyRound} loading={busy} loadingLabel="Updating…">
              Update password
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}

function ChannelPrefs({ user }: { user: CitizenUser }) {
  const { toast } = useToast();
  const [prefs, setPrefs] = useState(user.notificationPrefs);
  const [saving, setSaving] = useState(false);
  const channelsOn = useAppState((s) => s.settings.channels);
  const apply = async (next: typeof prefs) => {
    setPrefs(next);
    setSaving(true);
    try {
      await updateNotificationPreferences(user, next);
      toast({ title: 'Notification choices saved' });
    } catch (err) {
      toast({ tone: 'danger', title: 'Not saved', description: errorMessage(err) });
    } finally {
      setSaving(false);
    }
  };
  return (
    <Card>
      <CardHeader title="Notification channels" description="In-app alerts are always on." />
      <CardBody className="space-y-5">
        <Switch label="WhatsApp updates (preview)" description={channelsOn.whatsapp ? 'Shown as a preview only in this prototype.' : 'Turned off by the administrator.'} checked={prefs.whatsapp} disabled={saving || !channelsOn.whatsapp} onChange={(v) => void apply({ ...prefs, whatsapp: v })} />
        <Switch label="E-mail updates" description={channelsOn.email ? 'Simulated: nothing is sent.' : 'Turned off by the administrator.'} checked={prefs.email} disabled={saving || !channelsOn.email} onChange={(v) => void apply({ ...prefs, email: v })} />
        <SecurityNote>Your choices are recorded in the audit trail.</SecurityNote>
      </CardBody>
    </Card>
  );
}

function AccountSummary({ user }: { user: User }) {
  const dept = user.role === 'officer' ? mockDepartments.find((d) => d.id === (user as OfficerUser).departmentId) : null;
  return (
    <Card>
      <CardBody className="space-y-5">
        <div className="flex items-center gap-4">
          <Avatar name={user.name} size="lg" />
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-navy-900">{user.name}</p>
            <p className="text-sm text-slate-600">{ROLE_LABEL[user.role]}</p>
          </div>
        </div>
        <KeyValue
          columns={1}
          items={[
            { label: 'Email', value: maskEmail(user.email) },
            { label: 'Mobile', value: maskMobile(user.mobile) },
            ...(user.role === 'officer' ? [{ label: 'Employee ID', value: (user as OfficerUser).employeeId }, { label: 'Department', value: dept?.name ?? '—' }, { label: 'Designation', value: (user as OfficerUser).designation }] : []),
            ...(user.role === 'admin' ? [{ label: 'Designation', value: (user as AdminUser).designation }] : []),
          ]}
        />
        {user.role === 'officer' && (
          <p className="flex items-start gap-2 text-xs text-slate-600">
            <Building2 className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" /> You can open and decide on files from {dept?.name} only.
          </p>
        )}
        {user.role === 'admin' && (
          <div>
            <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <ShieldCheck className="size-3.5" aria-hidden="true" /> System access
            </p>
            <ul className="flex flex-wrap gap-1.5">
              {(user as AdminUser).systemAccess.map((a) => (
                <li key={a} className="rounded-full bg-navy-50 px-2.5 py-1 text-xs font-medium text-navy-800">
                  {a}
                </li>
              ))}
            </ul>
          </div>
        )}
        {user.role === 'citizen' && (
          <p className="flex items-start gap-2 text-xs text-slate-600">
            <UserRound className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" /> Your records are visible to you and to the officers handling your applications.
          </p>
        )}
      </CardBody>
    </Card>
  );
}
