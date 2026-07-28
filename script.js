const currencySymbols = { INR: "₹", USD: "$", EUR: "€", GBP: "£", CAD: "C$", AUD: "A$" };
const fieldIds = [
  "businessName", "businessEmail", "businessPhone", "businessAddress",
  "invoiceNumber", "currency", "issueDate", "dueDate", "clientName",
  "clientEmail", "clientAddress", "notes", "paymentDetails", "discount", "tax"
];

let state = {
  items: [
    { name: "", detail: "", qty: 1, rate: 0 }
  ],
  logo: ""
};

const $ = (id) => document.getElementById(id);
const money = (value) => {
  const code = $("currency").value;
  return `${currencySymbols[code]}${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
const formatDate = (value) => value ? new Date(`${value}T00:00:00`).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const value = (id) => $(id).value.trim();

function setInitialDates() {
  if (!$("issueDate").value) {
    const today = new Date();
    const due = new Date(today);
    due.setDate(today.getDate() + 14);
    $("issueDate").value = today.toISOString().split("T")[0];
    $("dueDate").value = due.toISOString().split("T")[0];
  }
}

function renderItems() {
  state.items = state.items.map(item => ({
    ...item,
    qty: Math.max(0, Number(item.qty) || 0),
    rate: Math.max(0, Number(item.rate) || 0)
  }));
  $("itemsContainer").innerHTML = state.items.map((item, index) => `
    <div class="line-item" data-index="${index}">
      <input class="item-description" data-field="name" value="${escapeHtml(item.name)}" placeholder="Item description" aria-label="Item ${index + 1} description">
      <input type="number" data-field="qty" min="0" step="1" value="${item.qty}" aria-label="Item ${index + 1} quantity">
      <input type="number" data-field="rate" min="0" step="0.01" value="${item.rate}" aria-label="Item ${index + 1} rate">
      <span class="line-amount">${money(item.qty * item.rate)}</span>
      <button class="remove-item" data-remove="${index}" type="button" aria-label="Remove item ${index + 1}">×</button>
    </div>
    <input class="item-detail-hidden" data-index="${index}" value="${escapeHtml(item.detail || "")}" hidden>
  `).join("");
  $("itemCount").textContent = `${state.items.length} item${state.items.length === 1 ? "" : "s"}`;
  renderPreview();
}

function renderPreview() {
  const textMap = {
    pBusinessName: value("businessName") || "Your business",
    pBusinessEmail: value("businessEmail"),
    pBusinessPhone: value("businessPhone"),
    pInvoiceNumber: `#${value("invoiceNumber")}`,
    pClientName: value("clientName") || "Client name",
    pClientEmail: value("clientEmail"),
    pNotes: value("notes"),
    pPaymentDetails: value("paymentDetails")
  };
  Object.entries(textMap).forEach(([id, text]) => $(id).textContent = text);
  $("pBusinessAddress").innerHTML = escapeHtml(value("businessAddress")).replace(/\n/g, "<br>");
  $("pClientAddress").innerHTML = escapeHtml(value("clientAddress")).replace(/\n/g, "<br>");
  $("pIssueDate").textContent = formatDate($("issueDate").value);
  $("pDueDate").textContent = formatDate($("dueDate").value);
  $("pNotesWrap").style.display = value("notes") ? "block" : "none";

  $("previewItems").innerHTML = state.items.map(item => `
    <tr>
      <td><strong>${escapeHtml(item.name || "Untitled item")}</strong>${item.detail ? `<small>${escapeHtml(item.detail)}</small>` : ""}</td>
      <td>${Number(item.qty || 0)}</td>
      <td>${money(item.rate)}</td>
      <td><strong>${money(item.qty * item.rate)}</strong></td>
    </tr>
  `).join("");

  const subtotal = state.items.reduce((sum, item) => sum + Number(item.qty || 0) * Number(item.rate || 0), 0);
  const discount = subtotal * Math.min(Math.max(Number($("discount").value) || 0, 0), 100) / 100;
  const taxable = subtotal - discount;
  const tax = taxable * Math.min(Math.max(Number($("tax").value) || 0, 0), 100) / 100;
  $("pSubtotal").textContent = money(subtotal);
  $("pDiscount").textContent = `−${money(discount)}`;
  $("pTax").textContent = money(tax);
  $("pTotal").textContent = money(taxable + tax);
  $("summaryInvoice").textContent = value("invoiceNumber") || "Untitled";
  $("summaryItems").textContent = state.items.length;
  $("summaryTotal").textContent = money(taxable + tax);
  $("overviewTotal").textContent = money(taxable + tax);
  $("overviewInvoiceAmount").textContent = money(taxable + tax);
  $("overviewInvoiceNumber").textContent = value("invoiceNumber") || "Untitled";
  $("overviewClient").textContent = value("clientName") || "No client added";
  $("overviewClientEmail").textContent = value("clientEmail") || "No email added";
  $("overviewClientInitial").textContent = (value("clientName")[0] || "C").toUpperCase();
  $("overviewInvoiceDue").textContent = formatDate($("dueDate").value);
  $("overviewDueDate").textContent = $("dueDate").value
    ? `Due ${formatDate($("dueDate").value)}`
    : "No due date";
  updateLogo();
  saveState();
}

