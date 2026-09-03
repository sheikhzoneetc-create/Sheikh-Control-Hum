import { db, collection, addDoc, doc, deleteDoc, updateDoc } from "../../firebase-config.js";
import { appStore } from "../../store.js";

let customerSearchQuery = "";
let selectedPkgIdForCustomer = "";

export function renderCustomersView() {
  const container = document.getElementById("customer-list-container");
  if (!container) return;
  const q = (customerSearchQuery || "").toLowerCase().trim();
  const list = (appStore.customers || []).filter(c => 
    (c.name || "").toLowerCase().includes(q) || 
    (c.phone || "").toLowerCase().includes(q) || 
    (c.pkgTitle || "").toLowerCase().includes(q)
  );

  if (!list.length) {
    container.innerHTML = `<div style="text-align:center;color:#8b949e;padding:25px;">কোনো কাস্টমার নেই</div>`;
    return;
  }

  container.innerHTML = list.map(c => {
    let daysTxt = "কোনো অ্যাক্টিভ প্যাক নেই", dateTxt = "", hasActivePkg = false;
    if (c.expiryDate) {
      const exp = new Date(c.expiryDate);
      const today = new Date();
      today.setHours(0,0,0,0); exp.setHours(0,0,0,0);
      const diff = Math.round((exp - today) / 86400000);
      dateTxt = `${String(exp.getDate()).padStart(2,'0')}/${String(exp.getMonth()+1).padStart(2,'0')}/${exp.getFullYear()}`;
      if (diff > 0) { daysTxt = `${diff} দিন বাকি`; hasActivePkg = true; }
      else if (diff === 0) { daysTxt = "আজ শেষ"; hasActivePkg = true; }
      else { daysTxt = "মেয়াদ শেষ"; }
    }
    const totalOrders = Array.isArray(c.history) ? c.history.length : 0;

    return `
      <div class="card" style="border-left:4px solid ${hasActivePkg ? '#238636' : '#da3633'};margin-bottom:12px;background:#161b22;padding:12px;border-radius:8px;">
        <div style="display:flex;justify-content:space-between;">
          <div><b style="font-size:15px;color:#c9d1d9;">${c.name}</b><div style="font-size:12px;color:#8b949e;">📞 ${c.phone}</div></div>
          <div style="text-align:right;"><span class="badge" style="background:${hasActivePkg ? '#238636' : '#da3633'};color:#fff;padding:2px 6px;border-radius:4px;font-size:11px;">${daysTxt}</span>${dateTxt && hasActivePkg ? `<div style="font-size:10px;color:#8b949e;margin-top:2px;">মেয়াদ: ${dateTxt}</div>` : ''}</div>
        </div>
        <div style="margin:8px 0;padding:8px;background:#0d1117;border-radius:6px;font-size:12px;line-height:1.6;">
          ${hasActivePkg ? `<div style="color:#58a6ff;">কোটা: ${c.dataGb || 0}GB | ${c.minutes || 0}Min | ${c.sms || 0}SMS</div><div style="color:#3fb950;">💰 মূল্য: ${c.price || 0} ৳</div>` : `<div style="color:#8b949e;font-style:italic;">বর্তমানে কোনো প্যাকেজ চালু নেই</div>`}
          ${c.hasYoutube ? `<div style="color:#f85149;margin-top:2px;">▶️ YT: ${c.ytEmail || 'N/A'} | Pass: ${c.ytPassword || 'N/A'}</div>` : ''}
          <div style="font-size:11px;color:#8b949e;margin-top:4px;">📦 মোট প্যাকেজ হিস্ট্রি: <b style="color:#58a6ff;">${totalOrders} টি</b></div>
        </div>
        <div style="display:flex;gap:5px;flex-wrap:wrap;">
          <button onclick="window.sendWhatsAppInvoice('${c.id}')" style="flex:1;min-width:70px;background:#238636;color:#fff;border:none;padding:6px;border-radius:4px;cursor:pointer;font-size:11px;">💬 WhatsApp</button>
          <button onclick="window.sendSmsInvoice('${c.id}')" style="flex:1;min-width:60px;background:#8957e5;color:#fff;border:none;padding:6px;border-radius:4px;cursor:pointer;font-size:11px;">✉️ SMS</button>
          <button onclick="window.openCustomerHistory('${c.id}')" style="flex:1;min-width:65px;background:#1f6feb;color:#fff;border:none;padding:6px;border-radius:4px;cursor:pointer;font-size:11px;font-weight:bold;">📜 হিস্ট্রি</button>
          <button onclick="window.openEditCustomerModal('${c.id}')" style="flex:1;min-width:55px;background:#30363d;color:#c9d1d9;border:none;padding:6px;border-radius:4px;cursor:pointer;font-size:11px;">✏️ এডিট</button>
          <button onclick="window.confirmDeleteCustomer('${c.id}')" style="background:#da3633;color:#fff;border:none;padding:6px 10px;border-radius:4px;cursor:pointer;font-size:11px;">🗑️</button>
        </div>
      </div>
    `;
  }).join('');
}

