import { db, collection, onSnapshot } from "./firebase-config.js";
import { appStore } from "./store.js";
import { renderMasterSimsView } from "./modules/packages/masterSims.js";
import { renderCustomersView } from "./modules/packages/customers.js";
import { renderGmailsView } from "./modules/gmails/gmailManager.js";

window.switchMainSector = function(sector) {
  const pkgNav = document.getElementById("nav-pkg-sector");
  const gmailNav = document.getElementById("nav-gmail-sector");
  const pkgSector = document.getElementById("sector-package");
  const gmailSector = document.getElementById("sector-gmail");
  const pkgStats = document.getElementById("stats-pkg-bar");
  const gmailStats = document.getElementById("stats-gmail-bar");

  const isPkg = sector === 'package';
  pkgNav.classList.toggle("active", isPkg);
  gmailNav.classList.toggle("active", !isPkg);

  pkgSector.style.display = isPkg ? 'block' : 'none';
  gmailSector.style.display = isPkg ? 'none' : 'block';

  pkgStats.style.display = isPkg ? 'grid' : 'none';
  gmailStats.style.display = isPkg ? 'none' : 'grid';
};

window.switchPackageSubTab = function(sub) {
  const simBtn = document.getElementById("sub-sim-btn");
  const custBtn = document.getElementById("sub-cust-btn");
  const simView = document.getElementById("sim-view-section");
  const custView = document.getElementById("cust-view-section");

  simBtn.style.background = sub === 'sims' ? '#1f6feb' : '#21262d';
  custBtn.style.background = sub === 'customers' ? '#238636' : '#21262d';

  simView.style.display = sub === 'sims' ? 'block' : 'none';
  custView.style.display = sub === 'customers' ? 'block' : 'none';
};

window.closeAnyModal = function() {
  const modal = document.getElementById("modal-container");
  if (modal) {
    modal.style.display = "none";
    modal.innerHTML = "";
  }
};

function updateOverviewStats() {
  const totalPkgsEl = document.getElementById("stat-total-pkgs");
  const totalRevEl = document.getElementById("stat-total-rev");
  const statFresh = document.getElementById("stat-fresh");
  const statYt = document.getElementById("stat-yt");
  const statTrade = document.getElementById("stat-trade");
  
  const actualPackages = (appStore.masterSims || []).filter(m => m.name && m.pkgTitle && m.pkgTitle !== "বেস সিম");
  if (totalPkgsEl) totalPkgsEl.innerText = actualPackages.length;
  
  if (totalRevEl) {
    const totalRev = (appStore.customers || []).reduce((sum, c) => sum + (parseFloat(c.price) || 0), 0);
    totalRevEl.innerText = totalRev + " ৳";
  }

  const allG = appStore.allGmails || [];
  if (statFresh) {
    statFresh.innerText = allG.filter(g => g.category === "fresh" && g.status !== "sold").length;
  }
  if (statYt) {
    statYt.innerText = allG.filter(g => g.category === "business_yt" && g.status !== "sold").length;
  }
  if (statTrade) {
    statTrade.innerText = allG.filter(g => g.category === "buy_sell" && g.status !== "sold").length;
  }
}

onSnapshot(collection(db, "family_masters"), (snapshot) => {
  appStore.masterSims = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  renderMasterSimsView();
  updateOverviewStats();
});

onSnapshot(collection(db, "customers"), (snapshot) => {
  appStore.customers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  renderCustomersView();
  updateOverviewStats();
});

onSnapshot(collection(db, "gmail_stocks"), (snapshot) => {
  const gmails = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  appStore.allGmails = gmails;
  appStore.youtubeReadyGmails = gmails.filter(g => g.category === "business_yt" && g.status !== "sold");
  renderGmailsView();
  updateOverviewStats();
});