function updateLogo() {
  const pLogo = $("pLogo");
  const image = pLogo.querySelector("img");
  const initials = (value("businessName") || "Your Business").split(/\s+/).slice(0, 2).map(word => word[0]).join("").toUpperCase();
  pLogo.querySelector("span").textContent = initials;
  image.src = state.logo;
  image.style.display = state.logo ? "block" : "none";
  pLogo.querySelector("span").style.display = state.logo ? "none" : "inline";
  $("logoPreview").src = state.logo;
  $("logoPreview").style.display = state.logo ? "block" : "none";
  $("logoPlaceholder").style.display = state.logo ? "none" : "block";
}

let saveTimer;
function saveState() {
  const form = Object.fromEntries(fieldIds.map(id => [id, $(id).value]));
  localStorage.setItem("slateInvoiceV2", JSON.stringify({ form, items: state.items, logo: state.logo }));
  $("saveStatus").innerHTML = '<span class="status-dot"></span>Saving…';
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => $("saveStatus").innerHTML = '<span class="status-dot"></span>Saved locally', 350);
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem("slateInvoiceV2"));
    if (!saved) return;
    Object.entries(saved.form || {}).forEach(([id, fieldValue]) => { if ($(id)) $(id).value = fieldValue; });
    if (Array.isArray(saved.items) && saved.items.length) state.items = saved.items;
    state.logo = saved.logo || "";
  } catch (_) {
    localStorage.removeItem("slateInvoiceV2");
  }
}

function showToast(message) {
  $("toast").textContent = message;
  $("toast").classList.add("show");
  setTimeout(() => $("toast").classList.remove("show"), 2200);
}

fieldIds.forEach(id => $(id).addEventListener("input", renderPreview));

$("itemsContainer").addEventListener("input", (event) => {
  const row = event.target.closest(".line-item");
  if (!row) return;
  const index = Number(row.dataset.index);
  const field = event.target.dataset.field;
  if (field === "name") {
    state.items[index][field] = event.target.value;
  } else {
    const enteredValue = Number(event.target.value);
    const safeValue = Math.max(0, Number.isFinite(enteredValue) ? enteredValue : 0);
    state.items[index][field] = safeValue;
    if (enteredValue < 0) event.target.value = 0;
  }
  row.querySelector(".line-amount").textContent =
    money(state.items[index].qty * state.items[index].rate);
  renderPreview();
});

$("itemsContainer").addEventListener("click", (event) => {
  const index = event.target.dataset.remove;
  if (index === undefined) return;
  if (state.items.length === 1) return showToast("An invoice needs at least one item.");
  state.items.splice(Number(index), 1);
  renderItems();
});

$("addItemBtn").addEventListener("click", () => {
  state.items.push({ name: "", detail: "", qty: 1, rate: 0 });
  renderItems();
  document.querySelector(".line-item:last-of-type .item-description")?.focus();
});

$("logoUploadBtn").addEventListener("click", () => $("logoInput").click());
$("logoInput").addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (!file) return;
  if (file.size > 1500000) return showToast("Please choose a logo smaller than 1.5 MB.");
  const reader = new FileReader();
  reader.onload = () => { state.logo = reader.result; renderPreview(); };
  reader.readAsDataURL(file);
});

$("downloadBtn").addEventListener("click", () => {
  showToast("Choose “Save as PDF” in the print window.");
  setTimeout(() => window.print(), 250);
});

$("generateBtn").addEventListener("click", () => {
  const required = [
    ["businessName", "Please enter your business name."],
    ["invoiceNumber", "Please enter an invoice number."],
    ["clientName", "Please enter the client name."]
  ];
  const missing = required.find(([id]) => !value(id));
  if (missing) {
    showToast(missing[1]);
    $(missing[0]).focus();
    return;
  }
  if (state.items.some(item => !String(item.name).trim() || Number(item.qty) <= 0)) {
    showToast("Please complete each line item.");
    return;
  }
  renderPreview();
  document.body.classList.add("preview-mode");
  window.scrollTo({ top: 0, behavior: "smooth" });
});

$("backToEditBtn").addEventListener("click", () => {
  document.body.classList.remove("preview-mode");
  document.body.classList.add("invoice-mode");
  window.scrollTo({ top: 0, behavior: "smooth" });
});

function showInvoiceEditor() {
  document.body.classList.remove("preview-mode");
  document.body.classList.add("invoice-mode");
  document.querySelectorAll("[data-view]").forEach(button => {
    button.classList.toggle("active", button.dataset.view === "invoice");
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showOverview() {
  document.body.classList.remove("preview-mode", "invoice-mode");
  document.querySelectorAll("[data-view]").forEach(button => {
    button.classList.toggle("active", button.dataset.view === "overview");
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.querySelectorAll("[data-view]").forEach(button => {
  button.addEventListener("click", () => {
    if (button.dataset.view === "overview") showOverview();
    if (button.dataset.view === "invoice") showInvoiceEditor();
    if (button.dataset.view === "transactions") showToast("Transaction tracking is coming soon.");
  });
});

["overviewCreateBtn", "quickCreateBtn"].forEach(id => $(id).addEventListener("click", showInvoiceEditor));
$("viewInvoiceBtn").addEventListener("click", showInvoiceEditor);
$("recentInvoiceRow").addEventListener("click", showInvoiceEditor);

$("newInvoiceBtn").addEventListener("click", () => {
  if (!confirm("Start a new invoice? Your current invoice will be cleared.")) return;
  localStorage.removeItem("slateInvoiceV2");
  location.reload();
});

loadState();
setInitialDates();
renderItems();