window.handleCustomerSearch = (val) => { customerSearchQuery = val; renderCustomersView(); };

window.openAddCustomerModal = function () {
  selectedPkgIdForCustomer = "";
  const modal = document.getElementById("modal-container");
  if (!modal) return;
  const sims = [...new Set((appStore.masterSims || []).map(m => m.name).filter(Boolean))];
  const gmails = appStore.gmails || [];

  modal.innerHTML = `
    <div class="modal-content card" style="background:#161b22;max-width:380px;width:95%;margin:20px auto;padding:16px;border-radius:8px;max-height:85vh;overflow-y:auto;color:#c9d1d9;">
      <h3 style="color:#238636;margin-bottom:10px;">+ কাস্টমার অ্যাড</h3>
      <input type="text" id="custName" placeholder="কাস্টমারের নাম" class="input-field" style="width:100%;margin-bottom:8px;" />
      <input type="text" id="custPhone" placeholder="মোবাইল নম্বর" class="input-field" style="width:100%;margin-bottom:8px;" />
      <div style="background:#0d1117;padding:8px;border-radius:6px;margin-bottom:8px;">
        <label style="font-size:12px;color:#58a6ff;font-weight:bold;margin-bottom:6px;display:block;">📦 সিম ও প্যাকেজ নির্বাচন</label>
        <select id="custMasterSimSelect" class="input-field" style="width:100%;margin-bottom:8px;" onchange="window.showPkgCards(this.value)">
          <option value="">-- কোনো সিম লাগবে না / বেছে নিন --</option>
          ${sims.map(s => `<option value="${s}">${s}</option>`).join('')}
        </select>
        <div id="pkgCardsContainer" style="display:none;margin-bottom:8px;"></div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;">
          <input type="number" id="custGb" placeholder="GB" class="input-field" style="width:100%;" />
          <input type="number" id="custMin" placeholder="Min" class="input-field" style="width:100%;" />
          <input type="number" id="custSms" placeholder="SMS" class="input-field" style="width:100%;" />
        </div>
      </div>
      <div style="background:#0d1117;padding:8px;border-radius:6px;margin-bottom:8px;">
        <label style="font-size:12px;color:#f85149;display:flex;gap:6px;cursor:pointer;align-items:center;">
          <input type="checkbox" id="custHasYoutube" onchange="document.getElementById('ytBox').style.display = this.checked ? 'block' : 'none'" /> ▶️ YouTube Premium?
        </label>
        <div id="ytBox" style="display:none;margin-top:8px;">
          <select id="custYtSelect" class="input-field" style="width:100%;margin-bottom:6px;" onchange="window.handleYtGmailSelect(this.value)">
            <option value="">-- জিমেইল বেছে নিন --</option>
            ${gmails.map(g => `<option value="${g.email || g.id}">${g.email || g.name || g.id}</option>`).join('')}
          </select>
          <input type="text" id="custYtEmail" placeholder="YT জিমেইল" class="input-field" style="width:100%;margin-bottom:6px;" />
          <input type="text" id="custYtPass" placeholder="YT পাসওয়ার্ড" class="input-field" style="width:100%;" />
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">
        <input type="number" id="custPrice" placeholder="মূল্য (৳)" class="input-field" style="width:100%;" />
        <input type="number" id="custDaysInput" placeholder="মেয়াদ দিন (যেমন 30)" class="input-field" style="width:100%;" />
      </div>
      <div style="display:flex;gap:8px;">
        <button onclick="window.saveCustomer()" style="flex:1;background:#238636;color:#fff;border:none;padding:8px;border-radius:4px;cursor:pointer;">সেভ</button>
        <button onclick="window.closeAnyModal()" style="flex:1;background:#da3633;color:#fff;border:none;padding:8px;border-radius:4px;cursor:pointer;">বাতিল</button>
      </div>
    </div>
  `;
  modal.style.display = "block";
};

