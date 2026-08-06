import { useState } from 'react'
import {
  CheckCircle2, CreditCard, GitMerge, GitPullRequest, Upload
} from 'lucide-react'
import { clsx } from 'clsx'
import { useData } from '../../context/DataContext'
import { useAuth } from '../../context/AuthContext'
import Button from '../ui/Button'
import Badge from '../ui/Badge'
import { Modal } from '../payments/PaymentCreateModal'
import PaymentDetailModal from '../payments/PaymentDetailModal'
import { getPaymentCOAAmounts, getPaymentsForCOA } from '../../lib/coaPayments'
import { normalizePaymentStatus } from '../../lib/paymentStatus'
import { isAttachmentUrl } from '../../lib/uploadFile'

function fmtCurrency(val) {
  if (!val && val !== 0) return '—'
  return `฿${new Intl.NumberFormat('en-US').format(val)}`
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtDateTime(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function pct(part, total) {
  if (!total) return 0
  return Math.round((part / total) * 100)
}

function InfoRow({ label, value }) {
  return (
    <div className="min-w-0">
      <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide">{label}</p>
      <div className="text-[13px] text-slate-700 mt-0.5 font-medium break-words">{value ?? <span className="text-slate-300 font-normal">—</span>}</div>
    </div>
  )
}

function FileLinkValue({ value }) {
  if (!value) return <span className="text-slate-300 font-normal">—</span>
  if (isAttachmentUrl(value)) {
    return (
      <a
        href={value}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 hover:text-blue-700 hover:underline"
      >
        File
      </a>
    )
  }
  return <span>{value}</span>
}

function HeaderStatus({ coa, project }) {
  return (
    <div className={clsx(
      'flex items-center justify-between gap-3 rounded-xl px-3 py-2 border min-w-[320px] max-w-[420px]',
      coa.stampUploadedAt ? 'bg-emerald-50 border-emerald-200' : 'bg-purple-50 border-purple-200'
    )}>
      <div className="flex items-center gap-3 min-w-0">
        <CheckCircle2 size={15} className={clsx('shrink-0', coa.stampUploadedAt ? 'text-emerald-600' : 'text-purple-600')} />
        <div className="min-w-0">
          <p className={clsx('text-sm font-semibold truncate', coa.stampUploadedAt ? 'text-emerald-800' : 'text-purple-800')}>
            {coa.stampUploadedAt ? 'COA Approved + Stamp Completed' : 'COA Approved'}
          </p>
          <p className="text-xs text-slate-500 truncate">
            {project?.name ?? '—'}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <Badge variant="purple">Approved</Badge>
        {coa.stampUploadedAt && <Badge variant="emerald">Stamp Completed</Badge>}
      </div>
    </div>
  )
}

export default function COADetailModal({ coa, onClose, onManagePayment, onUploadStamp }) {
  const { projects, cors, payments } = useData()
  const { USERS, can } = useAuth()
  const [detailPayment, setDetailPayment] = useState(null)

  const project = projects.find(p => p.id === coa.projectId)
  const cor = cors.find(c => c.id === coa.corId)
  const approver = USERS.find(u => u.id === coa.approvedBy)
  const stampUploader = USERS.find(u => u.id === coa.stampUploadedBy)
  const coaPayments = getPaymentsForCOA(payments, coa)
  const sortedCoaPayments = [...coaPayments].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
  const totalClaimed = coaPayments.reduce((sum, payment) => sum + getPaymentCOAAmounts(payment, coa).claimValue, 0)
  const totalPaid = coaPayments.reduce((sum, payment) => {
    const amounts = getPaymentCOAAmounts(payment, coa)
    if (normalizePaymentStatus(payment) === 'Completed') {
      return sum + (payment.receivedValue ?? payment.incomeConfirmedAmount ?? amounts.balanceValue ?? payment.balanceValue ?? 0)
    }
    return sum
  }, 0)
  const balance = (coa.value || 0) - totalClaimed
  const claimedPct = pct(totalClaimed, coa.value || 0)
  const balancePct = pct(balance, coa.value || 0)

  const canManagePayments = can('canApprovePayments') || can('canCreateClaims') || can('canUpdateBonds')
  const canUploadStamp = can('canUpdateBonds')

  return (
    <>
      <Modal
        title={coa.coaNo}
        subtitle={`${project?.name ?? '—'} · Change Order Approval`}
        onClose={onClose}
        maxWidth="max-w-5xl"
        headerRight={<HeaderStatus coa={coa} project={project} />}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-4 items-start">
            <div className="space-y-4">
              <div className="rounded-xl border border-purple-200 overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2 bg-purple-700">
                  <GitMerge size={13} className="text-purple-200" />
                  <span className="text-sm font-semibold text-white">COA Details</span>
                </div>
                <div className="p-3 grid grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3">
                  <InfoRow label="COA No." value={coa.coaNo} />
                  <InfoRow label="Project" value={project?.name} />
                  <InfoRow label="Approved By" value={approver?.name} />
                  <InfoRow label="Approved On" value={fmtDate(coa.approvedAt)} />
                  <InfoRow label="COA Value" value={<span className="text-sm font-bold text-purple-700">{fmtCurrency(coa.value)}</span>} />
                  <InfoRow label="Attachment" value={<FileLinkValue value={coa.attachment} />} />
                  <div className="col-span-2 lg:col-span-3">
                    <InfoRow label="Description" value={<p className="text-[13px] text-slate-700 whitespace-pre-wrap">{coa.description || 'No description'}</p>} />
                  </div>
                  {coa.note && (
                    <div className="col-span-2 lg:col-span-3">
                      <InfoRow label="Note" value={coa.note} />
                    </div>
                  )}
                </div>
              </div>

              {cor && (
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <div className="flex items-center gap-2 px-3 py-2 bg-slate-700">
                    <GitPullRequest size={13} className="text-slate-300" />
                    <span className="text-sm font-semibold text-white">Linked COR</span>
                  </div>
                  <div className="p-3 grid grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3">
                    <InfoRow label="COR No." value={cor.corNo} />
                    <InfoRow label="Submit Date" value={fmtDate(cor.submitDate)} />
                    <InfoRow label="Expected Approval" value={fmtDate(cor.expectedApprovalDate)} />
                    <InfoRow label="COR Value" value={fmtCurrency(cor.value)} />
                    <InfoRow label="Status" value={cor.convertedToCOA ? 'Converted to COA' : cor.status} />
                    <div className="col-span-2 lg:col-span-3">
                      <InfoRow label="Reason" value={<p className="text-[13px] text-slate-500 italic">"{cor.reason || '—'}"</p>} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border border-emerald-200 overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2 bg-emerald-600">
                  <CreditCard size={13} className="text-emerald-100" />
                  <span className="text-sm font-semibold text-white">Payment Summary</span>
                </div>
                <div className="p-3 space-y-3">
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="rounded-lg border border-purple-200 bg-purple-50 px-3 py-2.5">
                      <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-wide">COA Value</p>
                      <p className="text-sm font-bold text-purple-700 mt-0.5">{fmtCurrency(coa.value)}</p>
                    </div>
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5">
                      <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-wide">Received</p>
                      <p className="text-sm font-bold text-emerald-700 mt-0.5">{fmtCurrency(totalPaid)}</p>
                    </div>
                    <div className={clsx(
                      'rounded-lg border px-3 py-2.5 relative',
                      balance > 0 ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'
                    )}>
                      <p className={clsx(
                        'absolute top-2.5 right-3 text-xl font-extrabold leading-none',
                        balance > 0 ? 'text-amber-700' : 'text-emerald-700'
                      )}>
                        {balancePct}%
                      </p>
                      <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-wide">Balance</p>
                      <p className={clsx('text-sm font-bold mt-0.5 pr-14', balance > 0 ? 'text-amber-700' : 'text-emerald-700')}>
                        {fmtCurrency(balance)}
                      </p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 relative">
                      <p className="absolute top-2.5 right-3 text-xl font-extrabold leading-none text-purple-700">{claimedPct}%</p>
                      <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-wide">Claims</p>
                      <p className="text-sm font-bold text-slate-700 mt-0.5 pr-14">{coaPayments.length} รายการ</p>
                      <p className="text-xs font-semibold text-purple-700 mt-1">{fmtCurrency(totalClaimed)}</p>
                    </div>
                  </div>

                  {sortedCoaPayments.length > 0 ? (
                    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
                      <div className="px-3 py-2 border-b border-slate-100">
                        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Latest Payments</p>
                      </div>
                      <div className="divide-y divide-slate-100">
                        {sortedCoaPayments.map(payment => {
                          const paymentAmounts = getPaymentCOAAmounts(payment, coa)
                          return (
                            <div key={payment.id} className="px-3 py-2.5">
                              <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-start gap-3">
                                <button
                                  type="button"
                                  onClick={() => setDetailPayment(payment)}
                                  className="min-w-0 text-left text-sm font-bold text-blue-600 hover:text-blue-700 hover:underline"
                                >
                                  {payment.paymentNo}
                                </button>
                                <div className="text-right">
                                  <p className="text-[10px] text-slate-400 uppercase tracking-wide">Status</p>
                                  <p className="text-sm font-semibold text-slate-700 whitespace-nowrap">{payment.status}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-[10px] text-slate-400 uppercase tracking-wide">Claimed</p>
                                  <p className="text-sm font-semibold text-purple-700 whitespace-nowrap">{fmtCurrency(paymentAmounts.claimValue)}</p>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-sm text-slate-500">
                      ยังไม่มี payment claim สำหรับ COA นี้
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-800">
                  <Upload size={13} className="text-slate-300" />
                  <span className="text-sm font-semibold text-white">Stamp Document</span>
                </div>
                <div className="p-3 grid grid-cols-2 gap-x-4 gap-y-3">
                  <InfoRow label="Status" value={coa.stampUploadedAt ? 'Uploaded' : 'Pending Upload'} />
                  <InfoRow label="Uploaded By" value={stampUploader?.name} />
                  <InfoRow label="Uploaded At" value={fmtDateTime(coa.stampUploadedAt)} />
                  <div className="col-span-2">
                    <InfoRow label="Document" value={<FileLinkValue value={coa.stampDocument} />} />
                  </div>
                  {coa.stampNote && (
                    <div className="col-span-2">
                      <InfoRow label="Stamp Note" value={coa.stampNote} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-between gap-2 mt-5 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2">
            {canManagePayments && (
              <Button variant="secondary" size="sm" icon={CreditCard} onClick={onManagePayment}>
                Payments
              </Button>
            )}
            {canUploadStamp && (
              <Button
                variant={coa.stampUploadedAt ? 'emerald' : 'primary'}
                size="sm"
                icon={coa.stampUploadedAt ? CheckCircle2 : Upload}
                onClick={onUploadStamp}
              >
                {coa.stampUploadedAt ? 'Stamp Done' : 'Upload Stamp'}
              </Button>
            )}
          </div>
          <Button variant="secondary" size="sm" onClick={onClose}>Close</Button>
        </div>
      </Modal>

      {detailPayment && (
        <PaymentDetailModal
          payment={detailPayment}
          onClose={() => setDetailPayment(null)}
        />
      )}
    </>
  )
}
