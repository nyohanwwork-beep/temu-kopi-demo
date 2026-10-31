import {
  buildMenuPerformance,
  buildSalesSummary,
  calculateProfitStatement,
  refundRemaining,
} from "./domain/reports.js";
import { calculateShiftClose } from "./domain/shift.js";

const KITCHEN_TRANSITIONS = {
  baru: "diproses",
  diproses: "siap",
};

const STOCK_SIGN = {
  stok_masuk: 1,
  pemakaian: -1,
  waste: -1,
  retur_supplier: -1,
};

function requireStateList(state, key) {
  if (!state || typeof state !== "object") throw new TypeError("State demo wajib berupa objek");
  if (!Array.isArray(state[key])) state[key] = [];
  return state[key];
}

function requiredText(value, label) {
  if (typeof value !== "string" || !value.trim()) throw new TypeError(`${label} wajib diisi`);
  return value.trim();
}

function positiveAmount(value, label) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) throw new RangeError(`${label} harus lebih dari nol`);
  return amount;
}

export function normalizeCustomerPhone(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  let national = digits;
  if (national.startsWith("62")) national = national.slice(2);
  if (national.startsWith("0")) national = national.slice(1);
  if (!national.startsWith("8") || national.length < 9 || national.length > 13) {
    throw new TypeError("Nomor HP harus berupa nomor Indonesia yang valid");
  }
  return `+62${national}`;
}

export function buildOrderIdentity({ orderType, tableNo = "", customerName = "", platform = "", platformOrderNo = "" }) {
  const name = String(customerName).trim();
  const table = String(tableNo).trim();
  if (orderType === "dine_in") {
    if (!table && !name) throw new TypeError("Isi nomor meja atau nama panggilan pelanggan");
    const tableLabel = table ? `Meja ${table.padStart(2, "0")}` : "";
    return [name, tableLabel].filter(Boolean).join(" · ");
  }
  if (orderType === "delivery") {
    const orderNo = requiredText(String(platformOrderNo ?? ""), "Nomor pesanan platform");
    const platformLabel = requiredText(String(platform ?? ""), "Platform");
    return [name, `${platformLabel} #${orderNo}`].filter(Boolean).join(" · ");
  }
  return name || "Takeaway";
}

export function buildOrderItems(cart, menus, sequence) {
  if (!Array.isArray(cart) || !Array.isArray(menus)) throw new TypeError("Keranjang dan menu wajib berupa daftar");
  return cart.map((line, index) => {
    const menu = menus.find((entry) => entry.id === line.id);
    return {
      id: `item-${sequence}-${index}`,
      menuId: line.id,
      menuNameSnapshot: line.name,
      priceSnapshot: line.price,
      hppSnapshot: menu?.hpp || 0,
      hppCompleteSnapshot: Boolean(menu?.hppComplete),
      qty: line.qty,
      variant: line.variant,
      note: String(line.note || "").trim(),
      photo: menu?.photo,
    };
  });
}

