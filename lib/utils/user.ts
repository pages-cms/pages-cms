import { cache } from "react";
import { getAuth } from "@/lib/auth";
import { decrypt } from "@/lib/crypto";
import { db } from "@/db";
import { tokens } from "@/db/schema";
import { eq } from "drizzle-orm";

const getUser = cache(async () => {
  const { session, user } = await getAuth();
  
  if (!user || !session) return { session, user, token: null };

  let token;
  const tokenData = await db.query.tokens.findFirst({ where: eq(tokens.userId, user.id) });
  if (!tokenData) throw new Error(`Token not found for user ${user.id}.`);
  token = await decrypt(tokenData.ciphertext, tokenData.iv);
  if (!token) throw new Error(`Token could not be retrieved and/or decrypted.`);

  return { session, user, token };
});

export { getUser };