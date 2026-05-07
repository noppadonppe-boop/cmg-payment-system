# Changelog

## [Unreleased] - 2024

### Added
- **MasterAdmin Role**: New highest-level role with full system access
  - All permissions enabled (canManageProjects, canApprovePayments, canConvertCOR, canUpdateBonds, canCreateClaims, globalView)
  - Special gradient badge (purple-pink) for visual distinction
  - Can delete users, projects, payments, and change orders
  
- **Enhanced Realtime System**: Full realtime updates across the application
  - User profile updates in real-time when admin changes roles
  - Projects list updates in real-time when projects are created/edited/deleted
  - Payments list updates in real-time when payments are created/approved/received
  - Change orders (COR/COA) update in real-time
  - Bond statuses update in real-time
  - No page refresh required - UI updates automatically

### Changed
- **Multi-Role Support Improvements**:
  - Updated role checking from `currentUser.role === 'SuperAdmin'` to `userProfile?.role?.includes('SuperAdmin')`
  - Better support for users with multiple roles
  - Permissions are merged using OR logic (if any role has permission, user has permission)

- **Permission Checking**:
  - PaymentsPage now uses `can()` function instead of direct role comparison
  - More consistent permission checking across all pages
  - Better support for role-based access control

- **UI Updates**:
  - MasterAdmin badge with gradient styling
  - Updated role colors in AdminPanel
  - Updated navigation items to include MasterAdmin
  - Updated Header to show MasterAdmin badge

### Fixed
- Role checking now properly supports multi-role users
- Delete permissions now work for both SuperAdmin and MasterAdmin
- Sidebar navigation now shows correct items for MasterAdmin

### Technical Details

#### Files Modified
1. `src/types/auth.ts` - Added MasterAdmin to USER_ROLES
2. `src/context/AuthContext.tsx` - Added MasterAdmin permissions and ROLES export
3. `src/pages/AdminPanel.tsx` - Added MasterAdmin support and gradient badge
4. `src/components/Header.jsx` - Added MasterAdmin badge styling
5. `src/components/Sidebar.jsx` - Added MasterAdmin to navigation items
6. `src/App.jsx` - Added MasterAdmin to protected route
7. `src/pages/ProjectsPage.jsx` - Updated role checking for multi-role support
8. `src/pages/PaymentsPage.jsx` - Updated role checking to use can() function
9. `src/pages/ChangeOrdersPage.jsx` - Updated role checking for multi-role support

#### Realtime Implementation
- Uses Firestore `onSnapshot` for real-time data synchronization
- AuthContext subscribes to user profile changes
- AuthContext subscribes to all users collection
- DataContext subscribes to projects, payments, CORs, COAs, and bond statuses
- All subscriptions are properly cleaned up on unmount

#### Permission System
```typescript
ROLE_PERMISSIONS = {
  MasterAdmin: { all: true },
  SuperAdmin:  { all: true },
  Admin:       { all: true },
  // ... other roles
}
```

### Migration Guide

#### For Administrators
1. To assign MasterAdmin role:
   - Go to User Management page
   - Click "แก้ไข" (Edit) on the user
   - Select "MasterAdmin" role
   - Click "บันทึก" (Save)
   - User will receive permissions immediately without refresh

#### For Developers
1. Always use `userProfile?.role?.includes('RoleName')` instead of `currentUser.role === 'RoleName'`
2. Use `can('permissionName')` function for permission checking
3. Use `hasProjectAccess(projectId)` for project-level access control

### Breaking Changes
None - All changes are backward compatible

### Security Considerations
- MasterAdmin role should only be assigned to trusted administrators
- MasterAdmin can delete critical data (users, projects, payments)
- All Firestore operations still respect security rules
- Real-time listeners only receive data user has permission to access

### Performance Notes
- Real-time listeners use Firestore's efficient change detection
- Only changed documents trigger updates
- Listeners are properly cleaned up to prevent memory leaks
- Consider monitoring Firestore usage in Firebase Console

### Testing
- ✅ Build successful (vite build)
- ✅ TypeScript compilation successful
- ✅ All role permissions working correctly
- ✅ Real-time updates working across all collections
- ✅ Multi-role support working correctly

### Documentation
- Added `REALTIME_MASTERADMIN_UPDATE.md` (English)
- Added `คู่มือการอัปเดต-MasterAdmin-และ-Realtime.md` (Thai)
- Added this CHANGELOG.md

---

## Previous Versions
(No previous changelog entries)
