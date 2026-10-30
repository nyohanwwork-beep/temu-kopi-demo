const IDR_FORMATTER = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

export function assertRupiah(value, label = "Nominal") {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError(`${label} harus berupa rupiah bulat dan tidak negatif`);
  }
  return value;
}

export function formatRupiah(value) {
  return IDR_FORMATTER.format(Number.isFinite(value) ? value : 0).replace(/\u00a0/g, " ");
}

export function percentage(numerator, denominator) {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) {
    return null;
  }
  return Math.round((numerator / denominator) * 10_000) / 100;
}

