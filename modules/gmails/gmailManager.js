import { db, collection, addDoc, doc, deleteDoc, updateDoc } from "../../firebase-config.js";
import { appStore } from "../../store.js";

let currentGmailTab = "fresh"; // 'fresh' | 'business_yt' | 'buy_sell'
let searchQuery = "";

// ১-ক্লিক ক্লিপবোর্ড কপি
window.copyText = function(text, label) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      alert(`কপি হয়েছে: ${label}`);
    });
  } else {
    const el = document.createElement("textarea");
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand("copy");
    document.body.removeChild(el);
    alert(`কপি হয়েছে: ${label}`);
  }
};

// মেসেজ ফরম্যাট জেনারেটর (Sheikh Zone লিংকসহ)
function generateDeliveryText(g) {
  const isYt = g.category === "business_yt";
  return `আসসালামু আলাইকুম ${g.soldTo || 'গ্রাহক'},
শেখ জোনের পক্ষ থেকে শুভেচ্ছা! আপনার সার্ভিসটি সফলভাবে সক্রিয় করা হয়েছে।

📦 সার্ভিস: ${isYt ? 'YouTube Premium' : 'জিমেইল একাউন্ট'}
📧 ইমেইল: ${g.email}
🔑 পাসওয়ার্ড: ${g.password}
${g.recovery ? `🛡️ রিকভারি: ${g.recovery}\n` : ''}${g.expiryDays ? `📅 মেয়াদ: ${g.expiryDays} দিন\n` : ''}
⚠️ লগইন করার পর কোনো সিকিউরিটি পরিবর্তন করবেন না। যেকোনো প্রয়োজনে আমাদের সাপোর্ট ইনবক্সে জানান।

🌐 আমাদের ওয়েবসাইট: https://sheikhzone.com
— Sheikh Zone`;
}

window.sendWhatsApp = function(id) {
  const g = (appStore.allGmails || []).find(x => x.id === id);
  if (!g || !g.customerPhone) return alert("গ্রাহকের ফোন নম্বর নেই!");
  const cleanPhone = g.customerPhone.replace(/[^0-9]/g, '');
  const phone = cleanPhone.startsWith('88') ? cleanPhone : '88' + cleanPhone;
  const msg = encodeURIComponent(generateDeliveryText(g));
  window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
};

window.sendSMS = function(id) {
  const g = (appStore.allGmails || []).find(x => x.id === id);
  if (!g || !g.customerPhone) return alert("গ্রাহকের ফোন নম্বর নেই!");
  const msg = encodeURIComponent(generateDeliveryText(g));
  window.open(`sms:${g.customerPhone}?body=${msg}`, '_blank');
};

