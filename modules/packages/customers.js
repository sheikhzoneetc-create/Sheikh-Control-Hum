import { db, collection, addDoc, doc, deleteDoc, updateDoc } from "../../firebase-config.js";
import { appStore } from "../../store.js";

let customerSearchQuery = "";
let selectedPkgIdForCustomer = "";

export function renderCustomersView() {
  const container = document.getElementById("customer-list-container");
  if (!container) return;

  const q = (customerSearchQuery || "").toLowerCase();
  const list = (appStore.customers || []).filter(c => {
    const nameMatch = (c.name || "").toLowerCase().includes(q);
    const phoneMatch = (c.phone || "").toLowerCase().includes(q);
    const pkgMatch = (c.pkgTitle || "").toLowerCase().includes(q);
    return nameMatch || phoneMatch || pkgMatch;
  });

  if (list.length === 0) {
    container.innerHTML = `<div style="text-align:center; color:#8b949e; padding:25px;">কোনো কাস্টমার পাওয়া যায়নি</div>`;
    return;
  }

  container.innerHTML = list.map(cust => {
    let daysRemainingText = "কোনো প্যাকেজ নেই";
    let formattedDate = "";
    let isExpired = false;
    const hasActivePkg = Boolean(cust.hasFamily && cust.pkgTitle);

    if (hasActivePkg && cust.expiryDate) {
      const exp = new Date(cust.expiryDate);
      const today = new Date();
      const diff = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
      
      const d = String(exp.getDate()).padStart(2, '0');
      const m = String(exp.getMonth() + 1).padStart(2, '0');
      const y = exp.getFullYear();
      formattedDate = `${d}/${m}/${y}`;

      if (diff < 0) {
        daysRemainingText = "মেয়াদ শেষ";
        isExpired = true;
      } else if (diff === 0) {
        daysRemainingText = "আজ শেষ";
      } else {
        daysRemainingText = `${diff} দিন বাকি`;
      }
    }

    const badgeBg = !hasActivePkg ? '#484f58' : (isExpired ? '#da3633' : '#238636');

    return `
      <div class="card" style="border-left: 4px solid ${badgeBg}; margin-bottom: 12px; background: #161b22; padding: 12px; border-radius: 8px;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
          <div>
            <b style="font-size: 15px; color: #c9d1d9;">${cust.name}</b>
            <div style="font-size: 12px; color: #8b949e; margin-top: 2px;">📞 ${cust.phone}</div>
          </div>
          <div style="text-align:right;">
            <span class="badge" style="background:${badgeBg}; color:#fff; font-size:11px; padding: 2px 6px; border-radius: 4px;">
              ${daysRemainingText}
            </span>
            ${formattedDate ? `<div style="font-size:10px; color:#8b949e; margin-top:3px;">তারিখ: ${formattedDate}</div>` : ''}
          </div>
        </div>

        <div style="margin: 8px 0; padding: 8px; background: #0d1117; border-radius: 6px; font-size: 12px; line-height: 1.6;">
          ${cust.masterSim ? `<div>👑 ফ্যামিলি সিম: <b>${cust.masterSim}</b> (${cust.pkgTitle || 'প্যাকেজহীন'})</div>` : '<div style="color:#8b949e;">👑 সিম যুক্ত নেই</div>'}
          <div style="color:#58a6ff;">📊 কোটা: ${cust.dataGb || 0} GB | ${cust.minutes || 0} Min | ${cust.sms || 0} SMS</div>
          <div style="color:#3fb950;">💰 রানিং রেট: ${cust.price ? cust.price + ' ৳' : '0 ৳'}</div>
          ${cust.hasYoutube ? `
            <div style="margin-top:4px; padding:4px 6px; background:#21262d; border-radius:4px; color:#f85149; font-size:11px;">
              ▶️ YouTube: <b>${cust.ytEmail || 'N/A'}</b> | Pass: <b>${cust.ytPassword || 'N/A'}</b>
            </div>
          ` : ''}
        </div>

        <div style="display:flex; flex-wrap:wrap; gap:6px;">
          <button onclick="window.sendWhatsAppInvoice('${cust.id}')" style="flex:2; background:#238636; color:#fff; border:none; padding:6px; border-radius:4px; font-size:11px; cursor:pointer;">
            💬 WhatsApp
          </button>
          <button onclick="window.openCustomerHistoryModal('${cust.id}')" style="flex:1.5; background:#8957e5; color:#fff; border:none; padding:6px; border-radius:4px; font-size:11px; cursor:pointer;">
            📜 হিস্ট্রি
          </button>
          <button onclick="window.openEditCustomerModal('${cust.id}')" style="flex:1.5; background:#1f6feb; color:#fff; border:none; padding:6px; border-radius:4px; font-size:11px; cursor:pointer;">
            ✏️ রিনিউ/প্যাক
          </button>
          <button onclick="window.clearActivePackage('${cust.id}')" title="প্যাকেজ মুছুন কিন্তু নাম্বার রাখুন" style="background:#d29922; color:#fff; border:none; padding:6px 8px; border-radius:4px; font-size:11px; cursor:pointer;">
            📦❌
          </button>
          <button onclick="window.confirmAndDeleteCustomer('${cust.id}', '${cust.name}', '${cust.phone}')" title="সম্পূর্ণ কাস্টমার ডিলিট" style="background:#da3633; color:#fff; border:none; padding:6px 8px; border-radius:4px; font-size:11px; cursor:pointer;">
            🗑️
          </button>
        </div>
      </div>
    `;
  }).join('');
}

