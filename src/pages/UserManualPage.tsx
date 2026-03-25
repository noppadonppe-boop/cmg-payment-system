import { useState } from 'react'
import {
  BookOpen, Users, GitBranch, LayoutDashboard, FolderOpen,
  Shield, CreditCard, GitPullRequest, BarChart3, UserCog,
  CheckCircle2, Clock, Send, AlertCircle, ChevronRight,
  ArrowRight, Banknote, FileText, RefreshCw, Lock,
  Eye, Settings, Info, Building2, XCircle
} from 'lucide-react'
import { clsx } from 'clsx'

/* ─── Types ──────────────────────────────────────────────────────────────── */
type TabId = 'overview' | 'roles' | 'sidebar' | 'workflow'

/* ─── Roles data ─────────────────────────────────────────────────────────── */
const ROLES = [
  {
    role: 'SuperAdmin',
    label: 'Super Admin',
    color: 'bg-purple-100 text-purple-700 border-purple-200',
    dot: 'bg-purple-500',
    desc: 'ผู้ดูแลระบบสูงสุด มีสิทธิ์ทุกอย่าง',
    canManageProjects: true,
    canApprovePayments: true,
    canConvertCOR: true,
    canUpdateBonds: true,
    canCreateClaims: true,
    globalView: true,
  },
  {
    role: 'Admin',
    label: 'Admin',
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    dot: 'bg-blue-500',
    desc: 'ผู้ดูแลระบบ จัดการ Users และข้อมูลทั้งหมด',
    canManageProjects: true,
    canApprovePayments: true,
    canConvertCOR: true,
    canUpdateBonds: true,
    canCreateClaims: true,
    globalView: true,
  },
  {
    role: 'MD',
    label: 'MD',
    color: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    dot: 'bg-indigo-500',
    desc: 'Managing Director — ดูภาพรวมทุกโปรเจกต์',
    canManageProjects: true,
    canApprovePayments: false,
    canConvertCOR: false,
    canUpdateBonds: false,
    canCreateClaims: false,
    globalView: true,
  },
  {
    role: 'GM',
    label: 'GM',
    color: 'bg-sky-100 text-sky-700 border-sky-200',
    dot: 'bg-sky-500',
    desc: 'General Manager — ดูภาพรวมทุกโปรเจกต์',
    canManageProjects: true,
    canApprovePayments: false,
    canConvertCOR: false,
    canUpdateBonds: false,
    canCreateClaims: false,
    globalView: true,
  },
  {
    role: 'CD',
    label: 'CD',
    color: 'bg-cyan-100 text-cyan-700 border-cyan-200',
    dot: 'bg-cyan-500',
    desc: 'Contract Director — ดูภาพรวมทุกโปรเจกต์',
    canManageProjects: true,
    canApprovePayments: false,
    canConvertCOR: false,
    canUpdateBonds: false,
    canCreateClaims: false,
    globalView: true,
  },
  {
    role: 'PM',
    label: 'PM',
    color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
    desc: 'Project Manager — จัดการและอนุมัติ Payment ของโปรเจกต์ที่รับผิดชอบ',
    canManageProjects: true,
    canApprovePayments: true,
    canConvertCOR: true,
    canUpdateBonds: false,
    canCreateClaims: false,
    globalView: false,
  },
  {
    role: 'CM',
    label: 'CM',
    color: 'bg-teal-100 text-teal-700 border-teal-200',
    dot: 'bg-teal-400',
    desc: 'Contract Manager — ดูข้อมูลโปรเจกต์ที่ได้รับมอบหมาย',
    canManageProjects: false,
    canApprovePayments: false,
    canConvertCOR: false,
    canUpdateBonds: false,
    canCreateClaims: false,
    globalView: false,
  },
  {
    role: 'QsEng',
    label: 'QS Engineer',
    color: 'bg-amber-100 text-amber-700 border-amber-200',
    dot: 'bg-amber-500',
    desc: 'Quantity Surveyor — สร้าง Payment Claim และ Change Order',
    canManageProjects: false,
    canApprovePayments: false,
    canConvertCOR: false,
    canUpdateBonds: false,
    canCreateClaims: true,
    globalView: false,
  },
  {
    role: 'AccCMG',
    label: 'Accounting',
    color: 'bg-rose-100 text-rose-700 border-rose-200',
    dot: 'bg-rose-500',
    desc: 'Accounting CMG — อัปเดต Bond Status และดูภาพรวม',
    canManageProjects: false,
    canApprovePayments: false,
    canConvertCOR: false,
    canUpdateBonds: true,
    canCreateClaims: false,
    globalView: true,
  },
]

