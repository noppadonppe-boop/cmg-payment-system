import { useState } from 'react'
import {
  CreditCard, Plus, Eye, CheckCircle2, Clock, Send,
  Banknote, GitMerge, Calculator, FileText, User, Calendar
} from 'lucide-react'
import { useData } from '../../context/DataContext'
import { useAuth } from '../../context/AuthContext'
import Button from '../ui/Button'
import Badge from '../ui/Badge'
import { AttachmentField } from '../ui/AttachmentField'
import { Modal } from '../payments/PaymentCreateModal'
import PaymentCreateModal from '../payments/PaymentCreateModal'
import ApproveModal from '../payments/ApproveModal'
import InvoiceModal from '../payments/InvoiceModal'
import ReceivedModal from '../payments/ReceivedModal'
import PaymentDetailModal from '../payments/PaymentDetailModal'
import { MiniStepper, PAYMENT_STATUS } from '../../pages/PaymentsPage'
import { clsx } from 'clsx'

function fmtCurrency(val) {
  if (!val && val !== 0) return '—'
  return `฿${new Intl.NumberFormat('en-US').format(val)}`
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function COAPaymentModal({ coa, onClose }) {
  const { projects, payments, addPayment } = useData()
  const { currentUser, USERS, can } = useAuth()

  const project    = projects.find(p => p.id === coa.projectId)
  const coaPayments = payments.filter(p => p.coaId === coa.id && p.type === 'coa')

  const totalReceived = coaPayments
    .filter(p => p.status === 'Received')
    .reduce((s, p) => s + (p.balanceValue || 0), 0)
  const balance = (coa.value || 0) - totalReceived

  const isPM     = can('canApprovePayments')
  const isQsEng  = can('canCreateClaims')
  const isAccCMG = can('canUpdateBonds')

  // Sub-modal state
  const [createOpen, setCreateOpen]           = useState(false)
  const [detailPayment, setDetailPayment]     = useState(null)
  const [approvePayment, setApprovePayment]   = useState(null)
  const [invoicePayment, setInvoicePayment]   = useState(null)
  const [receivedPayment, setReceivedPayment] = useState(null)

  const getActions = (pay) => {
    const actions = []
    if (isPM && pay.status === 'In Progress') {
      actions.push({ label: 'Review', variant: 'primary', onClick: () => setApprovePayment(pay) })
    }
    if (isQsEng && pay.status === 'Submitted' && !pay.invoiceNo) {
      actions.push({ label: 'Issue Invoice', variant: 'primary', onClick: () => setInvoicePayment(pay) })
    }
    if (isAccCMG && pay.status === 'Submitted' && pay.invoiceNo) {
      actions.push({ label: 'Confirm Receipt', variant: 'emerald', onClick: () => setReceivedPayment(pay) })
    }
    return actions
  }

  // Wrap addPayment to inject coaId
  const coaProjects = project ? [project] : []

  return (
    <>
      <Modal
        title={`COA Payment Tracking`}
        subtitle={`${coa.coaNo} · ${project?.name ?? '—'}`}
        onClose={onClose}
        maxWidth="max-w-3xl"
      >
        <div className="space-y-5">
          {/* COA Summary */}
          <div className="rounded-xl border border-purple-200 bg-purple-50 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-purple-700">
              <GitMerge size={14} className="text-purple-200" />
              <span className="text-sm font-semibold text-white">{coa.coaNo} — Approved COA</span>
            </div>
            <div className="p-4">
              <p className="text-sm text-slate-600 mb-3">{coa.description}</p>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white rounded-lg border border-purple-200 px-4 py-3 text-center">
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">COA Value</p>
                  <p className="text-base font-bold text-purple-700 mt-0.5">{fmtCurrency(coa.value)}</p>
                </div>
                <div className="bg-white rounded-lg border border-emerald-200 px-4 py-3 text-center">
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Received</p>
                  <p className="text-base font-bold text-emerald-700 mt-0.5">{fmtCurrency(totalReceived)}</p>
                </div>
                <div className={clsx(
                  'rounded-lg border px-4 py-3 text-center',
                  balance > 0 ? 'bg-white border-amber-200' : 'bg-emerald-50 border-emerald-200'
                )}>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Balance</p>
                  <p className={clsx(
                    'text-base font-bold mt-0.5',
                    balance > 0 ? 'text-amber-600' : 'text-emerald-700'
                  )}>
                    {fmtCurrency(balance)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Claims List */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-700">
                Payment Claims ({coaPayments.length})
              </h3>
              {isQsEng && balance > 0 && (
                <Button icon={Plus} size="sm" onClick={() => setCreateOpen(true)}>
                  New COA Claim
                </Button>
              )}
            </div>

            {coaPayments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2 bg-slate-50 rounded-xl border border-slate-200">
                <CreditCard size={28} className="text-slate-300" />
                <p className="text-sm text-slate-400">No payment claims yet for this COA</p>
                {isQsEng && (
                  <Button icon={Plus} size="sm" variant="secondary" onClick={() => setCreateOpen(true)}>
                    Create First Claim
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-2.5">
                {coaPayments.map(pay => {
                  const sc      = PAYMENT_STATUS[pay.status] ?? PAYMENT_STATUS['In Progress']
                  const creator = USERS.find(u => u.id === pay.createdBy)
                  const actions = getActions(pay)
                  const StatusIcon = sc.icon

                  return (
                    <div
                      key={pay.id}
                      className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-sm transition-shadow"
                    >
                      <div className="flex">
                        <div className={clsx(
                          'w-1 shrink-0',
                          pay.status === 'Received'    && 'bg-emerald-500',
                          pay.status === 'Submitted'   && 'bg-blue-500',
                          pay.status === 'In Progress' && 'bg-amber-400',
                          pay.status === 'Rejected'    && 'bg-rose-500',
                        )} />
                        <div className="flex-1 p-3">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-bold text-slate-800">{pay.paymentNo}</span>
                                <Badge variant={sc.badge}>
                                  <StatusIcon size={10} className="mr-1 inline" />
                                  {sc.label}
                                </Badge>
                              </div>
                              <p className="text-xs text-slate-500 truncate">{pay.detail}</p>
                              <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                                <span className="flex items-center gap-1"><User size={10} />{creator?.name ?? '—'}</span>
                                <span className="flex items-center gap-1"><Calendar size={10} />{pay.createdAt}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-4 shrink-0">
                              <div className="grid grid-cols-3 gap-3 text-right text-xs">
                                <div>
                                  <p className="text-slate-400">Value</p>
                                  <p className="font-semibold text-slate-700">{fmtCurrency(pay.value)}</p>
                                </div>
                                <div>
                                  <p className="text-slate-400">Deductions</p>
                                  <p className="font-medium text-rose-500">−{fmtCurrency((pay.advanceDeduction||0)+(pay.retentionReduce||0))}</p>
                                </div>
                                <div>
                                  <p className="text-slate-400">Balance</p>
                                  <p className="font-bold text-emerald-700">{fmtCurrency(pay.balanceValue)}</p>
                                </div>
                              </div>

                              <MiniStepper status={pay.status} />

                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => setDetailPayment(pay)}
                                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                                >
                                  <Eye size={12} /> Detail
                                </button>
                                {actions.map((a, i) => (
                                  <Button key={i} variant={a.variant} size="sm" onClick={a.onClick}>
                                    {a.label}
                                  </Button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end mt-6 pt-4 border-t border-slate-100">
          <Button variant="secondary" onClick={onClose}>Close</Button>
        </div>
      </Modal>

      {/* Sub-modals — rendered outside the parent modal to avoid stacking issues */}
      {createOpen && (
        <COAPaymentCreateModal
          coa={coa}
          project={project}
          onClose={() => setCreateOpen(false)}
        />
      )}
      {detailPayment && (
        <PaymentDetailModal
          payment={detailPayment}
          onClose={() => setDetailPayment(null)}
          onAction={(action) => {
            setDetailPayment(null)
            if (action === 'approve')  setApprovePayment(detailPayment)
            if (action === 'invoice')  setInvoicePayment(detailPayment)
            if (action === 'received') setReceivedPayment(detailPayment)
          }}
        />
      )}
      {approvePayment && (
        <ApproveModal payment={approvePayment} onClose={() => setApprovePayment(null)} />
      )}
      {invoicePayment && (
        <InvoiceModal payment={invoicePayment} onClose={() => setInvoicePayment(null)} />
      )}
      {receivedPayment && (
        <ReceivedModal payment={receivedPayment} onClose={() => setReceivedPayment(null)} />
      )}
    </>
  )
}

/* ─── COA-specific payment create modal ──────────────────────────────────── */
function COAPaymentCreateModal({ coa, project, onClose }) {
  const { addPayment, payments } = useData()
  const { currentUser } = useAuth()

  const existing = payments.filter(p => p.coaId === coa.id && p.type === 'coa').length
  const prefix   = project?.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 3) ?? 'COA'

  const [form, setForm] = useState({
    paymentNo:        `PMT-COA-${prefix}-${String(existing + 1).padStart(3, '0')}`,
    detail:           '',
    value:            '',
    advanceDeduction: '',
    retentionReduce:  '',
    attachment:       '',
    note:             '',
  })
  const [errors, setErrors] = useState({})
  const [saving, setSaving]  = useState(false)

  const set = (k, v) => {
    setForm(p => ({ ...p, [k]: v }))
    if (errors[k]) setErrors(p => { const e = { ...p }; delete e[k]; return e })
  }

  function parseCurrency(val) {
    return parseFloat(String(val || '').replace(/,/g, '')) || 0
  }

  function fmtInput(val) {
    const n = parseCurrency(val)
    return n ? n.toLocaleString('en-US') : ''
  }

  const value   = parseCurrency(form.value)
  const adv     = parseCurrency(form.advanceDeduction)
  const ret     = parseCurrency(form.retentionReduce)
  const balance = value - adv - ret

  const validate = () => {
    const errs = {}
    if (!form.paymentNo.trim()) errs.paymentNo = 'Payment number required'
    if (!form.detail.trim())    errs.detail    = 'Description required'
    if (!form.value || value <= 0) errs.value  = 'Enter a valid value'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setSaving(true)
    await new Promise(r => setTimeout(r, 350))
    addPayment({
      projectId:        coa.projectId,
      coaId:            coa.id,
      type:             'coa',
      paymentNo:        form.paymentNo,
      detail:           form.detail,
      value,
      advanceDeduction: adv,
      retentionReduce:  ret,
      balanceValue:     balance,
      attachment:       form.attachment,
      note:             form.note,
      status:           'In Progress',
      createdBy:        currentUser.id,
      invoiceNo: null, invoiceDueDate: null, invoiceNote: null,
      invoiceSubmittedAt: null,
      receivedDate: null, receivedAttachment: null, receivedNote: null,
      receivedBy: null, receivedAt: null,
    })
    setSaving(false)
    onClose()
  }

  return (
    <Modal
      title="New COA Payment Claim"
      subtitle={`${coa.coaNo} · Step 1 — Submit for PM Approval`}
      onClose={onClose}
    >
      <div className="space-y-4">
        {/* COA reference strip */}
        <div className="bg-purple-50 border border-purple-200 rounded-lg px-4 py-2.5 flex items-center justify-between">
          <span className="text-xs text-purple-700 font-semibold">{coa.coaNo}: {coa.description}</span>
          <span className="text-xs font-bold text-purple-700">{fmtCurrency(coa.value)}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormFieldSimple label="Payment No." required error={errors.paymentNo}>
            <input
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400"
              placeholder="e.g. PMT-COA-CPT-001"
              value={form.paymentNo}
              onChange={e => set('paymentNo', e.target.value)}
            />
          </FormFieldSimple>

          <FormFieldSimple label="Attachment">
            <AttachmentField
              value={form.attachment}
              onChange={v => set('attachment', v)}
              folder="payments"
              docId={coa?.projectId}
              uploadedBy={currentUser?.id}
              placeholder="Filename or URL หรือกด Upload"
            />
          </FormFieldSimple>

          <FormFieldSimple label="Description" required error={errors.detail} className="sm:col-span-2">
            <textarea
              rows={2}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400"
              placeholder="COA payment claim description..."
              value={form.detail}
              onChange={e => set('detail', e.target.value)}
            />
          </FormFieldSimple>

          <FormFieldSimple label="Claim Value (฿)" required error={errors.value}>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">฿</span>
              <input
                className="w-full rounded-lg border border-slate-200 bg-white pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400"
                placeholder="0"
                value={fmtInput(form.value)}
                onChange={e => set('value', e.target.value.replace(/,/g, ''))}
              />
            </div>
          </FormFieldSimple>

          <FormFieldSimple label="Advance Deduction (฿)">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">฿</span>
              <input
                className="w-full rounded-lg border border-slate-200 bg-white pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400"
                placeholder="0"
                value={fmtInput(form.advanceDeduction)}
                onChange={e => set('advanceDeduction', e.target.value.replace(/,/g, ''))}
              />
            </div>
          </FormFieldSimple>

          <FormFieldSimple label="Retention Reduce (฿)">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">฿</span>
              <input
                className="w-full rounded-lg border border-slate-200 bg-white pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400"
                placeholder="0"
                value={fmtInput(form.retentionReduce)}
                onChange={e => set('retentionReduce', e.target.value.replace(/,/g, ''))}
              />
            </div>
          </FormFieldSimple>

          <FormFieldSimple label="Note" className="sm:col-span-2">
            <textarea
              rows={2}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400"
              placeholder="Additional notes..."
              value={form.note}
              onChange={e => set('note', e.target.value)}
            />
          </FormFieldSimple>
        </div>

        {/* Balance preview */}
        <div className={clsx(
          'flex items-center justify-between px-4 py-3 rounded-lg border',
          balance >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'
        )}>
          <span className="text-sm text-slate-600 font-medium">Balance Value</span>
          <span className={clsx('text-lg font-bold', balance >= 0 ? 'text-emerald-700' : 'text-rose-600')}>
            ฿{balance.toLocaleString('en-US')}
          </span>
        </div>
      </div>

      <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-slate-100">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant="primary" loading={saving} onClick={handleSubmit}>
          Submit for PM Approval
        </Button>
      </div>
    </Modal>
  )
}

function FormFieldSimple({ label, required, error, children, className }) {
  return (
    <div className={clsx('flex flex-col gap-1', className)}>
      {label && (
        <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
          {label}{required && <span className="text-rose-500 ml-0.5">*</span>}
        </label>
      )}
      {children}
      {error && <p className="text-xs text-rose-500">{error}</p>}
    </div>
  )
}
