import { AlertCircle, Banknote, CheckCircle2, Clock, FileText, Send } from 'lucide-react'

export const PAYMENT_STATUS = {
  Draft: { step: 1, label: 'Draft', badge: 'slate', icon: FileText },
  'Pending PM': { step: 1, label: 'Pending PM', badge: 'amber', icon: Clock },
  'PM Rejected': { step: 1, label: 'PM Rejected', badge: 'rose', icon: AlertCircle },
  'PM Approved': { step: 2, label: 'PM Approved', badge: 'blue', icon: CheckCircle2 },
  'Invoice Draft': { step: 2, label: 'Invoice Draft', badge: 'slate', icon: FileText },
  'Invoice Pending PM': { step: 2, label: 'Invoice Pending PM', badge: 'amber', icon: Clock },
  'Invoice PM Rejected': { step: 2, label: 'Invoice PM Rejected', badge: 'rose', icon: AlertCircle },
  'Client Sign Pending': { step: 2, label: 'Client Sign Pending', badge: 'blue', icon: Send },
  'Invoice Submitted': { step: 3, label: 'Invoice Submitted', badge: 'blue', icon: Send },
  'Income Confirm Pending': { step: 3, label: 'Income Confirm Pending', badge: 'amber', icon: Clock },
  Completed: { step: 4, label: 'Completed', badge: 'emerald', icon: Banknote },
}

export function normalizePaymentStatus(paymentOrStatus) {
  const payment = typeof paymentOrStatus === 'object' && paymentOrStatus !== null
    ? paymentOrStatus
    : { status: paymentOrStatus }
  const status = payment.status

  if (status === 'In Progress') return 'Pending PM'
  if (status === 'Rejected') return 'PM Rejected'
  if (status === 'Received') return 'Completed'
  if (status === 'Invoice PM Approved') return 'Invoice Submitted'
  if (status === 'Submitted') return payment.invoiceNo ? 'Invoice Submitted' : 'PM Approved'
  return status
}

export const isCompletedPayment = payment => normalizePaymentStatus(payment) === 'Completed'
export const isInvoiceSubmitted = payment => normalizePaymentStatus(payment) === 'Invoice Submitted'
