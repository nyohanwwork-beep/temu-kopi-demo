import { icon, number, rupiah, status } from "../ui.js";
import { auditLogs, categories, ingredients, menus, orders as seedOrders, shifts, users } from "../data/mock-data.js";
import { bestSellers, cashMovements, dashboardMetrics, salesChart } from "../data/ui-data.js";

export const pageMeta = {
  dashboard: ["Dashboard Owner", "Ringkasan kondisi Temu Kopi hari ini"],
  kasir: ["Kasir & Pesanan", "Pilih menu dan selesaikan pembayaran"],
  dapur: ["Layar Dapur", "Antrean pesanan aktif secara langsung"],
  inventory: ["Menu & Stok", "Ketersediaan menu dan bahan baku"],
  history: ["Riwayat Transaksi", "Telusuri transaksi, refund, dan cetak ulang"],
  reports: ["Laporan Penjualan", "Penjualan, kas shift, dan performa menu"],
  accounts: ["Akun & Hak Akses", "Kelola pengguna dan jejak audit"],
  settings: ["Pengaturan", "Identitas kafe, perangkat, dan operasional"]
};

export const navItems = [
  { id: "dashboard", label: "Dashboard", icon: "dashboard", roles: ["owner"] },
  { id: "kasir", label: "Kasir & Pesanan", icon: "cart", roles: ["owner", "staff_kasir"] },
  { id: "dapur", label: "Layar Dapur", icon: "chef", roles: ["owner", "staff_dapur", "staff_kasir"] },
  { id: "inventory", label: "Menu & Stok", icon: "package", roles: ["owner", "staff_kasir", "staff_dapur"] },
  { id: "history", label: "Riwayat", icon: "receipt", roles: ["owner", "staff_kasir"] },
  { id: "reports", label: "Laporan", icon: "chart", roles: ["owner", "staff_kasir"] },
  { id: "accounts", label: "Akun & Akses", icon: "users", roles: ["owner"] },
  { id: "settings", label: "Pengaturan", icon: "settings", roles: ["owner"] }
];

export function renderDashboard(state) {
  const max = Math.max(...salesChart.map((item) => item.value));
  return `
    <div class="page-toolbar">
      <div class="toolbar-actions">
        <button class="btn btn-secondary">${icon("calendar")} Hari ini</button>
        <span class="connection"><span>Terakhir diperbarui 11.24</span></span>
      </div>
      <div class="toolbar-actions">
        <button class="btn btn-secondary" data-action="print-report">${icon("download")} Export PDF</button>
      </div>
    </div>
    <section class="kpi-grid" aria-label="Ringkasan utama">
      ${kpi("Penjualan bersih", rupiah(dashboardMetrics.netSales), "trend", "+12,5% dari kemarin")}
      ${kpi("Transaksi", number(dashboardMetrics.transactions), "receipt", "+8 transaksi")}
      ${kpi("Laba kotor", rupiah(dashboardMetrics.grossProfit), "chart", "HPP lengkap 96%")}
      ${kpi("Pesanan aktif", state.orders.filter((order) => !["selesai", "dibatalkan"].includes(order.status)).length, "chef", "3 perlu dipantau")}
    </section>
    <section class="dashboard-grid">
      <div class="panel">
        <div class="panel-header"><div><h2>Tren penjualan</h2><p>Penjualan bersih 7 hari terakhir</p></div><strong>${rupiah(salesChart.reduce((sum, item) => sum + item.value, 0))}</strong></div>
        <div class="panel-body">
          <div class="chart" aria-label="Grafik penjualan mingguan">
            ${salesChart.map((item) => `<div class="bar-wrap"><div class="bar" style="height:${Math.max(12, item.value / max * 100)}%" data-value="${rupiah(item.value)}"></div><span class="bar-label">${item.label}</span></div>`).join("")}
          </div>
        </div>
      </div>
      <div class="panel">
        <div class="panel-header"><div><h2>Pesanan terkini</h2><p>Pembaruan operasional langsung</p></div><button class="icon-button" data-route="dapur" aria-label="Buka layar dapur">${icon("chevron")}</button></div>
        <div class="panel-body order-list">
          ${state.orders.slice(0, 5).map((order) => `<div class="order-row"><strong>${order.orderNo}</strong><span>${order.identity}</span><span>${time(order.createdAt)}</span>${status(order.status)}</div>`).join("")}
        </div>
      </div>
      <div class="panel">
        <div class="panel-header"><div><h2>Menu terlaris</h2><p>Berdasarkan jumlah terjual hari ini</p></div><button class="btn btn-ghost" data-route="reports">Lihat laporan ${icon("chevron")}</button></div>
        <div class="table-scroll"><table><thead><tr><th>Menu</th><th>Terjual</th><th>Penjualan</th><th>HPP</th><th>Laba kotor</th></tr></thead><tbody>${bestSellers.map((item) => `<tr><td><strong>${item.name}</strong></td><td>${item.qty} porsi</td><td>${rupiah(item.sales)}</td><td>${rupiah(item.hpp)}</td><td><strong>${rupiah(item.profit)}</strong></td></tr>`).join("")}</tbody></table></div>
      </div>
      <div class="panel">
        <div class="panel-header"><div><h2>Perhatian hari ini</h2><p>Hal yang perlu ditindaklanjuti</p></div></div>
        <div class="panel-body">
          ${attention("Stok Gula aren menipis", "Tersisa 680 gram, di bawah minimum 750 gram", "package")}
          ${attention("1 HPP belum lengkap", "Cokelat Temu belum memiliki harga bahan lengkap", "alert")}
          ${attention("Shift Rina masih terbuka", "Dibuka pukul 07.02 dengan kas awal Rp300.000", "clock")}
        </div>
      </div>
    </section>`;
}

