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
// =================================================================
// 👑 ১. ফ্যামিলি মাস্টার ও প্যাকেজ মডিউল (Master & Packages Module)
// =================================================================

// টোস্ট নোটিফিকেশন হেল্পার
window.showToast = window.showToast || function(message, isError = false) {
  const old = document.getElementById("custom-toast");
  if (old) old.remove();
  const toast = document.createElement("div");
  toast.id = "custom-toast";
  toast.innerText = message;
  toast.style.cssText = `
    position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
    background: ${isError ? "#ef4444" : "#10b981"}; color: #fff;
    padding: 10px 18px; border-radius: 8px; font-size: 13px; font-weight: 600;
    box-shadow: 0 4px 15px rgba(0,0,0,0.5); z-index: 99999;
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2500);
};

const masterPkgCol = collection(db, "family_masters");

onSnapshot(masterPkgCol, (snap) => {
  localMasters = [];
  snap.forEach((d) => localMasters.push({ id: d.id, ...d.data() }));
  if (typeof renderPackagesUI === "function") {
    renderPackagesUI();
  }
});

// নতুন প্যাকেজ লোড মডাল (কাস্টম মেয়াদ ও ৪টি স্লট)
window.openAddMasterModal = function () {
  const m = document.getElementById("modal-backdrop");
  const nextPkgNum = (localMasters ? localMasters.length : 0) + 1;
  document.getElementById("modal-title").innerText = "🔥 নতুন ফ্যামিলি প্যাকেজ লোড";
  document.getElementById("modal-body").innerHTML = `
    <div style="display:flex; flex-direction:column; gap:10px;">
      <input type="text" id="mPkgTitle" placeholder="প্যাকেজের নাম / নং" value="প্যাকেজ-${nextPkgNum}" class="input-field" />
      <input type="text" id="mName" placeholder="মাস্টার সিম নম্বর (যেমন: 0188...)" class="input-field" />
      <select id="mOperator" class="input-field">
        <option value="Robi">Robi</option>
        <option value="Airtel">Airtel</option>
        <option value="GP">Grameenphone</option>
        <option value="Banglalink">Banglalink</option>
      </select>
      <div style="display:flex; gap:8px;">
        <input type="number" id="mTotalGb" placeholder="মোট ডাটা (GB)" class="input-field" style="flex:1;" />
        <input type="number" id="mTotalMin" placeholder="মোট মিনিট" class="input-field" style="flex:1;" />
      </div>
      <div>
        <label style="font-size:12px; color:#8b949e;">প্যাকেজের মেয়াদ (দিন লিখুন: যেমন ১০, ১৫, ৩০):</label>
        <input type="number" id="mDurationDays" placeholder="যেমন: 30" value="30" class="input-field" />
      </div>
      <button class="btn btn-primary" id="saveMasterBtn" style="background:#1f6feb;">প্যাকেজ সেভ করুন</button>
    </div>
  `;
  m.style.display = "flex";

  document.getElementById("saveMasterBtn").onclick = async function () {
    const pkgTitle = document.getElementById("mPkgTitle").value.trim();
    const name = document.getElementById("mName").value.trim();
    const operator = document.getElementById("mOperator").value;
    const gb = parseFloat(document.getElementById("mTotalGb").value) || 0;
    const min = parseFloat(document.getElementById("mTotalMin").value) || 0;
    const days = parseInt(document.getElementById("mDurationDays").value) || 30;

    if (!name) return window.showToast("সিম নম্বর দিন!", true);

    const exp = new Date();
    exp.setDate(exp.getDate() + days);

    await addDoc(masterPkgCol, {
      pkgTitle,
      name,
      operator,
      totalGb: gb,
      totalMin: min,
      durationDays: days,
      maxSlots: 4,
      expiryDate: exp.toISOString().split("T")[0],
      createdAt: new Date().toISOString()
    });

    window.showToast("প্যাকেজ সফলভাবে লোড হয়েছে!");
    window.closeAnyModal();
  };
};

window.deleteMaster = async function (id) {
  if (confirm("এই প্যাকেজটি ডিলিট করতে চান?")) {
    await deleteDoc(doc(db, "family_masters", id));
    window.showToast("প্যাকেজ ডিলিট হয়েছে!");
  }
};
// =================================================================
// 👤 ২. কাস্টমার ডাটা মডিউল (Customer Management Module)
// =================================================================

const customerPkgCol = collection(db, "family_customers");

onSnapshot(customerPkgCol, (snap) => {
  localCustomers = [];
  snap.forEach((d) => localCustomers.push({ id: d.id, ...d.data() }));
  if (typeof renderPackagesUI === "function") {
    renderPackagesUI();
  }
});

// কাস্টমার অ্যাড মডাল (সিম সিলেক্ট -> লাইভ প্যাকেজ প্রিভিউ -> ডাটা ইনপুট)
window.openAddCustomerModal = function () {
  if (!localMasters || localMasters.length === 0) {
    return window.showToast("আগে একটি ফ্যামিলি প্যাকেজ তৈরি করুন!", true);
  }

  const uniqueSimNumbers = [...new Set(localMasters.map((m) => m.name))];

  const m = document.getElementById("modal-backdrop");
  document.getElementById("modal-title").innerText = "👤 কাস্টমার ডাটা অ্যাড";
  document.getElementById("modal-body").innerHTML = `
    <div style="display:flex; flex-direction:column; gap:10px;">
      
      <!-- সিম সিলেকশন -->
      <label style="font-size:12px; color:#8b949e;">১. ফ্যামিলি সিম নম্বর সিলেক্ট করুন:</label>
      <select id="selectSimNumber" class="input-field" onchange="window.loadSimPkgs(this.value)">
        <option value="">-- সিম নম্বর বেছে নিন --</option>
        ${uniqueSimNumbers
          .map((sim) => {
            const sample = localMasters.find((m) => m.name === sim);
            const simCustCount = localCustomers.filter((c) => {
              const p = localMasters.find((m) => m.id === c.masterId);
              return p && p.name === sim;
            }).length;
            return `<option value="${sim}">${sample ? sample.operator || "SIM" : "SIM"} - ${sim} (সিমে মেম্বার: ${simCustCount}/8)</option>`;
          })
          .join("")}
      </select>

      <!-- প্যাকেজ ডিটেইলস ও স্লট বক্স -->
      <div id="simPkgsContainer" style="display:none; background:#0d1117; padding:10px; border-radius:6px; border:1px solid #30363d;"></div>

      <!-- কাস্টমার ডিটেইলস -->
      <label style="font-size:12px; color:#8b949e;">২. কাস্টমার বিবরণ:</label>
      <input type="text" id="custName" placeholder="কাস্টমারের নাম" class="input-field" />
      <input type="tel" id="custPhone" placeholder="কাস্টমার মোবাইল নম্বর" class="input-field" />

      <div style="display:flex; gap:8px;">
        <input type="number" id="custGb" placeholder="ডাটা (GB)" class="input-field" style="flex:1;" />
        <input type="number" id="custMin" placeholder="মিনিট" class="input-field" style="flex:1;" />
        <input type="number" id="custSms" placeholder="SMS" class="input-field" style="flex:1;" />
      </div>

      <div style="display:flex; gap:8px;">
        <input type="number" id="custPrice" placeholder="বিক্রয় মূল্য (৳)" class="input-field" style="flex:1;" />
        <input type="number" id="custDurationDays" placeholder="কাস্টমার মেয়াদ (দিন)" value="30" class="input-field" style="flex:1;" />
      </div>

      <button class="btn btn-primary" id="saveCustBtn" style="background:#238636; margin-top:5px;">কাস্টমার সংরক্ষণ করুন</button>
    </div>
  `;
  m.style.display = "flex";

  // সিম নির্বাচনের পর প্যাকেজ ও স্লট রেন্ডার
  window.loadSimPkgs = function (simNumber) {
    const container = document.getElementById("simPkgsContainer");
    if (!simNumber) {
      container.style.display = "none";
      return;
    }

    const matchedPkgs = localMasters.filter((m) => m.name === simNumber);

    if (matchedPkgs.length === 0) {
      container.innerHTML = `<span style="color:#f85149; font-size:12px;">এই সিমে কোনো সক্রিয় প্যাকেজ নেই!</span>`;
      container.style.display = "block";
      return;
    }

    let html = `
      <div style="font-size:12px; font-weight:bold; color:#58a6ff; margin-bottom:8px;">
        📦 এই সিমের প্যাকেজ তালিকা (${matchedPkgs.length}টি):
      </div>
    `;

    matchedPkgs.forEach((pkg, index) => {
      const custsUnderPkg = localCustomers.filter((c) => c.masterId === pkg.id);
      const freeSlots = 4 - custsUnderPkg.length;
      const daysLeft = getDaysLeft(pkg.expiryDate);

      html += `
        <label style="display:block; background:#161b22; padding:8px; border-radius:6px; margin-bottom:6px; cursor:pointer; border:1px solid ${freeSlots > 0 ? '#30363d' : '#da3633'};">
          <div style="display:flex; align-items:center; justify-content:space-between;">
            <div>
              <input type="radio" name="selectedPkgId" value="${pkg.id}" ${index === 0 && freeSlots > 0 ? "checked" : ""} ${freeSlots <= 0 ? "disabled" : ""} />
              <b style="font-size:13px; color:#fff; margin-left:4px;">${pkg.pkgTitle || `প্যাকেজ-${index + 1}`}</b>
            </div>
            <span class="badge" style="background:${freeSlots > 0 ? '#238636' : '#da3633'}; color:#fff; font-size:11px;">
              খালি: ${freeSlots > 0 ? freeSlots : 0}/4 স্লট
            </span>
          </div>
          <div style="display:flex; justify-content:space-between; font-size:11px; color:#8b949e; margin-top:4px; padding-left:20px;">
            <span>মোট প্যাক: ${pkg.totalGb || 0}GB | ${pkg.totalMin || 0}Min</span>
            <span style="color:#e3b341;">⌛ মেয়াদ: ${daysLeft}</span>
          </div>
        </label>
      `;
    });

    container.innerHTML = html;
    container.style.display = "block";
  };

  document.getElementById("saveCustBtn").onclick = async function () {
    const selectedRadio = document.querySelector('input[name="selectedPkgId"]:checked');
    if (!selectedRadio) {
      return window.showToast("দয়া করে একটি ফাঁকা প্যাকেজ সিলেক্ট করুন!", true);
    }

    const masterId = selectedRadio.value;
    const name = document.getElementById("custName").value.trim();
    const phone = document.getElementById("custPhone").value.trim();
    const gb = parseFloat(document.getElementById("custGb").value) || 0;
    const min = parseFloat(document.getElementById("custMin").value) || 0;
    const sms = parseFloat(document.getElementById("custSms").value) || 0;
    const price = parseFloat(document.getElementById("custPrice").value) || 0;
    const days = parseInt(document.getElementById("custDurationDays").value) || 30;

    if (!name || !phone) return window.showToast("নাম ও মোবাইল নম্বর দিন!", true);

    const exp = new Date();
    exp.setDate(exp.getDate() + days);

    await addDoc(customerPkgCol, {
      masterId,
      name,
      phone,
      dataGb: gb,
      minutes: min,
      sms: sms,
      price,
      durationDays: days,
      expiryDate: exp.toISOString().split("T")[0],
      createdAt: new Date().toISOString()
    });

    window.showToast("কাস্টমার ডাটা সফলভাবে সংরক্ষিত হয়েছে!");
    window.closeAnyModal();
  };
};

window.deleteCustomer = async function (id) {
  if (confirm("এই কাস্টমারটি ডিলিট করতে চান?")) {
    await deleteDoc(doc(db, "family_customers", id));
    window.showToast("কাস্টমার ডিলিট হয়েছে!");
  }
};

// হোয়াটসঅ্যাপ ইনভয়েস
window.sendWhatsAppInvoice = function (customerId) {
  const c = localCustomers.find((item) => item.id === customerId);
  if (!c) return;

  const master = localMasters.find((m) => m.id === c.masterId);
  const operatorName = master ? master.operator : "স্পেশাল";

  let cleanPhone = c.phone.replace(/[^0-9]/g, "");
  if (cleanPhone.startsWith("0")) cleanPhone = "88" + cleanPhone;

  let text = `প্রিয় *${c.name}*, আপনার *${operatorName}* প্যাকেজটি সফলভাবে চালু হয়েছে! ✅\n\n`;
  text += `🌐 *ডাটা:* ${c.dataGb || 0} GB\n`;
  text += `📞 *মিনিট:* ${c.minutes || 0} Min\n`;
  if (c.sms && c.sms !== "0") text += `✉️ *SMS:* ${c.sms}\n`;
  if (c.price && c.price !== "0") text += `💵 *মূল্য:* ৳${c.price}\n`;
  text += `⌛ *মেয়াদ:* ${c.expiryDate || "৩০ দিন"} পর্যন্ত\n\n`;
  text += `🌸 ধন্যবাদ!`;

  const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`;
  window.open(url, "_blank");
};