window.renderCustomersView = renderCustomersView;

window.handleCustomerSearch = function (val) {
  customerSearchQuery = val;
  renderCustomersView();
};

window.openAddCustomerModal = function () {
  selectedPkgIdForCustomer = "";
  const modal = document.getElementById("modal-container");
  if (!modal) return;

  const allSims = [...new Set((appStore.masterSims || []).map(m => m.name).filter(Boolean))];
  const ytStocks = appStore.youtubeReadyGmails || [];

  modal.innerHTML = `
    <div class="modal-content card" style="background:#161b22; max-width:380px; width:95%; margin:15px auto; padding:16px; border-radius:8px; max-height:85vh; overflow-y:auto;">
      <h3 style="color:#238636; margin-bottom:10px; font-size:16px;">+ নতুন কাস্টমার অ্যাড</h3>
      
      <input type="text" id="custName" placeholder="কাস্টমারের নাম" class="input-field" style="margin-bottom:8px; width:100%;" />
      <input type="text" id="custPhone" placeholder="মোবাইল নম্বর (017...)" class="input-field" style="margin-bottom:8px; width:100%;" />

      <!-- ফ্যামিলি প্যাক অপশন -->
      <div style="margin:8px 0; padding:8px; background:#0d1117; border-radius:6px;">
        <label style="font-size:12px; color:#58a6ff; display:flex; align-items:center; gap:6px; cursor:pointer;">
          <input type="checkbox" id="custHasFamily" onchange="document.getElementById('familySection').style.display = this.checked ? 'block' : 'none'" />
          👑 ফ্যামিলি প্যাকেজে যুক্ত করবেন?
        </label>
        
        <div id="familySection" style="display:none; margin-top:8px;">
          <label style="font-size:11px; color:#8b949e;">মাস্টার সিম বেছে নিন:</label>
          <select id="custMasterSimSelect" class="input-field" style="margin-bottom:8px; width:100%;" onchange="window.showSimPackagesCards(this.value)">
            <option value="">-- সিম বেছে নিন --</option>
            ${allSims.map(simNumber => {
              const pkgs = (appStore.masterSims || []).filter(m => m.name === simNumber);
              const occupied = (appStore.customers || []).filter(c => pkgs.some(p => p.id === c.masterId)).length;
              return `<option value="${simNumber}">${simNumber} (প্যাক: ${pkgs.length}টি | খালি: ${Math.max(0, 8 - occupied)}/8)</option>`;
            }).join('')}
          </select>

          <div id="pkgCardsContainer" style="display:none; margin-bottom:8px;"></div>

          <label style="font-size:11px; color:#8b949e;">কাস্টমারকে কত দিচ্ছেন:</label>
          <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:6px;">
            <input type="number" id="custGb" placeholder="GB" class="input-field" style="width:100%;" />
            <input type="number" id="custMin" placeholder="মিনিট" class="input-field" style="width:100%;" />
            <input type="number" id="custSms" placeholder="SMS" class="input-field" style="width:100%;" />
          </div>
        </div>
      </div>

      <!-- YouTube Premium অপশন -->
      <div style="margin:8px 0; padding:8px; background:#0d1117; border-radius:6px;">
        <label style="font-size:12px; color:#f85149; display:flex; align-items:center; gap:6px; cursor:pointer;">
          <input type="checkbox" id="custHasYoutube" onchange="document.getElementById('ytSection').style.display = this.checked ? 'block' : 'none'" />
          ▶️ YouTube Premium যুক্ত করবেন?
        </label>
        
        <div id="ytSection" style="display:none; margin-top:8px;">
          <select id="custYtStockId" class="input-field" style="width:100%; margin-bottom:6px;">
            <option value="">-- YouTube জিমেইল বেছে নিন --</option>
            ${ytStocks.map(yt => `
              <option value="${yt.id}" data-email="${yt.email}" data-pass="${yt.password}">${yt.email}</option>
            `).join('')}
          </select>
          <input type="text" id="custYtNote" placeholder="নোট (ঐচ্ছিক)" class="input-field" style="width:100%;" />
        </div>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin:8px 0;">
        <input type="number" id="custPrice" placeholder="মূল্য (৳)" class="input-field" style="width:100%;" />
        <input type="number" id="custDaysInput" placeholder="মেয়াদ কয়দিন? (যেমন: 30)" class="input-field" style="width:100%;" />
      </div>

      <div style="display:flex; gap:8px; margin-top:12px;">
        <button class="btn btn-primary" onclick="window.saveCustomer()" style="flex:1; background:#238636;">সেভ করুন</button>
        <button class="btn btn-danger" onclick="window.closeAnyModal()" style="flex:1;">বাতিল</button>
      </div>
    </div>
  `;
  modal.style.display = "block";
};