function kpi(label, value, iconName, detail) {
  return `<article class="kpi"><div class="kpi-top"><span>${label}</span><span class="kpi-icon">${icon(iconName)}</span></div><div class="kpi-value">${value}</div><span class="trend">${icon("trend")} ${detail}</span></article>`;
}

function attention(title, detail, iconName) {
  return `<div style="display:grid;grid-template-columns:38px 1fr;gap:11px;padding:12px 0;border-bottom:1px solid var(--linen)"><span class="kpi-icon">${icon(iconName)}</span><div><strong style="font-size:11px">${title}</strong><p style="font-size:9px;color:var(--muted);margin:5px 0 0;line-height:1.5">${detail}</p></div></div>`;
}

export function renderCashier(state) {
  const filtered = menus.filter((item) => (state.category === "all" || item.categoryId === state.category) && item.name.toLowerCase().includes(state.menuSearch.toLowerCase()));
  const subtotal = state.cart.reduce((sum, line) => sum + line.price * line.qty, 0);
  const discount = state.discount || 0;
  return `<div class="cashier-layout">
    <section class="menu-area">
      <div class="page-toolbar">
        <div class="search-box">${icon("search")}<input class="input" id="menu-search" value="${state.menuSearch}" placeholder="Cari menu..." /></div>
        <button class="btn btn-secondary" data-action="open-active-orders">${icon("receipt")} Pesanan aktif <strong>${state.orders.filter((o) => !["selesai","dibatalkan"].includes(o.status)).length}</strong></button>
      </div>
      <div class="category-tabs"><button class="tab ${state.category === "all" ? "active" : ""}" data-category="all">Semua</button>${categories.map((cat) => `<button class="tab ${state.category === cat.id ? "active" : ""}" data-category="${cat.id}">${cat.name}</button>`).join("")}</div>
      <div class="menu-grid">${filtered.map((item) => `<button class="menu-card" data-add-menu="${item.id}" ${item.availability !== "aktif" ? "disabled" : ""}><img src="${item.photo}" alt="${item.name}" /><div class="menu-card-body"><h3>${item.name}</h3><strong>${rupiah(item.price)}</strong></div>${item.availability !== "aktif" ? '<span class="sold-out">Habis</span>' : ""}</button>`).join("")}</div>
    </section>
    <aside class="panel cart-panel">
      <div class="panel-header"><div><h2>Pesanan baru</h2><p>${state.cart.length ? `${state.cart.reduce((sum,item) => sum + item.qty, 0)} item dipilih` : "Belum ada item"}</p></div><button class="icon-button" data-action="clear-cart" aria-label="Kosongkan pesanan" ${state.cart.length ? "" : "disabled"}>${icon("trash")}</button></div>
      <div class="panel-body">
        <div class="cart-items">${state.cart.length ? state.cart.map(cartLine).join("") : `<div class="cart-empty"><div><span class="empty-icon">${icon("cart")}</span><strong>Pesanan masih kosong</strong><p style="font-size:10px;line-height:1.6">Ketuk foto menu untuk menambah pesanan.</p></div></div>`}</div>
        <div class="cart-total">
          <div class="total-row"><span>Subtotal</span><strong>${rupiah(subtotal)}</strong></div>
          <div class="total-row"><span>Diskon</span><strong>− ${rupiah(discount)}</strong></div>
          <div class="total-row grand"><span>Total</span><span>${rupiah(Math.max(0, subtotal - discount))}</span></div>
          <button class="btn btn-primary btn-lg" style="width:100%;margin-top:8px" data-action="checkout" ${state.cart.length ? "" : "disabled"}>Lanjut pembayaran ${icon("chevron")}</button>
        </div>
      </div>
    </aside>
  </div>`;
}

