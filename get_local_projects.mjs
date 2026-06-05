import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

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

async function run() {
  console.log("Fetching old projects from Local DB...");
  const snapshot = await getDocs(collection(db, 'CMG-payment-system/root/projects'));
  snapshot.forEach(doc => {
    const data = doc.data();
    console.log(`- ID: ${doc.id}`);
    console.log(`  Name: ${data.name}`);
  });
  console.log("Done.");
  process.exit(0);
}

run().catch(console.error);
