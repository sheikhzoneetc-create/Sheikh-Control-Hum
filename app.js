import { db, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot } from "./firebase-config.js";
import { listenPackages, renderPackagesSection } from "./packages.js";
import { listenGmailStock, renderGmailSection } from "./gmail.js";

// ১. নেভিগেশন ও গ্লোবাল উইন্ডো ফাংশন
window.switchMainTab = function(tabId, btnElement) {
  document.querySelectorAll(".tab-sec").forEach(sec => sec.classList.remove("active"));
  document.querySelectorAll(".nav-item").forEach(btn => btn.classList.remove("active"));

  const target = document.getElementById(tabId);
  if (target) target.classList.add("active");
  if (btnElement) btnElement.classList.add("active");
};

window.closeAnyModal = function() {
  const modal = document.getElementById("modal-backdrop");
  if (modal) modal.style.display = "none";
};

window.copyVaultText = function(text) {
  navigator.clipboard.writeText(text);
  alert("📋 কপি করা হয়েছে!");
};

// ২. প্যাকেজ ও জিমেইল লোডার
try {
  listenPackages((data) => {
    const root = document.getElementById("packages-root");
    if (root) renderPackagesSection(root, data);
  });
} catch (e) { console.error("Packages load error:", e); }

try {
  listenGmailStock((data) => {
    const root = document.getElementById("gmail-root");
    if (root) renderGmailSection(root, data);
  });
} catch (e) { console.error("Gmail load error:", e); }

// ৩. ভল্ট সিস্টেম (পাসওয়ার্ড, ডকুমেন্ট, ভিডিও)
const vaultCol = collection(db, "vault_items");
const videoCol = collection(db, "video_vault");
let vaultData = [];
let videoData = [];
let activeVaultSub = "passwords";

onSnapshot(vaultCol, (snap) => {
  vaultData = [];
  snap.forEach(d => vaultData.push({ id: d.id, ...d.data() }));
  renderVaultUI();
});

onSnapshot(videoCol, (snap) => {
  videoData = [];
  snap.forEach(d => videoData.push({ id: d.id, ...d.data() }));
  renderVaultUI();
});

function renderVaultUI() {
  const root = document.getElementById("vault-root");
  if (!root) return;

  const passwords = vaultData.filter(i => i.type === "password");
  const docs = vaultData.filter(i => i.type === "document");

  root.innerHTML = `
    <div style="display: flex; gap: 6px; background: #161b22; padding: 6px; border-radius: 10px; margin-bottom: 15px; border: 1px solid #30363d;">
      <button class="sub-tab-btn ${activeVaultSub === 'passwords' ? 'active-sub' : ''}" onclick="window.setVaultTab('passwords')">
        🔑 পাসওয়ার্ড (${passwords.length})
      </button>
      <button class="sub-tab-btn ${activeVaultSub === 'docs' ? 'active-sub' : ''}" onclick="window.setVaultTab('docs')">
        📄 ফাইল (${docs.length})
      </button>
      <button class="sub-tab-btn ${activeVaultSub === 'videos' ? 'active-sub' : ''}" onclick="window.setVaultTab('videos')">
        🎬 ভিডিও (${videoData.length})
      </button>
    </div>
    <div>${getVaultBodyHTML(activeVaultSub, passwords, docs, videoData)}</div>
  `;
}

