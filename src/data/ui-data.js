export const salesChart = [
  { label: "24 Okt", value: 1820000 },
  { label: "25 Okt", value: 2460000 },
  { label: "26 Okt", value: 2140000 },
  { label: "27 Okt", value: 2875000 },
  { label: "28 Okt", value: 2600000 },
  { label: "29 Okt", value: 3240000 },
  { label: "Hari ini", value: 3585000 }
];

export const dashboardMetrics = {
  grossSales: 3750000,
  discount: 145000,
  refunds: 20000,
  netSales: 3585000,
  transactions: 87,
  items: 146,
  grossProfit: 1984000,
  expenses: 725000,
  netProfit: 1259000
};

export const bestSellers = [
  { name: "Kopi Susu Aren", qty: 42, sales: 1050000, hpp: 388500, profit: 661500 },
  { name: "Cafe Latte", qty: 31, sales: 868000, hpp: 322400, profit: 545600 },
  { name: "Nasi Goreng Kampung", qty: 24, sales: 840000, hpp: 403200, profit: 436800 },
  { name: "Matcha Latte", qty: 18, sales: 486000, hpp: 207000, profit: 279000 }
];

export const cashMovements = [
  { at: "07.02", type: "Kas awal", amount: 300000, direction: "in", actor: "Rina" },
  { at: "09.15", type: "Tambahan modal", amount: 50000, direction: "in", actor: "Rina" },
  { at: "10.12", type: "Refund tunai", amount: 10000, direction: "out", actor: "Natanael" },
  { at: "10.40", type: "Belanja mendadak", amount: 75000, direction: "out", actor: "Rina" }
];
