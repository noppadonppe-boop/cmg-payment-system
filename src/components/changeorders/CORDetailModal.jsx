import {
  GitPullRequest, GitMerge, CheckCircle2, Calendar,
  User, Banknote, FileText, ArrowRight, XCircle, Clock
} from 'lucide-react'
import { useData } from '../../context/DataContext'
import { useAuth } from '../../context/AuthContext'
import Button from '../ui/Button'
import Badge from '../ui/Badge'
import { Modal } from '../payments/PaymentCreateModal'
import { COR_STATUS_CONFIG } from '../../pages/ChangeOrdersPage'
import { clsx } from 'clsx'

function fmtCurrency(val) {
  if (!val && val !== 0) return '—'
  return `฿${new Intl.NumberFormat('en-US').format(val)}`
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function InfoRow({ label, value }) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{label}</p>
      <div className="text-sm text-slate-700 mt-0.5 font-medium">{value ?? <span className="text-slate-300 font-normal">—</span>}</div>
    </div>
  )
}

export default function CORDetailModal({ cor, onClose, onConvert }) {
  const { projects, coas } = useData()
  const { currentUser, USERS, can } = useAuth()

  const project  = projects.find(p => p.id === cor.projectId)
  const creator  = USERS.find(u => u.id === cor.createdBy)
  const coa      = cor.convertedToCOA ? coas.find(c => c.id === cor.coaId) : null
  const coaApprover = coa ? USERS.find(u => u.id === coa.approvedBy) : null

  const sc = COR_STATUS_CONFIG[cor.status] ?? COR_STATUS_CONFIG['Prepare doc']
  const StatusIcon = sc.icon

  const isPM       = can('canApprovePayments')
  const canConvert = isPM && !cor.convertedToCOA && cor.status === 'Submitted'

  return (
    <Modal
      title={cor.corNo}
      subtitle={`${project?.name ?? '—'} · Change Order Request`}
      onClose={onClose}
    >
      <div className="space-y-5">
        {/* COR Conversion Status Banner */}
        {cor.convertedToCOA ? (
          <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-emerald-800">
                Converted to COA: <span className="font-bold">{coa?.coaNo}</span>
              </p>
              <p className="text-xs text-emerald-600 mt-0.5">
                Approved by {coaApprover?.name ?? '—'} on {fmtDate(coa?.approvedAt)}
              </p>
            </div>
          </div>
        ) : (
          <div className={clsx(
            'flex items-center gap-3 rounded-xl px-4 py-3 border',
            cor.status === 'Submitted'   && 'bg-blue-50 border-blue-200',
            cor.status === 'Prepare doc' && 'bg-slate-50 border-slate-200',
            cor.status === 'Rejected'    && 'bg-rose-50 border-rose-200',
          )}>
            <StatusIcon size={18} className={clsx(
              cor.status === 'Submitted'   && 'text-blue-600',
              cor.status === 'Prepare doc' && 'text-slate-500',
              cor.status === 'Rejected'    && 'text-rose-500',
            )} />
            <div>
              <p className={clsx(
                'text-sm font-semibold',
                cor.status === 'Submitted'   && 'text-blue-800',
                cor.status === 'Prepare doc' && 'text-slate-700',
                cor.status === 'Rejected'    && 'text-rose-700',
              )}>
                Status: <Badge variant={sc.badge} className="ml-1">{sc.label}</Badge>
              </p>
              {cor.status === 'Submitted' && !cor.convertedToCOA && (
                <p className="text-xs text-blue-600 mt-0.5">Submitted to client. Awaiting client approval offline.</p>
              )}
              {cor.status === 'Prepare doc' && (
                <p className="text-xs text-slate-500 mt-0.5">Documentation in preparation — not yet submitted to client.</p>
              )}
            </div>
          </div>
        )}

        {/* COR Details */}
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-700">
            <GitPullRequest size={14} className="text-slate-300" />
            <span className="text-sm font-semibold text-white">COR Details</span>
          </div>
          <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
            <InfoRow label="COR No." value={cor.corNo} />
            <InfoRow label="Submitted By" value={creator?.name} />
            <InfoRow label="Project" value={project?.name} />
            <InfoRow label="Submit Date" value={fmtDate(cor.submitDate)} />
            <InfoRow label="Expected Approval" value={fmtDate(cor.expectedApprovalDate)} />
            <InfoRow label="COR Value" value={
              <span className="text-base font-bold text-slate-800">{fmtCurrency(cor.value)}</span>
            } />
            <div className="col-span-2 sm:col-span-3">
              <InfoRow label="Detail / Description" value={
                <p className="text-sm text-slate-700 whitespace-pre-wrap mt-1">{cor.detail}</p>
              } />
            </div>
            <div className="col-span-2 sm:col-span-3">
              <InfoRow label="Reason" value={
                <p className="text-sm text-slate-500 italic mt-1">"{cor.reason}"</p>
              } />
            </div>
            {cor.note && (
              <div className="col-span-2 sm:col-span-3">
                <InfoRow label="Note" value={cor.note} />
              </div>
            )}
          </div>
        </div>

        {/* COA Section — shown if converted */}
        {coa && (
          <div className="rounded-xl border border-emerald-200 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600">
              <GitMerge size={14} className="text-emerald-100" />
              <span className="text-sm font-semibold text-white">Linked COA: {coa.coaNo}</span>
            </div>
            <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
              <InfoRow label="COA No." value={coa.coaNo} />
              <InfoRow label="Approved By" value={coaApprover?.name} />
              <InfoRow label="Approved On" value={fmtDate(coa.approvedAt)} />
              <InfoRow label="Approved Value" value={
                <span className="text-base font-bold text-emerald-700">{fmtCurrency(coa.value)}</span>
              } />
              {coa.description && (
                <div className="col-span-2 sm:col-span-3">
                  <InfoRow label="Description" value={coa.description} />
                </div>
              )}
              {coa.note && (
                <div className="col-span-2 sm:col-span-3">
                  <InfoRow label="Note" value={coa.note} />
                </div>
              )}
            </div>
          </div>
        )}

        {/* PM Convert Action */}
        {canConvert && (
          <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
            <GitMerge size={18} className="text-blue-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-blue-800">Ready to Convert to COA</p>
              <p className="text-xs text-blue-600 mt-0.5">
                The client has approved this COR offline. As PM, you can now convert it to an official Change Order Approval (COA).
              </p>
            </div>
            <Button variant="primary" size="sm" icon={GitMerge} onClick={onConvert}>
              Convert to COA
            </Button>
          </div>
        )}
      </div>

      <div className="flex justify-end mt-6 pt-4 border-t border-slate-100">
        <Button variant="secondary" onClick={onClose}>Close</Button>
      </div>
    </Modal>
  )
}
