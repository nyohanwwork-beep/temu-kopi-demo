import { categories, menus } from "./data/mock-data.js";
import { assets } from "./data/assets.js";
import { closeModal, icon, initials, openModal, rupiah, status, toast } from "./ui.js";
import { initialOrders, initialUsers, navItems, pageMeta, renderPage, roleLabel, title } from "./views/renderers.js";

const app = document.querySelector("#app");
const state = {
  user: null,
  page: "kasir",
  category: "all",
  menuSearch: "",
  historySearch: "",
  cart: [],
  discount: 0,
  orders: initialOrders(),
  users: initialUsers()
};

const demoUsers = {
  owner: { id: "usr-owner-01", name: "Natanael", role: "owner" },
  staff_kasir: { id: "usr-cashier-01", name: "Rina", role: "staff_kasir" },
  staff_dapur: { id: "usr-kitchen-01", name: "Budi", role: "staff_dapur" }
};

function render() {
  if (!state.user) {
    app.innerHTML = loginTemplate();
    bindLogin();
    return;
  }

  const allowed = navItems.filter((item) => item.roles.includes(state.user.role));
  if (!allowed.some((item) => item.id === state.page)) state.page = allowed[0].id;
  const [heading, subheading] = pageMeta[state.page];
  app.innerHTML = `
    <div class="app-shell">
      <aside class="sidebar" aria-label="Navigasi utama">
        <div class="sidebar-logo"><img src="${assets.logo}" alt="Logo Temu Kopi" /><div><strong>Temu Kopi</strong><small>Operasional Kafe</small></div></div>
        <div class="nav-label">Ruang kerja</div>
        <nav class="nav-list">${allowed.map((item) => `<button class="nav-item ${state.page === item.id ? "active" : ""}" data-route="${item.id}">${icon(item.icon)}<span>${item.label}</span></button>`).join("")}</nav>
        <div class="sidebar-footer"><div class="profile-mini"><span class="avatar">${initials(state.user.name)}</span><div><strong>${state.user.name}</strong><small>${roleLabel(state.user.role)}</small></div><button class="icon-button dark" data-action="logout" aria-label="Keluar">${icon("logout")}</button></div></div>
      </aside>
      <header class="app-header">
        <div style="display:flex;align-items:center;gap:12px"><button class="icon-button mobile-menu" data-action="toggle-nav" aria-label="Buka navigasi">${icon("menu")}</button><div class="header-title"><h1>${heading}</h1><p>${subheading}</p></div></div>
        <div class="header-actions"><span class="connection"><span>Online</span></span><button class="icon-button" aria-label="Notifikasi">${icon("bell")}</button><button class="icon-button" data-route="settings" aria-label="Pengaturan">${icon("settings")}</button></div>
      </header>
      <main class="app-main"><div class="content">${renderPage(state)}</div></main>
    </div>`;
  bindCommon();
  bindPage();
}

function loginTemplate() {
  return `<main class="login-page">
    <section class="login-brand"><div><img class="brand-mark" src="${assets.logo}" alt="Temu Kopi"/><h1>Kerja lebih tenang, pelayanan lebih hangat.</h1><p>Satu ruang kerja untuk kasir, dapur, stok, dan laporan Temu Kopi.</p></div><span class="login-tagline">Ngopi · Makan · Temu Cerita</span></section>
    <section class="login-panel"><div><span style="color:var(--terracotta);font-size:11px;font-weight:700">LINGKUNGAN PENGUJIAN</span><h2>Pilih akses demo</h2><p>Gunakan salah satu peran untuk meninjau alur dan pembatasan akses sebelum akun asli dihubungkan.</p><div class="role-grid">
      ${roleOption("owner", "Owner", "Dashboard, laporan lengkap, dan pengaturan", "dashboard")}
      ${roleOption("staff_kasir", "Kasir", "Pesanan, pembayaran, riwayat, dan shift", "cart")}
      ${roleOption("staff_dapur", "Dapur", "Antrean dan status pengerjaan pesanan", "chef")}
    </div></div></section>
  </main>`;
}

function roleOption(role, label, detail, iconName) {
  return `<button class="role-option" data-login-role="${role}"><span class="role-icon">${icon(iconName)}</span><span><strong>${label}</strong><small>${detail}</small></span>${icon("chevron")}</button>`;
}

