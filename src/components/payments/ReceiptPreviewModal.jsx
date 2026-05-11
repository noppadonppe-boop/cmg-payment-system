import { Printer } from 'lucide-react'
import { Modal } from './PaymentCreateModal'
import Button from '../ui/Button'
import { clsx } from 'clsx'

function fmtCurrency(val) {
  if (!val && val !== 0) return '—'
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val)
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

/* ── Number to Thai Words ────────────────────────────────────────────────── */
const THAI_NUMS = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า']
const THAI_PLACES = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน']

function numToThaiWord(n) {
  if (n === 0) return ''
  let str = ''
  const digits = String(n).padStart(6, '0').split('').map(Number)
  // digits[0]=แสน, [1]=หมื่น, [2]=พัน, [3]=ร้อย, [4]=สิบ, [5]=หน่วย
  for (let i = 0; i < 6; i++) {
    const d = digits[i]
    if (d === 0) continue
    const place = 5 - i // 0=หน่วย, 1=สิบ, 2=ร้อย, 3=พัน, 4=หมื่น, 5=แสน
    if (place === 1 && d === 1) {
      str += 'สิบ'
    } else if (place === 1 && d === 2) {
      str += 'ยี่สิบ'
    } else if (place === 0 && d === 1 && str !== '') {
      str += 'เอ็ด'
    } else {
      str += THAI_NUMS[d] + THAI_PLACES[place]
    }
  }
  return str
}

function numberToThaiWords(num) {
  if (num === 0) return 'ศูนย์บาทถ้วน'
  const isNegative = num < 0
  let n = Math.abs(num)
  const baht = Math.floor(n)
  const satang = Math.round((n - baht) * 100)

  let text = ''
  if (isNegative) text += 'ลบ'

  if (baht === 0) {
    text += ''
  } else {
    // Split into millions groups
    const groups = []
    let remaining = baht
    while (remaining > 0) {
      groups.unshift(remaining % 1000000)
      remaining = Math.floor(remaining / 1000000)
    }
    for (let i = 0; i < groups.length; i++) {
      const groupVal = groups[i]
      if (groupVal === 0) continue
      const word = numToThaiWord(groupVal)
      const millionsCount = groups.length - 1 - i
      text += word
      for (let m = 0; m < millionsCount; m++) text += 'ล้าน'
    }
    text += 'บาท'
  }

  if (satang > 0) {
    text += numToThaiWord(satang) + 'สตางค์'
  } else {
    text += 'ถ้วน'
  }

  return text
}

const thaiFontStyle = { fontFamily: "'THSarabunPSK', 'Sarabun', 'TH Sarabun New', sans-serif" }

