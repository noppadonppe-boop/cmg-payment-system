import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, writeBatch } from 'firebase/firestore';

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

async function migrateCollection(collectionName) {
  console.log(`Migrating collection: ${collectionName}...`);
  const snap = await getDocs(collection(db, `CMG-payment-system/root/${collectionName}`));
  const batch = writeBatch(db);
  let count = 0;

  snap.forEach(document => {
    const data = document.data();
    if (data.projectId && mapping[data.projectId]) {
      const newProjectId = mapping[data.projectId];
      batch.update(doc(db, `CMG-payment-system/root/${collectionName}`, document.id), {
        projectId: newProjectId
      });
      console.log(`  - Updated ${document.id}: ${data.projectId} -> ${newProjectId}`);
      count++;
    }
  });

  if (count > 0) {
    await batch.commit();
    console.log(`  Successfully updated ${count} documents in ${collectionName}.\n`);
  } else {
    console.log(`  No documents needed updating in ${collectionName}.\n`);
  }
}

async function run() {
  try {
    await migrateCollection('payments');
    await migrateCollection('cors');
    await migrateCollection('coas');
    await migrateCollection('bondStatuses');

    console.log("Migration completed successfully.");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

run();