function bindLogin() {
  app.querySelectorAll("[data-login-role]").forEach((button) => button.addEventListener("click", () => {
    const role = button.dataset.loginRole;
    state.user = demoUsers[role];
    state.page = role === "owner" ? "dashboard" : role === "staff_dapur" ? "dapur" : "kasir";
    render();
    toast(`Masuk sebagai ${roleLabel(role)}`, "success");
  }));
}

function bindCommon() {
  app.querySelectorAll("[data-route]").forEach((button) => button.addEventListener("click", () => {
    state.page = button.dataset.route;
    document.body.classList.remove("nav-open");
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }));
  app.querySelector('[data-action="toggle-nav"]')?.addEventListener("click", () => document.body.classList.toggle("nav-open"));
  app.querySelector('[data-action="logout"]')?.addEventListener("click", () => {
    state.user = null;
    state.cart = [];
    document.body.classList.remove("nav-open");
    render();
  });
}

function bindPage() {
  bindCashier();
  bindKitchen();
  bindInventory();
  bindHistory();
  bindReports();
  bindAccounts();
  bindSettings();
  app.querySelectorAll('[data-action="print-report"]').forEach((button) => button.addEventListener("click", () => window.print()));
}

function bindCashier() {
  app.querySelectorAll("[data-category]").forEach((button) => button.addEventListener("click", () => { state.category = button.dataset.category; render(); }));
  app.querySelector("#menu-search")?.addEventListener("input", (event) => { state.menuSearch = event.target.value; render(); document.querySelector("#menu-search")?.focus(); });
  app.querySelectorAll("[data-add-menu]").forEach((button) => button.addEventListener("click", () => {
    const menu = menus.find((item) => item.id === button.dataset.addMenu);
    const line = state.cart.find((item) => item.id === menu.id);
    if (line) line.qty += 1;
    else state.cart.push({ id: menu.id, name: menu.name, price: menu.price, qty: 1, variant: menu.variants[0] || "" });
    render();
    toast(`${menu.name} ditambahkan`, "success");
  }));
  app.querySelectorAll("[data-cart-inc]").forEach((button) => button.addEventListener("click", () => updateCart(button.dataset.cartInc, 1)));
  app.querySelectorAll("[data-cart-dec]").forEach((button) => button.addEventListener("click", () => updateCart(button.dataset.cartDec, -1)));
  app.querySelectorAll("[data-cart-remove]").forEach((button) => button.addEventListener("click", () => { state.cart = state.cart.filter((item) => item.id !== button.dataset.cartRemove); render(); }));
  app.querySelector('[data-action="clear-cart"]')?.addEventListener("click", () => { state.cart = []; state.discount = 0; render(); });
  app.querySelector('[data-action="checkout"]')?.addEventListener("click", checkoutStepOne);
  app.querySelector('[data-action="open-active-orders"]')?.addEventListener("click", showActiveOrders);
}

function updateCart(id, delta) {
  const line = state.cart.find((item) => item.id === id);
  if (!line) return;
  line.qty += delta;
  if (line.qty <= 0) state.cart = state.cart.filter((item) => item.id !== id);
  render();
}

