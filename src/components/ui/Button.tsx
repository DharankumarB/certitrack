import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, type LucideIcon } from 'lucide-react';
import { cn } from '../../utils/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'amber' | 'link' | 'onDark';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-navy-800 text-white shadow-sm hover:bg-navy-700 active:bg-navy-900',
  secondary: 'border border-slate-300 bg-white text-navy-900 shadow-sm hover:bg-slate-50 active:bg-slate-100',
  ghost: 'text-navy-800 hover:bg-navy-50 active:bg-navy-100',
  danger: 'bg-red-700 text-white shadow-sm hover:bg-red-800 active:bg-red-900',
  success: 'bg-gov-600 text-white shadow-sm hover:bg-gov-700 active:bg-gov-700',
  amber: 'bg-amber-400 text-navy-950 shadow-sm hover:bg-amber-300 active:bg-amber-500',
  link: 'px-0 text-navy-700 underline-offset-4 hover:underline',
  onDark: 'border border-white/20 bg-white/10 text-white hover:bg-white/20',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-sm gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-5 text-base gap-2',
  icon: 'size-10 justify-center',
};

export function buttonClasses(variant: ButtonVariant = 'primary', size: ButtonSize = 'md', fullWidth?: boolean, className?: string): string {
  // Callers that hide a button with `hidden` and reveal it with `md:inline-flex` must not also get the base display class.
  const display = className?.split(/\s+/).includes('hidden') ? '' : 'inline-flex';
  return cn(
    display,
    'items-center justify-center rounded-lg font-semibold whitespace-nowrap transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-55',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-500',
    VARIANTS[variant],
    SIZES[size],
    variant === 'link' && 'h-auto',
    fullWidth && 'w-full',
    className,
  );
}

export function ButtonLink({ to, variant = 'primary', size = 'md', icon: Icon, iconRight: IconRight, children, className, fullWidth, onClick }: { to: string; variant?: ButtonVariant; size?: ButtonSize; icon?: LucideIcon; iconRight?: LucideIcon; children: ReactNode; className?: string; fullWidth?: boolean; onClick?: () => void }) {
  return (
    <Link to={to} onClick={onClick} className={buttonClasses(variant, size, fullWidth, className)}>
      {Icon && <Icon className="size-4 shrink-0" aria-hidden="true" />}
      {children}
      {IconRight && <IconRight className="size-4 shrink-0" aria-hidden="true" />}
    </Link>
  );
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  loadingLabel?: string;
  icon?: LucideIcon;
  iconRight?: LucideIcon;
  fullWidth?: boolean;
  children?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading = false, loadingLabel, icon: Icon, iconRight: IconRight, fullWidth, className, children, disabled, type = 'button', ...rest },
  ref,
) {
  const isIcon = size === 'icon';
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClasses(variant, size, fullWidth, className)}
      {...rest}
    >
      {loading ? <Loader2 className={cn('size-4 animate-spin', isIcon && 'size-5')} aria-hidden="true" /> : Icon && <Icon className={cn('size-4 shrink-0', size === 'lg' && 'size-5')} aria-hidden="true" />}
      {loading && loadingLabel ? loadingLabel : children}
      {!loading && IconRight && <IconRight className="size-4 shrink-0" aria-hidden="true" />}
    </button>
  );
});
