# การอัปเดตระบบ: MasterAdmin Role และ Realtime Features

## สรุปการเปลี่ยนแปลง

### 1. เพิ่ม MasterAdmin Role ใหม่
- **MasterAdmin** เป็น role ที่มีสิทธิ์สูงสุดในระบบ มีสิทธิ์เข้าถึงทุกฟังก์ชัน
- มี permissions เหมือนกับ SuperAdmin แต่มีการแสดงผลที่โดดเด่นกว่า (gradient badge)

### 2. ระบบ Realtime ที่มีอยู่แล้ว

ระบบมี Realtime listeners ครบถ้วนแล้วใน 2 ส่วนหลัก:

#### AuthContext (src/context/AuthContext.tsx)
- ✅ **User Profile Realtime**: ใช้ `onSnapshot` ติดตาม user profile ของผู้ใช้ปัจจุบัน
- ✅ **All Users Realtime**: ใช้ `onSnapshot` ติดตาม users collection ทั้งหมด
- ✅ **Auto-update on Role Change**: เมื่อ admin เปลี่ยน role ของ user, user จะได้รับการอัปเดตทันทีโดยไม่ต้อง refresh

#### DataContext (src/context/DataContext.jsx)
- ✅ **Projects Realtime**: ติดตามการเปลี่ยนแปลงของ projects
- ✅ **Bond Statuses Realtime**: ติดตามการเปลี่ยนแปลงของ bond statuses
- ✅ **Payments Realtime**: ติดตามการเปลี่ยนแปลงของ payments
- ✅ **CORs Realtime**: ติดตามการเปลี่ยนแปลงของ change order requests
- ✅ **COAs Realtime**: ติดตามการเปลี่ยนแปลงของ change order approvals

### 3. ไฟล์ที่ได้รับการอัปเดต

#### src/types/auth.ts
```typescript
// เพิ่ม MasterAdmin ในรายการ roles
export const USER_ROLES = [
  'MasterAdmin',  // ← ใหม่
  'SuperAdmin',
  'Admin',
  // ... roles อื่นๆ
]
```

#### src/context/AuthContext.tsx
```typescript
// เพิ่ม permissions สำหรับ MasterAdmin
export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  MasterAdmin: { 
    canManageProjects: true,
    canApprovePayments: true,
    canConvertCOR: true,
    canUpdateBonds: true,
    canCreateClaims: true,
    globalView: true
  },
  // ... roles อื่นๆ
}

// เพิ่ม MasterAdmin ใน ROLES export
export const ROLES = {
  MasterAdmin: 'MasterAdmin',  // ← ใหม่
  SuperAdmin: 'SuperAdmin',
  // ... roles อื่นๆ
}
```

#### src/pages/AdminPanel.tsx
```typescript
// เพิ่มการตรวจสอบ MasterAdmin
const isSuperAdmin = me?.role.includes('SuperAdmin')
const isMasterAdmin = me?.role.includes('MasterAdmin')  // ← ใหม่

// อนุญาตให้ MasterAdmin ลบ user ได้
{(isSuperAdmin || isMasterAdmin) && (
  <button onClick={() => deleteUser(user.uid)}>ลบ</button>
)}

// เพิ่มสีพิเศษสำหรับ MasterAdmin badge
const ROLE_COLORS = {
  MasterAdmin: 'bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 border-purple-300 font-bold',
  // ... colors อื่นๆ
}
```

#### src/components/Header.jsx
```javascript
// เพิ่ม MasterAdmin ในการแสดง badge
const ROLE_BADGE_COLORS = {
  MasterAdmin: 'bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 font-bold',
  // ... colors อื่นๆ
}

// อนุญาตให้ MasterAdmin เข้าถึง Admin panel
{userProfile?.role?.some((r) => ['MasterAdmin', 'SuperAdmin', 'Admin'].includes(r)) && (
  <button onClick={() => navigate('/admin')}>...</button>
)}
```

#### src/pages/ProjectsPage.jsx
```javascript
// อัปเดตการตรวจสอบ SuperAdmin ให้รองรับ multi-role และ MasterAdmin
const isSuperAdmin = userProfile?.role?.includes('SuperAdmin') || userProfile?.role?.includes('MasterAdmin')
```

