import { db, collection, addDoc, deleteDoc, updateDoc, doc, onSnapshot } from "./firebase-config.js";

const reminderCol = collection(db, "reminders");

// ব্রাউজার অডিও অ্যালার্ম সেটআপ
const alarmAudio = new Audio("https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg");

// ১. নতুন রিমাইন্ডার বা অ্যালার্ম টাস্ক যুক্ত করা
export async function addReminder(title, targetDateTime, note = "") {
  return await addDoc(reminderCol, {
    title: title.trim(),
    targetDateTime: targetDateTime, // ফরম্যাট: "2026-08-31T09:00"
    note: note.trim(),
    status: "pending", // pending, completed
    notified: false,
    createdAt: new Date().toISOString()
  });
}

// ২. টাস্ক সম্পন্ন (Done) বা ডিলিট করা
export async function completeReminder(id) {
  return await updateDoc(doc(db, "reminders", id), { status: "completed" });
}

export async function deleteReminder(id) {
  return await deleteDoc(doc(db, "reminders", id));
}

// ৩. লাইভ ডাটা লিসেনার
export function listenReminders(callback) {
  return onSnapshot(reminderCol, (snapshot) => {
    const list = [];
    snapshot.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
    callback(list);
  });
}

// ৪. স্বয়ংক্রিয় অ্যালার্ম ও নোটিফিকেশন চেকার (প্রতি ৩০ সেকেন্ড পর পর চেক করবে)
export function startAlarmChecker(remindersList) {
  if (Notification.permission !== "granted" && Notification.permission !== "denied") {
    Notification.requestPermission();
  }

  setInterval(() => {
    const now = new Date();

    remindersList.forEach(item => {
      if (item.status === "pending" && !item.notified) {
        const itemTime = new Date(item.targetDateTime);

        // সময় হয়ে গেলে বা পার হয়ে গেলে অ্যালার্ম বাজবে
        if (now >= itemTime) {
          triggerAlarm(item);
        }
      }
    });
  }, 30000);
}

function triggerAlarm(item) {
  // অডিও অ্যালার্ম বাজানো
  alarmAudio.play().catch(() => {});

  // পুশ নোটিফিকেশন
  if (Notification.permission === "granted") {
    new Notification("⏰ কাজের সময় হয়েছে, বস!", {
      body: `${item.title}\nনোট: ${item.note || 'জরুরি কাজ সম্পন্ন করুন'}`,
      icon: "https://cdn-icons-png.flaticon.com/512/3239/3239958.png"
    });
  }

  // টেলিগ্রাম ভাইব্রেশন ও অ্যালার্ট
  if (window.Telegram?.WebApp) {
    window.Telegram.WebApp.HapticFeedback.notificationOccurred('error');
  }

  alert(`⏰ অ্যালার্ম: ${item.title}\n\nসময় হয়ে গেছে! কাজ সম্পন্ন করুন।`);
  updateDoc(doc(db, "reminders", item.id), { notified: true });
}

// ৫. রিমাইন্ডার সেকশন ইন্টারফেস রেন্ডারার
export function renderReminderSection(containerElement, reminders = []) {
  if (!containerElement) return;

  const pending = reminders.filter(r => r.status === "pending");
  const completed = reminders.filter(r => r.status === "completed");

  containerElement.innerHTML = `
    <!-- রিমাইন্ডার পরিসংখ্যান -->
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;">
      <div class="card" style="margin:0; text-align:center; padding:12px;">
        <span style="font-size:12px; color:#94a3b8;">বাকি কাজ</span>
        <div style="font-size:20px; font-weight:bold; color:#f59e0b;">${pending.length} টি</div>
      </div>
      <div class="card" style="margin:0; text-align:center; padding:12px;">
        <span style="font-size:12px; color:#94a3b8;">সম্পন্ন কাজ</span>
        <div style="font-size:20px; font-weight:bold; color:#10b981;">${completed.length} টি</div>
      </div>
    </div>

    <!-- নতুন রিমাইন্ডার বাটন -->
    <button class="btn btn-primary" onclick="window.openReminderModal()" style="margin-bottom: 15px; width: 100%;">
      ⏰ নতুন কাজের অ্যালার্ম / রিমাইন্ডার যোগ করুন
    </button>

    <!-- পেন্ডিং লিস্ট -->
    <h4 style="color:#e2e8f0; margin-bottom:8px; font-size:14px;">⏳ অপেক্ষমান টাস্ক</h4>
    <div id="pendingReminderList">
      ${pending.map(r => {
        const timeFormatted = new Date(r.targetDateTime).toLocaleString('bn-BD', { dateStyle: 'medium', timeStyle: 'short' });
        return `
          <div class="card" style="margin-bottom: 10px; border-left: 4px solid #f59e0b;">
            <div class="card-title">
              <span>${r.title}</span>
              <span class="badge badge-pending">${timeFormatted}</span>
            </div>
            ${r.note ? `<div style="font-size: 13px; color: #94a3b8; margin: 4px 0;">📝 নোট: ${r.note}</div>` : ''}
            <div style="display: flex; gap: 8px; margin-top: 10px;">
              <button class="btn btn-sm btn-success" onclick="window.handleCompleteReminder('${r.id}')">
                ✅ Done (সম্পন্ন)
              </button>
              <button class="btn btn-sm btn-danger" onclick="window.handleDeleteReminder('${r.id}')">
                🗑️ মুছে ফেলুন
              </button>
            </div>
          </div>
        `;
      }).join('') || `<div style="text-align:center; color:#64748b; padding:15px;">কোনো পেন্ডিং কাজ নেই</div>`}
    </div>

    <!-- সম্পন্ন হওয়া লিস্ট -->
    ${completed.length > 0 ? `
      <h4 style="color:#94a3b8; margin:15px 0 8px 0; font-size:13px;">✅ সম্পন্ন হওয়া কাজ</h4>
      <div id="completedReminderList" style="opacity: 0.7;">
        ${completed.map(r => `
          <div class="card" style="margin-bottom: 8px;">
            <div style="font-size:13px; text-decoration: line-through; color:#94a3b8;">${r.title}</div>
            <button class="btn btn-sm btn-danger" onclick="window.handleDeleteReminder('${r.id}')" style="margin-top:6px; padding:2px 6px; font-size:11px;">মুছে ফেলুন</button>
          </div>
        `).join('')}
      </div>
    ` : ''}
  `;
}