window.handleYtGmailSelect = function(val) {
  const g = (appStore.gmails || []).find(x => (x.email === val || x.id === val));
  if (g) {
    document.getElementById("custYtEmail").value = g.email || "";
    document.getElementById("custYtPass").value = g.password || "";
  }
};

window.showPkgCards = function (sim) {
  const c = document.getElementById("pkgCardsContainer");
  if (!c) return;
  selectedPkgIdForCustomer = "";
  if (!sim) { c.style.display = "none"; return; }
  const pkgs = (appStore.masterSims || []).filter(m => m.name === sim && m.pkgTitle !== "বেস সিম");
  if (!pkgs.length) {
    c.innerHTML = `<div style="font-size:12px;color:#da3633;">কোনো প্যাকেজ নেই!</div>`;
    c.style.display = "block";
    return;
  }
  c.innerHTML = pkgs.map(p => {
    const custCount = (appStore.customers || []).filter(cu => cu.masterId === p.id).length;
    const isFull = custCount >= 8;
    return `
      <div id="pkg-card-${p.id}" onclick="${isFull ? '' : `window.selectCard('${p.id}')`}" 
           style="cursor:${isFull ? 'not-allowed' : 'pointer'};background:#161b22;border:1px solid ${isFull ? '#da3633' : '#30363d'};border-radius:6px;padding:8px;margin-bottom:6px;opacity:${isFull ? 0.6 : 1};">
        <div style="display:flex;justify-content:space-between;font-size:12px;">
          <b style="color:#f0883e;">📦 ${p.pkgTitle}</b>
          <span class="badge" style="background:${isFull ? '#da3633' : '#238636'};color:#fff;padding:2px 6px;border-radius:4px;">${isFull ? 'স্লট ফুল' : `খালি: ${8 - custCount}/8`}</span>
        </div>
      </div>
    `;
  }).join('');
  c.style.display = "block";
};

window.selectCard = function (id) {
  selectedPkgIdForCustomer = id;
  document.querySelectorAll("[id^='pkg-card-']").forEach(el => { el.style.border = "1px solid #30363d"; el.style.background = "#161b22"; });
  const active = document.getElementById(`pkg-card-${id}`);
  if (active) { active.style.border = "2px solid #238636"; active.style.background = "#1f2d24"; }
};

