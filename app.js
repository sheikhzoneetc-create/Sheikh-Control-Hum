import { db, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot } from "./firebase-config.js";

let localMasters = [];
let localCustomers = [];

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
// ==========================================
// ফ্যামিলি মাস্টার ও কাস্টমার ম্যানেজমেন্ট মডিউল
// ==========================================
const masterPkgCol = collection(db, "family_masters");
const customerPkgCol = collection(db, "family_customers");

onSnapshot(masterPkgCol, (snap) => {
   localMasters = [];
  snap.forEach(d => localMasters.push({ id: d.id, ...d.data() }));
  renderPackagesUI();
});

onSnapshot(customerPkgCol, (snap) => {
  localCustomers = [];
  snap.forEach(d => localCustomers.push({ id: d.id, ...d.data() }));
  renderPackagesUI();
});


function renderPackagesUI() {
  const root = document.getElementById("packages-root");
  if (!root) return;

  const totalSlots = localMasters.length * 8; // প্রতি ফ্যামিলিতে অটো ৮ জনের স্লট
  const occupiedSlots = localCustomers.length;
  const availableSlots = totalSlots - occupiedSlots;
  const totalRevenue = localCustomers.reduce((sum, c) => sum + (parseFloat(c.price) || 0), 0);

  root.innerHTML = `
    <!-- টপ ড্যাশবোর্ড ওভারভিউ -->
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px;">
      <div class="card" style="margin: 0; padding: 12px; text-align: center; background: #161b22;">
        <span style="font-size: 11px; color: #8b949e;">ফাঁকা স্লট</span>
        <div style="font-size: 20px; font-weight: bold; color: ${availableSlots > 0 ? '#3fb950' : '#f85149'};">
          ${availableSlots > 0 ? availableSlots : 0} টি
        </div>
      </div>
      <div class="card" style="margin: 0; padding: 12px; text-align: center; background: #161b22;">
        <span style="font-size: 11px; color: #8b949e;">মোট বিক্রয়</span>
        <div style="font-size: 20px; font-weight: bold; color: #58a6ff;">৳ ${totalRevenue}</div>
      </div>
    </div>

    <!-- অ্যাকশন বাটনসমূহ -->
    <div style="display: flex; gap: 8px; margin-bottom: 15px;">
      <button class="btn btn-primary" onclick="window.openAddCustomerModal()" style="background: #238636; flex: 1.2;">
        👤 কাস্টমার ডাটা অ্যাড
      </button>
      <button class="btn btn-primary" onclick="window.openAddMasterModal()" style="background: #1f6feb; flex: 1;">
        👑 ফ্যামিলি মাস্টার তৈরি
      </button>
    </div>

    <!-- কাস্টমার ডাটা লিস্ট -->
    <h4 style="color:#f0f6fc; margin-bottom: 8px; font-size: 14px;">👥 কাস্টমার ডাটা ও প্যাকেজ</h4>
    <div id="customerList" style="margin-bottom: 20px;">
      ${localCustomers.map(c => {
        const master = localMasters.find(m => m.id === c.masterId);
        const opColor = master?.operator === 'GP' ? '#0084ff' : master?.operator === 'Robi' ? '#e11414' : '#f97316';
        
        const now = new Date();
        const expDate = c.expiryDate ? new Date(c.expiryDate) : null;
        let isExpired = false;
        let daysLeft = null;

        if (expDate && !isNaN(expDate.getTime())) {
          const diffTime = expDate - now;
          daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          if (daysLeft < 0) isExpired = true;
        }

        return `
          <div class="card" style="margin-bottom: 10px; border-left: 4px solid ${isExpired ? '#da3633' : (daysLeft !== null && daysLeft <= 2) ? '#d29922' : '#388bfd'};">
            <div class="card-title">
              <div>
                <span style="color: #fff; font-weight: bold; font-size: 14px;">${c.name}</span>
                <span style="font-size: 12px; color: #8b949e; margin-left: 4px;">(${c.phone})</span>
              </div>
              <span class="badge ${isExpired ? 'badge-expired' : 'badge-active'}">
                ${isExpired ? 'মেয়াদ শেষ' : (daysLeft !== null ? `${daysLeft} দিন বাকি` : 'Active')}
              </span>
            </div>
            
            <div style="display: flex; gap: 6px; margin: 6px 0; font-size: 12px; flex-wrap: wrap;">
              <span class="badge badge-active">🌐 ${c.dataGb || '0'} GB</span>
              <span class="badge badge-active">📞 ${c.minutes || '0'} Min</span>
              ${c.sms ? `<span class="badge badge-active">✉️ ${c.sms} SMS</span>` : ''}
              ${c.price ? `<span class="badge" style="background:#238636; color:#fff;">৳ ${c.price}</span>` : ''}
              ${master ? `<span class="badge" style="background:${opColor}; color:#fff;">${master.operator}</span>` : ''}
              ${c.ytEmail ? `<span class="badge" style="background:#da3633; color:#fff;">▶️ YT Active</span>` : ''}
            </div>

            <div style="font-size: 12px; color: #8b949e; margin-top: 4px;">
              👑 ফ্যামিলি: <span style="color: #f0f6fc;">${master ? `${master.operator} - ${master.masterPhone}` : 'আন-অ্যাসাইনড'}</span>
            </div>
            <div style="font-size: 12px; color: #8b949e; margin-top: 2px;">
              ⏳ মেয়াদ: <span style="color: #e3b341;">${c.expiryDate || 'নির্ধারিত নেই'}</span>
            </div>

            ${c.ytEmail ? `
              <div style="font-size: 12px; color: #8b949e; margin-top: 4px; background:#0d1117; padding:4px 8px; border-radius:4px;">
                ▶️ YT: <span style="color: #58a6ff;">${c.ytEmail}</span> | 🔑 <span style="color: #3fb950;">${c.ytPass || 'N/A'}</span>
              </div>
            ` : ''}

            <div style="display: flex; gap: 6px; justify-content: flex-end; margin-top: 8px;">
              <button class="btn btn-sm btn-success" onclick="window.sendWhatsAppInvoice('${c.id}')" style="background: #25d366; color: #000; font-weight: bold;">
                📲 মেসেজ পাঠান
              </button>
              <button class="btn btn-sm btn-copy" onclick="window.openRenewCustomerModal('${c.id}')">
                🔄 রিনিউ
              </button>
              <button class="btn btn-sm btn-danger" onclick="window.delCustomer('${c.id}')">
                মুছুন
              </button>
            </div>
          </div>
        `;
      }).join('') || '<div style="text-align:center; color:#8b949e; padding:15px;">কোনো কাস্টমার ডাটা নেই</div>'}
    </div>

    <!-- ফ্যামিলি মাস্টার ও ব্যালেন্স হিসাব -->
    <h4 style="color:#f0f6fc; margin-bottom: 8px; font-size: 14px;">👑 ফ্যামিলি মাস্টার ও ব্যালেন্স ট্র্যাকিং</h4>
    <div id="masterList">
      ${localMasters.map(m => {
        const assigned = localCustomers.filter(c => c.masterId === m.id);
        const freeSlots = 8 - assigned.length;
        const opColor = m.operator === 'GP' ? '#0084ff' : m.operator === 'Robi' ? '#e11414' : '#f97316';

        const usedGb = assigned.reduce((sum, c) => sum + (parseFloat(c.dataGb) || 0), 0);
        const usedMin = assigned.reduce((sum, c) => sum + (parseFloat(c.minutes) || 0), 0);
        const usedSms = assigned.reduce((sum, c) => sum + (parseFloat(c.sms) || 0), 0);

        const remainingGb = (parseFloat(m.totalGb) || 0) - usedGb;
        const remainingMin = (parseFloat(m.totalMin) || 0) - usedMin;
        const remainingSms = (parseFloat(m.totalSms) || 0) - usedSms;

        return `
          <div class="card" style="margin-bottom: 12px; border: 1px solid #30363d; background: #161b22;">
            <div class="card-title">
              <span style="font-weight:bold; color:#f0f6fc;">
                <span class="badge" style="background:${opColor}; color:#fff; margin-right:4px;">${m.operator}</span> 
                ${m.masterPhone}
              </span>
              <span class="badge ${freeSlots > 0 ? 'badge-active' : 'badge-expired'}">
                ${freeSlots > 0 ? `${freeSlots}/8 স্লট বাকি` : 'ফুল (Full)'}
              </span>
            </div>
            
            <div style="background: #0d1117; border: 1px solid #21262d; border-radius: 6px; padding: 8px; margin: 8px 0; font-size: 12px;">
              <div style="color: #8b949e; margin-bottom: 4px; font-weight: bold;">অবশিষ্ট ব্যালেন্স:</div>
              <div style="display: flex; gap: 8px;">
                <span style="color: ${remainingGb >= 0 ? '#3fb950' : '#f85149'};">🌐 বাকি: ${remainingGb.toFixed(1)} GB</span>
                <span style="color: ${remainingMin >= 0 ? '#58a6ff' : '#f85149'};">📞 বাকি: ${remainingMin} Min</span>
                ${m.totalSms ? `<span style="color: #e3b341;">✉️ বাকি: ${remainingSms} SMS</span>` : ''}
              </div>
              <div style="font-size: 11px; color: #8b949e; margin-top: 4px;">
                (মোট প্যাক: ${m.totalGb || 0}GB, ${m.totalMin || 0}Min)
              </div>
            </div>

            <div style="font-size: 12px; color: #e3b341; margin-bottom: 8px;">
              ⏳ মাস্টার মেয়াদ: ${m.expiryDate || 'N/A'}
            </div>

            <div style="display: flex; gap: 6px; margin-bottom: 10px;">
              <button class="btn btn-sm btn-primary" onclick="window.openAddPackToMasterModal('${m.id}')">
                + প্যাক লোড / রিনিউ
              </button>
              <button class="btn btn-sm btn-danger" onclick="window.delMasterPackage('${m.id}')">
                মাস্টার মুছুন
              </button>
            </div>

            <div style="background: #0d1117; padding: 6px 10px; border-radius: 6px; font-size: 12px;">
              <div style="color: #8b949e; margin-bottom: 4px; font-weight: bold;">সদস্য তালিকা (${assigned.length}/8):</div>
              ${assigned.map((a, idx) => `
                <div style="display:flex; justify-content:space-between; padding:3px 0; border-bottom:1px solid #21262d; color:#c9d1d9;">
                  <span>${idx + 1}. ${a.name} (${a.dataGb || 0}GB, ${a.minutes || 0}M)</span>
                  <span style="color: #58a6ff; font-size: 11px;">${a.phone}</span>
                </div>
              `).join('') || '<div style="color: #6e7681;">কোনো সদস্য যুক্ত নেই</div>'}
            </div>
          </div>
        `;
      }).join('') || '<div style="text-align:center; color:#8b949e; padding:15px;">কোনো ফ্যামিলি মাস্টার তৈরি নেই</div>'}
    </div>
  `;
}

