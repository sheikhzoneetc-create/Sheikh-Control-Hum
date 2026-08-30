import { db, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot } from "./firebase-config.js";

// ১. গ্লোবাল নেভিগেশন
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

// ==========================================
// ২. প্যাকেজ মডিউল (Packages Logic)
// ==========================================
const pkgCol = collection(db, "package_records");
let localPackages = [];

onSnapshot(pkgCol, (snap) => {
  localPackages = [];
  snap.forEach(d => localPackages.push({ id: d.id, ...d.data() }));
  renderPackagesUI();
});

function renderPackagesUI() {
  const root = document.getElementById("packages-root");
  if (!root) return;

  const activeCount = localPackages.filter(p => p.status === "active").length;

  root.innerHTML = `
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;">
      <div class="card" style="margin: 0; padding: 12px; text-align: center; background: #161b22;">
        <span style="font-size: 12px; color: #8b949e;">সক্রিয় প্যাকেজ</span>
        <div style="font-size: 20px; font-weight: bold; color: #3fb950;">${activeCount} টি</div>
      </div>
      <div class="card" style="margin: 0; padding: 12px; text-align: center; background: #161b22;">
        <span style="font-size: 12px; color: #8b949e;">মোট রেকর্ড</span>
        <div style="font-size: 20px; font-weight: bold; color: #58a6ff;">${localPackages.length} টি</div>
      </div>
    </div>

    <button class="btn btn-primary" onclick="window.openPackageModal()" style="margin-bottom: 15px; width: 100%;">
      + নতুন প্যাকেজ রেকর্ড যোগ করুন
    </button>

    <div id="pkgList">
      ${localPackages.map(p => `
        <div class="card" style="margin-bottom: 10px;">
          <div class="card-title">
            <span style="color: #f0f6fc;">${p.customerName || 'কাস্টমার'}</span>
            <span class="badge ${p.status === 'active' ? 'badge-active' : 'badge-expired'}">${p.status || 'Active'}</span>
          </div>
          <div style="font-size: 13px; color: #8b949e; margin: 4px 0;">📱 নাম্বার: ${p.phone || 'N/A'}</div>
          <div style="font-size: 13px; color: #58a6ff;">📦 বিবরণ: ${p.packDetails || 'ফ্যামিলি প্যাক'}</div>
          <div style="display: flex; justify-content: flex-end; margin-top: 8px;">
            <button class="btn btn-sm btn-danger" onclick="window.delPackage('${p.id}')">মুছে ফেলুন</button>
          </div>
        </div>
      `).join('') || '<div style="text-align:center; color:#8b949e; padding:20px;">কোনো প্যাকেজ রেকর্ড নেই</div>'}
    </div>
  `;
}

window.delPackage = async (id) => {
  if (confirm("এই রেকর্ডটি মুছে ফেলতে চান?")) await deleteDoc(doc(db, "package_records", id));
};

// ==========================================
// ৩. জিমেইল মডিউল (Gmail Logic)
// ==========================================
const gmailCol = collection(db, "gmail_stocks");
let localGmail = [];

onSnapshot(gmailCol, (snap) => {
  localGmail = [];
  snap.forEach(d => localGmail.push({ id: d.id, ...d.data() }));
  renderGmailUI();
});

function renderGmailUI() {
  const root = document.getElementById("gmail-root");
  if (!root) return;

  const fresh = localGmail.filter(g => g.status === "fresh");
  const sold = localGmail.filter(g => g.status === "sold");

  root.innerHTML = `
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;">
      <div class="card" style="margin: 0; padding: 12px; text-align: center; background: #161b22;">
        <span style="font-size: 12px; color: #8b949e;">ফ্রেশ স্টক</span>
        <div style="font-size: 20px; font-weight: bold; color: #3fb950;">${fresh.length} টি</div>
      </div>
      <div class="card" style="margin: 0; padding: 12px; text-align: center; background: #161b22;">
        <span style="font-size: 12px; color: #8b949e;">বিক্রি হয়েছে</span>
        <div style="font-size: 20px; font-weight: bold; color: #58a6ff;">${sold.length} টি</div>
      </div>
    </div>

    <button class="btn btn-primary" onclick="window.openGmailModal()" style="margin-bottom: 15px; width: 100%;">
      + নতুন জিমেইল স্টক যোগ করুন
    </button>

    <h4 style="color:#f0f6fc; margin-bottom:8px; font-size:14px;">✉️ ফ্রেশ জিমেইল স্টক</h4>
    <div id="freshGmail">
      ${fresh.map(g => `
        <div class="card" style="margin-bottom: 10px;">
          <div class="card-title">
            <span style="font-size:13px; word-break:break-all;">${g.email}</span>
            <span class="badge badge-active">Fresh</span>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px;">
            <span style="font-size:13px; color:#58a6ff;">🔑 ${g.pass}</span>
            <button class="btn btn-sm btn-copy" onclick="window.copyVaultText('${g.email} | ${g.pass}')">📋 কপি</button>
          </div>
          <div style="display:flex; gap:8px; margin-top:10px;">
            <button class="btn btn-sm btn-success" onclick="window.markGmailSold('${g.id}')">✔️ বিক্রি মার্ক করুন</button>
            <button class="btn btn-sm btn-danger" onclick="window.delGmail('${g.id}')">মুছুন</button>
          </div>
        </div>
      `).join('') || '<div style="text-align:center; color:#8b949e; padding:20px;">কোনো ফ্রেশ স্টক নেই</div>'}
    </div>
  `;
}

