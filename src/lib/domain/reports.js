import { allocateRupiah } from "./allocation.js";
import { percentage } from "./money.js";

function successfulRefunds(order) {
  return (order.payments ?? []).filter(
    (payment) => payment.type === "refund" && payment.status === "berhasil",
  );
}

function itemGross(item) {
  return item.priceSnapshot * item.qty;
}

export function buildSalesSummary(orders) {
  const paidOrders = orders.filter((order) => order.paymentStatus === "lunas");
  const summary = {
    grossSales: 0,
    discounts: 0,
    successfulRefunds: 0,
    netSales: 0,
    transactionCount: paidOrders.length,
    itemCount: 0,
    paymentMethods: { tunai: 0, qris: 0, transfer: 0 },
  };

  for (const order of paidOrders) {
    summary.grossSales += order.subtotal;
    summary.discounts += order.discountTotal;
    summary.itemCount += order.items.reduce((sum, item) => sum + item.qty, 0);
    const refunds = successfulRefunds(order).reduce((sum, payment) => sum + payment.amount, 0);
    summary.successfulRefunds += refunds;
    if (summary.paymentMethods[order.paymentMethod] !== undefined) {
      summary.paymentMethods[order.paymentMethod] += order.total;
    }
  }
  summary.netSales = summary.grossSales - summary.discounts - summary.successfulRefunds;
  return summary;
}

export function buildMenuPerformance(orders) {
  const aggregate = new Map();
  const eligibleOrders = orders.filter(
    (order) => order.paymentStatus === "lunas" && order.status !== "dibatalkan",
  );

  for (const order of eligibleOrders) {
    const grossLines = order.items.map((item) => ({ id: item.id, value: itemGross(item) }));
    const discountByItem = allocateRupiah(grossLines, order.discountTotal);
    const itemRefunds = Object.create(null);
    let orderLevelRefund = 0;
    for (const refund of successfulRefunds(order)) {
      if (refund.orderItemId) {
        itemRefunds[refund.orderItemId] = (itemRefunds[refund.orderItemId] ?? 0) + refund.amount;
      } else {
        orderLevelRefund += refund.amount;
      }
    }

    const afterItemRefund = order.items.map((item) => ({
      id: item.id,
      value: Math.max(0, itemGross(item) - discountByItem[item.id] - (itemRefunds[item.id] ?? 0)),
    }));
    const orderRefundByItem = allocateRupiah(afterItemRefund, orderLevelRefund);

    for (const item of order.items) {
      const netBeforeRefund = itemGross(item) - discountByItem[item.id];
      const directRefund = itemRefunds[item.id] ?? 0;
      const sales = netBeforeRefund - directRefund - orderRefundByItem[item.id];
      const fullyRefundedItem = directRefund >= netBeforeRefund && netBeforeRefund > 0;
      const qtySold = fullyRefundedItem ? 0 : item.qty;
      const key = item.menuId;
      const row = aggregate.get(key) ?? {
        menuId: key,
        name: item.menuNameSnapshot,
        photo: item.photo ?? null,
        qtySold: 0,
        sales: 0,
        hpp: 0,
        hppComplete: true,
      };
      row.qtySold += qtySold;
      row.sales += sales;
      row.hpp += item.hppSnapshot * item.qty;
      row.hppComplete = row.hppComplete && item.hppCompleteSnapshot;
      aggregate.set(key, row);
    }
  }

  return [...aggregate.values()].map((row) => ({
    ...row,
    grossProfit: row.hppComplete ? row.sales - row.hpp : null,
    margin: row.hppComplete ? percentage(row.sales - row.hpp, row.sales) : null,
  }));
}

export function sortMenuPerformance(rows, sortBy = "qtySold") {
  const selectors = {
    qtySold: (row) => row.qtySold,
    sales: (row) => row.sales,
    grossProfit: (row) => row.grossProfit ?? Number.NEGATIVE_INFINITY,
  };
  const selector = selectors[sortBy];
  if (!selector) throw new RangeError("Dasar urutan menu tidak dikenal");
  return [...rows].sort((a, b) => selector(b) - selector(a) || a.name.localeCompare(b.name));
}

export function calculateProfitStatement({ orders, expenses = [], materialLoss = 0 }) {
  const summary = buildSalesSummary(orders);
  const menuPerformance = buildMenuPerformance(orders);
  const hppComplete = menuPerformance.every((row) => row.hppComplete);
  const hpp = menuPerformance.reduce((sum, row) => sum + row.hpp, 0);
  const grossProfit = hppComplete ? summary.netSales - hpp : null;
  const operatingExpenses = expenses
    .filter((expense) => expense.affectsProfit && !expense.deletedAt)
    .reduce((sum, expense) => sum + expense.amount, 0);

  return {
    netSales: summary.netSales,
    hpp,
    hppComplete,
    grossProfit,
    operatingExpenses,
    materialLoss,
    estimatedNetProfit: hppComplete
      ? grossProfit - operatingExpenses - materialLoss
      : null,
  };
}

export function refundRemaining(order) {
  const received = (order.payments ?? [])
    .filter((payment) => payment.type === "payment" && payment.status === "berhasil")
    .reduce((sum, payment) => sum + payment.amount, 0);
  const refunded = successfulRefunds(order).reduce((sum, payment) => sum + payment.amount, 0);
  return Math.max(0, received - refunded);
}