// ফ্যামিলি মাস্টার ক্রিয়েশন ও প্যাক লোড ফাংশনসমূহ
window.openAddMasterModal = function() {
  const m = document.getElementById("modal-backdrop");
  document.getElementById("modal-title").innerText = "👑 নতুন ফ্যামিলি মাস্টার তৈরি";
  document.getElementById("modal-body").innerHTML = `
    <div style="display:flex; flex-direction:column; gap:10px;">
      <label style="font-size:12px; color:#8b949e;">অপারেটর বেছে নিন:</label>
      <select id="mOperator" class="input-field">
        <option value="Robi">রবি (Robi)</option>
        <option value="Airtel">এয়ারটেল (Airtel)</option>
        <option value="GP">গ্রামীণফোন (GP)</option>
      </select>
      
      <input type="text" id="mPhone" placeholder="মাস্টার সিমের মোবাইল নাম্বার" class="input-field">
      <button class="btn btn-primary" id="saveMasterBtn" style="background:#1f6feb;">মাস্টার সিম সংরক্ষণ করুন</button>
    </div>
  `;
  m.style.display = "flex";

  document.getElementById("saveMasterBtn").onclick = async () => {
    const operator = document.getElementById("mOperator").value;
    const phone = document.getElementById("mPhone").value;
    if (!phone) return alert("মাস্টার সিমের মোবাইল নাম্বার দিন!");

    await addDoc(masterPkgCol, {
      operator: operator,
      masterPhone: phone.trim(),
      totalGb: "0",
      totalMin: "0",
      totalSms: "0",
      expiryDate: "",
      createdAt: new Date().toISOString()
    });
    window.closeAnyModal();
  };
};

