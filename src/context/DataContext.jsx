import { createContext, useContext, useState, useEffect } from 'react'
import {
  collection, doc, onSnapshot, setDoc, updateDoc,
  deleteDoc, writeBatch,
} from 'firebase/firestore'
import { db } from '../firebase'
import { seedFirestore } from '../seedFirestore'

const ROOT = 'CMG-payment-system/root'
const col = (name) => collection(db, `${ROOT}/${name}`)
const docRef = (name, id) => doc(db, `${ROOT}/${name}/${id}`)

/* ─── kept only as fallback for first-run seed detection ─── */
const INITIAL_PROJECTS = [
  {
    id: 'p1',
    // Part 1: General
    name: 'Central Plaza Office Tower',
    location: 'Bangkok, Sukhumvit Rd.',
    pmId: 'u4',
    cm: 'Chalee Nontri',
    mainContractor: 'CMG Construction Co., Ltd.',
    subContractor: 'ElectroPower Thailand',
    clientName: 'Central Property Group',
    // Part 2: Contract
    contractNo: 'CMG-2024-001',
    poNo: 'PO-CP-2024-88',
    contractValue: 85000000,
    contractAttachment: 'contract_cp_001.pdf',
    startDate: '2024-01-15',
    finishDate: '2025-06-30',
    contractType: 'Lump Sum',
    retentionRequired: true,
    retentionPercent: 5,
    contractNote: 'Phased handover. Phase 1 by March 2025.',
    // Part 3: Bank Bond
    performanceBond: {
      percent: 5, value: 4250000, bankName: 'Bangkok Bank',
      attachment: 'perf_bond_p1.pdf', startDate: '2024-01-15', endDate: '2025-09-30', note: 'Renewable annually',
    },
    advanceBond: {
      percent: 10, value: 8500000, bankName: 'Kasikorn Bank',
      attachment: 'adv_bond_p1.pdf', startDate: '2024-01-15', endDate: '2024-07-15', note: 'Released upon 50% completion',
    },
    warrantyBond: {
      percent: 2.5, value: 2125000, bankName: 'SCB Bank',
      attachment: 'war_bond_p1.pdf', startDate: '2025-06-30', endDate: '2027-06-30', note: '2-year warranty period',
    },
    // Part 4: Insurance
    insurances: [
      { id: 'ins1', no: 'INS-001', name: 'Construction All Risk', detail: 'Full project coverage', type: 'CAR', note: '' },
      { id: 'ins2', no: 'INS-002', name: 'Third Party Liability', detail: 'Up to 10M THB', type: 'TPL', note: '' },
      { id: 'ins3', no: 'INS-003', name: 'Workmen Compensation', detail: 'All site workers', type: 'WC', note: '' },
    ],
    // Part 5: Tax Record
    taxPay: 'Tax Invoice CMG-2024-001-TX',
    taxStatusPay: 'Complete pay',
    taxNote: 'Withholding tax 3% deducted at source',
    // Part 6: Conditions
    contractPenalty: '0.1% of contract value per day, max 10%',
    otherConditions: 'Liquidated damages apply for delays beyond schedule',
    conditionNote: '',
    createdAt: '2024-01-10',
    status: 'Active',
  },
  {
    id: 'p2',
    name: 'Riverside Condominium Phase 2',
    location: 'Chiang Mai, Nimman Area',
    pmId: 'u4',
    cm: 'Wanchai Pradit',
    mainContractor: 'CMG Construction Co., Ltd.',
    subContractor: 'NorthBuild Mechanical',
    clientName: 'Riverside Development Co.',
    contractNo: 'CMG-2024-002',
    poNo: 'PO-RD-2024-12',
    contractValue: 42000000,
    contractAttachment: 'contract_rd_002.pdf',
    startDate: '2024-03-01',
    finishDate: '2025-08-31',
    contractType: 'Unit Rate',
    retentionRequired: true,
    retentionPercent: 5,
    contractNote: '',
    performanceBond: {
      percent: 5, value: 2100000, bankName: 'Krungthai Bank',
      attachment: 'perf_bond_p2.pdf', startDate: '2024-03-01', endDate: '2025-11-30', note: '',
    },
    advanceBond: {
      percent: 10, value: 4200000, bankName: 'Kasikorn Bank',
      attachment: 'adv_bond_p2.pdf', startDate: '2024-03-01', endDate: '2024-09-01', note: '',
    },
    warrantyBond: {
      percent: 2.5, value: 1050000, bankName: 'Bangkok Bank',
      attachment: 'war_bond_p2.pdf', startDate: '2025-08-31', endDate: '2027-08-31', note: '',
    },
    insurances: [
      { id: 'ins4', no: 'INS-001', name: 'Construction All Risk', detail: 'Full project coverage', type: 'CAR', note: '' },
      { id: 'ins5', no: 'INS-002', name: 'Third Party Liability', detail: 'Up to 5M THB', type: 'TPL', note: '' },
      { id: 'ins6', no: '', name: '', detail: '', type: '', note: '' },
    ],
    taxPay: 'Tax Invoice CMG-2024-002-TX',
    taxStatusPay: 'Not yet',
    taxNote: '',
    contractPenalty: '0.05% per day, max 5%',
    otherConditions: '',
    conditionNote: '',
    createdAt: '2024-02-20',
    status: 'Active',
  },
  {
    id: 'p3',
    name: 'Industrial Warehouse Complex',
    location: 'Rayong, Eastern Seaboard',
    pmId: 'u5',
    cm: 'Chalee Nontri',
    mainContractor: 'CMG Construction Co., Ltd.',
    subContractor: 'SteelForm Industrial',
    clientName: 'EastPak Logistics Ltd.',
    contractNo: 'CMG-2023-009',
    poNo: 'PO-EP-2023-55',
    contractValue: 120000000,
    contractAttachment: 'contract_ep_009.pdf',
    startDate: '2023-09-01',
    finishDate: '2025-03-31',
    contractType: 'Lump Sum',
    retentionRequired: true,
    retentionPercent: 10,
    contractNote: 'Fast-track project. Penalties strictly enforced.',
    performanceBond: {
      percent: 10, value: 12000000, bankName: 'SCB Bank',
      attachment: 'perf_bond_p3.pdf', startDate: '2023-09-01', endDate: '2025-06-30', note: '',
    },
    advanceBond: {
      percent: 15, value: 18000000, bankName: 'Bangkok Bank',
      attachment: 'adv_bond_p3.pdf', startDate: '2023-09-01', endDate: '2024-03-01', note: 'Already released',
    },
    warrantyBond: {
      percent: 5, value: 6000000, bankName: 'Krungthai Bank',
      attachment: 'war_bond_p3.pdf', startDate: '2025-03-31', endDate: '2027-03-31', note: '',
    },
    insurances: [
      { id: 'ins7', no: 'INS-001', name: 'Construction All Risk', detail: 'Full coverage 120M', type: 'CAR', note: '' },
      { id: 'ins8', no: 'INS-002', name: 'Third Party Liability', detail: 'Up to 20M THB', type: 'TPL', note: '' },
      { id: 'ins9', no: 'INS-003', name: 'Workmen Compensation', detail: 'All workers on site', type: 'WC', note: '' },
    ],
    taxPay: 'Tax Invoice CMG-2023-009-TX',
    taxStatusPay: 'Complete pay',
    taxNote: '',
    contractPenalty: '0.1% per day, max 10%',
    otherConditions: 'Milestone-based penalties. See Annex B.',
    conditionNote: '',
    createdAt: '2023-08-15',
    status: 'Active',
  },
]