function checkoutStepOne() {
  openModal(`<div class="modal"><div class="modal-header"><div><h2>Detail pesanan</h2><small style="color:var(--muted)">Langkah 1 dari 2</small></div><button class="icon-button" data-close-modal>${icon("x")}</button></div><div class="modal-body"><div class="stepper"><span class="active"></span><span></span></div><div class="field"><label>Jenis pesanan</label><div class="choice-grid" id="order-types"><button class="choice active" data-order-type="dine_in">${icon("utensils")}<small>Dine-in</small></button><button class="choice" data-order-type="takeaway">${icon("package")}<small>Takeaway</small></button><button class="choice" data-order-type="delivery">${icon("receipt")}<small>Delivery</small></button></div></div><div id="identity-fields" style="margin-top:16px"><div class="field"><label>Nomor meja</label><input class="input" id="identity" inputmode="numeric" placeholder="Contoh: 07" /></div></div><div class="field" style="margin-top:16px"><label>Catatan pesanan</label><textarea class="textarea" id="order-note" placeholder="Opsional"></textarea></div></div><div class="modal-footer"><button class="btn btn-secondary" data-close-modal>Batal</button><button class="btn btn-primary" id="to-payment">Lanjut pembayaran ${icon("chevron")}</button></div></div>`);
  let orderType = "dine_in";
  const renderIdentity = () => {
    const root = document.querySelector("#identity-fields");
    if (orderType === "dine_in") root.innerHTML = '<div class="field"><label>Nomor meja</label><input class="input" id="identity" inputmode="numeric" placeholder="Contoh: 07" /></div>';
    if (orderType === "takeaway") root.innerHTML = '<div class="field"><label>Nama pelanggan</label><input class="input" id="identity" placeholder="Nama pelanggan" /></div>';
    if (orderType === "delivery") root.innerHTML = '<div class="form-grid"><div class="field"><label>Nama pelanggan</label><input class="input" id="identity" placeholder="Nama pelanggan" /></div><div class="field"><label>Platform</label><select class="select" id="platform"><option>GoFood</option><option>GrabFood</option><option>ShopeeFood</option></select></div><div class="field wide"><label>Nomor pesanan platform</label><input class="input" id="platform-no" placeholder="Contoh: GF-88231" /></div></div>';
  };
  document.querySelectorAll("[data-order-type]").forEach((button) => button.addEventListener("click", () => {
    orderType = button.dataset.orderType;
    document.querySelectorAll("[data-order-type]").forEach((el) => el.classList.toggle("active", el === button));
    renderIdentity();
  }));
  document.querySelector("#to-payment").addEventListener("click", () => {
    const identity = document.querySelector("#identity")?.value.trim();
    const platformNo = document.querySelector("#platform-no")?.value.trim();
    if (!identity || (orderType === "delivery" && !platformNo)) { toast("Lengkapi identitas pesanan", "error"); return; }
    const platform = document.querySelector("#platform")?.value;
    checkoutPayment({ orderType, identity: orderType === "dine_in" ? `Meja ${identity.padStart(2,"0")}` : orderType === "delivery" ? `${platform} #${platformNo}` : identity, note: document.querySelector("#order-note")?.value || "" });
  });
}

function checkoutPayment(details) {
  const subtotal = state.cart.reduce((sum, line) => sum + line.price * line.qty, 0);
  const total = Math.max(0, subtotal - state.discount);
  openModal(`<div class="modal"><div class="modal-header"><div><h2>Terima pembayaran</h2><small style="color:var(--muted)">Langkah 2 dari 2</small></div><button class="icon-button" data-close-modal>${icon("x")}</button></div><div class="modal-body"><div class="stepper"><span class="active"></span><span class="active"></span></div><div class="payment-total"><span>Total pembayaran</span><strong>${rupiah(total)}</strong></div><div class="field"><label>Metode pembayaran</label><div class="choice-grid"><button class="choice active" data-payment="tunai">${icon("banknote")}<small>Tunai</small></button><button class="choice" data-payment="qris">${icon("qr")}<small>QRIS</small></button><button class="choice" data-payment="transfer">${icon("card")}<small>Transfer</small></button></div></div><div id="payment-fields" style="margin-top:16px"><div class="field"><label>Uang diterima</label><input class="input" id="paid-amount" inputmode="numeric" value="${total}" /></div><div class="payment-total"><span>Kembalian</span><strong id="change-amount">${rupiah(0)}</strong></div></div></div><div class="modal-footer"><button class="btn btn-secondary" data-close-modal>Batal</button><button class="btn btn-primary" id="finish-payment">Konfirmasi pembayaran</button></div></div>`);
  let method = "tunai";
  const fields = document.querySelector("#payment-fields");
  const renderFields = () => {
    fields.innerHTML = method === "tunai" ? `<div class="field"><label>Uang diterima</label><input class="input" id="paid-amount" inputmode="numeric" value="${total}" /></div><div class="payment-total"><span>Kembalian</span><strong id="change-amount">${rupiah(0)}</strong></div>` : `<div style="padding:16px;border:1px solid var(--linen);border-radius:var(--radius);background:var(--cream)"><strong>Menunggu verifikasi ${method.toUpperCase()}</strong><p style="font-size:10px;color:var(--muted);line-height:1.6;margin-bottom:0">Pastikan nominal pembayaran cocok sebelum menekan verifikasi.</p></div>`;
    document.querySelector("#paid-amount")?.addEventListener("input", (event) => { document.querySelector("#change-amount").textContent = rupiah(Math.max(0, Number(event.target.value) - total)); });
  };
  document.querySelectorAll("[data-payment]").forEach((button) => button.addEventListener("click", () => { method = button.dataset.payment; document.querySelectorAll("[data-payment]").forEach((el) => el.classList.toggle("active", el === button)); renderFields(); }));
  document.querySelector("#paid-amount")?.addEventListener("input", (event) => { document.querySelector("#change-amount").textContent = rupiah(Math.max(0, Number(event.target.value) - total)); });
  document.querySelector("#finish-payment").addEventListener("click", () => {
    const paid = method === "tunai" ? Number(document.querySelector("#paid-amount")?.value || 0) : total;
    if (method === "tunai" && paid < total) { toast("Uang diterima masih kurang", "error"); return; }
    const sequence = Math.max(...state.orders.map((order) => Number(order.orderNo.split("-")[1]))) + 1;
    const order = {
      id: `ord-${sequence}`,
      orderNo: `TK-${sequence}`,
      orderType: details.orderType,
      identity: details.identity,
      status: "baru",
      paymentStatus: "lunas",
      paymentMethod: method,
      subtotal,
      discountTotal: state.discount,
      total,
      createdAt: new Date().toISOString(),
      cashier: state.user.name,
      items: state.cart.map((line, index) => ({ id: `item-${sequence}-${index}`, menuId: line.id, menuNameSnapshot: line.name, priceSnapshot: line.price, hppSnapshot: menus.find((m)=>m.id===line.id)?.hpp || 0, hppCompleteSnapshot: menus.find((m)=>m.id===line.id)?.hppComplete, qty: line.qty, note: line.note || "" })),
      payments: [{ id: `pay-${sequence}`, type: "payment", status: "berhasil", amount: total }]
    };
    state.orders.unshift(order);
    state.cart = [];
    state.discount = 0;
    closeModal();
    render();
    showReceipt(order);
  });
}