window.openAddPackToMasterModal = function(masterId) {
  const m = document.getElementById("modal-backdrop");
  document.getElementById("modal-title").innerText = "📦 মাস্টারে প্যাকেজ লোড (৩০ দিন মেয়াদ)";
  document.getElementById("modal-body").innerHTML = `
    <div style="display:flex; flex-direction:column; gap:10px;">
      <input type="number" id="loadGb" placeholder="কত GB কিনলেন (যেমন: 50 বা 100)" class="input-field">
      <input type="number" id="loadMin" placeholder="কত Min কিনলেন (যেমন: 1000)" class="input-field">
      <input type="number" id="loadSms" placeholder="কত SMS (ঐচ্ছিক)" class="input-field">
      <button class="btn btn-primary" id="savePackToMasterBtn" style="background:#238636;">প্যাকেজ লোড করুন</button>
    </div>
  `;
  m.style.display = "flex";

  document.getElementById("savePackToMasterBtn").onclick = async () => {
    const gb = document.getElementById("loadGb").value || "0";
    const min = document.getElementById("loadMin").value || "0";
    const sms = document.getElementById("loadSms").value || "0";

    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() + 30);
    const expStr = baseDate.toISOString().split("T")[0];

    await updateDoc(doc(db, "family_masters", masterId), {
      totalGb: gb.trim(),
      totalMin: min.trim(),
      totalSms: sms.trim(),
      expiryDate: expStr
    });

    alert(`✅ প্যাকেজ লোড হয়েছে এবং মেয়াদ ${expStr} পর্যন্ত সেট করা হয়েছে!`);
    window.closeAnyModal();
  };
};

