import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

interface FieldShellProps {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  optionalLabel?: boolean;
  children: ReactNode;
  className?: string;
  labelClassName?: string;
}

export function FieldShell({ id, label, hint, error, required, optionalLabel, children, className, labelClassName }: FieldShellProps) {
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      <label htmlFor={id} className={cn('text-sm font-medium text-slate-800', labelClassName)}>
        {label}
        {required && <span className="ml-0.5 text-red-700" aria-hidden="true"> *</span>}
        {optionalLabel && <span className="ml-1.5 text-xs font-normal text-slate-500">(optional)</span>}
      </label>
      {children}
      {hint && !error && (
        <p id={hintId} className="text-xs text-slate-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="flex items-start gap-1 text-xs font-medium text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

const controlBase =
  'w-full min-h-11 rounded-lg border bg-white px-3 py-2 text-base text-slate-900 placeholder:text-slate-400 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-navy-500/40 focus:border-navy-600 disabled:bg-slate-100 disabled:text-slate-500 sm:text-sm';

function controlClass(error?: string) {
  return cn(controlBase, error ? 'border-red-600 bg-red-50/40' : 'border-slate-300');
}

export interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  optionalLabel?: boolean;
  wrapperClassName?: string;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField({ label, hint, error, optionalLabel, required, wrapperClassName, id, className, ...rest }, ref) {
  const generated = useId();
  const fieldId = id ?? generated;
  const describedBy = [error ? `${fieldId}-error` : null, hint && !error ? `${fieldId}-hint` : null].filter(Boolean).join(' ') || undefined;
  return (
    <FieldShell id={fieldId} label={label} hint={hint} error={error} required={required} optionalLabel={optionalLabel} className={wrapperClassName}>
      <input ref={ref} id={fieldId} required={required} aria-invalid={error ? true : undefined} aria-describedby={describedBy} className={cn(controlClass(error), className)} {...rest} />
    </FieldShell>
  );
});

export interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  wrapperClassName?: string;
}

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(function SelectField({ label, hint, error, options, placeholder, required, wrapperClassName, id, className, ...rest }, ref) {
  const generated = useId();
  const fieldId = id ?? generated;
  const describedBy = [error ? `${fieldId}-error` : null, hint && !error ? `${fieldId}-hint` : null].filter(Boolean).join(' ') || undefined;
  return (
    <FieldShell id={fieldId} label={label} hint={hint} error={error} required={required} className={wrapperClassName}>
      <select ref={ref} id={fieldId} required={required} aria-invalid={error ? true : undefined} aria-describedby={describedBy} className={cn(controlClass(error), 'pr-8', className)} {...rest}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
});

export interface TextAreaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  wrapperClassName?: string;
}

export const TextAreaField = forwardRef<HTMLTextAreaElement, TextAreaFieldProps>(function TextAreaField({ label, hint, error, required, wrapperClassName, id, className, rows = 4, ...rest }, ref) {
  const generated = useId();
  const fieldId = id ?? generated;
  const describedBy = [error ? `${fieldId}-error` : null, hint && !error ? `${fieldId}-hint` : null].filter(Boolean).join(' ') || undefined;
  return (
    <FieldShell id={fieldId} label={label} hint={hint} error={error} required={required} className={wrapperClassName}>
      <textarea ref={ref} id={fieldId} rows={rows} required={required} aria-invalid={error ? true : undefined} aria-describedby={describedBy} className={cn(controlClass(error), 'min-h-24 resize-y', className)} {...rest} />
    </FieldShell>
  );
});

export function Checkbox({ id, checked, onChange, label, description, error, disabled, name }: { id?: string; checked: boolean; onChange: (checked: boolean) => void; label: ReactNode; description?: ReactNode; error?: string; disabled?: boolean; name?: string }) {
  const generated = useId();
  const fieldId = id ?? generated;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-start gap-3">
        <input
          id={fieldId}
          name={name}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${fieldId}-error` : description ? `${fieldId}-desc` : undefined}
          className="mt-0.5 size-5 shrink-0 rounded border-slate-400 text-navy-800 focus:ring-2 focus:ring-navy-500/40 disabled:opacity-50"
        />
        <div className="min-w-0">
          <label htmlFor={fieldId} className="text-sm font-medium text-slate-800">
            {label}
          </label>
          {description && (
            <p id={`${fieldId}-desc`} className="text-xs text-slate-500">
              {description}
            </p>
          )}
        </div>
      </div>
      {error && (
        <p id={`${fieldId}-error`} role="alert" className="text-xs font-medium text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

export function Switch({ checked, onChange, label, description, disabled }: { checked: boolean; onChange: (checked: boolean) => void; label: string; description?: string; disabled?: boolean }) {
  const generated = useId();
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p id={`${generated}-label`} className="text-sm font-medium text-slate-800">
          {label}
        </p>
        {description && <p className="text-xs text-slate-500">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${generated}-label`}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn('relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-500 disabled:opacity-50', checked ? 'bg-gov-600' : 'bg-slate-300')}
      >
        <span className={cn('inline-block size-5 rounded-full bg-white shadow transition-transform', checked ? 'translate-x-6' : 'translate-x-1')} />
        <span className="sr-only">{checked ? 'On' : 'Off'}</span>
      </button>
    </div>
  );
}
