import { initializeApp } from 'firebase/app';
import { getFirestore, doc, updateDoc, deleteField } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAKOmyo7FKs0QtaTYZOsy_sOEPe2tzzvuc",
  authDomain: "cmg-planning-management.firebaseapp.com",
  projectId: "cmg-planning-management",
  storageBucket: "cmg-planning-management.firebasestorage.app",
  messagingSenderId: "25522363913",
  appId: "1:25522363913:web:361e7424f3f368e40122d8",
  measurementId: "G-35YDFEGVM2"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const mapping = {
  'p1773039344861': 'J-72',
  'p1773039508556': 'J-74',
  'p1773122384078': 'J-75',
  'p1773122489210': 'J-73',
  'p1778460081259': 'PRJ-2026-J-074W'
};

async function fixJobNo() {
  console.log("Removing mistakenly migrated jobNo from local projects...");
  let count = 0;
  for (const newId of Object.values(mapping)) {
    const docRef = doc(db, `CMG-payment-system/root/projects/${newId}`);
    try {
      await updateDoc(docRef, {
        jobNo: deleteField()
      });
      console.log(`  - Removed jobNo from ${newId}`);
      count++;
    } catch (e) {
      console.log(`  - Failed or no data for ${newId}: ${e.message}`);
    }
  }
  console.log(`Successfully fixed ${count} projects.`);
}

fixJobNo().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
