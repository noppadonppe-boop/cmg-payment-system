import { clsx } from 'clsx'

export default function Card({ children, className, padding = true }) {
  return (
    <div className={clsx(
      'bg-white rounded-xl border border-slate-200 shadow-sm',
      padding && 'p-6',
      className
    )}>
      {children}
    </div>
  )
}

export function CardHeader({ title, subtitle, actions, className }) {
  return (
    <div className={clsx('flex items-start justify-between gap-4 mb-5', className)}>
      <div>
        {title && <h2 className="text-base font-semibold text-slate-800">{title}</h2>}
        {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  )
}