window.saveCustomer = async function () {
  const name = document.getElementById("custName").value.trim();
  const phone = document.getElementById("custPhone").value.trim();
  if (!name || !phone) return alert("নাম এবং ফোন নম্বর দিন!");

  const simVal = document.getElementById("custMasterSimSelect").value;
  if (simVal && !selectedPkgIdForCustomer) return alert("সিম সিলেক্ট করলে প্যাকেজ বেছে নিতে হবে!");

  const hasYoutube = document.getElementById("custHasYoutube").checked;
  const ytEmail = hasYoutube ? document.getElementById("custYtEmail").value.trim() : "";
  const ytPassword = hasYoutube ? document.getElementById("custYtPass").value.trim() : "";

  const pkg = (appStore.masterSims || []).find(p => p.id === selectedPkgIdForCustomer);
  const days = parseInt(document.getElementById("custDaysInput").value) || 0;
  let expIso = "";
  if (days > 0) {
    const exp = new Date(); exp.setDate(exp.getDate() + days); expIso = exp.toISOString();
  }

  const nowIso = new Date().toISOString();
  const record = {
    date: nowIso, startDate: nowIso, expiryDate: expIso, durationDays: days,
    pkgTitle: pkg ? pkg.pkgTitle : "সাধারণ প্যাক", masterSim: pkg ? pkg.name : (simVal || ""),
    dataGb: parseFloat(document.getElementById("custGb").value) || 0,
    minutes: parseFloat(document.getElementById("custMin").value) || 0,
    sms: parseFloat(document.getElementById("custSms").value) || 0,
    price: parseFloat(document.getElementById("custPrice").value) || 0,
    hasYoutube, ytEmail, ytPassword
  };

  try {
    await addDoc(collection(db, "customers"), {
      name, phone, masterId: selectedPkgIdForCustomer || "",
      masterSim: record.masterSim, pkgTitle: record.pkgTitle,
      dataGb: record.dataGb, minutes: record.minutes, sms: record.sms, price: record.price,
      hasYoutube, ytEmail, ytPassword, expiryDate: expIso, history: [record], createdAt: nowIso
    });
    if (window.closeAnyModal) window.closeAnyModal();
  } catch (err) { alert("সেভ করতে সমস্যা হয়েছে: " + err.message); }
};

window.openEditCustomerModal = function(id) {
  const c = (appStore.customers || []).find(cu => cu.id === id);
  if (!c) return;
  const modal = document.getElementById("modal-container");
  if (!modal) return;
  const gmails = appStore.gmails || [];

  modal.innerHTML = `
    <div class="modal-content card" style="background:#161b22;max-width:380px;width:95%;margin:20px auto;padding:16px;border-radius:8px;max-height:85vh;overflow-y:auto;color:#c9d1d9;">
      <h3 style="color:#1f6feb;margin-bottom:10px;">✏️ এডিট / রিনিউ</h3>
      <input type="text" id="editName" value="${c.name || ''}" class="input-field" style="width:100%;margin-bottom:8px;" />
      <input type="text" id="editPhone" value="${c.phone || ''}" class="input-field" style="width:100%;margin-bottom:8px;" />
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:8px;">
        <input type="number" id="editGb" value="${c.dataGb || 0}" placeholder="GB" class="input-field" style="width:100%;" />
        <input type="number" id="editMin" value="${c.minutes || 0}" placeholder="Min" class="input-field" style="width:100%;" />
        <input type="number" id="editSms" value="${c.sms || 0}" placeholder="SMS" class="input-field" style="width:100%;" />
      </div>
      <div style="background:#0d1117;padding:8px;border-radius:6px;margin-bottom:8px;">
        <label style="font-size:12px;color:#f85149;display:flex;gap:6px;cursor:pointer;align-items:center;">
          <input type="checkbox" id="editHasYoutube" ${c.hasYoutube ? 'checked' : ''} onchange="document.getElementById('editYtBox').style.display = this.checked ? 'block' : 'none'" /> ▶️ YouTube Premium?
        </label>
        <div id="editYtBox" style="display:${c.hasYoutube ? 'block' : 'none'};margin-top:8px;">
          <select id="editYtSelect" class="input-field" style="width:100%;margin-bottom:6px;" onchange="window.handleEditYtSelect(this.value)">
            <option value="">-- জিমেইল বেছে নিন --</option>
            ${gmails.map(g => `<option value="${g.email || g.id}" ${g.email === c.ytEmail ? 'selected' : ''}>${g.email || g.name || g.id}</option>`).join('')}
          </select>
          <input type="text" id="editYtEmail" value="${c.ytEmail || ''}" placeholder="YT জিমেইল" class="input-field" style="width:100%;margin-bottom:6px;" />
          <input type="text" id="editYtPass" value="${c.ytPassword || ''}" placeholder="YT পাসওয়ার্ড" class="input-field" style="width:100%;" />
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px;">
        <input type="number" id="editPrice" value="${c.price || 0}" placeholder="মূল্য (৳)" class="input-field" style="width:100%;" />
        <input type="number" id="editDays" placeholder="নতুন দিন যোগ (+দিন)" class="input-field" style="width:100%;" />
      </div>
      <div style="display:flex;gap:8px;">
        <button onclick="window.updateCust('${c.id}')" style="flex:1;background:#1f6feb;color:#fff;border:none;padding:8px;border-radius:4px;cursor:pointer;">আপডেট</button>
        <button onclick="window.closeAnyModal()" style="flex:1;background:#da3633;color:#fff;border:none;padding:8px;border-radius:4px;cursor:pointer;">বাতিল</button>
      </div>
    </div>
  `;
  modal.style.display = "block";
};