function showReceipt(order) {
  openModal(`<div class="modal"><div class="modal-header"><div><h2>Pembayaran berhasil</h2><small style="color:var(--sage)">${order.orderNo} sudah masuk ke dapur</small></div><button class="icon-button" data-close-modal>${icon("x")}</button></div><div class="modal-body" style="text-align:center"><span style="width:68px;height:68px;border-radius:50%;display:grid;place-items:center;background:#eaf2eb;color:var(--sage);margin:0 auto 16px">${icon("check")}</span><h2 style="margin:0 0 8px">${rupiah(order.total)}</h2><p style="color:var(--muted);font-size:11px">${order.identity} · ${title(order.paymentMethod)}</p><div class="profit-stack" style="text-align:left;margin-top:20px">${order.items.map((item) => `<div class="profit-row"><span>${item.qty}× ${item.menuNameSnapshot}</span><strong>${rupiah(item.priceSnapshot*item.qty)}</strong></div>`).join("")}<div class="profit-row total"><span>Total</span><strong>${rupiah(order.total)}</strong></div></div></div><div class="modal-footer"><button class="btn btn-secondary" data-close-modal>Selesai</button><button class="btn btn-primary" id="print-new-receipt">${icon("printer")} Cetak nota</button></div></div>`);
  document.querySelector("#print-new-receipt")?.addEventListener("click", () => window.print());
}

function showActiveOrders() {
  const active = state.orders.filter((order) => !["selesai","dibatalkan"].includes(order.status));
  openModal(`<div class="modal"><div class="modal-header"><h2>Pesanan aktif</h2><button class="icon-button" data-close-modal>${icon("x")}</button></div><div class="modal-body order-list">${active.map((order) => `<div class="order-row"><strong>${order.orderNo}</strong><span>${order.identity}</span><span>${rupiah(order.total)}</span>${status(order.status)}</div>`).join("")}</div></div>`);
}

function bindKitchen() {
  app.querySelectorAll("[data-order-status]").forEach((button) => button.addEventListener("click", () => {
    const order = state.orders.find((item) => item.id === button.dataset.orderStatus);
    order.status = button.dataset.nextStatus;
    render();
    toast(`${order.orderNo} menjadi ${title(order.status)}`, "success");
  }));
  app.querySelectorAll("[data-print-order]").forEach((button) => button.addEventListener("click", () => {
    const order = state.orders.find((item) => item.id === button.dataset.printOrder);
    showOrder(order, true);
  }));
}

