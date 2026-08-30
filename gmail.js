import { db, collection, addDoc, updateDoc, doc, onSnapshot } from "./firebase-config.js";

// Firestore Collection Reference for Gmails
const gmailsCol = collection(db, "gmails");

// ১. নতুন জিমেইল যুক্ত করা (ফ্রেশ/বিক্রি অথবা প্রিমিয়াম বানানোর জন্য)
export async function addGmail({ email, password, recoveryEmail = "", type = "sale" }) {
  const today = new Date().toISOString().split('T')[0];

  const gmailData = {
    email: email.trim(),
    password: password.trim(),
    recoveryEmail: recoveryEmail.trim(),
    type: type, // 'sale' (বিক্রির জন্য) অথবা 'raw' (পরে প্রিমিয়াম বানাবো)
    status: "available", // 'available', 'assigned', 'sold'
    createdAt: today,
    assignedTo: null // কাস্টমারের নাম/আইডি
  };

  return await addDoc(gmailsCol, gmailData);
}

// ২. র-জিমেইলকে প্রিমিয়াম স্টকে রূপান্তর করা (১ ক্লিকে প্রিমিয়াম)
export async function convertToPremium(gmailDocId) {
  const gmailRef = doc(db, "gmails", gmailDocId);
  return await updateDoc(gmailRef, {
    type: "premium",
    status: "available"
  });
}

// ৩. জিমেইল বিক্রি/হস্তান্তর স্ট্যাটাস আপডেট
export async function markGmailSold(gmailDocId, customerName = "") {
  const gmailRef = doc(db, "gmails", gmailDocId);
  return await updateDoc(gmailRef, {
    status: "sold",
    assignedTo: customerName
  });
}

// ৪. কাস্টমারকে দেওয়ার জন্য তথ্য কপি ফরম্যাট তৈরি
export function formatGmailForCopy(gmailObj) {
  if (gmailObj.recoveryEmail) {
    return `Email: ${gmailObj.email}\nPass: ${gmailObj.password}\nRecovery: ${gmailObj.recoveryEmail}`;
  }
  return `Email: ${gmailObj.email}\nPass: ${gmailObj.password}`;
}

// ৫. লাইভ জিমেইল ডাটা লিসেনার (UI কানেকশন)
export function listenGmailsData(callback) {
  return onSnapshot(gmailsCol, (snapshot) => {
    const list = [];
    snapshot.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
    callback(list);
  });
}