const PERM_COLUMNS = [
  { key: 'canManageProjects',  label: 'จัดการ Projects',   icon: FolderOpen  },
  { key: 'canApprovePayments', label: 'อนุมัติ Payment',   icon: CheckCircle2 },
  { key: 'canConvertCOR',      label: 'Convert COR→COA',   icon: GitPullRequest },
  { key: 'canUpdateBonds',     label: 'อัปเดต Bond',       icon: Shield      },
  { key: 'canCreateClaims',    label: 'สร้าง Claim/COR',   icon: FileText    },
  { key: 'globalView',         label: 'ดูทุกโปรเจกต์',    icon: Eye         },
] as const

/* ─── Sidebar menu data ──────────────────────────────────────────────────── */
const SIDEBAR_ITEMS = [
  {
    icon: LayoutDashboard,
    label: 'Dashboard',
    path: '/dashboard',
    color: 'text-blue-600 bg-blue-50',
    desc: 'ภาพรวมสถานะระบบ — มูลค่าสัญญา, Payment รอดำเนินการ, COR ที่ยังเปิดอยู่ และรายการ Payment ล่าสุด',
    roles: 'ทุก Role',
    features: ['สรุปมูลค่าสัญญารวม', 'Payment ที่รอดำเนินการ', 'COR ที่ยังไม่ปิด', 'ตาราง Recent Payments'],
  },
  {
    icon: FolderOpen,
    label: 'Projects',
    path: '/projects',
    color: 'text-emerald-600 bg-emerald-50',
    desc: 'รายการโปรเจกต์ทั้งหมดที่มีสิทธิ์เข้าถึง — สร้าง, แก้ไข, ดูรายละเอียดโปรเจกต์',
    roles: 'ทุก Role (PM/CM เห็นเฉพาะโปรเจกต์ที่ได้รับมอบหมาย)',
    features: ['ค้นหา/กรองโปรเจกต์', 'สร้างโปรเจกต์ใหม่ (canManageProjects)', 'ดูรายละเอียด + ประวัติ Payment', 'แก้ไข/ลบโปรเจกต์'],
  },
  {
    icon: Shield,
    label: 'Bank Bonds',
    path: '/bonds',
    color: 'text-purple-600 bg-purple-50',
    desc: 'ติดตามสถานะ Bank Bond ทุกประเภท — Performance Bond, Advance Bond, Warranty Bond',
    roles: 'ทุก Role ยกเว้น QsEng',
    features: ['Performance Bond', 'Advance Bond', 'Warranty Bond', 'อัปเดตสถานะได้ (canUpdateBonds = AccCMG, Admin, SuperAdmin)'],
  },
  {
    icon: CreditCard,
    label: 'Payments',
    path: '/payments',
    color: 'text-indigo-600 bg-indigo-50',
    desc: 'จัดการ Payment Claim ทั้งหมด — สร้าง, ติดตาม, อนุมัติ, และบันทึกการรับเงิน',
    roles: 'ทุก Role',
    features: ['สร้าง Payment Claim (QsEng)', 'อนุมัติ/ปฏิเสธ (PM, Admin)', 'ส่ง Invoice (PM)', 'บันทึก Received (AccCMG, Admin)'],
  },
  {
    icon: GitPullRequest,
    label: 'Change Orders',
    path: '/change-orders',
    color: 'text-amber-600 bg-amber-50',
    desc: 'จัดการ Change Order Request (COR) และ Change Order Agreement (COA)',
    roles: 'ทุก Role',
    features: ['สร้าง COR (QsEng)', 'แปลง COR → COA (PM, Admin)', 'COA Payment tracking', 'ดู COR/COA history'],
  },
  {
    icon: BarChart3,
    label: 'Reports',
    path: '/reports',
    color: 'text-rose-600 bg-rose-50',
    desc: 'รายงานและกราฟวิเคราะห์ — Contract vs Payment, COA vs Payment, Follow-up Tracker',
    roles: 'ทุก Role',
    features: ['Contract vs Payment chart', 'COA vs Payment chart', 'Follow-up Tracker', 'กรองตามโปรเจกต์'],
  },
  {
    icon: UserCog,
    label: 'User Management',
    path: '/admin',
    color: 'text-slate-600 bg-slate-100',
    desc: 'จัดการผู้ใช้งานระบบ — อนุมัติ User, กำหนด Role, มอบหมายโปรเจกต์',
    roles: 'SuperAdmin, Admin เท่านั้น',
    features: ['อนุมัติ/ปฏิเสธ User ใหม่', 'กำหนด Role (multi-role ได้)', 'มอบหมายโปรเจกต์ให้ PM/CM', 'จัดการข้อมูล User'],
  },
]