function bindInventory() {
  app.querySelectorAll("[data-toggle-stock], [data-toggle-setting]").forEach((button) => button.addEventListener("click", () => { button.classList.toggle("on"); toast("Pengaturan diperbarui", "success"); }));
  app.querySelectorAll("[data-menu-availability]").forEach((button) => button.addEventListener("click", () => {
    const menu = menus.find((item) => item.id === button.dataset.menuAvailability);
    menu.availability = menu.availability === "aktif" ? "habis" : "aktif";
    render();
    toast(`${menu.name}: ${title(menu.availability)}`, "success");
  }));
  app.querySelector('[data-action="stock-movement"]')?.addEventListener("click", stockMovementModal);
  app.querySelector('[data-action="add-product"]')?.addEventListener("click", () => toast("Form menu baru siap dihubungkan ke Supabase pengujian"));
}

function stockMovementModal() {
  openModal(`<div class="modal"><div class="modal-header"><h2>Catat pergerakan stok</h2><button class="icon-button" data-close-modal>${icon("x")}</button></div><div class="modal-body"><div class="form-grid"><div class="field wide"><label>Bahan</label><select class="select"><option>Gula aren</option><option>Susu segar</option><option>Biji kopi</option></select></div><div class="field"><label>Jenis</label><select class="select"><option>Pemakaian</option><option>Waste</option><option>Stok masuk</option><option>Stock opname</option></select></div><div class="field"><label>Jumlah</label><input class="input" inputmode="decimal" placeholder="0" /></div><div class="field wide"><label>Alasan / catatan</label><textarea class="textarea"></textarea></div></div></div><div class="modal-footer"><button class="btn btn-secondary" data-close-modal>Batal</button><button class="btn btn-primary" id="save-stock">Simpan</button></div></div>`);
  document.querySelector("#save-stock")?.addEventListener("click", () => { closeModal(); toast("Pergerakan stok tercatat", "success"); });
}

function bindHistory() {
  app.querySelector("#history-search")?.addEventListener("input", (event) => { state.historySearch = event.target.value; render(); document.querySelector("#history-search")?.focus(); });
  app.querySelectorAll("[data-view-order]").forEach((button) => button.addEventListener("click", () => showOrder(state.orders.find((order) => order.id === button.dataset.viewOrder))));
  app.querySelectorAll("[data-refund-order]").forEach((button) => button.addEventListener("click", () => refundModal(state.orders.find((order) => order.id === button.dataset.refundOrder))));
}

function showOrder(order, printMode = false) {
  openModal(`<div class="modal"><div class="modal-header"><div><h2>${order.orderNo}</h2><small style="color:var(--muted)">${order.identity} · ${title(order.orderType)}</small></div><button class="icon-button" data-close-modal>${icon("x")}</button></div><div class="modal-body"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">${status(order.status)}<strong>${rupiah(order.total)}</strong></div><div class="profit-stack">${order.items.map((item) => `<div class="profit-row"><span>${item.qty}× ${item.menuNameSnapshot}${item.note ? `<small style="display:block;color:var(--muted)">${item.note}</small>` : ""}</span><strong>${rupiah(item.priceSnapshot*item.qty)}</strong></div>`).join("")}<div class="profit-row"><span>Diskon</span><strong>− ${rupiah(order.discountTotal)}</strong></div><div class="profit-row total"><span>Total</span><strong>${rupiah(order.total)}</strong></div></div></div><div class="modal-footer"><button class="btn btn-secondary" data-close-modal>Tutup</button><button class="btn btn-primary" id="print-order">${icon("printer")} ${printMode ? "Cetak tiket" : "Cetak ulang nota"}</button></div></div>`);
  document.querySelector("#print-order")?.addEventListener("click", () => window.print());
}

function refundModal(order) {
  const already = order.payments.filter((p) => p.type === "refund" && p.status === "berhasil").reduce((sum,p) => sum+p.amount,0);
  const remaining = order.total - already;
  openModal(`<div class="modal"><div class="modal-header"><div><h2>Refund ${order.orderNo}</h2><small style="color:var(--muted)">Sisa yang dapat direfund ${rupiah(remaining)}</small></div><button class="icon-button" data-close-modal>${icon("x")}</button></div><div class="modal-body"><div class="field"><label>Nominal refund</label><input class="input" id="refund-amount" type="number" max="${remaining}" value="${remaining}" /></div><div class="field" style="margin-top:14px"><label>Alasan</label><textarea class="textarea" id="refund-reason" placeholder="Alasan wajib"></textarea></div><p style="font-size:10px;color:var(--muted);line-height:1.6">Refund dicatat terpisah dan tidak mengembalikan stok. Uang keluar baru dihitung setelah status berhasil.</p></div><div class="modal-footer"><button class="btn btn-secondary" data-close-modal>Batal</button><button class="btn btn-danger" id="submit-refund">Ajukan refund</button></div></div>`);
  document.querySelector("#submit-refund")?.addEventListener("click", () => {
    const amount = Number(document.querySelector("#refund-amount").value);
    const reason = document.querySelector("#refund-reason").value.trim();
    if (!reason || amount <= 0 || amount > remaining) { toast("Periksa nominal dan alasan refund", "error"); return; }
    order.payments.push({ id: `refund-${Date.now()}`, type: "refund", status: "menunggu", amount, reason });
    closeModal(); toast("Refund menunggu persetujuan owner", "success");
  });
}

