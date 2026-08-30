// ১. গ্লোবাল ট্যাব সুইচিং ফাংশন (সবার উপরে ডিফাইন করা যাতে ক্লিক এরর না আসে)
window.switchMainTab = function(tabId, btnElement) {
  document.querySelectorAll(".tab-sec").forEach(sec => sec.classList.remove("active"));
  document.querySelectorAll(".nav-item").forEach(btn => btn.classList.remove("active"));

  const target = document.getElementById(tabId);
  if (target) target.classList.add("active");
  if (btnElement) btnElement.classList.add("active");
};

// ২. গ্লোবাল মোডাল হ্যান্ডলার
window.closeAnyModal = function() {
  const modal = document.getElementById("modal-backdrop");
  if (modal) modal.style.display = "none";
};

// ৩. টেক্সট কপি হ্যান্ডলার
window.copyVaultText = function(text) {
  navigator.clipboard.writeText(text);
  alert("📋 কপি করা হয়েছে!");
};

// মডিউল ইমপোর্ট
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
} catch (err) {
  console.error("Packages error:", err);
}

try {
  listenGmailStock((data) => {
    const root = document.getElementById("gmail-root");
    if (root) renderGmailSection(root, data);
  });
} catch (err) {
  console.error("Gmail error:", err);
}

let currentVault = [];
let currentVideos = [];

function updateVaultView() {
  const root = document.getElementById("vault-root");
  if (root) renderVaultSection(root, currentVault, currentVideos);
}

try {
  listenVaultData((data) => {
    currentVault = data;
    updateVaultView();
  });
  listenVideoVault((data) => {
    currentVideos = data;
    updateVaultView();
  });
} catch (err) {
  console.error("Vault error:", err);
}

try {
  listenReminders((data) => {
    const root = document.getElementById("reminder-root");
    if (root) {
      renderReminderSection(root, data);
      startAlarmChecker(data);
    }
  });
} catch (err) {
  console.error("Reminder error:", err);
}

// ৪. অ্যাকশন হ্যান্ডলারসমূহ
window.handleDeleteVaultItem = async function(id) {
  if (confirm("এই আইটেমটি ডিলিট করতে চান?")) {
    await deleteVaultItem(id);
  }
};

window.handleDeleteVideoItem = async function(id) {
  if (confirm("ভিডিওটি ডিলিট করতে চান?")) {
    await deleteVideoItem(id);
  }
};

window.handleCompleteReminder = async function(id) {
  await completeReminder(id);
};

window.handleDeleteReminder = async function(id) {
  if (confirm("টাস্কটি মুছে ফেলতে চান?")) {
    await deleteReminder(id);
  }
};

// ৫. পপআপ উইন্ডো কন্ট্রোলার
window.openReminderModal = function() {
  const modal = document.getElementById("modal-backdrop");
  const title = document.getElementById("modal-title");
  const body = document.getElementById("modal-body");

  title.innerText = "⏰ নতুন কাজের অ্যালার্ম";
  body.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 10px;">
      <input type="text" id="remTaskTitle" placeholder="কাজের নাম (যেমন: সিম রিচার্জ)" class="input-field">
      <input type="datetime-local" id="remTaskTime" class="input-field">
      <textarea id="remTaskNote" placeholder="দরকারি নোট (ঐচ্ছিক)" class="input-field" rows="2"></textarea>
      <button class="btn btn-primary" id="btnSaveRem">সংরক্ষণ করুন</button>
    </div>
  `;

  modal.style.display = "flex";

  document.getElementById("btnSaveRem").onclick = async () => {
    const t = document.getElementById("remTaskTitle").value;
    const time = document.getElementById("remTaskTime").value;
    const note = document.getElementById("remTaskNote").value;

    if (!t || !time) {
      alert("কাজের নাম ও সময় দিন!");
      return;
    }

    await addReminder(t, time, note);
    window.closeAnyModal();
  };
};

window.openVaultModal = function(type) {
  const modal = document.getElementById("modal-backdrop");
  const title = document.getElementById("modal-title");
  const body = document.getElementById("modal-body");

  if (type === "password") {
    title.innerText = "🔑 নতুন পাসওয়ার্ড যোগ";
    body.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 10px;">
        <input type="text" id="vTitle" placeholder="অ্যাকাউন্টের নাম" class="input-field">
        <input type="text" id="vUser" placeholder="ইউজারনেম / ইমেইল" class="input-field">
        <input type="text" id="vSecret" placeholder="পাসওয়ার্ড / পিন" class="input-field">
        <button class="btn btn-primary" id="btnSaveV">সেভ করুন</button>
      </div>
    `;
    modal.style.display = "flex";
    document.getElementById("btnSaveV").onclick = async () => {
      await addPasswordItem(
        document.getElementById("vTitle").value,
        document.getElementById("vUser").value,
        document.getElementById("vSecret").value
      );
      window.closeAnyModal();
    };
  } else if (type === "doc") {
    title.innerText = "📄 নতুন ডকুমেন্ট লিংক";
    body.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 10px;">
        <input type="text" id="vDocTitle" placeholder="ডকুমেন্টের নাম" class="input-field">
        <input type="text" id="vDocLink" placeholder="ফাইল বা ড্রাইভ লিংক" class="input-field">
        <button class="btn btn-primary" id="btnSaveVDoc">সেভ করুন</button>
      </div>
    `;
    modal.style.display = "flex";
    document.getElementById("btnSaveVDoc").onclick = async () => {
      await addDocumentItem(
        document.getElementById("vDocTitle").value,
        document.getElementById("vDocLink").value
      );
      window.closeAnyModal();
    };
  } else if (type === "video") {
    title.innerText = "🎬 নতুন ভিডিও লিংক";
    body.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 10px;">
        <input type="text" id="vVidTitle" placeholder="ভিডিওর নাম" class="input-field">
        <input type="text" id="vVidCat" placeholder="ক্যাটাগরি" class="input-field">
        <input type="text" id="vVidLink" placeholder="টেলিগ্রাম মেসেজ লিংক" class="input-field">
        <button class="btn btn-primary" id="btnSaveVVid">সেভ করুন</button>
      </div>
    `;
    modal.style.display = "flex";
    document.getElementById("btnSaveVVid").onclick = async () => {
      await addVideoToVault(
        document.getElementById("vVidTitle").value,
        document.getElementById("vVidCat").value,
        document.getElementById("vVidLink").value
      );
      window.closeAnyModal();
    };
  }
};
