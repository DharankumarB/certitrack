import { ArrowRight, Bell, Building2, FileCheck2, Fingerprint, Landmark, Lock, MessageCircle, Route, ScanSearch, ShieldCheck, Smartphone, Sparkles, Users } from 'lucide-react';
import { ButtonLink } from '../../components/ui/Button';
import { Disclosure } from '../../components/ui/Disclosure';
import { Badge } from '../../components/ui/Badge';
import { IntegrationBadge } from '../../components/ui/IntegrationBadge';
import { AIDisclaimer } from '../../components/domain/Notices';
import { WhatsAppPreview } from '../../components/domain/Notifications';
import { StageProgress } from '../../components/domain/Timeline';
import { FAQ_ITEMS } from '../../data/faq';
import { CERTIFICATE_TYPE_LIST } from '../../config/certificateTypes';
import { WORKFLOW_STAGES } from '../../config/workflow';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useAuth } from '../../context/AuthContext';
import { ROLE_HOME } from '../../config/navigation';
import type { StageStep } from '../../utils/stages';
import { Card, CardBody } from '../../components/ui/Card';

const SAMPLE_STEPS: StageStep[] = WORKFLOW_STAGES.map((s, i) => ({
  ...s,
  state: i < 3 ? 'complete' : i === 3 ? 'current' : 'upcoming',
  at: null,
  events: [],
}));

const AI_CHECKS = ['Document type', 'Readability', 'OCR extraction', 'Name matching', 'Date of birth', 'Completeness', 'Duplicate detection', 'Tampering indicators', 'Seal & date consistency'];

const ROLES = [
  { icon: Users, title: 'Citizen', text: 'Sees only your own applications, documents, notifications and certificates.' },
  { icon: Building2, title: 'Department officer', text: 'Sees only files from their own department. Any attempt to open another department’s file is blocked and logged.' },
  { icon: ShieldCheck, title: 'Super Admin', text: 'Oversight across departments: dashboards, analytics and the full audit trail. Admins do not read citizen document contents.' },
];

const ROADMAP = [
  { phase: 'Now · Prototype', text: 'Clickable end-to-end workflow with demo data, simulated AI, e-sign and courier.' },
  { phase: 'Next · Pilot', text: 'Connect a document-store and OCR service, plus department case-management data. Pilot in one district.' },
  { phase: 'Later · Production', text: 'Licensed e-sign provider, WhatsApp Business API, DigiLocker-style record linkage and hardened audit controls.' },
];