export function upsertCustomer(state, input) {
  const phone = normalizeCustomerPhone(input.phone);
  if (!phone) return { customer: null, saved: false };
  if (!input.marketingConsent) throw new TypeError("Persetujuan pelanggan diperlukan untuk menyimpan nomor HP");
  const customers = requireStateList(state, "customers");
  const name = String(input.name ?? "").trim();
  const orderTotal = Math.max(0, Number(input.orderTotal) || 0);
  const orderAt = input.orderAt ?? new Date().toISOString();
  let customer = customers.find((entry) => entry.phone === phone);
  const created = !customer;
  if (!customer) {
    customer = {
      id: input.id ?? `customer-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      phone,
      name,
      marketingConsent: true,
      consentAt: orderAt,
      firstOrderAt: orderAt,
      lastOrderAt: orderAt,
      orderCount: 0,
      totalSpent: 0,
    };
    customers.unshift(customer);
  }
  if (name) customer.name = name;
  customer.marketingConsent = true;
  customer.consentAt ||= orderAt;
  customer.lastOrderAt = orderAt;
  customer.orderCount = Number(customer.orderCount || 0) + 1;
  customer.totalSpent = Number(customer.totalSpent || 0) + orderTotal;
  return { customer, saved: true, created };
}

export function createOrder(state, input, idempotencyKey) {
  const orders = requireStateList(state, "orders");
  const key = requiredText(idempotencyKey, "Kunci idempotensi");
  const existing = orders.find((order) => order.idempotencyKey === key);
  if (existing) return { order: existing, created: false };

  const order = structuredClone(input);
  requiredText(order.id, "ID order");
  requiredText(order.orderNo, "Nomor order");
  if (orders.some((entry) => entry.id === order.id || entry.orderNo === order.orderNo)) {
    throw new Error("ID atau nomor order sudah digunakan");
  }
  if (!Array.isArray(order.items) || order.items.length === 0) throw new TypeError("Order wajib memiliki item");
  if (!Array.isArray(order.payments)) order.payments = [];
  order.idempotencyKey = key;
  orders.unshift(order);
  return { order, created: true };
}

export function transitionKitchenOrder(state, orderId, nextStatus) {
  const order = requireStateList(state, "orders").find((entry) => entry.id === orderId);
  if (!order) throw new Error("Order tidak ditemukan");
  const expected = KITCHEN_TRANSITIONS[order.status];
  if (!expected || nextStatus !== expected) {
    throw new Error(`Transisi dapur ${order.status} ke ${nextStatus} tidak diizinkan`);
  }
  order.status = nextStatus;
  return order;
}

export function restoreKitchenOrder(state, orderId, nextStatus) {
  const order = requireStateList(state, "orders").find((entry) => entry.id === orderId);
  if (!order) throw new Error("Order tidak ditemukan");
  if (order.status !== "selesai" || !["diproses", "siap"].includes(nextStatus)) {
    throw new Error("Hanya pesanan selesai yang dapat dikembalikan ke antrean dapur");
  }
  order.status = nextStatus;
  order.restoredAt = new Date().toISOString();
  return order;
}

export function recordStockMovement(state, input) {
  const movements = requireStateList(state, "inventoryMovements");
  const ingredients = requireStateList(state, "ingredients");
  const key = requiredText(input.idempotencyKey, "Kunci idempotensi");
  const existing = movements.find((movement) => movement.idempotencyKey === key);
  if (existing) return { movement: existing, created: false };

  const ingredient = ingredients.find((entry) => entry.id === input.ingredientId);
  if (!ingredient) throw new Error("Bahan tidak ditemukan");
  const quantity = positiveAmount(input.quantity, "Jumlah stok");
  const delta = input.type === "penyesuaian"
    ? Number(input.delta ?? input.quantity)
    : quantity * (STOCK_SIGN[input.type] ?? 0);
  if (!Number.isFinite(delta) || delta === 0) throw new RangeError("Jenis atau nilai pergerakan stok tidak valid");

  const before = Number(ingredient.stock ?? 0);
  const after = before + delta;
  if (after < 0) throw new RangeError("Stok tidak boleh menjadi negatif");
  const movement = {
    id: input.id ?? `movement-${Date.now()}`,
    idempotencyKey: key,
    ingredientId: ingredient.id,
    ingredientName: ingredient.name,
    unit: ingredient.unit,
    type: input.type,
    quantity,
    delta,
    before,
    after,
    reason: input.reason ?? "",
    actor: input.actor ?? "Demo",
    status: "berhasil",
    costSnapshot: Number(input.costSnapshot ?? 0),
    createdAt: input.createdAt ?? new Date().toISOString(),
  };
  ingredient.stock = after;
  ingredient.status = after <= Number(ingredient.minimum ?? 0) ? "menipis" : "aman";
  movements.unshift(movement);
  return { movement, created: true };
}

export function closeShift(state, shiftId, input) {
  const shift = requireStateList(state, "shifts").find((entry) => entry.id === shiftId);
  if (!shift) throw new Error("Shift tidak ditemukan");
  const closeKey = requiredText(input.closeKey, "Kunci penutupan");
  if (shift.status === "tutup") {
    if (shift.closeKey === closeKey) return { shift, closed: false };
    throw new Error("Shift sudah ditutup");
  }
  const result = calculateShiftClose({
    openingCash: shift.openingCash ?? 0,
    cashSales: shift.cashSales ?? 0,
    cashIn: shift.cashIn ?? 0,
    cashOut: shift.cashOut ?? 0,
    closingCash: input.closingCash,
  });
  Object.assign(shift, {
    ...result,
    closingCash: Number(input.closingCash),
    closedAt: input.closedAt ?? new Date().toISOString(),
    closeKey,
    status: "tutup",
  });
  return { shift, closed: true };
}

export function requestRefund(state, orderId, input) {
  const order = requireStateList(state, "orders").find((entry) => entry.id === orderId);
  if (!order) throw new Error("Order tidak ditemukan");
  const key = requiredText(input.idempotencyKey, "Kunci idempotensi");
  const payments = order.payments ?? (order.payments = []);
  const existing = payments.find((payment) => payment.type === "refund" && payment.idempotencyKey === key);
  if (existing) return { refund: existing, created: false };
  const amount = positiveAmount(input.amount, "Nominal refund");
  const reserved = payments
    .filter((payment) => payment.type === "refund" && ["menunggu", "disetujui"].includes(payment.status))
    .reduce((sum, payment) => sum + payment.amount, 0);
  if (amount > refundRemaining(order) - reserved) throw new RangeError("Nominal refund melebihi sisa pembayaran");
  const refund = {
    id: input.id ?? `refund-${Date.now()}`,
    idempotencyKey: key,
    type: "refund",
    status: "menunggu",
    amount,
    reason: requiredText(input.reason, "Alasan refund"),
    requestedAt: input.requestedAt ?? new Date().toISOString(),
    requestedBy: input.requestedBy ?? "Demo",
  };
  payments.push(refund);
  return { refund, created: true };
}

export function transitionRefund(state, orderId, refundId, nextStatus, metadata = {}) {
  const order = requireStateList(state, "orders").find((entry) => entry.id === orderId);
  if (!order) throw new Error("Order tidak ditemukan");
  const refund = (order.payments ?? []).find((payment) => payment.id === refundId && payment.type === "refund");
  if (!refund) throw new Error("Refund tidak ditemukan");
  const allowed = refund.status === "menunggu"
    ? ["disetujui", "gagal"]
    : refund.status === "disetujui" ? ["berhasil", "gagal"] : [];
  if (!allowed.includes(nextStatus)) throw new Error(`Transisi refund ${refund.status} ke ${nextStatus} tidak diizinkan`);
  refund.status = nextStatus;
  refund.updatedAt = metadata.at ?? new Date().toISOString();
  refund.updatedBy = metadata.actor ?? "Demo";
  return refund;
}

export function aggregateDemoReports(state) {
  const orders = Array.isArray(state.orders) ? state.orders : [];
  const expenses = Array.isArray(state.expenses) ? state.expenses : [];
  const materialLoss = (state.inventoryMovements ?? [])
    .filter((movement) => movement.type === "waste")
    .reduce((sum, movement) => sum + Number(movement.costSnapshot ?? 0), 0);
  return {
    summary: buildSalesSummary(orders),
    menuPerformance: buildMenuPerformance(orders),
    profit: calculateProfitStatement({ orders, expenses, materialLoss }),
    kitchen: {
      baru: orders.filter((order) => order.status === "baru").length,
      diproses: orders.filter((order) => order.status === "diproses").length,
      siap: orders.filter((order) => order.status === "siap").length,
    },
  };
}
