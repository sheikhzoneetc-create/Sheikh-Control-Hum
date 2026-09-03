import { db, collection, addDoc, doc, deleteDoc } from "../../firebase-config.js";
import { appStore } from "../../store.js";

let openSimAccordion = null;
let masterSearchQuery = "";

export function renderMasterSimsView() {
  const container = document.getElementById("master-sim-container");
  if (!container) return;

  const q = (masterSearchQuery || "").toLowerCase();
  const allSims = [...new Set((appStore.masterSims || []).map(m => m.name).filter(Boolean))];
  
  const filteredSims = allSims.filter(sim => {
    const simStr = String(sim || "");
    const pkgs = (appStore.masterSims || []).filter(m => m.name === sim);
    const simMatch = simStr.includes(q);
    const pkgMatch = pkgs.some(p => p.pkgTitle && String(p.pkgTitle).toLowerCase().includes(q));
    return simMatch || pkgMatch;
  });

  if (filteredSims.length === 0) {
    container.innerHTML = `<div style="text-align:center; color:#8b949e; padding:25px;">কোনো সিম পাওয়া যায়নি</div>`;
    return;
  }

  container.innerHTML = filteredSims.map(simNumber => {
    const simPkgs = (appStore.masterSims || []).filter(m => m.name === simNumber);
    const opName = simPkgs[0] ? simPkgs[0].operator : 'SIM';
    const simCusts = (appStore.customers || []).filter(c => simPkgs.some(pkg => pkg.id === c.masterId));
    const occupiedSlots = simCusts.length;
    const freeSlots = 8 - occupiedSlots;
    const isOpen = openSimAccordion === simNumber;

    return `
      <div class="card" style="border-left: 4px solid #1f6feb; margin-bottom: 12px; background: #161b22; padding: 12px; border-radius: 8px;">
        <div onclick="window.toggleSimAccordion('${simNumber}')" style="cursor: pointer; display:flex; justify-content:space-between; align-items:center;">
          <div>
            <span class="badge" style="background:#e11414; color:#fff;">${opName}</span>
            <b style="font-size: 15px; margin-left: 4px;">${simNumber}</b>
            <div style="font-size: 11px; color: #8b949e; margin-top: 3px;">📦 প্যাকেজ: ${simPkgs.length}টি</div>
          </div>
          <div style="text-align: right;">
            <span class="badge" style="background:${freeSlots > 0 ? '#238636' : '#da3633'}; color:#fff; font-size:11px;">
              ${occupiedSlots}/8 মেম্বার
            </span>
            <div style="font-size: 11px; color: ${freeSlots > 0 ? '#3fb950' : '#f85149'}; margin-top: 3px;">
              ${freeSlots > 0 ? `খালি: ${freeSlots}টি` : 'ফুল'} ${isOpen ? '▲' : '▼'}
            </div>
          </div>
        </div>

        ${isOpen ? `
          <div style="margin-top: 12px; padding-top: 10px; border-top: 1px dashed #30363d;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
              <span style="font-size: 12px; font-weight: bold; color: #58a6ff;">📋 প্যাকেজসমূহ:</span>
              <button onclick="window.openAddPackageModal('${simNumber}', '${opName}')" style="background:#238636; color:#fff; border:none; padding:4px 8px; border-radius:4px; font-size:11px; cursor:pointer;">
                + প্যাকেজ লোড
              </button>
            </div>

            ${simPkgs.map((pkg, idx) => {
              const custs = (appStore.customers || []).filter(c => c.masterId === pkg.id);
              const freePkgSlots = 4 - custs.length;
              const usedGb = custs.reduce((s, c) => s + (parseFloat(c.dataGb) || 0), 0);
              const usedMin = custs.reduce((s, c) => s + (parseFloat(c.minutes) || 0), 0);
              const remGb = (parseFloat(pkg.totalGb) || 0) - usedGb;
              const remMin = (parseFloat(pkg.totalMin) || 0) - usedMin;

              let expText = "মেয়াদ আনলিমিটেড";
              if (pkg.expiryDate) {
                const diff = Math.ceil((new Date(pkg.expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
                expText = diff > 0 ? `${diff} দিন বাকি` : (diff === 0 ? "আজ শেষ" : "মেয়াদ শেষ");
              }

              return `
                <div style="background: #0d1117; border: 1px solid #30363d; border-radius: 6px; padding: 10px; margin-bottom: 8px;">
                  <div style="display:flex; justify-content:space-between; align-items:center;">
                    <b style="color: #f0883e; font-size: 13px;">${pkg.pkgTitle || `প্যাক-${idx + 1}`}</b>
                    <span class="badge" style="background:${freePkgSlots > 0 ? '#238636' : '#da3633'}; color:#fff; font-size:10px;">
                      স্লট: ${freePkgSlots > 0 ? freePkgSlots : 0}/4 বাকি
                    </span>
                  </div>
                  <div style="display:flex; justify-content:space-between; font-size: 11px; margin: 6px 0;">
                    <span style="color:#3fb950;">🌐 বাকি: ${remGb.toFixed(1)} GB</span>
                    <span style="color:#58a6ff;">📞 বাকি: ${remMin} Min</span>
                  </div>
                  <div style="font-size: 11px; color: #e3b341; margin-bottom: 6px;">
                    ⏳ মেয়াদ: <b>${expText}</b>
                  </div>
                  <button onclick="window.deleteSinglePackage('${pkg.id}')" style="background:#da3633; color:#fff; border:none; padding:4px 6px; border-radius:4px; font-size:10px; width:100%; cursor:pointer;">
                    🗑️ প্যাক মুছুন
                  </button>
                </div>
              `;
            }).join('')}

            <button onclick="window.deleteFullSim('${simNumber}')" style="background: transparent; border: 1px solid #da3633; color: #f85149; padding: 6px; border-radius: 4px; font-size: 11px; width: 100%; margin-top: 4px; cursor: pointer;">
              ⚠️ সম্পূর্ণ সিম ডিলিট করুন
            </button>
          </div>
        ` : ''}
      </div>
    `;
  }).join('');
}

window.toggleSimAccordion = function (simNumber) {
  openSimAccordion = openSimAccordion === simNumber ? null : simNumber;
  renderMasterSimsView();
};

window.handleMasterSearch = function (val) {
  masterSearchQuery = val;
  renderMasterSimsView();
};

window.openAddSimModal = function () {
  const modal = document.getElementById("modal-container");
  if (!modal) return;
  modal.innerHTML = `
    <div class="modal-content card" style="background:#161b22; max-width:360px; margin:40px auto; padding:16px; border-radius:8px;">
      <h3 style="color:#58a6ff; margin-bottom:12px;">+ নতুন মাস্টার সিম</h3>
      <select id="newSimOperator" class="input-field" style="margin-bottom:8px; width:100%;">
        <option value="GP">Grameenphone (GP)</option>
        <option value="BL">Banglalink (BL)</option>
        <option value="Robi">Robi</option>
        <option value="Airtel">Airtel</option>
        <option value="Teletalk">Teletalk</option>
      </select>
      <input type="text" id="newSimNumber" placeholder="017XXXXXXXX" class="input-field" style="margin-bottom:12px; width:100%;" />
      <div style="display:flex; gap:8px;">
        <button class="btn btn-primary" onclick="window.saveNewSim()" style="flex:1;">সেভ</button>
        <button class="btn btn-danger" onclick="window.closeAnyModal()" style="flex:1;">বাতিল</button>
      </div>
    </div>
  `;
  modal.style.display = "block";
};

window.saveNewSim = async function () {
  const operator = document.getElementById("newSimOperator").value;
  const simNumber = document.getElementById("newSimNumber").value.trim();
  if (!simNumber) return alert("সিম নম্বর দিন!");

  await addDoc(collection(db, "family_masters"), {
    name: simNumber,
    operator,
    pkgTitle: "বেস সিম",
    totalGb: 0,
    totalMin: 0,
    expiryDate: "",
    createdAt: new Date().toISOString()
  });
  window.closeAnyModal();
};

window.openAddPackageModal = function (simNumber, operator) {
  const modal = document.getElementById("modal-container");
  if (!modal) return;
  modal.innerHTML = `
    <div class="modal-content card" style="background:#161b22; max-width:360px; margin:40px auto; padding:16px; border-radius:8px;">
      <h3 style="color:#f0883e; margin-bottom:4px;">+ প্যাকেজ লোড</h3>
      <p style="font-size:12px; color:#8b949e; margin-bottom:12px;">সিম: <b>${simNumber}</b> (${operator})</p>
      <input type="text" id="pkgTitleInput" placeholder="প্যাকেজের নাম (যেমন: 50GB + 1000Min)" class="input-field" style="margin-bottom:8px; width:100%;" />
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:8px;">
        <input type="number" id="pkgGbInput" placeholder="মোট GB" class="input-field" style="width:100%;" />
        <input type="number" id="pkgMinInput" placeholder="মোট মিনিট" class="input-field" style="width:100%;" />
      </div>
      <input type="number" id="pkgDaysInput" placeholder="মেয়াদ কয়দিন? (যেমন: 30)" class="input-field" style="margin-bottom:12px; width:100%;" />
      <div style="display:flex; gap:8px;">
        <button class="btn btn-primary" onclick="window.savePackageToSim('${simNumber}', '${operator}')" style="flex:1; background:#238636;">সেভ</button>
        <button class="btn btn-danger" onclick="window.closeAnyModal()" style="flex:1;">বাতিল</button>
      </div>
    </div>
  `;
  modal.style.display = "block";
};

window.savePackageToSim = async function (simNumber, operator) {
  const pkgTitle = document.getElementById("pkgTitleInput").value.trim() || "প্যাকেজ";
  const totalGb = parseFloat(document.getElementById("pkgGbInput").value) || 0;
  const totalMin = parseFloat(document.getElementById("pkgMinInput").value) || 0;
  const days = parseInt(document.getElementById("pkgDaysInput").value) || 30;

  const expDate = new Date();
  expDate.setDate(expDate.getDate() + days);

  await addDoc(collection(db, "family_masters"), {
    name: simNumber,
    operator,
    pkgTitle,
    totalGb,
    totalMin,
    expiryDate: expDate.toISOString(),
    createdAt: new Date().toISOString()
  });
  window.closeAnyModal();
};

window.deleteSinglePackage = async function (id) {
  if (confirm("প্যাকেজটি ডিলিট করতে চান?")) {
    await deleteDoc(doc(db, "family_masters", id));
  }
};

window.deleteFullSim = async function (simNumber) {
  if (confirm(`সতর্কতা: ${simNumber} নম্বরের সব প্যাকেজ ডিলিট হবে! নিশ্চিত?`)) {
    const pkgs = (appStore.masterSims || []).filter(m => m.name === simNumber);
    for (let p of pkgs) {
      await deleteDoc(doc(db, "family_masters", p.id));
    }
  }
};
