import { listenPackagesData, listenFamilyPacks, createFamilyPack, assignCustomerToSlot, renewCustomer, getRemainingDays } from "./packages.js";
import { listenGmailsData, addGmail, convertToPremium, markGmailSold, formatGmailForCopy } from "./gmail.js";
import { listenVaultData, listenVideoVault, addVaultItem, addVideoToVault, deleteVaultItem, deleteVideoItem } from "./vault.js";

// Initialize Telegram WebApp
const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
}

// Global State
let allPackages = [];
let allFamilyPacks = [];
let allGmails = [];
let allVault = [];
let allVideos = [];

// Tab Navigation
window.switchTab = function(tabName, btnElement) {
  document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  
  const targetTab = document.getElementById(`tab-${tabName}`);
  if (targetTab) targetTab.style.display = 'block';
  if (btnElement) btnElement.classList.add('active');
};

// Global Search Logic
document.getElementById('globalSearch')?.addEventListener('input', (e) => {
  const query = e.target.value.toLowerCase().trim();
  renderPackages(allPackages.filter(p => p.name?.toLowerCase().includes(query) || p.phone?.includes(query)));
  renderGmails(allGmails.filter(g => g.email?.toLowerCase().includes(query)));
  renderVault(allVault.filter(v => v.title?.toLowerCase().includes(query)));
});

// Render Packages & Slots
function renderPackages(list) {
  const container = document.getElementById('packageList');
  if (!container) return;
  
  document.getElementById('count-active-pkg').innerText = `${list.length} জন`;
  
  container.innerHTML = list.map(item => {
    const daysLeft = getRemainingDays(item.expiryDate);
    const badgeClass = daysLeft <= 3 ? 'badge-expired' : 'badge-active';
    
    return `
      <div class="card">
        <div class="card-title">
          <span>${item.name} (${item.phone})</span>
          <span class="badge ${badgeClass}">${daysLeft} দিন বাকি</span>
        </div>
        <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 8px;">
          📅 যুক্ত: ${item.joinDate} | 🔄 রিনিউ: ${item.renewCount || 0} বার
          ${item.hasYoutube ? `<br>🔴 YouTube: ${item.youtubeGmail}` : ''}
        </div>
        <div style="display: flex; gap: 8px; margin-top: 10px;">
          <button class="btn btn-sm btn-success" onclick="handleRenew('${item.id}', ${item.renewCount || 0})">
            <i class="fa-solid fa-arrows-rotate"></i> রিনিউ (৩০ দিন)
          </button>
        </div>
      </div>
    `;
  }).join('');
}

window.handleRenew = async function(id, count) {
  if (confirm("এই কাস্টমারের মেয়াদ কি আরও ৩০ দিন বাড়াতে চান?")) {
    await renewCustomer(id, count);
  }
};

// Render Gmails
function renderGmails(list) {
  const container = document.getElementById('gmailList');
  if (!container) return;

  const fresh = list.filter(g => g.type === 'sale' && g.status === 'available');
  const prem = list.filter(g => g.type === 'premium' && g.status === 'available');
  
  document.getElementById('count-sale-stock').innerText = `${fresh.length} টি`;
  document.getElementById('count-prem-stock').innerText = `${prem.length} টি`;

  container.innerHTML = list.map(g => `
    <div class="card">
      <div class="card-title">
        <span>${g.email}</span>
        <span class="badge ${g.status === 'available' ? 'badge-active' : 'badge-expired'}">${g.type.toUpperCase()}</span>
      </div>
      <div style="font-size: 12px; color: var(--text-muted);">
        🔑 পাসওয়ার্ড: ${g.password} ${g.recoveryEmail ? `| 🔄 রিকভারি: ${g.recoveryEmail}` : ''}
      </div>
      <div style="display: flex; gap: 8px; margin-top: 10px;">
        <button class="btn btn-sm btn-copy" onclick="copyText('${formatGmailForCopy(g).replace(/\n/g, '\\n')}')">
          <i class="fa-regular fa-copy"></i> কপি
        </button>
        ${g.type === 'raw' ? `
          <button class="btn btn-sm btn-warning" onclick="handleMakePrem('${g.id}')">
            <i class="fa-solid fa-crown"></i> প্রিমিয়াম বানান
          </button>
        ` : ''}
        ${g.status === 'available' ? `
          <button class="btn btn-sm btn-danger" onclick="handleMarkSold('${g.id}')">
            <i class="fa-solid fa-tag"></i> Sold Mark
          </button>
        ` : ''}
      </div>
    </div>
  `).join('');
}

window.copyText = function(text) {
  navigator.clipboard.writeText(text);
  alert("কপি করা হয়েছে!");
};

window.handleMakePrem = async function(id) {
  await convertToPremium(id);
};

window.handleMarkSold = async function(id) {
  const buyer = prompt("কাস্টমারের নাম লিখুন:");
  if (buyer) await markGmailSold(id, buyer);
};

