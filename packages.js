import { db, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot } from "./firebase-config.js";

const pkgCol = collection(db, "package_records");

// লাইভ ডাটা লিসেনার
export function listenPackages(callback) {
  return onSnapshot(pkgCol, (snapshot) => {
    const list = [];
    snapshot.forEach((d) => list.push({ id: d.id, ...d.data() }));
    callback(list);
  });
}

// প্যাকেজ স্ক্রিনের মূল ডিজাইন ও রেন্ডারার
export function renderPackagesSection(containerElement, packages = []) {
  if (!containerElement) return;

  const totalActive = packages.filter(p => p.status === "active").length;
  const freeSlots = packages.reduce((acc, curr) => acc + (4 - (curr.slots?.length || 0)), 0);

  containerElement.innerHTML = `
    <!-- সার্চ বার -->
    <div style="margin-bottom: 12px;">
      <input type="text" id="pkgSearchInput" placeholder="🔍 নাম বা নাম্বার খুঁজুন..." class="input-field" style="width: 100%;">
    </div>

    <!-- টপ স্ট্যাটাস কার্ড -->
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;">
      <div class="card" style="margin: 0; padding: 12px; background: #131b2e;">
        <span style="font-size: 12px; color: #94a3b8;">সক্রিয় কাস্টমার</span>
        <div style="font-size: 22px; font-weight: bold; color: #38bdf8;">${totalActive} জন</div>
      </div>
      <div class="card" style="margin: 0; padding: 12px; background: #131b2e;">
        <span style="font-size: 12px; color: #94a3b8;">ফাঁকা ফ্যামিলি স্লট</span>
        <div style="font-size: 22px; font-weight: bold; color: #10b981;">${freeSlots} টি</div>
      </div>
    </div>

    <!-- কাস্টমার যোগ বাটন -->
    <button class="btn btn-primary" onclick="window.openCustomerModal()" style="margin-bottom: 15px; width: 100%; background: #2563eb; color: #fff;">
      + কাস্টমার যোগ করুন
    </button>

    <!-- কাস্টমার লিস্ট কন্টেইনার -->
    <div id="customerCardsContainer">
      ${packages.map(pkg => `
        <div class="card" style="margin-bottom: 10px; background: #161b22; border: 1px solid #30363d;">
          <div class="card-title">
            <span style="color: #fff; font-weight: bold;">${pkg.customerName || 'কাস্টমার'}</span>
            <span class="badge ${pkg.status === 'active' ? 'badge-active' : 'badge-expired'}">${pkg.status || 'Active'}</span>
          </div>
          <div style="font-size: 13px; color: #94a3b8; margin: 4px 0;">📱 নাম্বার: ${pkg.phone || 'N/A'}</div>
          <div style="font-size: 13px; color: #38bdf8;">📦 প্যাক: ${pkg.packDetails || 'ফ্যামিলি প্যাক'}</div>
        </div>
      `).join('') || `<div style="text-align:center; color:#64748b; padding:30px;">কোনো কাস্টমার ডাটা পাওয়া যায়নি</div>`}
    </div>
  `;
}