/* ─── Workflow steps ─────────────────────────────────────────────────────── */
type StepStatus = 'start' | 'process' | 'approve' | 'reject' | 'done'

interface WorkflowStep {
  label: string
  desc: string
  by: string
  status: StepStatus
  badge?: string
  badgeColor?: string
}

const PAYMENT_WORKFLOW: WorkflowStep[] = [
  { label: 'สร้าง Payment Claim',    desc: 'QS Engineer กรอกข้อมูล Payment Claim พร้อมแนบเอกสาร',                   by: 'QsEng',            status: 'start',   badge: 'In Progress', badgeColor: 'bg-amber-100 text-amber-700' },
  { label: 'PM Review & Approve',    desc: 'PM ตรวจสอบและอนุมัติ — หากไม่ผ่านจะ Reject กลับให้แก้ไข',              by: 'PM / Admin',       status: 'approve', badge: 'Submitted',   badgeColor: 'bg-blue-100 text-blue-700'   },
  { label: 'ส่ง Invoice',            desc: 'PM ส่ง Invoice ให้ลูกค้า หลัง Approve แล้ว',                           by: 'PM / Admin',       status: 'process', badge: 'Submitted',   badgeColor: 'bg-blue-100 text-blue-700'   },
  { label: 'บันทึกการรับเงิน',       desc: 'Accounting บันทึกเมื่อได้รับเงินจากลูกค้าแล้ว',                       by: 'AccCMG / Admin',   status: 'done',    badge: 'Received',    badgeColor: 'bg-emerald-100 text-emerald-700' },
]

const COR_WORKFLOW: WorkflowStep[] = [
  { label: 'สร้าง COR',             desc: 'QS Engineer สร้าง Change Order Request พร้อมมูลค่าที่เรียกร้อง',       by: 'QsEng',            status: 'start',   badge: 'Prepare Doc', badgeColor: 'bg-slate-100 text-slate-700' },
  { label: 'Submit COR',            desc: 'ส่ง COR ให้ PM พิจารณา',                                               by: 'QsEng / PM',       status: 'process', badge: 'Submitted',   badgeColor: 'bg-blue-100 text-blue-700'   },
  { label: 'Convert COR → COA',     desc: 'PM แปลง COR ที่อนุมัติแล้วเป็น COA (Change Order Agreement)',          by: 'PM / Admin',       status: 'approve', badge: 'COA',         badgeColor: 'bg-purple-100 text-purple-700' },
  { label: 'COA Payment',           desc: 'สร้าง Payment สำหรับ COA และติดตามการชำระเงิน',                       by: 'PM / AccCMG',      status: 'done',    badge: 'Received',    badgeColor: 'bg-emerald-100 text-emerald-700' },
]

