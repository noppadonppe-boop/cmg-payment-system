import { Construction } from 'lucide-react'
import Card from '../components/ui/Card'

export default function PlaceholderPage({ title = 'Coming Soon' }) {
  return (
    <Card className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="p-4 rounded-2xl bg-amber-50">
        <Construction size={36} className="text-amber-500" />
      </div>
      <p className="text-lg font-semibold text-slate-700">{title}</p>
      <p className="text-sm text-slate-400 text-center max-w-xs">
        This module is currently under development and will be available soon.
      </p>
    </Card>
  )
}
