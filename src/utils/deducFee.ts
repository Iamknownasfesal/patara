/// Deducts the fee from the amount
/// @param amount - The amount to deduct the fee from
/// @param feeBps - The fee in basis points (1/100th of a percent) - default 0.3%
/// @returns The amount after the fee is deducted
export function deductFee(amount: bigint, feeBps = 30n): bigint {
  return amount - (amount * feeBps) / 10000n;
}

export function deductFeeFromAmountsIn(
  amountsIn: bigint[],
  feeBps = 30n
): bigint[] {
  return amountsIn.map((amount) => deductFee(amount, feeBps));
}

export function deductFeeFromMap(
  amountsIn: Record<string, bigint>,
  feeBps = 30n
): Record<string, bigint> {
  return Object.fromEntries(
    Object.entries(amountsIn).map(([coinType, amount]) => [
      coinType,
      deductFee(amount, feeBps),
    ])
  );
}