function bindReports() {
  app.querySelector('[data-action="sync-sheets"]')?.addEventListener("click", (event) => {
    event.currentTarget.disabled = true;
    event.currentTarget.textContent = "Diproses...";
    window.setTimeout(() => { event.currentTarget.disabled = false; event.currentTarget.innerHTML = `${icon("check")} Berhasil disinkron`; toast("Rekap Google Sheets diperbarui", "success"); }, 900);
  });
  app.querySelector('[data-action="close-shift"]')?.addEventListener("click", closeShiftModal);
}

function closeShiftModal() {
  openModal(`<div class="modal"><div class="modal-header"><h2>Tutup shift Rina</h2><button class="icon-button" data-close-modal>${icon("x")}</button></div><div class="modal-body"><div class="payment-total"><span>Kas seharusnya</span><strong>${rupiah(688000)}</strong></div><div class="field"><label>Uang fisik yang dihitung</label><input class="input" id="physical-cash" type="number" value="688000" /></div><div class="payment-total"><span>Selisih</span><strong id="cash-difference">${rupiah(0)}</strong></div></div><div class="modal-footer"><button class="btn btn-secondary" data-close-modal>Batal</button><button class="btn btn-primary" id="confirm-close-shift">Konfirmasi tutup shift</button></div></div>`);
  document.querySelector("#physical-cash").addEventListener("input", (event) => { document.querySelector("#cash-difference").textContent = rupiah(Number(event.target.value)-688000); });
  document.querySelector("#confirm-close-shift").addEventListener("click", () => { closeModal(); toast("Shift ditutup dan tidak dapat diubah tanpa owner", "success"); });
}

function bindAccounts() {
  app.querySelectorAll("[data-toggle-user]").forEach((button) => button.addEventListener("click", () => {
    const user = state.users.find((item) => item.id === button.dataset.toggleUser);
    user.active = !user.active;
    render();
    toast(`Akun ${user.name} ${user.active ? "diaktifkan" : "dinonaktifkan"}`, "success");
  }));
  app.querySelector('[data-action="add-user"]')?.addEventListener("click", addUserModal);
}

function addUserModal() {
  openModal(`<div class="modal"><div class="modal-header"><h2>Tambah akun karyawan</h2><button class="icon-button" data-close-modal>${icon("x")}</button></div><div class="modal-body"><div class="form-grid"><div class="field wide"><label>Nama lengkap</label><input class="input" id="new-user-name" /></div><div class="field wide"><label>Email</label><input class="input" id="new-user-email" type="email" /></div><div class="field"><label>Peran</label><select class="select" id="new-user-role"><option value="staff_kasir">Kasir</option><option value="staff_dapur">Dapur</option></select></div><div class="field"><label>Password awal</label><input class="input" type="password" value="TemuKopi123" /></div></div></div><div class="modal-footer"><button class="btn btn-secondary" data-close-modal>Batal</button><button class="btn btn-primary" id="save-user">Tambah akun</button></div></div>`);
  document.querySelector("#save-user").addEventListener("click", () => {
    const name = document.querySelector("#new-user-name").value.trim();
    const email = document.querySelector("#new-user-email").value.trim();
    const role = document.querySelector("#new-user-role").value;
    if (!name || !email.includes("@")) { toast("Nama dan email valid wajib diisi", "error"); return; }
    if (state.users.some((user) => user.email === email)) { toast("Email sudah digunakan", "error"); return; }
    state.users.push({ id: `usr-${Date.now()}`, name, email, role, active: true });
    closeModal(); render(); toast("Akun karyawan ditambahkan", "success");
  });
}

function bindSettings() {
  app.querySelector('[data-action="save-settings"]')?.addEventListener("click", () => toast("Pengaturan disimpan", "success"));
}

if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("./service-worker.js").catch(() => {}));
render();