window.showSimPackagesCards = function (simNumber, defaultSelectedId = "") {
  const container = document.getElementById("pkgCardsContainer");
  if (!container) return;

  if (!defaultSelectedId) selectedPkgIdForCustomer = "";
  if (!simNumber) {
    container.style.display = "none";
    container.innerHTML = "";
    return;
  }

  const pkgs = (appStore.masterSims || []).filter(m => m.name === simNumber && m.pkgTitle !== "বেস সিম");
  
  if (pkgs.length === 0) {
    container.innerHTML = `<div style="font-size:12px; color:#da3633; padding:6px;">এই সিমে কোনো প্যাকেজ লোড নেই!</div>`;
    container.style.display = "block";
    return;
  }

  container.innerHTML = `
    <div style="font-size:11px; color:#58a6ff; margin-bottom:4px;">প্যাকেজের ওপর ট্যাপ করে সিলেক্ট করুন:</div>
    <div style="display:flex; flex-direction:column; gap:6px;">
      ${pkgs.map(p => {
        const custs = (appStore.customers || []).filter(c => c.masterId === p.id);
        const freeSlots = 8 - custs.length;
        const usedGb = custs.reduce((s, c) => s + (parseFloat(c.dataGb) || 0), 0);
        const usedMin = custs.reduce((s, c) => s + (parseFloat(c.minutes) || 0), 0);
        const remGb = (parseFloat(p.totalGb) || 0) - usedGb;
        const remMin = (parseFloat(p.totalMin) || 0) - usedMin;

        let expText = "মেয়াদ আনলিমিটেড";
        if (p.expiryDate) {
          const diff = Math.ceil((new Date(p.expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
          expText = diff > 0 ? `${diff} দিন বাকি` : (diff === 0 ? "আজ শেষ" : "মেয়াদ শেষ");
        }

        return `
          <div id="pkg-card-${p.id}" onclick="window.selectPkgCard('${p.id}')" style="cursor:pointer; background:#161b22; border:1px solid #30363d; border-radius:6px; padding:8px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <b style="color:#f0883e; font-size:12px;">📦 ${p.pkgTitle}</b>
              <span class="badge" style="background:${freeSlots > 0 ? '#238636' : '#da3633'}; color:#fff; font-size:10px; padding:2px 4px; border-radius:4px;">
                ${freeSlots > 0 ? `খালি: ${freeSlots}/8` : 'স্লট ফুল'}
              </span>
            </div>
            <div style="display:flex; justify-content:space-between; font-size:11px; color:#8b949e; margin-top:4px;">
              <span>🌐 বাকি: ${remGb.toFixed(1)} GB | 📞 ${remMin} Min</span>
              <span style="color:#e3b341;">⏳ ${expText}</span>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
  container.style.display = "block";

  if (defaultSelectedId) {
    window.selectPkgCard(defaultSelectedId);
  }
};