window.handleEditYtSelect = function(val) {
  const g = (appStore.gmails || []).find(x => (x.email === val || x.id === val));
  if (g) {
    document.getElementById("editYtEmail").value = g.email || "";
    document.getElementById("editYtPass").value = g.password || "";
  }
};

window.updateCust = async function(id) {
  const c = (appStore.customers || []).find(cu => cu.id === id);
  if (!c) return;

  const name = document.getElementById("editName").value.trim();
  const phone = document.getElementById("editPhone").value.trim();
  const hasYoutube = document.getElementById("editHasYoutube").checked;
  const ytEmail = hasYoutube ? document.getElementById("editYtEmail").value.trim() : "";
  const ytPassword = hasYoutube ? document.getElementById("editYtPass").value.trim() : "";
  const d = parseInt(document.getElementById("editDays").value);

  const updateData = {
    name, phone,
    dataGb: parseFloat(document.getElementById("editGb").value) || 0,
    minutes: parseFloat(document.getElementById("editMin").value) || 0,
    sms: parseFloat(document.getElementById("editSms").value) || 0,
    price: parseFloat(document.getElementById("editPrice").value) || 0,
    hasYoutube, ytEmail, ytPassword
  };

  const currentHistory = Array.isArray(c.history) ? [...c.history] : [];
  if (!isNaN(d) && d > 0) {
    const exp = new Date(); exp.setDate(exp.getDate() + d); updateData.expiryDate = exp.toISOString();
    const startIso = new Date().toISOString();
    currentHistory.unshift({
      date: startIso, startDate: startIso, expiryDate: exp.toISOString(), durationDays: d,
      pkgTitle: c.pkgTitle || "রিনিউড প্যাক", masterSim: c.masterSim || "",
      dataGb: updateData.dataGb, minutes: updateData.minutes, sms: updateData.sms,
      price: updateData.price, hasYoutube, ytEmail, ytPassword
    });
    updateData.history = currentHistory;
  }

  try {
    await updateDoc(doc(db, "customers", id), updateData);
    if (window.closeAnyModal) window.closeAnyModal();
  } catch (err) { alert("আপডেট করতে সমস্যা হয়েছে: " + err.message); }
};

