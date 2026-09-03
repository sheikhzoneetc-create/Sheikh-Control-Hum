import { db, collection, addDoc, doc, deleteDoc, updateDoc } from "../../firebase-config.js";
import { appStore } from "../../store.js";

let customerSearchQuery = "";
let selectedPkgIdForCustomer = "";

export function renderCustomersView() {
  const container = document.getElementById("customer-list-container");
  if (!container) return;

  const q = (customerSearchQuery || "").toLowerCase();
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
    let daysTxt = "আনলিমিটেড", dateTxt = "", isExp = false;
    if (c.expiryDate) {
      const exp = new Date(c.expiryDate);
      const diff = Math.ceil((exp - new Date()) / (1000 * 60 * 60 * 24));
      dateTxt = `${String(exp.getDate()).padStart(2,'0')}/${String(exp.getMonth()+1).padStart(2,'0')}/${exp.getFullYear()}`;
      if (diff < 0) { daysTxt = "মেয়াদ শেষ"; isExp = true; }
      else if (diff === 0) { daysTxt = "আজ শেষ"; }
      else { daysTxt = `${diff} দিন বাকি`; }
    }

    return `
      <div class="card" style="border-left:4px solid ${isExp ? '#da3633' : '#238636'};margin-bottom:12px;background:#161b22;padding:12px;border-radius:8px;">
        <div style="display:flex;justify-content:space-between;">
          <div>
            <b style="font-size:15px;color:#c9d1d9;">${c.name}</b>
            <div style="font-size:12px;color:#8b949e;">📞 ${c.phone}</div>
          </div>
          <div style="text-align:right;">
            <span class="badge" style="background:${isExp ? '#da3633' : '#238636'};color:#fff;">${daysTxt}</span>
            ${dateTxt ? `<div style="font-size:10px;color:#8b949e;margin-top:2px;">${dateTxt}</div>` : ''}
          </div>
        </div>

        <div style="margin:8px 0;padding:8px;background:#0d1117;border-radius:6px;font-size:12px;line-height:1.6;">
          ${c.masterSim ? `<div>👑 সিম: <b>${c.masterSim}</b> (${c.pkgTitle || 'প্যাক'})</div>` : ''}
          <div style="color:#58a6ff;"> কোটা: ${c.dataGb || 0}GB | ${c.minutes || 0}Min | ${c.sms || 0}SMS</div>
          <div style="color:#3fb950;">💰 মূল্য: ${c.price || 0} ৳</div>
          ${c.hasYoutube ? `<div style="color:#f85149;margin-top:2px;">▶️ YT: ${c.ytEmail || 'N/A'} | Pass: ${c.ytPassword || 'N/A'}</div>` : ''}
        </div>

        <div style="display:flex;gap:6px;">
          <button onclick="window.sendWhatsAppInvoice('${c.id}')" style="flex:2;background:#238636;color:#fff;border:none;padding:6px;border-radius:4px;cursor:pointer;">💬 WhatsApp</button>
          <button onclick="window.openEditCustomerModal('${c.id}')" style="flex:1;background:#1f6feb;color:#fff;border:none;padding:6px;border-radius:4px;cursor:pointer;">✏️ এডিট</button>
          <button onclick="window.deleteCustomer('${c.id}')" style="background:#da3633;color:#fff;border:none;padding:6px 10px;border-radius:4px;cursor:pointer;">🗑️</button>
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

  modal.innerHTML = `
    <div class="modal-content card" style="background:#161b22;max-width:380px;width:95%;margin:20px auto;padding:16px;border-radius:8px;max-height:85vh;overflow-y:auto;">
      <h3 style="color:#238636;margin-bottom:10px;">+ কাস্টমার অ্যাড</h3>
      <input type="text" id="custName" placeholder="নাম" class="input-field" style="width:100%;margin-bottom:8px;" />
      <input type="text" id="custPhone" placeholder="মোবাইল নম্বর" class="input-field" style="width:100%;margin-bottom:8px;" />

      <div style="background:#0d1117;padding:8px;border-radius:6px;margin-bottom:8px;">
        <label style="font-size:12px;color:#58a6ff;display:flex;gap:6px;cursor:pointer;">
          <input type="checkbox" id="custHasFamily" onchange="document.getElementById('familyBox').style.display = this.checked ? 'block' : 'none'" /> 👑 ফ্যামিলি প্যাক?
        </label>
        <div id="familyBox" style="display:none;margin-top:8px;">
          <select id="custMasterSimSelect" class="input-field" style="width:100%;margin-bottom:8px;" onchange="window.showPkgCards(this.value)">
            <option value="">-- সিম বেছে নিন --</option>
            ${sims.map(s => `<option value="${s}">${s}</option>`).join('')}
          </select>
          <div id="pkgCardsContainer" style="display:none;margin-bottom:8px;"></div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;">
            <input type="number" id="custGb" placeholder="GB" class="input-field" style="width:100%;" />
            <input type="number" id="custMin" placeholder="Min" class="input-field" style="width:100%;" />
            <input type="number" id="custSms" placeholder="SMS" class="input-field" style="width:100%;" />
          </div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">
        <input type="number" id="custPrice" placeholder="মূল্য (৳)" class="input-field" style="width:100%;" />
        <input type="number" id="custDaysInput" placeholder="মেয়াদ কয়দিন? (যেমন 30)" class="input-field" style="width:100%;" />
      </div>

      <div style="display:flex;gap:8px;">
        <button class="btn btn-primary" onclick="window.saveCustomer()" style="flex:1;background:#238636;">সেভ</button>
        <button class="btn btn-danger" onclick="window.closeAnyModal()" style="flex:1;">বাতিল</button>
      </div>
    </div>
  `;
  modal.style.display = "block";
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
    return `
      <div id="pkg-card-${p.id}" onclick="window.selectCard('${p.id}')" style="cursor:pointer;background:#161b22;border:1px solid #30363d;border-radius:6px;padding:8px;margin-bottom:6px;">
        <div style="display:flex;justify-content:space-between;font-size:12px;">
          <b style="color:#f0883e;">📦 ${p.pkgTitle}</b>
          <span class="badge" style="background:#238636;color:#fff;">খালি: ${4 - custCount}/4</span>
        </div>
      </div>
    `;
  }).join('');
  c.style.display = "block";
};

window.selectCard = function (id) {
  selectedPkgIdForCustomer = id;
  document.querySelectorAll("[id^='pkg-card-']").forEach(el => {
    el.style.border = "1px solid #30363d";
    el.style.background = "#161b22";
  });
  const active = document.getElementById(`pkg-card-${id}`);
  if (active) {
    active.style.border = "2px solid #238636";
    active.style.background = "#1f2d24";
  }
};

window.saveCustomer = async function () {
  const name = document.getElementById("custName").value.trim();
  const phone = document.getElementById("custPhone").value.trim();
  if (!name || !phone) return alert("নাম এবং ফোন নম্বর দিন!");

  const hasFamily = document.getElementById("custHasFamily").checked;
  if (hasFamily && !selectedPkgIdForCustomer) return alert("প্যাকেজ সিলেক্ট করুন!");

  const pkg = (appStore.masterSims || []).find(p => p.id === selectedPkgIdForCustomer);
  const days = parseInt(document.getElementById("custDaysInput").value) || 30;
  const exp = new Date();
  exp.setDate(exp.getDate() + days);

  await addDoc(collection(db, "customers"), {
    name, phone, hasFamily,
    masterId: selectedPkgIdForCustomer || "",
    masterSim: pkg ? pkg.name : "",
    pkgTitle: pkg ? pkg.pkgTitle : "",
    dataGb: hasFamily ? parseFloat(document.getElementById("custGb").value) || 0 : 0,
    minutes: hasFamily ? parseFloat(document.getElementById("custMin").value) || 0 : 0,
    sms: hasFamily ? parseFloat(document.getElementById("custSms").value) || 0 : 0,
    price: document.getElementById("custPrice").value || 0,
    expiryDate: exp.toISOString(),
    createdAt: new Date().toISOString()
  });
  window.closeAnyModal();
};

window.openEditCustomerModal = function(id) {
  const c = (appStore.customers || []).find(cu => cu.id === id);
  if (!c) return;
  const modal = document.getElementById("modal-container");
  if (!modal) return;

  modal.innerHTML = `
    <div class="modal-content card" style="background:#161b22;max-width:380px;width:95%;margin:20px auto;padding:16px;border-radius:8px;">
      <h3 style="color:#1f6feb;margin-bottom:10px;">✏️ এডিট / রিনিউ</h3>
      <input type="text" id="editName" value="${c.name}" class="input-field" style="width:100%;margin-bottom:8px;" />
      <input type="text" id="editPhone" value="${c.phone}" class="input-field" style="width:100%;margin-bottom:8px;" />
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">
        <input type="number" id="editGb" value="${c.dataGb || 0}" placeholder="GB" class="input-field" style="width:100%;" />
        <input type="number" id="editMin" value="${c.minutes || 0}" placeholder="Min" class="input-field" style="width:100%;" />
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px;">
        <input type="number" id="editPrice" value="${c.price || 0}" placeholder="মূল্য (৳)" class="input-field" style="width:100%;" />
        <input type="number" id="editDays" placeholder="নতুন দিন (+30)" class="input-field" style="width:100%;" />
      </div>
      <div style="display:flex;gap:8px;">
        <button class="btn btn-primary" onclick="window.updateCust('${c.id}')" style="flex:1;">আপডেট</button>
        <button class="btn btn-danger" onclick="window.closeAnyModal()" style="flex:1;">বাতিল</button>
      </div>
    </div>
  `;
  modal.style.display = "block";
};

window.updateCust = async function(id) {
  const name = document.getElementById("editName").value.trim();
  const phone = document.getElementById("editPhone").value.trim();
  const updateData = {
    name, phone,
    dataGb: parseFloat(document.getElementById("editGb").value) || 0,
    minutes: parseFloat(document.getElementById("editMin").value) || 0,
    price: document.getElementById("editPrice").value || 0
  };
  const d = parseInt(document.getElementById("editDays").value);
  if (!isNaN(d) && d > 0) {
    const exp = new Date();
    exp.setDate(exp.getDate() + d);
    updateData.expiryDate = exp.toISOString();
  }
  await updateDoc(doc(db, "customers", id), updateData);
  window.closeAnyModal();
};

window.deleteCustomer = async (id) => {
  if (confirm("কাস্টমার ডিলিট করবেন?")) await deleteDoc(doc(db, "customers", id));
};

window.sendWhatsAppInvoice = function(id) {
  const c = (appStore.customers || []).find(cu => cu.id === id);
  if (!c) return;
  let msg = `*ইনভয়েস*\n👤 কাস্টমার: ${c.name}\n📱 ফোন: ${c.phone}\n`;
  if (c.hasFamily) msg += `👑 সিম: ${c.masterSim}\n🌐 ডাটা: ${c.dataGb} GB\n📞 মিনিট: ${c.minutes} Min\n`;
  msg += `💰 মূল্য: ${c.price} ৳\n`;
  if (c.expiryDate) {
    const diff = Math.ceil((new Date(c.expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
    msg += `📅 মেয়াদ: ${diff > 0 ? diff + ' দিন বাকি' : 'মেয়াদ শেষ'}\n`;
  }
  const cleanPhone = c.phone.replace(/[^0-9]/g, '');
  window.open(`https://wa.me/${cleanPhone.startsWith('88') ? cleanPhone : '88' + cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
};