const BOND_WORKFLOW: WorkflowStep[] = [
  { label: 'โปรเจกต์เริ่มต้น',      desc: 'เมื่อสร้างโปรเจกต์ Bond Status จะถูกสร้างอัตโนมัติ',                 by: 'Admin / PM',       status: 'start',   badge: 'Not finish',  badgeColor: 'bg-amber-100 text-amber-700' },
  { label: 'อัปเดตสถานะ Bond',      desc: 'Accounting อัปเดตสถานะ Performance / Advance / Warranty Bond',        by: 'AccCMG / Admin',   status: 'process', badge: 'In Progress', badgeColor: 'bg-blue-100 text-blue-700'   },
  { label: 'Bond Submitted',        desc: 'Bond ถูกส่ง/คืนเรียบร้อย บันทึกวันที่และเอกสารอ้างอิง',              by: 'AccCMG / Admin',   status: 'done',    badge: 'Submitted',   badgeColor: 'bg-emerald-100 text-emerald-700' },
]

const USER_WORKFLOW: WorkflowStep[] = [
  { label: 'สมัครสมาชิก',           desc: 'ผู้ใช้ใหม่ลงทะเบียนผ่านหน้า Register ด้วย Email หรือ Google',         by: 'New User',         status: 'start',   badge: 'Pending',     badgeColor: 'bg-amber-100 text-amber-700' },
  { label: 'รออนุมัติ',             desc: 'Admin ตรวจสอบ และอนุมัติหรือปฏิเสธใน User Management',               by: 'Admin / SuperAdmin', status: 'process', badge: 'Pending',   badgeColor: 'bg-amber-100 text-amber-700' },
  { label: 'กำหนด Role',            desc: 'Admin กำหนด Role และมอบหมายโปรเจกต์ (กรณี PM/CM)',                   by: 'Admin / SuperAdmin', status: 'approve', badge: 'Approved',  badgeColor: 'bg-blue-100 text-blue-700'   },
  { label: 'เข้าใช้งานได้',         desc: 'ผู้ใช้เข้าสู่ระบบและเห็นเมนูตาม Role ที่ได้รับ',                   by: 'User',             status: 'done',    badge: 'Active',      badgeColor: 'bg-emerald-100 text-emerald-700' },
]

/* ─── Sub-components ─────────────────────────────────────────────────────── */
function PermCheck({ val }: { val: boolean }) {
  return val
    ? <CheckCircle2 size={16} className="text-emerald-500 mx-auto" />
    : <XCircle size={16} className="text-slate-200 mx-auto" />
}

function StepBadge({ status }: { status: StepStatus }) {
  const cfg: Record<StepStatus, string> = {
    start:   'bg-blue-600',
    process: 'bg-amber-500',
    approve: 'bg-purple-500',
    reject:  'bg-rose-500',
    done:    'bg-emerald-500',
  }
  return <span className={clsx('w-3 h-3 rounded-full shrink-0 mt-1', cfg[status])} />
}

