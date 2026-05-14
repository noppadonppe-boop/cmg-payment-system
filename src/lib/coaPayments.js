function sumItems(items = []) {
  return items.reduce((sum, item) => sum + (item?.value || 0), 0)
}

function matchesCoaReference(value, coa) {
  return !!value && !!coa && (value === coa.id || value === coa.coaNo)
}

export function isPaymentLinkedToCOA(payment, coa) {
  if (!payment || !coa) return false

  if (matchesCoaReference(payment.coaId, coa) || matchesCoaReference(payment.coaNo, coa)) {
    return true
  }

  return Array.isArray(payment.coaItems) && payment.coaItems.some(item =>
    matchesCoaReference(item?.coaId, coa) || matchesCoaReference(item?.coaNo, coa)
  )
}

export function getPaymentCOAAmounts(payment, coa) {
  if (!isPaymentLinkedToCOA(payment, coa)) {
    return {
      claimValue: 0,
      balanceValue: 0,
      deductionsValue: 0,
      isDedicatedCOAPayment: false,
    }
  }

  const matchingCoaItems = Array.isArray(payment.coaItems)
    ? payment.coaItems.filter(item =>
        matchesCoaReference(item?.coaId, coa) || matchesCoaReference(item?.coaNo, coa)
      )
    : []

  const itemizedClaimValue = matchingCoaItems.reduce((sum, item) => sum + sumItems(item?.items), 0)
  const isDedicatedCOAPayment =
    payment.type === 'coa' &&
    (matchesCoaReference(payment.coaId, coa) || matchesCoaReference(payment.coaNo, coa))

  const claimValue = itemizedClaimValue || (isDedicatedCOAPayment ? (payment.value || payment.balanceValue || 0) : 0)
  const deductionsValue = isDedicatedCOAPayment
    ? (payment.advanceDeduction || 0) + (payment.retentionReduce || 0) + (payment.withTaxValue || 0)
    : 0
  const balanceValue = isDedicatedCOAPayment ? (payment.balanceValue || claimValue) : claimValue

  return {
    claimValue,
    balanceValue,
    deductionsValue,
    isDedicatedCOAPayment,
  }
}

export function getPaymentsForCOA(payments, coa) {
  return payments.filter(payment => isPaymentLinkedToCOA(payment, coa))
}

