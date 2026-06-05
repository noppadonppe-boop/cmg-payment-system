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
  'contractNo', 'poNo', 'contractValue', 'originalContractValue', 'contractAttachment',
  'startDate', 'finishDate', 'contractType', 'retentionRequired', 'retentionPercent', 'contractNote',
  'performanceBond', 'advanceBond', 'warrantyBond',
  'insurances',
  'taxPay', 'taxStatusPay', 'taxNote',
  'contractPenalty', 'otherConditions', 'conditionNote'
];

async function migrateProjectData() {
  console.log(`Migrating Project Data (Contract & Bonds)...`);
  let count = 0;

  for (const [oldId, newId] of Object.entries(mapping)) {
    const oldDocRef = doc(db, `CMG-payment-system/root/projects/${oldId}`);
    const newDocRef = doc(db, `CMG-payment-system/root/projects/${newId}`);

    const oldSnap = await getDoc(oldDocRef);
    if (oldSnap.exists()) {
      const oldData = oldSnap.data();
      const extractedData = {};
      let hasData = false;

      // Extract only specific fields
      for (const field of fieldsToMigrate) {
        if (oldData[field] !== undefined) {
          extractedData[field] = oldData[field];
          hasData = true;
        }
      }

      if (hasData) {
        extractedData.id = newId; // Ensure the id matches
        
        // Merge into the new project doc (this creates it if it doesn't exist, which is fine since the app merges it with MasterData)
        await setDoc(newDocRef, extractedData, { merge: true });
        console.log(`  - Migrated data from ${oldId} to ${newId}`);
        count++;
      }
    } else {
      console.log(`  - Old project ${oldId} not found.`);
    }
  }

  console.log(`\nSuccessfully migrated data for ${count} projects.`);
}

async function run() {
  try {
    await migrateProjectData();
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

run();
