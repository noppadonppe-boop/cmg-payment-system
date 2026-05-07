# คู่มือการอัปเดตระบบ: MasterAdmin และ Realtime

## 🎯 สรุปการอัปเดต

ระบบได้รับการอัปเดตให้มี **MasterAdmin Role** และปรับปรุง **ระบบ Realtime** ให้ทำงานได้อย่างสมบูรณ์

---

## ✨ ฟีเจอร์ใหม่

### 1. MasterAdmin Role
- **MasterAdmin** คือ role ที่มีสิทธิ์สูงสุดในระบบ
- มีสิทธิ์เข้าถึงและใช้งานได้ทุกฟังก์ชันในระบบ
- แสดงผลด้วย badge สีพิเศษ (gradient purple-pink) เพื่อให้โดดเด่น

### 2. ระบบ Realtime แบบเต็มรูปแบบ
ระบบทำงานแบบ Realtime ครบทุกส่วน:

#### ✅ ข้อมูลผู้ใช้ (Users)
- เมื่อ Admin เปลี่ยน role ของ user
- User จะได้รับการอัปเดตทันทีโดยไม่ต้อง refresh
- เมนูและปุ่มต่างๆ จะปรากฏหรือหายไปตามสิทธิ์ใหม่ทันที

#### ✅ ข้อมูลโครงการ (Projects)
- การสร้าง/แก้ไข/ลบ project
- ทุกคนที่เปิดหน้า Projects จะเห็นการเปลี่ยนแปลงทันที

#### ✅ ข้อมูล Payments
- การสร้าง payment claim ใหม่
- การอนุมัติ/ปฏิเสธ payment
- การออก invoice และยืนยันการรับเงิน
- ทุกคนจะเห็นสถานะอัปเดตทันที

#### ✅ ข้อมูล Change Orders (COR/COA)
- การสร้าง COR ใหม่
- การแปลง COR เป็น COA
- การสร้าง payment สำหรับ COA
- ทุกคนจะเห็นการเปลี่ยนแปลงทันที

#### ✅ ข้อมูล Bond Status
- การอัปเดตสถานะ bond
- ทุกคนจะเห็นการเปลี่ยนแปลงทันที

---

## 🔐 สิทธิ์ของ MasterAdmin

MasterAdmin มีสิทธิ์ครบทุกอย่าง:

| สิทธิ์ | คำอธิบาย | MasterAdmin |
|--------|----------|-------------|
| **canManageProjects** | สร้าง/แก้ไข/ลบ projects | ✅ |
| **canApprovePayments** | อนุมัติ payments | ✅ |
| **canConvertCOR** | แปลง COR เป็น COA | ✅ |
| **canUpdateBonds** | อัปเดต bond statuses | ✅ |
| **canCreateClaims** | สร้าง payment claims | ✅ |
| **globalView** | เห็น projects ทั้งหมด | ✅ |
| **User Management** | จัดการ users | ✅ |
| **Delete Users** | ลบ users | ✅ |
| **Delete Projects** | ลบ projects | ✅ |
| **Delete Payments** | ลบ payments | ✅ |
| **Delete COR/COA** | ลบ change orders | ✅ |

---

## 📋 วิธีการใช้งาน

### การกำหนด MasterAdmin ให้กับ User

1. **เข้าสู่ระบบด้วย Admin หรือ SuperAdmin**
2. **ไปที่หน้า User Management** (คลิกไอคอน Shield ที่มุมขวาบน หรือเลือกจากเมนู)
3. **เลือก user ที่ต้องการ**
4. **คลิกปุ่ม "แก้ไข"**
5. **เลือก role "MasterAdmin"** (จะอยู่บนสุดของรายการ)
6. **คลิก "บันทึก"**
7. **User จะได้รับสิทธิ์ทันที** โดยไม่ต้อง refresh หน้าเว็บ

### การทดสอบระบบ Realtime

#### ทดสอบการเปลี่ยน Role
1. เปิด browser 2 tabs
2. Tab 1: Login ด้วย Admin
3. Tab 2: Login ด้วย User ธรรมดา
4. ที่ Tab 1: เปลี่ยน role ของ user ใน Tab 2
5. **ผลลัพธ์**: Tab 2 จะเห็นเมนูและปุ่มเปลี่ยนแปลงทันที

#### ทดสอบการสร้าง Project
1. เปิด browser 2 tabs
2. Login ด้วย user ต่างกัน
3. ทั้ง 2 tabs เปิดหน้า Projects
4. Tab 1: สร้าง project ใหม่
5. **ผลลัพธ์**: Tab 2 จะเห็น project ใหม่ปรากฏทันที