const INITIAL_BOND_STATUSES = [
  {
    id: 'bs1', projectId: 'p1',
    advanceBond:     { status: 'Submitted',   submitDate: '2024-01-20', note: 'Submitted to client on time' },
    performanceBond: { status: 'Submitted',   submitDate: '2024-01-20', note: '' },
    warrantyBond:    { status: 'Not finish',  submitDate: '',           note: 'Pending project handover' },
  },
  {
    id: 'bs2', projectId: 'p2',
    advanceBond:     { status: 'Submitted',   submitDate: '2024-03-05', note: '' },
    performanceBond: { status: 'Submitted',   submitDate: '2024-03-05', note: '' },
    warrantyBond:    { status: 'Not finish',  submitDate: '',           note: '' },
  },
  {
    id: 'bs3', projectId: 'p3',
    advanceBond:     { status: 'N/A',         submitDate: '',           note: 'Already released per contract' },
    performanceBond: { status: 'Submitted',   submitDate: '2023-09-10', note: '' },
    warrantyBond:    { status: 'Not finish',  submitDate: '',           note: '' },
  },
]

const INITIAL_PAYMENTS = [
  {
    id: 'pay1', projectId: 'p1', type: 'main',
    paymentNo: 'PMT-P1-001', detail: 'Progress claim #1 – Foundation works complete',
    value: 8500000, advanceDeduction: 850000, retentionReduce: 382500,
    balanceValue: 7267500,
    attachment: 'claim_p1_001.pdf', note: 'Foundation + piling complete',
    status: 'Received',
    createdBy: 'u6', createdAt: '2024-03-01',
    invoiceNo: 'INV-P1-2024-001', invoiceDueDate: '2024-04-01', invoiceNote: '',
    invoiceSubmittedAt: '2024-03-05',
    receivedDate: '2024-04-02', receivedAttachment: 'receipt_p1_001.pdf', receivedNote: '',
    receivedBy: 'u8', receivedAt: '2024-04-02',
  },
  {
    id: 'pay2', projectId: 'p1', type: 'main',
    paymentNo: 'PMT-P1-002', detail: 'Progress claim #2 – Structure Level 1-5',
    value: 12750000, advanceDeduction: 1275000, retentionReduce: 573750,
    balanceValue: 10901250,
    attachment: 'claim_p1_002.pdf', note: '',
    status: 'Submitted',
    createdBy: 'u6', createdAt: '2024-05-10',
    invoiceNo: 'INV-P1-2024-002', invoiceDueDate: '2024-06-10', invoiceNote: 'Urgent – please process',
    invoiceSubmittedAt: '2024-05-15',
    receivedDate: null, receivedAttachment: null, receivedNote: null,
    receivedBy: null, receivedAt: null,
  },
  {
    id: 'pay3', projectId: 'p2', type: 'main',
    paymentNo: 'PMT-P2-001', detail: 'Progress claim #1 – Site preparation & substructure',
    value: 5000000, advanceDeduction: 500000, retentionReduce: 225000,
    balanceValue: 4275000,
    attachment: 'claim_p2_001.pdf', note: '',
    status: 'In Progress',
    createdBy: 'u6', createdAt: '2024-06-01',
    invoiceNo: null, invoiceDueDate: null, invoiceNote: null,
    invoiceSubmittedAt: null,
    receivedDate: null, receivedAttachment: null, receivedNote: null,
    receivedBy: null, receivedAt: null,
  },
  {
    id: 'pay4', projectId: 'p3', type: 'main',
    paymentNo: 'PMT-P3-001', detail: 'Progress claim #1 – Civil & earthworks',
    value: 18000000, advanceDeduction: 2700000, retentionReduce: 1530000,
    balanceValue: 13770000,
    attachment: 'claim_p3_001.pdf', note: '',
    status: 'Received',
    createdBy: 'u7', createdAt: '2024-01-15',
    invoiceNo: 'INV-P3-2024-001', invoiceDueDate: '2024-02-15', invoiceNote: '',
    invoiceSubmittedAt: '2024-01-20',
    receivedDate: '2024-02-18', receivedAttachment: 'receipt_p3_001.pdf', receivedNote: '',
    receivedBy: 'u8', receivedAt: '2024-02-18',
  },
]

