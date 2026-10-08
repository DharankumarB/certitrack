import { useEffect, useId, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, X, FileText, ShieldCheck, User as UserIcon } from 'lucide-react';
import type { User } from '../../types';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { globalSearch, type SearchResults } from '../../services/searchService';
import { useAppRev } from '../../hooks/useAppState';
import { formatDate } from '../../utils/format';
import { APPLICATION_STATUS_META } from '../../config/workflow';
import { CERTIFICATE_TYPES } from '../../config/certificateTypes';
import { cn } from '../../utils/cn';
import { workspaceBaseFor } from '../../config/navigation';

function applicationHref(user: User, id: string): string {
  if (user.role === 'citizen') return `/citizen/applications/${id}`;
  if ('departmentId' in user) return `/staff/${user.departmentId}/applications/${id}`;
  return `/admin/applications?q=${encodeURIComponent(id)}`;
}

/** Global search across Application IDs, Certificate IDs and applicant names, grouped by type. */
export function GlobalSearch({ user, autoFocus = false, onSelect }: { user: User; autoFocus?: boolean; onSelect?: () => void }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<{ query: string; data: SearchResults } | null>(null);
  const debounced = useDebouncedValue(query, 220);
  const rev = useAppRev();
  const rootRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const listId = useId();
  const workspaceBase = workspaceBaseFor(user);

  useEffect(() => {
    let active = true;
    if (debounced.trim().length < 2) return;
    globalSearch(user, debounced)
      .then((r) => {
        if (active) setResults({ query: debounced, data: r });
      })
      .catch(() => {
        if (active) setResults({ query: debounced, data: { applications: [], certificates: [], people: [] } });
      });
    return () => {
      active = false;
    };
  }, [debounced, user, rev]);
  const current = results && results.query === debounced ? results.data : null;
  const loading = debounced.trim().length >= 2 && !current;

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const showPanel = open && query.trim().length >= 2;
  const total = current ? current.applications.length + current.certificates.length + current.people.length : 0;
  const shown = current;
  const close = () => {
    setOpen(false);
    setQuery('');
    onSelect?.();
  };

  return (
    <div ref={rootRef} className="relative min-w-0 w-full">
      <label htmlFor={`${listId}-input`} className="sr-only">
        Search applications, certificates and applicants
      </label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
        <input
          id={`${listId}-input`}
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          autoFocus={autoFocus}
          data-autofocus={autoFocus ? '' : undefined}
          onKeyDown={(e) => {
            if (e.key === 'Escape') close();
            if (e.key === 'Enter' && shown) {
              const first = shown.applications[0] ? applicationHref(user, shown.applications[0].id) : shown.certificates[0] ? `${workspaceBase}/processed` : null;
              if (first) {
                navigate(first);
                close();
              }
            }
          }}
          placeholder="Search ID or name"
          autoComplete="off"
          role="combobox"
          aria-expanded={showPanel}
          aria-controls={listId}
          aria-autocomplete="list"
          className="h-10 w-full rounded-lg border border-slate-300 bg-slate-50 pl-9 pr-9 text-sm text-slate-900 placeholder:text-slate-500 focus:border-navy-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-500/30 [&::-webkit-search-cancel-button]:hidden"
        />
        {query && (
          <button type="button" onClick={close} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-500 hover:bg-slate-200 focus-visible:outline-2 focus-visible:outline-navy-500" aria-label="Clear search">
            <X className="size-4" aria-hidden="true" />
          </button>
        )}
      </div>
      {showPanel && (
        <div id={listId} className="absolute left-0 right-0 z-40 mt-2 max-h-[70vh] overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-xl animate-pop-in md:right-auto md:w-[28rem]">
          {loading && <p className="px-3 py-4 text-sm text-slate-500">Searching…</p>}
          {shown && total === 0 && <p className="px-3 py-4 text-sm text-slate-600">No matches for “{query.trim()}”. Try an Application ID such as APP-10294.</p>}
          {shown && shown.applications.length > 0 && (
            <Group title="Application ID">
              {shown.applications.map((a) => (
                <ResultLink key={a.id} to={applicationHref(user, a.id)} onDone={close} icon={FileText} title={a.id} subtitle={`${a.applicantName} · ${CERTIFICATE_TYPES[a.certificateType].label} · ${APPLICATION_STATUS_META[a.status].label}`} />
              ))}
            </Group>
          )}
          {shown && shown.certificates.length > 0 && (
            <Group title="Certificate ID">
              {shown.certificates.map((c) => (
                <ResultLink
                  key={c.id}
                  to={user.role === 'citizen' ? `/citizen/locker?cert=${c.id}` : `${workspaceBase}/processed?q=${encodeURIComponent(c.certificateNumber)}`}
                  onDone={close}
                  icon={ShieldCheck}
                  title={c.certificateNumber}
                  subtitle={`${c.applicantName} · issued ${formatDate(c.issuedAt)}`}
                />
              ))}
            </Group>
          )}
          {shown && shown.people.length > 0 && user.role !== 'citizen' && (
            <Group title="Applicant name">
              {shown.people.map((p) => (
                <ResultLink key={p.id} to={`${workspaceBase}/applications?q=${encodeURIComponent(p.name)}`} onDone={close} icon={UserIcon} title={p.name} subtitle={`${p.detail} · ${p.applicationIds.length} application${p.applicationIds.length > 1 ? 's' : ''}`} />
              ))}
            </Group>
          )}
        </div>
      )}
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="py-1">
      <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      <ul>{children}</ul>
    </div>
  );
}

function ResultLink({ to, onDone, icon: Icon, title, subtitle }: { to: string; onDone: () => void; icon: typeof FileText; title: string; subtitle: string }) {
  return (
    <li>
      <Link to={to} onClick={onDone} className={cn('flex items-start gap-3 rounded-lg px-3 py-2.5 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-navy-500')}>
        <Icon className="mt-0.5 size-4 shrink-0 text-navy-700" aria-hidden="true" />
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-navy-900">{title}</span>
          <span className="block truncate text-xs text-slate-600">{subtitle}</span>
        </span>
      </Link>
    </li>
  );
}