window.delMasterPackage = async function(id) {
  if (confirm("এই ফ্যামিলি মাস্টার ডিলিট করতে চান?")) {
    await deleteDoc(doc(db, "family_masters", id));
  }
};

// কাস্টমার অ্যাড ও রিনিউ মডিউল
window.openAddCustomerModal = function() {
  if (localMasters.length === 0) return alert("আগে একটি ফ্যামিলি মাস্টার তৈরি করুন!");

  const availableMasters = localMasters.filter(m => {
    const count = localCustomers.filter(c => c.masterId === m.id).length;
    return count < 8;
  });

  if (availableMasters.length === 0) return alert("সবগুলো ফ্যামিলি প্যাকের ৮টি স্লটই ফুল!");

  const freshGmails = localGmail.filter(g => g.status === "fresh");
  const m = document.getElementById("modal-backdrop");
  document.getElementById("modal-title").innerText = "👤 কাস্টমার ডাটা অ্যাড";
  document.getElementById("modal-body").innerHTML = `
    <div style="display:flex; flex-direction:column; gap:10px;">
      <input type="text" id="custName" placeholder="কাস্টমারের নাম" class="input-field">
      <input type="text" id="custPhone" placeholder="মোবাইল নাম্বার" class="input-field">
      
      <div style="display: flex; gap: 8px;">
        <input type="number" id="custGb" placeholder="কত GB" class="input-field" style="flex: 1;">
        <input type="number" id="custMin" placeholder="কত Min" class="input-field" style="flex: 1;">
      </div>

      <div style="display: flex; gap: 8px;">
        <input type="number" id="custSms" placeholder="SMS (ঐচ্ছিক)" class="input-field" style="flex: 1;">
        <input type="number" id="custPrice" placeholder="দাম (৳)" class="input-field" style="flex: 1;">
      </div>

      <label style="font-size:12px; color:#8b949e;">⏳ কাস্টমারের মেয়াদ নির্বাচন করুন:</label>
      <input type="date" id="custExpDate" class="input-field">

      <label style="font-size:12px; color:#8b949e;">👑 ফ্যামিলি প্যাকেজ নির্বাচন করুন:</label>
      <select id="custMasterId" class="input-field">
        ${availableMasters.map(m => {
          const count = localCustomers.filter(c => c.masterId === m.id).length;
          const left = 8 - count;
          return `<option value="${m.id}">[${m.operator}] ${m.masterPhone} - [${left}/8 স্লট বাকি]</option>`;
        }).join('')}
      </select>

      <label style="font-size:12px; color:#8b949e;">▶️ YouTube প্রিমিয়াম আছে?</label>
      <select id="custYtToggle" class="input-field" onchange="window.toggleYtSelect(this.value)">
        <option value="no">না (প্রয়োজন নেই)</option>
        <option value="yes">হ্যাঁ (প্রিমিয়াম যুক্ত করুন)</option>
      </select>

      <div id="ytGmailContainer" style="display: none;">
        <label style="font-size:12px; color:#8b949e;">✉️ ফ্রেশ জিমেইল বেছে নিন:</label>
        <select id="custYtEmail" class="input-field">
          ${freshGmails.map(g => `<option value="${g.email}" data-id="${g.id}" data-pass="${g.pass}">${g.email}</option>`).join('') || '<option value="">কোনো ফ্রেশ জিমেইল নেই</option>'}
        </select>
      </div>

      <button class="btn btn-primary" id="saveCustomerBtn" style="background:#238636; margin-top:5px;">কাস্টমার সংরক্ষণ করুন</button>
    </div>
  `;
  m.style.display = "flex";

  const d = new Date();
  d.setDate(d.getDate() + 30);
  document.getElementById("custExpDate").value = d.toISOString().split("T")[0];

  document.getElementById("saveCustomerBtn").onclick = async () => {
    const name = document.getElementById("custName").value;
    const phone = document.getElementById("custPhone").value;
    const gb = document.getElementById("custGb").value || "0";
    const min = document.getElementById("custMin").value || "0";
    const sms = document.getElementById("custSms").value || "0";
    const price = document.getElementById("custPrice").value || "0";
    const exp = document.getElementById("custExpDate").value;
    const masterId = document.getElementById("custMasterId").value;
    const hasYt = document.getElementById("custYtToggle").value;

    if (!name || !phone) return alert("কাস্টমারের নাম ও মোবাইল নাম্বার দিন!");
    if (!masterId) return alert("ফ্যামিলি প্যাকেজ নির্বাচন করুন!");

    let assignedYtEmail = "";
    let assignedYtPass = "";
    if (hasYt === "yes") {
      const sel = document.getElementById("custYtEmail");
      assignedYtEmail = sel.value;
      const opt = sel.options[sel.selectedIndex];
      const gId = opt ? opt.getAttribute("data-id") : null;
      assignedYtPass = opt ? opt.getAttribute("data-pass") : "";
      if (gId) {
        await updateDoc(doc(db, "gmail_stocks", gId), { status: "sold" });
      }
    }

    await addDoc(customerPkgCol, {
      name: name.trim(),
      phone: phone.trim(),
      dataGb: gb.trim(),
      minutes: min.trim(),
      sms: sms.trim(),
      price: price.trim(),
      expiryDate: exp,
      masterId: masterId,
      ytEmail: assignedYtEmail,
      ytPass: assignedYtPass,
      createdAt: new Date().toISOString()
    });

    window.closeAnyModal();
  };
};

