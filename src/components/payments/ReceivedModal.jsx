import { useState } from 'react'
import { CheckCircle2, XCircle, Banknote, Receipt } from 'lucide-react'
import { useData } from '../../context/DataContext'
import { useAuth } from '../../context/AuthContext'
import { FormField, Textarea } from '../ui/FormField'
import { AttachmentLink } from '../ui/AttachmentField'
import Button from '../ui/Button'
import Badge from '../ui/Badge'
import { Modal } from './PaymentCreateModal'
import ReceiptPreviewModal from './ReceiptPreviewModal'
import { clsx } from 'clsx'

function fmtCurrency(val) {
  if (!val && val !== 0) return '—'
  // ปัดเศษทศนิยมตำแหน่งที่ 3: 5 ขึ้นไปปัดขึ้น, 4 ลงมาปัดลง
  const rounded = Math.round(val * 100) / 100
  return `฿${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(rounded)}`
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function ReceivedModal({ payment, onClose, onRequestRevision }) {
  const { updatePayment, projects, getProjectCOAs } = useData()
  const { currentUser } = useAuth()

  const project = projects.find(p => p.id === payment.projectId)
  const projectCOAs = payment.projectId ? getProjectCOAs(payment.projectId) : []

  // Map old status
  let status = payment.status
  if (status === 'Submitted') status = 'Invoice Submitted'
  if (status === 'Invoice PM Approved') status = 'Invoice Submitted'

  const isAccepting = status === 'Invoice Submitted'
  const isConfirmingReceive = status === 'Income Confirm Pending'
  const isStage31 = isConfirmingReceive

  // Form state for Stage 3.1
  const [form, setForm] = useState({
    receiptNo: payment.receiptNo || '',
    receivedNote: payment.receivedNote || '',
    paymentType: payment.paymentType || '',     // 'cash' | 'cheque' | 'transfer'
    cashAmount: payment.cashAmount || '',
    chequeNo: payment.chequeNo || '',
    chequeBank: payment.chequeBank || '',
    chequeBranch: payment.chequeBranch || '',
    chequeDate: payment.chequeDate || '',
    transferAmount: payment.transferAmount || '',
    transferBank: payment.transferBank || '',
    transferBranch: payment.transferBranch || '',
    transferDate: payment.transferDate || '',
    collector: payment.collector || '',
    collectionDate: payment.collectionDate || payment.receivedDate || new Date().toISOString().split('T')[0],
  })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [showReject, setShowReject] = useState(false)
  const [rejectNote, setRejectNote] = useState('')
  const [showReceiptPreview, setShowReceiptPreview] = useState(false)

  const set = (k, v) => {
    setForm(p => ({ ...p, [k]: v }))
    if (errors[k]) setErrors(p => { const e = { ...p }; delete e[k]; return e })
  }

  const validate = () => {
    const errs = {}
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleAccept = async () => {
    setSaving(true)
    await new Promise(r => setTimeout(r, 350))
    await updatePayment(payment.id, {
      status: 'Income Confirm Pending',
      acceptedBy: currentUser.id,
      acceptedAt: new Date().toISOString().split('T')[0],
      incomeConfirmedDate: new Date().toISOString().split('T')[0],
      incomeConfirmedAmount: payment.balanceValue || 0,
      incomeConfirmedBy: currentUser.id,
      incomeConfirmedAt: new Date().toISOString().split('T')[0],
    })
    setSaving(false)
    onClose()
  }

  const handleConfirm = async () => {
    if (!validate()) return
    setSaving(true)
    await new Promise(r => setTimeout(r, 350))
    await updatePayment(payment.id, {
      status: 'Completed',
      receivedBy: currentUser.id,
      receivedAt: new Date().toISOString().split('T')[0],
      receivedDate: form.collectionDate, // ใช้วันที่รับเงินจาก Stage 3.1
      receivedNote: form.receivedNote,
      incomeConfirmedAmount: payment.incomeConfirmedAmount || payment.balanceValue || 0,
      // Payment collection info
      receiptNo: form.receiptNo,
      paymentType: form.paymentType,
      cashAmount: form.cashAmount,
      chequeNo: form.chequeNo,
      chequeBank: form.chequeBank,
      chequeBranch: form.chequeBranch,
      chequeDate: form.chequeDate,
      transferAmount: form.transferAmount,
      transferBank: form.transferBank,
      transferBranch: form.transferBranch,
      transferDate: form.transferDate,
      collector: form.collector,
      collectionDate: form.collectionDate,
    })
    setSaving(false)
    onClose()
  }

  const handleOpenReceipt = () => {
    setShowReceiptPreview(true)
  }

  const handleConfirmReceipt = () => {
    setShowReceiptPreview(false)
    handleConfirm()
  }

  const handleReject = async () => {
    setSaving(true)
    await new Promise(r => setTimeout(r, 350))
    await updatePayment(payment.id, {
      status: 'Client Sign Pending',
      clientSignedDoc: '',
      clientSignedAt: '',
      invoiceRejectionNote: rejectNote,
      invoiceRejectedBy: currentUser.id,
      invoiceRejectedAt: new Date().toISOString().split('T')[0],
    })
    setSaving(false)
    onClose()
  }

  const mainTotal = payment.mainContractItems?.reduce((sum, item) => sum + (item.value || 0), 0) || 0
  const coaTotal = payment.coaItems?.reduce((sum, coa) => sum + (coa.items?.reduce((s, item) => s + (item.value || 0), 0) || 0), 0) || 0

  return (
    <>
      <Modal
        title={isStage31 ? 'Confirm Receive' : 'Accept Payment'}
        subtitle={isStage31 ? 'Stage 3.1 — Confirm Receive & Generate Receipt' : 'Stage 3 — Accept Payment from Client'}
        onClose={onClose}
      >
      <div className="space-y-4">
        {/* Comprehensive Payment + Invoice Summary */}
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Banknote size={16} className="text-blue-600" />
              <span className="text-sm font-semibold text-blue-800">{payment.paymentNo}</span>
            </div>
            <Badge variant="blue">{status}</Badge>
          </div>
          <p className="text-sm text-slate-600">{payment.detail}</p>

          {/* Claim Items — Main Contract */}
          {payment.claimMainContract && payment.mainContractItems?.length > 0 && (
            <div className="space-y-1">
              <h4 className="text-[10px] font-semibold text-blue-700 uppercase tracking-wide">Main Contract Items</h4>
              <div className="rounded border border-blue-200 overflow-hidden bg-white/60">
                <table className="w-full text-[10px] sm:text-xs">
                  <thead className="bg-blue-100/50 border-b border-blue-200">
                    <tr>
                      <th className="px-2 py-1 text-left font-semibold text-blue-800 w-8">No.</th>
                      <th className="px-2 py-1 text-left font-semibold text-blue-800">Description</th>
                      <th className="px-2 py-1 text-right font-semibold text-blue-800 w-24">Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-blue-100">
                    {payment.mainContractItems.map((item, idx) => (
                      <tr key={idx}>
                        <td className="px-2 py-1 text-blue-700">{item.no}</td>
                        <td className="px-2 py-1 text-blue-800">{item.description}</td>
                        <td className="px-2 py-1 text-right font-semibold text-blue-900">{fmtCurrency(item.value)}</td>
                      </tr>
                    ))}
                    <tr className="bg-blue-100/50 font-semibold">
                      <td colSpan="2" className="px-2 py-1 text-right text-blue-800">Total:</td>
                      <td className="px-2 py-1 text-right text-blue-900">
                        {fmtCurrency(mainTotal)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Claim Items — COA */}
          {payment.claimCOA && payment.coaItems?.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-[10px] font-semibold text-blue-700 uppercase tracking-wide">COA Items</h4>
              {payment.coaItems.map((coaItem, coaIdx) => (
                <div key={coaIdx} className="border border-purple-200 rounded overflow-hidden bg-white/60">
                  <div className="bg-purple-600 px-2 py-1 flex justify-between items-center">
                    <h5 className="text-[10px] font-semibold text-white">{coaItem.coaNo}</h5>
                  </div>
                  <table className="w-full text-[10px] sm:text-xs">
                    <thead className="bg-purple-50 border-b border-purple-100">
                      <tr>
                        <th className="px-2 py-1 text-left font-semibold text-purple-700 w-8">No.</th>
                        <th className="px-2 py-1 text-left font-semibold text-purple-700">Description</th>
                        <th className="px-2 py-1 text-right font-semibold text-purple-700 w-24">Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-purple-100">
                      {coaItem.items.map((item, idx) => (
                        <tr key={idx}>
                          <td className="px-2 py-1 text-purple-600">{item.no}</td>
                          <td className="px-2 py-1 text-purple-700">{item.description}</td>
                          <td className="px-2 py-1 text-right font-semibold text-purple-800">{fmtCurrency(item.value)}</td>
                        </tr>
                      ))}
                      <tr className="bg-purple-100/30 font-semibold">
                        <td colSpan="2" className="px-2 py-1 text-right text-purple-800">Total:</td>
                        <td className="px-2 py-1 text-right text-purple-900">
                          {fmtCurrency(coaItem.items.reduce((sum, item) => sum + (item.value || 0), 0))}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}

          {/* Other Claim */}
          {payment.otherClaim && payment.otherClaim > 0 && (
            <div className="flex items-center justify-between px-2 py-1.5 bg-white/60 border border-blue-200 rounded">
              <span className="text-[10px] font-semibold text-blue-800">Other Claim</span>
              <span className="text-xs font-bold text-blue-900">{fmtCurrency(payment.otherClaim)}</span>
            </div>
          )}

          {/* Financial Breakdown */}
          <div className="rounded border border-blue-200 overflow-hidden bg-white/60">
            <div className="grid grid-cols-6 text-[9px] font-semibold text-blue-700 uppercase tracking-wide bg-blue-100/50 px-2 py-1 border-b border-blue-200 text-center">
              <span>Claim Value</span>
              <span>VAT (7%)</span>
              <span>Advance Ded.</span>
              <span>Retention</span>
              <span>With Tax</span>
              <span className="text-blue-900">Balance</span>
            </div>
            <div className="grid grid-cols-6 px-2 py-1.5 text-center items-center">
              <span className="text-[10px] font-semibold text-blue-800">{fmtCurrency(payment.value)}</span>
              <span className="text-[10px] font-medium text-blue-600">+{fmtCurrency(payment.value * 0.07)}</span>
              <span className="text-[10px] font-medium text-rose-600">−{fmtCurrency(payment.advanceDeduction)}</span>
              <span className="text-[10px] font-medium text-rose-600">−{fmtCurrency(payment.retentionReduce)}</span>
              <span className="text-[10px] font-medium text-rose-600">-{fmtCurrency(payment.withTaxValue || 0)}</span>
              <span className="text-xs font-bold text-blue-900">{fmtCurrency(payment.balanceValue)}</span>
            </div>
          </div>

          {/* Invoice Information */}
          <div className="rounded border border-blue-200 overflow-hidden bg-white/60">
            <div className="px-3 py-1.5 bg-blue-100/50 border-b border-blue-200">
              <h4 className="text-xs font-semibold text-blue-800">Invoice Information</h4>
            </div>
            <div className="p-3 grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Invoice No.</p>
                <p className="text-sm font-semibold text-slate-700">{payment.invoiceNo ?? '—'}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Invoice Date</p>
                <p className="text-sm font-semibold text-slate-700">{fmtDate(payment.invoiceDate)}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Due Date</p>
                <p className="text-sm font-semibold text-slate-700">{fmtDate(payment.invoiceDueDate)}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Issued On</p>
                <p className="text-sm font-semibold text-slate-700">{fmtDate(payment.invoiceSubmittedAt)}</p>
              </div>
              {payment.invoiceNote && (
                <div className="col-span-2">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Note</p>
                  <p className="text-sm text-slate-600 italic">"{payment.invoiceNote}"</p>
                </div>
              )}
              {payment.paymentApprovedDoc && (
                <div className="col-span-2">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Payment Approved Attachment</p>
                  <AttachmentLink value={payment.paymentApprovedDoc} className="flex items-center gap-1 text-xs text-blue-700 hover:text-blue-900 font-medium" />
                </div>
              )}
              {payment.clientSignedDoc && (
                <div className="col-span-2">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Client Signed Invoice</p>
                  <AttachmentLink value={payment.clientSignedDoc} className="flex items-center gap-1 text-xs text-blue-700 hover:text-blue-900 font-medium" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stage 3.1 info banner */}
        {isStage31 && payment.acceptedAt && (
          <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
            <CheckCircle2 size={15} className="text-amber-500 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-700">
              <p className="font-semibold">Payment Accepted — Pending Confirmation</p>
              <p className="mt-0.5">Accepted on {fmtDate(payment.acceptedAt)}. กรุณาออกใบเสร็จรับเงินเพื่อ Complete.</p>
            </div>
          </div>
        )}

        {/* Stage 3.1 — Confirm Receive & Generate Receipt */}
        {isStage31 && (
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600">
              <CheckCircle2 size={14} className="text-emerald-100" />
              <span className="text-sm font-semibold text-white">Confirm Receive</span>
            </div>
            <div className="p-4 grid grid-cols-1 gap-4">
              {/* ── Receipt Number ── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-bold text-slate-700 shrink-0">เลขที่ใบเสร็จ</span>
                  <span className="text-slate-500 shrink-0">Receipt No.</span>
                  <input
                    type="text"
                    className="flex-1 border-b border-slate-300 px-1 py-0.5 text-slate-800 bg-transparent focus:outline-none focus:border-emerald-500"
                    placeholder="e.g. RC-0001"
                    value={form.receiptNo}
                    onChange={e => set('receiptNo', e.target.value)}
                  />
                </div>
              </div>

              {/* ── Payment Collection Info ── */}
              <div className="rounded-lg border border-slate-200 p-4 space-y-3">
                <p className="text-sm font-bold text-slate-800">ข้อมูลการรับเงิน</p>

                {/* Cash */}
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    className="mt-1 w-4 h-4 shrink-0"
                    checked={form.paymentType === 'cash'}
                    onChange={e => set('paymentType', e.target.checked ? 'cash' : '')}
                  />
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    <div className="flex items-center gap-1">
                      <span className="font-semibold text-slate-700">เงินสด</span>
                      <span className="text-slate-500">CASH</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-slate-600">จำนวนเงิน</span>
                      <input
                        type="text"
                        className="flex-1 border-b border-slate-300 px-1 py-0.5 text-right text-slate-800 bg-transparent focus:outline-none focus:border-emerald-500 disabled:opacity-50"
                        placeholder="0.00"
                        value={form.cashAmount}
                        onChange={e => set('cashAmount', e.target.value)}
                        disabled={form.paymentType !== 'cash'}
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-slate-600">บาท</span>
                      <span className="text-slate-500">BAHT</span>
                    </div>
                  </div>
                </div>

                {/* Cheque */}
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    className="mt-1 w-4 h-4 shrink-0"
                    checked={form.paymentType === 'cheque'}
                    onChange={e => set('paymentType', e.target.checked ? 'cheque' : '')}
                  />
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
                    <div className="flex items-center gap-1">
                      <span className="font-semibold text-slate-700">เช็ค</span>
                      <span className="text-slate-500">CHEQUE NO.</span>
                    </div>
                    <div className="flex items-center gap-1 lg:col-span-3">
                      <input
                        type="text"
                        className="flex-1 border-b border-slate-300 px-1 py-0.5 text-slate-800 bg-transparent focus:outline-none focus:border-emerald-500 disabled:opacity-50"
                        placeholder="เลขที่เช็ค"
                        value={form.chequeNo}
                        onChange={e => set('chequeNo', e.target.value)}
                        disabled={form.paymentType !== 'cheque'}
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-slate-600">ธนาคาร</span>
                      <span className="text-slate-500">BANK</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        className="flex-1 border-b border-slate-300 px-1 py-0.5 text-slate-800 bg-transparent focus:outline-none focus:border-emerald-500 disabled:opacity-50"
                        placeholder="ธนาคาร"
                        value={form.chequeBank}
                        onChange={e => set('chequeBank', e.target.value)}
                        disabled={form.paymentType !== 'cheque'}
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-slate-600">สาขา</span>
                      <span className="text-slate-500">BRANCH</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        className="flex-1 border-b border-slate-300 px-1 py-0.5 text-slate-800 bg-transparent focus:outline-none focus:border-emerald-500 disabled:opacity-50"
                        placeholder="สาขา"
                        value={form.chequeBranch}
                        onChange={e => set('chequeBranch', e.target.value)}
                        disabled={form.paymentType !== 'cheque'}
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-slate-600">วันที่</span>
                      <span className="text-slate-500">DATE</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <input
                        type="date"
                        className="flex-1 border-b border-slate-300 px-1 py-0.5 text-slate-800 bg-transparent focus:outline-none focus:border-emerald-500 disabled:opacity-50 text-[11px]"
                        value={form.chequeDate}
                        onChange={e => set('chequeDate', e.target.value)}
                        disabled={form.paymentType !== 'cheque'}
                      />
                    </div>
                  </div>
                </div>

                {/* Transfer */}
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    className="mt-1 w-4 h-4 shrink-0"
                    checked={form.paymentType === 'transfer'}
                    onChange={e => set('paymentType', e.target.checked ? 'transfer' : '')}
                  />
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
                    <div className="flex items-center gap-1">
                      <span className="font-semibold text-slate-700">โอน</span>
                      <span className="text-slate-500">TRANSFER AMOUNT</span>
                    </div>
                    <div className="flex items-center gap-1 lg:col-span-3">
                      <input
                        type="text"
                        className="flex-1 border-b border-slate-300 px-1 py-0.5 text-right text-slate-800 bg-transparent focus:outline-none focus:border-emerald-500 disabled:opacity-50"
                        placeholder="0.00"
                        value={form.transferAmount}
                        onChange={e => set('transferAmount', e.target.value)}
                        disabled={form.paymentType !== 'transfer'}
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-slate-600">ธนาคาร</span>
                      <span className="text-slate-500">BANK</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        className="flex-1 border-b border-slate-300 px-1 py-0.5 text-slate-800 bg-transparent focus:outline-none focus:border-emerald-500 disabled:opacity-50"
                        placeholder="ธนาคาร"
                        value={form.transferBank}
                        onChange={e => set('transferBank', e.target.value)}
                        disabled={form.paymentType !== 'transfer'}
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-slate-600">สาขา</span>
                      <span className="text-slate-500">BRANCH</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        className="flex-1 border-b border-slate-300 px-1 py-0.5 text-slate-800 bg-transparent focus:outline-none focus:border-emerald-500 disabled:opacity-50"
                        placeholder="สาขา"
                        value={form.transferBranch}
                        onChange={e => set('transferBranch', e.target.value)}
                        disabled={form.paymentType !== 'transfer'}
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-slate-600">วันที่</span>
                      <span className="text-slate-500">DATE</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <input
                        type="date"
                        className="flex-1 border-b border-slate-300 px-1 py-0.5 text-slate-800 bg-transparent focus:outline-none focus:border-emerald-500 disabled:opacity-50 text-[11px]"
                        value={form.transferDate}
                        onChange={e => set('transferDate', e.target.value)}
                        disabled={form.paymentType !== 'transfer'}
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-700 shrink-0">ผู้รับเงิน</span>
                    <span className="text-slate-500 shrink-0">COLLECTOR</span>
                    <input
                      type="text"
                      className="flex-1 border-b border-slate-300 px-1 py-0.5 text-slate-800 bg-transparent focus:outline-none focus:border-emerald-500"
                      placeholder="ชื่อผู้รับเงิน"
                      value={form.collector}
                      onChange={e => set('collector', e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-700 shrink-0">วันที่รับเงิน</span>
                    <span className="text-slate-500 shrink-0">DATE</span>
                    <input
                      type="date"
                      className="flex-1 border-b border-slate-300 px-1 py-0.5 text-slate-800 bg-transparent focus:outline-none focus:border-emerald-500 text-[11px]"
                      value={form.collectionDate}
                      onChange={e => set('collectionDate', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <FormField label="Note (optional)">
                <Textarea
                  rows={2}
                  placeholder="e.g. Received via bank transfer, ref no..."
                  value={form.receivedNote}
                  onChange={e => set('receivedNote', e.target.value)}
                />
              </FormField>

              {/* ── Generate Receipt Button ── */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <Receipt size={18} className="text-emerald-600" />
                <p className="text-sm text-slate-600">กรอกข้อมูลครบแล้ว?</p>
                <Button variant="emerald" size="sm" icon={Receipt} onClick={handleOpenReceipt}>
                  ออกใบเสร็จ
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Reject Form */}
        {showReject && (
          <div className="rounded-xl border-2 border-rose-200 bg-rose-50 p-4 space-y-3">
            <div className="flex items-center gap-2 text-rose-700">
              <XCircle size={18} />
              <span className="font-semibold text-sm">Reject & Send Back to Upload Client Signed Invoice</span>
            </div>
            <p className="text-sm text-slate-600">
              This will revert the payment to <span className="font-semibold">Client Sign Pending</span> status. QsENG will need to upload a new signed invoice.
            </p>
            <FormField label="Rejection Reason (Optional)">
              <Textarea
                rows={3}
                placeholder="Explain why the invoice needs to be re-uploaded..."
                value={rejectNote}
                onChange={e => setRejectNote(e.target.value)}
              />
            </FormField>
            <div className="flex gap-2 pt-1">
              <Button variant="secondary" size="sm" onClick={() => setShowReject(false)}>Back</Button>
              <Button variant="danger" size="sm" icon={XCircle} loading={saving} onClick={handleReject}>
                Confirm Reject
              </Button>
            </div>
          </div>
        )}

        {/* Actions */}
        {!showReject && (
          <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-slate-100">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            {onRequestRevision && (
              <Button
                variant="secondary"
                onClick={() => { onClose(); onRequestRevision() }}
              >
                Request Revision
              </Button>
            )}
            <Button
              variant="danger"
              onClick={() => setShowReject(true)}
            >
              Reject & Send Back
            </Button>
            <Button
              variant={isStage31 ? 'emerald' : 'primary'}
              icon={CheckCircle2}
              loading={saving}
              onClick={isStage31 ? handleConfirm : handleAccept}
            >
              {isStage31 ? 'Confirm & Complete' : 'Accept'}
            </Button>
          </div>
        )}
      </div>
    </Modal>

    {/* Receipt Preview Modal */}
    {showReceiptPreview && (
      <ReceiptPreviewModal
        payment={payment}
        project={project}
        collectionData={{
          receiptNo: form.receiptNo,
          paymentType: form.paymentType,
          cashAmount: form.cashAmount,
          chequeNo: form.chequeNo,
          chequeBank: form.chequeBank,
          chequeBranch: form.chequeBranch,
          chequeDate: form.chequeDate,
              transferAmount: form.transferAmount,
          transferBank: form.transferBank,
          transferBranch: form.transferBranch,
          transferDate: form.transferDate,
          collector: form.collector,
          collectionDate: form.collectionDate,
        }}
        onClose={() => setShowReceiptPreview(false)}
        onConfirm={handleConfirmReceipt}
      />
    )}
    </>
  )
}
