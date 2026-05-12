import { useState } from 'react'
import { X, Save, Calculator, Plus, Trash2 } from 'lucide-react'
import { useData } from '../../context/DataContext'
import { useAuth } from '../../context/AuthContext'
import { FormField, Input, Textarea, Select } from '../ui/FormField'
import { AttachmentField } from '../ui/AttachmentField'
import { calculatePaymentBalance } from '../../lib/paymentCalculations'
import Button from '../ui/Button'
import { clsx } from 'clsx'

function parseCurrency(val) {
  return parseFloat(String(val || '').replace(/,/g, '')) || 0
}

function sanitizeCurrencyInput(val) {
  const cleaned = String(val ?? '').replace(/,/g, '').replace(/[^\d.]/g, '')
  if (!cleaned) return ''

  const [whole = '', ...decimalParts] = cleaned.split('.')
  const decimal = decimalParts.join('').slice(0, 2)
  const normalizedWhole = whole.replace(/^0+(?=\d)/, '') || '0'

  if (cleaned.startsWith('.')) return `0.${decimal}`
  if (cleaned.includes('.')) return `${normalizedWhole}.${decimal}`
  return normalizedWhole
}

function fmtInput(val) {
  const raw = sanitizeCurrencyInput(val)
  if (!raw) return ''

  const hasDecimal = raw.includes('.')
  const [whole, decimal = ''] = raw.split('.')
  const formattedWhole = Number(whole || 0).toLocaleString('en-US')

  return hasDecimal ? `${formattedWhole}.${decimal}` : formattedWhole
}

