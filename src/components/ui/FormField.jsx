import { clsx } from 'clsx'

export function FormField({ label, required, error, hint, children, className }) {
  return (
    <div className={clsx('flex flex-col gap-1', className)}>
      {label && (
        <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
          {label}
          {required && <span className="text-rose-500 ml-0.5">*</span>}
        </label>
      )}
      {children}
      {hint && !error && <p className="text-xs text-slate-400">{hint}</p>}
      {error && <p className="text-xs text-rose-500">{error}</p>}
    </div>
  )
}

const baseInput = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition-all disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed'

export function Input({ error, className, ...props }) {
  return (
    <input
      className={clsx(baseInput, error && 'border-rose-400 focus:ring-rose-400/40', className)}
      {...props}
    />
  )
}

export function Textarea({ error, className, rows = 3, ...props }) {
  return (
    <textarea
      rows={rows}
      className={clsx(baseInput, 'resize-none', error && 'border-rose-400 focus:ring-rose-400/40', className)}
      {...props}
    />
  )
}

export function Select({ error, className, children, ...props }) {
  return (
    <select
      className={clsx(baseInput, 'cursor-pointer', error && 'border-rose-400 focus:ring-rose-400/40', className)}
      {...props}
    >
      {children}
    </select>
  )
}

export function Toggle({ checked, onChange, label }) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer group">
      <div
        onClick={() => onChange(!checked)}
        className={clsx(
          'relative w-10 h-5 rounded-full transition-colors duration-200',
          checked ? 'bg-blue-600' : 'bg-slate-300'
        )}
      >
        <span className={clsx(
          'absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200',
          checked && 'translate-x-5'
        )} />
      </div>
      {label && <span className="text-sm text-slate-700 select-none">{label}</span>}
    </label>
  )
}