function cartLine(line) {
  return `<div class="cart-line"><div><h3>${line.name}</h3><small>${line.variant || "Regular"}${line.note ? ` · ${line.note}` : ""}</small><div class="qty-control"><button class="qty-btn" data-cart-dec="${line.id}" aria-label="Kurangi ${line.name}">${icon("minus")}</button><span class="qty">${line.qty}</span><button class="qty-btn" data-cart-inc="${line.id}" aria-label="Tambah ${line.name}">${icon("plus")}</button><button class="qty-btn" data-cart-remove="${line.id}" aria-label="Hapus ${line.name}" style="margin-left:3px;color:var(--danger)">${icon("trash")}</button></div></div><strong>${rupiah(line.price * line.qty)}</strong></div>`;
}

export function renderKitchen(state) {
  const active = state.orders.filter((order) => !["selesai", "dibatalkan"].includes(order.status));
  return `<div class="page-toolbar"><div class="kds-summary">${["baru","diproses","siap"].map((key) => `<div class="summary-chip"><div><small>${title(key)}</small><strong>${active.filter((o) => o.status === key).length}</strong></div>${status(key)}</div>`).join("")}</div><div class="toolbar-actions"><button class="btn btn-secondary">${icon("clock")} Urutan FIFO</button><span class="connection"><span>Sinkron</span></span></div></div>
    ${active.length ? `<div class="kds-grid">${active.map((order) => kitchenCard(order)).join("")}</div>` : `<div class="panel empty-state">${icon("chef")}<div><h3>Antrean dapur kosong</h3><p>Pesanan baru akan muncul otomatis.</p></div></div>`}`;
}

function kitchenCard(order) {
  const next = order.status === "baru" ? "diproses" : order.status === "diproses" ? "siap" : "selesai";
  const groups = ["minuman", "makanan"].map((group) => ({ group, items: order.items.filter((item) => (menus.find((m) => m.id === item.menuId)?.categoryId === "cat-food" || menus.find((m) => m.id === item.menuId)?.categoryId === "cat-snack") === (group === "makanan")) })).filter((g) => g.items.length);
  return `<article class="kds-card ${order.status === "diproses" ? "processing" : order.status === "siap" ? "ready" : ""}"><div class="kds-head"><div><h3>${order.orderNo}</h3><p>${order.identity} · ${title(order.orderType)}</p></div><div style="text-align:right"><div class="timer">${elapsed(order.createdAt)}</div>${status(order.status)}</div></div><div class="kds-body">${groups.map((group) => `<div class="item-group"><div class="item-group-title"><span>${group.group}</span><span>${group.items.reduce((s,i)=>s+i.qty,0)} item</span></div>${group.items.map((item) => `<div class="kds-item"><b>${item.qty}×</b><span>${item.menuNameSnapshot}</span></div>${item.note ? `<div class="kds-note">${item.note}</div>` : ""}`).join("")}</div>`).join("")}</div><div class="kds-actions"><button class="btn ${next === "siap" ? "btn-success" : "btn-primary"}" data-order-status="${order.id}" data-next-status="${next}">${next === "selesai" ? "Serahkan pesanan" : `Tandai ${title(next)}`}</button><button class="icon-button" data-print-order="${order.id}" aria-label="Cetak tiket dapur">${icon("printer")}</button></div></article>`;
}