export function renderGmailsView() {
  const container = document.getElementById("gmail-list-container");
  if (!container) return;

  const q = (searchQuery || "").toLowerCase();
  const list = (appStore.allGmails || []).filter(g => {
    const matchTab = (g.category === currentGmailTab);
    const matchQuery = (g.email || "").toLowerCase().includes(q) ||
                       (g.sellerName || "").toLowerCase().includes(q) ||
                       (g.soldTo || "").toLowerCase().includes(q);
    return matchTab && matchQuery;
  });

  if (!list.length) {
    container.innerHTML = `<div style="text-align:center;color:#8b949e;padding:30px;">কোনো রেকর্ড পাওয়া যায়নি</div>`;
    return;
  }

  container.innerHTML = list.map(g => {
    const isSold = g.status === "sold";
    const buyPrice = parseFloat(g.buyPrice) || 0;
    const sellPrice = parseFloat(g.sellPrice) || 0;
    const profit = sellPrice - buyPrice;

    return `
      <div class="card" style="border-left:4px solid ${currentGmailTab === 'fresh' ? '#238636' : (currentGmailTab === 'business_yt' ? '#da3633' : '#1f6feb')}; margin-bottom:10px; background:#161b22; padding:12px; border-radius:8px;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
          <div style="flex:1;">
            <!-- ইমেইল ও কপি -->
            <div style="display:flex; align-items:center; gap:6px;">
              <b style="font-size:13px; color:#c9d1d9;">${g.email}</b>
              <button onclick="window.copyText('${g.email}', 'ইমেইল')" style="background:#21262d; border:1px solid #30363d; color:#58a6ff; border-radius:4px; padding:2px 6px; font-size:11px; cursor:pointer;">📋</button>
            </div>

            <!-- পাসওয়ার্ড ও কপি -->
            <div style="font-size:12px; color:#8b949e; margin-top:4px; display:flex; align-items:center; gap:6px;">
              🔑 পাসওয়ার্ড: <span style="color:#f0883e; font-family:monospace; font-weight:bold;">${g.password}</span>
              <button onclick="window.copyText('${g.password}', 'পাসওয়ার্ড')" style="background:#21262d; border:1px solid #30363d; color:#f0883e; border-radius:4px; padding:2px 6px; font-size:11px; cursor:pointer;">📋</button>
            </div>

            ${g.recovery ? `
              <div style="font-size:11px; color:#58a6ff; margin-top:3px; display:flex; align-items:center; gap:6px;">
                🛡️ রিকভারি: ${g.recovery}
                <button onclick="window.copyText('${g.recovery}', 'রিকভারি')" style="background:#21262d; border:1px solid #30363d; color:#58a6ff; border-radius:4px; padding:1px 5px; font-size:10px; cursor:pointer;">📋</button>
              </div>
            ` : ''}

            ${g.note ? `<div style="font-size:11px; color:#8b949e; margin-top:3px;">📝 নোট: ${g.note}</div>` : ''}
          </div>

          <div style="text-align:right;">
            <span class="badge" style="background:${isSold ? '#30363d' : (currentGmailTab === 'business_yt' ? '#da3633' : '#1f6feb')}; color:#fff;">
              ${isSold ? 'ব্যবহৃত/সোল্ড' : (currentGmailTab === 'fresh' ? '🟢 ফ্রেশ' : (currentGmailTab === 'business_yt' ? '▶️ YT প্রস্তুত' : 'স্টকে আছে'))}
            </span>
          </div>
        </div>

        <!-- কেনা ও সেলার স্ট্রিপ -->
        <div style="margin-top:8px; padding:6px 8px; background:#0d1117; border-radius:4px; font-size:11px; display:flex; justify-content:space-between; flex-wrap:wrap; gap:4px;">
          <span>🛒 সেলার: <b style="color:#79c0ff;">${g.sellerName || 'অজানা'}</b> (${buyPrice}৳)</span>
          ${isSold ? `<span style="color:#3fb950;">👤 ক্রেতা: <b>${g.soldTo}</b> (${sellPrice}৳)</span>` : `<span style="color:#8b949e;">বিক্রি বাকি</span>`}
        </div>

        ${isSold && profit !== 0 ? `
          <div style="margin-top:4px; font-size:11px; color:#3fb950; text-align:right;">
            নিট লাভ: <b>+${profit} ৳</b>
          </div>
        ` : ''}

        <!-- নিচের বাটন অ্যাকশনসমূহ -->
        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px; flex-wrap:wrap; gap:6px;">
          <div style="display:flex; gap:6px;">
            <!-- ফ্রেশ ট্যাব: YT তে পাঠানো -->
            ${currentGmailTab === 'fresh' ? `
              <button onclick="window.openMoveToYtModal('${g.id}')" style="background:#da3633; color:#fff; border:none; padding:5px 8px; border-radius:4px; font-size:11px; font-weight:bold; cursor:pointer;">
                ▶️ YT প্রিমিয়ামে রূপান্তর
              </button>
            ` : ''}

            <!-- YT ট্যাব: প্রিমিয়াম অফ করে ফ্রেশে ব্যাক -->
            ${(currentGmailTab === 'business_yt' && !isSold) ? `
              <button onclick="window.revertToFresh('${g.id}')" style="background:#d29922; color:#fff; border:none; padding:5px 8px; border-radius:4px; font-size:11px; font-weight:bold; cursor:pointer;">
                ❌ প্রিমিয়াম অফ (ফ্রেশে নিন)
              </button>
            ` : ''}

            <!-- ট্রেড ট্যাব: সেল বাটন -->
            ${(currentGmailTab === 'buy_sell' && !isSold) ? `
              <button onclick="window.openTradeSellModal('${g.id}')" style="background:#238636; color:#fff; border:none; padding:5px 8px; border-radius:4px; font-size:11px; font-weight:bold; cursor:pointer;">
                💰 সেল করুন
              </button>
            ` : ''}

            <!-- মেসেজিং বাটন (যদি বিক্রি হয়ে থাকে) -->
            ${isSold && g.customerPhone ? `
              <button onclick="window.sendWhatsApp('${g.id}')" style="background:#238636; color:#fff; border:none; padding:5px 8px; border-radius:4px; font-size:11px; cursor:pointer;">💬 WhatsApp</button>
              <button onclick="window.sendSMS('${g.id}')" style="background:#1f6feb; color:#fff; border:none; padding:5px 8px; border-radius:4px; font-size:11px; cursor:pointer;">✉️ SMS</button>
            ` : ''}
          </div>

          <div style="display:flex; gap:6px;">
            <button onclick="window.openEditGmailModal('${g.id}')" style="background:#21262d; border:1px solid #30363d; color:#c9d1d9; padding:4px 8px; border-radius:4px; font-size:11px; cursor:pointer;">✏️ এডিট</button>
            <button onclick="window.deleteGmailRecord('${g.id}')" style="background:#21262d; border:1px solid #da3633; color:#f85149; padding:4px 8px; border-radius:4px; font-size:11px; cursor:pointer;">🗑️</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// সাব-ট্যাব সুইচিং
window.switchGmailTab = function(tab) {
  currentGmailTab = tab;
  document.getElementById("tab-btn-fresh").style.background = (tab === 'fresh') ? '#238636' : '#21262d';
  document.getElementById("tab-btn-yt").style.background = (tab === 'business_yt') ? '#da3633' : '#21262d';
  document.getElementById("tab-btn-trade").style.background = (tab === 'buy_sell') ? '#1f6feb' : '#21262d';
  renderGmailsView();
};

window.handleGmailSearch = function(val) {
  searchQuery = val;
  renderGmailsView();
};

// ফ্রেশ থেকে YT তে পাঠানো
window.openMoveToYtModal = function(id) {
  const g = (appStore.allGmails || []).find(x => x.id === id);
  if (!g) return;
  const modal = document.getElementById("modal-container");
  modal.innerHTML = `
    <div class="card" style="background:#161b22; max-width:340px; margin:40px auto; padding:16px;">
      <h3 style="color:#da3633; font-size:15px; margin-bottom:8px;">▶️ YouTube Premium অ্যাক্টিভ</h3>
      <div style="font-size:12px; color:#8b949e; margin-bottom:12px;">${g.email}</div>
      <input type="number" id="ytDays" placeholder="মেয়াদ (দিন, যেমন: ৩০)" class="input-field" style="width:100%; margin-bottom:12px;" value="30" />
      <div style="display:flex; gap:8px;">
        <button class="btn btn-success" onclick="window.confirmMoveToYt('${g.id}')" style="flex:1;">কনফার্ম মুভ</button>
        <button class="btn btn-danger" onclick="window.closeAnyModal()" style="flex:1;">বাতিল</button>
      </div>
    </div>
  `;
  modal.style.display = "block";
};

window.confirmMoveToYt = async function(id) {
  const days = document.getElementById("ytDays").value || 30;
  await updateDoc(doc(db, "gmail_stocks", id), {
    category: "business_yt",
    ytStatus: "active",
    expiryDays: days,
    ytActivatedAt: new Date().toISOString()
  });
  window.closeAnyModal();
};

// YT থেকে ফ্রেশে রিভার্স করা
window.revertToFresh = async function(id) {
  if (confirm("ইউটিউব প্রিমিয়াম বন্ধ করে এটিকে আবার ফ্রেশ জিমেইল তালিকায় পাঠাতে চান?")) {
    await updateDoc(doc(db, "gmail_stocks", id), {
      category: "fresh",
      ytStatus: "none",
      expiryDays: null
    });
  }
};

// ট্রেড জিমেইল সেল মডাল
window.openTradeSellModal = function(id) {
  const g = (appStore.allGmails || []).find(x => x.id === id);
  if (!g) return;
  const modal = document.getElementById("modal-container");
  modal.innerHTML = `
    <div class="card" style="background:#161b22; max-width:340px; margin:30px auto; padding:16px;">
      <h3 style="color:#238636; font-size:15px; margin-bottom:8px;">💰 জিমেইল সেল করুন</h3>
      <div style="font-size:12px; color:#8b949e; margin-bottom:10px;">${g.email} (কেনা: ${g.buyPrice || 0}৳)</div>
      <input type="text" id="trCustomer" placeholder="ক্রেতার নাম" class="input-field" style="width:100%; margin-bottom:8px;" />
      <input type="text" id="trPhone" placeholder="ক্রেতার মোবাইল/হোয়াটসঅ্যাপ" class="input-field" style="width:100%; margin-bottom:8px;" />
      <input type="number" id="trPrice" placeholder="বিক্রির দাম (৳)" class="input-field" style="width:100%; margin-bottom:12px;" />
      <div style="display:flex; gap:8px;">
        <button class="btn btn-success" onclick="window.confirmTradeSell('${g.id}')" style="flex:1;">কনফার্ম সেল</button>
        <button class="btn btn-danger" onclick="window.closeAnyModal()" style="flex:1;">বাতিল</button>
      </div>
    </div>
  `;
  modal.style.display = "block";
};

window.confirmTradeSell = async function(id) {
  const soldTo = document.getElementById("trCustomer").value.trim();
  const customerPhone = document.getElementById("trPhone").value.trim();
  const sellPrice = parseFloat(document.getElementById("trPrice").value) || 0;
  if (!soldTo) return alert("ক্রেতার নাম দিন!");

  await updateDoc(doc(db, "gmail_stocks", id), {
    status: "sold",
    soldTo,
    customerPhone,
    sellPrice,
    soldAt: new Date().toISOString()
  });
  window.closeAnyModal();
};

// এডিট মডাল
window.openEditGmailModal = function(id) {
  const g = (appStore.allGmails || []).find(x => x.id === id);
  if (!g) return;
  const modal = document.getElementById("modal-container");
  modal.innerHTML = `
    <div class="card" style="background:#161b22; max-width:340px; margin:25px auto; padding:16px;">
      <h3 style="color:#58a6ff; font-size:15px; margin-bottom:10px;">✏️ জিমেইল তথ্য এডিট</h3>
      <input type="text" id="editPass" value="${g.password || ''}" placeholder="পাসওয়ার্ড" class="input-field" style="width:100%; margin-bottom:8px;" />
      <input type="email" id="editRec" value="${g.recovery || ''}" placeholder="রিকভারি ইমেইল" class="input-field" style="width:100%; margin-bottom:8px;" />
      <input type="text" id="editSeller" value="${g.sellerName || ''}" placeholder="সেলার নাম" class="input-field" style="width:100%; margin-bottom:8px;" />
      <input type="number" id="editBuy" value="${g.buyPrice || 0}" placeholder="কেনা দাম" class="input-field" style="width:100%; margin-bottom:8px;" />
      <input type="text" id="editNote" value="${g.note || ''}" placeholder="নোট" class="input-field" style="width:100%; margin-bottom:12px;" />
      <div style="display:flex; gap:8px;">
        <button class="btn btn-success" onclick="window.saveEditedGmail('${g.id}')" style="flex:1;">আপডেট</button>
        <button class="btn btn-danger" onclick="window.closeAnyModal()" style="flex:1;">বাতিল</button>
      </div>
    </div>
  `;
  modal.style.display = "block";
};

window.saveEditedGmail = async function(id) {
  const password = document.getElementById("editPass").value.trim();
  const recovery = document.getElementById("editRec").value.trim();
  const sellerName = document.getElementById("editSeller").value.trim();
  const buyPrice = parseFloat(document.getElementById("editBuy").value) || 0;
  const note = document.getElementById("editNote").value.trim();

  await updateDoc(doc(db, "gmail_stocks", id), { password, recovery, sellerName, buyPrice, note });
  window.closeAnyModal();
};

// নতুন এন্ট্রি মডাল
window.openAddGmailModal = function() {
  const modal = document.getElementById("modal-container");
  modal.innerHTML = `
    <div class="card" style="background:#161b22; max-width:340px; margin:25px auto; padding:16px;">
      <h3 style="color:#58a6ff; font-size:15px; margin-bottom:10px;">+ নতুন জিমেইল এন্ট্রি</h3>
      <input type="email" id="inEmail" placeholder="জিমেইল এড্রেস" class="input-field" style="width:100%; margin-bottom:8px;" />
      <input type="text" id="inPass" placeholder="পাসওয়ার্ড" class="input-field" style="width:100%; margin-bottom:8px;" />
      <input type="email" id="inRec" placeholder="রিকভারি ইমেইল (ঐচ্ছিক)" class="input-field" style="width:100%; margin-bottom:8px;" />
      <div style="display:flex; gap:6px; margin-bottom:8px;">
        <input type="text" id="inSeller" placeholder="সেলার নাম" class="input-field" style="flex:1;" />
        <input type="number" id="inBuyPrice" placeholder="কেনা দাম" class="input-field" style="width:100px;" />
      </div>
      <input type="text" id="inNote" placeholder="নোট (ঐচ্ছিক)" class="input-field" style="width:100%; margin-bottom:12px;" />
      <div style="display:flex; gap:8px;">
        <button class="btn btn-success" onclick="window.saveNewGmailEntry()" style="flex:1;">সংরক্ষণ</button>
        <button class="btn btn-danger" onclick="window.closeAnyModal()" style="flex:1;">বাতিল</button>
      </div>
    </div>
  `;
  modal.style.display = "block";
};

window.saveNewGmailEntry = async function() {
  const email = document.getElementById("inEmail").value.trim();
  const password = document.getElementById("inPass").value.trim();
  const recovery = document.getElementById("inRec").value.trim();
  const sellerName = document.getElementById("inSeller").value.trim();
  const buyPrice = parseFloat(document.getElementById("inBuyPrice").value) || 0;
  const note = document.getElementById("inNote").value.trim();

  if (!email || !password) return alert("জিমেইল এবং পাসওয়ার্ড আবশ্যক!");

  await addDoc(collection(db, "gmail_stocks"), {
    email,
    password,
    recovery,
    sellerName,
    buyPrice,
    note,
    category: currentGmailTab, // বর্তমান ট্যাবে যুক্ত হবে
    ytStatus: currentGmailTab === 'business_yt' ? 'active' : 'none',
    status: "available",
    createdAt: new Date().toISOString()
  });
  window.closeAnyModal();
};

window.deleteGmailRecord = async function(id) {
  if (confirm("এই জিমেইলটি মুছে ফেলতে চান?")) {
    await deleteDoc(doc(db, "gmail_stocks", id));
  }
};