// Render Vault Items
function renderVault(list) {
  const container = document.getElementById('vaultList');
  if (!container) return;

  container.innerHTML = list.map(v => `
    <div class="card">
      <div class="card-title">
        <span>${v.title}</span>
        <span class="badge badge-active">${v.category}</span>
      </div>
      <div style="font-size: 13px; margin: 6px 0;">
        ${v.username ? `👤 ইউজার: ${v.username}<br>` : ''}
        🔒 গোপন কোড/লিংক: <span style="color: var(--primary);">${v.secretOrUrl}</span>
      </div>
      <div style="display: flex; gap: 8px; margin-top: 10px;">
        <button class="btn btn-sm btn-copy" onclick="copyText('${v.secretOrUrl}')">
          <i class="fa-regular fa-copy"></i> কপি কোড
        </button>
        <button class="btn btn-sm btn-danger" onclick="handleDeleteVault('${v.id}')">
          <i class="fa-solid fa-trash"></i> ডিলিট
        </button>
      </div>
    </div>
  `).join('');
}

window.handleDeleteVault = async function(id) {
  if (confirm("এটি মুছে ফেলতে চান?")) await deleteVaultItem(id);
};

// Render Videos
function renderVideos(list) {
  const container = document.getElementById('videoCategoryList');
  if (!container) return;

  container.innerHTML = list.map(vid => `
    <div class="card">
      <div class="card-title">
        <span>${vid.title}</span>
        <span class="badge badge-pending">${vid.category}</span>
      </div>
      <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 8px;">
        ${vid.description || 'টেলিগ্রাম ক্লাউড ভিডিও'}
      </div>
      <a href="${vid.urlOrFileId}" target="_blank" class="btn btn-sm btn-primary" style="text-decoration: none; display: inline-flex;">
        <i class="fa-solid fa-play"></i> প্লে / টেলিগ্রামে দেখুন
      </a>
      <button class="btn btn-sm btn-danger" onclick="handleDeleteVideo('${vid.id}')" style="margin-left: 6px;">
        <i class="fa-solid fa-trash"></i>
      </button>
    </div>
  `).join('');
}

window.handleDeleteVideo = async function(id) {
  if (confirm("ভিডিওটি তালিকা থেকে সরাতে চান?")) await deleteVideoItem(id);
};

// Live Firebase Listeners
listenPackagesData(data => { allPackages = data; renderPackages(data); });
listenFamilyPacks(data => { allFamilyPacks = data; });
listenGmailsData(data => { allGmails = data; renderGmails(data); });
listenVaultData(data => { allVault = data; renderVault(data); });
listenVideoVault(data => { allVideos = data; renderVideos(data); });

// Popups / Modals Form Handling
window.openModal = function(type) {
  if (type === 'pkgModal') {
    const name = prompt("কাস্টমারের নাম:");
    const phone = prompt("কাস্টমারের ফোন নাম্বার:");
    if (name && phone) {
      assignCustomerToSlot({ name, phone, assignedPacks: [], hasYoutube: false, youtubeGmail: "" });
    }
  } else if (type === 'familyPackModal') {
    const masterNumber = prompt("মাস্টার নাম্বার (যে সিম থেকে প্যাক কেনা):");
    const packName = prompt("প্যাকেজের নাম (যেমন: প্যাক #১):");
    const totalGB = prompt("মোট জিবি:");
    const totalMin = prompt("মোট মিনিট:");
    const cost = prompt("কেনা খরচ (টাকা):");
    if (masterNumber && packName) {
      createFamilyPack(masterNumber, packName, totalGB, totalMin, cost);
    }
  } else if (type === 'gmailModal') {
    const email = prompt("জিমেইল ঠিকানা:");
    const password = prompt("পাসওয়ার্ড:");
    const recoveryEmail = prompt("রিকভারি মেইল (না থাকলে খালি রাখুন):") || "";
    if (email && password) {
      addGmail({ email, password, recoveryEmail, type: "sale" });
    }
  } else if (type === 'passModal') {
    const title = prompt("টাইটেল (যেমন: ফেসবুক/সিপ্যানেল):");
    const secretOrUrl = prompt("পাসওয়ার্ড বা গোপন তথ্য:");
    if (title && secretOrUrl) {
      addVaultItem({ title, secretOrUrl, category: "password" });
    }
  } else if (type === 'docModal') {
    const title = prompt("ডকুমেন্টের নাম (যেমন: পাসপোর্ট/এনআইডি):");
    const secretOrUrl = prompt("ড্রাইভ/ক্লাউড লিংক বা টেক্সট:");
    if (title && secretOrUrl) {
      addVaultItem({ title, secretOrUrl, category: "document" });
    }
  } else if (type === 'videoModal') {
    const title = prompt("ভিডিওর নাম/টাইটেল:");
    const category = prompt("ক্যাটাগরি (যেমন: Sad Video, Tutorial):");
    const telegramFileIdOrLink = prompt("টেলিগ্রাম মেসেজ লিংক বা ফাইল লিংক:");
    if (title && telegramFileIdOrLink) {
      addVideoToVault({ title, category, telegramFileIdOrLink });
    }
  }
};
      
