import { percentage } from "./money.js";

export const UNIT_GROUPS = Object.freeze({
  gram: "massa",
  kg: "massa",
  ml: "volume",
  liter: "volume",
  pcs: "jumlah",
});

const DEFAULT_FACTORS = Object.freeze({
  gram: 1,
  kg: 1_000,
  ml: 1,
  liter: 1_000,
  pcs: 1,
});

export function convertUnit(quantity, fromUnit, toUnit, factors = DEFAULT_FACTORS) {
  if (!Number.isFinite(quantity) || quantity < 0) {
    throw new TypeError("Jumlah bahan harus berupa angka tidak negatif");
  }
  if (!UNIT_GROUPS[fromUnit] || !UNIT_GROUPS[toUnit]) {
    throw new RangeError("Satuan bahan tidak dikenal");
  }
  if (UNIT_GROUPS[fromUnit] !== UNIT_GROUPS[toUnit]) {
    throw new RangeError("Satuan tidak sejenis tidak dapat dikonversi");
  }
  if (!Number.isFinite(factors[fromUnit]) || !Number.isFinite(factors[toUnit])) {
    throw new RangeError("Faktor konversi bahan belum tersedia");
  }
  return (quantity * factors[fromUnit]) / factors[toUnit];
}

export function calculateRecipeHpp(recipe) {
  if (!Array.isArray(recipe) || recipe.length === 0) {
    return { hpp: null, complete: false, missing: ["Resep belum diisi"] };
  }

  const missing = [];
  let hpp = 0;
  for (const component of recipe) {
    if (!Number.isFinite(component.costPerBaseUnit)) {
      missing.push(component.ingredientName);
      continue;
    }
    const qtyBase = convertUnit(component.quantity, component.unit, component.baseUnit);
    hpp += qtyBase * component.costPerBaseUnit;
  }

  return {
    hpp: Math.round(hpp),
    complete: missing.length === 0,
    missing,
  };
}

export function calculateMenuMargin(price, recipe) {
  const result = calculateRecipeHpp(recipe);
  if (!result.complete) {
    return { ...result, grossProfit: null, margin: null };
  }
  const grossProfit = price - result.hpp;
  return { ...result, grossProfit, margin: percentage(grossProfit, price) };
}

