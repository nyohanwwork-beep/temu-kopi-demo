import { assertRupiah } from "./money.js";

export function calculateShiftClose({
  openingCash,
  cashSales,
  cashIn,
  cashOut,
  closingCash,
}) {
  const expectedCash =
    assertRupiah(openingCash, "Kas awal") +
    assertRupiah(cashSales, "Penjualan tunai") +
    assertRupiah(cashIn, "Kas masuk") -
    assertRupiah(cashOut, "Kas keluar");

  if (expectedCash < 0) {
    throw new RangeError("Kas seharusnya tidak boleh negatif");
  }

  const difference = assertRupiah(closingCash, "Kas fisik") - expectedCash;
  return {
    expectedCash,
    difference,
    status: difference === 0 ? "pas" : difference > 0 ? "lebih" : "kurang",
  };
}

export function assertShiftCanClose(shift, closeKey) {
  if (!closeKey?.trim()) throw new TypeError("Kunci penutupan wajib diisi");
  if (shift.status === "tutup" || shift.closeKey === closeKey) {
    throw new Error("Shift sudah ditutup");
  }
  return true;
}

