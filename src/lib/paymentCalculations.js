export function getWithTaxAmount(value = 0, withTaxPercent = 0) {
  return Math.round(value * (withTaxPercent / 100) * 100) / 100
}

export function calculatePaymentBalance(value = 0, advanceDeduction = 0, retentionReduce = 0, withTaxPercent = 0) {
  // Use standard accounting rounding (round intermediate tax amounts to 2 decimals)
  const vatAmount = Math.round(value * 0.07 * 100) / 100
  const grossClaim = value + vatAmount
  const withTaxAmount = getWithTaxAmount(value, withTaxPercent)
  const balanceValue = grossClaim - advanceDeduction - retentionReduce - withTaxAmount

  return {
    grossClaim,
    withTaxAmount,
    balanceValue,
  }
}
