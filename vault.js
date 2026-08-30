import { db, collection, addDoc, deleteDoc, doc, onSnapshot } from "./firebase-config.js";

const vaultCol = collection(db, "vault_items");
const videoCol = collection(db, "video_vault");

// ডাটা লিসেনারসমূহ
export function listenVaultData(callback) {
  return onSnapshot(vaultCol, (snapshot) => {
    const list = [];
    snapshot.forEach((d) => list.push({ id: d.id, ...d.data() }));
    callback(list);
  });
}

export function listenVideoVault(callback) {
  return onSnapshot(videoCol, (snapshot) => {
    const list = [];
    snapshot.forEach((d) => list.push({ id: d.id, ...d.data() }));
    callback(list);
  });
}

// অ্যাড ও ডিলিট ফাংশনসমূহ (Exports)
export async function addPasswordItem(title, username, secret) {
  return await addDoc(vaultCol, {
    type: "password",
    title: title.trim(),
    username: username.trim(),
    secret: secret.trim(),
    createdAt: new Date().toISOString()
  });
}

export async function addDocumentItem(title, docLink) {
  return await addDoc(vaultCol, {
    type: "document",
    title: title.trim(),
    docLink: docLink.trim(),
    createdAt: new Date().toISOString()
  });
}

export async function addVideoToVault(title, category, videoLink) {
  return await addDoc(videoCol, {
    title: title.trim(),
    category: category.trim() || "সাধারণ",
    videoLink: videoLink.trim(),
    createdAt: new Date().toISOString()
  });
}

export async function deleteVaultItem(id) {
  return await deleteDoc(doc(db, "vault_items", id));
}

export async function deleteVideoItem(id) {
  return await deleteDoc(doc(db, "video_vault", id));
}

// ভল্ট সেকশন রেন্ডারার
let currentSubTab = "passwords"; // passwords, docs, videos

export function renderVaultSection(containerElement, vaultItems = [], videoItems = []) {
  if (!containerElement) return;

  const passwords = vaultItems.filter(i => i.type === "password");
  const docs = vaultItems.filter(i => i.type === "document");

  containerElement.innerHTML = `
    <!-- সাব-ট্যাব ন্যাভিগেশন -->
    <div style="display: flex; gap: 6px; background: #161b22; padding: 6px; border-radius: 10px; margin-bottom: 15px; border: 1px solid #30363d;">
      <button class="sub-tab-btn ${currentSubTab === 'passwords' ? 'active-sub' : ''}" onclick="window.switchVaultSub('passwords')">
        🔑 পাসওয়ার্ড (${passwords.length})
      </button>
      <button class="sub-tab-btn ${currentSubTab === 'docs' ? 'active-sub' : ''}" onclick="window.switchVaultSub('docs')">
        📄 ফাইল (${docs.length})
      </button>
      <button class="sub-tab-btn ${currentSubTab === 'videos' ? 'active-sub' : ''}" onclick="window.switchVaultSub('videos')">
        🎬 ভিডিও (${videoItems.length})
      </button>
    </div>

    <!-- সাব-কন্টেন্ট এরিয়া -->
    <div id="vaultSubContent">
      ${getSubTabHTML(currentSubTab, passwords, docs, videoItems)}
    </div>
  `;
}

function getSubTabHTML(subTab, passwords, docs, videoItems) {
  if (subTab === 'passwords') {
    return `
      <button class="btn btn-primary" onclick="window.openVaultModal('password')" style="margin-bottom: 12px; width: 100%;">
        + নতুন পাসওয়ার্ড সেভ করুন
      </button>
      ${passwords.map(p => `
        <div class="card" style="margin-bottom: 10px;">
          <div class="card-title">
            <span>🔑 ${p.title}</span>
            <button class="btn btn-sm btn-danger" onclick="window.handleDeleteVaultItem('${p.id}')">মুছে ফেলুন</button>
          </div>
          <div style="font-size: 13px; color: #8b949e; margin-bottom: 4px;">ইউজার: ${p.username}</div>
          <div style="display: flex; gap: 8px; align-items: center; margin-top: 6px;">
            <input type="password" value="${p.secret}" readonly style="background:#0d1117; color:#58a6ff; border:1px solid #30363d; padding:6px 10px; border-radius:6px; font-size:13px; flex:1;">
            <button class="btn btn-sm btn-copy" onclick="window.copyVaultText('${p.secret}')">📋 কপি</button>
          </div>
        </div>
      `).join('') || `<div style="text-align:center; color:#8b949e; padding:20px;">কোনো পাসওয়ার্ড সেভ করা নেই</div>`}
    `;
  }

  if (subTab === 'docs') {
    return `
      <button class="btn btn-primary" onclick="window.openVaultModal('doc')" style="margin-bottom: 12px; width: 100%;">
        + নতুন ডকুমেন্ট লিংক সেভ করুন
      </button>
      ${docs.map(d => `
        <div class="card" style="margin-bottom: 10px;">
          <div class="card-title">
            <span>📄 ${d.title}</span>
            <button class="btn btn-sm btn-danger" onclick="window.handleDeleteVaultItem('${d.id}')">মুছে ফেলুন</button>
          </div>
          <a href="${d.docLink}" target="_blank" style="color:#58a6ff; font-size:13px; text-decoration:none; word-break:break-all; display:block; margin-top:6px;">🔗 ফাইল ওপেন করুন</a>
        </div>
      `).join('') || `<div style="text-align:center; color:#8b949e; padding:20px;">কোনো ডকুমেন্ট লিংক নেই</div>`}
    `;
  }

  if (subTab === 'videos') {
    return `
      <button class="btn btn-primary" onclick="window.openVaultModal('video')" style="margin-bottom: 12px; width: 100%;">
        + নতুন ভিডিও লিংক যুক্ত করুন
      </button>
      ${videoItems.map(v => `
        <div class="card" style="margin-bottom: 10px;">
          <div class="card-title">
            <span>🎬 ${v.title}</span>
            <span class="badge badge-active">${v.category}</span>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px;">
            <a href="${v.videoLink}" target="_blank" class="btn btn-sm btn-copy" style="text-decoration:none;">▶️ টেলিগ্রামে দেখুন</a>
            <button class="btn btn-sm btn-danger" onclick="window.handleDeleteVideoItem('${v.id}')">মুছে ফেলুন</button>
          </div>
        </div>
      `).join('') || `<div style="text-align:center; color:#8b949e; padding:20px;">কোনো ভিডিও সেভ করা নেই</div>`}
    `;
  }
}

// সাব-ট্যাব সুইচার হ্যান্ডলার
window.switchVaultSub = function(subName) {
  currentSubTab = subName;
  if (window.triggerVaultReRender) {
    window.triggerVaultReRender();
  }
};
