import { z } from "zod";

export const createTransactionSchema = z.object({
  amount: z.number().positive("Amount must be a positive number"),
  currency: z.string().min(3, "Currency is required"),
  reference: z.string().min(1, "Reference is required"),
});

export function validateCreateTransaction(data: unknown) {
  return createTransactionSchema.safeParse(data);
}