export function renderInventory(state) {
  return `<div class="page-toolbar"><div class="category-tabs"><button class="tab active">Daftar Menu</button><button class="tab">Bahan Baku</button><button class="tab">Pergerakan Stok</button><button class="tab">Persetujuan <strong>2</strong></button></div><div class="toolbar-actions"><button class="btn btn-secondary" data-action="stock-movement">${icon("package")} Catat stok</button>${state.user.role === "owner" ? `<button class="btn btn-primary" data-action="add-product">${icon("plus")} Tambah menu</button>` : ""}</div></div>
    <div class="metric-row"><div class="metric-simple"><small>Menu aktif</small><strong>${menus.filter((m) => m.availability === "aktif").length}</strong></div><div class="metric-simple"><small>Bahan menipis</small><strong style="color:var(--danger)">${ingredients.filter((i) => i.status === "menipis").length}</strong></div><div class="metric-simple"><small>Menunggu persetujuan</small><strong>2</strong></div></div>
    <div class="panel table-panel"><div class="panel-header"><div><h2>Menu Temu Kopi</h2><p>Ketersediaan, harga, dan pengurangan stok</p></div><div class="search-box">${icon("search")}<input class="input" placeholder="Cari menu" /></div></div><div class="table-scroll"><table><thead><tr><th>Menu</th><th>Harga</th>${state.user.role === "owner" ? "<th>HPP & Margin</th>" : ""}<th>Ketersediaan</th><th>Potong stok</th><th>Aksi</th></tr></thead><tbody>${menus.map((menu) => `<tr><td><div class="product-cell"><img class="product-thumb" src="${menu.photo}" alt=""/><div><strong>${menu.name}</strong><small>${categories.find((c)=>c.id===menu.categoryId)?.name} · ${menu.variants.join(" / ") || "Tanpa varian"}</small></div></div></td><td><strong>${rupiah(menu.price)}</strong></td>${state.user.role === "owner" ? `<td>${menu.hppComplete ? `${rupiah(menu.hpp)}<br/><small style="color:var(--sage)">${Math.round((menu.price-menu.hpp)/menu.price*100)}% margin</small>` : `<span style="color:var(--danger)">Belum lengkap</span>`}</td>` : ""}<td>${status(menu.availability)}</td><td><button class="switch ${menu.stockDeductionEnabled ? "on" : ""}" aria-label="Pengurangan stok ${menu.name}" data-toggle-stock="${menu.id}"></button></td><td><div class="row-actions"><button class="icon-button" data-menu-availability="${menu.id}" title="Ubah ketersediaan">${icon(menu.availability === "aktif" ? "alert" : "check")}</button>${state.user.role === "owner" ? `<button class="icon-button" title="Edit menu">${icon("edit")}</button>` : ""}</div></td></tr>`).join("")}</tbody></table></div></div>
    <div class="panel table-panel" style="margin-top:18px"><div class="panel-header"><div><h2>Stok bahan baku</h2><p>Saldo dalam satuan dasar</p></div></div><div class="table-scroll"><table><thead><tr><th>Bahan</th><th>Stok saat ini</th><th>Minimum</th><th>Status</th></tr></thead><tbody>${ingredients.map((item) => `<tr><td><strong>${item.name}</strong></td><td>${number(item.stock)} ${item.unit}<div class="stock-meter ${item.status === "menipis" ? "low" : ""}"><span style="width:${Math.min(100,item.stock/item.minimum*50)}%"></span></div></td><td>${number(item.minimum)} ${item.unit}</td><td>${status(item.status === "aman" ? "aktif" : "habis", title(item.status))}</td></tr>`).join("")}</tbody></table></div></div>`;
}