window.markGmailSold = async (id) => await updateDoc(doc(db, "gmail_stocks", id), { status: "sold" });
window.delGmail = async (id) => { if (confirm("মুছবেন?")) await deleteDoc(doc(db, "gmail_stocks", id)); };

// ==========================================
// ৪. ভল্ট মডিউল (Vault: Password, Doc, Video)
// ==========================================
const vaultCol = collection(db, "vault_items");
const videoCol = collection(db, "video_vault");
let localVault = [];
let localVideos = [];
let currentVaultSub = "passwords";

onSnapshot(vaultCol, (snap) => {
  localVault = [];
  snap.forEach(d => localVault.push({ id: d.id, ...d.data() }));
  renderVaultUI();
});

onSnapshot(videoCol, (snap) => {
  localVideos = [];
  snap.forEach(d => localVideos.push({ id: d.id, ...d.data() }));
  renderVaultUI();
});

function renderVaultUI() {
  const root = document.getElementById("vault-root");
  if (!root) return;

  const passwords = localVault.filter(i => i.type === "password");
  const docs = localVault.filter(i => i.type === "document");

  root.innerHTML = `
    <div style="display: flex; gap: 6px; background: #161b22; padding: 6px; border-radius: 10px; margin-bottom: 15px; border: 1px solid #30363d;">
      <button class="sub-tab-btn ${currentVaultSub === 'passwords' ? 'active-sub' : ''}" onclick="window.setVaultSub('passwords')">
        🔑 পাসওয়ার্ড (${passwords.length})
      </button>
      <button class="sub-tab-btn ${currentVaultSub === 'docs' ? 'active-sub' : ''}" onclick="window.setVaultSub('docs')">
        📄 ফাইল (${docs.length})
      </button>
      <button class="sub-tab-btn ${currentVaultSub === 'videos' ? 'active-sub' : ''}" onclick="window.setVaultSub('videos')">
        🎬 ভিডিও (${localVideos.length})
      </button>
    </div>
    <div>${renderSubVaultContent(currentVaultSub, passwords, docs, localVideos)}</div>
  `;
}

