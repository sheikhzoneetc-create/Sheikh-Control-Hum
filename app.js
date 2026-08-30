// সব মডিউল ইমপোর্ট
import { listenPackages, renderPackagesSection } from "./packages.js";
import { listenGmailStock, renderGmailSection } from "./gmail.js";
import { listenVaultData, listenVideoVault, renderVaultSection, addPasswordItem, addDocumentItem, addVideoToVault, deleteVaultItem, deleteVideoItem } from "./vault.js";
import { listenReminders, renderReminderSection, startAlarmChecker, addReminder, completeReminder, deleteReminder } from "./reminder.js";

// লাইভ ডাটা লোডার
try {
  listenPackages((data) => {
    const root = document.getElementById("packages-root");
    if (root) renderPackagesSection(root, data);
  });
} catch (e) { console.log(e); }

try {
  listenGmailStock((data) => {
    const root = document.getElementById("gmail-root");
    if (root) renderGmailSection(root, data);
  });
} catch (e) { console.log(e); }

let vVault = [], vVideos = [];
function updateVault() {
  const root = document.getElementById("vault-root");
  if (root) renderVaultSection(root, vVault, vVideos);
}

try {
  listenVaultData((data) => { vVault = data; updateVault(); });
  listenVideoVault((data) => { vVideos = data; updateVault(); });
} catch (e) { console.log(e); }

try {
  listenReminders((data) => {
    const root = document.getElementById("reminder-root");
    if (root) {
      renderReminderSection(root, data);
      startAlarmChecker(data);
    }
  });
} catch (e) { console.log(e); }

// ট্যাব সুইচিং
window.switchMainTab = function(tabId, btn) {
  document.querySelectorAll(".tab-sec").forEach(s => s.classList.remove("active"));
  document.querySelectorAll(".nav-item").forEach(b => b.classList.remove("active"));
  
  const target = document.getElementById(tabId);
  if (target) target.classList.add("active");
  if (btn) btn.classList.add("active");
};

window.closeAnyModal = function() {
  const m = document.getElementById("modal-backdrop");
  if (m) m.style.display = "none";
};

window.copyVaultText = function(text) {
  navigator.clipboard.writeText(text);
  alert("📋 কপি করা হয়েছে!");
};

window.handleDeleteVaultItem = async (id) => { if(confirm("ডিলিট করবেন?")) await deleteVaultItem(id); };
window.handleDeleteVideoItem = async (id) => { if(confirm("ডিলিট করবেন?")) await deleteVideoItem(id); };
window.handleCompleteReminder = async (id) => { await completeReminder(id); };
window.handleDeleteReminder = async (id) => { if(confirm("মুছে ফেলবেন?")) await deleteReminder(id); };

window.openReminderModal = function() {
  const m = document.getElementById("modal-backdrop");
  document.getElementById("modal-title").innerText = "⏰ নতুন রিমাইন্ডার";
  document.getElementById("modal-body").innerHTML = `
    <div style="display:flex; flex-direction:column; gap:10px;">
      <input type="text" id="rTitle" placeholder="কাজের নাম" class="input-field">
      <input type="datetime-local" id="rTime" class="input-field">
      <textarea id="rNote" placeholder="নোট" class="input-field" rows="2"></textarea>
      <button class="btn btn-primary" id="saveR">সেভ করুন</button>
    </div>
  `;
  m.style.display = "flex";
  document.getElementById("saveR").onclick = async () => {
    const t = document.getElementById("rTitle").value;
    const time = document.getElementById("rTime").value;
    const note = document.getElementById("rNote").value;
    if(!t || !time) { alert("নাম ও সময় দিন"); return; }
    await addReminder(t, time, note);
    window.closeAnyModal();
  };
};

window.openVaultModal = function(type) {
  const m = document.getElementById("modal-backdrop");
  const title = document.getElementById("modal-title");
  const body = document.getElementById("modal-body");
  m.style.display = "flex";

  if(type === 'password') {
    title.innerText = "🔑 নতুন পাসওয়ার্ড";
    body.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:10px;">
        <input type="text" id="pName" placeholder="অ্যাকাউন্টের নাম" class="input-field">
        <input type="text" id="pUser" placeholder="ইউজারনেম" class="input-field">
        <input type="text" id="pPass" placeholder="পাসওয়ার্ড" class="input-field">
        <button class="btn btn-primary" id="saveP">সেভ করুন</button>
      </div>
    `;
    document.getElementById("saveP").onclick = async () => {
      await addPasswordItem(document.getElementById("pName").value, document.getElementById("pUser").value, document.getElementById("pPass").value);
      window.closeAnyModal();
    };
  } else if(type === 'doc') {
    title.innerText = "📄 নতুন ডকুমেন্ট";
    body.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:10px;">
        <input type="text" id="dName" placeholder="নাম" class="input-field">
        <input type="text" id="dLink" placeholder="লিংক" class="input-field">
        <button class="btn btn-primary" id="saveD">সেভ করুন</button>
      </div>
    `;
    document.getElementById("saveD").onclick = async () => {
      await addDocumentItem(document.getElementById("dName").value, document.getElementById("dLink").value);
      window.closeAnyModal();
    };
  } else if(type === 'video') {
    title.innerText = "🎬 নতুন ভিডিও";
    body.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:10px;">
        <input type="text" id="vName" placeholder="ভিডিওর নাম" class="input-field">
        <input type="text" id="vCat" placeholder="ক্যাটাগরি" class="input-field">
        <input type="text" id="vLink" placeholder="টেলিগ্রাম লিংক" class="input-field">
        <button class="btn btn-primary" id="saveV">সেভ করুন</button>
      </div>
    `;
    document.getElementById("saveV").onclick = async () => {
      await addVideoToVault(document.getElementById("vName").value, document.getElementById("vCat").value, document.getElementById("vLink").value);
      window.closeAnyModal();
    };
  }
};
