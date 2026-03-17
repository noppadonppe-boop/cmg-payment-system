import { useRef, useState } from 'react'
import { Paperclip, Upload, Loader2 } from 'lucide-react'
import { Input } from './FormField'
import { uploadFile, isAttachmentUrl, attachmentDisplayName } from '../../lib/uploadFile'

/**
 * Input + Upload button for attachment. Value can be URL (after upload) or plain text.
 * @param {string} value - Current value (URL or filename)
 * @param {function} onChange - (newValue) => void
 * @param {string} folder - Storage folder (e.g. 'contracts', 'payments', 'bonds')
 * @param {string} docId - Optional doc id for path
 * @param {string} uploadedBy - Optional user id for Firestore record
 * @param {string} placeholder - Input placeholder
 * @param {object} inputProps - Extra props for the input
 */
export function AttachmentField({
  value,
  onChange,
  folder = 'general',
  docId = '',
  uploadedBy = '',
  placeholder = 'Filename or URL',
  error,
  className = '',
  ...inputProps
}) {
  const fileRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')

  const handleUploadClick = () => {
    fileRef.current?.click()
  }

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setUploadError('')
    setUploading(true)
    try {
      const { url } = await uploadFile(file, { folder, docId, uploadedBy })
      onChange(url)
    } catch (err) {
      setUploadError(err?.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className={className}>
      <div className="flex items-center gap-2">
        <Input
          placeholder={placeholder}
          value={value}
          onChange={e => { onChange(e.target.value); setUploadError('') }}
          error={error || uploadError}
          className="flex-1"
          {...inputProps}
        />
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          onChange={handleFileChange}
          accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif"
        />
        <button
          type="button"
          onClick={handleUploadClick}
          disabled={uploading}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-medium transition-colors shrink-0 disabled:opacity-50"
        >
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          {uploading ? 'Uploading…' : 'Upload'}
        </button>
      </div>
      {uploadError && <p className="text-xs text-rose-500 mt-1">{uploadError}</p>}
    </div>
  )
}

/**
 * Display attachment as clickable link (open in new tab) if URL, else plain text.
 */
export function AttachmentLink({ value, className = '' }) {
  if (!value) return null
  const display = attachmentDisplayName(value)
  const url = isAttachmentUrl(value)
  if (url) {
    return (
      <a
        href={value}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center gap-1 text-blue-600 hover:underline text-sm ${className}`}
      >
        <Paperclip size={12} />
        {display}
      </a>
    )
  }
  return (
    <span className={`inline-flex items-center gap-1 text-slate-600 text-sm ${className}`}>
      <Paperclip size={12} />
      {display}
    </span>
  )
}
