import { useMemo, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useIsDesktop } from '../../hooks/useMediaQuery';
import { cn } from '../../utils/cn';
import { Button } from './Button';

export interface Column<T> {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  className?: string;
  headerClassName?: string;
}

interface ResponsiveListProps<T> {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  /** Mobile card renderer. Rendered instead of the table below the md breakpoint. */
  card: (row: T) => ReactNode;
  caption: string;
  pageSize?: number;
  className?: string;
  tableMinWidth?: string;
}

/**
 * Data table on desktop, stacked cards on mobile. Pagination keeps long queues fast.
 * The table is wrapped in its own scroll container, so it can never cause page-level overflow.
 */
export function ResponsiveList<T>({ rows, columns, rowKey, card, caption, pageSize = 12, className, tableMinWidth = 'min-w-[720px]' }: ResponsiveListProps<T>) {
  const isDesktop = useIsDesktop();
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const current = Math.min(page, pageCount);
  const visible = useMemo(() => rows.slice((current - 1) * pageSize, current * pageSize), [rows, current, pageSize]);

  const pager = pageCount > 1 && (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-3 pt-4 text-sm text-slate-600">
      <span>
        Page {current} of {pageCount} · {rows.length} items
      </span>
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" icon={ChevronLeft} disabled={current === 1} onClick={() => setPage(current - 1)} aria-label="Previous page">
          Prev
        </Button>
        <Button variant="secondary" size="sm" iconRight={ChevronRight} disabled={current === pageCount} onClick={() => setPage(current + 1)} aria-label="Next page">
          Next
        </Button>
      </div>
    </nav>
  );

  if (!isDesktop) {
    return (
      <div className={cn('w-full', className)}>
        <ul className="space-y-3" aria-label={caption}>
          {visible.map((row) => (
            <li key={rowKey(row)}>{card(row)}</li>
          ))}
        </ul>
        {pager}
      </div>
    );
  }

  return (
    <div className={cn('w-full', className)}>
      <div className="w-full overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className={cn('w-full border-collapse text-left text-sm', tableMinWidth)}>
          <caption className="sr-only">{caption}</caption>
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
            <tr>
              {columns.map((c) => (
                <th key={c.key} scope="col" className={cn('px-4 py-3 font-semibold', c.headerClassName)}>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visible.map((row) => (
              <tr key={rowKey(row)} className="transition-colors hover:bg-navy-50/40">
                {columns.map((c) => (
                  <td key={c.key} className={cn('px-4 py-3 align-middle text-slate-800', c.className)}>
                    {c.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pager}
    </div>
  );
}