window.selectPkgCard = function(pkgId) {
  selectedPkgIdForCustomer = pkgId;
  const cards = document.querySelectorAll("[id^='pkg-card-']");
  cards.forEach(c => {
    c.style.border = "1px solid #30363d";
    c.style.background = "#161b22";
  });

  const selectedEl = document.getElementById(`pkg-card-${pkgId}`);
  if (selectedEl) {
    selectedEl.style.border = "2px solid #238636";
    selectedEl.style.background = "#1f2d24";
  }
};

window.saveCustomer = async function () {
  const name = document.getElementById("custName").value.trim();
  const phone = document.getElementById("custPhone").value.trim();
  if (!name || !phone) return alert("নাম এবং মোবাইল নম্বর দেওয়া বাধ্যতামূলক!");

  const hasFamily = document.getElementById("custHasFamily").checked;
  const masterPkgId = hasFamily ? selectedPkgIdForCustomer : "";

  if (hasFamily && !masterPkgId) {
    return alert("দয়া করে যেকোনো একটি প্যাকেজের ওপর ট্যাপ করে সিলেক্ট করুন!");
  }

  const pkgObj = (appStore.masterSims || []).find(p => p.id === masterPkgId);

  const hasYoutube = document.getElementById("custHasYoutube").checked;
  const ytSelect = document.getElementById("custYtStockId");
  const selectedYtOpt = ytSelect ? ytSelect.options[ytSelect.selectedIndex] : null;
  
  const ytStockId = (hasYoutube && selectedYtOpt) ? selectedYtOpt.value : "";
  const ytEmail = (hasYoutube && selectedYtOpt) ? selectedYtOpt.getAttribute("data-email") : "";
  const ytPassword = (hasYoutube && selectedYtOpt) ? selectedYtOpt.getAttribute("data-pass") : "";
  const ytNote = hasYoutube ? document.getElementById("custYtNote").value.trim() : "";

  const days = parseInt(document.getElementById("custDaysInput").value) || 30;
  const expDate = new Date();
  expDate.setDate(expDate.getDate() + days);

  const dataGb = hasFamily ? parseFloat(document.getElementById("custGb").value) || 0 : 0;
  const minutes = hasFamily ? parseFloat(document.getElementById("custMin").value) || 0 : 0;
  const sms = hasFamily ? parseFloat(document.getElementById("custSms").value) || 0 : 0;
  const price = document.getElementById("custPrice").value || 0;

  const initialHistory = [];
  if (hasFamily && pkgObj) {
    initialHistory.push({
      date: new Date().toISOString(),
      pkgTitle: pkgObj.pkgTitle || "ফ্যামিলি প্যাক",
      masterSim: pkgObj.name || "",
      dataGb,
      minutes,
      sms,
      price,
      expiryDate: expDate.toISOString()
    });
  }

  const custData = {
    name,
    phone,
    hasFamily,
    masterId: masterPkgId || "",
    masterSim: pkgObj ? pkgObj.name : "",
    pkgTitle: pkgObj ? pkgObj.pkgTitle : "",
    dataGb,
    minutes,
    sms,
    hasYoutube,
    ytEmail,
    ytPassword,
    ytNote,
    price,
    expiryDate: hasFamily ? expDate.toISOString() : "",
    packageHistory: initialHistory,
    createdAt: new Date().toISOString()
  };

  await addDoc(collection(db, "customers"), custData);

  if (hasYoutube && ytStockId) {
    await updateDoc(doc(db, "gmail_stocks", ytStockId), {
      status: "sold",
      soldTo: name,
      soldDate: new Date().toISOString()
    });
  }

  window.closeAnyModal();
};

