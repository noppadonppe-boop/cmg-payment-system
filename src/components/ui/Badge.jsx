import { clsx } from 'clsx'

const VARIANTS = {
  blue:    'bg-blue-100 text-blue-700 border-blue-200',
  emerald: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  amber:   'bg-amber-100 text-amber-700 border-amber-200',
  rose:    'bg-rose-100 text-rose-700 border-rose-200',
  slate:   'bg-slate-100 text-slate-600 border-slate-200',
  purple:  'bg-purple-100 text-purple-700 border-purple-200',
  indigo:  'bg-indigo-100 text-indigo-700 border-indigo-200',
}

export default function Badge({ children, variant = 'slate', className }) {
  return (
    <span className={clsx(
      'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border',
      VARIANTS[variant] ?? VARIANTS.slate,
      className
    )}>
      {children}
    </span>
  )
}