window.toggleYtSelect = function(val) {
  const box = document.getElementById("ytGmailContainer");
  if (box) box.style.display = (val === "yes") ? "block" : "none";
};

window.openRenewCustomerModal = function(customerId) {
  const cust = localCustomers.find(c => c.id === customerId);
  if (!cust) return;

  const freshGmails = localGmail.filter(g => g.status === "fresh");
  const m = document.getElementById("modal-backdrop");
  document.getElementById("modal-title").innerText = `🔄 রিনিউ: ${cust.name}`;
  document.getElementById("modal-body").innerHTML = `
    <div style="display:flex; flex-direction:column; gap:10px;">
      <div style="display: flex; gap: 8px;">
        <input type="number" id="renGb" value="${cust.dataGb || ''}" placeholder="GB" class="input-field" style="flex:1;">
        <input type="number" id="renMin" value="${cust.minutes || ''}" placeholder="Min" class="input-field" style="flex:1;">
      </div>
      <div style="display: flex; gap: 8px;">
        <input type="number" id="renSms" value="${cust.sms || ''}" placeholder="SMS" class="input-field" style="flex:1;">
        <input type="number" id="renPrice" value="${cust.price || ''}" placeholder="দাম (৳)" class="input-field" style="flex:1;">
      </div>

      <label style="font-size:12px; color:#8b949e;">নতুন মেয়াদের তারিখ:</label>
      <input type="date" id="renExpDate" class="input-field">

      <label style="font-size:12px; color:#8b949e;">▶️ YouTube প্রিমিয়াম আপডেট:</label>
      <select id="renYtAction" class="input-field">
        <option value="keep">আগেরটাই থাকবে (${cust.ytEmail || 'নাই'})</option>
        <option value="change">নতুন ফ্রেশ জিমেইল দিন</option>
        <option value="remove">ইউটিউব বন্ধ করুন</option>
      </select>

      <div id="renYtFreshBox" style="display:none;">
        <select id="renYtFreshSelect" class="input-field">
          ${freshGmails.map(g => `<option value="${g.email}" data-id="${g.id}" data-pass="${g.pass}">${g.email}</option>`).join('') || '<option value="">কোনো ফ্রেশ জিমেইল নেই</option>'}
        </select>
      </div>

      <button class="btn btn-primary" id="saveRenewBtn" style="background:#238636;">রিনিউ সম্পন্ন করুন</button>
    </div>
  `;
  m.style.display = "flex";

  const nextExp = new Date();
  nextExp.setDate(nextExp.getDate() + 30);
  document.getElementById("renExpDate").value = nextExp.toISOString().split("T")[0];

  document.getElementById("renYtAction").onchange = (e) => {
    document.getElementById("renYtFreshBox").style.display = (e.target.value === "change") ? "block" : "none";
  };

    document.getElementById("saveRenewBtn").onclick = async () => {
    const gb = document.getElementById("renGb").value || "0";
    const min = document.getElementById("renMin").value || "0";
    const sms = document.getElementById("renSms").value || "0";
    const price = document.getElementById("renPrice").value || "0";
    const exp = document.getElementById("renExpDate").value;
    const ytAction = document.getElementById("renYtAction").value;

    let finalYtEmail = cust.ytEmail || "";
    let finalYtPass = cust.ytPass || "";

    if (ytAction === "remove") {
      finalYtEmail = ""; finalYtPass = "";
    } else if (ytAction === "change") {
      const sel = document.getElementById("renYtFreshSelect");
      finalYtEmail = sel.value;
      const opt = sel.options[sel.selectedIndex];
      const gId = opt ? opt.getAttribute("data-id") : null;
      finalYtPass = opt ? opt.getAttribute("data-pass") : "";
      if (gId) await updateDoc(doc(db, "gmail_stocks", gId), { status: "sold" });
    }

    await updateDoc(doc(db, "family_customers", customerId), {
      dataGb: gb.trim(), minutes: min.trim(), sms: sms.trim(),
      price: price.trim(), expiryDate: exp, ytEmail: finalYtEmail, ytPass: finalYtPass
    });

    alert("✅ কাস্টমার প্যাকেজ সফলভাবে রিনিউ করা হয়েছে!");
    window.closeAnyModal();
  };
};

