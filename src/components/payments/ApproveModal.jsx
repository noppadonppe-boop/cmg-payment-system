import { useState } from 'react'
import { CheckCircle2, XCircle, FileText, Calculator, User, Calendar } from 'lucide-react'
import { useData } from '../../context/DataContext'
import { useAuth } from '../../context/AuthContext'
import { FormField, Textarea } from '../ui/FormField'
import { AttachmentLink } from '../ui/AttachmentField'
import Button from '../ui/Button'
import Badge from '../ui/Badge'
import { Modal } from './PaymentCreateModal'
import { clsx } from 'clsx'

function fmtCurrency(val) {
  if (!val && val !== 0) return '—'
  return `฿${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val)}`
}

function ReadOnlyField({ label, value, className = '' }) {
  return (
    <div className={className}>
      <label className="block text-xs font-semibold text-slate-600 mb-1.5">{label}</label>
      <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700">
        {value || '—'}
      </div>
    </div>
  )
}

export default function ApproveModal({ payment, onClose }) {
  const { updatePayment } = useData()
  const { currentUser, USERS } = useAuth()

  const [action, setAction] = useState(null) // 'approve' | 'reject'
  const [rejectNote, setRejectNote] = useState('')
  const [saving, setSaving] = useState(false)

  const creator = USERS.find(u => u.id === payment.createdBy)
  const { projects, getProjectCOAs } = useData()
  const currentProject = projects.find(p => p.id === payment.projectId)
  const projectCOAs = payment.projectId ? getProjectCOAs(payment.projectId) : []
  
  // Map old status to new for backward compatibility
  let status = payment.status
  if (status === 'In Progress') status = 'Pending PM'
  if (status === 'Submitted') status = 'Invoice Pending PM'
  
  // Determine which stage we're in
  const isStage1 = status === 'Pending PM' // PM reviewing initial payment claim
  const isStage2 = status === 'Invoice Pending PM' // PM reviewing invoice

  const handleApprove = async () => {
    setSaving(true)
    await new Promise(r => setTimeout(r, 350))
    
    if (isStage1) {
      // Stage 1.1: Approve payment claim -> PM Approved
      updatePayment(payment.id, {
        status: 'PM Approved',
        approvedBy: currentUser.id,
        approvedAt: new Date().toISOString().split('T')[0],
        rejectionNote: null,
        rejectedBy: null,
        rejectedAt: null,
      })
    } else if (isStage2) {
      // Stage 2.1: Approve invoice -> Client Sign Pending
      updatePayment(payment.id, {
        status: 'Client Sign Pending',
        invoiceApprovedBy: currentUser.id,
        invoiceApprovedAt: new Date().toISOString().split('T')[0],
        invoiceRejectionNote: null,
        invoiceRejectedBy: null,
        invoiceRejectedAt: null,
      })
    }
    
    setSaving(false)
    onClose()
  }

  const handleReject = async () => {
    setSaving(true)
    await new Promise(r => setTimeout(r, 350))
    
    if (isStage1) {
      // Stage 1.1: Reject payment claim -> PM Rejected (back to Draft)
      updatePayment(payment.id, {
        status: 'PM Rejected',
        rejectedBy: currentUser.id,
        rejectedAt: new Date().toISOString().split('T')[0],
        rejectionNote: rejectNote,
      })
    } else if (isStage2) {
      // Stage 2.1: Reject invoice -> Invoice PM Rejected (back to Invoice Draft)
      updatePayment(payment.id, {
        status: 'Invoice PM Rejected',
        invoiceRejectedBy: currentUser.id,
        invoiceRejectedAt: new Date().toISOString().split('T')[0],
        invoiceRejectionNote: rejectNote,
      })
    }
    
    setSaving(false)
    onClose()
  }

  return (
    <Modal
      title={isStage2 ? "Review Invoice" : "Review Payment Claim"}
      subtitle={isStage2 ? "Stage 2.1 — PM Invoice Review" : "Stage 1.1 — PM Payment Approval"}
      onClose={onClose}
      maxWidth="max-w-4xl"
    >
      <div className="space-y-4">
        {/* Basic Info - Read Only */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ReadOnlyField label="Project" value={currentProject?.name} className="sm:col-span-2" />
          <ReadOnlyField label="Payment No." value={payment.paymentNo} />
          <ReadOnlyField 
            label="Attachment" 
            value={payment.attachment ? <AttachmentLink value={payment.attachment} /> : '—'} 
          />
          <ReadOnlyField label="Description" value={payment.detail} className="sm:col-span-2" />
        </div>

        {/* Claim Type Display - Read Only */}
        {isStage1 && (
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-700">
              <span className="text-sm font-semibold text-white">Claim Details</span>
            </div>
            <div className="p-4 space-y-4">
              {/* Main Contract Items */}
              {payment.claimMainContract && payment.mainContractItems && payment.mainContractItems.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Main Contract Items</h4>
                  {currentProject && (
                    <div className="text-xs text-slate-600 bg-blue-50 px-3 py-2 rounded-lg border border-blue-200">
                      <span className="font-semibold">Main Contract Value: </span>
                      <span className="text-blue-700 font-bold">
                        {fmtCurrency(currentProject.originalContractValue || currentProject.contractValue || 0)}
                      </span>
                    </div>
                  )}
                  <div className="rounded-lg border border-slate-200 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 w-16">No.</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">Description</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600 w-32">Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {payment.mainContractItems.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="px-3 py-2 text-slate-600 font-medium">{item.no}</td>
                            <td className="px-3 py-2 text-slate-700">{item.description}</td>
                            <td className="px-3 py-2 text-right font-semibold text-slate-800">{fmtCurrency(item.value)}</td>
                          </tr>
                        ))}
                        <tr className="bg-slate-50 font-semibold">
                          <td colSpan="2" className="px-3 py-2 text-right text-slate-700">Total:</td>
                          <td className="px-3 py-2 text-right text-blue-700">
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
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wide">COA Items</h4>
                  {payment.coaItems.map((coaItem, coaIdx) => {
                    const coa = projectCOAs.find(c => c.id === coaItem.coaId)
                    return (
                      <div key={coaIdx} className="border border-purple-200 rounded-lg overflow-hidden">
                        <div className="bg-purple-600 px-3 py-2">
                          <h5 className="text-sm font-semibold text-white">{coaItem.coaNo}</h5>
                        </div>
                        <div className="p-3 space-y-2">
                          {coa && (
                            <div className="text-xs text-slate-600 bg-purple-50 px-3 py-2 rounded-lg border border-purple-200">
                              <span className="font-semibold">COA Value: </span>
                              <span className="text-purple-700 font-bold">{fmtCurrency(coa.value || 0)}</span>
                            </div>
                          )}
                          <div className="rounded-lg border border-slate-200 overflow-hidden">
                            <table className="w-full text-sm">
                              <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                  <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 w-16">No.</th>
                                  <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">Description</th>
                                  <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600 w-32">Value</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {coaItem.items.map((item, idx) => (
                                  <tr key={idx} className="hover:bg-slate-50">
                                    <td className="px-3 py-2 text-slate-600 font-medium">{item.no}</td>
                                    <td className="px-3 py-2 text-slate-700">{item.description}</td>
                                    <td className="px-3 py-2 text-right font-semibold text-slate-800">{fmtCurrency(item.value)}</td>
                                  </tr>
                                ))}
                                <tr className="bg-purple-50 font-semibold">
                                  <td colSpan="2" className="px-3 py-2 text-right text-slate-700">Total:</td>
                                  <td className="px-3 py-2 text-right text-purple-700">
                                    {fmtCurrency(coaItem.items.reduce((sum, item) => sum + (item.value || 0), 0))}
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Other Claim */}
              {payment.otherClaim && payment.otherClaim > 0 && (
                <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <span className="text-sm font-semibold text-slate-700">Other Claim</span>
                  <span className="text-sm font-bold text-amber-700">{fmtCurrency(payment.otherClaim)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Deductions - Read Only */}
        {isStage1 && (
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-600">
              <span className="text-sm font-semibold text-white">Deductions</span>
            </div>
            <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Advance Deduction */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Advance Deduction</label>
                {payment.advanceDeduction > 0 ? (
                  <div className="space-y-2">
                    <div className="px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
                      <div className="text-xs text-slate-600">
                        <span className="font-semibold">Type: </span>
                        <span>{payment.advanceDeductionType === 'percentage' ? 'Percentage' : 'Amount'}</span>
                      </div>
                      <div className="text-xs text-slate-600 mt-1">
                        <span className="font-semibold">Value: </span>
                        <span>{payment.advanceDeductionType === 'percentage' ? `${payment.advanceDeductionValue}%` : fmtCurrency(payment.advanceDeductionValue)}</span>
                      </div>
                      <div className="text-sm font-bold text-amber-700 mt-2">
                        Deduction: {fmtCurrency(payment.advanceDeduction)}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-400 italic">
                    Not applied
                  </div>
                )}
              </div>

              {/* Retention Reduce */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Retention Reduce</label>
                {payment.retentionReduce > 0 ? (
                  <div className="space-y-2">
                    <div className="px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                      <div className="text-xs text-slate-600">
                        <span className="font-semibold">Type: </span>
                        <span>{payment.retentionReduceType === 'percentage' ? 'Percentage' : 'Amount'}</span>
                      </div>
                      <div className="text-xs text-slate-600 mt-1">
                        <span className="font-semibold">Value: </span>
                        <span>{payment.retentionReduceType === 'percentage' ? `${payment.retentionReduceValue}%` : fmtCurrency(payment.retentionReduceValue)}</span>
                      </div>
                      <div className="text-sm font-bold text-emerald-700 mt-2">
                        Deduction: {fmtCurrency(payment.retentionReduce)}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-400 italic">
                    Not applied
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Financial Calculation - Read Only */}
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-700">
            <Calculator size={14} className="text-slate-300" />
            <span className="text-sm font-semibold text-white">Financial Summary</span>
          </div>
          <div className="p-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                <span className="text-slate-500">Claim Value</span>
                <span className="font-semibold text-slate-800">{fmtCurrency(payment.value)}</span>
              </div>
              {payment.advanceDeduction > 0 && (
                <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                  <span className="text-slate-500">Advance Deduction</span>
                  <span className="font-medium text-rose-500">− {fmtCurrency(payment.advanceDeduction)}</span>
                </div>
              )}
              {payment.retentionReduce > 0 && (
                <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                  <span className="text-slate-500">Retention Reduce</span>
                  <span className="font-medium text-rose-500">− {fmtCurrency(payment.retentionReduce)}</span>
                </div>
              )}
              {payment.withTaxPercent > 0 && (
                <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                  <span className="text-slate-500">With Tax ({payment.withTaxPercent}%)</span>
                  <span className="font-medium text-rose-500">− {fmtCurrency(payment.withTaxValue || 0)}</span>
                </div>
              )}
              <div className="flex justify-between items-center py-2 bg-emerald-50 px-3 rounded-lg mt-1">
                <span className="font-semibold text-slate-700">Balance Payable</span>
                <span className="text-lg font-bold text-emerald-700">{fmtCurrency(payment.balanceValue)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Note */}
        {payment.note && (
          <ReadOnlyField label="Note" value={payment.note} />
        )}

        {/* Invoice Info - if Stage 2 */}
        {isStage2 && payment.invoiceNo && (
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <h4 className="text-sm font-semibold text-blue-800 mb-3">Invoice Information</h4>
            <div className="grid grid-cols-2 gap-3">
              <ReadOnlyField label="Invoice No." value={payment.invoiceNo} />
              <ReadOnlyField label="Due Date" value={payment.invoiceDueDate} />
              {payment.invoiceNote && (
                <ReadOnlyField label="Invoice Note" value={payment.invoiceNote} className="col-span-2" />
              )}
            </div>
          </div>
        )}

        {/* Decision buttons */}
        {!action && (
          <div className="flex gap-3">
            <button
              onClick={() => setAction('reject')}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-rose-200 bg-rose-50 text-rose-700 font-semibold text-sm hover:bg-rose-100 hover:border-rose-300 transition-all"
            >
              <XCircle size={18} /> Reject
            </button>
            <button
              onClick={() => setAction('approve')}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-emerald-200 bg-emerald-50 text-emerald-700 font-semibold text-sm hover:bg-emerald-100 hover:border-emerald-300 transition-all"
            >
              <CheckCircle2 size={18} /> Approve
            </button>
          </div>
        )}

        {/* Approve confirm */}
        {action === 'approve' && (
          <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50 p-4 space-y-3">
            <div className="flex items-center gap-2 text-emerald-700">
              <CheckCircle2 size={18} />
              <span className="font-semibold text-sm">Confirm Approval</span>
            </div>
            <p className="text-sm text-slate-600">
              {isStage2 
                ? 'Approving this invoice will advance it to Stage 2.2: Client Sign. QsENG will be notified to get client signature and upload the signed document.'
                : 'Approving this claim will advance it to Stage 2: Invoice Creation. QsENG will be notified to create and submit the invoice.'
              }
            </p>
            <div className="flex gap-2 pt-1">
              <Button variant="secondary" size="sm" onClick={() => setAction(null)}>Back</Button>
              <Button variant="emerald" size="sm" icon={CheckCircle2} loading={saving} onClick={handleApprove}>
                Confirm Approve
              </Button>
            </div>
          </div>
        )}

        {/* Reject form */}
        {action === 'reject' && (
          <div className="rounded-xl border-2 border-rose-200 bg-rose-50 p-4 space-y-3">
            <div className="flex items-center gap-2 text-rose-700">
              <XCircle size={18} />
              <span className="font-semibold text-sm">Confirm Rejection</span>
            </div>
            <p className="text-sm text-slate-600">
              {isStage2
                ? 'Provide a reason so QsENG can revise and resubmit the invoice. The invoice will return to Draft status.'
                : 'Provide a reason so QsENG can revise and resubmit the claim. The payment will return to Draft status.'
              }
            </p>
            <FormField label="Rejection Reason">
              <Textarea
                rows={3}
                placeholder="Explain what needs to be corrected..."
                value={rejectNote}
                onChange={e => setRejectNote(e.target.value)}
              />
            </FormField>
            <div className="flex gap-2 pt-1">
              <Button variant="secondary" size="sm" onClick={() => setAction(null)}>Back</Button>
              <Button variant="danger" size="sm" icon={XCircle} loading={saving} onClick={handleReject}>
                Confirm Reject
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
