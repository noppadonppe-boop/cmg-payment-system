import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const masterFirebaseConfig = {
  apiKey: "AIzaSyDOqRqNW06Lu5fIQ_2Whr02tg6sn8zltw8",
  authDomain: "cmg-budget-control.firebaseapp.com",
  projectId: "cmg-budget-control",
  storageBucket: "cmg-budget-control.firebasestorage.app",
  messagingSenderId: "106345631455",
  appId: "1:106345631455:web:f96f15b024e8c65334e36a",
  measurementId: "G-YSPY0MTZG1"
};

const app = initializeApp(masterFirebaseConfig, "masterApp");
const db = getFirestore(app);

async function run() {
  console.log("Fetching projects from Master Data...");
  const snapshot = await getDocs(collection(db, 'artifacts/cmg-budget-control-default/public/data/projects'));
  snapshot.forEach(doc => {
    const data = doc.data();
    console.log(`- ID: ${doc.id}`);
    console.log(`  Name: ${data.name}`);
    console.log(`  PM: ${data.pmId}`);
  });
  console.log("Done.");
  process.exit(0);
}

run().catch(console.error);
