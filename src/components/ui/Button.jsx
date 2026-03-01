import { clsx } from 'clsx'

const VARIANTS = {
  primary:   'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 shadow-sm',
  secondary: 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300',
  danger:    'bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800 shadow-sm',
  ghost:     'text-slate-600 hover:bg-slate-100 hover:text-slate-800',
  emerald:   'bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800 shadow-sm',
  amber:     'bg-amber-500 text-white hover:bg-amber-600 active:bg-amber-700 shadow-sm',
}

const SIZES = {
  sm:  'px-3 py-1.5 text-xs gap-1.5',
  md:  'px-4 py-2 text-sm gap-2',
  lg:  'px-5 py-2.5 text-sm gap-2',
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconRight: IconRight,
  disabled,
  loading,
  className,
  ...props
}) {
  return (
    <button
      disabled={disabled || loading}
      className={clsx(
        'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500/40',
        VARIANTS[variant] ?? VARIANTS.primary,
        SIZES[size] ?? SIZES.md,
        (disabled || loading) && 'opacity-50 cursor-not-allowed',
        className
      )}
      {...props}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : Icon ? (
        <Icon size={size === 'sm' ? 13 : 15} className="shrink-0" />
      ) : null}
      {children}
      {IconRight && !loading && <IconRight size={size === 'sm' ? 13 : 15} className="shrink-0" />}
    </button>
  )
}