window.openEditCustomerModal = function(custId) {
  const cust = (appStore.customers || []).find(c => c.id === custId);
  if (!cust) return;

  const modal = document.getElementById("modal-container");
  if (!modal) return;

  const allSims = [...new Set((appStore.masterSims || []).map(m => m.name).filter(Boolean))];
  selectedPkgIdForCustomer = cust.masterId || "";

  modal.innerHTML = `
    <div class="modal-content card" style="background:#161b22; max-width:380px; width:95%; margin:15px auto; padding:16px; border-radius:8px; max-height:85vh; overflow-y:auto;">
      <h3 style="color:#1f6feb; margin-bottom:10px; font-size:16px;">✏️ কাস্টমার এডিট / নতুন প্যাকেজ</h3>
      
      <input type="text" id="editCustName" value="${cust.name || ''}" placeholder="কাস্টমারের নাম" class="input-field" style="margin-bottom:8px; width:100%;" />
      <input type="text" id="editCustPhone" value="${cust.phone || ''}" placeholder="মোবাইল নম্বর" class="input-field" style="margin-bottom:8px; width:100%;" />

      <div style="margin:8px 0; padding:8px; background:#0d1117; border-radius:6px;">
        <label style="font-size:12px; color:#58a6ff; display:flex; align-items:center; gap:6px; cursor:pointer;">
          <input type="checkbox" id="editCustHasFamily" ${cust.hasFamily ? 'checked' : ''} onchange="document.getElementById('editFamilySection').style.display = this.checked ? 'block' : 'none'" />
          👑 ফ্যামিলি প্যাকেজ অ্যাসাইন করবেন?
        </label>
        
        <div id="editFamilySection" style="display:${cust.hasFamily ? 'block' : 'none'}; margin-top:8px;">
          <select id="editCustMasterSimSelect" class="input-field" style="margin-bottom:8px; width:100%;" onchange="window.showSimPackagesCards(this.value, '${cust.masterId}')">
            <option value="">-- সিম বেছে নিন --</option>
            ${allSims.map(simNumber => `
              <option value="${simNumber}" ${simNumber === cust.masterSim ? 'selected' : ''}>${simNumber}</option>
            `).join('')}
          </select>

          <div id="pkgCardsContainer" style="margin-bottom:8px;"></div>

          <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:6px;">
            <input type="number" id="editCustGb" value="${cust.dataGb || 0}" placeholder="GB" class="input-field" style="width:100%;" />
            <input type="number" id="editCustMin" value="${cust.minutes || 0}" placeholder="মিনিট" class="input-field" style="width:100%;" />
            <input type="number" id="editCustSms" value="${cust.sms || 0}" placeholder="SMS" class="input-field" style="width:100%;" />
          </div>
        </div>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin:8px 0;">
        <input type="number" id="editCustPrice" value="${cust.price || 0}" placeholder="মূল্য (৳)" class="input-field" style="width:100%;" />
        <input type="number" id="editCustDays" placeholder="নতুন মেয়াদ কয়দিন? (যেমন 30)" class="input-field" style="width:100%;" />
      </div>

      <div style="display:flex; gap:8px; margin-top:12px;">
        <button class="btn btn-primary" onclick="window.updateCustomerData('${cust.id}')" style="flex:1; background:#1f6feb;">আপডেট ও হিস্ট্রিতে সেভ</button>
        <button class="btn btn-danger" onclick="window.closeAnyModal()" style="flex:1;">বাতিল</button>
      </div>
    </div>
  `;
  modal.style.display = "block";

  if (cust.hasFamily && cust.masterSim) {
    window.showSimPackagesCards(cust.masterSim, cust.masterId);
  }
};

window.updateCustomerData = async function(custId) {
  const cust = (appStore.customers || []).find(c => c.id === custId);
  if (!cust) return;

  const name = document.getElementById("editCustName").value.trim();
  const phone = document.getElementById("editCustPhone").value.trim();
  if (!name || !phone) return alert("নাম এবং ফোন নম্বর দিন!");

  const hasFamily = document.getElementById("editCustHasFamily").checked;
  const masterPkgId = hasFamily ? selectedPkgIdForCustomer : "";
  const pkgObj = (appStore.masterSims || []).find(p => p.id === masterPkgId);

  const dataGb = hasFamily ? parseFloat(document.getElementById("editCustGb").value) || 0 : 0;
  const minutes = hasFamily ? parseFloat(document.getElementById("editCustMin").value) || 0 : 0;
  const sms = hasFamily ? parseFloat(document.getElementById("editCustSms").value) || 0 : 0;
  const price = document.getElementById("editCustPrice").value || 0;

  let newExpIso = cust.expiryDate || "";
  const newDays = parseInt(document.getElementById("editCustDays").value);
  if (!isNaN(newDays) && newDays > 0) {
    const expDate = new Date();
    expDate.setDate(expDate.getDate() + newDays);
    newExpIso = expDate.t