window.delCustomer = async function(id) {
  if (confirm("এই কাস্টমার ডাটা মুছে ফেলতে চান?")) {
    await deleteDoc(doc(db, "family_customers", id));
  }
};

window.sendWhatsAppInvoice = function(customerId) {
  const c = localCustomers.find(item => item.id === customerId);
  if (!c) return;

  const master = localMasters.find(m => m.id === c.masterId);
  const operatorName = master ? master.operator : "স্পেশাল";

  let cleanPhone = c.phone.replace(/[^0-9]/g, '');
  if (cleanPhone.startsWith('0')) cleanPhone = '88' + cleanPhone;

  let text = `প্রিয় *${c.name}*,\nআপনার *${operatorName}* প্যাকেজটি সফলভাবে চালু করা হয়েছে! ✅\n\n`;
  text += `🌐 *ডাটা:* ${c.dataGb || 0} GB\n`;
  text += `📞 *মিনিট:* ${c.minutes || 0} Min\n`;
  if (c.sms && c.sms !== "0") text += `✉️ *SMS:* ${c.sms}\n`;
  if (c.price && c.price !== "0") text += `💰 *মূল্য:* ৳${c.price}\n`;
  text += `⏳ *মেয়াদ:* ${c.expiryDate || '৩০ দিন'} পর্যন্ত\n`;

  if (c.ytEmail) {
    text += `\n▶️ *YouTube Premium Account:*\n`;
    text += `✉️ *ইমেইল:* ${c.ytEmail}\n`;
    text += `🔑 *পাসওয়ার্ড:* ${c.ytPass || 'সেট করা আছে'}\n`;
  }

  text += `\nশেখ জোনে থাকার জন্য ধন্যবাদ! 🌸`;

  const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`;
  window.open(url, '_blank');
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
renderPackagesUI();