#### src/pages/PaymentsPage.jsx
```javascript
// อัปเดตการตรวจสอบ SuperAdmin ให้รองรับ multi-role และ MasterAdmin
const isSuperAdmin = userProfile?.role?.includes('SuperAdmin') || userProfile?.role?.includes('MasterAdmin')
```

#### src/pages/ChangeOrdersPage.jsx
```javascript
// อัปเดตการตรวจสอบ SuperAdmin ให้รองรับ multi-role และ MasterAdmin
const isSuperAdmin = userProfile?.role?.includes('SuperAdmin') || userProfile?.role?.includes('MasterAdmin')
```
```javascript
// เพิ่ม MasterAdmin ในทุก navigation items
const NAV_ITEMS = [
  {
    label: 'Dashboard',
    roles: ['MasterAdmin', 'SuperAdmin', 'Admin', ...],  // ← เพิ่ม MasterAdmin
  },
  // ... items อื่นๆ
]
```

#### src/App.jsx
```javascript
// อนุญาตให้ MasterAdmin เข้าถึง Admin panel route
<ProtectedRoute requireRoles={['MasterAdmin', 'SuperAdmin', 'Admin']}>
  <AdminPanel />
</ProtectedRoute>
```

## การทำงานของระบบ Realtime

### 1. เมื่อ Admin เปลี่ยน Role ของ User
```
1. Admin แก้ไข role ใน AdminPanel
2. Firestore อัปเดต document ใน users collection
3. onSnapshot listener ใน AuthContext จับการเปลี่ยนแปลง
4. userProfile state อัปเดตทันที
5. permissions คำนวณใหม่จาก role ที่อัปเดต
6. UI อัปเดตทันที (sidebar, buttons, permissions)
```

### 2. เมื่อมีการเปลี่ยนแปลงข้อมูล
```
1. User A สร้าง/แก้ไข project, payment, COR, etc.
2. Firestore อัปเดต collection
3. onSnapshot listeners ใน DataContext จับการเปลี่ยนแปลง
4. State อัปเดตทันที
5. User B เห็นการเปลี่ยนแปลงทันทีโดยไม่ต้อง refresh
```

## สิทธิ์ของ MasterAdmin

MasterAdmin มีสิทธิ์ทั้งหมดดังนี้:

✅ **canManageProjects**: สร้าง/แก้ไข/ลบ projects  
✅ **canApprovePayments**: อนุมัติ payments  
✅ **canConvertCOR**: แปลง COR เป็น COA  
✅ **canUpdateBonds**: อัปเดต bond statuses  
✅ **canCreateClaims**: สร้าง payment claims  
✅ **globalView**: เห็น projects ทั้งหมด (ไม่จำกัดเฉพาะที่ assign)  
✅ **User Management**: จัดการ users ทั้งหมด  
✅ **Delete Users**: ลบ users ได้  

## การทดสอบ

### ทดสอบ MasterAdmin Role
1. ไปที่ Admin Panel (`/admin`)
2. เลือก user ที่ต้องการ
3. คลิก "แก้ไข"
4. เลือก role "MasterAdmin"
5. คลิก "บันทึก"
6. User จะได้รับสิทธิ์ทันทีโดยไม่ต้อง refresh

### ทดสอบ Realtime
1. เปิด browser 2 tabs
2. Login ด้วย user ต่างกัน (1 admin, 1 user ธรรมดา)
3. Admin เปลี่ยน role ของ user
4. Tab ของ user จะเห็นการเปลี่ยนแปลงทันที (sidebar, buttons อัปเดต)

## หมายเหตุ

- ระบบใช้ Firestore `onSnapshot` สำหรับ realtime updates
- ไม่ต้องเรียก `refreshProfile()` เพราะ profile อัปเดตอัตโนมัติ
- การเปลี่ยนแปลงใดๆ ใน Firestore จะสะท้อนทันทีในทุก client ที่เชื่อมต่ออยู่
- MasterAdmin มีการแสดงผลพิเศษด้วย gradient badge เพื่อให้โดดเด่น
