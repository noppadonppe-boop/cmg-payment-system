import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';

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

const fieldsToMigrate = [
  // General Info (NOT from MasterData)
  'jobNo', 'status', 'cmId', 'cm', 'mainContractor', 'subContractor', 'clientInfo'
];

async function migrateGeneralInfo() {
  console.log(`Migrating Project General Info (Non-MasterData fields)...`);
  let count = 0;

  for (const [oldId, newId] of Object.entries(mapping)) {
    const oldDocRef = doc(db, `CMG-payment-system/root/projects/${oldId}`);
    const newDocRef = doc(db, `CMG-payment-system/root/projects/${newId}`);

    const oldSnap = await getDoc(oldDocRef);
    if (oldSnap.exists()) {
      const oldData = oldSnap.data();
      const extractedData = {};
      let hasData = false;

      for (const field of fieldsToMigrate) {
        if (oldData[field] !== undefined) {
          extractedData[field] = oldData[field];
          hasData = true;
        }
      }

      if (hasData) {
        // Merge into the new project doc
        await setDoc(newDocRef, extractedData, { merge: true });
        console.log(`  - Migrated General Info from ${oldId} to ${newId}`);
        count++;
      }
    }
  }

  console.log(`\nSuccessfully migrated General Info for ${count} projects.`);
}

async function run() {
  try {
    await migrateGeneralInfo();
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

run();
