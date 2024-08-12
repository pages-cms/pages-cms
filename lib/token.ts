import { cache } from "react";
import { decrypt } from "@/lib/crypto";
import { db } from "@/db";
import { tokens } from "@/db/schema";
import { eq } from "drizzle-orm";

const getToken = cache(async (userId: string) => {
  if (!userId) throw new Error("userId is required.");

  let token;
  
  const tokenData = await db.query.tokens.findFirst({ where: eq(tokens.userId, userId) });
  if (!tokenData) throw new Error(`Token not found for user ${userId}.`);
  
  token = await decrypt(tokenData.ciphertext, tokenData.iv);
  if (!token) throw new Error(`Token could not be retrieved and/or decrypted.`);

  return token;
});

export { getToken };