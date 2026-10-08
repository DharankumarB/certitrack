import { Suspense, useEffect, useRef } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Logo } from '../components/ui/Logo';
import { ButtonLink } from '../components/ui/Button';
import { LoadingBlock } from '../components/ui/Feedback';
import { ROLE_HOME } from '../config/navigation';
import { cn } from '../utils/cn';

const LINKS = [
  { to: '/track', label: 'Track application' },
  { to: '/help', label: 'Help & FAQs' },
];

/** Layout for anonymous visitors: landing, sign-in, sign-up, public tracking and help. */
export function PublicLayout() {
  const { user } = useAuth();
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  useEffect(() => {
    mainRef.current?.focus({ preventScroll: true });
  }, [location.pathname]);
  return (
    <div className="flex min-h-dvh flex-col bg-white">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[80] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:shadow-lg">
        Skip to main content
      </a>
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link to="/" aria-label="CertiTrack home" className="rounded-md focus-visible:outline-2 focus-visible:outline-navy-500">
            <Logo taglineFromSm />
          </Link>
          <nav aria-label="Site" className="hidden items-center gap-1 md:flex">
            {LINKS.map((l) => (
              <Link key={l.to} to={l.to} aria-current={location.pathname === l.to ? 'page' : undefined} className={cn('rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-navy-900 focus-visible:outline-2 focus-visible:outline-navy-500', location.pathname === l.to && 'text-navy-900 bg-slate-100')}>
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            {user ? (
              <ButtonLink to={ROLE_HOME[user.role]} size="md">
                Open dashboard
              </ButtonLink>
            ) : (
              <>
                <ButtonLink to="/login" variant="ghost" className="hidden sm:inline-flex">
                  Sign in
                </ButtonLink>
                <ButtonLink to="/signup">Create account</ButtonLink>
              </>
            )}
          </div>
        </div>
        <nav aria-label="Site (mobile)" className="relative flex gap-1 overflow-x-auto border-t border-slate-100 px-4 py-2 md:hidden">
          {LINKS.map((l) => (
            <Link key={l.to} to={l.to} className="shrink-0 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 focus-visible:outline-2 focus-visible:outline-navy-500">
              {l.label}
            </Link>
          ))}
          {!user && (
            <Link to="/login" className="shrink-0 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 focus-visible:outline-2 focus-visible:outline-navy-500">
              Sign in
            </Link>
          )}
        </nav>
      </header>
      <main id="main-content" ref={mainRef} tabIndex={-1} className="flex-1 outline-none">
        <Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-16"><LoadingBlock variant="detail" label="Loading page" /></div>}>
          <Outlet />
        </Suspense>
      </main>
      <footer className="border-t border-navy-800 bg-navy-900 text-slate-300">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-3 lg:px-8 grid-cols-1">
          <div className="space-y-3">
            <Logo tone="light" />
            <p className="max-w-sm text-sm">CertiTrack is a prototype that shows how one portal could track government certificates from application to delivery.</p>
          </div>
          <div className="space-y-2 text-sm">
            <p className="font-semibold text-white">Prototype status</p>
            <p>Demo data is fictional. AI checks are decision support, the authorized officer makes the final decision, and certificates in this prototype have no legal validity.</p>
          </div>
          <div className="space-y-2 text-sm">
            <p className="font-semibold text-white">Explore</p>
            <ul className="space-y-1">
              <li><Link className="hover:text-white focus-visible:outline-2 focus-visible:outline-amber-300" to="/help">Help and FAQs</Link></li>
              <li><Link className="hover:text-white focus-visible:outline-2 focus-visible:outline-amber-300" to="/track">Track an application</Link></li>
              <li><Link className="hover:text-white focus-visible:outline-2 focus-visible:outline-amber-300" to="/login">Choose a sign-in option</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10 px-4 py-4 text-center text-xs text-slate-400">© CertiTrack prototype · Production Integration Required for DigiLocker, WhatsApp Business API, e-Sign and OCR services.</div>
      </footer>
    </div>
  );
}