function getVaultBodyHTML(sub, passwords, docs, videos) {
  if (sub === 'passwords') {
    return `
      <button class="btn btn-primary" onclick="window.openVaultModal('password')" style="margin-bottom:12px; width:100%;">+ নতুন পাসওয়ার্ড</button>
      ${passwords.map(p => `
        <div class="card">
          <div class="card-title"><span>🔑 ${p.title}</span><button class="btn btn-sm btn-danger" onclick="window.delVault('${p.id}')">ডিলিট</button></div>
          <div style="font-size:13px; color:#8b949e;">ইউজার: ${p.username}</div>
          <div style="display:flex; gap:8px; margin-top:6px;">
            <input type="password" value="${p.secret}" readonly style="background:#0d1117; color:#58a6ff; border:1px solid #30363d; padding:6px; border-radius:6px; flex:1;">
            <button class="btn btn-sm btn-copy" onclick="window.copyVaultText('${p.secret}')">📋 কপি</button>
          </div>
        </div>
      `).join('') || '<div style="text-align:center; color:#8b949e; padding:20px;">কোনো পাসওয়ার্ড নেই</div>'}
    `;
  }
  if (sub === 'docs') {
    return `
      <button class="btn btn-primary" onclick="window.openVaultModal('doc')" style="margin-bottom:12px; width:100%;">+ নতুন ডকুমেন্ট लिंक</button>
      ${docs.map(d => `
        <div class="card">
          <div class="card-title"><span>📄 ${d.title}</span><button class="btn btn-sm btn-danger" onclick="window.delVault('${d.id}')">ডিলিট</button></div>
          <a href="${d.docLink}" target="_blank" style="color:#58a6ff; font-size:13px; margin-top:6px; display:block;">🔗 ফাইল খুলুন</a>
        </div>
      `).join('') || '<div style="text-align:center; color:#8b949e; padding:20px;">কোনো ডকুমেন্ট নেই</div>'}
    `;
  }
  if (sub === 'videos') {
    return `
      <button class="btn btn-primary" onclick="window.openVaultModal('video')" style="margin-bottom:12px; width:100%;">+ নতুন ভিডিও লিংক</button>
      ${videos.map(v => `
        <div class="card">
          <div class="card-title"><span>🎬 ${v.title}</span><span class="badge badge-active">${v.category}</span></div>
          <div style="display:flex; justify-content:space-between; margin-top:8px;">
            <a href="${v.videoLink}" target="_blank" class="btn btn-sm btn-copy" style="text-decoration:none;">▶️ টেলিগ্রামে দেখুন</a>
            <button class="btn btn-sm btn-danger" onclick="window.delVideo('${v.id}')">ডিলিট</button>
          </div>
        </div>
      `).join('') || '<div style="text-align:center; color:#8b949e; padding:20px;">কোনো ভিডিও নেই</div>'}
    `;
  }
}

window.setVaultTab = function(t) { activeVaultSub = t; renderVaultUI(); };
window.delVault = async (id) => { if (confirm("মুছে ফেলবেন?")) await deleteDoc(doc(db, "vault_items", id)); };
window.delVideo = async (id) => { if (confirm("মুছে ফেলবেন?")) await deleteDoc(doc(db, "video_vault", id)); };

// ৪. রিমাইন্ডার ও অ্যালার্ম সিস্টেম
const remCol = collection(db, "reminders");
let reminderData = [];
const alarmSound = new Audio("https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg");

onSnapshot(remCol, (snap) => {
  reminderData = [];
  snap.forEach(d => reminderData.push({ id: d.id, ...d.data() }));
  renderReminderUI();
});

function renderReminderUI() {
  const root = document.getElementById("reminder-root");
  if (!root) return;

  const pending = reminderData.filter(r => r.status === "pending");
  const done = reminderData.filter(r => r.status === "completed");

  root.innerHTML = `
    <button class="btn btn-primary" onclick="window.openReminderModal()" style="margin-bottom:15px; width:100%;">⏰ নতুন অ্যালার্ম যোগ করুন</button>
    <h4 style="color:#e2e8f0; margin-bottom:8px; font-size:14px;">⏳ বাকি কাজ (${pending.length})</h4>
    ${pending.map(r => `
      <div class="card" style="border-left: 4px solid #f59e0b;">
        <div class="card-title"><span>${r.title}</span><span class="badge badge-pending">${new Date(r.targetDateTime).toLocaleTimeString('bn-BD', {hour:'2-digit', minute:'2-digit'})}</span></div>
        ${r.note ? `<div style="font-size:13px; color:#8b949e;">নোট: ${r.note}</div>` : ''}
        <div style="display:flex; gap:8px; margin-top:8px;">
          <button class="btn btn-sm btn-success" onclick="window.doneReminder('${r.id}')">✅ Done</button>
          <button class="btn btn-sm btn-danger" onclick="window.delReminder('${r.id}')">মুছে ফেলুন</button>
        </div>
      </div>
    `).join('') || '<div style="text-align:center; color:#8b949e; padding:15px;">কোনো কাজ বাকি নেই</div>'}
  `;
}