export function renderHistory(state) {
  return `<div class="filter-bar"><div class="search-box">${icon("search")}<input class="input" id="history-search" value="${state.historySearch}" placeholder="Cari nomor order atau pelanggan" /></div><div class="field"><label>Periode</label><select class="select"><option>Hari ini</option><option>Kemarin</option><option>7 hari terakhir</option></select></div><div class="field"><label>Status</label><select class="select"><option>Semua status</option><option>Lunas</option><option>Refund</option><option>Dibatalkan</option></select></div></div>
    <div class="panel table-panel"><div class="panel-header"><div><h2>Semua transaksi</h2><p>${state.orders.length} transaksi ditemukan</p></div><button class="btn btn-secondary" data-action="print-report">${icon("download")} Export</button></div><div class="table-scroll"><table><thead><tr><th>Nomor order</th><th>Waktu & Kasir</th><th>Pelanggan</th><th>Pembayaran</th><th>Total</th><th>Status</th><th>Aksi</th></tr></thead><tbody>${state.orders.filter((o) => `${o.orderNo} ${o.identity}`.toLowerCase().includes(state.historySearch.toLowerCase())).map((order) => `<tr><td><strong>${order.orderNo}</strong><br/><small>${title(order.orderType)}</small></td><td>${dateTime(order.createdAt)}<br/><small>${order.cashier}</small></td><td>${order.identity}</td><td>${title(order.paymentMethod)}</td><td><strong>${rupiah(order.total)}</strong></td><td>${status(order.status)}</td><td><div class="row-actions"><button class="icon-button" data-view-order="${order.id}" aria-label="Lihat transaksi">${icon("eye")}</button><button class="icon-button" data-print-order="${order.id}" aria-label="Cetak ulang">${icon("printer")}</button>${state.user.role === "owner" && order.paymentStatus === "lunas" ? `<button class="icon-button" data-refund-order="${order.id}" aria-label="Refund" style="color:var(--danger)">${icon("receipt")}</button>` : ""}</div></td></tr>`).join("")}</tbody></table></div></div>`;
}

