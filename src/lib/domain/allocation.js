import { assertRupiah } from "./money.js";

/**
 * Membagi nominal rupiah secara proporsional. Sisa pembulatan diberikan pada
 * baris bernilai terbesar, lalu id terkecil sebagai tie-break yang stabil.
 */
export function allocateRupiah(items, amount) {
  assertRupiah(amount, "Nominal alokasi");
  const normalized = items.map((item) => ({
    id: String(item.id),
    value: assertRupiah(item.value, `Nilai ${item.id}`),
  }));
  const total = normalized.reduce((sum, item) => sum + item.value, 0);

  if (amount > total) {
    throw new RangeError("Nominal alokasi tidak boleh melebihi nilai dasar");
  }
  if (amount === 0) {
    return Object.fromEntries(normalized.map((item) => [item.id, 0]));
  }
  if (total === 0) {
    throw new RangeError("Nominal tidak dapat dialokasikan pada nilai dasar nol");
  }

  const result = Object.fromEntries(
    normalized.map((item) => [item.id, Math.floor((amount * item.value) / total)]),
  );
  let remainder = amount - Object.values(result).reduce((sum, value) => sum + value, 0);
  const priority = [...normalized].sort(
    (a, b) => b.value - a.value || a.id.localeCompare(b.id),
  );

  for (let index = 0; remainder > 0; index += 1, remainder -= 1) {
    result[priority[index % priority.length].id] += 1;
  }
  return result;
}

