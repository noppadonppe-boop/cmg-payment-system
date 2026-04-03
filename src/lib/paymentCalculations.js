export function getWithTaxAmount(value = 0, withTaxPercent = 0) {
  return value * (withTaxPercent / 100)
}

export function calculatePaymentBalance(value = 0, advanceDeduction = 0, retentionReduce = 0, withTaxPercent = 0) {
  const grossClaim = value * 1.07
  const withTaxAmount = getWithTaxAmount(value, withTaxPercent)
  const balanceValue = grossClaim - advanceDeduction - retentionReduce - withTaxAmount

  return {
    grossClaim,
    withTaxAmount,
    balanceValue,
  }
}
