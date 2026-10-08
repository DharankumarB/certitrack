import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

export interface Crumb {
  label: string;
  to?: string;
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="flex flex-wrap items-center gap-1 text-xs text-slate-600">
        {items.map((item, i) => (
          <li key={`${item.label}-${i}`} className="flex min-w-0 items-center gap-1">
            {i > 0 && <ChevronRight className="size-3.5 shrink-0 text-slate-400" aria-hidden="true" />}
            {item.to && i < items.length - 1 ? (
              <Link to={item.to} className="truncate rounded hover:text-navy-800 hover:underline focus-visible:outline-2 focus-visible:outline-navy-500">
                {item.label}
              </Link>
            ) : (
              <span aria-current={i === items.length - 1 ? 'page' : undefined} className="truncate font-medium text-slate-800">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function PageHeader({ title, description, actions, breadcrumbs, eyebrow, id }: { title: string; description?: ReactNode; actions?: ReactNode; breadcrumbs?: Crumb[]; eyebrow?: ReactNode; id?: string }) {
  return (
    <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0 space-y-2">
        {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
        {eyebrow && <div className="text-xs font-semibold uppercase tracking-wider text-navy-700">{eyebrow}</div>}
        <h1 id={id} className="text-2xl font-bold tracking-tight text-navy-900 sm:text-3xl">
          {title}
        </h1>
        {description && <div className="max-w-3xl text-sm leading-relaxed text-slate-600 sm:text-base">{description}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 md:shrink-0">{actions}</div>}
    </header>
  );
}
