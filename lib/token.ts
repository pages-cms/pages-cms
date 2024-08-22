import { cache } from "react";
import { getAuth } from "@/lib/auth";
import { decrypt } from "@/lib/crypto";
import { db } from "@/db";
import { githubUserTokenTable } from "@/db/schema";
import { eq } from "drizzle-orm";

const getUserToken = cache(async () => {
  const { user } = await getAuth();
	if (!user) throw new Error("User not found");

  let token;
  
  const tokenData = await db.query.githubUserTokenTable.findFirst({ where: eq(githubUserTokenTable.userId, user.id) });
  if (!tokenData) throw new Error(`Token not found for user ${user.id}.`);
  
  token = await decrypt(tokenData.ciphertext, tokenData.iv);
  if (!token) throw new Error(`Token could not be retrieved and/or decrypted.`);

  return token;
});

export { getUserToken };