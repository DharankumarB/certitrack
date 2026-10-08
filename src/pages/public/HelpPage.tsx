import { useMemo, useState } from 'react';
import { Search, Phone, ShieldCheck, Route, CircleHelp } from 'lucide-react';
import { FAQ_ITEMS, DEMO_WALKTHROUGH } from '../../data/faq';
import { Disclosure } from '../../components/ui/Disclosure';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { TextField } from '../../components/ui/Forms';
import { EmptyState } from '../../components/ui/Feedback';
import { ButtonLink } from '../../components/ui/Button';
import { IntegrationBadge } from '../../components/ui/IntegrationBadge';
import { PageHeader } from '../../components/layout/PageHeader';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useAuth } from '../../context/AuthContext';
import { ROLE_LABEL } from '../../config/navigation';

export default function HelpPage() {
  usePageTitle('Help and FAQs');
  const { user } = useAuth();
  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return FAQ_ITEMS;
    return FAQ_ITEMS.filter((f) => `${f.question} ${f.answer} ${f.category}`.toLowerCase().includes(term));
  }, [q]);
  const groups = useMemo(() => {
    const map = new Map<string, typeof FAQ_ITEMS>();
    for (const f of filtered) map.set(f.category, [...(map.get(f.category) ?? []), f]);
    return [...map.entries()];
  }, [filtered]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 md:py-12 lg:px-8">
      <PageHeader
        title="Help and FAQs"
        description="Answers about applying, tracking, AI checks, decisions, certificates and notifications. Everything here reflects this prototype."
        actions={<IntegrationBadge kind="prototype" />}
        id="help-title"
      />
      <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
        <div className="min-w-0 space-y-6">
          <TextField label="Search help" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="For example: documents, WhatsApp, rejected" autoComplete="off" wrapperClassName="max-w-xl" />
          {groups.length === 0 && <EmptyState icon={Search} title="No matching answers" description="Try a shorter word, or open the demo steps for a guided tour." action={<ButtonLink to="/login#demo" variant="secondary">Open demo accounts</ButtonLink>} />}
          {groups.map(([category, items]) => (
            <Card key={category}>
              <CardHeader title={category} />
              <CardBody className="px-5 pb-2 pt-0">
                {items.map((f) => (
                  <Disclosure key={f.id} title={f.question} defaultOpen={items.length === 1}>
                    {f.answer}
                  </Disclosure>
                ))}
              </CardBody>
            </Card>
          ))}
        </div>

        <aside aria-label="Guided demo and support" className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <Card>
            <CardHeader title="Guided demo" description="Follow these steps to see every role." />
            <CardBody className="space-y-4">
              <ol className="space-y-3">
                {DEMO_WALKTHROUGH.map((step, i) => {
                  const mine = user?.role === step.role;
                  return (
                    <li key={step.title} className="text-sm">
                      <p className="flex items-center gap-2 font-semibold text-navy-900">
                        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-navy-800 text-[11px] text-white">{i + 1}</span>
                        {step.title}
                      </p>
                      <p className="ml-7 text-xs text-slate-600">
                        {ROLE_LABEL[step.role]} · {step.detail}
                      </p>
                      {user && mine ? (
                        <ButtonLink to={step.to} variant="link" size="sm" className="ml-7 mt-1">
                          Open
                        </ButtonLink>
                      ) : (
                        <p className="ml-7 mt-1 text-xs text-slate-500">{user ? 'Sign in as this role to open it.' : 'Sign in as this role to open it.'}</p>
                      )}
                    </li>
                  );
                })}
              </ol>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="space-y-3">
              <div className="flex items-center gap-2 text-navy-900">
                <Phone className="size-4" aria-hidden="true" />
                <h2 className="text-sm font-semibold">Support</h2>
              </div>
              <p className="text-sm text-slate-600">In production this section links to the department helpline and grievance desk. This prototype has no live helpline, so no contact details are shown.</p>
              <IntegrationBadge kind="production" />
            </CardBody>
          </Card>
          <Card>
            <CardBody className="space-y-3">
              <div className="flex items-center gap-2 text-navy-900">
                <ShieldCheck className="size-4" aria-hidden="true" />
                <h2 className="text-sm font-semibold">Security and privacy</h2>
              </div>
              <p className="text-sm text-slate-600">Citizens see their own records. Officers see their department only. All access and decisions are audit-logged. Passwords are stored as digests.</p>
              <div className="flex flex-wrap gap-2">
                <ButtonLink to="/track" variant="secondary" size="sm" icon={Route}>
                  Public tracker
                </ButtonLink>
                <ButtonLink to="/" variant="secondary" size="sm" icon={CircleHelp}>
                  About CertiTrack
                </ButtonLink>
              </div>
            </CardBody>
          </Card>
        </aside>
      </div>
    </div>
  );
}