const INITIAL_CORS = [
  {
    id: 'cor1', projectId: 'p1',
    corNo: 'COR-P1-001', detail: 'Additional MEP works – revised design for Level 6-10',
    reason: 'Design change by client after initial approval',
    value: 3200000, submitDate: '2024-04-15', expectedApprovalDate: '2024-05-15',
    status: 'Submitted', note: 'Awaiting client sign-off',
    createdBy: 'u6', createdAt: '2024-04-15',
    convertedToCOA: true, coaId: 'coa1',
  },
  {
    id: 'cor2', projectId: 'p1',
    corNo: 'COR-P1-002', detail: 'Facade cladding material upgrade – aluminium composite to glass curtain wall',
    reason: 'Client requested premium finish',
    value: 5800000, submitDate: '2024-06-01', expectedApprovalDate: '2024-07-01',
    status: 'Prepare doc', note: 'Cost estimate under review',
    createdBy: 'u6', createdAt: '2024-06-01',
    convertedToCOA: false, coaId: null,
  },
  {
    id: 'cor3', projectId: 'p3',
    corNo: 'COR-P3-001', detail: 'Roof drainage system redesign due to soil survey findings',
    reason: 'Unforeseen site condition',
    value: 1500000, submitDate: '2024-02-10', expectedApprovalDate: '2024-03-10',
    status: 'Submitted', note: '',
    createdBy: 'u7', createdAt: '2024-02-10',
    convertedToCOA: true, coaId: 'coa2',
  },
]

const INITIAL_COAS = [
  {
    id: 'coa1', projectId: 'p1', corId: 'cor1',
    coaNo: 'COA-P1-001', description: 'Approved additional MEP works – Level 6-10',
    value: 3200000, attachment: 'coa_p1_001.pdf', note: 'Approved by client 20 May 2024',
    approvedBy: 'u4', approvedAt: '2024-05-20',
  },
  {
    id: 'coa2', projectId: 'p3', corId: 'cor3',
    coaNo: 'COA-P3-001', description: 'Approved roof drainage redesign',
    value: 1500000, attachment: 'coa_p3_001.pdf', note: 'Client signed off 15 March 2024',
    approvedBy: 'u5', approvedAt: '2024-03-15',
  },
]

const DataContext = createContext(null)