function WorkflowCard({ steps, title, icon: Icon, color }: {
  steps: WorkflowStep[]
  title: string
  icon: React.ElementType
  color: string
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className={clsx('flex items-center gap-3 px-5 py-4 border-b border-slate-100', color)}>
        <Icon size={18} />
        <h3 className="font-semibold text-sm">{title}</h3>
      </div>
      <div className="p-5 space-y-0">
        {steps.map((step, i) => (
          <div key={i} className="flex gap-3">
            {/* Timeline */}
            <div className="flex flex-col items-center">
              <StepBadge status={step.status} />
              {i < steps.length - 1 && <div className="w-px flex-1 bg-slate-200 my-1" />}
            </div>
            {/* Content */}
            <div className={clsx('pb-5 min-w-0', i === steps.length - 1 && 'pb-0')}>
              <div className="flex flex-wrap items-center gap-2 mb-0.5">
                <span className="text-sm font-semibold text-slate-800">{step.label}</span>
                {step.badge && (
                  <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium', step.badgeColor)}>
                    {step.badge}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mb-1">{step.desc}</p>
              <span className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-0.5 rounded-md">
                โดย: {step.by}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── Tab content sections ───────────────────────────────────────────────── */
function OverviewSection() {
  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-white">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <Building2 size={24} />
          </div>
          <div>
            <h2 className="text-lg font-bold">CMG Payment Management System</h2>
            <p className="text-blue-200 text-sm mt-1">
              ระบบจัดการ Payment, Change Order และ Bank Bond สำหรับโปรเจกต์ก่อสร้าง CMG Engineering & Construction
            </p>
          </div>
        </div>
      </div>

      {/* Quick Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { icon: Users,        color: 'bg-purple-50 text-purple-600', title: '9 Roles',            desc: 'SuperAdmin, Admin, MD, GM, CD, PM, CM, QsEng, AccCMG' },
          { icon: LayoutDashboard, color: 'bg-blue-50 text-blue-600',  title: '7 หน้าหลัก',         desc: 'Dashboard, Projects, Bonds, Payments, Change Orders, Reports, Admin' },
          { icon: GitBranch,    color: 'bg-emerald-50 text-emerald-600', title: '4 Workflows',       desc: 'Payment, Change Order (COR→COA), Bank Bond, User Approval' },
          { icon: Lock,         color: 'bg-amber-50 text-amber-600',   title: 'Role-based Access',  desc: 'แต่ละ Role เห็นเมนูและทำได้ตามสิทธิ์ที่กำหนด' },
          { icon: Eye,          color: 'bg-rose-50 text-rose-600',     title: 'Project Access',     desc: 'PM/CM เห็นเฉพาะโปรเจกต์ที่ได้รับมอบหมาย' },
          { icon: RefreshCw,    color: 'bg-indigo-50 text-indigo-600', title: 'Real-time Data',     desc: 'ข้อมูลอัปเดต Live ผ่าน Firebase Firestore' },
        ].map(({ icon: Icon, color, title, desc }) => (
          <div key={title} className="bg-white border border-slate-200 rounded-xl p-4 flex gap-3">
            <div className={clsx('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', color)}>
              <Icon size={16} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">{title}</p>
              <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Getting Started */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5">
        <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <Info size={16} className="text-blue-600" />
          เริ่มต้นใช้งาน
        </h3>
        <div className="space-y-3">
          {[
            { step: '1', title: 'สมัครสมาชิก', desc: 'ไปที่หน้า Register กรอกข้อมูล ชื่อ-นามสกุล, Email, Password หรือเข้าด้วย Google' },
            { step: '2', title: 'รอ Admin อนุมัติ', desc: 'หลังสมัครจะอยู่ในสถานะ Pending — Admin ต้องอนุมัติและกำหนด Role ก่อน' },
            { step: '3', title: 'เข้าสู่ระบบ', desc: 'เมื่อได้รับอนุมัติ เข้าสู่ระบบได้ทันที เมนูที่เห็นจะตรงกับ Role ที่ได้รับ' },
            { step: '4', title: 'เริ่มทำงาน', desc: 'ดู Dashboard ภาพรวม → Projects → Payment/COR ตามขั้นตอน Workflow' },
          ].map(({ step, title, desc }) => (
            <div key={step} className="flex gap-3 items-start">
              <div className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                {step}
              </div>
              <div>
                <p className="text-sm font-medium text-slate-800">{title}</p>
                <p className="text-xs text-slate-500">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function RolesSection() {
  return (
    <div className="space-y-6">
      {/* Role cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {ROLES.map(r => (
          <div key={r.role} className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className={clsx('w-2.5 h-2.5 rounded-full shrink-0', r.dot)} />
              <span className={clsx('text-xs font-bold px-2 py-0.5 rounded-full border', r.color)}>
                {r.label}
              </span>
            </div>
            <p className="text-xs text-slate-600">{r.desc}</p>
          </div>
        ))}
      </div>

      {/* Permissions table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
          <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
            <Lock size={15} className="text-slate-500" />
            ตารางสิทธิ์ (Permissions Matrix)
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="text-left px-4 py-3 font-semibold text-slate-600 min-w-[120px]">Role</th>
                {PERM_COLUMNS.map(col => (
                  <th key={col.key} className="text-center px-3 py-3 font-semibold text-slate-600 min-w-[100px]">
                    <div className="flex flex-col items-center gap-1">
                      <col.icon size={13} className="text-slate-400" />
                      <span className="leading-tight">{col.label}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROLES.map((r, i) => (
                <tr key={r.role} className={clsx('border-b border-slate-50', i % 2 === 0 ? 'bg-white' : 'bg-slate-50/30')}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className={clsx('w-2 h-2 rounded-full shrink-0', r.dot)} />
                      <span className={clsx('text-xs font-semibold px-2 py-0.5 rounded-full border', r.color)}>
                        {r.label}
                      </span>
                    </div>
                  </td>
                  {PERM_COLUMNS.map(col => (
                    <td key={col.key} className="px-3 py-3 text-center">
                      <PermCheck val={r[col.key]} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1"><CheckCircle2 size={12} className="text-emerald-500" /> มีสิทธิ์</span>
          <span className="flex items-center gap-1"><XCircle size={12} className="text-slate-300" /> ไม่มีสิทธิ์</span>
          <span className="ml-auto text-slate-400">* User สามารถมีได้หลาย Role (OR logic)</span>
        </div>
      </div>

      {/* Project Access Note */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
        <Info size={16} className="text-amber-600 shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-semibold text-amber-800">การเข้าถึงข้อมูลโปรเจกต์</p>
          <p className="text-amber-700 mt-1 text-xs">
            Role ที่มี <strong>globalView</strong> (SuperAdmin, Admin, MD, GM, CD, AccCMG) จะเห็นข้อมูลทุกโปรเจกต์<br />
            Role ที่ไม่มี globalView (PM, CM, QsEng) จะเห็นเฉพาะโปรเจกต์ที่ Admin มอบหมายให้เท่านั้น
          </p>
        </div>
      </div>
    </div>
  )
}

function SidebarSection() {
  const [active, setActive] = useState(0)
  const item = SIDEBAR_ITEMS[active]
  const Icon = item.icon

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">คลิกที่เมนูด้านล่างเพื่อดูรายละเอียด</p>

      {/* Menu grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {SIDEBAR_ITEMS.map((s, i) => {
          const SIcon = s.icon
          return (
            <button
              key={s.path}
              onClick={() => setActive(i)}
              className={clsx(
                'flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-medium transition-all',
                active === i
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:bg-blue-50'
              )}
            >
              <SIcon size={18} />
              <span className="leading-tight text-center">{s.label}</span>
            </button>
          )
        })}
      </div>

      {/* Detail card */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className={clsx('flex items-center gap-3 px-5 py-4', item.color)}>
          <Icon size={20} />
          <div>
            <h3 className="font-bold text-sm">{item.label}</h3>
            <code className="text-xs opacity-70">{item.path}</code>
          </div>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm text-slate-700">{item.desc}</p>

          <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2.5">
            <Users size={13} className="text-blue-600 mt-0.5 shrink-0" />
            <span className="text-xs text-blue-700"><strong>ผู้ที่เห็นเมนูนี้:</strong> {item.roles}</span>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-600 mb-2">ฟีเจอร์หลัก</p>
            <ul className="space-y-1.5">
              {item.features.map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                  <ChevronRight size={12} className="text-blue-500 mt-0.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Sidebar behavior note */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
        <p className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
          <Settings size={13} className="text-slate-500" />
          พฤติกรรม Sidebar
        </p>
        <ul className="space-y-1.5 text-xs text-slate-600">
          <li className="flex items-start gap-2"><ChevronRight size={12} className="text-slate-400 mt-0.5 shrink-0" />กดปุ่ม <strong>Collapse</strong> ที่ด้านล่าง Sidebar เพื่อย่อเหลือแค่ไอคอน</li>
          <li className="flex items-start gap-2"><ChevronRight size={12} className="text-slate-400 mt-0.5 shrink-0" />เมนูที่ Active จะแสดงพื้นหลังสีน้ำเงิน</li>
          <li className="flex items-start gap-2"><ChevronRight size={12} className="text-slate-400 mt-0.5 shrink-0" />เมนูที่ไม่มีสิทธิ์จะถูกซ่อนโดยอัตโนมัติตาม Role</li>
          <li className="flex items-start gap-2"><ChevronRight size={12} className="text-slate-400 mt-0.5 shrink-0" />Hover บน Sidebar ที่ย่อแล้ว จะแสดง Tooltip ชื่อเมนู</li>
        </ul>
      </div>
    </div>
  )
}

function WorkflowSection() {
  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-500">ขั้นตอนการทำงานหลัก 4 Workflow ในระบบ</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <WorkflowCard
          steps={PAYMENT_WORKFLOW}
          title="Payment Claim Workflow"
          icon={CreditCard}
          color="bg-indigo-50 text-indigo-700"
        />
        <WorkflowCard
          steps={COR_WORKFLOW}
          title="Change Order Workflow (COR → COA)"
          icon={GitPullRequest}
          color="bg-amber-50 text-amber-700"
        />
        <WorkflowCard
          steps={BOND_WORKFLOW}
          title="Bank Bond Workflow"
          icon={Shield}
          color="bg-purple-50 text-purple-700"
        />
        <WorkflowCard
          steps={USER_WORKFLOW}
          title="User Approval Workflow"
          icon={Users}
          color="bg-emerald-50 text-emerald-700"
        />
      </div>

      {/* Status legend */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <FileText size={15} className="text-slate-500" />
          สถานะ Payment Claim
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: Clock,        color: 'bg-amber-100 text-amber-700',   label: 'In Progress',  desc: 'QsEng สร้างแล้ว รอ PM อนุมัติ' },
            { icon: AlertCircle,  color: 'bg-rose-100 text-rose-700',     label: 'Rejected',     desc: 'PM ปฏิเสธ ต้องแก้ไข' },
            { icon: Send,         color: 'bg-blue-100 text-blue-700',     label: 'Submitted',    desc: 'PM อนุมัติแล้ว ส่ง Invoice' },
            { icon: CheckCircle2, color: 'bg-emerald-100 text-emerald-700', label: 'Received',   desc: 'Accounting รับเงินแล้ว' },
          ].map(({ icon: Icon, color, label, desc }) => (
            <div key={label} className={clsx('rounded-xl p-3 border', color.replace('text-', 'border-').replace('-700', '-200'))}>
              <div className="flex items-center gap-2 mb-1">
                <Icon size={14} />
                <span className={clsx('text-xs font-bold', color.split(' ')[1])}>{label}</span>
              </div>
              <p className="text-xs text-slate-500">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* COR Status */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <GitPullRequest size={15} className="text-slate-500" />
          สถานะ Change Order (COR)
        </h3>
        <div className="grid grid-cols-3 gap-3">
          {[
            { color: 'bg-slate-100 text-slate-700 border-slate-200',   label: 'Prepare Doc', desc: 'กำลังเตรียมเอกสาร' },
            { color: 'bg-blue-100 text-blue-700 border-blue-200',      label: 'Submitted',   desc: 'ส่ง COR แล้ว' },
            { color: 'bg-rose-100 text-rose-700 border-rose-200',      label: 'Rejected',    desc: 'ถูกปฏิเสธ' },
          ].map(({ color, label, desc }) => (
            <div key={label} className={clsx('rounded-xl p-3 border text-center', color)}>
              <p className="text-xs font-bold">{label}</p>
              <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ─── Main Page ──────────────────────────────────────────────────────────── */
const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'overview', label: 'ภาพรวม',        icon: BookOpen      },
  { id: 'roles',    label: 'Roles & สิทธิ์', icon: Users         },
  { id: 'sidebar',  label: 'Sidebar',        icon: LayoutDashboard },
  { id: 'workflow', label: 'Workflow',        icon: GitBranch     },
]

export default function UserManualPage() {
  const [tab, setTab] = useState<TabId>('overview')

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Page header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <BookOpen size={20} className="text-blue-600" />
          <h1 className="text-xl font-bold text-slate-800">User Manual</h1>
        </div>
        <p className="text-sm text-slate-500">คู่มือการใช้งาน CMG Payment Management System</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              tab === id
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            )}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'overview'  && <OverviewSection />}
      {tab === 'roles'     && <RolesSection />}
      {tab === 'sidebar'   && <SidebarSection />}
      {tab === 'workflow'  && <WorkflowSection />}
    </div>
  )
}
