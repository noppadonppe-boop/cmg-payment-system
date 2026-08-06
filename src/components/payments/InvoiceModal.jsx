import { useState, Fragment } from 'react'
import { Send, Hash, Calendar, Paperclip, FileText, Calculator, Printer, Eye, ArrowLeft } from 'lucide-react'
import { useData } from '../../context/DataContext'
import { useAuth } from '../../context/AuthContext'
import { FormField, Input, Textarea } from '../ui/FormField'
import { AttachmentField, AttachmentLink } from '../ui/AttachmentField'
import Button from '../ui/Button'
import Badge from '../ui/Badge'
import { Modal } from './PaymentCreateModal'
import THBText from 'thai-baht-text'
import { getPaymentFinancials } from '../../lib/paymentCalculations'
import { normalizePaymentStatus } from '../../lib/paymentStatus'

function fmtCurrency(val) {
  if (!val && val !== 0) return '—'
  // ปัดเศษทศนิยมตำแหน่งที่ 3: 5 ขึ้นไปปัดขึ้น, 4 ลงมาปัดลง
  const rounded = Math.round(val * 100) / 100
  return `฿${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(rounded)}`
}

export default function InvoiceModal({ payment, onClose, onEditPayment }) {
  const { updatePayment, projects } = useData()
  const { currentUser } = useAuth()

  // Map old status
  const status = normalizePaymentStatus(payment)
  const financials = getPaymentFinancials(payment)
  
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
  const [showPreview, setShowPreview] = useState(false)

  const fmtInvoiceCurrency = (val) => {
    if (!val && val !== 0) return '—'
    // ปัดเศษทศนิยมตำแหน่งที่ 3: 5 ขึ้นไปปัดขึ้น, 4 ลงมาปัดลง
    const rounded = Math.round(val * 100) / 100
    return `${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(rounded)} B`
  }

  const fmtInvoiceDate = (d) => {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  }

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
    
    await updatePayment(payment.id, updates)
    setSaving(false)
    onClose()
  }

  const handlePrint = () => {
    window.print()
  }

  // คำนวณมูลค่ารวมของรายการ (Main Contract + COA + Other Claim)
  const displayVat = financials.vatAmount
  const visualTotal = financials.grossClaimValue

  const invoicePreview = (
    <div className="print-area flex justify-center bg-slate-100 py-8 print:p-0 print:bg-white overflow-auto max-h-[70vh] print:max-h-none print:overflow-visible">
      <div 
        className="bg-white text-black shrink-0 shadow-lg print:shadow-none relative" 
        style={{ 
          width: '210mm', 
          minHeight: '297mm', 
          padding: '12mm 15mm', 
          fontFamily: 'Arial, sans-serif'
        }}
      >
        {/* ── Header: Logo + Title ── */}
        <div className="flex justify-between items-start mb-6">
          {/* Left: Logo & Address */}
          <div className="flex gap-3">
            {/* CMG Logo */}
            <div className="w-[120px] shrink-0 flex items-start justify-center pt-1">
              <img src="/logo.png" alt="CMG Logo" className="max-w-full h-auto object-contain" />
            </div>
            <div className="text-[11px] leading-[1.4]">
              <p className="font-bold text-blue-700 text-[12px] uppercase tracking-wide">CMG ENGINEERING&amp; CONSTRUCTION CO.,LTD</p>
              <p className="text-blue-700">4/281 Moo 3, Nempra Mueang, Rayong District, Rayong Province 21000</p>
              <p className="text-blue-700">Tel 033-680588 Fax 033-680588</p>
            </div>
          </div>

          {/* Right: FRM-CMG */}
          <div className="text-[9px] text-black pt-1">
            <p>FROM-CMG-AC-011</p>
          </div>
        </div>

        {/* Title & Tax ID */}
        <div className="flex justify-between items-end mb-4">
          <div className="w-1/4"></div>
          <div className="w-1/2 text-center pl-8">
            <h1 className="text-[20px] font-bold">
              INVOICE <span className="text-red-600 ml-1">(Original)</span>
            </h1>
          </div>
          <div className="w-1/4 text-right text-[10px] font-semibold leading-tight">
            <p>CMG TAX ID:</p>
            <p className="font-bold">0215557001784</p>
          </div>
        </div>

        {/* ── Invoice Info Grid ── */}
        <div className="flex border border-black border-b-0 text-[11px]">
          {/* Left: Client info */}
          <div className="w-[60%] p-2 py-3 space-y-[10px] relative">
            <div className="flex items-end">
              <span className="w-[70px] shrink-0">Invoice to.</span>
              <span className="flex-1 border-b-[1.5px] border-black pb-0 leading-none pl-1 font-semibold">{project?.clientInfo?.name || ''}</span>
            </div>
            <div className="flex items-end">
              <span className="w-[70px] shrink-0">Adress:</span>
              <span className="flex-1 border-b-[1.5px] border-black pb-0 leading-none pl-1">{project?.clientInfo?.address || ''}</span>
            </div>
            <div className="flex items-end">
              <span className="w-[70px] shrink-0"></span>
              <span className="flex-1 border-b-[1.5px] border-black pb-0 leading-none pl-1">&nbsp;</span>
            </div>
            <div className="flex items-end">
              <span className="w-[70px] shrink-0">TAX ID :</span>
              <span className="flex-1 border-b-[1.5px] border-black pb-0 leading-none pl-1">{project?.clientInfo?.taxId || ''}</span>
            </div>
            <div className="flex items-end">
              <span className="w-[70px] shrink-0">Contract No.</span>
              <span className="flex-1 border-b-[1.5px] border-black pb-0 leading-none pl-1">{contractNoString}</span>
            </div>
            <div className="flex items-end">
              <span className="w-[70px] shrink-0">Attention :</span>
              <span className="flex-1 border-b-[1.5px] border-black pb-0 leading-none pl-1"></span>
            </div>
          </div>

          {/* Right: Invoice details box */}
          <div className="w-[40%] border-l border-black flex flex-col font-semibold">
            <div className="flex border-b border-black flex-1 items-stretch">
              <div className="w-28 border-r border-black px-2 flex items-center justify-end text-center">Invoice No :</div>
              <div className="px-2 font-bold text-center flex-1 flex items-center justify-center">{form.invoiceNo || ''}</div>
            </div>
            <div className="flex border-b border-black flex-1 items-stretch">
              <div className="w-28 border-r border-black px-2 flex items-center justify-end text-center">Date :</div>
              <div className="px-2 text-center flex-1 flex items-center justify-center">{fmtInvoiceDate(form.invoiceDate)}</div>
            </div>
            <div className="flex border-b border-black flex-1 items-stretch">
              <div className="w-28 border-r border-black px-2 flex items-center justify-end text-center">Customer No :</div>
              <div className="px-2 text-center flex-1 flex items-center justify-center"></div>
            </div>
            <div className="flex border-b border-black flex-1 items-stretch">
              <div className="w-28 border-r border-black px-2 flex items-center justify-end text-center">Credit Term :</div>
              <div className="px-2 text-center flex-1 flex items-center justify-center">{project?.clientInfo?.creditTerm || ''}</div>
            </div>
            <div className="flex flex-1 items-stretch">
              <div className="w-28 border-r border-black px-2 flex items-center justify-end text-center">Due Date :</div>
              <div className="px-2 text-center flex-1 flex items-center justify-center">{fmtInvoiceDate(form.invoiceDueDate)}</div>
            </div>
          </div>
        </div>

        {/* ── Main Table ── */}
        <table className="w-full border-collapse border border-black text-[11px] mb-0">
          <thead>
            <tr className="border-b border-black h-8">
              <th className="border-r border-black font-bold w-[60%] text-center">Description</th>
              <th className="font-bold w-[40%] text-center">Amount</th>
            </tr>
          </thead>
          <tbody>
            {/* Project Name and Detail */}
            <tr>
              <td className="border-r border-black p-3 pb-1 align-top">
                <p className="font-bold uppercase text-[12px]">{project?.name || ''}</p>
                {payment.detail && <p className="font-bold mt-1.5">{payment.detail}</p>}
              </td>
              <td className="p-3 pb-1 align-top text-right pr-6 font-bold text-[11px] mt-[26px]">
                {/* Only show overall value if there are no sub-items */}
                {(!payment.claimMainContract && !payment.claimCOA) ? fmtInvoiceCurrency(payment.value) : ''}
              </td>
            </tr>

            {/* Main Contract Items */}
            {payment.claimMainContract && payment.mainContractItems?.map((item, idx) => (
              <tr key={`main-${idx}`}>
                <td className="border-r border-black pl-5 pr-3 py-1 align-top font-semibold">
                  {item.description}
                </td>
                <td className="pr-6 py-1 align-top text-right font-bold text-[11px]">
                  {fmtInvoiceCurrency(item.value)}
                </td>
              </tr>
            ))}

            {/* COA Items */}
            {payment.claimCOA && payment.coaItems?.map((coa, cidx) => (
              <Fragment key={`coa-${cidx}`}>
                <tr>
                  <td className="border-r border-black pl-5 pr-3 py-1 align-top font-bold">
                    {coa.coaNo}
                  </td>
                  <td className="pr-6 py-1 align-top text-right font-bold text-[11px]"></td>
                </tr>
                {coa.items?.map((item, idx) => (
                  <tr key={`coa-item-${idx}`}>
                    <td className="border-r border-black pl-8 pr-3 py-1 align-top font-semibold">
                      {item.description}
                    </td>
                    <td className="pr-6 py-1 align-top text-right font-bold text-[11px]">
                      {fmtInvoiceCurrency(item.value)}
                    </td>
                  </tr>
                ))}
              </Fragment>
            ))}

            {/* Other Claim */}
            {payment.otherClaim && payment.otherClaim > 0 && (
              <tr>
                <td className="border-r border-black pl-5 pr-3 py-1 align-top font-semibold">
                  Other Claim
                </td>
                <td className="pr-6 py-1 align-top text-right font-bold text-[11px]">
                  {fmtInvoiceCurrency(payment.otherClaim)}
                </td>
              </tr>
            )}

            {/* Filler Row to push height and keep the invoice layout consistent */}
            <tr>
              <td className="border-r border-black" style={{ height: '60px' }}></td>
              <td></td>
            </tr>

            {/* Financial Summary Rows - NO internal borders */}
            {/* Advance Deduction - แสดงก่อน VAT */}
            {payment.advanceDeduction && payment.advanceDeduction > 0 && (
              <tr>
                <td className="border-r border-black text-right pr-4 py-1 font-bold text-[11px] leading-tight">
                  <span className="underline">Deduct</span> Advance Payment
                </td>
                <td className="text-right pr-6 py-1 font-bold text-[11px] leading-tight">{fmtInvoiceCurrency(payment.advanceDeduction)}</td>
              </tr>
            )}
            {payment.retentionReduceTiming === 'before' && payment.retentionReduce > 0 && (
              <tr>
                <td className="border-r border-black text-right pr-4 py-1 font-bold text-[11px] leading-tight">
                  <span className="underline">Deduct</span> Retention (Before VAT)
                </td>
                <td className="text-right pr-6 py-1 font-bold text-[11px] leading-tight">{fmtInvoiceCurrency(payment.retentionReduce)}</td>
              </tr>
            )}
            <tr>
              <td className="border-r border-black text-right pr-4 py-1 font-bold text-[11px] leading-tight">VAT 7%</td>
              <td className="text-right pr-6 py-1 font-bold text-[11px] leading-tight">{fmtInvoiceCurrency(displayVat)}</td>
            </tr>
            <tr>
              <td className="border-r border-black text-right pr-4 py-1 font-bold text-[11px] leading-tight">Total</td>
              <td className="text-right pr-6 py-1 font-bold text-[11px] leading-tight">{fmtInvoiceCurrency(visualTotal)}</td>
            </tr>
            {payment.retentionReduceTiming !== 'before' && (
              <tr>
                <td className="border-r border-black text-right pr-4 py-1 font-bold text-[11px] leading-tight">
                  <span className="underline">Deduct</span> {payment.retentionReduceValue || '10'}% Retention
                </td>
                <td className="text-right pr-6 py-1 font-bold text-[11px] leading-tight">{fmtInvoiceCurrency(payment.retentionReduce || 0)}</td>
              </tr>
            )}
            <tr>
              <td className="border-r border-black text-right pr-4 py-1 font-bold text-[11px] leading-tight pb-2">
                Withhoding Tax ={payment.withTaxPercent || 3}%
              </td>
              <td className="text-right pr-6 py-1 font-bold text-[11px] leading-tight pb-2">{fmtInvoiceCurrency(financials.withTaxValue)}</td>
            </tr>

            {/* NET TOTAL */}
            <tr>
              <td className="border-r border-black text-right pr-4 pt-4 pb-2 font-bold text-[11px] leading-tight">NET TOTAL</td>
              <td className="text-right pr-6 pt-4 pb-2 font-bold text-[11px] leading-tight">{fmtInvoiceCurrency(financials.balanceValue)}</td>
            </tr>

            {/* Bank Details */}
            <tr className="border-t border-black bg-white">
              <td colSpan="2" className="p-2 pl-3">
                <div className="text-[9px] space-y-[1px] leading-tight">
                  <p className="font-bold text-[10px]">Bank Name: Kasikorn Bank</p>
                  <p className="font-bold">Branch Name: Big C, Rayong, Thailand</p>
                  <p className="font-bold">Swift/Sort Code: KASITHBK</p>
                  <p className="font-bold">Address: 15/11 Choeng Noen, Muang Rayong, Big C Supercenter Building, Floor 1,</p>
                  <p className="font-bold">Room No.Gcr 115 / 2a, Bang Na-Trat, Rayong, Thailand 21000</p>
                  <p className="text-red-600 font-bold text-[10px]">Bank Account number: 067-150-5530</p>
                  <p className="font-bold">Tel +66 (0)38-011771, 38-011774</p>
                  <p className="font-bold">Fax 038-011776</p>
                  <p className="font-bold">Fax 038-011777</p>
                </div>
              </td>
            </tr>
            
            {/* Thai Baht Text Row */}
            <tr className="border-t border-black bg-white">
              <td colSpan="2" className="py-2 px-2 font-bold text-[11px]">
                {THBText(financials.balanceValue || 0)}
              </td>
            </tr>
          </tbody>
        </table>

        {/* ── Footer ── */}
        <div className="flex border border-t-0 border-black text-[11px]">
          <div className="w-[60%] border-r border-black p-2 flex flex-col justify-between" style={{ minHeight: '130px' }}>
            <div className="font-semibold leading-tight pt-1 pl-1">
              <p>The cheque payment will be complete when we receive the money</p>
              <p>as a payment condition.</p>
            </div>
            <div className="mt-8 flex flex-col items-center pl-10 pr-16">
              <div className="border-t-[1.5px] border-black w-48 text-center pt-1 mb-1 font-semibold text-[10px]">
                Authorized Signature
              </div>
              <div className="font-semibold text-[10px]">CMG</div>
              <div className="w-48 flex mt-3 font-semibold text-[10px]">
                <span>Date :</span>
              </div>
            </div>
          </div>
          
          <div className="w-[40%] p-2 flex flex-col justify-between items-center" style={{ minHeight: '130px' }}>
            <div className="mt-3 font-semibold">
              Received Invoice
            </div>
            <div className="mt-8 w-full flex flex-col items-center">
              <div className="border-t-[1.5px] border-black w-48 text-center pt-1 mb-1 font-semibold text-[10px]">
                Authorized Signature
              </div>
              <div className="font-semibold text-[10px]">Name</div>
              <div className="w-48 flex mt-3 font-semibold text-[10px]">
                <span>Date :</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <Modal
      title={
        showPreview ? "Invoice Preview" :
        isUploadingSignedDoc ? "Upload Signed Invoice" :
        isSubmittingInvoice ? "Submit Invoice for PM Review" :
        isResubmittingInvoice ? "Resubmit Invoice" :
        "Create Invoice"
      }
      subtitle={
        showPreview ? "Review invoice before saving" :
        isUploadingSignedDoc ? "Stage 2.2 — Upload Client Signed Document" :
        isSubmittingInvoice || isResubmittingInvoice ? "Stage 2.1 — Submit for PM Review" :
        "Stage 2.0 — Create Invoice Draft"
      }
      onClose={onClose}
      maxWidth={showPreview ? 'max-w-5xl' : 'max-w-4xl'}
    >
      {showPreview ? (
        <div className="space-y-4">
          <div className="max-w-none">
            {invoicePreview}
          </div>
          <p className="text-xs text-slate-400 text-center hidden print:block">
            Printed from CMG Payment System
          </p>
        </div>
      ) : (
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
                <span className="text-[10px] font-semibold text-emerald-800">{fmtCurrency(financials.value)}</span>
                <span className="text-[10px] font-medium text-emerald-600">+{fmtCurrency(financials.vatAmount)}</span>
                <span className="text-[10px] font-medium text-rose-600">−{fmtCurrency(payment.advanceDeduction)}</span>
                <span className="text-[10px] font-medium text-rose-600">−{fmtCurrency(payment.retentionReduce)}</span>
                <span className="text-[10px] font-medium text-rose-600">-{fmtCurrency(financials.withTaxValue)}</span>
                <span className="text-xs font-bold text-emerald-900">{fmtCurrency(financials.balanceValue)}</span>
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

              <FormField label="Credit Term">
                <Input
                  value={project?.clientInfo?.creditTerm || '—'}
                  disabled
                  className="bg-slate-50 text-slate-500"
                />
              </FormField>

              {payment.paymentApprovedDoc && (
                <FormField label="Payment Approved Attachment" className="sm:col-span-2">
                  <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm">
                    <AttachmentLink value={payment.paymentApprovedDoc} className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium" />
                  </div>
                </FormField>
              )}

              <FormField label="Note" className="sm:col-span-2">
                <Textarea
                  rows={2}
                  placeholder="Additional notes to client, payment instructions..."
                  value={form.invoiceNote}
                  onChange={e => set('invoiceNote', e.target.value)}
                />
              </FormField>
              
              {/* Client Signed Invoice - only show when uploading */}
              {isUploadingSignedDoc && (
                <FormField label="Client Signed Invoice" required error={errors.clientSignedDoc} className="sm:col-span-2">
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
      )}

      <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-slate-100 print:hidden">
        {isResubmittingInvoice && onEditPayment && (
          <Button
            variant="secondary"
            icon={ArrowLeft}
            className="mr-auto"
            onClick={onEditPayment}
          >
            Back to Edit Payment Claim
          </Button>
        )}
        {showPreview ? (
          <>
            <Button variant="secondary" icon={ArrowLeft} onClick={() => setShowPreview(false)}>
              Back to Edit
            </Button>
            <Button variant="secondary" icon={Printer} onClick={handlePrint}>
              Print
            </Button>
            <Button variant="primary" icon={Send} loading={saving} onClick={handleSubmit}>
              {isUploadingSignedDoc ? 'Upload & Submit to AccCMG' :
               isSubmittingInvoice ? 'Submit for PM Review' :
               isResubmittingInvoice ? 'Resubmit Invoice' :
               'Save Draft'}
            </Button>
          </>
        ) : (
          <>
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button variant="secondary" icon={Eye} onClick={() => setShowPreview(true)}>
              Create Invoice
            </Button>
            <Button variant="primary" icon={Send} loading={saving} onClick={handleSubmit}>
              {isUploadingSignedDoc ? 'Upload & Submit to AccCMG' :
               isSubmittingInvoice ? 'Submit for PM Review' :
               isResubmittingInvoice ? 'Resubmit Invoice' :
               'Save Draft'}
            </Button>
          </>
        )}
      </div>
    </Modal>
  )
}