export function renderReports(state) {
  const owner = state.user.role === "owner";
  return `<div class="page-toolbar"><div class="toolbar-actions"><button class="btn btn-secondary">${icon("calendar")} Hari ini</button><span style="font-size:10px;color:var(--muted)">30 Oktober 2026 · WIB</span></div><div class="toolbar-actions"><button class="btn btn-secondary" data-action="sync-sheets">${icon("chart")} Sinkron Sheets</button><button class="btn btn-primary" data-action="print-report">${icon("download")} Export PDF</button></div></div>
    <div class="kpi-grid">${kpi("Omzet kotor", rupiah(dashboardMetrics.grossSales), "trend", "Sebelum diskon")}${kpi("Penjualan bersih", rupiah(dashboardMetrics.netSales), "banknote", "Setelah refund berhasil")}${kpi("Transaksi", dashboardMetrics.transactions, "receipt", `${dashboardMetrics.items} item terjual`)}${kpi("Refund berhasil", rupiah(dashboardMetrics.refunds), "alert", "1 transaksi")}</div>
    <section class="report-layout">
      <div class="panel"><div class="panel-header"><div><h2>Rincian penjualan</h2><p>Angka yang sama dipakai untuk PDF dan Sheets</p></div></div><div class="panel-body"><div class="profit-stack"><div class="profit-row"><span>Omzet kotor</span><strong>${rupiah(dashboardMetrics.grossSales)}</strong></div><div class="profit-row"><span>Diskon</span><strong>− ${rupiah(dashboardMetrics.discount)}</strong></div><div class="profit-row"><span>Refund berhasil</span><strong>− ${rupiah(dashboardMetrics.refunds)}</strong></div><div class="profit-row total"><span>Penjualan bersih</span><strong>${rupiah(dashboardMetrics.netSales)}</strong></div>${owner ? `<div class="profit-row"><span>HPP transaksi</span><strong>− ${rupiah(1601000)}</strong></div><div class="profit-row"><span>Laba kotor</span><strong>${rupiah(dashboardMetrics.grossProfit)}</strong></div><div class="profit-row"><span>Beban operasional</span><strong>− ${rupiah(dashboardMetrics.expenses)}</strong></div><div class="profit-row total"><span>Estimasi laba bersih</span><strong>${rupiah(dashboardMetrics.netProfit)}</strong></div>` : ""}</div></div></div>
      <div class="panel"><div class="panel-header"><div><h2>Metode pembayaran</h2><p>Distribusi penjualan bersih</p></div></div><div class="panel-body payment-split">${paymentLine("Tunai", 48, 1720800)}${paymentLine("QRIS", 39, 1398150)}${paymentLine("Transfer", 13, 466050)}</div></div>
      <div class="panel table-panel"><div class="panel-header"><div><h2>Performa menu</h2><p>Diskon dan refund telah dialokasikan</p></div><select class="select" style="width:auto"><option>Jumlah terjual</option><option>Pendapatan terbesar</option>${owner ? "<option>Laba terbesar</option>" : ""}</select></div><div class="table-scroll"><table><thead><tr><th>Menu</th><th>Terjual</th><th>Penjualan</th>${owner ? "<th>HPP</th><th>Laba kotor</th><th>Margin</th>" : ""}</tr></thead><tbody>${bestSellers.map((item) => `<tr><td><strong>${item.name}</strong></td><td>${item.qty}</td><td>${rupiah(item.sales)}</td>${owner ? `<td>${rupiah(item.hpp)}</td><td><strong>${rupiah(item.profit)}</strong></td><td>${Math.round(item.profit/item.sales*100)}%</td>` : ""}</tr>`).join("")}</tbody></table></div></div>
      <div class="panel"><div class="panel-header"><div><h2>Shift kasir</h2><p>Rina · dibuka 07.02</p></div>${status("aktif","Terbuka")}</div><div class="panel-body"><div class="profit-stack"><div class="profit-row"><span>Kas awal</span><strong>${rupiah(shifts[0].openingCash)}</strong></div><div class="profit-row"><span>Penjualan tunai bersih</span><strong>${rupiah(shifts[0].cashSales)}</strong></div><div class="profit-row"><span>Kas masuk</span><strong>${rupiah(shifts[0].cashIn)}</strong></div><div class="profit-row"><span>Kas keluar</span><strong>− ${rupiah(shifts[0].cashOut)}</strong></div><div class="profit-row total"><span>Kas seharusnya</span><strong>${rupiah(shifts[0].expectedCash)}</strong></div></div><button class="btn btn-primary" data-action="close-shift" style="width:100%;margin-top:14px">Tutup shift</button></div></div>
    </section>`;
}

function paymentLine(label, percent, value) {
  return `<div class="payment-line"><strong>${label}</strong><div class="payment-track"><span style="width:${percent}%"></span></div><span>${rupiah(value)}</span></div>`;
}

export function renderAccounts(state) {
  return `<div class="page-toolbar"><div class="toolbar-actions"><button class="tab active">Daftar akun</button><button class="tab">Audit log</button></div><button class="btn btn-primary" data-action="add-user">${icon("userPlus")} Tambah akun</button></div>
    <div class="metric-row"><div class="metric-simple"><small>Total akun</small><strong>${state.users.length}</strong></div><div class="metric-simple"><small>Akun aktif</small><strong>${state.users.filter((u)=>u.active).length}</strong></div><div class="metric-simple"><small>Perlu perhatian</small><strong>0</strong></div></div>
    <div class="panel table-panel"><div class="panel-header"><div><h2>Akun karyawan</h2><p>Hak akses sesuai peran operasional</p></div></div><div class="table-scroll"><table><thead><tr><th>Nama</th><th>Email</th><th>Peran</th><th>Status</th><th>Aksi</th></tr></thead><tbody>${state.users.map((user) => `<tr><td><div class="product-cell"><span class="avatar">${user.name.slice(0,2).toUpperCase()}</span><strong>${user.name}</strong></div></td><td>${user.email}</td><td>${roleLabel(user.role)}</td><td>${status(user.active ? "aktif" : "nonaktif")}</td><td><button class="btn ${user.active ? "btn-danger" : "btn-secondary"}" data-toggle-user="${user.id}" ${user.role === "owner" ? "disabled" : ""}>${user.active ? "Nonaktifkan" : "Aktifkan"}</button></td></tr>`).join("")}</tbody></table></div></div>
    <div class="panel table-panel" style="margin-top:18px"><div class="panel-header"><div><h2>Aktivitas penting</h2><p>Jejak audit tidak dapat diubah staff</p></div></div><div class="table-scroll"><table><thead><tr><th>Waktu</th><th>Pengguna</th><th>Tindakan</th><th>Objek</th></tr></thead><tbody>${auditLogs.map((log) => `<tr><td>${log.at}</td><td>${log.actor}</td><td><strong>${title(log.action)}</strong></td><td>${log.entity}</td></tr>`).join("")}</tbody></table></div></div>`;
}

