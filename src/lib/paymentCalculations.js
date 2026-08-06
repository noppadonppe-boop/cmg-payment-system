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

function sumItems(items = []) {
  return items.reduce((sum, item) => sum + Number(item?.value || 0), 0)
}

export function getSelectedClaimTotals(payment = {}) {
  const mainContractValue = payment.claimMainContract ? sumItems(payment.mainContractItems) : 0
  const coaValue = payment.claimCOA
    ? (payment.coaItems || []).reduce((sum, coa) => sum + sumItems(coa?.items), 0)
    : 0

  return {
    mainContractValue,
    coaValue,
    itemsValue: mainContractValue + coaValue,
  }
}

export function calculateClaimFinancials({
  claimSubtotal = 0,
  otherClaim = 0,
  advanceDeduction = 0,
  retentionReduce = 0,
  retentionReduceTiming = 'after',
  withTaxPercent = 0,
} = {}) {
  const rawClaimValue = Number(claimSubtotal || 0) + Number(otherClaim || 0)
  const advance = Number(advanceDeduction || 0)
  const retention = Number(retentionReduce || 0)
  const retentionBeforeVat = retentionReduceTiming === 'before'
  const value = rawClaimValue - advance - (retentionBeforeVat ? retention : 0)
  const vatAmount = Math.round(value * 0.07 * 100) / 100
  const grossClaimValue = value + vatAmount
  const withTaxValue = getWithTaxAmount(value, Number(withTaxPercent || 0))
  const balanceValue = grossClaimValue - (retentionBeforeVat ? 0 : retention) - withTaxValue

  return {
    rawClaimValue,
    value,
    vatAmount,
    grossClaimValue,
    withTaxValue,
    balanceValue,
  }
}

export function getPaymentFinancials(payment = {}) {
  const hasModernClaimData = payment.claimMainContract !== undefined || payment.claimCOA !== undefined

  if (hasModernClaimData) {
    const totals = getSelectedClaimTotals(payment)
    const calculated = calculateClaimFinancials({
      claimSubtotal: totals.itemsValue,
      otherClaim: payment.otherClaim,
      advanceDeduction: payment.advanceDeduction,
      retentionReduce: payment.retentionReduce,
      retentionReduceTiming: payment.retentionReduceTiming || 'after',
      withTaxPercent: payment.withTaxPercent,
    })
    return { ...totals, ...calculated }
  }

  const value = Number(payment.value || 0)
  const vatAmount = payment.vatValue ?? Math.round(value * 0.07 * 100) / 100
  const grossClaimValue = payment.grossClaimValue ?? value + vatAmount
  const withTaxValue = Number(payment.withTaxValue || 0)
  const balanceValue = payment.balanceValue ?? (
    grossClaimValue - Number(payment.advanceDeduction || 0) - Number(payment.retentionReduce || 0) - withTaxValue
  )

  return {
    mainContractValue: 0,
    coaValue: 0,
    itemsValue: value,
    rawClaimValue: value,
    value,
    vatAmount,
    grossClaimValue,
    withTaxValue,
    balanceValue,
  }
}

export function getPaymentSourceAmounts(payment = {}, source = 'main') {
  const financials = getPaymentFinancials(payment)
  const hasModernClaimData = payment.claimMainContract !== undefined || payment.claimCOA !== undefined

  if (!hasModernClaimData) {
    const matchesLegacyType = payment.type === source
    return {
      claimValue: matchesLegacyType ? financials.rawClaimValue : 0,
      balanceValue: matchesLegacyType ? financials.balanceValue : 0,
    }
  }

  const sourceItemsValue = source === 'coa' ? financials.coaValue : financials.mainContractValue
  const sourceClaimValue = sourceItemsValue + (payment.type === source ? Number(payment.otherClaim || 0) : 0)
  const allocationBase = financials.rawClaimValue
  const ratio = allocationBase > 0 ? sourceClaimValue / allocationBase : 0
  return {
    claimValue: sourceClaimValue,
    balanceValue: financials.balanceValue * ratio,
  }
}
