import { listenPackagesData, assignCustomerToSlot, renewCustomer, deleteCustomer, getRemainingDays } from "./packages.js";

const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
}

let allPackages = [];

window.switchTab = function(tabName, btnElement) {
  document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  
  const targetTab = document.getElementById(`tab-${tabName}`);
  if (targetTab) targetTab.style.display = 'block';
  if (btnElement) btnElement.classList.add('active');
};

document.getElementById('globalSearch')?.addEventListener('input', (e) => {
  const query = e.target.value.toLowerCase().trim();
  renderPackages(allPackages.filter(p => (p.name && p.name.toLowerCase().includes(query)) || (p.phone && p.phone.includes(query))));
});

function renderPackages(list) {
  const container = document.getElementById('packageList');
  if (!container) return;
  
  const countEl = document.getElementById('count-active-pkg');
  if (countEl) countEl.innerText = `${list.length} জন`;
  
  container.innerHTML = list.map(item => {
    const daysLeft = getRemainingDays(item.expiryDate);
    const badgeClass = daysLeft <= 3 ? 'badge-expired' : 'badge-active';
    
    return `
      <div class="card">
        <div class="card-title">
          <span>${item.name || 'Unknown'} (${item.phone || 'N/A'})</span>
          <span class="badge ${badgeClass}">${daysLeft} দিন বাকি</span>
        </div>
        <div style="font-size: 13px; color: #94a3b8; margin: 6px 0; line-height: 1.5;">
          📦 <b>প্যাকেজ:</b> ${item.assignedPacks?.[0]?.packName || 'কাস্টম'} | 🌐 <b>ডাটা:</b> ${item.assignedPacks?.[0]?.gb || '০'} GB | 📞 <b>মিনিট:</b> ${item.assignedPacks?.[0]?.min || '০'} Min<br>
          📅 <b>মেয়াদ:</b> ${item.joinDate} থেকে ${item.expiryDate} (🔄 রিনিউ: ${item.renewCount || 0} বার)
          ${item.youtubeGmail ? `<br>🔴 <b>YouTube:</b> ${item.youtubeGmail}` : ''}
        </div>
        <div style="display: flex; gap: 8px; margin-top: 10px;">
          <button class="btn btn-sm btn-success" onclick="handleRenew('${item.id}', ${item.renewCount || 0})">
            <i class="fa-solid fa-arrows-rotate"></i> রিনিউ (+৩০ দিন)
          </button>
          <button class="btn btn-sm btn-danger" onclick="handleDeleteCustomer('${item.id}')">
            <i class="fa-solid fa-trash"></i> ডিলিট
          </button>
        </div>
      </div>
    `;
  }).join('');
}

window.handleRenew = async function(id, count) {
  await renewCustomer(id, 30, count);
};

window.handleDeleteCustomer = async function(id) {
  await deleteCustomer(id);
};

window.openCustomerModal = function() {
  document.getElementById('customerModal').style.display = 'flex';
};

window.closeModal = function(id) {
  document.getElementById(id).style.display = 'none';
};

window.submitCustomerForm = async function() {
  const name = document.getElementById('custName').value.trim();
  const phone = document.getElementById('custPhone').value.trim();
  const durationDays = Number(document.getElementById('custDays').value) || 30;
  const gb = document.getElementById('custGB').value.trim() || "0";
  const min = document.getElementById('custMin').value.trim() || "0";
  const packName = document.getElementById('custPackName').value.trim() || "প্যাকেজ";
  const youtubeGmail = document.getElementById('custYtMail').value.trim();

  if (!name || !phone) {
    alert("দয়া করে নাম ও ফোন নাম্বার লিখুন!");
    return;
  }

  await assignCustomerToSlot({
    name,
    phone,
    durationDays,
    assignedPacks: [{ packName, gb, min }],
    hasYoutube: !!youtubeGmail,
    youtubeGmail
  });

  document.getElementById('custName').value = '';
  document.getElementById('custPhone').value = '';
  closeModal('customerModal');
};

listenPackagesData(data => { 
  allPackages = data; 
  renderPackages(data); 
});
