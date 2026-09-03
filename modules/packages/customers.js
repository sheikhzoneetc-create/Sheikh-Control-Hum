import { db, collection, addDoc, doc, deleteDoc, updateDoc } from "../../firebase-config.js";
import { appStore } from "../../store.js";

let customerSearchQuery = "";
let selectedPkgIdForCustomer = null;

export function renderCustomersView() {
    const container = document.getElementById("customer-list-container");
    if (!container) return;
}
