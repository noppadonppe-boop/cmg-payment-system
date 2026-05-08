import { useState } from 'react'
import { Send, Hash, Calendar, Paperclip, FileText, Calculator } from 'lucide-react'
import { useData } from '../../context/DataContext'
import { useAuth } from '../../context/AuthContext'
import { FormField, Input, Textarea } from '../ui/FormField'
import { AttachmentField } from '../ui/AttachmentField'
import Button from '../ui/Button'
import Badge from '../ui/Badge'
import { Modal } from './PaymentCreateModal'
import { clsx } from 'clsx'

function fmtCurrency(val) {
  if (!val && val !== 0) return '—'
  return `฿${new Intl.NumberFormat('en-US').format(val)}`
}

export default function InvoiceModal({ payment, onClose }) {
  const { updatePayment, projects } = useData()
  const { currentUser } = useAuth()

  // Map old status
  let status = payment.status
  if (status === 'Submitted') status = 'PM Approved'
  
  // Determine which stage we're in
  const isCreatingInvoice = status === 'PM Approved' // Creating invoice draft
  const isSubmittingInvoice = status === 'Invoice Draft' // Submitting invoice for PM review
  const isResubmittingInvoice = status === 'Invoice PM Rejected' // Resubmitting after PM rejection
  const isUploadingSignedDoc = status === 'Client Sign Pending' // Uploading signed document

  const project = projects?.find(p => p.id === payment.projectId)
  const contractNos = []
  if (payment.claimMainContract && project?.contractNo) {
    contractNos.push(project.contractNo)
  }
  if (payment.claimCOA && payment.coaItems?.length > 0) {
    payment.coaItems.forEach(coa => {
      if (coa.coaNo) contractNos.push(coa.coaNo)
    })
  }
  const contractNoString = contractNos.join(', ') || '—'

  const [form, setForm] = useState({
    invoiceNo: payment.invoiceNo || '',
    invoiceDate: payment.invoiceDate || '',
    invoiceDueDate: payment.invoiceDueDate || '',
    invoiceNote: payment.invoiceNote || '',
    clientSignedDoc: payment.clientSignedDoc || '',
    paymentApprovedDoc: payment.paymentApprovedDoc || '',
  })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const set = (k, v) => {
    setForm(p => ({ ...p, [k]: v }))
    if (errors[k]) setErrors(p => { const e = { ...p }; delete e[k]; return e })
  }

  const validate = () => {
    const errs = {}
    if (!form.invoiceNo.trim())    errs.invoiceNo    = 'Invoice number is required'
    if (!form.invoiceDate)         errs.invoiceDate  = 'Invoice date is required'
    if (!form.invoiceDueDate)      errs.invoiceDueDate = 'Payment due date is required'
    
    // If uploading signed document, require the file
    if (isUploadingSignedDoc && !form.clientSignedDoc.trim()) {
      errs.clientSignedDoc = 'Client signed document is required'
    }
    
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setSaving(true)
    await new Promise(r => setTimeout(r, 350))
    
    const updates = {
      invoiceNo:          form.invoiceNo,
      invoiceDate:        form.invoiceDate,
      invoiceDueDate:     form.invoiceDueDate,
      invoiceNote:        form.invoiceNote,
      paymentApprovedDoc: form.paymentApprovedDoc,
      invoiceIssuedBy:    currentUser.id,
    }
    
    if (isCreatingInvoice) {
      // Stage 2.0: Create invoice draft
      updates.status = 'Invoice Draft'
      updates.invoiceCreatedAt = new Date().toISOString().split('T')[0]
    } else if (isSubmittingInvoice || isResubmittingInvoice) {
      // Stage 2.1: Submit invoice for PM review
      updates.status = 'Invoice Pending PM'
      updates.invoiceSubmittedAt = new Date().toISOString().split('T')[0]
      // Clear rejection data if resubmitting
      if (isResubmittingInvoice) {
        updates.invoiceRejectedBy = null
        updates.invoiceRejectedAt = null
        updates.invoiceRejectionNote = null
      }
    } else if (isUploadingSignedDoc) {
      // Stage 2.2: Upload signed document and submit to AccCMG
      updates.status = 'Invoice Submitted'
      updates.clientSignedDoc = form.clientSignedDoc
      updates.clientSignedAt = new Date().toISOString().split('T')[0]
    }
    
    updatePayment(payment.id, updates)
    setSaving(false)
    onClose()
  }

  return (
    <Modal
      title={
        isUploadingSignedDoc ? "Upload Signed Invoice" :
        isSubmittingInvoice ? "Submit Invoice for PM Review" :
        isResubmittingInvoice ? "Resubmit Invoice" :
        "Create Invoice"
      }
      subtitle={
        isUploadingSignedDoc ? "Stage 2.2 — Upload Client Signed Document" :
        isSubmittingInvoice || isResubmittingInvoice ? "Stage 2.1 — Submit for PM Review" :
        "Stage 2.0 — Create Invoice Draft"
      }
      onClose={onClose}
    >
      <div className="space-y-4">
        {/* Approved claim summary - Compact view mimicking Review Payment Claim */}
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText size={14} className="text-emerald-600" />
              <span className="text-sm font-semibold text-emerald-800">{payment.paymentNo}</span>
            </div>
            <Badge variant="emerald">PM Approved</Badge>
          </div>
          
          {payment.detail && <p className="text-xs text-slate-600">{payment.detail}</p>}
          
          {/* Main Contract Items */}
          {payment.claimMainContract && payment.mainContractItems && payment.mainContractItems.length > 0 && (
            <div className="space-y-1">
              <h4 className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wide">Main Contract Items</h4>
              <div className="rounded border border-emerald-200 overflow-hidden bg-white/60">
                <table className="w-full text-[10px] sm:text-xs">
                  <thead className="bg-emerald-100/50 border-b border-emerald-200">
                    <tr>
                      <th className="px-2 py-1 text-left font-semibold text-emerald-800 w-8">No.</th>
                      <th className="px-2 py-1 text-left font-semibold text-emerald-800">Description</th>
                      <th className="px-2 py-1 text-right font-semibold text-emerald-800 w-24">Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-emerald-100">
                    {payment.mainContractItems.map((item, idx) => (
                      <tr key={idx}>
                        <td className="px-2 py-1 text-emerald-700">{item.no}</td>
                        <td className="px-2 py-1 text-emerald-800">{item.description}</td>
                        <td className="px-2 py-1 text-right font-semibold text-emerald-900">{fmtCurrency(item.value)}</td>
                      </tr>
                    ))}
                    <tr className="bg-emerald-100/50 font-semibold">
                      <td colSpan="2" className="px-2 py-1 text-right text-emerald-800">Total:</td>
                      <td className="px-2 py-1 text-right text-emerald-900">
                        {fmtCurrency(payment.mainContractItems.reduce((sum, item) => sum + (item.value || 0), 0))}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* COA Items */}
          {payment.claimCOA && payment.coaItems && payment.coaItems.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wide">COA Items</h4>
              <div className="grid gap-2">
                {payment.coaItems.map((coaItem, coaIdx) => (
                  <div key={coaIdx} className="border border-emerald-200 rounded overflow-hidden bg-white/60">
                    <div className="bg-emerald-100/80 px-2 py-1 flex justify-between items-center">
                      <h5 className="text-[10px] font-semibold text-emerald-800">{coaItem.coaNo}</h5>
                    </div>
                    <table className="w-full text-[10px] sm:text-xs">
                      <thead className="bg-emerald-50 border-b border-emerald-100 border-t">
                        <tr>
                          <th className="px-2 py-1 text-left font-semibold text-emerald-700 w-8">No.</th>
                          <th className="px-2 py-1 text-left font-semibold text-emerald-700">Description</th>
                          <th className="px-2 py-1 text-right font-semibold text-emerald-700 w-24">Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-emerald-100">
                        {coaItem.items.map((item, idx) => (
                          <tr key={idx}>
                            <td className="px-2 py-1 text-emerald-600">{item.no}</td>
                            <td className="px-2 py-1 text-emerald-700">{item.description}</td>
                            <td className="px-2 py-1 text-right font-semibold text-emerald-800">{fmtCurrency(item.value)}</td>
                          </tr>
                        ))}
                        <tr className="bg-emerald-100/30 font-semibold">
                          <td colSpan="2" className="px-2 py-1 text-right text-emerald-800">Total:</td>
                          <td className="px-2 py-1 text-right text-emerald-900">
                            {fmtCurrency(coaItem.items.reduce((sum, item) => sum + (item.value || 0), 0))}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Other Claim */}
          {payment.otherClaim && payment.otherClaim > 0 && (
            <div className="flex items-center justify-between px-2 py-1.5 bg-white/60 border border-emerald-200 rounded">
              <span className="text-[10px] font-semibold text-emerald-800">Other Claim</span>
              <span className="text-xs font-bold text-emerald-900">{fmtCurrency(payment.otherClaim)}</span>
            </div>
          )}

          {/* Financial Breakdown */}
          <div className="rounded border border-emerald-200 overflow-hidden bg-white/60">
            <div className="grid grid-cols-6 text-[9px] font-semibold text-emerald-700 uppercase tracking-wide bg-emerald-100/50 px-2 py-1 border-b border-emerald-200 text-center">
              <span>Claim Value</span>
              <span>VAT (7%)</span>
              <span>Advance Ded.</span>
              <span>Retention</span>
              <span>With Tax</span>
              <span className="text-emerald-900">Balance</span>
            </div>
            <div className="grid grid-cols-6 px-2 py-1.5 text-center items-center">
              <span className="text-[10px] font-semibold text-emerald-800">{fmtCurrency(payment.value)}</span>
              <span className="text-[10px] font-medium text-emerald-600">+{fmtCurrency(payment.value * 0.07)}</span>
              <span className="text-[10px] font-medium text-rose-600">−{fmtCurrency(payment.advanceDeduction)}</span>
              <span className="text-[10px] font-medium text-rose-600">−{fmtCurrency(payment.retentionReduce)}</span>
              <span className="text-[10px] font-medium text-rose-600">-{fmtCurrency(payment.withTaxValue || 0)}</span>
              <span className="text-xs font-bold text-emerald-900">{fmtCurrency(payment.balanceValue)}</span>
            </div>
          </div>
        </div>

        {/* Invoice fields */}
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-600">
            <Send size={14} className="text-blue-100" />
            <span className="text-sm font-semibold text-white">Invoice Details</span>
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Contract No. / COR No.">
              <div className="relative">
                <FileText size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  value={contractNoString}
                  disabled
                  className="pl-8 bg-slate-50 text-slate-500"
                />
              </div>
            </FormField>

            <FormField label="Invoice No." required error={errors.invoiceNo}>
              <div className="relative">
                <Hash size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="e.g. INV-P1-2024-003"
                  value={form.invoiceNo}
                  onChange={e => set('invoiceNo', e.target.value)}
                  error={errors.invoiceNo}
                  className="pl-8"
                />
              </div>
            </FormField>

            <FormField label="Invoice Date" required error={errors.invoiceDate}>
              <div className="relative">
                <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  type="date"
                  value={form.invoiceDate}
                  onChange={e => set('invoiceDate', e.target.value)}
                  error={errors.invoiceDate}
                  className="pl-8"
                />
              </div>
            </FormField>

            <FormField label="Due Date" required error={errors.invoiceDueDate}>
              <div className="relative">
                <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  type="date"
                  value={form.invoiceDueDate}
                  onChange={e => set('invoiceDueDate', e.target.value)}
                  error={errors.invoiceDueDate}
                  className="pl-8"
                />
              </div>
            </FormField>

            <FormField label="Payment Approved Attachment" className="sm:col-span-2">
              <AttachmentField
                value={form.paymentApprovedDoc}
                onChange={v => set('paymentApprovedDoc', v)}
                folder="invoices"
                docId={payment.projectId}
                uploadedBy={currentUser?.id}
                placeholder="Upload Payment Approved document..."
              />
            </FormField>

            <FormField label="Note" className="sm:col-span-2">
              <Textarea
                rows={2}
                placeholder="Additional notes to client, payment instructions..."
                value={form.invoiceNote}
                onChange={e => set('invoiceNote', e.target.value)}
              />
            </FormField>
            
            {/* Client Signed Document - only show when uploading */}
            {isUploadingSignedDoc && (
              <FormField label="Client Signed Document" required error={errors.clientSignedDoc} className="sm:col-span-2">
                <AttachmentField
                  value={form.clientSignedDoc}
                  onChange={v => set('clientSignedDoc', v)}
                  folder="invoices"
                  docId={payment.projectId}
                  uploadedBy={currentUser?.id}
                  placeholder="Upload signed invoice from client"
                />
              </FormField>
            )}
          </div>
        </div>

        <p className="text-xs text-slate-400 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
          {isUploadingSignedDoc 
            ? 'Uploading the signed document will submit the invoice to AccCMG for income confirmation (Stage 3).'
            : isSubmittingInvoice || isResubmittingInvoice
            ? 'Submitting this invoice will send it to PM for review and approval (Stage 2.1).'
            : 'Creating this invoice will save it as draft. You can submit it for PM review later (Stage 2.0).'
          }
        </p>
      </div>

      <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-slate-100">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant="primary" icon={Send} loading={saving} onClick={handleSubmit}>
          {isUploadingSignedDoc ? 'Upload & Submit to AccCMG' :
           isSubmittingInvoice ? 'Submit for PM Review' :
           isResubmittingInvoice ? 'Resubmit Invoice' :
           'Save Draft'}
        </Button>
      </div>
    </Modal>
  )
}