export function renderSettings() {
  return `<div class="settings-grid"><div class="panel settings-nav"><button class="active">Profil kafe</button><button>Nota & printer</button><button>Dapur</button><button>Integrasi</button><button>Backup</button></div><div style="display:grid;gap:18px"><div class="panel"><div class="panel-header"><div><h2>Profil Temu Kopi</h2><p>Informasi yang tampil pada nota dan laporan</p></div><button class="btn btn-primary" data-action="save-settings">Simpan perubahan</button></div><div class="panel-body"><div class="form-grid"><div class="field wide"><label>Nama kafe</label><input class="input" value="Temu Kopi" /></div><div class="field wide"><label>Alamat</label><textarea class="textarea">Jl. Contoh No. 18, Jakarta</textarea></div><div class="field"><label>Nomor telepon</label><input class="input" value="0812 3456 7890" /></div><div class="field"><label>Zona waktu</label><select class="select"><option>Asia/Jakarta (WIB)</option></select></div></div></div></div><div class="panel"><div class="panel-header"><div><h2>Preferensi operasional</h2><p>Pengaturan perangkat dan notifikasi</p></div></div><div class="panel-body">${toggleSetting("Bunyi pesanan siap", "Berbunyi pada layar kasir saat dapur menandai Siap", true)}${toggleSetting("Cetak nota otomatis", "Cetak setelah pembayaran berubah menjadi lunas", true)}${toggleSetting("Cetak tiket dapur", "Gunakan printer cadangan untuk tiket dapur", false)}${toggleSetting("Sinkronisasi Google Sheets", "Rekap harian otomatis pukul 23.59 WIB", true)}</div></div><div class="panel"><div class="panel-header"><div><h2>Keamanan data</h2><p>Backup dan status aplikasi</p></div></div><div class="panel-body"><div class="toggle-row"><div><strong>Backup terakhir</strong><small>30 Oktober 2026, 03.00 WIB · Terverifikasi</small></div>${status("berhasil")}</div><div class="toggle-row"><div><strong>Versi aplikasi</strong><small>Temu Kopi v0.1.0 · Lingkungan pengujian</small></div><button class="btn btn-secondary">Periksa status</button></div></div></div></div></div>`;
}

function toggleSetting(label, detail, active) {
  return `<div class="toggle-row"><div><strong>${label}</strong><small>${detail}</small></div><button class="switch ${active ? "on" : ""}" data-toggle-setting aria-label="${label}"></button></div>`;
}

export function renderPage(state) {
  const pages = { dashboard: renderDashboard, kasir: renderCashier, dapur: renderKitchen, inventory: renderInventory, history: renderHistory, reports: renderReports, accounts: renderAccounts, settings: renderSettings };
  return (pages[state.page] || pages.kasir)(state);
}

export function initialOrders() { return structuredClone(seedOrders); }
export function initialUsers() { return structuredClone(users); }
export function time(value) { return new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }).format(new Date(value)); }
export function dateTime(value) { return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }).format(new Date(value)); }
export function title(value) { return String(value || "").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }
export function roleLabel(role) { return ({ owner: "Owner", staff_kasir: "Kasir", staff_dapur: "Dapur" })[role] || role; }
function elapsed(value) { const minutes = Math.max(1, Math.floor((Date.now() - new Date(value).getTime()) / 60000)); return `${minutes} menit`; }
