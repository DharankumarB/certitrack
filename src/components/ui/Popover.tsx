import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { cn } from '../../utils/cn';

interface PopoverProps {
  label: string;
  trigger: (props: { open: boolean; id: string; onClick: () => void; 'aria-expanded': boolean; 'aria-haspopup': 'dialog' }) => ReactNode;
  children: (close: () => void) => ReactNode;
  align?: 'left' | 'right';
  panelClassName?: string;
}

/** Disclosure-style popover: closes on outside click or Escape and returns focus to its trigger. */
export function Popover({ label, trigger, children, align = 'right', panelClassName }: PopoverProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.querySelector<HTMLElement>('button')?.focus();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <div ref={triggerRef}>
        {trigger({ open, id: panelId, onClick: () => setOpen((v) => !v), 'aria-expanded': open, 'aria-haspopup': 'dialog' })}
      </div>
      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label={label}
          className={cn(
            'absolute z-40 mt-2 max-h-[70vh] overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-xl animate-pop-in',
            align === 'right' ? 'right-0' : 'left-0',
            panelClassName ?? 'w-80',
          )}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}
