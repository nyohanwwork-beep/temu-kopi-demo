import { categories } from "./data/mock-data.js";
import { assets } from "./data/assets.js";
import { buildOrderIdentity, buildOrderItems, createOrder, closeShift, normalizeCustomerPhone, partitionKitchenOrders, recordStockMovement, requestRefund, restoreKitchenOrder, transitionKitchenOrder, transitionRefund, upsertCustomer } from "./lib/demo-operations.js";
import { loadDemoState, resetDemoState, saveDemoState } from "./lib/demo-store.js";
import { closeModal, escapeHtml, icon, initials, openModal, rupiah, status, toast } from "./ui.js";
import {
  initialAuditLogs,
  initialExpenses,
  initialIngredients,
  initialMenus,
  initialOrders,
  initialShifts,
  initialUsers,
  navItems,
  pageMeta,
  renderPage,
  roleLabel,
  title,
} from "./views/renderers.js";

const app = document.querySelector("#app");
const defaultSettings = {
  cafeName: "Temu Kopi",
  address: "Jl. Contoh No. 18, Jakarta",
  phone: "0812 3456 7890",
  timezone: "Asia/Jakarta",
  readySound: true,
  autoReceipt: false,
  kitchenTicket: true,
};

function seedState() {
  return {
    user: null,
    page: "kasir",
    category: "all",
    menuSearch: "",
    historySearch: "",
    historyStatus: "all",
    inventoryTab: "menus",
    menuSort: "qtySold",
    cart: [],
    discount: 0,
    orders: initialOrders(),
    users: initialUsers(),
    menus: initialMenus(),
    ingredients: initialIngredients(),
    shifts: initialShifts(),
    expenses: initialExpenses(),
    auditLogs: initialAuditLogs(),
    inventoryMovements: [],
    customers: [],
    settings: structuredClone(defaultSettings),
  };
}

let state = loadDemoState({ seed: seedState() });
state = { ...seedState(), ...state, settings: { ...defaultSettings, ...(state.settings || {}) } };

const demoUsers = {
  owner: { id: "usr-owner-01", name: "Natanael", role: "owner" },
  staff_kasir: { id: "usr-cashier-01", name: "Rina", role: "staff_kasir" },
  staff_dapur: { id: "usr-kitchen-01", name: "Budi", role: "staff_dapur" },
};

const recipeUsage = {
  "menu-aren": [["ing-beans", 18], ["ing-milk", 150], ["ing-aren", 20]],
  "menu-latte": [["ing-beans", 18], ["ing-milk", 180]],
  "menu-americano": [["ing-beans", 18]],
  "menu-matcha": [["ing-matcha", 12], ["ing-milk", 170]],
  "menu-nasgor": [["ing-rice", 180]],
};

function persist() {
  state = saveDemoState(state);
}

