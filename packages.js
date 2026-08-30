import { db, collection, addDoc, getDocs, updateDoc, doc, onSnapshot } from "./firebase-config.js";

// Firestore Collection Reference
const packagesCol = collection(db, "packages");
const familyPacksCol = collection(db, "family_packs");

// ক্যালকুলেশন: কতদিন বাকি আছে
export function getRemainingDays(expiryDateStr) {
  const expiry = new Date(expiryDateStr);
  const today = new Date();
  const diffTime = expiry - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
}

// তারিখ থেকে ৩০ দিন যোগ করার ফাংশন
export function add30Days(startDateStr = null) {
  const date = startDateStr ? new Date(startDateStr) : new Date();
  date.setDate(date.getDate() + 30);
  return date.toISOString().split('T')[0];
}

// ১. নতুন ফ্যামিলি মাস্টার প্যাক কেনা ও তৈরি (৪টি স্লট সহ)
export async function createFamilyPack(masterNumber, packName, totalGB, totalMin, cost) {
  const today = new Date().toISOString().split('T')[0];
  const expiry = add30Days(today);

  const packData = {
    masterNumber: masterNumber,
    packName: packName, // যেমন: প্যাকেজ #১, প্যাকেজ #২
    totalGB: Number(totalGB),
    usedGB: 0,
    totalMin: Number(totalMin),
    usedMin: 0,
    cost: Number(cost),
    purchaseDate: today,
    expiryDate: expiry,
    slots: [
      { slotId: 1, customerId: null, allocatedGB: 0, allocatedMin: 0, status: "available" },
      { slotId: 2, customerId: null, allocatedGB: 0, allocatedMin: 0, status: "available" },
      { slotId: 3, customerId: null, allocatedGB: 0, allocatedMin: 0, status: "available" },
      { slotId: 4, customerId: null, allocatedGB: 0, allocatedMin: 0, status: "available" }
    ]
  };

  return await addDoc(familyPacksCol, packData);
}

// ২. কাস্টমার অ্যাড / প্যাকেজ স্লটে বসানো (ডুয়াল এক্সপায়ারি ও স্প্লিট ডাটা)
export async function assignCustomerToSlot({
  name,
  phone,
  assignedPacks, // Array of { packDocId, slotId, gb, min }
  hasYoutube,
  youtubeGmail,
  customExpiryDays = 30
}) {
  const today = new Date().toISOString().split('T')[0];
  const custExpiry = new Date();
  custExpiry.setDate(custExpiry.getDate() + Number(customExpiryDays));

  // কাস্টমার প্রোফাইল তৈরি
  const customerData = {
    name,
    phone,
    joinDate: today,
    expiryDate: custExpiry.toISOString().split('T')[0],
    renewCount: 0,
    hasYoutube: Boolean(hasYoutube),
    youtubeGmail: youtubeGmail || "",
    assignedPacks: assignedPacks || [],
    status: "active"
  };

  return await addDoc(packagesCol, customerData);
}

// ৩. কাস্টমার রিনিউ করার ফাংশন (রিনিউ কাউন্ট বাড়বে + নতুন ৩০ দিন)
export async function renewCustomer(customerDocId, currentRenewCount) {
  const today = new Date().toISOString().split('T')[0];
  const newExpiry = add30Days(today);

  const custDocRef = doc(db, "packages", customerDocId);
  return await updateDoc(custDocRef, {
    expiryDate: newExpiry,
    renewCount: (Number(currentRenewCount) || 0) + 1,
    status: "active"
  });
}

// ৪. লাইভ প্যাকেজ ও ফ্যামিলি স্লট ডাটা রেন্ডারার (UI কানেকশন)
export function listenPackagesData(callback) {
  return onSnapshot(packagesCol, (snapshot) => {
    const list = [];
    snapshot.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
    callback(list);
  });
}

export function listenFamilyPacks(callback) {
  return onSnapshot(familyPacksCol, (snapshot) => {
    const list = [];
    snapshot.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
    callback(list);
  });
}
