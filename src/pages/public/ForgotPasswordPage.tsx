import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { MailCheck, Mail } from 'lucide-react';
import { usePageTitle } from '../../hooks/usePageTitle';
import { Button, ButtonLink } from '../../components/ui/Button';
import { TextField } from '../../components/ui/Forms';
import { Alert } from '../../components/ui/Feedback';
import { Card, CardBody } from '../../components/ui/Card';
import { requestPasswordReset } from '../../services/authService';
import { errorMessage, isServiceError } from '../../services/api';
import { IntegrationBadge } from '../../components/ui/IntegrationBadge';

export default function ForgotPasswordPage() {
  usePageTitle('Forgot password');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(undefined);
    setFormError(null);
    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch (err) {
      if (isServiceError(err) && err.fieldErrors?.email) setError(err.fieldErrors.email);
      else setFormError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl px-4 py-12 sm:px-6 md:py-16">
      <Card>
        <CardBody className="space-y-6 p-6 sm:p-8">
          {!sent ? (
            <>
              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-navy-900">Reset your password</h1>
                <p className="text-sm text-slate-600">Enter the email on your account. If it is registered, a reset link would be sent to it.</p>
                <IntegrationBadge kind="production" />
              </div>
              {formError && <Alert tone="danger">{formError}</Alert>}
              <form onSubmit={submit} noValidate className="space-y-5">
                <TextField label="Email address" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={error} required />
                <Button type="submit" fullWidth size="lg" icon={Mail} loading={busy} loadingLabel="Sending…">
                  Send reset link
                </Button>
              </form>
              <p className="text-center text-sm">
                <Link to="/login" className="font-semibold text-navy-800 hover:underline focus-visible:outline-2 focus-visible:outline-navy-500">
                  Back to sign in
                </Link>
              </p>
            </>
          ) : (
            <div className="space-y-5 text-center" role="status">
              <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-gov-50 text-gov-700">
                <MailCheck className="size-7" aria-hidden="true" />
              </span>
              <h1 className="text-2xl font-bold text-navy-900">Check your inbox</h1>
              <p className="text-sm text-slate-600">
                If an account exists for <span className="font-semibold">{email}</span>, a reset link would be sent. In this prototype no email is sent, so nothing arrives.
              </p>
              <Alert tone="info" className="text-left">
                Password recovery is not connected in this local prototype. Contact your system administrator for help restoring access.
              </Alert>
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                <ButtonLink to="/login" variant="secondary">
                  Return to sign in
                </ButtonLink>
              </div>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
