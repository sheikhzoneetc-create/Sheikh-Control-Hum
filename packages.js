import { db, collection, addDoc, getDocs, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy } from "./firebase-config.js";

// কাস্টমার প্যাকেজ রিয়েলটাইম লিসেনার
export function listenPackagesData(callback) {
  const q = query(collection(db, "packages"), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snapshot) => {
    const list = [];
    snapshot.forEach((docSnap) => {
      list.push({ id: docSnap.id, ...docSnap.data() });
    });
    callback(list);
  });
}

// ফ্যামিলি প্যাক রিয়েলটাইম লিসেনার
export function listenFamilyPacks(callback) {
  return onSnapshot(collection(db, "family_packs"), (snapshot) => {
    const packs = [];
    snapshot.forEach((docSnap) => {
      packs.push({ id: docSnap.id, ...docSnap.data() });
    });
    callback(packs);
  });
}

// কাস্টমার স্লট অ্যাসাইন ও সেভ করা (ম্যানুয়াল দিন সাপোর্ট সহ)
export async function assignCustomerToSlot({ name, phone, durationDays = 30, assignedPacks = [], hasYoutube = false, youtubeGmail = "" }) {
  const joinDate = new Date().toISOString().split("T")[0];
  
  // ম্যানুয়ালি দেওয়া দিন যোগ করা
  const expDateObj = new Date();
  expDateObj.setDate(expDateObj.getDate() + Number(durationDays));
  const expiryDate = expDateObj.toISOString().split("T")[0];

  return await addDoc(collection(db, "packages"), {
    name,
    phone,
    durationDays: Number(durationDays),
    assignedPacks,
    hasYoutube,
    youtubeGmail,
    joinDate,
    expiryDate,
    renewCount: 0,
    createdAt: Date.now()
  });
}

// কাস্টমার ডিলিট করার ফাংশন
export async function deleteCustomer(customerDocId) {
  return await deleteDoc(doc(db, "packages", customerDocId));
}

// রিনিউ ফাংশন (কাস্টম দিনে রিনিউ)
export async function renewCustomer(customerDocId, daysToAdd = 30, currentRenewCount = 0) {
  const expDateObj = new Date();
  expDateObj.setDate(expDateObj.getDate() + Number(daysToAdd));
  const expiryDate = expDateObj.toISOString().split("T")[0];

  const docRef = doc(db, "packages", customerDocId);
  return await updateDoc(docRef, {
    expiryDate: expiryDate,
    durationDays: Number(daysToAdd),
    renewCount: currentRenewCount + 1
  });
}

// বাকি দিন হিসাব করার ফাংশন
export function getRemainingDays(expiryDateStr) {
  if (!expiryDateStr) return 0;
  const target = new Date(expiryDateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffTime = target - today;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// নতুন ফ্যামিলি প্যাক তৈরি
export async function createFamilyPack(masterNumber, packName, totalGB, totalMin, cost) {
  return await addDoc(collection(db, "family_packs"), {
    masterNumber,
    packName,
    totalGB: Number(totalGB),
    totalMin: Number(totalMin),
    cost: Number(cost),
    createdAt: Date.now()
  });
}
