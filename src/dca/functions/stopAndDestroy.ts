import { DCASDK } from "../constants";
import { Transaction } from "@mysten/sui/transactions";
import type { StopAndDestroyParams } from "../types";

export async function stopAndDestroy({
  coinInType,
  coinOutType,
  dca,
}: StopAndDestroyParams): Promise<Transaction> {
  return DCASDK.stopAndDestroy({
    coinInType,
    coinOutType,
    dca,
  });
}