window.doneReminder = async (id) => await updateDoc(doc(db, "reminders", id), { status: "completed" });
window.delReminder = async (id) => { if (confirm("মুছবেন?")) await deleteDoc(doc(db, "reminders", id)); };

setInterval(() => {
  const now = new Date();
  reminderData.forEach(r => {
    if (r.status === "pending" && !r.notified && now >= new Date(r.targetDateTime)) {
      alarmSound.play().catch(() => {});
      alert(`⏰ অ্যালার্ম: ${r.title}`);
      updateDoc(doc(db, "reminders", r.id), { notified: true });
    }
  });
}, 30000);

// ৫. পপআপ মোডাল লজিক
window.openReminderModal = function() {
  const m = document.getElementById("modal-backdrop");
  document.getElementById("modal-title").innerText = "⏰ নতুন অ্যালার্ম";
  document.getElementById("modal-body").innerHTML = `
    <div style="display:flex; flex-direction:column; gap:10px;">
      <input type="text" id="rT" placeholder="কাজের নাম" class="input-field">
      <input type="datetime-local" id="rTm" class="input-field">
      <textarea id="rN" placeholder="নোট (ঐচ্ছিক)" class="input-field" rows="2"></textarea>
      <button class="btn btn-primary" id="saveRBtn">সেভ করুন</button>
    </div>
  `;
  m.style.display = "flex";
  document.getElementById("saveRBtn").onclick = async () => {
    const t = document.getElementById("rT").value;
    const tm = document.getElementById("rTm").value;
    const n = document.getElementById("rN").value;
    if (!t || !tm) return alert("নাম ও সময় দিন");
    await addDoc(remCol, { title: t, targetDateTime: tm, note: n, status: "pending", notified: false });
    window.closeAnyModal();
  };
};

window.openVaultModal = function(type) {
  const m = document.getElementById("modal-backdrop");
  const title = document.getElementById("modal-title");
  const body = document.getElementById("modal-body");
  m.style.display = "flex";

  if (type === 'password') {
    title.innerText = "🔑 নতুন পাসওয়ার্ড";
    body.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:10px;">
        <input type="text" id="vpT" placeholder="অ্যাকাউন্টের নাম" class="input-field">
        <input type="text" id="vpU" placeholder="ইউজারনেম / ইমেইল" class="input-field">
        <input type="text" id="vpP" placeholder="পাসওয়ার্ড" class="input-field">
        <button class="btn btn-primary" id="saveVp">সেভ করুন</button>
      </div>
    `;
    document.getElementById("saveVp").onclick = async () => {
      await addDoc(vaultCol, { type: "password", title: document.getElementById("vpT").value, username: document.getElementById("vpU").value, secret: document.getElementById("vpP").value });
      window.closeAnyModal();
    };
  } else if (type === 'doc') {
    title.innerText = "📄 নতুন ডকুমেন্ট";
    body.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:10px;">
        <input type="text" id="vdT" placeholder="ফাইলের নাম" class="input-field">
        <input type="text" id="vdL" placeholder="ফাইল লিংক" class="input-field">
        <button class="btn btn-primary" id="saveVd">সেভ করুন</button>
      </div>
    `;
    document.getElementById("saveVd").onclick = async () => {
      await addDoc(vaultCol, { type: "document", title: document.getElementById("vdT").value, docLink: document.getElementById("vdL").value });
      window.closeAnyModal();
    };
  } else if (type === 'video') {
    title.innerText = "🎬 নতুন ভিডিও";
    body.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:10px;">
        <input type="text" id="vvT" placeholder="ভিডিওর নাম" class="input-field">
        <input type="text" id="vvC" placeholder="ক্যাটাগরি" class="input-field">
        <input type="text" id="vvL" placeholder="টেলিগ্রাম লিংক" class="input-field">
        <button class="btn btn-primary" id="saveVv">সেভ করুন</button>
      </div>
    `;
    document.getElementById("saveVv").onclick = async () => {
      await addDoc(videoCol, { title: document.getElementById("vvT").value, category: document.getElementById("vvC").value, videoLink: document.getElementById("vvL").value });
      window.closeAnyModal();
    };
  }
};