function audit(action, entity, actor = state.user?.name || "Sistem") {
  state.auditLogs.unshift({
    id: `audit-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    action,
    actor,
    entity,
    at: new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(new Date()),
  });
}

function commit({ rerender = true } = {}) {
  persist();
  if (rerender) render();
}

function render() {
  if (!state.user) {
    app.innerHTML = loginTemplate();
    bindLogin();
    return;
  }
  const allowed = navItems.filter((item) => item.roles.includes(state.user.role));
  if (!allowed.some((item) => item.id === state.page)) state.page = allowed[0].id;
  const [heading, subheading] = pageMeta[state.page];
  const online = navigator.onLine;
  app.innerHTML = `<div class="app-shell"><aside class="sidebar" aria-label="Navigasi utama"><div class="sidebar-logo"><img src="${assets.logo}" alt="Logo Temu Kopi" /><div><strong>Temu Kopi</strong><small>Operasional Kafe</small></div></div><div class="nav-label">Ruang kerja</div><nav class="nav-list">${allowed.map((item) => `<button class="nav-item ${state.page === item.id ? "active" : ""}" data-route="${item.id}">${icon(item.icon)}<span>${item.label}</span></button>`).join("")}</nav><div class="sidebar-footer"><div class="profile-mini"><span class="avatar">${initials(state.user.name)}</span><div><strong>${escapeHtml(state.user.name)}</strong><small>${roleLabel(state.user.role)}</small></div><button class="icon-button dark" data-action="logout" aria-label="Keluar">${icon("logout")}</button></div></div></aside><header class="app-header"><div class="header-cluster"><button class="icon-button mobile-menu" data-action="toggle-nav" aria-label="Buka navigasi">${icon("menu")}</button><div class="header-title"><h1>${heading}</h1><p>${subheading}</p></div></div><div class="header-actions"><span class="connection ${online ? "" : "offline"}"><span>${online ? "Online" : "Offline"}</span></span><button class="icon-button" data-route="settings" aria-label="Pengaturan">${icon("settings")}</button></div></header><main class="app-main"><div class="content">${renderPage(state)}</div></main></div>`;
  bindCommon();
  bindPage();
}

function loginTemplate() {
  return `<main class="login-page"><section class="login-brand"><div><img class="brand-mark" src="${assets.logo}" alt="Temu Kopi"/><h1>Kerja lebih tenang, pelayanan lebih hangat.</h1><p>Satu ruang kerja untuk kasir, dapur, stok, dan laporan Temu Kopi.</p></div><span class="login-tagline">Ngopi · Makan · Temu Cerita</span></section><section class="login-panel"><div><span class="environment-label">LINGKUNGAN DEMO</span><h2>Pilih akses</h2><p>Data disimpan pada browser perangkat ini. Tidak ada data produksi yang terhubung.</p><div class="role-grid">${roleOption("owner", "Owner", "Dashboard, laporan lengkap, dan pengaturan", "dashboard")}${roleOption("staff_kasir", "Kasir", "Pesanan, pembayaran, riwayat, dan shift", "cart")}${roleOption("staff_dapur", "Dapur", "Antrean dan status pengerjaan pesanan", "chef")}</div></div></section></main>`;
}

function roleOption(role, label, detail, iconName) {
  return `<button class="role-option" data-login-role="${role}"><span class="role-icon">${icon(iconName)}</span><span><strong>${label}</strong><small>${detail}</small></span>${icon("chevron")}</button>`;
}

function bindLogin() {
  app.querySelectorAll("[data-login-role]").forEach((button) => button.addEventListener("click", () => {
    const role = button.dataset.loginRole;
    state.user = demoUsers[role];
    state.page = role === "owner" ? "dashboard" : role === "staff_dapur" ? "dapur" : "kasir";
    commit();
    toast(`Masuk sebagai ${roleLabel(role)}`, "success");
  }));
}

function bindCommon() {
  app.querySelectorAll("[data-route]").forEach((button) => button.addEventListener("click", () => {
    state.page = button.dataset.route;
    document.body.classList.remove("nav-open");
    commit();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }));
  app.querySelector('[data-action="toggle-nav"]')?.addEventListener("click", () => document.body.classList.toggle("nav-open"));
  app.querySelector('[data-action="logout"]')?.addEventListener("click", () => {
    state.user = null;
    state.cart = [];
    state.discount = 0;
    document.body.classList.remove("nav-open");
    commit();
  });
}

function bindPage() {
  bindCashier();
  bindKitchen();
  bindInventory();
  bindHistory();
  bindReports();
  bindCustomers();
  bindAccounts();
  bindSettings();
  app.querySelectorAll('[data-action="print-report"]').forEach((button) => button.addEventListener("click", () => window.print()));
  app.querySelectorAll('[data-action="export-csv"]').forEach((button) => button.addEventListener("click", exportTransactionsCsv));
  app.querySelectorAll('[data-action="download-template"]').forEach((button) => button.addEventListener("click", () => downloadFile("./assets/Spreadsheet_Operasional_Temu_Kopi_Lengkap.xlsx")));
}

function bindCashier() {
  app.querySelectorAll("[data-category]").forEach((button) => button.addEventListener("click", () => { state.category = button.dataset.category; commit(); }));
  app.querySelector("#menu-search")?.addEventListener("input", (event) => { state.menuSearch = event.target.value; persist(); render(); document.querySelector("#menu-search")?.focus(); });
  app.querySelector("#discount-input")?.addEventListener("change", (event) => {
    const subtotal = state.cart.reduce((sum, line) => sum + line.price * line.qty, 0);
    state.discount = Math.max(0, Math.min(subtotal, Math.round(Number(event.target.value) || 0)));
    commit();
  });
  app.querySelectorAll("[data-add-menu]").forEach((button) => button.addEventListener("click", () => {
    const menu = state.menus.find((item) => item.id === button.dataset.addMenu);
    if (!menu || menu.availability !== "aktif") return;
    const line = state.cart.find((item) => item.id === menu.id);
    if (line) line.qty += 1;
    else state.cart.push({ id: menu.id, name: menu.name, price: menu.price, qty: 1, variant: menu.variants[0] || "", note: "" });
    commit();
    toast(`${menu.name} ditambahkan`, "success");
  }));
  app.querySelectorAll("[data-cart-inc]").forEach((button) => button.addEventListener("click", () => updateCart(button.dataset.cartInc, 1)));
  app.querySelectorAll("[data-cart-dec]").forEach((button) => button.addEventListener("click", () => updateCart(button.dataset.cartDec, -1)));
  app.querySelectorAll("[data-cart-remove]").forEach((button) => button.addEventListener("click", () => { state.cart = state.cart.filter((item) => item.id !== button.dataset.cartRemove); commit(); }));
  app.querySelectorAll("[data-cart-edit]").forEach((button) => button.addEventListener("click", () => editCartLine(button.dataset.cartEdit)));
  app.querySelector('[data-action="clear-cart"]')?.addEventListener("click", () => { state.cart = []; state.discount = 0; commit(); });
  app.querySelector('[data-action="checkout"]')?.addEventListener("click", checkoutStepOne);
  app.querySelector('[data-action="open-active-orders"]')?.addEventListener("click", showActiveOrders);
}

function updateCart(id, delta) {
  const line = state.cart.find((item) => item.id === id);
  if (!line) return;
  line.qty += delta;
  if (line.qty <= 0) state.cart = state.cart.filter((item) => item.id !== id);
  commit();
}

function editCartLine(id) {
  const line = state.cart.find((item) => item.id === id);
  const menu = state.menus.find((item) => item.id === id);
  if (!line || !menu) return;
  openModal(`<div class="modal"><div class="modal-header"><h2>Atur ${escapeHtml(line.name)}</h2><button class="icon-button" data-close-modal>${icon("x")}</button></div><div class="modal-body"><div class="field"><label>Varian</label><select class="select" id="line-variant">${(menu.variants.length ? menu.variants : ["Tanpa varian"]).map((variant) => `<option ${line.variant === variant ? "selected" : ""}>${escapeHtml(variant)}</option>`).join("")}</select></div><div class="field section-gap"><label>Catatan item</label><textarea class="textarea" id="line-note" maxlength="120" placeholder="Contoh: less ice">${escapeHtml(line.note)}</textarea></div></div><div class="modal-footer"><button class="btn btn-secondary" data-close-modal>Batal</button><button class="btn btn-primary" id="save-line">Simpan</button></div></div>`);
  document.querySelector("#save-line")?.addEventListener("click", () => {
    line.variant = menu.variants.length ? document.querySelector("#line-variant").value : "";
    line.note = document.querySelector("#line-note").value.trim();
    closeModal();
    commit();
  });
}

function checkoutStepOne() {
  if (!state.cart.length) return;
  openModal(`<div class="modal"><div class="modal-header"><div><h2>Detail pesanan</h2><small>Langkah 1 dari 2</small></div><button class="icon-button" data-close-modal>${icon("x")}</button></div><div class="modal-body"><div class="stepper"><span class="active"></span><span></span></div><div class="field"><label>Jenis pesanan</label><div class="choice-grid" id="order-types"><button class="choice active" data-order-type="dine_in">${icon("utensils")}<small>Dine-in</small></button><button class="choice" data-order-type="takeaway">${icon("package")}<small>Takeaway</small></button><button class="choice" data-order-type="delivery">${icon("receipt")}<small>Delivery</small></button></div></div><div id="identity-fields" class="section-gap"></div><div class="customer-fields section-gap"><div><strong>Data pelanggan</strong><p>Opsional. Nama dapat dipakai untuk memanggil pesanan.</p></div><div class="form-grid"><div class="field"><label>Nama panggilan <span>Opsional</span></label><input class="input" id="customer-name" maxlength="60" autocomplete="name" placeholder="Contoh: Natanael" /></div><div class="field"><label>No. HP / WhatsApp <span>Opsional</span></label><input class="input" id="customer-phone" type="tel" inputmode="tel" maxlength="20" autocomplete="tel" placeholder="Contoh: 0812 3456 7890" /></div></div><label class="check-row consent-row"><input type="checkbox" id="marketing-consent" /> Pelanggan setuju menerima informasi dan promo melalui WhatsApp</label><p class="form-help">Nama tanpa nomor HP hanya dipakai untuk pesanan ini dan tidak masuk database pelanggan.</p></div><div class="field section-gap"><label>Catatan pesanan <span>Opsional</span></label><textarea class="textarea" id="order-note" maxlength="180" placeholder="Catatan umum untuk seluruh pesanan"></textarea><p class="form-help">Catatan ini terpisah dari catatan setiap menu.</p></div></div><div class="modal-footer"><button class="btn btn-secondary" data-close-modal>Batal</button><button class="btn btn-primary" id="to-payment">Lanjut pembayaran ${icon("chevron")}</button></div></div>`);
  let orderType = "dine_in";
  const renderIdentity = () => {
    const root = document.querySelector("#identity-fields");
    if (orderType === "dine_in") root.innerHTML = '<div class="field"><label>Nomor meja <span>Opsional jika memakai nama</span></label><input class="input" id="table-no" inputmode="numeric" maxlength="10" placeholder="Contoh: 07" /><p class="form-help">Isi nomor meja atau nama panggilan pelanggan.</p></div>';
    if (orderType === "takeaway") root.innerHTML = '<div class="verification-box"><strong>Pesanan dibawa pulang</strong><p>Nama panggilan dapat diisi di bawah agar pesanan mudah diserahkan.</p></div>';
    if (orderType === "delivery") root.innerHTML = '<div class="form-grid"><div class="field"><label>Platform</label><select class="select" id="platform"><option>GoFood</option><option>GrabFood</option><option>ShopeeFood</option></select></div><div class="field"><label>Nomor pesanan platform</label><input class="input" id="platform-no" maxlength="50" placeholder="Contoh: GF-88231" /></div></div>';
  };
  renderIdentity();
  document.querySelectorAll("[data-order-type]").forEach((button) => button.addEventListener("click", () => { orderType = button.dataset.orderType; document.querySelectorAll("[data-order-type]").forEach((entry) => entry.classList.toggle("active", entry === button)); renderIdentity(); }));
  document.querySelector("#to-payment").addEventListener("click", () => {
    const customerName = document.querySelector("#customer-name")?.value.trim() || "";
    const customerPhone = document.querySelector("#customer-phone")?.value.trim() || "";
    const marketingConsent = Boolean(document.querySelector("#marketing-consent")?.checked);
    const tableNo = document.querySelector("#table-no")?.value.trim() || "";
    const platformNo = document.querySelector("#platform-no")?.value.trim();
    const platform = document.querySelector("#platform")?.value;
    if (customerPhone && !marketingConsent) { toast("Centang persetujuan pelanggan untuk menyimpan nomor HP", "error"); return; }
    try {
      const identity = buildOrderIdentity({ orderType, tableNo, customerName, platform, platformOrderNo: platformNo });
      const normalizedPhone = normalizeCustomerPhone(customerPhone);
      checkoutPayment({ orderType, identity, tableNo, customerName, customerPhone: normalizedPhone, marketingConsent, platform, platformNo, note: document.querySelector("#order-note")?.value.trim() || "" });
    } catch (error) { toast(error.message, "error"); }
  });
}

function checkoutPayment(details) {
  const subtotal = state.cart.reduce((sum, line) => sum + line.price * line.qty, 0);
  const total = Math.max(0, subtotal - state.discount);
  openModal(`<div class="modal"><div class="modal-header"><div><h2>Terima pembayaran</h2><small>Langkah 2 dari 2</small></div><button class="icon-button" data-close-modal>${icon("x")}</button></div><div class="modal-body"><div class="stepper"><span class="active"></span><span class="active"></span></div><div class="payment-total"><span>Total pembayaran</span><strong>${rupiah(total)}</strong></div><div class="field"><label>Metode pembayaran</label><div class="choice-grid"><button class="choice active" data-payment="tunai">${icon("banknote")}<small>Tunai</small></button><button class="choice" data-payment="qris">${icon("qr")}<small>QRIS</small></button><button class="choice" data-payment="transfer">${icon("card")}<small>Transfer</small></button></div></div><div id="payment-fields" class="section-gap"></div></div><div class="modal-footer"><button class="btn btn-secondary" data-close-modal>Batal</button><button class="btn btn-primary" id="finish-payment">Konfirmasi pembayaran</button></div></div>`);
  let method = "tunai";
  const fields = document.querySelector("#payment-fields");
  const renderFields = () => {
    fields.innerHTML = method === "tunai" ? `<div class="field"><label>Uang diterima</label><input class="input" id="paid-amount" inputmode="numeric" value="${total}" /></div><div class="payment-total"><span>Kembalian</span><strong id="change-amount">${rupiah(0)}</strong></div>` : `<div class="verification-box"><strong>Verifikasi ${method.toUpperCase()}</strong><p>Pastikan notifikasi pembayaran dan nominal sudah cocok. Tombol konfirmasi menjadi bukti verifikasi kasir.</p><label class="check-row"><input type="checkbox" id="payment-verified" /> Pembayaran sudah diterima</label></div>`;
    document.querySelector("#paid-amount")?.addEventListener("input", (event) => { document.querySelector("#change-amount").textContent = rupiah(Math.max(0, Number(event.target.value) - total)); });
  };
  renderFields();
  document.querySelectorAll("[data-payment]").forEach((button) => button.addEventListener("click", () => { method = button.dataset.payment; document.querySelectorAll("[data-payment]").forEach((entry) => entry.classList.toggle("active", entry === button)); renderFields(); }));
  document.querySelector("#finish-payment").addEventListener("click", () => {
    const paid = method === "tunai" ? Number(document.querySelector("#paid-amount")?.value || 0) : total;
    if (method === "tunai" && paid < total) { toast("Uang diterima masih kurang", "error"); return; }
    if (method !== "tunai" && !document.querySelector("#payment-verified")?.checked) { toast("Verifikasi pembayaran terlebih dahulu", "error"); return; }
    finishOrder(details, { method, paid, subtotal, total });
  });
}

function finishOrder(details, payment) {
  const sequence = Math.max(1000, ...state.orders.map((order) => Number(String(order.orderNo).match(/(\d+)$/)?.[1] || 0))) + 1;
  const timestamp = Date.now();
  const order = {
    id: `ord-${sequence}`,
    orderNo: `TK-${sequence}`,
    orderType: details.orderType,
    identity: details.identity,
    tableNo: details.tableNo,
    customerName: details.customerName,
    customerPhone: details.customerPhone,
    marketingConsent: details.marketingConsent,
    note: details.note,
    status: "baru",
    paymentStatus: "lunas",
    paymentMethod: payment.method,
    subtotal: payment.subtotal,
    discountTotal: state.discount,
    total: payment.total,
    createdAt: new Date().toISOString(),
    cashier: state.user.name,
    items: buildOrderItems(state.cart, state.menus, sequence),
    payments: [{ id: `pay-${sequence}`, type: "payment", status: "berhasil", amount: payment.total, verifiedBy: state.user.name }],
  };
  const result = createOrder(state, order, `checkout-${sequence}-${timestamp}`);
  if (!result.created) return;
  if (details.customerPhone) {
    try {
      const customerResult = upsertCustomer(state, { phone: details.customerPhone, name: details.customerName, marketingConsent: details.marketingConsent, orderTotal: order.total, orderAt: order.createdAt });
      order.customerId = customerResult.customer?.id || null;
      audit("simpan_pelanggan", details.customerName || details.customerPhone);
    } catch (error) { toast(error.message, "error"); }
  }
  deductOrderStock(order);
  const shift = state.shifts.find((entry) => entry.status === "terbuka" && entry.cashier === state.user.name);
  if (shift && payment.method === "tunai") { shift.cashSales += payment.total; shift.expectedCash += payment.total; }
  audit("buat_pesanan", order.orderNo);
  state.cart = [];
  state.discount = 0;
  closeModal();
  commit();
  showReceipt(order);
}

function deductOrderStock(order) {
  for (const item of order.items) {
    if (!state.menus.find((menu) => menu.id === item.menuId)?.stockDeductionEnabled) continue;
    for (const [ingredientId, perPortion] of recipeUsage[item.menuId] || []) {
      try {
        recordStockMovement(state, { ingredientId, type: "pemakaian", quantity: perPortion * item.qty, reason: order.orderNo, actor: state.user.name, idempotencyKey: `${order.id}-${item.id}-${ingredientId}` });
      } catch (error) {
        audit("stok_gagal_dipotong", `${order.orderNo}: ${error.message}`);
      }
    }
  }
}

function showReceipt(order) {
  openModal(`<div class="modal"><div class="modal-header"><div><h2>Pembayaran berhasil</h2><small class="success-text">${escapeHtml(order.orderNo)} sudah masuk ke dapur</small></div><button class="icon-button" data-close-modal>${icon("x")}</button></div><div class="modal-body receipt-preview"><span class="success-mark">${icon("check")}</span><h2>${rupiah(order.total)}</h2><p>${escapeHtml(order.identity)} · ${title(order.paymentMethod)}</p>${order.note ? `<div class="order-note-banner"><strong>Catatan pesanan</strong><span>${escapeHtml(order.note)}</span></div>` : ""}<div class="profit-stack">${order.items.map((item) => `<div class="profit-row"><span>${item.qty}x ${escapeHtml(item.menuNameSnapshot)}${item.note ? `<small>Catatan item: ${escapeHtml(item.note)}</small>` : ""}</span><strong>${rupiah(item.priceSnapshot * item.qty)}</strong></div>`).join("")}<div class="profit-row total"><span>Total</span><strong>${rupiah(order.total)}</strong></div></div></div><div class="modal-footer"><button class="btn btn-secondary" data-close-modal>Selesai</button><button class="btn btn-primary" id="print-new-receipt">${icon("printer")} Cetak nota</button></div></div>`);
  document.querySelector("#print-new-receipt")?.addEventListener("click", () => printReceipt(order));
}

function showActiveOrders() {
  const active = state.orders.filter((order) => !["selesai", "dibatalkan"].includes(order.status));
  openModal(`<div class="modal"><div class="modal-header"><h2>Pesanan aktif</h2><button class="icon-button" data-close-modal>${icon("x")}</button></div><div class="modal-body order-list">${active.map((order) => `<div class="order-row"><strong>${escapeHtml(order.orderNo)}</strong><span>${escapeHtml(order.identity)}</span><span>${rupiah(order.total)}</span><div>${status(order.status)}${order.status === "siap" ? `<button class="btn btn-success compact-button" data-complete-order="${order.id}">Serahkan</button>` : ""}</div></div>`).join("") || '<p class="inline-empty">Tidak ada pesanan aktif.</p>'}</div></div>`);
  document.querySelectorAll("[data-complete-order]").forEach((button) => button.addEventListener("click", () => {
    const order = state.orders.find((entry) => entry.id === button.dataset.completeOrder);
    if (!order || order.status !== "siap") return;
    order.status = "selesai";
    order.completedAt = new Date().toISOString();
    audit("serahkan_pesanan", order.orderNo);
    closeModal();
    commit();
    toast("Pesanan selesai dan sudah diserahkan", "success");
  }));
}

function bindKitchen() {
  app.querySelector('[data-action="kitchen-history"]')?.addEventListener("click", showKitchenHistory);
  app.querySelectorAll("[data-order-status]").forEach((button) => button.addEventListener("click", () => {
    try {
      const order = transitionKitchenOrder(state, button.dataset.orderStatus, button.dataset.nextStatus);
      audit("ubah_status_dapur", `${order.orderNo}: ${order.status}`);
      commit();
      toast(`${order.orderNo} menjadi ${title(order.status)}`, "success");
    } catch (error) { toast(error.message, "error"); }
  }));
  app.querySelectorAll("[data-print-order]").forEach((button) => button.addEventListener("click", () => {
    const order = state.orders.find((item) => item.id === button.dataset.printOrder);
    if (order) printKitchenTicket(order);
  }));
}

function showKitchenHistory() {
  const { history, readyCount } = partitionKitchenOrders(state.orders);
  const recent = history.slice(0, 30);
  openModal(`<aside class="modal side-panel"><div class="modal-header"><div><h2>Riwayat dapur</h2><small>${readyCount} siap diambil · ${history.length - readyCount} sudah diserahkan</small></div><button class="icon-button" data-close-modal>${icon("x")}</button></div><div class="modal-body kitchen-history-list">${recent.map((order) => `<article class="history-order"><div><strong>${escapeHtml(order.orderNo)}</strong><span>${escapeHtml(order.identity)}</span><small>${new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }).format(new Date(order.completedAt || order.readyAt || order.createdAt))}</small>${status(order.status)}${order.status === "siap" ? '<small>Menunggu penyerahan kasir</small>' : ""}</div><div class="history-order-actions"><button class="btn btn-secondary" data-restore-kitchen="${order.id}|diproses">Kembalikan ke Diproses</button>${order.status === "selesai" ? `<button class="btn btn-success" data-restore-kitchen="${order.id}|siap">Kembalikan ke Siap</button>` : ""}</div></article>`).join("") || '<div class="empty-state small"><div><h3>Belum ada riwayat</h3><p>Pesanan siap dan sudah diserahkan akan muncul di sini.</p></div></div>'}</div></aside>`);
  document.querySelectorAll("[data-restore-kitchen]").forEach((button) => button.addEventListener("click", () => {
    const [orderId, nextStatus] = button.dataset.restoreKitchen.split("|");
    try {
      const order = restoreKitchenOrder(state, orderId, nextStatus);
      audit("pulihkan_pesanan_dapur", `${order.orderNo}: ${nextStatus}`);
      closeModal();
      commit();
      toast(`${order.orderNo} dikembalikan ke ${title(nextStatus)}`, "success");
    } catch (error) { toast(error.message, "error"); }
  }));
}

function bindInventory() {
  app.querySelectorAll("[data-inventory-tab]").forEach((button) => button.addEventListener("click", () => { state.inventoryTab = button.dataset.inventoryTab; commit(); }));
  app.querySelectorAll("[data-toggle-stock]").forEach((button) => button.addEventListener("click", () => {
    const menu = state.menus.find((item) => item.id === button.dataset.toggleStock);
    if (!menu) return;
    menu.stockDeductionEnabled = !menu.stockDeductionEnabled;
    audit("ubah_pengurangan_stok", menu.name);
    commit();
  }));
  app.querySelectorAll("[data-menu-availability]").forEach((button) => button.addEventListener("click", () => {
    const menu = state.menus.find((item) => item.id === button.dataset.menuAvailability);
    if (!menu) return;
    menu.availability = menu.availability === "aktif" ? "habis" : "aktif";
    audit("ubah_status_menu", menu.name);
    commit();
    toast(`${menu.name}: ${title(menu.availability)}`, "success");
  }));
  app.querySelectorAll("[data-edit-menu]").forEach((button) => button.addEventListener("click", () => menuModal(button.dataset.editMenu)));
  app.querySelector('[data-action="stock-movement"]')?.addEventListener("click", stockMovementModal);
  app.querySelector('[data-action="add-product"]')?.addEventListener("click", () => menuModal());
}

function stockMovementModal() {
  openModal(`<div class="modal"><div class="modal-header"><h2>Catat pergerakan stok</h2><button class="icon-button" data-close-modal>${icon("x")}</button></div><div class="modal-body"><div class="form-grid"><div class="field wide"><label>Bahan</label><select class="select" id="stock-ingredient">${state.ingredients.map((item) => `<option value="${item.id}">${escapeHtml(item.name)} · ${numberText(item.stock)} ${item.unit}</option>`).join("")}</select></div><div class="field"><label>Jenis</label><select class="select" id="stock-type"><option value="stok_masuk">Stok masuk</option><option value="pemakaian">Pemakaian</option><option value="waste">Waste</option><option value="retur_supplier">Retur supplier</option><option value="penyesuaian">Penyesuaian (+/-)</option></select></div><div class="field"><label>Jumlah</label><input class="input" id="stock-quantity" type="number" step="0.01" placeholder="0" /></div><div class="field wide"><label>Alasan / catatan</label><textarea class="textarea" id="stock-reason" maxlength="180" required></textarea></div></div></div><div class="modal-footer"><button class="btn btn-secondary" data-close-modal>Batal</button><button class="btn btn-primary" id="save-stock">Simpan</button></div></div>`);
  document.querySelector("#save-stock")?.addEventListener("click", () => {
    const type = document.querySelector("#stock-type").value;
    const rawQuantity = Number(document.querySelector("#stock-quantity").value);
    const reason = document.querySelector("#stock-reason").value.trim();
    if (!reason || !Number.isFinite(rawQuantity) || rawQuantity === 0) { toast("Jumlah dan alasan wajib diisi", "error"); return; }
    try {
      const quantity = type === "penyesuaian" ? Math.abs(rawQuantity) : rawQuantity;
      recordStockMovement(state, { ingredientId: document.querySelector("#stock-ingredient").value, type, quantity, delta: type === "penyesuaian" ? rawQuantity : undefined, reason, actor: state.user.name, idempotencyKey: `manual-${Date.now()}` });
      audit("catat_stok", reason);
      closeModal();
      state.inventoryTab = "movements";
      commit();
      toast("Pergerakan stok tercatat", "success");
    } catch (error) { toast(error.message, "error"); }
  });
}

function menuModal(menuId) {
  const existing = state.menus.find((item) => item.id === menuId);
  openModal(`<div class="modal"><div class="modal-header"><h2>${existing ? "Edit" : "Tambah"} menu</h2><button class="icon-button" data-close-modal>${icon("x")}</button></div><div class="modal-body"><div class="form-grid"><div class="field wide"><label>Nama menu</label><input class="input" id="menu-name" value="${escapeHtml(existing?.name || "")}" maxlength="80" /></div><div class="field"><label>Kategori</label><select class="select" id="menu-category">${categories.map((category) => `<option value="${category.id}" ${existing?.categoryId === category.id ? "selected" : ""}>${category.name}</option>`).join("")}</select></div><div class="field"><label>Harga jual</label><input class="input" id="menu-price" type="number" value="${existing?.price || ""}" /></div><div class="field"><label>HPP</label><input class="input" id="menu-hpp" type="number" value="${existing?.hpp || ""}" /></div><div class="field"><label>Varian (pisahkan koma)</label><input class="input" id="menu-variants" value="${escapeHtml(existing?.variants?.join(", ") || "")}" /></div><div class="field wide"><label>Deskripsi</label><textarea class="textarea" id="menu-description">${escapeHtml(existing?.description || "")}</textarea></div></div></div><div class="modal-footer"><button class="btn btn-secondary" data-close-modal>Batal</button><button class="btn btn-primary" id="save-menu">Simpan</button></div></div>`);
  document.querySelector("#save-menu")?.addEventListener("click", () => {
    const name = document.querySelector("#menu-name").value.trim();
    const price = Math.round(Number(document.querySelector("#menu-price").value));
    const hpp = Math.round(Number(document.querySelector("#menu-hpp").value));
    if (!name || price <= 0 || hpp < 0 || hpp > price) { toast("Periksa nama, harga jual, dan HPP", "error"); return; }
    const values = { name, categoryId: document.querySelector("#menu-category").value, price, hpp, hppComplete: true, variants: document.querySelector("#menu-variants").value.split(",").map((value) => value.trim()).filter(Boolean), description: document.querySelector("#menu-description").value.trim() };
    if (existing) Object.assign(existing, values);
    else state.menus.push({ id: `menu-${Date.now()}`, availability: "aktif", stockDeductionEnabled: false, photo: assets.espresso, ...values });
    audit(existing ? "edit_menu" : "tambah_menu", name);
    closeModal();
    commit();
    toast("Menu berhasil disimpan", "success");
  });
}

function bindHistory() {
  app.querySelector("#history-search")?.addEventListener("input", (event) => { state.historySearch = event.target.value; persist(); render(); document.querySelector("#history-search")?.focus(); });
  app.querySelector("#history-status")?.addEventListener("change", (event) => { state.historyStatus = event.target.value; commit(); });
  app.querySelectorAll("[data-view-order]").forEach((button) => button.addEventListener("click", () => showOrder(state.orders.find((order) => order.id === button.dataset.viewOrder))));
  app.querySelectorAll("[data-reprint-order]").forEach((button) => button.addEventListener("click", () => {
    const order = state.orders.find((entry) => entry.id === button.dataset.reprintOrder);
    if (order) printReceipt(order, true);
  }));
  app.querySelectorAll("[data-refund-order]").forEach((button) => button.addEventListener("click", () => refundModal(state.orders.find((order) => order.id === button.dataset.refundOrder))));
  app.querySelectorAll("[data-refund-status]").forEach((button) => button.addEventListener("click", () => {
    const [orderId, refundId, nextStatus] = button.dataset.refundStatus.split("|");
    try {
      transitionRefund(state, orderId, refundId, nextStatus, { actor: state.user.name });
      audit("ubah_status_refund", `${refundId}: ${nextStatus}`);
      commit();
      toast(`Refund menjadi ${title(nextStatus)}`, "success");
    } catch (error) { toast(error.message, "error"); }
  }));
}

function showOrder(order) {
  if (!order) return;
  openModal(`<div class="modal"><div class="modal-header"><div><h2>${escapeHtml(order.orderNo)}</h2><small>${escapeHtml(order.identity)} · ${title(order.orderType)}</small></div><button class="icon-button" data-close-modal>${icon("x")}</button></div><div class="modal-body"><div class="detail-heading">${status(order.status)}<strong>${rupiah(order.total)}</strong></div>${order.note ? `<div class="order-note-banner"><strong>Catatan pesanan</strong><span>${escapeHtml(order.note)}</span></div>` : ""}<div class="profit-stack">${order.items.map((item) => `<div class="profit-row"><span>${item.qty}x ${escapeHtml(item.menuNameSnapshot)}${item.note ? `<small>Catatan item: ${escapeHtml(item.note)}</small>` : ""}</span><strong>${rupiah(item.priceSnapshot*item.qty)}</strong></div>`).join("")}<div class="profit-row"><span>Diskon</span><strong>- ${rupiah(order.discountTotal)}</strong></div><div class="profit-row total"><span>Total</span><strong>${rupiah(order.total)}</strong></div></div></div><div class="modal-footer"><button class="btn btn-secondary" data-close-modal>Tutup</button><button class="btn btn-primary" id="print-order">${icon("printer")} Cetak ulang nota</button></div></div>`);
  document.querySelector("#print-order")?.addEventListener("click", () => printReceipt(order, true));
}

function refundModal(order) {
  if (!order) return;
  const received = order.payments.filter((payment) => payment.type === "payment" && payment.status === "berhasil").reduce((sum, payment) => sum + payment.amount, 0);
  const reserved = order.payments.filter((payment) => payment.type === "refund" && payment.status !== "gagal").reduce((sum, payment) => sum + payment.amount, 0);
  const remaining = Math.max(0, received - reserved);
  openModal(`<div class="modal"><div class="modal-header"><div><h2>Refund ${escapeHtml(order.orderNo)}</h2><small>Sisa yang dapat diajukan ${rupiah(remaining)}</small></div><button class="icon-button" data-close-modal>${icon("x")}</button></div><div class="modal-body"><div class="field"><label>Nominal refund</label><input class="input" id="refund-amount" type="number" max="${remaining}" value="${remaining}" /></div><div class="field section-gap"><label>Alasan</label><textarea class="textarea" id="refund-reason" maxlength="180" placeholder="Alasan wajib"></textarea></div><p class="form-help">Refund tidak mengembalikan stok. Laporan berkurang setelah status Berhasil.</p></div><div class="modal-footer"><button class="btn btn-secondary" data-close-modal>Batal</button><button class="btn btn-danger" id="submit-refund">Ajukan refund</button></div></div>`);
  document.querySelector("#submit-refund")?.addEventListener("click", () => {
    try {
      requestRefund(state, order.id, { amount: Number(document.querySelector("#refund-amount").value), reason: document.querySelector("#refund-reason").value.trim(), requestedBy: state.user.name, idempotencyKey: `refund-${order.id}-${Date.now()}` });
      audit("ajukan_refund", order.orderNo);
      closeModal();
      commit();
      toast("Refund menunggu persetujuan", "success");
    } catch (error) { toast(error.message, "error"); }
  });
}

function bindReports() {
  app.querySelector("#menu-sort")?.addEventListener("change", (event) => { state.menuSort = event.target.value; commit(); });
  app.querySelector('[data-action="close-shift"]')?.addEventListener("click", closeShiftModal);
}

function bindCustomers() {
  app.querySelector('[data-action="export-customers"]')?.addEventListener("click", exportCustomersCsv);
}

function closeShiftModal() {
  const shift = state.shifts.find((entry) => entry.status === "terbuka");
  if (!shift) return;
  openModal(`<div class="modal"><div class="modal-header"><h2>Tutup shift ${escapeHtml(shift.cashier)}</h2><button class="icon-button" data-close-modal>${icon("x")}</button></div><div class="modal-body"><div class="payment-total"><span>Kas seharusnya</span><strong>${rupiah(shift.expectedCash)}</strong></div><div class="field"><label>Uang fisik yang dihitung</label><input class="input" id="physical-cash" type="number" value="${shift.expectedCash}" /></div><div class="payment-total"><span>Selisih</span><strong id="cash-difference">${rupiah(0)}</strong></div></div><div class="modal-footer"><button class="btn btn-secondary" data-close-modal>Batal</button><button class="btn btn-primary" id="confirm-close-shift">Konfirmasi tutup shift</button></div></div>`);
  document.querySelector("#physical-cash").addEventListener("input", (event) => { document.querySelector("#cash-difference").textContent = rupiah(Number(event.target.value) - shift.expectedCash); });
  document.querySelector("#confirm-close-shift").addEventListener("click", () => {
    try {
      closeShift(state, shift.id, { closingCash: Number(document.querySelector("#physical-cash").value), closeKey: `close-${shift.id}-${Date.now()}` });
      audit("tutup_shift", shift.id);
      closeModal();
      commit();
      toast("Shift ditutup dan tersimpan", "success");
    } catch (error) { toast(error.message, "error"); }
  });
}

function bindAccounts() {
  app.querySelectorAll("[data-toggle-user]").forEach((button) => button.addEventListener("click", () => {
    const user = state.users.find((item) => item.id === button.dataset.toggleUser);
    if (!user) return;
    if (user.id === state.user.id) { toast("Akun yang sedang digunakan tidak dapat dinonaktifkan", "error"); return; }
    if (user.role === "owner" && user.active && activeOwnerCount() <= 1) { toast("Minimal satu Owner harus tetap aktif", "error"); return; }
    user.active = !user.active;
    audit(user.active ? "aktifkan_akun" : "nonaktifkan_akun", `${user.name} · ${user.email}`);
    commit();
    toast(`Akun ${user.name} ${user.active ? "diaktifkan" : "dinonaktifkan"}`, "success");
  }));
  app.querySelectorAll("[data-edit-user]").forEach((button) => button.addEventListener("click", () => editUserModal(button.dataset.editUser)));
  app.querySelectorAll("[data-delete-user]").forEach((button) => button.addEventListener("click", () => deleteUser(button.dataset.deleteUser)));
  app.querySelector('[data-action="add-user"]')?.addEventListener("click", addUserModal);
}

function activeOwnerCount() {
  return state.users.filter((user) => user.role === "owner" && user.active).length;
}

function ownerCount() {
  return state.users.filter((user) => user.role === "owner").length;
}

function addUserModal() {
  openModal(`<div class="modal"><div class="modal-header"><h2>Tambah akun</h2><button class="icon-button" data-close-modal>${icon("x")}</button></div><div class="modal-body"><div class="form-grid"><div class="field wide"><label>Nama lengkap</label><input class="input" id="new-user-name" maxlength="80" /></div><div class="field wide"><label>Email</label><input class="input" id="new-user-email" type="email" maxlength="120" /></div><div class="field wide"><label>Peran</label><select class="select" id="new-user-role"><option value="staff_kasir">Kasir</option><option value="staff_dapur">Dapur</option><option value="owner">Owner</option></select></div></div><p class="form-help">Maksimal empat akun Owner. Versi demo tidak membuat password; akun produksi dibuat melalui Supabase Auth.</p></div><div class="modal-footer"><button class="btn btn-secondary" data-close-modal>Batal</button><button class="btn btn-primary" id="save-user">Tambah akun</button></div></div>`);
  document.querySelector("#save-user").addEventListener("click", () => {
    const name = document.querySelector("#new-user-name").value.trim();
    const email = document.querySelector("#new-user-email").value.trim().toLowerCase();
    const role = document.querySelector("#new-user-role").value;
    if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { toast("Nama dan email valid wajib diisi", "error"); return; }
    if (state.users.some((user) => user.email.toLowerCase() === email)) { toast("Email sudah digunakan", "error"); return; }
    if (role === "owner" && ownerCount() >= 4) { toast("Maksimal empat akun Owner", "error"); return; }
    state.users.push({ id: `usr-${Date.now()}`, name, email, role, active: true });
    audit("tambah_akun", `${name} · ${email} · ${roleLabel(role)}`);
    closeModal();
    commit();
    toast("Akun karyawan ditambahkan", "success");
  });
}

function editUserModal(userId) {
  const user = state.users.find((entry) => entry.id === userId);
  if (!user) return;
  openModal(`<div class="modal"><div class="modal-header"><div><h2>Ubah akun</h2><small>${escapeHtml(user.email)}</small></div><button class="icon-button" data-close-modal>${icon("x")}</button></div><div class="modal-body"><div class="form-grid"><div class="field wide"><label>Nama lengkap</label><input class="input" id="edit-user-name" maxlength="80" value="${escapeHtml(user.name)}" /></div><div class="field wide"><label>Peran</label><select class="select" id="edit-user-role"><option value="staff_kasir" ${user.role === "staff_kasir" ? "selected" : ""}>Kasir</option><option value="staff_dapur" ${user.role === "staff_dapur" ? "selected" : ""}>Dapur</option><option value="owner" ${user.role === "owner" ? "selected" : ""}>Owner</option></select></div></div><p class="form-help">Semua perubahan nama dan peran dicatat dalam riwayat aktivitas.</p></div><div class="modal-footer"><button class="btn btn-secondary" data-close-modal>Batal</button><button class="btn btn-primary" id="save-user-edit">Simpan perubahan</button></div></div>`);
  document.querySelector("#save-user-edit")?.addEventListener("click", () => {
    const nextName = document.querySelector("#edit-user-name").value.trim();
    const nextRole = document.querySelector("#edit-user-role").value;
    if (!nextName) { toast("Nama wajib diisi", "error"); return; }
    if (user.id === state.user.id && nextRole !== "owner") { toast("Peran akun yang sedang digunakan tidak dapat diturunkan", "error"); return; }
    if (user.role === "owner" && nextRole !== "owner" && user.active && activeOwnerCount() <= 1) { toast("Minimal satu Owner harus tetap aktif", "error"); return; }
    if (user.role !== "owner" && nextRole === "owner" && ownerCount() >= 4) { toast("Maksimal empat akun Owner", "error"); return; }
    const before = `${user.name} · ${roleLabel(user.role)}`;
    user.name = nextName;
    user.role = nextRole;
    if (user.id === state.user.id) state.user.name = nextName;
    audit("ubah_akun", `${user.email}: ${before} menjadi ${user.name} · ${roleLabel(user.role)}`);
    closeModal();
    commit();
    toast("Perubahan akun disimpan", "success");
  });
}

function deleteUser(userId) {
  const user = state.users.find((entry) => entry.id === userId);
  if (!user) return;
  if (user.id === state.user.id) { toast("Akun yang sedang digunakan tidak dapat dihapus", "error"); return; }
  if (user.role === "owner" && user.active && activeOwnerCount() <= 1) { toast("Minimal satu Owner harus tetap aktif", "error"); return; }
  if (!window.confirm(`Hapus akun ${user.name}? Riwayat aktivitas tetap disimpan.`)) return;
  state.users = state.users.filter((entry) => entry.id !== user.id);
  audit("hapus_akun", `${user.name} · ${user.email} · ${roleLabel(user.role)}`);
  commit();
  toast(`Akun ${user.name} dihapus`, "success");
}

function bindSettings() {
  app.querySelectorAll("[data-toggle-setting]").forEach((button) => button.addEventListener("click", () => { const key = button.dataset.toggleSetting; state.settings[key] = !state.settings[key]; commit(); toast("Pengaturan diperbarui", "success"); }));
  app.querySelector("#settings-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    state.settings.cafeName = String(form.get("cafeName") || "").trim();
    state.settings.address = String(form.get("address") || "").trim();
    state.settings.phone = String(form.get("phone") || "").trim();
    audit("ubah_pengaturan", "Profil kafe");
    commit();
    toast("Pengaturan disimpan", "success");
  });
  app.querySelector('[data-action="export-backup"]')?.addEventListener("click", () => downloadBlob(`temu-kopi-backup-${dateStamp()}.json`, JSON.stringify(state, null, 2), "application/json"));
  app.querySelector('[data-action="reset-demo"]')?.addEventListener("click", () => {
    if (!window.confirm("Reset seluruh perubahan demo pada perangkat ini?")) return;
    state = resetDemoState(seedState());
    render();
    toast("Data demo dikembalikan ke kondisi awal", "success");
  });
}

function exportTransactionsCsv() {
  const header = ["Nomor Pesanan", "Tanggal WIB", "Jenis", "Pelanggan/Meja", "Kasir", "Metode", "Subtotal", "Diskon", "Refund Berhasil", "Penjualan Bersih", "Status"];
  const rows = state.orders.map((order) => {
    const refund = order.payments.filter((payment) => payment.type === "refund" && payment.status === "berhasil").reduce((sum, payment) => sum + payment.amount, 0);
    return [order.orderNo, new Intl.DateTimeFormat("id-ID", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(new Date(order.createdAt)), title(order.orderType), order.identity, order.cashier, title(order.paymentMethod), order.subtotal, order.discountTotal, refund, order.total - refund, title(order.status)];
  });
  const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
  downloadBlob(`laporan-transaksi-temu-kopi-${dateStamp()}.csv`, `\uFEFF${csv}`, "text/csv;charset=utf-8");
  toast("Spreadsheet transaksi berhasil dibuat", "success");
}

function exportCustomersCsv() {
  const header = ["Nama", "Nomor WhatsApp", "Persetujuan Marketing", "Jumlah Transaksi", "Total Belanja", "Kunjungan Terakhir"];
  const rows = (state.customers || []).map((customer) => [customer.name || "", customer.phone, customer.marketingConsent ? "Ya" : "Tidak", customer.orderCount || 0, customer.totalSpent || 0, customer.lastOrderAt ? new Intl.DateTimeFormat("id-ID", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(new Date(customer.lastOrderAt)) : ""]);
  const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
  downloadBlob(`database-pelanggan-temu-kopi-${dateStamp()}.csv`, `\uFEFF${csv}`, "text/csv;charset=utf-8");
  toast("Database pelanggan berhasil diekspor", "success");
}

function csvCell(value) { return `"${String(value ?? "").replaceAll('"', '""')}"`; }
function dateStamp() { return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date()); }
function numberText(value) { return new Intl.NumberFormat("id-ID").format(value); }

function downloadBlob(name, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function downloadFile(url) {
  const link = document.createElement("a");
  link.href = url;
  link.download = "Spreadsheet_Operasional_Temu_Kopi_Lengkap.xlsx";
  link.click();
}

function printReceipt(order, reprint = false) {
  const items = order.items.map((item) => `<div class="line"><span>${item.qty}x ${escapeHtml(item.menuNameSnapshot)}${item.variant ? `<small>${escapeHtml(item.variant)}</small>` : ""}${item.note ? `<small>Catatan: ${escapeHtml(item.note)}</small>` : ""}</span><b>${rupiah(item.priceSnapshot * item.qty)}</b></div>`).join("");
  openPrintWindow(`${reprint ? "CETAK ULANG · " : ""}${escapeHtml(order.orderNo)}`, `<header><img src="${assets.logo}"/><h1>${escapeHtml(state.settings.cafeName)}</h1><p>${escapeHtml(state.settings.address)}</p></header><hr/><div class="meta"><span>${escapeHtml(order.orderNo)}</span><span>${escapeHtml(order.identity)}</span></div><div class="meta"><span>${title(order.paymentMethod)}</span><span>${escapeHtml(order.cashier)}</span></div><hr/>${items}${order.note ? `<div class="order-note"><b>Catatan pesanan</b><span>${escapeHtml(order.note)}</span></div>` : ""}<hr/><div class="line"><span>Subtotal</span><b>${rupiah(order.subtotal)}</b></div><div class="line"><span>Diskon</span><b>- ${rupiah(order.discountTotal)}</b></div><div class="line total"><span>TOTAL</span><b>${rupiah(order.total)}</b></div><footer>Terima kasih. Sampai bertemu kembali.</footer>`, "receipt");
}

function printKitchenTicket(order) {
  const items = order.items.map((item) => `<div class="kitchen-item"><b>${item.qty}</b><span>${escapeHtml(item.menuNameSnapshot)}${item.variant ? `<small>${escapeHtml(item.variant)}</small>` : ""}${item.note ? `<em>${escapeHtml(item.note)}</em>` : ""}</span></div>`).join("");
  openPrintWindow(`Tiket Dapur ${escapeHtml(order.orderNo)}`, `<h1>TIKET DAPUR</h1><div class="ticket-no">${escapeHtml(order.orderNo)}</div><div class="meta"><span>${escapeHtml(order.identity)}</span><span>${title(order.orderType)}</span></div>${order.note ? `<div class="order-note"><b>CATATAN PESANAN</b><span>${escapeHtml(order.note)}</span></div>` : ""}<hr/>${items}<footer>Panggil nama atau nomor pesanan saat siap</footer>`, "kitchen");
}

function openPrintWindow(titleText, body, kind) {
  const popup = window.open("", "_blank", "width=420,height=720");
  if (!popup) { toast("Izinkan pop-up untuk mencetak", "error"); return; }
  popup.document.write(`<!doctype html><html lang="id"><head><meta charset="utf-8"><title>${titleText}</title><style>@page{size:80mm auto;margin:5mm}*{box-sizing:border-box}body{width:70mm;margin:0 auto;color:#2E2520;font:12px Arial,sans-serif}header{text-align:center}header img{width:42px;height:42px;object-fit:contain}h1{font-size:${kind === "kitchen" ? "22px" : "15px"};margin:6px 0}.ticket-no{text-align:center;font-size:18px;font-weight:700;margin:10px 0}.meta,.line{display:flex;justify-content:space-between;gap:10px;margin:8px 0}.line span{max-width:68%}.line small,.kitchen-item small,.kitchen-item em{display:block;color:#6D625B;margin-top:3px}.order-note{display:grid;gap:4px;margin:12px 0;padding:9px;border:2px solid #B65D3C}.order-note span{overflow-wrap:anywhere}.total{font-size:15px}.kitchen-item{display:grid;grid-template-columns:32px 1fr;gap:8px;padding:12px 0;border-bottom:1px dashed #E7DFD2}.kitchen-item>b{font-size:22px}.kitchen-item span{font-weight:700}.kitchen-item em{color:#B4433C}hr{border:0;border-top:1px dashed #6D625B;margin:12px 0}footer{text-align:center;margin-top:24px;color:#6D625B;font-size:10px}@media print{body{width:auto}}</style></head><body>${body}<script>window.onload=()=>{window.print();window.onafterprint=()=>window.close()}<\/script></body></html>`);
  popup.document.close();
}

window.addEventListener("online", render);
window.addEventListener("offline", render);
if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("./service-worker.js").catch(() => {}));
render();