export default function LandingPage() {
  usePageTitle();
  const { user } = useAuth();
  const dashboard = user ? ROLE_HOME[user.role] : null;
  return (
    <div>
      {/* Hero */}
      <section aria-labelledby="hero-title" className="relative overflow-hidden bg-navy-900 text-white">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:radial-gradient(circle_at_1px_1px,#fff_1px,transparent_0)] [background-size:22px_22px]" />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-14 sm:px-6 md:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:px-8">
          <div className="min-w-0 space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="demo" icon={Sparkles}>Prototype · demo data only</Badge>
            </div>
            <h1 id="hero-title" className="text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl">
              One portal for every government certificate, <span className="text-amber-300">tracked live</span> from application to doorstep.
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-slate-200 sm:text-lg">
              Apply once, see every stage with timestamps, get an AI-assisted document pre-check, and collect your certificate in a secure locker. Officers decide in their own department, and every step is audit-logged.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              {dashboard ? (
                <ButtonLink to={dashboard} size="lg" iconRight={ArrowRight} className="bg-amber-400 text-navy-950 hover:bg-amber-300">
                  Open my dashboard
                </ButtonLink>
              ) : (
                <ButtonLink to="/login?next=/citizen/apply" size="lg" iconRight={ArrowRight} className="bg-amber-400 text-navy-950 hover:bg-amber-300">
                  Apply for a certificate
                </ButtonLink>
              )}
              <ButtonLink to="/track" size="lg" variant="onDark" icon={Route}>
                Track an application
              </ButtonLink>
              <ButtonLink to="/login#demo" size="lg" variant="ghost" className="text-white hover:bg-white/10">
                Try the demo accounts
              </ButtonLink>
            </div>
            <p className="text-xs text-slate-300">Sign in with a demo account. No real credentials or personal data are used.</p>
          </div>
          <div className="min-w-0 rounded-2xl border border-white/10 bg-white p-5 text-navy-900 shadow-2xl sm:p-6" aria-label="Example application journey">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sample application</p>
                <p className="truncate font-semibold">Caste Certificate · APP-10294</p>
              </div>
              <IntegrationBadge kind="prototype" />
            </div>
            <div className="mt-5">
              <StageProgress steps={SAMPLE_STEPS} />
            </div>
            <ul className="mt-6 space-y-3 text-sm">
              <li className="flex items-start gap-3 rounded-lg bg-slate-50 p-3">
                <ScanSearch className="mt-0.5 size-4 shrink-0 text-navy-700" aria-hidden="true" />
                <span>AI pre-check: all 4 documents verified. <span className="text-slate-600">Advisory only.</span></span>
              </li>
              <li className="flex items-start gap-3 rounded-lg bg-slate-50 p-3">
                <Fingerprint className="mt-0.5 size-4 shrink-0 text-navy-700" aria-hidden="true" />
                <span>Officer review in the Caste Certificate Department. Decision by the authorised officer.</span>
              </li>
              <li className="flex items-start gap-3 rounded-lg bg-slate-50 p-3">
                <Bell className="mt-0.5 size-4 shrink-0 text-navy-700" aria-hidden="true" />
                <span>Citizen notified in-app. WhatsApp shown as a preview only.</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Problem */}
      <section aria-labelledby="problem-title" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="The problem" id="problem-title" title="Certificates still move through separate offices, forms and phone calls." />
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {[
            { t: 'Separate portals', d: 'Each certificate has its own website, login and form, so citizens repeat the same details.' },
            { t: 'Unclear status', d: 'Applicants ask “where is my file?” because no single view shows the stage, the department and the next step.' },
            { t: 'Manual document checks', d: 'Officers check unreadable, mismatched or edited scans by hand, which slows every queue.' },
          ].map((p) => (
            <Card key={p.t}>
              <CardBody>
                <h3 className="font-semibold text-navy-900">{p.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{p.d}</p>
              </CardBody>
            </Card>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section aria-labelledby="how-title" className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="How it works" id="how-title" title="Six stages, one timeline" text="Every stage shows its timestamp, department, action and description. Click any stage in the app for full detail." />
          <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {WORKFLOW_STAGES.map((s, i) => (
              <li key={s.id} className="flex gap-4 rounded-xl border border-slate-200 p-5">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-navy-800 text-sm font-bold text-white">{i + 1}</span>
                <div>
                  <h3 className="font-semibold text-navy-900">{s.label}</h3>
                  <p className="mt-1 text-sm text-slate-600">{s.description}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {CERTIFICATE_TYPE_LIST.map((c) => (
              <div key={c.id} className="rounded-xl bg-slate-50 p-5">
                <p className="font-semibold text-navy-900">{c.label}</p>
                <p className="mt-1 text-sm text-slate-600">{c.description}</p>
                <p className="mt-3 text-xs font-semibold text-navy-800">Service standard: {c.slaDays} days (prototype)</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI document check */}
      <section aria-labelledby="ai-title" className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-8">
        <div className="space-y-5">
          <SectionHeading eyebrow="AI document check" id="ai-title" title="Catch problems before they reach a queue." text="Nine automated pre-checks run when you upload. If something is wrong, you see exactly what to fix and can upload again before you submit." />
          <AIDisclaimer />
        </div>
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {AI_CHECKS.map((c) => (
            <li key={c} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-800">
              <FileCheck2 className="size-4 shrink-0 text-gov-700" aria-hidden="true" />
              {c}
            </li>
          ))}
        </ul>
      </section>

      {/* Live tracking + locker */}
      <section aria-labelledby="track-title" className="bg-navy-50/70 py-16">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 md:grid-cols-2 lg:px-8">
          <Card>
            <CardBody className="space-y-4">
              <Route className="size-6 text-navy-700" aria-hidden="true" />
              <h2 id="track-title" className="text-xl font-bold text-navy-900">Live tracking</h2>
              <p className="text-sm leading-relaxed text-slate-600">“Where is my file?” is answered on one screen: the current stage, what has happened, and what happens next. Delivery shows the courier stages through to your doorstep.</p>
              <ButtonLink to="/track" variant="secondary" icon={Route}>Track with an Application ID</ButtonLink>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="space-y-4">
              <Lock className="size-6 text-navy-700" aria-hidden="true" />
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold text-navy-900">Certificate Locker</h2>
                <IntegrationBadge kind="production" />
              </div>
              <p className="text-sm leading-relaxed text-slate-600">Issued certificates appear in one locker with view, download, share and verify actions. Share links show your name only when you choose to.</p>
              <p className="text-xs text-slate-500">Prototype certificates have no legal validity.</p>
            </CardBody>
          </Card>
        </div>
      </section>

      {/* WhatsApp */}
      <section aria-labelledby="wa-title" className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:px-8">
        <div className="space-y-5">
          <SectionHeading eyebrow="WhatsApp updates" id="wa-title" title="Updates where people already look." text="Citizens can choose WhatsApp or e-mail alongside in-app alerts. In this prototype the message is shown as a preview and nothing is sent." />
          <div className="flex flex-wrap gap-2">
            <IntegrationBadge kind="production" />
            <Badge tone="neutral" icon={MessageCircle}>Preview only</Badge>
          </div>
        </div>
        <WhatsAppPreview title="CertiTrack Updates" message="Your caste certificate has been issued. Download it from your locker. (APP-10294)" />
      </section>

      {/* Roles & security */}
      <section aria-labelledby="security-title" className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="Role-based security" id="security-title" title="Each role sees only what it needs." />
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {ROLES.map((r) => (
              <div key={r.title} className="rounded-xl border border-slate-200 p-6">
                <r.icon className="size-6 text-navy-700" aria-hidden="true" />
                <h3 className="mt-3 font-semibold text-navy-900">{r.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{r.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Impact & roadmap */}
      <section aria-labelledby="impact-title" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-2">
          <div className="space-y-5">
            <SectionHeading eyebrow="Impact" id="impact-title" title="Measurable service standards" text="The prototype publishes a decision deadline per department. Pilot results would be measured against these targets, not assumed." />
            <ul className="grid gap-3 sm:grid-cols-3">
              {mockImpact.map((i) => (
                <li key={i.label} className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-2xl font-bold text-navy-900">{i.value}</p>
                  <p className="mt-1 text-xs text-slate-600">{i.label}</p>
                </li>
              ))}
            </ul>
            <p className="text-xs text-slate-500">Targets from the prototype configuration. Not measured outcomes.</p>
          </div>
          <div className="space-y-5">
            <SectionHeading eyebrow="Roadmap" id="roadmap-title" title="From prototype to production" />
            <ol className="space-y-3">
              {ROADMAP.map((r) => (
                <li key={r.phase} className="flex gap-4 rounded-xl border border-slate-200 p-4">
                  <Landmark className="mt-0.5 size-5 shrink-0 text-navy-700" aria-hidden="true" />
                  <div>
                    <p className="font-semibold text-navy-900">{r.phase}</p>
                    <p className="text-sm text-slate-600">{r.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section aria-labelledby="faq-title" className="bg-slate-50 py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="FAQ" id="faq-title" title="Common questions" />
          <div className="mt-8 rounded-xl border border-slate-200 bg-white px-5 sm:px-6">
            {FAQ_ITEMS.slice(0, 5).map((f) => (
              <Disclosure key={f.id} title={f.question}>
                {f.answer}
              </Disclosure>
            ))}
          </div>
          <p className="mt-4 text-sm">
            <ButtonLink to="/help" variant="link" iconRight={ArrowRight}>See all help topics</ButtonLink>
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section aria-labelledby="cta-title" className="bg-navy-900 py-14 text-white">
        <div className="mx-auto flex max-w-5xl flex-col items-start gap-6 px-4 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div className="space-y-2">
            <h2 id="cta-title" className="text-2xl font-bold">Explore the full workflow with demo accounts</h2>
            <p className="max-w-2xl text-sm text-slate-300">Citizen, officer and Super Admin workspaces are all live in this prototype. Items marked “Production integration required” are not connected.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <ButtonLink to="/login#demo" size="lg" className="bg-amber-400 text-navy-950 hover:bg-amber-300" icon={Users}>Open demo accounts</ButtonLink>
            <ButtonLink to="/help" size="lg" variant="onDark" icon={Smartphone}>Guided demo steps</ButtonLink>
          </div>
        </div>
      </section>
    </div>
  );
}

const mockImpact = [
  { value: '5 days', label: 'Income Certificate service standard' },
  { value: '7 days', label: 'Caste and Domicile service standard' },
  { value: '6 stages', label: 'Tracked end-to-end with timestamps' },
];

function SectionHeading({ eyebrow, title, text, id }: { eyebrow: string; title: string; text?: string; id: string }) {
  return (
    <div className="max-w-2xl space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-navy-700">{eyebrow}</p>
      <h2 id={id} className="text-3xl font-bold tracking-tight text-navy-900">
        {title}
      </h2>
      {text && <p className="text-base leading-relaxed text-slate-600">{text}</p>}
    </div>
  );
}