export function DataProvider({ children }) {
  const [projects,     setProjects]     = useState([])
  const [bondStatuses, setBondStatuses] = useState([])
  const [payments,     setPayments]     = useState([])
  const [cors,         setCors]         = useState([])
  const [coas,         setCoas]         = useState([])
  const [loading,      setLoading]      = useState(true)
  const [seeded,       setSeeded]       = useState(false)

  // ── Real-time listeners ──────────────────────────────────────────────────
  useEffect(() => {
    let loadCount = 0
    const total = 5
    const done = () => { loadCount++; if (loadCount >= total) setLoading(false) }

    const snapshot = (colName, setter) =>
      onSnapshot(col(colName), snap => {
        setter(snap.docs.map(d => ({ ...d.data(), id: d.id })))
        done()
      }, err => { console.error(`Firestore ${colName}:`, err); done() })

    const unsubProjects     = snapshot('projects',     setProjects)
    const unsubBonds        = snapshot('bondStatuses', setBondStatuses)
    const unsubPayments     = snapshot('payments',     setPayments)
    const unsubCORs         = snapshot('cors',         setCors)
    const unsubCOAs         = snapshot('coas',         setCoas)

    return () => {
      unsubProjects(); unsubBonds(); unsubPayments(); unsubCORs(); unsubCOAs()
    }
  }, [])

  // ── Auto-seed on first load if Firestore is empty ────────────────────────
  useEffect(() => {
    if (!loading && !seeded && projects.length === 0) {
      setSeeded(true)
      seedFirestore()
    }
  }, [loading, projects.length, seeded])

  // ── Projects ─────────────────────────────────────────────────────────────
  const addProject = async (project) => {
    const today = new Date().toISOString().split('T')[0]
    const id = `p${Date.now()}`
    const newProject = { ...project, id, createdAt: today, status: 'Active' }
    await setDoc(docRef('projects', id), newProject)

    const bsId = `bs${Date.now()}`
    await setDoc(docRef('bondStatuses', bsId), {
      id: bsId, projectId: id,
      advanceBond:     { status: 'Not finish', submitDate: '', note: '' },
      performanceBond: { status: 'Not finish', submitDate: '', note: '' },
      warrantyBond:    { status: 'Not finish', submitDate: '', note: '' },
    })
    return newProject
  }

  const updateProject = async (id, updates) => {
    await updateDoc(docRef('projects', id), updates)
  }

  const deleteProject = async (id) => {
    await deleteDoc(docRef('projects', id))
  }

  const getProject = (id) => projects.find(p => p.id === id)

  // ── Bond Statuses ─────────────────────────────────────────────────────────
  const getBondStatus = (projectId) => bondStatuses.find(b => b.projectId === projectId)

  const updateBondStatus = async (projectId, updates) => {
    const bs = bondStatuses.find(b => b.projectId === projectId)
    if (bs) await updateDoc(docRef('bondStatuses', bs.id), updates)
  }

  // ── Payments ──────────────────────────────────────────────────────────────
  const getProjectPayments = (projectId, type = null) =>
    payments.filter(p => p.projectId === projectId && (type ? p.type === type : true))

  const addPayment = async (payment) => {
    const today = new Date().toISOString().split('T')[0]
    const id = `pay${Date.now()}`
    const newPayment = { ...payment, id, createdAt: today }
    await setDoc(docRef('payments', id), newPayment)
    return newPayment
  }

  const updatePayment = async (id, updates) => {
    await updateDoc(docRef('payments', id), updates)
  }

  // ── CORs ──────────────────────────────────────────────────────────────────
  const getProjectCORs = (projectId) => cors.filter(c => c.projectId === projectId)

  const addCOR = async (cor) => {
    const today = new Date().toISOString().split('T')[0]
    const id = `cor${Date.now()}`
    const newCOR = { ...cor, id, createdAt: today, convertedToCOA: false, coaId: null }
    await setDoc(docRef('cors', id), newCOR)
    return newCOR
  }

  const updateCOR = async (id, updates) => {
    await updateDoc(docRef('cors', id), updates)
  }

  // ── COAs ──────────────────────────────────────────────────────────────────
  const getProjectCOAs = (projectId) => coas.filter(c => c.projectId === projectId)

  const addCOA = async (coa) => {
    const today = new Date().toISOString().split('T')[0]
    const id = `coa${Date.now()}`
    const newCOA = { ...coa, id, approvedAt: today }
    const batch = writeBatch(db)
    batch.set(docRef('coas', id), newCOA)
    batch.update(docRef('cors', coa.corId), { convertedToCOA: true, coaId: id })
    await batch.commit()
    return newCOA
  }

  return (
    <DataContext.Provider value={{
      loading,
      projects, addProject, updateProject, deleteProject, getProject,
      bondStatuses, getBondStatus, updateBondStatus,
      payments, getProjectPayments, addPayment, updatePayment,
      cors, getProjectCORs, addCOR, updateCOR,
      coas, getProjectCOAs, addCOA,
    }}>
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used within DataProvider')
  return ctx
}
