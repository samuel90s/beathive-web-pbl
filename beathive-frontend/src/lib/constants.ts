// src/lib/constants.ts
export const SERVICE_FEE_PERCENT = 5;
export const TAX_PERCENT = 11;

export function calcOrderTotals(subtotal: number) {
  const serviceFee = Math.round(subtotal * SERVICE_FEE_PERCENT / 100);
  const tax = Math.round((subtotal + serviceFee) * TAX_PERCENT / 100);
  return { subtotal, serviceFee, tax, grandTotal: subtotal + serviceFee + tax };
}