export default function ReceiptPreviewModal({ payment, project, collectionData = {}, onClose, onConfirm, readOnly = false }) {
  const clientInfo = project?.clientInfo || {}
  const cd = collectionData

  const claimValue = payment.value || 0
  const vatAmount = claimValue * 0.07
  const totalWithVat = claimValue + vatAmount

  const contractNos = []
  if (payment.claimMainContract && project?.contractNo) {
    contractNos.push(project.contractNo)
  }
  if (payment.claimCOA && payment.coaItems?.length > 0) {
    payment.coaItems.forEach(coa => {
      if (coa.coaNo) contractNos.push(coa.coaNo)
    })
  }
  const contractNoString = contractNos.join(', ')

  const receiptNo = payment.invoiceNo || payment.paymentNo || '—'
  const receiptDate = fmtDate(payment.invoiceDate || new Date().toISOString())

  // Build description lines
  const descLines = []
  if (payment.detail) descLines.push(payment.detail)
  if (contractNoString) descLines.push(`สัญญาว่าจ้างเลขที่ ${contractNoString}`)
  if (payment.invoiceNo) descLines.push(`หมายเหตุ : Invoice NO.${payment.invoiceNo}`)

  const description = descLines.length > 0 ? descLines.join('\n') : 'Progress payment'

  const handlePrint = () => {
    window.print()
  }

  return (
    <Modal
      title="พรีวิวใบเสร็จรับเงิน / ใบกำกับภาษี"
      subtitle="ตรวจสอบข้อมูลก่อนยืนยัน"
      onClose={onClose}
      maxWidth="max-w-4xl"
    >
      <div className="space-y-4">
        {/* Receipt Paper */}
        <div className="bg-white border border-slate-300 p-6 sm:p-8 print:p-0 print:border-none print:shadow-none print:w-full print:max-w-none">

          {/* ── Title + Receipt No. ── */}
          <div className="mb-3">
            <h1 className="text-center text-lg font-bold leading-tight">
              ใบเสร็จรับเงิน / ใบกำกับภาษี <span className="text-red-600">(Original)</span>
            </h1>
            <p className="text-center text-xs font-semibold tracking-widest mt-0.5">RECEIPT / TAX INVOICE</p>
            <div className="flex items-center mt-2 text-xs">
              <span className="text-slate-600">เลขที่</span>
              <span className="font-semibold text-slate-800 ml-2">{receiptNo}</span>
            </div>
          </div>

          {/* ── Company Box + Tax Rate / Date ── */}
          <div className="flex gap-3 mb-3">
            {/* Company Info Box */}
            <div className="border border-slate-800 p-2 flex-1">
              <div className="flex items-start gap-2">
                {/* CMG Logo */}
                <div className="w-14 h-10 bg-red-600 text-white flex items-center justify-center text-[10px] font-bold rounded-sm shrink-0 leading-tight text-center">
                  CMG<br/>Logo
                </div>
                <div className="text-[10px] leading-tight">
                  <p className="font-bold text-slate-900">CMG ENGINEERING & CONSTRUCTION CO.,LTD</p>
                  <p className="text-slate-800">บริษัท ซีเอ็มจี เอ็นจิเนียริ่ง แอนด์ คอนสตรัคชั่น จำกัด</p>
                  <p className="text-slate-800">(สำนักงานใหญ่) 4/281 หมู่ 3 ตำบลนาพระ</p>
                  <p className="text-slate-800">อำเภอเมืองระยอง จังหวัดระยอง 21000</p>
                  <p className="text-slate-800">Tel : 033-680588&nbsp;&nbsp;&nbsp;FAX : 033-680588</p>
                  <p className="text-slate-800">TAX ID : 0215557001784</p>
                </div>
              </div>
            </div>

            {/* Tax Rate + Head Office + Date */}
            <div className="text-[10px] w-44 shrink-0">
              {/* Row 1: เลขที่ */}
              <div className="grid grid-cols-[1fr_auto] items-center gap-2 mb-1">
                <span className="text-slate-600">เลขที่</span>
                <span className="font-bold text-slate-800 text-[11px]">{cd.receiptNo || '—'}</span>
              </div>
              {/* Row 2: อัตราภาษี */}
              <div className="flex items-center justify-between gap-1 mb-1 whitespace-nowrap">
                <span className="text-slate-600 shrink-0">อัตราภาษี</span>
                <div className="flex items-center gap-1">
                  <span className="text-slate-600">ร้อยละ 7</span>
                  <div className="w-5 h-4 border border-slate-400 flex items-center justify-center text-[8px] shrink-0">X</div>
                  <span className="text-slate-600">ร้อยละ 0</span>
                  <div className="w-5 h-4 border border-slate-400 shrink-0"></div>
                </div>
              </div>
              {/* Row 3: สำนักงานใหญ่ */}
              <div className="grid grid-cols-[1fr_auto] items-center gap-2 mb-1">
                <span className="text-slate-600">สำนักงานใหญ่</span>
                <div className="w-5 h-4 border border-slate-400 flex items-center justify-center text-[8px]">X</div>
              </div>
              {/* Row 4: วันที่ + Date value */}
              <div className="grid grid-cols-[auto_1fr] items-center gap-2 mb-1">
                <span className="text-slate-600">วันที่</span>
                <span className="text-right font-semibold text-slate-800 text-[11px]">{receiptDate}</span>
              </div>
            </div>
          </div>

          {/* ── Received From ── */}
          <div className="text-xs mb-3 space-y-0.5">
            <div className="flex items-baseline">
              <span className="w-28 shrink-0 text-slate-700">ได้รับเงินจาก</span>
              <span className="text-slate-500 text-[10px]">Received from</span>
            </div>
            <div className="border-b border-slate-800 px-1 font-semibold text-slate-800">{clientInfo.name || '—'}</div>

            <div className="flex items-baseline">
              <span className="w-28 shrink-0 text-slate-700">ที่อยู่</span>
              <span className="text-slate-500 text-[10px]">Address</span>
            </div>
            <div className="border-b border-slate-800 px-1 text-slate-700">{clientInfo.address || ''}</div>

            <div className="flex items-baseline">
              <span className="w-28 shrink-0 text-slate-700">TAX ID</span>
              <span className="text-slate-500 text-[10px] mr-2">:</span>
              <span className="text-slate-800">{clientInfo.taxId || ''}</span>
            </div>
          </div>

          {/* ── Main Table ── */}
          <table className="w-full border border-slate-800 text-[10px] mb-0">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="border-r border-slate-800 py-1 px-1 text-center w-10">
                  จำนวน<br/><span className="text-[8px]">Item</span>
                </th>
                <th className="border-r border-slate-800 py-1 px-1 text-center">
                  รายการ<br/><span className="text-[8px]">Description</span>
                </th>
                <th className="border-r border-slate-800 py-1 px-1 text-center w-12">
                  จำนวน<br/><span className="text-[8px]">Quantity</span>
                </th>
                <th className="border-r border-slate-800 py-1 px-1 text-center w-24">
                  ราคาต่อหน่วย<br/><span className="text-[8px]">Unit</span>
                </th>
                <th className="py-1 px-1 text-center w-28">
                  จำนวนเงิน<br/><span className="text-[8px]">Amount</span>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-300" style={{ height: '120px' }}>
                <td className="border-r border-slate-800 py-2 px-1 text-center align-top">1</td>
                <td className="border-r border-slate-800 py-2 px-2 align-top whitespace-pre-line text-slate-800 leading-relaxed">
                  {description}
                </td>
                <td className="border-r border-slate-800 py-2 px-1 text-center align-top">1.00</td>
                <td className="border-r border-slate-800 py-2 px-1 text-right align-top whitespace-nowrap">
                  {fmtCurrency(claimValue)}
                </td>
                <td className="py-2 px-1 text-right align-top whitespace-nowrap">
                  {fmtCurrency(claimValue)}
                </td>
              </tr>
            </tbody>
          </table>

          {/* ── Summary + Total in Words ── */}
          <div className="flex border-b border-slate-800">
            {/* Left: Total in words */}
            <div className="flex-1 border-r border-slate-800 p-2">
              <div className="p-1 mb-1">
                <p className="text-[10px] text-slate-700">จำนวนเงินรวมทั้งสิ้น (ตัวอักษร)</p>
                <p className="text-[10px] text-slate-500">Total in words</p>
              </div>
              <p className="text-sm text-slate-800 leading-snug mt-1" style={thaiFontStyle}>
                {numberToThaiWords(totalWithVat)}
              </p>
            </div>

            {/* Right: Amount summary */}
            <div className="w-48 text-[10px]">
              <div className="flex justify-between items-center border-b border-slate-300 py-1 px-2">
                <span className="text-slate-600">ราคาสินค้ารวม</span>
                <span className="font-semibold text-slate-800">{fmtCurrency(claimValue)}</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-300 py-1 px-2">
                <div>
                  <span className="text-slate-600">จำนวนเงินรวมทั้งสิ้น</span>
                  <span className="text-slate-500 text-[9px] ml-1">Total</span>
                </div>
                <span className="font-semibold text-slate-800">{fmtCurrency(claimValue)}</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-300 py-1 px-2">
                <div>
                  <span className="text-slate-600">ภาษีมูลค่าเพิ่ม</span>
                  <span className="text-slate-500 text-[9px] ml-1">VAT 7%</span>
                </div>
                <span className="font-semibold text-slate-800">{fmtCurrency(vatAmount)}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 px-2 border-t-2 border-slate-800">
                <div>
                  <span className="font-bold text-slate-800">จำนวนเงินรวมทั้งสิ้น</span>
                  <span className="text-slate-500 text-[9px] ml-1">Total</span>
                </div>
                <span className="font-bold text-slate-900">{fmtCurrency(totalWithVat)}</span>
              </div>
            </div>
          </div>

          {/* ── Paid By / Payment Method ── */}
          <div className="border-t border-slate-800 p-2 space-y-2 text-[10px]">
            <p className="font-bold text-slate-800 mb-1">ชำระโดย / PAID BY</p>

            {/* Cash */}
            <div className="flex items-center gap-2">
              <div className={clsx('w-3 h-3 border border-slate-800 flex items-center justify-center text-[8px]', cd.paymentType === 'cash' && 'bg-slate-800 text-white')}>{cd.paymentType === 'cash' && 'X'}</div>
              <span className="text-slate-700">เงินสด</span>
              <span className="text-slate-500">CASH</span>
              <div className="flex-1 border-b border-slate-400 border-dotted mx-1 text-right text-slate-800 font-semibold">
                {cd.paymentType === 'cash' ? cd.cashAmount : ''}
              </div>
              <span className="text-slate-700">จำนวนเงิน</span>
              <span className="text-slate-500">AMOUNT</span>
              <div className="w-24 border-b border-slate-400 border-dotted text-right text-slate-800 font-semibold">
                {cd.paymentType === 'cash' ? cd.cashAmount : ''}
              </div>
              <span className="text-slate-700">บาท</span>
              <span className="text-slate-500">BAHT</span>
            </div>

            {/* Cheque */}
            <div className="flex items-center gap-2">
              <div className={clsx('w-3 h-3 border border-slate-800 flex items-center justify-center text-[8px]', cd.paymentType === 'cheque' && 'bg-slate-800 text-white')}>{cd.paymentType === 'cheque' && 'X'}</div>
              <span className="text-slate-700">เช็ค</span>
              <span className="text-slate-500">CHEQUE NO.</span>
              <div className="w-24 border-b border-slate-400 border-dotted text-center text-slate-800 font-semibold">{cd.paymentType === 'cheque' ? cd.chequeNo : ''}</div>
              <span className="text-slate-700">ธนาคาร</span>
              <span className="text-slate-500">BANK</span>
              <div className="w-24 border-b border-slate-400 border-dotted text-center text-slate-800 font-semibold">{cd.paymentType === 'cheque' ? cd.chequeBank : ''}</div>
              <span className="text-slate-700">สาขา</span>
              <span className="text-slate-500">BRANCH</span>
              <div className="w-24 border-b border-slate-400 border-dotted text-center text-slate-800 font-semibold">{cd.paymentType === 'cheque' ? cd.chequeBranch : ''}</div>
              <span className="text-slate-700">วันที่</span>
              <span className="text-slate-500">DATE</span>
              <div className="w-20 border-b border-slate-400 border-dotted text-center text-slate-800 font-semibold">{cd.paymentType === 'cheque' && cd.chequeDate ? fmtDate(cd.chequeDate) : ''}</div>
            </div>

            {/* Transfer */}
            <div className="flex items-center gap-2">
              <div className={clsx('w-3 h-3 border border-slate-800 flex items-center justify-center text-[8px]', cd.paymentType === 'transfer' && 'bg-slate-800 text-white')}>{cd.paymentType === 'transfer' && 'X'}</div>
              <span className="text-slate-700">โอน</span>
              <span className="text-slate-500">TRANSFER AMOUNT</span>
              <div className="flex-1 border-b border-slate-400 border-dotted text-right text-slate-800 font-semibold">{cd.paymentType === 'transfer' ? cd.transferAmount : ''}</div>
              <span className="text-slate-700">ธนาคาร</span>
              <span className="text-slate-500">BANK</span>
              <div className="w-24 border-b border-slate-400 border-dotted text-center text-slate-800 font-semibold">{cd.paymentType === 'transfer' ? cd.transferBank : ''}</div>
              <span className="text-slate-700">สาขา</span>
              <span className="text-slate-500">BRANCH</span>
              <div className="w-24 border-b border-slate-400 border-dotted text-center text-slate-800 font-semibold">{cd.paymentType === 'transfer' ? cd.transferBranch : ''}</div>
              <span className="text-slate-700">วันที่</span>
              <span className="text-slate-500">DATE</span>
              <div className="w-20 border-b border-slate-400 border-dotted text-center text-slate-800 font-semibold">{cd.paymentType === 'transfer' && cd.transferDate ? fmtDate(cd.transferDate) : ''}</div>
            </div>

            {/* Collector + Date */}
            <div className="flex items-center gap-4 pt-1">
              <div className="flex items-center gap-2 flex-1">
                <span className="text-slate-700 font-bold">ผู้รับเงิน</span>
                <span className="text-slate-500">COLLECTOR</span>
                <div className="flex-1 border-b border-slate-400 border-dotted text-center text-slate-800 font-semibold">{cd.collector || ''}</div>
              </div>
              <div className="flex items-center gap-2 w-48">
                <span className="text-slate-700 font-bold">วันที่รับเงิน</span>
                <span className="text-slate-500">DATE</span>
                <div className="flex-1 border-b border-slate-400 border-dotted text-center text-slate-800 font-semibold">{cd.collectionDate ? fmtDate(cd.collectionDate) : ''}</div>
              </div>
            </div>
          </div>

          {/* ── Footer Note ── */}
          <div className="text-[9px] text-slate-600 mt-2 space-y-0.5">
            <p><span className="text-slate-800">หมายเหตุ :</span> การชำระเงินด้วยเช็ค ใบเสร็จรับเงินฉบับนี้จะสมบูรณ์ต่อเมื่อธนาคารเคลียร์เช็คได้แล้ว</p>
            <p><span className="text-slate-800">Remark :</span> If payment is made by cheque, this receipt will not be valid until the cheque is honoured by the Bank.</p>
          </div>
        </div>

        {/* Print hint */}
        <p className="text-xs text-slate-400 text-center hidden print:block">
          Printed from CMG Payment System
        </p>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-slate-100 print:hidden">
        <Button variant="secondary" icon={Printer} onClick={handlePrint}>
          พิมพ์
        </Button>
        {readOnly ? (
          <Button variant="emerald" onClick={onConfirm}>ปิด</Button>
        ) : (
          <>
            <Button variant="secondary" onClick={onClose}>ยกเลิก</Button>
            <Button variant="emerald" onClick={onConfirm}>ยืนยันใบเสร็จ</Button>
          </>
        )}
      </div>
    </Modal>
  )
}
