import { useState } from 'react'
import { Upload, FileText, CheckCircle2, AlertTriangle } from 'lucide-react'
import { useData } from '../../context/DataContext'
import { useAuth } from '../../context/AuthContext'
import Button from '../ui/Button'
import { AttachmentField } from '../ui/AttachmentField'
import { Modal } from '../payments/PaymentCreateModal'
import { clsx } from 'clsx'

function fmtCurrency(val) {
  if (!val && val !== 0) return '—'
  return `฿${new Intl.NumberFormat('en-US').format(val)}`
}

export default function COAStampUploadModal({ coa, onClose }) {
  const { updateCOA, projects } = useData()
  const { currentUser } = useAuth()

  const project = projects.find(p => p.id === coa.projectId)
  const isStampUploaded = !!(coa.stampDocument && coa.stampUploadedAt)

  const [form, setForm] = useState({
    stampDocument: coa.stampDocument || '',
    note: coa.stampNote || '',
  })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const set = (k, v) => {
    setForm(p => ({ ...p, [k]: v }))
    if (errors[k]) setErrors(p => { const e = { ...p }; delete e[k]; return e })
  }

  const validate = () => {
    const errs = {}
    if (!form.stampDocument.trim()) {
      errs.stampDocument = 'กรุณาอัพโหลดเอกสารอากรณ์แสตมป์'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setSaving(true)
    await new Promise(r => setTimeout(r, 500))
    
    updateCOA(coa.id, {
      stampDocument: form.stampDocument,
      stampNote: form.note,
      stampUploadedBy: currentUser.id,
      stampUploadedAt: new Date().toISOString(),
      status: 'Stamp Completed',
    })
    
    setSaving(false)
    onClose()
  }

  return (
    <Modal
      title="อัพโหลดเอกสารอากรณ์แสตมป์"
      subtitle={`${coa.coaNo} · ${project?.name ?? '—'} · การอัพโหลดเอกสารขั้นสุดท้าย`}
      onClose={onClose}
    >
      <div className="space-y-5">
        {/* COA Summary */}
        <div className="rounded-xl border border-purple-200 bg-purple-50 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-purple-700">
            <FileText size={14} className="text-purple-200" />
            <span className="text-sm font-semibold text-white">{coa.coaNo} — Change Order Approval</span>
          </div>
          <div className="p-4">
            <p className="text-sm text-slate-600 mb-3">{coa.description}</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-lg border border-purple-200 px-4 py-3 text-center">
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">COA Value</p>
                <p className="text-base font-bold text-purple-700 mt-0.5">{fmtCurrency(coa.value)}</p>
              </div>
              <div className={clsx(
                'rounded-lg border px-4 py-3 text-center',
                isStampUploaded ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'
              )}>
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">สถานะอากรณ์แสตมป์</p>
                <p className={clsx(
                  'text-sm font-bold mt-0.5',
                  isStampUploaded ? 'text-emerald-700' : 'text-amber-600'
                )}>
                  {isStampUploaded ? 'อัพโหลดแล้ว' : 'รอการอัพโหลด'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Upload Status */}
        {isStampUploaded && (
          <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-emerald-800">
                เอกสารอากรณ์แสตมป์ได้ถูกอัพโหลดแล้ว
              </p>
              <p className="text-xs text-emerald-600 mt-0.5">
                อัพโหลดเมื่อ: {new Date(coa.stampUploadedAt).toLocaleDateString('th-TH', { 
                  year: 'numeric', month: 'long', day: 'numeric', 
                  hour: '2-digit', minute: '2-digit' 
                })}
              </p>
            </div>
          </div>
        )}

        {!isStampUploaded && (
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <AlertTriangle size={18} className="text-amber-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-800">
                กรุณาอัพโหลดเอกสารอากรณ์แสตมป์
              </p>
              <p className="text-xs text-amber-600 mt-0.5">
                การอัพโหลดเอกสารนี้จะเป็นการเสร็จสิ้นขั้นตอนการอนุมัติ COA
              </p>
            </div>
          </div>
        )}

        {/* Upload Form */}
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2 block">
              เอกสารอากรณ์แสตมป์ <span className="text-rose-500">*</span>
            </label>
            <AttachmentField
              value={form.stampDocument}
              onChange={v => set('stampDocument', v)}
              folder="coa-stamps"
              docId={coa.id}
              uploadedBy={currentUser?.id}
              placeholder="อัพโหลดเอกสารอากรณ์แสตมป์ (PDF, JPG, PNG)"
              accept=".pdf,.jpg,.jpeg,.png"
              error={errors.stampDocument}
            />
            {errors.stampDocument && (
              <p className="text-xs text-rose-500 mt-1">{errors.stampDocument}</p>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2 block">
              หมายเหตุเพิ่มเติม
            </label>
            <textarea
              rows={3}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400"
              placeholder="หมายเหตุเกี่ยวกับเอกสารอากรณ์แสตมป์ (ถ้ามี)..."
              value={form.note}
              onChange={e => set('note', e.target.value)}
            />
          </div>
        </div>

        {/* Current Document Display (if exists) */}
        {isStampUploaded && coa.stampDocument && (
          <div className="bg-slate-50 rounded-lg border border-slate-200 px-4 py-3">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">
              เอกสารปัจจุบัน
            </p>
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-slate-400" />
              <a 
                href={coa.stampDocument} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                {coa.stampDocument.split('/').pop() || 'ดูเอกสาร'}
              </a>
            </div>
            {coa.stampNote && (
              <p className="text-xs text-slate-500 mt-2 italic">"{coa.stampNote}"</p>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-slate-100">
        <Button variant="secondary" onClick={onClose}>ยกเลิก</Button>
        <Button 
          variant="primary" 
          icon={Upload} 
          loading={saving} 
          onClick={handleSubmit}
          disabled={isStampUploaded && !form.stampDocument}
        >
          {isStampUploaded ? 'อัพเดตเอกสาร' : 'อัพโหลดเอกสาร'}
        </Button>
      </div>
    </Modal>
  )
}