export default function DraftEditModal({ payment, onClose, onSaved }) {
  const { updatePayment, getProjectCOAs, projects } = useData()
  const { currentUser } = useAuth()

  const [form, setForm] = useState({
    projectId: payment?.projectId ?? '',
    paymentNo: payment?.paymentNo ?? '',
    detail: payment?.detail ?? '',
    value: payment?.value ?? '',
    withTaxPercent: payment?.withTaxPercent ?? '',
    attachment: payment?.attachment ?? '',
    note: payment?.note ?? '',
    otherClaim: payment?.otherClaim ?? '', // Other Claim amount
  })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  // Advance deduction settings - Load from payment
  const [useAdvanceDeduction, setUseAdvanceDeduction] = useState(!!payment?.advanceDeduction)
  const [advanceDeductionType, setAdvanceDeductionType] = useState(payment?.advanceDeductionType || 'percentage')
  const [advanceDeductionValue, setAdvanceDeductionValue] = useState(payment?.advanceDeductionValue ? String(payment.advanceDeductionValue) : '')
  const [advanceDeductionSources, setAdvanceDeductionSources] = useState(
    payment?.advanceDeductionSources || { mainContract: false, coa: false }
  )

  // Retention reduce settings - Load from payment
  const [useRetentionReduce, setUseRetentionReduce] = useState(!!payment?.retentionReduce)
  const [retentionReduceType, setRetentionReduceType] = useState(payment?.retentionReduceType || 'percentage')
  const [retentionReduceValue, setRetentionReduceValue] = useState(payment?.retentionReduceValue ? String(payment.retentionReduceValue) : '')

  // Claim type state - Load from payment
  const [claimMainContract, setClaimMainContract] = useState(payment?.claimMainContract || false)
  const [claimCOA, setClaimCOA] = useState(payment?.claimCOA || false)

  // Main contract items state - Load from payment
  const [mainContractItems, setMainContractItems] = useState(
    payment?.mainContractItems && payment.mainContractItems.length > 0
      ? payment.mainContractItems.map((item, idx) => ({
        id: Date.now() + idx,
        no: item.no,
        description: item.description,
        value: String(item.value)
      }))
      : [{ id: Date.now(), no: '1', description: '', value: '' }]
  )

  // COA items state - Load from payment
  const [coaItems, setCoaItems] = useState(
    payment?.coaItems && payment.coaItems.length > 0
      ? payment.coaItems.map((coaItem, idx) => ({
        coaId: coaItem.coaId,
        items: coaItem.items.map((item, itemIdx) => ({
          id: Date.now() + idx * 1000 + itemIdx,
          no: item.no,
          description: item.description,
          value: String(item.value)
        }))
      }))
      : []
  )

  const set = (k, v) => {
    setForm(p => ({ ...p, [k]: v }))
    if (errors[k]) setErrors(p => { const e = { ...p }; delete e[k]; return e })
  }

  // Get current project and its COAs
  const currentProject = projects.find(p => p.id === form.projectId)
  const projectCOAs = form.projectId ? getProjectCOAs(form.projectId) : []

  // Calculate max allowed value based on claim type
  const getMaxAllowedValue = () => {
    let maxValue = 0

    if (claimMainContract && currentProject) {
      maxValue += currentProject.originalContractValue || currentProject.contractValue || 0
    }

    if (claimCOA && coaItems.length > 0) {
      coaItems.forEach(coaItem => {
        const coa = projectCOAs.find(c => c.id === coaItem.coaId)
        if (coa) {
          maxValue += coa.value || 0
        }
      })
    }

    return maxValue || Infinity
  }

  // Add main contract item
  const addMainContractItem = () => {
    const newNo = mainContractItems.length + 1
    setMainContractItems([...mainContractItems, {
      id: Date.now(),
      no: String(newNo),
      description: '',
      value: ''
    }])
  }

  // Remove main contract item
  const removeMainContractItem = (id) => {
    if (mainContractItems.length === 1) return // Keep at least one row
    const filtered = mainContractItems.filter(item => item.id !== id)
    // Renumber items
    const renumbered = filtered.map((item, idx) => ({ ...item, no: String(idx + 1) }))
    setMainContractItems(renumbered)
  }

  // Update main contract item
  const updateMainContractItem = (id, field, value) => {
    setMainContractItems(items =>
      items.map(item => item.id === id ? { ...item, [field]: value } : item)
    )
  }

  // Calculate total from main contract items
  const calculateMainContractTotal = () => {
    return mainContractItems.reduce((sum, item) => {
      return sum + parseCurrency(item.value)
    }, 0)
  }

  // Calculate total from all COA items
  const calculateAllCOATotal = () => {
    return coaItems.reduce((sum, coaItem) => {
      return sum + calculateCOATotal(coaItem.coaId)
    }, 0)
  }

  // Calculate grand total from all sources
  const calculateGrandTotal = () => {
    let total = 0

    if (claimMainContract) {
      total += calculateMainContractTotal()
    }

    if (claimCOA) {
      total += calculateAllCOATotal()
    }

    // Add Other Claim
    total += parseCurrency(form.otherClaim)

    return total
  }

  // Calculate base value for advance deduction
  const getAdvanceDeductionBase = () => {
    let base = 0
    if (advanceDeductionSources.mainContract && claimMainContract) {
      base += calculateMainContractTotal()
    }
    if (advanceDeductionSources.coa && claimCOA) {
      base += calculateAllCOATotal()
    }
    return base
  }

  // Calculate base value for retention reduce
  const getRetentionReduceBase = () => {
    // Retention Reduce คำนวณจาก Total Claim Value (หลังหัก Advance)
    return grandTotal - calculateAdvanceDeduction()
  }

  // Calculate advance deduction amount
  const calculateAdvanceDeduction = () => {
    if (!useAdvanceDeduction || !advanceDeductionValue) return 0

    const base = getAdvanceDeductionBase()
    const value = parseCurrency(advanceDeductionValue)

    if (advanceDeductionType === 'percentage') {
      return (base * value) / 100
    }
    return value
  }

  // Calculate retention reduce amount
  const calculateRetentionReduce = () => {
    if (!useRetentionReduce || !retentionReduceValue) return 0

    // คำนวณจาก Total Claim Value (หลังหัก Advance)
    const base = getRetentionReduceBase()
    const value = parseCurrency(retentionReduceValue)

    if (retentionReduceType === 'percentage') {
      return (base * value) / 100
    }
    return value
  }

  // Add COA selection
  const addCOASelection = (coaId) => {
    if (!coaId || coaItems.some(item => item.coaId === coaId)) return

    setCoaItems([...coaItems, {
      coaId,
      items: [{ id: Date.now(), no: '1', description: '', value: '' }]
    }])
  }

  // Remove COA selection
  const removeCOASelection = (coaId) => {
    setCoaItems(coaItems.filter(item => item.coaId !== coaId))
  }

  // Add item to specific COA
  const addCOAItem = (coaId) => {
    setCoaItems(coaItems.map(coaItem => {
      if (coaItem.coaId === coaId) {
        const newNo = coaItem.items.length + 1
        return {
          ...coaItem,
          items: [...coaItem.items, {
            id: Date.now(),
            no: String(newNo),
            description: '',
            value: ''
          }]
        }
      }
      return coaItem
    }))
  }

  // Remove item from specific COA
  const removeCOAItem = (coaId, itemId) => {
    setCoaItems(coaItems.map(coaItem => {
      if (coaItem.coaId === coaId) {
        if (coaItem.items.length === 1) return coaItem // Keep at least one row
        const filtered = coaItem.items.filter(item => item.id !== itemId)
        // Renumber items
        const renumbered = filtered.map((item, idx) => ({ ...item, no: String(idx + 1) }))
        return { ...coaItem, items: renumbered }
      }
      return coaItem
    }))
  }

  // Update COA item
  const updateCOAItem = (coaId, itemId, field, value) => {
    setCoaItems(coaItems.map(coaItem => {
      if (coaItem.coaId === coaId) {
        return {
          ...coaItem,
          items: coaItem.items.map(item =>
            item.id === itemId ? { ...item, [field]: value } : item
          )
        }
      }
      return coaItem
    }))
  }

  // Calculate total for specific COA
  const calculateCOATotal = (coaId) => {
    const coaItem = coaItems.find(item => item.coaId === coaId)
    if (!coaItem) return 0

    return coaItem.items.reduce((sum, item) => {
      return sum + parseCurrency(item.value)
    }, 0)
  }

  // Auto-generate payment number based on project - Disabled for edit mode
  const autoGenNo = () => {
    // Disabled in edit mode
    return
  }

  // Use grand total for calculations
  const grandTotal = calculateGrandTotal()
  const adv = calculateAdvanceDeduction()
  const totalClaimValue = grandTotal - adv // Total Claim Value หลังหัก Advance

  const ret = calculateRetentionReduce()
  const withTaxPercent = parseCurrency(form.withTaxPercent)

  // Calculate balance: (Total Claim Value × 1.07) - Retention - With Tax
  // Note: ส่ง totalClaimValue ไปให้ calculatePaymentBalance แทน grandTotal
  // และส่ง advanceDeduction = 0 เพราะหักไปแล้ว
  const { grossClaim, withTaxAmount, balanceValue: balance } = calculatePaymentBalance(totalClaimValue, 0, ret, withTaxPercent)

  const validate = () => {
    const errs = {}
    if (!form.projectId) errs.projectId = 'Select a project'
    if (!form.paymentNo.trim()) errs.paymentNo = 'Payment number is required'
    if (!form.detail.trim()) errs.detail = 'Description is required'

    // Validate claim type selection
    if (!claimMainContract && !claimCOA) {
      errs.claimType = 'Please select at least one claim type (Main Contract or COA)'
    }

    // Validate main contract items
    if (claimMainContract) {
      const hasEmptyItems = mainContractItems.some(item => !item.description.trim() || !item.value || parseCurrency(item.value) <= 0)
      if (hasEmptyItems) {
        errs.mainContractItems = 'All main contract items must have description and value'
      }

      const total = calculateMainContractTotal()
      const maxValue = currentProject?.originalContractValue || currentProject?.contractValue || 0
      if (total > maxValue) {
        errs.mainContractValue = `Total claim value (฿${total.toLocaleString()}) exceeds Main Contract Value (฿${maxValue.toLocaleString()})`
      }
    }

    // Validate COA selections and items
    if (claimCOA) {
      if (coaItems.length === 0) {
        errs.selectedCOA = 'Please select at least one COA'
      } else {
        // Validate each COA's items
        coaItems.forEach(coaItem => {
          const coa = projectCOAs.find(c => c.id === coaItem.coaId)
          const hasEmptyItems = coaItem.items.some(item => !item.description.trim() || !item.value || parseCurrency(item.value) <= 0)

          if (hasEmptyItems) {
            errs[`coaItems_${coaItem.coaId}`] = `All items in ${coa?.coaNo || 'COA'} must have description and value`
          }

          const total = calculateCOATotal(coaItem.coaId)
          const maxValue = coa?.value || 0
          if (total > maxValue) {
            errs[`coaValue_${coaItem.coaId}`] = `Total claim value (฿${total.toLocaleString()}) exceeds ${coa?.coaNo} Value (฿${maxValue.toLocaleString()})`
          }
        })
      }
    }

    // Update form value with grand total
    const grandTotal = calculateGrandTotal()
    if (grandTotal <= 0) {
      errs.value = 'Total claim value must be greater than 0'
    }

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async () => {
    if (!validate() || !payment?.id) return
    setSaving(true)

    try {
      await new Promise(r => setTimeout(r, 350))

      // Calculate grand total
      const grandTotal = calculateGrandTotal()

      // Calculate deductions
      const finalAdvanceDeduction = calculateAdvanceDeduction()
      const totalClaimValue = grandTotal - finalAdvanceDeduction // Total Claim Value หลังหัก Advance

      const finalRetentionReduce = calculateRetentionReduce()

      // Recalculate financial values based on Total Claim Value
      const finalValue = totalClaimValue
      const finalAdv = finalAdvanceDeduction
      const finalRet = finalRetentionReduce
      const finalWithTaxPercent = parseCurrency(form.withTaxPercent)

      // Calculate balance: (Total Claim Value × 1.07) - Retention - With Tax
      const { grossClaim: finalGrossClaim, withTaxAmount: finalWithTaxAmount, balanceValue: finalBalance } =
        calculatePaymentBalance(finalValue, 0, finalRet, finalWithTaxPercent)

      const today = new Date().toISOString().split('T')[0]

      // Prepare payment data
      const paymentData = {
        projectId: form.projectId,
        type: claimMainContract ? 'main' : 'coa',
        paymentNo: form.paymentNo,
        detail: form.detail,
        value: finalValue,
        otherClaim: parseCurrency(form.otherClaim),
        advanceDeduction: finalAdv,
        advanceDeductionType: useAdvanceDeduction ? advanceDeductionType : null,
        advanceDeductionValue: useAdvanceDeduction ? parseCurrency(advanceDeductionValue) : null,
        advanceDeductionSources: useAdvanceDeduction ? advanceDeductionSources : null,
        retentionReduce: finalRet,
        retentionReduceType: useRetentionReduce ? retentionReduceType : null,
        retentionReduceValue: useRetentionReduce ? parseCurrency(retentionReduceValue) : null,
        withTaxPercent: finalWithTaxPercent,
        withTaxValue: finalWithTaxAmount,
        grossClaimValue: finalGrossClaim,
        balanceValue: finalBalance,
        attachment: form.attachment,
        note: form.note,
        status: 'Pending PM', // Changed from 'In Progress' to 'Pending PM' when submitted
        createdAt: today, // Update submission date
        claimMainContract: claimMainContract,
        claimCOA: claimCOA,
      }

      // Add claim-specific data
      if (claimMainContract) {
        paymentData.mainContractItems = mainContractItems.map(item => ({
          no: item.no,
          description: item.description,
          value: parseCurrency(item.value)
        }))
      }

      if (claimCOA) {
        paymentData.coaItems = coaItems.map(coaItem => {
          const coa = projectCOAs.find(c => c.id === coaItem.coaId)
          return {
            coaId: coaItem.coaId,
            coaNo: coa?.coaNo,
            items: coaItem.items.map(item => ({
              no: item.no,
              description: item.description,
              value: parseCurrency(item.value)
            }))
          }
        })
      }

      await updatePayment(payment.id, paymentData)
      setSaving(false)
      onSaved?.()
      onClose()
    } catch (error) {
      console.error('Error updating payment:', error)
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล: ' + error.message)
      setSaving(false)
    }
  }

  return (
    <Modal title={`Edit Payment - ${payment?.paymentNo}`} subtitle="แก้ไขและ Submit ใหม่" onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Project" required error={errors.projectId} className="sm:col-span-2">
            <Select value={form.projectId} onChange={e => set('projectId', e.target.value)} error={errors.projectId} disabled>
              <option value="">— Select project —</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </FormField>

          <FormField label="Payment No." required error={errors.paymentNo}>
            <Input
              placeholder="e.g. PMT-CPT-001"
              value={form.paymentNo}
              onChange={e => set('paymentNo', e.target.value)}
              error={errors.paymentNo}
              disabled
            />
          </FormField>

          <FormField label="Attachment">
            <AttachmentField
              value={form.attachment}
              onChange={v => set('attachment', v)}
              folder="payments"
              docId={form.projectId}
              uploadedBy={currentUser?.id}
              placeholder="Filename or URL หรือกด Upload"
            />
          </FormField>

          <FormField label="Description" required error={errors.detail} className="sm:col-span-2">
            <Textarea
              rows={2}
              placeholder="Progress claim description, work items completed..."
              value={form.detail}
              onChange={e => set('detail', e.target.value)}
              error={errors.detail}
            />
          </FormField>
        </div>

        {/* Claim Type Selection */}
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-700">
            <span className="text-sm font-semibold text-white">Claim Type</span>
          </div>
          <div className="p-3 space-y-2">
            {errors.claimType && (
              <div className="text-xs text-rose-600 font-medium">{errors.claimType}</div>
            )}

            {/* Claim Main Contract Checkbox */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={claimMainContract}
                  onChange={(e) => {
                    setClaimMainContract(e.target.checked)
                  }}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-slate-700">Claim Main Contract</span>
              </label>

              {claimMainContract && (
                <div className="ml-5 space-y-2">
                  {currentProject && (
                    <div className="text-xs text-slate-600 bg-blue-50 px-3 py-2 rounded-lg border border-blue-200">
                      <span className="font-semibold">Main Contract Value: </span>
                      <span className="text-blue-700 font-bold">
                        ฿{(currentProject.originalContractValue || currentProject.contractValue || 0).toLocaleString()}
                      </span>
                    </div>
                  )}

                  {errors.mainContractItems && (
                    <div className="text-xs text-rose-600 font-medium">{errors.mainContractItems}</div>
                  )}
                  {errors.mainContractValue && (
                    <div className="text-xs text-rose-600 font-medium">{errors.mainContractValue}</div>
                  )}

                  {/* Main Contract Items Table */}
                  <div className="rounded-lg border border-slate-200 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="px-2 py-1 text-left text-xs font-semibold text-slate-600 w-16">No.</th>
                          <th className="px-2 py-1 text-left text-xs font-semibold text-slate-600">Description</th>
                          <th className="px-2 py-1 text-left text-xs font-semibold text-slate-600 w-40">Value (฿)</th>
                          <th className="px-2 py-1 w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {mainContractItems.map((item, idx) => (
                          <tr key={item.id} className="hover:bg-slate-50">
                            <td className="px-2 py-1 text-slate-600 font-medium">{item.no}</td>
                            <td className="px-2 py-1">
                              <input
                                type="text"
                                value={item.description}
                                onChange={(e) => updateMainContractItem(item.id, 'description', e.target.value)}
                                placeholder="Enter description..."
                                className="w-full px-2 py-1 text-sm border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </td>
                            <td className="px-2 py-1">
                              <input
                                type="text"
                                inputMode="decimal"
                                value={fmtInput(item.value)}
                                onChange={(e) => {
                                  updateMainContractItem(item.id, 'value', sanitizeCurrencyInput(e.target.value))
                                }}
                                placeholder="0"
                                className="w-full px-2 py-1 text-sm border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </td>
                            <td className="px-2 py-1">
                              {mainContractItems.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeMainContractItem(item.id)}
                                  className="p-1 text-rose-500 hover:bg-rose-50 rounded transition-colors"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-slate-50">
                          <td colSpan="2" className="px-2 py-1 text-right font-semibold text-slate-700">Total:</td>
                          <td className="px-2 py-1 font-bold text-blue-700">
                            ฿{calculateMainContractTotal().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <button
                    type="button"
                    onClick={addMainContractItem}
                    className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors"
                  >
                    <Plus size={14} />
                    Add Row
                  </button>
                </div>
              )}
            </div>

            {/* Claim COA Checkbox */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={claimCOA}
                  onChange={(e) => {
                    setClaimCOA(e.target.checked)
                    if (!e.target.checked) {
                      setCoaItems([])
                    }
                  }}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-slate-700">Claim COA</span>
              </label>

              {claimCOA && (
                <div className="ml-5 space-y-2">
                  {projectCOAs.length === 0 ? (
                    <div className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
                      No COA available for this project
                    </div>
                  ) : (
                    <>
                      {errors.selectedCOA && (
                        <div className="text-xs text-rose-600 font-medium">{errors.selectedCOA}</div>
                      )}

                      {/* COA Selection Dropdown */}
                      <FormField label="Select COA to add">
                        <div className="flex gap-2">
                          <Select
                            value=""
                            onChange={(e) => {
                              if (e.target.value) {
                                addCOASelection(e.target.value)
                                e.target.value = '' // Reset dropdown
                              }
                            }}
                          >
                            <option value="">— Select COA to add —</option>
                            {projectCOAs
                              .filter(coa => !coaItems.some(item => item.coaId === coa.id))
                              .map(coa => (
                                <option key={coa.id} value={coa.id}>
                                  {coa.coaNo} - {coa.description} (฿{coa.value?.toLocaleString()})
                                </option>
                              ))}
                          </Select>
                        </div>
                      </FormField>

                      {/* Display selected COAs with their tables */}
                      {coaItems.map((coaItem) => {
                        const coa = projectCOAs.find(c => c.id === coaItem.coaId)
                        if (!coa) return null

                        return (
                          <div key={coaItem.coaId} className="border border-purple-200 rounded-lg overflow-hidden">
                            {/* COA Header */}
                            <div className="bg-purple-600 px-3 py-1.5 flex items-center justify-between">
                              <div>
                                <h4 className="text-sm font-semibold text-white">{coa.coaNo}</h4>
                                <p className="text-xs text-purple-100">{coa.description}</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeCOASelection(coaItem.coaId)}
                                className="p-1 text-white hover:bg-purple-700 rounded transition-colors"
                              >
                                <X size={16} />
                              </button>
                            </div>

                            <div className="p-2 space-y-2">
                              {/* COA Value Info */}
                              <div className="text-xs text-slate-600 bg-purple-50 px-3 py-2 rounded-lg border border-purple-200">
                                <span className="font-semibold">COA Value: </span>
                                <span className="text-purple-700 font-bold">
                                  ฿{(coa.value || 0).toLocaleString()}
                                </span>
                              </div>

                              {/* Error messages for this COA */}
                              {errors[`coaItems_${coaItem.coaId}`] && (
                                <div className="text-xs text-rose-600 font-medium">{errors[`coaItems_${coaItem.coaId}`]}</div>
                              )}
                              {errors[`coaValue_${coaItem.coaId}`] && (
                                <div className="text-xs text-rose-600 font-medium">{errors[`coaValue_${coaItem.coaId}`]}</div>
                              )}

                              {/* COA Items Table */}
                              <div className="rounded-lg border border-slate-200 overflow-hidden">
                                <table className="w-full text-sm">
                                  <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                      <th className="px-2 py-1 text-left text-xs font-semibold text-slate-600 w-16">No.</th>
                                      <th className="px-2 py-1 text-left text-xs font-semibold text-slate-600">Description</th>
                                      <th className="px-2 py-1 text-left text-xs font-semibold text-slate-600 w-40">Value (฿)</th>
                                      <th className="px-2 py-1 w-10"></th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {coaItem.items.map((item) => (
                                      <tr key={item.id} className="hover:bg-slate-50">
                                        <td className="px-2 py-1 text-slate-600 font-medium">{item.no}</td>
                                        <td className="px-2 py-1">
                                          <input
                                            type="text"
                                            value={item.description}
                                            onChange={(e) => updateCOAItem(coaItem.coaId, item.id, 'description', e.target.value)}
                                            placeholder="Enter description..."
                                            className="w-full px-2 py-1 text-sm border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                                          />
                                        </td>
                                        <td className="px-2 py-1">
                                          <input
                                            type="text"
                                            inputMode="decimal"
                                            value={fmtInput(item.value)}
                                            onChange={(e) => {
                                              updateCOAItem(coaItem.coaId, item.id, 'value', sanitizeCurrencyInput(e.target.value))
                                            }}
                                            placeholder="0"
                                            className="w-full px-2 py-1 text-sm border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                                          />
                                        </td>
                                        <td className="px-2 py-1">
                                          {coaItem.items.length > 1 && (
                                            <button
                                              type="button"
                                              onClick={() => removeCOAItem(coaItem.coaId, item.id)}
                                              className="p-1 text-rose-500 hover:bg-rose-50 rounded transition-colors"
                                            >
                                              <Trash2 size={14} />
                                            </button>
                                          )}
                                        </td>
                                      </tr>
                                    ))}
                                    <tr className="bg-purple-50">
                                      <td colSpan="2" className="px-2 py-1 text-right font-semibold text-slate-700">Total:</td>
                                      <td className="px-2 py-1 font-bold text-purple-700">
                                        ฿{calculateCOATotal(coaItem.coaId).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </td>
                                      <td></td>
                                    </tr>
                                  </tbody>
                                </table>
                              </div>

                              <button
                                type="button"
                                onClick={() => addCOAItem(coaItem.coaId)}
                                className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg border border-purple-200 transition-colors"
                              >
                                <Plus size={14} />
                                Add Row
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Item Deduction Section */}
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-600">
            <span className="text-sm font-semibold text-white">Item Deduction</span>
          </div>
          <div className="p-3">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              {/* Advance Deduction - Takes 2 columns */}
              <div className="lg:col-span-2">
                <FormField label="Advance Deduction">
                  <div className="space-y-2">
                    {/* Checkbox to enable/disable */}
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={useAdvanceDeduction}
                        onChange={(e) => {
                          setUseAdvanceDeduction(e.target.checked)
                          if (!e.target.checked) {
                            setAdvanceDeductionValue('')
                            setAdvanceDeductionSources({ mainContract: false, coa: false })
                          }
                        }}
                        className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-xs font-medium text-slate-600">Enable Advance Deduction</span>
                    </label>

                    {useAdvanceDeduction ? (
                      <>
                        {/* Source Selection */}
                        <div className="flex gap-3 pl-6">
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={advanceDeductionSources.mainContract}
                              onChange={(e) => setAdvanceDeductionSources(prev => ({ ...prev, mainContract: e.target.checked }))}
                              disabled={!claimMainContract}
                              className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                            />
                            <span className="text-xs text-slate-600">Main Contract</span>
                          </label>
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={advanceDeductionSources.coa}
                              onChange={(e) => setAdvanceDeductionSources(prev => ({ ...prev, coa: e.target.checked }))}
                              disabled={!claimCOA}
                              className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                            />
                            <span className="text-xs text-slate-600">COA</span>
                          </label>
                        </div>

                        {/* Type Dropdown */}
                        <Select
                          value={advanceDeductionType}
                          onChange={(e) => setAdvanceDeductionType(e.target.value)}
                        >
                          <option value="percentage">Percentage (%)</option>
                          <option value="amount">Amount (฿)</option>
                        </Select>

                        {/* Input Field */}
                        {advanceDeductionType === 'percentage' ? (
                          <div className="relative">
                            <Input
                              inputMode="decimal"
                              placeholder="0.00"
                              value={fmtInput(advanceDeductionValue)}
                              onChange={e => setAdvanceDeductionValue(sanitizeCurrencyInput(e.target.value))}
                              className="pr-7"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
                          </div>
                        ) : (
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">฿</span>
                            <Input
                              inputMode="decimal"
                              placeholder="0"
                              value={fmtInput(advanceDeductionValue)}
                              onChange={e => setAdvanceDeductionValue(sanitizeCurrencyInput(e.target.value))}
                              className="pl-7"
                            />
                          </div>
                        )}

                        {/* Show calculated amount */}
                        {advanceDeductionValue && (
                          <div className="text-xs text-slate-600 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                            {advanceDeductionType === 'percentage' && (
                              <span className="text-slate-500">Base: ฿{getAdvanceDeductionBase().toLocaleString()} × {advanceDeductionValue}% = </span>
                            )}
                            <span className="font-semibold">฿{calculateAdvanceDeduction().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-xs text-slate-400 italic px-2 py-2 bg-slate-50 rounded border border-slate-200">
                        Not applied
                      </div>
                    )}
                  </div>
                </FormField>
              </div>

              {/* Other Claim - Takes 1 column */}
              <div className="lg:col-span-1">
                <FormField label="Other Claim">
                  <div className="space-y-2">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">฿</span>
                      <Input
                        inputMode="decimal"
                        placeholder="0"
                        value={fmtInput(form.otherClaim)}
                        onChange={e => set('otherClaim', sanitizeCurrencyInput(e.target.value))}
                        className="pl-7"
                      />
                    </div>
                    <p className="text-xs text-slate-500">Additional claim amount</p>
                  </div>
                </FormField>
              </div>
            </div>
          </div>
        </div>

        {/* Financial Calculation Section */}
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-700">
            <Calculator size={14} className="text-slate-300" />
            <span className="text-sm font-semibold text-white">Financial Calculation</span>
          </div>
          <div className="p-3 space-y-2">
            {/* Grand Total Display - After Advance Deduction */}
            {(claimMainContract || claimCOA) && (
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Total Claim Value</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {claimMainContract && claimCOA && 'Main Contract + COA'}
                      {claimMainContract && !claimCOA && 'Main Contract'}
                      {!claimMainContract && claimCOA && 'COA'}
                      {parseCurrency(form.otherClaim) > 0 && ' + Other Claim'}
                      {useAdvanceDeduction && ' (After Advance Deduction)'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-700">
                      ฿{(grandTotal - adv).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    {(useAdvanceDeduction && adv > 0) || parseCurrency(form.otherClaim) > 0 ? (
                      <p className="text-xs text-slate-500 mt-1">
                        {parseCurrency(form.otherClaim) > 0 && `Original: ฿${(grandTotal - parseCurrency(form.otherClaim)).toLocaleString()}`}
                        {parseCurrency(form.otherClaim) > 0 && ` + Other: ฿${parseCurrency(form.otherClaim).toLocaleString()}`}
                        {useAdvanceDeduction && adv > 0 && ` - Advance: ฿${adv.toLocaleString()}`}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            )}

            {errors.value && (
              <div className="text-xs text-rose-600 font-medium">{errors.value}</div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Retention Reduce */}
              <FormField label="Retention Reduce">
                <div className="space-y-2">
                  {/* Checkbox to enable/disable */}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useRetentionReduce}
                      onChange={(e) => {
                        setUseRetentionReduce(e.target.checked)
                        if (!e.target.checked) {
                          setRetentionReduceValue('')
                        }
                      }}
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-xs font-medium text-slate-600">Enable Retention Reduce</span>
                  </label>

                  {useRetentionReduce ? (
                    <>
                      {/* Type Dropdown */}
                      <Select
                        value={retentionReduceType}
                        onChange={(e) => setRetentionReduceType(e.target.value)}
                      >
                        <option value="percentage">Percentage (%)</option>
                        <option value="amount">Amount (฿)</option>
                      </Select>

                      {/* Input Field */}
                      {retentionReduceType === 'percentage' ? (
                        <div className="relative">
                          <Input
                            inputMode="decimal"
                            placeholder="0.00"
                            value={fmtInput(retentionReduceValue)}
                            onChange={e => setRetentionReduceValue(sanitizeCurrencyInput(e.target.value))}
                            className="pr-7"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
                        </div>
                      ) : (
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">฿</span>
                          <Input
                            inputMode="decimal"
                            placeholder="0"
                            value={fmtInput(retentionReduceValue)}
                            onChange={e => setRetentionReduceValue(sanitizeCurrencyInput(e.target.value))}
                            className="pl-7"
                          />
                        </div>
                      )}

                      {/* Show calculated amount */}
                      {retentionReduceValue && (
                        <div className="text-xs text-slate-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
                          {retentionReduceType === 'percentage' && (
                            <span className="text-slate-500">Base: ฿{getRetentionReduceBase().toLocaleString()} × {retentionReduceValue}% = </span>
                          )}
                          <span className="font-semibold">฿{calculateRetentionReduce().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-xs text-slate-400 italic px-2 py-2 bg-slate-50 rounded border border-slate-200">
                      Not applied
                    </div>
                  )}
                </div>
              </FormField>

              {/* With Tax */}
              <FormField label="With Tax (%)">
                <div className="relative">
                  <Input
                    inputMode="decimal"
                    placeholder="0.00"
                    value={fmtInput(form.withTaxPercent)}
                    onChange={e => set('withTaxPercent', sanitizeCurrencyInput(e.target.value))}
                    className="pr-7"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
                </div>
              </FormField>
            </div>

            {/* Balance Display */}
            <div className={clsx(
              'flex items-center justify-between px-3 py-2 rounded-lg border',
              balance >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'
            )}>
              <div className="text-sm text-slate-600">
                <span className="font-medium">Balance Value</span>
                <span className="text-slate-400 ml-2 text-xs">= (Total Claim × 1.07) - Retention - With Tax</span>
              </div>
              <span className={clsx(
                'text-lg font-bold',
                balance >= 0 ? 'text-emerald-700' : 'text-rose-600'
              )}>
                ฿{balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        <FormField label="Note">
          <Textarea rows={2} placeholder="Additional notes..." value={form.note} onChange={e => set('note', e.target.value)} />
        </FormField>
      </div>

      <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-slate-100">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant="primary" icon={Save} loading={saving} onClick={handleSubmit}>
          Submit for Approval
        </Button>
      </div>
    </Modal>
  )
}

export function Modal({ title, subtitle, onClose, children, maxWidth = 'max-w-4xl' }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className={clsx('relative bg-white rounded-2xl shadow-2xl w-full flex flex-col max-h-[90vh]', maxWidth)}>
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-slate-100 shrink-0">
          <div>
            <h2 className="text-base font-bold text-slate-800">{title}</h2>
            {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors shrink-0 mt-0.5"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {children}
        </div>
      </div>
    </div>
  )
}
