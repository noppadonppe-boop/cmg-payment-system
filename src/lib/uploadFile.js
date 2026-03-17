import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { storage, db } from '../firebase'

const ROOT = 'CMG-payment-system/root'

/**
 * Sanitize filename for storage path (remove path chars, keep extension)
 */
function sanitizeFileName(name) {
  const base = name.replace(/^.*[/\\]/, '').replace(/[^\w.\-]/g, '_')
  return base.slice(0, 200) || 'file'
}

/**
 * Upload a file to Firebase Storage and record metadata in Firestore.
 * @param {File} file - The file to upload
 * @param {Object} options - { folder: string, docId?: string, uploadedBy?: string }
 * @returns {Promise<{ url: string, fileName: string }>} - Download URL and original filename
 */
export async function uploadFile(file, options = {}) {
  const { folder = 'general', docId = '', uploadedBy = '' } = options
  const safeName = sanitizeFileName(file.name)
  const path = `uploads/${folder}/${docId || 'temp'}/${Date.now()}_${safeName}`
  const storageRef = ref(storage, path)

  await new Promise((resolve, reject) => {
    const task = uploadBytesResumable(storageRef, file)
    task.on(
      'state_changed',
      () => {},
      reject,
      () => resolve()
    )
  })

  const url = await getDownloadURL(storageRef)

  try {
    await addDoc(collection(db, ROOT, 'uploads'), {
      url,
      fileName: file.name,
      path,
      folder,
      docId: docId || null,
      uploadedBy: uploadedBy || null,
      uploadedAt: serverTimestamp(),
    })
  } catch (e) {
    console.warn('Upload record to Firestore failed:', e)
  }

  return { url, fileName: file.name }
}

/**
 * Check if a value looks like a URL (for showing as clickable link)
 */
export function isAttachmentUrl(value) {
  if (!value || typeof value !== 'string') return false
  return value.startsWith('http://') || value.startsWith('https://')
}

/**
 * Display label for attachment (filename from URL or raw value)
 */
export function attachmentDisplayName(value) {
  if (!value) return ''
  if (isAttachmentUrl(value)) {
    try {
      const u = new URL(value)
      const seg = u.pathname.split('/').filter(Boolean).pop()
      return decodeURIComponent(seg || value)
    } catch {
      return value
    }
  }
  return value
}
