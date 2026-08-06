import { useState } from 'react'
import {
  FileText, User, Calendar, CheckCircle2,
  Clock, Send, Banknote, XCircle, Hash, AlertCircle, Paperclip, Receipt
} from 'lucide-react'
import { useData } from '../../context/DataContext'
import { useAuth } from '../../context/AuthContext'
import Button from '../ui/Button'
import Badge from '../ui/Badge'
import { AttachmentField, AttachmentLink } from '../ui/AttachmentField'
import { Modal } from './PaymentCreateModal'
import ReceiptPreviewModal from './ReceiptPreviewModal'
import { clsx } from 'clsx'
import { getPaymentFinancials } from '../../lib/paymentCalculations'
import { normalizePaymentStatus } from '../../lib/paymentStatus'

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

function InfoRow({ label, value }) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{label}</p>
      <p className="text-sm text-slate-700 mt-0.5 font-medium">{value ?? <span className="text-slate-300 font-normal">—</span>}</p>
    </div>
  )
}

export default function PaymentDetailModal({ payment, actions, onClose, onAction }) {
  const { projects, updatePayment } = useData()
  const { currentUser, USERS, can } = useAuth()

  const project = projects.find(p => p.id === payment.projectId)
  const creator = USERS.find(u => u.id === payment.createdBy)
  const approver = USERS.find(u => u.id === payment.approvedBy)
  const receiver = USERS.find(u => u.id === payment.receivedBy)
  const rejecter = USERS.find(u => u.id === payment.rejectedBy)

  const isPM     = can('canApprovePayments')
  const isQsEng  = can('canCreateClaims')
  const isAccCMG = can('canUpdateBonds')

  // Map old statuses
  const mappedStatus = normalizePaymentStatus(payment)
  const financials = getPaymentFinancials(payment)

  const currentStep =
    mappedStatus === 'Completed' ? 4 :
    (mappedStatus === 'Invoice Submitted' || mappedStatus === 'Income Confirm Pending') ? 3 :
    (mappedStatus === 'PM Approved' || mappedStatus === 'Invoice Draft' || mappedStatus === 'Invoice Pending PM' || mappedStatus === 'Invoice PM Rejected' || mappedStatus === 'Client Sign Pending') ? 2 :
    1

  const isRejected = mappedStatus === 'PM Rejected' || mappedStatus === 'Invoice PM Rejected'
  const isDraft = mappedStatus === 'Draft' || mappedStatus === 'Invoice Draft'
  const isCompleted = mappedStatus === 'Completed'

  const [showReceipt, setShowReceipt] = useState(false)
  const [withholdingDoc, setWithholdingDoc] = useState(payment.withholdingTaxDoc || '')
  const [savingWht, setSavingWht] = useState(false)

  const handleSaveWht = async () => {
    if (!withholdingDoc) return
    setSavingWht(true)
    await updatePayment(payment.id, { withholdingTaxDoc: withholdingDoc })
    setSavingWht(false)
  }

  return (
    <>
      <Modal
        title={payment.paymentNo}
        subtitle={project?.name ?? '—'}
        onClose={onClose}
        maxWidth="max-w-4xl"
      >
      <div className="space-y-5">
        {/* Visual 4-Step Stepper */}
        <WorkflowStepper payment={payment} />

        {/* Draft Notice */}
        {payment.status === 'Draft' && (
          <div className="flex items-start gap-2.5 bg-slate-50 border border-slate-300 rounded-lg px-3 py-2.5">
            <AlertCircle size={15} className="text-slate-500 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-700">
              <p className="font-semibold">Draft - Pending Submission</p>
              <p className="mt-1">
                Payment นี้อยู่ในสถานะ Draft คุณสามารถแก้ไขและ Submit เพื่อส่งให้ PM อนุมัติได้
              </p>
            </div>
          </div>
        )}

        {/* Step 1: Claim Info */}
        <StepSection
          step={1}
          title="Payment Claim"
          subtitle="Submitted by QsEng"
          status={payment.status}
          activeStep={1}
          color="blue"
        >
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-x-6 gap-y-2">
            <InfoRow label="Payment No." value={payment.paymentNo} />
            <InfoRow label="Submitted By" value={creator?.name} />
            <InfoRow label="Date" value={fmtDate(payment.createdAt)} />
            <InfoRow label="Description" value={payment.detail} />
            {payment.attachment && (
              <InfoRow
                label="Attachment"
                value={<AttachmentLink value={payment.attachment} className="flex items-center gap-1" />}
              />
            )}
            {payment.note && <InfoRow label="Note" value={`"${payment.note}"`} />}
          </div>

          {/* Claim Items Display - New Format */}
          {payment.claimMainContract && payment.mainContractItems && payment.mainContractItems.length > 0 && (
            <div className="mt-4 space-y-2">
              <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Main Contract Items</h4>
              <div className="rounded-lg border border-slate-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-1 text-left text-xs font-semibold text-slate-600 w-16">No.</th>
                      <th className="px-3 py-1 text-left text-xs font-semibold text-slate-600">Description</th>
                      <th className="px-3 py-1 text-right text-xs font-semibold text-slate-600 w-32">Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payment.mainContractItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-3 py-1 text-slate-600 font-medium">{item.no}</td>
                        <td className="px-3 py-1 text-slate-700">{item.description}</td>
                        <td className="px-3 py-1 text-right font-semibold text-slate-800">{fmtCurrency(item.value)}</td>
                      </tr>
                    ))}
                    <tr className="bg-slate-50 font-semibold">
                      <td colSpan="2" className="px-3 py-1 text-right text-slate-700">Total:</td>
                      <td className="px-3 py-1 text-right text-blue-700">
                        {fmtCurrency(payment.mainContractItems.reduce((sum, item) => sum + (item.value || 0), 0))}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {payment.claimCOA && payment.coaItems && payment.coaItems.length > 0 && (
            <div className="mt-4 space-y-3">
              <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wide">COA Items</h4>
              {payment.coaItems.map((coaItem, coaIdx) => (
                <div key={coaIdx} className="border border-purple-200 rounded-lg overflow-hidden">
                  <div className="bg-purple-600 px-3 py-1.5">
                    <h5 className="text-sm font-semibold text-white">{coaItem.coaNo}</h5>
                  </div>
                  <div className="overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="px-3 py-1 text-left text-xs font-semibold text-slate-600 w-16">No.</th>
                          <th className="px-3 py-1 text-left text-xs font-semibold text-slate-600">Description</th>
                          <th className="px-3 py-1 text-right text-xs font-semibold text-slate-600 w-32">Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {coaItem.items.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="px-3 py-1 text-slate-600 font-medium">{item.no}</td>
                            <td className="px-3 py-1 text-slate-700">{item.description}</td>
                            <td className="px-3 py-1 text-right font-semibold text-slate-800">{fmtCurrency(item.value)}</td>
                          </tr>
                        ))}
                        <tr className="bg-purple-50 font-semibold">
                          <td colSpan="2" className="px-3 py-1 text-right text-slate-700">Total:</td>
                          <td className="px-3 py-1 text-right text-purple-700">
                            {fmtCurrency(coaItem.items.reduce((sum, item) => sum + (item.value || 0), 0))}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Legacy Data Display - For old payments without detailed items */}
          {!payment.mainContractItems && !payment.coaItems && payment.value > 0 && (
            <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle size={14} className="text-slate-400 mt-0.5 shrink-0" />
                <div className="text-xs text-slate-600">
                  <p className="font-semibold">Legacy Payment Record</p>
                  <p className="mt-1">This payment was created before the detailed items tracking feature. Only summary values are available.</p>
                </div>
              </div>
            </div>
          )}

          {/* Other Claim Display */}
          {payment.otherClaim && payment.otherClaim > 0 && (
            <div className="mt-4 flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <span className="text-sm font-semibold text-slate-700">Other Claim</span>
              <span className="text-sm font-bold text-amber-700">{fmtCurrency(payment.otherClaim)}</span>
            </div>
          )}

          {/* Financial breakdown */}
          <div className="mt-4 rounded-lg border border-slate-200 overflow-hidden">
            <div className="grid grid-cols-6 text-xs font-semibold text-slate-500 uppercase tracking-wide bg-slate-50 px-4 py-2 border-b border-slate-200 text-center">
              <span>Claim Value</span>
              <span>VAT (7%)</span>
              <span>Advance Ded.</span>
              <span>Retention</span>
              <span>With Tax</span>
              <span className="text-emerald-700">Balance</span>
            </div>
            <div className="grid grid-cols-6 px-4 py-3 text-center items-center">
              <span className="text-sm font-semibold text-slate-800">{fmtCurrency(financials.value)}</span>
              <span className="text-sm font-medium text-slate-600">+{fmtCurrency(financials.vatAmount)}</span>
              <span className="text-sm font-medium text-rose-500">−{fmtCurrency(payment.advanceDeduction)}</span>
              <span className="text-sm font-medium text-rose-500">−{fmtCurrency(payment.retentionReduce)}</span>
              <span className="text-sm font-medium text-rose-500">-{fmtCurrency(financials.withTaxValue)}</span>
              <span className="text-base font-bold text-emerald-700">{fmtCurrency(financials.balanceValue)}</span>
            </div>
          </div>

          {/* Rejection notice */}
          {mappedStatus === 'PM Rejected' && (
            <div className="mt-3 space-y-3">
              <div className="flex items-start gap-2.5 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2.5">
                <XCircle size={15} className="text-rose-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-rose-700">Rejected by {rejecter?.name ?? 'PM'} on {fmtDate(payment.rejectedAt)}</p>
                  {payment.rejectionNote && <p className="text-xs text-rose-600 mt-0.5">"{payment.rejectionNote}"</p>}
                </div>
              </div>
              {isQsEng && (
                <Button variant="primary" size="sm" onClick={() => onAction?.('edit')}>
                  Edit & Resubmit (flow เริ่มใหม่)
                </Button>
              )}
            </div>
          )}

          {/* Draft Edit Button */}
          {isQsEng && payment.status === 'Draft' && (
            <div className="mt-3">
              <Button variant="primary" size="sm" onClick={() => onAction?.('editDraft')}>
                Edit & Submit
              </Button>
            </div>
          )}

          {isPM && mappedStatus === 'Pending PM' && (
            <div className="mt-3">
              <Button variant="primary" size="sm" onClick={() => onAction?.('approve')}>
                Review & Approve / Reject
              </Button>
            </div>
          )}
          
          {isPM && payment.revisionRequest && payment.revisionRequest.status === 'Pending' && (
            <div className="mt-3 space-y-3">
              <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
                <AlertCircle size={15} className="text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-amber-700">Revision Requested by QS on {fmtDate(payment.revisionRequest.requestedAt)}</p>
                  {payment.revisionRequest.reason && <p className="text-xs text-amber-600 mt-0.5">Reason: "{payment.revisionRequest.reason}"</p>}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="primary" size="sm" onClick={() => onAction?.('approveRevision')}>
                  Approve Revision
                </Button>
                <Button variant="secondary" size="sm" onClick={() => onAction?.('rejectRevision')}>
                  Reject Request
                </Button>
              </div>
            </div>
          )}
        </StepSection>

        {/* Step 2: Invoice */}
        <StepSection
          step={2}
          title="Client Invoice"
          subtitle="Issued by QsEng after PM approval"
          status={mappedStatus}
          activeStep={currentStep >= 2 ? 2 : null}
          color="blue"
          locked={currentStep < 2}
        >
          {payment.invoiceNo ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3">
              <InfoRow label="Invoice No." value={payment.invoiceNo} />
              <InfoRow label="Due Date" value={fmtDate(payment.invoiceDueDate)} />
              <InfoRow label="Issued On" value={fmtDate(payment.invoiceSubmittedAt)} />
              {payment.invoiceNote && <InfoRow label="Note" value={`"${payment.invoiceNote}"`} />}
            </div>
          ) : (
            <p className="text-sm text-slate-400">
              {mappedStatus === 'Pending PM' || mappedStatus === 'PM Rejected'
                ? 'Awaiting PM approval before invoice can be issued.'
                : 'Invoice not yet issued.'}
            </p>
          )}

          {/* Payment Approved Attachment — uploaded during Create Invoice stage */}
          {payment.paymentApprovedDoc && (
            <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
              <Paperclip size={13} className="text-blue-500 shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] font-semibold text-blue-600 uppercase tracking-wide">Payment Approved Attachment</p>
                <AttachmentLink value={payment.paymentApprovedDoc} className="flex items-center gap-1 text-xs text-blue-700 hover:text-blue-900 font-medium truncate" />
              </div>
            </div>
          )}

          {/* Client Signed Document — shown once invoice has been signed by client */}
          {payment.clientSignedDoc && (
            <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
              <Paperclip size={13} className="text-blue-500 shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] font-semibold text-blue-600 uppercase tracking-wide">Client Signed Document</p>
                <AttachmentLink value={payment.clientSignedDoc} className="flex items-center gap-1 text-xs text-blue-700 hover:text-blue-900 font-medium truncate" />
              </div>
            </div>
          )}

          {isQsEng && mappedStatus === 'PM Approved' && !payment.revisionRequest && (
            <div className="mt-3 flex gap-2">
              {!payment.invoiceNo && (
                <Button variant="primary" size="sm" icon={Send} onClick={() => onAction?.('invoice')}>
                  Issue Invoice
                </Button>
              )}
              <Button variant="secondary" size="sm" onClick={() => onAction?.('requestRevision')}>
                Request Revision
              </Button>
            </div>
          )}
          
          {isQsEng && mappedStatus === 'PM Approved' && payment.revisionRequest && payment.revisionRequest.status === 'Pending' && (
            <div className="mt-3">
              <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2.5">
                <AlertCircle size={15} className="text-blue-500 shrink-0 mt-0.5" />
                <div className="text-xs text-blue-700">
                  <p className="font-semibold">Revision Request Pending</p>
                  <p className="mt-1">รอ PM อนุมัติคำขอแก้ไข</p>
                </div>
              </div>
            </div>
          )}
        </StepSection>

        {/* Step 3: Payment Received */}
        <StepSection
          step={3}
          title="Payment Received"
          subtitle="Confirmed by AccCMG"
          status={mappedStatus}
          activeStep={currentStep >= 3 ? 3 : null}
          color="emerald"
          locked={currentStep < 3}
        >

          {/* Stage 3.1 — Accepted, awaiting bank slip */}
          {mappedStatus === 'Income Confirm Pending' && (
            <div className="mb-3 flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
              <AlertCircle size={14} className="text-amber-500 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-700">
                <p className="font-semibold">Stage 3.1 — Confirm Receive Pending</p>
                <p className="mt-0.5">Payment accepted on {fmtDate(payment.acceptedAt)}. กรุณาออกใบเสร็จรับเงินเพื่อ Complete.</p>
              </div>
            </div>
          )}

          {payment.receivedDate ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3">
              <InfoRow label="Payment Received" value={fmtDate(payment.collectionDate || payment.receivedDate)} />
              <InfoRow label="Confirmed By" value={receiver?.name} />
              <InfoRow label="Confirmed On" value={fmtDate(payment.receivedAt)} />
              {payment.receivedNote && <InfoRow label="Note" value={`"${payment.receivedNote}"`} />}
            </div>
          ) : (
            <p className="text-sm text-slate-400">
              {isAccCMG && (mappedStatus === 'Invoice Submitted' || mappedStatus === 'Income Confirm Pending') && payment.invoiceNo
                ? mappedStatus === 'Income Confirm Pending'
                  ? 'Awaiting receipt generation to complete payment.'
                  : 'Ready to accept payment receipt.'
                : 'Awaiting payment from client.'}
            </p>
          )}

          {/* Stage 3 — Accept button (Invoice Submitted) */}
          {isAccCMG && mappedStatus === 'Invoice Submitted' && payment.invoiceNo && !payment.receivedDate && (
            <div className="mt-3">
              <Button variant="primary" size="sm" icon={CheckCircle2} onClick={() => onAction?.('received')}>
                Accept
              </Button>
            </div>
          )}

          {/* Stage 3.1 — Confirm Receive button (Income Confirm Pending) */}
          {isAccCMG && payment.status === 'Income Confirm Pending' && !payment.receivedDate && (
            <div className="mt-3">
              <Button variant="emerald" size="sm" icon={CheckCircle2} onClick={() => onAction?.('received')}>
                Confirm Receive
              </Button>
            </div>
          )}
        </StepSection>

        {/* Step 4: Withholding Tax Certificate */}
        {isCompleted && (
          <StepSection
            step={4}
            title="ใบถูกหัก ณ ที่จ่าย"
            subtitle="Withholding Tax Certificate"
            status={mappedStatus}
            activeStep={4}
            color="emerald"
          >
            {payment.withholdingTaxDoc ? (
              <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                <Paperclip size={13} className="text-emerald-500 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wide">Withholding Tax Certificate</p>
                  <AttachmentLink value={payment.withholdingTaxDoc} className="flex items-center gap-1 text-xs text-emerald-700 hover:text-emerald-900 font-medium truncate" />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-slate-500">ยังไม่มีใบถูกหัก ณ ที่จ่ายแนบไว้</p>
                {isAccCMG && (
                  <div className="space-y-2">
                    <AttachmentField
                      value={withholdingDoc}
                      onChange={setWithholdingDoc}
                      folder="payments"
                      docId={payment?.projectId}
                      uploadedBy={currentUser?.id}
                      placeholder="Upload withholding tax certificate"
                    />
                    {withholdingDoc && (
                      <Button variant="emerald" size="sm" loading={savingWht} onClick={handleSaveWht}>
                        Save Attachment
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}
          </StepSection>
        )}
      </div>

      <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-slate-100 flex-wrap">
        {isCompleted && (
          <Button variant="emerald" size="sm" icon={Receipt} onClick={() => setShowReceipt(true)}>
            เปิดดูใบเสร็จรับเงิน
          </Button>
        )}
        <Button variant="secondary" onClick={onClose}>Close</Button>
        {actions && actions.map((a, i) => (
          <Button key={i} variant={a.variant} onClick={a.onClick}>
            {a.label}
          </Button>
        ))}
      </div>
    </Modal>

    {/* View Receipt Modal */}
    {showReceipt && (
      <ReceiptPreviewModal
        payment={payment}
        project={project}
        collectionData={{
          receiptNo: payment.receiptNo || payment.paymentNo || '',
          paymentType: payment.paymentType || '',
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
          collectionDate: payment.collectionDate || '',
        }}
        onClose={() => setShowReceipt(false)}
        onConfirm={() => setShowReceipt(false)}
        readOnly={true}
      />
    )}
    </>
  )
}

/* ─── Visual Workflow Stepper ─────────────────────────────────────────────── */
function WorkflowStepper({ payment }) {
  const mappedStatus = normalizePaymentStatus(payment)
  // Income Confirm Pending stays as-is
  
  // Define main steps with sub-steps
  const steps = [
    { 
      key: 'step1', 
      label: 'Payment',
      subSteps: [
        { key: 'sub1', label: 'PM review', statuses: ['Pending PM', 'PM Rejected'] }
      ]
    },
    { 
      key: 'step2', 
      label: 'Invoice',
      subSteps: [
        { key: 'sub2', label: 'PM review', statuses: ['Invoice Pending PM', 'Invoice PM Rejected'] },
        { key: 'sub3', label: 'Client Sign', statuses: ['Client Sign Pending'] }
      ]
    },
    { 
      key: 'step3', 
      label: 'Receive',
      subSteps: [
        { key: 'sub4', label: 'Confirm Receive', statuses: ['Income Confirm Pending'] }
      ]
    },
    { 
      key: 'step4', 
      label: 'Complete',
      subSteps: []
    },
  ]

  // Determine current step and sub-step
  const getCurrentStep = () => {
    if (mappedStatus === 'Completed') return { step: 4, subStep: null }
    if (mappedStatus === 'Income Confirm Pending') return { step: 3, subStep: 1 }
    if (mappedStatus === 'Invoice Submitted') return { step: 3, subStep: 0 }
    if (mappedStatus === 'PM Approved' || mappedStatus === 'Invoice Draft' || 
        mappedStatus === 'Invoice Pending PM' || mappedStatus === 'Invoice PM Rejected' || 
        mappedStatus === 'Client Sign Pending') {
      if (mappedStatus === 'Invoice Pending PM' || mappedStatus === 'Invoice PM Rejected') return { step: 2, subStep: 1 }
      if (mappedStatus === 'Client Sign Pending') return { step: 2, subStep: 2 }
      return { step: 2, subStep: 0 }
    }
    if (mappedStatus === 'Pending PM' || mappedStatus === 'PM Rejected') return { step: 1, subStep: 1 }
    if (mappedStatus === 'Draft') return { step: 1, subStep: 0 }
    return { step: 1, subStep: 0 }
  }

  const { step: currentStep, subStep: currentSubStep } = getCurrentStep()
  const isRejected = mappedStatus === 'PM Rejected' || mappedStatus === 'Invoice PM Rejected'

  return (
    <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 sm:p-5 flex justify-center overflow-x-auto">
      <div className="flex items-center gap-1 sm:gap-2 min-w-max pb-1">
        {steps.map((step, stepIndex) => {
          const stepNum = stepIndex + 1
          const done = currentStep > stepNum
          const active = currentStep === stepNum
          const pending = currentStep < stepNum

          return (
            <div key={step.key} className="flex items-center gap-1 sm:gap-2">
              {/* Main Step Circle */}
              <div className="flex flex-col items-center gap-1.5">
                <div className={clsx(
                  'w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold border-2 transition-all',
                  done && 'bg-emerald-500 border-emerald-500 text-white',
                  active && !isRejected && 'bg-blue-600 border-blue-600 text-white',
                  active && isRejected && 'bg-rose-500 border-rose-500 text-white',
                  pending && 'bg-white border-slate-300 text-slate-400',
                )}>
                  {done ? <CheckCircle2 size={18} /> : stepNum}
                </div>
                <span className={clsx(
                  'text-[10px] sm:text-xs font-semibold whitespace-nowrap',
                  done && 'text-emerald-700',
                  active && !isRejected && 'text-blue-700',
                  active && isRejected && 'text-rose-600',
                  pending && 'text-slate-500',
                )}>
                  {step.label}
                </span>
              </div>

              {/* Sub-steps */}
              {step.subSteps.length > 0 && stepIndex < steps.length - 1 && (
                <>
                  {step.subSteps.map((subStep, subIndex) => {
                    const subNum = subIndex + 1
                    const subDone = done || (active && currentSubStep !== null && currentSubStep > subNum)
                    const subActive = active && currentSubStep === subNum
                    const subPending = pending || (active && currentSubStep !== null && currentSubStep < subNum)

                    return (
                      <div key={subStep.key} className="flex items-center gap-1 sm:gap-2">
                        {/* Connector line before sub-step */}
                        <div className={clsx(
                          'w-4 sm:w-6 h-0.5 mb-5 transition-all',
                          (done || subDone) ? 'bg-emerald-400' : 'bg-slate-200'
                        )} />
                        
                        {/* Sub-step dot */}
                        <div className="flex flex-col items-center gap-1.5">
                          <div className={clsx(
                            'w-3 h-3 sm:w-4 sm:h-4 rounded-full border-2 transition-all',
                            (done || subDone) && 'bg-emerald-400 border-emerald-400',
                            subActive && !isRejected && 'bg-blue-500 border-blue-500',
                            subActive && isRejected && 'bg-rose-400 border-rose-400',
                            subPending && 'bg-white border-slate-200',
                          )} />
                          <span className={clsx(
                            'text-[9px] sm:text-[10px] font-medium whitespace-nowrap',
                            (done || subDone) && 'text-emerald-600',
                            subActive && !isRejected && 'text-blue-600',
                            subActive && isRejected && 'text-rose-500',
                            subPending && 'text-slate-400',
                          )}>
                            {subStep.label}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </>
              )}

              {/* Connector line to next main step */}
              {stepIndex < steps.length - 1 && (
                <div className={clsx(
                  'w-4 sm:w-6 h-0.5 mb-5 transition-all',
                  done ? 'bg-emerald-400' : 'bg-slate-200'
                )} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ─── Step Section wrapper ────────────────────────────────────────────────── */
function StepSection({ step, title, subtitle, children, locked = false, color = 'blue' }) {
  const colorMap = {
    blue:    { border: 'border-blue-200',    bg: 'bg-blue-600',    num: 'bg-blue-600' },
    emerald: { border: 'border-emerald-200', bg: 'bg-emerald-600', num: 'bg-emerald-600' },
  }
  const c = colorMap[color] ?? colorMap.blue

  return (
    <div className={clsx(
      'rounded-xl border overflow-hidden transition-all',
      locked ? 'border-slate-100 opacity-60' : c.border
    )}>
      <div className={clsx(
        'flex items-center gap-3 px-4 py-2.5',
        locked ? 'bg-slate-100' : c.bg
      )}>
        <div className={clsx(
          'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0',
          locked ? 'bg-slate-300 text-slate-500' : 'bg-white/20 text-white'
        )}>
          {step}
        </div>
        <div>
          <p className={clsx('text-sm font-semibold', locked ? 'text-slate-500' : 'text-white')}>{title}</p>
          <p className={clsx('text-[10px]', locked ? 'text-slate-400' : 'text-white/70')}>{subtitle}</p>
        </div>
      </div>
      <div className="p-4 bg-white">
        {children}
      </div>
    </div>
  )
}