#### ทดสอบการอนุมัติ Payment
1. เปิด browser 2 tabs
2. Tab 1: Login ด้วย PM
3. Tab 2: Login ด้วย QsEng
4. ทั้ง 2 tabs เปิดหน้า Payments
5. Tab 1: อนุมัติ payment
6. **ผลลัพธ์**: Tab 2 จะเห็นสถานะเปลี่ยนเป็น "Submitted" ทันที

---

## 🎨 การแสดงผล MasterAdmin

### Badge สีพิเศษ
- MasterAdmin จะมี badge สี **gradient purple-pink** 
- ตัวหนา (bold) เพื่อให้โดดเด่นจาก role อื่นๆ
- แสดงทั้งใน Header และ Admin Panel

### ตัวอย่างการแสดงผล
```
┌─────────────────────────────────────┐
│ 👤 John Doe                         │
│ john@example.com                    │
│ [MasterAdmin] ← gradient badge      │
└─────────────────────────────────────┘
```

---

## 🔧 เทคนิคการทำงาน

### Realtime Listeners
ระบบใช้ Firestore `onSnapshot` เพื่อติดตามการเปลี่ยนแปลง:

```javascript
// ตัวอย่างใน AuthContext
onSnapshot(userRef, (snap) => {
  if (snap.exists()) {
    setUserProfile(snap.data())
    // UI จะอัปเดตอัตโนมัติเมื่อ state เปลี่ยน
  }
})
```

### Permission Checking
ระบบใช้ `can()` function เพื่อตรวจสอบสิทธิ์:

```javascript
// ตัวอย่างการใช้งาน
{can('canManageProjects') && (
  <Button onClick={createProject}>
    New Project
  </Button>
)}
```

### Multi-Role Support
User สามารถมีหลาย role พร้อมกัน:

```javascript
// ตัวอย่าง user ที่มี 2 roles
userProfile.role = ['MasterAdmin', 'PM']

// Permissions จะรวมกันแบบ OR
// ถ้ามี role ใดที่มีสิทธิ์ = user จะมีสิทธิ์นั้น
```

---

## ⚠️ ข้อควรระวัง

### 1. การกำหนด MasterAdmin
- ควรกำหนดให้เฉพาะผู้ที่ไว้วางใจได้เท่านั้น
- MasterAdmin สามารถลบ users, projects, และข้อมูลสำคัญอื่นๆ ได้

### 2. การทดสอบ
- ทดสอบการเปลี่ยน role ในสภาพแวดล้อมทดสอบก่อน
- ตรวจสอบว่า permissions ทำงานถูกต้อง

### 3. ประสิทธิภาพ
- ระบบ Realtime ใช้ Firestore listeners
- จำนวน listeners จะเพิ่มตามจำนวน users ที่ online
- ควรติดตาม Firestore usage ใน Firebase Console

---

## 📊 การตรวจสอบ Firestore Usage

1. เข้า Firebase Console
2. ไปที่ Firestore Database
3. ดูที่ Usage tab
4. ตรวจสอบ:
   - Document reads
   - Document writes
   - Active connections

---

## 🐛 การแก้ไขปัญหา

### ปัญหา: User ไม่เห็นการเปลี่ยนแปลงทันที

**วิธีแก้:**
1. ตรวจสอบว่า user ยัง login อยู่หรือไม่
2. ตรวจสอบ console ว่ามี error หรือไม่
3. ลอง refresh หน้าเว็บ
4. ตรวจสอบ Firestore rules ว่าอนุญาตให้อ่านข้อมูลได้

### ปัญหา: MasterAdmin ไม่เห็นปุ่มบางอย่าง

**วิธีแก้:**
1. ตรวจสอบว่า role ถูกบันทึกใน Firestore แล้ว
2. ลอง logout และ login ใหม่
3. ตรวจสอบ console ว่ามี error หรือไม่

### ปัญหา: Realtime ไม่ทำงาน

**วิธีแก้:**
1. ตรวจสอบ internet connection
2. ตรวจสอบ Firestore rules
3. ตรวจสอบ Firebase project configuration
4. ดู console logs สำหรับ error messages

---

## 📝 สรุป

การอัปเดตนี้ทำให้ระบบมีความสามารถดังนี้:

✅ **MasterAdmin Role** - สิทธิ์สูงสุดในระบบ  
✅ **Realtime Updates** - ทุกอย่างอัปเดตทันทีโดยไม่ต้อง refresh  
✅ **Multi-Role Support** - user สามารถมีหลาย role พร้อมกัน  
✅ **Better UX** - ผู้ใช้เห็นการเปลี่ยนแปลงทันที  
✅ **Scalable** - รองรับการเติบโตของระบบในอนาคต  

---

## 📞 ติดต่อสอบถาม

หากมีคำถามหรือพบปัญหาในการใช้งาน กรุณาติดต่อทีม IT Support
