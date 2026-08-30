import { db, collection, addDoc, deleteDoc, doc, onSnapshot } from "./firebase-config.js";

// Firestore Collection References
const vaultCol = collection(db, "vault_items");
const videosCol = collection(db, "video_vault");

// ১. পাসওয়ার্ড বা দরকারি লিংক সেভ করা
export async function addVaultItem({ title, username = "", secretOrUrl, category = "password", note = "" }) {
  const today = new Date().toISOString().split('T')[0];

  const itemData = {
    title: title.trim(),
    username: username.trim(),
    secretOrUrl: secretOrUrl.trim(), // পাসওয়ার্ড বা লিংক
    category: category, // 'password', 'link', 'document'
    note: note.trim(),
    createdAt: today
  };

  return await addDoc(vaultCol, itemData);
}

// ২. টেলিগ্রাম ক্লাউডের ভিডিও ক্যাটাগরি অনুযায়ী সেভ করা
export async function addVideoToVault({ title, category, telegramFileIdOrLink, description = "" }) {
  const today = new Date().toISOString().split('T')[0];

  const videoData = {
    title: title.trim(),
    category: category.trim(), // যেমন: 'Sad Video', 'Tutorial', 'Reels'
    urlOrFileId: telegramFileIdOrLink.trim(),
    description: description.trim(),
    createdAt: today
  };

  return await addDoc(videosCol, videoData);
}

// ৩. ভল্ট বা ভিডিও আইটেম ডিলিট করা
export async function deleteVaultItem(itemDocId) {
  return await deleteDoc(doc(db, "vault_items", itemDocId));
}

export async function deleteVideoItem(videoDocId) {
  return await deleteDoc(doc(db, "video_vault", videoDocId));
}

// ৪. লাইভ ডাটা লিসেনার (UI কানেকশন)
export function listenVaultData(callback) {
  return onSnapshot(vaultCol, (snapshot) => {
    const list = [];
    snapshot.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
    callback(list);
  });
}

export function listenVideoVault(callback) {
  return onSnapshot(videosCol, (snapshot) => {
    const list = [];
    snapshot.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
    callback(list);
  });
}