function renderSubVaultContent(sub, passwords, docs, videos) {
  if (sub === 'passwords') {
    return `
      <button class="btn btn-primary" onclick="window.openVaultModal('password')" style="margin-bottom:12px; width:100%;">+ নতুন পাসওয়ার্ড</button>
      ${passwords.map(p => `
        <div class="card">
          <div class="card-title"><span>🔑 ${p.title}</span><button class="btn btn-sm btn-danger" onclick="window.delVaultItem('${p.id}')">ডিলিট</button></div>
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
      <button class="btn btn-primary" onclick="window.openVaultModal('doc')" style="margin-bottom:12px; width:100%;">+ নতুন ডকুমেন্ট লিংক</button>
      ${docs.map(d => `
        <div class="card">
          <div class="card-title"><span>📄 ${d.title}</span><button class="btn btn-sm btn-danger" onclick="window.delVaultItem('${d.id}')">ডিলিট</button></div>
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
            <button class="btn btn-sm btn-danger" onclick="window.delVideoItem('${v.id}')">ডিলিট</button>
          </div>
        </div>
      `).join('') || '<div style="text-align:center; color:#8b949e; padding:20px;">কোনো ভিডিও নেই</div>'}
    `;
  }
}

window.setVaultSub = function(sub) { currentVaultSub = sub; renderVaultUI(); };
window.delVaultItem = async (id) => { if (confirm("মুছে ফেলবেন?")) await deleteDoc(doc(db, "vault_items", id)); };
window.delVideoItem = async (id) => { if (confirm("মুছে ফেলবেন?")) await deleteDoc(doc(db, "video_vault", id)); };

// ==========================================
// ৫. রিমাইন্ডার ও অ্যালার্ম মডিউল
// ==========================================
const remCol = collection(db, "reminders");
let localReminders = [];
const alarmSound = new Audio("https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg");

onSnapshot(remCol, (snap) => {
  localReminders = [];
  snap.forEach(d => localReminders.push({ id: d.id, ...d.data() }));
  renderReminderUI();
});

function renderReminderUI() {
  const root = document.getElementById("reminder-root");
  if (!root) return;

  const pending = localReminders.filter(r => r.status === "pending");

  root.innerHTML = `
    <button class="btn btn-primary" onclick="window.openReminderModal()" style="margin-bottom:15px; width:100%;">⏰ নতুন কাজের অ্যালার্ম যোগ করুন</button>
    <h4 style="color:#f0f6fc; margin-bottom:8px; font-size:14px;">⏳ বাকি কাজ (${pending.length})</h4>
    ${pending.map(r => `
      <div class="card" style="border-left: 4px solid #f59e0b;">
        <div class="card-title"><span>${r.title}</span><span class="badge badge-pending">${new Date(r.targetDateTime).toLocaleTimeString('bn-BD', {hour:'2-digit', minute:'2-digit'})}</span></div>
        ${r.note ? `<div style="font-size:13px; color:#8b949e; margin:4px 0;">নোট: ${r.note}</div>` : ''}
        <div style="display:flex; gap:8px; margin-top:8px;">
          <button class="btn btn-sm btn-success" onclick="window.completeReminder('${r.id}')">✅ Done</button>
          <button class="btn btn-sm btn-danger" onclick="window.delReminder('${r.id}')">মুছে ফেলুন</button>
        </div>
      </div>
    `).join('') || '<div style="text-align:center; color:#8b949e; padding:15px;">কোনো কাজ বাকি নেই</div>'}
  `;
}

window.completeReminder = async (id) => await updateDoc(doc(db, "reminders", id), { status: "completed" });
window.delReminder = async (id) => { if (confirm("মুছবেন?")) await deleteDoc(doc(db, "reminders", id)); };

setInterval(() => {
  const now = new Date();
  localReminders.forEach(r => {
    if (r.status === "pending" && !r.notified && now >= new Date(r.targetDateTime)) {
      alarmSound.play().catch(() => {});
      alert(`⏰ অ্যালার্ম: ${r.title}`);
      updateDoc(doc(db, "reminders", r.id), { notified: true });
    }
  });
}, 30000);

// ==========================================
// ৬. পপআপ ডায়ালগ ওপেনার
// ==========================================
window.openPackageModal = function() {
  const m = document.getElementById("modal-backdrop");
  document.getElementById("modal-title").innerText = "📦 নতুন প্যাকেজ";
  document.getElementById("modal-body").innerHTML = `
    <div style="display:flex; flex-direction:column; gap:10px;">
      <input type="text" id="pCustName" placeholder="কাস্টমারের নাম" class="input-field">
      <input type="text" id="pCustPhone" placeholder="মোবাইল নাম্বার" class="input-field">
      <input type="text" id="pCustPack" placeholder="প্যাকেজ বিবরণ" class="input-field">
      <button class="btn btn-primary" id="btnSavePkg">সেভ করুন</button>
    </div>
  `;
  m.style.display = "flex";
  document.getElementById("btnSavePkg").onclick = async () => {
    const name = document.getElementById("pCustName").value;
    const phone = document.getElementById("pCustPhone").value;
    const pack = document.getElementById("pCustPack").value;
    if (!name || !phone) return alert("নাম ও নাম্বার দিন");
    await addDoc(pkgCol, { customerName: name, phone, packDetails: pack, status: "active", createdAt: new Date().toISOString() });
    window.closeAnyModal();
  };
};

window.openGmailModal = function() {
  const m = document.getElementById("modal-backdrop");
  document.getElementById("modal-title").innerText = "✉️ নতুন জিমেইল যোগ";
  document.getElementById("modal-body").innerHTML = `
    <div style="display:flex; flex-direction:column; gap:10px;">
      <input type="email" id="gmEmail" placeholder="জিমেইল এড্রেস" class="input-field">
      <input type="text" id="gmPass" placeholder="পাসওয়ার্ড" class="input-field">
      <button class="btn btn-primary" id="saveGmBtn">সংরক্ষণ করুন</button>
    </div>
  `;
  m.style.display = "flex";
  document.getElementById("saveGmBtn").onclick = async () => {
    const email = document.getElementById("gmEmail").value;
    const pass = document.getElementById("gmPass").value;
    if (!email || !pass) return alert("ইমেইল ও পাসওয়ার্ড দিন!");
    await addDoc(gmailCol, { email, pass, status: "fresh", createdAt: new Date().toISOString() });
    window.closeAnyModal();
  };
};

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
