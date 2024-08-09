"use server";

import { lucia, getAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { generateState } from "arctic";
import { github } from "@/lib/auth";
import { cookies } from "next/headers";

// Email login
import { TimeSpan, createDate } from "oslo";
import { sha256 } from "oslo/crypto";
import { encodeHex } from "oslo/encoding";
import { generateIdFromEntropySize } from "lucia";
import { db } from "@/db";
import { loginTokens } from "@/db/schema";
import { eq } from "drizzle-orm";

async function createLoginToken(email: string): Promise<string> {
	await db.delete(loginTokens).where(eq(loginTokens.email, email));
	
	const tokenId = generateIdFromEntropySize(25); // 40 character
	const tokenHash = encodeHex(await sha256(new TextEncoder().encode(tokenId)));
	
	await db.insert(loginTokens).values({
		tokenHash: tokenHash,
		email,
		expiresAt: Math.floor(createDate(new TimeSpan(2, "h")).getTime() / 1000)
	 });

	return tokenId;
}

const handleEmailSignIn = async () => {
	const email = "";

	const verificationToken = await createLoginToken(email);
	const verificationLink = "http://localhost:3000/reset-password/" + verificationToken;

	// await sendPasswordResetToken(email, verificationLink);
}

const handleGithubSignIn = async () => {
  const state = generateState();
	const url = await github.createAuthorizationURL(state, { scopes: ["repo", "user:email"] });

	cookies().set("github_oauth_state", state, {
		path: "/",
		secure: process.env.NODE_ENV === "production",
		httpOnly: true,
		maxAge: 60 * 10,
		sameSite: "lax"
	});

	return redirect(url.href);
}

const handleSignOut = async () => {
	const { session } = await getAuth();
	if (!session) {
		return {
			error: "Unauthorized"
		};
	}
	
	await lucia.invalidateSession(session.id);
	
	const sessionCookie = lucia.createBlankSessionCookie();
	cookies().set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);
	
	return redirect("/");
}

export { handleEmailSignIn, handleGithubSignIn, handleSignOut };