// =================================================================
// 🖥️ ৩. ইউজার ইন্টারফেস ও সার্চ রেন্ডার (UI & Live Search)
// =================================================================

let currentPkgSubTab = "customers";
let custSearchQuery = "";
let masterSearchQuery = "";

window.switchPkgSubTab = function(tab) {
  currentPkgSubTab = tab;
  renderPackagesUI();
};

window.handleCustSearch = function(val) {
  custSearchQuery = val.toLowerCase();
  renderPackagesUI();
};

window.handleMasterSearch = function(val) {
  masterSearchQuery = val.toLowerCase();
  renderPackagesUI();
};

function getDaysLeft(expiryDate) {
  if (!expiryDate) return "N/A";
  const diff = new Date(expiryDate) - new Date();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  return days > 0 ? `${days} দিন বাকি` : "মেয়াদ শেষ";
}

function renderPackagesUI() {
  const root = document.getElementById("packages-root");
  if (!root) return;

  const totalRevenue = (localCustomers || []).reduce((sum, c) => sum + (parseFloat(c.price) || 0), 0);

  const filteredCustomers = (localCustomers || []).filter(c => 
    (c.name && c.name.toLowerCase().includes(custSearchQuery)) || 
    (c.phone && c.phone.includes(custSearchQuery))
  );

  const filteredMasters = (localMasters || []).filter(m => 
    (m.pkgTitle && m.pkgTitle.toLowerCase().includes(masterSearchQuery)) || 
    (m.name && m.name.includes(masterSearchQuery))
  );

  root.innerHTML = `
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px;">
      <div class="card" style="margin: 0; padding: 12px; text-align: center; background: #161b22;">
        <span style="font-size: 11px; color: #8b949e;">মোট প্যাকেজ</span>
        <div style="font-size: 20px; font-weight: bold; color: #3fb950;">${(localMasters || []).length} টি</div>
      </div>
      <div class="card" style="margin: 0; padding: 12px; text-align: center; background: #161b22;">
        <span style="font-size: 11px; color: #8b949e;">মোট বিক্রয়</span>
        <div style="font-size: 20px; font-weight: bold; color: #58a6ff;">৳ ${totalRevenue}</div>
      </div>
    </div>

    <!-- সাব-ট্যাব সুইচার বাটন -->
    <div style="display: flex; gap: 8px; margin-bottom: 12px; background: #0d1117; padding: 4px; border-radius: 8px;">
      <button onclick="window.switchPkgSubTab('customers')" 
        style="flex: 1; padding: 10px; border-radius: 6px; border: none; font-weight: bold; font-size: 13px; cursor: pointer;
        background: ${currentPkgSubTab === 'customers' ? '#238636' : 'transparent'}; 
        color: ${currentPkgSubTab === 'customers' ? '#fff' : '#8b949e'};">
        👤 কাস্টমার তালিকা (${(localCustomers || []).length})
      </button>
      <button onclick="window.switchPkgSubTab('masters')" 
        style="flex: 1; padding: 10px; border-radius: 6px; border: none; font-weight: bold; font-size: 13px; cursor: pointer;
        background: ${currentPkgSubTab === 'masters' ? '#1f6feb' : 'transparent'}; 
        color: ${currentPkgSubTab === 'masters' ? '#fff' : '#8b949e'};">
        👑 ফ্যামিলি প্যাকেজসমূহ (${(localMasters || []).length})
      </button>
    </div>

    <!-- কাস্টমার ভিউ -->
    ${currentPkgSubTab === 'customers' ? `
      <div>
        <div style="display:flex; gap:8px; margin-bottom: 12px;">
          <input type="text" placeholder="🔍 কাস্টমার নাম বা নম্বর খুঁজুন..." 
            value="${custSearchQuery}" 
            oninput="window.handleCustSearch(this.value)"
            class="input-field" style="margin:0; flex:1;" />
          <button class="btn btn-primary" onclick="window.openAddCustomerModal()" style="background: #238636; white-space:nowrap;">
            + কাস্টমার অ্যাড
          </button>
        </div>

        <div id="customer-list-container">
          ${filteredCustomers.length === 0 ? '<div style="text-align:center; color:#8b949e; padding:25px;">কোনো কাস্টমার ডাটা নেই</div>' : ''}
          ${filteredCustomers.map(cust => {
            const pkg = (localMasters || []).find(m => m.id === cust.masterId);
            return `
              <div class="card" style="border-left: 4px solid #58a6ff; margin-bottom: 12px; background: #161b22; padding: 12px; border-radius: 8px;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <b style="font-size: 15px;">${cust.name} <span style="font-size:12px; color:#8b949e;">(${cust.phone})</span></b>
                  <span class="badge" style="background:#238636; color:#fff; font-size:11px;">${getDaysLeft(cust.expiryDate)}</span>
                </div>
                <div style="display:flex; gap:6px; flex-wrap:wrap; margin: 8px 0;">
                  <span class="badge" style="background:#0d1117;">🌐 ${cust.dataGb || 0} GB</span>
                  <span class="badge" style="background:#0d1117;">📞 ${cust.minutes || 0} Min</span>
                  <span class="badge" style="background:#0d1117;">✉️ ${cust.sms || 0} SMS</span>
                  <span class="badge" style="background:#238636; color:#fff;">৳ ${cust.price || 0}</span>
                </div>
                <div style="font-size: 12px; color: #8b949e; margin-bottom: 8px;">
                  📦 প্যাকেজ: <b>${pkg ? `${pkg.pkgTitle} (${pkg.name})` : 'মুছে ফেলা হয়েছে'}</b> | ⌛ মেয়াদ শেষ: ${cust.expiryDate || 'N/A'}
                </div>
                <div style="display:flex; gap:6px;">
                  <button class="btn btn-sm" onclick="window.sendWhatsAppInvoice('${cust.id}')" style="background:#25d366; flex:1; padding:6px; border-radius:4px; color:#fff; border:none; font-weight:bold;">💬 WhatsApp</button>
                  <button class="btn btn-sm" onclick="window.deleteCustomer('${cust.id}')" style="background:#da3633; padding:6px 12px; border-radius:4px; color:#fff; border:none;">মুছুন</button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    ` : `
      <!-- ফ্যামিলি প্যাকেজ ভিউ -->
      <div>
        <div style="display:flex; gap:8px; margin-bottom: 12px;">
          <input type="text" placeholder="🔍 প্যাকেজ বা সিম খুঁজুন..." 
            value="${masterSearchQuery}" 
            oninput="window.handleMasterSearch(this.value)"
            class="input-field" style="margin:0; flex:1;" />
          <button class="btn btn-primary" onclick="window.openAddMasterModal()" style="background: #1f6feb; white-space:nowrap;">
            + নতুন প্যাকেজ লোড
          </button>
        </div>

        <div id="master-list-container">
          ${filteredMasters.length === 0 ? '<div style="text-align:center; color:#8b949e; padding:25px;">কোনো ফ্যামিলি প্যাকেজ নেই</div>' : ''}
          ${filteredMasters.map((pkg, index) => {
            const custsUnderPkg = (localCustomers || []).filter(c => c.masterId === pkg.id);
            const freeSlots = 4 - custsUnderPkg.length;
            const usedGb = custsUnderPkg.reduce((s, c) => s + (parseFloat(c.dataGb) || 0), 0);
            const usedMin = custsUnderPkg.reduce((s, c) => s + (parseFloat(c.minutes) || 0), 0);
            const remGb = (parseFloat(pkg.totalGb) || 0) - usedGb;
            const remMin = (parseFloat(pkg.totalMin) || 0) - usedMin;

            return `
              <div class="card" style="border-left: 4px solid #f0883e; margin-bottom: 15px; background: #161b22; padding: 12px; border-radius: 8px;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <b><span class="badge" style="background:#e11414; color:#fff;">${pkg.operator || 'SIM'}</span> ${pkg.pkgTitle || `প্যাকেজ-${index + 1}`} (${pkg.name})</b>
                  <span class="badge" style="background:${freeSlots > 0 ? '#238636' : '#da3633'}; color:#fff; font-size:11px;">
                    খালি: ${freeSlots > 0 ? freeSlots : 0}/4 স্লট
                  </span>
                </div>
                <div style="background:#0d1117; padding:8px; border-radius:6px; margin: 10px 0; font-size:12px;">
                  <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                    <span style="color:#3fb950;">🌐 অবশিষ্ট ডাটা: ${remGb.toFixed(1)} GB</span>
                    <span style="color:#58a6ff;">📞 অবশিষ্ট মিনিট: ${remMin} Min</span>
                  </div>
                  <div style="color:#8b949e; font-size:11px;">
                    মোট প্যাক: ${pkg.totalGb || 0}GB, ${pkg.totalMin || 0}Min | মেম্বার যুক্ত: ${custsUnderPkg.length}/4
                  </div>
                </div>
                <div style="display:flex; justify-content:space-between; font-size: 12px; color: #8b949e; margin-bottom: 10px;">
                  <span>⌛ এক্সপায়ারি: ${pkg.expiryDate || 'N/A'}</span>
                  <span style="color:#e3b341; font-weight:bold;">${getDaysLeft(pkg.expiryDate)}</span>
                </div>
                <div style="display:flex; gap:6px;">
                  <button class="btn btn-sm" onclick="window.deleteMaster('${pkg.id}')" style="background:#da3633; width:100%; padding:7px; border-radius:4px; color:#fff; border:none;">প্যাকেজ মুছুন</button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `}
  `;
}

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
