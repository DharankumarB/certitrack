import { ArrowRight, Building2, ShieldCheck, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ButtonLink } from '../../components/ui/Button';
import { Card, CardBody } from '../../components/ui/Card';
import { usePageTitle } from '../../hooks/usePageTitle';

const OPTIONS = [
  { icon: UserRound, title: 'Citizen', description: 'Sign in or create a citizen account to apply for and track certificates.', signIn: '/citizen/login', register: '/citizen/register' },
  { icon: Building2, title: 'Department staff', description: 'Sign in to an approved department account or submit a staff registration for review.', signIn: '/staff/login', register: '/staff/register' },
  { icon: ShieldCheck, title: 'Administrator', description: 'Access the administrative workspace or set up the first local-development administrator.', signIn: '/admin/login', register: '/admin/register' },
];

export default function AuthLandingPage() {
  usePageTitle('Choose sign-in');
  return (
    <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 md:py-16 lg:px-8">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-gov-700">CertiTrack account access</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-navy-900 sm:text-4xl">Choose your workspace</h1>
        <p className="mt-3 text-base leading-relaxed text-slate-600">Separate sign-in and registration flows for citizens, department staff, and administrators.</p>
      </div>
      <div className="mt-9 grid gap-5 md:grid-cols-3">
        {OPTIONS.map(({ icon: Icon, title, description, signIn, register }) => (
          <Card key={title} className="flex min-w-0 flex-col">
            <CardBody className="flex flex-1 flex-col gap-4 p-6">
              <span className="flex size-12 items-center justify-center rounded-xl bg-navy-50 text-navy-800"><Icon className="size-6" aria-hidden="true" /></span>
              <div>
                <h2 className="text-lg font-semibold text-navy-900">{title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{description}</p>
              </div>
              <div className="mt-auto flex flex-col gap-2 pt-2">
                <ButtonLink to={signIn} iconRight={ArrowRight}>Sign in</ButtonLink>
                <ButtonLink to={register} variant="secondary">{title === 'Administrator' ? 'First administrator setup' : title === 'Department staff' ? 'Staff registration' : 'Create account'}</ButtonLink>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
      <p className="mt-7 text-center text-xs text-slate-500">Local development prototype only. Browser-stored accounts and sessions are not secure production authentication.</p>
      <p className="mt-5 text-center text-sm"><Link to="/" className="font-semibold text-navy-800 hover:underline">Back to public homepage</Link></p>
    </main>
  );
}