function formatNiceDate(iso) {
  if (!iso) return "N/A";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "N/A" : `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
}

window.openCustomerHistory = function(id) {
  const c = (appStore.customers || []).find(cu => cu.id === id);
  if (!c) return;
  const modal = document.getElementById("modal-container");
  if (!modal) return;

  const logs = Array.isArray(c.history) ? c.history : [];
  const totalSpent = logs.reduce((sum, h) => sum + (parseFloat(h.price) || 0), 0);
  const memberSince = c.createdAt ? formatNiceDate(c.createdAt) : (logs.length ? formatNiceDate(logs[logs.length - 1].date) : "N/A");

  modal.innerHTML = `
    <div class="modal-content card" style="background:#161b22;max-width:440px;width:95%;margin:15px auto;padding:16px;border-radius:8px;max-height:88vh;overflow-y:auto;color:#c9d1d9;">
      <div style="border-bottom:1px solid #30363d;padding-bottom:10px;margin-bottom:12px;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <h3 style="color:#58a6ff;margin:0;font-size:16px;">📜 কাস্টমার লাইফটাইম হিস্ট্রি</h3>
          <span style="font-size:11px;color:#8b949e;">শুরু: ${memberSince}</span>
        </div>
        <div style="font-size:13px;color:#c9d1d9;margin-top:4px;"><b>${c.name}</b> (${c.phone})</div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px;">
        <div style="background:#0d1117;padding:8px;border-radius:6px;text-align:center;border:1px solid #30363d;">
          <div style="font-size:11px;color:#8b949e;">মোট প্যাকেজ ক্রয়</div>
          <b style="color:#f0883e;font-size:15px;">${logs.length} বার</b>
        </div>
        <div style="background:#0d1117;padding:8px;border-radius:6px;text-align:center;border:1px solid #30363d;">
          <div style="font-size:11px;color:#8b949e;">মোট পেমেন্ট</div>
          <b style="color:#3fb950;font-size:15px;">${totalSpent} ৳</b>
        </div>
      </div>
      ${logs.length === 0 ? '<div style="color:#8b949e;text-align:center;padding:20px;">পূর্বের কোনো প্যাকেজ রেকর্ড নেই</div>' : 
        logs.map((h, i) => `
          <div style="background:#0d1117;padding:10px;border-radius:6px;margin-bottom:10px;border-left:4px solid #1f6feb;font-size:12px;line-height:1.6;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;border-bottom:1px dashed #21262d;padding-bottom:4px;">
              <b style="color:#f0883e;font-size:13px;">#${logs.length - i} • ${h.pkgTitle || 'প্যাকেজ'}</b>
              <span class="badge" style="background:#238636;color:#fff;font-size:10px;padding:2px 6px;border-radius:3px;">${h.price || 0} ৳</span>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;color:#8b949e;font-size:11px;margin-bottom:4px;">
              <div>📅 শুরু: <b style="color:#c9d1d9;">${formatNiceDate(h.startDate || h.date)}</b></div>
              <div>⏳ মেয়াদ শেষ: <b style="color:#da3633;">${formatNiceDate(h.expiryDate)}</b></div>
            </div>
            <div style="color:#58a6ff;">কোটা: ${h.dataGb || 0}GB | ${h.minutes || 0}Min | ${h.sms || 0}SMS</div>
            ${h.hasYoutube ? `<div style="color:#f85149;margin-top:2px;">▶️ জিমেইল: ${h.ytEmail || 'N/A'} (পাস: ${h.ytPassword || 'N/A'})</div>` : ''}
          </div>
        `).join('')
      }
      <button onclick="window.closeAnyModal()" style="width:100%;margin-top:10px;background:#30363d;color:#fff;border:none;padding:8px;border-radius:4px;cursor:pointer;font-weight:bold;">বন্ধ করুন</button>
    </div>
  `;
  modal.style.display = "block";
};

window.confirmDeleteCustomer = function(id) {
  const c = (appStore.customers || []).find(cu => cu.id === id);
  if (!c) return;
  const modal = document.getElementById("modal-container");
  if (!modal) return;
  modal.innerHTML = `
    <div class="modal-content card" style="background:#161b22;max-width:320px;width:95%;margin:40px auto;padding:20px;border-radius:8px;text-align:center;border:1px solid #da3633;color:#c9d1d9;">
      <h3 style="color:#da3633;margin-bottom:8px;">⚠️ সতর্কবার্তা!</h3>
      <p style="font-size:13px;color:#8b949e;margin-bottom:16px;">আপনি কি নিশ্চিতভাবে <b style="color:#fff;">${c.name}</b> (${c.phone})-কে ডিলিট করতে চান?</p>
      <div style="display:flex;gap:8px;">
        <button onclick="window.executeCustomerDelete('${c.id}')" style="flex:1;background:#da3633;color:#fff;border:none;padding:8px;border-radius:4px;cursor:pointer;font-weight:bold;">হ্যাঁ, ডিলিট</button>
        <button onclick="window.closeAnyModal()" style="flex:1;background:#30363d;color:#fff;border:none;padding:8px;border-radius:4px;cursor:pointer;">বাতিল</button>
      </div>
    </div>
  `;
  modal.style.display = "block";
};

window.executeCustomerDelete = async function(id) {
  try {
    await deleteDoc(doc(db, "customers", id));
    if (window.closeAnyModal) window.closeAnyModal();
  } catch (err) { alert("ডিলিট করতে সমস্যা হয়েছে: " + err.message); }
};

function generateInvoiceText(c) {
  let msg = `Sheikh Zone - ইনভয়েস\nগ্রাহকের নাম: ${c.name}\nমোবাইল নম্বর: ${c.phone}\n\n`;
  if (c.dataGb || c.minutes || c.sms || c.pkgTitle) {
    msg += `প্যাকেজ বিবরণ:\n`;
    if (c.pkgTitle) msg += `• প্যাকেজ: ${c.pkgTitle}\n`;
    msg += `• ইন্টারনেট: ${c.dataGb || 0} GB\n• টকটাইম: ${c.minutes || 0} Min\n• এসএমএস: ${c.sms || 0} SMS\n`;
  }
  if (c.hasYoutube) {
    msg += `\nYouTube Premium বিবরণ:\n• জিমেইল: ${c.ytEmail || 'N/A'}\n• পাসওয়ার্ড: ${c.ytPassword || 'N/A'}\n`;
  }
  msg += `\nমোট প্রদেয় মূল্য: ${c.price || 0} ৳\n`;
  if (c.expiryDate) {
    const exp = new Date(c.expiryDate); const today = new Date();
    today.setHours(0,0,0,0); exp.setHours(0,0,0,0);
    const diff = Math.round((exp - today) / 86400000);
    msg += `মেয়াদ: ${diff >= 0 ? diff + ' দিন বাকি' : 'মেয়াদ শেষ'}\n`;
  }
  msg += `\nওয়েবসাইট: https://sheikhzone.com\nSheikh Zone এর সাথে থাকার জন্য ধন্যবাদ!`;
  return msg;
}

function getCleanPhoneNumber(phone) {
  let clean = (phone || "").replace(/[^0-9]/g, '');
  if (clean.startsWith('0')) clean = '88' + clean;
  else if (!clean.startsWith('88')) clean = '88' + clean;
  return clean;
}

window.sendWhatsAppInvoice = function(id) {
  const c = (appStore.customers || []).find(cu => cu.id === id);
  if (!c) return;
  window.open(`https://wa.me/${getCleanPhoneNumber(c.phone)}?text=${encodeURIComponent(generateInvoiceText(c))}`, '_blank');
};

window.sendSmsInvoice = function(id) {
  const c = (appStore.customers || []).find(cu => cu.id === id);
  if (!c) return;
  window.location.href = `sms:${(c.phone || "").replace(/[^0-9+]/g, '')}?body=${encodeURIComponent(generateInvoiceText(c))}`;
};
